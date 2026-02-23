# RiskPulse - Predictive Risk Heatmap

## Overview
A predictive risk monitoring dashboard built for the DTCC AI Hackathon. Visualizes real-time risk across auditable units using interactive heatmaps, trend charts, and alert systems. Data sourced from four Excel files: an Internal Audit Universe with 28 auditable units, 100 IT incidents, 6 regulatory inputs, and 20 market news articles.

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + Shadcn UI + Recharts
- **Backend**: Express.js with PostgreSQL via Drizzle ORM
- **Routing**: wouter (client-side), Express (server-side)
- **State Management**: TanStack React Query

## Project Structure
- `client/src/pages/` - Dashboard, Heatmap, Analytics, Alerts, Score Drivers pages
- `client/src/components/` - Reusable risk visualization components (risk-heatmap, risk-trend-chart, news-feed, etc.)
- `server/` - Express API server with PostgreSQL storage
- `server/seed.ts` - Scoring algorithm that integrates all data sources
- `server/drivers.ts` - Score explainability engine: computes per-dimension breakdowns with driver details and recommended actions
- `shared/schema.ts` - Drizzle schema definitions (riskSectors, riskMetrics, riskAlerts, heatmapData, marketNews)

## Data Sources
- **Audit Universe** (`attached_assets/Internal_Audit_Universe_Auto_Scoring_1771865142852.xlsm`): "Audit Universe" sheet with 28 auditable units (Column C) and 8 risk scoring dimensions (Financial, Regulatory, Operational, Change, Control Env, Fraud, Data/Tech, Reputation). Scores are 1-5, scaled to 0-100 for display. These are the BASE scores.
- **Incident Data** (`attached_assets/Incident_data_1771869675474.xlsx`): 100 IT incidents with Priority (Critical/High/Medium/Low), Risk Severity (Severe/Major/Moderate/Minor), Impacted Business Areas, and Impacted Business Process. Adjusts scores by +0 to +10 points.
- **Regulatory Inputs** (`attached_assets/Reg_inputs_1771869675475.xlsx`): 6 regulatory changes from SEC/EU with impacted business areas/processes and risk direction. Keyword-matched to categories and dimensions. Adjusts scores by -8 to +8 points.
- **Market News** (`attached_assets/Predictive_Audit_Market_News_With_Articles_Updated_Categories_1771874482512.xlsx`, Sheet2): 20 news articles with title, source, summary, and category. Sentiment and risk type are derived algorithmically. Sentiment-based adjustments of -8 to +8 points.

## Scoring Algorithm (seed.ts)
1. **Base scores** from Audit Universe (1-5 raw, scaled to 0-100)
2. **Incident adjustments**: Map business areas → audit unit categories, business processes → risk dimensions. Weight = severity × priority (1-16), normalized to 0-10 point adjustment.
3. **Regulatory adjustments**: Parse impacted areas/processes via keyword matching to categories and dimensions. Risk raised/lowered determines direction (±3 per regulation), clamped to ±8.
4. **News adjustments**: Map article category → audit unit category, risk type → dimensions. Sentiment scoring (Negative=+2, Neutral=0, Positive=-1), averaged and scaled ×3, clamped to ±8.
5. **Final**: `Updated Score = clamp(Base + Incident + Regulatory + News, 0, 100)`
6. **Alerts**: Generated when the average absolute score change (sum of incident + regulatory + news adjustments) across all 8 dimensions ≥ 5 points. Severity: Critical (≥10 pts), High (7-9.9 pts), Medium (5-6.9 pts). Each alert includes a driver breakdown showing which adjustments (Incidents, Regulatory, News) contributed to the top 3 most-changed dimensions.

## Key Features
- Interactive risk heatmap: 28 auditable units (vertical) x 8 risk dimensions (horizontal) with color-coded severity
- Summary metric cards with trend indicators and negative sentiment ratio
- Risk trend analysis charts (by sector and by selectable metric dimension)
- Alert management with severity filtering (alerts triggered by score change ≥5 pts avg, with driver breakdown)
- Sector detail drill-down panels
- Market news feed with sentiment indicators
- Category filtering on heatmap page
- Dark/light theme toggle
- Responsive sidebar navigation

## API Routes
- GET /api/sectors - All 28 auditable units (stored as sectors)
- GET /api/metrics - All 224 risk metrics (28 units x 8 dimensions)
- GET /api/alerts - Risk alerts for high-scoring auditable units
- GET /api/heatmap - 224 heatmap data points (28 x 8)
- GET /api/news - 20 market news articles (from Sheet2)
- GET /api/news/:sector - News filtered by sector

## Database
PostgreSQL with tables: risk_sectors, risk_metrics, risk_alerts, heatmap_data, market_news, users
Auto-seeded from Excel files on first run. Truncate tables and restart to reseed.

## Running
`npm run dev` starts the Express + Vite dev server on port 5000.
