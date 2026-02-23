import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, FileText, Shield, Newspaper, ChevronRight } from "lucide-react";
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

interface DimensionDriver {
  dimension: string;
  baseScore: number;
  adjustedScore: number;
  incidentAdjustment: number;
  regulatoryAdjustment: number;
  newsAdjustment: number;
  incidentDrivers: IncidentDriver[];
  regulatoryDrivers: RegDriver[];
  newsDrivers: NewsDriver[];
  incidentAction: string;
  regulatoryAction: string;
  newsAction: string;
}

interface DriversResponse {
  sectorName: string;
  sectorCategory: string;
  averageAdjustedScore: number;
  severity: string;
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
  if (score >= 80) return "text-red-600";
  if (score >= 65) return "text-orange-500";
  if (score >= 45) return "text-yellow-600";
  return "text-green-600";
}

const WATERFALL_COLORS: Record<string, string> = {
  "Base Score": "#6366f1",
  "Incidents": "#f97316",
  "Regulatory": "#a855f7",
  "News": "#3b82f6",
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
        <span>Base: {data.base}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span>Adjusted: {data.adjusted}</span>
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
      <p>{data.name === "Base Score" || data.name === "Final Score" ? `Score: ${data.displayValue}` : `Adjustment: ${data.displayValue > 0 ? "+" : ""}${data.displayValue}`}</p>
      {data.name === "Final Score" && <p className="text-muted-foreground">Clamped to 0–100</p>}
    </div>
  );
}

