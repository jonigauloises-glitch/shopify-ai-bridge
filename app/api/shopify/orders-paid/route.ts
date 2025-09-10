import crypto from "crypto";

function verifyShopify(req: Request, rawBody: Buffer) {
  const hmac = req.headers.get("x-shopify-hmac-sha256") || "";
  const digest = crypto
    .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

export async function POST(req: Request) {
  const raw = Buffer.from(await req.arrayBuffer());
  if (!verifyShopify(req, raw))
    return Response.json({ error: "Invalid HMAC" }, { status: 401 });

  const order = JSON.parse(raw.toString("utf8"));
  const shipping = order.shipping_address || {};

  const recipient = {
    name: `${shipping.first_name || ""} ${shipping.last_name || ""}`.trim() || "Kunde",
    address1: shipping.address1 || "",
    city: shipping.city || "",
    zip: shipping.zip || "",
    country_code: (shipping.country_code || "DE").toUpperCase(),
    email: order.email || "kunde@example.com"
  };

  for (const li of order.line_items || []) {
    const props = (li.properties || []).reduce((acc: any, p: any) => {
      acc[p.name] = p.value;
      return acc;
    }, {});
    const variantId = Number(li.sku || props["printful_variant_id"]);
    if (!variantId) continue;

    const files = props["Printful File ID"] ? [{ id: Number(props["Printful File ID"]) }] : [];
    if (!files.length) continue;

    const payload = {
      external_id: `shopify-${order.id}-${li.id}`,
      recipient,
      items: [{ variant_id: variantId, quantity: li.quantity, files }]
    };

    const res = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(process.env.PRINTFUL_API_KEY! + ":").toString("base64"),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) console.error("Printful error", await res.text());
  }

  return Response.json({ ok: true });
}
