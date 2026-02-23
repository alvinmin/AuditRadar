import { storage } from "./storage";
import { db } from "./db";
import { riskSectors, riskMetrics, riskAlerts, heatmapData, marketNews } from "@shared/schema";
import * as XLSX from "xlsx";
import * as path from "path";

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

const SECTOR_DESCRIPTIONS: Record<string, { category: string; description: string }> = {
  Technology: { category: "Technology", description: "Tech companies, software, hardware, and digital infrastructure" },
  Energy: { category: "Resources", description: "Oil, gas, renewables, and energy infrastructure" },
  Healthcare: { category: "Life Sciences", description: "Pharmaceuticals, biotech, medical devices, and health services" },
  Industrials: { category: "Manufacturing", description: "Manufacturing, logistics, aerospace, and industrial services" },
  Financials: { category: "Financial Services", description: "Banks, insurance, asset management, and financial markets" },
};

const RISK_TYPES = ["Fraud Risk", "Operational Risk", "Market Risk", "Audit Risk"];

function sentimentToScore(sentiment: string): number {
  if (sentiment === "Negative") return 70 + Math.random() * 25;
  if (sentiment === "Positive") return 15 + Math.random() * 25;
  return 35 + Math.random() * 25;
}

function getSeverity(score: number): string {
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

  console.log("Seeding database from Excel file...");

  const filePath = path.resolve("attached_assets/Market_News__1771860683030.xlsx");
  const wb = XLSX.readFile(filePath);
  const rows: NewsRow[] = XLSX.utils.sheet_to_json(wb.Sheets["Market_Risk_News"]);

  console.log(`Parsed ${rows.length} news articles from Excel`);

  const sectorNames = [...new Set(rows.map(r => r.Sector))];
  const sectorMap: Record<string, string> = {};

  for (const name of sectorNames) {
    const info = SECTOR_DESCRIPTIONS[name] || { category: "Other", description: name };
    const created = await storage.createSector({
      name,
      category: info.category,
      description: info.description,
    });
    sectorMap[name] = created.id;
  }

  for (const row of rows) {
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

  for (const sectorName of sectorNames) {
    const sectorId = sectorMap[sectorName];
    const sectorArticles = rows.filter(r => r.Sector === sectorName);

    for (const riskType of RISK_TYPES) {
      const relevant = sectorArticles.filter(r => r.Risk_Type === riskType);
      const negCount = relevant.filter(r => r.Sentiment === "Negative").length;
      const posCount = relevant.filter(r => r.Sentiment === "Positive").length;
      const neutralCount = relevant.filter(r => r.Sentiment === "Neutral").length;
      const total = relevant.length || 1;

      const score = Math.min(95, Math.max(10,
        (negCount / total) * 85 + (neutralCount / total) * 50 + (posCount / total) * 20 + (Math.random() * 10 - 5)
      ));

      const previousScore = Math.min(95, Math.max(10, score + (Math.random() * 16 - 8)));
      const predictedScore = Math.min(95, Math.max(10, score + (Math.random() * 12 - 4)));
      const confidence = 0.7 + Math.random() * 0.25;

      await storage.createMetric({
        sectorId,
        metricType: riskType,
        score,
        previousScore,
        predictedScore,
        confidence,
      });

      const trend = score > previousScore ? "up" : score < previousScore ? "down" : "stable";
      await storage.createHeatmapData({
        sectorId,
        riskDimension: riskType,
        value: score,
        trend,
      });
    }
  }

  const negativeArticles = rows.filter(r => r.Sentiment === "Negative");
  const sortedByDate = [...negativeArticles].sort((a, b) => b.Date.localeCompare(a.Date));
  const alertArticles = sortedByDate.slice(0, 12);

  for (const article of alertArticles) {
    const sectorId = sectorMap[article.Sector];
    const sectorArticles = rows.filter(r => r.Sector === article.Sector && r.Risk_Type === article.Risk_Type);
    const negRatio = sectorArticles.filter(r => r.Sentiment === "Negative").length / (sectorArticles.length || 1);
    const severity = negRatio >= 0.5 ? "critical" : negRatio >= 0.35 ? "high" : "medium";

    await storage.createAlert({
      sectorId,
      severity,
      title: article.Headline,
      description: article.Article_Summary,
      metricType: article.Risk_Type,
      timestamp: new Date(article.Date),
    });
  }

  const positiveArticles = rows.filter(r => r.Sentiment === "Positive");
  const recentPositive = [...positiveArticles].sort((a, b) => b.Date.localeCompare(a.Date)).slice(0, 4);
  for (const article of recentPositive) {
    const sectorId = sectorMap[article.Sector];
    await storage.createAlert({
      sectorId,
      severity: "low",
      title: article.Headline,
      description: article.Article_Summary,
      metricType: article.Risk_Type,
      timestamp: new Date(article.Date),
    });
  }

  console.log("Database seeded successfully from Excel data!");
}
