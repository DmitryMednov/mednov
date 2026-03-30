/**
 * BRICK GAME v2.0 — Tetris | Snake | Arkanoid
 * Portrait-only mobile (iOS / Android)
 * © Sergey Mednov (smednov@gmail.com)
 */
import { useState, useEffect, useCallback, useRef } from "react";

// ═══ CONFIG ═══
const COLS = 10, ROWS = 22, CELL = 13, CGAP = 1;
const BOARD_H = ROWS * (CELL + CGAP) + CGAP; // 308px
const SCORES_T = [0, 100, 300, 500, 800];
const PIECES = [[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[1,1,0],[0,1,1]],[[0,1,1],[1,1,0]]];

// Snake: 21 cols fits ~295px inside LCD
const SN_CELL = 13, SN_GAP = 1, SN_COLS = 21;
const SN_BORDER = 14, SN_STAT_H = 56;
const SN_FIELD_H = BOARD_H - SN_STAT_H - SN_BORDER * 2;
const SN_ROWS2 = Math.floor((SN_FIELD_H - SN_GAP) / (SN_CELL + SN_GAP));
const SN_BW = SN_COLS * (SN_CELL + SN_GAP) + SN_GAP;
const SN_BH = SN_ROWS2 * (SN_CELL + SN_GAP) + SN_GAP;

// Themes — pressed = moderately darker, all labels white
const THEMES = {
  gray: {
    body: "linear-gradient(160deg,#4a4a4a 0%,#2e2e2e 30%,#363636 70%,#404040 100%)",
    border: "#555",
    btnBg: ["#5e5e5e","#404040"], btnBgP: ["#444","#333"], btnCol: "#ddd",
    pillBg: ["#5e5e5e","#404040"], pillBgP: ["#444","#333"],
    pillAlt: ["#484848","#353535"], pillAltP: ["#363636","#282828"],
    sub: "#aaa", brand: "#606060",
    gameSel: ["#5e5e5e","#444"], gameSelP: ["#3a3a3a","#2a2a2a"],
  },
  pink: {
    body: "linear-gradient(160deg,#d4829a 0%,#b05a75 30%,#c06a85 70%,#d07a95 100%)",
    border: "#c07088",
    btnBg: ["#d08898","#aa5a70"], btnBgP: ["#b06878","#904a60"], btnCol: "#fff",
    pillBg: ["#d08898","#aa5a70"], pillBgP: ["#b06878","#904a60"],
    pillAlt: ["#b06878","#904a60"], pillAltP: ["#984060","#783848"],
    sub: "#f0d0dd", brand: "#b07888",
    gameSel: ["#d08898","#b06878"], gameSelP: ["#a05868","#884858"],
  },
  yellow: {
    body: "linear-gradient(160deg,#d4c45a 0%,#b0a030 30%,#c4b440 70%,#d0c050 100%)",
    border: "#c0b040",
    btnBg: ["#d0c458","#a89830"], btnBgP: ["#b8ac40","#907828"], btnCol: "#fff",
    pillBg: ["#d0c458","#a89830"], pillBgP: ["#b8ac40","#907828"],
    pillAlt: ["#b0a038","#908020"], pillAltP: ["#988828","#787018"],
    sub: "#f0e8a0", brand: "#908020",
    gameSel: ["#d0c458","#b0a038"], gameSelP: ["#a89030","#887020"],
  },
};
const COLOR_BTNS = {
  gray:   { bg: ["#888","#666"], bgP: ["#555","#444"] },
  pink:   { bg: ["#e888a8","#cc6888"], bgP: ["#b86080","#a04868"] },
  yellow: { bg: ["#e8d860","#c8b840"], bgP: ["#c8b840","#a89828"] },
};

// ═══ SOUND ═══
const actxRef = { current: null };
const getCtx = () => { if (!actxRef.current) actxRef.current = new (window.AudioContext || window.webkitAudioContext)(); return actxRef.current; };
const beep = (f, d, v = 0.1) => { try { const c = getCtx(), o = c.createOscillator(), g = c.createGain(); o.type = "square"; o.frequency.value = f; g.gain.value = v; g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(c.currentTime); o.stop(c.currentTime + d); } catch (e) {} };
const SFX = {
  move: () => beep(220, .04, .06), rotate: () => beep(440, .05, .08),
  drop: () => beep(120, .12, .12), lock: () => beep(90, .15, .1),
  clear: () => { beep(520, .07, .1); setTimeout(() => beep(740, .09, .1), 70); },
  over: () => { beep(180, .2, .08); setTimeout(() => beep(90, .35, .08), 180); },
  eat: () => beep(600, .06, .1), bounce: () => beep(350, .04, .08),
  brick: () => beep(500, .05, .1),
  win: () => { beep(600, .08, .1); setTimeout(() => beep(800, .1, .1), 100); },
};

// ═══ HAPTIC ═══
const tap = () => { try { if (navigator.vibrate) navigator.vibrate(35); } catch (e) {} };

