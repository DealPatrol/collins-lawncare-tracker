import { useMemo, useState } from "react";
import {
  buildEmailSubject, buildLetterMessage, buildSmsMessage, fetchNearbyParcels,
  formatValueShort, mailtoUrl, ownerRecordsUrl, rankParcels, smsUrl,
} from "../prospecting.js";
import { formatMiles } from "../utils.js";
import {
  IconAlert, IconCopy, IconExternal, IconMail, IconPhone, IconPlus, IconSearch, IconSend,
} from "../icons.jsx";

const RADIUS_OPTIONS = [
  { label: "¼ mi", meters: 400 },
  { label: "½ mi", meters: 800 },
  { label: "1 mi", meters: 1600 },
];

// ── Zone Finder ───────────────────────────────────────────────
// "Top 10 most valuable houses around this zone" from county parcel
// records. Saving one turns it straight into a lead with owner + value.

export function ZoneFinder({ zone, jobs, prospects, token, onAddProspect, showToast, onClose }) {
  const [radius, setRadius] = useState(800);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null); // null until first search
  const [savedIds, setSavedIds] = useState(new Set());

  const search = async () => {
    setBusy(true);
    setError("");
    try {
      const parcels = await fetchNearbyParcels(zone.centroid, radius, token);
      setResults(rankParcels(parcels, { jobs, prospects, center: zone.centroid, limit: 10 }));
    } catch (e) {
      setError(e.message || "Lookup failed — check your connection and API key.");
    } finally {
      setBusy(false);
    }
  };

  const save = (parcel) => {
    onAddProspect({
      name: parcel.address,
      address: [parcel.address, parcel.city].filter(Boolean).join(", "),
      coords: parcel.coords || zone.centroid,
      owner: parcel.owner,
      value: parcel.value,
      mailAddress: parcel.mailAddress,
      source: "parcel",
    });
    setSavedIds((s) => new Set(s).add(parcel.id));
    showToast(`${parcel.address} saved as a lead.`);
  };

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>
          <IconSearch size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
          Best houses near this zone
        </div>
        <button className="link-btn text-faint" style={{ fontSize: 12.5 }} onClick={onClose}>Close</button>
      </div>

      {!token ? (
        <p className="text-dim" style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>
          Add your Regrid parcel API key in <b>Settings → Prospector</b> and this button will pull the
          10 highest-value properties around this zone from county tax records — owner name, address,
          and assessed value — ready to save as leads. Until then, use <b>Scout in Maps</b> and log
          leads by hand.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div className="seg-control" style={{ flex: 1 }}>
              {RADIUS_OPTIONS.map((o) => (
                <button
                  key={o.meters}
                  className={`seg-option${radius === o.meters ? " active" : ""}`}
                  onClick={() => setRadius(o.meters)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={search}>
              <IconSearch size={13} />{busy ? "Searching…" : results ? "Refresh" : "Search"}
            </button>
          </div>
          {error && (
            <div className="banner banner-red" style={{ fontSize: 12.5, marginBottom: 10 }}>
              <IconAlert size={14} style={{ flexShrink: 0 }} />{error}
            </div>
          )}
          {results && !results.length && !error && (
            <p className="text-dim" style={{ fontSize: 12.5, margin: 0 }}>
              No new parcels found — widen the radius, or you may already have every house here logged.
            </p>
          )}
          {results?.map((p, i) => (
            <div key={p.id} className="list-row" style={{ alignItems: "flex-start" }}>
              <span className="rank-badge" style={{ flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.address}</div>
                <div className="text-faint" style={{ fontSize: 11.5 }}>
                  {[
                    p.owner || "Owner not in record",
                    p.distanceM != null ? formatMiles(p.distanceM) : null,
                    p.use || null,
                  ].filter(Boolean).join(" · ")}
                </div>
                {!p.owner && (
                  <a
                    className="link-btn text-blue"
                    style={{ fontSize: 11.5 }}
                    href={ownerRecordsUrl(p.address, p.city)}
                    target="_blank" rel="noreferrer"
                  >
                    <IconExternal size={11} />Look up owner in county records
                  </a>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                <span className="badge badge-green">{formatValueShort(p.value)}</span>
                {savedIds.has(p.id) ? (
                  <span className="badge badge-dim">Saved</span>
                ) : (
                  <button className="badge badge-blue" style={{ border: "none", cursor: "pointer" }} onClick={() => save(p)}>
                    <IconPlus size={11} />Lead
                  </button>
                )}
              </div>
            </div>
          ))}
          <p className="text-faint" style={{ fontSize: 11, lineHeight: 1.5, marginTop: 8, marginBottom: 0 }}>
            Owner names and values are public county tax records via Regrid. Ranked by assessed value —
            the biggest lawns usually pay the best.
          </p>
        </>
      )}
    </div>
  );
}

// ── Outreach Sheet ────────────────────────────────────────────
// Auto-writes the pitch for a lead; the user reviews it and presses send.
// Letter/door-hanger is the default (always legal for cold outreach).
// Text and email unlock only when the user has entered contact info the
// owner actually gave them.

const MODES = [
  { id: "letter", label: "Letter" },
  { id: "text", label: "Text" },
  { id: "email", label: "Email" },
];

export function OutreachSheet({ prospect, yardCount, senderName, bizPhone, onUpdate, showToast, onClose }) {
  const [mode, setMode] = useState("letter");
  const [edited, setEdited] = useState({}); // per-mode user edits
  // Leads saved before the Prospector shipped are missing the contact fields.
  const phone = prospect.phone || "";
  const email = prospect.email || "";

  const ctx = useMemo(() => ({
    owner: prospect.owner,
    address: prospect.address || prospect.name,
    yardCount: Math.max(yardCount, 1),
    senderName,
    bizPhone,
  }), [prospect.owner, prospect.address, prospect.name, yardCount, senderName, bizPhone]);

  const autoMessage = mode === "text" ? buildSmsMessage(ctx) : buildLetterMessage(ctx);
  const message = edited[mode] ?? autoMessage;
  const setMessage = (text) => setEdited((e) => ({ ...e, [mode]: text }));

  const markContacted = () => onUpdate(prospect.id, { lastContactedAt: Date.now() });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      showToast("Message copied — paste it anywhere.");
      markContacted();
    } catch {
      showToast("Could not copy on this device.", "amber");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ text: message });
      markContacted();
    } catch { /* user cancelled the share sheet */ }
  };

  const send = () => {
    markContacted();
    if (mode === "text") window.location.href = smsUrl(phone, message);
    else window.location.href = mailtoUrl(email, buildEmailSubject(ctx), message);
  };

  const canSend = mode === "text" ? !!phone.trim() : mode === "email" ? !!email.trim() : false;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "flex-end",
        background: "rgba(0,0,0,0.55)",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%", maxWidth: 560, margin: "0 auto", maxHeight: "88vh", overflowY: "auto",
          borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row-between" style={{ marginBottom: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>
            <IconSend size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            Reach out
          </div>
          <button className="link-btn text-faint" onClick={onClose}>Close</button>
        </div>
        <div className="text-dim" style={{ fontSize: 12.5, marginBottom: 10 }}>
          {[prospect.owner, prospect.address || prospect.name].filter(Boolean).join(" · ")}
        </div>

        <div className="seg-control" style={{ marginBottom: 10 }}>
          {MODES.map((m) => (
            <button key={m.id} className={`seg-option${mode === m.id ? " active" : ""}`} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>

        {mode === "text" && (
          <>
            <input
              className="input" type="tel" placeholder="Their number — only if they gave it to you"
              value={phone} onChange={(e) => onUpdate(prospect.id, { phone: e.target.value })}
              style={{ marginBottom: 8 }}
            />
            {!phone.trim() && (
              <div className="banner banner-amber" style={{ fontSize: 12, marginBottom: 10, alignItems: "flex-start" }}>
                <IconAlert size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Only text numbers people gave you (they called, a referral, a form). Cold-texting numbers
                  from lookup sites breaks the TCPA — <b>$500–$1,500 fine per text</b>. For a cold lead,
                  send the letter instead.
                </span>
              </div>
            )}
          </>
        )}
        {mode === "email" && (
          <input
            className="input" type="email" placeholder="Their email — only if they gave it to you"
            value={email} onChange={(e) => onUpdate(prospect.id, { email: e.target.value })}
            style={{ marginBottom: 8 }}
          />
        )}
        {mode === "letter" && prospect.mailAddress && (
          <div className="text-faint" style={{ fontSize: 11.5, marginBottom: 8 }}>
            Mail to (from tax record): {prospect.owner ? `${prospect.owner}, ` : ""}{prospect.mailAddress}
          </div>
        )}

        <textarea
          className="input"
          rows={mode === "text" ? 5 : 9}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ marginBottom: 4, resize: "vertical", lineHeight: 1.5, fontSize: 13.5 }}
        />
        {edited[mode] != null && edited[mode] !== autoMessage && (
          <button className="link-btn text-blue" style={{ fontSize: 12, marginBottom: 6 }} onClick={() => setMessage(autoMessage)}>
            Reset to auto-written message
          </button>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={copy}><IconCopy size={14} />Copy</button>
          {typeof navigator.share === "function" && (
            <button className="btn btn-ghost btn-sm" onClick={share}><IconExternal size={14} />Share</button>
          )}
          {mode === "letter" ? (
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={copy}>
              <IconCopy size={14} />Copy for print / door hanger
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={!canSend} onClick={send}>
              {mode === "text" ? <IconPhone size={14} /> : <IconMail size={14} />}
              {mode === "text" ? "Open in Messages" : "Open in Mail"}
            </button>
          )}
        </div>
        {prospect.lastContactedAt && (
          <div className="text-faint" style={{ fontSize: 11.5, marginTop: 8, textAlign: "center" }}>
            Last reached out {new Date(prospect.lastContactedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
