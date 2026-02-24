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
  "Predictive insights / forward‐looking notes": string;
}

interface PrcRow {
  "Control ID": string;
  "Business Area": string;
  Control: string;
  "Design Effectiveness": string;
  "Operating Effectiveness": string;
  "Control Type": string;
}

interface IssueRow {
  "Audit Unit": string;
  "Issue Title": string;
  "Brief Description": string;
  Severity: string;
  Status: string;
  Source: string;
  "Expected Remediation Date": number | null;
  "Actual Remediation Date": number | null;
  "Audit Engagement Name": string;
  "Report Issuance Date": number | null;
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
  return clamp((raw / 5) * 100, 0, 100);
}

function getSeverityFromScore(score: number): string {
  if (score >= 90) return "critical";
  if (score >= 75) return "high";
  if (score >= 40) return "medium";
  return "low";
}

const COMPONENT_WEIGHTS = {
  baseline: 0.30,
  controlHealth: 0.25,
  auditIssueTrend: 0.20,
  businessExternal: 0.15,
  operationalRisk: 0.10,
};

const DIMENSION_RELEVANCE: Record<string, Record<string, number>> = {
  baseline: {
    Financial: 0.20, Regulatory: 0.15, Operational: 0.20, Change: 0.10,
    Fraud: 0.10, "Data/Tech": 0.15, Reputation: 0.10,
  },
  controlHealth: {
    Financial: 0.25, Regulatory: 0.15, Operational: 0.25, Change: 0.05,
    Fraud: 0.10, "Data/Tech": 0.15, Reputation: 0.05,
  },
  auditIssueTrend: {
    Financial: 0.20, Regulatory: 0.15, Operational: 0.20, Change: 0.10,
    Fraud: 0.15, "Data/Tech": 0.10, Reputation: 0.10,
  },
  businessExternal: {
    Financial: 0.15, Regulatory: 0.25, Operational: 0.10, Change: 0.10,
    Fraud: 0.10, "Data/Tech": 0.15, Reputation: 0.15,
  },
  operationalRisk: {
    Financial: 0.10, Regulatory: 0.05, Operational: 0.30, Change: 0.15,
    Fraud: 0.10, "Data/Tech": 0.25, Reputation: 0.05,
  },
};

const ISSUE_SEVERITY_WEIGHT: Record<string, number> = {
  "Severe": 5, "High": 4, "Moderate": 3, "Low": 2, "Immaterial": 1,
};

const ISSUE_STATUS_MULTIPLIER: Record<string, number> = {
  "Open": 1.0, "In Progress": 0.5, "Closed": 0.2,
};

const SEVERITY_WEIGHT: Record<string, number> = {
  "Severe": 4, "Major": 3, "Moderate": 2, "Minor": 1,
};

const PRIORITY_WEIGHT: Record<string, number> = {
  "Critical": 4, "High": 3, "Medium": 2, "Low": 1,
};

const BIZ_AREA_TO_UNITS: Record<string, string[]> = {
  "IT": ["Cybersecurity Program", "IT General Controls (ITGCs)", "Data Governance", "Access Management (IAM)", "System Implementations / Change"],
  "Finance": ["Financial Close & Reporting", "Revenue Recognition / Billing", "Accounts Payable", "Accounts Receivable", "Treasury Operations", "Capital Management"],
  "Operations": ["Supply Chain & Logistics", "Procurement", "Business Continuity & Disaster Recovery", "Contract Lifecycle Management"],
  "Customer Service": ["Revenue Recognition / Billing"],
  "Sales": ["Revenue Recognition / Billing"],
  "HR": ["Talent Management & HR Compliance", "Payroll"],
};

const NEWS_CATEGORY_TO_UNITS: Record<string, string[]> = {
  "Financial risk": ["Market Risk Management", "Credit Risk Management", "Liquidity Risk Management", "Capital Management", "Financial Close & Reporting", "Revenue Recognition / Billing", "Treasury Operations"],
  "Finance": ["Financial Close & Reporting", "Revenue Recognition / Billing", "Accounts Payable", "Accounts Receivable", "Treasury Operations", "Capital Management"],
  "Operations": ["Supply Chain & Logistics", "Procurement", "Business Continuity & Disaster Recovery", "Contract Lifecycle Management"],
  "HR": ["Talent Management & HR Compliance", "Payroll"],
  "Technology": ["Cybersecurity Program", "IT General Controls (ITGCs)", "Data Governance", "System Implementations / Change", "Access Management (IAM)"],
  "Compliance": ["Regulatory Compliance", "AML / Sanctions", "Privacy & Data Protection"],
  "Governance": ["Corporate Governance", "Enterprise Risk Management (ERM)", "Strategic Planning & Execution", "ESG / Sustainability Reporting"],
  "Legal": ["Regulatory Compliance", "Contract Lifecycle Management", "Corporate Governance"],
  "Facilities": ["Business Continuity & Disaster Recovery", "Supply Chain & Logistics"],
};

