import { useState } from "react";
import { styles } from "./styles.js";

export default function Login({ onLogin, onSignup }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signin") await onLogin(email.trim(), password);
      else await onSignup(email.trim(), password);
    } catch (err) {
      setError(friendlyAuthError(err?.code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={{ padding: "48px 24px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
        <div style={styles.brand}>Collins Lawncare</div>
        <div style={{ ...styles.subBrand, marginTop: 4 }}>Sign in to sync your data</div>
      </div>

      <form onSubmit={submit} style={styles.card}>
        <div style={styles.sectionTitle}>{mode === "signin" ? "Sign In" : "Create Account"}</div>
        <label style={styles.label}>Email</label>
        <input
          style={styles.input}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button style={styles.primaryBtn} type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
        </button>
        <button
          type="button"
          style={{ ...styles.navBtn, width: "100%", marginTop: 16 }}
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

function friendlyAuthError(code) {
  switch (code) {
    case "auth/invalid-email": return "Invalid email address.";
    case "auth/user-disabled": return "This account has been disabled.";
    case "auth/user-not-found": return "No account found with this email.";
    case "auth/wrong-password": return "Incorrect password.";
    case "auth/invalid-credential": return "Invalid email or password.";
    case "auth/email-already-in-use": return "An account already exists with this email.";
    case "auth/weak-password": return "Password must be at least 6 characters.";
    default: return "Could not sign in. Please try again.";
  }
}
