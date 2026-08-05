// Regrind API - Property discovery and filtering
// Search by address/area and property type, auto-add as prospects

import { haversineMeters } from "./utils.js";

const REGRIND_API_URL = "https://api.regrind.com/v1";

// Parse comprehensive property data from Regrind response
function parseProperty(property) {
  if (!property.address) return null;
  
  const coords = property.latitude && property.longitude 
    ? { lat: parseFloat(property.latitude), lng: parseFloat(property.longitude) }
    : null;

  const value = parseFloat(property.estimatedValue) || parseFloat(property.lastsaleamount) || 0;
  
  return {
    id: property.parcelNumber || `${property.address}|${property.zip || ""}`,
    address: property.address,
    city: property.city || "",
    state: property.state || "",
    zip: property.zip || "",
    owner: property.ownerName || "",
    mailAddress: [property.mailAddress, property.mailCity, property.mailState, property.mailZip]
      .filter(Boolean)
      .join(", "),
    
    // Basic info
    propertyType: property.propertyType || "",
    squareFeet: parseInt(property.squareFeet) || null,
    lotSize: parseFloat(property.lotSize) || null,
    yearBuilt: parseInt(property.yearBuilt) || null,
    bedrooms: parseInt(property.bedrooms) || null,
    bathrooms: parseFloat(property.bathrooms) || null,
    
    // Detailed info
    value: value > 0 ? value : null,
    lastSalePrice: parseFloat(property.lastsaleamount) || null,
    lastSaleDate: property.lastsaledate || null,
    taxAmount: parseFloat(property.taxAmount) || null,
    propertyCondition: property.propertyCondition || "", // "excellent" | "good" | "fair" | "poor"
    
    // Full info
    improvementValue: parseFloat(property.improvementValue) || null,
    landValue: parseFloat(property.landValue) || null,
    assessedValue: parseFloat(property.assessedValue) || null,
    stories: parseInt(property.stories) || null,
    garage: property.garage || "",
    poolIndicator: property.poolIndicator || false,
    zoning: property.zoning || "",
    
    // Landscaping indicators
    hasLawn: property.hasLawn !== false, // assume yes if not specified
    landscapingType: property.landscapingType || "", // "maintained", "overgrown", "minimal", "professional"
    
    coords,
  };
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
    // First, geocode the address
    const geoRes = await fetch(
      `${REGRIND_API_URL}/geocode?address=${encodeURIComponent(address)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!geoRes.ok) {
      throw new Error(`Geocoding failed: ${geoRes.statusText}`);
    }

    const geoData = await geoRes.json();
    if (!geoData.latitude || !geoData.longitude) {
      throw new Error("Address not found");
    }

    const searchCenter = {
      lat: parseFloat(geoData.latitude),
      lng: parseFloat(geoData.longitude),
    };

    // Build query for property search
    let query = `latitude=${searchCenter.lat}&longitude=${searchCenter.lng}&radius=${radius}&limit=${limit}`;
    
    if (propertyTypes.length > 0) {
      query += `&propertyTypes=${propertyTypes.join(",")}`;
    }
    if (minValue) query += `&minValue=${minValue}`;
    if (maxValue) query += `&maxValue=${maxValue}`;

    // Search properties
    const searchRes = await fetch(
      `${REGRIND_API_URL}/properties/search?${query}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (searchRes.status === 401 || searchRes.status === 403) {
      throw new Error("Regrind token rejected — check it in Settings");
    }

    if (!searchRes.ok) {
      throw new Error(`Property search failed (HTTP ${searchRes.status})`);
    }

    const searchData = await searchRes.json();
    const properties = (searchData.properties || []).map(parseProperty).filter(Boolean);

    return {
      center: searchCenter,
      properties,
      count: properties.length,
    };
  } catch (error) {
    console.error("[v0] Regrind search error:", error);
    throw error;
  }
}

// Deduplicate and rank properties, excluding existing jobs/prospects
export function rankProperties(properties, { jobs = [], prospects = [], center, limit = 10 }) {
  const normalizeAddr = (a) => (a || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  
  const knownAddrs = new Set(
    [...jobs, ...prospects].map((x) => normalizeAddr(x.address)).filter(Boolean)
  );
  const knownCoords = [...jobs, ...prospects].map((x) => x.coords).filter(Boolean);

  const seen = new Set();
  return properties
    .filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      if (knownAddrs.has(normalizeAddr(p.address))) return false;
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