// ═══ HELPERS ═══
const createBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));
const createSB = () => Array.from({ length: SN_ROWS2 }, () => Array(SN_COLS).fill(0));
const rotateMat = m => { const R = m.length, C = m[0].length, res = []; for (let c = 0; c < C; c++) { const row = []; for (let r = R - 1; r >= 0; r--) row.push(m[r][c]); res.push(row); } return res; };
const validT = (b, s, row, col) => { for (let r = 0; r < s.length; r++) for (let c = 0; c < s[0].length; c++) if (s[r][c]) { const nr = row + r, nc = col + c; if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc]) return false; } return true; };
const placeT = (b, s, row, col) => { const bb = b.map(r => [...r]); for (let r = 0; r < s.length; r++) for (let c = 0; c < s[0].length; c++) if (s[r][c]) bb[row + r][col + c] = 1; return bb; };
const clearLinesT = b => { let cl = 0; const nb = b.filter(row => { if (row.every(c => c)) { cl++; return false; } return true; }); while (nb.length < ROWS) nb.unshift(Array(COLS).fill(0)); return { board: nb, cleared: cl }; };

// ═══ DEVICE ═══
const isPortrait = () => typeof window !== "undefined" ? window.innerHeight > window.innerWidth : true;
const isMobilePhone = () => { if (typeof window === "undefined") return false; return Math.min(window.innerWidth, window.innerHeight) <= 480 || /iPhone|Android.*Mobile|webOS|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent || ""); };

// ═══ EVENTS ═══
const emitBtn = id => { tap(); window.dispatchEvent(new CustomEvent("gameBtn", { detail: id })); };
const SG = 24;

// Preserve state across orientation changes
const gs = { game: "tetris", theme: "gray", soundOn: false, powerOn: false };

// ═══ ENTRY ═══
export default function BrickGame() {
  const [mobile, setMobile] = useState(true);
  const [portrait, setPortrait] = useState(true);
  useEffect(() => {
    const ck = () => { setMobile(isMobilePhone()); setPortrait(isPortrait()); };
    ck(); window.addEventListener("resize", ck);
    const oc = () => setTimeout(ck, 150);
    window.addEventListener("orientationchange", oc);
    return () => { window.removeEventListener("resize", ck); window.removeEventListener("orientationchange", oc); };
  }, []);

  if (!mobile) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#111", fontFamily: "'Courier New',monospace", color: "#888", padding: 40, textAlign: "center" }}>
      <div><div style={{ fontSize: 48, marginBottom: 20 }}>📱</div>
      <div style={{ fontSize: 20, fontWeight: "bold", color: "#ccc", marginBottom: 12 }}>BRICK GAME v2.0</div>
      <div style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 360 }}>Эта игра доступна только на мобильном телефоне.</div></div>
    </div>
  );

  if (!portrait) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#111", fontFamily: "'Courier New',monospace", color: "#888", padding: 40, textAlign: "center" }}>
      <div><div style={{ fontSize: 48, marginBottom: 20 }}>🔄</div>
      <div style={{ fontSize: 18, fontWeight: "bold", color: "#ccc", marginBottom: 12 }}>Поверните телефон</div>
      <div style={{ fontSize: 14, lineHeight: 1.6 }}>Игра работает только в вертикальном режиме.</div></div>
    </div>
  );

  return (<GameController />);
}

