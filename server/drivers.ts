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
  "Financial": 8, "Regulatory": 9, "Operational": 10, "Change": 11,
  "Fraud": 13, "Data/Tech": 14, "Reputation": 15,
};

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

const SEVERITY_WEIGHT: Record<string, number> = {
  "Severe": 4, "Major": 3, "Moderate": 2, "Minor": 1,
};

const PRIORITY_WEIGHT: Record<string, number> = {
  "Critical": 4, "High": 3, "Medium": 2, "Low": 1,
};

const ISSUE_SEVERITY_WEIGHT: Record<string, number> = {
  "Severe": 5, "High": 4, "Moderate": 3, "Low": 2, "Immaterial": 1,
};

const ISSUE_STATUS_MULTIPLIER: Record<string, number> = {
  "Open": 1.0, "In Progress": 0.5, "Closed": 0.2,
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

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function scaleScore(raw: number): number {
  return clamp((raw / 5) * 100, 0, 100);
}

const ACTION_MAP: Record<string, Record<string, string>> = {
  "baseline": {
    "Financial": "Review and recalibrate baseline financial risk assumptions based on current business conditions.",
    "Regulatory": "Validate baseline regulatory risk ratings against current compliance obligations.",
    "Operational": "Reassess baseline operational risk parameters for process maturity changes.",
    "Change": "Evaluate whether baseline change risk still reflects current transformation pace.",
    "Fraud": "Update baseline fraud risk indicators to reflect current threat landscape.",
    "Data/Tech": "Review baseline technology risk scores for relevance to current IT architecture.",
    "Reputation": "Assess whether baseline reputational risk captures current stakeholder dynamics.",
  },
  "controlHealth": {
    "Financial": "Strengthen financial controls with design and operating effectiveness gaps; prioritize remediation.",
    "Regulatory": "Address regulatory control weaknesses; ensure both design and operating effectiveness.",
    "Operational": "Fix operational control gaps; focus on controls lacking operating effectiveness.",
    "Change": "Review change management controls for design adequacy and operating execution.",
    "Fraud": "Enhance anti-fraud controls where effectiveness gaps exist; deploy compensating controls.",
    "Data/Tech": "Remediate IT controls with effectiveness issues; prioritize access and data integrity controls.",
    "Reputation": "Strengthen governance controls to prevent reputational incidents from control failures.",
  },
  "auditIssueTrend": {
    "Financial": "Accelerate remediation of open financial audit issues; escalate severe/high findings.",
    "Regulatory": "Prioritize closure of regulatory compliance audit findings before deadlines.",
    "Operational": "Address operational audit issues contributing to elevated risk; track remediation progress.",
    "Change": "Resolve change management audit findings; ensure issues don't block transformation.",
    "Fraud": "Close fraud-related audit issues urgently; validate remediation effectiveness.",
    "Data/Tech": "Remediate IT audit findings; focus on data governance and access control issues.",
    "Reputation": "Address audit issues that could surface as reputational concerns if left unresolved.",
  },
  "businessExternal": {
    "Financial": "Monitor market conditions highlighted by news signals and stress-test financial risk models.",
    "Regulatory": "Track emerging regulatory trends from industry news and prepare proactive responses.",
    "Operational": "Evaluate operational resilience against risks flagged by market intelligence.",
    "Change": "Assess whether change initiatives address emerging risks identified in industry news.",
    "Fraud": "Heighten fraud monitoring based on negative sentiment indicators in industry news.",
    "Data/Tech": "Evaluate technology risk posture against cyber threats highlighted in news coverage.",
    "Reputation": "Monitor media sentiment and prepare crisis communication plans if trends worsen.",
  },
  "operationalRisk": {
    "Financial": "Assess financial exposure from vendor vulnerabilities and ensure cyber insurance coverage is adequate.",
    "Regulatory": "Verify vendor compliance with cybersecurity regulatory requirements (DORA, SEC cyber rules).",
    "Operational": "Review vendor SLAs and incident response for critical technology dependencies.",
    "Change": "Prioritize patching and vendor upgrades for systems with known exploited vulnerabilities.",
    "Fraud": "Evaluate whether vendor vulnerabilities could enable unauthorized access or fraud schemes.",
    "Data/Tech": "Conduct vulnerability assessments on affected vendor products and accelerate patching cycles.",
    "Reputation": "Prepare disclosure plans for vendor-related cyber incidents that could affect stakeholders.",
  },
};

export interface ControlHealthDriver {
  controlId: string;
  control: string;
  controlType: string;
  designEffectiveness: string;
  operatingEffectiveness: string;
  score: number;
}

export interface AuditIssueDriver {
  issueTitle: string;
  description: string;
  severity: string;
  status: string;
  source: string;
  auditEngagement: string;
  weightedScore: number;
}

export interface IncidentDriver {
  id: string;
  title: string;
  severity: string;
  priority: string;
  impact: number;
  process: string;
}

export interface RegDriver {
  regulator: string;
  rule: string;
  direction: string;
  impact: number;
}

export interface NewsDriver {
  headline: string;
  sentiment: string;
  riskType: string;
  source: string;
}

export interface CyberDriver {
  cveId: string;
  vendor: string;
  product: string;
  name: string;
  ransomware: boolean;
}

export interface OperationalMetricDriver {
  metric: string;
  value: number;
}

export interface DimensionDriver {
  dimension: string;
  baseScore: number;
  adjustedScore: number;
  baselineContribution: number;
  controlHealthContribution: number;
  auditIssueTrendContribution: number;
  businessExternalContribution: number;
  operationalRiskContribution: number;
  controlHealthDrivers: ControlHealthDriver[];
  auditIssueDrivers: AuditIssueDriver[];
  incidentDrivers: IncidentDriver[];
  regulatoryDrivers: RegDriver[];
  newsDrivers: NewsDriver[];
  cyberDrivers: CyberDriver[];
  operationalMetricDrivers: OperationalMetricDriver[];
  baselineAction: string;
  controlHealthAction: string;
  auditIssueAction: string;
  businessExternalAction: string;
  operationalRiskAction: string;
}

export interface DriversResponse {
  sectorName: string;
  sectorCategory: string;
  averageAdjustedScore: number;
  severity: string;
  componentScores: {
    baseline: number;
    controlHealth: number;
    auditIssueTrend: number;
    businessExternal: number;
    operationalRisk: number;
  };
  dimensions: DimensionDriver[];
}

let cachedData: {
  auditRows: any[][];
  incidents: IncidentRow[];
  regs: RegRow[];
  news: NewsRow[];
  vendors: VendorRow[];
  cves: CveRow[];
  prcRows: PrcRow[];
  issueRows: IssueRow[];
  unitNames: string[];
} | null = null;

async function loadData() {
  if (cachedData) return cachedData;

  const xlsxModule = await import("xlsx");
  const XLSX = xlsxModule.default || xlsxModule;

  const auditPath = path.resolve("attached_assets/Internal_Audit_Universe_Auto_Scoring_1771865142852.xlsm");
  const auditWb = XLSX.readFile(auditPath);
  const auditSheet = auditWb.Sheets["Audit Universe"];
  const auditRows: any[][] = XLSX.utils.sheet_to_json(auditSheet, { header: 1 });

  const incidentPath = path.resolve("attached_assets/Incident_data_1771869675474.xlsx");
  const incidentWb = XLSX.readFile(incidentPath);
  const incidents: IncidentRow[] = XLSX.utils.sheet_to_json(incidentWb.Sheets["IT Incidents"]);

  const regPath = path.resolve("attached_assets/Reg_inputs_1771869675475.xlsx");
  const regWb = XLSX.readFile(regPath);
  const regs: RegRow[] = XLSX.utils.sheet_to_json(regWb.Sheets["Reg inputs"]);

  const news: NewsRow[] = await loadNewsFromSheet2();

  const vendorPath = path.resolve("attached_assets/Auditable_Units_Tech_Vendors_v2_1771945289230.xlsx");
  const vendorWb = XLSX.readFile(vendorPath);
  const vendors: VendorRow[] = XLSX.utils.sheet_to_json(vendorWb.Sheets["Auditable Units Vendors"]);

  const cvePath = path.resolve("attached_assets/known_exploited_vulnerabilities_1771945289231.xlsx");
  const cveWb = XLSX.readFile(cvePath);
  const cves: CveRow[] = XLSX.utils.sheet_to_json(cveWb.Sheets["known_exploited_vulnerabilities"]);

  const prcPath = path.resolve("attached_assets/PRC_updated_1771952095993.xlsx");
  const prcWb = XLSX.readFile(prcPath);
  const prcRows: PrcRow[] = XLSX.utils.sheet_to_json(prcWb.Sheets["Sheet2"]);

  const issuePath = path.resolve("attached_assets/Issue_details_no_quarter_1771952095994.xlsx");
  const issueWb = XLSX.readFile(issuePath);
  const issueRows: IssueRow[] = XLSX.utils.sheet_to_json(issueWb.Sheets["Sheet1"]);

  const opMetricsPath = path.resolve("attached_assets/predictive_heatmap_dataset_1771962971302.xlsx");
  const opWb = XLSX.readFile(opMetricsPath);
  const opMetricsRows: any[][] = XLSX.utils.sheet_to_json(opWb.Sheets["Operational_Metrics"], { header: 1 });

  const dataRows = auditRows.slice(3).filter((r: any[]) => r[2]);
  const unitNames = dataRows.map((r: any[]) => String(r[2]));

  cachedData = { auditRows, incidents, regs, news, vendors, cves, prcRows, issueRows, unitNames, opMetricsRows };
  return cachedData;
}

function computeUnitControlHealthScore(prcRows: PrcRow[], unitName: string): { score: number; drivers: ControlHealthDriver[] } {
  const unitControls = prcRows.filter(r => r["Business Area"].trim() === unitName);
  if (unitControls.length === 0) return { score: 50, drivers: [] };

  const drivers: ControlHealthDriver[] = unitControls.map(row => {
    const designOk = row["Design Effectiveness"] === "Effective";
    const operatingOk = row["Operating Effectiveness"] === "Effective";
    let controlScore: number;
    if (designOk && operatingOk) controlScore = 100;
    else if (designOk && !operatingOk) controlScore = 50;
    else if (!designOk && operatingOk) controlScore = 40;
    else controlScore = 0;

    return {
      controlId: row["Control ID"],
      control: row.Control,
      controlType: row["Control Type"],
      designEffectiveness: row["Design Effectiveness"],
      operatingEffectiveness: row["Operating Effectiveness"],
      score: controlScore,
    };
  });

  const avg = drivers.reduce((a, b) => a + b.score, 0) / drivers.length;
  return { score: Math.round(avg * 10) / 10, drivers };
}

function computeUnitAuditIssueTrendScore(
  issueRows: IssueRow[], unitName: string, unitNames: string[]
): { score: number; drivers: AuditIssueDriver[] } {
  const unitIssues = issueRows.filter(r => r["Audit Unit"]?.trim() === unitName);

  const drivers: AuditIssueDriver[] = unitIssues.map(issue => {
    const sevWeight = ISSUE_SEVERITY_WEIGHT[issue.Severity] || 1;
    const statusMult = ISSUE_STATUS_MULTIPLIER[issue.Status] || 1.0;
    return {
      issueTitle: issue["Issue Title"],
      description: issue["Brief Description"],
      severity: issue.Severity,
      status: issue.Status,
      source: issue.Source,
      auditEngagement: issue["Audit Engagement Name"],
      weightedScore: sevWeight * statusMult,
    };
  });

  const unitWeightedTotal = drivers.reduce((a, b) => a + b.weightedScore, 0);

  let maxWeighted = 0;
  for (const name of unitNames) {
    const issues = issueRows.filter(r => r["Audit Unit"]?.trim() === name);
    let total = 0;
    for (const issue of issues) {
      const sev = ISSUE_SEVERITY_WEIGHT[issue.Severity] || 1;
      const status = ISSUE_STATUS_MULTIPLIER[issue.Status] || 1.0;
      total += sev * status;
    }
    if (total > maxWeighted) maxWeighted = total;
  }

  const score = maxWeighted > 0 ? Math.round((unitWeightedTotal / maxWeighted) * 100 * 10) / 10 : 0;
  return { score, drivers: drivers.sort((a, b) => b.weightedScore - a.weightedScore).slice(0, 10) };
}

function computeUnitBusinessExternalScore(
  newsRows: NewsRow[], regRows: RegRow[], unitName: string
): { score: number; newsDrivers: NewsDriver[]; regulatoryDrivers: RegDriver[] } {
  const matchedNews: NewsDriver[] = [];
  const scores: number[] = [];

  for (const article of newsRows) {
    const matchedUnits = NEWS_CATEGORY_TO_UNITS[article.Category] || [];
    if (matchedUnits.includes(unitName)) {
      const sentimentScore = article.Sentiment === "Negative" ? 80 : article.Sentiment === "Neutral" ? 50 : 20;
      scores.push(sentimentScore);
      matchedNews.push({
        headline: article.Headline,
        sentiment: article.Sentiment,
        riskType: article.Risk_Type,
        source: article.Source,
      });
    }
  }

  const matchedRegs: RegDriver[] = [];
  for (const reg of regRows) {
    const areasText = (reg["Impacted business areas"] || "").toLowerCase();
    const processText = (reg["Impacted processes"] || "").toLowerCase();
    const riskText = (reg["Risk raised (?) / lowered (?)"] || "");
    const combinedText = areasText + " " + processText;

    const raisedCount = (riskText.match(/↑/g) || []).length + (riskText.match(/\?.*risk/gi) || []).length;
    const loweredCount = (riskText.match(/↓/g) || []).length;
    const direction = raisedCount >= loweredCount ? 1 : -0.5;
    const regScore = direction > 0 ? 75 : 30;

    const matchedUnits = new Set<string>();
    for (const [keyword, units] of Object.entries(REG_KEYWORD_TO_UNITS)) {
      if (combinedText.includes(keyword.toLowerCase())) {
        units.forEach(u => matchedUnits.add(u));
      }
    }

    if (matchedUnits.has(unitName)) {
      scores.push(regScore);
      matchedRegs.push({
        regulator: reg.Regulator,
        rule: (reg["Rule / Release"] || "").substring(0, 120),
        direction: direction > 0 ? "Raised" : "Lowered",
        impact: Math.round(direction * 3 * 10) / 10,
      });
    }
  }

  const score = scores.length > 0
    ? Math.round(clamp(scores.reduce((a, b) => a + b, 0) / scores.length, 0, 100) * 10) / 10
    : 50;

  return { score, newsDrivers: matchedNews.slice(0, 5), regulatoryDrivers: matchedRegs };
}

function loadUnitOperationalRiskScore(
  opMetricsRows: any[][], unitName: string
): { score: number; metricDrivers: OperationalMetricDriver[] } {
  const headerRow = opMetricsRows[0] || [];
  for (let i = 1; i < opMetricsRows.length; i++) {
    const rowUnitName = String(opMetricsRows[i]?.[0] || "").trim();
    if (rowUnitName === unitName) {
      const predictiveScore = clamp(Math.round((Number(opMetricsRows[i]?.[17]) || 0) * 10) / 10, 0, 100);
      const metricDrivers: OperationalMetricDriver[] = [];
      const metricColumns = [
        { col: 8, name: "Exception Score" },
        { col: 9, name: "Error Score" },
        { col: 10, name: "Backlog Score" },
        { col: 11, name: "Override Score" },
        { col: 12, name: "Volume Score" },
        { col: 13, name: "Turnover Score" },
        { col: 14, name: "Capacity Score" },
        { col: 15, name: "Operational Stress Score" },
        { col: 16, name: "Escalation Multiplier" },
      ];
      for (const mc of metricColumns) {
        const val = Number(opMetricsRows[i]?.[mc.col]) || 0;
        metricDrivers.push({ metric: mc.name, value: Math.round(val * 100) / 100 });
      }
      return { score: predictiveScore, metricDrivers };
    }
  }
  return { score: 50, metricDrivers: [] };
}

function computeFinalDimensionScore(
  dimension: string,
  baselineScore: number,
  controlHealthScore: number,
  auditIssueTrendScore: number,
  businessExternalScore: number,
  operationalRiskScore: number,
): number {
  let weightedSum = 0;
  let maxPossible = 0;

  const components = [
    { key: "baseline", score: baselineScore },
    { key: "controlHealth", score: controlHealthScore },
    { key: "auditIssueTrend", score: auditIssueTrendScore },
    { key: "businessExternal", score: businessExternalScore },
    { key: "operationalRisk", score: operationalRiskScore },
  ];

  for (const comp of components) {
    const compWeight = COMPONENT_WEIGHTS[comp.key as keyof typeof COMPONENT_WEIGHTS];
    const dimRelevance = DIMENSION_RELEVANCE[comp.key][dimension];
    weightedSum += comp.score * compWeight * dimRelevance;
    maxPossible += 100 * compWeight * dimRelevance;
  }

  if (maxPossible === 0) return 0;
  return Math.round((weightedSum / maxPossible) * 100 * 10) / 10;
}

function computeNormalizedContributions(
  dimension: string,
  baselineScore: number,
  controlHealthScore: number,
  auditIssueTrendScore: number,
  businessExternalScore: number,
  operationalRiskScore: number,
): { baseline: number; controlHealth: number; auditIssueTrend: number; businessExternal: number; operationalRisk: number } {
  const scores: Record<string, number> = {
    baseline: baselineScore,
    controlHealth: controlHealthScore,
    auditIssueTrend: auditIssueTrendScore,
    businessExternal: businessExternalScore,
    operationalRisk: operationalRiskScore,
  };

  let maxPossible = 0;
  const keys = Object.keys(scores);
  keys.forEach((key) => {
    const compWeight = COMPONENT_WEIGHTS[key as keyof typeof COMPONENT_WEIGHTS];
    const dimRelevance = DIMENSION_RELEVANCE[key][dimension];
    maxPossible += 100 * compWeight * dimRelevance;
  });

  if (maxPossible === 0) {
    return { baseline: 0, controlHealth: 0, auditIssueTrend: 0, businessExternal: 0, operationalRisk: 0 };
  }

  const result: Record<string, number> = {};
  keys.forEach((key) => {
    const compWeight = COMPONENT_WEIGHTS[key as keyof typeof COMPONENT_WEIGHTS];
    const dimRelevance = DIMENSION_RELEVANCE[key][dimension];
    result[key] = Math.round((scores[key] * compWeight * dimRelevance) / maxPossible * 100 * 10) / 10;
  });

  return {
    baseline: result.baseline,
    controlHealth: result.controlHealth,
    auditIssueTrend: result.auditIssueTrend,
    businessExternal: result.businessExternal,
    operationalRisk: result.operationalRisk,
  };
}

export async function computeDriversForSector(sectorName: string): Promise<DriversResponse | null> {
  const data = await loadData();
  const { auditRows, regs, news, prcRows, issueRows, unitNames, opMetricsRows } = data;

  const dataRows = auditRows.slice(3).filter((r: any[]) => r[2]);
  const row = dataRows.find((r: any[]) => String(r[2]) === sectorName);
  if (!row) return null;

  const category = String(row[0] || "General");

  const controlResult = computeUnitControlHealthScore(prcRows, sectorName);
  const issueResult = computeUnitAuditIssueTrendScore(issueRows, sectorName, unitNames);
  const bizExtResult = computeUnitBusinessExternalScore(news, regs, sectorName);
  const opRiskResult = loadUnitOperationalRiskScore(opMetricsRows, sectorName);

  const baselineDimScores: Record<string, number> = {};
  for (const dim of RISK_DIMENSIONS) {
    const colIdx = RISK_DIM_INDICES[dim];
    baselineDimScores[dim] = scaleScore(Number(row[colIdx]) || 0);
  }
  const baselineAvg = Object.values(baselineDimScores).reduce((a, b) => a + b, 0) / RISK_DIMENSIONS.length;

  const dimensions: DimensionDriver[] = [];
  let totalAdj = 0;

  for (const dim of RISK_DIMENSIONS) {
    const baseScore = Math.round(baselineDimScores[dim]);

    const adjustedScore = computeFinalDimensionScore(
      dim, baselineDimScores[dim], controlResult.score, issueResult.score, bizExtResult.score, opRiskResult.score
    );

    const contribs = computeNormalizedContributions(
      dim, baselineDimScores[dim], controlResult.score, issueResult.score, bizExtResult.score, opRiskResult.score
    );
    const baselineContrib = contribs.baseline;
    const controlContrib = contribs.controlHealth;
    const issueContrib = contribs.auditIssueTrend;
    const bizExtContrib = contribs.businessExternal;
    const opRiskContrib = contribs.operationalRisk;

    totalAdj += adjustedScore;

    dimensions.push({
      dimension: dim,
      baseScore,
      adjustedScore,
      baselineContribution: baselineContrib,
      controlHealthContribution: controlContrib,
      auditIssueTrendContribution: issueContrib,
      businessExternalContribution: bizExtContrib,
      operationalRiskContribution: opRiskContrib,
      controlHealthDrivers: controlResult.drivers.filter(d => d.score < 100).slice(0, 5),
      auditIssueDrivers: issueResult.drivers.slice(0, 5),
      incidentDrivers: [],
      regulatoryDrivers: bizExtResult.regulatoryDrivers,
      newsDrivers: bizExtResult.newsDrivers,
      cyberDrivers: [],
      operationalMetricDrivers: opRiskResult.metricDrivers,
      baselineAction: ACTION_MAP["baseline"][dim] || "",
      controlHealthAction: controlResult.drivers.some(d => d.score < 100) ? (ACTION_MAP["controlHealth"][dim] || "") : "",
      auditIssueAction: issueResult.drivers.length > 0 ? (ACTION_MAP["auditIssueTrend"][dim] || "") : "",
      businessExternalAction: (bizExtResult.newsDrivers.length > 0 || bizExtResult.regulatoryDrivers.length > 0) ? (ACTION_MAP["businessExternal"][dim] || "") : "",
      operationalRiskAction: opRiskResult.metricDrivers.length > 0 ? (ACTION_MAP["operationalRisk"][dim] || "") : "",
    });
  }

  const avgScore = Math.round(totalAdj / RISK_DIMENSIONS.length);

  return {
    sectorName,
    sectorCategory: category,
    averageAdjustedScore: avgScore,
    severity: avgScore > 90 ? "critical" : avgScore >= 71 ? "high" : avgScore >= 31 ? "medium" : "low",
    componentScores: {
      baseline: Math.round(baselineAvg),
      controlHealth: Math.round(controlResult.score),
      auditIssueTrend: Math.round(issueResult.score),
      businessExternal: Math.round(bizExtResult.score),
      operationalRisk: Math.round(opRiskResult.score),
    },
    dimensions,
  };
}
