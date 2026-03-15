export function StravaAttribution() {
  return (
    <a
      href="https://www.strava.com"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        color: "var(--text-dim)",
        fontFamily: "var(--font-mono)",
        fontSize: "0.7rem",
        textDecoration: "none",
        letterSpacing: "0.04em",
        transition: "opacity 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      <svg
        viewBox="0 0 24 24"
        width={14}
        height={14}
        fill="#FC4C02"
        aria-hidden="true"
      >
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
      </svg>
      Powered by Strava
    </a>
  );
}
