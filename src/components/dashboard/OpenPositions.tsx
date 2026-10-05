import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Users, Clock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

const priorityStyles: any = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted text-muted-foreground",
};

export function OpenPositions() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await api.getJobs();
        setJobs(data.slice(0, 4)); // Show top 4
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  if (loading) return <Card className="h-[400px] flex items-center justify-center"><Loader2 className="animate-spin" /></Card>;

  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-lg">Open Positions</CardTitle>
        <Link to="/jobs">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? <p className="text-center text-muted-foreground py-8">No open positions.</p> : (
          <div className="space-y-4">
            {jobs.map((job, index) => (
              <div
                key={job.id}
                className="rounded-lg border border-border p-4 hover:bg-secondary/50 transition-colors fade-in cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">{job.title}</h4>
                    <p className="text-sm text-muted-foreground">{job.department}</p>
                  </div>
                  {/* Mock priority as it might not be in API yet */}
                  <Badge className={priorityStyles["medium"]} variant="outline">
                    Active
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location || "Remote"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {/* Mock applicant count or fetch if possible. Using placeholder. */}
                    Candidates
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {/* Mock days open */}
                    Recently added
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
