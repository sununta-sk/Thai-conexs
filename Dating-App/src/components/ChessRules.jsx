// src/components/ChessRules.jsx — "How to Play" content for chess, shared by
// live games (ChessGame.jsx) and games against the computer (ChessBot.jsx).
import { XIcon } from "./Icons";

const RULE_KEYS = ["Pawn", "Knight", "Bishop", "Rook", "Queen", "King"];

// A stack of name + description rows (piece moves, special moves, …).
export function RuleRows({ rows }) {
  return (
    <div style={R.list}>
      {rows.map((r) => (
        <div key={r.name} style={R.row}>
          <div style={R.rowName}>{r.name}</div>
          <div style={R.rowDesc}>{r.desc}</div>
        </div>
      ))}
    </div>
  );
}

// Goal line + one row per piece + tip box, with no card/overlay chrome.
export function RulesContent({ tx }) {
  return (
    <>
      <div style={R.goalLine}>{tx.rulesGoal}</div>
      <RuleRows rows={RULE_KEYS.map((k) => ({ name: tx[`ruleName${k}`], desc: tx[`ruleDesc${k}`] }))} />
      <div style={R.tipBox}>{tx.rulesTip}</div>
    </>
  );
}

// Rules card overlay — covers its positioned parent panel exactly (inset
// -1 = over the panel's 1px border; absolute insets are measured from the
// padding box, so the panel's own padding needs no offset) with the panel's
// own gradient, so opening it reads as the panel's content switching rather
// than a box floating inside another box. `children` replaces the default
// content.
export function RulesCard({ tx, title, onClose, children }) {
  return (
    <div style={R.overlay} onClick={onClose}>
      <div style={R.cardBox} onClick={(e) => e.stopPropagation()}>
        <div style={R.headerRow}>
          <span style={R.headerTitle}>{title || tx.rulesTitle}</span>
          <button style={R.closeBtn} onClick={onClose} aria-label="Close"><XIcon size={13} /></button>
        </div>
        {children || <RulesContent tx={tx} />}
      </div>
    </div>
  );
}

const R = {
  overlay: { position: "absolute", inset: -1, zIndex: 60, display: "flex", flexDirection: "column", background: "radial-gradient(ellipse at top, #181230 0%, #0d0a18 65%)", border: "1px solid #2c2547", borderRadius: 20, boxSizing: "border-box", padding: "20px 24px 24px", overflowY: "auto" },
  cardBox: { width: "100%", maxWidth: 480, margin: "0 auto" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  headerTitle: { fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700, color: "#fff" },
  closeBtn: { width: 26, height: 26, borderRadius: "50%", border: "1px solid #2c2547", background: "#1c1734", color: "#7d7196", fontSize: 13, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  goalLine: { fontFamily: "'Work Sans', sans-serif", fontSize: 13.5, color: "#c7bfe0", margin: "0 0 16px" },
  list: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  row: { background: "#1c1734", border: "1px solid #2c2547", borderRadius: 10, padding: "9px 12px" },
  rowName: { fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 },
  rowDesc: { fontFamily: "'Work Sans', sans-serif", fontSize: 12.5, color: "#9c93b5" },
  tipBox: { background: "#1c173466", border: "1px solid #2c254799", borderRadius: 10, padding: "10px 12px", fontFamily: "'Work Sans', sans-serif", fontSize: 12.5, color: "#9c93b5" },
};
