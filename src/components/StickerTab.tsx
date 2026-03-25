"use client";

import { useEffect, useRef, useState } from "react";
import type { Activity } from "./Dashboard";
import { templates } from "./stickers/registry";
import type { InsightTemplate, InsightConfig, Shoe } from "./stickers/types";
import { loadStickerFonts } from "./stickers/shared";

interface Props {
  activities: Activity[];
  athleteName: string;
  shoes: Shoe[];
}

/** Render a sticker template onto a canvas at a given scale factor */
function renderScaled(
  canvas: HTMLCanvasElement,
  template: InsightTemplate,
  config: InsightConfig,
  scale: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = template.width * scale;
  canvas.height = template.height * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, template.width, template.height);
  try {
    template.render(ctx, config);
  } catch {
    /* silently fail */
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ── Thumbnail ──
function InsightThumb({
  template,
  config,
  selected,
  onClick,
  isClear,
}: {
  template: InsightTemplate;
  config: InsightConfig;
  selected: boolean;
  onClick: () => void;
  isClear: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    renderScaled(canvas, template, config, dpr);
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
          background: isClear ? "#1a1a1a" : undefined,
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
  isClear,
}: {
  template: InsightTemplate;
  config: InsightConfig;
  isClear: boolean;
}) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const downloadRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Render preview at device DPR for crisp display
    if (previewRef.current) {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      renderScaled(previewRef.current, template, config, dpr);
    }
    // Render download canvas at 3x for high-res export
    if (downloadRef.current) {
      renderScaled(downloadRef.current, template, config, 3);
    }
  }, [template, config]);

  const handleDownload = () => {
    const canvas = downloadRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `lariviz-${template.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <div
        style={{
          background: isClear
            ? "repeating-conic-gradient(#1a1a1a 0% 25%, #222 0% 50%) 50% / 20px 20px"
            : "repeating-conic-gradient(#e0e0e0 0% 25%, #f0f0f0 0% 50%) 50% / 20px 20px",
          borderRadius: "16px",
          padding: "20px",
          display: "inline-block",
          maxWidth: "100%",
        }}
      >
        <canvas
          ref={previewRef}
          style={{
            width: "min(400px, 100%)",
            height: "auto",
            borderRadius: "12px",
            aspectRatio: "1",
          }}
        />
        {/* Hidden high-res canvas for download */}
        <canvas ref={downloadRef} style={{ display: "none" }} />
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
      <InsightPreview template={currentTemplate} config={config} isClear={theme === "clear"} />

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
              isClear={theme === "clear"}
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
