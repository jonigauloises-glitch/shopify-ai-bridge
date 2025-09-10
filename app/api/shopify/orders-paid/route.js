export const runtime = 'nodejs';
import crypto from "crypto";

function verifyShopify(req, rawBody) {
  const hmac = req.headers.get("x-shopify-hmac-sha256") || "";
  const digest = crypto.createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET).update(rawBody).digest("base64");
  try { return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac)); }
  catch { return false; }
}

export async function POST(req) {
  const raw = Buffer.from(await req.arrayBuffer());
  if (!verifyShopify(req, raw)) return new Response(JSON.stringify({ error: "Invalid HMAC" }), { status: 401, headers: { "Content-Type": "application/json" }});
  const order = JSON.parse(raw.toString("utf8"));
  const shipping = order.shipping_address || order.customer?.default_address || {};
  const recipient = {
    name: `${shipping.first_name || ""} ${shipping.last_name || ""}`.trim() || "Kunde",
    address1: shipping.address1 || "",
    address2: shipping.address2 || undefined,
    city: shipping.city || "",
    zip: shipping.zip || shipping.postal_code || "",
    country_code: (shipping.country_code || shipping.country || "DE").toUpperCase(),
    email: order.email || order.contact_email || "kunde@example.com",
    phone: shipping.phone || order.phone || undefined
  };

  for (const li of (order.line_items || [])) {
    const props = (li.properties || []).reduce((acc, p) => (acc[p.name] = p.value, acc), {});
    const variantId = Number(li.sku && /^\d+$/.test(li.sku) ? li.sku : props["printful_variant_id"]);
    if (!variantId) continue;
    const files = props["Printful File ID"] ? [{ id: Number(props["Printful File ID"]) }] : (props["AI Image URL"] ? [{ url: props["AI Image URL"] }] : []);
    if (!files.length) continue;

    const payload = { external_id: `shopify-${order.id}-${li.id}`, recipient, items: [{ variant_id: variantId, quantity: li.quantity || 1, files }] };
    const res = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: { Authorization: "Basic " + Buffer.from(process.env.PRINTFUL_API_KEY + ":").toString("base64"), "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) console.error("Printful error", await res.text());
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" }});
}
