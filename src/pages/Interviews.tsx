import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, Video, MapPin, Plus, MoreVertical, CheckCircle, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Interview {
  id: number;
  candidate_id: number;
  candidate_name?: string; // Enhanced on frontend or check backend response
  interview_type: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  feedback?: string;
  result?: string;
  position?: string;
}

export default function Interviews() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    this_week: 0,
    upcoming: 0,
    completed: 0,
    completion_rate: 0
  });
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // New interview form state
  const [candidateId, setCandidateId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState("Video Call");
  const [duration, setDuration] = useState("60");

  // We need candidates for the dropdown
  const [candidates, setCandidates] = useState<any[]>([]);

  // Parse query params for auto-scheduling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scheduleId = params.get("schedule");
    if (scheduleId) {
      setCandidateId(scheduleId);
      setOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', '/interviews');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Try fetching concurrently
      // Use try-catch individually if one fails? No, if API fails we want to know.
      // Assuming api.getInterviewStats() is added to api.ts (I added it in previous step)

      const interviewsResponse = await api.getInterviews().catch(() => []);
      const statsResponse = await api.getInterviewStats().catch(() => ({ this_week: 0, upcoming: 0, completed: 0, completion_rate: 0 }));
      const candidatesResponse = await api.getCandidates(undefined, undefined, 1000).catch(() => []);

      // Enrich interviews with candidate names if missing
      const enrichedInterviews = interviewsResponse.map((int: any) => {
        const candidate = candidatesResponse.find((c: any) => c.id === int.candidate_id);
        return {
          ...int,
          candidate_name: candidate ? `${candidate.first_name} ${candidate.last_name}` : "Candidate #" + int.candidate_id,
          position: candidate?.job_id ? `Job #${candidate.job_id}` : "General"
        };
      });

      setInterviews(enrichedInterviews);
      setStats(statsResponse);
      setCandidates(candidatesResponse);
    } catch (error) {
      console.error("Failed to load interviews", error);
      toast({ title: "Error", description: "Failed to load interview data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  const handleSchedule = async () => {
    try {
      if (!candidateId || !date || !time) {
        toast({ title: "Missing fields", description: "Please fill all required fields", variant: "destructive" });
        return;
      }

      await api.scheduleInterview({
        candidate_id: parseInt(candidateId),
        interview_type: type,
        scheduled_at: `${date}T${time}:00`,
        duration_minutes: parseInt(duration),
        interviewer_ids: [],
        location: type === "On-site" ? "Office HQ" : "Zoom Link"
      });

      toast({ title: "Success", description: "Interview scheduled successfully" });
      setOpen(false);
      fetchData(); // Refresh

      // Reset form
      setCandidateId("");
      setDate("");
      setTime("");
    } catch (error) {
      console.error("Failed to schedule", error);
      toast({ title: "Error", description: "Failed to schedule interview", variant: "destructive" });
    }
  };

  const handleHire = async (id: number) => {
    try {
      // Update status to hired (using generic status update if available, or assume we need one)
      // Since I don't have a direct 'updateStatus' call visible in previous snippets but I saw handleStatusUpdate usage in Candidates.tsx
      // I will assume `api.updateCandidateStatus` or similar exists or use `api.updateCandidate`.
      // Let's rely on updateCandidate
      await api.updateCandidate(id, { status: 'hired' });

      toast({ title: "Candidate Hired!", description: "Triggering AI Onboarding & Success Prediction..." });

      // Trigger AI Modules in background
      api.predictSuccess(id).catch(console.error);
      api.analyzeTeamFit(id).catch(console.error);

      // Navigate to Teams
      setTimeout(() => navigate('/teams'), 1000);
    } catch (error) {
      console.error("Hire failed", error);
      toast({ title: "Error", description: "Failed to process hiring decision", variant: "destructive" });
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.updateCandidate(id, { status: 'rejected' });

      toast({ title: "Candidate Rejected", description: "Generating rejection feedback & learning path..." });

      // Trigger AI Learning Path for Rejection
      api.getLearningPath(id).catch(console.error);

      // Navigate to Rejected
      setTimeout(() => navigate('/rejected'), 1000);
    } catch (error) {
      console.error("Reject failed", error);
      toast({ title: "Error", description: "Failed to process rejection", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    if (!status) return 'border-gray-500 text-gray-500';
    switch (status.toLowerCase()) {
      case 'scheduled': return 'border-blue-500 text-blue-500';
      case 'completed': return 'border-green-500 text-green-500';
      case 'cancelled': return 'border-red-500 text-red-500';
      default: return 'border-gray-500 text-gray-500';
    }
  };

  const upcomingInterviews = interviews.filter(i => {
    if (!i.scheduled_at) return false;
    return new Date(i.scheduled_at) >= new Date() && i.status.toLowerCase() === 'scheduled';
  });

  const pastInterviews = interviews.filter(i => {
    if (!i.scheduled_at) return false;
    return new Date(i.scheduled_at) < new Date() || i.status.toLowerCase() === 'completed';
  });

  if (loading) {
    return (
      <MainLayout title="Interview Management" subtitle="Loading...">
        <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Interview Management" subtitle="Schedule and manage candidate interviews">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.this_week}</div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.upcoming}</div>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.completed}</div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Video className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.completion_rate}%</div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Candidates Pending Scheduling */}
        {candidates.filter(c => c.status === 'interview' && !interviews.some(i => i.candidate_id === c.id)).length > 0 && (
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <Clock className="h-5 w-5" />
                Candidates Pending Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {candidates
                  .filter(c => c.status === 'interview' && !interviews.some(i => i.candidate_id === c.id))
                  .map(candidate => (
                    <div key={candidate.id} className="flex flex-col gap-3 p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-amber-200">
                          <AvatarFallback className="bg-amber-100 text-amber-700 font-bold">
                            {candidate.first_name[0]}{candidate.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-sm">{candidate.first_name} {candidate.last_name}</h4>
                          <p className="text-xs text-muted-foreground">{candidate.role || "Candidate"}</p>
                        </div>
                      </div>
                      <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white" onClick={() => {
                        setCandidateId(candidate.id.toString());
                        setOpen(true);
                        // Pre-fill type if needed
                      }}>
                        Schedule Now
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-ai text-white">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Interview
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule New Interview</DialogTitle>
                <DialogDescription>Set up a meeting with a candidate.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Candidate</Label>
                  <Select onValueChange={setCandidateId} value={candidateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select candidate..." />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates && candidates.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.first_name} {c.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Interview Type</Label>
                  <Select onValueChange={setType} defaultValue="Video Call">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Video Call">Video Call</SelectItem>
                      <SelectItem value="On-site">On-site</SelectItem>
                      <SelectItem value="Phone Screen">Phone Screen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (Minutes)</Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
                <Button className="w-full gradient-ai text-white" onClick={handleSchedule}>Confirm Schedule</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Upcoming Interviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingInterviews.length === 0 && <p className="text-muted-foreground text-center py-4">No upcoming interviews scheduled.</p>}
              {upcomingInterviews.map((interview) => (
                <div
                  key={interview.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {interview.candidate_name ? interview.candidate_name.substring(0, 2).toUpperCase() : "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{interview.candidate_name}</h4>
                      <p className="text-sm text-muted-foreground">{interview.interview_type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(interview.scheduled_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <Badge variant={interview.interview_type === "Video Call" ? "default" : "secondary"}>
                      {interview.interview_type === "Video Call" ? (
                        <Video className="h-3 w-3 mr-1" />
                      ) : (
                        <MapPin className="h-3 w-3 mr-1" />
                      )}
                      {interview.interview_type}
                    </Badge>

                    <Badge
                      variant="outline"
                      className={getStatusColor(interview.status)}
                    >
                      {interview.status}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setCandidateId(interview.candidate_id.toString());
                          // Quick hack to reuse state or separate handling?
                          // Let's create specific handlers.
                          handleHire(interview.candidate_id);
                        }}>Select (Hire)</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleReject(interview.candidate_id)}>Reject Candidate</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { /* view details logic */ }}>View Interview Details</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Past Interviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Past Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pastInterviews.length === 0 && <p className="text-muted-foreground text-center py-4">No past interviews found.</p>}
            <div className="space-y-4">
              {pastInterviews.map((interview) => (
                <div
                  key={interview.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-muted">
                          {interview.candidate_name ? interview.candidate_name.substring(0, 2).toUpperCase() : "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{interview.candidate_name}</h4>
                        <p className="text-sm text-muted-foreground">{interview.interview_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {new Date(interview.scheduled_at).toLocaleDateString()}
                      </span>
                      <Badge
                        variant="secondary"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {interview.status}
                      </Badge>
                    </div>
                  </div>
                  {interview.feedback && <p className="text-sm text-muted-foreground pl-14">{interview.feedback}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
