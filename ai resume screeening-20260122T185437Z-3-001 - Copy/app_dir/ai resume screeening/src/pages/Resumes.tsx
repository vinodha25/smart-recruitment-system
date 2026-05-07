import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToastAction } from "@/components/ui/toast";
import { Search, Upload, FileText, Loader2, CheckCircle, ArrowLeft, Briefcase, Trash2, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { JobFilterPanel } from "@/components/JobFilterPanel";
import { useJobFilter } from "@/contexts/JobFilterContext";

export default function Resumes() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get("jobId");
  const jobTitle = searchParams.get("jobTitle");
  const { selectedJobIds, clearAllJobs } = useJobFilter();

  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedResume, setSelectedResume] = useState<any>(null);
  const [dialogType, setDialogType] = useState<'analysis' | 'skills' | 'internship'>('analysis');

  // New Filter Fields
  const [hrName, setHrName] = useState("");
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  // Assign Job State
  const [assignJobDialogOpen, setAssignJobDialogOpen] = useState(false);
  const [candidateToAssign, setCandidateToAssign] = useState<any>(null);
  const [selectedAssignJobId, setSelectedAssignJobId] = useState<string>("");
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [selectedUploadJobId, setSelectedUploadJobId] = useState<string>("general");

  const currentUploadJobId = jobId ? parseInt(jobId) : (selectedJobIds.length > 0 ? selectedJobIds[0] : null);

  const { toast } = useToast();

  // Load resumes/candidates from backend
  useEffect(() => {
    loadResumes();
    loadJobs();
  }, [jobId, selectedJobIds]);

  // Sync upload job ID when dialog opens or filter changes
  useEffect(() => {
    if (uploadDialogOpen) {
      if (jobId) setSelectedUploadJobId(jobId);
      else if (selectedJobIds.length > 0) setSelectedUploadJobId(String(selectedJobIds[0]));
      else setSelectedUploadJobId("general");
    }
  }, [uploadDialogOpen, jobId, selectedJobIds]);

  const loadJobs = async () => {
    try {
      const data = await api.getJobs();
      setAvailableJobs(data.filter((j: any) => j.status === 'active' || j.status === 'draft' || j.status === 'paused'));
    } catch (error) {
      console.error("Failed to load jobs", error);
    }
  };

  const loadResumes = async () => {
    try {
      setLoading(true);

      // Priority: URL jobId > selectedJobIds filter > all resumes
      if (jobId) {
        // Single job from URL (legacy support)
        const data = await api.getCandidates(parseInt(jobId));
        setResumes(data);
      } else if (selectedJobIds.length > 0) {
        // Multi-job filter from global state
        console.log("Fetching candidates for jobs:", selectedJobIds);
        const allCandidates = await Promise.all(
          selectedJobIds.map(async (id) => {
            const res = await api.getCandidates(id);
            console.log(`Job ${id} candidates:`, res.length);
            return res;
          })
        );
        // Flatten and deduplicate by candidate ID
        const flatCandidates = allCandidates.flat();
        const uniqueCandidates = Array.from(
          new Map(flatCandidates.map(c => [c.id, c])).values()
        );
        setResumes(uniqueCandidates);
      } else {
        // No filter - show all resumes
        const data = await api.getResumes();
        setResumes(data);
      }
    } catch (error: any) {
      console.error("Failed to load resumes:", error);
      toast({
        title: "Error",
        description: "Failed to load resumes.",
        variant: "destructive",
      });
      setResumes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF or Word document (.pdf, .docx, .doc)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      // Use manually selected job ID from dropdown
      let effectiveJobId: number | undefined;

      if (selectedUploadJobId && selectedUploadJobId !== "general") {
        effectiveJobId = parseInt(selectedUploadJobId);
      }

      console.log("FINAL DEBUG: Uploading file:", selectedFile.name, "with:", { effectiveJobId, hrName, customDate });

      // Pass the new fields to API
      const result = await api.uploadResume(selectedFile, effectiveJobId, hrName, customDate);

      // If uploaded to General Pool, clear filters so it shows up immediately
      if (!effectiveJobId) {
        clearAllJobs();
      }

      toast({
        title: "Success!",
        description: effectiveJobId
          ? `Uploaded to Job ID: ${effectiveJobId}. Screening started...`
          : "Uploaded to General Pool. (Filters cleared to show result)",
      });

      // Refresh list from server to ensure consistency
      await loadResumes();

      // Close dialog and reset
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setHrName("");
      setCustomDate("");
    } catch (error: any) {
      console.error("Upload failed", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent opening the details dialog
    if (!confirm("Are you sure you want to delete this resume?")) return;

    try {
      await api.deleteResume(id);
      setResumes(resumes.filter(r => r.id !== id));
      toast({
        title: "Resume Deleted",
        description: "The resume has been successfully removed.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Could not delete the resume. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAssignJob = async () => {
    if (!candidateToAssign || !selectedAssignJobId) return;

    try {
      setLoading(true);
      const jobId = parseInt(selectedAssignJobId);

      // 1. Update Candidate Job ID
      await api.updateCandidate(candidateToAssign.id, { job_id: jobId });

      // 2. Trigger AI Screening for the new job
      toast({
        title: "Job Assigned",
        description: "Analyzing candidate against new job requirements...",
      });

      await api.screenCandidate(candidateToAssign.id, jobId);

      // 3. Refresh List
      await loadResumes();

      setAssignJobDialogOpen(false);
      setCandidateToAssign(null);
      setSelectedAssignJobId("");

      toast({
        title: "Success",
        description: "Candidate assigned and analyzed.",
      });

    } catch (error: any) {
      console.error("Failed to assign job:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: resumes.length,
    parsed: resumes.filter((r) => r.status === "parsed" || r.overall_score !== null).length,
    processing: resumes.filter((r) => r.status === "processing" || r.status === "screening").length, // Added screening
    failed: resumes.filter((r) => r.status === "failed").length,
  };

  // Determine page title and subtitle based on context
  const getPageTitle = () => {
    if (jobTitle) return `${jobTitle} - Applicants`;
    if (selectedJobIds.length > 0) return `Filtered Candidates (${selectedJobIds.length} jobs)`;
    return "Resume Management";
  };

  const getPageSubtitle = () => {
    if (jobTitle) return `Viewing candidates who applied for ${jobTitle}`;
    if (selectedJobIds.length > 0) return `Viewing candidates from ${selectedJobIds.length} selected ${selectedJobIds.length === 1 ? 'job' : 'jobs'}`;
    return "Upload and manage candidate resumes";
  };

  return (
    <MainLayout title={getPageTitle()} subtitle={getPageSubtitle()}>
      <div className="space-y-6">
        {/* Job Context Header (for single job from URL) */}
        {jobTitle && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{jobTitle}</h3>
                    <p className="text-sm text-muted-foreground">
                      {resumes.length} {resumes.length === 1 ? 'applicant' : 'applicants'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/jobs')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Jobs
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job Filter Panel (only show when not in single-job mode) */}
        {!jobId && <JobFilterPanel />}

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search resumes..." className="pl-10" />
          </div>
          <Button
            variant="outline"
            onClick={loadResumes}
            className="mr-2"
            title="Refresh List"
          >
            <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            className="gradient-ai text-white"
            onClick={() => setUploadDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Resume
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Resumes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{stats.parsed}</div>
              <p className="text-sm text-muted-foreground">Parsed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">{stats.processing}</div>
              <p className="text-sm text-muted-foreground">Processing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
              <p className="text-sm text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        </div>

        {/* Resumes Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {jobTitle
                ? `Applicants for ${jobTitle}`
                : selectedJobIds.length > 0
                  ? `Candidates from ${selectedJobIds.length} Selected Jobs`
                  : 'All Resumes'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : resumes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {jobTitle
                    ? `No applicants for this job yet`
                    : selectedJobIds.length > 0
                      ? 'No candidates found for the selected jobs'
                      : 'No resumes uploaded yet'
                  }
                </p>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Resume
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>HR/Recruiter</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Intern</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead>Match Score</TableHead>
                    <TableHead className="w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumes.map((resume) => {
                    const candidateName = resume.candidate_name ||
                      (resume.first_name && resume.last_name ? `${resume.first_name} ${resume.last_name}` : "Unknown");
                    const skills = resume.skills || resume.extracted_skills || [];
                    const matchScore = resume.ats_score || resume.match_score || resume.overall_score;
                    const experience = resume.experience_years !== undefined ? `${resume.experience_years} years` : "0 years";

                    return (
                      <TableRow key={resume.id} className="group">
                        <TableCell className="font-medium">
                          <div>{candidateName}</div>
                          {resume.position !== "General Application" && (
                            <div className="text-xs text-muted-foreground">{resume.position}</div>
                          )}
                        </TableCell>
                        <TableCell>{resume.recruiter_name || "-"}</TableCell>
                        <TableCell>{resume.phone || "-"}</TableCell>
                        <TableCell>{resume.email || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {skills?.slice(0, 4).map((skill: string) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {skills?.length > 4 && (
                              <Badge
                                variant="outline"
                                className="text-xs cursor-pointer hover:bg-accent"
                                onClick={() => {
                                  setSelectedResume(resume);
                                  setDialogType('skills');
                                }}
                              >
                                +{skills.length - 4}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {resume.intern_experience_years !== undefined ? (
                            <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20">
                              {resume.intern_experience_years}y
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {resume.work_experience_years !== undefined ? `${resume.work_experience_years}y` : experience}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase">Work Exp</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={resume.status === "parsed" || matchScore ? "default" : "secondary"}
                              className={resume.status === "processing" ? "bg-warning/20 text-warning" : ""}
                            >
                              {resume.status || (matchScore ? "screened" : "new")}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {resume.applied_at ? new Date(resume.applied_at).toLocaleDateString() : "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {matchScore ? (
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${matchScore >= 75 ? "text-success" : matchScore >= 50 ? "text-warning" : "text-muted-foreground"}`}>
                                {Math.round(matchScore)}%
                              </span>
                              {resume.ai_analysis_json && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 rounded-full"
                                  onClick={() => {
                                    setSelectedResume(resume);
                                    setDialogType('analysis');
                                  }}
                                  title="View AI Analysis"
                                >
                                  <FileText className="h-4 w-4 text-primary" />
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="flex gap-2">
                          {(resume.position === "General Application" || !resume.position) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCandidateToAssign(resume);
                                setAssignJobDialogOpen(true);
                              }}
                              title="Assign to Job"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDelete(e, resume.id)}
                            title="Delete Resume"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Resume{jobTitle && ` for ${jobTitle}`}</DialogTitle>
            <DialogDescription>
              Upload a candidate resume in PDF or Word format. Our AI will automatically extract skills and information.
              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Apply for Position</label>
                <Select value={selectedUploadJobId} onValueChange={setSelectedUploadJobId}>
                  <SelectTrigger className="w-full bg-background border-primary/20">
                    <SelectValue placeholder="Select Job Position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Pool (Standard AI Scan)</SelectItem>
                    {availableJobs.map(job => (
                      <SelectItem key={job.id} value={String(job.id)}>
                        {job.title} ({job.department}) - {job.status.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground italic">
                  * Selecting a position enables targeted ATS scoring against specific requirements.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">HR / Recruiter Name</label>
                <Input
                  placeholder="e.g. John Doe"
                  value={hrName}
                  onChange={(e) => setHrName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Uploading Date</label>
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
              </div>
            </div>

            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <input
                type="file"
                id="resume-upload"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedFile(null);
                      }}
                    >
                      Change File
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium">Click to select a file</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOC, or DOCX (max 10MB)</p>
                  </div>
                )}
              </label>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setUploadDialogOpen(false);
                  setSelectedFile(null);
                  setHrName("");
                  setCustomDate("");
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >

      {/* Assign Job Dialog */}
      < Dialog open={assignJobDialogOpen} onOpenChange={setAssignJobDialogOpen} >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Candidate to Job</DialogTitle>
            <DialogDescription>
              Select a job to assign <strong>{candidateToAssign?.candidate_name}</strong>.
              The AI will automatically re-analyze the resume against the job requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="job-select" className="text-right text-sm font-medium col-span-1">
                Job
              </label>
              <div className="col-span-3">
                <Select
                  value={selectedAssignJobId}
                  onValueChange={setSelectedAssignJobId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job position" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableJobs.map((job) => (
                      <SelectItem key={job.id} value={String(job.id)}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAssignJobDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignJob} disabled={!selectedAssignJobId || loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign & Analyze"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog >

      {/* Dynamic Details Dialog (handles Analysis, Skills, and Internship) */}
      < Dialog open={!!selectedResume
      } onOpenChange={(open) => !open && setSelectedResume(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">
                  {dialogType === 'analysis' && "AI Hiring Analysis"}
                  {dialogType === 'skills' && "Candidate Skills"}
                  {dialogType === 'internship' && "Internship Experience"}
                </DialogTitle>
                <DialogDescription className="text-lg font-medium mt-1">
                  {selectedResume?.candidate_name}
                </DialogDescription>
              </div>
              {selectedResume?.match_score && dialogType === 'analysis' && (
                <div className="text-right">
                  <div className={`text-3xl font-bold ${selectedResume.match_score >= 75 ? "text-success" :
                    selectedResume.match_score >= 50 ? "text-warning" : "text-destructive"
                    }`}>
                    {Math.round(selectedResume.match_score)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Fit Score</div>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* CONTENT BASED ON DIALOG TYPE */}

          {/* 1. SKILLS VIEW */}
          {dialogType === 'skills' && (
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {(selectedResume?.extracted_skills || selectedResume?.skills || []).map((skill: string) => (
                  <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm">
                    {skill}
                  </Badge>
                ))}
              </div>
              <div className="mt-8 text-center">
                <Button variant="outline" onClick={() => setDialogType('analysis')} className="mx-auto">
                  View AI Analysis & Fit Score
                </Button>
              </div>
            </div>
          )}

          {/* 2. INTERNSHIP VIEW */}
          {dialogType === 'internship' && (
            <div className="p-4">
              {selectedResume?.internship_details && selectedResume.internship_details.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Detected Internships
                    </h4>
                    <ul className="list-disc list-inside space-y-2 text-blue-800">
                      {selectedResume.internship_details.map((detail: string, i: number) => (
                        <li key={i} className="leading-relaxed">{detail}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    * These details were automatically extracted from the resume text.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Internship was detected but no specific details could be extracted automatically.
                  Please view the full resume.
                </p>
              )}
            </div>
          )}

          {/* 3. ANALYSIS VIEW (Existing) */}
          {dialogType === 'analysis' && (selectedResume?.ai_analysis_json ? (
            <div className="space-y-6 mt-4">
              {/* Justification - The "Human Readable" Part */}
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                <h4 className="flex items-center gap-2 font-semibold text-primary mb-2">
                  <Briefcase className="h-4 w-4" />
                  AI Justification
                </h4>
                <p className="text-foreground/80 leading-relaxed">
                  {selectedResume.ai_analysis_json.justification || selectedResume.ai_insight || "No justification provided."}
                </p>
              </div>

              {/* The 4 Quadrants */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Strengths */}
                <Card className="border-success/20 bg-success/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-success flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {selectedResume.ai_analysis_json.strengths?.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      )) || <li className="text-muted-foreground">None identified</li>}
                    </ul>
                  </CardContent>
                </Card>

                {/* 2. Weaknesses */}
                <Card className="border-warning/20 bg-warning/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-warning flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full border-2 border-warning flex items-center justify-center text-xs font-bold">!</div>
                      Weaknesses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {selectedResume.ai_analysis_json.weaknesses?.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      )) || <li className="text-muted-foreground">None identified</li>}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2 italic">* Areas for improvement, not necessarily rejection criteria.</p>
                  </CardContent>
                </Card>

                {/* 3. Risk Factors */}
                <Card className="border-destructive/20 bg-destructive/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-destructive flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full border-2 border-destructive flex items-center justify-center text-xs font-bold">R</div>
                      Risk Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {selectedResume.ai_analysis_json.risk_factors?.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      )) || <li className="text-muted-foreground">None identified</li>}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2 italic">* Potential hiring risks to investigate.</p>
                  </CardContent>
                </Card>

                {/* 4. Potential Rewards */}
                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-blue-600 flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full border-2 border-blue-600 flex items-center justify-center text-xs font-bold">+</div>
                      Potential Rewards
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {selectedResume.ai_analysis_json.potential_rewards?.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      )) || <li className="text-muted-foreground">None identified</li>}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2 italic">* Upside potential beyond standard requirements.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Analysis data not available yet. Please allow some time for processing.</p>
            </div>
          ))}

        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
