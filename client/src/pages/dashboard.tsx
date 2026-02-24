import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RiskHeatmap } from "@/components/risk-heatmap";
import { RiskSummaryCards } from "@/components/risk-summary-cards";
import { SectorDetailPanel } from "@/components/sector-detail-panel";
import { NewsFeed } from "@/components/news-feed";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import auditRadarLogo from "@assets/Audit_Radar_Logo_1771881298407.png";
import type { RiskSector, RiskMetric, HeatmapData, MarketNews } from "@shared/schema";

export default function Dashboard() {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: sectors = [], isLoading: sectorsLoading } = useQuery<RiskSector[]>({
    queryKey: ["/api/sectors"],
  });

  const { data: metrics = [], isLoading: metricsLoading } = useQuery<RiskMetric[]>({
    queryKey: ["/api/metrics"],
  });

  const { data: heatmap = [], isLoading: heatmapLoading } = useQuery<HeatmapData[]>({
    queryKey: ["/api/heatmap"],
  });

  const { data: news = [], isLoading: newsLoading } = useQuery<MarketNews[]>({
    queryKey: ["/api/news"],
  });

  const isLoading = sectorsLoading || metricsLoading || heatmapLoading;

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

  const summaryMetrics = buildSummaryMetrics(metrics);
  const selectedSectorObj = sectors.find((s) => s.id === selectedSector);

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3">
          <img src={auditRadarLogo} alt="Audit Radar" className="w-12 h-12 object-contain" data-testid="img-logo" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Audit Radar</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Predictive risk monitoring powered by market news intelligence
            </p>
          </div>
        </div>

        <RiskSummaryCards metrics={summaryMetrics} isLoading={isLoading} />

        <div className="flex items-center justify-end gap-2 -mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-dashboard-category-filter">
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

        <NewsFeed news={news} isLoading={newsLoading} maxItems={10} />
      </div>
    </div>
  );
}

function buildSummaryMetrics(metrics: RiskMetric[]) {
  const avgScore = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length
    : 0;

  const changeFromPrev = metrics.filter(m => m.previousScore).length > 0
    ? metrics.reduce((sum, m) => sum + (m.score - (m.previousScore ?? m.score)), 0) / metrics.filter(m => m.previousScore).length
    : 0;

  return [
    {
      label: "Overall Risk Score",
      value: avgScore.toFixed(1),
      change: changeFromPrev,
      changeLabel: "vs prior quarter",
      icon: "shield" as const,
      severity: avgScore > 90 ? "critical" as const : avgScore >= 71 ? "high" as const : avgScore >= 31 ? "medium" as const : "low" as const,
      tooltip: "The average composite risk score across all 28 auditable units and 7 risk dimensions for Q1 2026. Scores range from 0 (minimal risk) to 100 (critical risk). Change shown is quarter over quarter vs Q4 2025.",
    },
    {
      label: "Risk Score Change",
      value: `${changeFromPrev >= 0 ? "+" : ""}${changeFromPrev.toFixed(1)}`,
      change: changeFromPrev,
      changeLabel: "quarter over quarter",
      icon: "chart" as const,
      severity: Math.abs(changeFromPrev) >= 10 ? "critical" as const : Math.abs(changeFromPrev) >= 5 ? "high" as const : Math.abs(changeFromPrev) >= 2 ? "medium" as const : "low" as const,
      tooltip: "The average change in risk scores compared to Q4 2025. A positive value means risk is increasing quarter over quarter; negative means it's decreasing.",
    },
  ];
}
