import { NextResponse } from "next/server";
import { fetchUgc } from "@/lib/airtable";

export const runtime = "edge";

export async function GET() {
  try {
    const data = await fetchUgc();
    return NextResponse.json(data);
  } catch (error) {
    console.error("UGC fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch UGC data" },
      { status: 500 }
    );
  }
}
