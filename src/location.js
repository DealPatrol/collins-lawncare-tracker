import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

async function ensureNativePermission() {
  let permission = await Geolocation.checkPermissions();
  if (permission.location === "denied" || permission.location === "prompt") {
    permission = await Geolocation.requestPermissions();
  }
  if (permission.location === "denied") {
    throw new Error("Location permission denied");
  }
}

export async function getCurrentCoords() {
  if (Capacitor.isNativePlatform()) {
    await ensureNativePermission();
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
  }

  if (!navigator.geolocation) {
    throw new Error("GPS not supported");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => reject(new Error("Could not get location")),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

// Continuous position watch that works on native (Capacitor) and web.
// onFix receives { lat, lng, accuracy, timestamp }. Returns an async
// stop function.
export async function watchCoords(onFix, onError) {
  if (Capacitor.isNativePlatform()) {
    await ensureNativePermission();
    const id = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 30000 },
      (pos, err) => {
        if (err || !pos) {
          onError?.(err || new Error("No position"));
          return;
        }
        onFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp || Date.now(),
        });
      }
    );
    return () => Geolocation.clearWatch({ id });
  }

  if (!navigator.geolocation) {
    onError?.(new Error("GPS not supported"));
    return () => {};
  }

  const id = navigator.geolocation.watchPosition(
    (pos) =>
      onFix({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp || Date.now(),
      }),
    (err) => onError?.(err),
    { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}
