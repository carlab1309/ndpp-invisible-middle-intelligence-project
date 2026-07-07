import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  SCENARIOS,
  type ScenarioId,
  type Signal,
  type SignalFamily,
  type StructuralCondition,
  type ConditionStrengthSample,
  type MechanismStrengthSample,
  type ConditionInteractionMap,
  type ExecutiveAssessment,
  type ContainmentStatus,
  type CommercialIntelligence,
  type CapacityIntelligence,
  generateSignal,
  interpret,
  familyCounts,
  computeTrajectory,
  computeDrivers,
  computeInteractions,
  computeContainment,
  computeExecutiveAssessment,
  computeCommercialIntelligence,
  computeCapacityIntelligence,
  commercialForCondition,
  humanMechanismLabel,
} from "@/lib/imi-engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Invisible Middle Intelligence — Live Console" },
      {
        name: "description",
        content:
          "An interactive prototype of the Invisible Middle Intelligence Layer: structural interpretation of hidden human compensation beneath functional systems.",
      },
      { property: "og:title", content: "Invisible Middle Intelligence — Live Console" },
      {
        property: "og:description",
        content:
          "Detect hidden compensation, burden transfer and containment instability beneath outwardly functional operations.",
      },
    ],
  }),
  component: Console,
});

const FAMILIES: SignalFamily[] = [
  "Behavioural",
  "Workflow",
  "Communication",
  "Governance",
  "AI Interaction",
  "Escalation",
  "Closure",
  "Trust",
  "Continuity",
  "Compensation",
];

function Console() {
  const [scenario, setScenario] = useState<ScenarioId>("baseline");
  const [running, setRunning] = useState(true);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [now, setNow] = useState(Date.now());
  const timer = useRef<number | null>(null);
  const tick = useRef<number | null>(null);

  // Signal generator
  useEffect(() => {
    if (!running) return;
    const interval = scenario === "flourishing" ? 3500 : 1800;
    timer.current = window.setInterval(() => {
      setSignals((prev) => {
        const next = [...prev, generateSignal(scenario)];
        return next.slice(-60);
      });
    }, interval);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [running, scenario]);

  // Clock for time-weighting
  useEffect(() => {
    tick.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
    };
  }, []);

  const rawConditions = useMemo(() => interpret(signals, now), [signals, now]);

  // Maintain a short rolling history of per-condition strength so we can
  // compute trajectory (NDPP: condition formation through time).
  const historyRef = useRef<Record<string, ConditionStrengthSample[]>>({});
  // Per-condition history of mechanism point contributions, so we can
  // compute which mechanisms are currently driving condition change.
  const mechHistoryRef = useRef<Record<string, MechanismStrengthSample[]>>({});
  useEffect(() => {
    const store = historyRef.current;
    const mechStore = mechHistoryRef.current;
    const active = new Set(rawConditions.map((c) => c.id));
    for (const c of rawConditions) {
      const arr = store[c.id] ?? [];
      arr.push({ ts: now, strength: c.strength });
      const cutoff = now - 90_000;
      store[c.id] = arr.filter((s) => s.ts >= cutoff).slice(-60);

      const mArr = mechStore[c.id] ?? [];
      const pointsMap: Record<string, number> = {};
      for (const m of c.mechanisms) pointsMap[m.label] = m.points;
      mArr.push({ ts: now, points: pointsMap });
      mechStore[c.id] = mArr.filter((s) => s.ts >= cutoff).slice(-60);
    }
    // Decay disappeared conditions so Recovering/Resolved can register
    for (const id of Object.keys(store)) {
      if (active.has(id as StructuralCondition["id"])) continue;
      const arr = store[id];
      const lastSample = arr[arr.length - 1];
      if (lastSample && lastSample.strength > 0.02) {
        arr.push({ ts: now, strength: 0 });
        const cutoff = now - 90_000;
        store[id] = arr.filter((s) => s.ts >= cutoff).slice(-60);
      }
      const mArr = mechStore[id];
      if (mArr && mArr.length) {
        mArr.push({ ts: now, points: {} });
        const cutoff = now - 90_000;
        mechStore[id] = mArr.filter((s) => s.ts >= cutoff).slice(-60);
      }
    }
  }, [rawConditions, now]);

  const conditions = useMemo<StructuralCondition[]>(
    () =>
      rawConditions.map((c) => ({
        ...c,
        trajectory: computeTrajectory(historyRef.current[c.id] ?? [], c.strength, now),
        drivers: computeDrivers(mechHistoryRef.current[c.id] ?? [], c.mechanisms, now),
      })),
    [rawConditions, now]
  );

  const counts = useMemo(() => familyCounts(signals), [signals]);
  const totalBurden = useMemo(
    () => conditions.reduce((a, c) => a + c.strength, 0),
    [conditions]
  );
  const interactions = useMemo(() => computeInteractions(conditions), [conditions]);
  const executive = useMemo(
    () => computeExecutiveAssessment(conditions, interactions),
    [conditions, interactions]
  );
  const commercial = useMemo(
    () => computeCommercialIntelligence(conditions, executive),
    [conditions, executive]
  );
  const capacity = useMemo(
    () => computeCapacityIntelligence(conditions, executive),
    [conditions, executive]
  );

  const containmentScore = Math.max(
    0,
    Math.min(100, Math.round(100 - totalBurden * 18))
  );

  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    try {
      if (!window.localStorage.getItem("imi.onboarded.v44")) {
        setShowOnboarding(true);
      }
    } catch {
      /* ignore */
    }
  }, []);
  const dismissOnboarding = () => {
    try {
      window.localStorage.setItem("imi.onboarded.v44", "1");
    } catch {
      /* ignore */
    }
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showOnboarding ? <Onboarding onBegin={dismissOnboarding} /> : null}
      <Header onOpenOnboarding={() => setShowOnboarding(true)} />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-6 lg:px-10">
        <Masthead />

        <ScenarioBar
          scenario={scenario}
          onChange={setScenario}
          running={running}
          onToggleRunning={() => setRunning((r) => !r)}
          onReset={() => setSignals([])}
        />

        <div className="mt-8">
          <ExecutiveHero
            assessment={executive}
            commercial={commercial}
            capacity={capacity}
          />
        </div>


        <SupportingDivider />

        <div className="mt-6 grid grid-cols-1 gap-6 opacity-95 lg:grid-cols-12">
          {/* Left: signal stream + families */}
          <section className="lg:col-span-5 flex flex-col gap-6">
            <SignalStream signals={signals.slice().reverse()} />
            <FamilyPanel counts={counts} />
          </section>

          {/* Right: structural conditions + score */}
          <section className="lg:col-span-7 flex flex-col gap-6">
            <ContainmentGauge
              score={containmentScore}
              burden={totalBurden}
              conditionsCount={conditions.length}
            />
            <ConditionsPanel conditions={conditions} />
            <InteractionPanel interactions={interactions} />
          </section>
        </div>

        <details className="mt-6 group">
          <summary className="text-mono cursor-pointer list-none rounded-md border border-border/60 bg-surface/60 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary">
            <span className="inline-block transition-transform group-open:rotate-90">▸</span>{" "}
            Full executive briefing (all detail)
          </summary>
          <div className="mt-4">
            <ExecutiveAssessmentPanel assessment={executive} />
          </div>
        </details>

        <Footer />
      </main>
    </div>
  );
}

function SupportingDivider() {
  return (
    <div className="mt-14 mb-2 flex items-center gap-4">
      <span className="text-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        Supporting evidence
      </span>
      <span className="h-px flex-1 bg-border/60" />
      <span className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
        Signals · families · conditions · interactions
      </span>
    </div>
  );
}

