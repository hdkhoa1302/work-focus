import React from 'react';
import { AiOutlineUser, AiOutlineCheckCircle, AiOutlineBulb } from 'react-icons/ai';

interface Agent {
  name: string;
  role: string;
  specialization: string[];
  tools: string[];
}

interface AgentResponse {
  agent: string;
  content: string;
  confidence: number;
  suggestions?: string[];
  actions?: string[];
}

interface AgentStatusPanelProps {
  agents: Agent[];
  lastResponses?: AgentResponse[];
  isVisible: boolean;
}

const AgentStatusPanel: React.FC<AgentStatusPanelProps> = ({ 
  agents, 
  lastResponses = [],
  isVisible 
}) => {
  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 p-3 border-b border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
          <AiOutlineBulb className="mr-1" />
          AI Agents Hoạt động
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {agents.length} agents
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {agents.map((agent, index) => {
          const response = lastResponses.find(r => r.agent === agent.name);
          const isActive = response !== undefined;
          
          return (
            <div 
              key={index}
              className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                isActive 
                  ? 'bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-700' 
                  : 'bg-gray-100 dark:bg-gray-600'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {agent.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {agent.role}
                  </div>
                </div>
              </div>

              {response && (
                <div className="flex items-center space-x-1">
                  <AiOutlineCheckCircle className="text-green-500 text-sm" />
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {Math.round(response.confidence * 100)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show suggestions from agents */}
      {lastResponses.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Gợi ý nhanh:
          </div>
          <div className="flex flex-wrap gap-1">
            {lastResponses
              .flatMap(r => r.suggestions || [])
              .slice(0, 3)
              .map((suggestion, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  title={suggestion}
                >
                  {suggestion.length > 20 ? `${suggestion.substring(0, 20)}...` : suggestion}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentStatusPanel; 