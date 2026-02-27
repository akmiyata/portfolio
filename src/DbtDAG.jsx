import { useState, useRef, useEffect, useCallback } from "react";

const COLORS = {
  bg: "#0a0a0f",
  node: "#12121a",
  nodeHover: "#1a1a26",
  nodeBorder: "#1e293b",
  nodeBorderHover: "#64ffda",
  accent: "#64ffda",
  accentDim: "rgba(100,255,218,0.15)",
  accentGlow: "rgba(100,255,218,0.3)",
  joinNode: "#1a1424",
  joinBorder: "#7c3aed",
  joinBorderHover: "#a78bfa",
  joinAccent: "#a78bfa",
  joinAccentDim: "rgba(167,139,250,0.15)",
  text: "#e2e8f0",
  textDim: "#8892a4",
  textMuted: "#4a5568",
  line: "#2d3f58",
  lineActive: "#64ffda",
};

const NODE_W = 220;
const NODE_H = 95;

// ─── Sample Data ───
const INITIAL_TABLES = [
  { id: "stg_patients", label: "stg_patients", schema: "staging", pk: "patient_id", rows: 48250, x: 80, y: 60 },
  { id: "stg_treatments", label: "stg_treatments", schema: "staging", pk: "treatment_id", rows: 124800, x: 80, y: 280 },
  { id: "stg_sites", label: "stg_sites", schema: "staging", pk: "site_id", rows: 312, x: 80, y: 500 },
  { id: "int_patient_treatments", label: "int_patient_treatments", schema: "intermediate", pk: "patient_treatment_id", rows: 124800, x: 520, y: 170 },
  { id: "int_site_metrics", label: "int_site_metrics", schema: "intermediate", pk: "site_id", rows: 312, x: 520, y: 440 },
  { id: "fct_treatment_outcomes", label: "fct_treatment_outcomes", schema: "marts", pk: "outcome_id", rows: 89400, x: 960, y: 280 },
];

const JOINS = [
  { id: "join_1", from: "stg_patients", to: "int_patient_treatments", criteria: "patient_id = patient_id", joinType: "LEFT JOIN" },
  { id: "join_2", from: "stg_treatments", to: "int_patient_treatments", criteria: "treatment_id = treatment_id", joinType: "INNER JOIN" },
  { id: "join_3", from: "stg_sites", to: "int_site_metrics", criteria: "site_id = site_id", joinType: "LEFT JOIN" },
  { id: "join_4", from: "int_patient_treatments", to: "fct_treatment_outcomes", criteria: "patient_treatment_id = patient_treatment_id", joinType: "INNER JOIN" },
  { id: "join_5", from: "int_site_metrics", to: "fct_treatment_outcomes", criteria: "site_id = site_id", joinType: "LEFT JOIN" },
];

