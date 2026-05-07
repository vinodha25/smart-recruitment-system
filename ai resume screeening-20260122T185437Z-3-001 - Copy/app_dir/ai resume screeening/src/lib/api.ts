// API client for connecting to the backend
const API_BASE_URL = "http://localhost:8000";

// API client with error handling
class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem("access_token");
    }

    setToken(token: string) {
        this.token = token;
        localStorage.setItem("access_token", token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem("access_token");
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const headers: HeadersInit = {
            ...options.headers,
        };

        // Add auth token if available
        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }

        // Add content type for JSON requests
        if (!(options.body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
        }

        let response;
        try {
            response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers,
            });
        } catch (error) {
            console.error("Network error:", error);
            throw new Error("Cannot connect to the backend server. Please ensure it is running.");
        }

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                window.location.href = "/login";
                throw new Error("Session expired. Please login again.");
            }
            const error = await response.json().catch(() => ({ detail: "Request failed" }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // Auth endpoints
    async register(data: { email: string; password: string; full_name: string; role: string; department?: string }) {
        return this.request("/api/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async login(email: string, password: string) {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);
        formData.append("grant_type", "password");

        const response = await fetch(`${this.baseUrl}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error("Login failed");
        }

        const data = await response.json();
        this.setToken(data.access_token);
        return data;
    }

    async getCurrentUser() {
        return this.request("/api/auth/me");
    }

    // Job endpoints
    async getJobs() {
        return this.request("/api/jobs");
    }

    async createJob(data: any) {
        return this.request("/api/jobs", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async getJob(id: number) {
        return this.request(`/api/jobs/${id}`);
    }

    async updateJob(id: number, data: any) {
        return this.request(`/api/jobs/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    }

    async deleteJob(id: number) {
        return this.request(`/api/jobs/${id}`, {
            method: "DELETE",
        });
    }

    // Resume endpoints
    async uploadResume(file: File, jobId?: number, recruiterName?: string, applicationDate?: string) {
        console.log("API uploadResume calling with jobId:", jobId, "recruiter:", recruiterName);
        const formData = new FormData();
        formData.append("file", file);
        if (jobId !== undefined && jobId !== null) {
            formData.append("job_id", String(jobId));
        }
        if (recruiterName) {
            formData.append("recruiter_name", recruiterName);
        }
        if (applicationDate) {
            formData.append("application_date", applicationDate);
        }

        const headers: HeadersInit = {};
        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }

        let response;
        try {
            response = await fetch(`${this.baseUrl}/api/resumes/upload`, {
                method: "POST",
                headers,
                body: formData,
            });
        } catch (error) {
            console.error("Network error during upload:", error);
            throw new Error("Cannot connect to the backend server. Please ensure it is running.");
        }

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                window.location.href = "/login";
                throw new Error("Session expired. Please login again.");
            }
            const error = await response.json().catch(() => ({ detail: "Upload failed" }));
            throw new Error(error.detail || "Upload failed");
        }

        return response.json();
    }

    async downloadResume(candidateId: number) {
        const headers: HeadersInit = {};
        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${this.baseUrl}/api/candidates/${candidateId}/resume`, {
            headers,
        });

        if (!response.ok) {
            throw new Error("Failed to download resume");
        }

        return response.blob();
    }

    async getResumes() {
        return this.request("/api/resumes");
    }

    async getResume(id: number) {
        return this.request(`/api/resumes/${id}`);
    }

    async deleteResume(id: number) {
        return this.request(`/api/resumes/${id}`, {
            method: "DELETE",
        });
    }

    // Candidate endpoints
    async getCandidates(jobId?: number, status?: string, limit: number = 100) {
        const queryParams = new URLSearchParams();
        if (jobId) queryParams.append("job_id", jobId.toString());
        if (status) queryParams.append("status", status);
        if (limit) queryParams.append("limit", limit.toString());

        const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
        return this.request(`/api/candidates${query}`);
    }

    async getCandidate(id: number) {
        return this.request(`/api/candidates/${id}`);
    }

    async updateCandidateStatus(id: number, status: string) {
        return this.request(`/api/candidates/${id}`, {
            method: "PUT",
            body: JSON.stringify({ status }),
        });
    }

    async updateCandidate(id: number, data: any) {
        return this.request(`/api/candidates/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    }

    // Screening endpoints
    async screenCandidate(candidateId: number, jobId?: number) {
        return this.request(`/api/candidates/${candidateId}/screen`, {
            method: "POST",
            body: jobId ? JSON.stringify({ job_id: jobId }) : JSON.stringify({}),
        });
    }

    async getScreeningResults(jobId?: number) {
        const query = jobId ? `?job_id=${jobId}` : "";
        return this.request(`/api/screening/results${query}`);
    }

    async getScreeningStats(jobId?: number) {
        const query = jobId ? `?job_id=${jobId}` : "";
        return this.request(`/api/screening/stats${query}`);
    }

    // Interview endpoints
    async getInterviews() {
        return this.request("/api/interviews");
    }

    async scheduleInterview(data: any) {
        return this.request("/api/interviews", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async getInterviewStats() {
        return this.request("/api/interviews/stats/summary");
    }

    // Decision endpoints
    async makeDecision(data: any) {
        return this.request("/api/decisions", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async getDecisions() {
        return this.request("/api/decisions");
    }

    // AI Insights endpoints
    async explainScore(candidateId: number) {
        return this.request(`/api/ai/explain/${candidateId}`, { method: "POST" });
    }

    async predictSuccess(candidateId: number) {
        return this.request(`/api/ai/success-prediction/${candidateId}`, { method: "POST" });
    }

    async getLearningPath(candidateId: number) {
        return this.request(`/api/ai/learning-path/${candidateId}`, { method: "POST" });
    }

    async analyzeTeamFit(candidateId: number, teamId: string = "default") {
        const query = teamId ? `?team_id=${encodeURIComponent(teamId)}` : "";
        return this.request(`/api/ai/team-compatibility/${candidateId}${query}`, { method: "POST" });
    }

    async careerSimulation(candidateId: number, currentRole: string = "", updates: string = "") {
        return this.request(`/api/ai/career-path/${candidateId}`, { 
            method: "POST",
            body: JSON.stringify({ currentRole, updates })
        });
    }

    async getCostIntelligence(candidateId: number) {
        return this.request(`/api/ai/cost-intelligence/${candidateId}`, { method: "POST" });
    }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Export types
export type { ApiClient };
