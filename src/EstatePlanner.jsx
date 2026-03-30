import { useState, useMemo, useCallback } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine, Legend, Cell,
} from "recharts";

// ─── WA ESTATE TAX (2026 schedule, deaths on/after July 1 2025) ───
const WA_EXEMPTION_2026 = 3076000;
const WA_BRACKETS = [
  { limit: 1000000, rate: 0.10 },
  { limit: 2000000, rate: 0.14 },
  { limit: 3000000, rate: 0.15 },
  { limit: 4000000, rate: 0.16 },
  { limit: 6000000, rate: 0.18 },
  { limit: 7000000, rate: 0.20 },
  { limit: 9000000, rate: 0.25 },
  { limit: Infinity, rate: 0.35 },
];
const FEDERAL_ANNUAL_EXCLUSION = 19000; // 2026

function calcWAEstateTax(estateValue, exemption) {
  const taxable = Math.max(0, estateValue - exemption);
  if (taxable <= 0) return 0;
  let tax = 0;
  let remaining = taxable;
  let prev = 0;
  for (const bracket of WA_BRACKETS) {
    const bracketSize = bracket.limit - prev;
    const inBracket = Math.min(remaining, bracketSize);
    tax += inBracket * bracket.rate;
    remaining -= inBracket;
    prev = bracket.limit;
    if (remaining <= 0) break;
  }
  return Math.round(tax);
}

// ─── PROJECTION ENGINE ───
function projectScenario({
  estateValue, residenceValue, annualSpending, annualReturn, inflationRate,
  currentAge, lifeExpectancy, married, hasBypassTrust,
  annualGiftPerRecipient, numRecipients, spendingMultiplier,
}) {
  const years = lifeExpectancy - currentAge;
  const growth = 1 + annualReturn / 100;
  const inflation = 1 + inflationRate / 100;

  const projection = [];
  let portfolio = estateValue;
  let cumulativeGifts = 0;

  for (let y = 0; y <= years; y++) {
    const age = currentAge + y;
    const inflatedSpending = annualSpending * spendingMultiplier * Math.pow(inflation, y);
    const giftPerRecipient = annualGiftPerRecipient;
    const annualGifts = married
      ? giftPerRecipient * numRecipients * 2  // both spouses gift
      : giftPerRecipient * numRecipients;

    // Inflation-adjusted WA exemption
    const exemption = WA_EXEMPTION_2026 * Math.pow(inflation, y);
    const effectiveExemption = (married && hasBypassTrust) ? exemption * 2 : exemption;

    const tax = calcWAEstateTax(Math.max(0, portfolio), effectiveExemption);
    const netEstate = Math.max(0, portfolio) - tax;
    const totalToHeirs = netEstate + cumulativeGifts;

    projection.push({
      age,
      year: y,
      portfolio: Math.round(Math.max(0, portfolio)),
      cumulativeGifts: Math.round(cumulativeGifts),
      estateTax: tax,
      netEstate: Math.round(netEstate),
      totalToHeirs: Math.round(totalToHeirs),
      exemption: Math.round(effectiveExemption),
    });

    // Apply year changes
    if (y < years) {
      portfolio = portfolio * growth - inflatedSpending - annualGifts;
      cumulativeGifts += annualGifts;
      if (portfolio < 0) portfolio = 0;
    }
  }

  const final = projection[projection.length - 1];
  return { projection, final };
}

// ─── MONTE CARLO ───
function runMonteCarlo(baseInputs, numSims = 2000) {
  const years = baseInputs.lifeExpectancy - baseInputs.currentAge;
  const meanReturn = baseInputs.annualReturn / 100;
  const stdDev = 0.16;
  const inflation = baseInputs.inflationRate / 100;
  const married = baseInputs.married;
  const spending = baseInputs.annualSpending;

  const allPaths = [];
  for (let sim = 0; sim < numSims; sim++) {
    let portfolio = baseInputs.estateValue;
    const path = [];
    for (let y = 0; y <= years; y++) {
      path.push(Math.round(Math.max(0, portfolio)));
      if (y < years) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const yearReturn = 1 + meanReturn + stdDev * z;
        const inflatedSpending = spending * Math.pow(1 + inflation, y);
        portfolio = portfolio * yearReturn - inflatedSpending;
        if (portfolio < 0) {
          portfolio = 0;
          for (let r = y + 1; r <= years; r++) path.push(0);
          break;
        }
      }
    }
    allPaths.push(path);
  }

  const bands = [];
  for (let y = 0; y <= years; y++) {
    const vals = allPaths.map(p => p[y] || 0).sort((a, b) => a - b);
    bands.push({
      age: baseInputs.currentAge + y,
      p10: vals[Math.floor(numSims * 0.1)],
      p25: vals[Math.floor(numSims * 0.25)],
      p50: vals[Math.floor(numSims * 0.5)],
      p75: vals[Math.floor(numSims * 0.75)],
      p90: vals[Math.floor(numSims * 0.9)],
    });
  }
  return { bands, numSims };
}

