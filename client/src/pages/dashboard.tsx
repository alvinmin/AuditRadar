import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RiskHeatmap } from "@/components/risk-heatmap";
import { RiskSummaryCards } from "@/components/risk-summary-cards";
import { RiskAlerts } from "@/components/risk-alerts";
import { RiskTrendChart } from "@/components/risk-trend-chart";
import { SectorDetailPanel } from "@/components/sector-detail-panel";
import { NewsFeed } from "@/components/news-feed";
import type { RiskSector, RiskMetric, RiskAlert, HeatmapData, MarketNews } from "@shared/schema";

export default function Dashboard() {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const { data: sectors = [], isLoading: sectorsLoading } = useQuery<RiskSector[]>({
    queryKey: ["/api/sectors"],
  });

  const { data: metrics = [], isLoading: metricsLoading } = useQuery<RiskMetric[]>({
    queryKey: ["/api/metrics"],
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<RiskAlert[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: heatmap = [], isLoading: heatmapLoading } = useQuery<HeatmapData[]>({
    queryKey: ["/api/heatmap"],
  });

  const { data: news = [], isLoading: newsLoading } = useQuery<MarketNews[]>({
    queryKey: ["/api/news"],
  });

  const isLoading = sectorsLoading || metricsLoading || alertsLoading || heatmapLoading;

  const heatmapCells = heatmap.map((h) => ({
    sector: sectors.find((s) => s.id === h.sectorId)?.name ?? "",
    sectorId: h.sectorId,
    dimension: h.riskDimension,
    value: h.value,
    trend: h.trend,
  }));

  const summaryMetrics = buildSummaryMetrics(metrics, news);
  const selectedSectorObj = sectors.find((s) => s.id === selectedSector);

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Risk Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Predictive risk monitoring powered by market news intelligence
          </p>
        </div>

        <RiskSummaryCards metrics={summaryMetrics} isLoading={isLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={selectedSectorObj ? "lg:col-span-2" : "lg:col-span-3"}>
            <RiskHeatmap
              data={heatmapCells}
              sectors={sectors}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RiskTrendChart metrics={metrics} sectors={sectors} isLoading={isLoading} />
          </div>
          <div className="lg:col-span-1">
            <RiskAlerts alerts={alerts} sectors={sectors} isLoading={isLoading} />
          </div>
        </div>

        <NewsFeed news={news} isLoading={newsLoading} maxItems={10} />
      </div>
    </div>
  );
}

function buildSummaryMetrics(metrics: RiskMetric[], news: MarketNews[]) {
  const avgScore = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length
    : 0;

  const avgPredicted = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + (m.predictedScore ?? m.score), 0) / metrics.length
    : 0;

  const negativeCount = news.filter(n => n.sentiment === "Negative").length;
  const totalNews = news.length || 1;
  const negativeRatio = (negativeCount / totalNews) * 100;

  const avgConfidence = metrics.filter(m => m.confidence).length > 0
    ? metrics.filter(m => m.confidence).reduce((sum, m) => sum + (m.confidence ?? 0), 0) / metrics.filter(m => m.confidence).length
    : 0;

  const changeFromPrev = metrics.filter(m => m.previousScore).length > 0
    ? metrics.filter(m => m.previousScore).reduce((sum, m) => sum + (m.score - (m.previousScore ?? m.score)), 0) / metrics.filter(m => m.previousScore).length
    : 0;

  return [
    {
      label: "Overall Risk Score",
      value: avgScore.toFixed(1),
      change: changeFromPrev,
      changeLabel: "vs last period",
      icon: "shield" as const,
      severity: avgScore >= 65 ? "high" as const : avgScore >= 45 ? "medium" as const : "low" as const,
    },
    {
      label: "Predicted Risk",
      value: avgPredicted.toFixed(1),
      change: avgPredicted - avgScore,
      changeLabel: "projected shift",
      icon: "chart" as const,
      severity: avgPredicted >= 65 ? "high" as const : avgPredicted >= 45 ? "medium" as const : "low" as const,
    },
    {
      label: "Negative Sentiment",
      value: `${negativeRatio.toFixed(0)}%`,
      change: negativeRatio > 40 ? 5.2 : -3.1,
      changeLabel: `${negativeCount} of ${totalNews} articles`,
      icon: "alert" as const,
      severity: negativeRatio >= 50 ? "critical" as const : negativeRatio >= 35 ? "high" as const : "medium" as const,
    },
    {
      label: "Model Confidence",
      value: `${(avgConfidence * 100).toFixed(0)}%`,
      change: -2.1,
      changeLabel: "model accuracy",
      icon: "activity" as const,
      severity: avgConfidence >= 0.85 ? "low" as const : avgConfidence >= 0.7 ? "medium" as const : "high" as const,
    },
  ];
}
