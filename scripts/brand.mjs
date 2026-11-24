#!/usr/bin/env node
/**
 * Keeps native/iOS identifiers in sync with src/brand.js (the one place to rename the app).
 *
 *   node scripts/brand.mjs apply   # write brand values into native files
 *   node scripts/brand.mjs check   # exit 1 if any file drifted (used in CI / Xcode Cloud)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND } from '../src/brand.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => join(root, p);

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function plistString(xml, key) {
  const m = xml.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
  return m ? m[1] : null;
}
function setPlistString(xml, key, value) {
  return xml.replace(new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`), `$1${escapeXml(value)}$2`);
}

const locationText = `${BRAND.name} uses your location while the app is open to log when you arrive at and leave job sites, stop job timers automatically, and track workday mileage.`;

/** Each target: read(contents) -> { ok, problems[] }, write(contents) -> contents */
const targets = [
  {
    file: 'capacitor.config.json',
    check(s) {
      const c = JSON.parse(s);
      const problems = [];
      if (c.appId !== BRAND.bundleId) problems.push(`appId is ${c.appId}`);
      if (c.appName !== BRAND.name) problems.push(`appName is ${c.appName}`);
      if (c.server?.url) problems.push('server.url must not be set (App Store 4.2: ship the bundled web app)');
      return problems;
    },
    write(s) {
      const c = JSON.parse(s);
      c.appId = BRAND.bundleId;
      c.appName = BRAND.name;
      return `${JSON.stringify(c, null, 2)}\n`;
    },
  },
  {
    file: 'ios/App/App/Info.plist',
    check(s) {
      const problems = [];
      if (plistString(s, 'CFBundleDisplayName') !== BRAND.name) problems.push('CFBundleDisplayName');
      if (plistString(s, 'CFBundleURLName') !== BRAND.bundleId) problems.push('CFBundleURLName');
      if (!new RegExp(`<key>CFBundleURLSchemes</key>\\s*<array>\\s*<string>${BRAND.urlScheme}</string>`).test(s)) problems.push('CFBundleURLSchemes');
      if (plistString(s, 'NSLocationWhenInUseUsageDescription') !== escapeXml(locationText)) problems.push('NSLocationWhenInUseUsageDescription');
      if (!/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/.test(s)) problems.push('ITSAppUsesNonExemptEncryption must be false');
      return problems;
    },
    write(s) {
      let out = setPlistString(s, 'CFBundleDisplayName', BRAND.name);
      out = setPlistString(out, 'CFBundleURLName', BRAND.bundleId);
      out = out.replace(/(<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>)[^<]*(<\/string>)/, `$1${BRAND.urlScheme}$2`);
      out = setPlistString(out, 'NSLocationWhenInUseUsageDescription', locationText);
      return out;
    },
  },
  {
    file: 'ios/App/App.xcodeproj/project.pbxproj',
    check(s) {
      const ids = [...s.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((m) => m[1]);
      return ids.length && ids.every((id) => id === BRAND.bundleId) ? [] : [`PRODUCT_BUNDLE_IDENTIFIER is ${ids.join(', ')}`];
    },
    write(s) {
      return s.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${BRAND.bundleId};`);
    },
  },
  {
    file: 'ios/App/App/TurfRoute.storekit',
    check(s) {
      const sk = JSON.parse(s);
      const ids = sk.subscriptionGroups.flatMap((g) => g.subscriptions.map((p) => p.productID)).sort();
      const want = Object.values(BRAND.pro.products).sort();
      const problems = [];
      if (JSON.stringify(ids) !== JSON.stringify(want)) problems.push(`product IDs ${ids.join(', ')}`);
      if (sk.subscriptionGroups[0]?.name !== BRAND.pro.subscriptionGroup) problems.push('subscription group name');
      return problems;
    },
    write(s) {
      const sk = JSON.parse(s);
      const group = sk.subscriptionGroups[0];
      group.name = BRAND.pro.subscriptionGroup;
      group.localizations.forEach((l) => { l.displayName = BRAND.pro.name; });
      for (const sub of group.subscriptions) {
        const plan = sub.recurringSubscriptionPeriod === 'P1Y' ? 'yearly' : 'monthly';
        const label = plan === 'yearly' ? 'Yearly' : 'Monthly';
        sub.productID = BRAND.pro.products[plan];
        sub.referenceName = `${BRAND.pro.name} ${label}`;
        sub.localizations.forEach((l) => { l.displayName = `${BRAND.pro.name} ${label}`; });
      }
      return `${JSON.stringify(sk, null, 2)}\n`;
    },
  },
  {
    file: 'public/privacy.html',
    check(s) {
      return s.includes(`<title>${BRAND.name} — Privacy Policy</title>`) ? [] : ['title does not use the brand name'];
    },
    write(s) {
      return s
        .replace(/<title>.*? — Privacy Policy<\/title>/, `<title>${BRAND.name} — Privacy Policy</title>`)
        .replace(/<h1>.*? Privacy Policy<\/h1>/, `<h1>${BRAND.name} Privacy Policy</h1>`);
    },
  },
];

const mode = process.argv[2] || 'check';
let failed = false;
for (const t of targets) {
  const path = rel(t.file);
  const before = readFileSync(path, 'utf8');
  if (mode === 'apply') {
    const after = t.write(before);
    if (after !== before) {
      writeFileSync(path, after);
      console.log(`updated ${t.file}`);
    }
  }
  const problems = t.check(readFileSync(path, 'utf8'));
  if (problems.length) {
    failed = true;
    console.error(`✗ ${t.file}: ${problems.join('; ')}`);
  } else {
    console.log(`✓ ${t.file}`);
  }
}
if (failed) {
  console.error(`\nNative files are out of sync with src/brand.js. Run: npm run brand:apply`);
  process.exit(1);
}
