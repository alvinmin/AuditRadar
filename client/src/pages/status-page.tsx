import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, FileText, Newspaper, AlertTriangle, CheckCircle2, BarChart3, Shield } from "lucide-react";
import type { RiskSector, RiskMetric, RiskAlert, HeatmapData, MarketNews } from "@shared/schema";

function StatusIndicator({ status }: { status: "ok" | "loading" | "error" }) {
  if (status === "loading") {
    return <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />;
  }
  if (status === "error") {
    return <div className="w-2.5 h-2.5 rounded-full bg-red-500" />;
  }
  return <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />;
}

export default function StatusPage() {
  const { data: sectors = [], isLoading: sl, isError: se } = useQuery<RiskSector[]>({ queryKey: ["/api/sectors"] });
  const { data: metrics = [], isLoading: ml, isError: me } = useQuery<RiskMetric[]>({ queryKey: ["/api/metrics"] });
  const { data: alerts = [], isLoading: al, isError: ae } = useQuery<RiskAlert[]>({ queryKey: ["/api/alerts"] });
  const { data: heatmap = [], isLoading: hl, isError: he } = useQuery<HeatmapData[]>({ queryKey: ["/api/heatmap"] });
  const { data: news = [], isLoading: nl, isError: ne } = useQuery<MarketNews[]>({ queryKey: ["/api/news"] });

  const anyLoading = sl || ml || al || hl || nl;
  const anyError = se || me || ae || he || ne;
  const overallStatus = anyLoading ? "loading" : anyError ? "error" : "ok";

  const dataSources = [
    {
      name: "Auditable Units",
      icon: Shield,
      count: sectors.length,
      expected: 28,
      status: sl ? "loading" : se ? "error" : "ok",
      detail: `${sectors.length} of 28 units loaded`,
    },
    {
      name: "Risk Metrics",
      icon: BarChart3,
      count: metrics.length,
      expected: 196,
      status: ml ? "loading" : me ? "error" : "ok",
      detail: `${metrics.length} of 196 metrics (28×7)`,
    },
    {
      name: "Heatmap Data",
      icon: Database,
      count: heatmap.length,
      expected: 196,
      status: hl ? "loading" : he ? "error" : "ok",
      detail: `${heatmap.length} of 196 cells`,
    },
    {
      name: "Risk Alerts",
      icon: AlertTriangle,
      count: alerts.length,
      expected: null,
      status: al ? "loading" : ae ? "error" : "ok",
      detail: `${alerts.length} active alerts`,
    },
    {
      name: "Market News",
      icon: Newspaper,
      count: news.length,
      expected: 20,
      status: nl ? "loading" : ne ? "error" : "ok",
      detail: `${news.length} of 20 articles loaded`,
    },
  ] as const;

  const dimensions = Array.from(new Set(metrics.map(m => m.metricType))).sort();
  const categories = Array.from(new Set(sectors.map(s => s.category))).sort();
  const alertCounts = {
    critical: alerts.filter(a => a.severity === "critical").length,
    high: alerts.filter(a => a.severity === "high").length,
    medium: alerts.filter(a => a.severity === "medium").length,
  };

  const avgScore = metrics.length > 0
    ? (metrics.reduce((s, m) => s + m.score, 0) / metrics.length).toFixed(1)
    : "—";

  const sentimentBreakdown = {
    negative: news.filter(n => n.sentiment === "Negative").length,
    neutral: news.filter(n => n.sentiment === "Neutral").length,
    positive: news.filter(n => n.sentiment === "Positive").length,
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">System Status</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Data pipeline health and scoring engine overview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusIndicator status={overallStatus as "ok" | "loading" | "error"} />
            <Badge
              variant={overallStatus === "ok" ? "default" : overallStatus === "error" ? "destructive" : "secondary"}
              className="text-xs"
              data-testid="badge-overall-status"
            >
              {overallStatus === "ok" ? "All Systems Operational" : overallStatus === "error" ? "Issues Detected" : "Loading..."}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {dataSources.map((source) => {
            const Icon = source.icon;
            const healthy = source.expected === null
              ? source.status === "ok"
              : source.count === source.expected && source.status === "ok";
            return (
              <Card key={source.name} className="p-4" data-testid={`card-source-${source.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${healthy ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                      <Icon className={`w-4 h-4 ${healthy ? "text-emerald-600" : "text-amber-600"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{source.name}</p>
                      <p className="text-xs text-muted-foreground">{source.detail}</p>
                    </div>
                  </div>
                  <StatusIndicator status={source.status as "ok" | "loading" | "error"} />
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4" data-testid="card-scoring-engine">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Scoring Engine</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Algorithm</span>
                <span className="font-medium">5-Component Predictive Scoring Model</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Component Weights</span>
                <span className="font-medium text-xs">QRA 30% | Control 25% | Issues 20% | Biz/Ext 15% | OpRisk 10%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">QoQ Comparison</span>
                <span className="font-medium">Q4 2025 → Q1 2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Risk Dimensions</span>
                <span className="font-medium">{dimensions.length} active (7×7 relevance matrix)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Average Risk Score</span>
                <span className="font-bold">{avgScore}/100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Auditable Units</span>
                <span className="font-medium">{sectors.length} units across {categories.length} categories</span>
              </div>
            </div>
          </Card>

          <Card className="p-4" data-testid="card-data-summary">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Data Summary</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Alert Breakdown</span>
                <div className="flex gap-1.5">
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{alertCounts.critical} Critical</Badge>
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">{alertCounts.high} High</Badge>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{alertCounts.medium} Medium</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">News Sentiment</span>
                <div className="flex gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600">{sentimentBreakdown.negative} Neg</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-600">{sentimentBreakdown.neutral} Neut</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">{sentimentBreakdown.positive} Pos</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Dimensions</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {dimensions.map(d => (
                    <Badge key={d} variant="outline" className="text-[10px] px-1.5 py-0">{d}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4" data-testid="card-data-sources">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Input Data Sources</h3>
          </div>
          <div className="space-y-2">
            {[
              { name: "Internal Audit Universe", file: "Internal_Audit_Universe_Auto_Scoring.xlsm", desc: "28 auditable units with 7 risk dimensions (1-5 scale) → Component 1: Qualitative Risk Assessment (30%)" },
              { name: "PRC Controls", file: "PRC_updated.xlsx", desc: "~200 controls with design & operating effectiveness → Component 2: Control Health Score (25%)" },
              { name: "Audit Issues", file: "Issue_details_no_quarter.xlsx", desc: "~999 issues with severity/status weighting → Component 3: Audit & Issue Trend Score (20%)" },
              { name: "Market News Articles", file: "Predictive_Audit_Market_News.xlsx (Sheet2)", desc: "20 articles with sentiment analysis → Component 4: Business & External Risk (15%)" },
              { name: "Regulatory Inputs", file: "Reg_inputs.xlsx", desc: "6 SEC/EU regulatory changes with directional impact → Component 4: Business & External Risk (15%)" },
              { name: "IT Incident Data", file: "Incident_data.xlsx", desc: "100 IT incidents with severity/priority mappings → Component 5: Operational Risk (10%)" },
              { name: "Predictive Heatmap Dataset", file: "predictive_heatmap_dataset.xlsx", desc: "28 units with pre-computed operational metrics & predictive scores → Component 5: Operational Risk (10%)" },
              { name: "Vendor–CVE Mappings", file: "Auditable_Units_Tech_Vendors_v2.xlsx + known_exploited_vulnerabilities.xlsx", desc: "28 units mapped to vendors; 1,526 CVEs with fuzzy matching → Component 5: Operational Risk (10%)" },
            ].map((src) => (
              <div key={src.name} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <span className="font-medium">{src.name}</span>
                  <p className="text-xs text-muted-foreground truncate">{src.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
