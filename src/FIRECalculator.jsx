import { useState, useMemo, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, CartesianGrid, Legend } from "recharts";

// ─── FIRE CALCULATIONS ───
function calculateFIRE(inputs) {
  const {
    currentAge, retireAge, lifeExpectancy,
    totalInvested, annualContribution, annualExpenses,
    realReturn, inflationRate, withdrawalRate,
    fireType,
  } = inputs;

  const yearsToRetire = Math.max(0, retireAge - currentAge);
  const yearsInRetirement = lifeExpectancy - retireAge;
  const realGrowth = (1 + realReturn / 100);
  const inflation = (1 + inflationRate / 100);

  // Adjust target based on FIRE type
  let expenseMultiplier = 1;
  if (fireType === "lean") expenseMultiplier = 0.6;
  else if (fireType === "barista") expenseMultiplier = 0.5;
  else if (fireType === "coast") expenseMultiplier = 1;
  else if (fireType === "fat") expenseMultiplier = 1.5;

  const adjustedExpenses = annualExpenses * expenseMultiplier;
  const fireNumber = adjustedExpenses / (withdrawalRate / 100);

  // Coast FIRE: amount needed now to grow to fireNumber by retireAge (no more contributions)
  const coastNumber = fireNumber / Math.pow(realGrowth, yearsToRetire);
  const isCoastFIRE = totalInvested >= coastNumber;

  // Year-by-year projection (accumulation)
  const projection = [];
  let balance = totalInvested;
  let fireReachedAge = null;

  for (let year = 0; year <= lifeExpectancy - currentAge; year++) {
    const age = currentAge + year;
    const inRetirement = age >= retireAge;
    const inflatedExpenses = adjustedExpenses * Math.pow(inflation, year);
    const currentFireNum = fireNumber * Math.pow(inflation, year);

    projection.push({
      age,
      year,
      balance: Math.round(balance),
      fireNumber: Math.round(currentFireNum),
      phase: inRetirement ? "withdrawal" : "accumulation",
    });

    if (!fireReachedAge && balance >= currentFireNum) {
      fireReachedAge = age;
    }

    if (inRetirement) {
      balance = balance * realGrowth - inflatedExpenses;
    } else {
      balance = balance * realGrowth + annualContribution;
    }

    if (balance < 0) {
      // Out of money
      for (let remaining = year + 1; remaining <= lifeExpectancy - currentAge; remaining++) {
        projection.push({
          age: currentAge + remaining,
          year: remaining,
          balance: 0,
          fireNumber: Math.round(fireNumber * Math.pow(inflation, remaining)),
          phase: "depleted",
        });
      }
      break;
    }
  }

  const finalBalance = projection[projection.length - 1]?.balance || 0;
  const runsOut = finalBalance <= 0;
  const depletionAge = runsOut ? projection.find(p => p.balance <= 0)?.age : null;

  return {
    fireNumber: Math.round(fireNumber),
    coastNumber: Math.round(coastNumber),
    isCoastFIRE,
    fireReachedAge,
    projection,
    finalBalance: Math.round(finalBalance),
    runsOut,
    depletionAge,
    adjustedExpenses: Math.round(adjustedExpenses),
    yearsToRetire,
    yearsInRetirement,
  };
}

