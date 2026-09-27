// src/components/ChessLeaderboard.jsx
// Games page leaderboard: top 3 on a podium with gold / silver / bronze
// crowns, places 4-20 as rows underneath, and the viewer's own rank when
// they're further down. Data comes from the chess_leaderboard RPC
// (supabase/manual-sql/2026-09-27-chess-leaderboard.sql): win 3, draw 1,
// only games that reached move 5.
import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { avatarOf } from "../lib/chessLobby";

const PERIODS = ["day", "month", "all"];

// Crown artwork: an original stylised crown (three points with ball tips,
// a jewelled band and a centre gem), shaded with a metal gradient per tier.
const CROWN_TONES = {
  gold:   { hi: "#fff5c2", mid: "#fbbf24", lo: "#b45309", gem: "#ec4899", gemHi: "#fbcfe8", glow: "#fbbf2466" },
  silver: { hi: "#ffffff", mid: "#cbd5e1", lo: "#64748b", gem: "#10b981", gemHi: "#a7f3d0", glow: "#cbd5e155" },
  bronze: { hi: "#ffe4cc", mid: "#e0a07a", lo: "#8a4b2a", gem: "#f59e0b", gemHi: "#fde68a", glow: "#e0a07a55" },
};
const hexPoints = (cx, cy, r) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
const GEM_HEX = hexPoints(60, 52, 12);
const GEM_HEX_INNER = hexPoints(60, 52, 6.5);

function Crown({ tone, width }) {
  const id = useId().replace(/:/g, "");
  const t = CROWN_TONES[tone];
  return (
    <svg width={width} height={width * 0.8} viewBox="0 0 120 96" aria-hidden="true" style={{ display: "block", filter: `drop-shadow(0 6px 14px ${t.glow})` }}>
      <defs>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.hi} />
          <stop offset="0.45" stopColor={t.mid} />
          <stop offset="1" stopColor={t.lo} />
        </linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.gemHi} />
          <stop offset="1" stopColor={t.gem} />
        </linearGradient>
      </defs>
      <path d="M14 76 L20 30 L42 54 L60 18 L78 54 L100 30 L106 76 Z" fill={`url(#${id}m)`} />
      <path d="M60 18 L78 54 L100 30 L106 76 L60 76 Z" fill="#000" opacity="0.13" />
      <path d="M20 30 L24 70 M60 18 L60 38 M100 30 L96 70" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
      <rect x="11" y="70" width="98" height="17" rx="6" fill={`url(#${id}m)`} />
      <rect x="15" y="72" width="90" height="4" rx="2" fill="#fff" opacity="0.4" />
      <circle cx="20" cy="27" r="6.5" fill={`url(#${id}m)`} />
      <circle cx="60" cy="14" r="7.5" fill={`url(#${id}m)`} />
      <circle cx="100" cy="27" r="6.5" fill={`url(#${id}m)`} />
      <circle cx="18" cy="25" r="2" fill="#fff" opacity="0.8" />
      <circle cx="58" cy="11.5" r="2.3" fill="#fff" opacity="0.8" />
      <circle cx="98" cy="25" r="2" fill="#fff" opacity="0.8" />
      <polygon points={GEM_HEX} fill={`url(#${id}g)`} stroke="#fff" strokeOpacity="0.7" strokeWidth="2" />
      <polygon points={GEM_HEX_INNER} fill="#fff" opacity="0.28" />
      <circle cx="34" cy="78.5" r="3.6" fill={t.gem} stroke="#fff" strokeOpacity="0.6" />
      <circle cx="60" cy="78.5" r="3.6" fill={t.gem} stroke="#fff" strokeOpacity="0.6" />
      <circle cx="86" cy="78.5" r="3.6" fill={t.gem} stroke="#fff" strokeOpacity="0.6" />
    </svg>
  );
}

