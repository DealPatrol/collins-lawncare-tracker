import { useState } from "react";
import {
  CLUSTER_RADIUS_M, ZONE_TARGET_RATE, clusterJobs, formatDuration, formatMoney,
  haversineMeters, rateColorClass, routeDrags, zoneEconomics,
} from "../utils.js";
import { getCurrentCoords } from "../location.js";
import { formatValueShort } from "../prospecting.js";
import { estimateYard } from "../quoting.js";
import { ZoneFinder, OutreachSheet } from "./ProspectorTools.jsx";
import SeasonalOpportunity from "./SeasonalOutreach.jsx";
import { IconAlert, IconExternal, IconPin, IconPlus, IconSearch, IconSend, IconTarget, IconTrash, IconZap } from "../icons.jsx";

const STATUS_META = {
  new: { label: "New", cls: "badge-blue" },
  quoted: { label: "Quoted", cls: "badge-amber" },
  won: { label: "Won", cls: "badge-green" },
  lost: { label: "Lost", cls: "badge-dim" },
};
const STATUS_ORDER = ["new", "quoted", "won", "lost"];

function zoneBadge(zone) {
  if (zone.rate >= ZONE_TARGET_RATE) {
    return zone.jobs.length >= 3
      ? { label: "Anchor zone", cls: "badge-green" }
      : { label: "Worth the drive", cls: "badge-green" };
  }
  if (zone.yardsToTarget > 8) return { label: "Too far out", cls: "badge-red" };
  return { label: `Needs +${zone.yardsToTarget} yard${zone.yardsToTarget === 1 ? "" : "s"}`, cls: "badge-amber" };
}

