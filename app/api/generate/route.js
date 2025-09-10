export const runtime = 'nodejs';
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- CORS ---
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
export async function OPTIONS(){ return new Response(null, { status: 204, headers: CORS_HEADERS }); }
// -----------

export async function POST(req) {
  try {
    const { prompt, size = "1024x1024" } = await req.json();
    if (!prompt) return json({ error: "prompt required" }, 400);

    const gen = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
      n: 1,
      response_format: "b64_json"
    });

    const dataUrl = `data:image/png;base64,${gen.data[0].b64_json}`;
    return json({ previewUrl: dataUrl });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 400);
  }
}
