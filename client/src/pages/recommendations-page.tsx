import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListChecks, ChevronRight, Shield, ClipboardList, Globe, AlertTriangle, CheckCircle2 } from "lucide-react";
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

const THEMATIC_GROUPS = [
  {
    key: "controls",
    title: "Strengthen Controls & Governance",
    description: "Address control design and operating effectiveness gaps to reduce risk exposure",
    actionKey: "controlHealthAction" as const,
    icon: Shield,
    color: "bg-purple-500",
    textColor: "text-purple-600",
    borderColor: "border-purple-500/15",
    bgColor: "bg-purple-500/5",
  },
  {
    key: "audit",
    title: "Remediate Audit Findings",
    description: "Prioritize closure of open audit issues, especially high-severity findings",
    actionKey: "auditIssueAction" as const,
    icon: ClipboardList,
    color: "bg-amber-500",
    textColor: "text-amber-600",
    borderColor: "border-amber-500/15",
    bgColor: "bg-amber-500/5",
  },
  {
    key: "external",
    title: "Monitor External Landscape",
    description: "Respond to market signals, regulatory changes, and media sentiment trends",
    actionKey: "businessExternalAction" as const,
    icon: Globe,
    color: "bg-blue-500",
    textColor: "text-blue-600",
    borderColor: "border-blue-500/15",
    bgColor: "bg-blue-500/5",
  },
  {
    key: "technology",
    title: "Address Technology & Vendor Risk",
    description: "Manage vendor vulnerabilities, SLAs, and operational technology dependencies",
    actionKey: "operationalRiskAction" as const,
    icon: AlertTriangle,
    color: "bg-red-500",
    textColor: "text-red-600",
    borderColor: "border-red-500/15",
    bgColor: "bg-red-500/5",
  },
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
  if (score >= 61) return "text-yellow-600";
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

  const elevatedDimensions = useMemo(() => {
    if (!drivers) return [];
    return drivers.dimensions.filter(d => d.adjustedScore > 60);
  }, [drivers]);

  const thematicResults = useMemo(() => {
    if (!elevatedDimensions.length) return [];
    return THEMATIC_GROUPS.map(group => {
      const seen = new Set<string>();
      const items: { action: string; dims: { name: string; score: number }[] }[] = [];

      for (const dim of elevatedDimensions) {
        const action = dim[group.actionKey as keyof DimensionDriver] as string;
        if (!action) continue;
        if (seen.has(action)) {
          const existing = items.find(i => i.action === action);
          if (existing) existing.dims.push({ name: dim.dimension, score: dim.adjustedScore });
        } else {
          seen.add(action);
          items.push({ action, dims: [{ name: dim.dimension, score: dim.adjustedScore }] });
        }
      }

      return { ...group, items };
    }).filter(g => g.items.length > 0);
  }, [elevatedDimensions]);

  const totalRecs = thematicResults.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Recommendations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Targeted actions for risk dimensions scoring above 60
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
            <p className="text-xs text-muted-foreground/70 mt-1">Choose a unit to see targeted recommendations for elevated risk dimensions</p>
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
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span>{elevatedDimensions.length} of {drivers.dimensions.length} dimensions above 60</span>
                <span>{totalRecs} recommendation{totalRecs !== 1 ? "s" : ""} across {thematicResults.length} theme{thematicResults.length !== 1 ? "s" : ""}</span>
              </div>
              {elevatedDimensions.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {elevatedDimensions
                    .sort((a, b) => b.adjustedScore - a.adjustedScore)
                    .map(d => (
                      <Badge key={d.dimension} variant="outline" className={`text-[10px] px-1.5 py-0 ${getScoreColor(d.adjustedScore)}`}>
                        {d.dimension}: {d.adjustedScore}
                      </Badge>
                    ))}
                </div>
              )}
            </Card>

            {elevatedDimensions.length === 0 && (
              <Card className="p-8 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500/40 mb-3" />
                <h3 className="text-sm font-medium text-green-600">No Elevated Risk Dimensions</h3>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  All risk dimensions for this unit score at or below 60 — no targeted recommendations needed.
                </p>
              </Card>
            )}

            {thematicResults.map(group => {
              const Icon = group.icon;
              return (
                <Card key={group.key} className="p-4" data-testid={`card-theme-${group.key}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${group.bgColor} shrink-0`}>
                      <Icon className={`w-4 h-4 ${group.textColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">{group.title}</h3>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                          {group.items.length} action{group.items.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {group.items.map((item, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 p-3 rounded-md border ${group.borderColor} ${group.bgColor}`}
                        data-testid={`rec-${group.key}-${i}`}
                      >
                        <ChevronRight className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${group.textColor}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs leading-relaxed ${group.textColor} dark:opacity-90`}>{item.action}</p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {item.dims
                              .sort((a, b) => b.score - a.score)
                              .map(d => (
                                <Badge key={d.name} variant="outline" className={`text-[10px] px-1.5 py-0 ${getScoreColor(d.score)}`}>
                                  {d.name} ({d.score})
                                </Badge>
                              ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
