import { BRAND } from '../src/brand.js';

/**
 * Name printed on customer emails (invoices, receipts, completion notices).
 * Set BUSINESS_NAME in Vercel to your company name (e.g. "Collins Lawncare");
 * it falls back to the product brand.
 */
export function businessName(env = process.env) {
  return (env.BUSINESS_NAME || '').trim() || BRAND.name;
}

/** Sender address. SENDGRID_FROM_EMAIL must be a SendGrid-verified sender. */
export function fromEmail(env = process.env) {
  return env.SENDGRID_FROM_EMAIL || 'noreply@collinslawncare.com';
}
