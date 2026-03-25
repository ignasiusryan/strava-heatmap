"use client";

import { useEffect, useRef, useState } from "react";
import type { Activity } from "./Dashboard";
import { templates } from "./stickers/registry";
import type { InsightTemplate, InsightConfig, Shoe } from "./stickers/types";
import { loadStickerFonts } from "./stickers/shared";
import { downloadCanvas } from "@/lib/download-theme";

interface Props {
  activities: Activity[];
  athleteName: string;
  shoes: Shoe[];
}

// ── Thumbnail ──
function InsightThumb({
  template,
  config,
  selected,
  onClick,
}: {
  template: InsightTemplate;
  config: InsightConfig;
  selected: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = template.width;
    canvas.height = template.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try {
      template.render(ctx, config);
    } catch { /* silently fail */ }
  }, [template, config]);

  return (
    <button
      onClick={onClick}
      className="sticker-thumb"
      style={{
        background: selected ? "var(--orange-1)" : "var(--bg)",
        border: selected ? "2px solid var(--orange-4)" : "2px solid var(--border)",
        borderRadius: "14px",
        padding: "10px",
        cursor: "pointer",
        transition: "all 0.15s",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        aspectRatio: "1",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "auto",
          borderRadius: "8px",
          aspectRatio: "1",
          objectFit: "contain",
        }}
      />
      <span
        style={{
          fontSize: "0.68rem",
          fontFamily: "var(--font-mono)",
          color: selected ? "var(--orange-5)" : "var(--text-muted)",
          fontWeight: selected ? 600 : 400,
          letterSpacing: "0.02em",
        }}
      >
        {template.name}
      </span>
    </button>
  );
}

// ── Full preview with download ──
function InsightPreview({
  template,
  config,
}: {
  template: InsightTemplate;
  config: InsightConfig;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = template.width;
    canvas.height = template.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try {
      template.render(ctx, config);
    } catch { /* silently fail */ }
  }, [template, config]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadCanvas(canvas, `lariviz-${template.id}.png`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <div
        style={{
          background: "repeating-conic-gradient(#1a1a1a 0% 25%, #222 0% 50%) 50% / 20px 20px",
          borderRadius: "16px",
          padding: "20px",
          display: "inline-block",
          maxWidth: "100%",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "min(400px, 100%)",
            height: "auto",
            borderRadius: "12px",
            aspectRatio: "1",
          }}
        />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: "0.5rem" }}>
          {template.description}
        </div>
        <button
          onClick={handleDownload}
          style={{
            background: "var(--orange-5)",
            color: "#000",
            border: "none",
            padding: "0.6rem 2rem",
            borderRadius: "10px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          Download PNG
        </button>
      </div>
    </div>
  );
}

// ── Main StickerTab ──
export function StickerTab({ activities, athleteName, shoes }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("top-gears");
  const [theme, setTheme] = useState<"dark" | "clear">("dark");
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    loadStickerFonts().then(() => setFontsReady(true));
  }, []);

  const currentTemplate = templates.find((t) => t.id === selectedTemplate) || templates[0];

  const config: InsightConfig = {
    activities,
    theme,
    athleteName,
    shoes,
  };

  if (!fontsReady) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
        Loading sticker fonts...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Theme toggle */}
      <div style={{ display: "flex", gap: "0.25rem" }}>
        {(["dark", "clear"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            style={{
              padding: "0.35rem 0.75rem",
              border: theme === t ? "1px solid var(--orange-3)" : "1px solid var(--border)",
              borderRadius: "6px",
              background: theme === t ? "var(--orange-1)" : "transparent",
              color: theme === t ? "var(--orange-5)" : "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Preview */}
      <InsightPreview template={currentTemplate} config={config} />

      {/* Template gallery */}
      <div>
        <label style={sectionLabel}>Insight Stickers</label>
        <div
          className="sticker-gallery"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "0.6rem",
          }}
        >
          {templates.map((t) => (
            <InsightThumb
              key={t.id}
              template={t}
              config={config}
              selected={selectedTemplate === t.id}
              onClick={() => setSelectedTemplate(t.id)}
            />
          ))}
        </div>
      </div>

      {activities.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          No runs found. Try a different filter.
        </div>
      )}
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  display: "block",
  fontSize: "0.7rem",
  fontFamily: "var(--font-mono)",
  color: "var(--text-muted)",
  marginBottom: "0.5rem",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};
