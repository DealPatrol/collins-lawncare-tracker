import { useMemo, useState } from "react";
import { activeCampaigns, buildUpsellLetter, buildUpsellSms } from "../seasonal.js";
import { smsUrl } from "../prospecting.js";
import { IconCopy, IconExternal, IconSend, IconZap } from "../icons.jsx";

function UpsellSheet({ job, campaign, senderName, bizPhone, onUpdateJob, showToast, onClose }) {
  const [mode, setMode] = useState(job.customerPhone ? "text" : "letter");
  const [edited, setEdited] = useState({});
  const [phone, setPhone] = useState(job.customerPhone || "");

  const ctx = { customerName: job.customerName || job.name, address: job.address, senderName, bizPhone };
  const autoMessage = mode === "text" ? buildUpsellSms(campaign, ctx) : buildUpsellLetter(campaign, ctx);
  const message = edited[mode] ?? autoMessage;
  const setMessage = (text) => setEdited((e) => ({ ...e, [mode]: text }));

  const markContacted = () => onUpdateJob(job.id, { lastUpsellContactedAt: Date.now(), customerPhone: phone || job.customerPhone });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      showToast("Message copied.");
      markContacted();
    } catch {
      showToast("Could not copy on this device.", "amber");
    }
  };

  const send = () => {
    markContacted();
    window.location.href = smsUrl(phone, message);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div
        className="card"
        style={{ width: "100%", maxWidth: 560, margin: "0 auto", maxHeight: "88vh", overflowY: "auto", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row-between" style={{ marginBottom: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}><IconSend size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{campaign.label}</div>
          <button className="link-btn text-faint" onClick={onClose}>Close</button>
        </div>
        <div className="text-dim" style={{ fontSize: 12.5, marginBottom: 10 }}>{job.customerName || job.name}</div>

        <div className="seg-control" style={{ marginBottom: 10 }}>
          <button className={`seg-option${mode === "letter" ? " active" : ""}`} onClick={() => setMode("letter")}>Letter</button>
          <button className={`seg-option${mode === "text" ? " active" : ""}`} onClick={() => setMode("text")}>Text</button>
        </div>

        {mode === "text" && (
          <input className="input" type="tel" placeholder="Customer phone" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ marginBottom: 8 }} />
        )}

        <textarea
          className="input" rows={mode === "text" ? 5 : 8} value={message} onChange={(e) => setMessage(e.target.value)}
          style={{ marginBottom: 4, resize: "vertical", lineHeight: 1.5, fontSize: 13.5 }}
        />
        {edited[mode] != null && edited[mode] !== autoMessage && (
          <button className="link-btn text-blue" style={{ fontSize: 12, marginBottom: 6 }} onClick={() => setMessage(autoMessage)}>
            Reset to auto-written message
          </button>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={copy}><IconCopy size={14} />Copy</button>
          {mode === "text" ? (
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={!phone.trim()} onClick={send}>
              <IconExternal size={14} />Open in Messages
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={copy}>
              <IconCopy size={14} />Copy for print / mail
            </button>
          )}
        </div>
        {job.lastUpsellContactedAt && (
          <div className="text-faint" style={{ fontSize: 11.5, marginTop: 8, textAlign: "center" }}>
            Last pitched {new Date(job.lastUpsellContactedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SeasonalOpportunity({ jobs, senderName, bizPhone, onUpdateJob, showToast }) {
  const campaigns = useMemo(() => activeCampaigns(), []);
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id || null);
  const [sheetJobId, setSheetJobId] = useState(null);

  if (!campaigns.length || !jobs.length) return null;

  const campaign = campaigns.find((c) => c.id === campaignId) || campaigns[0];
  const sheetJob = sheetJobId ? jobs.find((j) => j.id === sheetJobId) : null;

  return (
    <div className="card">
      <div className="section-title"><IconZap size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Seasonal Opportunity</div>
      <p className="text-dim" style={{ fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>
        Your existing customers are the cheapest revenue you have — no lead cost, no trust to build.
        This is what to offer them right now.
      </p>
      {campaigns.length > 1 && (
        <div className="seg-control" style={{ marginBottom: 10 }}>
          {campaigns.map((c) => (
            <button key={c.id} className={`seg-option${campaign.id === c.id ? " active" : ""}`} onClick={() => setCampaignId(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      )}
      <p className="text-dim" style={{ fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>
        Pitch: <i>{campaign.pitch}</i>
      </p>
      {jobs.map((j) => (
        <div key={j.id} className="list-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{j.customerName || j.name}</div>
            {j.lastUpsellContactedAt && (
              <div className="text-faint" style={{ fontSize: 11 }}>Pitched {new Date(j.lastUpsellContactedAt).toLocaleDateString()}</div>
            )}
          </div>
          <button className="badge badge-blue" style={{ border: "none", cursor: "pointer" }} onClick={() => setSheetJobId(j.id)}>
            <IconSend size={11} />Message
          </button>
        </div>
      ))}
      {sheetJob && (
        <UpsellSheet
          job={sheetJob} campaign={campaign} senderName={senderName} bizPhone={bizPhone}
          onUpdateJob={onUpdateJob} showToast={showToast} onClose={() => setSheetJobId(null)}
        />
      )}
    </div>
  );
}
