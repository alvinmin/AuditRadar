import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, AlertCircle, Info, Filter, Bell, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { RiskAlert, RiskSector } from "@shared/schema";

const severityConfig: Record<string, { icon: typeof AlertTriangle; color: string; bgColor: string; textColor: string; barColor: string; label: string; badgeVariant: "destructive" | "default" | "secondary" }> = {
  critical: {
    icon: AlertTriangle,
    color: "#ef4444",
    bgColor: "bg-red-100/80 dark:bg-red-950/40",
    textColor: "text-red-600 dark:text-red-400",
    barColor: "bg-red-500",
    label: "Critical",
    badgeVariant: "destructive",
  },
  high: {
    icon: AlertCircle,
    color: "#f97316",
    bgColor: "bg-orange-100/80 dark:bg-orange-950/40",
    textColor: "text-orange-600 dark:text-orange-400",
    barColor: "bg-orange-500",
    label: "High",
    badgeVariant: "default",
  },
  medium: {
    icon: Info,
    color: "#eab308",
    bgColor: "bg-amber-100/80 dark:bg-amber-950/40",
    textColor: "text-amber-600 dark:text-amber-400",
    barColor: "bg-yellow-500",
    label: "Medium",
    badgeVariant: "secondary",
  },
};

function extractScoreChange(title: string): string {
  const match = title.match(/[+-]?\d+\.?\d*/);
  if (!match) return "+?";
  const val = parseFloat(match[0]);
  return val >= 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
}

function extractSectorName(title: string): string {
  const match = title.match(/^(.+?):\s/);
  return match ? match[1] : title;
}

function parseDrivers(description: string): Array<{ dim: string; total: string; details: string }> {
  const parts = description.split("Top drivers:")[1];
  if (!parts) return [];
  return parts.split("|").map(part => {
    const trimmed = part.trim();
    const dimMatch = trimmed.match(/^(\S+(?:\s\S+)?)\s*\(([^)]+)\)/);
    if (!dimMatch) return { dim: trimmed, total: "", details: trimmed };
    return {
      dim: dimMatch[1],
      total: dimMatch[2],
      details: trimmed.substring(dimMatch[0].length).replace(/^:\s*/, ""),
    };
  }).filter(d => d.dim);
}

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<RiskAlert[]>({ queryKey: ["/api/alerts"] });
  const { data: sectors = [] } = useQuery<RiskSector[]>({ queryKey: ["/api/sectors"] });

  const getSectorName = (sectorId: string) => sectors.find(s => s.id === sectorId)?.name ?? "Unknown";

  const filteredAlerts = severityFilter === "all"
    ? alerts
    : alerts.filter(a => a.severity === severityFilter);

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 };
    return (order[a.severity as keyof typeof order] ?? 3) - (order[b.severity as keyof typeof order] ?? 3);
  });

  const counts = {
    critical: alerts.filter(a => a.severity === "critical").length,
    high: alerts.filter(a => a.severity === "high").length,
    medium: alerts.filter(a => a.severity === "medium").length,
  };

  const donutData = [
    { name: "Critical", value: counts.critical, color: "#ef4444" },
    { name: "High", value: counts.high, color: "#f97316" },
    { name: "Medium", value: counts.medium, color: "#eab308" },
  ].filter(d => d.value > 0);

  const totalAlerts = alerts.length;

  const toggleExpanded = (id: string) => {
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-alerts-page-title">Risk Alerts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Active risk notifications by severity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-severity-filter">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center justify-center" data-testid="donut-chart-card">
            <div className="relative w-[180px] h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" data-testid="text-total-alerts">{totalAlerts}</span>
                <span className="text-xs text-muted-foreground">Total Alerts</span>
              </div>
            </div>
          </Card>

          {(["critical", "high", "medium"] as const).map((sev) => {
            const config = severityConfig[sev];
            const Icon = config.icon;
            return (
              <Card
                key={sev}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${severityFilter === sev ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSeverityFilter(severityFilter === sev ? "all" : sev)}
                data-testid={`filter-card-${sev}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${config.bgColor}`}>
                    <Icon className={`w-5 h-5 ${config.textColor}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{config.label}</p>
                    <p className={`text-3xl font-bold ${config.textColor}`} data-testid={`text-count-${sev}`}>{counts[sev]}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="space-y-2">
          {alertsLoading ? (
            [...Array(5)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="animate-pulse flex gap-4">
                  <div className="w-1.5 h-14 bg-muted rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-muted rounded" />
                    <div className="h-3 w-1/4 bg-muted rounded" />
                  </div>
                  <div className="w-16 h-10 bg-muted rounded" />
                </div>
              </Card>
            ))
          ) : sortedAlerts.length === 0 ? (
            <Card className="p-8">
              <div className="text-center space-y-2">
                <Bell className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No alerts matching your filter</p>
              </div>
            </Card>
          ) : (
            sortedAlerts.map((alert) => {
              const config = severityConfig[alert.severity] || severityConfig.medium;
              const isExpanded = expandedAlerts.has(alert.id);
              const scoreChange = extractScoreChange(alert.title);
              const drivers = parseDrivers(alert.description || "");

              return (
                <Card
                  key={alert.id}
                  className="overflow-hidden transition-all hover:shadow-md"
                  data-testid={`alert-card-${alert.id}`}
                >
                  <div className="flex">
                    <div className={`w-1.5 shrink-0 ${config.barColor}`} />
                    <div className="flex-1 p-3 sm:p-4">
                      <button
                        className="w-full flex items-center gap-3 text-left"
                        onClick={() => toggleExpanded(alert.id)}
                        data-testid={`button-expand-${alert.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold truncate" data-testid={`text-sector-${alert.id}`}>
                              {getSectorName(alert.sectorId)}
                            </span>
                            <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0 shrink-0">
                              {config.label}
                            </Badge>
                          </div>
                          {alert.metricType && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Top dimension: {alert.metricType}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <div className={`text-lg font-bold ${config.textColor}`} data-testid={`text-change-${alert.id}`}>
                              {scoreChange}
                            </div>
                            <div className="text-[10px] text-muted-foreground">avg pts</div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {isExpanded && drivers.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2" data-testid={`drivers-${alert.id}`}>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Score Drivers
                          </p>
                          {drivers.map((driver, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="font-medium w-24 shrink-0">{driver.dim}</span>
                              <span className={`font-bold ${config.textColor} w-16 shrink-0`}>{driver.total}</span>
                              <span className="text-muted-foreground truncate">{driver.details}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
