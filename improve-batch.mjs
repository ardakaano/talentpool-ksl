import 'dotenv/config';

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID || !OPENROUTER_KEY) {
  console.error("Missing environment variables. Check .env.local");
  process.exit(1);
}

const CONCURRENCY = 5;

async function fetchAll() {
  const allRecords = [];
  let offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`);
    url.searchParams.set("maxRecords", "200");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
    });
    const data = await res.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);
  return allRecords;
}

async function improveText(text) {
  if (!text || text.length < 20) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
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
      const data = await res.json();
      const improved = data.choices?.[0]?.message?.content?.trim();
      if (improved) return improved;
    } catch (e) {
      console.error(`  Retry ${attempt + 1}: ${e.message}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}

async function updateAirtable(recordId, improvedText) {
  await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${recordId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${AIRTABLE_PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: { "İçerikler hk.": improvedText } }),
  });
}

async function main() {
  console.log("Fetching records...");
  const records = await fetchAll();
  
  const toImprove = records.filter(r => {
    const text = r.fields["İçerikler hk."];
    return typeof text === "string" && text.length >= 20;
  });

  console.log(`Found ${toImprove.length} records to improve\n`);

  let done = 0;
  const total = toImprove.length;

  for (let i = 0; i < toImprove.length; i += CONCURRENCY) {
    const batch = toImprove.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (r) => {
        const improved = await improveText(r.fields["İçerikler hk."] || "");
        return { id: r.id, name: r.fields["Ad-Soyad"], improved };
      })
    );

    for (const r of results) {
      done++;
      if (r.improved) {
        try {
          await updateAirtable(r.id, r.improved);
          console.log(`✓ [${done}/${total}] ${r.name}`);
        } catch (e) {
          console.log(`✗ [${done}/${total}] ${r.name} (update failed)`);
        }
      } else {
        console.log(`- [${done}/${total}] ${r.name} (improve failed)`);
      }
    }
  }

  console.log(`\nDone! ${done} records processed.`);
}

main().catch(console.error);
