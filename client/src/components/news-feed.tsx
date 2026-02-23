import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Newspaper, TrendingDown, TrendingUp, Minus, Calendar } from "lucide-react";
import type { MarketNews } from "@shared/schema";

interface NewsFeedProps {
  news: MarketNews[];
  isLoading?: boolean;
  maxItems?: number;
}

const sentimentConfig: Record<string, { color: string; bg: string; icon: typeof TrendingUp }> = {
  Negative: { color: "text-red-600 dark:text-red-400", bg: "bg-red-100/80 dark:bg-red-950/40", icon: TrendingDown },
  Positive: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100/80 dark:bg-emerald-950/40", icon: TrendingUp },
  Neutral: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100/80 dark:bg-amber-950/40", icon: Minus },
};

const categoryColors: Record<string, string> = {
  Cyber: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  Regulatory: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  ESG: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  Corporate: "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
  Macro: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
};

export function NewsFeed({ news, isLoading, maxItems = 8 }: NewsFeedProps) {
  if (isLoading) {
    return (
      <Card className="p-4 sm:p-6">
        <h3 className="text-base font-semibold mb-4">Market Risk News</h3>
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

  const sorted = [...news].sort((a, b) => b.date.localeCompare(a.date)).slice(0, maxItems);

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-base font-semibold" data-testid="text-news-title">Market Risk News</h3>
        </div>
        <Badge variant="secondary" className="text-xs">{news.length} articles</Badge>
      </div>
      <ScrollArea className="h-[380px] pr-2">
        <div className="space-y-2">
          {sorted.map((article) => {
            const sentConf = sentimentConfig[article.sentiment] || sentimentConfig.Neutral;
            const SentIcon = sentConf.icon;
            const catColor = categoryColors[article.category] || categoryColors.Corporate;

            return (
              <div
                key={article.id}
                className="flex gap-3 p-3 rounded-md bg-muted/20 hover-elevate cursor-default transition-colors"
                data-testid={`news-item-${article.id}`}
              >
                <div className={`p-1.5 rounded-md shrink-0 h-fit ${sentConf.bg}`}>
                  <SentIcon className={`w-4 h-4 ${sentConf.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2 mb-1">{article.headline}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{article.articleSummary}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${catColor}`}>
                      {article.category}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {article.riskType}
                    </Badge>
                    <span className="font-medium">{article.sector}</span>
                    <span className="flex items-center gap-0.5 ml-auto">
                      <Calendar className="w-3 h-3" />
                      {article.date}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {news.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No news articles available
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