function RiskRadarChart({ dimensions, selectedDimension, onSelectDimension }: {
  dimensions: DimensionDriver[];
  selectedDimension: string | null;
  onSelectDimension: (dim: string) => void;
}) {
  const radarData = dimensions.map(d => ({
    dimension: d.dimension.replace("Data/Tech", "Data/Tech"),
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
              name="Base Score"
              dataKey="base"
              stroke="#60a5fa"
              fill="#60a5fa"
              fillOpacity={0.15}
              strokeWidth={2}
              strokeDasharray="6 3"
            />
            <Radar
              name="Adjusted Score"
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
          <span className="text-muted-foreground">Base Score</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-0.5 bg-red-400" />
          <span className="text-muted-foreground">Adjusted Score</span>
        </div>
      </div>
    </Card>
  );
}

function WaterfallChart({ dim }: { dim: DimensionDriver }) {
  const waterfallData = useMemo(() => {
    const base = dim.baseScore;
    const inc = Math.round(dim.incidentAdjustment * 10) / 10;
    const reg = Math.round(dim.regulatoryAdjustment * 10) / 10;
    const news = Math.round(dim.newsAdjustment * 10) / 10;
    const final = dim.adjustedScore;

    let running = base;

    const data = [
      { name: "Base Score", invisible: 0, value: base, displayValue: base, isTotal: true },
    ];

    if (inc !== 0) {
      data.push({
        name: "Incidents",
        invisible: inc > 0 ? running : running + inc,
        value: Math.abs(inc),
        displayValue: inc,
        isTotal: false,
      });
      running += inc;
    }

    if (reg !== 0) {
      data.push({
        name: "Regulatory",
        invisible: reg > 0 ? running : running + reg,
        value: Math.abs(reg),
        displayValue: reg,
        isTotal: false,
      });
      running += reg;
    }

    if (news !== 0) {
      data.push({
        name: "News",
        invisible: news > 0 ? running : running + news,
        value: Math.abs(news),
        displayValue: news,
        isTotal: false,
      });
    }

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
      <p className="text-xs text-muted-foreground mb-3">How each factor builds the final score</p>
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={waterfallData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, maxVal]}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={35}
            />
            <RechartsTooltip content={<CustomWaterfallTooltip />} />
            <ReferenceLine y={dim.baseScore} stroke="#60a5fa" strokeDasharray="4 4" strokeWidth={1} />
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
                formatter={(val: number) => {
                  const entry = waterfallData.find(d => d.displayValue === val);
                  if (entry?.isTotal) return val;
                  return val > 0 ? `+${val}` : val;
                }}
                className="fill-foreground text-[10px]"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
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
  const hasDrivers = dim.incidentDrivers.length > 0 || dim.regulatoryDrivers.length > 0 || dim.newsDrivers.length > 0;

  if (!hasDrivers) {
    return (
      <p className="text-xs text-muted-foreground italic px-1">No external drivers affect this dimension for this unit.</p>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      {dim.incidentDrivers.length > 0 && (
        <AccordionItem value="incidents" className="border-b-0">
          <AccordionTrigger className="py-2 text-xs hover:no-underline" data-testid={`trigger-incidents-${dim.dimension.replace(/[\s/]/g, "-")}`}>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              <span>{dim.incidentDrivers.length} Incident{dim.incidentDrivers.length > 1 ? "s" : ""} Contributing</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-500 ml-1">
                +{dim.incidentAdjustment}
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
              {dim.incidentAction && (
                <div className="flex items-start gap-1.5 mt-2 p-2 rounded-md bg-blue-500/5 border border-blue-500/10">
                  <ChevronRight className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-400">{dim.incidentAction}</p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {dim.regulatoryDrivers.length > 0 && (
        <AccordionItem value="regulatory" className="border-b-0">
          <AccordionTrigger className="py-2 text-xs hover:no-underline" data-testid={`trigger-regulatory-${dim.dimension.replace(/[\s/]/g, "-")}`}>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-500" />
              <span>{dim.regulatoryDrivers.length} Regulation{dim.regulatoryDrivers.length > 1 ? "s" : ""} Contributing</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ml-1 ${dim.regulatoryAdjustment > 0 ? "text-red-500" : "text-green-500"}`}>
                {dim.regulatoryAdjustment > 0 ? "+" : ""}{dim.regulatoryAdjustment}
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
                      {reg.direction} ({reg.impact > 0 ? "+" : ""}{reg.impact})
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2">{reg.rule}</p>
                </div>
              ))}
              {dim.regulatoryAction && (
                <div className="flex items-start gap-1.5 mt-2 p-2 rounded-md bg-purple-500/5 border border-purple-500/10">
                  <ChevronRight className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-purple-700 dark:text-purple-400">{dim.regulatoryAction}</p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {dim.newsDrivers.length > 0 && (
        <AccordionItem value="news" className="border-b-0">
          <AccordionTrigger className="py-2 text-xs hover:no-underline" data-testid={`trigger-news-${dim.dimension.replace(/[\s/]/g, "-")}`}>
            <div className="flex items-center gap-1.5">
              <Newspaper className="w-3.5 h-3.5 text-blue-500" />
              <span>{dim.newsDrivers.length} News Article{dim.newsDrivers.length > 1 ? "s" : ""} Contributing</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ml-1 ${dim.newsAdjustment > 0 ? "text-red-500" : "text-green-500"}`}>
                {dim.newsAdjustment > 0 ? "+" : ""}{dim.newsAdjustment}
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
                  <p className="text-muted-foreground/70 mt-0.5">{article.riskType}</p>
                </div>
              ))}
              {dim.newsAction && (
                <div className="flex items-start gap-1.5 mt-2 p-2 rounded-md bg-sky-500/5 border border-sky-500/10">
                  <ChevronRight className="w-3.5 h-3.5 text-sky-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-sky-700 dark:text-sky-400">{dim.newsAction}</p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}

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
            Understand what drives each auditable unit's risk score, what it means, and what to do
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
                    <p className="text-xs text-muted-foreground">Average Adjusted Score</p>
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
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold">{selectedDim.dimension} — Contributing Factors</h3>
                  <div className="flex gap-1.5">
                    {selectedDim.incidentAdjustment !== 0 && (
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${selectedDim.incidentAdjustment > 0 ? "text-orange-500" : "text-green-500"}`}>
                        Incidents: {selectedDim.incidentAdjustment > 0 ? "+" : ""}{selectedDim.incidentAdjustment}
                      </Badge>
                    )}
                    {selectedDim.regulatoryAdjustment !== 0 && (
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${selectedDim.regulatoryAdjustment > 0 ? "text-red-500" : "text-green-500"}`}>
                        Regulatory: {selectedDim.regulatoryAdjustment > 0 ? "+" : ""}{selectedDim.regulatoryAdjustment}
                      </Badge>
                    )}
                    {selectedDim.newsAdjustment !== 0 && (
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${selectedDim.newsAdjustment > 0 ? "text-red-500" : "text-green-500"}`}>
                        News: {selectedDim.newsAdjustment > 0 ? "+" : ""}{selectedDim.newsAdjustment}
                      </Badge>
                    )}
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
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium">{dim.dimension}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Base: {dim.baseScore}</span>
                            <span className={`text-sm font-bold ${getScoreColor(dim.adjustedScore)}`}>{dim.adjustedScore}</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 mt-2">
                          {dim.incidentAdjustment !== 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${dim.incidentAdjustment > 0 ? "bg-orange-500/10 text-orange-600" : "bg-green-500/10 text-green-600"}`}>
                              Inc: {dim.incidentAdjustment > 0 ? "+" : ""}{dim.incidentAdjustment}
                            </span>
                          )}
                          {dim.regulatoryAdjustment !== 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${dim.regulatoryAdjustment > 0 ? "bg-purple-500/10 text-purple-600" : "bg-green-500/10 text-green-600"}`}>
                              Reg: {dim.regulatoryAdjustment > 0 ? "+" : ""}{dim.regulatoryAdjustment}
                            </span>
                          )}
                          {dim.newsAdjustment !== 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${dim.newsAdjustment > 0 ? "bg-blue-500/10 text-blue-600" : "bg-green-500/10 text-green-600"}`}>
                              News: {dim.newsAdjustment > 0 ? "+" : ""}{dim.newsAdjustment}
                            </span>
                          )}
                          {dim.incidentAdjustment === 0 && dim.regulatoryAdjustment === 0 && dim.newsAdjustment === 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">No adjustments</span>
                          )}
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
