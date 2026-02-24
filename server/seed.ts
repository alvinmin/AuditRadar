import { storage } from "./storage";
import { db } from "./db";
import { riskSectors, riskMetrics, riskAlerts, heatmapData, marketNews } from "@shared/schema";
import path from "path";
import { loadNewsFromSheet2 } from "./news-loader";
import type { NewsRow } from "./news-loader";

interface VendorRow {
  "Auditable Unit": string;
  "Vendors": string;
}

interface CveRow {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  shortDescription: string;
  requiredAction: string;
  knownRansomwareCampaignUse: string;
  cwes: string;
}

interface IncidentRow {
  "Incident ID": string;
  "Incident Title": string;
  Description: string;
  "Impacted Business Process": string;
  "Impacted Business Areas": string;
  "Time of Identification": string;
  Priority: string;
  "Risk Severity": string;
  "Resolution Time (hrs)": number;
  "Resolution Description": string;
  Owner: string;
}

interface RegRow {
  Regulator: string;
  "Rule / Release": string;
  "Description of change": string;
  "Impacted business areas": string;
  "Impacted processes": string;
  "Risk raised (?) / lowered (?)": string;
  "Predictive insights / forward\u2010looking notes": string;
}

const RISK_DIMENSIONS = [
  "Financial", "Regulatory", "Operational", "Change",
  "Fraud", "Data/Tech", "Reputation"
];

const RISK_DIM_INDICES: Record<string, number> = {
  "Financial": 8,
  "Regulatory": 9,
  "Operational": 10,
  "Change": 11,
  "Fraud": 13,
  "Data/Tech": 14,
  "Reputation": 15,
};

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function scaleScore(raw: number): number {
  const scaled = clamp((raw / 5) * 100, 0, 100);
  if (scaled >= 100) return Math.floor(Math.random() * 16 + 75);
  return scaled;
}

function getSeverityFromScore(score: number): string {
  if (score >= 80) return "critical";
  if (score >= 65) return "high";
  if (score >= 45) return "medium";
  return "low";
}

const SEVERITY_WEIGHT: Record<string, number> = {
  "Severe": 4, "Major": 3, "Moderate": 2, "Minor": 1,
};

const PRIORITY_WEIGHT: Record<string, number> = {
  "Critical": 4, "High": 3, "Medium": 2, "Low": 1,
};

const BIZ_AREA_TO_CATEGORIES: Record<string, string[]> = {
  "IT": ["Technology"],
  "Finance": ["Financial Risk", "Finance"],
  "Operations": ["Operations"],
  "Customer Service": ["Revenue", "Operations"],
  "Sales": ["Revenue", "Finance"],
  "HR": ["HR"],
};

const BIZ_PROCESS_TO_DIMENSIONS: Record<string, string[]> = {
  "Financial Reporting": ["Financial"],
  "Customer Support": ["Reputation", "Operational"],
  "Order Processing": ["Operational"],
  "IT Operations": ["Data/Tech", "Operational"],
  "Payroll": ["Operational", "Fraud"],
  "Inventory Management": ["Operational", "Change"],
};

const NEWS_RISKTYPE_TO_DIMENSIONS: Record<string, string[]> = {
  "Fraud Risk": ["Fraud"],
  "Operational Risk": ["Operational", "Change"],
  "Market Risk": ["Financial", "Reputation"],
  "Audit Risk": ["Regulatory"],
};

const NEWS_CATEGORY_TO_CATEGORIES: Record<string, string[]> = {
  "Financial risk": ["Financial Risk"],
  "Finance": ["Finance"],
  "Operations": ["Operations"],
  "HR": ["HR"],
  "Technology": ["Technology"],
  "Compliance": ["Compliance"],
  "Governance": ["Governance"],
  "Legal": ["Legal"],
  "Facilities": ["Facilities"],
};

const REG_KEYWORD_TO_CATEGORIES: Record<string, string[]> = {
  "cyber": ["Technology"],
  "IT": ["Technology"],
  "ICT": ["Technology"],
  "data": ["Technology", "Governance"],
  "privacy": ["Compliance", "Technology"],
  "broker": ["Financial Risk", "Revenue"],
  "investment": ["Financial Risk"],
  "risk management": ["Governance", "Financial Risk"],
  "compliance": ["Compliance"],
  "audit": ["Governance"],
  "governance": ["Governance"],
  "vendor": ["Operations", "Technology"],
  "outsourc": ["Operations"],
  "payment": ["Finance", "Operations"],
  "bank": ["Financial Risk", "Finance"],
  "reporting": ["Finance", "Governance"],
  "AML": ["Compliance"],
  "fraud": ["Compliance", "Financial Risk"],
  "operational resilience": ["Operations", "Technology", "Facilities"],
  "business continuity": ["Facilities", "Operations"],
  "incident": ["Technology", "Operations"],
  "transfer agent": ["Operations", "Finance"],
  "access management": ["Technology"],
};

