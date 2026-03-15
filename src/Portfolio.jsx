import { useState, useEffect, useRef } from "react";
import DbtDAG from "./DbtDAG";

const COLORS = {
  bg: "#0a0a0f",
  bgCard: "#12121a",
  bgCardHover: "#1a1a26",
  accent: "#64ffda",
  accentDim: "rgba(100,255,218,0.15)",
  accentGlow: "rgba(100,255,218,0.4)",
  text: "#e2e8f0",
  textDim: "#8892a4",
  textMuted: "#4a5568",
  border: "#1e293b",
  borderHover: "#2d3f58",
};

const NAV_ITEMS = ["About", "Case Studies", "Blog", "Resume"];

// ─── Animated Background Grid ───
function GridBackground() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    let mouse = { x: -1000, y: -1000 };
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", onMove);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const spacing = 60;
      const cols = Math.ceil(canvas.width / spacing) + 1;
      const rows = Math.ceil(canvas.height / spacing) + 1;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing;
          const y = j * spacing;
          const dx = mouse.x - x;
          const dy = mouse.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 200;
          const alpha = dist < maxDist ? 0.08 + 0.25 * (1 - dist / maxDist) : 0.08;
          const size = dist < maxDist ? 1.5 + 1.5 * (1 - dist / maxDist) : 1.5;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle =
            dist < maxDist
              ? `rgba(100,255,218,${alpha})`
              : `rgba(136,146,164,${alpha})`;
          ctx.fill();
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Animated counter for stats ───
function AnimatedStat({ value, suffix = "", label }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const step = Math.max(1, Math.floor(value / 40));
          const interval = setInterval(() => {
            start += step;
            if (start >= value) {
              start = value;
              clearInterval(interval);
            }
            setCount(start);
          }, 30);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);
  return (
    <div ref={ref} style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "2.5rem",
          fontWeight: 700,
          color: COLORS.accent,
          lineHeight: 1.2,
        }}
      >
        {count}
        {suffix}
      </div>
      <div
        style={{
          fontSize: "0.85rem",
          color: COLORS.textDim,
          marginTop: "0.5rem",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ─── Tag Pill ───
function Tag({ children }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.25rem 0.75rem",
        fontSize: "0.75rem",
        fontFamily: "'JetBrains Mono', monospace",
        color: COLORS.accent,
        background: COLORS.accentDim,
        borderRadius: "9999px",
        marginRight: "0.5rem",
        marginBottom: "0.5rem",
        letterSpacing: "0.03em",
      }}
    >
      {children}
    </span>
  );
}

