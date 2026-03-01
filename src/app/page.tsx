"use client";

import { useState, useCallback, useEffect } from "react";
import ThreeViewer from "@/components/ThreeViewer";
import Chat from "@/components/Chat";
import VersionBar from "@/components/VersionBar";
import { generateFullMask } from "@/lib/uv/mask";
import type { Message, DesignVersion, ChatState } from "@/types";

const uid = () => Math.random().toString(36).slice(2, 10);

async function mockGenerate(
  userPrompt: string,
  version: number
): Promise<{ reply: string; textureCanvas: HTMLCanvasElement }> {
  await new Promise((r) => setTimeout(r, 2000));
  const canvas = generateFullMask()!;
  const reply =
    version === 1
      ? `Готово — дизайн "${userPrompt}" наложен на модель. Покрути, посмотри. Что-то поменять?`
      : `Обновил. Напиши, если хочешь ещё что-то изменить.`;
  return { reply, textureCanvas: canvas };
}

export default function Home() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    versions: [],
    currentVersion: 0,
    isGenerating: false,
  });

  // SSR-safe: generate initial texture only on client
  const [textureCanvas, setTextureCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setTextureCanvas(generateFullMask());
  }, []);

  const handleSendMessage = useCallback(
    async (text: string) => {
      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg],
        isGenerating: true,
      }));

      try {
        const nextVersion = chatState.versions.length + 1;
        const { reply, textureCanvas: newTex } = await mockGenerate(text, nextVersion);

        setTextureCanvas(newTex);

        const version: DesignVersion = {
          version: nextVersion,
          textureDataURL: newTex.toDataURL("image/png"),
          prompt: text,
          timestamp: Date.now(),
        };

        const assistantMsg: Message = {
          id: uid(),
          role: "assistant",
          content: reply,
          timestamp: Date.now(),
          designVersion: nextVersion,
        };

        setChatState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMsg],
          versions: [...prev.versions, version],
          currentVersion: nextVersion,
          isGenerating: false,
        }));
      } catch {
        const errorMsg: Message = {
          id: uid(),
          role: "assistant",
          content: "Ошибка генерации. Попробуй ещё раз.",
          timestamp: Date.now(),
        };
        setChatState((prev) => ({
          ...prev,
          messages: [...prev.messages, errorMsg],
          isGenerating: false,
        }));
      }
    },
    [chatState.versions.length]
  );

  const handleRegenerate = useCallback(() => {
    const last = [...chatState.messages].reverse().find((m) => m.role === "user");
    if (last) handleSendMessage(last.content);
  }, [chatState.messages, handleSendMessage]);

  const handleSelectVersion = useCallback(
    (version: number) => {
      const v = chatState.versions.find((x) => x.version === version);
      if (!v) return;
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = 2048;
        c.height = 2048;
        c.getContext("2d")!.drawImage(img, 0, 0);
        setTextureCanvas(c);
      };
      img.src = v.textureDataURL;
      setChatState((prev) => ({ ...prev, currentVersion: version }));
    },
    [chatState.versions]
  );

  return (
    <div className="flex h-screen bg-[#09090b] text-[#fafafa] antialiased">
      {/* Chat panel */}
      <div className="w-[420px] flex flex-col border-r border-white/[0.06] shrink-0">
        <header className="px-5 py-4 border-b border-white/[0.06]">
          <h1 className="text-[13px] font-medium tracking-tight text-white/90">
            AI Fashion Designer
          </h1>
        </header>

        <div className="flex-1 min-h-0">
          <Chat
            messages={chatState.messages}
            isGenerating={chatState.isGenerating}
            onSendMessage={handleSendMessage}
            onRegenerate={handleRegenerate}
          />
        </div>
      </div>

      {/* 3D Preview */}
      <div className="flex-1 flex flex-col">
        <header className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-[13px] text-white/40">Preview</span>
          {chatState.currentVersion > 0 && (
            <span className="text-[11px] text-white/20 font-mono">
              v{chatState.currentVersion}
            </span>
          )}
        </header>

        <div className="flex-1 min-h-0">
          <ThreeViewer textureCanvas={textureCanvas} />
        </div>

        <VersionBar
          versions={chatState.versions}
          currentVersion={chatState.currentVersion}
          onSelectVersion={handleSelectVersion}
        />
      </div>
    </div>
  );
}