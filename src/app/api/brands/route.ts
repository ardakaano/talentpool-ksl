import { NextResponse } from "next/server";
import { fetchAllBrands } from "@/lib/airtable";

export const runtime = "edge";

export async function GET() {
  try {
    const data = await fetchAllBrands();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Brands fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}
