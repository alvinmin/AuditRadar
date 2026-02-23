import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, AlertCircle, Info, Clock, Filter, Bell } from "lucide-react";
import { useState } from "react";
import type { RiskAlert, RiskSector } from "@shared/schema";

function formatTimeAgo(timestamp: string | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const severityConfig: Record<string, { icon: typeof AlertTriangle; bgColor: string; textColor: string; label: string; badgeVariant: "destructive" | "default" | "secondary" }> = {
  critical: {
    icon: AlertTriangle,
    bgColor: "bg-red-100/80 dark:bg-red-950/40",
    textColor: "text-red-600 dark:text-red-400",
    label: "Critical",
    badgeVariant: "destructive",
  },
  high: {
    icon: AlertCircle,
    bgColor: "bg-orange-100/80 dark:bg-orange-950/40",
    textColor: "text-orange-600 dark:text-orange-400",
    label: "High",
    badgeVariant: "default",
  },
  medium: {
    icon: Info,
    bgColor: "bg-amber-100/80 dark:bg-amber-950/40",
    textColor: "text-amber-600 dark:text-amber-400",
    label: "Medium",
    badgeVariant: "secondary",
  },
  low: {
    icon: Info,
    bgColor: "bg-emerald-100/80 dark:bg-emerald-950/40",
    textColor: "text-emerald-600 dark:text-emerald-400",
    label: "Low",
    badgeVariant: "secondary",
  },
};

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<RiskAlert[]>({ queryKey: ["/api/alerts"] });
  const { data: sectors = [] } = useQuery<RiskSector[]>({ queryKey: ["/api/sectors"] });

  const getSectorName = (sectorId: string) => sectors.find(s => s.id === sectorId)?.name ?? "Unknown";

  const filteredAlerts = severityFilter === "all"
    ? alerts
    : alerts.filter(a => a.severity === severityFilter);

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity as keyof typeof order] ?? 4) - (order[b.severity as keyof typeof order] ?? 4);
  });

  const counts = {
    critical: alerts.filter(a => a.severity === "critical").length,
    high: alerts.filter(a => a.severity === "high").length,
    medium: alerts.filter(a => a.severity === "medium").length,
    low: alerts.filter(a => a.severity === "low").length,
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-alerts-page-title">Risk Alerts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Monitor and manage active risk notifications
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
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["critical", "high", "medium", "low"] as const).map((sev) => {
            const config = severityConfig[sev];
            return (
              <Card
                key={sev}
                className={`p-3 cursor-pointer transition-all ${severityFilter === sev ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSeverityFilter(severityFilter === sev ? "all" : sev)}
                data-testid={`filter-card-${sev}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs text-muted-foreground font-medium">{config.label}</span>
                  <div className={`p-1 rounded-md ${config.bgColor}`}>
                    <config.icon className={`w-3.5 h-3.5 ${config.textColor}`} />
                  </div>
                </div>
                <span className={`text-2xl font-bold ${config.textColor}`}>{counts[sev]}</span>
              </Card>
            );
          })}
        </div>

        <div className="space-y-2">
          {alertsLoading ? (
            [...Array(5)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="animate-pulse flex gap-4">
                  <div className="w-10 h-10 bg-muted rounded-md shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 bg-muted rounded" />
                    <div className="h-3 w-full bg-muted rounded" />
                    <div className="h-3 w-1/3 bg-muted rounded" />
                  </div>
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
              const config = severityConfig[alert.severity] || severityConfig.low;
              const Icon = config.icon;

              return (
                <Card key={alert.id} className="p-4 hover-elevate" data-testid={`alert-card-${alert.id}`}>
                  <div className="flex gap-4">
                    <div className={`p-2 rounded-md shrink-0 h-fit ${config.bgColor}`}>
                      <Icon className={`w-5 h-5 ${config.textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold">{alert.title}</span>
                        <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0">{config.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="font-medium">{getSectorName(alert.sectorId)}</span>
                        {alert.metricType && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{alert.metricType}</Badge>
                        )}
                        <span className="flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(alert.timestamp)}
                        </span>
                      </div>
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
