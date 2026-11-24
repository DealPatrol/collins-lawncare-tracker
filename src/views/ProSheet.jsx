import { useState } from "react";
import { BRAND } from "../brand.js";
import { usePro } from "../proContext.js";
import { describePlans } from "../proPolicy.js";
import { notifyHaptic } from "../native.js";
import { IconCheck, IconZap } from "../icons.jsx";
import Sheet from "./Sheet.jsx";

// StoreKit 2 paywall for TurfRoute Pro — only ever rendered in the native iOS
// app (see proPolicy.isProGatingActive). Includes the disclosures App Review
// expects for auto-renewing subscriptions (3.1.2): price + period, renewal
// terms, Restore Purchases, Terms of Use and Privacy Policy links.
export default function ProSheet({ reason, onClose, showToast }) {
  const { isPro, products, busy, error, purchase, restore, manage } = usePro();
  const plans = describePlans(products);
  const [plan, setPlan] = useState("yearly");

  const buy = async () => {
    const result = await purchase(plan);
    if (result.status === "purchased") {
      notifyHaptic("success");
      showToast?.(`Welcome to ${BRAND.pro.name}!`);
      onClose();
    } else if (result.status === "pending") {
      showToast?.("Purchase pending approval (Ask to Buy).", "amber");
    }
  };

  const doRestore = async () => {
    const { isPro: restored } = await restore();
    showToast?.(restored ? `${BRAND.pro.name} restored.` : "No active subscription found for this Apple ID.", restored ? "green" : "amber");
    if (restored) onClose();
  };

  return (
    <Sheet title={BRAND.pro.name} icon={<IconZap size={16} />} onClose={onClose} labelledBy="pro-sheet-title">
      {reason && <div className="banner banner-amber" style={{ marginBottom: 12 }}>{reason}</div>}

      {isPro ? (
        <>
          <p className="text-dim" style={{ fontSize: 13.5, marginBottom: 12 }}>You have {BRAND.pro.name}. Thanks for supporting {BRAND.name}!</p>
          <button className="btn btn-ghost btn-block" onClick={manage}>Manage Subscription</button>
        </>
      ) : (
        <>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px" }}>
            {BRAND.pro.features.map((f) => (
              <li key={f} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, padding: "4px 0" }}>
                <IconCheck size={15} className="text-good" />{f}
              </li>
            ))}
          </ul>

          <div className="stat-grid-2" style={{ marginBottom: 12 }}>
            {plans.map((p) => (
              <button
                key={p.plan}
                className={`btn ${plan === p.plan ? "btn-primary" : "btn-ghost"}`}
                style={{ flexDirection: "column", alignItems: "flex-start", padding: "12px 14px" }}
                onClick={() => setPlan(p.plan)}
                aria-pressed={plan === p.plan}
              >
                <span style={{ fontWeight: 800 }}>{p.label}</span>
                <span style={{ fontSize: 13 }}>{p.displayPrice} / {p.period}</span>
              </button>
            ))}
          </div>

          {error && <div className="banner banner-red" style={{ marginBottom: 10 }}>{error}</div>}

          <button className="btn btn-primary btn-block" disabled={busy} onClick={buy}>
            {busy ? "Please wait…" : `Subscribe ${plans.find((p) => p.plan === plan)?.displayPrice} / ${plans.find((p) => p.plan === plan)?.period}`}
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} disabled={busy} onClick={doRestore}>
            Restore Purchases
          </button>

          <p className="text-faint" style={{ fontSize: 11, lineHeight: 1.5, marginTop: 12 }}>
            Payment is charged to your Apple ID at confirmation. The subscription renews automatically at the same
            price for each period unless it is cancelled at least 24 hours before the end of the current period.
            Manage or cancel any time in Settings → Apple ID → Subscriptions. Everything else in {BRAND.name} stays free.
          </p>
          <p style={{ fontSize: 11.5, marginTop: 6, display: "flex", gap: 14 }}>
            <a className="link-btn text-blue" href={BRAND.termsUrl} target="_blank" rel="noreferrer">Terms of Use (EULA)</a>
            <a className="link-btn text-blue" href={BRAND.privacyPolicyUrl} target="_blank" rel="noreferrer">Privacy Policy</a>
          </p>
        </>
      )}
    </Sheet>
  );
}
