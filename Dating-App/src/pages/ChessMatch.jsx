// src/pages/ChessMatch.jsx — /chess/:gameId
// One lobby game (or its pending challenge) between any two users. The
// board/game logic is ChessGame.jsx in its gameId ("lobby") mode; this page
// only resolves who the opponent is, and wires Rematch / Back to lobby /
// View profile.
import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "../hooks/useTranslation";
import { useIsMobile } from "../hooks/useIsMobile";
import { avatarOf, lobbyErrorText } from "../lib/chessLobby";
import { ArrowLeftIcon } from "../components/Icons";

// Same lazy split RoomChat.jsx uses: chess.js + the board only download
// once someone actually opens a game.
const ChessGame = lazy(() => import("../components/ChessGame"));

export default function ChessMatch() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { tx } = useTranslation(["chess"]);
  const [session, setSession] = useState(null);
  const [opponent, setOpponent] = useState(undefined); // undefined = loading, null = unknown/not found
  const [error, setError] = useState(null); // { code, name }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
  }, []);

  const myId = session?.user?.id;

  // Resolve the opponent from the game row (RLS: only its two players can
  // read it — anyone else gets nothing, and ChessGame shows "not found").
  useEffect(() => {
    if (!myId || !gameId) return;
    let cancelled = false;
    (async () => {
      const { data: game } = await supabase.from("chess_games").select("white_id, black_id").eq("id", gameId).maybeSingle();
      if (cancelled) return;
      if (!game) { setOpponent(null); return; }
      const oppId = game.white_id === myId ? game.black_id : game.white_id;
      const { data: prof } = await supabase.from("profiles").select("id, username, avatar_url, photos").eq("id", oppId).maybeSingle();
      if (!cancelled) setOpponent(prof || { id: oppId, username: null });
    })();
    return () => { cancelled = true; };
  }, [myId, gameId]);

  const rematch = async () => {
    if (!myId || !opponent?.id || busy) return;
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("chess_challenge", { p_user_id: myId, p_opponent_id: opponent.id });
    setBusy(false);
    if (!rpcError && data?.success) { navigate(`/chess/${data.game_id}`); return; }
    if (data?.error === "already_in_game" && data.game_id) { navigate(`/chess/${data.game_id}`); return; }
    setError({ code: data?.error || "generic", name: opponent.username });
  };

  const avatar = avatarOf(opponent);
  const ready = !!myId && opponent !== undefined;

  return (
    <div style={{ ...S.page, paddingTop: isMobile ? 12 : 100 }}>
      <div style={S.wrap}>
        <div style={S.topBar}>
          <button style={S.backBtn} onClick={() => navigate("/games")}>
            <ArrowLeftIcon size={15} /> {tx.lobbyBack}
          </button>
          {opponent?.id && (
            <button style={S.oppChip} onClick={() => navigate(`/profile/${opponent.id}`)} title={tx.viewProfile}>
              <span style={S.oppAvatar}>
                {avatar ? <img src={avatar} alt="" style={S.oppAvatarImg} /> : <span style={S.oppGlyph}>♟</span>}
              </span>
              <span style={S.oppText}>
                <span style={S.oppName}>{opponent.username || tx.opponent}</span>
                <span style={S.oppLink}>{tx.viewProfile}</span>
              </span>
            </button>
          )}
        </div>

        {error && <div style={S.errorBanner}>{lobbyErrorText(tx, error.code, error.name)}</div>}

        {ready && (
          <Suspense fallback={<div style={S.loading}>…</div>}>
            <ChessGame
              key={gameId}
              gameId={gameId}
              session={session}
              otherUserId={opponent?.id || null}
              otherUsername={opponent?.username || null}
              otherAvatarUrl={avatar}
              onClose={() => navigate("/games")}
              onRematch={opponent?.id ? rematch : undefined}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", boxSizing: "border-box", paddingBottom: 32, background: "radial-gradient(ellipse at top, #181230 0%, #0d0a18 65%)", fontFamily: "'Work Sans', sans-serif" },
  wrap: { width: "100%", maxWidth: 600, margin: "0 auto", padding: "0 12px", boxSizing: "border-box" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999, border: "1px solid #2c2547", background: "#1c1734", color: "#c7bfe0", fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
  oppChip: { display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0, padding: "4px 12px 4px 4px", borderRadius: 999, border: "1px solid #2c2547", background: "#1c1734", cursor: "pointer" },
  oppAvatar: { width: 32, height: 32, flexShrink: 0, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(140deg, #5b3a8f, #25203f)" },
  oppAvatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  oppGlyph: { fontSize: 16, color: "#f0abfc" },
  oppText: { display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 },
  oppName: { maxWidth: 160, fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  oppLink: { fontSize: 11, color: "#f0abfc" },
  errorBanner: { margin: "0 0 12px", padding: "10px 14px", background: "#2c1832", border: "1px solid #ec489955", borderRadius: 10, color: "#f9a8d4", fontSize: 13, fontWeight: 600, textAlign: "center" },
  loading: { padding: 40, textAlign: "center", color: "#7d7196" },
};
