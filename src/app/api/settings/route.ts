import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSettings, upsertSettings } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getSettings(Number(session.user.id));
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  await upsertSettings(Number(session.user.id), {
    startDate: body.startDate,
    startWeight: Number(body.startWeight),
    targetWeight: Number(body.targetWeight),
  });

  return NextResponse.json({ ok: true });
}
