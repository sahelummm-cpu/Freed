import React, { useState, useEffect, useRef } from "react";

// ── Design tokens ───────────────────────────────────────────────
// Palette: deep teal, sage, warm cream, soft coral accent
const C = {
  bg: "#F3F1E9",
  card: "#FFFFFF",
  ink: "#1C2B2A",
  teal: "#0E6B5C",
  tealSoft: "#E3F0EC",
  sage: "#7FA99B",
  coral: "#F0795B",
  coralSoft: "#FCE6DF",
  muted: "#7B8785",
  line: "#E7E3D7",
};

// Typography — Fraunces (warm display serif) for headlines & big numbers,
// Inter for clean, legible UI text. Loaded via Google Fonts in index.html.
const FONT = {
  display: "'Fraunces', Georgia, 'Times New Roman', serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
};
// Shared style for large stat numbers — display face + tabular figures so
// the live timer doesn't jitter as digits change.
const numStyle = { fontFamily: FONT.display, fontFeatureSettings: "'tnum' 1", fontVariantNumeric: "tabular-nums" } as const;

// Product types — adapts labels and pack units to the user's habit
const PRODUCTS = {
  cigarettes: { label: "Cigarettes", unit: "cigarette", unitPlural: "cigarettes", packLabel: "per pack", packDefault: 20, icon: "🚬" },
  vape: { label: "Vape / e-cig", unit: "pod", unitPlural: "pods", packLabel: "puffs per pod", packDefault: 1, icon: "💨" },
  heated: { label: "Heated tobacco", unit: "stick", unitPlural: "sticks", packLabel: "per pack", packDefault: 20, icon: "🔥" },
};

// Rotating motivational lines for daily reminders
const PEP_TALKS = [
  "Every craving you ride out makes the next one weaker.",
  "Your lungs are clearing a little more today than yesterday.",
  "The money you didn't spend is yours to keep.",
  "You're not giving something up — you're getting your health back.",
  "One day at a time is how every long streak is built.",
  "The urge passes in minutes. Your progress lasts.",
  "Future you is grateful for what you're doing right now.",
];

// Health recovery milestones (public-domain facts about smoking cessation)
const MILESTONES = [
  { mins: 20, title: "Heart rate settles", body: "Your pulse and blood pressure begin to drop back toward normal." },
  { mins: 8 * 60, title: "Oxygen recovers", body: "Carbon monoxide leaves your blood; oxygen levels normalize." },
  { mins: 24 * 60, title: "Heart-attack risk falls", body: "The first 24 hours already start lowering your cardiac risk." },
  { mins: 48 * 60, title: "Taste & smell return", body: "Nerve endings start regrowing — food tastes like food again." },
  { mins: 72 * 60, title: "Breathing eases", body: "Bronchial tubes relax; lung capacity begins to rise." },
  { mins: 14 * 24 * 60, title: "Circulation improves", body: "Walking and activity feel noticeably easier." },
  { mins: 90 * 24 * 60, title: "Lungs clear out", body: "Cilia regrow, clearing mucus and cutting infection risk." },
  { mins: 365 * 24 * 60, title: "Heart risk halved", body: "Your risk of coronary heart disease is about half a smoker's." },
];

