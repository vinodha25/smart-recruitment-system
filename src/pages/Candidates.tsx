import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Sparkles,
  Mail,
  Phone,
  FileText,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Brain,
  Loader2,
  Download,
  MapPin,
  Clock,
  MoreHorizontal,
  Paperclip,
  Calendar,
  MessageSquare,
  User,
  Briefcase,
  TrendingUp,
  Users,
  BookOpen,
  Zap,
  GraduationCap,
  AlertCircle,
  XCircle,
  CheckCircle,
  Banknote
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { JobFilterPanel } from "@/components/JobFilterPanel";
import { useJobFilter } from "@/contexts/JobFilterContext";

// Base interface for list view
interface CandidateSummary {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string | null;
  matchScore: number;
  skills: string[];
  status: string;
  aiRecommendation: "accept" | "consider" | "reject" | "unknown";
  resumePath?: string;
  job_id: number;
}

// Extended interface for detail view
interface CandidateDetail extends CandidateSummary {
  location?: string;
  experience: string;
  aiExplanation: string;
  resumeText?: string;
  notes?: string;
  appliedAt: string;
  source?: string;
  education_match_score?: number;
  experience_match_score?: number;
  skill_match_score?: number;
  responsibility_match_score?: number;
  preferred_match_score?: number;
  bonus_score?: number;
  ats_score?: number;
  ats_breakdown?: Record<string, number>;
  success_prediction_score?: number;
  intern_experience_years?: number;
  work_experience_years?: number;
  work_history?: any[];
  internship_history?: any[];
  education?: any[];
  ai_analysis_json?: any;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  screening: "bg-purple-100 text-purple-700 border-purple-200",
  interview: "bg-orange-100 text-orange-700 border-orange-200",
  offer: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  hired: "bg-emerald-100 text-emerald-700 border-emerald-200",
  shortlisted: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

const recommendationColors = {
  accept: "text-green-600 bg-green-50 border-green-200",
  consider: "text-amber-600 bg-amber-50 border-amber-200",
  reject: "text-red-600 bg-red-50 border-red-200",
  unknown: "text-gray-600 bg-gray-50 border-gray-200",
};

export default function Candidates() {
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selection & Detail Logic
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [candidateDetail, setCandidateDetail] = useState<CandidateDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // AI Modules State
  const [aiModuleResult, setAiModuleResult] = useState<{ title: string, content: any, type: string } | null>(null);
  const [isAiModuleLoading, setIsAiModuleLoading] = useState(false);

  // Notes Logic
  const [newNote, setNewNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const [hrRuleOpen, setHrRuleOpen] = useState(false);
  const [hrRule, setHrRule] = useState("");
  const { toast } = useToast();
  const { selectedJobIds } = useJobFilter();

  const handleAiModule = async (moduleId: string, candidateId: number) => {
    try {
      setIsAiModuleLoading(true);
      let result;
      let title = "";
      let type = moduleId;

      switch (moduleId) {
        case 'predictor':
          title = "Success Prediction Analysis";
          result = await api.predictSuccess(candidateId);
          break;
        case 'learning':
          title = "Personalized Learning Path";
          result = await api.getLearningPath(candidateId);
          break;
        case 'fit':
          title = "Team Compatibility Analysis";
          result = await api.analyzeTeamFit(candidateId);
          break;
        case 'sim':
          title = "Career Progression Simulator";
          result = await api.careerSimulation(candidateId);
          break;
        case 'cost':
          title = "Cost & ROI Intelligence";
          result = await api.getCostIntelligence(candidateId);
          break;
        default:
          throw new Error("Unknown module");
      }

      setAiModuleResult({ title, content: result, type });
    } catch (error) {
      toast({
        title: "AI Module Error",
        description: "Failed to load AI module data. Ensure Gemini API key is configured.",
        variant: "destructive"
      });
    } finally {
      setIsAiModuleLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [selectedJobIds]);

  // Fetch full details when a candidate is selected
  useEffect(() => {
    if (selectedCandidateId) {
      loadCandidateDetail(selectedCandidateId);
    } else {
      setCandidateDetail(null);
    }
  }, [selectedCandidateId]);

  const handleScreen = async (id: number) => {
    try {
      toast({
        title: "AI Analysis Started",
        description: "Re-scanning resume and recalculating scores...",
      });
      await api.screenCandidate(id);
      toast({
        title: "Success",
        description: "AI Analysis complete.",
      });
      loadCandidateDetail(id);
      loadCandidates();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run AI analysis",
        variant: "destructive",
      });
    }
  };

  const loadCandidates = async () => {
    try {
      setLoading(true);

      const [jobsData, candidatesData] = await Promise.all([
        api.getJobs(),
        selectedJobIds.length > 0
          ? Promise.all(selectedJobIds.map(id => api.getCandidates(id))).then(res => res.flat())
          : api.getCandidates()
      ]);

      // Deduplicate candidates if multiple job selections returned same candidate (unlikely but safe)
      const uniqueCandidates = Array.from(new Map(candidatesData.map((c: any) => [c.id, c])).values());
      const jobsMap = new Map(jobsData.map((j: any) => [j.id, j.title]));

      const mappedCandidates: CandidateSummary[] = uniqueCandidates.map((c: any) => {
        let rec: CandidateSummary["aiRecommendation"] = "unknown";
        if (c.ai_recommendation === "recommended") rec = "accept";
        else if (c.ai_recommendation === "review") rec = "consider";
        else if (c.ai_recommendation === "not_recommended") rec = "reject";

        const jobTitle = c.job_id ? (jobsMap.get(c.job_id) || `Job #${c.job_id}`) : "General Application";

        return {
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          email: c.email,
          phone: c.phone || "N/A",
          role: String(jobTitle), // Explicit cast to string to satisfy interface
          matchScore: Math.round(c.ats_score || c.overall_score || 0),
          skills: c.extracted_skills || [],
          status: c.status || "new",
          aiRecommendation: rec,
          resumePath: c.resume_file_path,
          job_id: c.job_id
        };
      });

      setCandidates(mappedCandidates);
    } catch (error) {
      console.error("Failed to load candidates:", error);
      toast({
        title: "Error",
        description: "Failed to load candidates",
        variant: "destructive",
      });
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCandidateDetail = async (id: number) => {
    try {
      setLoadingDetail(true);
      const c = await api.getCandidate(id);

      let rec: CandidateDetail["aiRecommendation"] = "unknown";
      if (c.ai_recommendation === "recommended") rec = "accept";
      else if (c.ai_recommendation === "review") rec = "consider";
      else if (c.ai_recommendation === "not_recommended") rec = "reject";

      const detail: CandidateDetail = {
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        email: c.email,
        phone: c.phone || "N/A",
        location: c.location,
        role: c.job ? c.job.title : (c.job_id ? `Job #${c.job_id}` : "General Application"),
        matchScore: Math.round(c.ats_score || c.overall_score || 0),
        skills: c.extracted_skills || [],
        experience: c.experience_years ? `${c.experience_years} years` : "N/A",
        status: c.status || "new",
        aiRecommendation: rec,
        aiExplanation: c.ai_insight || "No AI insight generated yet.",
        resumePath: c.resume_file_path,
        resumeText: c.resume_text,
        notes: c.notes,
        appliedAt: c.applied_at || new Date().toISOString(),
        source: c.source || "Direct Apply",
        skill_match_score: c.skill_match_score,
        experience_match_score: c.experience_match_score,
        education_match_score: c.education_match_score,
        responsibility_match_score: c.responsibility_match_score,
        preferred_match_score: c.preferred_match_score,
        bonus_score: c.bonus_score,
        ats_score: c.ats_score,
        ats_breakdown: c.ats_breakdown,
        success_prediction_score: c.success_prediction_score,
        intern_experience_years: c.intern_experience_years,
        work_experience_years: c.work_experience_years,
        work_history: c.work_history || [],
        internship_history: c.internship_history || [],
        education: c.education || [],
        ai_analysis_json: c.ai_analysis_json,
        job_id: c.job_id
      };
      setCandidateDetail(detail);
    } catch (error) {
      console.error("Failed to load details:", error);
      toast({ title: "Error", description: "Could not load candidate details", variant: "destructive" });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownloadResume = async (candidateId: number, name: string) => {
    try {
      const blob = await api.downloadResume(candidateId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.replace(/\s+/g, "_")}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download resume",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await api.updateCandidateStatus(id, status);
      toast({
        title: "Success",
        description: `Candidate moved to ${status}`,
      });
      // Update local state
      setStatusFilter("all"); // Reset filter safely or keep it
      loadCandidates();
      if (candidateDetail) {
        setCandidateDetail({ ...candidateDetail, status });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleSaveNote = async () => {
    if (!candidateDetail || !newNote.trim()) return;

    try {
      setIsSavingNote(true);
      const updatedNotes = candidateDetail.notes
        ? `${candidateDetail.notes}\n\n[${new Date().toLocaleDateString()}]: ${newNote}`
        : `[${new Date().toLocaleDateString()}]: ${newNote}`;

      await api.updateCandidate(candidateDetail.id, { notes: updatedNotes });

      setCandidateDetail({ ...candidateDetail, notes: updatedNotes });
      setNewNote("");
      toast({ title: "Note Added", description: "Your note has been saved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save note", variant: "destructive" });
    } finally {
      setIsSavingNote(false);
    }
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (candidate.role && candidate.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      candidate.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || candidate.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats for match breakdown
  const getMatchBreakdown = (detail: CandidateDetail) => [
    { label: "Required Skills", value: detail.skill_match_score || 0, max: 35, icon: Brain },
    { label: "Experience", value: detail.experience_match_score || 0, max: 20, icon: Briefcase },
    { label: "Responsibilities", value: detail.responsibility_match_score || 0, max: 20, icon: Sparkles },
    { label: "Education", value: detail.education_match_score || 0, max: 10, icon: GraduationCap },
    { label: "Preferred Quals", value: detail.preferred_match_score || 0, max: 10, icon: ThumbsUp },
    { label: "Bonus Signals", value: detail.bonus_score || 0, max: 5, icon: Zap },
  ];

  return (
    <MainLayout title="Candidates" subtitle="Review and manage job applicants">
      <div className="space-y-6">
        {/* Job Filter Panel */}
        <JobFilterPanel />

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card p-4 rounded-lg border shadow-sm">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search candidates, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => setHrRuleOpen(true)}
            className="border-dashed"
          >
            <Filter className="mr-2 h-4 w-4" />
            AI Filter Rules
          </Button>
        </div>

        {/* Candidates List */}
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed text-lg">
            No candidates found matching your criteria
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredCandidates.map((candidate) => (
              <Card
                key={candidate.id}
                className="card-hover cursor-pointer group transition-all hover:shadow-md border-transparent hover:border-border"
                onClick={() => setSelectedCandidateId(candidate.id)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-10 w-10 border transition-transform group-hover:scale-105">
                    <AvatarFallback className="bg-primary/5 text-primary font-medium">
                      {candidate.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{candidate.name}</h3>
                      <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${statusColors[candidate.status]}`}>
                        {candidate.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {candidate.status === 'hired' ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <Users className="h-3 w-3" /> Team: {candidate.role}
                        </span>
                      ) : (
                        candidate.role
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground hidden sm:flex">
                    <div className="flex items-center gap-1.5" title="Match Score">
                      <div className={`h-2 w-2 rounded-full ${candidate.matchScore >= 75 ? 'bg-green-500' : candidate.matchScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <span className="font-medium text-foreground">{candidate.matchScore}%</span>
                    </div>
                    <div className="flex items-center gap-1" title="AI Status">
                      {candidate.aiRecommendation === 'accept' && <ThumbsUp className="h-3.5 w-3.5 text-green-600" />}
                      {candidate.aiRecommendation === 'consider' && <Brain className="h-3.5 w-3.5 text-amber-600" />}
                      {candidate.aiRecommendation === 'reject' && <ThumbsDown className="h-3.5 w-3.5 text-red-600" />}
                    </div>
                    <span className="text-xs">{candidate.skills.slice(0, 2).join(", ")}{candidate.skills.length > 2 && ` +${candidate.skills.length - 2}`}</span>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground mr-1" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* DETAILED OVERVIEW MODAL */}
      <Dialog open={!!selectedCandidateId} onOpenChange={(open) => !open && setSelectedCandidateId(null)}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden h-[85vh] flex flex-col">
          {loadingDetail || !candidateDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Header Portion */}
              <div className="p-6 border-b flex flex-col sm:flex-row gap-5 items-start bg-muted/10">
                <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {candidateDetail.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">{candidateDetail.name}</h2>
                      <p className="text-muted-foreground flex items-center gap-2">
                        {candidateDetail.role}
                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-sm">{candidateDetail.location || "Remote"}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => window.location.href = `mailto:${candidateDetail.email}`}>
                        <Mail className="h-3.5 w-3.5 mr-2" /> Email
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Badge className={`${statusColors[candidateDetail.status]} text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide border`}>
                      {candidateDetail.status}
                    </Badge>
                    {candidateDetail.matchScore > 0 ? (
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <span className={`${candidateDetail.matchScore > 75 ? "text-green-600" : "text-amber-600"}`}>
                          {candidateDetail.matchScore}% Match
                        </span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground font-normal">
                        General Profile
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">Applied {format(new Date(candidateDetail.appliedAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Left: Main Tabs */}
                <div className="flex-1 border-r flex flex-col min-h-0 max-w-[65%]">
                  <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 pt-3 border-b shrink-0">
                      <TabsList className="bg-transparent p-0 gap-6 h-auto">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 text-muted-foreground data-[state=active]:text-foreground transition-none text-xs font-bold uppercase tracking-wider">Overview</TabsTrigger>
                        <TabsTrigger value="resume" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 text-muted-foreground data-[state=active]:text-foreground transition-none text-xs font-bold uppercase tracking-wider">Resume</TabsTrigger>
                        <TabsTrigger value="notes" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 text-muted-foreground data-[state=active]:text-foreground transition-none text-xs font-bold uppercase tracking-wider">Notes</TabsTrigger>
                        <TabsTrigger value="ai" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 text-muted-foreground data-[state=active]:text-foreground transition-none text-xs font-bold uppercase tracking-wider">AI Insights</TabsTrigger>
                      </TabsList>
                    </div>

                    <ScrollArea className="flex-1">
                      <div className="p-0">
                        <TabsContent value="overview" className="p-6 m-0 space-y-8">
                          {/* AI Summary Recommendation */}
                          {candidateDetail.aiExplanation && (
                            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5" />
                                AI Executive Summary
                              </h3>
                              <p className="text-sm text-foreground leading-relaxed italic">
                                "{candidateDetail.aiExplanation}"
                              </p>
                            </div>
                          )}

                          {/* Quick Stats */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {getMatchBreakdown(candidateDetail).map((stat, i) => (
                              <div key={i} className="bg-muted/30 p-3 rounded-lg border text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 h-1 bg-primary/20 w-full" />
                                <div
                                  className="absolute top-0 left-0 h-1 bg-primary transition-all duration-500"
                                  style={{ width: `${(stat.value / (stat.max || 100)) * 100}%` }}
                                />
                                <stat.icon className="h-5 w-5 mx-auto mb-2 text-primary/70" />
                                <div className="text-2xl font-bold">
                                  {Math.round(stat.value)}
                                  <span className="text-xs text-muted-foreground ml-1 font-normal">/ {stat.max}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{stat.label}</div>
                              </div>
                            ))}
                          </div>

                          {/* Experience Details */}
                          <div className="bg-card p-4 rounded-xl border-2 border-primary/5 shadow-sm space-y-4">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              Experience Breakdown
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Work Experience</div>
                                <div className="text-xl font-bold text-foreground">
                                  {candidateDetail.work_experience_years || 0} <span className="text-sm font-normal text-muted-foreground">Years</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Internship Experience</div>
                                <div className="text-xl font-bold text-primary">
                                  {candidateDetail.intern_experience_years || 0} <span className="text-sm font-normal text-muted-foreground">Years</span>
                                </div>
                              </div>
                            </div>

                            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Detailed Work History */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground border-b pb-1">Work Details</h4>
                                {candidateDetail.work_history && candidateDetail.work_history.length > 0 ? (
                                  <div className="space-y-3">
                                    {candidateDetail.work_history.map((job, idx) => (
                                      <div key={idx} className="border-l-2 border-primary/20 pl-3 py-1">
                                        <div className="font-bold text-sm text-foreground">{job.role}</div>
                                        <div className="text-xs font-semibold text-primary/80">{job.company}</div>
                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                          <Clock className="h-3 w-3" /> {job.duration}
                                        </div>
                                        {job.description && (
                                          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                                            {job.description}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground italic flex flex-col gap-1">
                                    <span>No work details found</span>
                                    <button onClick={() => handleScreen(candidateDetail.id)} className="text-primary text-[10px] hover:underline text-left">
                                      Click "Run AI Screening" to extract details from resume
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Detailed Internship History */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground border-b pb-1">Internship Details</h4>
                                {candidateDetail.internship_history && candidateDetail.internship_history.length > 0 ? (
                                  <div className="space-y-3">
                                    {candidateDetail.internship_history.map((intern, idx) => (
                                      <div key={idx} className="border-l-2 border-primary/20 pl-3 py-1 group">
                                        <div className="font-bold text-sm text-foreground">{intern.role}</div>
                                        <div className="text-xs font-semibold text-primary/80">{intern.company}</div>
                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                          <Clock className="h-3 w-3" /> {intern.duration}
                                        </div>
                                        {intern.description && (
                                          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                                            {intern.description}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground italic">No internship details found</div>
                                )}
                              </div>
                            </div>

                            <div className="pt-2 border-t text-xs text-muted-foreground italic">
                              Total Experience: {candidateDetail.experience}
                            </div>
                          </div>

                          {/* Quick AI Feedback (Strengths/Limitations) */}
                          {candidateDetail.ai_analysis_json && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-green-600">Top Strengths</h4>
                                <ul className="space-y-1">
                                  {(candidateDetail.ai_analysis_json.key_strengths || candidateDetail.ai_analysis_json.strengths || []).slice(0, 3).map((s: string, i: number) => (
                                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 font-medium">
                                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                      <span>{s}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Limitations/Gaps</h4>
                                <ul className="space-y-1">
                                  {(candidateDetail.ai_analysis_json.data_limitations || []).slice(0, 3).map((l: string, i: number) => (
                                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 font-medium">
                                      <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                                      <span>{l}</span>
                                    </li>
                                  ))}
                                  {(candidateDetail.ai_analysis_json.data_limitations || []).length === 0 && (
                                    <li className="text-[10px] text-muted-foreground italic">No major limitations identified</li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          )}

                          {/* Education Details */}
                          <div className="bg-muted/10 p-4 rounded-xl border border-dashed space-y-3">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" />
                              Education
                            </h3>
                            {candidateDetail.education && candidateDetail.education.length > 0 ? (
                              <div className="space-y-3">
                                {candidateDetail.education.map((edu, idx) => (
                                  <div key={idx} className="flex justify-between items-start">
                                    <div>
                                      <div className="font-bold text-sm text-foreground">{edu.degree}</div>
                                      <div className="text-xs text-muted-foreground">{edu.institution} | {edu.field}</div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px]">{edu.year}</Badge>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic">No education details listed</div>
                            )}
                          </div>

                          {/* Timeline / Activity */}
                          <div>
                            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
                            <div className="space-y-6 pl-2 border-l-2 ml-2 border-muted">
                              <div className="relative pl-6">
                                <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                                <div className="text-sm font-medium">Candidate applied to {candidateDetail.role}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{format(new Date(candidateDetail.appliedAt), 'MMM d, h:mm a')}</div>
                              </div>
                              {candidateDetail.status !== 'new' && (
                                <div className="relative pl-6">
                                  <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-muted-foreground/30 ring-4 ring-background" />
                                  <div className="text-sm font-medium">Stage moved to {candidateDetail.status}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">Updated recently</div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Skills */}
                          <div>
                            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Skills Identified</h3>
                            <div className="flex flex-wrap gap-2">
                              {candidateDetail.skills.map((skill) => (
                                <Badge key={skill} variant="secondary" className="px-2 py-1 bg-white border shadow-sm text-foreground hover:bg-muted font-normal">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* ATS Scoring Explanation */}
                          {candidateDetail.ats_score !== undefined && (
                            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-3">
                              <h3 className="font-bold text-sm flex items-center gap-2 text-primary">
                                <Brain className="h-4 w-4" />
                                ATS Score Explanation
                              </h3>
                              <div className="text-xs text-muted-foreground space-y-2">
                                <p>The final score of <strong>{Math.round(candidateDetail.ats_score)}/100</strong> is calculated based on weights:</p>
                                <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                                  <li className="flex justify-between border-b pb-1">
                                    <span>Skills (35%)</span>
                                    <span className="font-bold">{Math.round(candidateDetail.skill_match_score || 0)}</span>
                                  </li>
                                  <li className="flex justify-between border-b pb-1">
                                    <span>Experience (20%)</span>
                                    <span className="font-bold">{Math.round(candidateDetail.experience_match_score || 0)}</span>
                                  </li>
                                  <li className="flex justify-between border-b pb-1">
                                    <span>Responsibilities (20%)</span>
                                    <span className="font-bold">{Math.round(candidateDetail.responsibility_match_score || 0)}</span>
                                  </li>
                                  <li className="flex justify-between border-b pb-1">
                                    <span>Education (10%)</span>
                                    <span className="font-bold">{Math.round(candidateDetail.education_match_score || 0)}</span>
                                  </li>
                                  <li className="flex justify-between border-b pb-1">
                                    <span>Preferred (10%)</span>
                                    <span className="font-bold">{Math.round(candidateDetail.preferred_match_score || 0)}</span>
                                  </li>
                                  <li className="flex justify-between border-b pb-1">
                                    <span>Bonus signals (5%)</span>
                                    <span className="font-bold">+{Math.round(candidateDetail.bonus_score || 0)}</span>
                                  </li>
                                </ul>
                                <div className="pt-2 italic text-[10px]">
                                  * Scoring ranks candidates by job relevance using semantic matching and mandatory qualification checks.
                                </div>
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="resume" className="p-6 m-0">
                          <div className="flex items-center justify-between mb-4 p-4 bg-muted/20 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="bg-red-100 p-2 rounded-lg">
                                <FileText className="h-6 w-6 text-red-600" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">Resume.pdf</p>
                                <p className="text-xs text-muted-foreground">Analyzed by AI</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleDownloadResume(candidateDetail.id, candidateDetail.name)}>
                              <Download className="h-4 w-4 mr-2" /> Download
                            </Button>
                          </div>

                          <div className="prose prose-sm max-w-none p-4 border rounded-lg bg-card min-h-[300px] text-muted-foreground whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                            {candidateDetail.resumeText || "No text content available for preview."}
                          </div>
                        </TabsContent>

                        <TabsContent value="notes" className="p-6 m-0 space-y-4">
                          <div className="space-y-4 min-h-[200px]">
                            {candidateDetail.notes ? (
                              <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-lg text-sm whitespace-pre-wrap font-medium text-stone-700">
                                {candidateDetail.notes}
                              </div>
                            ) : (
                              <div className="text-center py-10 text-muted-foreground italic text-sm">
                                No notes added yet. Start the discussion.
                              </div>
                            )}
                          </div>
                          <div className="space-y-3 pt-4 border-t">
                            <Textarea
                              placeholder="Add a private note..."
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              className="min-h-[100px] bg-muted/20"
                            />
                            <Button onClick={handleSaveNote} disabled={isSavingNote || !newNote.trim()} className="w-full sm:w-auto">
                              {isSavingNote ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                              Add Note
                            </Button>
                          </div>
                        </TabsContent>

                        <TabsContent value="ai" className="p-6 m-0 space-y-6">
                          {/* Summary of Fit */}
                          <div className="p-5 rounded-xl border bg-primary/5">
                            <h3 className="font-bold flex items-center gap-2 mb-3 text-primary uppercase tracking-wider text-xs">
                              <Sparkles className="h-4 w-4" />
                              Summary of Fit
                            </h3>
                            <p className="text-sm leading-relaxed text-foreground italic">
                              "{candidateDetail.ai_analysis_json?.summary_of_fit || candidateDetail.aiExplanation || "Analysis pending."}"
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Key Strengths */}
                            <div className="space-y-3">
                              <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" /> Key Strengths
                              </h4>
                              <ul className="space-y-2">
                                {(candidateDetail.ai_analysis_json?.key_strengths || candidateDetail.ai_analysis_json?.strengths || []).map((s: string, i: number) => (
                                  <li key={i} className="text-sm flex items-start gap-2 text-muted-foreground font-medium italic">
                                    • {s}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Data Limitations / Gaps */}
                            <div className="space-y-3">
                              <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-600" /> Data Limitations
                              </h4>
                              <ul className="space-y-2">
                                {(candidateDetail.ai_analysis_json?.data_limitations || []).map((l: string, i: number) => (
                                  <li key={i} className="text-sm flex items-start gap-2 text-muted-foreground font-medium italic">
                                    • {l}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Final Recommendation & Scores */}
                          <div className="p-4 border-2 rounded-lg font-bold text-lg inline-block">
                            Recommendation: {candidateDetail.ai_analysis_json?.recommendation || candidateDetail.aiRecommendation.toUpperCase()}
                          </div>

                          <div className="pt-6 border-t">
                            <h4 className="font-medium text-sm mb-3">AI Deep Analysis Tools</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <Button variant="outline" className="h-auto py-3 justify-start text-xs" onClick={() => handleAiModule('predictor', candidateDetail.id)} disabled={isAiModuleLoading}>
                                <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" /> Success Predictor
                              </Button>
                              <Button variant="outline" className="h-auto py-3 justify-start text-xs" onClick={() => handleAiModule('learning', candidateDetail.id)} disabled={isAiModuleLoading}>
                                <BookOpen className="h-3.5 w-3.5 mr-2 text-primary" /> Learning Paths
                              </Button>
                              <Button variant="outline" className="h-auto py-3 justify-start text-xs" onClick={() => handleAiModule('fit', candidateDetail.id)} disabled={isAiModuleLoading}>
                                <Users className="h-3.5 w-3.5 mr-2 text-primary" /> Team Fit
                              </Button>
                              <Button variant="outline" className="h-auto py-3 justify-start text-xs" onClick={() => handleAiModule('sim', candidateDetail.id)} disabled={isAiModuleLoading}>
                                <TrendingUp className="h-3.5 w-3.5 mr-2 text-primary" /> Career Path
                              </Button>
                              <Button variant="outline" className="h-auto py-3 justify-start text-xs" onClick={() => handleAiModule('cost', candidateDetail.id)} disabled={isAiModuleLoading}>
                                <Banknote className="h-3.5 w-3.5 mr-2 text-emerald-600" /> Cost Intelligence
                              </Button>
                            </div>
                          </div>
                          {aiModuleResult && (
                            <div className="mt-8 p-6 rounded-xl border-2 border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                              <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-lg text-primary flex items-center gap-2">
                                  <Sparkles className="h-5 w-5" />
                                  {aiModuleResult.title}
                                </h4>
                                <Button variant="ghost" size="sm" onClick={() => setAiModuleResult(null)}>Close</Button>
                              </div>

                              <div className="space-y-4">
                                {/* MODULE 2 & 3: LEARNING PATHS (Selected vs Rejected) */}
                                {aiModuleResult.type === 'learning' && (
                                  <div className="space-y-4">
                                    {/* SELECTED CANDIDATE MODE */}
                                    {aiModuleResult.content.pre_onboarding_message && (
                                      <>
                                        <div className="bg-green-100 border-l-4 border-green-500 p-4 rounded-r shadow-sm">
                                          <div className="flex items-center gap-2 mb-2">
                                            <ThumbsUp className="h-5 w-5 text-green-600" />
                                            <h5 className="font-bold text-green-800">Pre-Onboarding Plan</h5>
                                          </div>
                                          <p className="text-sm text-green-900 italic">"{aiModuleResult.content.pre_onboarding_message}"</p>
                                        </div>
                                        <h5 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mt-4">Skills to Refresh Before Day 1</h5>
                                        <div className="grid gap-3">
                                          {aiModuleResult.content.skills_to_learn?.map((item: any, i: number) => (
                                            <div key={i} className="bg-white p-3 rounded border flex flex-col gap-2">
                                              <div className="flex justify-between items-start">
                                                <span className="font-bold text-foreground">{item.skill}</span>
                                                <Badge variant="outline" className="text-[10px] bg-primary/5">Priority</Badge>
                                              </div>
                                              <p className="text-xs text-muted-foreground">{item.importance}</p>
                                              {item.youtube_course_search && (
                                                <a
                                                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.youtube_course_search)}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                                >
                                                  <BookOpen className="h-3 w-3" /> Search Course on YouTube
                                                </a>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}

                                    {/* REJECTED CANDIDATE MODE */}
                                    {aiModuleResult.content.rejection_reason && (
                                      <>
                                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r shadow-sm">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Brain className="h-5 w-5 text-red-600" />
                                            <h5 className="font-bold text-red-800">Constructive Feedback</h5>
                                          </div>
                                          <p className="text-sm text-red-900 italic">"{aiModuleResult.content.rejection_reason}"</p>
                                        </div>
                                        <div className="grid gap-3 mt-4">
                                          {aiModuleResult.content.weak_areas?.map((item: any, i: number) => (
                                            <div key={i} className="bg-white p-3 rounded border">
                                              <div className="font-bold text-sm text-red-600 mb-1">{item.skill}</div>
                                              <p className="text-xs text-muted-foreground mb-2">{item.reason}</p>
                                              {item.youtube_course_search && (
                                                <a
                                                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.youtube_course_search)}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
                                                >
                                                  <BookOpen className="h-3 w-3" /> Recommended Course (YouTube)
                                                </a>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        {aiModuleResult.content.motivation_message && (
                                          <div className="text-center text-xs text-muted-foreground italic mt-4">
                                            "{aiModuleResult.content.motivation_message}"
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* GENERATED EMAIL DRAFT SECTION */}
                                    {(aiModuleResult.content.email_subject || aiModuleResult.content.email_body) && (
                                      <div className="mt-6 pt-6 border-t">
                                        <h5 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                                          <Mail className="h-4 w-4" /> AI-Drafted Email
                                        </h5>
                                        <div className="bg-muted/30 border rounded-lg overflow-hidden">
                                          <div className="bg-muted/50 p-3 border-b flex justify-between items-center">
                                            <div className="text-xs font-medium">Subject: {aiModuleResult.content.email_subject}</div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 text-xs gap-1"
                                              onClick={() => {
                                                const text = `Subject: ${aiModuleResult.content.email_subject}\n\n${aiModuleResult.content.email_body}`;
                                                navigator.clipboard.writeText(text);
                                                toast({ title: "Email Copied", description: "Draft copied to clipboard." });
                                              }}
                                            >
                                              <Download className="h-3 w-3" /> Copy
                                            </Button>
                                          </div>
                                          <div className="p-4 text-xs font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed">
                                            {aiModuleResult.content.email_body}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* FALLBACK LEGACY MODE (if neither format matches) */}
                                    {!aiModuleResult.content.pre_onboarding_message && !aiModuleResult.content.rejection_reason && aiModuleResult.content.learning_paths && !aiModuleResult.content.email_body && (
                                      <div className="space-y-4">
                                        {aiModuleResult.content.learning_paths.map((path: any, i: number) => (
                                          <div key={i} className="p-4 bg-white rounded-lg border shadow-sm">
                                            <div className="font-bold text-sm mb-1">{path.skill}</div>
                                            <div className="text-xs text-muted-foreground mb-3">{path.explanation}</div>
                                            <div className="flex flex-wrap gap-2">
                                              {(path.courses || []).map((course: any, j: number) => (
                                                <Badge key={j} variant="outline" className="text-[10px]">{course.name}</Badge>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* MODULE 4: SUCCESS PREDICTOR */}
                                {aiModuleResult.type === 'predictor' && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="p-4 bg-white rounded-lg border text-center">
                                        <div className="text-3xl font-bold text-primary">{aiModuleResult.content.success_probability || "N/A"}</div>
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground">Success Probability</div>
                                      </div>
                                      <div className="p-4 bg-white rounded-lg border text-center">
                                        <div className={`text-xl font-bold ${(aiModuleResult.content.flight_risk || "").toLowerCase().includes("high") ? "text-red-600" :
                                          (aiModuleResult.content.flight_risk || "").toLowerCase().includes("medium") ? "text-amber-600" : "text-green-600"
                                          }`}>
                                          {aiModuleResult.content.flight_risk || "Unknown"}
                                        </div>
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground">Flight Risk</div>
                                      </div>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg border flex justify-between items-center">
                                      <span className="text-sm font-medium">Estimated Time to Productivity:</span>
                                      <Badge variant="secondary">{aiModuleResult.content.time_to_productivity || "N/A"}</Badge>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg border bg-blue-50/50">
                                      <div className="font-bold text-sm mb-2 text-blue-800">AI Reasoning</div>
                                      <p className="text-xs text-blue-900 leading-relaxed">{aiModuleResult.content.reasoning || "No detailed reasoning provided."}</p>
                                    </div>
                                  </div>
                                )}

                                {/* MODULE 5: TEAM FIT */}
                                {aiModuleResult.type === 'fit' && (
                                  <div className="space-y-4">
                                    <div className="p-4 bg-white rounded-lg border text-center">
                                      <div className="text-3xl font-bold text-primary">{aiModuleResult.content.team_fit || "N/A"}</div>
                                      <div className="text-sm font-medium mt-1">Overall Team Fit</div>
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border space-y-3">
                                      <div>
                                        <h5 className="text-xs font-bold uppercase text-green-600 mb-2">Value Add</h5>
                                        <ul className="list-disc pl-4 space-y-1">
                                          {(aiModuleResult.content.added_value || []).map((val: string, i: number) => (
                                            <li key={i} className="text-xs text-muted-foreground">{val}</li>
                                          ))}
                                        </ul>
                                      </div>
                                      <Separator />
                                      <div>
                                        <h5 className="text-xs font-bold uppercase text-amber-600 mb-2">Potential Risks</h5>
                                        <ul className="list-disc pl-4 space-y-1">
                                          {(aiModuleResult.content.potential_risks || []).map((risk: string, i: number) => (
                                            <li key={i} className="text-xs text-muted-foreground">{risk}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded">
                                      "{aiModuleResult.content.fit_summary || "No summary available."}"
                                    </div>
                                  </div>
                                )}

                                {/* MODULE 7: CAREER SIMULATOR */}
                                {aiModuleResult.type === 'sim' && (
                                  <div className="space-y-4">
                                    {aiModuleResult.content.growth_message && (
                                      <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg text-sm text-purple-900 italic">
                                        "{aiModuleResult.content.growth_message}"
                                      </div>
                                    )}
                                    <div className="relative border-l-2 border-primary/20 ml-3 space-y-6 pl-6 py-2">
                                      {(aiModuleResult.content.career_path || (Array.isArray(aiModuleResult.content) ? aiModuleResult.content : [])).map((step: any, i: number) => (
                                        <div key={i} className="relative">
                                          <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-4 border-white bg-primary shadow-sm" />
                                          <h5 className="font-bold text-sm text-foreground">{step.year || step.timeline}</h5>
                                          <div className="text-base font-bold text-primary">{step.role || step.title}</div>
                                          {step.required_new_skills && step.required_new_skills.length > 0 && (
                                            <div className="mt-2 text-xs text-muted-foreground">
                                              <span className="font-semibold text-foreground/80">Unlock by learning: </span>
                                              {step.required_new_skills.join(", ")}
                                            </div>
                                          )}
                                          {step.salary_increase && (
                                            <Badge variant="outline" className="mt-2 text-[10px] text-green-600 border-green-200 bg-green-50">
                                              Potential Raise: {step.salary_increase}
                                            </Badge>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* MODULE 6: COST INTELLIGENCE */}
                                {aiModuleResult.type === 'cost' && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="p-4 bg-white rounded-lg border text-center">
                                        <div className="text-xl font-bold text-emerald-600">{aiModuleResult.content.total_cost_estimate || "N/A"}</div>
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Hiring Cost</div>
                                      </div>
                                      <div className="p-4 bg-white rounded-lg border text-center">
                                        <div className="text-xl font-bold text-primary">{aiModuleResult.content.roi_prediction || "N/A"}</div>
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground">ROI Prediction</div>
                                      </div>
                                    </div>

                                    <div className="p-4 border rounded-lg bg-card flex justify-between items-center">
                                      <span className="text-sm font-medium text-muted-foreground">Value Classification:</span>
                                      <Badge className={`${(aiModuleResult.content.value_classification || "").includes("High") ? "bg-green-100 text-green-800" :
                                        (aiModuleResult.content.value_classification || "").includes("Over") ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                                        }`}>
                                        {aiModuleResult.content.value_classification || "Unclassified"}
                                      </Badge>
                                    </div>

                                    <div className="p-4 bg-white rounded-lg border">
                                      <div className="font-bold text-sm mb-2">Analysis</div>
                                      <p className="text-xs text-muted-foreground leading-relaxed">
                                        {aiModuleResult.content.justification || "No justification provided."}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      </div>
                    </ScrollArea>
                  </Tabs>
                </div>

                {/* Right: Sidebar Info */}
                <div className="w-[35%] bg-muted/10 p-6 space-y-8 overflow-y-auto shrink-0 min-h-0">
                  <div className="grid gap-3">
                    <Button className="w-full gradient-ai text-white" onClick={() => handleScreen(candidateDetail.id)}>
                      <Sparkles className="h-4 w-4 mr-2" /> Run AI Screening
                    </Button>
                    <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => {
                      handleStatusUpdate(candidateDetail.id, 'interview');
                      window.location.href = `/interviews?schedule=${candidateDetail.id}`;
                    }}>
                      Advance to Interview
                    </Button>
                    <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleStatusUpdate(candidateDetail.id, 'rejected')}>
                      Reject Candidate
                    </Button>
                  </div>

                  <Separator />

                  {/* Contact Info */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                      <User className="h-4 w-4" /> Contact
                    </h4>
                    <div className="grid gap-3 text-sm">
                      <div className="flex gap-3 items-start">
                        <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="break-all">{candidateDetail.email}</div>
                      </div>
                      <div className="flex gap-3 items-center group cursor-pointer" onClick={() => window.location.href = `tel:${candidateDetail.phone}`}>
                        <Phone className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <div className="group-hover:text-primary transition-colors">{candidateDetail.phone}</div>
                      </div>
                      <div className="flex gap-3 items-center">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>{candidateDetail.location || "Location not provided"}</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Source Info */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Application Info
                    </h4>
                    <div className="text-sm space-y-2 text-muted-foreground">
                      <p>Source: <span className="text-foreground font-medium">{candidateDetail.source}</span></p>
                      <p>Job ID: <span className="text-foreground font-medium">#{candidateDetail.id}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog >

      {/* HR Rules Dialog (Unchanged logic, just simplified render if needed, but keeping for completeness) */}
      < Dialog open={hrRuleOpen} onOpenChange={setHrRuleOpen} >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>HR Filtering Rules</DialogTitle>
            <DialogDescription>Apply AI-powered filters to the candidate list.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={hrRule}
            onChange={(e) => setHrRule(e.target.value)}
            placeholder="e.g., 'Show only candidates with Python experience'"
            className="min-h-[100px]"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setHrRuleOpen(false)}>Cancel</Button>
            <Button onClick={() => setHrRuleOpen(false)}>Apply Filter</Button>
          </div>
        </DialogContent>
      </Dialog >
    </MainLayout >
  );
}
