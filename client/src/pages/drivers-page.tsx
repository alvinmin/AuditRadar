import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, FileText, Shield, Newspaper, ArrowRight, ChevronRight } from "lucide-react";
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

function AdjustmentBadge({ value, label }: { value: number; label: string }) {
  if (value === 0) return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs">
      <Minus className="w-3 h-3" />
      <span>{label}: 0</span>
    </div>
  );
  const isPositive = value > 0;
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${isPositive ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span>{label}: {isPositive ? "+" : ""}{value}</span>
    </div>
  );
}

function DimensionCard({ dim }: { dim: DimensionDriver }) {
  const totalAdj = Math.round((dim.incidentAdjustment + dim.regulatoryAdjustment + dim.newsAdjustment) * 10) / 10;
  const hasDrivers = dim.incidentDrivers.length > 0 || dim.regulatoryDrivers.length > 0 || dim.newsDrivers.length > 0;

  return (
    <Card className="p-4" data-testid={`card-dimension-${dim.dimension.replace(/[\s/]/g, "-")}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm">{dim.dimension}</h4>
          <Badge variant="outline" className={getScoreColor(dim.adjustedScore)}>
            {dim.adjustedScore}/100
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Base: {dim.baseScore}</span>
          <ArrowRight className="w-3 h-3" />
          <span className={`font-medium ${getScoreColor(dim.adjustedScore)}`}>{dim.adjustedScore}</span>
          {totalAdj !== 0 && (
            <span className={totalAdj > 0 ? "text-red-500" : "text-green-500"}>
              ({totalAdj > 0 ? "+" : ""}{totalAdj})
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <AdjustmentBadge value={dim.incidentAdjustment} label="Incidents" />
        <AdjustmentBadge value={dim.regulatoryAdjustment} label="Regulatory" />
        <AdjustmentBadge value={dim.newsAdjustment} label="News" />
      </div>

      {hasDrivers && (
        <Accordion type="multiple" className="w-full">
          {dim.incidentDrivers.length > 0 && (
            <AccordionItem value="incidents" className="border-b-0">
              <AccordionTrigger className="py-2 text-xs hover:no-underline" data-testid={`trigger-incidents-${dim.dimension.replace(/[\s/]/g, "-")}`}>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                  <span>{dim.incidentDrivers.length} Incident{dim.incidentDrivers.length > 1 ? "s" : ""} Contributing</span>
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
      )}

      {!hasDrivers && (
        <p className="text-xs text-muted-foreground italic">No external drivers affect this dimension for this unit.</p>
      )}
    </Card>
  );
}

export default function DriversPage() {
  const [selectedSectorId, setSelectedSectorId] = useState<string>("");

  const { data: sectors = [], isLoading: sectorsLoading } = useQuery<RiskSector[]>({
    queryKey: ["/api/sectors"],
  });

  const { data: drivers, isLoading: driversLoading } = useQuery<DriversResponse>({
    queryKey: ["/api/sectors", selectedSectorId, "drivers"],
    enabled: !!selectedSectorId,
  });

  const selectedSector = sectors.find(s => s.id === selectedSectorId);

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
          <Select value={selectedSectorId} onValueChange={setSelectedSectorId}>
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
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted/40 rounded" />
                  <div className="h-3 w-3/4 bg-muted/40 rounded" />
                </div>
              </Card>
            ))}
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

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Risk Dimension Breakdown ({drivers.dimensions.length} dimensions)
              </h3>
              {drivers.dimensions
                .sort((a, b) => b.adjustedScore - a.adjustedScore)
                .map(dim => (
                  <DimensionCard key={dim.dimension} dim={dim} />
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
