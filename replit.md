# RiskPulse - Predictive Risk Heatmap

## Overview
A predictive risk monitoring dashboard built for the DTCC AI Hackathon. Visualizes real-time risk across financial sectors using interactive heatmaps, trend charts, and alert systems.

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + Shadcn UI + Recharts
- **Backend**: Express.js with PostgreSQL via Drizzle ORM
- **Routing**: wouter (client-side), Express (server-side)
- **State Management**: TanStack React Query

## Project Structure
- `client/src/pages/` - Dashboard, Heatmap, Analytics, Alerts pages
- `client/src/components/` - Reusable risk visualization components
- `server/` - Express API server with PostgreSQL storage
- `shared/schema.ts` - Drizzle schema definitions (riskSectors, riskMetrics, riskAlerts, heatmapData)

## Key Features
- Interactive risk heatmap with color-coded severity levels
- Summary metric cards with trend indicators
- Risk trend analysis charts (by sector and metric)
- Alert management with severity filtering
- Sector detail drill-down panels
- Dark/light theme toggle
- Responsive sidebar navigation

## API Routes
- GET /api/sectors - All risk sectors
- GET /api/metrics - All risk metrics
- GET /api/alerts - All risk alerts
- GET /api/heatmap - Heatmap data

## Database
PostgreSQL with tables: risk_sectors, risk_metrics, risk_alerts, heatmap_data, users
Auto-seeded with realistic financial risk data on first run.

## Running
`npm run dev` starts the Express + Vite dev server on port 5000.