// ═══ CONTROLLER ═══
function GameController() {
  const [game, setGame] = useState(gs.game);
  const [theme, setTheme] = useState(gs.theme);
  const [soundOn, setSoundOn] = useState(gs.soundOn);
  const [powerOn, setPowerOn] = useState(gs.powerOn);
  const [gk, setGk] = useState(0);

  useEffect(() => { gs.game = game; }, [game]);
  useEffect(() => { gs.theme = theme; }, [theme]);
  useEffect(() => { gs.soundOn = soundOn; }, [soundOn]);
  useEffect(() => { gs.powerOn = powerOn; }, [powerOn]);

  const sfx = useCallback(n => { if (soundOn) SFX[n]?.(); }, [soundOn]);
  const sw = g => { tap(); setGame(g); setGk(k => k + 1); };
  const T = THEMES[theme];
  const lcd = { on: "#1a2a0a", off: "#9aab7a", ghost: "#7a8b62", bg: "#8b9c6b" };

  const BS = 68, GV = 4, GH = 20, cH = GV * 2;
  const tW = BS + GH + BS + GH + BS, tH = BS + GV + cH + GV + BS;
  const uX = BS + GH, dY = BS + GV + cH + GV, lY = (tH - BS) / 2, rX = BS + GH + BS + GH;
  const scH = BOARD_H + 20 + 14;

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: "100vh", background: "#111", paddingTop: 4, paddingBottom: 16, fontFamily: "'Courier New',monospace", userSelect: "none", touchAction: "manipulation", WebkitTouchCallout: "none", WebkitUserSelect: "none" }}>
      <div style={{ width: "95vw", maxWidth: 370, background: T.body, borderRadius: 24, padding: "10px 16px 16px", boxShadow: "0 14px 50px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,255,255,0.08)", border: `3px solid ${T.border}`, transition: "all 0.3s" }}>

        {/* LCD Screen */}
        <div style={{ background: !powerOn ? "#6b7b5b" : lcd.bg, borderRadius: 8, padding: "10px 10px 24px 10px", border: "4px solid #555", boxShadow: "inset 0 3px 14px rgba(0,0,0,0.5),0 1px 0 rgba(255,255,255,0.05)", marginBottom: SG, transition: "background 0.3s", height: scH, overflow: "hidden" }}>
          {!powerOn ? (
            <div style={{ height: BOARD_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#5a6a4a", fontSize: 16, fontWeight: "bold", letterSpacing: 4 }}>OFF</span>
            </div>
          ) : (
            game === "tetris" ? <TetrisGame key={`t${gk}`} sfx={sfx} lcd={lcd} /> :
            game === "snake" ? <SnakeGame key={`s${gk}`} sfx={sfx} lcd={lcd} /> :
            <ArkanoidGame key={`a${gk}`} sfx={sfx} lcd={lcd} />
          )}
        </div>

        {/* D-Pad */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: SG }}>
          <div style={{ position: "relative", width: tW, height: tH }}>
            <DBtn x={uX} y={0} w={BS} h={BS} id="up" t={T}><BtnLbl i="▲" t2="ROTATE" c={T.btnCol} /></DBtn>
            <DBtn x={0} y={lY} w={BS} h={BS} id="left" t={T}><BtnLbl i="◀" t2="LEFT" c={T.btnCol} /></DBtn>
            <DBtn x={rX} y={lY} w={BS} h={BS} id="right" t={T}><BtnLbl i="▶" t2="RIGHT" c={T.btnCol} /></DBtn>
            <DBtn x={uX} y={dY} w={BS} h={BS} id="down" t={T}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: T.btnCol }}>
                <span style={{ fontSize: 26, fontWeight: "bold", lineHeight: 1 }}>▼</span>
                <span style={{ fontSize: 8, fontWeight: "bold", letterSpacing: 1, opacity: .7 }}>DOWN</span>
                <span style={{ fontSize: 7, opacity: .4 }}>▼▼▼=DROP</span>
              </div>
            </DBtn>
            <div style={{ position: "absolute", left: BS + GH, top: BS + GV, width: BS, height: cH, background: "rgba(0,0,0,0.08)", borderRadius: 3 }} />
          </div>
        </div>

        {/* Pill buttons */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: SG }}>
          <PillBtn id="startpause" label="START / PAUSE" w={160} h={44} t={T} mom />
          <PillBtn onClick={() => { tap(); setPowerOn(p => !p); }} label="ON / OFF" w={95} h={40} t={T} alt tog={powerOn} />
          <PillBtn onClick={() => { tap(); setSoundOn(s => !s); }} label={soundOn ? "♪ ON" : "♪ OFF"} w={60} h={36} t={T} alt tog={soundOn} />
        </div>

        {/* Bottom selectors */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ k: "tetris", l: "TET" }, { k: "snake", l: "SNK" }, { k: "arkanoid", l: "ARK" }].map(g => (
              <RndBtn key={g.k} act={game === g.k} onClick={() => sw(g.k)} bg={T.gameSel} bgP={T.gameSelP}>
                <span style={{ fontSize: 7, fontWeight: "bold", color: "#fff", letterSpacing: .5 }}>{g.l}</span>
              </RndBtn>
            ))}
          </div>
          <span style={{ color: T.brand, fontSize: 8, letterSpacing: 2, opacity: .4 }}>v2.0</span>
          <div style={{ display: "flex", gap: 8 }}>
            {["gray", "pink", "yellow"].map(k => (
              <RndBtn key={k} act={theme === k} onClick={() => { tap(); setTheme(k); }} bg={COLOR_BTNS[k].bg} bgP={COLOR_BTNS[k].bgP} />
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

// ═══ TETRIS SCREEN ═══
function TetrisScreen({ board, ng, score, level, lines, over, paused, lcd }) {
  const hasN = ng && ng.some(r => r.some(c => c));
  const showN = hasN && !over && !paused;
  return (
    <div style={{ display: "flex", gap: 14, height: BOARD_H }}>
      <svg width={COLS * (CELL + CGAP) + CGAP} height={BOARD_H} style={{ display: "block", flexShrink: 0 }}>
        <rect width="100%" height="100%" fill={lcd.bg} rx={2} />
        {board.map((row, r) => row.map((cell, c) => (
          <rect key={`${r}-${c}`} x={CGAP + c * (CELL + CGAP)} y={CGAP + r * (CELL + CGAP)}
            width={CELL} height={CELL}
            fill={cell === 1 ? lcd.on : cell === 2 ? lcd.ghost : lcd.off}
            rx={1} opacity={cell === 2 ? .4 : 1} />
        )))}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 105, height: BOARD_H, overflow: "hidden" }}>
        <LcdStat l="SCORE" v={String(score).padStart(6, "0")} c={lcd.on} />
        <LcdStat l="LEVEL" v={String(level).padStart(2, "0")} c={lcd.on} />
        <LcdStat l="LINES" v={String(lines).padStart(3, "0")} c={lcd.on} />
        <div style={{ flex: 1 }}>
          {showN ? (
            <div>
              <div style={{ fontSize: 14, color: lcd.on, fontWeight: "900", letterSpacing: 2 }}>NEXT</div>
              <div style={{ marginTop: 4, background: lcd.off, borderRadius: 4, padding: 5, display: "inline-block", border: `2px solid ${lcd.ghost}` }}>
                <svg width={64} height={64} style={{ display: "block" }}>
                  {ng.map((row, r) => row.map((cell, c) => (
                    <rect key={`n${r}-${c}`} x={c * 16} y={r * 16} width={15} height={15}
                      fill={cell ? lcd.on : lcd.off} rx={2} />
                  )))}
                </svg>
              </div>
            </div>
          ) : over ? (
            <div>
              <div style={{ fontSize: 28, color: lcd.on, fontWeight: "900", letterSpacing: 2, lineHeight: 1.15 }}>GAME</div>
              <div style={{ fontSize: 28, color: lcd.on, fontWeight: "900", letterSpacing: 2, lineHeight: 1.15, marginTop: 2 }}>OVER</div>
            </div>
          ) : paused ? (
            <div style={{ fontSize: 28, color: lcd.on, fontWeight: "900", letterSpacing: 2, animation: "blink 1s infinite" }}>PAUSE</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ═══ SNAKE SCREEN ═══
function SnakeScreen({ board, score, level, food, over, paused, lcd }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: BOARD_H, overflow: "hidden" }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={SN_BW} height={SN_BH} style={{ display: "block" }}>
          <rect width="100%" height="100%" fill={lcd.bg} rx={2} />
          {board.map((row, r) => row.map((cell, c) => (
            <rect key={`${r}-${c}`} x={SN_GAP + c * (SN_CELL + SN_GAP)} y={SN_GAP + r * (SN_CELL + SN_GAP)}
              width={SN_CELL} height={SN_CELL} fill={cell ? lcd.on : lcd.off} rx={1} />
          )))}
        </svg>
        {(over || paused) && (
          <div style={{ position: "absolute", top: 0, left: 0, width: SN_BW, height: SN_BH, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            {over ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, color: lcd.on, fontWeight: "900", letterSpacing: 3, lineHeight: 1.15 }}>GAME</div>
                <div style={{ fontSize: 32, color: lcd.on, fontWeight: "900", letterSpacing: 3, lineHeight: 1.15, marginTop: 2 }}>OVER</div>
              </div>
            ) : (
              <div style={{ fontSize: 32, color: lcd.on, fontWeight: "900", letterSpacing: 3, animation: "blink 1s infinite" }}>PAUSE</div>
            )}
          </div>
        )}
      </div>
      <div style={{ height: SN_BORDER, flexShrink: 0 }} />
      <div style={{ display: "flex", justifyContent: "space-between", flexShrink: 0, width: SN_BW }}>
        <LcdStat l="SCORE" v={String(score).padStart(6, "0")} c={lcd.on} />
        <LcdStat l="LEVEL" v={String(level).padStart(2, "0")} c={lcd.on} align="center" />
        <LcdStat l="FOOD" v={String(food).padStart(3, "0")} c={lcd.on} align="right" />
      </div>
      <div style={{ height: SN_BORDER, flexShrink: 0 }} />
    </div>
  );
}

function LcdStat({ l, v, c, align }) {
  return (
    <div style={{ textAlign: align || "left" }}>
      <div style={{ fontSize: 14, color: c, fontWeight: "900", letterSpacing: 2 }}>{l}</div>
      <div style={{ fontSize: 32, color: c, fontWeight: "900", fontFamily: "'Courier New',monospace", letterSpacing: 2 }}>{v}</div>
    </div>
  );
}

// ═══ TETRIS GAME ═══
function TetrisGame({ sfx, lcd }) {
  const [board, setBoard] = useState(createBoard);
  const [piece, setPiece] = useState(null);
  const [pos, setPos] = useState({ r: 0, c: 0 });
  const [nxJ, setNxJ] = useState("");
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  const tR = useRef(null), bR = useRef(board), pR = useRef(piece), psR = useRef(pos);
  const oR = useRef(over), paR = useRef(paused), nR = useRef(nxJ), dtR = useRef([]);
  bR.current = board; pR.current = piece; psR.current = pos;
  oR.current = over; paR.current = paused; nR.current = nxJ;

  const mk = useCallback(() => JSON.parse(JSON.stringify(PIECES[Math.floor(Math.random() * PIECES.length)])), []);

  const spawn = useCallback(nxt => {
    const s = nxt || mk(); const c = Math.floor((COLS - s[0].length) / 2);
    if (!validT(bR.current, s, 0, c)) { setOver(true); sfx("over"); return; }
    setPiece(s); setPos({ r: 0, c }); setNxJ(JSON.stringify(mk()));
  }, [mk, sfx]);

  const lock = useCallback(() => {
    const p = pR.current, ps = psR.current; if (!p) return;
    sfx("lock");
    const nb = placeT(bR.current, p, ps.r, ps.c);
    const { board: cb, cleared } = clearLinesT(nb);
    if (cleared > 0) sfx("clear");
    setBoard(cb); setScore(s => s + SCORES_T[cleared]);
    setLines(l => { const nl = l + cleared; setLevel(Math.floor(nl / 10) + 1); return nl; });
    let nxt = null; try { nxt = JSON.parse(nR.current); } catch (e) {} spawn(nxt);
  }, [spawn, sfx]);

  const drop = useCallback(() => {
    if (oR.current || paR.current || !pR.current) return;
    if (validT(bR.current, pR.current, psR.current.r + 1, psR.current.c)) setPos(p => ({ ...p, r: p.r + 1 }));
    else lock();
  }, [lock]);

  const hardDrop = useCallback(() => {
    if (oR.current || paR.current || !pR.current) return;
    let r = psR.current.r; while (validT(bR.current, pR.current, r + 1, psR.current.c)) r++;
    sfx("drop"); setPos({ r, c: psR.current.c }); setTimeout(lock, 10);
  }, [lock, sfx]);

  const handleDown = useCallback(() => {
    if (oR.current || paR.current || !pR.current) return;
    const now = Date.now(), taps = dtR.current.filter(t => now - t < 500);
    taps.push(now); dtR.current = taps;
    if (taps.length >= 3) { dtR.current = []; hardDrop(); } else { sfx("move"); drop(); }
  }, [drop, hardDrop, sfx]);

  const moveL = useCallback(() => { if (oR.current || paR.current || !pR.current) return; if (validT(bR.current, pR.current, psR.current.r, psR.current.c - 1)) { sfx("move"); setPos(p => ({ ...p, c: p.c - 1 })); } }, [sfx]);
  const moveR2 = useCallback(() => { if (oR.current || paR.current || !pR.current) return; if (validT(bR.current, pR.current, psR.current.r, psR.current.c + 1)) { sfx("move"); setPos(p => ({ ...p, c: p.c + 1 })); } }, [sfx]);
  const rot = useCallback(() => { if (oR.current || paR.current || !pR.current) return; const s = rotateMat(pR.current), ps = psR.current; for (const dc of [0, -1, 1, -2, 2]) if (validT(bR.current, s, ps.r, ps.c + dc)) { setPiece(s); if (dc !== 0) setPos(p => ({ ...p, c: p.c + dc })); sfx("rotate"); return; } }, [sfx]);

  const startG = useCallback(() => { setBoard(createBoard()); setScore(0); setLines(0); setLevel(1); setOver(false); setPaused(false); setStarted(true); dtR.current = []; const s = mk(), c = Math.floor((COLS - s[0].length) / 2); setPiece(s); setPos({ r: 0, c }); setNxJ(JSON.stringify(mk())); }, [mk]);
  const togPause = useCallback(() => { if (!started || over) return; setPaused(p => !p); }, [started, over]);

  useEffect(() => { if (!started || over || paused) { if (tR.current) clearInterval(tR.current); return; } const s = Math.max(100, 800 - (level - 1) * 70); tR.current = setInterval(drop, s); return () => clearInterval(tR.current); }, [started, over, paused, level, drop]);
  useEffect(() => { const h = { up: rot, down: handleDown, left: moveL, right: moveR2, startpause: () => { if (!started || over) startG(); else togPause(); } }; const fn = e => { h[e.detail]?.(); }; window.addEventListener("gameBtn", fn); return () => window.removeEventListener("gameBtn", fn); }, [rot, handleDown, moveL, moveR2, started, over, startG, togPause]);

  const rb = () => { const d = board.map(r => [...r]); if (piece) { let gr = pos.r; while (validT(board, piece, gr + 1, pos.c)) gr++; for (let r = 0; r < piece.length; r++) for (let c = 0; c < piece[0].length; c++) if (piece[r][c] && gr + r >= 0 && gr + r < ROWS && !d[gr + r][pos.c + c]) d[gr + r][pos.c + c] = 2; for (let r = 0; r < piece.length; r++) for (let c = 0; c < piece[0].length; c++) if (piece[r][c] && pos.r + r >= 0 && pos.r + r < ROWS) d[pos.r + r][pos.c + c] = 1; } return d; };
  const rn = () => { const g = Array.from({ length: 4 }, () => Array(4).fill(0)); if (!nxJ) return g; let sh; try { sh = JSON.parse(nxJ); } catch (e) { return g; } if (!sh || !sh.length) return g; const rr = sh.length, cc = sh[0].length, o1 = Math.floor((4 - rr) / 2), o2 = Math.floor((4 - cc) / 2); for (let r = 0; r < rr; r++) for (let c = 0; c < cc; c++) if (sh[r][c]) g[o1 + r][o2 + c] = 1; return g; };

  return (<TetrisScreen board={rb()} ng={rn()} score={score} level={level} lines={lines} over={over} paused={paused} lcd={lcd} />);
}

// ═══ SNAKE GAME ═══
function SnakeGame({ sfx, lcd }) {
  const [board, setBoard] = useState(createSB);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [food, setFood] = useState(0);
  const [level, setLevel] = useState(1);

  const snR = useRef([]), dR = useRef({ r: 0, c: 1 }), fR = useRef({ r: 3, c: 10 });
  const oR2 = useRef(false), pR2 = useRef(false), sR = useRef(false);
  const tR = useRef(null), scR = useRef(0), fdR = useRef(0), lvR = useRef(1);

  const initPos = () => [{ r: Math.floor(SN_ROWS2 / 2), c: Math.floor(SN_COLS / 2) }, { r: Math.floor(SN_ROWS2 / 2), c: Math.floor(SN_COLS / 2) - 1 }, { r: Math.floor(SN_ROWS2 / 2), c: Math.floor(SN_COLS / 2) - 2 }];

  const pf = useCallback(() => { const sn = snR.current; let r, c, t = 0; do { r = Math.floor(Math.random() * SN_ROWS2); c = Math.floor(Math.random() * SN_COLS); t++; } while (sn.some(s => s.r === r && s.c === c) && t < 200); fR.current = { r, c }; }, []);

  const ren = useCallback(() => { const b = createSB(); snR.current.forEach(s => { if (s.r >= 0 && s.r < SN_ROWS2 && s.c >= 0 && s.c < SN_COLS) b[s.r][s.c] = 1; }); const f = fR.current; if (f.r >= 0 && f.r < SN_ROWS2 && f.c >= 0 && f.c < SN_COLS) b[f.r][f.c] = 1; setBoard(b); }, []);

  const tick = useCallback(() => {
    if (oR2.current || pR2.current) return;
    const sn = snR.current, dir = dR.current, head = { r: sn[0].r + dir.r, c: sn[0].c + dir.c };
    if (head.r < 0 || head.r >= SN_ROWS2 || head.c < 0 || head.c >= SN_COLS || sn.some(s => s.r === head.r && s.c === head.c)) { oR2.current = true; setOver(true); sfx("over"); ren(); return; }
    const ns = [head, ...sn]; const f = fR.current;
    if (head.r === f.r && head.c === f.c) { sfx("eat"); scR.current += 10; setScore(scR.current); fdR.current++; setFood(fdR.current); const nl = Math.floor(fdR.current / 5) + 1; if (nl !== lvR.current) { lvR.current = nl; setLevel(nl); } pf(); } else ns.pop();
    snR.current = ns; ren();
  }, [sfx, ren, pf]);

  const startG = useCallback(() => { snR.current = initPos(); dR.current = { r: 0, c: 1 }; scR.current = 0; setScore(0); fdR.current = 0; setFood(0); lvR.current = 1; setLevel(1); oR2.current = false; setOver(false); pR2.current = false; setPaused(false); sR.current = true; setStarted(true); pf(); ren(); }, [pf, ren]);
  const togPause = useCallback(() => { if (!sR.current || oR2.current) return; pR2.current = !pR2.current; setPaused(pR2.current); }, []);

  useEffect(() => { if (!started || over || paused) { if (tR.current) clearInterval(tR.current); return; } const base = 250, bonus = Math.floor((level - 1) / 5) * 30, sp = Math.max(80, base - bonus); tR.current = setInterval(tick, sp); return () => clearInterval(tR.current); }, [started, over, paused, tick, level]);
  useEffect(() => { const h = { up: () => { if (dR.current.r !== 1) dR.current = { r: -1, c: 0 }; }, down: () => { if (dR.current.r !== -1) dR.current = { r: 1, c: 0 }; }, left: () => { if (dR.current.c !== 1) dR.current = { r: 0, c: -1 }; }, right: () => { if (dR.current.c !== -1) dR.current = { r: 0, c: 1 }; }, startpause: () => { if (!sR.current || oR2.current) startG(); else togPause(); } }; const fn = e => { h[e.detail]?.(); }; window.addEventListener("gameBtn", fn); return () => window.removeEventListener("gameBtn", fn); }, [startG, togPause]);

  return (<SnakeScreen board={board} score={score} level={level} food={food} over={over} paused={paused} lcd={lcd} />);
}

// ═══ ARKANOID GAME ═══
function ArkanoidGame({ sfx, lcd }) {
  const [board, setBoard] = useState(createBoard);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [level, setLevel] = useState(1);

  const padR = useRef({ c: 3, w: 4 }), balR = useRef({ r: ROWS - 3, c: 5, dr: -1, dc: 1 });
  const brR = useRef([]), oR2 = useRef(false), pR2 = useRef(false), sR = useRef(false);
  const laR = useRef(false), tR = useRef(null), scR = useRef(0), lvR = useRef(1);

  // 25 unique brick patterns
  const PATTERNS = [
    // 1: checkerboard
    (r,c) => (r+c)%2===0,
    // 2: full rows
    (r,c) => r<=4,
    // 3: pyramid
    (r,c) => c>=5-r && c<=4+r && r<=4,
    // 4: inverted pyramid
    (r,c) => c>=r-1 && c<=COLS-r && r<=5,
    // 5: frame
    (r,c) => r<=5 && (r===1||r===5||c===0||c===COLS-1),
    // 6: zigzag
    (r,c) => r<=5 && ((r%2===0 && c<7) || (r%2===1 && c>2)),
    // 7: diagonal stripes
    (r,c) => r<=6 && (r+c)%3===0,
    // 8: two walls
    (r,c) => r<=6 && (c<=2||c>=COLS-3),
    // 9: cross
    (r,c) => r<=6 && (c===4||c===5||r===3),
    // 10: diamond
    (r,c) => { const cr=3,cc=4.5; return Math.abs(r-cr)+Math.abs(c-cc)<=3.5 && r<=6; },
    // 11: horizontal lines
    (r,c) => r<=6 && r%2===1,
    // 12: vertical lines
    (r,c) => r<=5 && c%2===0,
    // 13: L shape
    (r,c) => r<=6 && (c<=2 || r>=5),
    // 14: T shape
    (r,c) => r<=5 && (r<=2 || (c>=3&&c<=6)),
    // 15: scattered
    (r,c) => r<=6 && (r*7+c*3)%5===0,
    // 16: thick top
    (r,c) => r<=3,
    // 17: arrow down
    (r,c) => r<=6 && c>=r/2 && c<=COLS-1-r/2,
    // 18: two triangles
    (r,c) => r<=5 && (c<=r || c>=COLS-1-r),
    // 19: U shape
    (r,c) => r<=6 && (c<=1||c>=COLS-2||r>=5),
    // 20: dense checkerboard
    (r,c) => r<=7 && (r+c)%2===0,
    // 21: staircase left
    (r,c) => r<=6 && c<=r+1,
    // 22: staircase right
    (r,c) => r<=6 && c>=COLS-2-r,
    // 23: three columns
    (r,c) => r<=6 && (c===1||c===4||c===7),
    // 24: H shape
    (r,c) => r<=6 && (c<=1||c>=COLS-2||(r>=2&&r<=4)),
    // 25: full wall
    (r,c) => r<=7,
  ];

  const makeBricks = useCallback(lv => {
    const b = [];
    const patIdx = ((lv - 1) % 25);
    const pat = PATTERNS[patIdx];
    for (let r = 1; r <= 8; r++) for (let c = 0; c < COLS; c++) if (pat(r, c)) b.push({ r, c });
    if (b.length === 0) { for (let r = 1; r <= 3; r++) for (let c = 0; c < COLS; c++) b.push({ r, c }); }
    brR.current = b;
  }, []);

  const ren = useCallback(() => { const b = createBoard(); brR.current.forEach(br => { if (br.r >= 0 && br.r < ROWS && br.c >= 0 && br.c < COLS) b[br.r][br.c] = 1; }); const p = padR.current; for (let i = 0; i < p.w; i++) { const cc = p.c + i; if (cc >= 0 && cc < COLS) b[ROWS - 1][cc] = 1; } const bl = balR.current; if (bl.r >= 0 && bl.r < ROWS && bl.c >= 0 && bl.c < COLS) b[bl.r][bl.c] = 1; setBoard(b); }, []);

  const nextLevel = useCallback(() => { sfx("win"); lvR.current++; setLevel(lvR.current); padR.current = { c: 3, w: 4 }; balR.current = { r: ROWS - 3, c: 5, dr: -1, dc: 1 }; laR.current = false; makeBricks(lvR.current); ren(); }, [sfx, makeBricks, ren]);

  // Ball angle: "steep" = dc changes every tick, "shallow" = dc changes every 2nd tick
  const angleRef = useRef("steep"); // "steep" or "shallow"
  const stepRef = useRef(0); // counter for shallow angle

  const tick = useCallback(() => {
    if (oR2.current || pR2.current || !laR.current) return;
    const bl = balR.current;
    const angle = angleRef.current;

    // Calculate next position based on angle
    let nr = bl.r + (bl.dr > 0 ? 1 : -1);
    let nc;
    if (angle === "steep") {
      // 45° — move horizontally every tick
      nc = bl.c + bl.dc;
    } else {
      // Shallow — move horizontally every 2nd tick
      stepRef.current++;
      if (stepRef.current % 2 === 0) {
        nc = bl.c + bl.dc;
      } else {
        nc = bl.c;
      }
    }

    // Wall bounces
    if (nc < 0) { nc = 0; bl.dc = 1; sfx("bounce"); }
    if (nc >= COLS) { nc = COLS - 1; bl.dc = -1; sfx("bounce"); }
    // Corner bounce
    if (nr <= 0 && (nc <= 0 || nc >= COLS - 1)) { nr = 0; bl.dr = 1; bl.dc = nc <= 0 ? 1 : -1; angleRef.current = "steep"; sfx("bounce"); }
    else if (nr < 0) { nr = 0; bl.dr = 1; sfx("bounce"); }
    // Floor — miss
    if (nr >= ROWS) { oR2.current = true; setOver(true); sfx("over"); ren(); return; }
    // Paddle bounce — edges = steep, center = shallow
    const p = padR.current;
    if (nr === ROWS - 1 && nc >= p.c && nc < p.c + p.w) {
      bl.dr = -1;
      const hitCell = nc - p.c; // 0, 1, 2, 3
      if (hitCell === 0) { bl.dc = -1; angleRef.current = "steep"; }        // left edge → steep left
      else if (hitCell === p.w - 1) { bl.dc = 1; angleRef.current = "steep"; } // right edge → steep right
      else { angleRef.current = "shallow"; stepRef.current = 0; }             // center → shallow, keep dc
      nr = ROWS - 2;
      sfx("bounce");
    }
    // Brick collision
    const bi = brR.current.findIndex(br => br.r === nr && br.c === nc);
    if (bi >= 0) { brR.current.splice(bi, 1); bl.dr = -bl.dr; scR.current += 10; setScore(scR.current); sfx("brick"); if (brR.current.length === 0) { bl.r = nr; bl.c = nc; balR.current = bl; nextLevel(); return; } }
    bl.r = nr; bl.c = nc; balR.current = bl; ren();
  }, [sfx, ren, nextLevel]);

  const startG = useCallback(() => { padR.current = { c: 3, w: 4 }; balR.current = { r: ROWS - 3, c: 5, dr: -1, dc: 1 }; oR2.current = false; setOver(false); pR2.current = false; setPaused(false); sR.current = true; setStarted(true); laR.current = false; scR.current = 0; setScore(0); makeBricks(lvR.current); ren(); }, [makeBricks, ren]);
  const togPause = useCallback(() => { if (!sR.current || oR2.current) return; pR2.current = !pR2.current; setPaused(pR2.current); }, []);
  const launch = useCallback(() => { if (!laR.current && sR.current && !oR2.current) laR.current = true; }, []);

  useEffect(() => { if (!started || over || paused) { if (tR.current) clearInterval(tR.current); return; } const base = 150, bonus = Math.floor((level - 1) / 5) * 20, sp = Math.max(40, base - bonus); tR.current = setInterval(tick, sp); return () => clearInterval(tR.current); }, [started, over, paused, tick, level]);
  useEffect(() => { const h = { up: () => { launch(); }, down: () => {}, left: () => { const p = padR.current; if (p.c > 0) { p.c--; padR.current = p; if (!laR.current) balR.current.c = p.c + Math.floor(p.w / 2); ren(); } }, right: () => { const p = padR.current; if (p.c + p.w < COLS) { p.c++; padR.current = p; if (!laR.current) balR.current.c = p.c + Math.floor(p.w / 2); ren(); } }, startpause: () => { if (!sR.current || oR2.current) startG(); else { launch(); togPause(); } } }; const fn = e => { h[e.detail]?.(); }; window.addEventListener("gameBtn", fn); return () => window.removeEventListener("gameBtn", fn); }, [startG, togPause, launch, ren]);

  return (<TetrisScreen board={board} ng={null} score={score} level={level} lines={Math.floor(score / 10)} over={over} paused={paused} lcd={lcd} />);
}

// ═══ UI COMPONENTS ═══
function BtnLbl({ i, t2, c }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, color: c || "#fff" }}>
      <span style={{ fontSize: 26, fontWeight: "bold", lineHeight: 1 }}>{i}</span>
      <span style={{ fontSize: 8, fontWeight: "bold", letterSpacing: 1, opacity: .7 }}>{t2}</span>
    </div>
  );
}

