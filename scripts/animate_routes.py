#!/usr/bin/env python3
"""
Strava Route Animation Generator
Fetches running data from Strava, then generates an animated GIF
showing routes appearing chronologically on a dark canvas.

Usage:
  python3 scripts/animate_routes.py

  First run will open a browser for Strava OAuth.
  Subsequent runs reuse the saved token.
"""

import json
import os
import sys
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse, parse_qs

import requests
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from matplotlib.collections import LineCollection
from PIL import Image

# ── Config ──────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
TOKEN_FILE = SCRIPT_DIR / ".strava_token.json"
OUTPUT_GIF = PROJECT_DIR / "route-animation.gif"

# Read credentials from .env.local
def load_env():
    env = {}
    env_file = PROJECT_DIR / ".env.local"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env

ENV = load_env()
CLIENT_ID = ENV.get("STRAVA_CLIENT_ID", "")
CLIENT_SECRET = ENV.get("STRAVA_CLIENT_SECRET", "")
REDIRECT_URI = "http://localhost:9876/callback"


# ── Polyline decoder ────────────────────────────────────────────
def decode_polyline(encoded):
    points = []
    index = lat = lng = 0
    while index < len(encoded):
        for var in ("lat", "lng"):
            shift = result = 0
            while True:
                b = ord(encoded[index]) - 63
                index += 1
                result |= (b & 0x1F) << shift
                shift += 5
                if b < 0x20:
                    break
            delta = ~(result >> 1) if result & 1 else result >> 1
            if var == "lat":
                lat += delta
            else:
                lng += delta
        points.append((lat / 1e5, lng / 1e5))
    return points


# ── OAuth flow ──────────────────────────────────────────────────
class CallbackHandler(BaseHTTPRequestHandler):
    code = None

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/callback":
            params = parse_qs(parsed.query)
            CallbackHandler.code = params.get("code", [None])[0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<h2>Authorized! You can close this tab.</h2>")
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *args):
        pass  # Silence logs


def authenticate():
    """Get a valid access token, refreshing or re-authing as needed."""
    # Try loading saved token
    if TOKEN_FILE.exists():
        token_data = json.loads(TOKEN_FILE.read_text())
        # Check if expired
        if token_data.get("expires_at", 0) > datetime.now().timestamp() + 300:
            return token_data["access_token"]
        # Try refresh
        if token_data.get("refresh_token"):
            print("Refreshing token...")
            res = requests.post("https://www.strava.com/oauth/token", json={
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "grant_type": "refresh_token",
                "refresh_token": token_data["refresh_token"],
            })
            if res.ok:
                data = res.json()
                token_data.update({
                    "access_token": data["access_token"],
                    "refresh_token": data["refresh_token"],
                    "expires_at": data["expires_at"],
                })
                TOKEN_FILE.write_text(json.dumps(token_data))
                return data["access_token"]

    # Need full OAuth flow
    print("Opening browser for Strava authorization...")
    auth_url = (
        f"https://www.strava.com/oauth/authorize"
        f"?client_id={CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={REDIRECT_URI}"
        f"&approval_prompt=auto"
        f"&scope=read,activity:read_all"
    )
    webbrowser.open(auth_url)

    # Start local server to catch callback
    server = HTTPServer(("localhost", 9876), CallbackHandler)
    print("Waiting for authorization callback...")
    while CallbackHandler.code is None:
        server.handle_request()
    server.server_close()

    # Exchange code for token
    print("Exchanging code for token...")
    res = requests.post("https://www.strava.com/oauth/token", json={
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": CallbackHandler.code,
        "grant_type": "authorization_code",
    })
    if not res.ok:
        print(f"Token exchange failed: {res.text}")
        sys.exit(1)

    data = res.json()
    token_data = {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "expires_at": data["expires_at"],
        "athlete": data.get("athlete", {}).get("firstname", ""),
    }
    TOKEN_FILE.write_text(json.dumps(token_data))
    return data["access_token"]


# ── Fetch activities ────────────────────────────────────────────
def fetch_activities(token):
    print("Fetching activities from Strava...")
    all_activities = []
    page = 1
    while page <= 10:
        res = requests.get(
            "https://www.strava.com/api/v3/athlete/activities",
            headers={"Authorization": f"Bearer {token}"},
            params={"per_page": 200, "page": page},
        )
        if not res.ok:
            print(f"API error: {res.status_code}")
            break
        batch = res.json()
        if not batch:
            break
        all_activities.extend(batch)
        if len(batch) < 200:
            break
        page += 1

    runs = [
        a for a in all_activities
        if a.get("type") == "Run" or a.get("sport_type") == "Run"
    ]
    # Sort chronologically
    runs.sort(key=lambda a: a["start_date_local"])
    print(f"Found {len(runs)} runs")
    return runs


