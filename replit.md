# Audit Radar - Predictive Risk Heatmap

## Overview
A predictive risk monitoring dashboard built for the DTCC AI Hackathon. Visualizes real-time risk across auditable units using interactive heatmaps, trend charts, and alert systems. Data sourced from six Excel files: an Internal Audit Universe with 28 auditable units, 100 IT incidents, 6 regulatory inputs, 20 market news articles, 28 vendor-to-unit mappings, and 1,526 known exploited vulnerabilities (CVEs).

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + Shadcn UI + Recharts
- **Backend**: Express.js with PostgreSQL via Drizzle ORM
- **Routing**: wouter (client-side), Express (server-side)
- **State Management**: TanStack React Query

## Project Structure
- `client/src/pages/` - Dashboard, Heatmap, Analytics, Alerts, Score Drivers pages
- `client/src/components/` - Reusable risk visualization components (risk-heatmap, risk-trend-chart, news-feed, etc.)
- `server/` - Express API server with PostgreSQL storage
- `server/seed.ts` - Scoring algorithm that integrates all data sources (5 inputs)
- `server/drivers.ts` - Score explainability engine: computes per-dimension breakdowns with driver details and recommended actions
- `shared/schema.ts` - Drizzle schema definitions (riskSectors, riskMetrics, riskAlerts, heatmapData, marketNews)

## Data Sources
- **Audit Universe** (`attached_assets/Internal_Audit_Universe_Auto_Scoring_1771865142852.xlsm`): "Audit Universe" sheet with 28 auditable units (Column C) and 7 risk scoring dimensions (Financial, Regulatory, Operational, Change, Fraud, Data/Tech, Reputation). Scores are 1-5, scaled to 0-100 for display. These are the BASE scores.
- **Incident Data** (`attached_assets/Incident_data_1771869675474.xlsx`): 100 IT incidents with Priority (Critical/High/Medium/Low), Risk Severity (Severe/Major/Moderate/Minor), Impacted Business Areas, and Impacted Business Process. Adjusts scores by +0 to +10 points.
- **Regulatory Inputs** (`attached_assets/Reg_inputs_1771869675475.xlsx`): 6 regulatory changes from SEC/EU with impacted business areas/processes and risk direction. Keyword-matched to categories and dimensions. Adjusts scores by -8 to +8 points.
- **Market News** (`attached_assets/Predictive_Audit_Market_News_With_Articles_Updated_Categories_1771874482512.xlsx`, Sheet2): 20 news articles with title, source, summary, and category. Sentiment and risk type are derived algorithmically. Sentiment-based adjustments of -8 to +8 points.
- **Vendor Mappings** (`attached_assets/Auditable_Units_Tech_Vendors_v2_1771945289230.xlsx`): 28 auditable units mapped to ~5 technology vendors each (e.g., "Cybersecurity Program" → CrowdStrike, Palo Alto Networks, Fortinet, Check Point, Darktrace). Used to link CVE vulnerabilities to specific audit units.
- **Known Exploited Vulnerabilities** (`attached_assets/known_exploited_vulnerabilities_1771945289231.xlsx`): 1,526 CVEs with vendor, product, vulnerability name, ransomware campaign usage (Known/Unknown), and CWE classification. Matched to audit unit vendors via fuzzy name matching.

## Scoring Algorithm (seed.ts)
1. **Base scores** from Audit Universe (1-5 raw, scaled to 0-100)
2. **Incident adjustments**: Map business areas → audit unit categories, business processes → risk dimensions. Weight = severity × priority (1-16), normalized to 0-10 point adjustment.
3. **Regulatory adjustments**: Parse impacted areas/processes via keyword matching to categories and dimensions. Risk raised/lowered determines direction (±3 per regulation), clamped to ±8.
4. **News adjustments**: Map article category → audit unit category, risk type → dimensions. Sentiment scoring (Negative=+2, Neutral=0, Positive=-1), averaged and scaled ×3, clamped to ±8.
5. **Cyber/Vendor adjustments**: For each auditable unit, look up its vendors, match against CVE database using fuzzy name matching. Weight = CVE count + (ransomware CVEs × 2), normalized per vendor. Adjusts primarily Data/Tech (0-12 pts), Operational (0-8 pts), Fraud (0-5 pts), and Reputation (0-4 pts).
6. **Final**: `Updated Score = clamp(Base + Incident + Regulatory + News + Cyber, 0, 100)`
7. **Predicted Score** (Weighted Momentum): `Predicted = clamp(Current + (News×1.5 + Cyber×1.3 + Regulatory×1.2 + Incident×0.8) × 0.3, 0, 100)`. News gets highest weight (trends snowball), cyber high (vulnerabilities compound), regulatory moderate (impact compounds), incidents lowest (get remediated). Confidence derived from signal consistency across 4 sources: all same direction → 0.75-0.90; mixed signals → 0.45-0.70.
8. **Alerts**: Generated when the average absolute score change (sum of all adjustments) across all 7 dimensions ≥ 5 points. Severity: Critical (≥10 pts), High (7-9.9 pts), Medium (5-6.9 pts). Each alert includes a driver breakdown showing which adjustments (Incidents, Regulatory, News, Cyber/Vendor) contributed to the top 3 most-changed dimensions.

## Key Features
- Interactive risk heatmap: 28 auditable units (vertical) x 7 risk dimensions (horizontal) with color-coded severity
- 2 summary metric cards (Overall Risk Score, Risk Score Change) with hover tooltips
- Risk trend analysis charts (by sector and by selectable metric dimension)
- Alert management with severity filtering (alerts triggered by score change ≥5 pts avg, with driver breakdown)
- Score Drivers page with radar chart, waterfall chart (showing Base → Incidents → Regulatory → News → Cyber → Final), and expandable driver details including CVE vulnerabilities
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

## Database
PostgreSQL with tables: risk_sectors, risk_metrics, risk_alerts, heatmap_data, market_news, users
Auto-seeded from Excel files on first run. Truncate tables and restart to reseed.

## Running
`npm run dev` starts the Express + Vite dev server on port 5000.
