import { NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";

const COOKIE_NAME = "strava_session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=no_code`);
  }

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    return NextResponse.redirect(
      `${origin}/?error=token_exchange_failed&detail=${encodeURIComponent(errBody)}`
    );
  }

  const data = await tokenRes.json();

  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete_id: data.athlete.id,
    athlete_name: `${data.athlete.firstname || ""} ${data.athlete.lastname || ""}`.trim(),
  };

  const response = NextResponse.redirect(origin);
  response.cookies.set(COOKIE_NAME, encrypt(JSON.stringify(session)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
