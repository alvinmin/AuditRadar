import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip as RechartsTooltip,
  Cell,
  Label,
} from "recharts";
import { Crosshair, Filter } from "lucide-react";
import type { RiskSector, RiskMetric } from "@shared/schema";

const RISK_DIMENSIONS = ["Financial", "Regulatory", "Operational", "Change", "Fraud", "Data/Tech", "Reputation"];

interface ScatterPoint {
  name: string;
  dimension: string;
  label: string;
  sectorId: string;
  category: string;
  x: number;
  y: number;
  riskLevel: number;
}

function getQuadrantLabel(x: number, y: number): { label: string; color: string; description: string } {
  if (x >= 0 && y >= 71) return { label: "High & Rising", color: "rgba(255, 0, 128, 0.85)", description: "High risk with increasing trend — immediate attention needed" };
  if (x < 0 && y >= 71) return { label: "High & Declining", color: "rgba(200, 0, 200, 0.75)", description: "High risk but improving — monitor recovery progress" };
  if (x >= 0 && y < 71) return { label: "Moderate & Rising", color: "rgba(100, 80, 255, 0.7)", description: "Lower risk but increasing — watch for escalation" };
  return { label: "Moderate & Declining", color: "rgba(0, 255, 200, 0.6)", description: "Lower risk and decreasing — stable position" };
}

