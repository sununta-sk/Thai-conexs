// src/components/ChessChallengePopup.jsx
// App-wide popup for an incoming /chess lobby challenge (a 'pending'
// chess_games row with mode = 'lobby' that someone else created with me
// seated in it). Mounted once in App.jsx for signed-in users, on desktop and
// mobile alike — unlike the in-chat invite toast, a lobby game is played on
// its own /chess/:gameId page, which works on both.
// Accept → chess_respond_challenge(true) → /chess/:gameId. Decline (or ✕)
// → chess_respond_challenge(false). A challenge lasts 90s.
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "../hooks/useTranslation";
import { avatarOf, lobbyErrorText, playChallengeChime } from "../lib/chessLobby";

const TTL_MS = 90 * 1000;

export default function ChessChallengePopup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tx } = useTranslation(["chess"]);
  const [myId, setMyId] = useState(null);
  const [invites, setInvites] = useState([]); // [{ game, from, deadline }]
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { id, code }
  const seenRef = useRef(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMyId(data.session?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setMyId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!myId) return;
    let cancelled = false;

    const consider = async (g) => {
      if (!g || g.mode !== "lobby" || g.status !== "pending" || !g.created_by || g.created_by === myId) return;
      if (g.white_id !== myId && g.black_id !== myId) return;
      if (seenRef.current.has(g.id)) return;
      const receivedAt = Date.now();
      const createdAt = new Date(g.created_at).getTime();
      // Normally created_at + 90s; never more than 90s from now, and a
      // row that already looks expired is ignored.
      const deadline = Math.min(receivedAt + TTL_MS, Math.max(createdAt, receivedAt - TTL_MS) + TTL_MS);
      if (deadline - receivedAt < 3000) return;
      seenRef.current.add(g.id);
      const { data: from } = await supabase.from("profiles").select("id, username, avatar_url, photos").eq("id", g.created_by).maybeSingle();
      if (cancelled) return;
      setInvites((prev) => [...prev.filter((i) => i.game.id !== g.id), { game: g, from, deadline }]);
      playChallengeChime();
    };
    const drop = (id) => setInvites((prev) => prev.filter((i) => i.game.id !== id));

    const channel = supabase
      .channel(`chess-challenges:${myId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chess_games" }, (payload) => {
        const g = payload.new;
        if (!g || g.mode !== "lobby") return;
        if (g.status === "pending") consider(g);
        else drop(g.id);
      })
      .subscribe();

    // Safety net for a dropped realtime socket (same reason as ChessGame's
    // poll): pick up challenges we missed, and close ones that ended.
    const poll = async () => {
      const { data } = await supabase
        .from("chess_games")
        .select("*")
        .eq("mode", "lobby")
        .eq("status", "pending")
        .neq("created_by", myId)
        .or(`white_id.eq.${myId},black_id.eq.${myId}`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (cancelled || !data) return;
      const pendingIds = new Set(data.map((g) => g.id));
      setInvites((prev) => prev.filter((i) => pendingIds.has(i.game.id)));
      data.forEach(consider);
    };
    poll();
    const timer = setInterval(poll, 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [myId]);

  const hasInvites = invites.length > 0;
  useEffect(() => {
    if (!hasInvites) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      setInvites((prev) => prev.filter((i) => i.deadline > t));
    };
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [hasInvites]);

  // On that game's own page, ChessGame already shows Accept/Decline.
  const invite = invites.find((i) => location.pathname !== `/chess/${i.game.id}`);
  if (!invite || !myId) return null;

  const name = invite.from?.username || tx.opponent;
  const avatar = avatarOf(invite.from);
  const secondsLeft = Math.max(0, Math.ceil((invite.deadline - now) / 1000));
  const shownError = error && error.id === invite.game.id ? error.code : null;

  const respond = async (accept) => {
    if (busy) return;
    const id = invite.game.id;
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("chess_respond_challenge", { p_user_id: myId, p_game_id: id, p_accept: accept });
    setBusy(false);
    if (!rpcError && data?.success) {
      setInvites((prev) => prev.filter((i) => i.game.id !== id));
      if (accept) navigate(`/chess/${id}`);
      return;
    }
    if (data?.error === "already_in_game" && data.game_id) {
      setInvites((prev) => prev.filter((i) => i.game.id !== id));
      navigate(`/chess/${data.game_id}`);
      return;
    }
    if (!accept) { setInvites((prev) => prev.filter((i) => i.game.id !== id)); return; }
    setError({ id, code: data?.error || "generic" });
    // Expired / withdrawn / busy: show why for a moment, then close.
    setTimeout(() => setInvites((prev) => prev.filter((i) => i.game.id !== id)), 2500);
  };

  return (
    <div style={S.overlay} onClick={() => respond(false)}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Work+Sans:wght@400;500;600&display=swap" />
      <div style={S.card} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button style={S.closeBtn} onClick={() => respond(false)} aria-label={tx.decline}>✕</button>
        <div style={S.avatarWrap}>
          {avatar ? <img src={avatar} alt="" style={S.avatarImg} /> : <span style={S.glyph}>♟</span>}
          <span style={S.badge}>♞</span>
        </div>
        <h3 style={S.title}>{tx.incomingTitle(name)}</h3>
        <p style={S.body}>{tx.incomingBody}</p>
        {shownError ? (
          <div style={S.errorBanner}>{lobbyErrorText(tx, shownError, name)}</div>
        ) : (
          <div style={S.timer}>{tx.expiresIn(secondsLeft)}</div>
        )}
        <button style={busy ? { ...S.primaryBtn, opacity: 0.6 } : S.primaryBtn} disabled={busy || !!shownError} onClick={() => respond(true)}>
          {tx.accept}
        </button>
        <button style={S.secondaryBtn} disabled={busy} onClick={() => respond(false)}>{tx.decline}</button>
      </div>
    </div>
  );
}

// Chess palette (ChessGame.jsx CS), same overlay pattern as RoomChat's
// in-chat invite popup.
const S = {
  overlay: { position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(5,3,12,0.72)", backdropFilter: "blur(4px)" },
  card: { position: "relative", width: "100%", maxWidth: 360, boxSizing: "border-box", padding: "28px 24px 22px", borderRadius: 22, textAlign: "center", background: "radial-gradient(ellipse at top, #231a44 0%, #0d0a18 70%)", border: "1px solid #3a2f63", boxShadow: "0 24px 70px rgba(0,0,0,.65), 0 0 40px #ec489922", fontFamily: "'Work Sans', sans-serif" },
  closeBtn: { position: "absolute", top: 12, right: 14, padding: 4, background: "none", border: "none", color: "#7d7196", fontSize: 16, lineHeight: 1, cursor: "pointer" },
  avatarWrap: { position: "relative", width: 76, height: 76, margin: "0 auto 14px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(140deg, #5b3a8f, #25203f)", border: "2px solid #ec4899", boxShadow: "0 0 26px #ec489955" },
  avatarImg: { width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" },
  glyph: { fontSize: 34, color: "#f0abfc" },
  badge: { position: "absolute", right: -4, bottom: -4, width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", background: "linear-gradient(135deg, #ec4899, #a855f7)", border: "2px solid #0d0a18" },
  title: { margin: "0 0 6px", fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.35 },
  body: { margin: "0 0 14px", fontSize: 13.5, color: "#9c93b5" },
  timer: { display: "inline-block", marginBottom: 18, padding: "5px 12px", borderRadius: 999, background: "#1c1734", border: "1px solid #2c2547", fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 600, color: "#f0abfc", fontVariantNumeric: "tabular-nums" },
  errorBanner: { marginBottom: 16, padding: "8px 12px", borderRadius: 10, background: "#2c1832", border: "1px solid #ec489955", color: "#f9a8d4", fontSize: 12.5, fontWeight: 600 },
  primaryBtn: { width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 22px #ec489944" },
  secondaryBtn: { width: "100%", marginTop: 10, padding: "11px", borderRadius: 12, border: "1px solid #2c2547", background: "transparent", color: "#9c93b5", fontFamily: "'Sora', sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer" },
};