// ─── Case Study Card ───
function CaseStudyCard({ title, subtitle, description, tags, metrics }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? COLORS.bgCardHover : COLORS.bgCard,
        border: `1px solid ${hovered ? COLORS.borderHover : COLORS.border}`,
        borderRadius: "12px",
        padding: "2rem",
        transition: "all 0.3s ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 20px 40px rgba(0,0,0,0.3), 0 0 30px ${COLORS.accentDim}`
          : "0 4px 12px rgba(0,0,0,0.2)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          fontSize: "0.75rem",
          color: COLORS.accent,
          fontFamily: "'JetBrains Mono', monospace",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "0.75rem",
        }}
      >
        {subtitle}
      </div>
      <h3
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          color: COLORS.text,
          margin: "0 0 1rem 0",
          fontFamily: "'Space Grotesk', sans-serif",
          lineHeight: 1.3,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          color: COLORS.textDim,
          lineHeight: 1.7,
          fontSize: "0.95rem",
          marginBottom: "1.5rem",
        }}
      >
        {description}
      </p>
      {metrics && (
        <div
          style={{
            display: "flex",
            gap: "2rem",
            marginBottom: "1.5rem",
            paddingBottom: "1.5rem",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          {metrics.map((m, i) => (
            <div key={i}>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: COLORS.accent,
                }}
              >
                {m.value}
              </div>
              <div style={{ fontSize: "0.75rem", color: COLORS.textMuted }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {tags.map((t, i) => (
          <Tag key={i}>{t}</Tag>
        ))}
      </div>
    </div>
  );
}

// ─── Blog Post Preview ───
function BlogPost({ title, date, excerpt, readTime }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "1.75rem 0",
        borderBottom: `1px solid ${COLORS.border}`,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "0.5rem",
        }}
      >
        <h3
          style={{
            fontSize: "1.2rem",
            fontWeight: 500,
            color: hovered ? COLORS.accent : COLORS.text,
            margin: 0,
            transition: "color 0.2s ease",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {hovered ? "→ " : ""}
          {title}
        </h3>
        <div
          style={{
            fontSize: "0.8rem",
            color: COLORS.textMuted,
            fontFamily: "'JetBrains Mono', monospace",
            whiteSpace: "nowrap",
            marginLeft: "2rem",
          }}
        >
          {date} · {readTime}
        </div>
      </div>
      <p
        style={{
          color: COLORS.textDim,
          fontSize: "0.9rem",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {excerpt}
      </p>
    </div>
  );
}

// ─── Section Heading ───
function SectionHeading({ number, title, id }) {
  return (
    <div id={id} style={{ marginBottom: "3rem", paddingTop: "6rem" }}>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.85rem",
          color: COLORS.accent,
          marginBottom: "0.75rem",
          letterSpacing: "0.05em",
        }}
      >
        {number}
      </div>
      <h2
        style={{
          fontSize: "2.5rem",
          fontWeight: 700,
          color: COLORS.text,
          margin: 0,
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          width: "60px",
          height: "3px",
          background: `linear-gradient(90deg, ${COLORS.accent}, transparent)`,
          marginTop: "1rem",
          borderRadius: "2px",
        }}
      />
    </div>
  );
}

// ─── Navigation ───
function Nav({ activeSection }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "1rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: scrolled ? "rgba(10,10,15,0.9)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid ${COLORS.border}` : "none",
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "1.1rem",
          fontWeight: 700,
          color: COLORS.accent,
          letterSpacing: "0.05em",
        }}
      >
        AM
      </div>
      <div style={{ display: "flex", gap: "2rem" }}>
        {NAV_ITEMS.map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase().replace(" ", "-")}`}
            style={{
              color:
                activeSection === item.toLowerCase().replace(" ", "-")
                  ? COLORS.accent
                  : COLORS.textDim,
              textDecoration: "none",
              fontSize: "0.85rem",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.05em",
              transition: "color 0.2s ease",
              position: "relative",
            }}
          >
            {item}
          </a>
        ))}
      </div>
    </nav>
  );
}

