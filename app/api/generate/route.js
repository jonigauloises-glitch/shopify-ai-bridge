export const runtime = 'nodejs';
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- CORS helpers ---
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
// ---------------------

async function printfulUploadDataUrl(imageDataUrl) {
  const m = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!m) throw new Error("Ungültiges Bildformat");
  const buf = Buffer.from(m[2], "base64");
  const form = new FormData();
  form.append("file", new Blob([buf], { type: m[1] }), "artwork.png");
  const res = await fetch("https://api.printful.com/files", {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(process.env.PRINTFUL_API_KEY + ":").toString("base64") },
    body: form
  });
  if (!res.ok) throw new Error(`Printful /files ${res.status}: ${await res.text()}`);
  const jsonRes = await res.json();
  return { id: jsonRes.result.id, url: jsonRes.result.url };
}

export async function POST(req) {
  try {
    const { prompt, size = "1024x1024" } = await req.json();
    if (!prompt) return json({ error: "prompt required" }, 400);

    // 1) Bild generieren
    const gen = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
      n: 1,
      response_format: "b64_json"
    });
    const dataUrl = `data:image/png;base64,${gen.data[0].b64_json}`;

    // 2) Direkt bei Printful hochladen
    const uploaded = await printfulUploadDataUrl(dataUrl);

    return json({ previewUrl: dataUrl, printfulFileId: uploaded.id });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 400);
  }
}
