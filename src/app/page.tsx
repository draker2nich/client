"use client";

import { useState, useCallback, useRef } from "react";
import ThreeViewer from "@/components/ThreeViewer";
import Chat from "@/components/Chat";
import VersionBar from "@/components/VersionBar";
import { generateFullMask, canvasToDataURL } from "@/lib/uv/mask";
import type { Message, DesignVersion, ChatState } from "@/types";

const uid = () => Math.random().toString(36).slice(2, 10);

// --- Helper: base64 PNG string → HTMLCanvasElement (2048×2048) ---
function base64ToCanvas(base64: string, mime = "image/png"): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 2048;
      c.height = 2048;
      c.getContext("2d")!.drawImage(img, 0, 0, 2048, 2048);
      resolve(c);
    };
    img.onerror = () => reject(new Error("Failed to load generated image"));
    img.src = `data:${mime};base64,${base64}`;
  });
}

// --- API call: generate design ---
interface GenerateResult {
  enhancedPrompt: string;
  textureCanvas: HTMLCanvasElement;
}

async function callGenerateDesign(
  prompt: string,
  uvMaskCanvas: HTMLCanvasElement,
  options?: { skipEnhance?: boolean; enhancedPrompt?: string }
): Promise<GenerateResult> {
  const uvMaskBase64 = canvasToDataURL(uvMaskCanvas);

  let res: Response;
  try {
    res = await fetch("/api/generate-design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        uvMaskBase64,
        skipEnhance: options?.skipEnhance ?? false,
        enhancedPrompt: options?.enhancedPrompt,
      }),
    });
  } catch (networkErr) {
    console.error("Network error:", networkErr);
    throw new Error("Не удалось подключиться к серверу. Проверьте консоль.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Server error: ${res.status}`);
  }

  const data = await res.json();
  const textureCanvas = await base64ToCanvas(data.imageBase64, data.mimeType);

  return {
    enhancedPrompt: data.enhancedPrompt,
    textureCanvas,
  };
}

export default function Home() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    versions: [],
    currentVersion: 0,
    isGenerating: false,
  });

  // Start with null — no texture applied, model shows default white
  const [textureCanvas, setTextureCanvas] = useState<HTMLCanvasElement | null>(null);

  const lastEnhancedPromptRef = useRef<string>("");

  const handleSendMessage = useCallback(
    async (text: string) => {
      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      setChatState((p) => ({
        ...p,
        messages: [...p.messages, userMsg],
        isGenerating: true,
      }));

      try {
        const uvMask = generateFullMask();
        if (!uvMask) throw new Error("Failed to generate UV mask");

        const { enhancedPrompt, textureCanvas: newTexture } =
          await callGenerateDesign(text, uvMask);

        lastEnhancedPromptRef.current = enhancedPrompt;
        setTextureCanvas(newTexture);

        const nv = chatState.versions.length + 1;
        const ver: DesignVersion = {
          version: nv,
          textureDataURL: canvasToDataURL(newTexture),
          prompt: text,
          timestamp: Date.now(),
        };

        const reply =
          nv === 1
            ? "Дизайн готов! Покрути модель, чтобы рассмотреть. Напиши, если хочешь что-то изменить."
            : "Обновил дизайн. Что думаешь?";

        const aMsg: Message = {
          id: uid(),
          role: "assistant",
          content: reply,
          timestamp: Date.now(),
          designVersion: nv,
        };

        setChatState((p) => ({
          ...p,
          messages: [...p.messages, aMsg],
          versions: [...p.versions, ver],
          currentVersion: nv,
          isGenerating: false,
        }));
      } catch (err) {
        console.error("Generation error:", err);
        const errorMsg =
          err instanceof Error ? err.message : "Неизвестная ошибка";

        setChatState((p) => ({
          ...p,
          messages: [
            ...p.messages,
            {
              id: uid(),
              role: "assistant" as const,
              content: `Ошибка генерации: ${errorMsg}. Попробуй снова.`,
              timestamp: Date.now(),
            },
          ],
          isGenerating: false,
        }));
      }
    },
    [chatState.versions.length]
  );

  const handleRegenerate = useCallback(() => {
    const lastUserMsg = [...chatState.messages]
      .reverse()
      .find((m) => m.role === "user");
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  }, [chatState.messages, handleSendMessage]);

  const handleDownload = useCallback(() => {
    if (!textureCanvas) return;

    const dataURL = textureCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `design-v${chatState.currentVersion || 1}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [textureCanvas, chatState.currentVersion]);

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
      setChatState((p) => ({ ...p, currentVersion: version }));
    },
    [chatState.versions]
  );

  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#08080a",
      }}
    >
      {/* Chat */}
      <div
        style={{
          width: 400,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          background: "#0c0c0f",
          flexShrink: 0,
        }}
      >
        <Chat
          messages={chatState.messages}
          isGenerating={chatState.isGenerating}
          onSendMessage={handleSendMessage}
          onRegenerate={handleRegenerate}
          onDownload={handleDownload}
        />
      </div>

      {/* 3D */}
      <div
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
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