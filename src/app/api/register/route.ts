import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByEmail, createUser, upsertSettings } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: "Email and password (min 8 chars) required." }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);
  const userId = await createUser(email, hash);

  // Seed default settings
  await upsertSettings(userId, {
    startDate: new Date().toISOString().split("T")[0],
    startWeight: 82,
    targetWeight: 77,
  });

  return NextResponse.json({ ok: true });
}
