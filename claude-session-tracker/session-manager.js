/**
 * Claude Code Session Manager
 * Tracks development sessions, agent usage, token consumption, and costs
 */

const fs = require('fs').promises;
const path = require('path');

class SessionManager {
  constructor() {
    this.sessionsDir = path.join(__dirname, 'sessions');
    this.currentSession = null;
    this.ensureSessionsDir();
  }

  async ensureSessionsDir() {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating sessions directory:', error);
    }
  }

  /**
   * Start a new development session
   */
  async startSession(goal, intention) {
    // Review previous session
    const previousSession = await this.getPreviousSession();
    
    const session = {
      id: `session_${Date.now()}`,
      startTime: new Date().toISOString(),
      goal,
      intention,
      previousSessionSummary: previousSession?.summary || null,
      endTime: null,
      duration: null,
      agents: [],
      tasks: [],
      filesModified: [],
      commits: [],
      tokens: {
        total: 0,
        byModel: {},
        byAgent: {}
      },
      costs: {
        total: 0,
        byModel: {},
        breakdown: []
      },
      summary: null,
      status: 'active'
    };

    this.currentSession = session;
    await this.saveSession();
    
    return {
      sessionId: session.id,
      message: `Session started: ${goal}`,
      previousWork: previousSession?.summary || 'No previous session found'
    };
  }

  /**
   * End the current session
   */
  async endSession(summary) {
    if (!this.currentSession) {
      return { error: 'No active session to end' };
    }

    this.currentSession.endTime = new Date().toISOString();
    this.currentSession.duration = this.calculateDuration();
    this.currentSession.summary = summary;
    this.currentSession.status = 'completed';
    
    await this.saveSession();
    
    const report = this.generateSessionReport();
    this.currentSession = null;
    
    return report;
  }

  /**
   * Log agent activity
   */
  async logAgent(agentName, task, tokens, model) {
    if (!this.currentSession) {
      return { error: 'No active session' };
    }

    const agentLog = {
      timestamp: new Date().toISOString(),
      agent: agentName,
      task,
      tokens,
      model
    };

    this.currentSession.agents.push(agentLog);
    
    // Update token counts
    this.currentSession.tokens.total += tokens;
    this.currentSession.tokens.byModel[model] = 
      (this.currentSession.tokens.byModel[model] || 0) + tokens;
    this.currentSession.tokens.byAgent[agentName] = 
      (this.currentSession.tokens.byAgent[agentName] || 0) + tokens;
    
    // Calculate cost (example rates)
    const cost = this.calculateCost(tokens, model);
    this.currentSession.costs.total += cost;
    this.currentSession.costs.byModel[model] = 
      (this.currentSession.costs.byModel[model] || 0) + cost;
    
    await this.saveSession();
    
    return { logged: true, totalTokens: this.currentSession.tokens.total };
  }

  /**
   * Log a completed task
   */
  async logTask(task, status = 'completed') {
    if (!this.currentSession) {
      return { error: 'No active session' };
    }

    this.currentSession.tasks.push({
      timestamp: new Date().toISOString(),
      task,
      status
    });

    await this.saveSession();
    return { logged: true, totalTasks: this.currentSession.tasks.length };
  }

  /**
   * Log file modifications
   */
  async logFileChange(filePath, changeType) {
    if (!this.currentSession) {
      return { error: 'No active session' };
    }

    this.currentSession.filesModified.push({
      timestamp: new Date().toISOString(),
      file: filePath,
      type: changeType // 'created', 'modified', 'deleted'
    });

    await this.saveSession();
    return { logged: true };
  }

  /**
   * Get previous session summary
   */
  async getPreviousSession() {
    try {
      const files = await fs.readdir(this.sessionsDir);
      const sessionFiles = files
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => b.localeCompare(a));
      
      if (sessionFiles.length < 2) return null;
      
      // Get the second most recent (previous session)
      const previousFile = sessionFiles[1];
      const content = await fs.readFile(
        path.join(this.sessionsDir, previousFile), 
        'utf-8'
      );
      
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading previous session:', error);
      return null;
    }
  }

  /**
   * Calculate session duration
   */
  calculateDuration() {
    if (!this.currentSession || !this.currentSession.startTime) return 0;
    
    const start = new Date(this.currentSession.startTime);
    const end = new Date();
    const durationMs = end - start;
    
    return {
      milliseconds: durationMs,
      seconds: Math.floor(durationMs / 1000),
      minutes: Math.floor(durationMs / 60000),
      formatted: this.formatDuration(durationMs)
    };
  }

  /**
   * Format duration for display
   */
  formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Calculate cost based on token usage
   */
  calculateCost(tokens, model) {
    // Example rates (adjust based on actual pricing)
    const rates = {
      'gpt-4': 0.03 / 1000,        // $0.03 per 1K tokens
      'gpt-3.5-turbo': 0.002 / 1000, // $0.002 per 1K tokens
      'claude-3-opus': 0.015 / 1000,  // $0.015 per 1K tokens
      'claude-3-sonnet': 0.003 / 1000 // $0.003 per 1K tokens
    };
    
    const rate = rates[model] || 0.01 / 1000;
    return tokens * rate;
  }

  /**
   * Generate session report
   */
  generateSessionReport() {
    if (!this.currentSession) return null;
    
    return {
      sessionId: this.currentSession.id,
      duration: this.currentSession.duration?.formatted || '0s',
      goal: this.currentSession.goal,
      tasksCompleted: this.currentSession.tasks.length,
      filesModified: this.currentSession.filesModified.length,
      agentsUsed: [...new Set(this.currentSession.agents.map(a => a.agent))].length,
      totalTokens: this.currentSession.tokens.total,
      totalCost: `$${this.currentSession.costs.total.toFixed(4)}`,
      tokensByModel: this.currentSession.tokens.byModel,
      costsByModel: Object.entries(this.currentSession.costs.byModel)
        .reduce((acc, [model, cost]) => {
          acc[model] = `$${cost.toFixed(4)}`;
          return acc;
        }, {}),
      summary: this.currentSession.summary
    };
  }

  /**
   * Save current session to file
   */
  async saveSession() {
    if (!this.currentSession) return;
    
    const filename = `${this.currentSession.id}.json`;
    const filepath = path.join(this.sessionsDir, filename);
    
    try {
      await fs.writeFile(
        filepath, 
        JSON.stringify(this.currentSession, null, 2)
      );
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  /**
   * Get session status
   */
  getStatus() {
    if (!this.currentSession) {
      return { status: 'No active session' };
    }
    
    return {
      status: 'Active',
      sessionId: this.currentSession.id,
      goal: this.currentSession.goal,
      duration: this.calculateDuration().formatted,
      tasks: this.currentSession.tasks.length,
      tokens: this.currentSession.tokens.total,
      cost: `$${this.currentSession.costs.total.toFixed(4)}`
    };
  }
}

module.exports = SessionManager;