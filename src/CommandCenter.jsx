import { useState, useEffect, useRef } from "react";

const CATEGORIES = [
  { id: "work", label: "Work Issues", icon: "◆", accent: "#64ffda" },
  { id: "projects", label: "Claude Code Projects", icon: "⬡", accent: "#64ffda" },
  { id: "family", label: "Family & House", icon: "◉", accent: "#64ffda" },
  { id: "ideas", label: "Ideas Backlog", icon: "◇", accent: "#c4b5fd" },
];

const STORAGE_KEY = "command-center-v2";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return "today";
  if (diff < 172800000) return "yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CommandCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("work");
  const [newItemText, setNewItemText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [filter, setFilter] = useState("active");
  const inputRef = useRef(null);
  const editRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result && result.value) {
          setData(JSON.parse(result.value));
        } else {
          const init = {};
          CATEGORIES.forEach((c) => (init[c.id] = []));
          setData(init);
        }
      } catch {
        const init = {};
        CATEGORIES.forEach((c) => (init[c.id] = []));
        setData(init);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (data) {
      window.storage.set(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
    }
  }, [data]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [activeCategory]);

  useEffect(() => {
    if (editRef.current) editRef.current.focus();
  }, [editingId]);

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  if (loading || !data) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.loadingText}>loading...</div>
      </div>
    );
  }

  const activeCat = CATEGORIES.find((c) => c.id === activeCategory);
  const items = data[activeCategory] || [];
  const filtered =
    filter === "all"
      ? items
      : filter === "done"
        ? items.filter((i) => i.done)
        : items.filter((i) => !i.done);

  const activeCount = items.filter((i) => !i.done).length;
  const doneCount = items.filter((i) => i.done).length;

  function addItem(e) {
    if (e) e.preventDefault();
    const text = newItemText.trim();
    if (!text) return;
    const item = {
      id: generateId(),
      text,
      done: false,
      created: Date.now(),
      priority: false,
    };
    setData((prev) => ({
      ...prev,
      [activeCategory]: [item, ...prev[activeCategory]],
    }));
    setNewItemText("");
    if (inputRef.current) inputRef.current.focus();
  }

  function toggleDone(id) {
    setData((prev) => ({
      ...prev,
      [activeCategory]: prev[activeCategory].map((i) =>
        i.id === id ? { ...i, done: !i.done } : i
      ),
    }));
  }

  function togglePriority(id) {
    setData((prev) => ({
      ...prev,
      [activeCategory]: prev[activeCategory].map((i) =>
        i.id === id ? { ...i, priority: !i.priority } : i
      ),
    }));
  }

  function deleteItem(id) {
    setData((prev) => ({
      ...prev,
      [activeCategory]: prev[activeCategory].filter((i) => i.id !== id),
    }));
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditText(item.text);
  }

  function saveEdit(e) {
    if (e) e.preventDefault();
    const text = editText.trim();
    if (!text) return;
    setData((prev) => ({
      ...prev,
      [activeCategory]: prev[activeCategory].map((i) =>
        i.id === editingId ? { ...i, text } : i
      ),
    }));
    setEditingId(null);
    setEditText("");
  }

  function clearDone() {
    setData((prev) => ({
      ...prev,
      [activeCategory]: prev[activeCategory].filter((i) => !i.done),
    }));
  }

  const totalActive = CATEGORIES.reduce(
    (sum, c) => sum + (data[c.id] || []).filter((i) => !i.done).length,
    0
  );

  const hasInput = newItemText.trim().length > 0;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.headerLabel}>COMMAND CENTER</div>
          <h1 style={S.title}>
            {totalActive} open item{totalActive !== 1 ? "s" : ""}
          </h1>
        </div>
        <div style={S.dateBadge}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>

      <div style={S.tabs}>
        {CATEGORIES.map((cat) => {
          const count = (data[cat.id] || []).filter((i) => !i.done).length;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setFilter("active");
                setEditingId(null);
              }}
              style={{
                ...S.tab,
                borderColor: isActive ? cat.accent : "#1e293b",
                color: isActive ? "#e2e8f0" : "#8892a4",
                background: isActive ? "rgba(100,255,218,0.06)" : "transparent",
              }}
            >
              <span style={{ fontSize: 11, opacity: 0.7 }}>{cat.icon}</span>
              <span>{cat.label}</span>
              {count > 0 && (
                <span
                  style={{
                    ...S.badge,
                    background: isActive ? cat.accent : "#2d3f58",
                    color: isActive ? "#0a0a0f" : "#8892a4",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={S.inputRow}>
        <input
          ref={inputRef}
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addItem();
          }}
          placeholder={
            activeCategory === "ideas"
              ? "Capture an idea..."
              : "Add a task..."
          }
          style={{
            ...S.input,
            borderColor: hasInput ? "#64ffda" : "#1e293b",
          }}
        />
        <button
          type="button"
          onClick={() => addItem()}
          style={{
            ...S.addBtn,
            opacity: hasInput ? 1 : 0.3,
            cursor: hasInput ? "pointer" : "default",
            background: hasInput ? "#64ffda" : "transparent",
            color: hasInput ? "#0a0a0f" : "#4a5568",
            borderColor: hasInput ? "#64ffda" : "#1e293b",
          }}
        >
          Add
        </button>
      </div>

      <div style={S.filterRow}>
        <div style={S.filterGroup}>
          {["active", "done", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...S.filterBtn,
                color: filter === f ? "#64ffda" : "#4a5568",
                borderBottom:
                  filter === f
                    ? "1px solid #64ffda"
                    : "1px solid transparent",
              }}
            >
              {f}
              {f === "active" && activeCount > 0 && ` (${activeCount})`}
              {f === "done" && doneCount > 0 && ` (${doneCount})`}
            </button>
          ))}
        </div>
        {doneCount > 0 && filter === "done" && (
          <button onClick={clearDone} style={S.clearBtn}>
            clear done
          </button>
        )}
      </div>

      <div style={S.list}>
        {filtered.length === 0 && (
          <div style={S.emptyState}>
            {filter === "done"
              ? "Nothing completed yet"
              : filter === "active"
                ? activeCategory === "ideas"
                  ? "No ideas captured yet — what's brewing?"
                  : "All clear. Nice."
                : "Nothing here yet"}
          </div>
        )}
        {filtered.map((item) => (
          <div
            key={item.id}
            style={{
              ...S.item,
              opacity: item.done ? 0.4 : 1,
              borderLeftColor: item.priority ? "#64ffda" : "transparent",
              background: item.priority
                ? "rgba(100,255,218,0.03)"
                : "transparent",
            }}
          >
            {editingId === item.id ? (
              <div style={{ flex: 1, display: "flex", gap: 8 }}>
                <input
                  ref={editRef}
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => saveEdit()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  style={S.editInput}
                />
                <button type="button" onClick={() => saveEdit()} style={S.saveBtn}>
                  save
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => toggleDone(item.id)}
                  style={{
                    ...S.checkbox,
                    borderColor: item.done ? "#64ffda" : "#2d3f58",
                    background: item.done ? "#64ffda" : "transparent",
                  }}
                >
                  {item.done && <span style={S.checkmark}>✓</span>}
                </button>
                <div style={S.itemContent}>
                  <span
                    style={{
                      ...S.itemText,
                      textDecoration: item.done ? "line-through" : "none",
                      color: item.done ? "#4a5568" : "#e2e8f0",
                    }}
                    onDoubleClick={() => startEdit(item)}
                  >
                    {item.text}
                  </span>
                  <span style={S.itemDate}>{formatDate(item.created)}</span>
                </div>
                <div style={S.itemActions}>
                  <button
                    onClick={() => togglePriority(item.id)}
                    style={{
                      ...S.actionBtn,
                      color: item.priority ? "#64ffda" : "#2d3f58",
                    }}
                    title="Toggle priority"
                  >
                    {item.priority ? "★" : "☆"}
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    style={S.actionBtn}
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    style={{ ...S.actionBtn, color: "#5b3a3e" }}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div style={S.footer}>
        <span style={S.footerHint}>double-click to edit</span>
        <span style={S.footerHint}>★ = priority</span>
      </div>
    </div>
  );
}

const S = {
  container: {
    fontFamily: "'Space Grotesk', sans-serif",
    maxWidth: 700,
    margin: "0 auto",
    padding: "28px 20px",
    color: "#e2e8f0",
    minHeight: "100vh",
    fontSize: 13,
  },
  loadingWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "50vh",
  },
  loadingText: {
    color: "#4a5568",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 32,
    paddingBottom: 20,
    borderBottom: "1px solid #1e293b",
  },
  headerLeft: { display: "flex", flexDirection: "column", gap: 4 },
  headerLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#64ffda",
    letterSpacing: "0.1em",
    fontWeight: 500,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
    color: "#e2e8f0",
    letterSpacing: "-0.3px",
  },
  dateBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#8892a4",
    background: "rgba(255,255,255,0.03)",
    padding: "5px 12px",
    borderRadius: 6,
    border: "1px solid #1e293b",
  },
  tabs: {
    display: "flex",
    gap: 6,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 500,
    transition: "all 0.15s ease",
    background: "transparent",
  },
  badge: {
    fontSize: 10,
    padding: "1px 7px",
    borderRadius: 10,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    marginLeft: 2,
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid #1e293b",
    borderRadius: 8,
    padding: "11px 14px",
    color: "#e2e8f0",
    fontSize: 13,
    fontFamily: "'Space Grotesk', sans-serif",
    outline: "none",
    transition: "border-color 0.15s ease",
  },
  addBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    fontWeight: 600,
    padding: "11px 20px",
    borderRadius: 8,
    border: "1px solid",
    transition: "all 0.15s ease",
    letterSpacing: "0.02em",
    flexShrink: 0,
  },
  filterRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
  },
  filterGroup: { display: "flex", gap: 14 },
  filterBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    padding: "2px 0",
    letterSpacing: "0.04em",
    transition: "color 0.1s ease",
  },
  clearBtn: {
    background: "none",
    border: "1px solid #1e293b",
    borderRadius: 6,
    color: "#8892a4",
    cursor: "pointer",
    fontSize: 10,
    fontFamily: "'JetBrains Mono', monospace",
    padding: "4px 10px",
  },
  list: { display: "flex", flexDirection: "column", gap: 2 },
  emptyState: {
    textAlign: "center",
    color: "#2d3f58",
    padding: "48px 20px",
    fontSize: 13,
    fontStyle: "italic",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "11px 10px",
    borderRadius: 6,
    borderLeft: "2px solid",
    transition: "all 0.1s ease",
    minHeight: 42,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    border: "1.5px solid",
    cursor: "pointer",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    transition: "all 0.1s ease",
    background: "transparent",
  },
  checkmark: {
    fontSize: 11,
    color: "#0a0a0f",
    fontWeight: 700,
    lineHeight: 1,
  },
  itemContent: {
    flex: 1,
    display: "flex",
    alignItems: "baseline",
    gap: 10,
    minWidth: 0,
  },
  itemText: {
    flex: 1,
    lineHeight: 1.6,
    cursor: "default",
    wordBreak: "break-word",
    fontSize: 13,
  },
  itemDate: {
    fontSize: 10,
    color: "#2d3f58",
    flexShrink: 0,
    fontFamily: "'JetBrains Mono', monospace",
  },
  itemActions: { display: "flex", gap: 4, flexShrink: 0 },
  actionBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#2d3f58",
    fontSize: 15,
    padding: "2px 5px",
    fontFamily: "'Space Grotesk', sans-serif",
    lineHeight: 1,
    borderRadius: 4,
    transition: "color 0.1s ease",
  },
  editInput: {
    flex: 1,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid #2d3f58",
    borderRadius: 6,
    padding: "7px 10px",
    color: "#e2e8f0",
    fontSize: 13,
    fontFamily: "'Space Grotesk', sans-serif",
    outline: "none",
  },
  saveBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    padding: "7px 14px",
    borderRadius: 6,
    border: "1px solid #64ffda",
    background: "transparent",
    color: "#64ffda",
    cursor: "pointer",
    flexShrink: 0,
  },
  footer: {
    display: "flex",
    justifyContent: "center",
    gap: 20,
    marginTop: 28,
    paddingTop: 14,
    borderTop: "1px solid rgba(30,41,59,0.5)",
  },
  footerHint: {
    fontSize: 10,
    color: "#1e293b",
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.03em",
  },
};
