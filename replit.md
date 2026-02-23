# RiskPulse - Predictive Risk Heatmap

## Overview
A predictive risk monitoring dashboard built for the DTCC AI Hackathon. Visualizes real-time risk across auditable units using interactive heatmaps, trend charts, and alert systems. Data sourced from two Excel files: an Internal Audit Universe with 28 auditable units and a Market News dataset with 100 articles.

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + Shadcn UI + Recharts
- **Backend**: Express.js with PostgreSQL via Drizzle ORM
- **Routing**: wouter (client-side), Express (server-side)
- **State Management**: TanStack React Query

## Project Structure
- `client/src/pages/` - Dashboard, Heatmap, Analytics, Alerts pages
- `client/src/components/` - Reusable risk visualization components (risk-heatmap, risk-trend-chart, news-feed, etc.)
- `server/` - Express API server with PostgreSQL storage
- `shared/schema.ts` - Drizzle schema definitions (riskSectors, riskMetrics, riskAlerts, heatmapData, marketNews)

## Data Sources
- **Audit Universe** (`attached_assets/Internal_Audit_Universe_Auto_Scoring_1771865142852.xlsm`): "Audit Universe" sheet with 28 auditable units (Column C) and 8 risk scoring dimensions (Financial, Regulatory, Operational, Change, Control Env, Fraud, Data/Tech, Reputation). Scores are 1-5, scaled to 0-100 for display.
- **Market News** (`attached_assets/Market_News__1771860683030.xlsx`): 100 news articles with sentiment, sector, risk type, and category data.

## Key Features
- Interactive risk heatmap: 28 auditable units (vertical) x 8 risk dimensions (horizontal) with color-coded severity
- Summary metric cards with trend indicators and negative sentiment ratio
- Risk trend analysis charts (by sector and by selectable metric dimension)
- Alert management with severity filtering (alerts generated for high-risk auditable units)
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
- GET /api/news - 100 market news articles
- GET /api/news/:sector - News filtered by sector

## Database
PostgreSQL with tables: risk_sectors, risk_metrics, risk_alerts, heatmap_data, market_news, users
Auto-seeded from Excel files on first run. Truncate tables and restart to reseed.

## Running
`npm run dev` starts the Express + Vite dev server on port 5000.