const REG_KEYWORD_TO_UNITS: Record<string, string[]> = {
  "cyber": ["Cybersecurity Program", "IT General Controls (ITGCs)", "Access Management (IAM)"],
  "IT": ["IT General Controls (ITGCs)", "System Implementations / Change", "Data Governance"],
  "ICT": ["IT General Controls (ITGCs)", "System Implementations / Change", "Cybersecurity Program"],
  "data": ["Data Governance", "Privacy & Data Protection", "IT General Controls (ITGCs)"],
  "privacy": ["Privacy & Data Protection", "Regulatory Compliance", "Data Governance"],
  "broker": ["Revenue Recognition / Billing", "Market Risk Management"],
  "investment": ["Capital Management", "Market Risk Management", "Treasury Operations"],
  "risk management": ["Enterprise Risk Management (ERM)", "Market Risk Management", "Credit Risk Management"],
  "compliance": ["Regulatory Compliance", "AML / Sanctions"],
  "audit": ["Corporate Governance", "Enterprise Risk Management (ERM)"],
  "governance": ["Corporate Governance", "Enterprise Risk Management (ERM)"],
  "vendor": ["Third-Party Risk Management", "Procurement", "Supply Chain & Logistics"],
  "outsourc": ["Third-Party Risk Management", "Procurement"],
  "payment": ["Accounts Payable", "Treasury Operations"],
  "bank": ["Treasury Operations", "Capital Management", "Liquidity Risk Management"],
  "reporting": ["Financial Close & Reporting", "ESG / Sustainability Reporting", "Revenue Recognition / Billing"],
  "AML": ["AML / Sanctions", "Regulatory Compliance"],
  "fraud": ["AML / Sanctions", "Revenue Recognition / Billing"],
  "operational resilience": ["Business Continuity & Disaster Recovery", "Cybersecurity Program"],
  "business continuity": ["Business Continuity & Disaster Recovery"],
  "incident": ["Cybersecurity Program", "IT General Controls (ITGCs)"],
  "transfer agent": ["Accounts Receivable", "Revenue Recognition / Billing"],
  "access management": ["Access Management (IAM)"],
};

function computeControlHealthScores(prcRows: PrcRow[]): Record<string, number> {
  const unitScores: Record<string, number[]> = {};

  for (const row of prcRows) {
    const unit = row["Business Area"].trim();
    const designOk = row["Design Effectiveness"] === "Effective";
    const operatingOk = row["Operating Effectiveness"] === "Effective";

    let controlScore: number;
    if (designOk && operatingOk) controlScore = 100;
    else if (designOk && !operatingOk) controlScore = 50;
    else if (!designOk && operatingOk) controlScore = 40;
    else controlScore = 0;

    if (!unitScores[unit]) unitScores[unit] = [];
    unitScores[unit].push(controlScore);
  }

  const result: Record<string, number> = {};
  for (const [unit, scores] of Object.entries(unitScores)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    result[unit] = Math.round(avg * 10) / 10;
  }
  return result;
}

function computeAuditIssueTrendScores(issueRows: IssueRow[], unitNames: string[]): Record<string, number> {
  const unitWeightedScores: Record<string, number> = {};
  const unitIssueCounts: Record<string, number> = {};

  for (const issue of issueRows) {
    const unit = issue["Audit Unit"]?.trim();
    if (!unit || !unitNames.includes(unit)) continue;

    const sevWeight = ISSUE_SEVERITY_WEIGHT[issue.Severity] || 1;
    const statusMult = ISSUE_STATUS_MULTIPLIER[issue.Status] || 1.0;
    const weightedScore = sevWeight * statusMult;

    unitWeightedScores[unit] = (unitWeightedScores[unit] || 0) + weightedScore;
    unitIssueCounts[unit] = (unitIssueCounts[unit] || 0) + 1;
  }

  let maxWeighted = 0;
  for (const val of Object.values(unitWeightedScores)) {
    if (val > maxWeighted) maxWeighted = val;
  }

  const result: Record<string, number> = {};
  for (const unit of unitNames) {
    if (maxWeighted > 0 && unitWeightedScores[unit]) {
      result[unit] = Math.round((unitWeightedScores[unit] / maxWeighted) * 100 * 10) / 10;
    } else {
      result[unit] = 0;
    }
  }
  return result;
}

