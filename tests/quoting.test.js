import { describe, expect, it } from 'vitest';
import { estimatePriceRange, satelliteImageUrl } from '../src/quoting.js';

describe('quoting utilities', () => {
  it('applies size and complexity multipliers with a rounded range', () => {
    expect(
      estimatePriceRange({ sizeBucket: 'large', complexity: 'moderate' }, 50)
    ).toEqual({ low: 70, high: 95 });
  });

  it('uses safe defaults for unknown classifications and missing base price', () => {
    expect(
      estimatePriceRange({ sizeBucket: 'unknown', complexity: 'unknown' })
    ).toEqual({ low: 40, high: 50 });
  });

  it('builds an Esri image URL centered around the supplied coordinates', () => {
    const url = new URL(satelliteImageUrl({ lat: 34.73, lng: -86.59 }));

    expect(url.hostname).toBe('server.arcgisonline.com');
    expect(url.searchParams.get('bboxSR')).toBe('4326');
    expect(url.searchParams.get('size')).toBe('512,512');

    const [west, south, east, north] = url.searchParams.get('bbox').split(',').map(Number);
    expect((west + east) / 2).toBeCloseTo(-86.59, 6);
    expect((south + north) / 2).toBeCloseTo(34.73, 6);
  });
});
