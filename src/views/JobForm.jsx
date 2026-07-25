import { useState } from "react";
import { getCurrentCoords } from "../location.js";
import { IconChevronLeft, IconPin } from "../icons.jsx";

export default function JobForm({ job, prefill, settings, onSave, onBack }) {
  const isEdit = !!job;
  const src = job || prefill || null;
  const [form, setForm] = useState({
    name: src?.name || "",
    address: src?.address || "",
    pay: src?.pay ?? "",
    billing: src?.billing || "visit",
    monthlyRate: src?.monthlyRate ?? "",
    notes: src?.notes || "",
    lat: src?.coords?.lat ?? "",
    lng: src?.coords?.lng ?? "",
    radius: src?.radius ?? "",
    customerName: src?.customerName || "",
    customerPhone: src?.customerPhone || "",
    notifyOnComplete: src?.notifyOnComplete || false,
  });
  const [geoStatus, setGeoStatus] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pinLocation = async () => {
    setGeoStatus("Getting GPS fix…");
    try {
      const c = await getCurrentCoords();
      setForm((f) => ({ ...f, lat: c.lat.toFixed(5), lng: c.lng.toFixed(5) }));
      setGeoStatus(`Pinned ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`);
    } catch {
      setGeoStatus("Could not get location");
    }
  };

  const valid = form.name.trim() && form.pay !== "" && !isNaN(parseFloat(form.pay));

  const save = () => {
    if (!valid) return;
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    const coords = !isNaN(lat) && !isNaN(lng) ? { lat, lng } : src?.coords || null;
    const radius = parseInt(form.radius, 10);
    const monthlyRate = parseFloat(form.monthlyRate);
    onSave({
      name: form.name.trim(),
      address: form.address.trim(),
      pay: parseFloat(form.pay),
      billing: form.billing,
      monthlyRate: form.billing === "monthly" && !isNaN(monthlyRate) && monthlyRate > 0 ? monthlyRate : null,
      notes: form.notes,
      coords,
      radius: !isNaN(radius) && radius > 0 ? radius : null,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      notifyOnComplete: form.notifyOnComplete,
    });
  };

  return (
    <>
      <div className="header">
        <button className="link-btn" onClick={onBack}><IconChevronLeft size={18} />Back</button>
        <h1 className="header-title">{isEdit ? "Edit Job" : "New Job"}</h1>
        <div style={{ width: 40 }} />
      </div>

      <div className="screen">
        <div className="card">
          <label className="field-label">Customer / yard name *</label>
          <input className="input" placeholder="e.g. Smith Residence" value={form.name} onChange={set("name")} />

          <label className="field-label">Address</label>
          <input className="input" placeholder="123 Main St, Hanceville AL" value={form.address} onChange={set("address")} />

          <label className="field-label">Billing</label>
          <div className="seg-control" style={{ marginBottom: 14 }}>
            <button
              className={`seg-option${form.billing === "visit" ? " active" : ""}`}
              onClick={() => setForm((f) => ({ ...f, billing: "visit" }))}
            >
              Per Visit
            </button>
            <button
              className={`seg-option${form.billing === "monthly" ? " active" : ""}`}
              onClick={() => setForm((f) => ({ ...f, billing: "monthly" }))}
            >
              Monthly Contract
            </button>
          </div>

          {form.billing === "monthly" && (
            <>
              <label className="field-label">Contract rate ($/month)</label>
              <input className="input" type="number" inputMode="decimal" placeholder="180" value={form.monthlyRate} onChange={set("monthlyRate")} />
            </>
          )}

          <label className="field-label">Pay per visit ($) *</label>
          <input className="input" type="number" inputMode="decimal" placeholder="45" value={form.pay} onChange={set("pay")} />

          <label className="field-label">Notes</label>
          <textarea className="input" style={{ height: 76, resize: "vertical" }} placeholder="Gate code, dog, trimming, where to park…" value={form.notes} onChange={set("notes")} />
        </div>

        <div className="card">
          <div className="section-title">Customer Contact</div>
          <label className="field-label">Customer name (for texts, optional)</label>
          <input className="input" placeholder="e.g. Sarah Smith" value={form.customerName} onChange={set("customerName")} />
          <label className="field-label">Customer phone (optional)</label>
          <input className="input" type="tel" placeholder="(256) 555-0123" value={form.customerPhone} onChange={set("customerPhone")} />
          <label className="field-label">Text them when the job&apos;s done</label>
          <div className="seg-control">
            <button
              className={`seg-option${!form.notifyOnComplete ? " active" : ""}`}
              onClick={() => setForm((f) => ({ ...f, notifyOnComplete: false }))}
            >
              Off
            </button>
            <button
              className={`seg-option${form.notifyOnComplete ? " active" : ""}`}
              disabled={!settings.notifyWebhookUrl || !form.customerPhone.trim()}
              onClick={() => setForm((f) => ({ ...f, notifyOnComplete: true }))}
            >
              Notify
            </button>
          </div>
          {!settings.notifyWebhookUrl && (
            <p className="text-faint" style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.5 }}>
              Set up a notification webhook in Settings → Customer Notifications to turn this on.
            </p>
          )}
          {settings.notifyWebhookUrl && !form.customerPhone.trim() && (
            <p className="text-faint" style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.5 }}>
              Add a customer phone number above to enable notifications for this job.
            </p>
          )}
        </div>

        <div className="card">
          <div className="section-title">GPS &amp; Geofence</div>
          <p className="text-dim" style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 12 }}>
            Pin the yard&apos;s location to enable automatic timer stop when the crew drives away, plus arrival detection and route planning.
          </p>
          <button className="btn btn-blue btn-block" onClick={pinLocation}><IconPin size={15} />Pin Current Location</button>
          {geoStatus && <div className="text-dim" style={{ fontSize: 12, textAlign: "center", marginTop: 8 }}>{geoStatus}</div>}
          <div className="stat-grid-2" style={{ marginTop: 14 }}>
            <div>
              <label className="field-label">Latitude</label>
              <input className="input" inputMode="decimal" placeholder="34.063" value={form.lat} onChange={set("lat")} style={{ marginBottom: 0 }} />
            </div>
            <div>
              <label className="field-label">Longitude</label>
              <input className="input" inputMode="decimal" placeholder="-86.768" value={form.lng} onChange={set("lng")} style={{ marginBottom: 0 }} />
            </div>
          </div>
          <label className="field-label" style={{ marginTop: 14 }}>
            Job site radius (meters) — leave blank for default ({settings.geofenceRadius} m)
          </label>
          <input className="input" type="number" inputMode="numeric" placeholder={`${settings.geofenceRadius}`} value={form.radius} onChange={set("radius")} style={{ marginBottom: 0 }} />
        </div>

        <button className="btn btn-primary btn-block btn-lg" disabled={!valid} onClick={save}>
          {isEdit ? "Save Changes" : "Add Job"}
        </button>
        <div style={{ height: 16 }} />
      </div>
    </>
  );
}
