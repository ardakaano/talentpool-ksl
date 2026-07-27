import { NextResponse } from "next/server";
import { fetchAllTalentPool } from "@/lib/airtable";
import type { TalentFields } from "@/lib/types";

export const runtime = "edge";

const CONCURRENCY = 5;

async function improveText(text: string): Promise<string | null> {
  if (!text || text.length < 20) return null;
  try {
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
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { records } = await fetchAllTalentPool();
        const toImprove = records.filter((r) => {
          const f = r.fields as TalentFields;
          const text = f["İçerikler hk."];
          return typeof text === "string" && text.length >= 20;
        });

        // Also update Airtable
        const BASE_ID = process.env.AIRTABLE_BASE_ID!;
        const TABLE_ID = process.env.AIRTABLE_TABLE_ID!;
        const PAT = process.env.AIRTABLE_PAT!;

        let done = 0;
        const total = toImprove.length;

        controller.enqueue(encoder.encode(`Toplam ${total} influencer iyileştirilecek...\n`));

        // Process in batches
        for (let i = 0; i < toImprove.length; i += CONCURRENCY) {
          const batch = toImprove.slice(i, i + CONCURRENCY);
          const results = await Promise.all(
            batch.map(async (record) => {
              const f = record.fields as TalentFields;
              const original = f["İçerikler hk."] as string;
              const improved = await improveText(original);
              return { id: record.id, name: f["Ad-Soyad"], improved };
            })
          );

          for (const r of results) {
            done++;
            if (r.improved) {
              // Update Airtable
              try {
                await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${r.id}`, {
                  method: "PATCH",
                  headers: {
                    Authorization: `Bearer ${PAT}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    fields: { "İçerikler hk.": r.improved },
                  }),
                });
                controller.enqueue(encoder.encode(`✓ [${done}/${total}] ${r.name}\n`));
              } catch {
                controller.enqueue(encoder.encode(`✗ [${done}/${total}] ${r.name} (Airtable güncelleme hatası)\n`));
              }
            } else {
              controller.enqueue(encoder.encode(`- [${done}/${total}] ${r.name} (iyileştirme başarısız)\n`));
            }
          }
        }

        controller.enqueue(encoder.encode(`\nTamamlandı! ${total} influencer işlendi.\n`));
      } catch (error) {
        controller.enqueue(encoder.encode(`Hata: ${String(error)}\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
