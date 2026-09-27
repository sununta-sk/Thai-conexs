// src/pages/GamesLobby.jsx — /games (the navbar's "Games" item; /chess
// redirects here). Chess is the only game for now; the page is named for
// the hub so more games can join it later.
// Left: the leaderboard (ChessLeaderboard — podium for the top 3, places
// 4-20 below). Right: cards for the people connected right now, each with
// a Challenge button (chess_challenge → they get ChessChallengePopup
// anywhere in the app). Quick Match (server-side queue, chess_quick_match)
// sits in the header. Games are played on /chess/:gameId (ChessMatch.jsx).
// RPCs: supabase/manual-sql/2026-09-27-chess-lobby-matchmaking.sql and
// 2026-09-27-chess-leaderboard.sql.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "../hooks/useTranslation";
import { useIsMobile } from "../hooks/useIsMobile";
import { useOnline } from "../context/OnlineContext";
import { avatarOf, lobbyErrorText } from "../lib/chessLobby";
import { ChessKnight, Gamepad2, Swords, Users, Trophy } from "lucide-react";
import ChessLeaderboard from "../components/ChessLeaderboard";

const QUICK_MATCH_POLL_MS = 3000;
const NOBODY_HINT_AFTER_MS = 20 * 1000;

export default function GamesLobby() {
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
  const [mobileTab, setMobileTab] = useState("board"); // 'board' | 'players' (mobile only)
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
      .select("id, username, avatar_url, photos, is_bot, details, city")
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

  const quickMatch = searching ? (
    <div style={S.searchPill}>
      <span style={S.pulseWrap}><span style={S.pulseRing} /><span style={S.pulseDot} /></span>
      <span style={S.searchText}>{tx.searching}</span>
      <span style={S.searchClock}>{formatElapsed(searchElapsed)}</span>
      <button style={S.searchCancel} onClick={() => setSearching(false)}>{tx.cancel}</button>
    </div>
  ) : (
    <button style={inGame ? { ...S.quickBtn, ...S.btnDisabled } : S.quickBtn} disabled={inGame} onClick={startSearch} title={tx.quickMatchDesc}>
      <Swords size={18} strokeWidth={2.3} /> {tx.quickMatchTitle}
    </button>
  );

  const playersPanel = (
    <section style={S.card}>
      <div style={S.cardHead}>
        <h2 style={S.cardTitle}><Users size={18} color="#4ade80" strokeWidth={2.3} /> {tx.onlineTitle}</h2>
        <span style={S.onlineCount}><span style={S.onlineDot} />{players.length}</span>
      </div>
      {players.length === 0 ? (
        <p style={S.emptyText}>{tx.onlineEmpty}</p>
      ) : (
        <div style={S.cardGrid}>
          {players.map((p) => {
            const avatar = avatarOf(p);
            const lobby = lobbyState.get(p.id);
            const age = p.details?.age;
            const city = p.city || p.details?.city;
            const meta = [age, city].filter(Boolean).join(" · ");
            return (
              <div key={p.id} className="tcn-game-card" style={S.pCard}>
                <button style={S.pPhotoBtn} onClick={() => navigate(`/profile/${p.id}`)} title={tx.viewProfile}>
                  {avatar ? <img src={avatar} alt="" style={S.pPhoto} loading="lazy" /> : <span style={S.pPhotoEmpty}>{p.username[0].toUpperCase()}</span>}
                  <span style={S.pShade} />
                  <span style={S.pOnline} />
                  {lobby && <span style={lobby === "searching" ? S.pTagHot : S.pTag}>{lobby === "searching" ? tx.searchingTag : tx.inLobbyTag}</span>}
                  <span style={S.pInfo}>
                    <span style={S.pName}>{p.username}</span>
                    {meta && <span style={S.pMeta}>{meta}</span>}
                  </span>
                </button>
                <button
                  style={inGame || searching || busyId ? { ...S.challengeBtn, ...S.btnDisabled } : S.challengeBtn}
                  disabled={inGame || searching || !!busyId}
                  onClick={() => challenge(p)}
                >
                  <ChessKnight size={15} strokeWidth={2.3} /> {busyId === p.id ? "…" : tx.challenge}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  const board = <ChessLeaderboard tx={tx} isMobile={isMobile} myId={myId} />;

  return (
    <div style={{ ...S.page, paddingTop: isMobile ? 14 : 100 }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800;900&family=Work+Sans:wght@400;500;600&display=swap" />
      <style>{`
        @keyframes tcnGamesPulse { 0% { transform: scale(.6); opacity: .9 } 100% { transform: scale(2.2); opacity: 0 } }
        .tcn-game-card { transition: transform .15s, box-shadow .15s; }
        .tcn-game-card:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(0,0,0,.45); }
        /* index.css rings every focused button; keep that for keyboard
           focus only on this page's tabs/toggles/cards. */
        .tcn-games button:focus { outline: none; }
        .tcn-games button:focus-visible { outline: 2px solid #ec4899; outline-offset: 2px; }
      `}</style>
      <div style={S.wrap} className="tcn-games">
        <header style={{ ...S.header, flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center" }}>
          <div style={S.headerLeft}>
            <div style={S.headerIcon}><Gamepad2 size={28} color="#fff" strokeWidth={2} /></div>
            <div style={{ minWidth: 0 }}>
              <h1 style={S.title}>{tx.gamesTitle}</h1>
              <p style={S.subtitle}>{tx.gamesSubtitle}</p>
            </div>
          </div>
          <div style={isMobile ? S.quickWrapMobile : S.quickWrap}>{quickMatch}</div>
        </header>

        <div style={S.gameChips}>
          <span style={S.gameChipActive}><ChessKnight size={15} strokeWidth={2.3} /> {tx.gameChess}</span>
          <span style={S.gameChipSoon}>{tx.moreGamesSoon}</span>
        </div>

        {searching && searchElapsed >= NOBODY_HINT_AFTER_MS && <div style={S.hintBanner}>{tx.nobodyYet}</div>}
        {error && <div style={S.errorBanner}>{lobbyErrorText(tx, error.code, error.name)}</div>}

        {current && (
          <div style={S.resumeCard}>
            <div style={S.resumeAvatar}>
              {avatarOf(currentOpponent) ? <img src={avatarOf(currentOpponent)} alt="" style={S.avatarImg} /> : <ChessKnight size={20} color="#f0abfc" />}
            </div>
            <div style={S.resumeText}>
              <div style={S.resumeTitle}>{inGame ? tx.resumeTitle : tx.challengeSentTitle}</div>
              <div style={S.resumeBody}>{inGame ? tx.resumeBody(currentName) : tx.waitingAccept(currentName)}</div>
            </div>
            <button style={S.primaryBtnSmall} onClick={() => navigate(`/chess/${current.id}`)}>{tx.resume}</button>
          </div>
        )}

        {isMobile ? (
          <>
            <div style={S.tabs} role="tablist">
              <button role="tab" aria-selected={mobileTab === "board"} style={mobileTab === "board" ? { ...S.tab, ...S.tabActive } : S.tab} onClick={() => setMobileTab("board")}>
                <Trophy size={15} strokeWidth={2.3} /> {tx.tabLeaderboard}
              </button>
              <button role="tab" aria-selected={mobileTab === "players"} style={mobileTab === "players" ? { ...S.tab, ...S.tabActive } : S.tab} onClick={() => setMobileTab("players")}>
                <Users size={15} strokeWidth={2.3} /> {tx.tabPlayers} <span style={S.tabCount}>{players.length}</span>
              </button>
            </div>
            {mobileTab === "board" ? board : playersPanel}
          </>
        ) : (
          <div style={S.columns}>
            {board}
            <div style={S.stickyCol}>{playersPanel}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatElapsed(ms) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// Chess palette (ChessGame.jsx CS) with the leaderboard's navy for cards.
const S = {
  page: { minHeight: "100vh", boxSizing: "border-box", paddingBottom: 40, background: "radial-gradient(ellipse at top, #151a3a 0%, #0b0d1c 60%)", fontFamily: "'Work Sans', sans-serif" },
  wrap: { width: "100%", maxWidth: 1240, margin: "0 auto", padding: "0 16px", boxSizing: "border-box" },
  header: { display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 14 },
  headerLeft: { display: "flex", alignItems: "center", gap: 14, minWidth: 0 },
  headerIcon: { width: 52, height: 52, flexShrink: 0, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #ec4899, #a855f7)", boxShadow: "0 8px 24px #ec489944" },
  title: { margin: 0, fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 800, color: "#fff" },
  subtitle: { margin: "2px 0 0", fontSize: 14, color: "#9aa6cf" },
  quickWrap: { flexShrink: 0 },
  quickWrapMobile: { display: "flex" },
  quickBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px 22px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 22px #ec489955", whiteSpace: "nowrap" },
  searchPill: { display: "flex", alignItems: "center", gap: 10, width: "100%", boxSizing: "border-box", padding: "9px 10px 9px 14px", borderRadius: 14, background: "#1c1734", border: "1px solid #ec489977" },
  pulseWrap: { position: "relative", width: 12, height: 12, flexShrink: 0 },
  pulseRing: { position: "absolute", inset: 0, borderRadius: "50%", background: "#ec4899", animation: "tcnGamesPulse 1.3s ease-out infinite" },
  pulseDot: { position: "absolute", inset: 2, borderRadius: "50%", background: "#ec4899" },
  searchText: { fontFamily: "'Sora', sans-serif", fontSize: 13.5, fontWeight: 700, color: "#f0abfc", whiteSpace: "nowrap" },
  searchClock: { fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 600, color: "#9aa6cf", fontVariantNumeric: "tabular-nums", flex: 1 },
  searchCancel: { padding: "7px 14px", borderRadius: 10, border: "1px solid #2c2547", background: "#0f0c1d", color: "#c7bfe0", fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
  btnDisabled: { opacity: 0.45, cursor: "not-allowed", boxShadow: "none" },

  gameChips: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 },
  gameChipActive: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "#ec489922", border: "1px solid #ec489988", color: "#f9a8d4", fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 700 },
  gameChipSoon: { display: "inline-flex", alignItems: "center", padding: "6px 12px", borderRadius: 999, border: "1px dashed #2a3a72", color: "#6f7fae", fontSize: 12.5 },

  hintBanner: { margin: "0 0 12px", padding: "10px 14px", background: "#161f40", border: "1px solid #24305c", borderRadius: 10, color: "#c7d2fe", fontSize: 13 },
  errorBanner: { margin: "0 0 12px", padding: "10px 14px", background: "#2c1832", border: "1px solid #ec489955", borderRadius: 10, color: "#f9a8d4", fontSize: 13, fontWeight: 600 },

  resumeCard: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 14, borderRadius: 14, background: "linear-gradient(135deg, #3a1030, #1c1734)", border: "1px solid #ec489966", boxShadow: "0 0 24px #ec489922" },
  resumeAvatar: { width: 44, height: 44, flexShrink: 0, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(140deg, #5b3a8f, #25203f)", border: "2px solid #ec4899" },
  resumeText: { flex: 1, minWidth: 0 },
  resumeTitle: { fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: "#fff" },
  resumeBody: { fontSize: 12.5, color: "#c7bfe0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  primaryBtnSmall: { flexShrink: 0, padding: "9px 16px", borderRadius: 999, border: "none", background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },

  columns: { display: "grid", gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)", gap: 16, alignItems: "start" },
  // Online players stay in view while the leaderboard scrolls past.
  stickyCol: { position: "sticky", top: 96, minWidth: 0 },
  tabs: { display: "flex", gap: 6, padding: 4, marginBottom: 12, borderRadius: 14, background: "#141d3b", border: "1px solid #24305c" },
  tab: { flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 8px", borderRadius: 10, border: "none", background: "transparent", color: "#8fa0cf", fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  tabActive: { background: "linear-gradient(135deg, #ff4d8d, #ec4899)", color: "#fff", boxShadow: "0 4px 14px #ec489955" },
  tabCount: { padding: "1px 7px", borderRadius: 999, background: "rgba(255,255,255,.18)", fontSize: 11.5 },

  card: { padding: "18px 16px 18px", borderRadius: 20, background: "linear-gradient(180deg, #0f1730 0%, #0b1024 100%)", border: "1px solid #1e2a52", boxShadow: "0 16px 40px rgba(0,0,0,.35)", minWidth: 0 },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  cardTitle: { margin: 0, display: "flex", alignItems: "center", gap: 8, fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700, color: "#fff" },
  onlineCount: { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(76,175,80,.12)", border: "1px solid rgba(76,175,80,.3)", color: "#4ade80", fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 700 },
  onlineDot: { width: 7, height: 7, borderRadius: "50%", background: "#4ade80" },
  emptyText: { margin: "8px 0 0", fontSize: 13, color: "#8fa0cf" },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 },
  pCard: { display: "flex", flexDirection: "column", borderRadius: 16, overflow: "hidden", background: "#131b38", border: "1px solid #24305c", minWidth: 0 },
  pPhotoBtn: { position: "relative", display: "block", width: "100%", aspectRatio: "4 / 5", padding: 0, border: "none", background: "linear-gradient(140deg, #2a3a72, #141d3b)", cursor: "pointer", overflow: "hidden" },
  pPhoto: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  pPhotoEmpty: { display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontFamily: "'Sora', sans-serif", fontSize: 40, fontWeight: 800, color: "#8fa0cf" },
  pShade: { position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(5,8,20,.88) 100%)" },
  pOnline: { position: "absolute", top: 9, left: 9, width: 11, height: 11, borderRadius: "50%", background: "#4ade80", border: "2px solid #0b1024", boxShadow: "0 0 8px #4ade80aa" },
  pTag: { position: "absolute", top: 7, right: 7, maxWidth: "70%", padding: "3px 8px", borderRadius: 999, background: "rgba(15,23,48,.8)", border: "1px solid #2a3a72", color: "#c7d2fe", fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  pTagHot: { position: "absolute", top: 7, right: 7, maxWidth: "70%", padding: "3px 8px", borderRadius: 999, background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxShadow: "0 2px 10px #ec489966" },
  pInfo: { position: "absolute", left: 10, right: 10, bottom: 9, display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left", minWidth: 0 },
  pName: { maxWidth: "100%", fontFamily: "'Sora', sans-serif", fontSize: 14.5, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 1px 4px rgba(0,0,0,.6)" },
  pMeta: { maxWidth: "100%", fontSize: 11.5, color: "#dbe4ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  challengeBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, margin: 8, padding: "9px 10px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" },
};
