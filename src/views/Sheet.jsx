// Bottom sheet used by the Pro paywall and account deletion dialogs.
export default function Sheet({ title, icon, onClose, children, labelledBy = "sheet-title" }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%", maxWidth: 560, margin: "0 auto", maxHeight: "90vh", overflowY: "auto",
          borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0,
          paddingBottom: "calc(18px + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row-between" style={{ marginBottom: 10 }}>
          <div id={labelledBy} style={{ fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 7 }}>
            {icon}{title}
          </div>
          {onClose && <button className="link-btn text-faint" onClick={onClose}>Close</button>}
        </div>
        {children}
      </div>
    </div>
  );
}
