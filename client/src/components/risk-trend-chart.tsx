import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
} from "recharts";
import type { RiskMetric, RiskSector } from "@shared/schema";

interface RiskTrendChartProps {
  metrics: RiskMetric[];
  sectors: RiskSector[];
  isLoading?: boolean;
}

const QUARTERS = ["Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026"];

const DIMENSION_COLORS: Record<string, string> = {
  "Financial": "#3b82f6",
  "Regulatory": "#ef4444",
  "Operational": "#f59e0b",
  "Change": "#14b8a6",
  "Fraud": "#ec4899",
  "Data/Tech": "#06b6d4",
  "Reputation": "#f97316",
};

const METRIC_TYPES = ["Financial", "Regulatory", "Operational", "Change", "Fraud", "Data/Tech", "Reputation"];

function interpolateQuarterly(currentScore: number, previousScore: number): number[] {
  const baseEstimate = previousScore;
  const diff = currentScore - baseEstimate;

  const q3 = baseEstimate + diff * 0.15;
  const q4 = baseEstimate + diff * 0.40;
  const q1 = baseEstimate + diff * 0.70;
  const q2 = currentScore;

  return [
    Math.max(0, Math.min(100, Math.round(q3 * 10) / 10)),
    Math.max(0, Math.min(100, Math.round(q4 * 10) / 10)),
    Math.max(0, Math.min(100, Math.round(q1 * 10) / 10)),
    Math.max(0, Math.min(100, Math.round(q2 * 10) / 10)),
  ];
}

function generateSectorQuarterlyData(metrics: RiskMetric[], sector: RiskSector) {
  const sectorMetrics = metrics.filter(m => m.sectorId === sector.id);

  const avgCurrent = sectorMetrics.length > 0
    ? sectorMetrics.reduce((sum, m) => sum + m.score, 0) / sectorMetrics.length
    : 0;
  const avgPrevious = sectorMetrics.length > 0
    ? sectorMetrics.reduce((sum, m) => sum + (m.previousScore ?? m.score), 0) / sectorMetrics.length
    : 0;

  const quarterlyScores = interpolateQuarterly(avgCurrent, avgPrevious);

  return QUARTERS.map((q, i) => ({
    quarter: q,
    "Avg Risk Score": quarterlyScores[i],
  }));
}

function generateAllSectorsQuarterlyData(metrics: RiskMetric[], sectors: RiskSector[]) {
  return QUARTERS.map((q, qi) => {
    const point: Record<string, any> = { quarter: q };
    sectors.forEach(sector => {
      const sectorMetrics = metrics.filter(m => m.sectorId === sector.id);
      const avgCurrent = sectorMetrics.length > 0
        ? sectorMetrics.reduce((sum, m) => sum + m.score, 0) / sectorMetrics.length
        : 0;
      const avgPrevious = sectorMetrics.length > 0
        ? sectorMetrics.reduce((sum, m) => sum + (m.previousScore ?? m.score), 0) / sectorMetrics.length
        : 0;
      const quarterlyScores = interpolateQuarterly(avgCurrent, avgPrevious);
      point[sector.name] = quarterlyScores[qi];
    });
    return point;
  });
}

function generateMetricQuarterlyData(metrics: RiskMetric[], metricType: string) {
  const filtered = metrics.filter(m => m.metricType === metricType);

  const avgCurrent = filtered.length > 0
    ? filtered.reduce((sum, m) => sum + m.score, 0) / filtered.length
    : 0;
  const avgPrevious = filtered.length > 0
    ? filtered.reduce((sum, m) => sum + (m.previousScore ?? m.score), 0) / filtered.length
    : 0;
  const avgPredicted = filtered.length > 0
    ? filtered.reduce((sum, m) => sum + (m.predictedScore ?? m.score), 0) / filtered.length
    : 0;

  const currentQuarterly = interpolateQuarterly(avgCurrent, avgPrevious);

  const predictedDiff = avgPredicted - avgCurrent;
  const predictedQ3 = avgCurrent + predictedDiff * 0.25;
  const predictedQuarterly = [
    currentQuarterly[0],
    currentQuarterly[1],
    currentQuarterly[2],
    Math.max(0, Math.min(100, Math.round(predictedQ3 * 10) / 10)),
  ];

  return QUARTERS.map((q, i) => ({
    quarter: q,
    "Current": currentQuarterly[i],
    "Predicted": i === 3 ? predictedQuarterly[3] : null,
  }));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-popover border border-popover-border rounded-md p-3 shadow-lg max-h-[300px] overflow-y-auto">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      {payload
        .filter((entry: any) => entry.value != null)
        .map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-foreground truncate max-w-[150px]">{entry.name}:</span>
          <span className="font-bold text-foreground">{Number(entry.value).toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
};

export function RiskTrendChart({ metrics, sectors, isLoading }: RiskTrendChartProps) {
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [selectedMetric, setSelectedMetric] = useState("Financial");

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-48 bg-muted rounded" />
          <div className="h-[300px] bg-muted/30 rounded-md" />
        </div>
      </Card>
    );
  }

  const sectorColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1"];

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold" data-testid="text-trend-title">Risk Trend Analysis</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Quarterly risk score trajectory (Q3 2025 — Q2 2026)</p>
        </div>
      </div>

      <Tabs defaultValue="sector" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="sector" data-testid="tab-sector-view">By Sector</TabsTrigger>
          <TabsTrigger value="metric" data-testid="tab-metric-view">By Dimension</TabsTrigger>
        </TabsList>

        <TabsContent value="sector">
          <div className="mb-3">
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="w-[260px]" data-testid="select-sector">
                <SelectValue placeholder="Select sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors (overlay)</SelectItem>
                {sectors.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSector === "all" ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={generateAllSectorsQuarterlyData(metrics, sectors)} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip content={<CustomTooltip />} />
                  {sectors.map((sector, i) => (
                    <Line
                      key={sector.id}
                      type="monotone"
                      dataKey={sector.name}
                      stroke={sectorColors[i % sectorColors.length]}
                      strokeWidth={1.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[350px]">
              {(() => {
                const sector = sectors.find(s => s.id === selectedSector);
                if (!sector) return null;
                const data = generateSectorQuarterlyData(metrics, sector);
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradientSectorTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="quarter" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="Avg Risk Score"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#gradientSectorTrend)"
                        dot={{ r: 4, fill: "#3b82f6" }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          )}
        </TabsContent>

        <TabsContent value="metric">
          <div className="mb-3">
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[180px]" data-testid="select-metric-type">
                <SelectValue placeholder="Select dimension" />
              </SelectTrigger>
              <SelectContent>
                {METRIC_TYPES.map(mt => (
                  <SelectItem key={mt} value={mt}>{mt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={generateMetricQuarterlyData(metrics, selectedMetric)} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradientCurrentQ" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={DIMENSION_COLORS[selectedMetric] || "#3b82f6"} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={DIMENSION_COLORS[selectedMetric] || "#3b82f6"} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientPredictedQ" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Current"
                  stroke={DIMENSION_COLORS[selectedMetric] || "#3b82f6"}
                  strokeWidth={2}
                  fill="url(#gradientCurrentQ)"
                  dot={{ r: 4, fill: DIMENSION_COLORS[selectedMetric] || "#3b82f6" }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Area
                  type="monotone"
                  dataKey="Predicted"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#gradientPredictedQ)"
                  dot={{ r: 4, fill: "#f59e0b" }}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
