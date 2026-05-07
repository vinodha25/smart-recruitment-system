import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

const statusColors: any = {
  new: "bg-primary/10 text-primary",
  screening: "bg-warning/10 text-warning",
  interview: "bg-accent/10 text-accent",
  offer: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

export function RecentCandidates() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const data = await api.getCandidates();
        // Sort by ID desc (newest first) or maybe score? Assuming newest first for "Recent"
        // The API doesn't guarantee order, so let's just take top 5.
        // Map to display format
        const mapped = data.slice(0, 5).map((c: any) => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          role: c.job_id ? `Job #${c.job_id}` : "Applicant",
          matchScore: Math.round(c.overall_score || 0),
          status: c.status || "new"
        }));
        setCandidates(mapped);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  if (loading) return <Card className="h-[400px] flex items-center justify-center"><Loader2 className="animate-spin" /></Card>;

  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-lg">Recent Candidates</CardTitle>
        <Link to="/candidates">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {candidates.length === 0 ? <p className="text-center text-muted-foreground py-8">No candidates yet.</p> : (
          <div className="space-y-4">
            {candidates.map((candidate, index) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-secondary text-secondary-foreground font-medium text-sm">
                      {candidate.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{candidate.name}</p>
                    <p className="text-sm text-muted-foreground">{candidate.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {candidate.matchScore}%
                    </p>
                    <p className="text-xs text-muted-foreground">Match</p>
                  </div>
                  <Badge className={statusColors[candidate.status] || "bg-gray-100 text-gray-800"} variant="secondary">
                    {(candidate.status || "new").toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
