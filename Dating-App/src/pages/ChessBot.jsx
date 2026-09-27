// src/pages/ChessBot.jsx — /games/bot ("Quick Match vs Bot" on the Games
// page). Chess against the computer, entirely on this device: no database
// rows, nothing on the leaderboard.
//
// Flow: pick a level (Easy / Medium / Hard) and a side → play. The how-to-
// play guide is always open next to the level picker, and one tap away
// during a game. The bot's search (chessEngine.js) runs in a Web Worker via
// chessBotClient.js so the board never freezes while it thinks.
//
// An unfinished game is kept in localStorage so leaving the page (or an
// accidental refresh) doesn't lose it — the setup screen then offers
// "Continue".
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { Bot, BookOpen, Flag, RotateCcw, Shuffle } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import { useIsMobile } from "../hooks/useIsMobile";
import { ArrowLeftIcon } from "../components/Icons";
import ChessBoard from "../components/ChessBoard";
import { RuleRows, RulesCard, RulesContent } from "../components/ChessRules";
import { PIECE_GLYPH, kingSquare } from "../lib/chessPieces";
import { createBotClient } from "../lib/chessBotClient";

const LEVELS = ["easy", "medium", "hard"];
const LEVEL_COLOR = { easy: "#4ade80", medium: "#fbbf24", hard: "#f472b6" };
const COLORS = ["w", "random", "b"];
// The bot never answers faster than this, so its move doesn't just "appear".
const MIN_THINK_MS = 550;
const SAVE_KEY = "tcnChessBotGame";
const PREFS_KEY = "tcnChessBotPrefs";

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — the game just isn't kept */
  }
}

// Rebuilds the position from the move list; null if any move is illegal.
function replay(history) {
  const c = new Chess();
  for (const m of history) {
    try {
      c.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
    } catch {
      return null;
    }
  }
  return c;
}

function loadPrefs() {
  const p = readJson(PREFS_KEY);
  return {
    level: LEVELS.includes(p?.level) ? p.level : "easy",
    color: COLORS.includes(p?.color) ? p.color : "w",
  };
}

// A saved game only counts if it is well-formed, replays cleanly and isn't over.
function loadSavedGame() {
  const g = readJson(SAVE_KEY);
  if (!g || !LEVELS.includes(g.level) || !["w", "b"].includes(g.myColor) || !Array.isArray(g.history) || g.resigned) return null;
  const c = replay(g.history);
  if (!c || c.isGameOver()) return null;
  return { level: g.level, myColor: g.myColor, history: g.history, resigned: false };
}

function randomMove(history) {
  const c = replay(history);
  const moves = c ? c.moves({ verbose: true }) : [];
  if (moves.length === 0) return null;
  const m = moves[Math.floor(Math.random() * moves.length)];
  return { from: m.from, to: m.to, promotion: m.promotion };
}

function LevelBars({ level, size = 14 }) {
  const n = LEVELS.indexOf(level) + 1;
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: size }} aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ width: 4, height: `${(i / 3) * 100}%`, borderRadius: 2, background: i <= n ? LEVEL_COLOR[level] : "#2c2547" }} />
      ))}
    </span>
  );
}