const fmt = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const money = (n) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Freed() {
  // Onboarding state
  const [setup, setSetup] = useState(null); // {quitDate, perDay, packCost, packSize}
  const [draft, setDraft] = useState({ product: "cigarettes", perDay: 15, packCost: 9, packSize: 20, when: "now" });
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState("home");
  // history: list of past streaks {start, end, durationMs, note}
  const [history, setHistory] = useState([]);
  const [best, setBest] = useState(0); // longest streak ever, in ms
  const [showRelapse, setShowRelapse] = useState(false);
  const [reminders, setReminders] = useState(true); // daily motivational reminder toggle
  const [goals, setGoals] = useState([]); // custom personal goals [{id,label,target}]
  const [showShare, setShowShare] = useState(false); // share card overlay

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Record a relapse: archive current streak, then start a fresh one now.
  const recordRelapse = (note) => {
    const end = Date.now();
    const durationMs = end - setup.quitDate;
    setHistory((h) => [{ start: setup.quitDate, end, durationMs, note }, ...h]);
    setBest((b) => Math.max(b, durationMs));
    setSetup({ ...setup, quitDate: end });
    setShowRelapse(false);
    setTab("home");
  };

  // Full reset: wipe everything back to onboarding.
  const fullReset = () => {
    setSetup(null);
    setHistory([]);
    setBest(0);
    setTab("home");
  };

  if (!setup) {
    return (
      <Shell>
        <Onboard draft={draft} setDraft={setDraft} onDone={(quitDate) =>
          setSetup({ ...draft, quitDate })
        } />
      </Shell>
    );
  }

  const elapsedMs = now - setup.quitDate;
  const elapsedMin = Math.max(0, elapsedMs / 60000);
  const days = Math.floor(elapsedMin / (60 * 24));
  const hrs = Math.floor((elapsedMin % (60 * 24)) / 60);
  const mins = Math.floor(elapsedMin % 60);
  const secs = Math.floor((elapsedMs / 1000) % 60);

  const prod = PRODUCTS[setup.product] || PRODUCTS.cigarettes;
  const cigsPerMin = setup.perDay / (24 * 60);
  const cigsAvoided = cigsPerMin * elapsedMin;
  const costPerCig = setup.packCost / setup.packSize;
  const saved = cigsAvoided * costPerCig;
  // minutes of life reclaimed (~11 min per cigarette, widely cited estimate)
  const lifeMin = cigsAvoided * 11;

  const reached = MILESTONES.filter((m) => elapsedMin >= m.mins);
  const next = MILESTONES.find((m) => elapsedMin < m.mins);
  const nextPct = next
    ? Math.min(100, ((elapsedMin - (reached.at(-1)?.mins || 0)) / (next.mins - (reached.at(-1)?.mins || 0))) * 100)
    : 100;

  // Daily reminder: pick a pep talk that rotates by day number
  const pep = PEP_TALKS[days % PEP_TALKS.length];

  return (
    <Shell>
      <div style={{ padding: "0 20px 110px" }}>
        {tab === "home" && (
          <Home {...{ days, hrs, mins, secs, saved, cigsAvoided, lifeMin, next, nextPct,
            best, elapsedMs, prod, reminders, pep, onRelapse: () => setShowRelapse(true),
            onShare: () => setShowShare(true) }} />
        )}
        {tab === "money" && <Money {...{ saved, cigsAvoided, setup, days, goals, setGoals }} />}
        {tab === "health" && <Health {...{ reached, next, elapsedMin, nextPct }} />}
        {tab === "breathe" && <Breathe />}
        {tab === "you" && <You {...{ history, best, elapsedMs, setup, prod, reminders, setReminders, onReset: fullReset }} />}
      </div>
      {showRelapse && <RelapseSheet onCancel={() => setShowRelapse(false)} onConfirm={recordRelapse} prod={prod} />}
      {showShare && <ShareCard {...{ days, saved, cigsAvoided, lifeMin, prod }} onClose={() => setShowShare(false)} />}
      <Nav tab={tab} setTab={setTab} />
    </Shell>
  );
}

