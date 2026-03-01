"use client";

import type { DesignVersion } from "@/types";

interface VersionBarProps {
  versions: DesignVersion[];
  currentVersion: number;
  onSelectVersion: (version: number) => void;
}

export default function VersionBar({
  versions,
  currentVersion,
  onSelectVersion,
}: VersionBarProps) {
  if (versions.length === 0) return null;

  return (
    <div className="px-5 py-3 border-t border-white/[0.04]">
      <div className="flex items-center gap-3 overflow-x-auto">
        <span className="text-[10px] text-white/15 uppercase tracking-widest shrink-0 font-mono">
          History
        </span>
        {versions.map((v) => (
          <button
            key={v.version}
            onClick={() => onSelectVersion(v.version)}
            className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all duration-200 ${
              v.version === currentVersion
                ? "ring-1 ring-white/20 ring-offset-1 ring-offset-[#09090b]"
                : "opacity-40 hover:opacity-70"
            }`}
            title={v.prompt}
          >
            <img
              src={v.textureDataURL}
              alt={`v${v.version}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}