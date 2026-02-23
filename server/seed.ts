import { storage } from "./storage";
import { db } from "./db";
import { riskSectors } from "@shared/schema";

const SECTORS = [
  { name: "Equities", category: "Capital Markets", description: "Stock markets and equity trading across global exchanges" },
  { name: "Fixed Income", category: "Capital Markets", description: "Bond markets, treasuries, and fixed-rate instruments" },
  { name: "Derivatives", category: "Capital Markets", description: "Options, futures, swaps, and structured products" },
  { name: "Banking", category: "Financial Services", description: "Commercial and retail banking operations" },
  { name: "Insurance", category: "Financial Services", description: "Life, property, and casualty insurance sectors" },
  { name: "Fintech", category: "Technology", description: "Financial technology and digital payment platforms" },
  { name: "Crypto/DeFi", category: "Digital Assets", description: "Cryptocurrency exchanges and decentralized finance" },
  { name: "Real Estate", category: "Alternative Assets", description: "Commercial and residential real estate investment trusts" },
];

const METRIC_TYPES = ["Market", "Credit", "Liquidity", "Operational", "Systemic"];

const ALERTS_DATA = [
  { severity: "critical", title: "Systemic Contagion Risk Elevated", description: "Cross-sector correlation has exceeded 0.85 threshold, indicating potential systemic cascading failure. Immediate monitoring recommended.", metricType: "Systemic" },
  { severity: "critical", title: "Liquidity Squeeze Detected", description: "Multiple counterparties reporting margin call pressure. Overnight repo rates spiked 340bps above normal.", metricType: "Liquidity" },
  { severity: "high", title: "Credit Spread Widening", description: "Investment-grade credit spreads have widened by 125bps in the last 24 hours, approaching 2020 levels.", metricType: "Credit" },
  { severity: "high", title: "Volatility Surge Warning", description: "VIX equivalent for this sector has breached the 85th percentile. Historical precedent suggests elevated tail risk.", metricType: "Market" },
  { severity: "high", title: "Operational Incident Report", description: "Settlement failures increased 4x above baseline. Clearing house reporting processing delays.", metricType: "Operational" },
  { severity: "medium", title: "Counterparty Exposure Threshold", description: "Aggregate counterparty exposure approaching 75% of risk appetite. Diversification review recommended.", metricType: "Credit" },
  { severity: "medium", title: "Market Microstructure Alert", description: "Bid-ask spreads widening in key instruments. Market depth has decreased 40% from monthly average.", metricType: "Market" },
  { severity: "medium", title: "Regulatory Compliance Update", description: "New capital adequacy requirements taking effect next quarter. Impact assessment in progress.", metricType: "Operational" },
  { severity: "low", title: "Model Recalibration Notice", description: "Quarterly model validation complete. Minor adjustments to volatility surface fitting parameters.", metricType: "Market" },
  { severity: "low", title: "Data Feed Latency", description: "Minor increase in market data feed latency detected. Within acceptable tolerance but monitoring.", metricType: "Operational" },
];

function generateScore(base: number, variance: number = 15): number {
  return Math.max(5, Math.min(95, base + (Math.random() * variance * 2 - variance)));
}

export async function seedDatabase() {
  const existingSectors = await db.select().from(riskSectors);
  if (existingSectors.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database with risk data...");

  const createdSectors = [];
  for (const sector of SECTORS) {
    const created = await storage.createSector(sector);
    createdSectors.push(created);
  }

  const sectorRiskProfiles: Record<string, Record<string, number>> = {
    "Equities": { Market: 72, Credit: 45, Liquidity: 38, Operational: 30, Systemic: 55 },
    "Fixed Income": { Market: 55, Credit: 68, Liquidity: 48, Operational: 28, Systemic: 45 },
    "Derivatives": { Market: 78, Credit: 62, Liquidity: 58, Operational: 45, Systemic: 70 },
    "Banking": { Market: 48, Credit: 72, Liquidity: 55, Operational: 42, Systemic: 65 },
    "Insurance": { Market: 42, Credit: 55, Liquidity: 35, Operational: 38, Systemic: 40 },
    "Fintech": { Market: 58, Credit: 40, Liquidity: 42, Operational: 65, Systemic: 35 },
    "Crypto/DeFi": { Market: 88, Credit: 75, Liquidity: 72, Operational: 78, Systemic: 45 },
    "Real Estate": { Market: 52, Credit: 60, Liquidity: 65, Operational: 32, Systemic: 48 },
  };

  for (const sector of createdSectors) {
    const profile = sectorRiskProfiles[sector.name] || {};

    for (const metricType of METRIC_TYPES) {
      const baseScore = profile[metricType] || 50;
      const score = generateScore(baseScore, 8);
      const previousScore = generateScore(baseScore, 10);
      const predictedScore = generateScore(baseScore + (Math.random() > 0.5 ? 5 : -3), 10);
      const confidence = 0.72 + Math.random() * 0.22;

      await storage.createMetric({
        sectorId: sector.id,
        metricType,
        score,
        previousScore,
        predictedScore,
        confidence,
      });

      const trend = score > previousScore ? "up" : score < previousScore ? "down" : "stable";
      await storage.createHeatmapData({
        sectorId: sector.id,
        riskDimension: metricType,
        value: score,
        trend,
      });
    }
  }

  for (const alertData of ALERTS_DATA) {
    const randomSector = createdSectors[Math.floor(Math.random() * createdSectors.length)];
    const hoursAgo = Math.floor(Math.random() * 48);
    const timestamp = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    await storage.createAlert({
      sectorId: randomSector.id,
      severity: alertData.severity,
      title: alertData.title,
      description: alertData.description,
      metricType: alertData.metricType,
      timestamp,
    });
  }

  console.log("Database seeded successfully!");
}
