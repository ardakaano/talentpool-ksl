import { AirtableResponse } from "./types";

const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = process.env.AIRTABLE_TABLE_ID!;
const PAT = process.env.AIRTABLE_PAT!;

export async function fetchAllTalentPool(): Promise<AirtableResponse> {
  const allRecords: AirtableResponse["records"] = [];
  let offset: string | undefined;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`
    );
    url.searchParams.set("maxRecords", "200");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${PAT}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Airtable API error: ${res.status} ${res.statusText}`);
    }

    const data: AirtableResponse = await res.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return { records: allRecords };
}