function formatRows(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function schemaColor(schema) {
  switch (schema) {
    case "staging": return "#f59e0b";
    case "intermediate": return "#3b82f6";
    case "marts": return "#64ffda";
    default: return "#8892a4";
  }
}

// ─── Table Node ───
function TableNode({ table, isHighlighted, isActive, isDragging, onHover, onClick, position, onDragStart }) {
  const [hovered, setHovered] = useState(false);
  const active = isHighlighted || isActive;

  return (
    <div
      onMouseEnter={() => { setHovered(true); onHover(table.id); }}
      onMouseLeave={() => { setHovered(false); onHover(null); }}
      onMouseDown={(e) => { e.stopPropagation(); onDragStart(table.id, e); }}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: NODE_W,
        background: hovered || active ? COLORS.nodeHover : COLORS.node,
        border: `1.5px solid ${isDragging ? COLORS.accent : active ? COLORS.nodeBorderHover : hovered ? COLORS.nodeBorderHover : COLORS.nodeBorder}`,
        borderRadius: "10px",
        padding: "0",
        cursor: isDragging ? "grabbing" : "grab",
        transition: isDragging ? "none" : "box-shadow 0.25s ease, background 0.25s ease, border-color 0.25s ease",
        boxShadow: isDragging
          ? `0 0 35px ${COLORS.accentGlow}, 0 12px 32px rgba(0,0,0,0.5)`
          : active
          ? `0 0 25px ${COLORS.accentGlow}, 0 8px 24px rgba(0,0,0,0.4)`
          : hovered
          ? `0 8px 24px rgba(0,0,0,0.3)`
          : `0 2px 8px rgba(0,0,0,0.2)`,
        zIndex: isDragging ? 50 : hovered || active ? 10 : 1,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <div style={{
        padding: "0.4rem 0.85rem",
        background: `${schemaColor(table.schema)}15`,
        borderBottom: `1px solid ${COLORS.nodeBorder}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem",
          color: schemaColor(table.schema), textTransform: "uppercase",
          letterSpacing: "0.08em", fontWeight: 600,
        }}>{table.schema}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: COLORS.textMuted,
        }}>{formatRows(table.rows)} rows</span>
      </div>
      <div style={{ padding: "0.75rem 0.85rem 0.5rem" }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem",
          fontWeight: 600, color: active || isDragging ? COLORS.accent : COLORS.text,
          transition: "color 0.2s ease", marginBottom: "0.5rem",
        }}>{table.label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem",
            color: COLORS.accent, background: COLORS.accentDim,
            padding: "0.15rem 0.4rem", borderRadius: "3px", fontWeight: 600,
          }}>PK</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: COLORS.textDim,
          }}>{table.pk}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Join Node ───
function JoinNode({ join, position, isHighlighted, onHover }) {
  const [hovered, setHovered] = useState(false);
  const active = isHighlighted;
  return (
    <div
      onMouseEnter={() => { setHovered(true); onHover(join.id); }}
      onMouseLeave={() => { setHovered(false); onHover(null); }}
      style={{
        position: "absolute", left: position.x - 70, top: position.y - 24,
        width: 140,
        background: hovered || active ? "#221a30" : COLORS.joinNode,
        border: `1.5px solid ${active ? COLORS.joinBorderHover : hovered ? COLORS.joinBorderHover : COLORS.joinBorder}`,
        borderRadius: "20px", padding: "0.35rem 0.65rem",
        cursor: "default", transition: "all 0.25s ease",
        boxShadow: active ? `0 0 20px rgba(124,58,237,0.3), 0 4px 16px rgba(0,0,0,0.3)` : `0 2px 8px rgba(0,0,0,0.2)`,
        zIndex: hovered || active ? 10 : 5, textAlign: "center", userSelect: "none",
      }}
    >
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem",
        color: COLORS.joinAccent, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.05em", marginBottom: "0.15rem",
      }}>{join.joinType}</div>
      <div title={join.criteria} style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem",
        color: active ? COLORS.text : COLORS.textDim, transition: "color 0.2s ease",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{join.criteria}</div>
    </div>
  );
}

// ─── SVG Lines ───
function ConnectionLines({ tablePositions, joins, hoveredTable, hoveredJoin, activeTable }) {
  const edge = (id, side) => {
    const t = tablePositions[id];
    if (!t) return { x: 0, y: 0 };
    if (side === "right") return { x: t.x + NODE_W, y: t.y + NODE_H / 2 };
    if (side === "left") return { x: t.x, y: t.y + NODE_H / 2 };
    return { x: t.x + NODE_W / 2, y: t.y + NODE_H / 2 };
  };

  return (
    <svg width="3000" height="2000" viewBox="0 0 3000 2000"
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 0, overflow: "visible" }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 6" refX="9" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 3 L 0 6 z" fill={COLORS.line} />
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 6" refX="9" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 3 L 0 6 z" fill={COLORS.accent} />
        </marker>
      </defs>
      {joins.map((join) => {
        const fromPos = edge(join.from, "right");
        const toPos = edge(join.to, "left");
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;

        const isActive = hoveredTable === join.from || hoveredTable === join.to
          || activeTable === join.from || activeTable === join.to || hoveredJoin === join.id;

        const lineColor = isActive ? COLORS.accent : COLORS.line;
        const opacity = isActive ? 1 : 0.6;
        const strokeW = isActive ? 2.5 : 1.5;
        const marker = isActive ? "url(#arrow-active)" : "url(#arrow)";

        const cp1x = fromPos.x + (midX - fromPos.x) * 0.5;
        const cp1y = fromPos.y;
        const cp2x = midX - (midX - fromPos.x) * 0.5;
        const cp2y = midY;
        const cp3x = midX + (toPos.x - midX) * 0.5;
        const cp3y = midY;
        const cp4x = toPos.x - (toPos.x - midX) * 0.5;
        const cp4y = toPos.y;

        return (
          <g key={join.id}>
            <path d={`M ${fromPos.x} ${fromPos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${midX} ${midY}`}
              fill="none" stroke={lineColor} strokeWidth={strokeW} opacity={opacity} />
            <path d={`M ${midX} ${midY} C ${cp3x} ${cp3y}, ${cp4x} ${cp4y}, ${toPos.x} ${toPos.y}`}
              fill="none" stroke={lineColor} strokeWidth={strokeW} opacity={opacity} markerEnd={marker} />
            {isActive && (
              <>
                <path d={`M ${fromPos.x} ${fromPos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${midX} ${midY}`}
                  fill="none" stroke={COLORS.accentGlow} strokeWidth={8} opacity={0.35} />
                <path d={`M ${midX} ${midY} C ${cp3x} ${cp3y}, ${cp4x} ${cp4y}, ${toPos.x} ${toPos.y}`}
                  fill="none" stroke={COLORS.accentGlow} strokeWidth={8} opacity={0.35} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Legend ───
function Legend() {
  return (
    <div style={{
      position: "absolute", bottom: 20, left: 20, display: "flex", gap: "1.5rem",
      alignItems: "center", background: "rgba(10,10,15,0.8)", backdropFilter: "blur(10px)",
      padding: "0.65rem 1.25rem", borderRadius: "8px",
      border: `1px solid ${COLORS.nodeBorder}`, zIndex: 20,
    }}>
      {[
        { color: "#f59e0b", label: "Staging" },
        { color: "#3b82f6", label: "Intermediate" },
        { color: "#64ffda", label: "Marts" },
        { color: "#7c3aed", label: "Join" },
      ].map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <div style={{
            width: 10, height: 10, borderRadius: item.label === "Join" ? "10px" : "3px",
            background: `${item.color}30`, border: `1.5px solid ${item.color}`,
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", color: COLORS.textDim,
          }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main DAG Component ───
export default function DbtDAG() {
  const containerRef = useRef(null);
  const [hoveredTable, setHoveredTable] = useState(null);
  const [hoveredJoin, setHoveredJoin] = useState(null);
  const [activeTable, setActiveTable] = useState(null);
  const [pan, setPan] = useState({ x: 40, y: 20 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // ─── Draggable positions ───
  const [tablePositions, setTablePositions] = useState(() => {
    const pos = {};
    INITIAL_TABLES.forEach((t) => { pos[t.id] = { x: t.x, y: t.y }; });
    return pos;
  });
  const [draggingNode, setDraggingNode] = useState(null);
  const dragStart = useRef({ mx: 0, my: 0, nx: 0, ny: 0 });
  const didDrag = useRef(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => Math.min(2, Math.max(0.4, z - e.deltaY * 0.001)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.addEventListener("wheel", handleWheel, { passive: false });
    return () => { if (el) el.removeEventListener("wheel", handleWheel); };
  }, [handleWheel]);

  const handleMouseDown = (e) => {
    if (e.target === containerRef.current || e.target.tagName === "svg") {
      setIsPanning(true);
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleNodeDragStart = (nodeId, e) => {
    const pos = tablePositions[nodeId];
    dragStart.current = { mx: e.clientX, my: e.clientY, nx: pos.x, ny: pos.y };
    didDrag.current = false;
    setDraggingNode(nodeId);
  };

  const handleMouseMove = (e) => {
    if (draggingNode) {
      const dx = (e.clientX - dragStart.current.mx) / zoom;
      const dy = (e.clientY - dragStart.current.my) / zoom;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
      setTablePositions((prev) => ({
        ...prev,
        [draggingNode]: {
          x: dragStart.current.nx + dx,
          y: dragStart.current.ny + dy,
        },
      }));
    } else if (isPanning) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    if (draggingNode && !didDrag.current) {
      // It was a click, not a drag — toggle active
      setActiveTable((prev) => (prev === draggingNode ? null : draggingNode));
    }
    setDraggingNode(null);
    setIsPanning(false);
  };

  // ─── Join positions recompute from table positions ───
  const joinPositions = {};
  JOINS.forEach((j) => {
    const from = tablePositions[j.from];
    const to = tablePositions[j.to];
    if (from && to) {
      joinPositions[j.id] = {
        x: (from.x + NODE_W + to.x) / 2,
        y: (from.y + NODE_H / 2 + to.y + NODE_H / 2) / 2,
      };
    }
  });

  const highlightedJoins = (hoveredTable || activeTable)
    ? JOINS.filter((j) => j.from === (hoveredTable || activeTable) || j.to === (hoveredTable || activeTable)).map((j) => j.id)
    : [];

  const highlightedTables = hoveredJoin
    ? (() => { const j = JOINS.find((j) => j.id === hoveredJoin); return j ? [j.from, j.to] : []; })()
    : [];

  return (
    <div
      style={{
        width: "100%", height: "100vh", background: COLORS.bg,
        position: "relative", overflow: "hidden",
        fontFamily: "'Space Grotesk', sans-serif",
        cursor: draggingNode ? "grabbing" : isPanning ? "grabbing" : "grab",
      }}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Title bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between",
        alignItems: "center", background: "rgba(10,10,15,0.8)",
        backdropFilter: "blur(10px)", borderBottom: `1px solid ${COLORS.nodeBorder}`, zIndex: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1rem", fontWeight: 700, color: COLORS.accent }}>dbt</span>
          <span style={{ fontSize: "1.1rem", fontWeight: 600, color: COLORS.text }}>Lineage Explorer</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: COLORS.textMuted, marginLeft: "0.5rem" }}>
            {INITIAL_TABLES.length} models · {JOINS.length} joins
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: COLORS.textMuted }}>
            Drag nodes · Scroll to zoom · Drag background to pan
          </span>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: COLORS.textDim,
            background: COLORS.node, border: `1px solid ${COLORS.nodeBorder}`,
            padding: "0.3rem 0.6rem", borderRadius: "4px",
          }}>{Math.round(zoom * 100)}%</div>
          <button
            onClick={() => {
              const pos = {};
              INITIAL_TABLES.forEach((t) => { pos[t.id] = { x: t.x, y: t.y }; });
              setTablePositions(pos);
              setPan({ x: 40, y: 20 });
              setZoom(1);
              setActiveTable(null);
            }}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem",
              color: COLORS.textDim, background: COLORS.node,
              border: `1px solid ${COLORS.nodeBorder}`, padding: "0.3rem 0.75rem",
              borderRadius: "4px", cursor: "pointer", transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.target.style.borderColor = COLORS.accent; e.target.style.color = COLORS.accent; }}
            onMouseLeave={(e) => { e.target.style.borderColor = COLORS.nodeBorder; e.target.style.color = COLORS.textDim; }}
          >Reset</button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{
        position: "absolute", top: 0, left: 0, transformOrigin: "0 0",
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
      }}>
        <ConnectionLines
          tablePositions={tablePositions} joins={JOINS}
          hoveredTable={hoveredTable} hoveredJoin={hoveredJoin} activeTable={activeTable}
        />
        {INITIAL_TABLES.map((table) => (
          <TableNode
            key={table.id} table={table}
            position={tablePositions[table.id]}
            isHighlighted={highlightedTables.includes(table.id)}
            isActive={activeTable === table.id}
            isDragging={draggingNode === table.id}
            onHover={setHoveredTable}
            onClick={() => {}}
            onDragStart={handleNodeDragStart}
          />
        ))}
        {JOINS.map((join) => (
          <JoinNode
            key={join.id} join={join}
            position={joinPositions[join.id]}
            isHighlighted={highlightedJoins.includes(join.id) || hoveredJoin === join.id}
            onHover={setHoveredJoin}
          />
        ))}
      </div>

      <Legend />

      {/* Detail panel */}
      {activeTable && (
        <div style={{
          position: "absolute", top: 60, right: 20, width: 280,
          background: "rgba(18,18,26,0.95)", backdropFilter: "blur(20px)",
          border: `1px solid ${COLORS.nodeBorder}`, borderRadius: "12px",
          padding: "1.5rem", zIndex: 20,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem",
              color: schemaColor(INITIAL_TABLES.find((t) => t.id === activeTable)?.schema),
              textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
            }}>{INITIAL_TABLES.find((t) => t.id === activeTable)?.schema}</div>
            <div onClick={() => setActiveTable(null)}
              style={{ cursor: "pointer", color: COLORS.textMuted, fontSize: "1.2rem", lineHeight: 1 }}>×</div>
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "1rem",
            fontWeight: 600, color: COLORS.accent, marginBottom: "1rem",
          }}>{INITIAL_TABLES.find((t) => t.id === activeTable)?.label}</div>
          {[
            { label: "Primary Key", value: INITIAL_TABLES.find((t) => t.id === activeTable)?.pk },
            { label: "Row Count", value: INITIAL_TABLES.find((t) => t.id === activeTable)?.rows.toLocaleString() },
            { label: "Upstream", value: JOINS.filter((j) => j.to === activeTable).map((j) => j.from).join(", ") || "none (source)" },
            { label: "Downstream", value: JOINS.filter((j) => j.from === activeTable).map((j) => j.to).join(", ") || "none (terminal)" },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", padding: "0.45rem 0",
              borderBottom: i < 3 ? `1px solid ${COLORS.nodeBorder}` : "none",
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: COLORS.textMuted }}>{item.label}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: COLORS.textDim, textAlign: "right", maxWidth: "55%" }}>{item.value}</span>
            </div>
          ))}
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: `1px solid ${COLORS.nodeBorder}` }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem",
              color: COLORS.joinAccent, textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: "0.75rem", fontWeight: 600,
            }}>Join Relationships</div>
            {JOINS.filter((j) => j.from === activeTable || j.to === activeTable).map((j, i) => (
              <div key={i} style={{
                background: COLORS.joinAccentDim, border: `1px solid ${COLORS.joinBorder}`,
                borderRadius: "6px", padding: "0.5rem 0.65rem", marginBottom: "0.5rem",
              }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: COLORS.joinAccent, fontWeight: 600, marginBottom: "0.2rem" }}>{j.joinType}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", color: COLORS.textDim }}>{j.from === activeTable ? `→ ${j.to}` : `← ${j.from}`}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: COLORS.textMuted, marginTop: "0.15rem" }}>ON {j.criteria}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
