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
  generateSignal,
  interpret,
  familyCounts,
  computeTrajectory,
  computeDrivers,
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
          {c.drivers && (c.drivers.drivers.length > 0 || c.drivers.stabilisers.length > 0) && (
            <DriversBlock drivers={c.drivers} tone={tone} />
          )}
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
