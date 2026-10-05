import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, BookOpen, Clock, Target, Sparkles, ArrowRight, Plus, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface LearningGap {
  skill: string;
  current: number;
  target: number;
  courses: number;
  duration: string;
  description?: string;
}

interface LearningAnalysis {
  id: number;
  candidate: string;
  position: string;
  currentLevel: number;
  targetLevel: number;
  gaps: LearningGap[];
}

export default function LearningPaths() {
  const [skillGaps, setSkillGaps] = useState<LearningAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [open, setOpen] = useState(false);
  const [newPath, setNewPath] = useState({
    candidate: "",
    candidateId: "",
    currentRole: "",
    futureDemand: ""
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const urlCandidateId = searchParams.get("candidateId");
  const { toast } = useToast();

  useEffect(() => {
    loadCandidates();
  }, [urlCandidateId]);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const data = await api.getCandidates();

      if (urlCandidateId) {
        const candidate = data.find((c: any) => c.id.toString() === urlCandidateId);
        if (candidate) {
          const name = `${candidate.first_name} ${candidate.last_name}`;
          setNewPath(prev => ({
            ...prev,
            candidate: name,
            candidateId: urlCandidateId,
            currentRole: "Software Engineer"
          }));
          setSearchParams({}, { replace: true });
          setOpen(true);
          // handleGeneratePath(urlCandidateId, name); // Don't auto-run, just open dialog
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePath = async (forceId?: string, forceName?: string) => {
    const idToUse = forceId || newPath.candidateId;
    const nameToUse = forceName || newPath.candidate;

    if (!idToUse) {
      toast({ title: "Error", description: "No candidate selected.", variant: "destructive" });
      return;
    }

    try {
      setGenerating(true);
      const result = await api.recommendLearningPath(parseInt(idToUse));

      const newAnalysis: LearningAnalysis = {
        id: Date.now(),
        candidate: nameToUse,
        position: newPath.currentRole || "Software Engineer",
        currentLevel: 45, // AI doesn't return this yet, using placeholder
        targetLevel: 90,
        gaps: (result.content || []).map((item: any) => ({
          skill: item.skill,
          current: 30, // Random or derived if we had more info
          target: 85,
          courses: item.courses?.length || 0,
          duration: item.duration || "4 weeks",
          description: item.explanation
        }))
      };

      setSkillGaps(prev => [newAnalysis, ...prev]);
      setOpen(false);
      toast({ title: "Analysis Generated", description: `Learning path created for ${nameToUse}.` });

      if (!forceId) {
        setNewPath({ candidate: "", candidateId: "", currentRole: "", futureDemand: "" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to generate learning path.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Learning Paths" subtitle="Loading data...">
        <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Skill Gap → Learning Paths" subtitle="AI-generated personalized learning recommendations">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{skillGaps.length}</div>
                  <p className="text-xs font-medium text-slate-500">Active Paths</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-emerald-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">82%</div>
                  <p className="text-xs font-medium text-slate-500">Avg. Goal Match</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-purple-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">124</div>
                  <p className="text-xs font-medium text-slate-500">Resources recommended</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-orange-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">4.2</div>
                  <p className="text-xs font-medium text-slate-500">Avg. Weeks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#111827] hover:bg-[#111827]/90 text-white font-semibold shadow-md">
                <Plus className="mr-2 h-4 w-4" /> Generate New Path
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Generate AI Learning Path</DialogTitle>
                <DialogDescription>Create a custom learning plan based on candidate ID.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Candidate ID</Label>
                  <Input
                    value={newPath.candidateId}
                    onChange={(e) => setNewPath({ ...newPath, candidateId: e.target.value })}
                    placeholder="Enter Candidate ID..."
                    className="bg-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Candidate Name (Optional)</Label>
                  <Input
                    value={newPath.candidate}
                    onChange={(e) => setNewPath({ ...newPath, candidate: e.target.value })}
                    placeholder="Candidate Name"
                    className="bg-muted/30"
                  />
                </div>
                <Button
                  className="w-full gradient-ai py-6 text-lg font-bold shadow-lg shadow-primary/20"
                  onClick={() => handleGeneratePath()}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-5 w-5" />
                  )}
                  {generating ? "Generating..." : "Generate Path"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Skill Gap Analysis List */}
        {skillGaps.length === 0 ? (
          <Card className="border-dashed border-2 bg-slate-50/50 p-12 flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-full bg-slate-100 mb-4">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No AI Learning Paths Yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-2">
              Start by selecting a candidate from the Candidates list or use the button above to manually trigger an analysis.
            </p>
            <Button
              variant="outline"
              className="mt-6 font-bold"
              onClick={() => setOpen(true)}
            >
              Create First Path
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {skillGaps.map((analysis) => (
              <Card key={analysis.id} className="border-none shadow-sm overflow-hidden bg-white group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 bg-slate-50/30 border-b border-slate-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-slate-800">
                          {analysis.candidate}
                        </CardTitle>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">{analysis.position}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-medium">Progress:</span>
                          <span className="font-bold text-slate-800">{analysis.currentLevel}%</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-300" />
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-medium">Target:</span>
                          <Badge className="bg-cyan-500 text-white border-none px-2.5 py-0.5 font-bold">
                            {analysis.targetLevel}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {analysis.gaps.map((gap, idx) => (
                      <div key={idx} className="relative">
                        <div className="flex items-center justify-between mb-3 text-sm">
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-slate-800">{gap.skill}</h4>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                              {gap.courses} courses
                            </span>
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                              <Clock className="h-3 w-3" />
                              {gap.duration}
                            </span>
                          </div>
                          <Button size="sm" variant="ghost" className="h-8 text-slate-500 hover:text-primary font-bold">
                            View Resources
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter mb-1.5 px-0.5">
                            <span className="text-slate-400">Current: {gap.current}%</span>
                            <span className="text-slate-500">{gap.description ? gap.description : "Proficiency target analysis"}</span>
                            <span className="text-slate-400">Target: {gap.target}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                            <div
                              className="absolute top-0 left-0 h-full bg-emerald-500/20"
                              style={{ width: `${gap.target}%` }}
                            />
                            <div
                              className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all duration-1000"
                              style={{ width: `${gap.current}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 flex justify-end">
                    <Button className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold h-10 px-6 rounded-full shadow-lg shadow-cyan-500/20">
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Download PDF Learning Path
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