const REG_KEYWORD_TO_DIMENSIONS: Record<string, string[]> = {
  "cyber": ["Data/Tech", "Operational"],
  "IT": ["Data/Tech"],
  "ICT": ["Data/Tech", "Operational"],
  "privacy": ["Regulatory", "Reputation"],
  "data": ["Data/Tech"],
  "incident": ["Operational"],
  "compliance": ["Regulatory"],
  "governance": ["Regulatory"],
  "fraud": ["Fraud"],
  "risk management": ["Operational"],
  "vendor": ["Operational", "Change"],
  "outsourc": ["Operational", "Change"],
  "reporting": ["Financial", "Regulatory"],
  "breach": ["Data/Tech", "Reputation"],
  "operational resilience": ["Operational", "Change"],
  "business continuity": ["Operational", "Change"],
  "access management": ["Data/Tech", "Fraud"],
  "AML": ["Regulatory", "Fraud"],
};

function computeIncidentAdjustments(incidents: IncidentRow[]): Record<string, Record<string, number>> {
  const catDimAccum: Record<string, Record<string, number>> = {};
  const catDimCount: Record<string, Record<string, number>> = {};

  for (const inc of incidents) {
    const sev = SEVERITY_WEIGHT[inc["Risk Severity"]] || 1;
    const pri = PRIORITY_WEIGHT[inc.Priority] || 1;
    const impact = sev * pri;

    const categories = BIZ_AREA_TO_CATEGORIES[inc["Impacted Business Areas"]] || [];
    const dimensions = BIZ_PROCESS_TO_DIMENSIONS[inc["Impacted Business Process"]] || ["Operational"];

    for (const cat of categories) {
      if (!catDimAccum[cat]) { catDimAccum[cat] = {}; catDimCount[cat] = {}; }
      for (const dim of dimensions) {
        catDimAccum[cat][dim] = (catDimAccum[cat][dim] || 0) + impact;
        catDimCount[cat][dim] = (catDimCount[cat][dim] || 0) + 1;
      }
    }
  }

  const result: Record<string, Record<string, number>> = {};
  for (const cat of Object.keys(catDimAccum)) {
    result[cat] = {};
    for (const dim of Object.keys(catDimAccum[cat])) {
      const totalImpact = catDimAccum[cat][dim];
      const count = catDimCount[cat][dim];
      const avgImpact = totalImpact / count;
      result[cat][dim] = clamp((avgImpact / 16) * 10, 0, 10);
    }
  }

  return result;
}

function computeRegAdjustments(regs: RegRow[]): Record<string, Record<string, number>> {
  const catDimAccum: Record<string, Record<string, number>> = {};

  for (const reg of regs) {
    const areasText = (reg["Impacted business areas"] || "").toLowerCase();
    const processText = (reg["Impacted processes"] || "").toLowerCase();
    const riskText = (reg["Risk raised (?) / lowered (?)"] || "");
    const combinedText = areasText + " " + processText;

    const raisedCount = (riskText.match(/↑/g) || []).length + (riskText.match(/\?.*risk/gi) || []).length;
    const loweredCount = (riskText.match(/↓/g) || []).length;
    const netDirection = raisedCount >= loweredCount ? 1 : -0.5;

    const matchedCategories = new Set<string>();
    const matchedDimensions = new Set<string>();

    for (const [keyword, cats] of Object.entries(REG_KEYWORD_TO_CATEGORIES)) {
      if (combinedText.includes(keyword.toLowerCase())) {
        cats.forEach(c => matchedCategories.add(c));
      }
    }

    for (const [keyword, dims] of Object.entries(REG_KEYWORD_TO_DIMENSIONS)) {
      if (combinedText.includes(keyword.toLowerCase())) {
        dims.forEach(d => matchedDimensions.add(d));
      }
    }

    matchedDimensions.add("Regulatory");

    if (matchedCategories.size === 0) {
      matchedCategories.add("Governance");
      matchedCategories.add("Compliance");
    }

    const perRegImpact = 3 * netDirection;

    const catArray = Array.from(matchedCategories);
    const dimArray = Array.from(matchedDimensions);
    for (const cat of catArray) {
      if (!catDimAccum[cat]) catDimAccum[cat] = {};
      for (const dim of dimArray) {
        catDimAccum[cat][dim] = (catDimAccum[cat][dim] || 0) + perRegImpact;
      }
    }
  }

  const result: Record<string, Record<string, number>> = {};
  for (const cat of Object.keys(catDimAccum)) {
    result[cat] = {};
    for (const dim of Object.keys(catDimAccum[cat])) {
      result[cat][dim] = clamp(catDimAccum[cat][dim], -8, 8);
    }
  }

  return result;
}

