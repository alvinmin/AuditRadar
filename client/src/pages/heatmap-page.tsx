import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RiskHeatmap } from "@/components/risk-heatmap";
import { SectorDetailPanel } from "@/components/sector-detail-panel";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";
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
    <div className="h-full overflow-auto">
      <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-heatmap-page-title">Risk Heatmap</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Detailed cross-sector risk visualization
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-category-filter">
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

        <Card className="p-4 sm:p-6">
          <h3 className="text-base font-semibold mb-3">Risk Distribution Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {["Critical", "High", "Elevated", "Moderate", "Low"].map((level) => {
              const thresholds: Record<string, [number, number]> = {
                Critical: [80, 100], High: [65, 80], Elevated: [50, 65], Moderate: [35, 50], Low: [0, 35]
              };
              const [min, max] = thresholds[level];
              const count = heatmapCells.filter(c => c.value >= min && c.value < max).length;
              const colors: Record<string, string> = {
                Critical: "bg-red-100/80 dark:bg-red-950/40 text-red-700 dark:text-red-400",
                High: "bg-orange-100/80 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400",
                Elevated: "bg-amber-100/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
                Moderate: "bg-yellow-100/80 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400",
                Low: "bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
              };
              return (
                <div key={level} className={`p-3 rounded-md text-center ${colors[level]}`} data-testid={`summary-${level.toLowerCase()}`}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs font-medium mt-0.5">{level}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
