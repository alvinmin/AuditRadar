# Audit Radar - Predictive Risk Heatmap

## Overview
A predictive risk monitoring dashboard built for the DTCC AI Hackathon. Visualizes real-time risk across auditable units using interactive heatmaps, trend charts, and alert systems. Uses a **5-Component Predictive Scoring Model** that integrates 8 data sources: an Internal Audit Universe with 28 auditable units, ~200 PRC controls, ~999 audit issues, 6 regulatory inputs, 20 market news articles, and pre-computed operational risk scores from a predictive heatmap dataset.

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + Shadcn UI + Recharts
- **Backend**: Express.js with PostgreSQL via Drizzle ORM
- **Routing**: wouter (client-side), Express (server-side)
- **State Management**: TanStack React Query

## Project Structure
- `client/src/pages/` - Dashboard, Heatmap, Analytics, Alerts, Score Drivers pages
- `client/src/components/` - Reusable risk visualization components (risk-heatmap, risk-trend-chart, news-feed, etc.)
- `server/` - Express API server with PostgreSQL storage
- `server/seed.ts` - 5-Component Predictive Scoring Engine that integrates all 8 data sources
- `server/drivers.ts` - Score explainability engine: computes per-dimension 5-component breakdowns with driver details and recommended actions
- `shared/schema.ts` - Drizzle schema definitions (riskSectors, riskMetrics, riskAlerts, heatmapData, marketNews)

## Data Sources
- **Audit Universe** (`attached_assets/Internal_Audit_Universe_Auto_Scoring_1771865142852.xlsm`): "Audit Universe" sheet with 28 auditable units (Column C) and 7 risk scoring dimensions (Financial, Regulatory, Operational, Change, Fraud, Data/Tech, Reputation). Scores are 1-5, scaled to 0-100. Used for **Qualitative Risk Assessment (Component 1)**.
- **PRC Controls** (`attached_assets/PRC_updated_1771952095993.xlsx`, Sheet2): ~200 controls per business area with Control ID, Control Type (Manual/Automated), Design Effectiveness (Effective/Not Effective), Operating Effectiveness (Effective/Not Effective). Used for **Control Health Score (Component 2)**.
- **Audit Issues** (`attached_assets/Issue_details_no_quarter_1771952095994.xlsx`, Sheet1): ~999 audit issues with Issue Title, Description, Severity (Severe/High/Moderate/Low/Immaterial), Status (Open/In Progress/Closed), Source (Internal Audit/Regulatory/MSI/SOX), Audit Engagement. Used for **Audit & Issue Trend Score (Component 3)**.
- **Market News** (`attached_assets/Predictive_Audit_Market_News_With_Articles_Updated_Categories_1771874482512.xlsx`, Sheet2): 20 news articles with title, source, summary, and category. Sentiment and risk type derived algorithmically. Used for **Business & External Risk Score (Component 4)**.
- **Regulatory Inputs** (`attached_assets/Reg_inputs_1771869675475.xlsx`): 6 regulatory changes from SEC/EU with impacted business areas/processes and risk direction. Used for **Business & External Risk Score (Component 4)**.
- **Incident Data** (`attached_assets/Incident_data_1771869675474.xlsx`): 100 IT incidents with Priority (Critical/High/Medium/Low), Risk Severity (Severe/Major/Moderate/Minor), Impacted Business Areas, and Impacted Business Process. Used for **Operational Risk Indicators (Component 5)**.
- **Vendor Mappings** (`attached_assets/Auditable_Units_Tech_Vendors_v2_1771945289230.xlsx`): 28 auditable units mapped to ~5 technology vendors each. Used to link CVE vulnerabilities to specific audit units for **Operational Risk Indicators (Component 5)**.
- **Known Exploited Vulnerabilities** (`attached_assets/known_exploited_vulnerabilities_1771945289231.xlsx`): 1,526 CVEs with vendor, product, vulnerability name, ransomware campaign usage. Matched to audit unit vendors via fuzzy name matching for **Operational Risk Indicators (Component 5)**.
- **Predictive Heatmap Dataset** (`attached_assets/predictive_heatmap_dataset_1771962971302.xlsx`): "Operational_Metrics" sheet with 28 auditable units. Column A = unit name, Column R = Predictive Score (pre-computed operational risk). Sub-scores in columns I–Q: Exception, Error, Backlog, Override, Volume, Turnover, Capacity scores, Operational Stress Score, and Escalation Multiplier. Used for **Operational Risk Indicators (Component 5)** — replaces the CVE/vendor + incident calculation.

## 5-Component Predictive Scoring Model (seed.ts)

### Formula
**Final Score = (Qualitative Risk Assessment × 0.30) + (Control Health × 0.25) + (Audit Issues × 0.20) + (Business/External × 0.15) + (Operational Risk × 0.10)**

