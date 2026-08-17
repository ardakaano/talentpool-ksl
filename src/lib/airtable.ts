import { AirtableResponse } from "./types";

const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = process.env.AIRTABLE_TABLE_ID!;
const PAT = process.env.AIRTABLE_PAT!;

export async function fetchAllTalentPool(): Promise<AirtableResponse> {
  return fetchTalentTable();
}

export async function fetchAgencySafe(): Promise<AirtableResponse> {
  return fetchTalentTable(process.env.AIRTABLE_AGENCY_SAFE_VIEW_ID);
}

async function fetchTalentTable(viewId?: string): Promise<AirtableResponse> {
  const allRecords: AirtableResponse["records"] = [];
  let offset: string | undefined;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`
    );
    url.searchParams.set("maxRecords", "200");
    if (viewId) url.searchParams.set("view", viewId);
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

async function fetchAirtableTable(tableId: string, viewId?: string): Promise<AirtableResponse> {
  const allRecords: AirtableResponse["records"] = [];
  let offset: string | undefined;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${BASE_ID}/${tableId}`
    );
    url.searchParams.set("maxRecords", "200");
    if (viewId) url.searchParams.set("view", viewId);
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

const BRANDS_TABLE_ID = process.env.AIRTABLE_BRANDS_TABLE_ID!;
const BRANDS_VIEW_ID = process.env.AIRTABLE_BRANDS_VIEW_ID!;
const UGC_TABLE_ID = process.env.AIRTABLE_UGC_TABLE_ID!;
const UGC_VIEW_ID = process.env.AIRTABLE_UGC_VIEW_ID;

export async function fetchAllBrands(): Promise<AirtableResponse> {
  return fetchAirtableTable(BRANDS_TABLE_ID, BRANDS_VIEW_ID);
}

export async function fetchUgc(): Promise<AirtableResponse> {
  return fetchAirtableTable(UGC_TABLE_ID, UGC_VIEW_ID);
}
