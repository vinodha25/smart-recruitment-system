import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, ChevronRight, UserPlus, Layers } from "lucide-react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export default function Teams() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await api.getJobs();
        // Enrich jobs with hired count?
        // Ideally we'd need an endpoint for this, but for now we might fetch candidates and count client side if list is small, 
        // or just show "Active Team" generically.
        // Let's create a visual list of teams based on Jobs
        setJobs(data);
      } catch (error) {
        console.error("Failed to fetch jobs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  return (
    <MainLayout title="Team Management" subtitle="Manage teams and assignments">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold tracking-tight">Active Teams</h2>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Create New Team
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/teams/${job.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="outline">{job.department || "Engineering"}</Badge>
                </div>
                <CardTitle className="mt-4">{job.title}</CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                  {job.description || "No description provided."}
                </p>

                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>View Team Members</span>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t bg-muted/20 flex justify-between">
                <span className="text-xs font-medium text-muted-foreground">Manage Allocations</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardFooter>
            </Card>
          ))}

          {/* Add a "General Pool" team */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer group border-dashed" onClick={() => navigate(`/teams/general`)}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                  <Layers className="h-5 w-5 text-slate-600" />
                </div>
                <Badge variant="secondary">General</Badge>
              </div>
              <CardTitle className="mt-4">Unassigned / General</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                Candidates hired but not yet assigned to a specific project.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>View Pool</span>
              </div>
            </CardContent>
            <CardFooter className="pt-3 border-t bg-muted/20 flex justify-between">
              <span className="text-xs font-medium text-muted-foreground">Manage Allocations</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardFooter>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
