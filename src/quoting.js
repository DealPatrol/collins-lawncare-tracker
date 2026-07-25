// ── AI satellite yard quoting ────────────────────────────────────
// Turns a saved lead's GPS pin into a rough size/complexity read and a
// suggested price — no site visit needed. This is genuinely new: reading
// lawn size and obstacles off a satellite photo used to mean either paying
// a per-report aerial measurement service or training a bespoke computer
// vision model. A general vision-capable LLM does a "good enough for a
// ballpark" read for a few cents a lead, which wasn't practical before.
//
// The model is asked ONLY to classify size/complexity from the image — it
// never invents a dollar figure. Pricing math stays deterministic and
// grounded in the crew's own current prices (see estimatePriceRange), so a
// bad or hallucinated read can only push the estimate up/down a size
// bracket, not produce an arbitrary number.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
// Haiku: cheap and fast, appropriate for a low-stakes rough read done per lead.
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

// Esri's public World Imagery export endpoint — no API key, and used
// directly by web map libraries (Leaflet, OpenLayers) so it's CORS-enabled.
// We pass its URL straight to Anthropic as a url-source image, so the
// image is fetched server-side and the browser never needs to read the
// cross-origin pixel bytes itself.
export function satelliteImageUrl(coords, { radiusM = 30 } = {}) {
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((coords.lat * Math.PI) / 180));
  const bbox = [coords.lng - dLng, coords.lat - dLat, coords.lng + dLng, coords.lat + dLat].join(",");
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=512,512&format=png&f=image`;
}

const PROMPT = `You are helping a residential lawn care business get a rough, non-binding size read on a yard from a satellite photo, for pricing purposes only — this is not a survey and will be confirmed on-site.

Look at the property at the center of this image (ignore neighboring parcels) and judge the mowable lawn area and how complex it looks to mow/trim.

Respond with ONLY valid JSON, no other text, no markdown fences:
{"sizeBucket":"small|medium|large|xlarge","estimatedSqFt":<number>,"complexity":"simple|moderate|complex","obstacles":[<short strings, e.g. "mature trees","steep slope","garden beds","pool">],"confidence":"low|medium|high","notes":"<one short sentence>"}

sizeBucket guide: small <5,000 sqft mowable area, medium 5,000-10,000, large 10,000-20,000, xlarge >20,000.
complexity guide: simple = open flat lawn; moderate = some obstacles or slope; complex = many obstacles, steep grade, or heavily subdivided beds/borders.
If the image is unclear or doesn't show a residential lawn, set confidence to "low" and say why in notes.`;

const SIZE_MULT = { small: 0.7, medium: 1, large: 1.4, xlarge: 1.9 };
const COMPLEXITY_MULT = { simple: 1, moderate: 1.15, complex: 1.35 };

// Deterministic, not AI-derived: scales the crew's own average per-visit
// price by the model's size/complexity read. A ±15% band around that,
// rounded to the nearest $5, keeps it honest as a starting point, not a
// firm quote.
export function estimatePriceRange(estimate, basePrice) {
  const sizeMult = SIZE_MULT[estimate.sizeBucket] || 1;
  const complexityMult = COMPLEXITY_MULT[estimate.complexity] || 1;
  const mid = (basePrice || 45) * sizeMult * complexityMult;
  const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);
  return { low: round5(mid * 0.85), high: round5(mid * 1.15) };
}

function extractJson(text) {
  const match = (text || "").match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function estimateYard({ apiKey, coords, basePrice }) {
  if (!apiKey) throw new Error("Add your Anthropic API key in Settings → AI Yard Quoting first.");
  if (!coords) throw new Error("This lead needs a GPS pin before it can be estimated.");

  const imageUrl = satelliteImageUrl(coords);
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (res.status === 401) throw new Error("Anthropic rejected the API key — check it in Settings.");
  if (!res.ok) throw new Error(`Estimate failed (HTTP ${res.status}).`);

  const data = await res.json();
  const text = (data?.content || []).find((b) => b.type === "text")?.text || "";
  const parsed = extractJson(text);
  if (!parsed?.sizeBucket) throw new Error("Couldn't read the estimate — try again.");

  const price = estimatePriceRange(parsed, basePrice);
  return { ...parsed, imageUrl, priceLow: price.low, priceHigh: price.high, estimatedAt: Date.now() };
}
