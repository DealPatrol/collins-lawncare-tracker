import { useMemo, useRef, useState } from "react";
import { exportBackup, parseBackup } from "../store.js";
import { getCurrentCoords } from "../location.js";
import { formatMoney, getTodayKey } from "../utils.js";
import {
  buildMileageCsv, buildMileageRows, EXPENSE_CATEGORIES, expenseTotal, mileageTotal,
} from "../reports.js";
import {
  IconPin, IconDownload, IconUpload, IconTarget, IconSearch, IconSend, IconDollar, IconRoute, IconTrash, IconPlus,
} from "../icons.jsx";

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        width: 46, height: 27, borderRadius: 999, border: "none", cursor: "pointer",
        background: checked
          ? "linear-gradient(180deg, var(--green-strong), var(--green-deep))"
          : "linear-gradient(180deg, var(--bg-deep), var(--bg-raised))",
        position: "relative", transition: "background 0.15s ease", flexShrink: 0,
        boxShadow: checked
          ? "var(--shadow-inset), 0 0 12px -3px var(--green-glow)"
          : "var(--shadow-inset)",
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 22 : 3,
        width: 21, height: 21, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 30%, #ffffff, #cfd8d1 70%, #aab5ac)",
        transition: "left 0.15s ease",
        boxShadow: "inset 0 -2px 3px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.55)",
      }} />
    </button>
  );
}