function runMonteCarlo(inputs, numSims = 1000) {
  const {
    currentAge, retireAge, lifeExpectancy,
    totalInvested, annualContribution, annualExpenses,
    realReturn, inflationRate, withdrawalRate, fireType,
  } = inputs;

  const totalYears = lifeExpectancy - currentAge;
  const meanReturn = realReturn / 100;
  const stdDev = 0.16; // ~16% annual stock market std dev
  const inflation = inflationRate / 100;

  let expenseMultiplier = 1;
  if (fireType === "lean") expenseMultiplier = 0.6;
  else if (fireType === "barista") expenseMultiplier = 0.5;
  else if (fireType === "coast") expenseMultiplier = 1;
  else if (fireType === "fat") expenseMultiplier = 1.5;

  const adjustedExpenses = annualExpenses * expenseMultiplier;

  // Run simulations
  const allPaths = [];
  let successCount = 0;
  const finalBalances = [];
  const fireAges = [];

  const fireNumber = adjustedExpenses / (withdrawalRate / 100);

  for (let sim = 0; sim < numSims; sim++) {
    let balance = totalInvested;
    const path = [];
    let ranOut = false;
    let simFireAge = null;

    for (let year = 0; year <= totalYears; year++) {
      const age = currentAge + year;
      const inRetirement = age >= retireAge;
      const inflatedExpenses = adjustedExpenses * Math.pow(1 + inflation, year);
      const currentFireNum = fireNumber * Math.pow(1 + inflation, year);

      path.push(Math.round(balance));

      if (!simFireAge && balance >= currentFireNum) simFireAge = age;

      // Box-Muller for normal random
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const yearReturn = 1 + meanReturn + stdDev * z;

      if (inRetirement) {
        balance = balance * yearReturn - inflatedExpenses;
      } else {
        balance = balance * yearReturn + annualContribution;
      }

      if (balance < 0) {
        balance = 0;
        ranOut = true;
        // Fill remaining years
        for (let r = year + 1; r <= totalYears; r++) path.push(0);
        break;
      }
    }

    allPaths.push(path);
    if (!ranOut) successCount++;
    finalBalances.push(path[path.length - 1]);
    if (simFireAge) fireAges.push(simFireAge);
  }

  // Compute percentile bands
  const bands = [];
  for (let year = 0; year <= totalYears; year++) {
    const vals = allPaths.map(p => p[year] || 0).sort((a, b) => a - b);
    bands.push({
      age: currentAge + year,
      p10: vals[Math.floor(numSims * 0.1)],
      p25: vals[Math.floor(numSims * 0.25)],
      p50: vals[Math.floor(numSims * 0.5)],
      p75: vals[Math.floor(numSims * 0.75)],
      p90: vals[Math.floor(numSims * 0.9)],
    });
  }

  const successRate = (successCount / numSims) * 100;
  const medianFinal = finalBalances.sort((a, b) => a - b)[Math.floor(numSims * 0.5)];
  const medianFireAge = fireAges.length > 0 ? fireAges.sort((a, b) => a - b)[Math.floor(fireAges.length * 0.5)] : null;

  return { bands, successRate, medianFinal, medianFireAge, numSims };
}

