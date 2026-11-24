import { Capacitor } from '@capacitor/core';
import { BRAND } from '../brand.js';

/**
 * API base URL.
 * - VITE_API_BASE_URL wins when set (split deploys, staging).
 * - The bundled iOS app has no /api of its own (it is served from
 *   capacitor://localhost), so it calls the production web origin.
 * - Otherwise '' = same origin (Vite dev proxy / Vercel unified deploy).
 */
export function getApiBase() {
  const configured = import.meta.env.VITE_API_BASE_URL || '';
  const base = configured || (Capacitor.isNativePlatform() ? BRAND.webOrigin : '');
  return base.replace(/\/$/, '');
}

export function apiUrl(path) {
  return `${getApiBase()}${path}`;
}
