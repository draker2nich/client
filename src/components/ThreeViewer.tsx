"use client";

import { useEffect, useRef, useState } from "react";
import type { SceneContext } from "@/lib/three/scene";

interface ThreeViewerProps {
  textureCanvas: HTMLCanvasElement | null;
}

export default function ThreeViewer({ textureCanvas }: ThreeViewerProps) {
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
        if (!disposed) {
          setError(err instanceof Error ? err.message : "Failed to load 3D");
          setLoading(false);
        }
      }
    };

    setup();
    return () => { disposed = true; sceneRef.current?.dispose(); sceneRef.current = null; };
  }, []);

  useEffect(() => {
    if (sceneRef.current && textureCanvas) {
      sceneRef.current.updateTexture(textureCanvas);
    }
  }, [textureCanvas]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#09090b]">
          <div className="w-5 h-5 border border-white/10 border-t-white/40 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#09090b]">
          <div className="text-center">
            <p className="text-[13px] text-red-400/60">{error}</p>
            <p className="text-[11px] text-white/15 mt-1">
              Check public/models/tshirt.glb
            </p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="absolute bottom-4 right-4 text-[10px] text-white/10">
          drag to rotate · scroll to zoom
        </div>
      )}
    </div>
  );
}