Each component produces a unit-level score (0–100), distributed across 7 risk dimensions via a dimension relevance matrix.

### Components
1. **Qualitative Risk Assessment (30%)**: Raw Audit Universe scores scaled from 1-5 to 0-100. Represents inherent risk assessment from audit universe. (Internally referenced as "baseline" in code variables.)
2. **Control Health Score (25%)**: For each business area, scores each PRC control: Both Effective=100, Design only=50, Operating only=40, Neither=0. Averaged across all controls. Higher average = stronger controls = more contribution to composite score. Default=50 if no PRC data.
3. **Audit & Issue Trend Score (20%)**: Severity-weighted issue density per unit. Weights: Severe=5, High=4, Moderate=3, Low=2, Immaterial=1. Status multiplier: Open=1.0, In Progress=0.5, Closed=0.2. Normalized to 0-100 across all units.
4. **Business & External Risk Score (15%)**: Combines news sentiment (Negative=+2, Neutral=0, Positive=-1) and regulatory impact (±3 per regulation). Normalized to 0-100. Default=50 if no data.
5. **Operational Risk Indicators (10%)**: Pre-computed Predictive Score from `predictive_heatmap_dataset_1771962971302.xlsx` (Operational_Metrics sheet, column R). Clamped to 0-100. Sub-scores available: Exception, Error, Backlog, Override, Volume, Turnover, Capacity, Stress, Escalation Multiplier (columns I-Q).

### Dimension Relevance Matrix
A 5×7 matrix distributes each component's score across 7 dimensions (Financial, Regulatory, Operational, Change, Fraud, Data/Tech, Reputation). Each row sums to 1.0. For example, Baseline weights Financial heavily (0.20), while Operational Risk weights Data/Tech heavily (0.30).

### Final Per-Dimension Score
`score = sum(component_score × component_weight × dimension_relevance) / max_possible × 100`, clamped to 0-100.

### Previous Score & Trend (Quarter over Quarter)
Previous score = Simulated Q4 2025 score using same 5-component formula with dampened non-baseline factors (×0.85). Current = Q1 2026 full composite. Trend arrows and change metrics reflect quarter-over-quarter movement. Historical quarterly data (Q1 2025–Q1 2026) is interpolated from previousScore to currentScore for trend charts.

### Predicted Score
Momentum from 4 non-baseline component signals (deviations from neutral): `Predicted = clamp(Current + (ControlDeviation×1.2 + AuditIssues×1.4 + BizExtDeviation×1.5 + OpRisk×1.3) × 0.25 × avgDimRelevance, 0, 100)`. Confidence derived from signal consistency: all same direction → 0.75-0.95; mixed signals → 0.45-0.70.

### Alerts
Generated when QoQ change ≥ 5 points OR avg final score ≥ 70. Severity: Critical (avg > 90), High (avg ≥ 71 or change ≥ 10), Medium (otherwise). Each alert includes 5 component scores and top 3 highest-scoring dimensions.

## Key Features
- Interactive risk heatmap: 28 auditable units (vertical) x 7 risk dimensions (horizontal) with color-coded severity
- 2 summary metric cards (Overall Risk Score, Risk Score Change) with QoQ comparison and hover tooltips
- Risk trend analysis charts showing 5 quarters (Q1 2025–Q1 2026) by sector and by selectable metric dimension
- Alert management with severity filtering and expandable component score breakdowns
- Score Explainability page with:
  - 5-component summary cards showing unit-level scores and weights
  - Radar chart comparing Qualitative Risk vs Composite scores per dimension
  - Waterfall chart showing how each component builds the final dimension score
  - Expandable driver details: PRC controls with effectiveness, audit issues with severity/status, operational metric sub-scores (Exception, Error, Backlog, Override, Volume, Turnover, Capacity, Stress, Escalation Multiplier), regulations, news articles
  - Recommended actions per component per dimension
- Market news feed with sentiment indicators
- Category filtering on heatmap page
- Dark/light theme toggle
- Responsive sidebar navigation with Audit Radar logo

## API Routes
- GET /api/sectors - All 28 auditable units (stored as sectors)
- GET /api/metrics - All 196 risk metrics (28 units x 7 dimensions)
- GET /api/alerts - Risk alerts for high-scoring auditable units
- GET /api/heatmap - 196 heatmap data points (28 x 7)
- GET /api/news - 20 market news articles (from Sheet2)
- GET /api/news/:sector - News filtered by sector
- GET /api/sectors/:id/drivers - 5-component score breakdown with driver details for a specific unit

## Database
PostgreSQL with tables: risk_sectors, risk_metrics, risk_alerts, heatmap_data, market_news, users
Auto-seeded from Excel files on server start (forceReseed=true during development). Set forceReseed=false for production.

## Running
`npm run dev` starts the Express + Vite dev server on port 5000.
