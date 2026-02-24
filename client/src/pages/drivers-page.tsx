import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, FileText, Shield, Newspaper, ChevronRight, Bug, CheckCircle, ClipboardList } from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";
import type { RiskSector } from "@shared/schema";

interface ControlHealthDriver {
  controlId: string;
  control: string;
  controlType: string;
  designEffectiveness: string;
  operatingEffectiveness: string;
  score: number;
}

interface AuditIssueDriver {
  issueTitle: string;
  description: string;
  severity: string;
  status: string;
  source: string;
  auditEngagement: string;
  weightedScore: number;
}

interface IncidentDriver {
  id: string;
  title: string;
  severity: string;
  priority: string;
  impact: number;
  process: string;
}

interface RegDriver {
  regulator: string;
  rule: string;
  direction: string;
  impact: number;
}

interface NewsDriver {
  headline: string;
  sentiment: string;
  riskType: string;
  source: string;
}

interface CyberDriver {
  cveId: string;
  vendor: string;
  product: string;
  name: string;
  ransomware: boolean;
}

interface DimensionDriver {
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
  baselineAction: string;
  controlHealthAction: string;
  auditIssueAction: string;
  businessExternalAction: string;
  operationalRiskAction: string;
}

interface DriversResponse {
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

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical": return "bg-red-500/10 text-red-600 border-red-500/20";
    case "high": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    case "medium": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    default: return "bg-green-500/10 text-green-600 border-green-500/20";
  }
}

function getScoreColor(score: number) {
  if (score >= 90) return "text-red-600";
  if (score >= 75) return "text-orange-500";
  if (score >= 40) return "text-yellow-600";
  return "text-green-600";
}

const WATERFALL_COLORS: Record<string, string> = {
  "Baseline (30%)": "#6366f1",
  "Control Health (25%)": "#8b5cf6",
  "Audit Issues (20%)": "#f59e0b",
  "Business/External (15%)": "#3b82f6",
  "Operational Risk (10%)": "#ef4444",
  "Final Score": "#10b981",
};

function CustomRadarTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="bg-popover border rounded-md p-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-sm">{data.dimension}</p>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
        <span>Baseline: {data.base}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span>Composite: {data.adjusted}</span>
      </div>
      <div className="text-muted-foreground">
        Change: {data.adjusted - data.base > 0 ? "+" : ""}{data.adjusted - data.base}
      </div>
    </div>
  );
}

function CustomWaterfallTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="bg-popover border rounded-md p-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-sm">{data.name}</p>
      <p>{data.name === "Final Score" ? `Score: ${data.displayValue}` : `Contribution: ${data.displayValue.toFixed(1)}`}</p>
    </div>
  );
}

function RiskRadarChart({ dimensions, selectedDimension, onSelectDimension }: {
  dimensions: DimensionDriver[];
  selectedDimension: string | null;
  onSelectDimension: (dim: string) => void;
}) {
  const radarData = dimensions.map(d => ({
    dimension: d.dimension,
    fullDimension: d.dimension,
    base: d.baseScore,
    adjusted: d.adjustedScore,
  }));

  return (
    <Card className="p-4" data-testid="chart-radar">
      <h3 className="text-sm font-semibold mb-1">Risk Dimension Profile</h3>
      <p className="text-xs text-muted-foreground mb-3">Click a dimension to see its score breakdown</p>
      <div className="w-full h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={({ x, y, payload, index }: any) => {
                const dim = radarData[index];
                const isSelected = dim?.fullDimension === selectedDimension;
                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor={x > 200 ? "start" : x < 200 ? "end" : "middle"}
                    dominantBaseline="central"
                    className={`text-[11px] cursor-pointer ${isSelected ? "fill-primary font-bold" : "fill-muted-foreground"}`}
                    onClick={() => dim && onSelectDimension(dim.fullDimension)}
                    data-testid={`radar-label-${payload.value.replace(/[\s/]/g, "-")}`}
                  >
                    {payload.value}
                  </text>
                );
              }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar
              name="Baseline Score"
              dataKey="base"
              stroke="#60a5fa"
              fill="#60a5fa"
              fillOpacity={0.15}
              strokeWidth={2}
              strokeDasharray="6 3"
            />
            <Radar
              name="Composite Score"
              dataKey="adjusted"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <RechartsTooltip content={<CustomRadarTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-0.5 bg-blue-400 border-dashed border-t-2 border-blue-400" />
          <span className="text-muted-foreground">Baseline Score</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-0.5 bg-red-400" />
          <span className="text-muted-foreground">Composite Score</span>
        </div>
      </div>
    </Card>
  );
}