function ProspectRow({ prospect, onUpdate, onDelete, onConvert, onMessage, apiKey, basePrice, showToast }) {
  const meta = STATUS_META[prospect.status] || STATUS_META.new;
  const [estimating, setEstimating] = useState(false);
  const est = prospect.aiEstimate;

  const runEstimate = async () => {
    if (!apiKey) {
      showToast("Add your Anthropic API key in Settings → AI Yard Quoting first.", "amber");
      return;
    }
    setEstimating(true);
    try {
      const result = await estimateYard({ apiKey, coords: prospect.coords, basePrice });
      onUpdate(prospect.id, { aiEstimate: result });
    } catch (e) {
      showToast(e.message || "Estimate failed.", "red");
    } finally {
      setEstimating(false);
    }
  };

  return (
    <div className="list-row" style={{ alignItems: "flex-start", flexDirection: "column" }}>
      <div className="row-between" style={{ width: "100%" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{prospect.name}</div>
          <div className="text-faint" style={{ fontSize: 12 }}>
            {[
              prospect.owner || null,
              prospect.address !== prospect.name ? prospect.address : null,
              prospect.value ? formatValueShort(prospect.value) : null,
              prospect.targetMonthly ? `target ${formatMoney(prospect.targetMonthly)}/mo` : null,
            ].filter(Boolean).join(" · ") || "Lead"}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                className={`badge ${prospect.status === s ? STATUS_META[s].cls : "badge-dim"}`}
                style={{ border: "none", cursor: "pointer", opacity: prospect.status === s ? 1 : 0.55 }}
                onClick={() => onUpdate(prospect.id, { status: s })}
              >
                {STATUS_META[s].label}
              </button>
            ))}
            <button className="badge badge-blue" style={{ border: "none", cursor: "pointer" }} onClick={() => onMessage(prospect)}>
              <IconSend size={11} />{prospect.lastContactedAt ? "Message again" : "Message"}
            </button>
            {prospect.coords && (
              <button className="badge badge-blue" style={{ border: "none", cursor: "pointer" }} disabled={estimating} onClick={runEstimate}>
                <IconZap size={11} />{estimating ? "Estimating…" : est ? "Re-estimate" : "AI Quote"}
              </button>
            )}
            {prospect.status === "won" && (
              <button className="badge badge-green" style={{ border: "none", cursor: "pointer" }} onClick={() => onConvert(prospect)}>
                <IconPlus size={11} />Add as job
              </button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <span className={`badge ${meta.cls}`}>{meta.label}</span>
          <button className="link-btn text-faint" style={{ padding: 2 }} onClick={() => onDelete(prospect.id)} aria-label="Delete lead">
            <IconTrash size={14} />
          </button>
        </div>
      </div>
      {est && (
        <div style={{ width: "100%", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <div className="row-between">
            <span className="text-good" style={{ fontWeight: 800, fontSize: 15 }}>
              {formatMoney(est.priceLow)}–{formatMoney(est.priceHigh)}
            </span>
            <span className="badge badge-dim" style={{ fontSize: 10.5 }}>{est.confidence} confidence</span>
          </div>
          <div className="text-faint" style={{ fontSize: 11.5, marginTop: 4 }}>
            ~{est.estimatedSqFt?.toLocaleString()} sq ft · {est.sizeBucket} · {est.complexity}
            {est.obstacles?.length ? ` · ${est.obstacles.join(", ")}` : ""}
          </div>
          {est.notes && <div className="text-faint" style={{ fontSize: 11.5, marginTop: 2, fontStyle: "italic" }}>{est.notes}</div>}
          <div className="text-faint" style={{ fontSize: 10.5, marginTop: 6 }}>
            Estimated from a satellite photo — confirm on-site before quoting.
          </div>
        </div>
      )}
    </div>
  );
}

function AddProspectForm({ defaultCoords, onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", address: "", targetMonthly: "" });
  const [coords, setCoords] = useState(null);
  const [geoStatus, setGeoStatus] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pin = async () => {
    setGeoStatus("Getting GPS fix…");
    try {
      const c = await getCurrentCoords();
      setCoords(c);
      setGeoStatus(`Pinned ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`);
    } catch {
      setGeoStatus("Could not get location");
    }
  };

  const save = () => {
    if (!form.name.trim()) return;
    const target = parseFloat(form.targetMonthly);
    onAdd({
      name: form.name.trim(),
      address: form.address.trim(),
      targetMonthly: !isNaN(target) && target > 0 ? target : null,
      // Untagged leads inherit the zone's location so they stay grouped
      // with the yards they were spotted next to.
      coords: coords || defaultCoords || null,
    });
    onClose();
  };

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
      <input className="input" placeholder="Who / which house? *" value={form.name} onChange={set("name")} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Address (optional)" value={form.address} onChange={set("address")} style={{ marginBottom: 8 }} />
      <input className="input" type="number" inputMode="decimal" placeholder="Target monthly rate ($, optional)" value={form.targetMonthly} onChange={set("targetMonthly")} style={{ marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-blue btn-sm" onClick={pin}><IconPin size={13} />Pin here</button>
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={!form.name.trim()} onClick={save}>Save Lead</button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
      </div>
      {geoStatus && <div className="text-dim" style={{ fontSize: 12, marginTop: 6 }}>{geoStatus}</div>}
    </div>
  );
}

export default function GrowthView({ state, openJob, onAddProspect, onUpdateProspect, onDeleteProspect, onConvertProspect, onUpdateJob, showToast }) {
  const { jobs, settings, prospects = [] } = state;
  const origin = settings.homeCoords || null;
  const [addingIn, setAddingIn] = useState(null); // zone key (anchor id) | "unzoned" | null
  const [finderIn, setFinderIn] = useState(null); // zone key | null
  const [outreachId, setOutreachId] = useState(null); // prospect id | null
  const senderName = state.employees.find((e) => e.id === state.activeEmployeeId)?.name || "";
  // Anchor for AI-quote price ranges: the crew's own current average, not an AI guess.
  const basePrice = jobs.length ? jobs.reduce((a, j) => a + (j.pay || 0), 0) / jobs.length : 45;

  const zones = clusterJobs(jobs)
    .map((zj) => zoneEconomics(zj, origin))
    .sort((a, b) => b.rate - a.rate);

  // A lead belongs to the nearest zone it plausibly sits inside.
  const zoneFor = (p) => {
    if (!p.coords) return null;
    let best = null;
    let bestDist = CLUSTER_RADIUS_M * 1.5;
    for (const z of zones) {
      const d = haversineMeters(p.coords, z.centroid);
      if (d < bestDist) { bestDist = d; best = z; }
    }
    return best;
  };
  const openProspects = prospects.filter((p) => p.status !== "lost");
  const unzonedProspects = prospects.filter((p) => !zoneFor(p));

  const drags = routeDrags(jobs, origin);
  const best = zones[0];

  if (!zones.length) {
    return (
      <>
        <div className="empty-state">
          <div className="empty-icon"><IconTarget size={44} /></div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>No zones to analyze yet</div>
          <div style={{ fontSize: 13.5 }}>
            Pin your yards on the map (edit a job → Pin Current Location) and this screen will group them into
            zones, score each zone&apos;s real $/hr with drive time included, and show where one more yard makes the trip pay.
          </div>
        </div>
        <SeasonalOpportunity
          jobs={jobs} senderName={senderName} bizPhone={settings.bizPhone}
          onUpdateJob={onUpdateJob} showToast={showToast}
        />
      </>
    );
  }

  return (
    <>
      <SeasonalOpportunity
        jobs={jobs} senderName={senderName} bizPhone={settings.bizPhone}
        onUpdateJob={onUpdateJob} showToast={showToast}
      />
      <div className="stat-grid" style={{ marginBottom: 12 }}>
        <div className="stat-tile">
          <div className="stat-value">{zones.length}</div>
          <div className="stat-label">ZONES</div>
        </div>
        <div className="stat-tile">
          <div className={`stat-value ${rateColorClass(best.rate)}`}>${best.rate.toFixed(0)}/hr</div>
          <div className="stat-label">BEST ZONE</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value text-blue">{openProspects.length}</div>
          <div className="stat-label">OPEN LEADS</div>
        </div>
      </div>

      {zones.map((zone) => {
        const badge = zoneBadge(zone);
        const zoneKey = zone.anchor.id;
        const zoneProspects = prospects.filter((p) => zoneFor(p) === zone);
        const gain = zone.rateWithOneMore - zone.rate;
        const scoutUrl = `https://www.google.com/maps/search/?api=1&query=${zone.centroid.lat.toFixed(5)}%2C${zone.centroid.lng.toFixed(5)}`;
        return (
          <div key={zoneKey} className="card">
            <div className="row-between" style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{zone.anchor.name} area</div>
              <span className={`badge ${badge.cls}`}>{badge.label}</span>
            </div>
            <div className="text-dim" style={{ fontSize: 12.5, marginBottom: 10 }}>
              {zone.jobs.length} yard{zone.jobs.length === 1 ? "" : "s"} · {formatMoney(Math.round(zone.monthly))}/mo
              {origin ? ` · ~${formatDuration(zone.driveSec)} driving per visit` : ""}
            </div>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <span className={rateColorClass(zone.rate)} style={{ fontWeight: 800, fontSize: 18 }}>
                ${zone.rate.toFixed(0)}/hr <span className="text-faint" style={{ fontWeight: 600, fontSize: 12 }}>incl. drive</span>
              </span>
              <a className="link-btn text-blue" style={{ fontSize: 12.5 }} href={scoutUrl} target="_blank" rel="noreferrer">
                <IconExternal size={12} />Scout in Maps
              </a>
            </div>
            {gain >= 2 && (
              <div className="banner banner-blue" style={{ fontSize: 12.5, marginBottom: 10, alignItems: "flex-start" }}>
                <IconZap size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  One more average yard here → <b>${zone.rateWithOneMore.toFixed(0)}/hr</b> (+${gain.toFixed(0)}/hr).
                  The drive is already paid for — every added neighbor is nearly pure margin.
                </span>
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: zoneProspects.length || addingIn === zoneKey ? 10 : 0 }}>
              {zone.jobs.map((j) => (
                <button key={j.id} className="badge badge-dim" style={{ border: "none", cursor: "pointer" }} onClick={() => openJob(j.id)}>
                  {j.name}{j.billing === "monthly" ? " · mo" : ""}
                </button>
              ))}
            </div>
            {zoneProspects.map((p) => (
              <ProspectRow key={p.id} prospect={p} onUpdate={onUpdateProspect} onDelete={onDeleteProspect} onConvert={onConvertProspect} onMessage={(pr) => setOutreachId(pr.id)} apiKey={settings.anthropicApiKey} basePrice={basePrice} showToast={showToast} />
            ))}
            {finderIn === zoneKey && (
              <ZoneFinder
                zone={zone}
                jobs={jobs}
                prospects={prospects}
                token={settings.regridToken}
                onAddProspect={onAddProspect}
                showToast={showToast}
                onClose={() => setFinderIn(null)}
              />
            )}
            {addingIn === zoneKey ? (
              <AddProspectForm defaultCoords={zone.centroid} onAdd={onAddProspect} onClose={() => setAddingIn(null)} />
            ) : (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {finderIn !== zoneKey && (
                  <button className="btn btn-blue btn-sm" style={{ flex: 1 }} onClick={() => setFinderIn(zoneKey)}>
                    <IconSearch size={14} />Find best houses
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setAddingIn(zoneKey)}>
                  <IconPlus size={14} />Log a lead
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div className="card">
        <div className="section-title"><IconTarget size={13} style={{ verticalAlign: -2, marginRight: 5 }} />New Territory Leads</div>
        <p className="text-dim" style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 4 }}>
          Leads outside your current zones. Win 2–3 close together and they become a new zone worth driving to.
        </p>
        {unzonedProspects.map((p) => (
          <ProspectRow key={p.id} prospect={p} onUpdate={onUpdateProspect} onDelete={onDeleteProspect} onConvert={onConvertProspect} onMessage={(pr) => setOutreachId(pr.id)} />
        ))}
        {addingIn === "unzoned" ? (
          <AddProspectForm defaultCoords={null} onAdd={onAddProspect} onClose={() => setAddingIn(null)} />
        ) : (
          <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 10 }} onClick={() => setAddingIn("unzoned")}>
            <IconPlus size={14} />Log a lead
          </button>
        )}
      </div>

      {drags.length > 0 && (
        <div className="card">
          <div className="section-title"><IconAlert size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Route Drags</div>
          <p className="text-dim" style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 4 }}>
            Isolated yards where the detour eats the pay. Fix by filling the zone with neighbors, raising the price, or cutting loose.
          </p>
          {drags.map(({ job, detourSec, trueRate }) => (
            <div key={job.id} className="list-row" onClick={() => openJob(job.id)} style={{ cursor: "pointer" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{job.name}</div>
                <div className="text-faint" style={{ fontSize: 12 }}>
                  ~{formatDuration(detourSec)} round-trip detour for {formatMoney(job.pay)}
                </div>
              </div>
              <span className={rateColorClass(trueRate)} style={{ fontWeight: 700, fontSize: 14 }}>
                ${trueRate.toFixed(0)}/hr
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="section-title"><IconZap size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Filling a Thin Zone — Playbook</div>
        <ul className="text-dim" style={{ fontSize: 13, lineHeight: 1.65, paddingLeft: 18, margin: 0 }}>
          <li><b>The 5-around rule:</b> every time you mow in a thin zone, knock or leave a door hanger at the 5 nearest houses. You&apos;re already there — the lead costs nothing. Log them above so they don&apos;t slip.</li>
          <li><b>Referral credit:</b> offer existing customers in the zone a month&apos;s discount for a neighbor who signs an annual monthly contract. Your best leads already pay you.</li>
          <li><b>Sell the contract, not the cut:</b> quote monthly ("$180/mo, year-round, weather included") instead of per-visit — it smooths your winter and their budget. Price it at roughly per-cut × 4.3 with mulch/cleanup folded in.</li>
          <li><b>EDDM mail:</b> USPS Every Door Direct Mail lets you blanket the exact carrier route around a zone for ~25¢ a postcard — no address list needed. Use &quot;Scout in Maps&quot; to pick the streets.</li>
          <li><b>Be findable in the zone:</b> add these neighborhoods as service areas on your Google Business Profile and post before/afters in the local Facebook and Nextdoor groups.</li>
        </ul>
      </div>

      {(() => {
        const outreachProspect = outreachId ? prospects.find((p) => p.id === outreachId) : null;
        if (!outreachProspect) return null;
        const zone = zoneFor(outreachProspect);
        return (
          <OutreachSheet
            prospect={outreachProspect}
            yardCount={zone ? zone.jobs.length : jobs.length}
            senderName={senderName}
            bizPhone={settings.bizPhone}
            onUpdate={onUpdateProspect}
            showToast={showToast}
            onClose={() => setOutreachId(null)}
          />
        );
      })()}
    </>
  );
}