# ── Animation ───────────────────────────────────────────────────
def generate_animation(runs):
    # Decode all polylines
    routes = []
    for run in runs:
        polyline = run.get("map", {}).get("summary_polyline")
        if not polyline:
            continue
        pts = decode_polyline(polyline)
        if len(pts) < 2:
            continue
        date = run["start_date_local"][:10]
        dist_km = run["distance"] / 1000
        name = run.get("name", "")
        routes.append({"pts": pts, "date": date, "km": dist_km, "name": name})

    if not routes:
        print("No routes with GPS data found!")
        sys.exit(1)

    print(f"Rendering {len(routes)} routes...")

    # Find bounding box across all routes
    all_lats = [p[0] for r in routes for p in r["pts"]]
    all_lngs = [p[1] for r in routes for p in r["pts"]]
    min_lat, max_lat = min(all_lats), max(all_lats)
    min_lng, max_lng = min(all_lngs), max(all_lngs)

    # Add padding
    pad_lat = (max_lat - min_lat) * 0.08
    pad_lng = (max_lng - min_lng) * 0.08
    min_lat -= pad_lat
    max_lat += pad_lat
    min_lng -= pad_lng
    max_lng += pad_lng

    # Figure setup
    dpi = 150
    fig_w, fig_h = 10, 10
    fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=dpi)

    bg_color = "#0a0a0a"
    route_old_color = "#3d2a08"
    route_new_color = "#ff8c00"
    route_glow_color = "#ff8c00"
    text_color = "#e8e8e8"
    muted_color = "#666666"
    orange_color = "#ff8c00"

    fig.patch.set_facecolor(bg_color)
    ax.set_facecolor(bg_color)

    # Cumulative stats
    total_km = 0
    total_runs = 0

    frames = []

    # Generate a frame every N routes to keep GIF reasonable
    total_routes = len(routes)
    if total_routes <= 60:
        frame_indices = list(range(total_routes))
    else:
        # Show every route but batch them into ~120 frames
        batch_size = max(1, total_routes // 120)
        frame_indices = list(range(0, total_routes, batch_size))
        if frame_indices[-1] != total_routes - 1:
            frame_indices.append(total_routes - 1)

    for frame_i, up_to in enumerate(frame_indices):
        ax.clear()
        ax.set_facecolor(bg_color)
        ax.set_xlim(min_lng, max_lng)
        ax.set_ylim(min_lat, max_lat)
        ax.set_aspect("equal")
        ax.axis("off")

        # Draw all routes up to this point
        for i in range(up_to + 1):
            r = routes[i]
            lngs = [p[1] for p in r["pts"]]
            lats = [p[0] for p in r["pts"]]

            is_latest = (i == up_to)

            if is_latest:
                # Latest route: bright orange with glow
                ax.plot(lngs, lats,
                        color=route_glow_color, linewidth=2.5, alpha=0.4, zorder=3)
                ax.plot(lngs, lats,
                        color=route_new_color, linewidth=1.2, alpha=1.0, zorder=4)
            else:
                # Older routes: dim orange
                ax.plot(lngs, lats,
                        color=route_old_color, linewidth=0.6, alpha=0.7, zorder=1)

        # Compute cumulative stats up to this frame
        total_km = sum(routes[i]["km"] for i in range(up_to + 1))
        total_runs = up_to + 1
        current_date = routes[up_to]["date"]

        # Date counter (top-left)
        ax.text(0.03, 0.97, current_date,
                transform=ax.transAxes,
                fontsize=16, fontweight="bold", fontfamily="monospace",
                color=text_color, va="top",
                path_effects=[pe.withStroke(linewidth=3, foreground=bg_color)])

        # Stats (top-right)
        stats_text = f"{total_runs} runs  ·  {total_km:.0f} km"
        ax.text(0.97, 0.97, stats_text,
                transform=ax.transAxes,
                fontsize=11, fontfamily="monospace",
                color=muted_color, va="top", ha="right",
                path_effects=[pe.withStroke(linewidth=3, foreground=bg_color)])

        # Latest run name (bottom)
        ax.text(0.03, 0.03, routes[up_to]["name"],
                transform=ax.transAxes,
                fontsize=9, fontfamily="monospace",
                color=orange_color, va="bottom",
                path_effects=[pe.withStroke(linewidth=3, foreground=bg_color)])

        # Brand
        ax.text(0.97, 0.03, "STRAVA HEATMAP",
                transform=ax.transAxes,
                fontsize=7, fontfamily="monospace", fontweight="bold",
                color=orange_color, alpha=0.5, va="bottom", ha="right",
                path_effects=[pe.withStroke(linewidth=2, foreground=bg_color)])

        # Render frame
        fig.tight_layout(pad=0.5)
        fig.canvas.draw()

        # Convert to PIL Image
        w, h = fig.canvas.get_width_height()
        buf = fig.canvas.buffer_rgba()
        img = Image.frombuffer("RGBA", (w, h), buf, "raw", "RGBA", 0, 1).copy()
        frames.append(img)

        pct = (frame_i + 1) / len(frame_indices) * 100
        print(f"\r  Rendering frame {frame_i + 1}/{len(frame_indices)} ({pct:.0f}%)", end="", flush=True)

    print()
    plt.close(fig)

    # Save GIF
    print(f"Saving GIF ({len(frames)} frames)...")
    # Hold last frame longer
    durations = [100] * len(frames)  # 100ms per frame
    durations[-1] = 3000  # Hold last frame 3s

    frames[0].save(
        str(OUTPUT_GIF),
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
    )

    file_size = OUTPUT_GIF.stat().st_size / (1024 * 1024)
    print(f"Done! Saved to {OUTPUT_GIF} ({file_size:.1f} MB)")


# ── Main ────────────────────────────────────────────────────────
if __name__ == "__main__":
    if not CLIENT_ID or not CLIENT_SECRET:
        print("Error: STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be set in .env.local")
        sys.exit(1)

    token = authenticate()
    runs = fetch_activities(token)
    generate_animation(runs)