function WaterfallChart({ dim }: { dim: DimensionDriver }) {
  const waterfallData = useMemo(() => {
    const bl = dim.baselineContribution;
    const ch = dim.controlHealthContribution;
    const ai = dim.auditIssueTrendContribution;
    const be = dim.businessExternalContribution;
    const or = dim.operationalRiskContribution;
    const final = dim.adjustedScore;

    let running = 0;
    const data = [];

    data.push({ name: "Baseline (30%)", invisible: 0, value: bl, displayValue: bl, isTotal: false });
    running += bl;

    data.push({ name: "Control Health (25%)", invisible: running, value: ch, displayValue: ch, isTotal: false });
    running += ch;

    data.push({ name: "Audit Issues (20%)", invisible: running, value: ai, displayValue: ai, isTotal: false });
    running += ai;

    data.push({ name: "Business/External (15%)", invisible: running, value: be, displayValue: be, isTotal: false });
    running += be;

    data.push({ name: "Operational Risk (10%)", invisible: running, value: or, displayValue: or, isTotal: false });

    data.push({ name: "Final Score", invisible: 0, value: final, displayValue: final, isTotal: true });

    return data;
  }, [dim]);

  const maxVal = Math.min(100, Math.max(...waterfallData.map(d => d.invisible + d.value)) + 10);

  return (
    <Card className="p-4" data-testid="chart-waterfall">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold">{dim.dimension} — Score Waterfall</h3>
        <Badge variant="outline" className={`${getScoreColor(dim.adjustedScore)} text-xs`}>
          {dim.adjustedScore}/100
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-3">How each component builds the final score</p>
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={waterfallData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={50}
            />
            <YAxis
              domain={[0, maxVal]}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={35}
            />
            <RechartsTooltip content={<CustomWaterfallTooltip />} />
            <Bar dataKey="invisible" stackId="waterfall" fill="transparent" />
            <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]}>
              {waterfallData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={WATERFALL_COLORS[entry.name] || "#94a3b8"}
                />
              ))}
              <LabelList
                dataKey="displayValue"
                position="top"
                formatter={(val: number) => typeof val === 'number' ? val.toFixed(1) : val}
                className="fill-foreground text-[10px]"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
        {Object.entries(WATERFALL_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span>{key}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DriverDetails({ dim }: { dim: DimensionDriver }) {
  const hasDrivers = (dim.controlHealthDrivers?.length > 0) || (dim.auditIssueDrivers?.length > 0) || (dim.incidentDrivers?.length > 0) || (dim.regulatoryDrivers?.length > 0) || (dim.newsDrivers?.length > 0) || (dim.cyberDrivers?.length > 0);

  if (!hasDrivers) {
    return (
      <p className="text-xs text-muted-foreground italic px-1">No external drivers affect this dimension for this unit.</p>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      {dim.controlHealthDrivers && dim.controlHealthDrivers.length > 0 && (
        <AccordionItem value="controlHealth" className="border-b-0">
          <AccordionTrigger className="py-2 text-xs hover:no-underline" data-testid={`trigger-control-${dim.dimension.replace(/[\s/]/g, "-")}`}>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-purple-500" />
              <span>{dim.controlHealthDrivers.length} Control{dim.controlHealthDrivers.length > 1 ? "s" : ""} with Gaps</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-purple-500 ml-1">
                {dim.controlHealthContribution.toFixed(1)} pts
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pl-5">
              {dim.controlHealthDrivers.map((ctrl) => (
                <div key={ctrl.controlId} className="text-xs border rounded-md p-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-medium font-mono">{ctrl.controlId}</span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className={`text-[10px] px-1 py-0 ${ctrl.designEffectiveness === "Effective" ? "text-green-500" : "text-red-500"}`}>
                        Design: {ctrl.designEffectiveness}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] px-1 py-0 ${ctrl.operatingEffectiveness === "Effective" ? "text-green-500" : "text-red-500"}`}>
                        Operating: {ctrl.operatingEffectiveness}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2">{ctrl.control}</p>
                  <p className="text-muted-foreground/70 mt-0.5">{ctrl.controlType} | Score: {ctrl.score}/100</p>
                </div>
              ))}
              {dim.controlHealthAction && (
                <div className="flex items-start gap-1.5 mt-2 p-2 rounded-md bg-purple-500/5 border border-purple-500/10">
                  <ChevronRight className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-purple-700 dark:text-purple-400">{dim.controlHealthAction}</p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {dim.auditIssueDrivers && dim.auditIssueDrivers.length > 0 && (
        <AccordionItem value="auditIssues" className="border-b-0">
          <AccordionTrigger className="py-2 text-xs hover:no-underline" data-testid={`trigger-issues-${dim.dimension.replace(/[\s/]/g, "-")}`}>
            <div className="flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-amber-500" />
              <span>{dim.auditIssueDrivers.length} Audit Issue{dim.auditIssueDrivers.length > 1 ? "s" : ""}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-500 ml-1">
                {dim.auditIssueTrendContribution.toFixed(1)} pts
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pl-5">
              {dim.auditIssueDrivers.map((issue, i) => (
                <div key={i} className="text-xs border rounded-md p-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate max-w-[250px]">{issue.issueTitle}</span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className={`text-[10px] px-1 py-0 ${issue.severity === "Severe" || issue.severity === "High" ? "text-red-500" : "text-yellow-500"}`}>
                        {issue.severity}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] px-1 py-0 ${issue.status === "Open" ? "text-red-500" : issue.status === "In Progress" ? "text-amber-500" : "text-green-500"}`}>
                        {issue.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2">{issue.description}</p>
                  <p className="text-muted-foreground/70 mt-0.5">{issue.source} | {issue.auditEngagement}</p>
                </div>
              ))}
              {dim.auditIssueAction && (
                <div className="flex items-start gap-1.5 mt-2 p-2 rounded-md bg-amber-500/5 border border-amber-500/10">
                  <ChevronRight className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">{dim.auditIssueAction}</p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {dim.incidentDrivers && dim.incidentDrivers.length > 0 && (
        <AccordionItem value="incidents" className="border-b-0">
          <AccordionTrigger className="py-2 text-xs hover:no-underline" data-testid={`trigger-incidents-${dim.dimension.replace(/[\s/]/g, "-")}`}>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              <span>{dim.incidentDrivers.length} Incident{dim.incidentDrivers.length > 1 ? "s" : ""}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-500 ml-1">
                part of Operational Risk
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pl-5">
              {dim.incidentDrivers.map((inc) => (
                <div key={inc.id} className="text-xs border rounded-md p-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{inc.id}</span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{inc.severity}</Badge>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{inc.priority}</Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{inc.process} (impact: {inc.impact}/16)</p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {dim.regulatoryDrivers && dim.regulatoryDrivers.length > 0 && (
        <AccordionItem value="regulatory" className="border-b-0">
          <AccordionTrigger className="py-2 text-xs hover:no-underline" data-testid={`trigger-regulatory-${dim.dimension.replace(/[\s/]/g, "-")}`}>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-500" />
              <span>{dim.regulatoryDrivers.length} Regulation{dim.regulatoryDrivers.length > 1 ? "s" : ""}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-500 ml-1">
                part of Business/External
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pl-5">
              {dim.regulatoryDrivers.map((reg, i) => (
                <div key={i} className="text-xs border rounded-md p-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{reg.regulator}</span>
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 ${reg.direction === "Raised" ? "text-red-500" : "text-green-500"}`}>
                      {reg.direction}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2">{reg.rule}</p>
                </div>
              ))}
              {dim.businessExternalAction && (
                <div className="flex items-start gap-1.5 mt-2 p-2 rounded-md bg-blue-500/5 border border-blue-500/10">
                  <ChevronRight className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-400">{dim.businessExternalAction}</p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {dim.newsDrivers && dim.newsDrivers.length > 0 && (
        <AccordionItem value="news" className="border-b-0">
          <AccordionTrigger className="py-2 text-xs hover:no-underline" data-testid={`trigger-news-${dim.dimension.replace(/[\s/]/g, "-")}`}>
            <div className="flex items-center gap-1.5">
              <Newspaper className="w-3.5 h-3.5 text-sky-500" />
              <span>{dim.newsDrivers.length} News Article{dim.newsDrivers.length > 1 ? "s" : ""}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-sky-500 ml-1">
                part of Business/External
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pl-5">
              {dim.newsDrivers.map((article, i) => (
                <div key={i} className="text-xs border rounded-md p-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate max-w-[200px]">{article.source}</span>
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 ${article.sentiment === "Negative" ? "text-red-500" : article.sentiment === "Positive" ? "text-green-500" : "text-gray-500"}`}>
                      {article.sentiment}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2">{article.headline}</p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {dim.cyberDrivers && dim.cyberDrivers.length > 0 && (
        <AccordionItem value="cyber" className="border-b-0">
          <AccordionTrigger className="py-2 text-xs hover:no-underline" data-testid={`trigger-cyber-${dim.dimension.replace(/[\s/]/g, "-")}`}>
            <div className="flex items-center gap-1.5">
              <Bug className="w-3.5 h-3.5 text-red-500" />
              <span>{dim.cyberDrivers.length} CVE Vulnerabilit{dim.cyberDrivers.length > 1 ? "ies" : "y"}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-500 ml-1">
                part of Operational Risk
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pl-5">
              {dim.cyberDrivers.map((cve, i) => (
                <div key={i} className="text-xs border rounded-md p-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-medium font-mono">{cve.cveId}</span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{cve.vendor}</Badge>
                      {cve.ransomware && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 text-red-500 border-red-500/30">Ransomware</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2">{cve.name}</p>
                  <p className="text-muted-foreground/70 mt-0.5">{cve.product}</p>
                </div>
              ))}
              {dim.operationalRiskAction && (
                <div className="flex items-start gap-1.5 mt-2 p-2 rounded-md bg-red-500/5 border border-red-500/10">
                  <ChevronRight className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-400">{dim.operationalRiskAction}</p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}

const COMPONENT_META = [
  { key: "baseline", label: "Baseline Risk", weight: "30%", color: "bg-indigo-500", textColor: "text-indigo-600" },
  { key: "controlHealth", label: "Control Health", weight: "25%", color: "bg-purple-500", textColor: "text-purple-600" },
  { key: "auditIssueTrend", label: "Audit Issues", weight: "20%", color: "bg-amber-500", textColor: "text-amber-600" },
  { key: "businessExternal", label: "Business/External", weight: "15%", color: "bg-blue-500", textColor: "text-blue-600" },
  { key: "operationalRisk", label: "Operational Risk", weight: "10%", color: "bg-red-500", textColor: "text-red-600" },
];

export default function DriversPage() {
  const [selectedSectorId, setSelectedSectorId] = useState<string>("");
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);

  const { data: sectors = [], isLoading: sectorsLoading } = useQuery<RiskSector[]>({
    queryKey: ["/api/sectors"],
  });

  const { data: drivers, isLoading: driversLoading } = useQuery<DriversResponse>({
    queryKey: ["/api/sectors", selectedSectorId, "drivers"],
    enabled: !!selectedSectorId,
  });

  const selectedDim = useMemo(() => {
    if (!drivers || !selectedDimension) return null;
    return drivers.dimensions.find(d => d.dimension === selectedDimension) || null;
  }, [drivers, selectedDimension]);

  const handleSectorChange = (id: string) => {
    setSelectedSectorId(id);
    setSelectedDimension(null);
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Score Explainability</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            5-Component Predictive Scoring Model — understand what drives each unit's risk score
          </p>
        </div>

        <Card className="p-4">
          <label className="text-sm font-medium mb-2 block">Select Auditable Unit</label>
          <Select value={selectedSectorId} onValueChange={handleSectorChange}>
            <SelectTrigger className="w-full max-w-md" data-testid="select-auditable-unit">
              <SelectValue placeholder="Choose an auditable unit to analyze..." />
            </SelectTrigger>
            <SelectContent>
              {sectors.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name} ({s.category})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {!selectedSectorId && !sectorsLoading && (
          <Card className="p-8 flex flex-col items-center justify-center text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-sm font-medium text-muted-foreground">Select an auditable unit above</h3>
            <p className="text-xs text-muted-foreground/70 mt-1">Choose a unit to see what's driving its risk scores and recommended actions</p>
          </Card>
        )}

        {driversLoading && selectedSectorId && (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-5 w-64 bg-muted rounded" />
                <div className="h-4 w-48 bg-muted/60 rounded" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="animate-pulse h-[340px] bg-muted/30 rounded" />
            </Card>
          </div>
        )}

        {drivers && !driversLoading && (
          <>
            <Card className="p-4" data-testid="card-summary">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold" data-testid="text-sector-name">{drivers.sectorName}</h2>
                  <p className="text-sm text-muted-foreground">{drivers.sectorCategory}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Average Composite Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(drivers.averageAdjustedScore)}`} data-testid="text-avg-score">
                      {drivers.averageAdjustedScore}
                    </p>
                  </div>
                  <Badge className={`${getSeverityColor(drivers.severity)} text-xs px-2 py-0.5`} data-testid="badge-severity">
                    {drivers.severity.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3" data-testid="component-scores">
              {COMPONENT_META.map(comp => {
                const score = drivers.componentScores[comp.key as keyof typeof drivers.componentScores];
                return (
                  <Card key={comp.key} className="p-3 text-center">
                    <div className={`w-2 h-2 rounded-full ${comp.color} mx-auto mb-1`} />
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{comp.label}</p>
                    <p className={`text-xl font-bold ${getScoreColor(score)}`}>{score}</p>
                    <p className="text-[10px] text-muted-foreground">Weight: {comp.weight}</p>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RiskRadarChart
                dimensions={drivers.dimensions}
                selectedDimension={selectedDimension}
                onSelectDimension={(dim) => setSelectedDimension(selectedDimension === dim ? null : dim)}
              />

              {selectedDim ? (
                <WaterfallChart dim={selectedDim} />
              ) : (
                <Card className="p-4 flex flex-col items-center justify-center text-center min-h-[340px]" data-testid="waterfall-placeholder">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <TrendingUp className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-sm font-medium text-muted-foreground">Select a Dimension</h3>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-[240px]">
                    Click on a dimension label in the radar chart to see its score waterfall breakdown
                  </p>
                </Card>
              )}
            </div>

            {selectedDim && (
              <Card className="p-4" data-testid="card-driver-details">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <h3 className="text-sm font-semibold">{selectedDim.dimension} — Contributing Factors</h3>
                  <div className="flex gap-1.5 flex-wrap">
                    {COMPONENT_META.map(comp => {
                      const val = selectedDim[`${comp.key === "baseline" ? "baseline" : comp.key}Contribution` as keyof typeof selectedDim] as number;
                      if (!val || val === 0) return null;
                      return (
                        <Badge key={comp.key} variant="outline" className={`text-[10px] px-1.5 py-0 ${comp.textColor}`}>
                          {comp.label}: {val.toFixed(1)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                <DriverDetails dim={selectedDim} />
              </Card>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                All Dimensions Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {drivers.dimensions
                  .sort((a, b) => b.adjustedScore - a.adjustedScore)
                  .map(dim => (
                    <Card
                      key={dim.dimension}
                      className={`p-3 cursor-pointer transition-colors hover:border-primary/40 ${selectedDimension === dim.dimension ? "border-primary ring-1 ring-primary/30" : ""}`}
                      onClick={() => setSelectedDimension(selectedDimension === dim.dimension ? null : dim.dimension)}
                      data-testid={`card-dim-${dim.dimension.replace(/[\s/]/g, "-")}`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">{dim.dimension}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Base: {dim.baseScore}</span>
                          <span className={`text-sm font-bold ${getScoreColor(dim.adjustedScore)}`}>{dim.adjustedScore}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {COMPONENT_META.map(comp => {
                          const val = dim[`${comp.key === "baseline" ? "baseline" : comp.key}Contribution` as keyof typeof dim] as number;
                          if (!val || val === 0) return null;
                          return (
                            <span key={comp.key} className={`text-[10px] px-1.5 py-0.5 rounded ${comp.color}/10 ${comp.textColor}`}>
                              {comp.label.split(" ")[0]}: {val.toFixed(1)}
                            </span>
                          );
                        })}
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
