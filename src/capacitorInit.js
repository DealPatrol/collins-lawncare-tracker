import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#0d1117" });
    }
  } catch {
    // Status bar APIs are unavailable in some web views.
  }

  try {
    await SplashScreen.hide();
  } catch {
    // Splash screen may already be hidden.
  }
}
