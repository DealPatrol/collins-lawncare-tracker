import { describe, expect, it } from 'vitest';
import { parseDeepLink } from '../src/deepLinks.js';

describe('turfroute:// deep links', () => {
  it('opens allow-listed tabs', () => {
    expect(parseDeepLink('turfroute://route')).toEqual({ tab: 'route' });
    expect(parseDeepLink('turfroute://tab/crew')).toEqual({ tab: 'crew' });
    expect(parseDeepLink('TURFROUTE:///Settings?x=1')).toEqual({ tab: 'settings' });
    expect(parseDeepLink('turfroute://')).toEqual({ tab: 'today' });
    expect(parseDeepLink('turfroute://pro')).toEqual({ tab: 'settings', pro: true });
  });

  it('ignores other schemes and unknown targets', () => {
    expect(parseDeepLink('https://example.com/route')).toBeNull();
    expect(parseDeepLink('turfroute://delete-everything')).toBeNull();
    expect(parseDeepLink(undefined)).toBeNull();
  });
});