// ─── FORMAT HELPERS ───
const fmt = (n) => {
  if (n == null) return "$0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toLocaleString()}`;
};

const fmtAxis = (n) => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n;
};

// ─── COMPONENTS ───
function InputField({ label, value, onChange, prefix, suffix, min, max, step = 1, help }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{
        display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em",
        color: "#8a9bb0", textTransform: "uppercase", marginBottom: "4px",
      }}>
        {label}
        {help && <span style={{ fontWeight: 400, textTransform: "none", marginLeft: "6px", opacity: 0.6 }}>{help}</span>}
      </label>
      <div style={{
        display: "flex", alignItems: "center", background: "#1a2332",
        borderRadius: "6px", border: "1px solid #2a3a4e", overflow: "hidden",
      }}>
        {prefix && <span style={{ padding: "0 0 0 10px", color: "#5a7a9a", fontSize: "14px", fontWeight: 500 }}>{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min} max={max} step={step}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "#e8eff8", padding: "9px 10px", fontSize: "14px",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontWeight: 500,
          }}
        />
        {suffix && <span style={{ padding: "0 10px 0 0", color: "#5a7a9a", fontSize: "13px" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange, help }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={{
        display: "flex", alignItems: "center", gap: "8px", cursor: "pointer",
        fontSize: "13px", color: "#c0d0e0",
      }}>
        <span style={{
          width: "16px", height: "16px", borderRadius: "3px",
          border: `2px solid ${checked ? "#4fc3f7" : "#3a4a5e"}`,
          background: checked ? "#4fc3f7" : "transparent",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: "10px", color: "#0d1520", fontWeight: 800, flexShrink: 0,
          transition: "all 0.15s",
        }}>
          {checked ? "✓" : ""}
        </span>
        {label}
      </label>
      {help && <div style={{ fontSize: "10px", color: "#5a7a9a", marginTop: "3px", marginLeft: "24px", lineHeight: 1.4 }}>{help}</div>}
    </div>
  );
}

