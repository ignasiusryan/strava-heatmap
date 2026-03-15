import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const host = request.headers.get("host");
  const xForwardedHost = request.headers.get("x-forwarded-host");
  const xForwardedProto = request.headers.get("x-forwarded-proto");
  const cookies = request.cookies.getAll().map((c) => c.name);

  return NextResponse.json({
    origin,
    host,
    xForwardedHost,
    xForwardedProto,
    cookies,
    env: {
      clientId: process.env.STRAVA_CLIENT_ID,
      secretPrefix: process.env.STRAVA_CLIENT_SECRET?.slice(0, 6) + "...",
      secretLength: process.env.STRAVA_CLIENT_SECRET?.length,
      hasCookieSecret: !!process.env.COOKIE_SECRET,
      nodeEnv: process.env.NODE_ENV,
    },
  });
}
