import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSettings, initPlanSchedule, ensureTables } from "@/lib/db";

/** Seed / re-seed the 63-day workout schedule for the authenticated user. */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureTables();
    const userId = Number(session.user.id);
    const settings = await getSettings(userId);
    await initPlanSchedule(userId, settings.startDate);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/schedule]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
