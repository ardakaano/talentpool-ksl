import { NextResponse } from "next/server";
import { fetchAllTalentPool } from "@/lib/airtable";

export async function GET() {
  try {
    const data = await fetchAllTalentPool();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Airtable fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
