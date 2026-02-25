import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListChecks, Shield, ClipboardList, Globe, AlertTriangle, CheckCircle2 } from "lucide-react";
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
    summary: "Review and remediate controls with design or operating effectiveness gaps. Prioritize financial, regulatory, and IT controls where weaknesses could compound risk. Ensure compensating controls are in place for fraud and change management processes, and strengthen governance to prevent reputational incidents.",
    actionKey: "controlHealthAction" as const,
    icon: Shield,
    accentColor: "text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-500/30",
    accentBorder: "border-l-purple-500",
    bgColor: "bg-purple-500/8",
  },
  {
    key: "audit",
    title: "Remediate Audit Findings",
    summary: "Accelerate closure of open audit issues, particularly those rated severe or high. Focus on regulatory compliance findings with approaching deadlines, IT governance and access control issues, and operational findings contributing to elevated risk. Ensure remediation tracking is in place and escalate unresolved items.",
    actionKey: "auditIssueAction" as const,
    icon: ClipboardList,
    accentColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-500/30",
    accentBorder: "border-l-amber-500",
    bgColor: "bg-amber-500/8",
  },
  {
    key: "external",
    title: "Monitor External Landscape",
    summary: "Track emerging regulatory trends and prepare proactive responses. Monitor market conditions and media sentiment for signals that may affect financial, operational, or reputational risk. Evaluate whether current change initiatives adequately address newly identified external risks.",
    actionKey: "businessExternalAction" as const,
    icon: Globe,
    accentColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-500/30",
    accentBorder: "border-l-blue-500",
    bgColor: "bg-blue-500/8",
  },
  {
    key: "technology",
    title: "Address Technology & Vendor Risk",
    summary: "Conduct vulnerability assessments on vendor products with known exploits and accelerate patching cycles. Review vendor SLAs and incident response capabilities for critical dependencies. Verify vendor compliance with cybersecurity regulatory requirements and assess financial exposure from technology-related risks.",
    actionKey: "operationalRiskAction" as const,
    icon: AlertTriangle,
    accentColor: "text-red-600 dark:text-red-400",
    borderColor: "border-red-500/30",
    accentBorder: "border-l-red-500",
    bgColor: "bg-red-500/8",
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
      const affectedDims = elevatedDimensions
        .filter(dim => !!(dim[group.actionKey as keyof DimensionDriver] as string))
        .map(dim => ({ name: dim.dimension, score: dim.adjustedScore }))
        .sort((a, b) => b.score - a.score);
      return { ...group, affectedDims };
    }).filter(g => g.affectedDims.length > 0);
  }, [elevatedDimensions]);

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
                <span>{thematicResults.length} recommendation theme{thematicResults.length !== 1 ? "s" : ""}</span>
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
                      <Icon className={`w-4 h-4 ${group.accentColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`text-sm font-semibold ${group.accentColor}`}>{group.title}</h3>
                    </div>
                  </div>
                  <div className={`p-3 rounded-md border border-l-4 ${group.borderColor} ${group.accentBorder} ${group.bgColor}`}>
                    <p className="text-sm leading-relaxed text-foreground/85">{group.summary}</p>
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide mr-1">Affected:</span>
                      {group.affectedDims.map(d => (
                        <Badge key={d.name} variant="outline" className={`text-[10px] px-1.5 py-0 ${getScoreColor(d.score)}`}>
                          {d.name} ({d.score})
                        </Badge>
                      ))}
                    </div>
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
