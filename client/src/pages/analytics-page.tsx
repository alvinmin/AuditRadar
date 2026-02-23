import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RiskTrendChart } from "@/components/risk-trend-chart";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import type { RiskSector, RiskMetric, HeatmapData } from "@shared/schema";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-popover border border-popover-border rounded-md p-3 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-foreground">{entry.name}:</span>
          <span className="font-bold text-foreground">{Number(entry.value).toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { data: sectors = [], isLoading: sl } = useQuery<RiskSector[]>({ queryKey: ["/api/sectors"] });
  const { data: metrics = [], isLoading: ml } = useQuery<RiskMetric[]>({ queryKey: ["/api/metrics"] });
  const { data: heatmap = [] } = useQuery<HeatmapData[]>({ queryKey: ["/api/heatmap"] });

  const isLoading = sl || ml;

  const sectorScores = sectors.map((sector) => {
    const sectorMetrics = metrics.filter(m => m.sectorId === sector.id);
    const avg = sectorMetrics.length > 0
      ? sectorMetrics.reduce((sum, m) => sum + m.score, 0) / sectorMetrics.length
      : 0;
    const predicted = sectorMetrics.length > 0
      ? sectorMetrics.reduce((sum, m) => sum + (m.predictedScore ?? m.score), 0) / sectorMetrics.length
      : 0;
    return { name: sector.name, current: avg, predicted };
  });

  const radarData = ["Financial", "Regulatory", "Operational", "Change", "Control Env", "Fraud", "Data/Tech", "Reputation"].map((dim) => {
    const dimHeatmap = heatmap.filter(h => h.riskDimension === dim);
    const avg = dimHeatmap.length > 0
      ? dimHeatmap.reduce((sum, h) => sum + h.value, 0) / dimHeatmap.length
      : 0;
    return { dimension: dim, value: avg, fullMark: 100 };
  });

  const topRisks = [...metrics]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(m => ({
      ...m,
      sectorName: sectors.find(s => s.id === m.sectorId)?.name ?? "Unknown",
    }));

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-analytics-title">Risk Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deep-dive into risk patterns and predictive insights
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4 sm:p-6">
            <h3 className="text-base font-semibold mb-4">Current vs Predicted Risk by Sector</h3>
            {isLoading ? (
              <div className="h-[300px] animate-pulse bg-muted/30 rounded-md" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorScores} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={80} interval={0} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="current" name="Current" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="predicted" name="Predicted" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="text-base font-semibold mb-4">Risk Dimension Radar</h3>
            {isLoading ? (
              <div className="h-[300px] animate-pulse bg-muted/30 rounded-md" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Risk Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        <RiskTrendChart metrics={metrics} sectors={sectors} isLoading={isLoading} />

        <Card className="p-4 sm:p-6">
          <h3 className="text-base font-semibold mb-4">Top Risk Exposures</h3>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-12 bg-muted/30 rounded-md" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {topRisks.map((risk, idx) => {
                const color = risk.score >= 80 ? "text-red-600 dark:text-red-400" :
                  risk.score >= 65 ? "text-orange-600 dark:text-orange-400" :
                  risk.score >= 50 ? "text-amber-600 dark:text-amber-400" :
                  "text-emerald-600 dark:text-emerald-400";
                const progressColor = risk.score >= 80 ? "[&>div]:bg-red-500" :
                  risk.score >= 65 ? "[&>div]:bg-orange-500" :
                  risk.score >= 50 ? "[&>div]:bg-amber-500" :
                  "[&>div]:bg-emerald-500";

                return (
                  <div key={risk.id} className="flex items-center gap-4" data-testid={`risk-exposure-${idx}`}>
                    <span className="text-xs text-muted-foreground w-4 font-mono">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">{risk.sectorName}</span>
                          <Badge variant="secondary" className="text-[10px] shrink-0">{risk.metricType}</Badge>
                        </div>
                        <span className={`text-sm font-bold tabular-nums ${color}`}>{risk.score.toFixed(1)}</span>
                      </div>
                      <Progress value={risk.score} className={`h-1.5 ${progressColor}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
