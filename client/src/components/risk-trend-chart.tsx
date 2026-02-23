import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import type { RiskMetric, RiskSector } from "@shared/schema";

interface RiskTrendChartProps {
  metrics: RiskMetric[];
  sectors: RiskSector[];
  isLoading?: boolean;
}

const METRIC_COLORS: Record<string, string> = {
  "Fraud Risk": "hsl(0, 84%, 55%)",
  "Operational Risk": "hsl(43, 74%, 55%)",
  "Market Risk": "hsl(217, 91%, 50%)",
  "Audit Risk": "hsl(270, 70%, 55%)",
};

function generateTrendData(metrics: RiskMetric[], sectors: RiskSector[]) {
  const timePoints = ["6h ago", "5h ago", "4h ago", "3h ago", "2h ago", "1h ago", "Now"];
  
  return timePoints.map((time, idx) => {
    const point: Record<string, any> = { time };
    sectors.forEach((sector) => {
      const sectorMetrics = metrics.filter(m => m.sectorId === sector.id);
      const avgScore = sectorMetrics.length > 0
        ? sectorMetrics.reduce((sum, m) => sum + m.score, 0) / sectorMetrics.length
        : 50;
      const variation = (Math.sin(idx * 0.8 + sector.name.length) * 8) + (Math.random() * 4 - 2);
      point[sector.name] = Math.max(0, Math.min(100, avgScore + variation * (idx - 3)));
    });
    return point;
  });
}

function generateMetricTrendData(metrics: RiskMetric[], metricType: string) {
  const timePoints = ["6h ago", "5h ago", "4h ago", "3h ago", "2h ago", "1h ago", "Now"];
  const filtered = metrics.filter(m => m.metricType === metricType);
  
  return timePoints.map((time, idx) => {
    const point: Record<string, any> = { time };
    point["Current"] = filtered.length > 0
      ? Math.max(0, Math.min(100, filtered[0].score + (Math.sin(idx * 0.7) * 6) + (idx - 3) * 1.5))
      : 50;
    point["Predicted"] = filtered.length > 0
      ? Math.max(0, Math.min(100, (filtered[0].predictedScore ?? filtered[0].score) + (Math.sin(idx * 0.5) * 4) + (idx - 2) * 2))
      : 55;
    return point;
  });
}

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

export function RiskTrendChart({ metrics, sectors, isLoading }: RiskTrendChartProps) {
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

  const sectorTrendData = generateTrendData(metrics, sectors);
  const metricTypes = ["Fraud Risk", "Operational Risk", "Market Risk", "Audit Risk"];

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold" data-testid="text-trend-title">Risk Trend Analysis</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Historical and predicted risk trajectory</p>
        </div>
      </div>

      <Tabs defaultValue="sector" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="sector" data-testid="tab-sector-view">By Sector</TabsTrigger>
          <TabsTrigger value="metric" data-testid="tab-metric-view">By Metric</TabsTrigger>
        </TabsList>

        <TabsContent value="sector">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sectorTrendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  {sectors.map((sector, i) => {
                    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
                    return (
                      <linearGradient key={sector.id} id={`gradient-${sector.name}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip content={<CustomTooltip />} />
                {sectors.map((sector, i) => {
                  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
                  return (
                    <Area
                      key={sector.id}
                      type="monotone"
                      dataKey={sector.name}
                      stroke={colors[i % colors.length]}
                      strokeWidth={2}
                      fill={`url(#gradient-${sector.name})`}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="metric">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={generateMetricTrendData(metrics, "Market")} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradientCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Current" stroke="#3b82f6" strokeWidth={2} fill="url(#gradientCurrent)" dot={false} />
                <Area type="monotone" dataKey="Predicted" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" fill="url(#gradientPredicted)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
