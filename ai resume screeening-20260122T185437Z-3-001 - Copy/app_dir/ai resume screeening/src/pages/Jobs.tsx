import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Search,
  MapPin,
  Users,
  Clock,
  MoreVertical,
  Building2,
  Loader2,
  Edit,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useJobFilter } from "@/contexts/JobFilterContext";

interface Job {
  id: number;
  title: string;
  department: string | null;
  location: string | null;
  job_type: string | null;
  status: "draft" | "active" | "paused" | "closed" | "filled";
  created_at: string;
  candidate_count?: number;
}

const statusStyles = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/10 text-success",
  paused: "bg-warning/10 text-warning",
  closed: "bg-muted text-muted-foreground",
  filled: "bg-primary/10 text-primary",
};

export default function Jobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const { isJobSelected, toggleJob } = useJobFilter();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    department: "",
    location: "",
    job_type: "Full-time",
    description: "",
    requirements: "",
    required_skills: "",
    min_experience_years: "0",
    max_experience_years: "0",
    min_education: "Bachelor's",
    work_mode: "On-site",
    role_level: "Junior",
    num_openings: "1",
    key_responsibilities: "",
    preferred_qualifications: "",
    deadline: "",
  });

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await api.getJobs();
      setJobs(data);
    } catch (error: any) {
      console.error("Failed to load jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
      setJobs([]);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.department) {
      toast({
        title: "Validation Error",
        description: "Title and Department are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const jobData = {
        ...formData,
        min_experience_years: formData.min_experience_years ? parseInt(formData.min_experience_years) || 0 : 0,
        max_experience_years: formData.max_experience_years ? parseInt(formData.max_experience_years) || 0 : 0,
        num_openings: formData.num_openings ? parseInt(formData.num_openings) || 1 : 1,
        required_skills: formData.required_skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        key_responsibilities: formData.key_responsibilities
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        preferred_qualifications: formData.preferred_qualifications
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        preferred_skills: [],
      };

      await api.createJob(jobData);

      toast({
        title: "Success!",
        description: `Job "${formData.title}" created successfully`,
      });

      // Reset form and reload
      setFormData({
        title: "",
        department: "",
        location: "",
        job_type: "Full-time",
        description: "",
        requirements: "",
        required_skills: "",
        min_experience_years: "0",
        max_experience_years: "0",
        min_education: "Bachelor's",
        work_mode: "On-site",
        role_level: "Junior",
        num_openings: "1",
        key_responsibilities: "",
        preferred_qualifications: "",
        deadline: "",
      });
      setCreateDialogOpen(false);
      await loadJobs();
    } catch (error: any) {
      toast({
        title: "Error",
        variant: "destructive",
      });
      setCreating(false);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      await api.deleteJob(id);
      toast({
        title: "Success",
        description: "Job deleted successfully",
      });
      await loadJobs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      });
    }
  };

  const handleFilterToggle = (e: React.MouseEvent, jobId: number) => {
    e.stopPropagation();
    toggleJob(jobId);
    // Optional: We can add toast feedback here if desired
  };

  const getDaysOpen = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <MainLayout title="Job Management" subtitle="Create and manage job openings">
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search jobs..." className="pl-10" />
          </div>
          <Button
            className="gradient-ai text-white"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </div>

        {/* Jobs Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No jobs created yet</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Job
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job, index) => (
              <Card
                key={job.id}
                className={`card-hover fade-in cursor-pointer transition-all duration-200 ${isJobSelected(job.id) ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(`/resumes?jobId=${job.id}&jobTitle=${encodeURIComponent(job.title)}`)}
              >
                <CardContent className="p-5">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mr-2">
                          <h3 className="font-semibold text-lg text-foreground mb-1">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className={`text-xs w-16 text-right ${isJobSelected(job.id) ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                              {isJobSelected(job.id) ? 'Filtering' : 'View Off'}
                            </span>
                            <Switch
                              checked={isJobSelected(job.id)}
                              onCheckedChange={(checked) => handleFilterToggle({ stopPropagation: () => { } } as React.MouseEvent, job.id)}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{job.department || "N/A"}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(job.id, job.title);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{job.location || "Not specified"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{job.job_type || "Full-time"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{job.candidate_count || 0} applicants</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Badge className={statusStyles[job.status]} variant="secondary">
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getDaysOpen(job.created_at)} days open
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Job Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Job</DialogTitle>
            <DialogDescription>
              Add a new job opening to start receiving applications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Senior React Developer"
                />
              </div>

              <div>
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Engineering"
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Remote, New York"
                />
              </div>

              <div>
                <Label htmlFor="job_type">Job Type</Label>
                <Select
                  value={formData.job_type}
                  onValueChange={(value) => setFormData({ ...formData, job_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                    <SelectItem value="Consultant">Consultant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="experience">Min. Experience (years)</Label>
                <Input
                  id="experience"
                  type="number"
                  value={formData.min_experience_years}
                  onChange={(e) => setFormData({ ...formData, min_experience_years: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="maxExperience">Max. Experience (years)</Label>
                <Input
                  id="maxExperience"
                  type="number"
                  value={formData.max_experience_years}
                  onChange={(e) => setFormData({ ...formData, max_experience_years: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="numOpenings">Number of Openings</Label>
                <Input
                  id="numOpenings"
                  type="number"
                  value={formData.num_openings}
                  onChange={(e) => setFormData({ ...formData, num_openings: e.target.value })}
                  placeholder="1"
                />
              </div>

              <div>
                <Label htmlFor="workMode">Work Mode</Label>
                <Select
                  value={formData.work_mode}
                  onValueChange={(value) => setFormData({ ...formData, work_mode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="On-site">On-site</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                    <SelectItem value="Remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="educationCount">Min. Education</Label>
                <Select
                  value={formData.min_education}
                  onValueChange={(value) => setFormData({ ...formData, min_education: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diploma">Diploma</SelectItem>
                    <SelectItem value="Bachelor's">Bachelor's</SelectItem>
                    <SelectItem value="Master's">Master's</SelectItem>
                    <SelectItem value="Any">Any</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="roleLevel">Role Level</Label>
                <Select
                  value={formData.role_level}
                  onValueChange={(value) => setFormData({ ...formData, role_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Intern">Intern</SelectItem>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Mid">Mid</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                    <SelectItem value="Lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="keyResponsibilities">Key Responsibilities (comma-separated)</Label>
                <Textarea
                  id="keyResponsibilities"
                  value={formData.key_responsibilities}
                  onChange={(e) => setFormData({ ...formData, key_responsibilities: e.target.value })}
                  placeholder="Design UI, Conduct user interviews, Manage design systems..."
                  rows={3}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="preferredQuals">Preferred Qualifications (comma-separated)</Label>
                <Textarea
                  id="preferredQuals"
                  value={formData.preferred_qualifications}
                  onChange={(e) => setFormData({ ...formData, preferred_qualifications: e.target.value })}
                  placeholder="3+ years Figma exp, Previous fintech experience, Strong portfolio..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="deadline">Application Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the role, responsibilities, and team..."
                  rows={4}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="List the key requirements and qualifications..."
                  rows={3}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="skills">Required Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  value={formData.required_skills}
                  onChange={(e) => setFormData({ ...formData, required_skills: e.target.value })}
                  placeholder="React, TypeScript, Node.js, PostgreSQL"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Job
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
