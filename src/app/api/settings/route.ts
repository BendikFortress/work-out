import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSettings, upsertSettings, initPlanSchedule, ensureTables } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureTables();
    const settings = await getSettings(Number(session.user.id));
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[GET /api/settings]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureTables();
    const body = await req.json();
    const userId = Number(session.user.id);
    const data = { startDate: body.startDate, startWeight: Number(body.startWeight), targetWeight: Number(body.targetWeight) };
    await upsertSettings(userId, data);
    await initPlanSchedule(userId, data.startDate);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/settings]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
