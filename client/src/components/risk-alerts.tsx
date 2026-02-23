import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, AlertCircle, Info, Clock } from "lucide-react";
import type { RiskAlert, RiskSector } from "@shared/schema";

interface RiskAlertsProps {
  alerts: RiskAlert[];
  sectors: RiskSector[];
  isLoading?: boolean;
}

const severityConfig: Record<string, { icon: typeof AlertTriangle; label: string; badgeVariant: "destructive" | "default" | "secondary"; dotColor: string }> = {
  critical: {
    icon: AlertTriangle,
    label: "Critical",
    badgeVariant: "destructive",
    dotColor: "bg-red-500",
  },
  high: {
    icon: AlertCircle,
    label: "High",
    badgeVariant: "default",
    dotColor: "bg-orange-500",
  },
  medium: {
    icon: Info,
    label: "Medium",
    badgeVariant: "secondary",
    dotColor: "bg-amber-500",
  },
  low: {
    icon: Info,
    label: "Low",
    badgeVariant: "secondary",
    dotColor: "bg-emerald-500",
  },
};

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

export function RiskAlerts({ alerts, sectors, isLoading }: RiskAlertsProps) {
  const getSectorName = (sectorId: string) => {
    return sectors.find(s => s.id === sectorId)?.name ?? "Unknown";
  };

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-6">
        <h3 className="text-base font-semibold mb-4">Risk Alerts</h3>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3 p-3 rounded-md bg-muted/30">
              <div className="w-8 h-8 bg-muted rounded-md shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity as keyof typeof order] ?? 4) - (order[b.severity as keyof typeof order] ?? 4);
  });

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-base font-semibold" data-testid="text-alerts-title">Risk Alerts</h3>
        <Badge variant="secondary" className="text-xs">{alerts.length} active</Badge>
      </div>
      <ScrollArea className="h-[380px] pr-2">
        <div className="space-y-2">
          {sortedAlerts.map((alert) => {
            const config = severityConfig[alert.severity] || severityConfig.low;
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className="flex gap-3 p-3 rounded-md bg-muted/20 hover-elevate cursor-default transition-colors"
                data-testid={`alert-item-${alert.id}`}
              >
                <div className={`p-1.5 rounded-md shrink-0 h-fit ${
                  alert.severity === "critical" ? "bg-red-100/80 dark:bg-red-950/40" :
                  alert.severity === "high" ? "bg-orange-100/80 dark:bg-orange-950/40" :
                  alert.severity === "medium" ? "bg-amber-100/80 dark:bg-amber-950/40" :
                  "bg-emerald-100/80 dark:bg-emerald-950/40"
                }`}>
                  <Icon className={`w-4 h-4 ${
                    alert.severity === "critical" ? "text-red-600 dark:text-red-400" :
                    alert.severity === "high" ? "text-orange-600 dark:text-orange-400" :
                    alert.severity === "medium" ? "text-amber-600 dark:text-amber-400" :
                    "text-emerald-600 dark:text-emerald-400"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-medium truncate">{alert.title}</span>
                    <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0 shrink-0">
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{alert.description}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                    <span className="font-medium">{getSectorName(alert.sectorId)}</span>
                    {alert.metricType && (
                      <>
                        <span>-</span>
                        <span>{alert.metricType}</span>
                      </>
                    )}
                    <span className="flex items-center gap-0.5 ml-auto">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(alert.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {alerts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No active alerts
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