// ─── Main App ───
export default function Portfolio() {
  const [activeSection, setActiveSection] = useState("about");

  useEffect(() => {
    // Load fonts
    const link1 = document.createElement("link");
    link1.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap";
    link1.rel = "stylesheet";
    document.head.appendChild(link1);

    // Intersection observer for active nav
    const sections = document.querySelectorAll("[data-section]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.getAttribute("data-section"));
          }
        });
      },
      { rootMargin: "-40% 0px -40% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const containerStyle = {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "0 2rem",
    position: "relative",
    zIndex: 1,
  };

  return (
    <div
      style={{
        background: COLORS.bg,
        minHeight: "100vh",
        color: COLORS.text,
        fontFamily: "'Space Grotesk', sans-serif",
        overflowX: "hidden",
      }}
    >
      <GridBackground />
      <Nav activeSection={activeSection} />

      {/* ─── Hero ─── */}
      <div
        style={{
          ...containerStyle,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.9rem",
            color: COLORS.accent,
            marginBottom: "1.5rem",
            letterSpacing: "0.1em",
          }}
        >
          ADAM MIYATA
        </div>
        <h1
          style={{
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
            fontWeight: 700,
            lineHeight: 1.1,
            margin: "0 0 1.5rem 0",
            letterSpacing: "-0.03em",
          }}
        >
          I build data
          <br />
          infrastructure
          <br />
          <span style={{ color: COLORS.accent }}>at scale.</span>
        </h1>
        <p
          style={{
            fontSize: "1.15rem",
            color: COLORS.textDim,
            maxWidth: "550px",
            lineHeight: 1.7,
            marginBottom: "2.5rem",
          }}
        >
          Analytics Engineering leader with 20 years of quantitative experience.
          Currently sole domain owner of 350+ dbt models powering cell therapy
          analytics at a Fortune 500 pharma company. Background spanning
          financial consulting, actuarial science, and life sciences.
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <a
            href="#case-studies"
            style={{
              display: "inline-block",
              padding: "0.85rem 2rem",
              background: "transparent",
              border: `1px solid ${COLORS.accent}`,
              color: COLORS.accent,
              textDecoration: "none",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.85rem",
              letterSpacing: "0.05em",
              borderRadius: "4px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = COLORS.accentDim;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
            }}
          >
            View My Work →
          </a>
          <a
            href="/adam-miyata-resume.pdf"
            download="Adam-Miyata-Resume.pdf"
            style={{
              display: "inline-block",
              padding: "0.85rem 2rem",
              background: "transparent",
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textDim,
              textDecoration: "none",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.85rem",
              letterSpacing: "0.05em",
              borderRadius: "4px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = COLORS.borderHover;
              e.target.style.color = COLORS.text;
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = COLORS.border;
              e.target.style.color = COLORS.textDim;
            }}
          >
            Download Resume
          </a>
        </div>
      </div>

      {/* ─── About ─── */}
      <div style={containerStyle} data-section="about">
        <SectionHeading number="01" title="About" id="about" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "3rem",
            marginBottom: "4rem",
          }}
        >
          <div>
            <p style={{ color: COLORS.textDim, lineHeight: 1.8, fontSize: "1rem" }}>
              I'm an Analytics Engineering leader based in the Seattle area,
              currently at Bristol Myers Squibb where I architect dbt pipelines,
              canonical data models, and analytics platforms that enable data-driven
              decisions across Cell Therapy R&D, Manufacturing, and Commercial teams.
            </p>
            <p style={{ color: COLORS.textDim, lineHeight: 1.8, fontSize: "1rem", marginTop: "1rem" }}>
              My background is unusual: a BA in Mathematics from Western Washington
              University, an MS in Electrical Engineering from CU Boulder (3.99 GPA),
              and two decades of building quantitative systems across actuarial science,
              financial consulting, and life sciences. I thrive in ambiguity, love
              building from zero to one, and have a track record of scaling data
              infrastructure that others said couldn't be done with the resources available.
            </p>
            <p style={{ color: COLORS.textDim, lineHeight: 1.8, fontSize: "1rem", marginTop: "1rem" }}>
              I'm passionate about AI safety and the intersection of data engineering
              and AI. I'm exploring how tools like MCP servers and LLMs can transform
              analytics workflows.
            </p>
          </div>
          <div>
            <div
              style={{
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: "12px",
                padding: "2rem",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.75rem",
                  color: COLORS.accent,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "1.5rem",
                }}
              >
                Core Stack
              </div>
              {[
                { category: "Data Modeling", tools: "dbt, SQL, Snowflake, Databricks" },
                { category: "Platforms", tools: "Spark, Redshift, Presto/Trino" },
                { category: "Languages", tools: "SQL, Python, JavaScript, C" },
                { category: "Cloud", tools: "AWS (Lambda, DynamoDB, SQS, API GW)" },
                { category: "Visualization", tools: "Tableau, Spotfire, Power BI" },
                { category: "Exploring", tools: "MCP, Claude API, OpenAI API" },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.6rem 0",
                    borderBottom:
                      i < 5 ? `1px solid ${COLORS.border}` : "none",
                    fontSize: "0.9rem",
                  }}
                >
                  <span style={{ color: COLORS.textMuted }}>{item.category}</span>
                  <span style={{ color: COLORS.textDim }}>{item.tools}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "2rem",
            padding: "3rem 0",
            borderTop: `1px solid ${COLORS.border}`,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <AnimatedStat value={350} suffix="+" label="dbt Models Managed" />
          <AnimatedStat value={20} suffix="+" label="Years Experience" />
          <AnimatedStat value={30} suffix="" label="Glue Scripts Migrated" />
          <AnimatedStat value={200} suffix="+" label="Models Built From Scratch" />
        </div>
      </div>

      {/* ─── Case Studies ─── */}
      <div style={containerStyle} data-section="case-studies">
        <SectionHeading number="02" title="Case Studies" id="case-studies" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "2rem",
          }}
        >
          <CaseStudyCard
            subtitle="Data Infrastructure Migration"
            title="AWS Glue to dbt: Rebuilding Cell Therapy Analytics from Scratch"
            description="Led the complete migration of 30+ AWS Glue ETL scripts into a modern dbt-based analytics platform. Designed and built 200+ data models from scratch, establishing the canonical data layer for the entire Cell Therapy commercial organization. The migration improved data reliability, reduced pipeline maintenance overhead, and enabled self-serve analytics for downstream stakeholders."
            tags={["dbt", "Snowflake", "AWS Glue", "SQL", "Data Modeling", "ETL"]}
            metrics={[
              { value: "30+", label: "Glue scripts replaced" },
              { value: "200+", label: "dbt models created" },
              { value: "~80%", label: "Maintenance reduction" },
            ]}
          />
          <CaseStudyCard
            subtitle="Solo Domain Ownership"
            title="Scaling a 350+ Model Domain as a One-Person Team"
            description="Assumed sole ownership of the entire Cell Therapy data domain after team consolidation. Currently managing 350+ dbt models, handling everything from stakeholder requirements gathering to pipeline monitoring, data quality, and incident response. Developed patterns and conventions that allow one person to maintain what was previously supported by a much larger team."
            tags={[
              "dbt",
              "Analytics Engineering",
              "Data Architecture",
              "Stakeholder Management",
            ]}
            metrics={[
              { value: "350+", label: "Active models" },
              { value: "1", label: "Engineer" },
              { value: "10-15", label: "Previous team size" },
            ]}
          />
          <CaseStudyCard
            subtitle="Side Project"
            title="dbt-MCP: Connecting Language Models to Analytics Infrastructure"
            description="Exploring the integration of Model Context Protocol (MCP) servers with dbt to enable AI-powered analytics workflows. Building tooling that allows LLMs to interact with data models, understand lineage, and assist with data engineering tasks — bridging the gap between modern AI capabilities and production data infrastructure."
            tags={["MCP", "Claude API", "dbt", "Node.js", "AI/ML", "Open Source"]}
          />
          <CaseStudyCard
            subtitle="Side Project"
            title="Minecraft Bot System: AI-Powered Game Agents"
            description="Built a Node.js-based bot system using mineflayer that connects to OpenAI's API for natural language interaction and autonomous behavior in Minecraft. Explored real-time decision-making, pathfinding, and conversational AI integration in a complex 3D environment."
            tags={["Node.js", "mineflayer", "OpenAI API", "JavaScript", "AI Agents"]}
          />
        </div>

        {/* Interactive DAG Demo */}
        <div style={{ marginTop: "3rem" }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.75rem",
              color: COLORS.accent,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "0.75rem",
            }}
          >
            Interactive Demo
          </div>
          <h3
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              color: COLORS.text,
              margin: "0 0 0.75rem 0",
              fontFamily: "'Space Grotesk', sans-serif",
              lineHeight: 1.3,
            }}
          >
            dbt Lineage Explorer
          </h3>
          <p
            style={{
              color: COLORS.textDim,
              lineHeight: 1.7,
              fontSize: "0.95rem",
              marginBottom: "1.5rem",
              maxWidth: "600px",
            }}
          >
            An interactive visualization of data model lineage with join criteria.
            Drag nodes to rearrange, hover to highlight relationships, click to inspect details.
            Scroll to zoom, drag background to pan.
          </p>
          <div
            style={{
              borderRadius: "12px",
              overflow: "hidden",
              border: `1px solid ${COLORS.border}`,
              height: "550px",
            }}
          >
            <DbtDAG />
          </div>
        </div>
      </div>

      {/* ─── Blog ─── */}
      <div style={containerStyle} data-section="blog">
        <SectionHeading number="03" title="Blog" id="blog" />
        <div
          style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "12px",
            padding: "1rem 2rem",
          }}
        >
          <div
            onClick={() => { window.location.hash = '#/blog/rebuilding-legacy-pipeline'; }}
            style={{ cursor: 'pointer' }}
          >
            <BlogPost
              title="Rebuilding a Legacy Data Pipeline in dbt: Patterns That Scaled"
              date="Feb 2026"
              readTime="12 min"
              excerpt="Patterns, conventions, and hard-won lessons from maintaining a large dbt project through cross-functional collaboration. What works, what doesn't, and what I'd do differently."
            />
          </div>
          <BlogPost
            title="From Actuarial Science to Analytics Engineering"
            date="Coming Soon"
            readTime="6 min"
            excerpt="How a background in quantitative finance and risk modeling shaped my approach to data engineering — and why the skills transfer better than you'd think."
          />
          <BlogPost
            title="Connecting LLMs to Your Data Stack with MCP"
            date="Coming Soon"
            readTime="10 min"
            excerpt="A practical guide to building MCP server integrations that let AI assistants interact with your dbt models, query your warehouse, and understand your data lineage."
          />
        </div>
        <p
          style={{
            color: COLORS.textMuted,
            fontSize: "0.85rem",
            fontFamily: "'JetBrains Mono', monospace",
            marginTop: "1.5rem",
            fontStyle: "italic",
          }}
        >
          More posts in progress.
        </p>
      </div>

      {/* ─── Resume ─── */}
      <div style={containerStyle} data-section="resume">
        <SectionHeading number="04" title="Resume" id="resume" />
        <div
          style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "12px",
            padding: "2.5rem",
          }}
        >
          {/* Timeline */}
          {[
            {
              period: "2022 – Present",
              role: "Manager, Analytics Engineering",
              company: "Bristol Myers Squibb",
              description:
                "Lead Cell Therapy data architecture for enterprise Unified Data Model. Migrated 30+ AWS Glue scripts to 200+ dbt models. Own end-to-end data infrastructure, building Python automation that reduced manual processing by 80 hrs/week. Managing workload previously handled by 10-15 FTEs.",
            },
            {
              period: "2019 – 2022",
              role: "Senior Pension Processor",
              company: "Zenith American Solutions",
              description:
                "Designed benefit verification tools for pension plans serving 200,000+ participants. Implemented automation saving 80 hours/week of labor.",
            },
            {
              period: "2016 – 2019",
              role: "Sr. Consultant / Sr. Benefits Analyst",
              company: "Pension Live / Willis Towers Watson",
              description:
                "Data systems implementation, benefit calculation tools, pension valuation data pipelines. Contributed to $1M contract win through technical documentation.",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "200px 1fr",
                gap: "2rem",
                paddingBottom: i === 0 ? "2rem" : 0,
                marginBottom: i === 0 ? "2rem" : 0,
                borderBottom: i === 0 ? `1px solid ${COLORS.border}` : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.85rem",
                  color: COLORS.textMuted,
                }}
              >
                {item.period}
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 600,
                    color: COLORS.text,
                    margin: "0 0 0.25rem 0",
                  }}
                >
                  {item.role}
                </h3>
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: COLORS.accent,
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: "0.75rem",
                  }}
                >
                  {item.company}
                </div>
                <p
                  style={{
                    color: COLORS.textDim,
                    lineHeight: 1.7,
                    fontSize: "0.9rem",
                    margin: 0,
                  }}
                >
                  {item.description}
                </p>
              </div>
            </div>
          ))}

          {/* Education */}
          <div
            style={{
              marginTop: "2rem",
              paddingTop: "2rem",
              borderTop: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.75rem",
                color: COLORS.accent,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "1.25rem",
              }}
            >
              Education
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
              }}
            >
              <div>
                <div style={{ color: COLORS.text, fontWeight: 500 }}>
                  MS Electrical Engineering
                </div>
                <div style={{ color: COLORS.textMuted, fontSize: "0.85rem" }}>
                  University of Colorado – Boulder · GPA: 3.99
                </div>
              </div>
              <div>
                <div style={{ color: COLORS.text, fontWeight: 500 }}>
                  BA Mathematics
                </div>
                <div style={{ color: COLORS.textMuted, fontSize: "0.85rem" }}>
                  Western Washington University
                </div>
              </div>
            </div>
          </div>

          {/* Download button */}
          <div style={{ marginTop: "2.5rem" }}>
            <a
              href="/adam-miyata-resume.pdf"
              download="Adam-Miyata-Resume.pdf"
              style={{
                display: "inline-block",
                padding: "0.85rem 2rem",
                background: COLORS.accentDim,
                border: `1px solid ${COLORS.accent}`,
                color: COLORS.accent,
                textDecoration: "none",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.85rem",
                letterSpacing: "0.05em",
                borderRadius: "4px",
                transition: "all 0.2s ease",
              }}
            >
              ↓ Download Full Resume (PDF)
            </a>
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer
        style={{
          ...containerStyle,
          padding: "6rem 2rem 3rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "2rem",
            marginBottom: "2rem",
          }}
        >
          {[
            { label: "GitHub", href: "https://github.com/akmiyata" },
            { label: "LinkedIn", href: "https://linkedin.com/in/akmiyata" },
            { label: "Email", href: "mailto:akmiyata@gmail.com" },
            { label: "FIRE Calculator", href: "#/fire" },
          ].map((link, i) => (
            <a
              key={i}
              href={link.href}
              style={{
                color: COLORS.textDim,
                textDecoration: "none",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.85rem",
                transition: "color 0.2s ease",
                letterSpacing: "0.05em",
              }}
              onMouseEnter={(e) => (e.target.style.color = COLORS.accent)}
              onMouseLeave={(e) => (e.target.style.color = COLORS.textDim)}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div
          style={{
            color: COLORS.textMuted,
            fontSize: "0.8rem",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          © 2026 Adam Miyata · Built with React
        </div>
      </footer>
    </div>
  );
}
