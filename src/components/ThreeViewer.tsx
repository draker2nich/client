"use client";

import { useEffect, useRef, useState } from "react";
import type { SceneContext } from "@/lib/three/scene";

interface Props {
  textureCanvas: HTMLCanvasElement | null;
}

export default function ThreeViewer({ textureCanvas }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    const setup = async () => {
      try {
        const { initScene } = await import("@/lib/three/scene");
        if (disposed || !containerRef.current) return;
        const ctx = await initScene(containerRef.current, () => setLoading(false));
        if (disposed) { ctx.dispose(); return; }
        sceneRef.current = ctx;
        setLoading(false);
      } catch (err) {
        if (!disposed) { setError(err instanceof Error ? err.message : "3D error"); setLoading(false); }
      }
    };
    setup();
    return () => { disposed = true; sceneRef.current?.dispose(); sceneRef.current = null; };
  }, []);

  useEffect(() => {
    if (sceneRef.current && textureCanvas) sceneRef.current.updateTexture(textureCanvas);
  }, [textureCanvas]);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#08080a" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div className="animate-spin" style={{
              width: 20, height: 20, borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.08)",
              borderTopColor: "rgba(255,255,255,0.25)",
            }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", fontWeight: 200, letterSpacing: "0.05em" }}>
              Загрузка модели
            </span>
          </div>
        </div>
      )}

      {error && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", padding: 32 }}>
            <p style={{ fontSize: 13, color: "rgba(255,80,80,0.5)", fontWeight: 300 }}>{error}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.1)", marginTop: 8, fontWeight: 200 }}>
              Проверьте public/models/tshirt.glb
            </p>
          </div>
        </div>
      )}
    </div>
  );
}