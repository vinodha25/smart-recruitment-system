import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Search,
    MoreHorizontal,
    Mail,
    Calendar,
    UserCheck,
    UserX,
    FileText,
    Filter,
    ArrowRight,
    Briefcase,
    Download,
    Loader2
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useJobFilter } from "@/contexts/JobFilterContext";
import { AICandidateActions } from "@/components/candidate/AICandidateActions";

interface EvaluatedCandidate {
    id: number;
    name: string;
    email: string;
    role: string;
    matchScore: number;
    skills: string[];
    status: string;
    aiRecommendation: string;
    aiExplanation: string;
}

export default function EvaluatedCandidates() {
    const [candidates, setCandidates] = useState<EvaluatedCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();
    const { selectedJobIds } = useJobFilter();

    useEffect(() => {
        loadCandidates();
    }, [selectedJobIds]);

    const loadCandidates = async () => {
        try {
            setLoading(true);
            let data;

            if (selectedJobIds.length > 0) {
                // Load candidates from selected jobs
                const allCandidates = await Promise.all(
                    selectedJobIds.map(id => api.getCandidates(id))
                );
                // Flatten and deduplicate
                const flatCandidates = allCandidates.flat();
                data = Array.from(
                    new Map(flatCandidates.map(c => [c.id, c])).values()
                );
            } else {
                data = await api.getCandidates(undefined, undefined, 1000);
            }

            const mapped = data.map((c: any) => ({
                id: c.id,
                name: `${c.first_name} ${c.last_name}`,
                email: c.email,
                role: c.job_id ? `Job #${c.job_id}` : "General Application",
                matchScore: Math.round(c.overall_score || 0),
                skills: c.extracted_skills || [],
                status: c.status || "new",
                aiRecommendation: c.ai_recommendation || "unknown",
                aiExplanation: c.ai_insight
            }));

            setCandidates(mapped);
        } catch (error) {
            console.error("Failed to load candidates", error);
            setCandidates([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (checked: boolean, filteredList: EvaluatedCandidate[]) => {
        if (checked) {
            setSelectedIds(filteredList.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (checked: boolean, id: number) => {
        if (checked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter(cid => cid !== id));
        }
    };

    const handleBulkAction = async (action: string) => {
        try {
            let status = "";
            if (action === "Shortlist" || action === "stage") status = "shortlisted";
            else if (action === "Reject") status = "rejected";
            else if (action === "Email" || action === "email") {
                toast({ title: "Email Sent", description: `Emails sent to ${selectedIds.length} candidates.` });
                setSelectedIds([]);
                return;
            }

            if (status) {
                await Promise.all(selectedIds.map(id => api.updateCandidateStatus(id, status)));
                toast({ title: "Success", description: `Moved ${selectedIds.length} candidates to ${status}.` });

                // Refresh list
                loadCandidates();
                setSelectedIds([]);
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to update candidates", variant: "destructive" });
        }
    };

    const filterCandidates = (segment: string) => {
        return candidates.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

            let matchesSegment = false;
            if (segment === "shortlisted") matchesSegment = ["shortlisted", "interview", "offer", "hired"].includes(c.status) || (c.aiRecommendation === "recommended" && c.status !== "rejected");
            else if (segment === "rejected") matchesSegment = c.status === "rejected" || (c.aiRecommendation === "not_recommended" && c.status === "rejected");
            else if (segment === "review") matchesSegment = ["screening", "new"].includes(c.status) && c.aiRecommendation !== "not_recommended"; // Default bucket
            else matchesSegment = true; // All

            return matchesSearch && matchesSegment;
        });
    };

    const CandidateList = ({ segment }: { segment: string }) => {
        const list = filterCandidates(segment);

        if (list.length === 0) {
            return <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/20">No candidates found in this category.</div>
        }

        return (
            <div className="space-y-4">
                <div className="flex items-center gap-4 p-2 bg-muted/40 rounded-lg text-sm font-medium text-muted-foreground">
                    <Checkbox
                        checked={list.length > 0 && selectedIds.length === list.length && list.every(c => selectedIds.includes(c.id))}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean, list)}
                    />
                    <div className="w-8"></div> {/* Avatar spacer */}
                    <div className="flex-1">Candidate</div>
                    <div className="w-24 text-center">Score</div>
                    <div className="w-1/4">Status</div>
                    <div className="flex-1 text-right">AI Tools & Actions</div>
                </div>

                {list.map((candidate) => (
                    <Card key={candidate.id} className="card-hover group">
                        <CardContent className="p-4 flex items-center gap-4">
                            <Checkbox
                                checked={selectedIds.includes(candidate.id)}
                                onCheckedChange={(checked) => handleSelectOne(checked as boolean, candidate.id)}
                            />

                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                    {candidate.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold truncate">{candidate.name}</h3>
                                    <Badge variant="outline" className="text-xs font-normal text-muted-foreground">{candidate.role}</Badge>
                                </div>
                                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {candidate.email}</span>
                                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Skills: {candidate.skills.slice(0, 3).join(", ")}</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center w-24">
                                <div className={`text-lg font-bold ${candidate.matchScore >= 75 ? 'text-green-600' : candidate.matchScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                    {candidate.matchScore}%
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase">Exact Match</div>
                            </div>

                            <div className="w-1/4">
                                <Badge className={`
                   ${candidate.status === 'shortlisted' ? 'bg-indigo-100 text-indigo-700' :
                                        candidate.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                            candidate.status === 'screening' ? 'bg-purple-100 text-purple-700' :
                                                'bg-gray-100 text-gray-700'} 
                   border border-transparent hover:border-current
                 `}>
                                    {candidate.status.toUpperCase()}
                                </Badge>
                                {candidate.aiExplanation && (
                                    <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]" title={candidate.aiExplanation}>
                                        AI: {candidate.aiExplanation}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 w-32 justify-end">
                                <Button size="icon" variant="ghost" title="Schedule Interview">
                                    <Calendar className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleBulkAction("Email")}>
                                            <Mail className="h-4 w-4 mr-2" /> Email Candidate
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleBulkAction("Shortlist")}>
                                            <UserCheck className="h-4 w-4 mr-2" /> Shortlist
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleBulkAction("Reject")}>
                                            <UserX className="h-4 w-4 mr-2" /> Reject
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <div className="ml-2 pl-2 border-l border-slate-100">
                                    <AICandidateActions candidateId={candidate.id} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <MainLayout title="Candidates After Evaluation" subtitle="Segmented lists for post-screening actions">
            <div className="space-y-6">
                {/* Top Controls */}
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search candidates..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                            <span className="text-sm font-medium text-muted-foreground">{selectedIds.length} Selected</span>
                            <Button size="sm" variant="outline" onClick={() => handleBulkAction("email")}>
                                <Mail className="h-4 w-4 mr-2" /> Bulk Email
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleBulkAction("stage")}>
                                <ArrowRight className="h-4 w-4 mr-2" /> Move Stage
                            </Button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <Tabs defaultValue="shortlisted" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 max-w-xl mb-6">
                        <TabsTrigger value="shortlisted" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                            Shortlisted / High Fit
                        </TabsTrigger>
                        <TabsTrigger value="review" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
                            Needs Review
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                            Rejected / Low Fit
                        </TabsTrigger>
                    </TabsList>

                    <div className="min-h-[400px]">
                        {loading ? (
                            <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                        ) : (
                            <>
                                <TabsContent value="shortlisted" className="mt-0">
                                    <CandidateList segment="shortlisted" />
                                </TabsContent>
                                <TabsContent value="review" className="mt-0">
                                    <CandidateList segment="review" />
                                </TabsContent>
                                <TabsContent value="rejected" className="mt-0">
                                    <CandidateList segment="rejected" />
                                </TabsContent>
                            </>
                        )}
                    </div>
                </Tabs>
            </div>
        </MainLayout>
    );
}
