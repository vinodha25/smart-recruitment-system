import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface InsightItem {
  title: string;
  description: string;
  action?: string;
}

interface AIInsightCardProps {
  insights: InsightItem[];
}

export function AIInsightCard({ insights }: AIInsightCardProps) {
  return (
    <Card className="border-0 shadow-ai gradient-ai overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-white font-display">
          <div className="ai-pulse">
            <Sparkles className="h-5 w-5" />
          </div>
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="rounded-lg bg-white/10 backdrop-blur-sm p-4 slide-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <h4 className="font-medium text-white">{insight.title}</h4>
            <p className="mt-1 text-sm text-white/80">{insight.description}</p>
            {insight.action && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-white hover:bg-white/20 p-0 h-auto font-medium"
              >
                {insight.action}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
