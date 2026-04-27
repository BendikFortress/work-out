import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLog, upsertLog, ensureTables } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureTables();
    const { date } = await params;
    const log = await getLog(Number(session.user.id), date);
    return NextResponse.json(log ?? null);
  } catch (err) {
    console.error("[GET /api/logs/:date]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureTables();
    const { date } = await params;
    const body = await req.json();

    await upsertLog(Number(session.user.id), date, {
      workoutCompleted: body.workoutCompleted,
      workoutType: body.workoutType,
      bodyWeight: body.weight ?? body.bodyWeight ?? null,
      waist: body.waist ?? null,
      notes: body.notes ?? null,
      exerciseLogs: body.exerciseLogs ?? {},
      macros: body.macros ?? {},
      mealsChecked: body.mealsChecked ?? {},
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/logs/:date]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
