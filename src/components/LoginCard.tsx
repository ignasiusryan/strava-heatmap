"use client";

import { ThemeToggle } from "./ThemeToggle";
import { StravaAttribution } from "./StravaAttribution";

export function LoginCard() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        animation: "fadeIn 0.6s ease",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "3rem",
          maxWidth: "480px",
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top glow line */}
        <div
          style={{
            position: "absolute",
            top: "-1px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "120px",
            height: "2px",
            background:
              "linear-gradient(90deg, transparent, var(--orange-5), transparent)",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--orange-5)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Strava Heatmap
          </div>
          <ThemeToggle />
        </div>

        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: "0.5rem",
          }}
        >
          Connect your Strava
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.95rem",
            marginBottom: "2rem",
            lineHeight: 1.5,
          }}
        >
          Visualize your running activity like a GitHub contributions chart.
        </p>

        <a
          href="/api/auth/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.85rem 1.5rem",
            border: "none",
            borderRadius: "10px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            background: "var(--orange-5)",
            color: "#000",
            textDecoration: "none",
            fontFamily: "var(--font-sans)",
            transition: "all 0.2s",
          }}
        >
          Connect with Strava
        </a>

        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--text-dim)",
            marginTop: "1.5rem",
            lineHeight: 1.6,
          }}
        >
          Your credentials stay safe — OAuth happens entirely server-side.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "1.5rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          <StravaAttribution />
        </div>
      </div>
    </div>
  );
}
