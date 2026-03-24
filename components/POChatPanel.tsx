"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AgentMessage } from "@/lib/types";
import { useDisplayNames } from "@/lib/useDisplayNames";
import { formatAgentLabel } from "@/lib/agentDisplay";
import { AgentAvatar } from "@/components/AgentAvatar";
import { useI18n } from "@/lib/i18n";

interface MessagesResponse {
  agentId: string;
  messages: AgentMessage[];
}

interface ChatResponse {
  ok?: boolean;
  error?: string;
}

// A message being sent — tracked locally until server confirms it
interface PendingMsg {
  id: string;
  content: string;
  timestamp: string;
  status: "sending" | "failed" | "ok"; // ok = API succeeded, waiting for server poll
}

const ROLE_BUBBLE = {
  user: "bg-blue-700 text-blue-50 rounded-br-sm",
  assistant: "bg-gray-700 text-gray-200 rounded-bl-sm",
  system: "bg-gray-800 text-gray-500 border border-gray-700 rounded",
} as const;

export default function POChatPanel({
  hideHeader,
}: { hideHeader?: boolean } = {}) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [pendingMsgs, setPendingMsgs] = useState<PendingMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const displayNames = useDisplayNames();
  const { t } = useI18n();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasPositionedInitialScrollRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/messages?agentId=po");
      const data = (await res.json()) as MessagesResponse;
      setMessages((prev) => {
        const next = data.messages ?? [];
        // Skip state update (and re-render) if count and last message are identical
        if (
          next.length === prev.length &&
          next.length > 0 &&
          next[next.length - 1]?.timestamp === prev[prev.length - 1]?.timestamp
        ) {
          return prev;
        }
        return next;
      });
    } catch {
      // keep existing messages on error
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // On first non-empty render, jump straight to the newest messages.
  useEffect(() => {
    if (hasPositionedInitialScrollRef.current) return;
    if (messages.length === 0 && pendingMsgs.length === 0) return;

    hasPositionedInitialScrollRef.current = true;
    requestAnimationFrame(() => scrollToBottom("auto"));
  }, [messages.length, pendingMsgs.length, scrollToBottom]);

  // After initial positioning, keep following new messages only while the user
  // is already near the bottom.
  useEffect(() => {
    if (
      !hasPositionedInitialScrollRef.current ||
      !shouldStickToBottomRef.current
    ) {
      return;
    }

    requestAnimationFrame(() => scrollToBottom("smooth"));
  }, [messages, pendingMsgs, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom <= 80;
  };

  // ── Core send logic (also used by retry) ─────────────────────────────────────
  const doSend = useCallback(async (content: string, pendingId: string) => {
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = (await res.json()) as ChatResponse;
      if (data.ok) {
        // Mark as ok; remove after 3 s (server confirms via next poll by then)
        setPendingMsgs((prev) =>
          prev.map((p) => (p.id === pendingId ? { ...p, status: "ok" } : p)),
        );
        setTimeout(() => {
          setPendingMsgs((prev) => prev.filter((p) => p.id !== pendingId));
        }, 3000);
      } else {
        setPendingMsgs((prev) =>
          prev.map((p) =>
            p.id === pendingId ? { ...p, status: "failed" } : p,
          ),
        );
      }
    } catch {
      setPendingMsgs((prev) =>
        prev.map((p) => (p.id === pendingId ? { ...p, status: "failed" } : p)),
      );
    } finally {
      setSending(false);
    }
  }, []);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const pendingId = `local-${Date.now()}`;
    const now = new Date().toISOString();

    // Immediately show message in chat and clear input
    setInput("");
    setPendingMsgs((prev) => [
      ...prev,
      { id: pendingId, content: trimmed, timestamp: now, status: "sending" },
    ]);
    // Unconditionally scroll to bottom when user sends a message
    shouldStickToBottomRef.current = true;
    setTimeout(() => scrollToBottom("smooth"), 0);

    await doSend(trimmed, pendingId);
  };

  const retry = (msg: PendingMsg) => {
    setPendingMsgs((prev) =>
      prev.map((p) => (p.id === msg.id ? { ...p, status: "sending" } : p)),
    );
    void doSend(msg.content, msg.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  // Auto-grow textarea as content changes; shrink back when cleared
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  // Pending messages to display — hide any that the server has already confirmed,
  // regardless of pending status (fixes race where server poll arrives before API response)
  const pendingToShow = pendingMsgs.filter(
    (p) =>
      p.status === "failed" ||
      !messages.some((m) => m.role === "user" && m.content === p.content),
  );

  const isEmpty = messages.length === 0 && pendingToShow.length === 0;

  return (
    <div
      className={`flex flex-col h-full overflow-hidden ${hideHeader ? "bg-transparent" : "bg-gray-900 border border-gray-700 rounded-lg"}`}
    >
      {/* Header */}
      {!hideHeader && (
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2 shrink-0">
          <AgentAvatar agentId="po" role="po" size={24} />
          <div>
            <h2 className="text-sm font-semibold text-gray-200">
              {t("chat.title")}
            </h2>
            <p className="text-xs text-gray-500">{t("chat.sub")}</p>
          </div>
        </div>
      )}

      {/* Message list */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
            <AgentAvatar agentId="po" role="po" size={48} />
            <p className="text-sm text-gray-500">{t("chat.empty")}</p>
            <p className="text-xs text-gray-600">{t("chat.emptySub")}</p>
          </div>
        ) : (
          <>
            {/* Confirmed server messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col gap-1 max-w-[90%] ${
                  msg.role === "user" ? "ml-auto items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  {msg.role === "user" ? (
                    <span>{t("chat.you")}</span>
                  ) : (
                    <>
                      <AgentAvatar agentId="po" role="po" size={14} />
                      <span>{formatAgentLabel("po", "po", displayNames)}</span>
                    </>
                  )}
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
                      hour12: false,
                    })}
                  </span>
                </div>
                <div
                  className={`text-sm px-3 py-2 rounded-xl whitespace-pre-wrap break-words ${
                    ROLE_BUBBLE[msg.role] ?? ROLE_BUBBLE.assistant
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Pending local messages */}
            {pendingToShow.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-1 max-w-[90%] ml-auto items-end"
              >
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>{t("chat.you")}</span>
                  <span>
                    {new Date(p.timestamp).toLocaleTimeString("zh-CN", {
                      hour12: false,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Status indicator to the left of the bubble */}
                  {p.status === "sending" && (
                    <span
                      className="w-3.5 h-3.5 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin shrink-0"
                      title={t("chat.sending")}
                    />
                  )}
                  {p.status === "failed" && (
                    <button
                      onClick={() => retry(p)}
                      title={t("chat.retry")}
                      className="shrink-0 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </button>
                  )}
                  <div
                    className={`text-sm px-3 py-2 rounded-xl rounded-br-sm whitespace-pre-wrap break-words bg-blue-700 text-blue-50 ${
                      p.status === "failed" ? "opacity-60" : ""
                    }`}
                  >
                    {p.content}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-gray-700 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.placeholder")}
            rows={1}
            style={{ minHeight: "2.75rem", maxHeight: "200px" }}
            className="flex-1 bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 resize-y overflow-y-auto focus:outline-none focus:border-blue-500 placeholder-gray-600"
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || sending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end shrink-0"
          >
            {t("chat.send")}
          </button>
        </div>
      </div>
    </div>
  );
}
