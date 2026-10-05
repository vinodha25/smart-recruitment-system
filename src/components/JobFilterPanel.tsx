import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Check } from "lucide-react";
import { useJobFilter } from "@/contexts/JobFilterContext";
import { api } from "@/lib/api";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface Job {
    id: number;
    title: string;
    department: string | null;
    status: string;
}

export function JobFilterPanel() {
    const { selectedJobIds, toggleJob, clearAllJobs, isJobSelected } = useJobFilter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        loadJobs();
    }, []);

    const loadJobs = async () => {
        try {
            setLoading(true);
            const data = await api.getJobs();
            setJobs(data.filter((job: Job) => job.status === 'active'));
        } catch (error) {
            console.error("Failed to load jobs:", error);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading || jobs.length === 0) {
        return null;
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 border-dashed mb-4">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter Jobs
                    {selectedJobIds.length > 0 && (
                        <>
                            <Separator orientation="vertical" className="mx-2 h-4" />
                            <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                                {selectedJobIds.length}
                            </Badge>
                            <div className="hidden space-x-1 lg:flex">
                                {selectedJobIds.length > 2 ? (
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                        {selectedJobIds.length} selected
                                    </Badge>
                                ) : (
                                    jobs
                                        .filter((job) => selectedJobIds.includes(job.id))
                                        .map((job) => (
                                            <Badge
                                                variant="secondary"
                                                key={job.id}
                                                className="rounded-sm px-1 font-normal"
                                            >
                                                {job.title}
                                            </Badge>
                                        ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search jobs..." />
                    <CommandList>
                        <CommandEmpty>No jobs found.</CommandEmpty>
                        <CommandGroup>
                            {jobs.map((job) => {
                                const isSelected = isJobSelected(job.id);
                                return (
                                    <CommandItem
                                        key={job.id}
                                        onSelect={() => toggleJob(job.id)}
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "opacity-50 [&_svg]:invisible"
                                            )}
                                        >
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        <span>{job.title}</span>
                                        {job.department && (
                                            <span className="ml-2 text-xs text-muted-foreground truncate">
                                                {job.department}
                                            </span>
                                        )}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                        {selectedJobIds.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={clearAllJobs}
                                        className="justify-center text-center"
                                    >
                                        Clear filters
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
