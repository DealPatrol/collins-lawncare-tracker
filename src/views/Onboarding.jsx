import { useState } from "react";
import { IconLeaf, IconUsers } from "../icons.jsx";

export default function Onboarding({ employees, onCreate, onPick, onJoinCrew }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("crew");
  const [joinCode, setJoinCode] = useState("");
  const [joinMsg, setJoinMsg] = useState(null); // { text, tone }
  const [showJoin, setShowJoin] = useState(false);

  const create = () => {
    if (!name.trim()) return;
    onCreate(name, role);
    setName("");
  };

  const join = () => {
    if (!joinCode.trim()) return;
    try {
      const { addedJobs, addedEmployees } = onJoinCrew(joinCode);
      setJoinCode("");
      setJoinMsg({
        text: addedJobs || addedEmployees
          ? `Got it — ${addedJobs} job${addedJobs === 1 ? "" : "s"} and ${addedEmployees} crew member${addedEmployees === 1 ? "" : "s"} added. Pick your name below.`
          : "That code didn't have anything new in it.",
        tone: addedJobs || addedEmployees ? "green" : "amber",
      });
    } catch (e) {
      setJoinMsg({ text: e.message || "Invalid invite code.", tone: "red" });
    }
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

        {joinMsg && (
          <div className={`banner banner-${joinMsg.tone}`} style={{ marginBottom: 14 }}>{joinMsg.text}</div>
        )}

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

        {showJoin ? (
          <div className="card">
            <div className="section-title">Join a Crew</div>
            <p className="text-dim" style={{ fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>
              Paste the invite code your crew manager sent you — it&apos;ll load their job list here.
            </p>
            <textarea
              className="input" rows={3} placeholder="Paste the invite code here"
              value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
              style={{ resize: "vertical", fontSize: 12.5 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowJoin(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!joinCode.trim()} onClick={join}>Join Crew</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost btn-block" style={{ marginBottom: 14 }} onClick={() => setShowJoin(true)}>
            <IconUsers size={15} />Have a crew invite code?
          </button>
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