const fmtDur = (ms) => {
  const m = ms / 60000;
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = Math.floor(m % 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${mm}m`;
  return `${mm}m`;
};

// ── Layout shell ────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.ink,
      fontFamily: FONT.sans, WebkitFontSmoothing: "antialiased",
      maxWidth: 440, margin: "0 auto", position: "relative",
    }}>
      <style>{`
        @keyframes pop { from {transform:scale(.96);opacity:0} to {transform:scale(1);opacity:1} }
        @keyframes breatheGrow { 0%{transform:scale(.55)} 100%{transform:scale(1)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes wave { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(16deg)} 75%{transform:rotate(-8deg)} }
        @keyframes blink { 0%,92%,100%{transform:scaleY(1)} 96%{transform:scaleY(.1)} }
        @keyframes countUp { from {opacity:0;transform:translateY(6px)} to {opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        button { font-family: inherit; cursor: pointer; }
        ::-webkit-scrollbar { display:none; }
      `}</style>
      {children}
    </div>
  );
}

// ── Brand: logo mark + wordmark ─────────────────────────────────
// Two breath/leaf strokes forming a pair of lungs around a central stem —
// "lungs healing / set free."
function LogoMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect width="64" height="64" rx="16" fill={C.teal} />
      <path d="M32 16c-9 6-16 12-16 22a16 16 0 0 0 16 8" stroke={C.tealSoft} strokeWidth="5" strokeLinecap="round" />
      <path d="M32 16c9 6 16 12 16 22a16 16 0 0 1-16 8" stroke={C.coral} strokeWidth="5" strokeLinecap="round" />
      <line x1="32" y1="14" x2="32" y2="48" stroke={C.tealSoft} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function Logo({ size = 34, light = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={size} />
      <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: size * 0.72,
        letterSpacing: -0.5, color: light ? "#fff" : C.ink }}>Freed</span>
    </div>
  );
}

// ── Mascot: "Breeze", a friendly lung-cloud buddy ───────────────
// Warm, non-judgmental companion. mood adjusts expression + motion.
function Mascot({ size = 96, mood = "calm" }) {
  const anim = mood === "calm" ? "float 4s ease-in-out infinite"
    : mood === "cheer" ? "float 1.6s ease-in-out infinite" : "none";
  const cheeks = mood === "cheer" || mood === "wave";
  // mouth path: smile for happy moods, soft gentle line for support
  const mouth = mood === "support"
    ? "M26 40 q6 4 12 0"
    : mood === "cheer"
    ? "M24 38 q8 11 16 0"
    : "M26 39 q6 6 12 0";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ animation: anim, overflow: "visible" }} aria-hidden>
      {/* little sprout on top */}
      <path d="M32 12c0-4 3-6 6-6-.5 4-3 6-6 6Z" fill={C.sage} />
      <path d="M32 13c0-4-3-7-7-7 .5 4 4 7 7 7Z" fill={C.teal} />
      <line x1="32" y1="12" x2="32" y2="18" stroke={C.teal} strokeWidth="2.4" strokeLinecap="round" />
      {/* soft cloud/lung body */}
      <path d="M20 50c-7 0-11-5-11-11 0-6 4-10 9-11 1-7 7-12 14-12s13 5 14 12c5 1 9 5 9 11 0 6-4 11-11 11Z"
        fill={C.tealSoft} stroke={C.teal} strokeWidth="2.5" strokeLinejoin="round" />
      {/* eyes */}
      <g style={{ animation: "blink 5s ease-in-out infinite", transformOrigin: "center" }}>
        <circle cx="26" cy="33" r="2.6" fill={C.ink} />
        <circle cx="40" cy="33" r="2.6" fill={C.ink} />
      </g>
      {cheeks && <>
        <circle cx="21" cy="38" r="3" fill={C.coral} opacity="0.5" />
        <circle cx="45" cy="38" r="3" fill={C.coral} opacity="0.5" />
      </>}
      {/* mouth */}
      <path d={mouth} stroke={C.ink} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* waving hand */}
      {mood === "wave" && (
        <g style={{ animation: "wave .8s ease-in-out infinite", transformOrigin: "50px 44px" }}>
          <circle cx="52" cy="42" r="4" fill={C.coral} />
        </g>
      )}
    </svg>
  );
}

// ── Onboarding ──────────────────────────────────────────────────
function Onboard({ draft, setDraft, onDone }) {
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  return (
    <div style={{ padding: "56px 24px 40px", animation: "pop .4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Logo size={30} />
        <Mascot size={64} mood="wave" />
      </div>
      <h1 style={{ fontFamily: FONT.display, fontSize: 36, lineHeight: 1.1, margin: "14px 0 6px", fontWeight: 800, letterSpacing: -0.5 }}>
        Your last cigarette<br />was the last one.
      </h1>
      <p style={{ color: C.muted, fontSize: 15, margin: "0 0 28px", lineHeight: 1.5 }}>
        Tell us your habit so we can track every smoke-free minute, dollar, and breath you win back.
      </p>

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, fontWeight: 600 }}>What are you quitting?</div>
        <div style={{ display: "flex", gap: 10 }}>
          {Object.entries(PRODUCTS).map(([k, p]) => (
            <button key={k} onClick={() => {
              set("product", k);
              set("packSize", p.packDefault);
            }} style={{
              flex: 1, padding: "14px 4px", borderRadius: 14, fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${draft.product === k ? C.teal : C.line}`,
              background: draft.product === k ? C.tealSoft : C.card,
              color: draft.product === k ? C.teal : C.ink,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: 20 }}>{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Field label={`${PRODUCTS[draft.product].unitPlural} per day`} value={draft.perDay} onChange={(v) => set("perDay", v)} min={1} max={60} />
      <Field label="Price per pack ($)" value={draft.packCost} onChange={(v) => set("packCost", v)} min={1} max={40} step={0.5} />
      <Field label={`${PRODUCTS[draft.product].unitPlural} ${PRODUCTS[draft.product].packLabel}`} value={draft.packSize} onChange={(v) => set("packSize", v)} min={1} max={200} />

      <div style={{ marginTop: 8, marginBottom: 22 }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, fontWeight: 600 }}>I quit…</div>
        <div style={{ display: "flex", gap: 10 }}>
          {[["now", "Just now"], ["today", "Earlier today"], ["yesterday", "Yesterday"]].map(([k, label]) => (
            <button key={k} onClick={() => set("when", k)} style={{
              flex: 1, padding: "12px 0", borderRadius: 14, fontSize: 14, fontWeight: 600,
              border: `1.5px solid ${draft.when === k ? C.teal : C.line}`,
              background: draft.when === k ? C.tealSoft : C.card,
              color: draft.when === k ? C.teal : C.ink,
            }}>{label}</button>
          ))}
        </div>
      </div>

      <button onClick={() => {
        const offsets = { now: 0, today: 6 * 3600e3, yesterday: 28 * 3600e3 };
        onDone(Date.now() - (offsets[draft.when] || 0));
      }} style={{
        width: "100%", padding: "17px 0", borderRadius: 16, border: "none",
        background: C.teal, color: "#fff", fontSize: 17, fontWeight: 700,
        boxShadow: "0 10px 24px rgba(14,107,92,.28)",
      }}>Start my journey</button>
    </div>
  );
}

function Field({ label, value, onChange, min, max, step = 1 }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 15, color: C.teal, fontWeight: 800 }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: C.teal, height: 6 }} />
    </div>
  );
}