function HowToPlay({ tx }) {
  return (
    <>
      <ol style={S.steps}>
        {tx.botHowSteps.map((step, i) => (
          <li key={i} style={S.step}>
            <span style={S.stepNum}>{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <h3 style={S.howHeading}>{tx.botPiecesTitle}</h3>
      <RulesContent tx={tx} />
      <h3 style={{ ...S.howHeading, marginTop: 18 }}>{tx.botSpecialTitle}</h3>
      <RuleRows rows={["Castle", "Promotion", "EnPassant"].map((k) => ({ name: tx[`ruleName${k}`], desc: tx[`ruleDesc${k}`] }))} />
      <h3 style={S.howHeading}>{tx.botEndTitle}</h3>
      <RuleRows rows={["Check", "Checkmate", "Draw", "Resign"].map((k) => ({ name: tx[`ruleName${k}`], desc: tx[`ruleDesc${k}`] }))} />
      <p style={S.practiceNote}>{tx.botPracticeNote}</p>
    </>
  );
}

export default function ChessBot() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { tx } = useTranslation(["chess"]);

  const [prefs, setPrefs] = useState(loadPrefs);
  const [saved, setSaved] = useState(loadSavedGame);
  const [game, setGame] = useState(null); // { level, myColor: 'w'|'b', history: [{from,to,promotion}], resigned }
  const [selected, setSelected] = useState(null);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const clientRef = useRef(null);

  const history = game ? game.history : null;
  const chess = useMemo(() => (history ? replay(history) : null), [history]);

  const outcome = useMemo(() => {
    if (!game || !chess) return null;
    if (game.resigned) return { kind: "resigned", winner: game.myColor === "w" ? "b" : "w" };
    if (chess.isCheckmate()) return { kind: "checkmate", winner: chess.turn() === "w" ? "b" : "w" };
    if (chess.isStalemate()) return { kind: "stalemate" };
    if (chess.isInsufficientMaterial()) return { kind: "material" };
    if (chess.isThreefoldRepetition()) return { kind: "repetition" };
    if (chess.isDrawByFiftyMoves()) return { kind: "fifty" };
    return null;
  }, [game, chess]);

  const level = game?.level;
  const myColor = game?.myColor;
  const finished = !!outcome;
  const botToMove = !!chess && !finished && chess.turn() !== myColor;
  const isMyTurn = !!chess && !finished && chess.turn() === myColor;

  useEffect(() => {
    clientRef.current = createBotClient();
    return () => {
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, []);

  // The bot's turn: ask the engine, then play its answer (no sooner than
  // MIN_THINK_MS). A reply that arrives after the position moved on (new
  // game, resign) is dropped.
  useEffect(() => {
    if (!botToMove || !history) return;
    const client = clientRef.current;
    if (!client) return;
    let cancelled = false;
    let timer = null;
    const started = Date.now();
    client
      .pick(history, level)
      .catch((err) => {
        console.warn("[ChessBot] engine error, playing a random move:", err);
        return randomMove(history);
      })
      .then((move) => {
        if (cancelled || !move) return;
        timer = setTimeout(() => {
          setGame((g) => (g && g.history === history ? { ...g, history: [...history, move] } : g));
        }, Math.max(0, MIN_THINK_MS - (Date.now() - started)));
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [botToMove, history, level]);

  // Keep an unfinished game so it can be continued later; forget it once over.
  useEffect(() => {
    if (!game) return;
    writeJson(SAVE_KEY, finished ? null : game);
  }, [game, finished]);

  useEffect(() => {
    writeJson(PREFS_KEY, prefs);
  }, [prefs]);

  const targets = useMemo(() => {
    if (!chess || !selected) return [];
    return chess.moves({ square: selected, verbose: true }).map((m) => m.to);
  }, [chess, selected]);

  const startGame = (lvl = prefs.level) => {
    const side = prefs.color === "random" ? (Math.random() < 0.5 ? "w" : "b") : prefs.color;
    setSelected(null);
    setPendingPromotion(null);
    setShowRules(false);
    setSaved(null);
    setGame({ level: lvl, myColor: side, history: [], resigned: false });
  };

  const resumeGame = () => {
    if (!saved) return;
    setSelected(null);
    setGame(saved);
    setSaved(null);
  };

  const playMove = (from, to, promotion) => {
    setSelected(null);
    setPendingPromotion(null);
    setGame((g) => g && { ...g, history: [...g.history, { from, to, promotion }] });
  };

  const handleSquareClick = (square) => {
    if (!isMyTurn) return;
    if (selected && targets.includes(square)) {
      const moving = chess.get(selected);
      if (moving?.type === "p" && (square[1] === "8" || square[1] === "1")) {
        setPendingPromotion({ from: selected, to: square });
        return;
      }
      playMove(selected, square);
      return;
    }
    const piece = chess.get(square);
    setSelected(piece && piece.color === myColor ? square : null);
  };

  const resign = () => {
    if (finished || !window.confirm(tx.resignConfirm)) return;
    setSelected(null);
    setGame((g) => g && { ...g, resigned: true });
  };

  const leaveToSetup = () => {
    if (!finished && history?.length > 0 && !window.confirm(tx.botNewGameConfirm)) return;
    writeJson(SAVE_KEY, null);
    setSelected(null);
    setShowRules(false);
    setGame(null);
  };

  const fontLink = (
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800;900&family=Work+Sans:wght@400;500;600&display=swap" />
  );
  const focusStyle = (
    <style>{`
      @keyframes tcnBotDot { 0%, 80%, 100% { opacity: .25 } 40% { opacity: 1 } }
      .tcn-bot button:focus { outline: none; }
      .tcn-bot button:focus-visible { outline: 2px solid #ec4899; outline-offset: 2px; }
      .tcn-bot-level { transition: border-color .15s, box-shadow .15s, transform .15s; }
      .tcn-bot-level:hover { transform: translateY(-1px); }
    `}</style>
  );
  const levelName = (l) => tx[`botLevel_${l}`];
  const colorName = (c) => (c === "w" ? tx.white : tx.black);

  // ── Setup: level + side + how to play ──
  if (!game) {
    return (
      <div className="tcn-bot" style={{ ...S.page, paddingTop: isMobile ? 14 : 100 }}>
        {fontLink}
        {focusStyle}
        <div style={S.wrap}>
          <button style={S.backBtn} onClick={() => navigate("/games")}>
            <ArrowLeftIcon size={15} /> {tx.lobbyBack}
          </button>

          <header style={S.header}>
            <div style={S.headerIcon}><Bot size={28} color="#fff" strokeWidth={2} /></div>
            <div style={{ minWidth: 0 }}>
              <h1 style={S.title}>{tx.botTitle}</h1>
              <p style={S.subtitle}>{tx.botSubtitle}</p>
            </div>
          </header>

          {saved && (
            <div style={S.resumeCard}>
              <div style={S.resumeIcon}><Bot size={20} color="#f0abfc" /></div>
              <div style={S.resumeText}>
                <div style={S.resumeTitle}>{tx.botResumeTitle}</div>
                <div style={S.resumeBody}>{tx.botResumeBody(levelName(saved.level))}</div>
              </div>
              <button style={S.primaryBtnSmall} onClick={resumeGame}>{tx.resume}</button>
            </div>
          )}

          <div style={isMobile ? S.setupStack : S.setupGrid}>
            <section style={isMobile ? S.card : { ...S.card, ...S.sticky }}>
              <h2 style={S.cardTitle}>{tx.botChooseLevel}</h2>
              <div style={S.levelList} role="radiogroup" aria-label={tx.botChooseLevel}>
                {LEVELS.map((l) => {
                  const on = prefs.level === l;
                  return (
                    <button
                      key={l}
                      role="radio"
                      aria-checked={on}
                      className="tcn-bot-level"
                      data-level={l}
                      style={on ? { ...S.levelBtn, borderColor: LEVEL_COLOR[l], boxShadow: `0 0 0 1px ${LEVEL_COLOR[l]}, 0 8px 22px ${LEVEL_COLOR[l]}22` } : S.levelBtn}
                      onClick={() => setPrefs((p) => ({ ...p, level: l }))}
                    >
                      <span style={S.levelTop}>
                        <LevelBars level={l} />
                        <span style={{ ...S.levelName, color: on ? LEVEL_COLOR[l] : "#fff" }}>{levelName(l)}</span>
                        <span style={on ? { ...S.radio, borderColor: LEVEL_COLOR[l] } : S.radio}>
                          {on && <span style={{ ...S.radioDot, background: LEVEL_COLOR[l] }} />}
                        </span>
                      </span>
                      <span style={S.levelDesc}>{tx[`botLevelDesc_${l}`]}</span>
                    </button>
                  );
                })}
              </div>

              <h2 style={{ ...S.cardTitle, marginTop: 20 }}>{tx.botChooseColor}</h2>
              <div style={S.segment} role="radiogroup" aria-label={tx.botChooseColor}>
                {COLORS.map((c) => {
                  const on = prefs.color === c;
                  return (
                    <button
                      key={c}
                      role="radio"
                      aria-checked={on}
                      data-color={c}
                      style={on ? { ...S.segBtn, ...S.segBtnOn } : S.segBtn}
                      onClick={() => setPrefs((p) => ({ ...p, color: c }))}
                    >
                      {c === "random" ? <Shuffle size={16} strokeWidth={2.3} /> : <span style={S.segGlyph}>{PIECE_GLYPH[c].k}</span>}
                      {c === "random" ? tx.botColorRandom : colorName(c)}
                    </button>
                  );
                })}
              </div>
              <p style={S.hint}>{tx.botWhiteFirst}</p>

              <button style={S.startBtn} onClick={() => startGame()}>
                <Bot size={19} strokeWidth={2.3} /> {tx.botStart} · {levelName(prefs.level)}
              </button>
              <p style={{ ...S.hint, textAlign: "center", marginTop: 12 }}>{tx.botPracticeNote}</p>
            </section>

            <section style={S.card}>
              <h2 style={S.cardTitle}><BookOpen size={18} color="#f0abfc" strokeWidth={2.3} /> {tx.botHowTitle}</h2>
              <HowToPlay tx={tx} />
            </section>
          </div>
        </div>
      </div>
    );
  }

  // ── Playing / finished ──
  const inCheck = !finished && chess?.inCheck();
  const botColor = myColor === "w" ? "b" : "w";
  const iWon = finished && outcome.winner === myColor;
  const iLost = finished && outcome.winner && outcome.winner !== myColor;
  const lastMove = history.length ? history[history.length - 1] : null;

  let overTitle = "";
  let overSubtitle = "";
  if (finished) {
    const k = outcome.kind;
    if (k === "checkmate") overTitle = iWon ? tx.botWinCheckmate : tx.botLoseCheckmate;
    else if (k === "resigned") overTitle = tx.botLoseResigned;
    else if (k === "stalemate") overTitle = tx.winTitleStalemate;
    else if (k === "repetition") overTitle = tx.botDrawRepetition;
    else if (k === "fifty") overTitle = tx.botDrawFifty;
    else overTitle = tx.botDrawMaterial;
    overSubtitle = iWon ? (level === "hard" ? tx.botWinSubtitleHard : tx.botWinSubtitle) : iLost ? tx.botLoseSubtitle : tx.drawSubtitle;
  }

  const playerRow = (isMe) => {
    const color = isMe ? myColor : botColor;
    const won = finished && outcome.winner === color;
    const lost = finished && outcome.winner && outcome.winner !== color;
    return (
      <div style={won ? { ...S.playerRow, ...S.playerRowWinner } : S.playerRow}>
        <div style={S.playerIdentity}>
          <div style={{ ...(isMe ? S.avatarMe : S.avatarBot), ...(lost ? S.avatarLoser : null) }}>
            {isMe ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
            ) : (
              <Bot size={21} color="#fff" strokeWidth={2.2} />
            )}
          </div>
          <div>
            <div style={S.playerName}>{isMe ? tx.you : tx.botName}</div>
            <div style={S.playerSub}>({colorName(color)})</div>
          </div>
        </div>
        {won ? (
          <div style={S.winTag}>{tx.winTag}</div>
        ) : lost ? (
          <div style={S.loseTag}>{tx.loseTag}</div>
        ) : finished ? (
          <div style={S.loseTag}>{tx.drawTag}</div>
        ) : isMe ? null : (
          <span style={{ ...S.levelPill, color: LEVEL_COLOR[level], borderColor: `${LEVEL_COLOR[level]}66` }}>
            <LevelBars level={level} size={11} /> {levelName(level)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="tcn-bot" style={{ ...S.page, paddingTop: isMobile ? 12 : 100 }}>
      {fontLink}
      {focusStyle}
      <div style={S.gameWrap}>
        <div style={S.topBar}>
          <button style={S.backBtn} onClick={() => navigate("/games")}>
            <ArrowLeftIcon size={15} /> {tx.lobbyBack}
          </button>
          <button style={S.linkBtn} onClick={() => setShowRules(true)}>
            <BookOpen size={15} strokeWidth={2.3} /> {tx.rulesTooltip}
          </button>
        </div>

        <div style={S.panel}>
          {finished ? (
            <div style={S.overHeader}>
              <div style={{ ...S.overIcon, ...(iWon ? S.overIconWin : null) }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iWon ? "#fbbf24" : "#c7bfe0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M7 5H4a2 2 0 0 0 0 4h1.5" /><path d="M17 5h3a2 2 0 0 1 0 4h-1.5" />
                </svg>
              </div>
              <h3 style={{ ...S.overTitle, color: iWon ? "#fbbf24" : "#c7bfe0" }} data-testid="bot-result">{overTitle}</h3>
              <p style={S.overSubtitle}>{overSubtitle}</p>
            </div>
          ) : (
            <div style={S.statusWrap}>
              <div style={isMyTurn ? { ...S.statusPill, ...S.statusPillMine } : S.statusPill} data-testid="bot-status">
                {botToMove ? (
                  <>
                    <Bot size={15} strokeWidth={2.3} />
                    {tx.botThinking}
                    <span style={S.dots} aria-hidden="true">
                      {[0, 1, 2].map((i) => <span key={i} style={{ ...S.dot, animationDelay: `${i * 0.18}s` }} />)}
                    </span>
                  </>
                ) : (
                  <>
                    {tx.yourMove}
                    {inCheck && tx.check}
                  </>
                )}
              </div>
            </div>
          )}

          {playerRow(false)}
          <ChessBoard
            chess={chess}
            orientation={myColor}
            selected={selected}
            targets={targets}
            lastMove={lastMove}
            checkSquare={inCheck ? kingSquare(chess, chess.turn()) : null}
            interactive={isMyTurn}
            look={finished ? "finished" : "live"}
            fitHeight={isMobile ? 0 : finished ? 470 : 420}
            onSquareClick={handleSquareClick}
          />
          <div style={{ height: 12 }} />
          {playerRow(true)}

          <div style={S.controlsRow}>
            {finished ? (
              <>
                <button style={S.primaryBtn} onClick={() => startGame(level)}>
                  <RotateCcw size={16} strokeWidth={2.4} /> {tx.botPlayAgain}
                </button>
                <button style={S.secondaryBtn} onClick={leaveToSetup}>{tx.botChangeLevel}</button>
              </>
            ) : (
              <>
                <button style={S.resignBtn} onClick={resign}>
                  <Flag size={15} strokeWidth={2.3} /> {tx.resign}
                </button>
                <button style={S.ghostBtn} onClick={leaveToSetup}>
                  <RotateCcw size={15} strokeWidth={2.3} /> {tx.botNewGame}
                </button>
              </>
            )}
          </div>

          {pendingPromotion && (
            <div style={S.promoOverlay} onClick={() => setPendingPromotion(null)}>
              <div style={S.promoBox} onClick={(e) => e.stopPropagation()}>
                <div style={S.promoTitle}>{tx.promoteTo}</div>
                <div style={S.promoRow}>
                  {["q", "r", "b", "n"].map((p) => (
                    <button key={p} style={S.promoBtn} onClick={() => playMove(pendingPromotion.from, pendingPromotion.to, p)}>
                      {PIECE_GLYPH[myColor][p]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {showRules && (
            <RulesCard tx={tx} title={tx.botHowTitle} onClose={() => setShowRules(false)}>
              <HowToPlay tx={tx} />
            </RulesCard>
          )}
        </div>
      </div>
    </div>
  );
}

// Chess palette (ChessGame.jsx) with the Games page's navy cards.
const S = {
  page: { minHeight: "100vh", boxSizing: "border-box", paddingBottom: 40, background: "radial-gradient(ellipse at top, #181230 0%, #0d0a18 65%)", fontFamily: "'Work Sans', sans-serif" },
  wrap: { width: "100%", maxWidth: 1100, margin: "0 auto", padding: "0 16px", boxSizing: "border-box" },
  gameWrap: { width: "100%", maxWidth: 600, margin: "0 auto", padding: "0 12px", boxSizing: "border-box" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999, border: "1px solid #2c2547", background: "#1c1734", color: "#c7bfe0", fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
  linkBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999, border: "1px solid #ec489955", background: "#2c1832", color: "#f9a8d4", fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },

  header: { display: "flex", alignItems: "center", gap: 14, margin: "14px 0 16px" },
  headerIcon: { width: 52, height: 52, flexShrink: 0, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #ec4899, #a855f7)", boxShadow: "0 8px 24px #ec489944" },
  title: { margin: 0, fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 800, color: "#fff" },
  subtitle: { margin: "2px 0 0", fontSize: 14, color: "#9c93b5" },

  resumeCard: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 14, borderRadius: 14, background: "linear-gradient(135deg, #3a1030, #1c1734)", border: "1px solid #ec489966", boxShadow: "0 0 24px #ec489922" },
  resumeIcon: { width: 44, height: 44, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(140deg, #5b3a8f, #25203f)", border: "2px solid #ec4899" },
  resumeText: { flex: 1, minWidth: 0 },
  resumeTitle: { fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: "#fff" },
  resumeBody: { fontSize: 12.5, color: "#c7bfe0" },
  primaryBtnSmall: { flexShrink: 0, padding: "9px 16px", borderRadius: 999, border: "none", background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" },

  setupGrid: { display: "grid", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 6fr)", gap: 16, alignItems: "start" },
  setupStack: { display: "flex", flexDirection: "column", gap: 14 },
  card: { padding: "18px 16px", borderRadius: 20, background: "linear-gradient(180deg, #16112b 0%, #0f0c1d 100%)", border: "1px solid #2c2547", boxShadow: "0 16px 40px rgba(0,0,0,.35)", minWidth: 0 },
  // The level picker + Start button stay in view while the guide scrolls.
  sticky: { position: "sticky", top: 96 },
  cardTitle: { margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8, fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: "#fff" },

  levelList: { display: "flex", flexDirection: "column", gap: 10 },
  levelBtn: { display: "flex", flexDirection: "column", alignItems: "stretch", gap: 4, width: "100%", padding: "12px 14px", borderRadius: 14, borderWidth: 1, borderStyle: "solid", borderColor: "#2c2547", background: "#1c1734", textAlign: "left", cursor: "pointer" },
  levelTop: { display: "flex", alignItems: "center", gap: 10 },
  levelName: { flex: 1, fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 800 },
  levelDesc: { fontSize: 12.5, color: "#9c93b5", lineHeight: 1.45 },
  radio: { width: 18, height: 18, flexShrink: 0, borderRadius: "50%", borderWidth: 2, borderStyle: "solid", borderColor: "#3b3260", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" },
  radioDot: { width: 8, height: 8, borderRadius: "50%" },

  segment: { display: "flex", gap: 6, padding: 4, borderRadius: 14, background: "#141026", border: "1px solid #2c2547" },
  segBtn: { flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 6px", borderRadius: 10, border: "none", background: "transparent", color: "#9c93b5", fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  segBtnOn: { background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", boxShadow: "0 4px 14px #ec489955" },
  segGlyph: { fontSize: 18, lineHeight: 1 },
  hint: { margin: "8px 0 0", fontSize: 12, color: "#7d7196" },
  startBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", marginTop: 18, padding: "14px 18px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 15.5, fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 22px #ec489955" },

  steps: { listStyle: "none", margin: "0 0 18px", padding: 0, display: "flex", flexDirection: "column", gap: 10 },
  step: { display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, color: "#c7bfe0", lineHeight: 1.5 },
  stepNum: { width: 24, height: 24, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 800 },
  howHeading: { margin: "0 0 10px", fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: "#f0abfc" },
  practiceNote: { margin: "4px 0 0", padding: "10px 12px", borderRadius: 10, background: "#1c173466", border: "1px dashed #3b3260", fontSize: 12.5, color: "#9c93b5" },

  panel: { position: "relative", width: "100%", boxSizing: "border-box", padding: "20px 24px 24px", background: "radial-gradient(ellipse at top, #181230 0%, #0d0a18 65%)", border: "1px solid #2c2547", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" },
  statusWrap: { display: "flex", justifyContent: "center", marginBottom: 14 },
  statusPill: { display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 999, background: "#1c1734", border: "1px solid #2c2547", fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, color: "#c7bfe0" },
  statusPillMine: { color: "#f0abfc", border: "1px solid #ec489977", boxShadow: "0 0 16px #ec489933" },
  dots: { display: "inline-flex", gap: 3, marginLeft: 1 },
  dot: { width: 4, height: 4, borderRadius: "50%", background: "currentColor", animation: "tcnBotDot 1s infinite ease-in-out" },

  overHeader: { textAlign: "center", marginBottom: 10 },
  overIcon: { width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", background: "#1c1734", border: "2px solid #2c2547" },
  overIconWin: { background: "#3a2f0f", border: "2px solid #fbbf24", boxShadow: "0 0 26px #fbbf2455" },
  overTitle: { fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 800, margin: "0 0 4px" },
  overSubtitle: { fontSize: 14, color: "#9c93b5", margin: 0 },

  playerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 520, margin: "0 auto 12px", boxSizing: "border-box" },
  playerRowWinner: { background: "#3a2f0f66", borderRadius: 10, padding: "4px 8px" },
  playerIdentity: { display: "flex", alignItems: "center", gap: 10 },
  avatarBot: { width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(140deg, #5b3a8f, #25203f)", border: "2px solid #6d5b9c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarMe: { width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(140deg, #ec4899, #a855f7)", border: "2px solid #6d5b9c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarLoser: { border: "2px solid #2c2547", opacity: 0.6, filter: "grayscale(.6)" },
  playerName: { fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600, color: "#fff" },
  playerSub: { fontSize: 11, color: "#7d7196" },
  levelPill: { display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, borderWidth: 1, borderStyle: "solid", background: "#1c1734", fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 700 },
  winTag: { fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 700, color: "#fbbf24" },
  loseTag: { fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 700, color: "#655a82" },

  controlsRow: { display: "flex", justifyContent: "center", gap: 10, marginTop: 18, width: "100%", maxWidth: 520, marginLeft: "auto", marginRight: "auto" },
  resignBtn: { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 600, border: "1px solid #ec489955", background: "#3a1030", color: "#f9a8d4", cursor: "pointer" },
  ghostBtn: { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 600, border: "1px solid #2c2547", background: "#1c1734", color: "#c7bfe0", cursor: "pointer" },
  primaryBtn: { flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "13px", borderRadius: 10, fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, border: "none", background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", cursor: "pointer" },
  secondaryBtn: { flex: 1, padding: "12px", borderRadius: 10, fontFamily: "'Sora', sans-serif", fontSize: 13.5, fontWeight: 700, border: "1px solid #2c2547", background: "#1c1734", color: "#c7bfe0", cursor: "pointer" },

  promoOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  promoBox: { background: "#1c1734", border: "1px solid #2c2547", borderRadius: 16, padding: 20 },
  promoTitle: { color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 10, textAlign: "center" },
  promoRow: { display: "flex", gap: 8 },
  promoBtn: { width: 44, height: 44, fontSize: 26, background: "#191428", border: "1px solid #2c2547", borderRadius: 10, cursor: "pointer", color: "#f0abfc" },
};
