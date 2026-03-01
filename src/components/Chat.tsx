"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Message } from "@/types";

const SUGGESTED_PROMPTS = [
  "Киберпанк с неоновыми контурами",
  "Минимализм — японская каллиграфия",
  "Тропический принт, яркие цвета",
  "Абстрактная геометрия, ч/б",
  "Ретро 90-х, пиксель-арт",
];

interface ChatProps {
  messages: Message[];
  isGenerating: boolean;
  onSendMessage: (text: string) => void;
  onRegenerate: () => void;
}

export default function Chat({
  messages,
  isGenerating,
  onSendMessage,
  onRegenerate,
}: ChatProps) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const send = useCallback(() => {
    const t = input.trim();
    if (!t || isGenerating) return;
    onSendMessage(t);
    setInput("");
  }, [input, isGenerating, onSendMessage]);

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send]
  );

  const isEmpty = messages.length === 0;
  const hasDesign = messages.some((m) => m.designVersion !== undefined);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <div className="text-center">
              <p className="text-[22px] font-light tracking-tight text-white/90">
                Опиши свой дизайн
              </p>
              <p className="text-[13px] text-white/30 mt-2">
                AI создаст и наложит на футболку
              </p>
            </div>

            <div className="flex flex-col gap-1.5 w-full max-w-sm">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(prompt)}
                  disabled={isGenerating}
                  className="text-left px-4 py-3 rounded-xl text-[13px] text-white/50
                    hover:text-white/80 hover:bg-white/[0.04] transition-all duration-200
                    disabled:opacity-30 border border-transparent hover:border-white/[0.06]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-lg mx-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-white/[0.08] text-white/90 rounded-2xl rounded-br-lg"
                      : "text-white/60 rounded-2xl rounded-bl-lg"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse" />
                      <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse [animation-delay:200ms]" />
                      <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse [animation-delay:400ms]" />
                    </div>
                    <span className="text-[11px] text-white/20">
                      Генерирую...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {hasDesign && !isGenerating && (
              <div className="flex gap-1.5 mt-1">
                <button
                  onClick={onRegenerate}
                  className="px-3 py-1.5 text-[11px] text-white/30 hover:text-white/60
                    hover:bg-white/[0.04] rounded-lg transition-all duration-200"
                >
                  Другой вариант
                </button>
                <button
                  onClick={() => onSendMessage("Измени цветовую гамму")}
                  className="px-3 py-1.5 text-[11px] text-white/30 hover:text-white/60
                    hover:bg-white/[0.04] rounded-lg transition-all duration-200"
                >
                  Изменить цвет
                </button>
                <button
                  onClick={() => {/* TODO: export */}}
                  className="px-3 py-1.5 text-[11px] text-white/30 hover:text-white/60
                    hover:bg-white/[0.04] rounded-lg transition-all duration-200"
                >
                  Скачать
                </button>
              </div>
            )}

            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-white/[0.04]">
        <div className="flex gap-2 items-end max-w-lg mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Опиши дизайн..."
            disabled={isGenerating}
            rows={1}
            className="flex-1 resize-none bg-white/[0.04] text-[13px] text-white/80
              rounded-xl px-4 py-3 placeholder-white/20
              border border-white/[0.06] focus:border-white/[0.12]
              focus:outline-none disabled:opacity-30
              transition-all duration-200"
          />
          <button
            onClick={send}
            disabled={!input.trim() || isGenerating}
            className="p-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1]
              disabled:opacity-20 transition-all duration-200 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-white/60"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}