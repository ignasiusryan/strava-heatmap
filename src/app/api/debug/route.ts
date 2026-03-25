import { NextResponse } from "next/server";
import { stravaFetch } from "@/lib/strava";

export async function GET() {
  try {
    // Fetch first page of activities
    const activitiesRes = await stravaFetch("/athlete/activities?per_page=5&page=1");
    const activities = activitiesRes.ok ? await activitiesRes.json() : [];

    // Fetch athlete profile
    const athleteRes = await stravaFetch("/athlete");
    const athlete = athleteRes.ok ? await athleteRes.json() : {};

    // Pick first run
    const firstRun = activities.find((a: Record<string, unknown>) => a.type === "Run");

    return NextResponse.json({
      sample_activity_keys: firstRun ? Object.keys(firstRun) : [],
      sample_activity: firstRun
        ? {
            id: firstRun.id,
            name: firstRun.name,
            start_latlng: firstRun.start_latlng,
            location_city: firstRun.location_city,
            location_state: firstRun.location_state,
            location_country: firstRun.location_country,
            timezone: firstRun.timezone,
            average_temp: firstRun.average_temp,
            gear_id: firstRun.gear_id,
          }
        : null,
      athlete_has_shoes: Array.isArray(athlete.shoes),
      athlete_shoes_count: Array.isArray(athlete.shoes) ? athlete.shoes.length : 0,
      athlete_shoes_sample: Array.isArray(athlete.shoes) ? athlete.shoes.slice(0, 2) : [],
      athlete_keys: Object.keys(athlete),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
