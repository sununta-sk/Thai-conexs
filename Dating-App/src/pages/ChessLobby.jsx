// src/pages/ChessLobby.jsx — /chess
// Standalone chess lobby: Quick Match (server-side queue, chess_quick_match)
// plus a list of people connected right now that you can challenge directly
// (chess_challenge → they get ChessChallengePopup anywhere in the app).
// Games themselves are played on /chess/:gameId (ChessMatch.jsx). Schema and
// RPCs: supabase/manual-sql/2026-09-27-chess-lobby-matchmaking.sql.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "../hooks/useTranslation";
import { useIsMobile } from "../hooks/useIsMobile";
import { useOnline } from "../context/OnlineContext";
import { avatarOf, lobbyErrorText } from "../lib/chessLobby";
import { ChessKnight } from "lucide-react";

const QUICK_MATCH_POLL_MS = 3000;
const NOBODY_HINT_AFTER_MS = 20 * 1000;

export default function ChessLobby() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { tx } = useTranslation(["chess"]);
  const { presentUsers, botIds } = useOnline();

  const [myId, setMyId] = useState(null);
  const [blockedIds, setBlockedIds] = useState(() => new Set());
  const [profiles, setProfiles] = useState(() => new Map()); // id -> profile row
  const [lobbyState, setLobbyState] = useState(() => new Map()); // id -> 'idle' | 'searching' (people on this page)
  const [current, setCurrent] = useState(null); // my active lobby game, or my own open challenge
  const [currentOpponent, setCurrentOpponent] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchStartedAt, setSearchStartedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busyId, setBusyId] = useState(null); // player id whose Challenge button is mid-request
  const [error, setError] = useState(null); // { code, name } from an RPC answer
  const lobbyChannelRef = useRef(null);
  const searchingRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMyId(data.session?.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!myId) return;
    supabase.from("user_blocks").select("blocked_id").eq("blocker_id", myId).then(({ data }) => {
      setBlockedIds(new Set((data || []).map((r) => r.blocked_id)));
    });
  }, [myId]);

  // My current lobby game (to resume) or my own still-open challenge, kept
  // fresh by realtime on my own chess_games rows (RLS only delivers rows
  // I'm seated in). That same subscription is how a searching player hears
  // about a Quick Match pairing made by the OTHER player's call right away,
  // instead of waiting for their own next poll.
  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("chess_games")
        .select("*")
        .eq("mode", "lobby")
        .in("status", ["active", "pending"])
        .or(`white_id.eq.${myId},black_id.eq.${myId}`)
        .order("created_at", { ascending: false })
        .limit(5);
      if (cancelled) return;
      const rows = data || [];
      const active = rows.find((g) => g.status === "active");
      const mine = rows.find((g) => g.status === "pending" && g.created_by === myId && Date.now() - new Date(g.created_at).getTime() < 90 * 1000);
      const next = active || mine || null;
      setCurrent(next);
      if (!next) { setCurrentOpponent(null); return; }
      const oppId = next.white_id === myId ? next.black_id : next.white_id;
      const { data: opp } = await supabase.from("profiles").select("id, username, avatar_url, photos").eq("id", oppId).maybeSingle();
      if (!cancelled) setCurrentOpponent(opp || null);
    };
    load();
    const channel = supabase
      .channel(`chess-lobby-mine:${myId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chess_games" }, (payload) => {
        const g = payload.new;
        if (!g || g.mode !== "lobby" || (g.white_id !== myId && g.black_id !== myId)) return;
        load();
      })
      .subscribe();
    const poll = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [myId]);

  // Quick Match: call the RPC every 3s while searching. Each call is also
  // the queue heartbeat — the server forgets anyone quiet for 15s.
  useEffect(() => {
    if (!searching || !myId) return;
    let stopped = false;
    const tick = async () => {
      const { data, error: rpcError } = await supabase.rpc("chess_quick_match", { p_user_id: myId });
      if (stopped) return;
      if (rpcError || data?.error) {
        setSearching(false);
        setError({ code: data?.error || "generic" });
        return;
      }
      if (data.status === "matched" || data.status === "in_game") {
        stopped = true;
        navigate(`/chess/${data.game_id}`);
      }
    };
    tick();
    const timer = setInterval(tick, QUICK_MATCH_POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
      clearInterval(clock);
      supabase.rpc("chess_leave_queue", { p_user_id: myId });
    };
  }, [searching, myId, navigate]);

  // Someone paired me while I was searching → that game is now `current`.
  useEffect(() => {
    if (searching && current?.status === "active") navigate(`/chess/${current.id}`);
  }, [searching, current, navigate]);

  // Presence for people on this lobby page right now, so they can be shown
  // first with an "In the chess lobby" tag.
  useEffect(() => {
    if (!myId) return;
    const channel = supabase.channel("chess-lobby", { config: { presence: { key: myId } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const next = new Map();
        for (const [id, metas] of Object.entries(state)) next.set(id, metas?.[0]?.state || "idle");
        setLobbyState(next);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        lobbyChannelRef.current = channel;
        await channel.track({ state: searchingRef.current ? "searching" : "idle" });
      });
    return () => {
      lobbyChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [myId]);

  useEffect(() => {
    searchingRef.current = searching;
    lobbyChannelRef.current?.track({ state: searching ? "searching" : "idle" });
  }, [searching]);

  // Everyone who can be challenged: connected right now (app-wide presence)
  // or sitting in this lobby, minus me, bots and people I've blocked.
  const candidateIds = useMemo(() => {
    const ids = new Set([...presentUsers, ...lobbyState.keys()]);
    ids.delete(myId);
    for (const id of ids) if (botIds.has(id) || blockedIds.has(id)) ids.delete(id);
    return [...ids].sort();
  }, [presentUsers, lobbyState, myId, botIds, blockedIds]);
  const candidateKey = candidateIds.join(",");

  useEffect(() => {
    const ids = candidateKey ? candidateKey.split(",") : [];
    if (ids.length === 0) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("id, username, avatar_url, photos, is_bot")
      .in("id", ids.slice(0, 200))
      .then(({ data }) => {
        if (cancelled || !data) return;
        setProfiles(new Map(data.map((p) => [p.id, p])));
      });
    return () => { cancelled = true; };
  }, [candidateKey]);

  const players = useMemo(() => {
    const rank = (id) => (lobbyState.get(id) === "searching" ? 0 : lobbyState.has(id) ? 1 : 2);
    return candidateIds
      .map((id) => profiles.get(id))
      .filter((p) => p && !p.is_bot && p.username)
      .sort((a, b) => rank(a.id) - rank(b.id) || a.username.localeCompare(b.username));
  }, [candidateIds, profiles, lobbyState]);

  const startSearch = () => {
    setError(null);
    setSearchStartedAt(Date.now());
    setNow(Date.now());
    setSearching(true);
  };

  const challenge = async (player) => {
    if (!myId || busyId) return;
    setError(null);
    setBusyId(player.id);
    const { data, error: rpcError } = await supabase.rpc("chess_challenge", { p_user_id: myId, p_opponent_id: player.id });
    setBusyId(null);
    if (!rpcError && data?.success) { navigate(`/chess/${data.game_id}`); return; }
    if (data?.error === "already_in_game" && data.game_id) { navigate(`/chess/${data.game_id}`); return; }
    setError({ code: data?.error || "generic", name: player.username });
  };

  const inGame = current?.status === "active";
  const searchElapsed = searching ? Math.max(0, now - searchStartedAt) : 0;
  const currentName = currentOpponent?.username || tx.opponent;

  return (
    <div style={{ ...S.page, paddingTop: isMobile ? 16 : 106 }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Work+Sans:wght@400;500;600&display=swap" />
      <style>{`
        @keyframes tcnChessPulse { 0% { transform: scale(.85); opacity: .9 } 100% { transform: scale(1.6); opacity: 0 } }
        .tcn-chess-player:hover { background: #231c3d; }
      `}</style>
      <div style={S.wrap}>
        <header style={S.header}>
          <div style={S.headerIcon}><ChessKnight size={28} color="#fff" strokeWidth={2} /></div>
          <div>
            <h1 style={S.title}>{tx.lobbyTitle}</h1>
            <p style={S.subtitle}>{tx.lobbySubtitle}</p>
          </div>
        </header>

        {error && <div style={S.errorBanner}>{lobbyErrorText(tx, error.code, error.name)}</div>}

        {current && (
          <div style={S.resumeCard}>
            <div style={S.resumeAvatar}>
              {avatarOf(currentOpponent) ? <img src={avatarOf(currentOpponent)} alt="" style={S.avatarImg} /> : <span style={S.avatarGlyph}>♟</span>}
            </div>
            <div style={S.resumeText}>
              <div style={S.resumeTitle}>{inGame ? tx.resumeTitle : tx.challengeSentTitle}</div>
              <div style={S.resumeBody}>{inGame ? tx.resumeBody(currentName) : tx.waitingAccept(currentName)}</div>
            </div>
            <button style={S.primaryBtnSmall} onClick={() => navigate(`/chess/${current.id}`)}>{tx.resume}</button>
          </div>
        )}

        <div style={isMobile ? S.columnsMobile : S.columns}>
          <section style={S.card}>
            <h2 style={S.cardTitle}>{tx.quickMatchTitle}</h2>
            <p style={S.cardDesc}>{tx.quickMatchDesc}</p>
            {searching ? (
              <div style={S.searchBox}>
                <div style={S.pulseWrap}>
                  <span style={S.pulseRing} />
                  <span style={S.pulseCore}>♟</span>
                </div>
                <div style={S.searchText}>{tx.searching}</div>
                <div style={S.searchClock}>{formatElapsed(searchElapsed)}</div>
                {searchElapsed >= NOBODY_HINT_AFTER_MS && <p style={S.nobodyHint}>{tx.nobodyYet}</p>}
                <button style={S.secondaryBtn} onClick={() => setSearching(false)}>{tx.cancel}</button>
              </div>
            ) : (
              <button style={inGame ? { ...S.primaryBtn, ...S.btnDisabled } : S.primaryBtn} disabled={inGame} onClick={startSearch}>
                {tx.findOpponent}
              </button>
            )}
          </section>

          <section style={S.card}>
            <div style={S.onlineHeader}>
              <h2 style={S.cardTitle}>{tx.onlineTitle}</h2>
              <span style={S.onlineCount}><span style={S.onlineDot} />{players.length}</span>
            </div>
            {players.length === 0 ? (
              <p style={S.emptyText}>{tx.onlineEmpty}</p>
            ) : (
              <div style={S.playerList}>
                {players.map((p) => {
                  const inLobby = lobbyState.has(p.id);
                  const avatar = avatarOf(p);
                  return (
                    <div key={p.id} className="tcn-chess-player" style={S.playerRow}>
                      <button style={S.playerIdentity} onClick={() => navigate(`/profile/${p.id}`)} title={tx.viewProfile}>
                        <span style={S.playerAvatar}>
                          {avatar ? <img src={avatar} alt="" style={S.avatarImg} /> : <span style={S.avatarGlyph}>♟</span>}
                          <span style={S.playerOnlineDot} />
                        </span>
                        <span style={S.playerTextCol}>
                          <span style={S.playerName}>{p.username}</span>
                          {inLobby && (
                            <span style={lobbyState.get(p.id) === "searching" ? S.tagSearching : S.tagLobby}>
                              {lobbyState.get(p.id) === "searching" ? tx.searchingTag : tx.inLobbyTag}
                            </span>
                          )}
                        </span>
                      </button>
                      <button
                        style={inGame || searching || busyId ? { ...S.challengeBtn, ...S.btnDisabled } : S.challengeBtn}
                        disabled={inGame || searching || !!busyId}
                        onClick={() => challenge(p)}
                      >
                        {busyId === p.id ? "…" : tx.challenge}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function formatElapsed(ms) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// Same palette/type as ChessGame.jsx's CS (approved chess mockup).
const S = {
  page: { minHeight: "100vh", boxSizing: "border-box", paddingBottom: 40, background: "radial-gradient(ellipse at top, #181230 0%, #0d0a18 65%)", fontFamily: "'Work Sans', sans-serif" },
  wrap: { width: "100%", maxWidth: 920, margin: "0 auto", padding: "0 16px", boxSizing: "border-box" },
  header: { display: "flex", alignItems: "center", gap: 14, marginBottom: 20 },
  headerIcon: { width: 52, height: 52, flexShrink: 0, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: "#fff", background: "linear-gradient(135deg, #ec4899, #a855f7)", boxShadow: "0 8px 24px #ec489944" },
  title: { margin: 0, fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 800, color: "#fff" },
  subtitle: { margin: "2px 0 0", fontSize: 14, color: "#9c93b5" },
  errorBanner: { margin: "0 0 14px", padding: "10px 14px", background: "#2c1832", border: "1px solid #ec489955", borderRadius: 10, color: "#f9a8d4", fontSize: 13, fontWeight: 600 },

  resumeCard: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 16, borderRadius: 14, background: "linear-gradient(135deg, #3a1030, #1c1734)", border: "1px solid #ec489966", boxShadow: "0 0 24px #ec489922" },
  resumeAvatar: { width: 44, height: 44, flexShrink: 0, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(140deg, #5b3a8f, #25203f)", border: "2px solid #ec4899" },
  resumeText: { flex: 1, minWidth: 0 },
  resumeTitle: { fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: "#fff" },
  resumeBody: { fontSize: 12.5, color: "#c7bfe0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  columns: { display: "grid", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 6fr)", gap: 16, alignItems: "start" },
  columnsMobile: { display: "flex", flexDirection: "column", gap: 14 },
  card: { padding: "18px 18px 20px", borderRadius: 18, background: "#150f26", border: "1px solid #2c2547", boxShadow: "0 16px 40px rgba(0,0,0,.35)" },
  cardTitle: { margin: 0, fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700, color: "#fff" },
  cardDesc: { margin: "6px 0 16px", fontSize: 13, lineHeight: 1.5, color: "#9c93b5" },

  primaryBtn: { width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 22px #ec489944" },
  primaryBtnSmall: { flexShrink: 0, padding: "9px 16px", borderRadius: 999, border: "none", background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  secondaryBtn: { width: "100%", padding: "11px", borderRadius: 12, border: "1px solid #2c2547", background: "#1c1734", color: "#c7bfe0", fontFamily: "'Sora', sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer" },
  btnDisabled: { opacity: 0.45, cursor: "not-allowed", boxShadow: "none" },

  searchBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  pulseWrap: { position: "relative", width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center", margin: "4px 0 6px" },
  pulseRing: { position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid #ec4899", animation: "tcnChessPulse 1.4s ease-out infinite" },
  pulseCore: { width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#fff", background: "linear-gradient(135deg, #ec4899, #a855f7)" },
  searchText: { fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: "#f0abfc" },
  searchClock: { fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 600, color: "#7d7196", fontVariantNumeric: "tabular-nums" },
  nobodyHint: { margin: "2px 0 4px", fontSize: 12.5, lineHeight: 1.5, color: "#9c93b5", textAlign: "center" },

  onlineHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  onlineCount: { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(76,175,80,.12)", border: "1px solid rgba(76,175,80,.3)", color: "#4ade80", fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 700 },
  onlineDot: { width: 7, height: 7, borderRadius: "50%", background: "#4ade80" },
  emptyText: { margin: "8px 0 0", fontSize: 13, color: "#7d7196" },
  playerList: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 440, overflowY: "auto", margin: "0 -6px", padding: "0 6px" },
  playerRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderRadius: 12, transition: "background .15s" },
  playerIdentity: { flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: 0, background: "none", border: "none", cursor: "pointer", textAlign: "left" },
  playerAvatar: { position: "relative", width: 42, height: 42, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(140deg, #5b3a8f, #25203f)", border: "2px solid #6d5b9c" },
  playerOnlineDot: { position: "absolute", right: -1, bottom: -1, width: 11, height: 11, borderRadius: "50%", background: "#4ade80", border: "2px solid #150f26" },
  avatarImg: { width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" },
  avatarGlyph: { fontSize: 20, color: "#f0abfc" },
  playerTextCol: { display: "flex", flexDirection: "column", minWidth: 0 },
  playerName: { fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  tagLobby: { fontSize: 11.5, lineHeight: 1.35, color: "#c7bfe0" },
  tagSearching: { fontSize: 11.5, lineHeight: 1.35, fontWeight: 600, color: "#f0abfc" },
  challengeBtn: { flexShrink: 0, padding: "8px 16px", borderRadius: 999, border: "1px solid #ec489988", background: "#3a1030", color: "#f9a8d4", fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
};
