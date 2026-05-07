import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Sparkles,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
  Clock,
  Loader2,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface Insight {
  id: string | number;
  type: "recommendation" | "alert" | "opportunity" | "success" | "risk";
  title: string;
  description: string;
  impact: string;
  category: string;
  aiConfidence: number;
}

export default function AIInsights() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCandidateId = searchParams.get("candidateId");
  const [candidate, setCandidate] = useState<any>(null);
  const [candidateInsights, setCandidateInsights] = useState<Insight[]>([]);
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
        // Fetch insights for this candidate
        try {
          const res = await api.explainScore(found.id);
          if (res.success) {
            const mapped: Insight[] = [
              {
                id: "ex1",
                type: "recommendation",
                title: "Gemini Fit Analysis",
                description: res.explanation,
                impact: "High",
                category: "Core Fit",
                aiConfidence: 95
              },
              ...res.strengths.map((s: string, i: number) => ({
                id: `str${i}`,
                type: "success" as const,
                title: "Candidate Strength",
                description: s,
                impact: "Positive",
                category: "Skills",
                aiConfidence: 88
              })),
              ...res.concerns.map((c: string, i: number) => ({
                id: `con${i}`,
                type: "risk" as const,
                title: "Potential Area of Concern",
                description: c,
                impact: "Medium",
                category: "Gaps",
                aiConfidence: 85
              }))
            ];
            setCandidateInsights(mapped);
          }
        } catch (err) {
          console.error("Failed to fetch candidate explanation", err);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: Insight["type"]) => {
    switch (type) {
      case "recommendation":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "alert":
        return "bg-red-100 text-red-700 border-red-200";
      case "opportunity":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "success":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "risk":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getTypeIcon = (type: Insight["type"]) => {
    switch (type) {
      case "recommendation":
        return <Lightbulb className="h-4 w-4" />;
      case "alert":
        return <AlertTriangle className="h-4 w-4" />;
      case "opportunity":
        return <Target className="h-4 w-4" />;
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      case "risk":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <MainLayout
      title={candidate ? `AI Insights: ${candidate.first_name} ${candidate.last_name}` : "AI Insights Hub"}
      subtitle={candidate ? `AI-powered analysis for ${candidate.first_name}` : "Gemini-powered recommendations and analysis"}
    >
      <div className="space-y-6">
        {/* Header Stats */}
        {!candidate && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl gradient-ai font-bold">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">28</div>
                    <p className="text-xs font-medium text-slate-500">System Insights</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-emerald-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">15%</div>
                    <p className="text-xs font-medium text-slate-500">Hiring Velocity Incr.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">92%</div>
                    <p className="text-xs font-medium text-slate-500">AI Rec. Accuracy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-purple-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">84</div>
                    <p className="text-xs font-medium text-slate-500">Candidates Matched</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 bg-white rounded-3xl shadow-sm border border-slate-100">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-slate-500 font-bold">Consulting Gemini Insights...</p>
          </div>
        ) : candidate ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
              <div>
                <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                  <Brain className="h-6 w-6 text-primary" />
                  Insights for {candidate.first_name} {candidate.last_name}
                </h2>
                <p className="text-slate-500 text-sm mt-1">AI-generated analysis based on current profile data</p>
              </div>
              <Button onClick={() => loadCandidate()} className="gradient-ai text-white font-bold h-11 px-6 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                <Sparkles className="mr-2 h-4 w-4" /> Regenerate Analysis
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidateInsights.map((insight) => (
                <Card key={insight.id} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <Badge
                      variant="outline"
                      className={cn("flex items-center gap-1.5 px-3 py-1 font-bold h-7", getTypeColor(insight.type))}
                    >
                      {getTypeIcon(insight.type)}
                      <span className="uppercase tracking-widest text-[10px]">{insight.type}</span>
                    </Badge>
                    <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span>{insight.aiConfidence}% AI</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-lg font-bold mb-2 text-slate-800">{insight.title}</CardTitle>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                      {insight.description}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Impact</span>
                        <span className="text-xs font-black text-slate-700">{insight.impact}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</span>
                        <span className="text-xs font-black text-slate-700">{insight.category}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-24 bg-white rounded-3xl shadow-sm border border-slate-100 text-center">
            <div className="p-6 rounded-full bg-primary/5 mb-6">
              <Search className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">No Active Intelligence Session</h3>
            <p className="text-slate-500 max-w-sm font-medium mb-8">
              Select a candidate from your dashboard to view personalized AI insights and strategic hiring recommendations.
            </p>
            <div className="flex gap-4">
              <Button className="font-bold px-8 h-12 rounded-xl gradient-ai text-white">View Candidates</Button>
              <Button variant="outline" className="font-bold px-8 h-12 rounded-xl border-slate-200">System Activity</Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout >
  );
}