function computeBusinessExternalScores(
  newsRows: NewsRow[],
  regRows: RegRow[],
  unitNames: string[],
): Record<string, number> {
  const unitScores: Record<string, number[]> = {};

  for (const article of newsRows) {
    const sentimentScore = article.Sentiment === "Negative" ? 80
      : article.Sentiment === "Neutral" ? 50
      : 20;

    const matchedUnits = NEWS_CATEGORY_TO_UNITS[article.Category] || [];
    for (const unit of matchedUnits) {
      if (!unitNames.includes(unit)) continue;
      if (!unitScores[unit]) unitScores[unit] = [];
      unitScores[unit].push(sentimentScore);
    }
  }

  for (const reg of regRows) {
    const areasText = (reg["Impacted business areas"] || "").toLowerCase();
    const processText = (reg["Impacted processes"] || "").toLowerCase();
    const riskText = (reg["Risk raised (?) / lowered (?)"] || "");
    const combinedText = areasText + " " + processText;

    const raisedCount = (riskText.match(/↑/g) || []).length + (riskText.match(/\?.*risk/gi) || []).length;
    const loweredCount = (riskText.match(/↓/g) || []).length;
    const regScore = raisedCount >= loweredCount ? 75 : 30;

    const matchedUnits = new Set<string>();
    for (const [keyword, units] of Object.entries(REG_KEYWORD_TO_UNITS)) {
      if (combinedText.includes(keyword.toLowerCase())) {
        units.forEach(u => matchedUnits.add(u));
      }
    }

    for (const unit of matchedUnits) {
      if (!unitNames.includes(unit)) continue;
      if (!unitScores[unit]) unitScores[unit] = [];
      unitScores[unit].push(regScore);
    }
  }

  const result: Record<string, number> = {};
  for (const unit of unitNames) {
    if (unitScores[unit] && unitScores[unit].length > 0) {
      const avg = unitScores[unit].reduce((a, b) => a + b, 0) / unitScores[unit].length;
      result[unit] = Math.round(clamp(avg, 0, 100) * 10) / 10;
    } else {
      result[unit] = 50;
    }
  }
  return result;
}

function computeOperationalRiskScores(
  incidentRows: IncidentRow[],
  vendorRows: VendorRow[],
  cveRows: CveRow[],
  unitNames: string[],
): Record<string, number> {
  const unitIncidentScores: Record<string, number> = {};

  for (const inc of incidentRows) {
    const sev = SEVERITY_WEIGHT[inc["Risk Severity"]] || 1;
    const pri = PRIORITY_WEIGHT[inc.Priority] || 1;
    const impact = sev * pri;

    const matchedUnits = BIZ_AREA_TO_UNITS[inc["Impacted Business Areas"]] || [];
    for (const unit of matchedUnits) {
      if (!unitNames.includes(unit)) continue;
      unitIncidentScores[unit] = (unitIncidentScores[unit] || 0) + impact;
    }
  }

  let maxIncidentScore = 0;
  for (const val of Object.values(unitIncidentScores)) {
    if (val > maxIncidentScore) maxIncidentScore = val;
  }

  const vendorToCves = new Map<string, { total: number; ransomware: number }>();
  for (const cve of cveRows) {
    const vendorLower = cve.vendorProject.toLowerCase().trim();
    if (!vendorToCves.has(vendorLower)) {
      vendorToCves.set(vendorLower, { total: 0, ransomware: 0 });
    }
    const entry = vendorToCves.get(vendorLower)!;
    entry.total++;
    if (cve.knownRansomwareCampaignUse === "Known") entry.ransomware++;
  }

  const unitCyberScores: Record<string, number> = {};
  for (const vr of vendorRows) {
    const unitName = vr["Auditable Unit"].trim();
    if (!unitNames.includes(unitName)) continue;
    const vendors = vr.Vendors.split(",").map(v => v.trim());
    let totalWeightedScore = 0;
    let matchedVendors = 0;

    for (const vendor of vendors) {
      const vendorLower = vendor.toLowerCase();
      let bestMatch: { total: number; ransomware: number } | null = null;
      for (const [cveVendor, stats] of vendorToCves.entries()) {
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
        totalWeightedScore += bestMatch.total + bestMatch.ransomware * 2;
      }
    }

    if (matchedVendors > 0) {
      const avgScore = totalWeightedScore / vendors.length;
      unitCyberScores[unitName] = clamp(avgScore / 40, 0, 1) * 100;
    }
  }

  let maxCyberScore = 0;
  for (const val of Object.values(unitCyberScores)) {
    if (val > maxCyberScore) maxCyberScore = val;
  }

  const result: Record<string, number> = {};
  for (const unit of unitNames) {
    const incidentNorm = maxIncidentScore > 0
      ? ((unitIncidentScores[unit] || 0) / maxIncidentScore) * 100
      : 0;
    const cyberNorm = maxCyberScore > 0
      ? ((unitCyberScores[unit] || 0) / maxCyberScore) * 100
      : 0;

    result[unit] = Math.round(clamp((incidentNorm * 0.4 + cyberNorm * 0.6), 0, 100) * 10) / 10;
  }
  return result;
}

