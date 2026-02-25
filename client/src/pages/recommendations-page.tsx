import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListChecks, ChevronRight, FileText } from "lucide-react";
import type { RiskSector } from "@shared/schema";

interface DimensionDriver {
  dimension: string;
  adjustedScore: number;
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
  dimensions: DimensionDriver[];
}

const COMPONENT_META = [
  { key: "controlHealth", label: "Control Health", actionKey: "controlHealthAction", color: "bg-purple-500", textColor: "text-purple-600", borderColor: "border-purple-500/15", bgColor: "bg-purple-500/5" },
  { key: "auditIssue", label: "Audit & Issue Trend", actionKey: "auditIssueAction", color: "bg-amber-500", textColor: "text-amber-600", borderColor: "border-amber-500/15", bgColor: "bg-amber-500/5" },
  { key: "businessExternal", label: "Business / External", actionKey: "businessExternalAction", color: "bg-blue-500", textColor: "text-blue-600", borderColor: "border-blue-500/15", bgColor: "bg-blue-500/5" },
  { key: "operationalRisk", label: "Operational Risk", actionKey: "operationalRiskAction", color: "bg-red-500", textColor: "text-red-600", borderColor: "border-red-500/15", bgColor: "bg-red-500/5" },
  { key: "baseline", label: "Qualitative Risk Assessment", actionKey: "baselineAction", color: "bg-indigo-500", textColor: "text-indigo-600", borderColor: "border-indigo-500/15", bgColor: "bg-indigo-500/5" },
];

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical": return "bg-red-500/10 text-red-600 border-red-500/20";
    case "high": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    case "medium": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    default: return "bg-green-500/10 text-green-600 border-green-500/20";
  }
}

function getScoreColor(score: number) {
  if (score > 90) return "text-red-600";
  if (score >= 71) return "text-orange-500";
  if (score >= 31) return "text-yellow-600";
  return "text-green-600";
}

export default function RecommendationsPage() {
  const [selectedSectorId, setSelectedSectorId] = useState<string>("");

  const { data: sectors = [], isLoading: sectorsLoading } = useQuery<RiskSector[]>({
    queryKey: ["/api/sectors"],
  });

  const { data: drivers, isLoading: driversLoading } = useQuery<DriversResponse>({
    queryKey: ["/api/sectors", selectedSectorId, "drivers"],
    enabled: !!selectedSectorId,
  });

  const groupedRecommendations = (() => {
    if (!drivers) return [];
    return COMPONENT_META.map(comp => {
      const items: { dimension: string; score: number; action: string }[] = [];
      for (const dim of drivers.dimensions) {
        const action = dim[comp.actionKey as keyof DimensionDriver] as string;
        if (action) {
          items.push({ dimension: dim.dimension, score: dim.adjustedScore, action });
        }
      }
      return { ...comp, items };
    }).filter(group => group.items.length > 0);
  })();

  const totalCount = groupedRecommendations.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Recommendations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Actionable recommendations by component across all risk dimensions
          </p>
        </div>

        <Card className="p-4">
          <label className="text-sm font-medium mb-2 block">Select Auditable Unit</label>
          <Select value={selectedSectorId} onValueChange={setSelectedSectorId}>
            <SelectTrigger className="w-full max-w-md" data-testid="select-auditable-unit">
              <SelectValue placeholder="Choose an auditable unit to view recommendations..." />
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
            <ListChecks className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-sm font-medium text-muted-foreground">Select an auditable unit above</h3>
            <p className="text-xs text-muted-foreground/70 mt-1">Choose a unit to see its recommended actions across all risk dimensions</p>
          </Card>
        )}

        {driversLoading && selectedSectorId && (
          <Card className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-5 w-64 bg-muted rounded" />
              <div className="h-4 w-48 bg-muted/60 rounded" />
              <div className="h-20 bg-muted/30 rounded" />
            </div>
          </Card>
        )}

        {drivers && !driversLoading && (
          <>
            <Card className="p-4" data-testid="card-unit-summary">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold" data-testid="text-sector-name">{drivers.sectorName}</h2>
                  <p className="text-sm text-muted-foreground">{drivers.sectorCategory}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Composite Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(drivers.averageAdjustedScore)}`}>
                      {drivers.averageAdjustedScore}
                    </p>
                  </div>
                  <Badge className={`${getSeverityColor(drivers.severity)} text-xs px-2 py-0.5`}>
                    {drivers.severity.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {totalCount} recommendation{totalCount !== 1 ? "s" : ""} across {groupedRecommendations.length} component{groupedRecommendations.length !== 1 ? "s" : ""}
              </div>
            </Card>

            {groupedRecommendations.map(group => (
              <Card key={group.key} className="p-4" data-testid={`card-recs-${group.key}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${group.color}`} />
                  <h3 className="text-sm font-semibold">{group.label}</h3>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
                    {group.items.length} recommendation{group.items.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {group.items.map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 p-2.5 rounded-md border ${group.borderColor} ${group.bgColor}`}
                      data-testid={`rec-${group.key}-${item.dimension.replace(/[\s/]/g, "-")}`}
                    >
                      <ChevronRight className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${group.textColor}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.dimension}</Badge>
                          <span className={`text-[10px] font-mono ${getScoreColor(item.score)}`}>Score: {item.score}</span>
                        </div>
                        <p className={`text-xs ${group.textColor} dark:opacity-90`}>{item.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