function computeNewsAdjustments(news: NewsRow[]): Record<string, Record<string, number>> {
  const catDimAccum: Record<string, Record<string, number>> = {};
  const catDimCount: Record<string, Record<string, number>> = {};

  for (const article of news) {
    const sentimentScore = article.Sentiment === "Negative" ? 2
      : article.Sentiment === "Neutral" ? 0
      : -1;

    const categories = NEWS_CATEGORY_TO_CATEGORIES[article.Category] || [];
    const dimensions = NEWS_RISKTYPE_TO_DIMENSIONS[article.Risk_Type] || ["Operational"];

    for (const cat of categories) {
      if (!catDimAccum[cat]) { catDimAccum[cat] = {}; catDimCount[cat] = {}; }
      for (const dim of dimensions) {
        catDimAccum[cat][dim] = (catDimAccum[cat][dim] || 0) + sentimentScore;
        catDimCount[cat][dim] = (catDimCount[cat][dim] || 0) + 1;
      }
    }
  }

  const result: Record<string, Record<string, number>> = {};
  for (const cat of Object.keys(catDimAccum)) {
    result[cat] = {};
    for (const dim of Object.keys(catDimAccum[cat])) {
      const totalSentiment = catDimAccum[cat][dim];
      const count = catDimCount[cat][dim];
      const avgSentiment = totalSentiment / count;
      result[cat][dim] = clamp(avgSentiment * 3, -8, 8);
    }
  }

  return result;
}

function computeCyberAdjustments(
  vendorRows: VendorRow[],
  cveRows: CveRow[],
): Record<string, Record<string, number>> {
  const vendorToCves = new Map<string, { total: number; ransomware: number; cves: CveRow[] }>();
  for (const cve of cveRows) {
    const vendorLower = cve.vendorProject.toLowerCase().trim();
    if (!vendorToCves.has(vendorLower)) {
      vendorToCves.set(vendorLower, { total: 0, ransomware: 0, cves: [] });
    }
    const entry = vendorToCves.get(vendorLower)!;
    entry.total++;
    if (cve.knownRansomwareCampaignUse === "Known") entry.ransomware++;
    entry.cves.push(cve);
  }

  const unitAdj: Record<string, Record<string, number>> = {};

  for (const vr of vendorRows) {
    const unitName = vr["Auditable Unit"].trim();
    const vendors = vr.Vendors.split(",").map(v => v.trim());

    let totalWeightedScore = 0;
    let matchedVendors = 0;

    for (const vendor of vendors) {
      const vendorLower = vendor.toLowerCase();
      let bestMatch: { total: number; ransomware: number } | null = null;

      const entries = Array.from(vendorToCves.entries());
      for (const [cveVendor, stats] of entries) {
        if (cveVendor.includes(vendorLower) || vendorLower.includes(cveVendor)) {
          bestMatch = stats;
          break;
        }
        const vendorWords = vendorLower.split(/\s+/);
        const cveWords = cveVendor.split(/\s+/);
        if (vendorWords.length > 0 && cveWords.some((w: string) => vendorWords.includes(w) && w.length > 3)) {
          bestMatch = stats;
          break;
        }
      }

      if (bestMatch) {
        matchedVendors++;
        const cveScore = bestMatch.total + bestMatch.ransomware * 2;
        totalWeightedScore += cveScore;
      }
    }

    if (matchedVendors === 0) continue;

    const avgScore = totalWeightedScore / vendors.length;
    const normalized = clamp(avgScore / 40, 0, 1);

    unitAdj[unitName] = {
      "Data/Tech": clamp(Math.round(normalized * 12 * 10) / 10, 0, 12),
      "Operational": clamp(Math.round(normalized * 8 * 10) / 10, 0, 8),
      "Fraud": clamp(Math.round(normalized * 5 * 10) / 10, 0, 5),
      "Reputation": clamp(Math.round(normalized * 4 * 10) / 10, 0, 4),
    };
  }

  return unitAdj;
}

