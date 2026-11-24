import { useState } from "react";
import { BRAND } from "../brand.js";
import { DELETE_STATUS } from "../accountDeletion.js";
import { usePro } from "../proContext.js";
import { notifyHaptic } from "../native.js";
import { IconTrash } from "../icons.jsx";
import Sheet from "./Sheet.jsx";

// Guideline 5.1.1(v): users who can create an account must be able to delete
// it from inside the app. `onDelete({ password })` resolves to
// { status: "deleted" | "needs-password" } and throws with a friendly message.
export default function DeleteAccountSheet({ email, onDelete, onClose }) {
  const { gatingActive, isPro, manage } = usePro();
  const [confirmText, setConfirmText] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirmed = confirmText.trim().toUpperCase() === "DELETE";

  const submit = async (e) => {
    e?.preventDefault();
    if (!confirmed || busy) return;
    if (needsPassword && !password) return;
    setBusy(true);
    setError("");
    try {
      const result = await onDelete({ password: needsPassword ? password : undefined });
      if (result?.status === DELETE_STATUS.NEEDS_PASSWORD) {
        setNeedsPassword(true);
        setPassword("");
        setBusy(false);
        return;
      }
      notifyHaptic("success");
      // On success the auth listener signs the app out and this sheet unmounts.
    } catch (err) {
      notifyHaptic("error");
      setError(err?.message || "Your account couldn't be deleted. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Sheet title="Delete Account" icon={<IconTrash size={15} />} onClose={busy ? undefined : onClose} labelledBy="delete-account-title">
      <form onSubmit={submit}>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 10 }}>
          This permanently deletes your {BRAND.name} account <b>{email}</b> and the jobs, customers, crew, routes,
          mileage and expenses synced to it, and erases the copy on this device. This can&apos;t be undone.
        </p>
        <p className="text-dim" style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>
          Want a copy first? Close this and use <b>Data Backup → Export</b>. Payment records your customers made
          through Stripe are kept by Stripe as required for tax and accounting.
        </p>
        {gatingActive && isPro && (
          <div className="banner banner-amber" style={{ marginBottom: 10, flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            <span>Deleting your account does not cancel your {BRAND.pro.name} subscription — Apple bills it.</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={manage}>Manage Subscription</button>
          </div>
        )}

        <label className="field-label" htmlFor="delete-confirm">Type DELETE to confirm</label>
        <input
          id="delete-confirm" className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
          autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="DELETE" disabled={busy}
        />

        {needsPassword && (
          <>
            <div className="banner banner-amber" style={{ marginBottom: 10 }}>
              For your security, enter your password to confirm it&apos;s you.
            </div>
            <label className="field-label" htmlFor="delete-password">Password</label>
            <input
              id="delete-password" className="input" type="password" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} autoFocus
            />
          </>
        )}

        {error && <div className="banner banner-red" style={{ marginBottom: 10 }}>{error}</div>}

        <button className="btn btn-danger btn-block" type="submit" disabled={!confirmed || busy || (needsPassword && !password)}>
          {busy ? "Deleting…" : "Permanently Delete Account"}
        </button>
        <button className="btn btn-ghost btn-block" type="button" style={{ marginTop: 8 }} onClick={onClose} disabled={busy}>
          Keep My Account
        </button>
      </form>
    </Sheet>
  );
}
