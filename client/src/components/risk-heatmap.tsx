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

function getBand(value: number): { bg: string; glow: string; border: string } {
  if (value >= 90) return {
    bg:     "hsla(4, 72%, 44%, 0.92)",
    glow:   "0 0 10px hsla(4, 80%, 50%, 0.45)",
    border: "1px solid hsla(4, 70%, 58%, 0.70)",
  };
  if (value >= 66) return {
    bg:     "hsla(50, 100%, 50%, 0.93)",
    glow:   "0 0 8px hsla(50, 100%, 55%, 0.45)",
    border: "1px solid hsla(50, 95%, 60%, 0.65)",
  };
  if (value >= 51) return {
    bg:     "hsla(122, 50%, 38%, 0.88)",
    glow:   "0 0 7px hsla(122, 60%, 48%, 0.28)",
    border: "1px solid hsla(122, 55%, 52%, 0.55)",
  };
  return {
    bg:     "hsla(210, 55%, 48%, 0.82)",
    glow:   "0 0 6px hsla(210, 65%, 58%, 0.22)",
    border: "1px solid hsla(210, 60%, 62%, 0.48)",
  };
}

function getCellColor(value: number): string  { return getBand(value).bg; }
function getCellGlow(value: number): string   { return getBand(value).glow; }
function getCellBorder(value: number): string { return getBand(value).border; }

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
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
            <div className="w-3 h-3 rounded-sm" style={{ background: "hsla(210,55%,48%,0.82)" }} />
            <span className="sf-label">≤50</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
            <div className="w-3 h-3 rounded-sm" style={{ background: "hsla(122,50%,38%,0.88)" }} />
            <span className="sf-label">51–65</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
            <div className="w-3 h-3 rounded-sm" style={{ background: "hsla(50,100%,50%,0.93)" }} />
            <span className="sf-label">66–90</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
            <div className="w-3 h-3 rounded-sm" style={{ background: "hsla(4,72%,44%,0.92)" }} />
            <span className="sf-label">90+</span>
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
