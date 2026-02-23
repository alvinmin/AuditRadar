import { useState, Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import type { HeatmapData, RiskSector } from "@shared/schema";

interface HeatmapCellData {
  sector: string;
  sectorId: string;
  dimension: string;
  value: number;
  trend: string;
}

interface RiskHeatmapProps {
  data: HeatmapCellData[];
  sectors: RiskSector[];
  onCellClick?: (sectorId: string, dimension: string) => void;
  selectedSector?: string | null;
}

const RISK_DIMENSIONS = ["Financial", "Regulatory", "Operational", "Change", "Control Env", "Fraud", "Data/Tech", "Reputation"];

function getColorForValue(value: number): string {
  if (value >= 80) return "bg-red-600/90 dark:bg-red-500/80";
  if (value >= 65) return "bg-orange-500/80 dark:bg-orange-500/70";
  if (value >= 50) return "bg-amber-500/70 dark:bg-amber-500/60";
  if (value >= 35) return "bg-yellow-400/60 dark:bg-yellow-500/50";
  if (value >= 20) return "bg-emerald-400/50 dark:bg-emerald-500/40";
  return "bg-emerald-500/40 dark:bg-emerald-600/30";
}

function getTextColorForValue(value: number): string {
  if (value >= 50) return "text-white";
  return "text-foreground";
}

function getTrendIcon(trend: string) {
  if (trend === "up") return <TrendingUp className="w-3 h-3" />;
  if (trend === "down") return <TrendingDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

function getRiskLabel(value: number): string {
  if (value >= 80) return "Critical";
  if (value >= 65) return "High";
  if (value >= 50) return "Elevated";
  if (value >= 35) return "Moderate";
  if (value >= 20) return "Low";
  return "Minimal";
}

export function RiskHeatmap({ data, sectors, onCellClick, selectedSector }: RiskHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const sectorNames = sectors.map(s => s.name);

  const getCell = (sector: string, dimension: string) => {
    return data.find(d => d.sector === sector && d.dimension === dimension);
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight" data-testid="text-heatmap-title">Predictive Risk Heatmap</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Cross-sector risk assessment across key dimensions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-emerald-500/40" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-amber-500/70" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-red-600/90" />
            <span>High</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid gap-1" style={{ gridTemplateColumns: `200px repeat(${RISK_DIMENSIONS.length}, 1fr)` }}>
            <div className="p-2" />
            {RISK_DIMENSIONS.map((dim) => (
              <div key={dim} className="p-2 text-center">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{dim}</span>
              </div>
            ))}

            {sectorNames.map((sector) => (
              <Fragment key={sector}>
                <div
                  className={`p-2 flex items-center text-sm font-medium truncate rounded-md transition-colors ${
                    selectedSector && sectors.find(s => s.name === sector)?.id === selectedSector
                      ? "bg-primary/10 text-primary"
                      : ""
                  }`}
                >
                  {sector}
                </div>
                {RISK_DIMENSIONS.map((dim) => {
                  const cell = getCell(sector, dim);
                  const cellKey = `${sector}-${dim}`;
                  const isHovered = hoveredCell === cellKey;
                  const value = cell?.value ?? 0;
                  const sectorObj = sectors.find(s => s.name === sector);

                  return (
                    <Tooltip key={cellKey}>
                      <TooltipTrigger asChild>
                        <button
                          data-testid={`heatmap-cell-${sector.toLowerCase().replace(/\s+/g, '-')}-${dim.toLowerCase()}`}
                          className={`
                            relative p-3 rounded-md cursor-pointer transition-all duration-200 border border-transparent
                            ${getColorForValue(value)} ${getTextColorForValue(value)}
                            ${isHovered ? "ring-2 ring-primary/50 scale-[1.02]" : ""}
                            ${selectedSector && sectorObj?.id === selectedSector ? "ring-2 ring-primary" : ""}
                          `}
                          onClick={() => sectorObj && onCellClick?.(sectorObj.id, dim)}
                          onMouseEnter={() => setHoveredCell(cellKey)}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-base font-bold tabular-nums">{value.toFixed(0)}</span>
                            <div className="flex items-center gap-0.5 opacity-80">
                              {cell && getTrendIcon(cell.trend)}
                            </div>
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <div className="text-xs space-y-1">
                          <p className="font-semibold">{sector} - {dim}</p>
                          <p>Risk Score: <span className="font-bold">{value.toFixed(1)}</span></p>
                          <p>Level: {getRiskLabel(value)}</p>
                          <p>Trend: {cell?.trend === "up" ? "Increasing" : cell?.trend === "down" ? "Decreasing" : "Stable"}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
