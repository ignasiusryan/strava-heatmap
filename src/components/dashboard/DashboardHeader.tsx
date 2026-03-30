"use client";

import { ThemeToggle } from "@/components/ThemeToggle";

interface Props {
  athleteName: string;
}

export function DashboardHeader({ athleteName }: Props) {
  return (
    <div
      className="dashboard-header"
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: "1.5rem",
        padding: "0 2rem",
        maxWidth: "1100px",
        flexWrap: "wrap",
        gap: "1rem",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          Run Activity
        </h1>
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            fontWeight: 400,
          }}
        >
          {athleteName}
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <ThemeToggle />
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              cursor: "pointer",
              transition: "all 0.2s",
              letterSpacing: "0.05em",
            }}
          >
            Disconnect
          </button>
        </form>
      </div>
    </div>
  );
}
