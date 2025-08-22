// API Client for TK Content Orchestrator
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002/api/v1';

class APIClient {
    private token: string | null = null;
    private refreshToken: string | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('tk_auth_token');
            this.refreshToken = localStorage.getItem('tk_refresh_token');
        }
    }

    // Set authentication tokens
    setTokens(token: string, refreshToken?: string) {
        this.token = token;
        this.refreshToken = refreshToken || null;
        if (typeof window !== 'undefined') {
            localStorage.setItem('tk_auth_token', token);
            if (refreshToken) {
                localStorage.setItem('tk_refresh_token', refreshToken);
            }
        }
    }

    // Clear authentication
    clearAuth() {
        this.token = null;
        this.refreshToken = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('tk_auth_token');
            localStorage.removeItem('tk_refresh_token');
            localStorage.removeItem('tk_user');
        }
    }

    // Make authenticated request
    async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (response.status === 401 && this.refreshToken) {
                // Try to refresh token
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // Retry original request
                    headers['Authorization'] = `Bearer ${this.token}`;
                    const retryResponse = await fetch(url, { ...options, headers });
                    if (!retryResponse.ok) {
                        const error = await retryResponse.json().catch(() => ({ error: 'Request failed' }));
                        throw new Error(error.error || `HTTP ${retryResponse.status}`);
                    }
                    return await retryResponse.json();
                }
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Refresh access token
    async refreshAccessToken(): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.setTokens(data.token, data.refreshToken);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
        
        this.clearAuth();
        return false;
    }

    // Auth endpoints
    async register(userData: {
        username?: string;
        email: string;
        password: string;
        name?: string;
        firstName?: string;
        lastName?: string;
    }) {
        // Our backend expects 'name' field, not separate firstName/lastName
        const registrationData = {
            email: userData.email,
            password: userData.password,
            name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.username || 'User'
        };
        
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(registrationData)
        });
        this.setTokens(data.token);
        if (typeof window !== 'undefined') {
            localStorage.setItem('tk_user', JSON.stringify(data.user));
        }
        return data;
    }

    async login(credentials: { email?: string; username?: string; password: string }) {
        // Our backend expects only email and password
        const loginData = {
            email: credentials.email || credentials.username || '',
            password: credentials.password
        };
        
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(loginData)
        });
        this.setTokens(data.token);
        if (typeof window !== 'undefined') {
            localStorage.setItem('tk_user', JSON.stringify(data.user));
        }
        return data;
    }

    async logout() {
        await this.request('/auth/logout', { method: 'POST' });
        this.clearAuth();
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    async updateProfile(data: any) {
        return await this.request('/auth/profile', {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    // Content endpoints
    async getContent(params: Record<string, any> = {}) {
        const query = new URLSearchParams(params).toString();
        return await this.request(`/content${query ? `?${query}` : ''}`);
    }

    async getContentById(id: string) {
        return await this.request(`/content/${id}`);
    }

    async createContent(contentData: any) {
        return await this.request('/content', {
            method: 'POST',
            body: JSON.stringify(contentData)
        });
    }

    async updateContent(id: string, contentData: any) {
        return await this.request(`/content/${id}`, {
            method: 'PUT',
            body: JSON.stringify(contentData)
        });
    }

    async deleteContent(id: string) {
        return await this.request(`/content/${id}`, {
            method: 'DELETE'
        });
    }

    async publishContent(id: string) {
        return await this.request(`/content/${id}/publish`, {
            method: 'POST'
        });
    }

    // Session endpoints
    async getSessions(params: Record<string, any> = {}) {
        const query = new URLSearchParams(params).toString();
        return await this.request(`/sessions${query ? `?${query}` : ''}`);
    }

    async getActiveSession() {
        return await this.request('/sessions/active');
    }

    async startSession(sessionData: { title: string; description?: string; type?: string }) {
        return await this.request('/sessions/start', {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
    }

    async endSession(id: string, data: any = {}) {
        return await this.request(`/sessions/${id}/end`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Analytics endpoints
    async getDashboardAnalytics() {
        return await this.request('/analytics/dashboard');
    }

    async getContentPerformance(period: string = '30d') {
        return await this.request(`/analytics/content-performance?period=${period}`);
    }

    async getProductivityTrends() {
        return await this.request('/analytics/productivity');
    }

    async getAgentUtilization(period: string = '7d') {
        return await this.request(`/analytics/agent-utilization?period=${period}`);
    }

    // Agent endpoints
    async getAgents() {
        return await this.request('/agents');
    }

    async getAgent(id: string) {
        return await this.request(`/agents/${id}`);
    }

    async getAgentTasks(id: string, params: Record<string, any> = {}) {
        const query = new URLSearchParams(params).toString();
        return await this.request(`/agents/${id}/tasks${query ? `?${query}` : ''}`);
    }

    async getAgentPerformance(id: string) {
        return await this.request(`/agents/${id}/performance`);
    }

    // Publishing endpoints
    async getPublishingSchedules(params: Record<string, any> = {}) {
        const query = new URLSearchParams(params).toString();
        return await this.request(`/publishing/schedules${query ? `?${query}` : ''}`);
    }

    async schedulePublishing(data: any) {
        return await this.request('/publishing/schedule', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async publishNow(contentId: string, platforms: string[]) {
        return await this.request('/publishing/publish-now', {
            method: 'POST',
            body: JSON.stringify({ contentId, platforms })
        });
    }

    // Health check
    async checkHealth() {
        const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`);
        return await response.json();
    }
}

// Create singleton instance
const apiClient = new APIClient();

export default apiClient;
export { APIClient };