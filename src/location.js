import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export async function getCurrentCoords() {
  if (Capacitor.isNativePlatform()) {
    let permission = await Geolocation.checkPermissions();
    if (permission.location === "denied" || permission.location === "prompt") {
      permission = await Geolocation.requestPermissions();
    }
    if (permission.location === "denied") {
      throw new Error("Location permission denied");
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }

  if (!navigator.geolocation) {
    throw new Error("GPS not supported");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("Could not get location")),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}
