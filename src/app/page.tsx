"use client";

import { useState, useEffect, useCallback } from "react";
import ThreeViewer from "@/components/ThreeViewer";
import { UV_ZONES, ZONE_IDS } from "@/lib/uv/zones";
import { generateUVMask } from "@/lib/uv/mask";

export default function Home() {
  const [activeZones, setActiveZones] = useState<Record<string, boolean>>(
    () => Object.fromEntries(ZONE_IDS.map((k) => [k, true]))
  );
  const [textureCanvas, setTextureCanvas] = useState<HTMLCanvasElement | null>(null);

  // Generate texture whenever active zones change
  useEffect(() => {
    const canvas = generateUVMask(activeZones);
    setTextureCanvas(canvas);
  }, [activeZones]);

  const toggleZone = useCallback((zoneId: string) => {
    setActiveZones((prev) => ({ ...prev, [zoneId]: !prev[zoneId] }));
  }, []);

  const selectAll = useCallback(() => {
    setActiveZones(Object.fromEntries(ZONE_IDS.map((k) => [k, true])));
  }, []);

  const deselectAll = useCallback(() => {
    setActiveZones(Object.fromEntries(ZONE_IDS.map((k) => [k, false])));
  }, []);

  const activeCount = Object.values(activeZones).filter(Boolean).length;
  const activeNames = Object.entries(activeZones)
    .filter(([, v]) => v)
    .map(([k]) => UV_ZONES[k]?.label)
    .join(", ");

  return (
    <div className="flex h-screen bg-[#0f0f1a] text-gray-200">
      {/* Sidebar — Zone Controls */}
      <aside className="w-64 border-r border-gray-800 p-4 flex flex-col gap-3 shrink-0 overflow-y-auto">
        <h2 className="text-base font-semibold text-white">UV Zones</h2>
        <p className="text-xs text-gray-500">
          {activeCount}/{ZONE_IDS.length} active
        </p>

        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="flex-1 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition"
          >
            All On
          </button>
          <button
            onClick={deselectAll}
            className="flex-1 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition"
          >
            All Off
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {ZONE_IDS.map((zoneId) => {
            const zone = UV_ZONES[zoneId];
            const isActive = activeZones[zoneId];
            return (
              <button
                key={zoneId}
                onClick={() => toggleZone(zoneId)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border transition text-left ${
                  isActive
                    ? "border-green-500/50 hover:bg-green-500/10"
                    : "border-gray-800 hover:bg-gray-800/50"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 ${
                    isActive
                      ? "bg-green-500 text-white"
                      : "bg-gray-800 text-transparent"
                  }`}
                >
                  ✓
                </div>
                <span
                  className={`text-sm ${isActive ? "text-white" : "text-gray-600"}`}
                >
                  {zone.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mode indicator */}
        <div className="mt-auto p-3 bg-gray-900/50 rounded-lg border border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
            Mode
          </p>
          <p className="text-xs text-gray-300">
            {activeCount === ZONE_IDS.length
              ? "Initial generation — full design"
              : activeCount === 0
                ? "No zones selected"
                : `Editing: ${activeNames}`}
          </p>
        </div>
      </aside>

      {/* Main viewport */}
      <main className="flex-1 flex flex-col">
        <header className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
          <span className="text-sm text-gray-400">3D Preview</span>
          <span className="text-xs text-gray-600">
            Stage 1 — UV Texture Test
          </span>
        </header>

        <div className="flex-1">
          <ThreeViewer textureCanvas={textureCanvas} />
        </div>
      </main>
    </div>
  );
}