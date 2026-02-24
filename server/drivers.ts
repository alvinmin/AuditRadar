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

const RISK_DIMENSIONS = [
  "Financial", "Regulatory", "Operational", "Change",
  "Fraud", "Data/Tech", "Reputation"
];

const RISK_DIM_INDICES: Record<string, number> = {
  "Financial": 8, "Regulatory": 9, "Operational": 10, "Change": 11,
  "Fraud": 13, "Data/Tech": 14, "Reputation": 15,
};

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

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function scaleScore(raw: number): number {
  return clamp((raw / 5) * 100, 0, 100);
}

const ACTION_MAP: Record<string, Record<string, string>> = {
  "incident": {
    "Financial": "Review financial reporting controls and assess root causes of incidents impacting financial processes.",
    "Regulatory": "Evaluate regulatory compliance controls affected by recent incidents and update remediation plans.",
    "Operational": "Strengthen operational procedures and incident response playbooks to reduce recurrence.",
    "Change": "Assess change management processes for gaps exposed by recent incidents.",
    "Fraud": "Investigate fraud indicators surfaced by incidents and strengthen detection mechanisms.",
    "Data/Tech": "Review IT infrastructure resilience and patch management following technology incidents.",
    "Reputation": "Prepare stakeholder communication plans addressing reputational impact from incidents.",
  },
  "regulatory": {
    "Financial": "Perform gap assessment against new financial reporting requirements and update policies.",
    "Regulatory": "Map new regulatory requirements to existing controls and identify compliance gaps.",
    "Operational": "Update operational procedures to align with new regulatory mandates.",
    "Change": "Incorporate regulatory changes into change management and project planning frameworks.",
    "Fraud": "Enhance anti-fraud programs to comply with updated regulatory fraud prevention standards.",
    "Data/Tech": "Begin DORA/cyber regulation compliance gap assessment and strengthen IT controls.",
    "Reputation": "Ensure public disclosures and governance communications meet new transparency standards.",
  },
  "news": {
    "Financial": "Monitor market conditions highlighted by news signals and stress-test financial risk models.",
    "Regulatory": "Track emerging regulatory trends from industry news and prepare proactive responses.",
    "Operational": "Evaluate operational resilience against risks flagged by market intelligence.",
    "Change": "Assess whether change initiatives address emerging risks identified in industry news.",
    "Fraud": "Heighten fraud monitoring based on negative sentiment indicators in industry news.",
    "Data/Tech": "Evaluate technology risk posture against cyber threats highlighted in news coverage.",
    "Reputation": "Monitor media sentiment and prepare crisis communication plans if trends worsen.",
  },
  "cyber": {
    "Financial": "Assess financial exposure from vendor vulnerabilities and ensure cyber insurance coverage is adequate.",
    "Regulatory": "Verify vendor compliance with cybersecurity regulatory requirements (DORA, SEC cyber rules).",
    "Operational": "Review vendor SLAs and business continuity plans for critical technology dependencies.",
    "Change": "Prioritize patching and vendor upgrades for systems with known exploited vulnerabilities.",
    "Fraud": "Evaluate whether vendor vulnerabilities could enable unauthorized access or fraud schemes.",
    "Data/Tech": "Conduct vulnerability assessments on affected vendor products and accelerate patching cycles.",
    "Reputation": "Prepare disclosure plans for vendor-related cyber incidents that could affect stakeholders.",
  },
};

export interface DimensionDriver {
  dimension: string;
  baseScore: number;
  adjustedScore: number;
  incidentAdjustment: number;
  regulatoryAdjustment: number;
  newsAdjustment: number;
  cyberAdjustment: number;
  incidentDrivers: Array<{
    id: string;
    title: string;
    severity: string;
    priority: string;
    impact: number;
    process: string;
  }>;
  regulatoryDrivers: Array<{
    regulator: string;
    rule: string;
    direction: string;
    impact: number;
  }>;
  newsDrivers: Array<{
    headline: string;
    sentiment: string;
    riskType: string;
    source: string;
  }>;
  cyberDrivers: Array<{
    cveId: string;
    vendor: string;
    product: string;
    name: string;
    ransomware: boolean;
  }>;
  incidentAction: string;
  regulatoryAction: string;
  newsAction: string;
  cyberAction: string;
}

export interface DriversResponse {
  sectorName: string;
  sectorCategory: string;
  averageAdjustedScore: number;
  severity: string;
  dimensions: DimensionDriver[];
}

