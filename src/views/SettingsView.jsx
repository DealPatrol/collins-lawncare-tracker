import { useRef, useState } from "react";
import { exportBackup, parseBackup } from "../store.js";
import { getCurrentCoords } from "../location.js";
import { getTodayKey } from "../utils.js";
import { IconPin, IconDownload, IconUpload, IconTarget } from "../icons.jsx";

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

export default function SettingsView({ state, me, onUpdateSettings, onRestore, onSwitchEmployee, showToast }) {
  const { settings } = state;
  const importRef = useRef(null);
  const [homeAddress, setHomeAddress] = useState(settings.homeAddress);

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
              <div className="text-faint" style={{ fontSize: 12, marginTop: 2 }}>Suggest starting the timer when you pull up to a pinned yard.</div>
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
