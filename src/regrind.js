// Regrid API - Property discovery and filtering
// Search by address/area and property type, auto-add as prospects

import { haversineMeters } from "./utils.js";

const REGRID_API_URL = "https://app.regrid.com/api/v2/parcels";

function num(value) {
  const parsed = parseFloat(value);
  return isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function geometryCentroid(geometry) {
  let ring = null;
  if (geometry?.type === "Polygon") ring = geometry.coordinates?.[0];
  if (geometry?.type === "MultiPolygon") ring = geometry.coordinates?.[0]?.[0];
  if (!ring?.length) return null;
  const lng = ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
  const lat = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;
  return isFinite(lat) && isFinite(lng) ? { lat, lng } : null;
}

function propertyType(useDescription) {
  const use = (useDescription || "").toLowerCase();
  if (use.includes("multi") && use.includes("family")) return "multi_family";
  if (use.includes("investment")) return "investment";
  if (use.includes("commercial") || use.includes("retail") || use.includes("office")) return "commercial";
  if (use.includes("vacant")) return "vacant";
  if (use.includes("residential") || use.includes("single family") || use.includes("condo")) return "residential";
  return "";
}

// Parse comprehensive property data from a Regrid GeoJSON feature.
function parseProperty(feature) {
  const property = feature?.properties?.fields || feature?.properties || {};
  if (!property.address) return null;

  const latitude = parseFloat(property.lat);
  const longitude = parseFloat(property.lon);
  const coords = isFinite(latitude) && isFinite(longitude)
    ? { lat: latitude, lng: longitude }
    : geometryCentroid(feature.geometry);

  const value =
    num(property.parval) ||
    num(property.improvval) + num(property.landval) ||
    num(property.saleprice) ||
    0;
  
  return {
    id: property.ll_uuid || property.parcelnumb || `${property.address}|${property.szip || ""}`,
    address: property.address,
    city: property.scity || "",
    state: property.state2 || "",
    zip: property.szip || "",
    owner: property.owner || "",
    mailAddress: [property.mailadd, property.mail_city, property.mail_state2, property.mail_zip]
      .filter(Boolean)
      .join(", "),
    
    // Basic info
    propertyType: propertyType(property.usedesc),
    squareFeet: parseInt(property.sqft) || null,
    lotSize: parseFloat(property.acres) || null,
    yearBuilt: parseInt(property.yearbuilt) || null,
    bedrooms: null,
    bathrooms: null,
    
    // Detailed info
    value: value > 0 ? value : null,
    lastSalePrice: parseFloat(property.saleprice) || null,
    lastSaleDate: property.saledate || null,
    taxAmount: parseFloat(property.taxamt) || null,
    propertyCondition: "",
    
    // Full info
    improvementValue: parseFloat(property.improvval) || null,
    landValue: parseFloat(property.landval) || null,
    assessedValue: parseFloat(property.parval) || null,
    stories: null,
    garage: "",
    poolIndicator: false,
    zoning: property.zoning || "",
    
    landscapingType: "",
    
    coords,
  };
}

function responseFeatures(data) {
  return data?.parcels?.features || data?.features || [];
}

// Search properties by address/area and optional filters
export async function searchProperties(searchParams, token) {
  const {
    address = "",
    radius = 1000, // meters, default 1km
    propertyTypes = [], // residential, commercial, vacant, investment, etc
    minValue = null,
    maxValue = null,
    limit = 50
  } = searchParams;

  if (!address || !token) {
    throw new Error("Address and API token are required");
  }

  try {
    // Regrid's address lookup supplies the center for the nearby-parcel search.
    const addressQuery = new URLSearchParams({ query: address, limit: "1", token });
    const geoRes = await fetch(`${REGRID_API_URL}/address?${addressQuery}`);

    if (!geoRes.ok) {
      if (geoRes.status === 401 || geoRes.status === 403) {
        throw new Error("Regrid API key rejected — check it in Settings");
      }
      throw new Error(`Address lookup failed (HTTP ${geoRes.status})`);
    }

    const geoData = await geoRes.json();
    const centerProperty = responseFeatures(geoData).map(parseProperty).find((property) => property?.coords);
    if (!centerProperty) {
      throw new Error("Address not found");
    }

    const searchCenter = centerProperty.coords;
    const pointQuery = new URLSearchParams({
      lat: searchCenter.lat.toFixed(6),
      lon: searchCenter.lng.toFixed(6),
      radius: String(radius),
      limit: String(limit),
      token,
    });

    // Search properties
    const searchRes = await fetch(`${REGRID_API_URL}/point?${pointQuery}`);

    if (searchRes.status === 401 || searchRes.status === 403) {
      throw new Error("Regrid API key rejected — check it in Settings");
    }

    if (!searchRes.ok) {
      throw new Error(`Property search failed (HTTP ${searchRes.status})`);
    }

    const searchData = await searchRes.json();
    const properties = responseFeatures(searchData)
      .map(parseProperty)
      .filter(Boolean)
      .filter((property) => propertyTypes.length === 0 || propertyTypes.includes(property.propertyType))
      .filter((property) => !minValue || (property.value || 0) >= minValue)
      .filter((property) => !maxValue || (property.value || 0) <= maxValue);

    return {
      center: searchCenter,
      properties,
      count: properties.length,
    };
  } catch (error) {
    console.error("[v0] Regrid search error:", error);
    throw error;
  }
}

// Deduplicate and rank properties, excluding existing jobs/prospects
export function rankProperties(properties, { jobs = [], prospects = [], center, limit = 10 }) {
  const normalizeAddr = (a) => (a || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  
  const knownAddrs = new Set(
    [...jobs, ...prospects]
      .flatMap((x) => [
        normalizeAddr(x.address),
        normalizeAddr([x.address, x.city].filter(Boolean).join(", ")),
      ])
      .filter(Boolean)
  );
  const knownCoords = [...jobs, ...prospects].map((x) => x.coords).filter(Boolean);

  const seen = new Set();
  return properties
    .filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      const addresses = [
        normalizeAddr(p.address),
        normalizeAddr([p.address, p.city].filter(Boolean).join(", ")),
      ];
      if (addresses.some((address) => knownAddrs.has(address))) return false;
      if (p.coords && knownCoords.some((c) => haversineMeters(p.coords, c) < 40)) return false;
      return true;
    })
    .map((p) => ({
      ...p,
      distanceM: p.coords && center ? haversineMeters(center, p.coords) : null,
    }))
    .sort((a, b) => {
      // Sort by: value (desc) → distance (asc)
      if ((b.value || 0) !== (a.value || 0)) return (b.value || 0) - (a.value || 0);
      if (a.distanceM === null) return 1;
      if (b.distanceM === null) return -1;
      return a.distanceM - b.distanceM;
    })
    .slice(0, limit);
}

// Format property value for display
export function formatValue(value) {
  if (!value) return "—";
  if (value >= 1e6) return `$${(value / 1e6).toFixed(value >= 10e6 ? 0 : 1)}M`;
  if (value >= 1e3) return `$${Math.round(value / 1e3)}k`;
  return `$${Math.round(value)}`;
}

// Get property type label
export function getPropertyTypeLabel(type) {
  const labels = {
    residential: "Residential",
    commercial: "Commercial",
    vacant: "Vacant Land",
    investment: "Investment",
    agricultural: "Agricultural",
    industrial: "Industrial",
    multi_family: "Multi-Family",
  };
  return labels[type] || type;
}

// Check if property is good lawn care prospect based on type
export function isGoodProspect(property) {
  const goodTypes = ["residential", "investment", "multi_family"];
  if (!property.propertyType) return true; // assume yes if unknown
  return goodTypes.includes(property.propertyType.toLowerCase());
}