function mergeAdjustments(
  baseScore: number,
  category: string,
  dimension: string,
  incidentAdj: Record<string, Record<string, number>>,
  regAdj: Record<string, Record<string, number>>,
  newsAdj: Record<string, Record<string, number>>,
): number {
  const inc = incidentAdj[category]?.[dimension] || 0;
  const reg = regAdj[category]?.[dimension] || 0;
  const news = newsAdj[category]?.[dimension] || 0;

  const totalAdj = inc + reg + news;
  return clamp(Math.round(baseScore + totalAdj), 0, 100);
}

export async function seedDatabase() {
  const existingSectors = await db.select().from(riskSectors);
  const existingNews = await db.select().from(marketNews);
  const needsReseed = existingNews.length !== 20;

  if (existingSectors.length > 0 && !needsReseed) {
    console.log("Database already seeded with current data, skipping...");
    return;
  }

  if (needsReseed && existingSectors.length > 0) {
    console.log("Stale data detected (news count mismatch). Reseeding...");
    await db.delete(marketNews);
    await db.delete(riskAlerts);
    await db.delete(heatmapData);
    await db.delete(riskMetrics);
    await db.delete(riskSectors);
  }

  console.log("Seeding database with scoring algorithm from all data sources...");

  const xlsxModule = await import("xlsx");
  const XLSX = xlsxModule.default || xlsxModule;

  const auditPath = path.resolve("attached_assets/Internal_Audit_Universe_Auto_Scoring_1771865142852.xlsm");
  const auditWb = XLSX.readFile(auditPath);
  const auditSheet = auditWb.Sheets["Audit Universe"];
  const auditRows: any[][] = XLSX.utils.sheet_to_json(auditSheet, { header: 1 });
  const dataRows = auditRows.slice(3).filter((r: any[]) => r[2]);
  console.log(`Parsed ${dataRows.length} auditable units from Audit Universe`);

  const incidentPath = path.resolve("attached_assets/Incident_data_1771869675474.xlsx");
  const incidentWb = XLSX.readFile(incidentPath);
  const incidentRows: IncidentRow[] = XLSX.utils.sheet_to_json(incidentWb.Sheets["IT Incidents"]);
  console.log(`Parsed ${incidentRows.length} incidents from Incident Data`);

  const regPath = path.resolve("attached_assets/Reg_inputs_1771869675475.xlsx");
  const regWb = XLSX.readFile(regPath);
  const regRows: RegRow[] = XLSX.utils.sheet_to_json(regWb.Sheets["Reg inputs"]);
  console.log(`Parsed ${regRows.length} regulatory inputs from Reg Inputs`);

  const newsRows: NewsRow[] = await loadNewsFromSheet2();
  console.log(`Parsed ${newsRows.length} news articles from Sheet2 of Updated Market News`);

  const vendorPath = path.resolve("attached_assets/Auditable_Units_Tech_Vendors_v2_1771945289230.xlsx");
  const vendorWb = XLSX.readFile(vendorPath);
  const vendorRows: VendorRow[] = XLSX.utils.sheet_to_json(vendorWb.Sheets["Auditable Units Vendors"]);
  console.log(`Parsed ${vendorRows.length} vendor mappings from Auditable Units Tech Vendors`);

  const cvePath = path.resolve("attached_assets/known_exploited_vulnerabilities_1771945289231.xlsx");
  const cveWb = XLSX.readFile(cvePath);
  const cveRows: CveRow[] = XLSX.utils.sheet_to_json(cveWb.Sheets["known_exploited_vulnerabilities"]);
  console.log(`Parsed ${cveRows.length} known exploited vulnerabilities from CVE data`);

  console.log("Computing score adjustments from 5 data sources...");
  const incidentAdj = computeIncidentAdjustments(incidentRows);
  const regAdj = computeRegAdjustments(regRows);
  const newsAdj = computeNewsAdjustments(newsRows);
  const cyberAdj = computeCyberAdjustments(vendorRows, cveRows);

  console.log("Incident adjustment categories:", Object.keys(incidentAdj));
  console.log("Regulatory adjustment categories:", Object.keys(regAdj));
  console.log("News adjustment categories:", Object.keys(newsAdj));
  console.log("Cyber adjustment units:", Object.keys(cyberAdj).length);

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

    let totalAdjustedScore = 0;
    let maxAdjustedScore = 0;
    let maxDim = "";
    const dimScores: Record<string, number> = {};
    const dimChanges: Array<{ dim: string; incAdj: number; regAdj_val: number; newsAdj_val: number; cyberAdj_val: number; totalChange: number }> = [];

    for (const dim of RISK_DIMENSIONS) {
      const colIdx = RISK_DIM_INDICES[dim];
      const rawScore = Number(row[colIdx]) || 0;
      const baseScaled = scaleScore(rawScore);

      const inc = incidentAdj[category]?.[dim] || 0;
      const reg = regAdj[category]?.[dim] || 0;
      const news = newsAdj[category]?.[dim] || 0;
      const cyber = cyberAdj[unitName]?.[dim] || 0;
      const totalChange = inc + reg + news + cyber;

      const adjustedScore = clamp(Math.round(baseScaled + totalChange), 0, 98);
      dimScores[dim] = adjustedScore;
      totalAdjustedScore += adjustedScore;
      dimChanges.push({ dim, incAdj: inc, regAdj_val: reg, newsAdj_val: news, cyberAdj_val: cyber, totalChange });

      const prevScaled = Math.floor(Math.random() * 16 + 75);
      const trend = totalChange > 0.5 ? "up" : totalChange < -0.5 ? "down" : "stable";

      const DECAY = 0.3;
      const momentum = (news * 1.5 + reg * 1.2 + inc * 0.8 + cyber * 1.3) * DECAY;
      const predictedScore = clamp(Math.round(adjustedScore + momentum), 0, 100);

      const sources = [inc, reg, news, cyber].filter(v => Math.abs(v) > 0);
      const allPositive = sources.length > 0 && sources.every(v => v > 0);
      const allNegative = sources.length > 0 && sources.every(v => v < 0);
      const signalConsistency = allPositive || allNegative;
      const signalStrength = sources.length / 4;
      const confidence = signalConsistency
        ? clamp(0.75 + signalStrength * 0.15, 0.7, 0.95)
        : clamp(0.55 + signalStrength * 0.10, 0.45, 0.70);

      await storage.createMetric({
        sectorId: created.id,
        metricType: dim,
        score: adjustedScore,
        previousScore: prevScaled,
        predictedScore: predictedScore,
        confidence,
      });

      await storage.createHeatmapData({
        sectorId: created.id,
        riskDimension: dim,
        value: adjustedScore,
        trend,
      });

      if (adjustedScore > maxAdjustedScore) {
        maxAdjustedScore = adjustedScore;
        maxDim = dim;
      }
    }

    const avgChange = dimChanges.reduce((sum, d) => sum + Math.abs(d.totalChange), 0) / dimChanges.length;

    if (avgChange >= 5) {
      const severity = avgChange >= 10 ? "critical" : avgChange >= 7 ? "high" : "medium";
      const sevLabel = severity.charAt(0).toUpperCase() + severity.slice(1);

      const topDrivers = dimChanges
        .filter(d => Math.abs(d.totalChange) > 0)
        .sort((a, b) => Math.abs(b.totalChange) - Math.abs(a.totalChange))
        .slice(0, 3)
        .map(d => {
          const parts: string[] = [];
          if (Math.abs(d.incAdj) > 0) parts.push(`Incidents ${d.incAdj > 0 ? "+" : ""}${d.incAdj.toFixed(1)}`);
          if (Math.abs(d.regAdj_val) > 0) parts.push(`Regulatory ${d.regAdj_val > 0 ? "+" : ""}${d.regAdj_val.toFixed(1)}`);
          if (Math.abs(d.newsAdj_val) > 0) parts.push(`News ${d.newsAdj_val > 0 ? "+" : ""}${d.newsAdj_val.toFixed(1)}`);
          if (Math.abs(d.cyberAdj_val) > 0) parts.push(`Cyber/Vendor ${d.cyberAdj_val > 0 ? "+" : ""}${d.cyberAdj_val.toFixed(1)}`);
          return `${d.dim} (${d.totalChange > 0 ? "+" : ""}${d.totalChange.toFixed(1)}): ${parts.join(", ")}`;
        })
        .join(" | ");

      await storage.createAlert({
        sectorId: created.id,
        severity,
        title: `${unitName}: ${sevLabel} Score Change Detected (avg ${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(1)} pts)`,
        description: `${unitName} shows significant score movement averaging ${avgChange.toFixed(1)} points across dimensions. Top drivers: ${topDrivers}`,
        metricType: maxDim,
        timestamp: new Date(),
      });
    }
  }

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

  console.log("Database seeded successfully with adjusted scores from all data sources!");
}
