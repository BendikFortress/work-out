import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLog, upsertLog } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await params;
  const log = await getLog(Number(session.user.id), date);
  return NextResponse.json(log ?? null);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await params;
  const body = await req.json();

  await upsertLog(Number(session.user.id), date, {
    workoutCompleted: body.workoutCompleted,
    workoutType: body.workoutType,
    bodyWeight: body.weight ?? body.bodyWeight,
    waist: body.waist,
    notes: body.notes,
    exerciseLogs: body.exerciseLogs,
    macros: body.macros,
    mealsChecked: body.mealsChecked,
  });

  return NextResponse.json({ ok: true });
}
