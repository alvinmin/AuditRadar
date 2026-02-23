import { storage } from "./storage";
import { db } from "./db";
import { riskSectors, riskMetrics, riskAlerts, heatmapData, marketNews } from "@shared/schema";
import path from "path";

interface NewsRow {
  Date: string;
  Source: string;
  Headline: string;
  Full_Article_Text: string;
  Article_Summary: string;
  Category: string;
  Sentiment: string;
  Sector: string;
  Risk_Type: string;
}

const RISK_DIMENSIONS = [
  "Financial", "Regulatory", "Operational", "Change",
  "Control Env", "Fraud", "Data/Tech", "Reputation"
];

const RISK_DIM_INDICES: Record<string, number> = {
  "Financial": 8,
  "Regulatory": 9,
  "Operational": 10,
  "Change": 11,
  "Control Env": 12,
  "Fraud": 13,
  "Data/Tech": 14,
  "Reputation": 15,
};

function scaleScore(raw: number): number {
  return Math.min(100, Math.max(0, (raw / 5) * 100));
}

function getSeverityFromScore(score: number): string {
  if (score >= 80) return "critical";
  if (score >= 65) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export async function seedDatabase() {
  const existingSectors = await db.select().from(riskSectors);
  if (existingSectors.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database from Excel files...");

  const xlsxModule = await import("xlsx");
  const XLSX = xlsxModule.default || xlsxModule;

  const auditPath = path.resolve("attached_assets/Internal_Audit_Universe_Auto_Scoring_1771865142852.xlsm");
  const auditWb = XLSX.readFile(auditPath);
  const auditSheet = auditWb.Sheets["Audit Universe"];
  const auditRows: any[][] = XLSX.utils.sheet_to_json(auditSheet, { header: 1 });

  const dataRows = auditRows.slice(3).filter((r: any[]) => r[2]);
  console.log(`Parsed ${dataRows.length} auditable units from Audit Universe`);

  const sectorMap: Record<string, string> = {};

  for (const row of dataRows) {
    const unitName = String(row[2]);
    const category = String(row[0] || "General");
    const subCategory = String(row[1] || "");
    const processScope = String(row[3] || "");

    const created = await storage.createSector({
      name: unitName,
      category: category,
      description: processScope || `${subCategory} - ${unitName}`,
    });
    sectorMap[unitName] = created.id;

    for (const dim of RISK_DIMENSIONS) {
      const colIdx = RISK_DIM_INDICES[dim];
      const rawScore = Number(row[colIdx]) || 0;
      const scaledValue = scaleScore(rawScore);

      const prevRaw = Math.max(1, Math.min(5, rawScore + (Math.random() * 1.2 - 0.6)));
      const prevScaled = scaleScore(prevRaw);
      const trend = scaledValue > prevScaled ? "up" : scaledValue < prevScaled ? "down" : "stable";

      const predictedRaw = Math.max(1, Math.min(5, rawScore + (Math.random() * 0.8 - 0.2)));
      const predictedScaled = scaleScore(predictedRaw);
      const confidence = 0.7 + Math.random() * 0.25;

      await storage.createMetric({
        sectorId: created.id,
        metricType: dim,
        score: scaledValue,
        previousScore: prevScaled,
        predictedScore: predictedScaled,
        confidence,
      });

      await storage.createHeatmapData({
        sectorId: created.id,
        riskDimension: dim,
        value: scaledValue,
        trend,
      });
    }

    const selectedScore = Number(row[18]) || 0;
    const severity = String(row[19] || "");
    if (selectedScore >= 4) {
      await storage.createAlert({
        sectorId: created.id,
        severity: severity === "Critical" ? "critical" : severity === "High" ? "high" : "medium",
        title: `${unitName}: ${severity} Risk Level`,
        description: `${unitName} has a weighted risk score of ${selectedScore.toFixed(1)}/5.0. Process scope: ${processScope.substring(0, 120)}`,
        metricType: "Overall",
        timestamp: new Date(),
      });
    }
  }

  const newsPath = path.resolve("attached_assets/Market_News__1771860683030.xlsx");
  const newsWb = XLSX.readFile(newsPath);
  const newsRows: NewsRow[] = XLSX.utils.sheet_to_json(newsWb.Sheets["Market_Risk_News"]);
  console.log(`Parsed ${newsRows.length} news articles from Market News`);

  for (const row of newsRows) {
    await storage.createMarketNews({
      date: row.Date,
      source: row.Source,
      headline: row.Headline,
      fullArticleText: row.Full_Article_Text,
      articleSummary: row.Article_Summary,
      category: row.Category,
      sentiment: row.Sentiment,
      sector: row.Sector,
      riskType: row.Risk_Type,
    });
  }

  console.log("Database seeded successfully from Excel data!");
}
