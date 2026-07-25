// ── Prospector ────────────────────────────────────────────────
// Finds the highest-value parcels around a zone's yards using county
// parcel records (via the Regrid API), and writes the outreach message
// so the crew only has to press send.
//
// Owner names, property addresses, and assessed values are public tax
// records. Phone numbers are NOT — the outreach flow is built around a
// letter/door hanger to the property, with text/email unlocked only when
// the user has a number or email the owner actually gave them (cold texts
// to looked-up numbers violate the TCPA at $500–$1,500 per message).

import { haversineMeters } from "./utils.js";

const REGRID_POINT_URL = "https://app.regrid.com/api/v2/parcels/point";

function num(v) {
  const n = parseFloat(v);
  return isFinite(n) && n > 0 ? n : 0;
}

// "SMITH JOHN A & SMITH JANE B" → "Smith John A & Smith Jane B"
export function titleCaseOwner(owner) {
  if (!owner) return "";
  return owner
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bLlc\b/g, "LLC")
    .trim();
}

// Rough centroid of the first polygon ring, for parcels without lat/lon.
function geometryCentroid(geometry) {
  let ring = null;
  if (geometry?.type === "Polygon") ring = geometry.coordinates?.[0];
  if (geometry?.type === "MultiPolygon") ring = geometry.coordinates?.[0]?.[0];
  if (!ring?.length) return null;
  const lng = ring.reduce((a, c) => a + c[0], 0) / ring.length;
  const lat = ring.reduce((a, c) => a + c[1], 0) / ring.length;
  return isFinite(lat) && isFinite(lng) ? { lat, lng } : null;
}

function parseParcel(feature) {
  const p = feature?.properties?.fields || feature?.properties || {};
  if (!p.address) return null; // unaddressed strips, rights-of-way, etc.
  const lat = parseFloat(p.lat);
  const lng = parseFloat(p.lon);
  const coords =
    isFinite(lat) && isFinite(lng) ? { lat, lng } : geometryCentroid(feature.geometry);
  const value = num(p.parval) || num(p.improvval) + num(p.landval) || num(p.saleprice);
  return {
    id: p.ll_uuid || p.parcelnumb || `${p.address}|${p.szip || ""}`,
    address: p.address,
    city: p.scity || "",
    zip: p.szip || "",
    owner: titleCaseOwner(p.owner),
    mailAddress: [p.mailadd, p.mail_city, p.mail_state2, p.mail_zip].filter(Boolean).join(", "),
    use: p.usedesc || "",
    value,
    coords,
  };
}

export async function fetchNearbyParcels(center, radiusM, token) {
  const url =
    `${REGRID_POINT_URL}?lat=${center.lat.toFixed(6)}&lon=${center.lng.toFixed(6)}` +
    `&radius=${Math.round(radiusM)}&limit=100&token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (res.status === 401 || res.status === 403) {
    throw new Error("Regrid rejected the API key — check it in Settings.");
  }
  if (!res.ok) throw new Error(`Parcel lookup failed (HTTP ${res.status}).`);
  const data = await res.json();
  const features = data?.parcels?.features || data?.features || [];
  return features.map(parseParcel).filter(Boolean);
}

const normalizeAddr = (a) => (a || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Top parcels by assessed value, excluding yards we already mow and leads
// we already logged (matched by address or by pin within ~40 m).
export function rankParcels(parcels, { jobs = [], prospects = [], center, limit = 10 }) {
  const knownAddrs = new Set(
    [...jobs, ...prospects].map((x) => normalizeAddr(x.address)).filter(Boolean)
  );
  const knownCoords = [...jobs, ...prospects].map((x) => x.coords).filter(Boolean);

  const seen = new Set();
  return parcels
    .filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      if (knownAddrs.has(normalizeAddr(p.address))) return false;
      if (p.coords && knownCoords.some((c) => haversineMeters(p.coords, c) < 40)) return false;
      return p.value > 0;
    })
    .map((p) => ({ ...p, distanceM: p.coords && center ? haversineMeters(center, p.coords) : null }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function formatValueShort(value) {
  if (!value) return "—";
  if (value >= 1e6) return `$${(value / 1e6).toFixed(value >= 10e6 ? 0 : 1)}M`;
  if (value >= 1e3) return `$${Math.round(value / 1e3)}k`;
  return `$${Math.round(value)}`;
}

// Web search for the county tax record when a parcel came in without an owner.
export function ownerRecordsUrl(address, city) {
  const q = `${address} ${city || ""} property owner county tax parcel records`;
  return `https://www.google.com/search?q=${encodeURIComponent(q.trim())}`;
}

// ── Outreach messages ─────────────────────────────────────────
// ctx: { owner, address, yardCount, senderName, bizPhone }

function firstName(sender) {
  return (sender || "").trim().split(/\s+/)[0] || "the crew";
}

export function buildSmsMessage(ctx) {
  const reply = ctx.bizPhone ? ` or call/text ${ctx.bizPhone}` : "";
  return (
    `Hi, this is ${firstName(ctx.senderName)} with Collins Lawncare. ` +
    `We already mow ${ctx.yardCount} yard${ctx.yardCount === 1 ? "" : "s"} every week right near ${ctx.address || "your place"}, ` +
    `so we can offer you a better rate than anyone driving out special — dependable weekly mowing, trimming, and edging. ` +
    `Want a free quote? Just reply${reply}. Thanks!`
  );
}

export function buildLetterMessage(ctx) {
  const dear = ctx.owner ? `Dear ${ctx.owner},` : "Hi neighbor,";
  const phone = ctx.bizPhone ? `call or text me at ${ctx.bizPhone}` : "flag us down when you see the trailer";
  return (
    `${dear}\n\n` +
    `My crew and I already take care of ${ctx.yardCount} lawn${ctx.yardCount === 1 ? "" : "s"} in your neighborhood every week — ` +
    `you've probably seen us nearby. Because we're already on your street, we can offer you a better rate than anyone ` +
    `who has to drive out special: dependable weekly mowing, trimming, and edging, with year-round monthly plans that ` +
    `cover leaves and cleanup too.\n\n` +
    `If you'd like a free, no-pressure quote for ${ctx.address || "your place"}, ${phone}.\n\n` +
    `${ctx.senderName || "The crew"}\n` +
    `Collins Lawncare · Hanceville, AL`
  );
}

export function buildEmailSubject(ctx) {
  return `Free lawn care quote — we already mow ${ctx.yardCount} yard${ctx.yardCount === 1 ? "" : "s"} near ${ctx.address || "you"}`;
}

// ── Send links ────────────────────────────────────────────────

export function smsUrl(phone, body) {
  const digits = (phone || "").replace(/[^\d+]/g, "");
  // "?&body" keeps iOS and Android both happy.
  return `sms:${digits}?&body=${encodeURIComponent(body)}`;
}

export function mailtoUrl(email, subject, body) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
