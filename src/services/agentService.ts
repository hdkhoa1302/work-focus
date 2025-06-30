interface Agent {
  name: string;
  role: string;
  specialization: string[];
  tools: string[];
}

interface WorkContext {
  currentTask?: any;
  userPreferences?: any;
  productivity_history?: any;
  current_focus_level?: number;
  available_time?: number;
}

interface AgentResponse {
  agent: string;
  content: string;
  confidence: number;
  suggestions?: string[];
  actions?: string[];
}

export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private geminiService: any;

  constructor(geminiService: any) {
    this.geminiService = geminiService;
    this.initializeAgents();
  }

  private initializeAgents() {
    // Task Manager Agent
    this.agents.set('taskManager', {
      name: 'Task Manager',
      role: 'Quản lý nhiệm vụ và lịch trình',
      specialization: ['task-planning', 'scheduling', 'priority-setting'],
      tools: ['calendar', 'task-db', 'deadline-tracker']
    });

    // Productivity Coach Agent
    this.agents.set('productivityCoach', {
      name: 'Productivity Coach',
      role: 'Huấn luyện viên năng suất',
      specialization: ['habit-analysis', 'performance-optimization', 'motivation'],
      tools: ['analytics', 'pattern-recognition', 'goal-tracker']
    });

    // Focus Guardian Agent
    this.agents.set('focusGuardian', {
      name: 'Focus Guardian',
      role: 'Bảo vệ sự tập trung',
      specialization: ['distraction-blocking', 'attention-management'],
      tools: ['website-blocker', 'app-monitor', 'notification-filter']
    });
  }

  async processUserInput(input: string, context: WorkContext = {}): Promise<AgentResponse[]> {
    // Determine which agent(s) should handle this request
    const relevantAgents = this.selectAgents(input, context);
    
    // Multi-agent collaboration
    const responses = await Promise.all(
      relevantAgents.map(agent => this.processWithAgent(agent, input, context))
    );
    
    return responses;
  }

  private selectAgents(input: string, context: WorkContext): string[] {
    const selectedAgents: string[] = [];
    
    // Task-related keywords
    if (this.containsKeywords(input, ['task', 'nhiệm vụ', 'deadline', 'lịch trình', 'việc làm'])) {
      selectedAgents.push('taskManager');
    }
    
    // Productivity-related keywords  
    if (this.containsKeywords(input, ['năng suất', 'hiệu quả', 'cải thiện', 'thói quen', 'mục tiêu'])) {
      selectedAgents.push('productivityCoach');
    }
    
    // Focus-related keywords
    if (this.containsKeywords(input, ['tập trung', 'xao nhãng', 'chặn', 'phân tâm', 'focus'])) {
      selectedAgents.push('focusGuardian');
    }
    
    // Default to task manager if no specific keywords
    if (selectedAgents.length === 0) {
      selectedAgents.push('taskManager');
    }
    
    return selectedAgents;
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  private async processWithAgent(agentKey: string, input: string, context: WorkContext): Promise<AgentResponse> {
    const agent = this.agents.get(agentKey);
    if (!agent) {
      throw new Error(`Agent ${agentKey} not found`);
    }

    const systemPrompt = this.buildSystemPrompt(agent, context);
    const userPrompt = this.buildUserPrompt(input, agent.specialization);

    try {
      const response = await this.geminiService.chat({
        model: 'gemini-1.5-flash',
        contents: `${systemPrompt}\n\nUser: ${userPrompt}`,
        generationConfig: {
          temperature: 0.7,
          candidateCount: 1,
          topP: 0.8,
          topK: 40
        }
      });

      return {
        agent: agent.name,
        content: response.text,
        confidence: 0.8, // TODO: Implement confidence calculation
        suggestions: this.extractSuggestions(response.text),
        actions: this.extractActions(response.text, agent.tools)
      };
    } catch (error) {
      console.error(`Error processing with ${agent.name}:`, error);
      return {
        agent: agent.name,
        content: `Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn.`,
        confidence: 0,
        suggestions: [],
        actions: []
      };
    }
  }

  private buildSystemPrompt(agent: Agent, context: WorkContext): string {
    const contextInfo = context.currentTask ? 
      `Task hiện tại: ${JSON.stringify(context.currentTask)}` : '';
    
    return `Bạn là ${agent.name} - ${agent.role}.

Chuyên môn của bạn: ${agent.specialization.join(', ')}
Công cụ available: ${agent.tools.join(', ')}

${contextInfo}

Nhiệm vụ:
- Trả lời câu hỏi trong phạm vi chuyên môn
- Đưa ra gợi ý cụ thể và actionable
- Sử dụng tiếng Việt tự nhiên và thân thiện
- Tập trung vào việc giúp người dùng tăng năng suất

Lưu ý: Chỉ trả lời những gì thuộc về chuyên môn của bạn. Nếu câu hỏi không liên quan, hãy lịch sự chuyển hướng.`;
  }

  private buildUserPrompt(input: string, specializations: string[]): string {
    return `${input}

Hãy phân tích yêu cầu này từ góc độ: ${specializations.join(', ')} và đưa ra lời khuyên phù hợp.`;
  }

  private extractSuggestions(text: string): string[] {
    // Simple extraction - can be improved with better NLP
    const lines = text.split('\n');
    return lines.filter(line => 
      line.includes('gợi ý') || 
      line.includes('khuyên') || 
      line.includes('nên') ||
      line.startsWith('- ') ||
      line.startsWith('• ')
    ).slice(0, 3);
  }

  private extractActions(text: string, tools: string[]): string[] {
    // Extract actionable items based on available tools
    const actions: string[] = [];
    
    tools.forEach(tool => {
      if (text.toLowerCase().includes(tool.toLowerCase())) {
        actions.push(`use_${tool}`);
      }
    });
    
    return actions;
  }

  // Method to get agent info for UI
  getAgentInfo(agentKey: string): Agent | undefined {
    return this.agents.get(agentKey);
  }

  // Method to get all agents
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }
}

export default AgentOrchestrator; 