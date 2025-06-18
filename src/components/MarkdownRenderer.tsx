import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const renderMarkdown = (text: string) => {
    return text
      // Headers with better styling
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-6 mb-3 text-blue-600 dark:text-blue-400 border-b border-blue-200 dark:border-blue-800 pb-1">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-6 mb-4 text-purple-600 dark:text-purple-400">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-gray-100">$1</h1>')
      
      // Bold text with better contrast
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-gray-100 bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">$1</strong>')
      
      // Italic text
      .replace(/\*(.*?)\*/g, '<em class="italic text-gray-700 dark:text-gray-300">$1</em>')
      
      // Code blocks and inline code
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg my-3 overflow-x-auto border border-gray-200 dark:border-gray-700"><code class="text-sm font-mono text-gray-800 dark:text-gray-200">$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono text-red-600 dark:text-red-400 border border-gray-200 dark:border-gray-700">$1</code>')
      
      // Enhanced lists with better spacing and icons
      .replace(/^• (.*$)/gm, '<li class="flex items-start mb-2 ml-4"><span class="text-blue-500 mr-2 mt-1 flex-shrink-0">•</span><span class="text-gray-700 dark:text-gray-300">$1</span></li>')
      .replace(/^- (.*$)/gm, '<li class="flex items-start mb-2 ml-4"><span class="text-green-500 mr-2 mt-1 flex-shrink-0">▸</span><span class="text-gray-700 dark:text-gray-300">$1</span></li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="flex items-start mb-2 ml-4"><span class="text-purple-500 mr-2 mt-1 flex-shrink-0 font-bold">→</span><span class="text-gray-700 dark:text-gray-300">$1</span></li>')
      
      // Emojis and special sections
      .replace(/^(🎯|📋|📝|⏱️|💡|🚀|📊|✅|❌|❓|🔄|🔗)/gm, '<span class="text-2xl mr-2 inline-block">$1</span>')
      
      // Special formatting for sections
      .replace(/\*\*([^*]+):\*\*/g, '<div class="font-bold text-lg mt-4 mb-2 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-500 pl-3">$1:</div>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Interactive elements for AI suggestions
      .replace(/\[BUTTON:([^\]]+)\]/g, '<button class="inline-flex items-center px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium mx-1" onclick="handleAIAction(\'$1\')">$1</button>')
      
      // Highlight important information
      .replace(/\*\*\*(.*?)\*\*\*/g, '<span class="font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 px-2 py-1 rounded-lg shadow-sm">$1</span>')
      
      // Status indicators
      .replace(/\[STATUS:([^\]]+)\]/g, '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">$1</span>')
      
      // Line breaks with proper spacing
      .replace(/\n\n/g, '<div class="my-4"></div>')
      .replace(/\n/g, '<br class="my-1">');
  };

  // Add global function for handling AI actions
  React.useEffect(() => {
    (window as any).handleAIAction = (action: string) => {
      // Dispatch custom event that can be caught by parent components
      window.dispatchEvent(new CustomEvent('ai-action', { detail: { action } }));
    };
    
    return () => {
      delete (window as any).handleAIAction;
    };
  }, []);

  return (
    <div 
      className={`prose prose-sm max-w-none leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
};

export default MarkdownRenderer;