let cachedData: {
  auditRows: any[][];
  incidents: IncidentRow[];
  regs: RegRow[];
  news: NewsRow[];
  vendors: VendorRow[];
  cves: CveRow[];
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

  cachedData = { auditRows, incidents, regs, news, vendors, cves };
  return cachedData;
}

export async function computeDriversForSector(sectorName: string): Promise<DriversResponse | null> {
  const { auditRows, incidents, regs, news, vendors, cves } = await loadData();

  const dataRows = auditRows.slice(3).filter((r: any[]) => r[2]);
  const row = dataRows.find((r: any[]) => String(r[2]) === sectorName);
  if (!row) return null;

  const category = String(row[0] || "General");
  const dimensions: DimensionDriver[] = [];
  let totalAdj = 0;

  for (const dim of RISK_DIMENSIONS) {
    const colIdx = RISK_DIM_INDICES[dim];
    const rawScore = Number(row[colIdx]) || 0;
    const baseScaled = scaleScore(rawScore);

    const matchingIncidents = incidents.filter(inc => {
      const cats = BIZ_AREA_TO_CATEGORIES[inc["Impacted Business Areas"]] || [];
      const dims = BIZ_PROCESS_TO_DIMENSIONS[inc["Impacted Business Process"]] || [];
      return cats.includes(category) && dims.includes(dim);
    });

    let incidentAdj = 0;
    if (matchingIncidents.length > 0) {
      const totalImpact = matchingIncidents.reduce((sum, inc) => {
        const sev = SEVERITY_WEIGHT[inc["Risk Severity"]] || 1;
        const pri = PRIORITY_WEIGHT[inc.Priority] || 1;
        return sum + sev * pri;
      }, 0);
      incidentAdj = clamp((totalImpact / matchingIncidents.length / 16) * 10, 0, 10);
    }

    const matchingRegs: Array<{ reg: RegRow; direction: number; dims: Set<string> }> = [];
    for (const reg of regs) {
      const areasText = (reg["Impacted business areas"] || "").toLowerCase();
      const processText = (reg["Impacted processes"] || "").toLowerCase();
      const riskText = (reg["Risk raised (?) / lowered (?)"] || "");
      const combinedText = areasText + " " + processText;

      const raisedCount = (riskText.match(/↑/g) || []).length + (riskText.match(/\?.*risk/gi) || []).length;
      const loweredCount = (riskText.match(/↓/g) || []).length;
      const netDirection = raisedCount >= loweredCount ? 1 : -0.5;

      const matchedCats = new Set<string>();
      const matchedDims = new Set<string>();

      for (const [keyword, cats] of Object.entries(REG_KEYWORD_TO_CATEGORIES)) {
        if (combinedText.includes(keyword.toLowerCase())) {
          cats.forEach(c => matchedCats.add(c));
        }
      }
      for (const [keyword, dims] of Object.entries(REG_KEYWORD_TO_DIMENSIONS)) {
        if (combinedText.includes(keyword.toLowerCase())) {
          dims.forEach(d => matchedDims.add(d));
        }
      }
      matchedDims.add("Regulatory");
      if (matchedCats.size === 0) {
        matchedCats.add("Governance");
        matchedCats.add("Compliance");
      }

      if (matchedCats.has(category) && matchedDims.has(dim)) {
        matchingRegs.push({ reg, direction: netDirection, dims: matchedDims });
      }
    }

    let regAdj = 0;
    if (matchingRegs.length > 0) {
      regAdj = clamp(matchingRegs.reduce((sum, r) => sum + 3 * r.direction, 0), -8, 8);
    }

    const matchingNews = news.filter(article => {
      const cats = NEWS_CATEGORY_TO_CATEGORIES[article.Category] || [];
      const dims = NEWS_RISKTYPE_TO_DIMENSIONS[article.Risk_Type] || [];
      return cats.includes(category) && dims.includes(dim);
    });

    let newsAdj = 0;
    if (matchingNews.length > 0) {
      const totalSentiment = matchingNews.reduce((sum, a) => {
        return sum + (a.Sentiment === "Negative" ? 2 : a.Sentiment === "Neutral" ? 0 : -1);
      }, 0);
      newsAdj = clamp((totalSentiment / matchingNews.length) * 3, -8, 8);
    }

    const vendorRow = vendors.find(v => v["Auditable Unit"].trim() === sectorName);
    const unitVendors = vendorRow ? vendorRow.Vendors.split(",").map(v => v.trim()) : [];
    const matchingCves: CveRow[] = [];
    const CYBER_DIMS = ["Data/Tech", "Operational", "Fraud", "Reputation"];

    if (CYBER_DIMS.includes(dim) && unitVendors.length > 0) {
      for (const vendor of unitVendors) {
        const vendorLower = vendor.toLowerCase();
        for (const cve of cves) {
          const cveVendor = cve.vendorProject.toLowerCase().trim();
          if (cveVendor.includes(vendorLower) || vendorLower.includes(cveVendor)) {
            matchingCves.push(cve);
            continue;
          }
          const vendorWords = vendorLower.split(/\s+/);
          const cveWords = cveVendor.split(/\s+/);
          if (vendorWords.length > 0 && cveWords.some(w => vendorWords.includes(w) && w.length > 3)) {
            matchingCves.push(cve);
          }
        }
      }
    }

    let cyberAdj = 0;
    if (matchingCves.length > 0 && unitVendors.length > 0) {
      const ransomwareCount = matchingCves.filter(c => c.knownRansomwareCampaignUse === "Known").length;
      const totalWeighted = matchingCves.length + ransomwareCount * 2;
      const avgPerVendor = totalWeighted / unitVendors.length;
      const normalized = clamp(avgPerVendor / 40, 0, 1);
      const dimWeights: Record<string, number> = { "Data/Tech": 12, "Operational": 8, "Fraud": 5, "Reputation": 4 };
      cyberAdj = clamp(Math.round(normalized * (dimWeights[dim] || 0) * 10) / 10, 0, 12);
    }

    const adjustedScore = clamp(Math.round(baseScaled + incidentAdj + regAdj + newsAdj + cyberAdj), 0, 100);
    totalAdj += adjustedScore;

    const uniqueCves = new Map<string, CveRow>();
    for (const cve of matchingCves) {
      if (!uniqueCves.has(cve.cveID)) uniqueCves.set(cve.cveID, cve);
    }

    dimensions.push({
      dimension: dim,
      baseScore: Math.round(baseScaled),
      adjustedScore,
      incidentAdjustment: Math.round(incidentAdj * 10) / 10,
      regulatoryAdjustment: Math.round(regAdj * 10) / 10,
      newsAdjustment: Math.round(newsAdj * 10) / 10,
      cyberAdjustment: Math.round(cyberAdj * 10) / 10,
      incidentDrivers: matchingIncidents.slice(0, 5).map(inc => ({
        id: inc["Incident ID"],
        title: inc["Incident Title"],
        severity: inc["Risk Severity"],
        priority: inc.Priority,
        impact: (SEVERITY_WEIGHT[inc["Risk Severity"]] || 1) * (PRIORITY_WEIGHT[inc.Priority] || 1),
        process: inc["Impacted Business Process"],
      })),
      regulatoryDrivers: matchingRegs.map(r => ({
        regulator: r.reg.Regulator,
        rule: (r.reg["Rule / Release"] || "").substring(0, 120),
        direction: r.direction > 0 ? "Raised" : "Lowered",
        impact: Math.round(3 * r.direction * 10) / 10,
      })),
      newsDrivers: matchingNews.slice(0, 5).map(a => ({
        headline: a.Headline,
        sentiment: a.Sentiment,
        riskType: a.Risk_Type,
        source: a.Source,
      })),
      cyberDrivers: Array.from(uniqueCves.values()).slice(0, 5).map(c => ({
        cveId: c.cveID,
        vendor: c.vendorProject,
        product: c.product,
        name: c.vulnerabilityName.substring(0, 100),
        ransomware: c.knownRansomwareCampaignUse === "Known",
      })),
      incidentAction: matchingIncidents.length > 0 ? (ACTION_MAP["incident"][dim] || "") : "",
      regulatoryAction: matchingRegs.length > 0 ? (ACTION_MAP["regulatory"][dim] || "") : "",
      newsAction: matchingNews.length > 0 ? (ACTION_MAP["news"][dim] || "") : "",
      cyberAction: matchingCves.length > 0 ? (ACTION_MAP["cyber"][dim] || "") : "",
    });
  }

  const avgScore = Math.round(totalAdj / RISK_DIMENSIONS.length);

  return {
    sectorName,
    sectorCategory: category,
    averageAdjustedScore: avgScore,
    severity: avgScore >= 80 ? "critical" : avgScore >= 65 ? "high" : avgScore >= 45 ? "medium" : "low",
    dimensions,
  };
}
