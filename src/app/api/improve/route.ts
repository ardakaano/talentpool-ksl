import { NextResponse } from "next/server";

export const runtime = "edge";

const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = process.env.AIRTABLE_TABLE_ID!;
const PAT = process.env.AIRTABLE_PAT!;

export async function POST(req: Request) {
  try {
    const { text, recordId, save } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text required" }, { status: 400 });
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-pro",
        messages: [{
          role: "user",
          content: `Aşağıdaki metin, bir sosyal medya influencer'ının kendi içerik üretim tarzını anlattığı tanıtım yazısıdır. Bu metni daha profesyonel, akıcı, derli toplu ve etkileyici bir hale getir. Yazım hatalarını düzelt, cümleleri daha düzgün paragraflar halinde düzenle. Anlamı ve içeriği koru, sadece anlatımı iyileştir. Çıktı olarak sadece düzeltilmiş metni ver, başka hiçbir şey ekleme.\n\nORİJİNAL METİN:\n${text}`,
        }],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenRouter error:", err);
      return NextResponse.json({ error: "AI API error" }, { status: 500 });
    }

    const data = await res.json();
    const improved = data.choices?.[0]?.message?.content?.trim();

    if (!improved) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    let saved = false;
    if (save && recordId) {
      try {
        const patchRes = await fetch(
          `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${PAT}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ fields: { "İçerikler hk.": improved } }),
          }
        );
        saved = patchRes.ok;
      } catch {
        saved = false;
      }
    }

    return NextResponse.json({ improved, saved });
  } catch (error) {
    console.error("Improve error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