function getDotColor(x: number, y: number): string {
  return getQuadrantLabel(x, y).color;
}

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as ScatterPoint;
  const quadrant = getQuadrantLabel(data.x, data.y);
  return (
    <div className="bg-popover border border-popover-border rounded-md p-3 shadow-lg max-w-[280px]">
      <p className="text-sm font-semibold text-foreground mb-0.5">{data.name}</p>
      <div className="flex items-center gap-1.5 mb-2">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{data.dimension}</Badge>
        <span className="text-[10px] text-muted-foreground">{data.category}</span>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Current Risk Level</span>
          <span className="font-bold text-foreground">{data.y.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Risk Increment</span>
          <span className="font-bold text-foreground">{data.x >= 0 ? "+" : ""}{data.x.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-border">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: quadrant.color }} />
          <span className="font-medium text-foreground">{quadrant.label}</span>
        </div>
      </div>
    </div>
  );
};

export default function QuadrantPage() {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const [dimensionFilter, setDimensionFilter] = useState<string>("all");

  const { data: sectors = [] } = useQuery<RiskSector[]>({ queryKey: ["/api/sectors"] });
  const { data: metrics = [] } = useQuery<RiskMetric[]>({ queryKey: ["/api/metrics"] });

  const allScatterData: ScatterPoint[] = useMemo(() => {
    const points: ScatterPoint[] = [];
    sectors.forEach(sector => {
      const sectorMetrics = metrics.filter(m => m.sectorId === sector.id);
      sectorMetrics.forEach(metric => {
        const prevScore = metric.previousScore ?? metric.score;
        points.push({
          name: sector.name,
          dimension: metric.metricType,
          label: `${sector.name} — ${metric.metricType}`,
          sectorId: sector.id,
          category: sector.category,
          x: parseFloat((metric.score - prevScore).toFixed(2)),
          y: parseFloat(metric.score.toFixed(2)),
          riskLevel: metric.score,
        });
      });
    });
    return points;
  }, [sectors, metrics]);

  const scatterData = useMemo(() => {
    if (dimensionFilter === "all") return allScatterData;
    return allScatterData.filter(d => d.dimension === dimensionFilter);
  }, [allScatterData, dimensionFilter]);

  const quadrantCounts = {
    highRising: scatterData.filter(d => d.x >= 0 && d.y >= 71).length,
    highDeclining: scatterData.filter(d => d.x < 0 && d.y >= 71).length,
    modRising: scatterData.filter(d => d.x >= 0 && d.y < 71).length,
    modDeclining: scatterData.filter(d => d.x < 0 && d.y < 71).length,
  };

  const xValues = scatterData.map(d => d.x);
  const yValues = scatterData.map(d => d.y);
  const xMin = xValues.length > 0 ? Math.min(-15, Math.floor(Math.min(...xValues) - 3)) : -15;
  const xMax = xValues.length > 0 ? Math.max(15, Math.ceil(Math.max(...xValues) + 3)) : 15;
  const yMin = yValues.length > 0 ? Math.min(30, Math.floor(Math.min(...yValues) - 5)) : 30;
  const yMax = yValues.length > 0 ? Math.max(100, Math.ceil(Math.max(...yValues) + 5)) : 100;

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-quadrant-title">
                Risk Quadrant Analysis
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-7">
              Each point represents an Auditable Unit × Risk Dimension intersection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={dimensionFilter} onValueChange={setDimensionFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-dimension-filter">
                <SelectValue placeholder="All Dimensions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dimensions</SelectItem>
                {RISK_DIMENSIONS.map(dim => (
                  <SelectItem key={dim} value={dim}>{dim}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "High & Rising", count: quadrantCounts.highRising, color: "rgba(255, 0, 128, 0.85)", desc: "Immediate attention" },
            { label: "High & Declining", count: quadrantCounts.highDeclining, color: "rgba(200, 0, 200, 0.75)", desc: "Monitor recovery" },
            { label: "Moderate & Rising", count: quadrantCounts.modRising, color: "rgba(100, 80, 255, 0.7)", desc: "Watch for escalation" },
            { label: "Moderate & Declining", count: quadrantCounts.modDeclining, color: "rgba(0, 255, 200, 0.6)", desc: "Stable position" },
          ].map(q => (
            <Card key={q.label} className="p-3 border" data-testid={`card-quadrant-${q.label.toLowerCase().replace(/\s+&\s+/g, '-')}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: q.color }} />
                <span className="text-xs font-medium text-muted-foreground">{q.label}</span>
              </div>
              <p className="text-2xl font-bold">{q.count}</p>
              <p className="text-[10px] text-muted-foreground">{q.desc}</p>
            </Card>
          ))}
        </div>

        <Card className="p-4 sm:p-6 border" data-testid="card-scatter-chart">
          <div className="w-full" style={{ height: 520 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[xMin, xMax]}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                >
                  <Label
                    value="Risk Increment (score change from base)"
                    position="bottom"
                    offset={10}
                    style={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                </XAxis>
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[yMin, yMax]}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                >
                  <Label
                    value="Current Risk Level"
                    angle={-90}
                    position="insideLeft"
                    offset={-5}
                    style={{ fontSize: 12, fill: "hsl(var(--muted-foreground))", textAnchor: "middle" }}
                  />
                </YAxis>
                <ReferenceLine
                  x={0}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  opacity={0.6}
                />
                <ReferenceLine
                  y={71}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  opacity={0.6}
                />
                <RechartsTooltip content={<CustomScatterTooltip />} cursor={false} />
                <Scatter data={scatterData} dataKey="y">
                  {scatterData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getDotColor(entry.x, entry.y)}
                      stroke={getDotColor(entry.x, entry.y)}
                      strokeWidth={1}
                      r={dimensionFilter === "all" ? 5 : 7}
                      opacity={hoveredPoint && hoveredPoint !== `${entry.sectorId}-${entry.dimension}` ? 0.3 : 0.9}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 border" data-testid="card-quadrant-details">
          <h3 className="text-sm font-semibold mb-3">Unit × Dimension Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { title: "High & Rising", filter: (d: ScatterPoint) => d.x >= 0 && d.y >= 71, color: "rgba(255, 0, 128, 0.85)" },
              { title: "High & Declining", filter: (d: ScatterPoint) => d.x < 0 && d.y >= 71, color: "rgba(200, 0, 200, 0.75)" },
              { title: "Moderate & Rising", filter: (d: ScatterPoint) => d.x >= 0 && d.y < 71, color: "rgba(100, 80, 255, 0.7)" },
              { title: "Moderate & Declining", filter: (d: ScatterPoint) => d.x < 0 && d.y < 71, color: "rgba(0, 255, 200, 0.6)" },
            ].map(q => {
              const items = scatterData.filter(q.filter).sort((a, b) => b.y - a.y);
              const displayItems = items.slice(0, 15);
              const remaining = items.length - displayItems.length;
              return (
                <div key={q.title}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: q.color }} />
                    <span className="text-xs font-medium">{q.title}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{items.length}</Badge>
                  </div>
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {items.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No points in this quadrant</p>
                    )}
                    {displayItems.map((item, idx) => (
                      <Tooltip key={`${item.sectorId}-${item.dimension}-${idx}`}>
                        <TooltipTrigger asChild>
                          <div
                            className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/50 cursor-default transition-colors"
                            data-testid={`quadrant-item-${item.sectorId}-${item.dimension}`}
                            onMouseEnter={() => setHoveredPoint(`${item.sectorId}-${item.dimension}`)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          >
                            <div className="flex-1 min-w-0 mr-2">
                              <span className="truncate block">{item.name}</span>
                              <span className="text-[10px] text-muted-foreground">{item.dimension}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-muted-foreground">{item.y.toFixed(0)}</span>
                              <span className={item.x >= 0 ? "text-red-400" : "text-emerald-400"}>
                                {item.x >= 0 ? "+" : ""}{item.x.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{item.category}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {remaining > 0 && (
                      <p className="text-[10px] text-muted-foreground italic pl-1.5 pt-1">
                        +{remaining} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