function DBtn({ x, y, w, h, id, t, children }) {
  const [p, setP] = useState(false);
  const dn = e => { e.preventDefault(); e.stopPropagation(); setP(true); emitBtn(id); };
  const up = e => { e.preventDefault(); e.stopPropagation(); setP(false); };
  return (
    <div onMouseDown={dn} onMouseUp={up} onMouseLeave={up} onTouchStart={dn} onTouchEnd={up} onTouchCancel={up}
      style={{ position: "absolute", left: x, top: y, width: w, height: h, background: p ? `linear-gradient(145deg,${t.btnBgP[0]},${t.btnBgP[1]})` : `linear-gradient(145deg,${t.btnBg[0]},${t.btnBg[1]})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: p ? "inset 0 3px 8px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.12)", transition: "all 0.03s", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>{children}</div>
  );
}

function PillBtn({ onClick, id, label, w, h, t, alt, mom, tog }) {
  const [p, setP] = useState(false);
  const dn = e => { e.preventDefault(); e.stopPropagation(); setP(true); if (onClick) onClick(); else if (id) emitBtn(id); };
  const up = e => { e.preventDefault(); e.stopPropagation(); setP(false); };
  const dark = mom ? p : (tog !== undefined ? tog : p);
  const bgN = alt ? t.pillAlt : t.pillBg, bgD = alt ? t.pillAltP : t.pillBgP;
  return (
    <div onMouseDown={dn} onMouseUp={up} onMouseLeave={up} onTouchStart={dn} onTouchEnd={up} onTouchCancel={up}
      style={{ width: w, height: h || 44, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", background: dark ? `linear-gradient(145deg,${bgD[0]},${bgD[1]})` : `linear-gradient(145deg,${bgN[0]},${bgN[1]})`, color: t.btnCol, fontSize: 10, fontWeight: "bold", letterSpacing: 1.5, cursor: "pointer", boxShadow: dark ? "inset 0 3px 8px rgba(0,0,0,0.5)" : "0 3px 8px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.1)", transition: "all 0.03s", fontFamily: "'Courier New',monospace", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>{label}</div>
  );
}

function RndBtn({ act, onClick, bg, bgP, children }) {
  const [p, setP] = useState(false);
  const dn = e => { e.preventDefault(); e.stopPropagation(); setP(true); onClick(); };
  const up = e => { e.preventDefault(); e.stopPropagation(); setP(false); };
  const pr = p || act;
  return (
    <div onMouseDown={dn} onMouseUp={up} onMouseLeave={up} onTouchStart={dn} onTouchEnd={up} onTouchCancel={up}
      style={{ width: 34, height: 34, borderRadius: "50%", cursor: "pointer", background: pr ? `linear-gradient(145deg,${bgP[0]},${bgP[1]})` : `linear-gradient(145deg,${bg[0]},${bg[1]})`, border: pr ? "2px solid rgba(0,0,0,0.3)" : "2px solid rgba(255,255,255,0.1)", boxShadow: pr ? "inset 0 3px 8px rgba(0,0,0,0.5)" : "0 3px 6px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.08s", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>{children}</div>
  );
}
