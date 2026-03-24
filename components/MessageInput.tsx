"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

interface ChatResponse {
  ok?: boolean;
  error?: string;
}

export default function MessageInput() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastStatus, setLastStatus] = useState<"ok" | "error" | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const { t } = useI18n();

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
        setLastError(data.error ?? t("msg.unknownError"));
        setLastStatus("error");
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : t("msg.requestFailed"));
      setLastStatus("error");
    } finally {
      setSending(false);
      setTimeout(() => setLastStatus(null), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {t("msg.label")}
      </h2>
      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("msg.placeholder")}
          rows={3}
          className="flex-1 bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-blue-500 placeholder-gray-600"
        />
        <button
          onClick={() => void send()}
          disabled={!message.trim() || sending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
        >
          {sending ? t("msg.sending") : t("msg.send")}
        </button>
      </div>
      {lastStatus === "ok" && (
        <p className="text-xs text-green-400 mt-1">{t("msg.sent")}</p>
      )}
      {lastStatus === "error" && (
        <p className="text-xs text-red-400 mt-1">
          ✗ {lastError ?? t("msg.failedDefault")}
        </p>
      )}
    </div>
  );
}
