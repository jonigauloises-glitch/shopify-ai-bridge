export const runtime = 'nodejs';
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return { id: json.result.id, url: json.result.url };
}

export async function POST(req) {
  const { prompt, size = "1024x1024" } = await req.json();
  if (!prompt) return new Response(JSON.stringify({ error: "prompt required" }), { status: 400 });
  const gen = await client.images.generate({ model: "gpt-image-1", prompt, size, n: 1, response_format: "b64_json" });
  const dataUrl = `data:image/png;base64,${gen.data[0].b64_json}`;
  const uploaded = await printfulUploadDataUrl(dataUrl);
  return new Response(JSON.stringify({ previewUrl: dataUrl, printfulFileId: uploaded.id }), { status: 200, headers: { "Content-Type": "application/json" }});
}
