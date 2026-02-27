import { useState, useEffect } from "react";

const COLORS = {
  bg: "#0a0f1c",
  bgCard: "rgba(255,255,255,0.03)",
  text: "#e2e8f0",
  textDim: "#94a3b8",
  textMuted: "#64748b",
  accent: "#64ffda",
  border: "rgba(255,255,255,0.08)",
  codeBg: "rgba(0,0,0,0.4)",
  codeBorder: "rgba(100,255,218,0.15)",
  tableBorder: "rgba(255,255,255,0.12)",
  tableHeader: "rgba(100,255,218,0.08)",
};

const mono = "'JetBrains Mono', monospace";
const sans = "'Space Grotesk', sans-serif";
const serif = "'Inter', -apple-system, sans-serif";

function Code({ children, language }) {
  return (
    <div
      style={{
        background: COLORS.codeBg,
        border: `1px solid ${COLORS.codeBorder}`,
        borderRadius: "8px",
        padding: "1.25rem",
        marginBottom: "1.5rem",
        overflowX: "auto",
      }}
    >
      {language && (
        <div
          style={{
            fontSize: "0.7rem",
            color: COLORS.accent,
            fontFamily: mono,
            marginBottom: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {language}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          fontFamily: mono,
          fontSize: "0.82rem",
          lineHeight: 1.65,
          color: COLORS.textDim,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {children}
      </pre>
    </div>
  );
}

function InlineCode({ children }) {
  return (
    <code
      style={{
        background: COLORS.codeBg,
        border: `1px solid ${COLORS.codeBorder}`,
        borderRadius: "4px",
        padding: "0.15em 0.4em",
        fontFamily: mono,
        fontSize: "0.85em",
        color: COLORS.accent,
      }}
    >
      {children}
    </code>
  );
}

const pStyle = {
  color: COLORS.text,
  fontSize: "1.05rem",
  lineHeight: 1.8,
  marginBottom: "1.25rem",
  fontFamily: serif,
};

const h2Style = {
  fontSize: "1.6rem",
  fontWeight: 600,
  color: COLORS.text,
  fontFamily: sans,
  marginTop: "3rem",
  marginBottom: "1rem",
  paddingBottom: "0.5rem",
  borderBottom: `1px solid ${COLORS.border}`,
};

const bulletStyle = {
  ...pStyle,
  marginBottom: "0.5rem",
  paddingLeft: "0.5rem",
};

export default function BlogPostPage({ onBack }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "740px", margin: "0 auto", padding: "2rem 0" }}>
        {/* Back navigation */}
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: COLORS.accent,
            fontFamily: mono,
            fontSize: "0.85rem",
            cursor: "pointer",
            padding: "0.5rem 0",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
          onMouseEnter={(e) => (e.target.style.opacity = 0.7)}
          onMouseLeave={(e) => (e.target.style.opacity = 1)}
        >
          ← Back to home
        </button>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div
            style={{
              fontFamily: mono,
              fontSize: "0.8rem",
              color: COLORS.accent,
              marginBottom: "1rem",
              letterSpacing: "0.05em",
            }}
          >
            February 2026 · 12 min read
          </div>
          <h1
            style={{
              fontSize: "2.4rem",
              fontWeight: 700,
              color: COLORS.text,
              fontFamily: sans,
              lineHeight: 1.2,
              margin: "0 0 1rem 0",
            }}
          >
            Rebuilding a Legacy Data Pipeline in dbt: Patterns That Scaled
          </h1>
          <p
            style={{
              fontSize: "1.15rem",
              color: COLORS.textDim,
              lineHeight: 1.6,
              fontFamily: serif,
              fontStyle: "italic",
              margin: 0,
            }}
          >
            Patterns, conventions, and hard-won lessons from maintaining a large
            dbt project through cross-functional collaboration. What works, what
            doesn't, and what I'd do differently.
          </p>
        </div>

        <div
          style={{
            height: "1px",
            background: `linear-gradient(90deg, ${COLORS.accent}, transparent)`,
            marginBottom: "2.5rem",
          }}
        />

        {/* Body */}
        <p style={pStyle}>
          When I inherited 32 AWS Glue PySpark scripts — nearly 10,000 lines of
          embedded SQL, string manipulation, and Spark DataFrame operations — my
          job was to rebuild everything in dbt (NOT refactor/lift & shift).
          Rebuild from raw sources all the way to production data products, while
          the existing pipeline kept running in production.
        </p>

        <p style={pStyle}>
          Several months and a few hundred commits later, those 32 monolithic
          scripts have been consolidated into ~180 dbt models, 66 schema YAML
          files, and over 20,000 lines of SQL across 8 source systems. More
          models and more lines of code, but dramatically less complexity: every
          model has a single responsibility, an explicit dependency graph,
          automated tests, and schema documentation. The sprawl of
          self-contained scripts — each with its own hardcoded paths, its own
          deduplication strategy, its own undocumented assumptions — has been
          replaced by a governed, testable ecosystem. This work required close
          collaboration with teammates and stakeholders across domains. Here's
          what I learned.
        </p>

        {/* ─── The Starting Point ─── */}
        <h2 style={h2Style}>The Starting Point: Glue Script Architecture</h2>

        <p style={pStyle}>
          The legacy pipeline was a collection of AWS Glue jobs written in
          PySpark. Each script was self-contained — it read raw parquet files
          from S3 paths, applied transformations inline, and wrote Iceberg
          tables. There was no dependency graph, no lineage, no tests. If you
          wanted to understand how a column was derived, you tediously traced it
          through nested Spark DataFrame operations, temporary views, and SQL
          strings embedded inside Python f-strings.
        </p>

        <p style={pStyle}>Here's the kind of thing I was working with:</p>

        <Code language="python">
{`PP_node = glueContext.create_data_frame.from_catalog(
    database="gps_celltherapy_spc_dataproduct",
    table_name="spc_process_parameter"
)

PQ_node = glueContext.create_data_frame.from_catalog(
    database="gps_celltherapy_spc_dataproduct",
    table_name="spc_quality_attribute"
)

# 150 lines later...
pivot_df = (df_res.groupBy(group_cols)
    .pivot("attribute", values=all_attributes)
    .agg(F.max("paramvalue").alias("value"),
         F.max("paramrecorddatetime").alias("timestamp")))`}
        </Code>

        <p style={pStyle}>
          Each script had its own hardcoded S3 paths, its own way of joining to
          reference data, its own deduplication strategy. Some used{" "}
          <InlineCode>ROW_NUMBER()</InlineCode> partitioned by lot and parameter
          name. Others used <InlineCode>MAX()</InlineCode>. Others used both, in
          different CTEs, for different columns. The logic was correct — it had
          been validated over years of production use — but it was opaque,
          fragile, and impossible to test in isolation.
        </p>

        <p style={pStyle}>My job was to turn this into something maintainable.</p>

        {/* ─── Lesson 1 ─── */}
        <h2 style={h2Style}>Lesson 1: Layer Your Models</h2>

        <p style={pStyle}>
          The single most valuable decision was adopting a strict three-layer
          architecture — credit to the Analytics Engineering team for
          establishing this pattern and guiding it into practice:
        </p>

        <Code>
{`staging_by_theme_and_source/    # One-to-one with raw tables
    sap/
    oracle/
    lims_eln/
    manufacturing_events_systems/
    gps/
    ... (8 source systems total)

ct_core/marts_and_capabilities/  # Subject-area marts
    manufacturing/               # Site-level: Devens, Leiden, S12, Bothell
    quality/                     # Quality attributes, lot descriptions
    patient_journey/
    material_traceability/

data_products/                   # Curated, consumption-ready
    pcpq/                        # Process Control & Product Quality
    batch_conformance/
    decision_engine/
    chip/`}
        </Code>

        <p style={pStyle}>
          Staging models are boring by design. They rename columns, cast types,
          and filter out obviously invalid rows. That's it. No joins, business
          logic, nor cleverness. Every staging model maps one-to-one with a raw
          source table.
        </p>

        <p style={pStyle}>
          The marts layer is where site-specific contextualization logic lives.
          Each manufacturing site (Devens, Leiden, Bothell, S12) has its own set
          of intermediate models because each site's source system has its own
          schema, its own quirks, its own way of recording lot numbers and
          process parameters. This intermediate, site-specific logic step
          prepares the data so we output a harmonized and consistent layer we
          call the Unified Data Model (UDM). The UDM is directly accessible to
          consumers who need flexible, cross-site queries without the constraints
          of a pre-defined output shape.
        </p>

        <p style={pStyle}>
          When specific outputs are expected for a business need, the Data
          Product layer enables that. Data products join marts, apply business
          rules, and produce the curated tables that downstream applications and
          reports depend on.
        </p>

        <p style={pStyle}>
          This layering seems obvious. It's straight out of the dbt docs. In a
          collaborative environment, it's not an organizational nicety — it's
          survival. When something breaks at 2 AM, I need to know instantly
          whether the problem is in source data (staging), contextualization
          logic (marts), or business rules (data products). Three layers means I
          can quickly search my way to the root cause.
        </p>

        {/* ─── Lesson 2 ─── */}
        <h2 style={h2Style}>
          Lesson 2: Understand the Platform's Limits Before They Bite You
        </h2>

        <p style={pStyle}>
          My most complex data product — the PCPQ (Process Control & Product
          Quality) table — pivots hundreds of manufacturing parameters from long
          format into a wide table. In the Glue pipeline, this was a single
          PySpark pivot operation. In dbt, it's a Jinja loop that generates a{" "}
          <InlineCode>MAX(CASE WHEN ... END)</InlineCode> expression for each
          parameter.
        </p>

        <p style={pStyle}>
          The compiled SQL exceeded 68,000 characters. dbt-glue refused to
          execute it.
        </p>

        <p style={pStyle}>
          I had to split the pivot across three intermediate models —{" "}
          <InlineCode>spc_pcpq_pivoted_p1</InlineCode>,{" "}
          <InlineCode>p2</InlineCode>, and <InlineCode>p3</InlineCode> —
          partitioned alphabetically by field name, then join them back together
          in the final model. It's ugly, but it works. And I have a comment at
          the top of each file explaining why:
        </p>

        <Code language="sql">
{`{#
    Part 1 of 3: Pivots first batch of pcpq fields (alphabetically: a... to e...).
    Split to stay under Glue's 68,000 character limit.
#}`}
        </Code>

        <p style={pStyle}>
          Platform constraints shape your architecture whether you plan for them
          or not. Document them, because six months from now you won't remember
          why there are three pivot models instead of one, and you'll be tempted
          to "simplify" them back into a single model.
        </p>

        <p style={pStyle}>
          Another platform lesson: MES timestamps from one of our source systems
          are stored in UTC. Every timestamp column in the 5-day analytics model
          needs conversion to Pacific time with a specific rounding pattern to
          avoid off-by-one-second errors:
        </p>

        <Code language="sql">
{`date_trunc('second',
    from_utc_timestamp(ts_col, 'America/Los_Angeles')
    + interval 500 milliseconds
)`}
        </Code>

        <p style={pStyle}>
          I didn't discover this from documentation. I discovered it from a
          reconciliation where 47 rows had timestamps exactly one second off from
          the validated output. The{" "}
          <InlineCode>+ interval 500 milliseconds</InlineCode> before truncation
          handles the .5-second boundary case. This is the kind of tribal
          knowledge that lives in comments now.
        </p>

        {/* ─── Lesson 3 ─── */}
        <h2 style={h2Style}>Lesson 3: Reconciliation Is the Migration</h2>

        <p style={pStyle}>
          I spent more time reconciling dbt output against the production Glue
          pipeline than I spent writing the dbt models themselves. This is not an
          exaggeration.
        </p>

        <p style={pStyle}>
          The workflow looks like this: build the model, run it, export distinct
          key columns, export the same from production, and diff. Every. Single.
          Time.
        </p>

        <Code language="sql">
{`-- dbt output
SELECT DISTINCT joinid, arm, lotcode FROM "ct_dataproducts"."spc_pcpq"

-- Production (validated) output
SELECT DISTINCT joinid, arm, lotcode FROM "gps_celltherapy_spc_dataproduct"."spc_pcpq"`}
        </Code>

        <p style={pStyle}>
          Then you investigate every discrepancy. Some are expected — the
          pipelines run at different intervals, so source data freshness causes
          natural drift. Some reveal real logic bugs. A recent reconciliation
          turned up 119 rows in dbt but not in production, and 13 rows in
          production but not in dbt. After pulling full row details for both
          sets, I found:
        </p>

        <ul style={{ marginBottom: "1.5rem", paddingLeft: "1.5rem" }}>
          <li style={bulletStyle}>
            <strong style={{ color: COLORS.accent }}>108 rows</strong>: different
            lotcodes for the same patients — a source data timing issue (dbt runs
            every 4 hours, the Glue pipeline runs daily)
          </li>
          <li style={bulletStyle}>
            <strong style={{ color: COLORS.accent }}>~10 rows</strong>: NULL arm
            values that the production pipeline silently drops
          </li>
        </ul>

        <p style={pStyle}>
          Two of those categories were genuine filter omissions. One was an
          expected timing artifact. You can't distinguish them without looking at
          the actual data.
        </p>

        <p style={pStyle}>I built dedicated analysis models for this:</p>

        <Code>
{`analyses/
    compare_5d_seed_vs_model.sql       # Column-by-column comparison
    compare_5d_hmes.sql                # Cross-check against reference data
    compare_5d_values_mismatch.sql     # Rows where values differ`}
        </Code>

        <p style={pStyle}>
          The <InlineCode>audit_helper</InlineCode> package has been invaluable
          here. But the honest truth is that most reconciliation is manual,
          painstaking, and requires understanding the business context of every
          single discrepancy.
        </p>

        {/* ─── Lesson 4 ─── */}
        <h2 style={h2Style}>
          Lesson 4: Filter Placement Matters More Than You Think
        </h2>

        <p style={pStyle}>
          Here's a mistake I made recently that cost me a full rebuild cycle.
        </p>

        <p style={pStyle}>
          The production pipeline excludes rows where <InlineCode>arm</InlineCode>{" "}
          is NULL or empty. Straightforward — add a{" "}
          <InlineCode>
            WHERE arm IS NOT NULL AND TRIM(arm) {"<>"} ''
          </InlineCode>{" "}
          filter. But <em>where</em> you add it matters enormously.
        </p>

        <p style={pStyle}>
          I initially added it in the <InlineCode>pp_pq_union</InlineCode> CTE
          inside the pivot models — before the{" "}
          <InlineCode>GROUP BY</InlineCode>. This filtered out individual
          parameter records that happened to have a NULL arm. The problem: a
          single lot might have 200 parameter records across process parameters
          and quality attributes. Most have{" "}
          <InlineCode>arm = 'CD8'</InlineCode>. A handful from the quality
          attributes source have <InlineCode>arm = NULL</InlineCode>. Filtering
          before the <InlineCode>GROUP BY</InlineCode> dropped those quality
          attribute values entirely, causing the final row to lose data for those
          parameters.
        </p>

        <p style={pStyle}>
          The count went from 67,216 to 49,480. An 18,000-row drop when I
          expected to lose about 10 rows.
        </p>

        <p style={pStyle}>
          The fix: apply the arm filter on the <em>final output</em> of{" "}
          <InlineCode>spc_pcpq.sql</InlineCode>, after the{" "}
          <InlineCode>GROUP BY</InlineCode> has already aggregated all parameter
          values. The NHU filter, on the other hand, belongs in the pivot models
          before aggregation — because if a lot is NHU, you want to exclude all
          its parameter records, not just the final row.
        </p>

        <p style={pStyle}>
          Same type of filter. Different correct placement. The only way to know
          is to understand what the filter means semantically and where it
          operates in the grain of the data.
        </p>

        {/* ─── Lesson 5 ─── */}
        <h2 style={h2Style}>
          Lesson 5: Document Like You'll Be Hit by a Bus
        </h2>

        <p style={pStyle}>
          I maintain a <InlineCode>CLAUDE.md</InlineCode> file at the project
          root that serves as the canonical reference for anyone (including
          future me) who needs to understand the project. It covers:
        </p>

        <ul style={{ marginBottom: "1.5rem", paddingLeft: "1.5rem" }}>
          <li style={bulletStyle}>
            How to run dbt commands (including the correct working directory)
          </li>
          <li style={bulletStyle}>
            The full model architecture with a visual directory tree
          </li>
          <li style={bulletStyle}>
            The PCPQ lineage graph from raw sources to final data product
          </li>
          <li style={bulletStyle}>
            Known quirks and gotchas (the 68K character limit, CAPH exclusion
            logic, UTC conversion)
          </li>
          <li style={bulletStyle}>
            SQL conventions, naming standards, and testing requirements
          </li>
          <li style={bulletStyle}>
            Validation and reconciliation procedures
          </li>
        </ul>

        <p style={pStyle}>
          This file is not aspirational documentation. It's a living record of
          every decision that took more than five minutes to make. When I
          discover that <InlineCode>COALESCE(arm, '')</InlineCode> in a join
          condition causes different behavior than{" "}
          <InlineCode>arm = arm</InlineCode> for NULL values, that goes in the
          doc. When I learn that Glue's Spark SQL doesn't support{" "}
          <InlineCode>::type</InlineCode> casting, that goes in the doc.
        </p>

        <p style={pStyle}>
          Every model that has non-obvious logic gets a comment block explaining
          the <em>why</em>, not the <em>what</em>:
        </p>

        <Code language="sql">
{`-- Join all 3 pivot parts on common dimensions
-- Rename _dt columns to _timestamp for backward compatibility with production schema`}
        </Code>

        <Code language="sql">
{`-- Deduplicate SAP data to one row per product_lot_number using MAX() for all columns
-- This handles cases where oos_erp_sap has duplicate product_lot_numbers`}
        </Code>

        <p style={pStyle}>
          These comments look trivial. They save me 30 minutes every time I
          revisit the model.
        </p>

        {/* ─── Lesson 6 ─── */}
        <h2 style={h2Style}>
          Lesson 6: Source System Diversity Is the Real Complexity
        </h2>

        <p style={pStyle}>
          The hardest part of this project isn't dbt. It's the fact that data
          needs to be integrated from 8 source systems that each have their own
          schema, their own semantics, and their own way of representing the same
          business concept.
        </p>

        <p style={pStyle}>
          Take <InlineCode>lotcode</InlineCode> — a manufacturing lot identifier.
          Here's how each source system provides it:
        </p>

        {/* Lotcode table */}
        <div
          style={{
            overflowX: "auto",
            marginBottom: "1.5rem",
            borderRadius: "8px",
            border: `1px solid ${COLORS.tableBorder}`,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: serif,
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr style={{ background: COLORS.tableHeader }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0.75rem 1rem",
                    color: COLORS.accent,
                    fontWeight: 600,
                    borderBottom: `1px solid ${COLORS.tableBorder}`,
                    fontFamily: sans,
                  }}
                >
                  Source
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0.75rem 1rem",
                    color: COLORS.accent,
                    fontWeight: 600,
                    borderBottom: `1px solid ${COLORS.tableBorder}`,
                    fontFamily: sans,
                  }}
                >
                  How lotcode is derived
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["EMES (Devens, Leiden, S12)", "orders.LotCode — a direct field"],
                [
                  "MES Jump (Bothell)",
                  "Extracted from activityinstanceparameters where name = 'PS_I_LOT_NUMBER'",
                ],
                ["LabWare LIMS", "COALESCE(batch, LEFT(text_id, 11))"],
                ["Jump LIMS", "LEFT(sample.label_id, 11)"],
                ["SAP", "product_lot_number from material master"],
                ["Oracle EBS", "lot_number from batch master"],
              ].map(([source, derivation], i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom:
                      i < 5 ? `1px solid ${COLORS.tableBorder}` : "none",
                  }}
                >
                  <td
                    style={{
                      padding: "0.6rem 1rem",
                      color: COLORS.text,
                      fontWeight: 500,
                      fontFamily: mono,
                      fontSize: "0.82rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {source}
                  </td>
                  <td
                    style={{
                      padding: "0.6rem 1rem",
                      color: COLORS.textDim,
                    }}
                  >
                    {derivation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={pStyle}>
          Six source systems, six different derivation paths for the same
          business concept. In the Glue pipeline, this diversity was hidden
          inside monolithic scripts. In dbt, it's explicit — each site has its
          own intermediate model, and the{" "}
          <InlineCode>spc_process_parameter_base</InlineCode> model unions them
          with a clear column mapping.
        </p>

        <p style={pStyle}>
          This is where dbt's <InlineCode>ref()</InlineCode> function earns its
          keep. When I need to change how Bothell derives its lot code, I change
          one model. The dependency graph ensures everything downstream rebuilds
          correctly. In the Glue world, I would have had to manually trace which
          downstream scripts read from the Bothell intermediate table and hope I
          didn't miss one.
        </p>

        {/* ─── What I'd Do Differently ─── */}
        <h2 style={h2Style}>What I'd Do Differently</h2>

        <p style={pStyle}>
          <strong style={{ color: COLORS.text }}>
            Start with reconciliation infrastructure.
          </strong>{" "}
          I built comparison analyses ad hoc. I should have created a
          standardized reconciliation framework on day one — a macro that takes
          two relations and produces a full diff report.
        </p>

        <p style={pStyle}>
          <strong style={{ color: COLORS.text }}>
            Establish a CLAUDE.md-style guide before writing the first model.
          </strong>{" "}
          I wrote mine incrementally. Having the conventions documented upfront
          would have prevented several rounds of renaming and restructuring. (The
          Analytics Engineering team is currently building a Developer Assistant
          Agent to make this kind of guidance available to all practitioners
          automatically.)
        </p>

        <p style={pStyle}>
          <strong style={{ color: COLORS.text }}>
            Push back on "just make it match production."
          </strong>{" "}
          Early on, I spent weeks reproducing bugs from the production pipeline
          because stakeholders wanted exact row-level matches. Some of those
          "bugs" were duplicate rows, NULL values that should have been filtered,
          and edge cases that nobody actually relied on. I should have treated
          the migration as an opportunity to improve data quality, not just
          replicate it.
        </p>

        <p style={pStyle}>
          <strong style={{ color: COLORS.text }}>
            Communicate with the team earlier on big-picture architecture.
          </strong>{" "}
          I should have aligned earlier on how this repo fits with other marts
          and adjacent repositories, which would have reduced re-work later.
        </p>

        <p style={pStyle}>
          <strong style={{ color: COLORS.text }}>
            Accept that timing-driven differences are permanent.
          </strong>{" "}
          If your dbt pipeline runs every 4 hours and the legacy pipeline runs
          daily, the outputs will never match exactly. Get stakeholder alignment
          on this upfront instead of chasing phantom discrepancies.
        </p>

        {/* ─── Conclusion ─── */}
        <div
          style={{
            height: "1px",
            background: `linear-gradient(90deg, ${COLORS.accent}, transparent)`,
            margin: "3rem 0 2rem",
          }}
        />

        <h2 style={{ ...h2Style, borderBottom: "none", marginTop: "0" }}>
          Conclusion
        </h2>

        <p style={pStyle}>
          Managing 150+ dbt models is entirely doable — but only if you treat
          conventions, testing, and documentation as load-bearing infrastructure,
          not nice-to-haves. Every shortcut you take today becomes a mystery your
          team will have to solve tomorrow.
        </p>

        <p style={{ ...pStyle, marginBottom: "4rem" }}>
          The models are the easy part. The hard part is building a system that
          teammates can maintain, debug, and extend without relying on one person
          to explain it.
        </p>

        {/* Back link at bottom */}
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: `1px solid ${COLORS.accent}`,
            color: COLORS.accent,
            fontFamily: mono,
            fontSize: "0.85rem",
            cursor: "pointer",
            padding: "0.75rem 1.5rem",
            borderRadius: "6px",
            marginBottom: "4rem",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = COLORS.accent;
            e.target.style.color = COLORS.bg;
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "none";
            e.target.style.color = COLORS.accent;
          }}
        >
          ← Back to home
        </button>
      </div>
    </div>
  );
}
