"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AgentMessage } from "@/lib/types";

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-scroll: read the CURRENT scroll position from the DOM directly —
  // avoids the race where the scroll event hasn't fired yet but the effect has.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= 80) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, pendingMsgs]);

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
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      0,
    );

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
          <span className="text-lg">🙎</span>
          <div>
            <h2 className="text-sm font-semibold text-gray-200">与 PO 对话</h2>
            <p className="text-xs text-gray-500">
              Product Owner · 需求确认与规划
            </p>
          </div>
        </div>
      )}

      {/* Message list */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
            <span className="text-3xl">🙎</span>
            <p className="text-sm text-gray-500">还没有对话记录</p>
            <p className="text-xs text-gray-600">发送消息给 PO 开始需求讨论</p>
          </div>
        ) : (
          <>
            {/* Confirmed server messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col gap-1 max-w-[80%] ${
                  msg.role === "user" ? "ml-auto items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  {msg.role === "user" ? <span>你</span> : <span>🙎 PO</span>}
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
                className="flex flex-col gap-1 max-w-[80%] ml-auto items-end"
              >
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>你</span>
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
                      title="发送中…"
                    />
                  )}
                  {p.status === "failed" && (
                    <button
                      onClick={() => retry(p)}
                      title="点击重新发送"
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
            placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
            rows={1}
            style={{ minHeight: "2.75rem", maxHeight: "200px" }}
            className="flex-1 bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 resize-y overflow-y-auto focus:outline-none focus:border-blue-500 placeholder-gray-600"
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || sending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end shrink-0"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
