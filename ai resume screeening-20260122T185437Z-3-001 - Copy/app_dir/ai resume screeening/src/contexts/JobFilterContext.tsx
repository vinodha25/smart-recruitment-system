import React, { createContext, useContext, useState, useEffect } from 'react';

interface JobFilterContextType {
    selectedJobIds: number[];
    toggleJob: (jobId: number) => void;
    clearAllJobs: () => void;
    selectAllJobs: (jobIds: number[]) => void;
    isJobSelected: (jobId: number) => boolean;
}

const JobFilterContext = createContext<JobFilterContextType | undefined>(undefined);

export function JobFilterProvider({ children }: { children: React.ReactNode }) {
    // Load from localStorage on mount
    const [selectedJobIds, setSelectedJobIds] = useState<number[]>(() => {
        const saved = localStorage.getItem('selectedJobIds');
        return saved ? JSON.parse(saved) : [];
    });

    // Save to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('selectedJobIds', JSON.stringify(selectedJobIds));
    }, [selectedJobIds]);

    const toggleJob = (jobId: number) => {
        setSelectedJobIds(prev =>
            prev.includes(jobId)
                ? prev.filter(id => id !== jobId)
                : [...prev, jobId]
        );
    };

    const clearAllJobs = () => {
        setSelectedJobIds([]);
    };

    const selectAllJobs = (jobIds: number[]) => {
        setSelectedJobIds(jobIds);
    };

    const isJobSelected = (jobId: number) => {
        return selectedJobIds.includes(jobId);
    };

    return (
        <JobFilterContext.Provider value={{
            selectedJobIds,
            toggleJob,
            clearAllJobs,
            selectAllJobs,
            isJobSelected,
        }}>
            {children}
        </JobFilterContext.Provider>
    );
}

export function useJobFilter() {
    const context = useContext(JobFilterContext);
    if (context === undefined) {
        throw new Error('useJobFilter must be used within a JobFilterProvider');
    }
    return context;
}
