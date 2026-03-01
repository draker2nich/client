"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SceneContext } from "@/lib/three/scene";

interface ThreeViewerProps {
  /** Canvas with current UV texture to apply to the model */
  textureCanvas: HTMLCanvasElement | null;
}

export default function ThreeViewer({ textureCanvas }: ThreeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;

    const setup = async () => {
      try {
        // Dynamic import to avoid SSR issues with Three.js
        const { initScene } = await import("@/lib/three/scene");

        if (disposed || !containerRef.current) return;

        const ctx = await initScene(containerRef.current, () => {
          setLoading(false);
        });

        if (disposed) {
          ctx.dispose();
          return;
        }

        sceneRef.current = ctx;
        setLoading(false);
      } catch (err) {
        if (!disposed) {
          setError(err instanceof Error ? err.message : "Failed to load 3D scene");
          setLoading(false);
        }
      }
    };

    setup();

    return () => {
      disposed = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Update texture when textureCanvas changes
  useEffect(() => {
    if (sceneRef.current && textureCanvas) {
      sceneRef.current.updateTexture(textureCanvas);
    }
  }, [textureCanvas]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={containerRef} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]/80">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading 3D model...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]/80">
          <div className="text-center p-4">
            <p className="text-red-400 text-sm">{error}</p>
            <p className="text-gray-500 text-xs mt-2">
              Make sure tshirt.glb is in public/models/
            </p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="absolute bottom-3 right-3 text-xs text-gray-600">
          Drag to rotate • Scroll to zoom
        </div>
      )}
    </div>
  );
}