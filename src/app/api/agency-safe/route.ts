import { NextResponse } from "next/server";
import { fetchAgencySafe } from "@/lib/airtable";

export const runtime = "edge";

export async function GET() {
  try {
    const data = await fetchAgencySafe();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Agency Safe fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agency safe data" },
      { status: 500 }
    );
  }
}
