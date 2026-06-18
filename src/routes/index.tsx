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
  generateSignal,
  interpret,
  familyCounts,
  computeTrajectory,
  computeDrivers,
  computeInteractions,
  computeContainment,
  computeExecutiveAssessment,
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

  const containmentScore = Math.max(
    0,
    Math.min(100, Math.round(100 - totalBurden * 18))
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-8 lg:px-10">
        <Intro />

        <ScenarioBar
          scenario={scenario}
          onChange={setScenario}
          running={running}
          onToggleRunning={() => setRunning((r) => !r)}
          onReset={() => setSignals([])}
        />

        <div className="mt-6">
          <ExecutiveAssessmentPanel assessment={executive} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
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

        <Footer />
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Header() {
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
        <span className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          v1 · live console
        </span>
      </div>
    </header>
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
          <span>Operational signals</span>
          <span className="text-primary">→</span>
          <span>Compensation mechanisms</span>
          <span className="text-primary">→</span>
          <span>Architecture conditions</span>
          <span className="text-primary">→</span>
          <span>Architectural attribution</span>
          <span className="text-primary">→</span>
          <span>Response guidance</span>
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
      label="Signal intake"
      caption="Raw operational signals · interpreted, not assumed"
    >
      <div className="max-h-[420px] overflow-y-auto">
        {signals.length === 0 ? (
          <EmptyState text="Awaiting first signal…" />
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
    <Panel label="Signal families" caption="Cross-family correlation strengthens inference">
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
      ? { label: "Stable architecture", tone: "var(--flourish)" }
      : score >= 50
        ? { label: "Weakening architecture", tone: "var(--signal-moderate)" }
        : score >= 25
          ? { label: "Unstable architecture", tone: "var(--signal-elevated)" }
          : { label: "Architecture failing", tone: "var(--signal-critical)" };

  return (
    <Panel label="System containment" caption="Anchor metric · structural stability across all observed conditions">
      <div className="px-6 py-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p
              className="text-mono text-[11px] uppercase tracking-[0.18em]"
              style={{ color: status.tone }}
            >
              {status.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Structural stability</p>
            <p className="mt-2 text-5xl font-semibold tracking-tight text-foreground">
              {score}
              <span className="text-2xl text-muted-foreground">/100</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-right">
            <Metric label="Conditions" value={conditionsCount} />
            <Metric label="Structural load" value={burden.toFixed(2)} />
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
      label="Architecture conditions"
      caption="Signals → mechanisms → condition → attribution → guidance"
    >
      {conditions.length === 0 ? (
        <EmptyState text="No architecture conditions present yet." />
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
            <h3 className="text-sm font-semibold text-foreground">{c.label}</h3>
          </div>
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
              Containment status
            </p>
            <p className="text-mono mt-0.5 text-sm" style={{ color: cTone }}>
              {containment.status}
            </p>
            <details className="group/ct mt-0.5">
              <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary">
                <span className="inline-block transition-transform group-open/ct:rotate-90">▸</span>{" "}
                Reason
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
              Evidence formation
            </p>
            <p className="text-mono mt-0.5 text-sm" style={{ color: tone }}>
              {c.evidenceMaturity}
            </p>
          </div>
          <details className="group/ev mt-1">
            <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary">
              <span className="inline-block transition-transform group-open/ev:rotate-90">▸</span>{" "}
              Why this evidence formation?
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
                Trajectory
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
                  Why this trajectory?
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
          Formed by · structural mechanisms
        </summary>
        <div className="mt-3 rounded-md border border-border/60 bg-surface-2/60">
          <p className="text-mono px-3 pt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            What humans are being asked to carry
          </p>
          <ul className="divide-y divide-border/40">
            {c.mechanisms.map((m) => {
              const share = pct > 0 ? Math.round((m.points / pct) * 100) : 0;
              return (
                <li key={m.label} className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-foreground">{m.label}</span>
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
                    Derived from
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
                      Why this mechanism?
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
              Condition formation
            </span>
            <span className="text-mono text-xs" style={{ color: tone }}>
              {pct}%
            </span>
          </div>
          <p className="text-mono px-3 pb-3 pt-1 text-[10px] leading-relaxed text-muted-foreground">
            Signals → mechanisms → architecture condition. Mechanism share = portion of
            condition formation attributable to each form of human compensation.
          </p>
        </div>
      </details>

      {c.architecturalCauses.length > 0 ? (
        <details className="group mt-2">
          <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary">
            <span className="inline-block transition-transform group-open:rotate-90">▸</span>{" "}
            Most likely architectural causes
          </summary>
          <div className="mt-2 rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
            <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              What structural conditions are most likely creating this pattern
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
              Architecture conditions don't produce the pattern directly — they shape the
              compensation mechanisms above, which in turn form this condition.
            </p>
          </div>
        </details>
      ) : null}

      <details className="group mt-2">
        <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary">
          <span className="inline-block transition-transform group-open:rotate-90">▸</span>{" "}
          Likely organisational impact
        </summary>
        <div className="mt-2 rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
          <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            If this condition continues, the organisation is likely to experience
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
            Architecture conditions don't stay structural — they surface as operational
            consequences. This is the bridge from architecture intelligence to business impact.
          </p>
        </div>
      </details>

      <LeverageBlock c={c} tone={tone} />




      <details className="group mt-2">
        <summary className="text-mono cursor-pointer list-none text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary">
          <span className="inline-block transition-transform group-open:rotate-90">▸</span>{" "}
          Response guidance
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
        Primary condition drivers
      </p>
      <p className="text-mono mt-0.5 text-[10px] leading-relaxed text-muted-foreground/80">
        Which mechanisms are currently increasing or reducing condition formation
      </p>

      <div className="mt-3">
        <p
          className="text-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: tone }}
        >
          Primary drivers
        </p>
        {drivers.drivers.length === 0 ? (
          <p className="text-mono mt-1 text-[11px] text-muted-foreground">
            None observed.
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
          Stabilising factors
        </p>
        {drivers.stabilisers.length === 0 ? (
          <p className="text-mono mt-1 text-[11px] text-muted-foreground">
            None observed.
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
        Conditions don't worsen independently — mechanisms drive them. Drivers show
        which compensation patterns are pushing this condition's formation right now.
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
          {d.label}
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
        Architectural leverage & intervention priority
      </summary>
      <div className="mt-2 space-y-3">
        {/* Highest leverage point */}
        <div className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
          <p className="text-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: tone }}>
            Highest leverage point
          </p>
          <p className="mt-1.5 text-sm font-medium text-foreground">
            {c.leverage.statement}
          </p>
          <p className="text-mono mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Expected effect
          </p>
          <ul className="mt-1 space-y-0.5">
            {c.leverage.expectedEffect.map((m) => (
              <li
                key={m}
                className="text-mono inline-flex items-center gap-1.5 pr-2 text-[11px] text-muted-foreground"
              >
                <span aria-hidden style={{ color: tone }}>↓</span>
                {m}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Estimated influence
              </p>
              <p className="text-mono text-xs text-muted-foreground">
                Share of current condition formation addressed
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
            Intervention priority
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
                        Priority {i + 1}
                      </span>
                      {p.title}
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
            Priority orders interventions by likely reduction in compensation per unit of effort.
          </p>
        </div>

        {/* Expected organisational improvement */}
        <div className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
          <p className="text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Expected organisational improvement
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
            Architecture intelligence translates into business outcomes. Executives buy outcomes,
            not architecture terminology.
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
      label="Condition interaction map"
      caption="Upstream → downstream · multiplier intervention"
    >
      {edges.length === 0 ? (
        <EmptyState text="No condition interactions detected yet." />
      ) : (
        <div className="space-y-5 px-5 py-5">
          {/* INTERACTION MAP */}
          <div>
            <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Condition interaction map
            </p>
            <p className="text-mono mt-0.5 text-[10px] leading-relaxed text-muted-foreground/80">
              How conditions are currently contributing to one another
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
                      Contributing to
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
                Primary upstream condition
              </p>
              <p className="mt-1.5 text-sm font-semibold text-foreground">
                {primary.label}
              </p>
              <p className="text-mono mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Currently contributing to
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
                  Estimated system influence
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
                Downstream consequences
              </p>
              <p className="mt-1 text-[11px] leading-snug text-foreground">
                {downstream.fromLabel} may contribute to:
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
                If this upstream condition continues forming, these are the
                operational consequences most likely to emerge across downstream
                conditions.
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
                Architectural multiplier effect
              </p>
              <p className="text-mono mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Highest leverage intervention
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {multiplier.intervention}
              </p>
              <p className="text-mono mt-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Potential impact
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
            Signals → mechanisms → conditions → interactions → upstream →
            downstream → multiplier → response. Conditions are connected
            architecture phenomena; a single structural change in the right
            place reduces multiple forms of hidden compensation simultaneously.
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

function ExecutiveAssessmentPanel({ assessment }: { assessment: ExecutiveAssessment }) {
  const {
    containment,
    primaryPressure,
    humansCarrying,
    highestLeverage,
    ifNothingChanges,
    portfolio,
    burdenIndex,
  } = assessment;
  const tone = containmentTone(containment.status);

  return (
    <Panel
      label="Executive situation assessment"
      caption="Current architecture state · primary pressure · highest-leverage point"
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
            Current architecture state
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <p className="text-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Containment status
            </p>
            <p
              className="text-mono text-xl font-semibold tracking-tight"
              style={{ color: tone }}
            >
              {containment.status.toUpperCase()}
            </p>
          </div>
          <p className="text-mono mt-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Reason
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
              Primary system pressure
            </p>
            <p className="mt-1.5 text-base font-semibold text-foreground">
              {primaryPressure.label}
            </p>
            <p className="text-mono mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Currently contributing to
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
                Estimated system influence
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
        {humansCarrying.length > 0 ? (
          <div className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
            <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              What humans are currently carrying
            </p>
            <p className="text-mono mt-0.5 text-[10px] leading-relaxed text-muted-foreground/80">
              Aggregated across all active conditions — system-wide
            </p>
            <ol className="mt-2 space-y-1">
              {humansCarrying.map((m, i) => (
                <li
                  key={m}
                  className="text-xs text-foreground"
                >
                  <span className="text-mono mr-1.5 text-[10px] text-muted-foreground">
                    {i + 1}.
                  </span>
                  {m}
                </li>
              ))}
            </ol>
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
              Highest leverage architectural point
            </p>
            <p className="mt-1.5 text-sm font-semibold text-foreground">
              {highestLeverage.statement}
            </p>
            <p className="text-mono mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Expected reduction
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
                Estimated system reduction
              </span>
              <span
                className="text-mono text-base font-semibold"
                style={{ color: "var(--primary)" }}
              >
                {highestLeverage.estimatedReduction}%
              </span>
            </div>
            <p className="text-mono mt-2 text-[10px] leading-relaxed text-muted-foreground">
              NDPP changes architecture, not people. This is an architectural leverage point,
              not a recommendation or instruction to operators.
            </p>
          </div>
        ) : null}

        {/* IF NOTHING CHANGES */}
        {ifNothingChanges.length > 0 ? (
          <div className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
            <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              If nothing changes
            </p>
            <p className="text-mono mt-0.5 text-[10px] leading-relaxed text-muted-foreground/80">
              Likely emerging consequences
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
            Active condition portfolio
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <PortfolioStat label="Critical" value={portfolio.critical} tone="var(--signal-critical)" />
            <PortfolioStat label="Elevated" value={portfolio.elevated} tone="var(--signal-elevated)" />
            <PortfolioStat label="Moderate" value={portfolio.moderate} tone="var(--signal-moderate)" />
            <PortfolioStat label="Emerging" value={portfolio.emerging} tone="var(--signal-low)" />
            <PortfolioStat label="Escalating" value={portfolio.escalating} tone="var(--signal-critical)" />
            <PortfolioStat label="Entrenching" value={portfolio.entrenching} tone="var(--signal-elevated)" />
            <PortfolioStat label="Stabilising" value={portfolio.stabilising} tone="var(--signal-moderate)" />
            <PortfolioStat label="Recovering" value={portfolio.recovering} tone="var(--signal-low)" />
          </div>
        </div>

        {/* SYSTEM BURDEN INDEX */}
        {burdenIndex.length > 0 ? (
          <div className="rounded-md border border-border/60 bg-surface-2/60 px-3 py-3">
            <p className="text-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              System burden index
            </p>
            <p className="text-mono mt-0.5 text-[10px] leading-relaxed text-muted-foreground/80">
              What the system is asking people to carry right now — aggregated across the whole architecture
            </p>
            <ul className="mt-3 space-y-2">
              {burdenIndex.map((b) => (
                <li key={b.mechanism}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-foreground">{b.mechanism}</span>
                    <span className="text-mono shrink-0 text-[11px] text-muted-foreground">
                      {b.pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${b.pct}%`,
                        backgroundColor: "var(--primary)",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-mono border-t border-border/60 pt-3 text-[10px] leading-relaxed text-muted-foreground">
          Where is the system asking people to carry complexity, and where should intervention occur first?
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
