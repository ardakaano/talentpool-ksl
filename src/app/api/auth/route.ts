import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const valid = password === process.env.DASHBOARD_PASSWORD;
    return NextResponse.json({ valid });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
