import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingDown, TrendingUp, Clock, Users, Briefcase, Sparkles, Loader2, Search, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export default function CostIntelligence() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCandidateId = searchParams.get("candidateId");
  const [candidate, setCandidate] = useState<any>(null);
  const [costData, setCostData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlCandidateId) {
      loadCandidate();
    }
  }, [urlCandidateId]);

  const loadCandidate = async () => {
    try {
      setLoading(true);
      const data = await api.getCandidates();
      const found = data.find((c: any) => c.id.toString() === urlCandidateId);
      if (found) {
        setCandidate(found);
        const result = await api.getCostIntelligence(found.id);
        setCostData(result.content);
        setSearchParams({}, { replace: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const defaultMetrics = [
    { label: "Avg. Cost per Hire", value: "$4,250", change: -12, trend: "down" },
    { label: "Time to Hire", value: "28 days", change: -8, trend: "down" },
    { label: "Source Efficiency", value: "LinkedIn", change: 15, trend: "up" },
    { label: "Offer Acceptance", value: "85%", change: 5, trend: "up" },
  ];

  return (
    <MainLayout
      title={candidate ? `Cost Intelligence: ${candidate.first_name} ${candidate.last_name}` : "Hiring Cost Intelligence"}
      subtitle={candidate ? `AI-powered cost analysis for ${candidate.first_name}` : "AI-powered cost analysis and optimization"}
    >
      <div className="space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-24 bg-white rounded-3xl shadow-md border border-slate-100">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-slate-500 font-black">Calculating ROI Analysis...</p>
          </div>
        )}

        {/* Candidate Specific View */}
        {!loading && candidate && costData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Card className="border-none shadow-sm bg-emerald-50">
                <CardContent className="pt-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block mb-1">Estimated Annual Salary</span>
                  <div className="text-3xl font-black text-emerald-900">${costData.estimated_salary?.toLocaleString() || "0"}</div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-blue-50">
                <CardContent className="pt-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 block mb-1">Total First-Year Investment</span>
                  <div className="text-3xl font-black text-blue-900">${costData.total_investment?.toLocaleString() || "0"}</div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-purple-50">
                <CardContent className="pt-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 block mb-1">Target ROI</span>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-black text-purple-900">{costData.roi_percentage}%</div>
                    <Badge className="bg-purple-600 text-white border-none">{costData.roi_level}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm h-full bg-white">
                <CardHeader className="border-b border-slate-50">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Strategic Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-slate-600 leading-relaxed font-medium">
                    {costData.ai_analysis}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm h-full bg-white">
                <CardHeader className="border-b border-slate-50">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-emerald-500" />
                    Optimization Strategies
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    {costData.cost_tips?.map((tip: string, idx: number) => (
                      <li key={idx} className="flex gap-3 text-sm text-slate-600 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                          {idx + 1}
                        </div>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Error/Partial State (Candidate found but no data) */}
        {!loading && candidate && !costData && (
          <div className="flex flex-col items-center justify-center p-24 text-center bg-white rounded-3xl border border-slate-100">
            <div className="p-4 bg-amber-50 text-amber-500 rounded-full mb-4">
              <DollarSign className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Analysis Unavailable</h3>
            <p className="text-muted-foreground max-w-sm mt-2 mb-6">
              We successfully retrieved the candidate profile but could not generate the cost intelligence data at this time.
            </p>
            <Button variant="outline" onClick={() => setCandidate(null)}>
              Return to Overview
            </Button>
          </div>
        )}

        {/* Default View (If no candidate selected) */}
        {!loading && !candidate && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {defaultMetrics.map((metric, idx) => (
                <Card key={idx} className="border-none shadow-sm transition-all hover:shadow-md bg-white">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{metric.label}</p>
                        <div className="text-2xl font-black mt-1 text-slate-800">{metric.value}</div>
                      </div>
                      <div
                        className={cn(
                          "flex items-center px-2 py-1 rounded-full text-[10px] font-bold",
                          metric.trend === "down"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        )}
                      >
                        {metric.trend === "down" ? (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        )}
                        {metric.change}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col items-center justify-center p-24 bg-white rounded-3xl shadow-sm border border-slate-100 text-center">
              <div className="p-6 rounded-full bg-primary/5 mb-6">
                <Search className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">ROI Intelligence Base</h3>
              <p className="text-slate-500 max-w-sm font-medium mb-8">
                The dashboard is currently showing system-wide benchmarks. To see candidate-specific hiring ROI, select a candidate from your list.
              </p>
              <Button className="font-bold px-8 h-12 rounded-xl gradient-ai text-white">Select Candidate</Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
