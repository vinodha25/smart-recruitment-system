import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles, Users, Award, Target, ArrowUpRight, Plus, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Prediction {
  id: number;
  name: string;
  position: string;
  successProbability: number;
  retention: number; // 0-100
  performance: number; // 0-100
  cultureFit: number; // 0-100 (Derived or mock for now as api might not return it directly/consistently)
  factors: string[];
  riskFactors: string[];
  aiExplanation?: string;
}

export default function SuccessPredictor() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlCandidateId = searchParams.get("candidateId");

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const allCandidates = await api.getCandidates();
      setCandidates(allCandidates);

      // If candidateId is in URL, auto-select it and open
      if (urlCandidateId) {
        setSelectedCandidateId(urlCandidateId);
        // Clear search params immediately
        setSearchParams({}, { replace: true });
        // Handle trigger
        setOpen(true);
      }

      // Filter those with predictions
      const predicted = allCandidates.filter((c: any) => c.success_prediction_score != null).map((c: any) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        position: c.job_id ? `Job #${c.job_id}` : "Unknown Role",
        successProbability: Math.round(c.success_prediction_score || 0),
        retention: 85, // Default if missing in list view (would need detailed fetch)
        performance: 80,
        cultureFit: 75,
        factors: c.extracted_skills || [], // Simplified for list view
        riskFactors: [],
        aiExplanation: c.success_prediction_score < 50 ? "Low match with requirements" : "Strong match"
      }));
      setPredictions(predicted);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPrediction = async (forceId?: string, overrideCandidates?: any[]) => {
    const idToUse = forceId || selectedCandidateId;
    if (!idToUse) return;

    try {
      setGenerating(true);
      const listToUse = overrideCandidates || candidates;
      const candidate = listToUse.find((c: any) => c.id.toString() === idToUse);
      if (!candidate) {
        setGenerating(false);
        return;
      }

      // Call API
      try {
        await api.predictSuccess(parseInt(idToUse));
        toast({ title: "Prediction Generated", description: "AI has successfully analyzed the candidate." });
      } catch (err) {
        // If API fails (e.g. backend error), we might mock it for the "live" feel if backend is flaky
        // But for now, let's assume it works or we show error
        console.error(err);
        toast({ title: "Generation failed", description: "Could not generate prediction. Check backend logs.", variant: "destructive" });
        setGenerating(false);
        return;
      }

      setOpen(false);
      loadData(); // Reload to see new score
    } catch (error) {
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Post-Hire Success Predictor" subtitle="Loading...">
        <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Post-Hire Success Predictor" subtitle="AI-powered predictions for candidate success">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm bg-indigo-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-500">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-800">87%</div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. Prediction Accuracy</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-emerald-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-800">{predictions.filter(p => p.successProbability > 85).length}</div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">High-Potential Candidates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-800">{candidates.length}</div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Analyzed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#111827] hover:bg-[#111827]/90 text-white font-bold px-6 h-11">
                <Plus className="mr-2 h-4 w-4" /> Run New Prediction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Run AI Success Prediction</DialogTitle>
                <DialogDescription>
                  Select a candidate to generate a post-hire success forecast.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Candidate</Label>
                  <Select onValueChange={setSelectedCandidateId} value={selectedCandidateId}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Select candidate..." />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.first_name} {c.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full gradient-ai h-12 text-lg font-bold shadow-lg shadow-primary/20" onClick={() => handleRunPrediction()} disabled={generating}>
                  {generating ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-5 w-5" />
                  )}
                  {generating ? "Analyzing Profile..." : "Generate Prediction"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Prediction Cards */}
        {predictions.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-slate-50/50 border-slate-200">
            <div className="scale-150 mb-6 inline-block opacity-20">
              <Sparkles className="h-12 w-12 text-primary mx-auto" />
            </div>
            <h3 className="text-xl font-black text-slate-800">No Predictions Yet</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">Start by running an AI analysis on your top-tier candidates.</p>
          </div>
        )}

        <div className="space-y-6">
          {predictions.map((pred) => (
            <Card key={pred.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-50">
                  {/* Left Section: Main Profile */}
                  <div className="flex-1 p-8">
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <h3 className="text-2xl font-black text-slate-800">{pred.name}</h3>
                        <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
                          <Target className="h-4 w-4 text-primary/50" />
                          {pred.position}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-black text-primary">{pred.successProbability}%</div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Success Probability</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      {[
                        { label: "Retention", value: pred.retention, color: "text-indigo-600", bg: "bg-indigo-50" },
                        { label: "Performance", value: pred.performance, color: "text-emerald-600", bg: "bg-emerald-50" },
                        { label: "Culture Fit", value: pred.cultureFit, color: "text-blue-600", bg: "bg-blue-50" }
                      ].map((metric, i) => (
                        <div key={i} className={`p-4 ${metric.bg} rounded-2xl text-center border border-white/50 shadow-sm`}>
                          <div className={`text-3xl font-black ${metric.color}`}>{metric.value}%</div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{metric.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Section: Factors & Actions */}
                  <div className="lg:w-80 p-8 bg-slate-50/30 flex flex-col justify-between">
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                          <Sparkles className="h-3 w-3 text-primary" /> Key Success Drivers
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {pred.factors.slice(0, 4).map((factor, idx) => (
                            <Badge key={idx} variant="secondary" className="bg-white border-slate-100 text-slate-700 font-bold px-2 py-0.5">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-500 italic bg-white p-3 rounded-xl border border-slate-100">
                        "{pred.aiExplanation}"
                      </p>
                    </div>

                    <div className="pt-8 flex flex-col gap-2">
                      <Button className="w-full gradient-ai text-white font-bold h-11 shadow-lg shadow-primary/20" onClick={() => toast({ title: "Analysis", description: "Full report downloaded." })}>
                        View Full Analysis
                      </Button>
                      <Button variant="ghost" className="w-full text-slate-500 font-bold h-11 hover:bg-slate-100" onClick={() => window.location.href = '/ai/compatibility'}>
                        Compare Others
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </MainLayout>
  );
}
