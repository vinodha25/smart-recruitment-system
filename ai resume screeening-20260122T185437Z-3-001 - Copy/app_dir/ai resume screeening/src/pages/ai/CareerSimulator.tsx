import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Compass, ArrowRight, Clock, TrendingUp, Award, Sparkles, Users, Plus, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface CareerPathStep {
  title: string;
  probability: number;
  timeline: string;
  skills: string[];
  salary: string;
}

interface CareerSimulation {
  id: number;
  candidate: string;
  candidateId: string;
  currentRole: string;
  paths: CareerPathStep[];
}

export default function CareerSimulator() {
  const [careerPaths, setCareerPaths] = useState<CareerSimulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [open, setOpen] = useState(false);
  const [newSim, setNewSim] = useState({
    candidate: "",
    candidateId: "",
    currentRole: "",
    updates: ""
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
          const defaultRole = "Software Engineer";
          setNewSim(prev => ({
            ...prev,
            candidate: name,
            candidateId: urlCandidateId,
            currentRole: defaultRole
          }));
          setSearchParams({}, { replace: true });
          setOpen(true);
          // handleRunSimulation(urlCandidateId, name, defaultRole);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async (forceId?: string, forceName?: string, forceRole?: string) => {
    const idToUse = forceId || newSim.candidateId;
    const nameToUse = forceName || newSim.candidate;
    const roleToUse = forceRole || newSim.currentRole;

    if (!idToUse) {
      toast({ title: "Error", description: "Please select a candidate first.", variant: "destructive" });
      return;
    }

    try {
      setGenerating(true);
      const result = await api.careerSimulation(parseInt(idToUse), roleToUse, newSim.updates);

      const newSimulation: CareerSimulation = {
        id: Date.now(),
        candidateId: idToUse,
        candidate: nameToUse,
        currentRole: roleToUse || "Software Engineer",
        paths: (result.career_paths || result.career_path || []).map((step: any) => ({
          title: step.title || step.role,
          probability: step.probability || 75,
          timeline: step.timeline || step.year || "2 years",
          skills: step.skills_needed || step.required_new_skills || [],
          salary: step.salary_increase || "+20%"
        }))
      };

      setCareerPaths(prev => [newSimulation, ...prev]);
      setOpen(false);
      toast({ title: "Simulation Complete", description: `Career trajectory projected for ${nameToUse}.` });

      if (!forceId) {
        setNewSim({ candidate: "", candidateId: "", currentRole: "", updates: "" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to run career simulation.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Career Simulator" subtitle="Loading data...">
        <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Career Path Simulator" subtitle="AI-powered career trajectory predictions">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg gradient-ai">
                  <Compass className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{careerPaths.length}</div>
                  <p className="text-sm text-muted-foreground">Paths Simulated</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">84%</div>
                  <p className="text-sm text-muted-foreground">Accuracy Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Award className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">High</div>
                  <p className="text-sm text-muted-foreground">Growth Potential</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">6</div>
                  <p className="text-sm text-muted-foreground">Top Candidates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="font-bold">
                <Plus className="mr-2 h-4 w-4" /> Run New Simulation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Simulate Career Trajectory</DialogTitle>
                <DialogDescription>Project career paths using AI for any candidate.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Candidate ID</Label>
                  <Input
                    value={newSim.candidateId}
                    onChange={(e) => setNewSim({ ...newSim, candidateId: e.target.value })}
                    placeholder="Enter Candidate ID..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Role</Label>
                  <Input
                    value={newSim.currentRole}
                    onChange={(e) => setNewSim({ ...newSim, currentRole: e.target.value })}
                    placeholder="e.g. Software Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Growth Factors / Tech Updates</Label>
                  <Textarea
                    value={newSim.updates}
                    onChange={(e) => setNewSim({ ...newSim, updates: e.target.value })}
                    placeholder="e.g. Completed AWS Cert, interested in Management..."
                    className="min-h-[100px]"
                  />
                </div>
                <Button
                  className="w-full gradient-ai py-6 text-lg font-bold shadow-lg shadow-primary/20"
                  onClick={() => handleRunSimulation()}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                  {generating ? "Projecting Path..." : "Run Simulation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Career Simulation Results */}
        {careerPaths.length === 0 ? (
          <Card className="border-dashed border-2 bg-slate-50/50 p-12 flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-full bg-slate-100 mb-4">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Career Simulations Yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-2">
              Enter a candidate ID to project their growth or use the AI actions from the Candidates list.
            </p>
            <Button variant="outline" className="mt-6 font-bold" onClick={() => setOpen(true)}>
              Run Simulation
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {careerPaths.map((sim) => (
              <Card key={sim.id} className="border-none shadow-sm bg-white overflow-hidden group">
                <CardHeader className="bg-slate-50/30 border-b border-slate-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl font-bold">
                        <Sparkles className="h-5 w-5 text-primary" />
                        {sim.candidate}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">
                        Targeting: Lead / Architect roles from {sim.currentRole}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="font-bold border-slate-200" onClick={() => {
                      setNewSim({ ...newSim, candidate: sim.candidate, candidateId: sim.candidateId, currentRole: sim.currentRole });
                      setOpen(true);
                    }}>
                      Refine Factors
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-8">
                  <div className="relative pb-4">
                    {/* Vertical Link */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100" />

                    <div className="space-y-12">
                      {sim.paths.map((path, idx) => (
                        <div key={idx} className="relative flex gap-8">
                          {/* Visual Node */}
                          <div className="relative z-10 flex-shrink-0">
                            <div
                              className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${idx === 0
                                ? "gradient-ai text-white"
                                : "bg-white border-2 border-slate-100 text-slate-800"
                                }`}
                            >
                              <span className="text-xs font-bold uppercase tracking-tighter opacity-70">Fit</span>
                              <span className="text-base font-black">
                                {path.probability}%
                              </span>
                            </div>
                          </div>

                          {/* Info Card */}
                          <div className="flex-1 p-6 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:border-primary/20 transition-all">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="font-bold text-xl text-slate-800">{path.title}</h4>
                                <div className="flex items-center gap-4 text-sm font-medium text-slate-500 mt-2">
                                  <span className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-slate-100">
                                    <Clock className="h-3.5 w-3.5" />
                                    {path.timeline}
                                  </span>
                                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    {path.salary}
                                  </span>
                                </div>
                              </div>
                              <Badge
                                className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-none",
                                  path.probability >= 80
                                    ? "bg-emerald-500 text-white"
                                    : "bg-amber-500 text-white"
                                )}
                              >
                                {path.probability >= 80
                                  ? "High Probability"
                                  : "Growth Target"}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {path.skills.map((skill, sidx) => (
                                <Badge key={sidx} variant="secondary" className="bg-white border-slate-200 text-slate-600 px-3 py-1 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <Button className="gradient-ai text-white px-8 h-12 font-bold rounded-xl shadow-lg shadow-primary/20">
                      <Compass className="h-4 w-4 mr-2" />
                      Generate Performance Roadmap
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
