import { describe, expect, it } from 'vitest';
import { haversineMeters, isWithinGeofence } from '../src/utils.js';

describe('geofence utilities', () => {
  const site = { lat: 34.7304, lng: -86.5861 };

  it('calculates zero distance for the same point', () => {
    expect(haversineMeters(site, site)).toBe(0);
  });

  it('calculates a known distance within a practical tolerance', () => {
    const oneDegreeNorth = { lat: site.lat + 1, lng: site.lng };
    expect(haversineMeters(site, oneDegreeNorth)).toBeCloseTo(111195, -2);
  });

  it('classifies fixes inside and outside a radius', () => {
    const about111MetersNorth = { lat: site.lat + 0.001, lng: site.lng };
    expect(isWithinGeofence(site, about111MetersNorth, 150)).toBe(true);
    expect(isWithinGeofence(site, about111MetersNorth, 100)).toBe(false);
  });

  it('caps GPS accuracy allowance at 50 meters', () => {
    const about144MetersNorth = {
      lat: site.lat + 0.0013,
      lng: site.lng,
      accuracy: 500,
    };
    expect(isWithinGeofence(site, about144MetersNorth, 100, true)).toBe(true);
    expect(isWithinGeofence(site, about144MetersNorth, 90, true)).toBe(false);
  });

  it('rejects invalid inputs', () => {
    expect(isWithinGeofence(null, site, 150)).toBe(false);
    expect(isWithinGeofence(site, site, -1)).toBe(false);
  });
});
