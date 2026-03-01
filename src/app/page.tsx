"use client";

import { useState, useCallback, useEffect } from "react";
import ThreeViewer from "@/components/ThreeViewer";
import Chat from "@/components/Chat";
import VersionBar from "@/components/VersionBar";
import { generateFullMask } from "@/lib/uv/mask";
import type { Message, DesignVersion, ChatState } from "@/types";

const uid = () => Math.random().toString(36).slice(2, 10);

async function mockGenerate(userPrompt: string, version: number) {
  await new Promise((r) => setTimeout(r, 2000));
  const canvas = generateFullMask()!;
  const reply = version === 1
    ? `Дизайн готов! Покрути модель, чтобы рассмотреть. Напиши, если хочешь что-то изменить.`
    : `Обновил дизайн. Что думаешь?`;
  return { reply, textureCanvas: canvas };
}

export default function Home() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [], versions: [], currentVersion: 0, isGenerating: false,
  });
  const [textureCanvas, setTextureCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => { setTextureCanvas(generateFullMask()); }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    const userMsg: Message = { id: uid(), role: "user", content: text, timestamp: Date.now() };
    setChatState((p) => ({ ...p, messages: [...p.messages, userMsg], isGenerating: true }));
    try {
      const nv = chatState.versions.length + 1;
      const { reply, textureCanvas: nt } = await mockGenerate(text, nv);
      setTextureCanvas(nt);
      const ver: DesignVersion = { version: nv, textureDataURL: nt.toDataURL("image/png"), prompt: text, timestamp: Date.now() };
      const aMsg: Message = { id: uid(), role: "assistant", content: reply, timestamp: Date.now(), designVersion: nv };
      setChatState((p) => ({ ...p, messages: [...p.messages, aMsg], versions: [...p.versions, ver], currentVersion: nv, isGenerating: false }));
    } catch {
      setChatState((p) => ({ ...p, messages: [...p.messages, { id: uid(), role: "assistant" as const, content: "Ошибка. Попробуй снова.", timestamp: Date.now() }], isGenerating: false }));
    }
  }, [chatState.versions.length]);

  const handleRegenerate = useCallback(() => {
    const last = [...chatState.messages].reverse().find((m) => m.role === "user");
    if (last) handleSendMessage(last.content);
  }, [chatState.messages, handleSendMessage]);

  const handleSelectVersion = useCallback((version: number) => {
    const v = chatState.versions.find((x) => x.version === version);
    if (!v) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = 2048; c.height = 2048;
      c.getContext("2d")!.drawImage(img, 0, 0);
      setTextureCanvas(c);
    };
    img.src = v.textureDataURL;
    setChatState((p) => ({ ...p, currentVersion: version }));
  }, [chatState.versions]);

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden", background: "#08080a" }}>
      {/* Chat */}
      <div style={{ width: 400, height: "100%", display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.07)", background: "#0c0c0f", flexShrink: 0 }}>
        <Chat messages={chatState.messages} isGenerating={chatState.isGenerating} onSendMessage={handleSendMessage} onRegenerate={handleRegenerate} />
      </div>

      {/* 3D */}
      <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <ThreeViewer textureCanvas={textureCanvas} />
        </div>
        <VersionBar versions={chatState.versions} currentVersion={chatState.currentVersion} onSelectVersion={handleSelectVersion} />
      </div>
    </div>
  );
}