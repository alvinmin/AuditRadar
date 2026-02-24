import { useState, Fragment } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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

const RISK_DIMENSIONS = ["Financial", "Regulatory", "Operational", "Change", "Fraud", "Data/Tech", "Reputation"];

function getHue(value: number): number {
  if (value < 50) return 120;
  // 50 → yellow (58), 65 → orange (25), 80 → red-orange (10), 100 → deep red (0)
  const t = (value - 50) / 50;
  return Math.max(0, 58 - t * 58);
}

function getCellColor(value: number): string {
  const hue = getHue(value);
  if (value < 50) {
    return `hsla(120, 52%, 40%, 0.85)`;
  }
  const t = (value - 50) / 50;
  // Saturation rises from 68% (yellow) to 80% (red)
  const sat = 68 + t * 12;
  // Lightness: yellow is brighter (47%), red is darker (36%)
  const lit = 47 - t * 11;
  const alpha = 0.86 + t * 0.10;
  return `hsla(${hue.toFixed(1)}, ${sat.toFixed(0)}%, ${lit.toFixed(0)}%, ${alpha.toFixed(2)})`;
}

function getCellGlow(value: number): string {
  const hue = getHue(value);
  const intensity = value < 50 ? 0.18 : 0.22 + ((value - 50) / 50) * 0.35;
  const spread = value < 50 ? 4 : 5 + ((value - 50) / 50) * 10;
  return `0 0 ${spread.toFixed(0)}px hsla(${hue.toFixed(1)}, 80%, 55%, ${intensity.toFixed(2)})`;
}

function getCellBorder(value: number): string {
  const hue = getHue(value);
  const alpha = value < 50 ? 0.35 : 0.40 + ((value - 50) / 50) * 0.40;
  return `1px solid hsla(${hue.toFixed(1)}, 70%, 58%, ${alpha.toFixed(2)})`;
}

function getTrendIcon(trend: string) {
  if (trend === "up") return <TrendingUp className="w-3 h-3" />;
  if (trend === "down") return <TrendingDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

function getRiskLabel(value: number): string {
  if (value > 90) return "Critical";
  if (value >= 71) return "High";
  if (value >= 31) return "Medium";
  return "Low";
}

export function RiskHeatmap({ data, sectors, onCellClick, selectedSector }: RiskHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const sectorNames = sectors.map(s => s.name);

  const getCell = (sector: string, dimension: string) => {
    return data.find(d => d.sector === sector && d.dimension === dimension);
  };

  return (
    <div className="sf-heatmap-card rounded-lg p-4 sm:p-6" data-testid="heatmap-container">
      <div className="flex items-center justify-between gap-2 mb-5">
        <div>
          <h2 className="sf-title text-lg tracking-widest uppercase" data-testid="text-heatmap-title">
            Predictive Risk Heatmap
          </h2>
          <p className="text-xs sf-subtitle mt-1 tracking-wide">Cross-sector risk assessment matrix // LIVE MONITORING</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-36 rounded-sm"
            style={{ background: "linear-gradient(to right, hsla(120,52%,40%,0.85) 0%, hsla(120,52%,40%,0.85) 50%, hsla(58,68%,47%,0.88) 55%, hsla(35,74%,43%,0.92) 70%, hsla(12,78%,40%,0.95) 85%, hsla(0,80%,36%,0.96) 100%)" }}
          />
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider">
            <span className="sf-label">Low</span>
            <span className="sf-label">→</span>
            <span className="sf-label">High</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto sf-grid-container">
        <div className="min-w-[600px]">
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: `260px repeat(${RISK_DIMENSIONS.length}, minmax(0, 1fr))` }}>
            <div className="p-2" />
            {RISK_DIMENSIONS.map((dim) => (
              <div key={dim} className="p-2 text-center">
                <span className="sf-dimension-label text-[10px] uppercase tracking-[0.15em]">{dim}</span>
              </div>
            ))}

            {sectorNames.map((sector) => (
              <Fragment key={sector}>
                <div
                  className={`p-2 flex items-center text-xs font-medium rounded transition-colors sf-sector-label whitespace-normal leading-tight ${
                    selectedSector && sectors.find(s => s.name === sector)?.id === selectedSector
                      ? "sf-sector-selected"
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
                            relative rounded cursor-pointer transition-all duration-300 sf-cell w-full aspect-square flex items-center justify-center
                            ${isHovered ? "scale-[1.08] z-10" : ""}
                            ${selectedSector && sectorObj?.id === selectedSector ? "ring-1 ring-cyan-400/60" : ""}
                          `}
                          style={{
                            backgroundColor: getCellColor(value),
                            boxShadow: isHovered
                              ? `${getCellGlow(value)}, 0 0 20px rgba(255,255,255,0.08)`
                              : getCellGlow(value),
                            border: getCellBorder(value),
                          }}
                          onClick={() => sectorObj && onCellClick?.(sectorObj.id, dim)}
                          onMouseEnter={() => setHoveredCell(cellKey)}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="sf-score text-sm font-bold tabular-nums text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">
                              {value.toFixed(0)}
                            </span>
                            <div className="flex items-center gap-0.5 text-white/70">
                              {cell && getTrendIcon(cell.trend)}
                            </div>
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="sf-tooltip">
                        <div className="text-xs space-y-1">
                          <p className="font-semibold sf-tooltip-title">{sector} — {dim}</p>
                          <p>Risk Score: <span className="font-bold text-cyan-300">{value.toFixed(1)}</span></p>
                          <p>Level: <span className="sf-tooltip-level">{getRiskLabel(value)}</span></p>
                          <p>Trend: {cell?.trend === "up" ? "↑ Increasing" : cell?.trend === "down" ? "↓ Decreasing" : "→ Stable"}</p>
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

    </div>
  );
}
