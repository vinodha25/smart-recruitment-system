import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { JobFilterProvider } from "./contexts/JobFilterContext";
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import Candidates from "./pages/Candidates";
import Resumes from "./pages/Resumes";
import Screening from "./pages/Screening";
import Interviews from "./pages/Interviews";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import RejectedCandidates from "./pages/RejectedCandidates";
import EvaluatedCandidates from "./pages/EvaluatedCandidates";
import Teams from "./pages/Teams";
import TeamDetails from "./pages/TeamDetails";

// AI Modules
import SuccessPredictor from "./pages/ai/SuccessPredictor";
import LearningPaths from "./pages/ai/LearningPaths";
import TeamCompatibility from "./pages/ai/TeamCompatibility";
import CostIntelligence from "./pages/ai/CostIntelligence";
import CareerSimulator from "./pages/ai/CareerSimulator";
import AIInsights from "./pages/ai/AIInsights";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <JobFilterProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/candidates" element={<Candidates />} />
            <Route path="/resumes" element={<Resumes />} />
            <Route path="/screening" element={<Screening />} />
            <Route path="/interviews" element={<Interviews />} />
            <Route path="/rejected" element={<RejectedCandidates />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/evaluated" element={<EvaluatedCandidates />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:teamId" element={<TeamDetails />} />

            {/* AI Modules */}
            <Route path="/ai/predictor" element={<SuccessPredictor />} />
            <Route path="/ai/learning" element={<LearningPaths />} />
            <Route path="/ai/compatibility" element={<TeamCompatibility />} />
            <Route path="/ai/cost" element={<CostIntelligence />} />
            <Route path="/ai/career" element={<CareerSimulator />} />
            <Route path="/ai/insights" element={<AIInsights />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </JobFilterProvider>
  </QueryClientProvider>
);

export default App;