export default function SettingsView({
  state, me, onUpdateSettings, onRestore, onSwitchEmployee, onAddExpense, onDeleteExpense, showToast,
}) {
  const { settings } = state;
  const importRef = useRef(null);
  const [homeAddress, setHomeAddress] = useState(settings.homeAddress);
  const [regridToken, setRegridToken] = useState(settings.regridToken || "");
  const [bizPhone, setBizPhone] = useState(settings.bizPhone || "");
  const [webhookUrl, setWebhookUrl] = useState(settings.notifyWebhookUrl || "");
  const [msgTemplate, setMsgTemplate] = useState(settings.notifyMessageTemplate || "");
  const [mileageRate, setMileageRate] = useState(String(settings.mileageRate ?? 0.7));
  const [expForm, setExpForm] = useState({ category: "Fuel", amount: "", note: "", date: getTodayKey() });

  const mileageRows = useMemo(() => buildMileageRows(state), [state]);
  const totalMiles = mileageTotal(mileageRows);
  const recentExpenses = useMemo(
    () => [...(state.expenses || [])].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [state.expenses]
  );

  const setHomeGps = async () => {
    try {
      const c = await getCurrentCoords();
      onUpdateSettings({ homeCoords: { lat: c.lat, lng: c.lng } });
      showToast(`Home pinned at ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`);
    } catch {
      showToast("Could not get location", "amber");
    }
  };

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportBackup(state), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collins-lawncare-backup-${getTodayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded.");
  };

  const doImport = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        onRestore(parseBackup(e.target.result));
      } catch {
        showToast("Could not restore — invalid backup file.", "red");
      }
    };
    reader.readAsText(file);
  };

  const doExportMileage = () => {
    const rate = parseFloat(mileageRate) || 0;
    if (!mileageRows.length) {
      showToast("No recorded mileage yet — clock in and drive to a job first.", "amber");
      return;
    }
    const csv = buildMileageCsv(mileageRows, rate);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collins-lawncare-mileage-${getTodayKey()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Mileage log downloaded.");
  };

  const saveExpense = () => {
    const amount = parseFloat(expForm.amount);
    if (!expForm.date || isNaN(amount) || amount <= 0) return;
    onAddExpense({ date: expForm.date, category: expForm.category, amount, note: expForm.note.trim() });
    setExpForm((f) => ({ ...f, amount: "", note: "" }));
    showToast("Expense logged.");
  };

  return (
    <>
      <div className="header">
        <h1 className="header-title">Settings</h1>
        <div className="crew-avatar" style={{ background: me.color, width: 34, height: 34, fontSize: 13 }}>{me.name[0]?.toUpperCase()}</div>
      </div>

      <div className="screen">
        {/* Profile */}
        <div className="card">
          <div className="section-title">Signed in on this device</div>
          <div className="row-between">
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div className="crew-avatar" style={{ background: me.color }}>{me.name[0]?.toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{me.name}</div>
                <div className="text-faint" style={{ fontSize: 12 }}>{me.role === "manager" ? "Crew Manager" : "Crew Member"}</div>
              </div>
            </div>
            {state.employees.length > 1 && (
              <select
                className="input"
                style={{ width: "auto", marginBottom: 0, padding: "8px 10px", fontSize: 13 }}
                value={me.id}
                onChange={(e) => onSwitchEmployee(e.target.value)}
              >
                {state.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* GPS automation */}
        <div className="card">
          <div className="section-title"><IconTarget size={13} style={{ verticalAlign: -2, marginRight: 5 }} />GPS Automation</div>
          <div className="row-between" style={{ padding: "6px 0 12px" }}>
            <div style={{ paddingRight: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Auto-stop timer</div>
              <div className="text-faint" style={{ fontSize: 12, marginTop: 2 }}>Stop &amp; save the visit automatically when you drive out of the job site zone.</div>
            </div>
            <Toggle checked={settings.autoStop} onChange={(v) => onUpdateSettings({ autoStop: v })} />
          </div>
          <div className="row-between" style={{ padding: "0 0 12px" }}>
            <div style={{ paddingRight: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Arrival detection</div>
              <div className="text-faint" style={{ fontSize: 12, marginTop: 2 }}>Automatically start the timer when you pull up to a pinned yard — no tapping needed.</div>
            </div>
            <Toggle checked={settings.autoArriveDetect} onChange={(v) => onUpdateSettings({ autoArriveDetect: v })} />
          </div>
          <div className="row-between" style={{ padding: "0 0 4px" }}>
            <div style={{ paddingRight: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Weather on dashboard</div>
              <div className="text-faint" style={{ fontSize: 12, marginTop: 2 }}>Today&apos;s forecast and rain windows (needs internet).</div>
            </div>
            <Toggle checked={settings.weather} onChange={(v) => onUpdateSettings({ weather: v })} />
          </div>
          <div className="divider" />
          <label className="field-label">Default job site radius: {settings.geofenceRadius} m</label>
          <input
            type="range" min="60" max="400" step="10"
            value={settings.geofenceRadius}
            onChange={(e) => onUpdateSettings({ geofenceRadius: parseInt(e.target.value, 10) })}
            style={{ width: "100%", accentColor: "var(--green)" }}
          />
          <div className="row-between text-faint" style={{ fontSize: 11 }}>
            <span>60 m — small yards</span><span>400 m — big properties</span>
          </div>
          <p className="text-faint" style={{ fontSize: 11.5, marginTop: 10, lineHeight: 1.5 }}>
            Tracking runs while you&apos;re clocked in with the app open. Keep the phone on the dash or in your pocket with the screen unlocked for best results.
          </p>
        </div>

        {/* Home */}
        <div className="card">
          <div className="section-title">Home Base</div>
          <label className="field-label">Home / shop address</label>
          <input className="input" placeholder="123 Home St, Hanceville AL" value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} />
          <div className="stat-grid-2">
            <button className="btn btn-ghost" onClick={() => { onUpdateSettings({ homeAddress }); showToast("Address saved."); }}>Save Address</button>
            <button className="btn btn-blue" onClick={setHomeGps}><IconPin size={15} />Pin GPS Here</button>
          </div>
          {settings.homeCoords && (
            <div className="text-faint" style={{ fontSize: 11.5, textAlign: "center", marginTop: 10 }}>
              Home GPS: {settings.homeCoords.lat.toFixed(4)}, {settings.homeCoords.lng.toFixed(4)}
            </div>
          )}
        </div>

        {/* Prospector */}
        <div className="card">
          <div className="section-title"><IconSearch size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Prospector</div>
          <p className="text-dim" style={{ fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>
            Growth Zones → <b>Find best houses</b> pulls the highest-value properties around your yards from
            county tax records (owner name, address, assessed value) and writes the outreach message for you.
            It needs a parcel API key from <b>regrid.com</b> (paid — one won contract covers it many times over).
          </p>
          <label className="field-label">Regrid API key</label>
          <input
            className="input" placeholder="Paste your Regrid token"
            value={regridToken} onChange={(e) => setRegridToken(e.target.value)}
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
          />
          <label className="field-label">Business callback number (goes in your messages)</label>
          <input
            className="input" type="tel" placeholder="(256) 555-0123"
            value={bizPhone} onChange={(e) => setBizPhone(e.target.value)}
          />
          <button
            className="btn btn-ghost btn-block"
            onClick={() => { onUpdateSettings({ regridToken: regridToken.trim(), bizPhone: bizPhone.trim() }); showToast("Prospector settings saved."); }}
          >
            Save Prospector Settings
          </button>
          <p className="text-faint" style={{ fontSize: 11.5, marginTop: 10, lineHeight: 1.5 }}>
            Owner names come from public tax records. Homeowner phone numbers don&apos;t — the app never looks
            those up, because cold-texting looked-up numbers violates the TCPA ($500–$1,500 per text). Cold
            outreach goes out as a letter or door hanger; texting unlocks when a lead gives you their number.
          </p>
        </div>

        {/* Customer Notifications */}
        <div className="card">
          <div className="section-title"><IconSend size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Customer Notifications</div>
          <p className="text-dim" style={{ fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>
            Automatically text a customer the moment their job&apos;s marked done — no tap needed. The app has
            no backend of its own, so this needs a free <b>Zapier</b> &quot;Catch Hook&quot; wired to an SMS
            action (Twilio, SMS by Zapier, etc.) — paste that hook&apos;s URL below. Then turn it on per job
            in that job&apos;s edit screen.
          </p>
          <label className="field-label">Webhook URL</label>
          <input
            className="input" placeholder="https://hooks.zapier.com/hooks/catch/…"
            value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
          />
          <label className="field-label">Message template</label>
          <textarea
            className="input" rows={3} style={{ resize: "vertical", fontSize: 12.5 }}
            value={msgTemplate} onChange={(e) => setMsgTemplate(e.target.value)}
          />
          <p className="text-faint" style={{ fontSize: 11, marginBottom: 10 }}>
            Placeholders: {"{customer}"} {"{job}"} {"{crew}"}
          </p>
          <button
            className="btn btn-ghost btn-block"
            onClick={() => { onUpdateSettings({ notifyWebhookUrl: webhookUrl.trim(), notifyMessageTemplate: msgTemplate }); showToast("Notification settings saved."); }}
          >
            Save Notification Settings
          </button>
        </div>

        {/* Expenses */}
        <div className="card">
          <div className="section-title"><IconDollar size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Expenses</div>
          <p className="text-dim" style={{ fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>
            Log fuel, equipment, and other costs so Today can show real profit, not just revenue.
          </p>
          <div className="stat-grid-2">
            <div>
              <label className="field-label">Date</label>
              <input className="input" type="date" value={expForm.date} onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Amount ($)</label>
              <input className="input" type="number" inputMode="decimal" placeholder="45.00" value={expForm.amount} onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
          <label className="field-label">Category</label>
          <div className="seg-control" style={{ flexWrap: "wrap" }}>
            {EXPENSE_CATEGORIES.map((c) => (
              <button key={c} className={`seg-option${expForm.category === c ? " active" : ""}`} onClick={() => setExpForm((f) => ({ ...f, category: c }))}>
                {c}
              </button>
            ))}
          </div>
          <label className="field-label">Note (optional)</label>
          <input className="input" placeholder="e.g. Gas at Shell" value={expForm.note} onChange={(e) => setExpForm((f) => ({ ...f, note: e.target.value }))} />
          <button className="btn btn-primary btn-block" disabled={!expForm.amount} onClick={saveExpense}>
            <IconPlus size={15} />Log Expense
          </button>
          {recentExpenses.length > 0 && (
            <>
              <div className="divider" />
              <div className="row-between" style={{ marginBottom: 8 }}>
                <span className="text-dim" style={{ fontSize: 12.5, fontWeight: 700 }}>Recent</span>
                <span className="text-dim" style={{ fontSize: 12.5, fontWeight: 700 }}>{formatMoney(expenseTotal(recentExpenses))} total</span>
              </div>
              {recentExpenses.slice(0, 8).map((e) => (
                <div key={e.id} className="list-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{e.category}{e.note ? ` · ${e.note}` : ""}</div>
                    <div className="text-faint" style={{ fontSize: 11.5 }}>{e.date}</div>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 13.5, marginRight: 8 }}>{formatMoney(e.amount)}</span>
                  <button className="link-btn text-faint" style={{ padding: 2 }} onClick={() => onDeleteExpense(e.id)} aria-label="Delete expense">
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Mileage & Taxes */}
        <div className="card">
          <div className="section-title"><IconRoute size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Mileage &amp; Taxes</div>
          <p className="text-dim" style={{ fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>
            Every mile the app already tracks while you&apos;re clocked in, turned into an IRS-ready mileage log —
            no extra data entry.
          </p>
          <div className="stat-grid" style={{ marginBottom: 12 }}>
            <div className="stat-tile stat-tile-flat">
              <div className="stat-value text-blue">{totalMiles.toFixed(0)}</div>
              <div className="stat-label">MILES LOGGED</div>
            </div>
            <div className="stat-tile stat-tile-flat">
              <div className="stat-value text-good">{formatMoney(totalMiles * (parseFloat(mileageRate) || 0))}</div>
              <div className="stat-label">DEDUCTION</div>
            </div>
          </div>
          <label className="field-label">IRS mileage rate ($/mile — changes yearly)</label>
          <input
            className="input" type="number" inputMode="decimal" step="0.01" value={mileageRate}
            onChange={(e) => setMileageRate(e.target.value)}
            onBlur={() => onUpdateSettings({ mileageRate: parseFloat(mileageRate) || 0 })}
          />
          <button className="btn btn-primary btn-block" onClick={doExportMileage}>
            <IconDownload size={15} />Export Mileage Log (CSV)
          </button>
        </div>

        {/* Backup */}
        <div className="card">
          <div className="section-title">Data Backup</div>
          <p className="text-dim" style={{ fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>
            All data lives on this phone. Export a backup to keep it safe or to move crew data between devices.
          </p>
          <div className="stat-grid-2">
            <button className="btn btn-primary" onClick={doExport}><IconDownload size={15} />Export</button>
            <button className="btn btn-ghost" onClick={() => importRef.current?.click()}><IconUpload size={15} />Restore</button>
          </div>
          <input
            ref={importRef} type="file" accept="application/json,.json" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ""; }}
          />
        </div>

        <p className="text-faint" style={{ fontSize: 11.5, textAlign: "center", paddingBottom: 8 }}>
          Collins Lawncare Tracker · v2.0
        </p>
      </div>
    </>
  );
}