function Avatar({ row, size, ring }) {
  const src = avatarOf({ avatar_url: row?.avatar });
  return (
    <span style={{ ...S.avatar, width: size, height: size, boxShadow: `0 0 0 3px ${ring}, 0 6px 16px rgba(0,0,0,.45)` }}>
      {src ? <img src={src} alt="" style={S.avatarImg} /> : <span style={{ ...S.avatarInitial, fontSize: size * 0.42 }}>{row?.username ? row.username[0].toUpperCase() : "?"}</span>}
    </span>
  );
}

function timeAgo(tx, iso) {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return tx.agoNow;
  if (mins < 60) return tx.agoMin(mins);
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return tx.agoHr(hrs);
  return tx.agoDay(Math.round(hrs / 24));
}

// Podium slots, left to right: 2nd, 1st, 3rd.
const SLOTS = [
  { place: 2, tone: "silver", crown: 70, avatar: 54, block: 118, ring: "#cbd5e1" },
  { place: 1, tone: "gold", crown: 96, avatar: 66, block: 162, ring: "#fbbf24" },
  { place: 3, tone: "bronze", crown: 64, avatar: 50, block: 96, ring: "#e0a07a" },
];

export default function ChessLeaderboard({ tx, isMobile, myId }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("month");
  const [state, setState] = useState({ period: null, rows: [], error: false });

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      supabase.rpc("chess_leaderboard", { p_period: period, p_limit: 20 }).then(({ data, error }) => {
        if (cancelled) return;
        setState({ period, rows: Array.isArray(data) ? data : [], error: !!error });
      });
    load();
    const timer = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [period]);

  const loading = state.period !== period;
  const rows = loading ? [] : state.rows;
  const top = rows.filter((r) => r.rank <= 20);
  const byPlace = (n) => top.find((r) => r.rank === n) || null;
  const rest = top.filter((r) => r.rank > 3);
  const me = rows.find((r) => r.is_me && r.rank > 20) || null;
  const scale = isMobile ? 0.72 : 1;

  const openProfile = (r) => { if (r && r.user_id !== myId) navigate(`/profile/${r.user_id}`); };

  return (
    <section style={S.card}>
      <style>{`
        .tcn-lb-row:hover { background: #1b2447; }
        .tcn-lb-podium-person { cursor: pointer; transition: transform .15s; }
        .tcn-lb-podium-person:hover { transform: translateY(-3px); }
      `}</style>
      <div style={S.headRow}>
        <h2 style={S.title}><Trophy size={19} color="#fbbf24" strokeWidth={2.2} /> {tx.leaderboardTitle}</h2>
        <div style={S.periodToggle} role="tablist">
          {PERIODS.map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              style={period === p ? { ...S.periodBtn, ...S.periodBtnActive } : S.periodBtn}
            >
              {p === "day" ? tx.periodDay : p === "month" ? tx.periodMonth : tx.periodAll}
            </button>
          ))}
        </div>
      </div>

      {/* Podium */}
      <div style={S.stage}>
        <div style={S.rays} />
        <div style={S.podiumRow}>
          {SLOTS.map((slot) => {
            const r = byPlace(slot.place);
            return (
              <div key={slot.place} style={{ ...S.podiumCol, flex: slot.place === 1 ? 1.15 : 1 }}>
                <div
                  className={r ? "tcn-lb-podium-person" : undefined}
                  style={{ ...S.person, opacity: r ? 1 : 0.55 }}
                  onClick={() => openProfile(r)}
                >
                  <Crown tone={slot.tone} width={slot.crown * scale} />
                  <div style={{ ...S.personRow, flexDirection: isMobile ? "column" : "row" }}>
                    <Avatar row={r} size={slot.avatar * scale} ring={slot.ring} />
                    <div style={{ ...S.personText, alignItems: isMobile ? "center" : "flex-start" }}>
                      <span style={{ ...S.personName, fontSize: (slot.place === 1 ? 18 : 15) * (isMobile ? 0.82 : 1), maxWidth: isMobile ? 96 : 150 }}>
                        {r ? `@${r.username}` : "—"}
                      </span>
                      <span style={S.pointsPill}>
                        <Trophy size={12} color="#fbbf24" strokeWidth={2.4} />
                        {r ? r.points : 0} <span style={S.ptsUnit}>{tx.ptsUnit}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ ...S.blockTop }} />
                <div style={{ ...S.block, height: slot.block * scale }}>
                  <span style={{ ...S.blockNum, fontSize: (slot.place === 1 ? 70 : 54) * scale }}>{tx.ordinal(slot.place)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {state.error && <p style={S.note}>{tx.leaderboardError}</p>}
      {!loading && !state.error && top.length === 0 && <p style={S.note}>{tx.boardEmpty}</p>}

      {/* Places 4-20 */}
      {rest.length > 0 && (
        <div style={S.table}>
          <div style={{ ...S.tr, ...S.th, gridTemplateColumns: isMobile ? S.colsMobile : S.cols }}>
            <span>{tx.colPlace}</span>
            <span>{tx.colPlayer}</span>
            <span style={S.right}>{tx.colPoints}</span>
            {!isMobile && <span style={S.right}>{tx.colRecord}</span>}
            {!isMobile && <span style={S.right}>{tx.colLast}</span>}
          </div>
          {rest.map((r) => (
            <LeaderRow key={r.user_id} r={r} tx={tx} isMobile={isMobile} onOpen={() => openProfile(r)} />
          ))}
        </div>
      )}

      {me && (
        <div style={S.meWrap}>
          <div style={S.meLabel}>{tx.yourRank}</div>
          <LeaderRow r={me} tx={tx} isMobile={isMobile} onOpen={() => {}} />
        </div>
      )}

      <p style={S.scoring}>{tx.scoringNote}</p>
    </section>
  );
}

function LeaderRow({ r, tx, isMobile, onOpen }) {
  return (
    <div
      className="tcn-lb-row"
      style={{ ...S.tr, ...(r.is_me ? S.trMe : null), gridTemplateColumns: isMobile ? S.colsMobile : S.cols, cursor: r.is_me ? "default" : "pointer" }}
      onClick={onOpen}
    >
      <span style={S.place}><Trophy size={14} color="#6d8cff" strokeWidth={2.4} />{r.rank}</span>
      <span style={S.player}>
        <Avatar row={r} size={28} ring="#1e2a52" />
        <span style={S.playerName}>@{r.username}{r.is_me ? ` · ${tx.you}` : ""}</span>
      </span>
      <span style={{ ...S.right, ...S.pointsCell }}>{r.points}</span>
      {!isMobile && <span style={{ ...S.right, ...S.muted }}>{r.wins} · {r.draws} · {r.losses}</span>}
      {!isMobile && <span style={{ ...S.right, ...S.muted }}>{timeAgo(tx, r.last_played)}</span>}
    </div>
  );
}

const S = {
  card: { padding: "18px 18px 16px", borderRadius: 20, background: "linear-gradient(180deg, #0f1730 0%, #0b1024 100%)", border: "1px solid #1e2a52", boxShadow: "0 16px 40px rgba(0,0,0,.35)", minWidth: 0 },
  headRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  title: { margin: 0, display: "flex", alignItems: "center", gap: 8, fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700, color: "#fff" },
  periodToggle: { display: "flex", padding: 4, gap: 4, borderRadius: 12, background: "#141d3b", border: "1px solid #24305c" },
  periodBtn: { padding: "7px 14px", borderRadius: 9, border: "none", background: "transparent", color: "#8fa0cf", fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  periodBtnActive: { background: "linear-gradient(135deg, #ff4d8d, #ec4899)", color: "#fff", boxShadow: "0 4px 14px #ec489955" },

  stage: { position: "relative", overflow: "hidden", marginTop: 14, borderRadius: 16, background: "radial-gradient(ellipse at 50% 30%, #1d2b5e 0%, #0f1733 55%, #0b1024 100%)" },
  rays: {
    position: "absolute", inset: 0, pointerEvents: "none",
    background: "repeating-conic-gradient(from 0deg at 50% 32%, rgba(140,170,255,0.10) 0deg 3deg, transparent 3deg 11deg)",
    WebkitMaskImage: "radial-gradient(circle at 50% 32%, #000 0%, rgba(0,0,0,.6) 30%, transparent 62%)",
    maskImage: "radial-gradient(circle at 50% 32%, #000 0%, rgba(0,0,0,.6) 30%, transparent 62%)",
  },
  // In normal flow (not absolutely pinned to a fixed-height stage) so the
  // stage grows to fit — the stacked mobile layout is taller than desktop.
  podiumRow: { position: "relative", display: "flex", alignItems: "flex-end", gap: 8, padding: "28px 10px 0" },
  podiumCol: { display: "flex", flexDirection: "column", alignItems: "stretch", minWidth: 0 },
  person: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 10, minWidth: 0 },
  personRow: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  personText: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
  personName: { fontFamily: "'Sora', sans-serif", fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  pointsPill: { display: "inline-flex", alignItems: "center", gap: 5, alignSelf: "flex-start", padding: "4px 9px", borderRadius: 8, background: "#1a2550", border: "1px solid #2a3a72", color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" },
  ptsUnit: { color: "#8fa0cf", fontWeight: 600, fontSize: 11 },
  avatar: { position: "relative", flexShrink: 0, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(140deg, #3b4a8a, #1a2550)" },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  avatarInitial: { color: "#dbe4ff", fontFamily: "'Sora', sans-serif", fontWeight: 800 },
  blockTop: { height: 14, margin: "0 2px", background: "linear-gradient(180deg, #33478c, #26366e)", clipPath: "polygon(5% 0, 95% 0, 100% 100%, 0 100%)" },
  block: {
    position: "relative", display: "flex", justifyContent: "center", alignItems: "flex-start", overflow: "hidden",
    background: "linear-gradient(180deg, #1f2f66 0%, #17224b 55%, rgba(15,23,51,0) 100%)",
    borderTop: "1px solid #3a4f98",
  },
  blockNum: { marginTop: 14, fontFamily: "'Sora', sans-serif", fontWeight: 900, letterSpacing: -1, color: "rgba(120,150,230,0.22)", lineHeight: 1, textShadow: "0 2px 0 rgba(0,0,0,.25)", whiteSpace: "nowrap" },

  note: { margin: "12px 0 0", textAlign: "center", fontSize: 13, color: "#8fa0cf" },
  table: { marginTop: 14, display: "flex", flexDirection: "column", gap: 2 },
  cols: "70px minmax(0,1fr) 80px 110px 100px",
  colsMobile: "48px minmax(0,1fr) 64px",
  tr: { display: "grid", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 10, transition: "background .15s" },
  th: { padding: "6px 10px", fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#7f8fbe" },
  trMe: { background: "#2a1233", boxShadow: "inset 0 0 0 1px #ec489988" },
  right: { textAlign: "right" },
  place: { display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: "#dbe4ff" },
  player: { display: "flex", alignItems: "center", gap: 9, minWidth: 0 },
  playerName: { fontFamily: "'Sora', sans-serif", fontSize: 13.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  pointsCell: { fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 800, color: "#fbbf24" },
  muted: { fontSize: 12.5, color: "#8fa0cf", whiteSpace: "nowrap" },
  meWrap: { marginTop: 10, paddingTop: 10, borderTop: "1px dashed #2a3a72" },
  meLabel: { padding: "0 10px 4px", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#f472b6" },
  scoring: { margin: "14px 0 0", textAlign: "center", fontSize: 11.5, color: "#6f7fae" },
};
