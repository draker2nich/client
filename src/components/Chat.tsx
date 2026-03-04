"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Message } from "@/types";

const SUGGESTED = [
  { icon: "✦", text: "Киберпанк с неоновыми контурами" },
  { icon: "◎", text: "Минимализм — японская каллиграфия" },
  { icon: "❋", text: "Тропический принт, яркие цвета" },
  { icon: "◇", text: "Абстрактная геометрия, ч/б" },
  { icon: "▣", text: "Ретро 90-х, пиксель-арт" },
];

interface Props {
  messages: Message[];
  isGenerating: boolean;
  onSendMessage: (t: string) => void;
  onRegenerate: () => void;
  onDownload: () => void;
}

export default function Chat({ messages, isGenerating, onSendMessage, onRegenerate, onDownload }: Props) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const send = useCallback(() => {
    const t = input.trim();
    if (!t || isGenerating) return;
    onSendMessage(t);
    setInput("");
  }, [input, isGenerating, onSendMessage]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  const isEmpty = messages.length === 0;
  const hasDesign = messages.some((m) => m.designVersion !== undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "var(--font-body), system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "20px 20px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 14 }}>✦</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.85)", fontFamily: "var(--font-display), serif" }}>
              Fashion AI
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em", marginTop: 1 }}>
              дизайнер одежды
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px", minHeight: 0 }} className="scrollbar-none">
        {isEmpty ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 32, paddingBottom: 40 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontFamily: "var(--font-display), serif", color: "rgba(255,255,255,0.8)", lineHeight: 1.3 }}>
                Какой дизайн<br />создадим сегодня?
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", marginTop: 10, fontWeight: 200, letterSpacing: "0.04em" }}>
                Опиши идею — AI воплотит на футболке
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {SUGGESTED.map((p, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(p.text)}
                  disabled={isGenerating}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 12, border: "1px solid transparent",
                    background: "transparent", color: "rgba(255,255,255,0.3)",
                    fontSize: 13, fontWeight: 300, textAlign: "left", cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.3)";
                  }}
                >
                  <span style={{ fontSize: 11, opacity: 0.4 }}>{p.icon}</span>
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ paddingTop: 8, paddingBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "assistant" && (
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: "rgba(255,255,255,0.05)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginRight: 10, marginTop: 2,
                  }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>✦</span>
                  </div>
                )}
                <div style={{
                  maxWidth: "82%",
                  fontSize: 13, fontWeight: 300, lineHeight: 1.7, letterSpacing: "0.01em",
                  ...(msg.role === "user" ? {
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.7)",
                    padding: "10px 14px",
                    borderRadius: "16px 16px 6px 16px",
                  } : {
                    color: "rgba(255,255,255,0.45)",
                    paddingTop: 2,
                  }),
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }} className="animate-pulse">✦</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="animate-bounce" style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: "rgba(255,255,255,0.15)",
                      animationDelay: `${d}ms`, animationDuration: "0.8s",
                    }} />
                  ))}
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", fontWeight: 200, letterSpacing: "0.05em" }}>
                    Создаю дизайн...
                  </span>
                </div>
              </div>
            )}

            {hasDesign && !isGenerating && (
              <div style={{ display: "flex", gap: 6, paddingLeft: 34 }}>
                {[
                  { icon: "↻", label: "Ещё вариант", action: () => onRegenerate() },
                  { icon: "◐", label: "Изменить", action: () => onSendMessage("Измени цветовую гамму") },
                  { icon: "↓", label: "Скачать", action: () => onDownload() },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 10px", borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.02)",
                      color: "rgba(255,255,255,0.25)",
                      fontSize: 11, fontWeight: 300, cursor: "pointer",
                      transition: "all 0.2s", fontFamily: "inherit",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.25)";
                    }}
                  >
                    <span style={{ fontSize: 10 }}>{btn.icon}</span>
                    {btn.label}
                  </button>
                ))}
              </div>
            )}

            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: "12px 16px 16px" }}>
        <div style={{
          position: "relative",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.07)",
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Опиши дизайн..."
            disabled={isGenerating}
            rows={3}
            style={{
              width: "100%", resize: "none",
              background: "transparent",
              fontSize: 13, fontWeight: 300, letterSpacing: "0.02em",
              color: "rgba(255,255,255,0.65)",
              borderRadius: 16, border: "none", outline: "none",
              padding: "14px 16px 40px",
              fontFamily: "inherit",
              overflow: "hidden",
            }}
          />
          <div style={{
            position: "absolute", bottom: 10, right: 12,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.1)", fontWeight: 200 }}>
              Enter ↵
            </span>
            <button
              onClick={send}
              disabled={!input.trim() || isGenerating}
              style={{
                width: 30, height: 30, borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: !input.trim() || isGenerating ? 0.15 : 1,
                transition: "all 0.2s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}