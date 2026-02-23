import path from "path";

export interface NewsRow {
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

interface Sheet2Row {
  "Article / Feed Title": string;
  "Source": string;
  "Brief Summary (1–2 lines)": string;
  "Category": string;
}

const NEGATIVE_KEYWORDS = [
  "fall", "drop", "decline", "loss", "risk", "tension", "anxiety",
  "rattle", "volatility", "pull money", "fraud", "curb", "concern",
  "mixed", "listless", "spoil",
];

const POSITIVE_KEYWORDS = [
  "rise", "inflow", "confidence", "ease", "record", "gain", "grow",
  "independence", "opportunity",
];

function deriveSentiment(title: string, summary: string): string {
  const text = (title + " " + summary).toLowerCase();
  let negCount = 0;
  let posCount = 0;
  for (const kw of NEGATIVE_KEYWORDS) {
    if (text.includes(kw)) negCount++;
  }
  for (const kw of POSITIVE_KEYWORDS) {
    if (text.includes(kw)) posCount++;
  }
  if (negCount > posCount) return "Negative";
  if (posCount > negCount) return "Positive";
  return "Neutral";
}

const CATEGORY_TO_RISKTYPE: Record<string, string> = {
  "Financial risk": "Market Risk",
  "Finance": "Market Risk",
  "Operations": "Operational Risk",
  "Governance": "Audit Risk",
  "Legal": "Audit Risk",
  "Compliance": "Fraud Risk",
};

const CATEGORY_TO_SECTOR: Record<string, string> = {
  "Financial risk": "Financial Services",
  "Finance": "Financial Services",
  "Operations": "Commodities",
  "Governance": "Private Credit",
  "Legal": "Stock Market",
  "Compliance": "Financial Services",
};

function deriveRiskType(category: string): string {
  return CATEGORY_TO_RISKTYPE[category] || "Operational Risk";
}

function deriveSector(category: string): string {
  return CATEGORY_TO_SECTOR[category] || "General";
}

export const NEWS_FILE_PATH = "attached_assets/Predictive_Audit_Market_News_With_Articles_Updated_Categories_1771874482512.xlsx";
export const NEWS_SHEET_NAME = "Sheet2";

export async function loadNewsFromSheet2(): Promise<NewsRow[]> {
  const xlsxModule = await import("xlsx");
  const XLSX = xlsxModule.default || xlsxModule;

  const newsPath = path.resolve(NEWS_FILE_PATH);
  const newsWb = XLSX.readFile(newsPath);
  const rawRows: Sheet2Row[] = XLSX.utils.sheet_to_json(newsWb.Sheets[NEWS_SHEET_NAME]);

  return rawRows.map((r) => {
    const title = r["Article / Feed Title"] || "";
    const summary = r["Brief Summary (1–2 lines)"] || "";
    const source = (r["Source"] || "").trim();
    const category = r["Category"] || "";

    return {
      Date: new Date().toISOString().split("T")[0],
      Source: source,
      Headline: title,
      Full_Article_Text: summary,
      Article_Summary: summary,
      Category: category,
      Sentiment: deriveSentiment(title, summary),
      Sector: deriveSector(category),
      Risk_Type: deriveRiskType(category),
    };
  });
}
