// Thin wrappers around Capacitor plugins so views stay platform-agnostic.
// Every helper falls back to the existing web behaviour, so the web build is
// unchanged when it runs in a normal browser.
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

export function isNative() {
  return Capacitor.isNativePlatform();
}

export function isNativeIos() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

// ── Haptics ──────────────────────────────────────────────────

/** Light tap for buttons/toggles. */
export function tapHaptic() {
  if (!isNative()) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

/** Stronger feedback for automatic events (geofence arrival / auto-stop). */
export function notifyHaptic(kind = "success", webPattern = 80) {
  if (isNative()) {
    const type = kind === "warning" ? NotificationType.Warning : kind === "error" ? NotificationType.Error : NotificationType.Success;
    Haptics.notification({ type }).catch(() => {});
    return;
  }
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(webPattern);
}

// ── Sharing ──────────────────────────────────────────────────

/**
 * Share plain text (invite codes, outreach messages, portal links, routes).
 * Native: iOS share sheet. Web: navigator.share, then clipboard.
 * Resolves to "shared" | "copied" | "cancelled" | "unavailable".
 */
export async function shareText({ title, text, url } = {}) {
  if (isNative()) {
    try {
      await Share.share({ title, text, url, dialogTitle: title });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText([text, url].filter(Boolean).join("\n"));
      return "copied";
    } catch { /* fall through */ }
  }
  return "unavailable";
}

/** True when a share sheet (native or Web Share API) is available. */
export function canShare() {
  return isNative() || (typeof navigator !== "undefined" && typeof navigator.share === "function");
}

/**
 * Export a text file (JSON backup, CSV mileage log).
 * Native: write to the cache directory and open the iOS share sheet
 * (Save to Files, AirDrop, Mail…). Web: regular browser download.
 * Resolves to "shared" | "downloaded" | "cancelled".
 */
export async function exportTextFile({ filename, contents, mimeType, title }) {
  if (isNative()) {
    const written = await Filesystem.writeFile({
      path: filename,
      data: contents,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({ title: title || filename, files: [written.uri], dialogTitle: title || filename });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  const blob = new Blob([contents], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
  return "downloaded";
}