function computeFinalDimensionScore(
  dimension: string,
  baselineScore: number,
  controlHealthScore: number,
  auditIssueTrendScore: number,
  businessExternalScore: number,
  operationalRiskScore: number,
): number {
  const components = [
    { key: "baseline", score: baselineScore },
    { key: "controlHealth", score: controlHealthScore },
    { key: "auditIssueTrend", score: auditIssueTrendScore },
    { key: "businessExternal", score: businessExternalScore },
    { key: "operationalRisk", score: operationalRiskScore },
  ];

  let weightedSum = 0;
  let maxPossible = 0;

  for (const comp of components) {
    const compWeight = COMPONENT_WEIGHTS[comp.key as keyof typeof COMPONENT_WEIGHTS];
    const dimRelevance = DIMENSION_RELEVANCE[comp.key][dimension];
    weightedSum += comp.score * compWeight * dimRelevance;
    maxPossible += 100 * compWeight * dimRelevance;
  }

  if (maxPossible === 0) return 0;
  return Math.round((weightedSum / maxPossible) * 100 * 10) / 10;
}

export async function seedDatabase() {
  const existingSectors = await db.select().from(riskSectors);
  const existingNews = await db.select().from(marketNews);
  const existingMetrics = await db.select().from(riskMetrics);
  const hasPredictiveModel = existingMetrics.length > 0 && existingMetrics[0]?.confidence !== null;
  const needsReseed = existingNews.length !== 20 || (existingSectors.length > 0 && !hasPredictiveModel);

  const forceReseed = true;

  if (existingSectors.length > 0 && !forceReseed && !needsReseed) {
    console.log("Database already seeded with current data, skipping...");
    return;
  }

  if (existingSectors.length > 0) {
    console.log("Reseeding with new Predictive Scoring Model...");
    await db.delete(marketNews);
    await db.delete(riskAlerts);
    await db.delete(heatmapData);
    await db.delete(riskMetrics);
    await db.delete(riskSectors);
  }

  console.log("Seeding database with 5-Component Predictive Scoring Model...");

  const xlsxModule = await import("xlsx");
  const XLSX = xlsxModule.default || xlsxModule;

  const auditPath = path.resolve("attached_assets/Internal_Audit_Universe_Auto_Scoring_1771865142852.xlsm");
  const auditWb = XLSX.readFile(auditPath);
  const auditSheet = auditWb.Sheets["Audit Universe"];
  const auditRows: any[][] = XLSX.utils.sheet_to_json(auditSheet, { header: 1 });
  const dataRows = auditRows.slice(3).filter((r: any[]) => r[2]);
  console.log(`Parsed ${dataRows.length} auditable units from Audit Universe`);

  const prcPath = path.resolve("attached_assets/PRC_updated_1771952095993.xlsx");
  const prcWb = XLSX.readFile(prcPath);
  const prcRows: PrcRow[] = XLSX.utils.sheet_to_json(prcWb.Sheets["Sheet2"]);
  console.log(`Parsed ${prcRows.length} controls from PRC data`);

  const issuePath = path.resolve("attached_assets/Issue_details_no_quarter_1771952095994.xlsx");
  const issueWb = XLSX.readFile(issuePath);
  const issueRows: IssueRow[] = XLSX.utils.sheet_to_json(issueWb.Sheets["Sheet1"]);
  console.log(`Parsed ${issueRows.length} issues from Issue Details`);

  const incidentPath = path.resolve("attached_assets/Incident_data_1771869675474.xlsx");
  const incidentWb = XLSX.readFile(incidentPath);
  const incidentRows: IncidentRow[] = XLSX.utils.sheet_to_json(incidentWb.Sheets["IT Incidents"]);
  console.log(`Parsed ${incidentRows.length} incidents from Incident Data`);

  const regPath = path.resolve("attached_assets/Reg_inputs_1771869675475.xlsx");
  const regWb = XLSX.readFile(regPath);
  const regRows: RegRow[] = XLSX.utils.sheet_to_json(regWb.Sheets["Reg inputs"]);
  console.log(`Parsed ${regRows.length} regulatory inputs`);

  const newsRows: NewsRow[] = await loadNewsFromSheet2();
  console.log(`Parsed ${newsRows.length} news articles`);

  const vendorPath = path.resolve("attached_assets/Auditable_Units_Tech_Vendors_v2_1771945289230.xlsx");
  const vendorWb = XLSX.readFile(vendorPath);
  const vendorRows: VendorRow[] = XLSX.utils.sheet_to_json(vendorWb.Sheets["Auditable Units Vendors"]);
  console.log(`Parsed ${vendorRows.length} vendor mappings`);

  const cvePath = path.resolve("attached_assets/known_exploited_vulnerabilities_1771945289231.xlsx");
  const cveWb = XLSX.readFile(cvePath);
  const cveRows: CveRow[] = XLSX.utils.sheet_to_json(cveWb.Sheets["known_exploited_vulnerabilities"]);
  console.log(`Parsed ${cveRows.length} CVEs`);

  const unitNames = dataRows.map((r: any[]) => String(r[2]));

  console.log("Computing 5-component scores...");
  const controlHealthScores = computeControlHealthScores(prcRows);
  const auditIssueTrendScores = computeAuditIssueTrendScores(issueRows, unitNames);
  const businessExternalScores = computeBusinessExternalScores(newsRows, regRows, unitNames);
  const operationalRiskScores = computeOperationalRiskScores(incidentRows, vendorRows, cveRows, unitNames);

  console.log("Sample component scores for first 3 units:");
  for (const name of unitNames.slice(0, 3)) {
    console.log(`  ${name}: Control=${controlHealthScores[name] || 0}, Issues=${auditIssueTrendScores[name] || 0}, BizExt=${businessExternalScores[name] || 0}, OpRisk=${operationalRiskScores[name] || 0}`);
  }

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

    const baselineDimScores: Record<string, number> = {};
    for (const dim of RISK_DIMENSIONS) {
      const colIdx = RISK_DIM_INDICES[dim];
      const rawScore = Number(row[colIdx]) || 0;
      baselineDimScores[dim] = scaleScore(rawScore);
    }
    const baselineAvg = Object.values(baselineDimScores).reduce((a, b) => a + b, 0) / RISK_DIMENSIONS.length;

    const controlHealth = controlHealthScores[unitName] || 50;
    const auditIssueTrend = auditIssueTrendScores[unitName] || 0;
    const businessExternal = businessExternalScores[unitName] || 50;
    const operationalRisk = operationalRiskScores[unitName] || 0;

    let totalFinalScore = 0;
    let maxFinalScore = 0;
    let maxDim = "";
    const dimResults: Array<{
      dim: string;
      finalScore: number;
      baselineContrib: number;
      controlContrib: number;
      issueContrib: number;
      bizExtContrib: number;
      opRiskContrib: number;
    }> = [];

    for (const dim of RISK_DIMENSIONS) {
      const finalScore = computeFinalDimensionScore(
        dim, baselineDimScores[dim], controlHealth, auditIssueTrend, businessExternal, operationalRisk
      );

      const baselineOnly = computeFinalDimensionScore(dim, baselineDimScores[dim], 0, 0, 0, 0);

      totalFinalScore += finalScore;

      dimResults.push({
        dim,
        finalScore,
        baselineContrib: baselineOnly,
        controlContrib: controlHealth * COMPONENT_WEIGHTS.controlHealth * DIMENSION_RELEVANCE.controlHealth[dim],
        issueContrib: auditIssueTrend * COMPONENT_WEIGHTS.auditIssueTrend * DIMENSION_RELEVANCE.auditIssueTrend[dim],
        bizExtContrib: businessExternal * COMPONENT_WEIGHTS.businessExternal * DIMENSION_RELEVANCE.businessExternal[dim],
        opRiskContrib: operationalRisk * COMPONENT_WEIGHTS.operationalRisk * DIMENSION_RELEVANCE.operationalRisk[dim],
      });

      if (finalScore > maxFinalScore) {
        maxFinalScore = finalScore;
        maxDim = dim;
      }

      const baselineDimOnly = computeFinalDimensionScore(dim, baselineDimScores[dim], 50, 0, 50, 0);

      const nonBaselineSignals = [controlHealth - 50, auditIssueTrend, businessExternal - 50, operationalRisk];
      const DECAY = 0.25;
      const momentum = (
        nonBaselineSignals[0] * 1.2 +
        nonBaselineSignals[1] * 1.4 +
        nonBaselineSignals[2] * 1.5 +
        nonBaselineSignals[3] * 1.3
      ) * DECAY * (DIMENSION_RELEVANCE.controlHealth[dim] + DIMENSION_RELEVANCE.auditIssueTrend[dim] + DIMENSION_RELEVANCE.businessExternal[dim] + DIMENSION_RELEVANCE.operationalRisk[dim]) / 4;
      const predictedScore = clamp(Math.round(finalScore + momentum), 0, 100);

      const absSignals = nonBaselineSignals.map(v => Math.abs(v));
      const signedSignals = nonBaselineSignals.filter(v => Math.abs(v) > 5);
      const allSameDir = signedSignals.length > 0 && (signedSignals.every(v => v > 0) || signedSignals.every(v => v < 0));
      const signalCount = signedSignals.length;
      const confidence = allSameDir
        ? clamp(0.75 + (signalCount / 4) * 0.15, 0.7, 0.95)
        : clamp(0.55 + (signalCount / 4) * 0.10, 0.45, 0.70);

      const trend = finalScore > baselineDimOnly + 2 ? "up" : finalScore < baselineDimOnly - 2 ? "down" : "stable";

      await storage.createMetric({
        sectorId: created.id,
        metricType: dim,
        score: finalScore,
        previousScore: Math.round(baselineDimScores[dim]),
        predictedScore,
        confidence,
      });

      await storage.createHeatmapData({
        sectorId: created.id,
        riskDimension: dim,
        value: finalScore,
        trend,
      });
    }

    const avgFinalScore = totalFinalScore / RISK_DIMENSIONS.length;
    const avgBaselineScore = baselineAvg;
    const scoreChange = avgFinalScore - avgBaselineScore;
    const absScoreChange = Math.abs(scoreChange);

    if (absScoreChange >= 5 || avgFinalScore >= 70) {
      const severity = avgFinalScore >= 85 ? "critical" : avgFinalScore >= 70 ? "high" : absScoreChange >= 10 ? "high" : "medium";
      const sevLabel = severity.charAt(0).toUpperCase() + severity.slice(1);

      const componentBreakdown = [
        `Baseline: ${Math.round(baselineAvg)}`,
        `Control Health: ${Math.round(controlHealth)}`,
        `Audit Issues: ${Math.round(auditIssueTrend)}`,
        `Business/External: ${Math.round(businessExternal)}`,
        `Operational Risk: ${Math.round(operationalRisk)}`,
      ].join(" | ");

      const topDims = dimResults
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, 3)
        .map(d => `${d.dim}: ${d.finalScore}`)
        .join(", ");

      await storage.createAlert({
        sectorId: created.id,
        severity,
        title: `${unitName}: ${sevLabel} Predictive Risk Score (avg ${avgFinalScore.toFixed(1)})`,
        description: `Predictive model scores — ${componentBreakdown}. Top dimensions: ${topDims}`,
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

  console.log("Database seeded successfully with 5-Component Predictive Scoring Model!");
}