function Masthead() {
  return (
    <div className="border-b border-border/60 pb-4">
      <p className="text-mono text-[10px] uppercase tracking-[0.24em] text-primary">
        NDPP · Invisible Middle Intelligence
      </p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        Executive situation, right now.
      </h1>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Header({ onOpenOnboarding }: { onOpenOnboarding: () => void }) {
  return (
    <header className="border-b border-border/60 bg-surface/60 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="relative h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-full bg-primary animate-pulse-dot" />
          </div>
          <span className="text-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            NDPP / Invisible Middle Intelligence
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="text-mono cursor-pointer text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
          >
            How this works
          </button>
          <span className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            v1 · live console
          </span>
        </div>
      </div>
    </header>
  );
}

function Onboarding({ onBegin }: { onBegin: () => void }) {
  const steps = [
    "Operational Signals",
    "Hidden Work",
    "Lost Capacity",
    "Understanding",
    "Better Decisions",
    "Recovered Capacity",
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="imi-onboarding-title"
    >
      <div className="relative max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl border border-border/70 bg-surface shadow-2xl">
        <div
          className="px-6 py-8 sm:px-10 sm:py-10"
          style={{
            background:
              "radial-gradient(120% 100% at 0% 0%, color-mix(in oklch, var(--primary) 14%, transparent), transparent 60%)",
          }}
        >
          <p className="text-mono text-[10px] uppercase tracking-[0.24em] text-primary">
            Executive briefing · introduction
          </p>
          <h2
            id="imi-onboarding-title"
            className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Welcome to Your Executive Intelligence Briefing
          </h2>
          <p className="text-mono mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Powered by the Invisible Middle Intelligence Engine
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            This platform helps leaders understand where hidden work is quietly reducing
            organisational capacity. Rather than reporting isolated issues, it identifies
            patterns that explain why unnecessary effort is building across the organisation.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The goal is not simply to identify problems. The goal is to help leaders
            understand where capacity is being lost, why it is happening and where
            intervention is likely to have the greatest impact.
          </p>
        </div>

        <div className="border-t border-border/60 px-6 py-6 sm:px-10">
          <p className="text-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            How the platform works
          </p>
          <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-1.5 text-foreground">
                  {s}
                </span>
                {i < steps.length - 1 ? (
                  <span className="text-primary" aria-hidden>
                    ↓
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            The platform analyses patterns across the organisation to understand how hidden
            work forms, how it affects capacity and where structural changes are most likely
            to improve organisational performance.
          </p>
        </div>

        <div className="border-t border-border/60 px-6 py-6 sm:px-10">
          <p className="text-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            What you will see
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-foreground sm:grid-cols-2">
            {[
              "What is happening across the organisation.",
              "Why it is happening.",
              "What people are currently carrying.",
              "Where organisational capacity is being consumed.",
              "The highest-impact change available.",
              "What is likely to happen if nothing changes.",
            ].map((line) => (
              <li key={line} className="relative pl-4 leading-snug">
                <span
                  className="absolute left-0 top-2 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "var(--primary)" }}
                  aria-hidden
                />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border/60 bg-surface-2/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Most executive summaries can be understood in under three minutes. Additional
            evidence is available throughout the report.
          </p>
          <button
            type="button"
            onClick={onBegin}
            className="cursor-pointer rounded-md px-5 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors"
            style={{ backgroundColor: "var(--primary)" }}
          >
            Begin Executive Briefing
          </button>
        </div>
      </div>
    </div>
  );
}

function Intro() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-surface">
      <div className="absolute inset-0 grid-bg opacity-30" aria-hidden />
      <div className="relative px-6 py-10 lg:px-10 lg:py-14">
        <p className="text-mono text-[11px] uppercase tracking-[0.2em] text-primary">
          Condition formation intelligence
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-foreground sm:text-4xl lg:text-5xl">
          The system looks functional.
          <br />
          <span className="text-muted-foreground">Humans are quietly carrying the rest.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          The Invisible Middle Intelligence Engine interprets how operational signals
          accumulate into hidden compensation, how compensation forms architecture conditions,
          and how those conditions trace back to underlying system design.
        </p>
        <div className="text-mono mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>What we're seeing</span>
          <span className="text-primary">→</span>
          <span>What people are doing to keep things working</span>
          <span className="text-primary">→</span>
          <span>What's actually going wrong</span>
          <span className="text-primary">→</span>
          <span>Why it's happening</span>
          <span className="text-primary">→</span>
          <span className="text-foreground">What leaders should do next</span>
        </div>

      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ScenarioBar({
  scenario,
  onChange,
  running,
  onToggleRunning,
  onReset,
}: {
  scenario: ScenarioId;
  onChange: (id: ScenarioId) => void;
  running: boolean;
  onToggleRunning: () => void;
  onReset: () => void;
}) {
  const ids = Object.keys(SCENARIOS) as ScenarioId[];
  return (
    <div className="mt-8 rounded-xl border border-border/60 bg-surface p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Inject scenario
          </p>
          <p className="mt-1 text-sm text-foreground">
            {SCENARIOS[scenario].description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleRunning}
            className="text-mono rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            {running ? "⏸ Pause" : "▶ Resume"}
          </button>
          <button
            onClick={onReset}
            className="text-mono rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            Reset
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {ids.map((id) => {
          const active = id === scenario;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`text-mono rounded-md border px-3 py-2 text-[11px] uppercase tracking-[0.14em] transition-all ${
                active
                  ? "border-primary bg-primary/10 text-primary glow-primary"
                  : "border-border bg-surface-2 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {SCENARIOS[id].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SignalStream({ signals }: { signals: Signal[] }) {
  return (
    <Panel
      label="What the system is picking up"
      caption="Raw signals from the day — read as evidence, not assumptions"
    >
      <div className="max-h-[420px] overflow-y-auto">
        {signals.length === 0 ? (
          <EmptyState text="Waiting for the first signal…" />

        ) : (
          <ul className="divide-y divide-border/60">
            {signals.map((s) => (
              <li key={s.id} className="animate-signal-in px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FamilyTag family={s.family} />
                      <span className="text-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {s.source}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-sm font-medium text-foreground">
                      {s.name}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {s.detail}
                    </p>
                  </div>
                  <span className="text-mono shrink-0 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {timeAgo(s.ts)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

function timeAgo(ts: number) {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 5) return "now";
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m`;
}

const FAMILY_HUE: Record<SignalFamily, string> = {
  Behavioural: "oklch(0.78 0.14 280)",
  Workflow: "oklch(0.78 0.14 200)",
  Communication: "oklch(0.78 0.14 320)",
  Governance: "oklch(0.78 0.14 60)",
  "AI Interaction": "oklch(0.78 0.16 195)",
  Escalation: "oklch(0.72 0.18 45)",
  Closure: "oklch(0.75 0.16 155)",
  Trust: "oklch(0.78 0.14 350)",
  Continuity: "oklch(0.78 0.14 240)",
  Compensation: "oklch(0.72 0.18 25)",
};

function FamilyTag({ family }: { family: SignalFamily }) {
  const color = FAMILY_HUE[family];
  return (
    <span
      className="text-mono inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em]"
      style={{
        borderColor: `color-mix(in oklch, ${color} 40%, transparent)`,
        color,
        backgroundColor: `color-mix(in oklch, ${color} 8%, transparent)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {family}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

function FamilyPanel({ counts }: { counts: Record<SignalFamily, number> }) {
  const max = Math.max(1, ...FAMILIES.map((f) => counts[f] ?? 0));
  return (
    <Panel label="Where the signals are coming from" caption="Signals across many areas strengthen what we can conclude">
      <div className="space-y-2 px-4 py-4">
        {FAMILIES.map((f) => {
          const n = counts[f] ?? 0;
          const pct = (n / max) * 100;
          const color = FAMILY_HUE[f];
          return (
            <div key={f} className="flex items-center gap-3">
              <span className="text-mono w-32 shrink-0 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {f}
              </span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                    boxShadow: n > 0 ? `0 0 12px -4px ${color}` : undefined,
                  }}
                />
              </div>
              <span className="text-mono w-6 text-right text-[11px] text-muted-foreground">
                {n}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */

function ContainmentGauge({
  score,
  burden,
  conditionsCount,
}: {
  score: number;
  burden: number;
  conditionsCount: number;
}) {
  const status =
    score >= 75
      ? { label: "Holding together well", tone: "var(--flourish)" }
      : score >= 50
        ? { label: "Beginning to strain", tone: "var(--signal-moderate)" }
        : score >= 25
          ? { label: "Struggling to hold", tone: "var(--signal-elevated)" }
          : { label: "Coming apart", tone: "var(--signal-critical)" };

  return (
    <Panel label="Can the system still hold together?" caption="Overall stability across everything we're seeing right now">
      <div className="px-6 py-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p
              className="text-mono text-[11px] uppercase tracking-[0.18em]"
              style={{ color: status.tone }}
            >
              {status.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Overall stability</p>
            <p className="mt-2 text-5xl font-semibold tracking-tight text-foreground">
              {score}
              <span className="text-2xl text-muted-foreground">/100</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-right">
            <Metric label="Active problems" value={conditionsCount} />
            <Metric label="Total strain" value={burden.toFixed(2)} />
          </div>
        </div>
        <div className="relative mt-6 h-3 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${score}%`,
              background: `linear-gradient(90deg, ${status.tone}, color-mix(in oklch, ${status.tone} 60%, transparent))`,
              boxShadow: `0 0 16px -4px ${status.tone}`,
            }}
          />
        </div>
      </div>
    </Panel>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="text-mono mt-1 text-lg text-foreground">{value}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ConditionsPanel({ conditions }: { conditions: StructuralCondition[] }) {
  return (
    <Panel
      label="What's happening in the organisation"
      caption="Each issue, why it's forming, and what to change"
    >
      {conditions.length === 0 ? (
        <EmptyState text="Nothing significant to report yet." />
      ) : (
        <ul className="divide-y divide-border/60">
          {conditions.map((c) => (
            <ConditionRow key={c.id} c={c} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ConditionRow({ c }: { c: StructuralCondition }) {
  const tone = severityTone(c.severity);
  const pct = Math.round(c.strength * 100);
  const containment = useMemo(() => computeContainment(c), [c]);
  const cTone = containmentTone(containment.status);
  return (
    <li className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-mono inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em]"
              style={{
                color: tone,
                borderColor: `color-mix(in oklch, ${tone} 40%, transparent)`,
                backgroundColor: `color-mix(in oklch, ${tone} 10%, transparent)`,
                border: "1px solid",
              }}
            >
              {c.severity}
            </span>
            <h3 className="text-sm font-semibold text-foreground">{c.displayLabel ?? c.label}</h3>
          </div>
          {c.displayLabel && c.displayLabel !== c.label ? (
            <p className="text-mono mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
              {c.label}
            </p>
          ) : null}
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {c.description}
          </p>
        </div>
        <div className="shrink-0 space-y-1.5 text-right">
          <div>
            <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Severity
            </p>
            <p className="text-mono mt-0.5 text-lg leading-none" style={{ color: tone }}>
              {pct}%
            </p>
          </div>
          <div className="mt-1">
            <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Can this still be stabilised?
            </p>
            <p className="text-mono mt-0.5 text-sm" style={{ color: cTone }}>
              {containment.status}
            </p>
            <details className="group/ct mt-0.5">
              <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary">
                <span className="inline-block transition-transform group-open/ct:rotate-90">▸</span>{" "}
                Why
              </summary>
              <ul className="mt-1.5 space-y-0.5 pl-3 text-right">
                {containment.reasons.map((r) => (
                  <li
                    key={r}
                    className="text-[11px] text-muted-foreground"
                  >
                    • {r}
                  </li>
                ))}
              </ul>
            </details>
          </div>
          <div>
            <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              How much evidence supports this
            </p>
            <p className="text-mono mt-0.5 text-sm" style={{ color: tone }}>
              {c.evidenceMaturity}
            </p>
          </div>
          <details className="group/ev mt-1">
            <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary">
              <span className="inline-block transition-transform group-open/ev:rotate-90">▸</span>{" "}
              Why we're confident
            </summary>
            <ul className="mt-1.5 space-y-0.5 pl-3">
              {c.evidenceRationale.map((r) => (
                <li
                  key={r}
                  className="relative pl-3 text-[11px] text-muted-foreground before:absolute before:left-0 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-border"
                >
                  {r}
                </li>
              ))}
            </ul>
          </details>
          {c.trajectory && (
            <div className="mt-2">
              <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Direction of travel
              </p>
              <p
                className="text-mono mt-0.5 inline-flex items-center gap-1 text-sm"
                style={{ color: trajectoryTone(c.trajectory.state, tone) }}
              >
                <span aria-hidden>{trajectoryGlyph(c.trajectory.state)}</span>
                {c.trajectory.state}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {c.trajectory.description}
              </p>
              <details className="group/tr mt-1">
                <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary">
                  <span className="inline-block transition-transform group-open/tr:rotate-90">▸</span>{" "}
                  Why this direction
                </summary>
                <ul className="mt-1.5 space-y-0.5 pl-3">
                  {c.trajectory.rationale.map((r) => (
                    <li
                      key={r}
                      className="relative pl-3 text-[11px] text-muted-foreground before:absolute before:left-0 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-border"
                    >
                      {r}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: tone,
            boxShadow: `0 0 10px -3px ${tone}`,
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {c.contributingFamilies.map((f) => (
          <FamilyTag key={f} family={f} />
        ))}
      </div>

      {c.drivers && (c.drivers.drivers.length > 0 || c.drivers.stabilisers.length > 0) ? (
        <DriversBlock drivers={c.drivers} tone={tone} />
      ) : null}

      <details className="group mt-3">
        <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary">
          <span className="inline-block transition-transform group-open:rotate-90">▸</span>{" "}
          What people are doing to keep things working
        </summary>
        <div className="mt-3 rounded-md border border-border/60 bg-surface-2/60">
          <p className="text-mono px-3 pt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            The extra work people are quietly carrying right now
          </p>
          <ul className="divide-y divide-border/40">
            {c.mechanisms.map((m) => {
              const share = pct > 0 ? Math.round((m.points / pct) * 100) : 0;
              return (
                <li key={m.label} className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-foreground">
                      {m.displayLabel ?? m.label}
                    </span>
                    <span className="text-mono shrink-0 text-[11px]" style={{ color: tone }}>
                      {share}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${share}%`,
                        backgroundColor: tone,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <p className="text-mono mt-2 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    What we're seeing
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {m.signalNames.map((n) => (
                      <li
                        key={n}
                        className="relative pl-3 text-[11px] text-muted-foreground before:absolute before:left-0 before:top-2 before:h-px before:w-1.5 before:bg-border"
                      >
                        {n}
                      </li>
                    ))}
                  </ul>
                  <details className="group/why mt-2">
                    <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary">
                      <span className="inline-block transition-transform group-open/why:rotate-90">▸</span>{" "}
                      Why we're calling it this
                    </summary>
                    <ul className="mt-1.5 space-y-0.5 pl-3">
                      {m.evidence.map((e) => (
                        <li
                          key={e}
                          className="relative pl-3 text-[11px] text-muted-foreground before:absolute before:left-0 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-border"
                        >
                          {e}
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
            <span className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Overall severity of this problem
            </span>
            <span className="text-mono text-xs" style={{ color: tone }}>
              {pct}%
            </span>
          </div>
          <p className="text-mono px-3 pb-3 pt-1 text-[10px] leading-relaxed text-muted-foreground">
            Each percentage shows how much of this problem is being held together by
            that particular form of extra human effort.
          </p>
        </div>
      </details>


      {c.architecturalCauses.length > 0 ? (
        <details className="group mt-2">
          <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary">
            <span className="inline-block transition-transform group-open:rotate-90">▸</span>{" "}
            What's creating this problem?
          </summary>
          <div className="mt-2 rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
            <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              The parts of how the organisation is set up that are producing this pattern
            </p>
            <div className="mt-3 space-y-3">
              {c.architecturalCauses.map((group) => (
                <div key={group.category}>
                  <p
                    className="text-mono text-[10px] uppercase tracking-[0.14em]"
                    style={{ color: tone }}
                  >
                    {group.category}
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-foreground">
                    {group.items.map((cause) => (
                      <li key={cause} className="relative pl-4 leading-snug">
                        <span
                          className="absolute left-0 top-1.5 h-1.5 w-1.5 rotate-45"
                          style={{ backgroundColor: tone }}
                          aria-hidden
                        />
                        {cause}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-mono mt-3 border-t border-border/60 pt-2 text-[10px] leading-relaxed text-muted-foreground">
              These structural gaps are producing the extra human effort above, which is
              what turns into the problem we're seeing.
            </p>
          </div>
        </details>
      ) : null}

      <details className="group mt-2">
        <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary">
          <span className="inline-block transition-transform group-open:rotate-90">▸</span>{" "}
          What happens if nothing changes
        </summary>
        <div className="mt-2 rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
          <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            If this continues, the organisation is likely to experience
          </p>
          <ul className="mt-2 space-y-1.5">
            {c.organisationalImpact.map((i) => (
              <li
                key={i}
                className="relative pl-4 text-xs leading-snug text-foreground"
              >
                <span
                  className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: tone }}
                  aria-hidden
                />
                {i}
              </li>
            ))}
          </ul>
          <p className="text-mono mt-3 border-t border-border/60 pt-2 text-[10px] leading-relaxed text-muted-foreground">
            Left unchecked, this quietly turns into everyday business consequences leaders will feel.
          </p>
        </div>
      </details>

      <CommercialImpactBlock c={c} tone={tone} />

      <LeverageBlock c={c} tone={tone} />




      <details className="group mt-2">
        <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary">
          <span className="inline-block transition-transform group-open:rotate-90">▸</span>{" "}
          Suggested next steps
        </summary>
        <ul className="mt-2 space-y-1 pl-4 text-xs text-foreground">
          {c.responseGuidance.map((g) => (
            <li key={g} className="relative before:absolute before:-left-3 before:top-1.5 before:h-1 before:w-1 before:rounded-full before:bg-primary">
              {g}
            </li>
          ))}
        </ul>
      </details>


    </li>
  );
}



function DriversBlock({
  drivers,
  tone,
}: {
  drivers: NonNullable<StructuralCondition["drivers"]>;
  tone: string;
}) {
  return (
    <div className="mt-3 rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
      <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        What's making this worse — and what's helping
      </p>
      <p className="text-mono mt-0.5 text-[10px] leading-relaxed text-muted-foreground/80">
        What's currently pushing this problem in each direction
      </p>

      <div className="mt-3">
        <p
          className="text-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: tone }}
        >
          What's making it worse
        </p>
        {drivers.drivers.length === 0 ? (
          <p className="text-mono mt-1 text-[11px] text-muted-foreground">
            Nothing significant right now.
          </p>
        ) : (
          <ul className="mt-1.5 space-y-2">
            {drivers.drivers.map((d) => (
              <DriverRow key={d.label} d={d} tone={tone} />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 border-t border-border/60 pt-2.5">
        <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          What's helping right now
        </p>
        {drivers.stabilisers.length === 0 ? (
          <p className="text-mono mt-1 text-[11px] text-muted-foreground">
            Nothing significant right now.
          </p>
        ) : (
          <ul className="mt-1.5 space-y-2">
            {drivers.stabilisers.map((d) => (
              <DriverRow key={d.label} d={d} tone="var(--signal-low)" />
            ))}
          </ul>
        )}
      </div>

      <p className="text-mono mt-3 border-t border-border/60 pt-2 text-[10px] leading-relaxed text-muted-foreground">
        Problems don't get worse on their own — specific patterns of extra effort push them.
        This shows which patterns are pushing this one right now.
      </p>
    </div>
  );
}

function DriverRow({
  d,
  tone,
}: {
  d: NonNullable<StructuralCondition["drivers"]>["drivers"][number];
  tone: string;
}) {
  const arrow = d.direction === "up" ? "↑" : "↓";
  return (
    <li>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
          <span aria-hidden style={{ color: tone }}>
            {arrow}
          </span>
          {humanMechanismLabel(d.label)}
        </span>
        <span className="text-mono shrink-0 text-[10px] uppercase tracking-[0.12em]" style={{ color: tone }}>
          {d.contribution}
        </span>
      </div>
      <p className="mt-1 pl-4 text-[11px] leading-snug text-muted-foreground">
        {d.reason}
      </p>
    </li>
  );
}

function CommercialImpactBlock({ c, tone }: { c: StructuralCondition; tone: string }) {
  const impact = useMemo(() => commercialForCondition(c), [c]);
  if (
    impact.organisational.length === 0 &&
    impact.leadership.length === 0 &&
    impact.capacity.length === 0
  ) {
    return null;
  }
  return (
    <details className="group mt-2">
      <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary">
        <span className="inline-block transition-transform group-open:rotate-90">▸</span>{" "}
        Why this matters commercially
      </summary>
      <div className="mt-2 space-y-3 rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
        {impact.organisational.length > 0 ? (
          <div>
            <p className="text-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: tone }}>
              Organisational impact
            </p>
            <ul className="mt-1.5 space-y-1">
              {impact.organisational.map((i) => (
                <li key={i} className="relative pl-4 text-xs leading-snug text-foreground">
                  <span
                    className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: tone }}
                    aria-hidden
                  />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {impact.leadership.length > 0 ? (
          <div>
            <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Leadership impact
            </p>
            <ul className="mt-1.5 space-y-1">
              {impact.leadership.map((i) => (
                <li key={i} className="relative pl-4 text-xs leading-snug text-foreground">
                  <span
                    className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "var(--primary)" }}
                    aria-hidden
                  />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {impact.capacity.length > 0 ? (
          <div>
            <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Capacity being lost
            </p>
            <ul className="mt-1.5 space-y-1">
              {impact.capacity.map((i) => (
                <li key={i} className="relative pl-4 text-xs leading-snug text-foreground">
                  <span
                    className="text-mono absolute left-0 top-[2px]"
                    style={{ color: "var(--signal-critical)" }}
                    aria-hidden
                  >
                    −
                  </span>
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-mono border-t border-border/60 pt-2 text-[10px] leading-relaxed text-muted-foreground">
          Derived from the extra effort people are currently carrying for this condition.
        </p>
      </div>
    </details>
  );
}

function LeverageBlock({ c, tone }: { c: StructuralCondition; tone: string }) {
  const impactTone = (impact: string) =>
    impact === "Very High"
      ? "var(--signal-critical)"
      : impact === "High"
        ? "var(--signal-elevated)"
        : impact === "Moderate"
          ? "var(--signal-moderate)"
          : "var(--signal-low)";
  const effortTone = (effort: string) =>
    effort === "Low"
      ? "var(--signal-low)"
      : effort === "Medium"
        ? "var(--signal-moderate)"
        : "var(--signal-elevated)";

  return (
    <details className="group mt-2">
      <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary">
        <span className="inline-block transition-transform group-open:rotate-90">▸</span>{" "}
        What to change first
      </summary>
      <div className="mt-2 space-y-3">
        {/* Highest leverage point */}
        <div className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
          <p className="text-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: tone }}>
            The one change most likely to help
          </p>
          <p className="mt-1.5 text-sm font-medium text-foreground">
            {c.leverage.displayStatement ?? c.leverage.statement}
          </p>
          <p className="text-mono mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Extra effort this would reduce
          </p>
          <ul className="mt-1 space-y-0.5">
            {(c.leverage.expectedEffectDisplay ?? c.leverage.expectedEffect).map((m) => (
              <li
                key={m}
                className="inline-flex items-center gap-1.5 pr-2 text-[11px] text-foreground/85"
              >
                <span aria-hidden style={{ color: tone }}>↓</span>
                {m}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                How much of the problem this addresses
              </p>
              <p className="text-mono text-xs text-muted-foreground">
                Estimated share of the problem this would reduce
              </p>
            </div>
            <p className="text-mono text-lg leading-none" style={{ color: tone }}>
              {c.leverage.estimatedInfluence}%
            </p>
          </div>
          <p className="text-mono mt-3 border-t border-border/60 pt-2 text-[10px] leading-relaxed text-muted-foreground">
            {c.leverage.reason}
          </p>
        </div>

        {/* Intervention priority */}
        <div className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
          <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Order of things to do
          </p>
          <ol className="mt-2 space-y-2.5">
            {c.interventionPriorities.map((p, i) => (
              <li key={p.title}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      <span
                        className="text-mono mr-1.5 text-[10px] uppercase tracking-[0.12em]"
                        style={{ color: tone }}
                      >
                        Step {i + 1}
                      </span>
                      {p.displayTitle ?? p.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      {p.reason}
                    </p>
                  </div>
                  <div className="shrink-0 space-y-0.5 text-right">
                    <p
                      className="text-mono text-[10px] uppercase tracking-[0.12em]"
                      style={{ color: impactTone(p.impact) }}
                    >
                      {p.impact}
                    </p>
                    <p
                      className="text-mono text-[10px] uppercase tracking-[0.12em]"
                      style={{ color: effortTone(p.effort) }}
                    >
                      effort: {p.effort.toLowerCase()}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-mono mt-3 border-t border-border/60 pt-2 text-[10px] leading-relaxed text-muted-foreground">
            Ordered by how much they'll help versus how much effort they take.
          </p>
        </div>

        {/* Expected organisational improvement */}
        <div className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
          <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            What should improve as a result
          </p>
          <ul className="mt-2 space-y-1.5">
            {c.expectedImprovement.map((i) => (
              <li
                key={i}
                className="relative pl-4 text-xs leading-snug text-foreground"
              >
                <span
                  className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: tone }}
                  aria-hidden
                />
                {i}
              </li>
            ))}
          </ul>
          <p className="text-mono mt-3 border-t border-border/60 pt-2 text-[10px] leading-relaxed text-muted-foreground">
            The everyday improvements a leader should expect to see if this change is made.
          </p>
        </div>
      </div>
    </details>
  );
}



function severityTone(s: StructuralCondition["severity"]) {
  switch (s) {
    case "critical":
      return "var(--signal-critical)";
    case "elevated":
      return "var(--signal-elevated)";
    case "moderate":
      return "var(--signal-moderate)";
    default:
      return "var(--signal-low)";
  }
}

function trajectoryTone(
  state: NonNullable<StructuralCondition["trajectory"]>["state"],
  severityColor: string
) {
  switch (state) {
    case "Escalating":
      return "var(--signal-critical)";
    case "Entrenching":
      return "var(--signal-elevated)";
    case "Stabilising":
      return "var(--signal-moderate)";
    case "Recovering":
      return "var(--signal-low)";
    case "Resolved":
      return "var(--muted-foreground)";
    case "Emerging":
    default:
      return severityColor;
  }
}

function trajectoryGlyph(
  state: NonNullable<StructuralCondition["trajectory"]>["state"]
) {
  switch (state) {
    case "Escalating":
      return "▲";
    case "Recovering":
      return "▼";
    case "Entrenching":
      return "■";
    case "Stabilising":
      return "▬";
    case "Resolved":
      return "○";
    case "Emerging":
    default:
      return "◌";
  }
}

/* -------------------------------------------------------------------------- */

function Panel({
  label,
  caption,
  children,
}: {
  label: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-surface">
      <div className="flex items-baseline justify-between border-b border-border/60 px-5 py-3">
        <p className="text-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
          {label}
        </p>
        {caption ? (
          <p className="text-mono hidden text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:block">
            {caption}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function InteractionPanel({ interactions }: { interactions: ConditionInteractionMap }) {
  const { edges, primary, downstream, multiplier } = interactions;
  const influenceTone = (s: "High" | "Medium" | "Low") =>
    s === "High"
      ? "var(--signal-critical)"
      : s === "Medium"
        ? "var(--signal-elevated)"
        : "var(--signal-moderate)";

  return (
    <Panel
      label="How the problems connect"
      caption="Which problem is driving the others — and the single change that helps most"
    >
      {edges.length === 0 ? (
        <EmptyState text="No connections between problems yet." />
      ) : (
        <div className="space-y-5 px-5 py-5">
          {/* INTERACTION MAP */}
          <div>
            <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              How the problems connect
            </p>
            <p className="text-mono mt-0.5 text-[10px] leading-relaxed text-muted-foreground/80">
              Which problems are currently making other problems worse
            </p>
            <ul className="mt-3 space-y-3">
              {edges.map((e) => {
                const tone = influenceTone(e.influence);
                return (
                  <li
                    key={e.from}
                    className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-foreground">
                        {e.fromLabel}
                      </span>
                      <span
                        className="text-mono shrink-0 text-[10px] uppercase tracking-[0.12em]"
                        style={{ color: tone }}
                      >
                        Influence · {e.influence}
                      </span>
                    </div>
                    <p className="text-mono mt-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Making these worse
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {e.toLabels.map((t) => (
                        <li
                          key={t}
                          className="relative pl-4 text-[11px] text-foreground"
                        >
                          <span
                            className="absolute left-0 top-2 h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: tone }}
                            aria-hidden
                          />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* PRIMARY UPSTREAM */}
          {primary ? (
            <div className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
              <p
                className="text-mono text-[10px] uppercase tracking-[0.16em]"
                style={{ color: "var(--signal-critical)" }}
              >
                Biggest problem driving the others
              </p>
              <p className="mt-1.5 text-sm font-semibold text-foreground">
                {primary.label}
              </p>
              <p className="text-mono mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Currently making these worse
              </p>
              <ul className="mt-1 space-y-0.5">
                {primary.contributingTo.map((t) => (
                  <li
                    key={t}
                    className="relative pl-4 text-[11px] text-foreground before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full"
                    style={{}}
                  >
                    <span
                      className="absolute left-0 top-2 h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: "var(--signal-critical)" }}
                      aria-hidden
                    />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-baseline justify-between border-t border-border/60 pt-2">
                <span className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  How much of the overall strain this represents
                </span>
                <span
                  className="text-mono text-base font-semibold"
                  style={{ color: "var(--signal-critical)" }}
                >
                  {primary.estimatedInfluence}%
                </span>
              </div>
              <p className="text-mono mt-2 text-[10px] leading-relaxed text-muted-foreground">
                {primary.reason}
              </p>
            </div>
          ) : null}

          {/* DOWNSTREAM CONSEQUENCES */}
          {downstream && downstream.items.length > 0 ? (
            <div className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
              <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                What tends to follow if this continues
              </p>
              <p className="mt-1 text-[11px] leading-snug text-foreground">
                If "{downstream.fromLabel}" keeps forming, expect:
              </p>
              <ul className="mt-2 space-y-1">
                {downstream.items.map((i) => (
                  <li
                    key={i}
                    className="relative pl-4 text-xs leading-snug text-foreground"
                  >
                    <span
                      className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-primary"
                      aria-hidden
                    />
                    {i}
                  </li>
                ))}
              </ul>
              <p className="text-mono mt-3 border-t border-border/60 pt-2 text-[10px] leading-relaxed text-muted-foreground">
                These are the everyday knock-on effects most likely to show up next.
              </p>
            </div>
          ) : null}

          {/* MULTIPLIER EFFECT */}
          {multiplier ? (
            <div
              className="rounded-md border px-3 py-3"
              style={{
                borderColor: "color-mix(in oklch, var(--primary) 40%, transparent)",
                background: "color-mix(in oklch, var(--primary) 8%, transparent)",
              }}
            >
              <p
                className="text-mono text-[10px] uppercase tracking-[0.16em]"
                style={{ color: "var(--primary)" }}
              >
                The single change that helps most
              </p>
              <p className="text-mono mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                The one change most likely to help
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {multiplier.intervention}
              </p>
              <p className="text-mono mt-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Problems this would reduce
              </p>
              <ul className="mt-1 space-y-0.5">
                {multiplier.reductions.map((r) => (
                  <li
                    key={r}
                    className="text-[11px] leading-snug text-foreground"
                  >
                    <span
                      className="text-mono mr-1.5"
                      style={{ color: "var(--signal-low)" }}
                      aria-hidden
                    >
                      ↓
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-baseline justify-between border-t border-border/60 pt-2">
                <span className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Estimated cross-condition reduction
                </span>
                <span
                  className="text-mono text-base font-semibold"
                  style={{ color: "var(--primary)" }}
                >
                  {multiplier.estimatedReduction}%
                </span>
              </div>
              <p className="text-mono mt-2 text-[10px] leading-relaxed text-muted-foreground">
                {multiplier.reason}
              </p>
            </div>
          ) : null}

          <p className="text-mono border-t border-border/60 pt-3 text-[10px] leading-relaxed text-muted-foreground">
            When problems connect, one well-placed change can quietly reduce several
            problems at once. This is that single change.
          </p>
        </div>
      )}
    </Panel>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-mono px-5 py-10 text-center text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
      {text}
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-border/60 pt-6">
      <p className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Prototype · interpretation logic for demonstration only · NDPP
      </p>
    </footer>
  );
}

function containmentTone(status: ContainmentStatus) {
  switch (status) {
    case "Critical":
      return "var(--signal-critical)";
    case "Fragile":
      return "var(--signal-elevated)";
    case "Vulnerable":
      return "var(--signal-moderate)";
    case "Containable":
    default:
      return "var(--signal-low)";
  }
}

type EvidenceStrength = "High" | "Moderate" | "Limited";

function confidenceFromScore(score: number): {
  level: EvidenceStrength;
  blurb: string;
} {
  if (score >= 3) {
    return {
      level: "High",
      blurb:
        "Supporting evidence includes the same pattern appearing repeatedly across different parts of the system.",
    };
  }
  if (score >= 2) {
    return {
      level: "Moderate",
      blurb:
        "This interpretation is supported by a clearly emerging pattern, though further observation would strengthen it.",
    };
  }
  return {
    level: "Limited",
    blurb:
      "The available evidence indicates an early signal only — worth noting, but more evidence is needed before drawing strong conclusions.",
  };
}

function ConfidenceBadge({ level }: { level: EvidenceStrength }) {
  const tone =
    level === "High"
      ? "var(--flourish)"
      : level === "Moderate"
        ? "var(--signal-moderate)"
        : "var(--muted-foreground)";
  return (
    <span
      className="text-mono inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
      style={{
        color: tone,
        borderColor: `color-mix(in oklch, ${tone} 40%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${tone} 10%, transparent)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: tone }}
        aria-hidden
      />
      Evidence Strength · {level}
    </span>
  );
}

function EvidenceBlock({
  title,
  points,
  confidence,
}: {
  title: string;
  points: string[];
  confidence: { level: EvidenceStrength; blurb: string };
}) {
  if (points.length === 0) return null;
  return (
    <div className="mt-5 rounded-md border border-border/60 bg-surface-2/50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <ConfidenceBadge level={confidence.level} />
      </div>
      <ul className="mt-2 space-y-1">
        {points.map((p) => (
          <li
            key={p}
            className="relative pl-4 text-[12px] leading-snug text-foreground"
          >
            <span
              className="absolute left-0 top-2 h-1 w-1 rounded-full bg-primary"
              aria-hidden
            />
            {p}
          </li>
        ))}
      </ul>
      <p className="text-mono mt-2 border-t border-border/50 pt-2 text-[10px] leading-relaxed text-muted-foreground">
        {confidence.blurb}
      </p>
    </div>
  );
}

type HeroView = "overview" | "evidence" | "impact";

function ExecutiveHero({
  assessment,
  commercial,
  capacity,
  view = "overview",
}: {
  assessment: ExecutiveAssessment;
  commercial: CommercialIntelligence;
  capacity: CapacityIntelligence;
  view?: HeroView;
}) {
  const show = (...views: HeroView[]) => views.includes(view);
  const {
    containment,
    primaryPressure,
    highestLeverage,
    ifNothingChanges,
    burdenIndex,
    portfolio,
  } = assessment;
  const tone = containmentTone(containment.status);
  const statusHeadline =
    containment.status === "Critical"
      ? "Critical"
      : containment.status === "Fragile"
        ? "Under strain"
        : containment.status === "Vulnerable"
          ? "Vulnerable"
          : "Stable";

  // Confidence scoring (0-4)
  const statusScore =
    (containment.reasons.length >= 3 ? 2 : containment.reasons.length >= 2 ? 1 : 0) +
    (portfolio.critical > 0 ? 2 : portfolio.elevated > 0 ? 1 : 0);
  const statusConfidence = confidenceFromScore(statusScore);

  const pressureScore = primaryPressure
    ? (primaryPressure.estimatedInfluence >= 45 ? 2 : primaryPressure.estimatedInfluence >= 25 ? 1 : 0) +
      (primaryPressure.contributingTo.length >= 3 ? 2 : primaryPressure.contributingTo.length >= 1 ? 1 : 0)
    : 0;
  const pressureConfidence = confidenceFromScore(pressureScore);

  const topBurden = burdenIndex[0];
  const burdenScore =
    (burdenIndex.length >= 4 ? 2 : burdenIndex.length >= 2 ? 1 : 0) +
    (topBurden && topBurden.pct >= 25 ? 2 : topBurden && topBurden.pct >= 15 ? 1 : 0);
  const burdenConfidence = confidenceFromScore(burdenScore);

  const leverageScore = highestLeverage
    ? (highestLeverage.estimatedReduction >= 30 ? 2 : highestLeverage.estimatedReduction >= 15 ? 1 : 0) +
      (highestLeverage.reductions.length >= 3 ? 2 : highestLeverage.reductions.length >= 1 ? 1 : 0)
    : 0;
  const leverageConfidence = confidenceFromScore(leverageScore);

  // Evidence points (plain language)
  const statusEvidence: string[] = [];
  if (portfolio.critical + portfolio.elevated >= 2)
    statusEvidence.push("Several serious issues are active at the same time.");
  if (portfolio.escalating > 0)
    statusEvidence.push("One or more of them is getting worse, not settling.");
  if (portfolio.entrenching > 0)
    statusEvidence.push("At least one issue is starting to feel like the new normal.");
  if (topBurden && topBurden.pct >= 20)
    statusEvidence.push("Hidden compensation is spreading across the organisation.");
  containment.reasons.slice(1, 3).forEach((r) => statusEvidence.push(r));
  if (statusEvidence.length === 0 && containment.reasons.length > 0)
    statusEvidence.push(containment.reasons[0]);

  const pressureEvidence: string[] = [];
  if (primaryPressure) {
    if (primaryPressure.contributingTo.length > 0)
      pressureEvidence.push(
        `It's currently making ${primaryPressure.contributingTo.length} other issue${primaryPressure.contributingTo.length === 1 ? "" : "s"} worse.`
      );
    if (primaryPressure.estimatedInfluence >= 40)
      pressureEvidence.push("It accounts for a large share of the overall strain.");
    else if (primaryPressure.estimatedInfluence >= 20)
      pressureEvidence.push("It accounts for a meaningful share of the overall strain.");
    pressureEvidence.push("Signals pointing to it are coming from more than one area.");
    
  }

  const burdenEvidence: string[] = [];
  if (topBurden) {
    burdenEvidence.push(
      `"${topBurden.mechanism}" is the single largest form of extra effort right now (${topBurden.pct}%).`
    );
  }
  if (burdenIndex.length >= 3)
    burdenEvidence.push(
      "The same kinds of extra effort keep appearing across different parts of the system."
    );
  if (burdenIndex.length >= 2)
    burdenEvidence.push(
      "Multiple signals — repeated checking, re-confirming, chasing ownership — point in the same direction."
    );

  const leverageEvidence: string[] = [];
  if (highestLeverage) {
    if (highestLeverage.reductions.length >= 2)
      leverageEvidence.push(
        `Fixing this is expected to reduce ${highestLeverage.reductions.length} downstream problems at once.`
      );
    if (highestLeverage.estimatedReduction >= 25)
      leverageEvidence.push(
        `Modelled to remove roughly ${highestLeverage.estimatedReduction}% of the overall strain.`
      );
    leverageEvidence.push(
      "It targets an upstream cause, not a symptom — so knock-on effects are likely."
    );
    
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
      {/* 1. WHAT IS HAPPENING — hero status */}
      {show("overview") ? (

      <header
        className="relative px-6 py-10 lg:px-12 lg:py-14"
        style={{
          background: `radial-gradient(120% 100% at 0% 0%, color-mix(in oklch, ${tone} 18%, transparent), transparent 60%)`,
        }}
      >
        <div className="absolute inset-0 grid-bg opacity-20" aria-hidden />
        <div className="relative">
          <p className="text-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Current system status
          </p>
          <div className="mt-3 flex items-center gap-4">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: tone, boxShadow: `0 0 20px ${tone}` }}
              aria-hidden
            />
            <h2
              className="text-5xl font-semibold leading-none tracking-tight sm:text-6xl lg:text-7xl"
              style={{ color: tone }}
            >
              {statusHeadline}
            </h2>
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {containment.reasons[0] ??
              "The system is being read continuously across signals, mechanisms and conditions."}
          </p>
          <EvidenceBlock
            title="Why we're saying this"
            points={statusEvidence}
            confidence={statusConfidence}
          />
        </div>
      </header>
      ) : null}

      {/* 2. PRIMARY SYSTEM PRESSURE */}
      {show("overview") && primaryPressure ? (

        <section className="border-t border-border/60 px-6 py-8 lg:px-12">
          <p className="text-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Primary system pressure
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {primaryPressure.label}
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Driving roughly{" "}
            <span className="font-semibold text-foreground">
              {primaryPressure.estimatedInfluence}%
            </span>{" "}
            of what the organisation is currently feeling.
          </p>
          <EvidenceBlock
            title="Why this is the primary pressure"
            points={pressureEvidence}
            confidence={pressureConfidence}
          />
        </section>
      ) : null}

      {/* 3. WHAT PEOPLE ARE CARRYING */}
      {show("evidence") && burdenIndex.length > 0 ? (
        <section className="border-t border-border/60 bg-surface-2/40 px-6 py-8 lg:px-12">
          <p className="text-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            People are currently spending more effort on
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {burdenIndex.slice(0, 4).map((b) => (
              <li
                key={b.mechanism}
                className="rounded-lg border border-border/60 bg-surface px-4 py-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-medium text-foreground">
                    {b.mechanism}
                  </span>
                  <span
                    className="text-mono text-lg font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    {b.pct}%
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${b.pct}%`,
                      backgroundColor: "var(--primary)",
                      opacity: 0.8,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <EvidenceBlock
            title="Why we're saying people are carrying this"
            points={burdenEvidence}
            confidence={burdenConfidence}
          />
        </section>
      ) : null}

      {/* 4. HIGHEST IMPACT CHANGE */}
      {show("overview", "impact") && highestLeverage ? (
        <section
          className="border-t px-6 py-8 lg:px-12"
          style={{
            borderColor: "color-mix(in oklch, var(--primary) 30%, transparent)",
            background: "color-mix(in oklch, var(--primary) 6%, transparent)",
          }}
        >
          <p
            className="text-mono text-[10px] uppercase tracking-[0.24em]"
            style={{ color: "var(--primary)" }}
          >
            Highest impact change
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {highestLeverage.statement}
          </h3>
          {highestLeverage.reductions.length > 0 ? (
            <>
              <p className="text-mono mt-5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Expected result
              </p>
              <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {highestLeverage.reductions.map((r) => (
                  <li
                    key={r}
                    className="flex items-start gap-2 text-sm leading-snug text-foreground"
                  >
                    <span
                      className="text-mono mt-[3px] shrink-0"
                      style={{ color: "var(--signal-low)" }}
                      aria-hidden
                    >
                      ↓
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <EvidenceBlock
            title="Why this is the highest leverage change"
            points={leverageEvidence}
            confidence={leverageConfidence}
          />
          <p className="text-mono mt-5 border-t border-border/40 pt-3 text-[10px] leading-relaxed text-muted-foreground">
            A change to how the organisation is set up — not a request for people to work harder.
          </p>
        </section>
      ) : null}

      {/* 5. IF NOTHING CHANGES */}
      {show("impact") && ifNothingChanges.length > 0 ? (
        <section className="border-t border-border/60 px-6 py-6 lg:px-12">
          <p className="text-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            If nothing changes
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {ifNothingChanges.slice(0, 6).map((i) => (
              <li
                key={i}
                className="relative pl-4 text-sm leading-snug text-muted-foreground"
              >
                <span
                  className="absolute left-0 top-2 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "var(--signal-elevated)" }}
                  aria-hidden
                />
                {i}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 6. ORGANISATIONAL IMPACT */}
      {show("impact") && commercial.organisationalImpact.length > 0 ? (
        <section className="border-t border-border/60 bg-surface-2/40 px-6 py-8 lg:px-12">
          <p className="text-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Organisational impact
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            The commercial consequences the organisation is likely to feel while this continues.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {commercial.organisationalImpact.map((i) => (
              <li
                key={i}
                className="relative rounded-md border border-border/60 bg-surface px-3 py-2 pl-6 text-sm leading-snug text-foreground"
              >
                <span
                  className="absolute left-3 top-3 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "var(--signal-elevated)" }}
                  aria-hidden
                />
                {i}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 7. CAPACITY BEING LOST */}
      {show("overview", "impact") && commercial.capacityLoss.length > 0 ? (
        <section
          className="border-t px-6 py-8 lg:px-12"
          style={{
            borderColor: "color-mix(in oklch, var(--signal-critical) 25%, transparent)",
            background: "color-mix(in oklch, var(--signal-critical) 5%, transparent)",
          }}
        >
          <p
            className="text-mono text-[10px] uppercase tracking-[0.24em]"
            style={{ color: "var(--signal-critical)" }}
          >
            Capacity being lost
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Where the organisation is quietly losing capacity.
          </h3>
          <ul className="mt-4 space-y-2">
            {commercial.capacityLoss.map((i) => (
              <li
                key={i}
                className="relative pl-5 text-sm leading-snug text-foreground"
              >
                <span
                  className="text-mono absolute left-0 top-[2px]"
                  style={{ color: "var(--signal-critical)" }}
                  aria-hidden
                >
                  −
                </span>
                {i}
              </li>
            ))}
          </ul>
          <p className="text-mono mt-4 border-t border-border/40 pt-3 text-[10px] leading-relaxed text-muted-foreground">
            These are not calculated hours. They are the categories of organisational effort
            currently being absorbed by people to keep the system functional.
          </p>
        </section>
      ) : null}

      {/* 8. LEADERSHIP IMPACT */}
      {show("overview") && commercial.leadershipImpact.length > 0 ? (
        <section className="border-t border-border/60 px-6 py-8 lg:px-12">
          <p className="text-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            What leaders are likely to experience
          </p>
          <ul className="mt-4 space-y-2">
            {commercial.leadershipImpact.map((i) => (
              <li
                key={i}
                className="relative pl-4 text-sm leading-snug text-foreground"
              >
                <span
                  className="absolute left-0 top-2 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "var(--primary)" }}
                  aria-hidden
                />
                {i}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 9. STRATEGIC CONSEQUENCES */}
      {show("impact") && commercial.strategicConsequences.length > 0 ? (
        <section className="border-t border-border/60 bg-surface-2/40 px-6 py-8 lg:px-12">
          <p className="text-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Strategic consequences
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Broader organisational implications if these conditions persist.
          </p>
          <ul className="mt-4 space-y-2">
            {commercial.strategicConsequences.map((i) => (
              <li
                key={i}
                className="relative pl-4 text-sm leading-snug text-foreground"
              >
                <span
                  className="absolute left-0 top-2 h-1.5 w-1.5 rotate-45"
                  style={{ backgroundColor: "var(--signal-elevated)" }}
                  aria-hidden
                />
                {i}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 10. WHY THIS MATTERS */}
      {show("impact") ? (
      <section
        className="border-t px-6 py-8 lg:px-12"
        style={{
          borderColor: "color-mix(in oklch, var(--primary) 30%, transparent)",
          background: "color-mix(in oklch, var(--primary) 8%, transparent)",
        }}
      >
        <p
          className="text-mono text-[10px] uppercase tracking-[0.24em]"
          style={{ color: "var(--primary)" }}
        >
          Why this matters
        </p>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-foreground sm:text-lg">
          {commercial.whyThisMatters}
        </p>
        <p className="text-mono mt-4 border-t border-border/40 pt-3 text-[10px] leading-relaxed text-muted-foreground">
          Hidden work creates lost capacity. The change identified above is the change most
          likely to recover it.
        </p>
      </section>

      {/* 11. ORGANISATIONAL CAPACITY */}
      <section className="border-t border-border/60 bg-surface-2/40 px-6 py-8 lg:px-12">
        <p className="text-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Organisational capacity
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Where capacity is working, under pressure, or at risk.
        </h3>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Hidden work quietly consumes organisational capacity. These are the areas
          currently protected, under strain or likely to come under strain if nothing
          changes.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <CapacityColumn
            label="Working well"
            accent="var(--signal-low)"
            items={capacity.workingWell}
            emptyText="No capacity area is currently free of hidden work."
          />
          <CapacityColumn
            label="Under pressure"
            accent="var(--signal-elevated)"
            items={capacity.underPressure}
            emptyText="No capacity area is currently under material pressure."
          />
          <CapacityColumn
            label="At risk"
            accent="var(--signal-critical)"
            items={capacity.atRisk}
            emptyText="No capacity area is currently trending toward risk."
          />
        </div>
      </section>

      {/* 12. HOW HIDDEN WORK CONSUMES CAPACITY */}
      {capacity.hiddenWork.length > 0 ? (
        <section className="border-t border-border/60 px-6 py-8 lg:px-12">
          <p className="text-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            How hidden work is consuming capacity
          </p>
          <ul className="mt-4 space-y-3">
            {capacity.hiddenWork.map((h) => (
              <li
                key={h.mechanism}
                className="rounded-lg border border-border/60 bg-surface px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-base font-medium text-foreground">
                    {h.plainName}
                  </span>
                  <span
                    className="text-mono text-xs uppercase tracking-[0.16em]"
                    style={{ color: "var(--primary)" }}
                  >
                    {h.capacityAffected}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
                  {h.explanation}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 13. CAPACITY FLOW */}
      <section className="border-t border-border/60 bg-surface-2/40 px-6 py-8 lg:px-12">
        <p className="text-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          How capacity changes
        </p>
        <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
          {[
            "System Conditions",
            "Hidden Work",
            "Capacity Under Pressure",
            "Better Understanding",
            "Better Decisions",
            "Capacity Recovered or Redirected",
          ].map((step, i, arr) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-md border border-border/60 bg-surface px-3 py-1.5 text-foreground">
                {step}
              </span>
              {i < arr.length - 1 ? (
                <span className="text-primary" aria-hidden>
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {/* 14. CAPACITY SUMMARY */}
      <section
        className="border-t px-6 py-8 lg:px-12"
        style={{
          borderColor: "color-mix(in oklch, var(--primary) 30%, transparent)",
          background: "color-mix(in oklch, var(--primary) 6%, transparent)",
        }}
      >
        <p
          className="text-mono text-[10px] uppercase tracking-[0.24em]"
          style={{ color: "var(--primary)" }}
        >
          Organisational capacity summary
        </p>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-foreground sm:text-lg">
          {capacity.summary}
        </p>
        <p className="text-mono mt-4 border-t border-border/40 pt-3 text-[10px] leading-relaxed text-muted-foreground">
          Organisations do not always need more capacity — often they need to recover or
          redirect the capacity they already have.
        </p>
      </section>
    </article>
  );
}

function CapacityColumn({
  label,
  accent,
  items,
  emptyText,
}: {
  label: string;
  accent: string;
  items: { area: string; reason: string }[];
  emptyText: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface p-4">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }}
          aria-hidden
        />
        <p
          className="text-mono text-[10px] uppercase tracking-[0.2em]"
          style={{ color: accent }}
        >
          {label}
        </p>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((it) => (
            <li key={it.area}>
              <p className="text-sm font-medium text-foreground">{it.area}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                {it.reason}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}




function ExecutiveAssessmentPanel({ assessment }: { assessment: ExecutiveAssessment }) {
  const {

    containment,
    primaryPressure,
    highestLeverage,
    ifNothingChanges,
    portfolio,
    burdenIndex,
  } = assessment;
  const tone = containmentTone(containment.status);

  return (
    <Panel
      label="What leaders should know right now"
      caption="What's happening · what's driving it · what to change first"
    >
      <div className="space-y-5 px-5 py-5">
        {/* CURRENT ARCHITECTURE STATE */}
        <div
          className="rounded-md border px-4 py-4"
          style={{
            borderColor: `color-mix(in oklch, ${tone} 40%, transparent)`,
            background: `color-mix(in oklch, ${tone} 7%, transparent)`,
          }}
        >
          <p className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            How the organisation is holding up
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              State:
            </p>
            <p
              className="text-mono text-2xl font-semibold tracking-tight"
              style={{ color: tone }}
            >
              {containment.status.toUpperCase()}
            </p>
          </div>
          <p className="text-mono mt-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Why
          </p>
          <ul className="mt-1 space-y-0.5">
            {containment.reasons.map((r) => (
              <li
                key={r}
                className="relative pl-4 text-xs leading-snug text-foreground"
              >
                <span
                  className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: tone }}
                  aria-hidden
                />
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* PRIMARY SYSTEM PRESSURE */}
        {primaryPressure ? (
          <div className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
            <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Biggest issue affecting the organisation
            </p>
            <p className="mt-1.5 text-base font-semibold text-foreground">
              {primaryPressure.label}
            </p>
            <p className="text-mono mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Currently making these worse
            </p>
            <ul className="mt-1 space-y-0.5">
              {primaryPressure.contributingTo.map((t) => (
                <li
                  key={t}
                  className="relative pl-4 text-[11px] text-foreground"
                >
                  <span
                    className="absolute left-0 top-2 h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "var(--signal-critical)" }}
                    aria-hidden
                  />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-baseline justify-between border-t border-border/60 pt-2">
              <span className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                How much of the overall strain this represents
              </span>
              <span
                className="text-mono text-base font-semibold"
                style={{ color: "var(--signal-critical)" }}
              >
                {primaryPressure.estimatedInfluence}%
              </span>
            </div>
          </div>
        ) : null}

        {/* WHAT HUMANS ARE CURRENTLY CARRYING */}
        {burdenIndex.length > 0 ? (
          <div className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
            <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              What people are currently carrying
            </p>
            <p className="text-mono mt-0.5 text-[10px] leading-relaxed text-muted-foreground/80">
              The extra effort being absorbed across the whole organisation right now
            </p>
            <ul className="mt-3 space-y-2">
              {burdenIndex.slice(0, 5).map((b) => (
                <li key={b.mechanism}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-foreground">{b.mechanism}</span>
                    <span
                      className="text-mono shrink-0 text-[11px] font-semibold"
                      style={{ color: "var(--primary)" }}
                    >
                      {b.pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${b.pct}%`,
                        backgroundColor: "var(--primary)",
                        opacity: 0.75,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-mono mt-3 border-t border-border/60 pt-2 text-[10px] leading-relaxed text-muted-foreground">
              These are the invisible tasks the system is asking people to hold onto.
            </p>
          </div>
        ) : null}

        {/* HIGHEST LEVERAGE INTERVENTION */}
        {highestLeverage ? (
          <div
            className="rounded-md border px-3 py-3"
            style={{
              borderColor: "color-mix(in oklch, var(--primary) 40%, transparent)",
              background: "color-mix(in oklch, var(--primary) 8%, transparent)",
            }}
          >
            <p
              className="text-mono text-[10px] uppercase tracking-[0.16em]"
              style={{ color: "var(--primary)" }}
            >
              The one change most likely to help
            </p>
            <p className="mt-1.5 text-sm font-semibold text-foreground">
              {highestLeverage.statement}
            </p>
            <p className="text-mono mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Problems this would reduce
            </p>
            <ul className="mt-1 space-y-0.5">
              {highestLeverage.reductions.map((r) => (
                <li key={r} className="text-[11px] leading-snug text-foreground">
                  <span
                    className="text-mono mr-1.5"
                    style={{ color: "var(--signal-low)" }}
                    aria-hidden
                  >
                    ↓
                  </span>
                  {r}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-baseline justify-between border-t border-border/60 pt-2">
              <span className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                How much this could reduce overall strain
              </span>
              <span
                className="text-mono text-base font-semibold"
                style={{ color: "var(--primary)" }}
              >
                {highestLeverage.estimatedReduction}%
              </span>
            </div>
            <p className="text-mono mt-2 text-[10px] leading-relaxed text-muted-foreground">
              This is a change to how the organisation is set up — not a request for people to work harder.
            </p>
          </div>
        ) : null}

        {/* IF NOTHING CHANGES */}
        {ifNothingChanges.length > 0 ? (
          <div className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
            <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              What happens if nothing changes
            </p>
            <p className="text-mono mt-0.5 text-[10px] leading-relaxed text-muted-foreground/80">
              The knock-on effects most likely to appear next
            </p>
            <ul className="mt-2 space-y-1">
              {ifNothingChanges.map((i) => (
                <li
                  key={i}
                  className="relative pl-4 text-xs leading-snug text-foreground"
                >
                  <span
                    className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "var(--signal-elevated)" }}
                    aria-hidden
                  />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* ACTIVE CONDITION PORTFOLIO */}
        <div className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
          <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Overview of active problems
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <PortfolioStat label="Critical" value={portfolio.critical} tone="var(--signal-critical)" />
            <PortfolioStat label="Elevated" value={portfolio.elevated} tone="var(--signal-elevated)" />
            <PortfolioStat label="Moderate" value={portfolio.moderate} tone="var(--signal-moderate)" />
            <PortfolioStat label="Emerging" value={portfolio.emerging} tone="var(--signal-low)" />
            <PortfolioStat label="Getting worse" value={portfolio.escalating} tone="var(--signal-critical)" />
            <PortfolioStat label="Settling in" value={portfolio.entrenching} tone="var(--signal-elevated)" />
            <PortfolioStat label="Levelling off" value={portfolio.stabilising} tone="var(--signal-moderate)" />
            <PortfolioStat label="Improving" value={portfolio.recovering} tone="var(--signal-low)" />
          </div>
        </div>


        <p className="text-mono border-t border-border/60 pt-3 text-[10px] leading-relaxed text-muted-foreground">
          Where is the organisation asking people to carry too much, and where should we change things first?
        </p>
      </div>
    </Panel>
  );
}

function PortfolioStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded border border-border/60 bg-surface px-2 py-2">
      <p className="text-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="text-mono mt-0.5 text-lg leading-none" style={{ color: tone }}>
        {value}
      </p>
    </div>
  );
}
