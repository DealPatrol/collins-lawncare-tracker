import { useCallback, useEffect, useMemo, useState } from "react";
import { registerPlugin } from "@capacitor/core";
import { BRAND } from "./brand.js";
import { isNativeIos } from "./native.js";
import { ProContext } from "./proContext.js";
import { PRO_PRODUCT_IDS, hasProEntitlement, isProGatingActive } from "./proPolicy.js";

// Implemented in ios/App/App/TurfRouteNativePlugin.swift (StoreKit 2, no third-party SDK).
const TurfRouteNative = registerPlugin("TurfRouteNative");

export function ProProvider({ children }) {
  const gatingActive = isProGatingActive({ nativeIos: isNativeIos() });
  const [productIds, setProductIds] = useState([]);
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!gatingActive) return undefined;
    let listener;
    let cancelled = false;
    (async () => {
      try {
        const { productIds: ids = [] } = await TurfRouteNative.entitlements();
        if (!cancelled) setProductIds(ids);
      } catch { /* keep free tier */ }
      try {
        const { products: list = [] } = await TurfRouteNative.getProducts({ productIds: PRO_PRODUCT_IDS });
        if (!cancelled) setProducts(list);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not load subscriptions.");
      }
      listener = await TurfRouteNative.addListener("entitlementsChanged", ({ productIds: ids = [] }) => setProductIds(ids));
    })();
    return () => {
      cancelled = true;
      listener?.remove?.();
    };
  }, [gatingActive]);

  const purchase = useCallback(async (plan) => {
    const productId = BRAND.pro.products[plan];
    if (!gatingActive || !productId) return { status: "unavailable" };
    setBusy(true);
    setError("");
    try {
      const result = await TurfRouteNative.purchase({ productId });
      if (result.productIds) setProductIds(result.productIds);
      return result;
    } catch (e) {
      setError(e?.message || "Purchase failed.");
      return { status: "failed" };
    } finally {
      setBusy(false);
    }
  }, [gatingActive]);

  const restore = useCallback(async () => {
    if (!gatingActive) return { isPro: true };
    setBusy(true);
    setError("");
    try {
      const { productIds: ids = [] } = await TurfRouteNative.restore();
      setProductIds(ids);
      return { isPro: hasProEntitlement(ids) };
    } catch (e) {
      setError(e?.message || "Restore failed.");
      return { isPro: false };
    } finally {
      setBusy(false);
    }
  }, [gatingActive]);

  const manage = useCallback(async () => {
    if (!gatingActive) return;
    try {
      await TurfRouteNative.manageSubscriptions();
    } catch {
      window.open("https://apps.apple.com/account/subscriptions", "_blank");
    }
  }, [gatingActive]);

  const value = useMemo(() => ({
    gatingActive,
    isPro: !gatingActive || hasProEntitlement(productIds),
    products,
    busy,
    error,
    purchase,
    restore,
    manage,
  }), [gatingActive, productIds, products, busy, error, purchase, restore, manage]);

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}
