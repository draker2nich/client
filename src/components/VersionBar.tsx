"use client";

import type { DesignVersion } from "@/types";

interface Props {
  versions: DesignVersion[];
  currentVersion: number;
  onSelectVersion: (v: number) => void;
}

export default function VersionBar({ versions, currentVersion, onSelectVersion }: Props) {
  if (versions.length === 0) return null;

  return (
    <div style={{
      flexShrink: 0, padding: "10px 16px",
      background: "#0a0a0c",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      display: "flex", alignItems: "center", gap: 12,
      overflowX: "auto",
    }} className="scrollbar-none">
      <span style={{
        fontSize: 9, color: "rgba(255,255,255,0.12)",
        textTransform: "uppercase", letterSpacing: "0.15em",
        fontWeight: 300, flexShrink: 0,
      }}>
        History
      </span>
      {versions.map((v) => (
        <button
          key={v.version}
          onClick={() => onSelectVersion(v.version)}
          style={{
            width: 40, height: 40, borderRadius: 8, overflow: "hidden",
            flexShrink: 0, cursor: "pointer", padding: 0,
            border: v.version === currentVersion
              ? "1px solid rgba(255,255,255,0.2)"
              : "1px solid rgba(255,255,255,0.05)",
            opacity: v.version === currentVersion ? 1 : 0.4,
            transition: "all 0.2s",
            background: "none",
          }}
          title={v.prompt}
        >
          <img src={v.textureDataURL} alt={`v${v.version}`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </button>
      ))}
    </div>
  );
}