// ── Home ────────────────────────────────────────────────────────
function Home({ days, hrs, mins, secs, saved, cigsAvoided, lifeMin, next, nextPct, best, elapsedMs, prod, reminders, pep, onRelapse, onShare }) {
  return (
    <div style={{ animation: "pop .35s ease" }}>
      <Header sub="Smoke-free for" title={`${days} ${days === 1 ? "day" : "days"}`} />

      {/* Glanceable widget-style summary — the one number, big */}
      <div style={{ background: `linear-gradient(135deg, ${C.teal}, #0a564a)`, color: "#fff",
        borderRadius: 22, padding: "18px 20px", marginTop: 14, display: "flex",
        justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 12px 28px rgba(14,107,92,.28)" }}>
        <div>
          <div style={{ fontSize: 12, opacity: .8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Smoke-free</div>
          <div style={{ ...numStyle, fontSize: 44, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1 }}>{days}<span style={{ fontFamily: FONT.sans, fontSize: 18, opacity: .85, fontWeight: 700 }}> {days === 1 ? "day" : "days"}</span></div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, opacity: .8, fontWeight: 600 }}>Saved</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{money(saved)}</div>
          <div style={{ fontSize: 12, opacity: .8, fontWeight: 600, marginTop: 6 }}>{fmt(cigsAvoided)} {prod.unitPlural} avoided</div>
        </div>
      </div>

      <Ring days={days} hrs={hrs} mins={mins} secs={secs} pct={nextPct} />

      {reminders && (
        <div style={{ background: C.tealSoft, borderRadius: 16, padding: "14px 16px", marginTop: 18,
          display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18 }}>💬</span>
          <div>
            <div style={{ fontSize: 11, color: C.teal, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>Today's reminder</div>
            <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.45, marginTop: 2 }}>{pep}</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <Stat accent={C.teal} label="Saved" value={money(saved)} />
        <Stat accent={C.coral} label={`${prod.unitPlural} avoided`} value={fmt(cigsAvoided)} />
        <Stat accent={C.sage} label="Life reclaimed" value={`${fmt(lifeMin / 60)} hrs`} />
        <Stat accent={C.teal} label="Next milestone" value={next ? next.title : "All reached 🎉"} small />
      </div>

      {best > 0 && best > elapsedMs && (
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.muted }}>
          Personal best: <b style={{ color: C.teal }}>{fmtDur(best)}</b> — you've got this.
        </div>
      )}

      <button onClick={onShare} style={{
        width: "100%", marginTop: 18, padding: "15px 0", borderRadius: 14,
        border: "none", background: C.coral, color: "#fff",
        fontSize: 15, fontWeight: 700, boxShadow: "0 8px 20px rgba(240,121,91,.28)" }}>
        Share my progress
      </button>

      <button onClick={onRelapse} style={{
        width: "100%", marginTop: 10, padding: "13px 0", borderRadius: 14,
        border: `1.5px solid ${C.line}`, background: "transparent", color: C.muted,
        fontSize: 14, fontWeight: 600 }}>
        I slipped — reset my streak
      </button>
    </div>
  );
}

function Header({ sub, title }) {
  return (
    <div style={{ paddingTop: 56, marginBottom: 4 }}>
      <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{sub}</div>
      <h1 style={{ fontFamily: FONT.display, fontSize: 34, fontWeight: 800, margin: "2px 0 0", letterSpacing: -0.5, lineHeight: 1.05 }}>{title}</h1>
    </div>
  );
}

function Ring({ days, hrs, mins, secs, pct }) {
  const R = 96, stroke = 12, circ = 2 * Math.PI * R;
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
      <div style={{ position: "relative", width: 230, height: 230 }}>
        <svg width="230" height="230" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="115" cy="115" r={R} fill="none" stroke={C.tealSoft} strokeWidth={stroke} />
          <circle cx="115" cy="115" r={R} fill="none" stroke={C.teal} strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ - (circ * pct) / 100}
            style={{ transition: "stroke-dashoffset .6s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>elapsed</div>
          <div style={{ ...numStyle, fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>
            {String(hrs).padStart(2, "0")}:{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
          <div style={{ fontSize: 12, color: C.coral, fontWeight: 700, marginTop: 4 }}>
            {Math.round(pct)}% to next goal
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent, small }) {
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: "16px 16px",
      border: `1px solid ${C.line}` }}>
      <div style={{ width: 26, height: 4, borderRadius: 4, background: accent, marginBottom: 10 }} />
      <div style={{ ...(small ? {} : numStyle), fontSize: small ? 15 : 23, fontWeight: 800, letterSpacing: -.5, lineHeight: 1.15 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 3 }}>{label}</div>
    </div>
  );
}

// ── Money tab ───────────────────────────────────────────────────
function Money({ saved, cigsAvoided, setup, days, goals, setGoals }) {
  const perDay = (setup.packCost / setup.packSize) * setup.perDay;
  const [adding, setAdding] = useState(false);
  const [gLabel, setGLabel] = useState("");
  const [gTarget, setGTarget] = useState("");
  const projections = [
    ["This week", perDay * 7],
    ["This month", perDay * 30],
    ["This year", perDay * 365],
    ["5 years", perDay * 365 * 5],
  ];
  const presetGoals = [
    ["☕", "Coffee for a month", 120],
    ["🎧", "New headphones", 200],
    ["✈️", "Weekend trip", 600],
    ["📱", "New phone", 1000],
  ];
  const addGoal = () => {
    const t = parseFloat(gTarget);
    if (!gLabel.trim() || !t || t <= 0) return;
    setGoals((g) => [...g, { id: Date.now(), label: gLabel.trim(), target: t }]);
    setGLabel(""); setGTarget(""); setAdding(false);
  };
  const GoalBar = ({ icon, label, cost, onRemove }) => {
    const pct = Math.min(100, (saved / cost) * 100);
    return (
      <div style={{ background: C.card, borderRadius: 16, padding: 14, marginBottom: 10,
        border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{icon} {label}</span>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: pct >= 100 ? C.teal : C.muted, fontWeight: 700 }}>
              {pct >= 100 ? "Unlocked ✓" : money(cost)}
            </span>
            {onRemove && <button onClick={onRemove} style={{ border: "none", background: "transparent",
              color: C.muted, fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>}
          </span>
        </div>
        <div style={{ height: 8, background: C.bg, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 6,
            background: pct >= 100 ? C.teal : C.coral, transition: "width .5s ease" }} />
        </div>
      </div>
    );
  };
  return (
    <div style={{ animation: "pop .35s ease" }}>
      <Header sub="Money saved so far" title={money(saved)} />
      <div style={{ background: C.teal, color: "#fff", borderRadius: 22, padding: 20, marginTop: 16,
        boxShadow: "0 12px 28px rgba(14,107,92,.25)" }}>
        <div style={{ fontSize: 13, opacity: .85, fontWeight: 600 }}>You'd be spending</div>
        <div style={{ ...numStyle, fontSize: 30, fontWeight: 800 }}>{money(perDay)}<span style={{ fontFamily: FONT.sans, fontSize: 15, opacity: .8 }}> / day</span></div>
      </div>

      <SectionTitle>If you keep going</SectionTitle>
      {projections.map(([label, v]) => (
        <Row key={label} left={label} right={money(v)} />
      ))}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "26px 0 12px" }}>
        <span style={{ fontSize: 13, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Your goals</span>
        <button onClick={() => setAdding((a) => !a)} style={{ border: "none", background: C.tealSoft,
          color: C.teal, fontWeight: 700, fontSize: 13, borderRadius: 10, padding: "6px 12px" }}>
          {adding ? "Close" : "+ Add goal"}
        </button>
      </div>

      {adding && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 14, marginBottom: 10 }}>
          <input value={gLabel} onChange={(e) => setGLabel(e.target.value)} placeholder="What are you saving for?"
            style={{ width: "100%", padding: "11px 13px", borderRadius: 11, fontSize: 14, marginBottom: 8,
              border: `1.5px solid ${C.line}`, outline: "none", fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <input value={gTarget} onChange={(e) => setGTarget(e.target.value)} placeholder="Cost ($)" inputMode="decimal"
              style={{ flex: 1, padding: "11px 13px", borderRadius: 11, fontSize: 14,
                border: `1.5px solid ${C.line}`, outline: "none", fontFamily: "inherit" }} />
            <button onClick={addGoal} style={{ padding: "0 20px", borderRadius: 11, border: "none",
              background: C.teal, color: "#fff", fontWeight: 700, fontSize: 14 }}>Add</button>
          </div>
        </div>
      )}

      {goals.map((g) => (
        <GoalBar key={g.id} icon="🎯" label={g.label} cost={g.target}
          onRemove={() => setGoals((arr) => arr.filter((x) => x.id !== g.id))} />
      ))}

      <SectionTitle>Ideas to aim for</SectionTitle>
      {presetGoals.map(([icon, label, cost]) => (
        <GoalBar key={label} icon={icon} label={label} cost={cost} />
      ))}
    </div>
  );
}

// ── Health tab ──────────────────────────────────────────────────
function Health({ reached, next, elapsedMin }) {
  return (
    <div style={{ animation: "pop .35s ease" }}>
      <Header sub="Your body is healing" title={`${reached.length}/${MILESTONES.length}`} />
      <p style={{ color: C.muted, fontSize: 14, margin: "2px 0 18px" }}>Milestones unlock automatically as time passes.</p>
      <div style={{ position: "relative", paddingLeft: 8 }}>
        {MILESTONES.map((m, i) => {
          const done = elapsedMin >= m.mins;
          const isNext = m === next;
          return (
            <div key={i} style={{ display: "flex", gap: 14, marginBottom: 4 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: done ? C.teal : isNext ? C.coralSoft : C.card,
                  border: `2px solid ${done ? C.teal : isNext ? C.coral : C.line}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 12, fontWeight: 800 }}>{done ? "✓" : ""}</div>
                {i < MILESTONES.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 38,
                    background: done ? C.teal : C.line }} />
                )}
              </div>
              <div style={{ paddingBottom: 18, opacity: done || isNext ? 1 : .5 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{m.title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.45, marginTop: 2 }}>{m.body}</div>
                {isNext && <div style={{ fontSize: 12, color: C.coral, fontWeight: 700, marginTop: 4 }}>Up next →</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Breathe / craving tool ──────────────────────────────────────
function Breathe() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("Ready");
  const [cycle, setCycle] = useState(0);
  const tref = useRef(null);

  // 4-7-8 style box breathing: inhale 4s, hold 7s, exhale 8s
  useEffect(() => {
    if (!running) return;
    const seq = [["Breathe in", 4000], ["Hold", 7000], ["Breathe out", 8000]];
    let i = 0;
    const run = () => {
      setPhase(seq[i][0]);
      if (i === 0) setCycle((c) => c + 1);
      tref.current = setTimeout(() => { i = (i + 1) % 3; run(); }, seq[i][1]);
    };
    run();
    return () => clearTimeout(tref.current);
  }, [running]);

  const scale = phase === "Breathe in" ? 1 : phase === "Hold" ? 1 : 0.55;
  const dur = phase === "Breathe in" ? "4s" : phase === "Breathe out" ? "8s" : "0s";

  return (
    <div style={{ animation: "pop .35s ease" }}>
      <Header sub="Craving hitting?" title="Ride the wave" />
      <p style={{ color: C.muted, fontSize: 14, margin: "2px 0 6px", lineHeight: 1.5 }}>
        A craving peaks in about 3 minutes, then fades whether you smoke or not. Breathe through it.
      </p>

      <div style={{ display: "flex", justifyContent: "center", margin: "30px 0 18px" }}>
        <div style={{ position: "relative", width: 240, height: 240, display: "flex",
          alignItems: "center", justifyContent: "center" }}>
          <div style={{
            position: "absolute", width: 200, height: 200, borderRadius: "50%",
            background: `radial-gradient(circle, ${C.tealSoft}, ${C.coralSoft})`,
            transform: `scale(${running ? scale : 0.7})`,
            transition: `transform ${dur} ease-in-out`,
          }} />
          <div style={{ position: "relative", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
              <Mascot size={56} mood="calm" />
            </div>
            <div style={{ fontFamily: FONT.display, fontSize: 23, fontWeight: 800, color: C.teal }}>{phase}</div>
            {running && <div style={{ fontSize: 13, color: C.muted, fontWeight: 600, marginTop: 4 }}>cycle {cycle}</div>}
          </div>
        </div>
      </div>

      <button onClick={() => { setRunning((r) => !r); if (running) { setPhase("Ready"); setCycle(0); } }}
        style={{ width: "100%", padding: "16px 0", borderRadius: 16, border: "none",
          background: running ? C.coral : C.teal, color: "#fff", fontSize: 16, fontWeight: 700,
          boxShadow: `0 10px 22px ${running ? "rgba(240,121,91,.3)" : "rgba(14,107,92,.28)"}` }}>
        {running ? "Stop" : "Start breathing"}
      </button>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16,
        padding: 16, marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>While you wait, try:</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: C.muted, fontSize: 14, lineHeight: 1.7 }}>
          <li>Drink a full glass of water, slowly</li>
          <li>Step outside or change rooms</li>
          <li>Text someone who knows you're quitting</li>
        </ul>
      </div>
    </div>
  );
}

// ── Shared bits ─────────────────────────────────────────────────
function SectionTitle({ children }) {
  return <div style={{ fontSize: 13, color: C.muted, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: 1, margin: "26px 0 12px" }}>{children}</div>;
}
function Row({ left, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", background: C.card,
      border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 9 }}>
      <span style={{ fontWeight: 600, fontSize: 14 }}>{left}</span>
      <span style={{ fontWeight: 800, fontSize: 15, color: C.teal }}>{right}</span>
    </div>
  );
}

// ── Share card ──────────────────────────────────────────────────
function ShareCard({ days, saved, cigsAvoided, lifeMin, prod, onClose }) {
  const cardRef = useRef(null);
  const [status, setStatus] = useState("");

  const shareText = `${days} ${days === 1 ? "day" : "days"} smoke-free with Freed — ${money(saved)} saved and ${fmt(cigsAvoided)} ${prod.unitPlural} avoided. 💪`;

  const doShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); return; }
      catch { /* user dismissed */ }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setStatus("Copied to clipboard");
      setTimeout(() => setStatus(""), 1800);
    } catch {
      setStatus("Press and hold the card to save it");
      setTimeout(() => setStatus(""), 2200);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60,
      background: "rgba(28,43,42,.55)", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24 }}>
      {/* The shareable card itself */}
      <div ref={cardRef} onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 340, aspectRatio: "4 / 5", borderRadius: 28,
        background: `linear-gradient(160deg, ${C.teal} 0%, #0a564a 55%, #083f37 100%)`,
        color: "#fff", padding: 30, display: "flex", flexDirection: "column",
        justifyContent: "space-between", boxShadow: "0 24px 60px rgba(0,0,0,.4)",
        animation: "pop .3s ease", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160,
          borderRadius: "50%", background: "rgba(240,121,91,.25)" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
          <LogoMark size={26} />
          <span style={{ fontFamily: FONT.display, fontSize: 19, fontWeight: 800, letterSpacing: -0.3 }}>Freed</span>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 15, opacity: .85, fontWeight: 600 }}>I've been smoke-free for</div>
          <div style={{ ...numStyle, fontSize: 84, fontWeight: 900, letterSpacing: -3, lineHeight: .95 }}>{days}</div>
          <div style={{ fontSize: 22, fontWeight: 700, opacity: .9 }}>{days === 1 ? "day" : "days"}</div>
        </div>
        <div style={{ position: "relative", display: "flex", gap: 22 }}>
          <div>
            <div style={{ ...numStyle, fontSize: 23, fontWeight: 800 }}>{money(saved)}</div>
            <div style={{ fontSize: 12, opacity: .8, fontWeight: 600 }}>saved</div>
          </div>
          <div>
            <div style={{ ...numStyle, fontSize: 23, fontWeight: 800 }}>{fmt(lifeMin / 60)}</div>
            <div style={{ fontSize: 12, opacity: .8, fontWeight: 600 }}>hrs reclaimed</div>
          </div>
          <div>
            <div style={{ ...numStyle, fontSize: 23, fontWeight: 800 }}>{fmt(cigsAvoided)}</div>
            <div style={{ fontSize: 12, opacity: .8, fontWeight: 600 }}>avoided</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20, width: "100%", maxWidth: 340 }}>
        <button onClick={doShare} style={{ flex: 1, padding: "15px 0", borderRadius: 15,
          border: "none", background: C.coral, color: "#fff", fontSize: 16, fontWeight: 700 }}>
          Share
        </button>
        <button onClick={onClose} style={{ padding: "15px 22px", borderRadius: 15,
          border: "none", background: "rgba(255,255,255,.9)", color: C.ink, fontSize: 16, fontWeight: 700 }}>
          Close
        </button>
      </div>
      {status && <div style={{ color: "#fff", fontSize: 13, marginTop: 12, fontWeight: 600 }}>{status}</div>}
    </div>
  );
}

// ── Relapse confirmation sheet ──────────────────────────────────
function RelapseSheet({ onCancel, onConfirm }) {
  const [note, setNote] = useState("");
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(28,43,42,.45)", display: "flex", alignItems: "flex-end",
      justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440,
        background: C.card, borderRadius: "26px 26px 0 0", padding: "24px 22px 30px",
        animation: "pop .25s ease" }}>
        <div style={{ width: 40, height: 4, background: C.line, borderRadius: 4,
          margin: "0 auto 14px" }} />
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <Mascot size={72} mood="support" />
        </div>
        <h2 style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 800, margin: "0 0 6px", letterSpacing: -.5, textAlign: "center" }}>
          A slip isn't a failure
        </h2>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, margin: "0 0 16px", textAlign: "center" }}>
          We'll save this streak to your history so you can see how far you came, then start a fresh count. What triggered it? (optional)
        </p>
        <input value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. stress at work, after dinner…"
          style={{ width: "100%", padding: "13px 14px", borderRadius: 13, fontSize: 14,
            border: `1.5px solid ${C.line}`, marginBottom: 16, outline: "none",
            fontFamily: "inherit" }} />
        <button onClick={() => onConfirm(note.trim())} style={{ width: "100%", padding: "15px 0",
          borderRadius: 15, border: "none", background: C.coral, color: "#fff",
          fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
          Save streak & restart
        </button>
        <button onClick={onCancel} style={{ width: "100%", padding: "13px 0", borderRadius: 15,
          border: "none", background: "transparent", color: C.muted, fontSize: 15, fontWeight: 600 }}>
          Never mind, I'm still going
        </button>
      </div>
    </div>
  );
}

// ── You / profile + streak history ──────────────────────────────
function You({ history, best, elapsedMs, setup, prod, reminders, setReminders, onReset }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const attempts = history.length + 1;
  const totalSmokeFree = history.reduce((s, h) => s + h.durationMs, 0) + elapsedMs;
  const bestEver = Math.max(best, elapsedMs);

  return (
    <div style={{ animation: "pop .35s ease" }}>
      <Header sub="Your journey" title="You" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        <Stat accent={C.teal} label="Longest streak" value={fmtDur(bestEver)} small />
        <Stat accent={C.coral} label="Attempts" value={String(attempts)} small />
        <Stat accent={C.sage} label="Total smoke-free" value={fmtDur(totalSmokeFree)} small />
        <Stat accent={C.teal} label="Current streak" value={fmtDur(elapsedMs)} small />
      </div>

      <SectionTitle>Streak history</SectionTitle>
      {history.length === 0 ? (
        <div style={{ background: C.card, border: `1px dashed ${C.line}`, borderRadius: 16,
          padding: 20, textAlign: "center", color: C.muted, fontSize: 14 }}>
          No past streaks yet. Every clean minute from here counts.
        </div>
      ) : (
        history.map((h, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.line}`,
            borderRadius: 16, padding: "14px 16px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: C.teal }}>{fmtDur(h.durationMs)}</span>
              <span style={{ fontSize: 12, color: C.muted }}>
                {new Date(h.start).toLocaleDateString()} – {new Date(h.end).toLocaleDateString()}
              </span>
            </div>
            {h.note && <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Trigger: {h.note}</div>}
          </div>
        ))
      )}

      <SectionTitle>Settings</SectionTitle>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
        padding: "14px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between",
        alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Daily reminder</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Show a motivational note on Home</div>
        </div>
        <button onClick={() => setReminders((r) => !r)} style={{ width: 50, height: 30, borderRadius: 20,
          border: "none", background: reminders ? C.teal : C.line, position: "relative",
          transition: "background .2s" }}>
          <span style={{ position: "absolute", top: 3, left: reminders ? 23 : 3, width: 24, height: 24,
            borderRadius: "50%", background: "#fff", transition: "left .2s",
            boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
        </button>
      </div>

      {!confirmReset ? (
        <button onClick={() => setConfirmReset(true)} style={{ width: "100%", padding: "14px 0",
          borderRadius: 14, border: `1.5px solid ${C.line}`, background: "transparent",
          color: C.coral, fontSize: 14, fontWeight: 700 }}>
          Reset everything
        </button>
      ) : (
        <div style={{ background: C.coralSoft, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Erase all data?</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
            This clears your streak, history, and habit settings. It can't be undone.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onReset} style={{ flex: 1, padding: "12px 0", borderRadius: 12,
              border: "none", background: C.coral, color: "#fff", fontWeight: 700, fontSize: 14 }}>
              Yes, erase
            </button>
            <button onClick={() => setConfirmReset(false)} style={{ flex: 1, padding: "12px 0",
              borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.card,
              color: C.ink, fontWeight: 700, fontSize: 14 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <div style={{ textAlign: "center", color: C.muted, fontSize: 12, marginTop: 20 }}>
        {prod.icon} {prod.label} · {setup.perDay}/day · {money(setup.packCost)}/pack
      </div>
    </div>
  );
}

const NAV_ICONS = {
  home: "M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9",
  money: "M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1-4 2.7c0 3.8 8 1.8 8 5.6 0 1.8-1.8 3-4 3s-4-1.2-4-3",
  health: "M12 20s-7-4.6-9.3-9C1 7.7 2.6 4.5 6 4.5c2 0 3.2 1.2 4 2.4.8-1.2 2-2.4 4-2.4 3.4 0 5 3.2 3.3 6.5C19 15.4 12 20 12 20Z",
  breathe: "M3 12h4l2-5 3 10 2-7 2 4h5",
  you: "M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
};

function Nav({ tab, setTab }) {
  const items = [
    ["home", "Home"], ["money", "Money"], ["health", "Health"],
    ["breathe", "Breathe"], ["you", "You"],
  ];
  return (
    <div style={{ position: "fixed", bottom: "max(16px, env(safe-area-inset-bottom))",
      left: "50%", transform: "translateX(-50%)",
      width: "calc(100% - 40px)", maxWidth: 400, background: C.ink, borderRadius: 22,
      display: "flex", padding: 6, boxShadow: "0 12px 30px rgba(0,0,0,.22)" }}>
      {items.map(([k, label]) => {
        const active = tab === k;
        return (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, border: "none", background: active ? C.teal : "transparent",
            color: active ? "#fff" : "#9FB0AD", borderRadius: 16, padding: "9px 0",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            transition: "background .25s, color .25s" }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={active ? 2.4 : 2}
              strokeLinecap="round" strokeLinejoin="round">
              <path d={NAV_ICONS[k]} />
            </svg>
            <span style={{ fontSize: 11, fontWeight: active ? 700 : 600 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