// ─── FORMAT HELPERS ───
const fmt = (n) => {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
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

// ─── FIRE TYPE INFO ───
const FIRE_TYPES = {
  traditional: { label: "Traditional FIRE", desc: "25x annual expenses", color: "#4fc3f7" },
  lean: { label: "Lean FIRE", desc: "25x of 60% expenses", color: "#66bb6a" },
  coast: { label: "Coast FIRE", desc: "Already enough invested to grow into FIRE by retirement", color: "#ffb74d" },
  barista: { label: "Barista FIRE", desc: "25x of 50% expenses — part-time work covers the rest", color: "#ce93d8" },
  fat: { label: "Fat FIRE", desc: "25x of 150% expenses — comfortable margin", color: "#ef5350" },
};

// ─── MAIN APP ───
export default function FIRECalculator() {
  const [inputs, setInputs] = useState({
    currentAge: 40,
    retireAge: 55,
    lifeExpectancy: 90,
    totalInvested: 800000,
    annualContribution: 60000,
    annualExpenses: 50000,
    realReturn: 7,
    inflationRate: 3,
    withdrawalRate: 4,
    fireType: "traditional",
  });

  const [showMC, setShowMC] = useState(false);
  const [mcResults, setMcResults] = useState(null);
  const [mcRunning, setMcRunning] = useState(false);

  const set = useCallback((field) => (val) => setInputs(prev => ({ ...prev, [field]: val })), []);

  const results = useMemo(() => calculateFIRE(inputs), [inputs]);

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

  // Rerun MC when inputs change and MC is visible
  const prevInputsRef = useState(JSON.stringify(inputs))[0];

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
              <span style={{ color: "#4fc3f7" }}>FIRE</span> Projection Engine
            </h1>
            <span style={{ fontSize: "12px", color: "#4a6a8a", letterSpacing: "0.05em" }}>
              FINANCIAL INDEPENDENCE / RETIRE EARLY
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px 24px" }}>
        {/* Top: Inputs + Stats */}
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "20px" }}>

          {/* Input Panel */}
          <div style={{
            flex: "0 0 320px", background: "#111c2b",
            borderRadius: "10px", border: "1px solid #1e2e42", padding: "18px",
          }}>
            {/* FIRE Type Selector */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em",
                color: "#8a9bb0", textTransform: "uppercase", marginBottom: "6px",
              }}>
                FIRE Type
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {Object.entries(FIRE_TYPES).map(([key, ft]) => (
                  <button
                    key={key}
                    onClick={() => set("fireType")(key)}
                    style={{
                      padding: "6px 10px", borderRadius: "5px", border: "1px solid",
                      borderColor: inputs.fireType === key ? ft.color : "#2a3a4e",
                      background: inputs.fireType === key ? `${ft.color}18` : "transparent",
                      color: inputs.fireType === key ? ft.color : "#6a7a8e",
                      fontSize: "11px", fontWeight: 600, cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {ft.label.replace(" FIRE", "")}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: "11px", color: "#5a7a9a", marginTop: "5px" }}>
                {FIRE_TYPES[inputs.fireType].desc}
              </div>
            </div>

            <div style={{ height: "1px", background: "#1e2e42", margin: "12px 0" }} />

            <InputField label="Current Age" value={inputs.currentAge} onChange={set("currentAge")} suffix="yrs" min={18} max={80} />
            <InputField label="Target Retirement Age" value={inputs.retireAge} onChange={set("retireAge")} suffix="yrs" min={25} max={85} />
            <InputField label="Life Expectancy" value={inputs.lifeExpectancy} onChange={set("lifeExpectancy")} suffix="yrs" min={60} max={110} />

            <div style={{ height: "1px", background: "#1e2e42", margin: "12px 0" }} />

            <InputField label="Total Invested" value={inputs.totalInvested} onChange={set("totalInvested")} prefix="$" min={0} step={10000} />
            <InputField label="Annual Contribution" value={inputs.annualContribution} onChange={set("annualContribution")} prefix="$" min={0} step={5000} />
            <InputField label="Annual Expenses" value={inputs.annualExpenses} onChange={set("annualExpenses")} prefix="$" min={0} step={5000} help="(current)" />

            <div style={{ height: "1px", background: "#1e2e42", margin: "12px 0" }} />

            <InputField label="Real Return" value={inputs.realReturn} onChange={set("realReturn")} suffix="%" min={0} max={15} step={0.5} />
            <InputField label="Inflation Rate" value={inputs.inflationRate} onChange={set("inflationRate")} suffix="%" min={0} max={10} step={0.5} />
            <InputField label="Withdrawal Rate" value={inputs.withdrawalRate} onChange={set("withdrawalRate")} suffix="%" min={1} max={10} step={0.25} help="(SWR)" />

            {/* Monte Carlo Toggle */}
            <div style={{ marginTop: "14px" }}>
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

          {/* Right: Stats + Chart */}
          <div style={{ flex: 1, minWidth: "300px" }}>

            {/* Stat Cards */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
              <StatCard
                label={`${FIRE_TYPES[inputs.fireType].label.replace(" FIRE", "")} FIRE Number`}
                value={fmt(results.fireNumber)}
                sub={`${fmt(results.adjustedExpenses)}/yr ÷ ${inputs.withdrawalRate}%`}
                color={FIRE_TYPES[inputs.fireType].color}
              />
              <StatCard
                label="Coast FIRE Number"
                value={fmt(results.coastNumber)}
                sub={results.isCoastFIRE ? "✓ Achieved" : `Need ${fmt(results.coastNumber - inputs.totalInvested)} more`}
                color={results.isCoastFIRE ? "#66bb6a" : "#ffb74d"}
              />
              <StatCard
                label="FIRE Reached"
                value={results.fireReachedAge ? `Age ${results.fireReachedAge}` : "Not reached"}
                sub={results.fireReachedAge
                  ? `${results.fireReachedAge - inputs.currentAge} years from now`
                  : "Increase savings or reduce expenses"}
                color={results.fireReachedAge ? "#66bb6a" : "#ff5252"}
                alert={!results.fireReachedAge}
              />
              <StatCard
                label="Balance at End"
                value={fmt(Math.max(0, results.finalBalance))}
                sub={results.runsOut ? `Depleted at age ${results.depletionAge}` : `At age ${inputs.lifeExpectancy}`}
                color={results.runsOut ? "#ff5252" : "#4fc3f7"}
                alert={results.runsOut}
              />
            </div>

            {/* Monte Carlo Stats */}
            {showMC && mcResults && (
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                <StatCard
                  label="MC Success Rate"
                  value={`${mcResults.successRate.toFixed(1)}%`}
                  sub={`${mcResults.numSims} simulations`}
                  color={mcResults.successRate >= 90 ? "#66bb6a" : mcResults.successRate >= 75 ? "#ffb74d" : "#ff5252"}
                  alert={mcResults.successRate < 75}
                />
                <StatCard
                  label="MC Median Final"
                  value={fmt(mcResults.medianFinal)}
                  sub="50th percentile at end of plan"
                  color="#4fc3f7"
                />
                <StatCard
                  label="MC Median FIRE Age"
                  value={mcResults.medianFireAge ? `Age ${mcResults.medianFireAge}` : "N/A"}
                  sub="50th percentile"
                  color="#ce93d8"
                />
              </div>
            )}

            {/* Deterministic Chart */}
            <div style={{
              background: "#111c2b", borderRadius: "10px", border: "1px solid #1e2e42",
              padding: "16px", marginBottom: "16px",
            }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#8a9bb0", marginBottom: "10px", letterSpacing: "0.04em" }}>
                DETERMINISTIC PROJECTION
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={results.projection} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <defs>
                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4fc3f7" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#4fc3f7" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2a3e" />
                  <XAxis dataKey="age" stroke="#3a4a5e" tick={{ fill: "#5a6a7e", fontSize: 11 }} />
                  <YAxis stroke="#3a4a5e" tick={{ fill: "#5a6a7e", fontSize: 11 }} tickFormatter={fmtAxis} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: "11px", color: "#8a9bb0" }}
                  />
                  <ReferenceLine x={inputs.retireAge} stroke="#ff9800" strokeDasharray="5 3" label={{
                    value: "Retire", fill: "#ff9800", fontSize: 11, position: "top",
                  }} />
                  <Area
                    type="monotone" dataKey="balance" name="Portfolio Balance"
                    stroke="#4fc3f7" strokeWidth={2} fill="url(#balGrad)"
                  />
                  <Line
                    type="monotone" dataKey="fireNumber" name="FIRE Target"
                    stroke="#ff5252" strokeWidth={1.5} strokeDasharray="4 3" dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Monte Carlo Chart */}
            {showMC && (
              <div style={{
                background: "#111c2b", borderRadius: "10px", border: "1px solid #1e2e42",
                padding: "16px",
              }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#8a9bb0", marginBottom: "10px", letterSpacing: "0.04em" }}>
                  MONTE CARLO — PERCENTILE BANDS
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
                      <Legend
                        verticalAlign="top"
                        height={36}
                        wrapperStyle={{ fontSize: "11px", color: "#8a9bb0" }}
                        payload={[
                          { value: "Median (50th)", type: "line", color: "#4fc3f7" },
                          { value: "10th-90th Percentile", type: "rect", color: "rgba(79,195,247,0.3)" },
                        ]}
                      />
                      <ReferenceLine x={inputs.retireAge} stroke="#ff9800" strokeDasharray="5 3" label={{
                        value: "Retire", fill: "#ff9800", fontSize: 11, position: "top",
                      }} />
                      <Area type="monotone" dataKey="p90" name="90th" stroke="none" fill="url(#mc90)" legendType="none" />
                      <Area type="monotone" dataKey="p75" name="75th" stroke="none" fill="url(#mc75)" legendType="none" />
                      <Area type="monotone" dataKey="p25" name="25th" stroke="none" fill="url(#mc75)" legendType="none" />
                      <Area type="monotone" dataKey="p10" name="10th" stroke="none" fill="url(#mc90)" legendType="none" />
                      <Line type="monotone" dataKey="p50" name="Median" stroke="#4fc3f7" strokeWidth={2} dot={false} legendType="none" />
                      <Line type="monotone" dataKey="p90" name="90th pctl" stroke="#2a5a7a" strokeWidth={1} strokeDasharray="3 3" dot={false} legendType="none" />
                      <Line type="monotone" dataKey="p10" name="10th pctl" stroke="#2a5a7a" strokeWidth={1} strokeDasharray="3 3" dot={false} legendType="none" />
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
              Assumptions: Returns are real (inflation-adjusted growth applied to portfolio; expenses inflated separately).
              Monte Carlo uses 16% annual std dev (approximate US equity historical volatility), log-normal returns, 2000 simulations.
              SWR applied to inflation-adjusted expenses. This is not financial advice — I am not a financial advisor.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
