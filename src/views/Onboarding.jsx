import { useState } from "react";
import { IconLeaf, IconUsers } from "../icons.jsx";

export default function Onboarding({ employees, onCreate, onPick }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("crew");

  const create = () => {
    if (!name.trim()) return;
    onCreate(name, role);
    setName("");
  };

  return (
    <div className="app">
      <div className="screen" style={{ paddingTop: 56 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="brand-mark" style={{ width: 64, height: 64, borderRadius: 18, margin: "0 auto 16px" }}>
            <IconLeaf size={34} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>Collins Lawncare</h1>
          <p className="text-dim" style={{ fontSize: 14, marginTop: 6 }}>Crew tracking, routes & pay — built for the field.</p>
        </div>

        {employees.length > 0 && (
          <div className="card">
            <div className="section-title"><IconUsers size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Who&apos;s using this device?</div>
            {employees.map((e) => (
              <button key={e.id} className="list-row" style={{ width: "100%", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left" }} onClick={() => onPick(e.id)}>
                <div className="crew-avatar" style={{ background: e.color }}>{e.name[0]?.toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{e.name}</div>
                  <div className="text-faint" style={{ fontSize: 12 }}>{e.role === "manager" ? "Crew Manager" : "Crew Member"}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="card">
          <div className="section-title">{employees.length ? "Or add a new profile" : "Set up your profile"}</div>
          <label className="field-label">Your name</label>
          <input className="input" placeholder="e.g. Cole Collins" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
          <label className="field-label">Role</label>
          <div className="seg-control">
            <button className={`seg-option${role === "crew" ? " active" : ""}`} onClick={() => setRole("crew")}>Crew Member</button>
            <button className={`seg-option${role === "manager" ? " active" : ""}`} onClick={() => setRole("manager")}>Crew Manager</button>
          </div>
          <button className="btn btn-primary btn-block btn-lg" disabled={!name.trim()} onClick={create}>
            Get Started
          </button>
        </div>

        <p className="text-faint" style={{ fontSize: 12, textAlign: "center", padding: "4px 20px", lineHeight: 1.5 }}>
          Each crew member picks their profile so hours, stops, and miles are tracked to the right person.
        </p>
      </div>
    </div>
  );
}
