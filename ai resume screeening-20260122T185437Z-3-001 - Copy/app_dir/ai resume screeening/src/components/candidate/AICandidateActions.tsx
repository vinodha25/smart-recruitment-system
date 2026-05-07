import { Button } from "@/components/ui/button";
import {
    Brain,
    Sparkles,
    UsersRound,
    DollarSign,
    Compass,
    Lightbulb,
    TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface AICandidateActionsProps {
    candidateId: number;
    className?: string;
}

export function AICandidateActions({ candidateId, className }: AICandidateActionsProps) {
    const navigate = useNavigate();

    const actions = [
        {
            label: "Success Predictor",
            icon: TrendingUp,
            path: `/ai/predictor?candidateId=${candidateId}`,
            color: "text-indigo-600 hover:bg-slate-100",
        },
        {
            label: "Team Compatibility",
            icon: UsersRound,
            path: `/ai/compatibility?candidateId=${candidateId}`,
            color: "text-blue-600 hover:bg-slate-100",
        },
    ];

    return (
        <TooltipProvider>
            <div className={`flex items-center gap-1.5 ${className}`}>
                {actions.map((action) => (
                    <Tooltip key={action.label}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-9 w-9 rounded-xl transition-all hover:scale-110 active:scale-95 ${action.color} border border-transparent hover:border-slate-200 shadow-sm`}
                                onClick={() => navigate(action.path)}
                            >
                                <action.icon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-[10px] font-bold uppercase tracking-widest">{action.label}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </TooltipProvider>
    );
}
