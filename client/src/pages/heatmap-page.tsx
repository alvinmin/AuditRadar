import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RiskHeatmap } from "@/components/risk-heatmap";
import { SectorDetailPanel } from "@/components/sector-detail-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Radio } from "lucide-react";
import type { RiskSector, RiskMetric, HeatmapData } from "@shared/schema";

export default function HeatmapPage() {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: sectors = [] } = useQuery<RiskSector[]>({ queryKey: ["/api/sectors"] });
  const { data: metrics = [] } = useQuery<RiskMetric[]>({ queryKey: ["/api/metrics"] });
  const { data: heatmap = [] } = useQuery<HeatmapData[]>({ queryKey: ["/api/heatmap"] });

  const categories = Array.from(new Set(sectors.map(s => s.category)));
  const filteredSectors = categoryFilter === "all" ? sectors : sectors.filter(s => s.category === categoryFilter);

  const heatmapCells = heatmap
    .filter(h => filteredSectors.some(s => s.id === h.sectorId))
    .map((h) => ({
      sector: sectors.find((s) => s.id === h.sectorId)?.name ?? "",
      sectorId: h.sectorId,
      dimension: h.riskDimension,
      value: h.value,
      trend: h.trend,
    }));

  const selectedSectorObj = sectors.find(s => s.id === selectedSector);

  return (
    <div className="h-full overflow-auto sf-page-bg">
      <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 sf-pulse-icon" />
              <h1 className="sf-page-title text-2xl tracking-[0.2em] uppercase" data-testid="text-heatmap-page-title">
                Risk Heatmap
              </h1>
            </div>
            <p className="sf-subtitle text-xs mt-1 tracking-wide ml-6">
              DETAILED CROSS-SECTOR RISK VISUALIZATION // SYSTEM ACTIVE
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 sf-label" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] sf-select" data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={selectedSectorObj ? "lg:col-span-2" : "lg:col-span-3"}>
            <RiskHeatmap
              data={heatmapCells}
              sectors={filteredSectors}
              onCellClick={(sectorId) => setSelectedSector(sectorId === selectedSector ? null : sectorId)}
              selectedSector={selectedSector}
            />
          </div>
          {selectedSectorObj && (
            <div className="lg:col-span-1">
              <SectorDetailPanel
                sector={selectedSectorObj}
                metrics={metrics}
                heatmapData={heatmap}
                onClose={() => setSelectedSector(null)}
              />
            </div>
          )}
        </div>

        <div className="sf-summary-card rounded-lg p-4 sm:p-6">
          <h3 className="sf-title text-sm tracking-widest uppercase mb-3">Risk Distribution Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { level: "Critical", color: "rgba(255, 0, 128, 0.8)", glow: "rgba(255, 0, 128, 0.4)", min: 80, max: 100 },
              { level: "High", color: "rgba(200, 0, 200, 0.7)", glow: "rgba(200, 0, 200, 0.3)", min: 65, max: 80 },
              { level: "Elevated", color: "rgba(160, 50, 255, 0.6)", glow: "rgba(160, 50, 255, 0.25)", min: 50, max: 65 },
              { level: "Moderate", color: "rgba(100, 80, 255, 0.5)", glow: "rgba(100, 80, 255, 0.2)", min: 35, max: 50 },
              { level: "Low", color: "rgba(0, 200, 255, 0.5)", glow: "rgba(0, 200, 255, 0.2)", min: 0, max: 35 },
            ].map(({ level, color, glow, min, max }) => {
              const count = heatmapCells.filter(c => c.value >= min && c.value < max).length;
              return (
                <div
                  key={level}
                  className="p-3 rounded-md text-center sf-summary-item"
                  style={{
                    background: `linear-gradient(135deg, ${color}, transparent)`,
                    boxShadow: `0 0 12px ${glow}, inset 0 0 8px ${glow}`,
                    border: `1px solid ${color}`,
                  }}
                  data-testid={`summary-${level.toLowerCase()}`}
                >
                  <p className="text-2xl font-bold sf-score text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{count}</p>
                  <p className="text-[10px] font-medium mt-0.5 uppercase tracking-widest text-white/80">{level}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
