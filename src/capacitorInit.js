import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { tapHaptic } from "./native.js";

export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return;

  // Match the app's dark design. Capacitor's Style.Dark means *light* status
  // bar text, intended for a dark background.
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#0d1117" });
    }
  } catch {
    // Status bar APIs are unavailable in some web views.
  }

  // Tactile response for the app's buttons/links, native only. A capture
  // listener avoids modifying every view, and stays installed once per boot.
  if (!document.documentElement.dataset.nativeHaptics) {
    document.documentElement.dataset.nativeHaptics = "1";
    document.addEventListener("click", (e) => {
      if (e.target?.closest?.("button:not(:disabled), a, [role=button]")) tapHaptic();
    }, true);
  }

  try {
    await SplashScreen.hide();
  } catch {
    // Splash screen may already be hidden.
  }
}
