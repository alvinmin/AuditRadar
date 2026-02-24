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

const GRADIENT_STOPS = [
  { stop: 0,   h: 160, s: 90, l: 45 },
  { stop: 30,  h: 140, s: 80, l: 42 },
  { stop: 50,  h: 55,  s: 85, l: 48 },
  { stop: 65,  h: 38,  s: 90, l: 50 },
  { stop: 80,  h: 15,  s: 92, l: 48 },
  { stop: 90,  h: 0,   s: 85, l: 45 },
  { stop: 100, h: 340, s: 95, l: 40 },
];

function lerpGradient(value: number): { h: number; s: number; l: number } {
  const v = Math.max(0, Math.min(100, value));
  let i = 0;
  while (i < GRADIENT_STOPS.length - 1 && GRADIENT_STOPS[i + 1].stop <= v) i++;
  if (i >= GRADIENT_STOPS.length - 1) return GRADIENT_STOPS[GRADIENT_STOPS.length - 1];
  const a = GRADIENT_STOPS[i];
  const b = GRADIENT_STOPS[i + 1];
  const t = (v - a.stop) / (b.stop - a.stop);
  return {
    h: a.h + (b.h - a.h) * t,
    s: a.s + (b.s - a.s) * t,
    l: a.l + (b.l - a.l) * t,
  };
}

function getGradientColor(value: number): string {
  const { h, s, l } = lerpGradient(value);
  const alpha = 0.40 + (value / 100) * 0.50;
  return `hsla(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%, ${alpha.toFixed(2)})`;
}

function getGradientGlow(value: number): string {
  const { h, s, l } = lerpGradient(value);
  const intensity = (value / 100);
  const r1 = 4 + intensity * 12;
  const r2 = 8 + intensity * 20;
  const a1 = (0.15 + intensity * 0.45).toFixed(2);
  const a2 = (0.05 + intensity * 0.25).toFixed(2);
  const color = `${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%`;
  return `0 0 ${r1.toFixed(0)}px hsla(${color}, ${a1}), 0 0 ${r2.toFixed(0)}px hsla(${color}, ${a2})`;
}

function getGradientBorder(value: number): string {
  const { h, s, l } = lerpGradient(value);
  const alpha = (0.20 + (value / 100) * 0.45).toFixed(2);
  return `1px solid hsla(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%, ${alpha})`;
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
          <div className="flex flex-col items-center gap-0.5">
            <div
              className="h-3 rounded-sm"
              style={{
                width: "180px",
                background: `linear-gradient(to right, ${getGradientColor(0)}, ${getGradientColor(30)}, ${getGradientColor(50)}, ${getGradientColor(65)}, ${getGradientColor(80)}, ${getGradientColor(90)}, ${getGradientColor(100)})`,
              }}
            />
            <div className="flex justify-between w-[180px]">
              <span className="sf-label text-[9px] uppercase tracking-wider">0</span>
              <span className="sf-label text-[9px] uppercase tracking-wider">30</span>
              <span className="sf-label text-[9px] uppercase tracking-wider">50</span>
              <span className="sf-label text-[9px] uppercase tracking-wider">70</span>
              <span className="sf-label text-[9px] uppercase tracking-wider">90</span>
              <span className="sf-label text-[9px] uppercase tracking-wider">100</span>
            </div>
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
                            backgroundColor: getGradientColor(value),
                            boxShadow: isHovered
                              ? `${getGradientGlow(value)}, 0 0 30px rgba(0, 200, 255, 0.2)`
                              : getGradientGlow(value),
                            border: getGradientBorder(value),
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
