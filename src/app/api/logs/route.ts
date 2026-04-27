import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllLogs } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const logs = await getAllLogs(userId);

  // Return as a map keyed by date
  const map: Record<string, (typeof logs)[0]> = {};
  for (const log of logs) {
    map[log.date] = log;
  }
  return NextResponse.json(map);
}
