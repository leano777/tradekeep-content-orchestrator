/**
 * Simple Session Automation for Claude Code
 * Handles session lifecycle without external dependencies
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SessionAutomation {
  constructor() {
    this.sessionDir = path.join(__dirname, 'sessions');
    this.currentSession = null;
    this.projectRoot = path.resolve(__dirname, '..');
  }

  /**
   * Start a new session with goal setting and previous work review
   */
  async startSession(goal, intention) {
    console.log('\n🚀 Starting new development session...\n');
    
    // Get previous session summary
    const previousSession = await this.getPreviousSession();
    
    // Create new session
    this.currentSession = {
      id: `session_${Date.now()}`,
      startTime: new Date().toISOString(),
      goal,
      intention,
      project: path.basename(this.projectRoot),
      previousWork: previousSession?.summary || null,
      tasks: [],
      filesModified: [],
      testsRun: [],
      commits: [],
      agents: [],  // Track all agent usage
      tokens: { 
        total: 0, 
        byModel: {}, 
        byAgent: {}  // Detailed agent breakdown
      },
      costs: { 
        total: 0, 
        byModel: {},
        byAgent: {}  // Cost per agent
      }
    };

    await this.saveSession();

    // Display session info
    console.log('📋 Session Details:');
    console.log(`   ID: ${this.currentSession.id}`);
    console.log(`   Goal: ${goal}`);
    console.log(`   Project: ${this.currentSession.project}`);
    
    if (previousSession?.summary) {
      console.log('\n📚 Previous Session Summary:');
      console.log(`   ${previousSession.summary}`);
      if (previousSession.nextSteps?.length > 0) {
        console.log('\n📌 Suggested next steps from last session:');
        previousSession.nextSteps.forEach((step, i) => {
          console.log(`   ${i + 1}. ${step}`);
        });
      }
    }
    
    console.log('\n✅ Session tracking started!\n');
    return this.currentSession.id;
  }

  /**
   * End session with full workflow
   */
  async endSession(summary, nextSteps = []) {
    if (!this.currentSession) {
      console.log('❌ No active session to end');
      return;
    }

    console.log('\n🔚 Ending session...\n');
    
    // 1. Review work completed
    console.log('📊 Session Review:\n');
    await this.reviewWork();
    
    // 2. Run tests
    console.log('\n🧪 Running tests...\n');
    const testResults = await this.runTests();
    
    // 3. Check git status
    console.log('\n📦 Checking Git status...\n');
    const gitStatus = await this.checkGitStatus();
    
    // 4. Handle git operations if needed
    if (gitStatus.hasChanges && testResults.success) {
      const shouldCommit = await this.promptUser(
        '\n✅ All tests passed! You have uncommitted changes.\nWould you like to commit and push to GitHub? (yes/no): '
      );
      
      if (shouldCommit) {
        await this.handleGitOperations(summary);
      }
    } else if (gitStatus.hasChanges && !testResults.success) {
      console.log('\n⚠️ Tests failed. Skipping git operations.');
      console.log('   Fix the failing tests before committing.\n');
    } else if (!gitStatus.hasChanges) {
      console.log('✨ No uncommitted changes.\n');
    }
    
    // 5. Calculate final metrics
    const duration = this.calculateDuration();
    
    // 6. Update session data
    this.currentSession.endTime = new Date().toISOString();
    this.currentSession.duration = duration;
    this.currentSession.summary = summary;
    this.currentSession.nextSteps = nextSteps;
    this.currentSession.testResults = testResults;
    this.currentSession.gitStatus = gitStatus;
    
    // 7. Save final session
    await this.saveSession();
    
    // 8. Generate and display report
    const report = this.generateReport();
    console.log(report);
    
    // 9. Update dashboard data
    await this.updateDashboardData();
    
    // Reset current session
    this.currentSession = null;
    
    console.log('\n🎉 Session ended successfully!\n');
  }

  /**
   * Review work completed in session
   */
  async reviewWork() {
    if (!this.currentSession) return;
    
    console.log(`⏱️  Duration: ${this.calculateDuration().formatted}`);
    console.log(`📝 Tasks completed: ${this.currentSession.tasks.length}`);
    
    if (this.currentSession.tasks.length > 0) {
      console.log('\nTasks:');
      this.currentSession.tasks.forEach((task, i) => {
        console.log(`  ${i + 1}. ${task.description}`);
      });
    }
    
    console.log(`\n📁 Files modified: ${this.currentSession.filesModified.length}`);
    if (this.currentSession.filesModified.length > 0) {
      this.currentSession.filesModified.slice(0, 5).forEach(file => {
        console.log(`  - ${file.path} (${file.action})`);
      });
      if (this.currentSession.filesModified.length > 5) {
        console.log(`  ... and ${this.currentSession.filesModified.length - 5} more`);
      }
    }

    // Show agent usage breakdown
    if (this.currentSession.agents.length > 0) {
      console.log(`\n🤖 Agents utilized: ${Object.keys(this.currentSession.tokens.byAgent).length}`);
      this.displayAgentBreakdown();
    }
    
    if (this.currentSession.tokens.total > 0) {
      console.log(`\n💱 Total tokens used: ${this.currentSession.tokens.total.toLocaleString()}`);
      console.log(`💰 Estimated cost: $${this.currentSession.costs.total.toFixed(4)}`);
    }
  }

  /**
   * Display agent usage breakdown
   */
  displayAgentBreakdown() {
    const agentStats = {};
    
    // Aggregate agent statistics
    this.currentSession.agents.forEach(agent => {
      if (!agentStats[agent.name]) {
        agentStats[agent.name] = {
          calls: 0,
          tokens: 0,
          cost: 0,
          tasks: []
        };
      }
      agentStats[agent.name].calls++;
      agentStats[agent.name].tokens += agent.tokens;
      agentStats[agent.name].cost += agent.cost || 0;
      if (agent.task && !agentStats[agent.name].tasks.includes(agent.task)) {
        agentStats[agent.name].tasks.push(agent.task);
      }
    });

    // Display sorted by token usage
    const sortedAgents = Object.entries(agentStats)
      .sort((a, b) => b[1].tokens - a[1].tokens);

    console.log('\nAgent Breakdown:');
    sortedAgents.forEach(([agentName, stats]) => {
      const percentage = ((stats.tokens / this.currentSession.tokens.total) * 100).toFixed(1);
      console.log(`  📌 ${agentName}:`);
      console.log(`     Calls: ${stats.calls} | Tokens: ${stats.tokens.toLocaleString()} (${percentage}%) | Cost: $${stats.cost.toFixed(4)}`);
      if (stats.tasks.length > 0 && stats.tasks.length <= 3) {
        console.log(`     Tasks: ${stats.tasks.join(', ')}`);
      }
    });
  }

  /**
   * Run project tests
   */
  async runTests() {
    const results = {
      success: true,
      tests: [],
      output: ''
    };

    try {
      // Check for package.json
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const hasPackageJson = await this.fileExists(packageJsonPath);
      
      if (hasPackageJson) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const scripts = packageJson.scripts || {};
        
        // Run available test commands
        const testCommands = [
          { name: 'test', cmd: 'npm test', condition: scripts.test },
          { name: 'lint', cmd: 'npm run lint', condition: scripts.lint },
          { name: 'type-check', cmd: 'npm run type-check', condition: scripts['type-check'] },
          { name: 'build', cmd: 'npm run build', condition: scripts.build }
        ];
        
        for (const test of testCommands) {
          if (test.condition) {
            try {
              console.log(`  Running ${test.name}...`);
              const { stdout } = await execAsync(test.cmd, { cwd: this.projectRoot });
              results.tests.push({ name: test.name, passed: true });
              console.log(`  ✅ ${test.name} passed`);
            } catch (error) {
              results.tests.push({ name: test.name, passed: false, error: error.message });
              results.success = false;
              console.log(`  ❌ ${test.name} failed`);
            }
          }
        }
        
        if (results.tests.length === 0) {
          console.log('  ℹ️ No test scripts found in package.json');
        }
      } else {
        console.log('  ℹ️ No package.json found - skipping tests');
      }
    } catch (error) {
      console.log(`  ⚠️ Error running tests: ${error.message}`);
      results.success = false;
    }
    
    this.currentSession.testsRun = results.tests;
    return results;
  }

  /**
   * Check git status
   */
  async checkGitStatus() {
    const status = {
      hasChanges: false,
      staged: [],
      unstaged: [],
      untracked: [],
      branch: 'unknown'
    };

    try {
      // Get current branch
      const { stdout: branch } = await execAsync('git branch --show-current', { cwd: this.projectRoot });
      status.branch = branch.trim();
      
      // Get status
      const { stdout: gitStatus } = await execAsync('git status --porcelain', { cwd: this.projectRoot });
      
      if (gitStatus.trim()) {
        status.hasChanges = true;
        const lines = gitStatus.trim().split('\n');
        
        lines.forEach(line => {
          const [statusCode, ...fileParts] = line.trim().split(' ');
          const file = fileParts.join(' ');
          
          if (statusCode === '??') {
            status.untracked.push(file);
          } else if (statusCode.startsWith('M') || statusCode.startsWith('A') || statusCode.startsWith('D')) {
            status.unstaged.push(file);
          }
        });
      }
      
      console.log(`  Branch: ${status.branch}`);
      console.log(`  Changed files: ${status.unstaged.length + status.untracked.length}`);
      
    } catch (error) {
      console.log('  ⚠️ Not a git repository or git not available');
    }
    
    return status;
  }

  /**
   * Handle git commit and push
   */
  async handleGitOperations(summary) {
    try {
      // Stage all changes
      console.log('\n📝 Creating commit...');
      await execAsync('git add .', { cwd: this.projectRoot });
      
      // Create commit message
      const commitMessage = this.createCommitMessage(summary);
      const commitCmd = `git commit -m "${commitMessage.replace(/"/g, '\\"')}"`;
      
      const { stdout: commitOutput } = await execAsync(commitCmd, { cwd: this.projectRoot });
      console.log('  ✅ Changes committed');
      
      // Extract commit hash
      const commitHash = commitOutput.match(/\[[\w\s-]+\s+([a-f0-9]+)\]/)?.[1];
      if (commitHash) {
        this.currentSession.commits.push({
          hash: commitHash,
          message: commitMessage,
          timestamp: new Date().toISOString()
        });
      }
      
      // Ask to push
      const shouldPush = await this.promptUser('\nPush to remote repository? (yes/no): ');
      if (shouldPush) {
        console.log('\n📤 Pushing to remote...');
        await execAsync('git push', { cwd: this.projectRoot });
        console.log('  ✅ Pushed successfully!');
      }
      
    } catch (error) {
      console.log(`\n❌ Git operation failed: ${error.message}`);
    }
  }

  /**
   * Create commit message from session data
   */
  createCommitMessage(summary) {
    const type = this.detectCommitType();
    const scope = this.currentSession.project;
    
    let message = `${type}: ${summary}\n\n`;
    
    if (this.currentSession.tasks.length > 0) {
      message += 'Tasks completed:\n';
      this.currentSession.tasks.forEach(task => {
        message += `- ${task.description}\n`;
      });
      message += '\n';
    }
    
    message += `Session: ${this.currentSession.id}\n`;
    message += `Duration: ${this.calculateDuration().formatted}\n`;
    
    if (this.currentSession.tokens.total > 0) {
      message += `Tokens: ${this.currentSession.tokens.total.toLocaleString()}\n`;
    }

    // Add agent breakdown if significant
    const topAgents = Object.entries(this.currentSession.tokens.byAgent)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    if (topAgents.length > 0) {
      message += `Agents: ${topAgents.map(([name, tokens]) => `${name} (${tokens})`).join(', ')}\n`;
    }
    
    return message;
  }

  /**
   * Detect commit type based on changes
   */
  detectCommitType() {
    const tasks = this.currentSession.tasks.map(t => t.description.toLowerCase()).join(' ');
    
    if (tasks.includes('fix') || tasks.includes('bug')) return 'fix';
    if (tasks.includes('feature') || tasks.includes('add')) return 'feat';
    if (tasks.includes('refactor')) return 'refactor';
    if (tasks.includes('test')) return 'test';
    if (tasks.includes('doc')) return 'docs';
    
    return 'chore';
  }

  /**
   * Generate final session report
   */
  generateReport() {
    const duration = this.calculateDuration();
    
    let report = '\n' + '='.repeat(60) + '\n';
    report += '📊 SESSION SUMMARY\n';
    report += '='.repeat(60) + '\n\n';
    
    report += `📅 Session ID: ${this.currentSession.id}\n`;
    report += `🎯 Goal: ${this.currentSession.goal}\n`;
    report += `⏱️  Duration: ${duration.formatted}\n`;
    report += `📦 Project: ${this.currentSession.project}\n`;
    
    if (this.currentSession.tasks.length > 0) {
      report += `\n✅ Completed ${this.currentSession.tasks.length} tasks\n`;
    }
    
    if (this.currentSession.filesModified.length > 0) {
      report += `📝 Modified ${this.currentSession.filesModified.length} files\n`;
    }
    
    if (this.currentSession.commits.length > 0) {
      report += `🔀 Created ${this.currentSession.commits.length} commits\n`;
    }
    
    // Agent breakdown section
    if (Object.keys(this.currentSession.tokens.byAgent).length > 0) {
      report += `\n🤖 AGENT UTILIZATION:\n`;
      report += '-'.repeat(40) + '\n';
      
      const sortedAgents = Object.entries(this.currentSession.tokens.byAgent)
        .sort((a, b) => b[1] - a[1]);
      
      sortedAgents.forEach(([agent, tokens]) => {
        const percentage = ((tokens / this.currentSession.tokens.total) * 100).toFixed(1);
        const cost = this.currentSession.costs.byAgent[agent] || 0;
        const calls = this.currentSession.agents.filter(a => a.name === agent).length;
        
        report += `\n   ${agent}:\n`;
        report += `   • Calls: ${calls}\n`;
        report += `   • Tokens: ${tokens.toLocaleString()} (${percentage}%)\n`;
        report += `   • Cost: $${cost.toFixed(4)}\n`;
      });
    }
    
    if (this.currentSession.tokens.total > 0) {
      report += `\n💻 API USAGE TOTALS:\n`;
      report += '-'.repeat(40) + '\n';
      report += `   Total Tokens: ${this.currentSession.tokens.total.toLocaleString()}\n`;
      report += `   Total Cost: $${this.currentSession.costs.total.toFixed(4)}\n`;
      
      if (Object.keys(this.currentSession.tokens.byModel).length > 0) {
        report += '\n   By Model:\n';
        for (const [model, tokens] of Object.entries(this.currentSession.tokens.byModel)) {
          const modelCost = this.currentSession.costs.byModel[model] || 0;
          report += `   • ${model}: ${tokens.toLocaleString()} tokens ($${modelCost.toFixed(4)})\n`;
        }
      }
    }
    
    if (this.currentSession.summary) {
      report += `\n📄 Summary: ${this.currentSession.summary}\n`;
    }
    
    if (this.currentSession.nextSteps?.length > 0) {
      report += '\n🔮 Next Steps:\n';
      this.currentSession.nextSteps.forEach((step, i) => {
        report += `   ${i + 1}. ${step}\n`;
      });
    }
    
    report += '\n' + '='.repeat(60) + '\n';
    
    return report;
  }

  /**
   * Log task completion
   */
  async logTask(description, status = 'completed') {
    if (!this.currentSession) return;
    
    this.currentSession.tasks.push({
      timestamp: new Date().toISOString(),
      description,
      status
    });
    
    await this.saveSession();
  }

  /**
   * Log file modification
   */
  async logFile(filePath, action = 'modified') {
    if (!this.currentSession) return;
    
    this.currentSession.filesModified.push({
      timestamp: new Date().toISOString(),
      path: filePath,
      action
    });
    
    await this.saveSession();
  }

  /**
   * Log agent usage with detailed tracking
   */
  async logAgent(agentName, task, tokens, model = 'claude-3-opus') {
    if (!this.currentSession) return;
    
    // Calculate cost
    const rates = {
      'claude-3-opus': 0.015 / 1000,
      'claude-3-sonnet': 0.003 / 1000,
      'claude-3-haiku': 0.00025 / 1000,
      'gpt-4': 0.03 / 1000,
      'gpt-4-turbo': 0.01 / 1000,
      'gpt-3.5-turbo': 0.002 / 1000
    };
    
    const rate = rates[model] || 0.01 / 1000;
    const cost = tokens * rate;
    
    // Record agent activity
    const agentLog = {
      timestamp: new Date().toISOString(),
      name: agentName,
      task,
      tokens,
      model,
      cost
    };
    
    this.currentSession.agents.push(agentLog);
    
    // Update token counts
    this.currentSession.tokens.total += tokens;
    this.currentSession.tokens.byModel[model] = (this.currentSession.tokens.byModel[model] || 0) + tokens;
    this.currentSession.tokens.byAgent[agentName] = (this.currentSession.tokens.byAgent[agentName] || 0) + tokens;
    
    // Update costs
    this.currentSession.costs.total += cost;
    this.currentSession.costs.byModel[model] = (this.currentSession.costs.byModel[model] || 0) + cost;
    this.currentSession.costs.byAgent[agentName] = (this.currentSession.costs.byAgent[agentName] || 0) + cost;
    
    await this.saveSession();
    
    // Return summary for logging
    return {
      agent: agentName,
      tokens,
      totalSessionTokens: this.currentSession.tokens.total,
      cost: cost.toFixed(4),
      totalSessionCost: this.currentSession.costs.total.toFixed(4)
    };
  }

  /**
   * Get session status with agent breakdown
   */
  getStatus() {
    if (!this.currentSession) {
      return { active: false, message: 'No active session' };
    }
    
    const duration = this.calculateDuration();
    
    // Get top agents by usage
    const topAgents = Object.entries(this.currentSession.tokens.byAgent || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, tokens]) => ({
        name,
        tokens,
        percentage: ((tokens / this.currentSession.tokens.total) * 100).toFixed(1)
      }));
    
    return {
      active: true,
      id: this.currentSession.id,
      goal: this.currentSession.goal,
      duration: duration.formatted,
      tasks: this.currentSession.tasks.length,
      files: this.currentSession.filesModified.length,
      tokens: this.currentSession.tokens.total,
      cost: `$${this.currentSession.costs.total.toFixed(4)}`,
      topAgents,
      agentCount: Object.keys(this.currentSession.tokens.byAgent || {}).length
    };
  }

  /**
   * Calculate session duration
   */
  calculateDuration() {
    if (!this.currentSession) return { formatted: '0s' };
    
    const start = new Date(this.currentSession.startTime);
    const end = this.currentSession.endTime ? new Date(this.currentSession.endTime) : new Date();
    const ms = end - start;
    
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    let formatted = '';
    if (hours > 0) formatted += `${hours}h `;
    if (minutes > 0) formatted += `${minutes}m `;
    formatted += `${seconds}s`;
    
    return {
      milliseconds: ms,
      seconds: Math.floor(ms / 1000),
      minutes: Math.floor(ms / 60000),
      hours: hours,
      formatted: formatted.trim()
    };
  }

  /**
   * Get previous session
   */
  async getPreviousSession() {
    try {
      await fs.mkdir(this.sessionDir, { recursive: true });
      const files = await fs.readdir(this.sessionDir);
      const sessionFiles = files
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => b.localeCompare(a));
      
      if (sessionFiles.length === 0) return null;
      
      const lastFile = sessionFiles[0];
      const content = await fs.readFile(path.join(this.sessionDir, lastFile), 'utf-8');
      return JSON.parse(content);
      
    } catch (error) {
      console.error('Error reading previous session:', error);
      return null;
    }
  }

  /**
   * Save current session
   */
  async saveSession() {
    if (!this.currentSession) return;
    
    try {
      await fs.mkdir(this.sessionDir, { recursive: true });
      const filename = `${this.currentSession.id}.json`;
      const filepath = path.join(this.sessionDir, filename);
      await fs.writeFile(filepath, JSON.stringify(this.currentSession, null, 2));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  /**
   * Update dashboard data file with agent metrics
   */
  async updateDashboardData() {
    try {
      const dashboardFile = path.join(__dirname, 'dashboard-data.json');
      let dashboardData = { 
        sessions: [], 
        projects: {}, 
        monthly: {},
        agents: {}  // Track agent usage across all sessions
      };
      
      // Load existing data
      if (await this.fileExists(dashboardFile)) {
        const content = await fs.readFile(dashboardFile, 'utf-8');
        dashboardData = JSON.parse(content);
      }
      
      // Add current session
      dashboardData.sessions.push({
        id: this.currentSession.id,
        date: this.currentSession.startTime,
        project: this.currentSession.project,
        duration: this.calculateDuration().minutes,
        tasks: this.currentSession.tasks.length,
        tokens: this.currentSession.tokens.total,
        cost: this.currentSession.costs.total,
        agents: this.currentSession.tokens.byAgent  // Include agent breakdown
      });
      
      // Update project stats
      const project = this.currentSession.project;
      if (!dashboardData.projects[project]) {
        dashboardData.projects[project] = {
          sessions: 0,
          totalTokens: 0,
          totalCost: 0,
          totalTasks: 0,
          agentUsage: {}
        };
      }
      
      dashboardData.projects[project].sessions++;
      dashboardData.projects[project].totalTokens += this.currentSession.tokens.total;
      dashboardData.projects[project].totalCost += this.currentSession.costs.total;
      dashboardData.projects[project].totalTasks += this.currentSession.tasks.length;
      
      // Update project-level agent usage
      for (const [agent, tokens] of Object.entries(this.currentSession.tokens.byAgent || {})) {
        dashboardData.projects[project].agentUsage[agent] = 
          (dashboardData.projects[project].agentUsage[agent] || 0) + tokens;
      }
      
      // Update global agent stats
      for (const [agent, tokens] of Object.entries(this.currentSession.tokens.byAgent || {})) {
        if (!dashboardData.agents[agent]) {
          dashboardData.agents[agent] = {
            totalTokens: 0,
            totalCost: 0,
            totalCalls: 0,
            projects: []
          };
        }
        dashboardData.agents[agent].totalTokens += tokens;
        dashboardData.agents[agent].totalCost += (this.currentSession.costs.byAgent[agent] || 0);
        dashboardData.agents[agent].totalCalls += this.currentSession.agents.filter(a => a.name === agent).length;
        
        if (!dashboardData.agents[agent].projects.includes(project)) {
          dashboardData.agents[agent].projects.push(project);
        }
      }
      
      // Save updated data
      await fs.writeFile(dashboardFile, JSON.stringify(dashboardData, null, 2));
      
    } catch (error) {
      console.error('Error updating dashboard:', error);
    }
  }

  /**
   * Simple prompt helper (in real implementation, Claude would handle this)
   */
  async promptUser(question) {
    console.log(question);
    // In actual implementation, this would be handled by Claude's interaction
    // For now, return true for testing
    return true;
  }

  /**
   * Check if file exists
   */
  async fileExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get agent statistics for current session
   */
  getAgentStats() {
    if (!this.currentSession) return null;
    
    const stats = {};
    
    // Calculate detailed stats for each agent
    for (const [agent, tokens] of Object.entries(this.currentSession.tokens.byAgent || {})) {
      const agentLogs = this.currentSession.agents.filter(a => a.name === agent);
      stats[agent] = {
        calls: agentLogs.length,
        tokens,
        cost: this.currentSession.costs.byAgent[agent] || 0,
        percentage: ((tokens / this.currentSession.tokens.total) * 100).toFixed(1),
        avgTokensPerCall: Math.round(tokens / agentLogs.length),
        tasks: [...new Set(agentLogs.map(a => a.task).filter(Boolean))]
      };
    }
    
    return stats;
  }
}

module.exports = SessionAutomation;