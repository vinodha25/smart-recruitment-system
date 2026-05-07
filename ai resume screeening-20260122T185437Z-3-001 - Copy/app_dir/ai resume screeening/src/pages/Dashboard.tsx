import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import { RecentCandidates } from "@/components/dashboard/RecentCandidates";
import { HiringFunnel } from "@/components/dashboard/HiringFunnel";
import { OpenPositions } from "@/components/dashboard/OpenPositions";
import { Users, Briefcase, Calendar, TrendingUp, UserX, UserCheck, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { JobFilterPanel } from "@/components/JobFilterPanel";
import { useJobFilter } from "@/contexts/JobFilterContext";

const initialInsights = [
  {
    title: "System Ready",
    description: "AI modules are active. Upload resumes to generate insights.",
    action: "Upload Resume",
  }
];

export default function Dashboard() {
  const [stats, setStats] = useState<any>({
    total_candidates: 0,
    reviewed: 0,
    shortlisted: 0,
    rejected: 0,
    average_score: 0
  });
  const [loading, setLoading] = useState(true);
  const [interviewStats, setInterviewStats] = useState<any>({ this_week: 0 });
  const [jobStats, setJobStats] = useState<any>({ total: 0 });
  const { selectedJobIds } = useJobFilter();

  useEffect(() => {
    fetchStats();
  }, [selectedJobIds]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      if (selectedJobIds.length > 0) {
        // Fetch stats for selected jobs only
        const allStats = await Promise.all(
          selectedJobIds.map(async (jobId) => {
            const [screening, interviews] = await Promise.all([
              api.getScreeningStats(jobId).catch(() => ({ total_screened: 0, recommended: 0, pending_review: 0, not_recommended: 0, average_score: 0 })),
              api.getInterviewStats().catch(() => ({ this_week: 0 }))
            ]);
            return { screening, interviews };
          })
        );

        // Aggregate stats from all selected jobs
        const aggregatedStats = allStats.reduce((acc, curr) => ({
          total_candidates: acc.total_candidates + (curr.screening.total_screened || 0),
          reviewed: acc.reviewed + (curr.screening.pending_review || 0),
          shortlisted: acc.shortlisted + (curr.screening.recommended || 0),
          rejected: acc.rejected + (curr.screening.not_recommended || 0),
          average_score: (acc.average_score + (curr.screening.average_score || 0)) / 2
        }), { total_candidates: 0, reviewed: 0, shortlisted: 0, rejected: 0, average_score: 0 });

        setStats(aggregatedStats);
        setInterviewStats(allStats[0]?.interviews || { this_week: 0 });
        setJobStats({ total: selectedJobIds.length });
      } else {
        // Fetch all stats (original behavior)
        const [screening, interviews, jobs] = await Promise.all([
          api.getScreeningStats().catch(() => ({ total_screened: 0, recommended: 0, pending_review: 0, not_recommended: 0, average_score: 0 })),
          api.getInterviewStats().catch(() => ({ this_week: 0 })),
          api.getJobs().catch(() => [])
        ]);

        setStats({
          total_candidates: screening.total_screened || 0,
          reviewed: screening.pending_review || 0,
          shortlisted: screening.recommended || 0,
          rejected: screening.not_recommended || 0,
          average_score: screening.average_score || 0
        });
        setInterviewStats(interviews);
        setJobStats({ total: Array.isArray(jobs) ? jobs.length : 0 });
      }
    } catch (e) {
      console.error("Failed to load dashboard stats", e);
      setStats({
        total_candidates: 0,
        reviewed: 0,
        shortlisted: 0,
        rejected: 0,
        average_score: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Dashboard" subtitle="Loading...">
        <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard" subtitle="Welcome back! Here's your hiring overview.">
      <div className="space-y-6">
        {/* Job Filter Panel */}
        <JobFilterPanel />

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <StatCard
            title="Total Candidates"
            value={stats.total_candidates.toString()}
            change="Real-time"
            changeType="neutral"
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="Open Positions"
            value={jobStats.total.toString()}
            change="Active Roles"
            changeType="neutral"
            icon={Briefcase}
            variant="accent"
          />
          <StatCard
            title="Interviews This Week"
            value={interviewStats.this_week.toString()}
            change="Upcoming"
            changeType="positive"
            icon={Calendar}
            variant="success"
          />
          <StatCard
            title="Shortlisted"
            value={stats.shortlisted.toString()}
            change={`${stats.total_candidates > 0 ? Math.round((stats.shortlisted / stats.total_candidates) * 100) : 0}% of total`}
            changeType="positive"
            icon={UserCheck}
            variant="success"
          />
          <StatCard
            title="Rejected"
            value={stats.rejected.toString()}
            change={`${stats.total_candidates > 0 ? Math.round((stats.rejected / stats.total_candidates) * 100) : 0}% of total`}
            changeType="neutral"
            icon={UserX}
            variant="danger"
          />
          <StatCard
            title="Avg. Match Score"
            value={`${stats.average_score}%`}
            change="AI Evaluated"
            changeType="positive"
            icon={TrendingUp}
            variant="warning"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <HiringFunnel stats={stats} />
            <RecentCandidates />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <AIInsightCard insights={initialInsights} />
            <OpenPositions />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
