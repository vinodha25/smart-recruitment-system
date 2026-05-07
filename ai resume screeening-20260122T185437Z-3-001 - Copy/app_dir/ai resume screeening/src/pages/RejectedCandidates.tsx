import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Search,
    Users,
    Loader2,
    Trash2,
    RotateCcw,
    AlertOctagon,
    Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AICandidateActions } from "@/components/candidate/AICandidateActions";

interface Candidate {
    id: number;
    name: string;
    email: string;
    role: string | null;
    matchScore: number;
    skills: string[];
    status: string;
    aiRecommendation: string;
    aiExplanation: string;
}

export default function RejectedCandidates() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        loadRejectedCandidates();
    }, []);

    const loadRejectedCandidates = async () => {
        try {
            setLoading(true);
            const data = await api.getCandidates(undefined, undefined, 1000);

            // Filter only rejected candidates
            // We look for status 'rejected' OR ai_recommendation 'not_recommended'
            // But usually 'status' is the source of truth for rejection.

            const rejected = data.filter((c: any) =>
                c.status === "rejected" ||
                c.ai_recommendation === "not_recommended"
            ).map((c: any) => ({
                id: c.id,
                name: `${c.first_name} ${c.last_name}`,
                email: c.email,
                role: c.job_id ? `Job #${c.job_id}` : "General Application",
                matchScore: Math.round(c.overall_score || 0),
                skills: c.extracted_skills || [],
                status: c.status,
                aiRecommendation: c.ai_recommendation,
                aiExplanation: c.ai_insight || "No insight available.",
            }));

            setCandidates(rejected);
        } catch (error) {
            console.error("Failed to load candidates:", error);
            toast({
                title: "Error",
                description: "Failed to load rejected candidates",
                variant: "destructive",
            });
            setCandidates([]);
        } finally {
            setLoading(false);
        }
    };

    const handleReconsider = async (id: number) => {
        try {
            // Move back to screening
            await api.updateCandidateStatus(id, "screening");
            toast({
                title: "Success",
                description: "Candidate moved back to screening for reconsideration",
            });
            loadRejectedCandidates();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update status",
                variant: "destructive",
            });
        }
    };

    const filteredCandidates = candidates.filter((candidate) =>
        candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <MainLayout title="Rejected Candidates" subtitle="Review candidates who didn't make the cut">
            <div className="space-y-6">
                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search candidates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Purge All
                        </Button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                ) : filteredCandidates.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                            <Users className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-1">No Rejected Candidates</h3>
                            <p className="text-muted-foreground">Candidates rejected during screening or interviews will appear here.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filteredCandidates.map((candidate) => (
                            <Card key={candidate.id} className="card-hover">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                                        {/* Bio */}
                                        <div className="flex items-center gap-4 min-w-[200px]">
                                            <Avatar className="h-12 w-12 border-2 border-destructive/20">
                                                <AvatarFallback className="bg-destructive/10 text-destructive font-bold">
                                                    {candidate.name.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="font-bold text-lg">{candidate.name}</h3>
                                                <p className="text-sm text-muted-foreground">{candidate.role}</p>
                                            </div>
                                        </div>

                                        {/* AI Reason */}
                                        <div className="flex-1 p-3 bg-muted/50 rounded-lg border border-border">
                                            <div className="flex items-center gap-2 mb-1">
                                                <AlertOctagon className="h-4 w-4 text-destructive" />
                                                <span className="text-xs font-semibold text-destructive uppercase tracking-wider">Rejection Insight</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {candidate.aiExplanation}
                                            </p>
                                        </div>

                                        {/* Score */}
                                        <div className="text-center min-w-[80px]">
                                            <div className={`text-2xl font-bold ${candidate.matchScore > 70 ? 'text-warning' : 'text-destructive'}`}>
                                                {candidate.matchScore}%
                                            </div>
                                            <p className="text-xs text-muted-foreground">Match</p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => handleReconsider(candidate.id)}>
                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                Reconsider
                                            </Button>
                                            <Button size="icon" variant="ghost">
                                                <Download className="h-4 w-4 text-muted-foreground" />
                                            </Button>

                                            <div className="ml-2 pl-2 border-l border-slate-100">
                                                <AICandidateActions candidateId={candidate.id} />
                                            </div>
                                        </div>
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
