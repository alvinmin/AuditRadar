import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, Target } from "lucide-react";
import type { RiskMetric, RiskSector, HeatmapData } from "@shared/schema";

interface SectorDetailPanelProps {
  sector: RiskSector;
  metrics: RiskMetric[];
  heatmapData: HeatmapData[];
  onClose: () => void;
}

function getSeverityBadge(score: number) {
  if (score > 90) return <Badge variant="destructive" className="text-[10px]">Critical</Badge>;
  if (score >= 71) return <Badge className="text-[10px] bg-orange-500/90 text-white border-orange-600/50">High</Badge>;
  if (score >= 31) return <Badge variant="secondary" className="text-[10px]">Medium</Badge>;
  return <Badge variant="secondary" className="text-[10px]">Low</Badge>;
}

function getScoreColor(score: number) {
  if (score > 90) return "text-red-600 dark:text-red-400";
  if (score >= 71) return "text-orange-600 dark:text-orange-400";
  if (score >= 31) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function getProgressColor(score: number) {
  if (score > 90) return "[&>div]:bg-red-500";
  if (score >= 71) return "[&>div]:bg-orange-500";
  if (score >= 31) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-emerald-500";
}

export function SectorDetailPanel({ sector, metrics, heatmapData, onClose }: SectorDetailPanelProps) {
  const sectorMetrics = metrics.filter(m => m.sectorId === sector.id);
  const sectorHeatmap = heatmapData.filter(h => h.sectorId === sector.id);

  const overallScore = sectorMetrics.length > 0
    ? sectorMetrics.reduce((sum, m) => sum + m.score, 0) / sectorMetrics.length
    : 0;

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-2 mb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold" data-testid="text-sector-detail-name">{sector.name}</h3>
            {getSeverityBadge(overallScore)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{sector.category} Sector</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-detail">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="mb-5">
        <div className="p-3 rounded-md bg-muted/30 inline-block">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Current Score</span>
          </div>
          <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
            {overallScore.toFixed(1)}
          </span>
        </div>
      </div>

      {sector.description && (
        <p className="text-sm text-muted-foreground mb-5">{sector.description}</p>
      )}

      <h4 className="text-sm font-semibold mb-3">Risk Breakdown</h4>
      <div className="space-y-3">
        {sectorMetrics.map((metric) => {
          const change = metric.previousScore
            ? ((metric.score - metric.previousScore) / metric.previousScore) * 100
            : 0;

          return (
            <div key={metric.id}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-sm font-medium">{metric.metricType}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold tabular-nums ${getScoreColor(metric.score)}`}>
                    {metric.score.toFixed(1)}
                  </span>
                  {change !== 0 && (
                    <span className={`text-[11px] ${change > 0 ? "text-red-500" : "text-emerald-500"}`}>
                      {change > 0 ? "+" : ""}{change.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <Progress value={metric.score} className={`h-2 ${getProgressColor(metric.score)}`} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