function StatCard({ label, value, sub, color = "#4fc3f7", alert = false }) {
  return (
    <div style={{
      background: alert ? "rgba(255,82,82,0.08)" : "rgba(79,195,247,0.05)",
      border: `1px solid ${alert ? "rgba(255,82,82,0.2)" : "rgba(79,195,247,0.12)"}`,
      borderRadius: "8px", padding: "14px 16px", flex: "1 1 140px", minWidth: "140px",
    }}>
      <div style={{ fontSize: "11px", color: "#7a8ea0", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
        {label}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: alert ? "#ff5252" : color, fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "11px", color: "#5a7a9a", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1a2332", border: "1px solid #2a3a4e", borderRadius: "6px",
      padding: "10px 14px", fontSize: "12px", color: "#c0d0e0",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{ fontWeight: 700, marginBottom: "4px", color: "#e8eff8" }}>Age {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
          <span style={{ color: p.color }}>{p.name}:</span>
          <span>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function MCTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div style={{
      background: "#1a2332", border: "1px solid #2a3a4e", borderRadius: "6px",
      padding: "10px 14px", fontSize: "12px", color: "#c0d0e0",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{ fontWeight: 700, marginBottom: "4px", color: "#e8eff8" }}>Age {label}</div>
      <div>90th: {fmt(data.p90)}</div>
      <div>75th: {fmt(data.p75)}</div>
      <div style={{ color: "#4fc3f7", fontWeight: 600 }}>Median: {fmt(data.p50)}</div>
      <div>25th: {fmt(data.p25)}</div>
      <div>10th: {fmt(data.p10)}</div>
    </div>
  );
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1a2332", border: "1px solid #2a3a4e", borderRadius: "6px",
      padding: "10px 14px", fontSize: "12px", color: "#c0d0e0",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{ fontWeight: 700, marginBottom: "6px", color: "#e8eff8" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: p.color || p.fill }}>{p.name}:</span>
          <span>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── SCENARIO CONFIG ───
const SCENARIOS = {
  statusQuo: { label: "Status Quo", color: "#4fc3f7", desc: "Current spending, no gifting" },
  giftAnnually: { label: "Gift Annually", color: "#66bb6a", desc: "Current spending + annual gifts" },
  spendAndGift: { label: "Spend + Gift", color: "#ff9800", desc: "+20% spending + annual gifts" },
};

// ─── MAIN APP ───
export default function EstatePlanner() {
  const [inputs, setInputs] = useState({
    estateValue: 4000000,
    residenceValue: 600000,
    annualSpending: 80000,
    annualReturn: 6.0,
    inflationRate: 3.0,
    currentAge: 70,
    lifeExpectancy: 90,
    married: true,
    hasBypassTrust: false,
    annualGiftPerRecipient: 0,
    numRecipients: 4,
  });

  const [activeScenarios, setActiveScenarios] = useState({
    statusQuo: true,
    giftAnnually: true,
    spendAndGift: true,
  });

  const [showMC, setShowMC] = useState(false);
  const [mcResults, setMcResults] = useState(null);
  const [mcRunning, setMcRunning] = useState(false);
  const [showTrustInfo, setShowTrustInfo] = useState(false);

  const set = useCallback((field) => (val) => setInputs(prev => ({ ...prev, [field]: val })), []);

  const toggleScenario = useCallback((key) => {
    setActiveScenarios(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Compute all three scenarios
  const scenarios = useMemo(() => {
    const maxGiftPerRecipient = inputs.married
      ? FEDERAL_ANNUAL_EXCLUSION * 2
      : FEDERAL_ANNUAL_EXCLUSION;
    const effectiveGift = Math.min(inputs.annualGiftPerRecipient, maxGiftPerRecipient);

    const base = {
      estateValue: inputs.estateValue,
      residenceValue: inputs.residenceValue,
      annualSpending: inputs.annualSpending,
      annualReturn: inputs.annualReturn,
      inflationRate: inputs.inflationRate,
      currentAge: inputs.currentAge,
      lifeExpectancy: inputs.lifeExpectancy,
      married: inputs.married,
      hasBypassTrust: inputs.hasBypassTrust,
      numRecipients: inputs.numRecipients,
    };

    const statusQuo = projectScenario({
      ...base,
      annualGiftPerRecipient: 0,
      spendingMultiplier: 1,
    });

    const giftAnnually = projectScenario({
      ...base,
      annualGiftPerRecipient: effectiveGift,
      spendingMultiplier: 1,
    });

    const spendAndGift = projectScenario({
      ...base,
      annualGiftPerRecipient: effectiveGift,
      spendingMultiplier: 1.2,
    });

    return { statusQuo, giftAnnually, spendAndGift };
  }, [inputs]);

  // Merged chart data
  const chartData = useMemo(() => {
    const years = inputs.lifeExpectancy - inputs.currentAge;
    const data = [];
    for (let y = 0; y <= years; y++) {
      const entry = { age: inputs.currentAge + y };
      if (activeScenarios.statusQuo) entry.statusQuo = scenarios.statusQuo.projection[y].portfolio;
      if (activeScenarios.giftAnnually) entry.giftAnnually = scenarios.giftAnnually.projection[y].portfolio;
      if (activeScenarios.spendAndGift) entry.spendAndGift = scenarios.spendAndGift.projection[y].portfolio;
      entry.exemption = scenarios.statusQuo.projection[y].exemption;
      data.push(entry);
    }
    return data;
  }, [scenarios, activeScenarios, inputs]);

  // Bar chart data (the punchline)
  const barData = useMemo(() => {
    const results = [];
    const entries = [
      { key: "statusQuo", label: "Status Quo" },
      { key: "giftAnnually", label: "Gift Annually" },
      { key: "spendAndGift", label: "Spend + Gift" },
    ];
    for (const { key, label } of entries) {
      if (!activeScenarios[key]) continue;
      const f = scenarios[key].final;
      results.push({
        name: label,
        estateAtDeath: f.portfolio,
        estateTax: f.estateTax,
        lifetimeGifts: f.cumulativeGifts,
        netEstate: f.netEstate,
        totalToHeirs: f.totalToHeirs,
      });
    }
    return results;
  }, [scenarios, activeScenarios]);

  const handleMC = useCallback(() => {
    if (!showMC) {
      setShowMC(true);
      setMcRunning(true);
      setTimeout(() => {
        const mc = runMonteCarlo(inputs, 2000);
        setMcResults(mc);
        setMcRunning(false);
      }, 50);
    } else {
      setShowMC(false);
      setMcResults(null);
    }
  }, [showMC, inputs]);

  const sqFinal = scenarios.statusQuo.final;
  const gaFinal = scenarios.giftAnnually.final;
  const sgFinal = scenarios.spendAndGift.final;
  const taxSavedGift = sqFinal.estateTax - gaFinal.estateTax;
  const taxSavedSpendGift = sqFinal.estateTax - sgFinal.estateTax;
  const maxGiftDisplay = inputs.married ? FEDERAL_ANNUAL_EXCLUSION * 2 : FEDERAL_ANNUAL_EXCLUSION;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d1520",
      color: "#c0d0e0",
      fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #12203a 0%, #0d1520 100%)",
        borderBottom: "1px solid #1a2a3e",
        padding: "20px 24px 16px",
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <h1 style={{
              fontSize: "24px", fontWeight: 700, color: "#e8eff8", margin: 0,
              letterSpacing: "-0.02em",
            }}>
              <span style={{ color: "#4fc3f7" }}>Estate</span> Planning Projection
            </h1>
            <span style={{ fontSize: "12px", color: "#4a6a8a", letterSpacing: "0.05em" }}>
              WASHINGTON STATE ESTATE TAX ANALYSIS
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px 24px" }}>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "20px" }}>

          {/* ─── INPUT PANEL ─── */}
          <div style={{
            flex: "0 0 320px", background: "#111c2b",
            borderRadius: "10px", border: "1px solid #1e2e42", padding: "18px",
          }}>
            {/* Estate Details */}
            <div style={{
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em",
              color: "#4fc3f7", textTransform: "uppercase", marginBottom: "10px",
            }}>
              Estate Details
            </div>
            <InputField label="Combined Estate Value" value={inputs.estateValue} onChange={set("estateValue")} prefix="$" min={0} step={100000} />
            <InputField label="Primary Residence Value" value={inputs.residenceValue} onChange={set("residenceValue")} prefix="$" min={0} step={50000} help="(included in estate)" />
            <InputField label="Annual Spending" value={inputs.annualSpending} onChange={set("annualSpending")} prefix="$" min={0} step={5000} />
            <InputField label="Annual Portfolio Return" value={inputs.annualReturn} onChange={set("annualReturn")} suffix="%" min={0} max={15} step={0.5} help="(real)" />
            <InputField label="Inflation Rate" value={inputs.inflationRate} onChange={set("inflationRate")} suffix="%" min={0} max={10} step={0.5} />

            <div style={{ height: "1px", background: "#1e2e42", margin: "12px 0" }} />

            {/* People */}
            <div style={{
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em",
              color: "#4fc3f7", textTransform: "uppercase", marginBottom: "10px",
            }}>
              People
            </div>
            <InputField label="Current Age" value={inputs.currentAge} onChange={set("currentAge")} suffix="yrs" min={40} max={100} help="(younger spouse)" />
            <InputField label="Life Expectancy" value={inputs.lifeExpectancy} onChange={set("lifeExpectancy")} suffix="yrs" min={70} max={110} />
            <Checkbox
              label="Married"
              checked={inputs.married}
              onChange={() => set("married")(!inputs.married)}
            />
            <Checkbox
              label="Has bypass/credit shelter trust"
              checked={inputs.hasBypassTrust}
              onChange={() => set("hasBypassTrust")(!inputs.hasBypassTrust)}
              help={inputs.hasBypassTrust
                ? "Doubles effective WA exemption to ~$6.15M"
                : "Without one, only ONE $3.08M exemption applies"}
            />
            {/* Trust Info Toggle */}
            <div
              onClick={() => setShowTrustInfo(!showTrustInfo)}
              style={{
                fontSize: "11px", color: "#4fc3f7", cursor: "pointer",
                marginBottom: "8px", userSelect: "none",
              }}
            >
              {showTrustInfo ? "▾" : "▸"} Why does this matter?
            </div>
            {showTrustInfo && (
              <div style={{
                fontSize: "11px", color: "#7a8ea0", lineHeight: 1.5,
                background: "rgba(79,195,247,0.05)", borderRadius: "6px",
                padding: "10px 12px", marginBottom: "12px",
                border: "1px solid rgba(79,195,247,0.1)",
              }}>
                Washington does not allow portability of the estate tax exemption.
                Without a bypass trust, when the first spouse dies everything passes
                tax-free to the surviving spouse (marital deduction). But at the second
                death, only <strong style={{ color: "#e8eff8" }}>one</strong> exemption
                (~$3.08M) shelters the combined estate. A bypass trust lets each spouse
                shelter up to the exemption, effectively doubling it to ~$6.15M.
              </div>
            )}

            <div style={{ height: "1px", background: "#1e2e42", margin: "12px 0" }} />

            {/* Gifting Strategy */}
            <div style={{
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em",
              color: "#4fc3f7", textTransform: "uppercase", marginBottom: "10px",
            }}>
              Gifting Strategy
            </div>
            <InputField
              label="Annual Gift Per Recipient"
              value={inputs.annualGiftPerRecipient}
              onChange={set("annualGiftPerRecipient")}
              prefix="$" min={0} max={maxGiftDisplay} step={1000}
            />
            <div style={{ fontSize: "10px", color: "#5a7a9a", marginTop: "-8px", marginBottom: "10px" }}>
              Federal exclusion: ${FEDERAL_ANNUAL_EXCLUSION.toLocaleString()}/recipient/yr
              {inputs.married && ` ($${(FEDERAL_ANNUAL_EXCLUSION * 2).toLocaleString()} if both spouses gift)`}
            </div>
            <InputField label="Number of Recipients" value={inputs.numRecipients} onChange={set("numRecipients")} min={0} max={20} help="(children, spouses, etc.)" />

            <div style={{ height: "1px", background: "#1e2e42", margin: "12px 0" }} />

            {/* Scenario Toggles */}
            <div style={{
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em",
              color: "#4fc3f7", textTransform: "uppercase", marginBottom: "10px",
            }}>
              Scenarios
            </div>
            {Object.entries(SCENARIOS).map(([key, s]) => (
              <Checkbox
                key={key}
                label={<span><span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span> <span style={{ fontSize: "11px", opacity: 0.6 }}>— {s.desc}</span></span>}
                checked={activeScenarios[key]}
                onChange={() => toggleScenario(key)}
              />
            ))}

            {/* Monte Carlo Toggle */}
            <div style={{ marginTop: "8px" }}>
              <button
                onClick={handleMC}
                style={{
                  width: "100%", padding: "10px", borderRadius: "6px",
                  border: showMC ? "1px solid #4fc3f7" : "1px solid #2a3a4e",
                  background: showMC ? "rgba(79,195,247,0.1)" : "#1a2332",
                  color: showMC ? "#4fc3f7" : "#8a9bb0",
                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  transition: "all 0.15s", letterSpacing: "0.03em",
                }}
              >
                <span style={{
                  width: "16px", height: "16px", borderRadius: "3px",
                  border: `2px solid ${showMC ? "#4fc3f7" : "#3a4a5e"}`,
                  background: showMC ? "#4fc3f7" : "transparent",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: "10px", color: "#0d1520", fontWeight: 800,
                }}>
                  {showMC ? "✓" : ""}
                </span>
                Monte Carlo Simulation {showMC ? "(2,000 runs)" : ""}
              </button>
            </div>
          </div>

          {/* ─── RIGHT: STATS + CHARTS ─── */}
          <div style={{ flex: 1, minWidth: "300px" }}>

            {/* Stat Cards — Per Scenario */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
              {activeScenarios.statusQuo && (
                <StatCard
                  label="Status Quo → Heirs"
                  value={fmt(sqFinal.totalToHeirs)}
                  sub={`Estate ${fmt(sqFinal.portfolio)} − Tax ${fmt(sqFinal.estateTax)}`}
                  color="#4fc3f7"
                />
              )}
              {activeScenarios.giftAnnually && (
                <StatCard
                  label="Gift Annually → Heirs"
                  value={fmt(gaFinal.totalToHeirs)}
                  sub={`Estate ${fmt(gaFinal.portfolio)} + Gifts ${fmt(gaFinal.cumulativeGifts)}`}
                  color="#66bb6a"
                />
              )}
              {activeScenarios.spendAndGift && (
                <StatCard
                  label="Spend + Gift → Heirs"
                  value={fmt(sgFinal.totalToHeirs)}
                  sub={`Estate ${fmt(sgFinal.portfolio)} + Gifts ${fmt(sgFinal.cumulativeGifts)}`}
                  color="#ff9800"
                />
              )}
            </div>

            {/* Tax Comparison Cards */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
              {activeScenarios.statusQuo && (
                <StatCard
                  label="WA Estate Tax (Status Quo)"
                  value={fmt(sqFinal.estateTax)}
                  sub={`On ${fmt(sqFinal.portfolio)} estate`}
                  color="#ff5252"
                  alert={sqFinal.estateTax > 0}
                />
              )}
              {activeScenarios.giftAnnually && taxSavedGift > 0 && (
                <StatCard
                  label="Tax Saved (Gift)"
                  value={fmt(taxSavedGift)}
                  sub={`Tax reduced to ${fmt(gaFinal.estateTax)}`}
                  color="#66bb6a"
                />
              )}
              {activeScenarios.spendAndGift && taxSavedSpendGift > 0 && (
                <StatCard
                  label="Tax Saved (Spend + Gift)"
                  value={fmt(taxSavedSpendGift)}
                  sub={`Tax reduced to ${fmt(sgFinal.estateTax)}`}
                  color="#ff9800"
                />
              )}
            </div>

            {/* ─── Primary Chart: Portfolio Over Time ─── */}
            <div style={{
              background: "#111c2b", borderRadius: "10px", border: "1px solid #1e2e42",
              padding: "16px", marginBottom: "16px",
            }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#8a9bb0", marginBottom: "10px", letterSpacing: "0.04em" }}>
                PORTFOLIO BALANCE OVER TIME
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <defs>
                    <linearGradient id="sqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4fc3f7" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#4fc3f7" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#66bb6a" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#66bb6a" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="sgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff9800" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#ff9800" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2a3e" />
                  <XAxis dataKey="age" stroke="#3a4a5e" tick={{ fill: "#5a6a7e", fontSize: 11 }} />
                  <YAxis stroke="#3a4a5e" tick={{ fill: "#5a6a7e", fontSize: 11 }} tickFormatter={fmtAxis} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                  <ReferenceLine
                    y={chartData[0]?.exemption}
                    stroke="#ff5252"
                    strokeDasharray="5 3"
                    strokeWidth={1}
                    label={{
                      value: `WA Exemption (${fmt(chartData[0]?.exemption)})`,
                      fill: "#ff5252", fontSize: 10, position: "right",
                    }}
                  />
                  {activeScenarios.statusQuo && (
                    <Area
                      type="monotone" dataKey="statusQuo" name="Status Quo"
                      stroke="#4fc3f7" strokeWidth={2} fill="url(#sqGrad)"
                    />
                  )}
                  {activeScenarios.giftAnnually && (
                    <Area
                      type="monotone" dataKey="giftAnnually" name="Gift Annually"
                      stroke="#66bb6a" strokeWidth={2} fill="url(#gaGrad)"
                    />
                  )}
                  {activeScenarios.spendAndGift && (
                    <Area
                      type="monotone" dataKey="spendAndGift" name="Spend + Gift"
                      stroke="#ff9800" strokeWidth={2} fill="url(#sgGrad)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* ─── Secondary Chart: What Heirs Receive (the punchline) ─── */}
            <div style={{
              background: "#111c2b", borderRadius: "10px", border: "1px solid #1e2e42",
              padding: "16px", marginBottom: "16px",
            }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#8a9bb0", marginBottom: "4px", letterSpacing: "0.04em" }}>
                WHAT HEIRS ACTUALLY RECEIVE
              </div>
              <div style={{ fontSize: "10px", color: "#5a7a9a", marginBottom: "12px" }}>
                Total value transferred = (Estate − Tax) + Lifetime Gifts
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2a3e" />
                  <XAxis dataKey="name" stroke="#3a4a5e" tick={{ fill: "#8a9bb0", fontSize: 11 }} />
                  <YAxis stroke="#3a4a5e" tick={{ fill: "#5a6a7e", fontSize: 11 }} tickFormatter={fmtAxis} />
                  <Tooltip content={<BarTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                  <Bar dataKey="netEstate" name="Net Estate (after tax)" stackId="a" fill="#4a6a8a" />
                  <Bar dataKey="lifetimeGifts" name="Lifetime Gifts" stackId="a" fill="#66bb6a" />
                  <Bar dataKey="estateTax" name="WA Estate Tax" fill="#ff5252" />
                </BarChart>
              </ResponsiveContainer>
              {/* Highlight total to heirs below bars */}
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "10px", flexWrap: "wrap" }}>
                {barData.map((d, i) => {
                  const colors = { "Status Quo": "#4fc3f7", "Gift Annually": "#66bb6a", "Spend + Gift": "#ff9800" };
                  return (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#7a8ea0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {d.name} Total
                      </div>
                      <div style={{
                        fontSize: "20px", fontWeight: 700,
                        color: colors[d.name] || "#4fc3f7",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {fmt(d.totalToHeirs)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Monte Carlo Chart ─── */}
            {showMC && (
              <div style={{
                background: "#111c2b", borderRadius: "10px", border: "1px solid #1e2e42",
                padding: "16px", marginBottom: "16px",
              }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#8a9bb0", marginBottom: "10px", letterSpacing: "0.04em" }}>
                  MONTE CARLO — STATUS QUO PERCENTILE BANDS
                  {mcRunning && <span style={{ color: "#4fc3f7", marginLeft: "8px" }}>Running...</span>}
                </div>
                {mcResults && (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={mcResults.bands} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <defs>
                        <linearGradient id="mc90" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4fc3f7" stopOpacity={0.08} />
                          <stop offset="100%" stopColor="#4fc3f7" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="mc75" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4fc3f7" stopOpacity={0.14} />
                          <stop offset="100%" stopColor="#4fc3f7" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2a3e" />
                      <XAxis dataKey="age" stroke="#3a4a5e" tick={{ fill: "#5a6a7e", fontSize: 11 }} />
                      <YAxis stroke="#3a4a5e" tick={{ fill: "#5a6a7e", fontSize: 11 }} tickFormatter={fmtAxis} />
                      <Tooltip content={<MCTooltip />} />
                      <Area type="monotone" dataKey="p90" name="90th" stroke="none" fill="url(#mc90)" />
                      <Area type="monotone" dataKey="p75" name="75th" stroke="none" fill="url(#mc75)" />
                      <Area type="monotone" dataKey="p25" name="25th" stroke="none" fill="url(#mc75)" />
                      <Area type="monotone" dataKey="p10" name="10th" stroke="none" fill="url(#mc90)" />
                      <Line type="monotone" dataKey="p50" name="Median" stroke="#4fc3f7" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="p90" name="90th pctl" stroke="#2a5a7a" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                      <Line type="monotone" dataKey="p10" name="10th pctl" stroke="#2a5a7a" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* Assumptions footer */}
            <div style={{
              fontSize: "10px", color: "#3a4a5e", marginTop: "14px", lineHeight: 1.6,
              borderTop: "1px solid #1a2332", paddingTop: "10px",
            }}>
              <strong style={{ color: "#5a6a7e" }}>Assumptions & Disclaimers:</strong>{" "}
              WA estate tax uses 2026 schedule (deaths on/after July 1, 2025). Exemption $3,076,000 indexed to inflation.
              WA has no gift tax — gifts reduce the estate dollar-for-dollar with zero state tax consequence.
              Federal annual gift exclusion: $19,000/recipient (2026). Gifts above this count against the ~$15M federal
              lifetime exemption (unlikely to matter for most estates). "Spend + Gift" scenario assumes 20% increase
              in annual spending. Returns are real (inflation-adjusted growth applied to portfolio; spending inflated
              separately). Monte Carlo uses 16% annual std dev, log-normal returns, 2,000 simulations — applied to
              Status Quo scenario only for readability. Residence value is included in the estate total (not excluded).
              This is not financial or legal advice — consult an estate planning attorney.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
