// API Client for TK Content Orchestrator
class APIClient {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.token = localStorage.getItem('tk_auth_token');
        this.refreshToken = localStorage.getItem('tk_refresh_token');
    }

    // Set authentication tokens
    setTokens(token, refreshToken) {
        this.token = token;
        this.refreshToken = refreshToken;
        localStorage.setItem('tk_auth_token', token);
        localStorage.setItem('tk_refresh_token', refreshToken);
    }

    // Clear authentication
    clearAuth() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('tk_auth_token');
        localStorage.removeItem('tk_refresh_token');
        localStorage.removeItem('tk_user');
    }

    // Make authenticated request
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
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
                    return await fetch(url, { ...options, headers });
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
    async refreshAccessToken() {
        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
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
    async register(userData) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        this.setTokens(data.token, data.refreshToken);
        localStorage.setItem('tk_user', JSON.stringify(data.user));
        return data;
    }

    async login(credentials) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        this.setTokens(data.token, data.refreshToken);
        localStorage.setItem('tk_user', JSON.stringify(data.user));
        return data;
    }

    async logout() {
        await this.request('/auth/logout', { method: 'POST' });
        this.clearAuth();
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    // Content endpoints
    async getContent(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await this.request(`/content${query ? `?${query}` : ''}`);
    }

    async getContentById(id) {
        return await this.request(`/content/${id}`);
    }

    async createContent(contentData) {
        return await this.request('/content', {
            method: 'POST',
            body: JSON.stringify(contentData)
        });
    }

    async updateContent(id, contentData) {
        return await this.request(`/content/${id}`, {
            method: 'PUT',
            body: JSON.stringify(contentData)
        });
    }

    async deleteContent(id) {
        return await this.request(`/content/${id}`, {
            method: 'DELETE'
        });
    }

    async publishContent(id) {
        return await this.request(`/content/${id}/publish`, {
            method: 'POST'
        });
    }

    // Session endpoints
    async getSessions(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await this.request(`/sessions${query ? `?${query}` : ''}`);
    }

    async getActiveSession() {
        return await this.request('/sessions/active');
    }

    async startSession(sessionData) {
        return await this.request('/sessions/start', {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
    }

    async endSession(id, data = {}) {
        return await this.request(`/sessions/${id}/end`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async pauseSession(id) {
        return await this.request(`/sessions/${id}/pause`, {
            method: 'POST'
        });
    }

    async resumeSession(id) {
        return await this.request(`/sessions/${id}/resume`, {
            method: 'POST'
        });
    }

    // Analytics endpoints
    async getDashboardAnalytics() {
        return await this.request('/analytics/dashboard');
    }

    async getContentPerformance(period = '30d') {
        return await this.request(`/analytics/content-performance?period=${period}`);
    }

    async getProductivityTrends() {
        return await this.request('/analytics/productivity');
    }

    async getAgentUtilization(period = '7d') {
        return await this.request(`/analytics/agent-utilization?period=${period}`);
    }

    // Agent endpoints
    async getAgents() {
        return await this.request('/agents');
    }

    async getAgent(id) {
        return await this.request(`/agents/${id}`);
    }

    async getAgentTasks(id, params = {}) {
        const query = new URLSearchParams(params).toString();
        return await this.request(`/agents/${id}/tasks${query ? `?${query}` : ''}`);
    }

    async getAgentPerformance(id) {
        return await this.request(`/agents/${id}/performance`);
    }

    // Publishing endpoints
    async getPublishingSchedules(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await this.request(`/publishing/schedules${query ? `?${query}` : ''}`);
    }

    async schedulePublishing(data) {
        return await this.request('/publishing/schedule', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async publishNow(contentId, platforms) {
        return await this.request('/publishing/publish-now', {
            method: 'POST',
            body: JSON.stringify({ contentId, platforms })
        });
    }

    async getPublishingQueue() {
        return await this.request('/publishing/queue');
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIClient;
} else {
    window.APIClient = APIClient;
}