import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, Shield, BarChart3 } from "lucide-react";

interface SummaryMetric {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: "shield" | "chart";
  severity: "low" | "medium" | "high" | "critical";
  tooltip: string;
}

interface RiskSummaryCardsProps {
  metrics: SummaryMetric[];
  isLoading?: boolean;
}

const iconMap = {
  shield: Shield,
  chart: BarChart3,
};

const severityStyles = {
  low: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  high: "text-orange-600 dark:text-orange-400",
  critical: "text-red-600 dark:text-red-400",
};

const severityBg = {
  low: "bg-emerald-100/80 dark:bg-emerald-950/40",
  medium: "bg-amber-100/80 dark:bg-amber-950/40",
  high: "bg-orange-100/80 dark:bg-orange-950/40",
  critical: "bg-red-100/80 dark:bg-red-950/40",
};

export function RiskSummaryCards({ metrics, isLoading }: RiskSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-8 w-8 bg-muted rounded-md" />
              </div>
              <div className="h-8 w-20 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {metrics.map((metric) => {
        const Icon = iconMap[metric.icon];
        const isPositive = metric.change > 0.5;
        const isNegative = metric.change < -0.5;
        const isNeutral = !isPositive && !isNegative;

        return (
          <Tooltip key={metric.label}>
            <TooltipTrigger asChild>
              <Card
                className="p-4 hover-elevate cursor-default transition-shadow hover:shadow-lg"
                data-testid={`card-summary-${metric.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm text-muted-foreground font-medium">{metric.label}</span>
                  <div className={`p-1.5 rounded-md ${severityBg[metric.severity]}`}>
                    <Icon className={`w-4 h-4 ${severityStyles[metric.severity]}`} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className={`text-3xl font-bold tracking-tight ${severityStyles[metric.severity]}`}>
                    {metric.value}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isPositive && <TrendingUp className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />}
                  {isNegative && <TrendingDown className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />}
                  {isNeutral && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span className={`text-xs font-medium ${isPositive ? "text-red-500 dark:text-red-400" : isNegative ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {isPositive ? "+" : ""}{metric.change.toFixed(1)} pts
                  </span>
                  <span className="text-xs text-muted-foreground">{metric.changeLabel}</span>
                </div>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[280px] text-xs p-3" data-testid={`tooltip-${metric.label.toLowerCase().replace(/\s+/g, '-')}`}>
              {metric.tooltip}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
