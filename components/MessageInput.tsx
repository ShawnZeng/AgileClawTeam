"use client";

import { useState } from "react";

interface ChatResponse {
  ok?: boolean;
  error?: string;
}

export default function MessageInput() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastStatus, setLastStatus] = useState<"ok" | "error" | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const send = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setLastStatus(null);
    setLastError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await res.json()) as ChatResponse;
      if (data.ok) {
        setMessage("");
        setLastStatus("ok");
      } else {
        setLastError(data.error ?? "未知错误");
        setLastStatus("error");
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : "请求失败");
      setLastStatus("error");
    } finally {
      setSending(false);
      setTimeout(() => setLastStatus(null), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        给 PO 发消息
      </h2>
      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入发给 PO 的消息... (Enter 发送，Shift+Enter 换行)"
          rows={3}
          className="flex-1 bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-blue-500 placeholder-gray-600"
        />
        <button
          onClick={send}
          disabled={!message.trim() || sending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
        >
          {sending ? "发送中..." : "发送"}
        </button>
      </div>
      {lastStatus === "ok" && (
        <p className="text-xs text-green-400 mt-1">✓ 消息已发送</p>
      )}
      {lastStatus === "error" && (
        <p className="text-xs text-red-400 mt-1">
          ✗ {lastError ?? "发送失败，请检查 OpenClaw 连接"}
        </p>
      )}
    </div>
  );
}
