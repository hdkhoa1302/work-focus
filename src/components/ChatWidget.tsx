import React, { useState, useEffect, useRef } from 'react';
import { postAIChat, AIChatResponse, AIChatRequest, getConversations, createConversation, activateConversation, Conversation, Message } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { AiOutlineMessage, AiOutlineClose, AiOutlineExpandAlt, AiOutlineBulb } from 'react-icons/ai';

interface ChatWidgetProps {
  fullPage?: boolean;
}

// Simple markdown renderer component
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const renderMarkdown = (text: string) => {
    return text
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // Lists
      .replace(/^• (.*$)/gm, '<li class="ml-4">• $1</li>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4">$1</li>')
      // Line breaks
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div 
      className="whitespace-pre-wrap leading-relaxed"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
};

const ChatWidget: React.FC<ChatWidgetProps> = ({ fullPage = false }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    const newOpenState = !open;
    setOpen(newOpenState);
    
    if (newOpenState) {
      loadConversations();
    }
  };

  const expandChat = () => navigate('/chat');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);
      
      // Find active conversation or create new one
      const activeConv = convs.find(c => c.isActive);
      if (activeConv) {
        setActiveConversationId(activeConv._id);
        setMessages(activeConv.messages);
      } else if (convs.length === 0) {
        // Create first conversation
        const newConv = await createConversation();
        setConversations([newConv]);
        setActiveConversationId(newConv._id);
        setMessages(newConv.messages);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const switchConversation = async (conversationId: string) => {
    if (conversationId === activeConversationId) return;
    
    setIsLoadingConversation(true);
    try {
      const conv = await activateConversation(conversationId);
      setActiveConversationId(conversationId);
      setMessages(conv.messages);
      
      // Update conversations list
      setConversations(prev => prev.map(c => ({
        ...c,
        isActive: c._id === conversationId
      })));
    } catch (error) {
      console.error('Failed to switch conversation:', error);
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const newConv = await createConversation(`Cuộc trò chuyện ${new Date().toLocaleDateString()}`);
      setConversations(prev => [newConv, ...prev.map(c => ({ ...c, isActive: false }))]);
      setActiveConversationId(newConv._id);
      setMessages(newConv.messages);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;
    
    const userMsg: Message = { from: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response: AIChatResponse = await postAIChat({ 
        message: text,
        conversationId: activeConversationId
      });
      
      const botMsg: Message = { 
        from: 'bot', 
        text: response.message, 
        timestamp: new Date(),
        type: response.type as any,
        data: response.data
      };
      setMessages(prev => [...prev, botMsg]);

      // Update conversation ID if it changed (new conversation)
      if (response.conversationId !== activeConversationId) {
        setActiveConversationId(response.conversationId);
        loadConversations(); // Refresh conversations list
      }

      // Trigger tasks refresh if project was created
      if (response.type === 'task') {
        window.dispatchEvent(new Event('tasks-updated'));
      }
    } catch (error) {
      const errMsg: Message = { 
        from: 'bot', 
        text: '❌ Có lỗi xảy ra. Vui lòng thử lại!', 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Panel content
  const panel = (
    <div className={`${fullPage ? 'w-full max-w-4xl' : 'w-80'} ${fullPage ? 'h-full' : 'h-[500px]'} bg-white dark:bg-gray-800 shadow-xl rounded-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700`}>
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <AiOutlineBulb className="text-lg" />
          <span className="font-medium">AI Agent</span>
        </div>
        <div className="flex space-x-2">
          {!fullPage && (
            <button 
              onClick={expandChat}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              title="Mở rộng"
            >
              <AiOutlineExpandAlt className="text-lg" />
            </button>
          )}
          <button 
            onClick={fullPage ? () => navigate('/') : toggleOpen}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          >
            <AiOutlineClose className="text-lg" />
          </button>
        </div>
      </div>

      {/* Conversation selector */}
      {conversations.length > 1 && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <select
            value={activeConversationId}
            onChange={(e) => switchConversation(e.target.value)}
            disabled={isLoadingConversation}
            className="w-full text-xs px-2 py-1 border rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
          >
            {conversations.map(conv => (
              <option key={conv._id} value={conv._id}>
                {conv.title}
              </option>
            ))}
          </select>
          {isLoadingConversation && (
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center">
              <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin mr-1"></div>
              Đang tải cuộc trò chuyện...
            </div>
          )}
        </div>
      )}
      
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {isLoadingConversation ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Đang tải tin nhắn...</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} className={`${m.from === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                  m.from === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {m.from === 'bot' ? (
                    <MarkdownRenderer content={m.text} />
                  ) : (
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  )}
                  
                  {m.type === 'project' && m.data && (
                    <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                      <button
                        onClick={() => sendMessage('ok')}
                        className="w-full px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium"
                      >
                        ✅ Tạo dự án này
                      </button>
                    </div>
                  )}
                  
                  <div className="text-xs opacity-70 mt-2 flex items-center justify-between">
                    <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-xs opacity-50">
                      {new Date(m.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="text-left">
                <div className="inline-block bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </>
        )}
      </div>
      
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2 mb-2">
          <input
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Mô tả công việc..."
            disabled={isLoading || isLoadingConversation}
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim() || isLoadingConversation}
            className="px-3 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Gửi
          </button>
        </div>
        
        <div className="flex justify-between items-center">
          <button
            onClick={createNewConversation}
            disabled={isLoadingConversation}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          >
            + Cuộc trò chuyện mới
          </button>
          {!fullPage && (
            <button
              onClick={expandChat}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              🚀 Mở rộng
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex justify-center items-center p-4">
        {panel}
      </div>
    );
  }
  
  // Float widget
  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {open && (
        <div className="mb-4">
          {panel}
        </div>
      )}
      <button
        onClick={toggleOpen}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
      >
        <AiOutlineMessage className="text-lg sm:text-xl" />
      </button>
    </div>
  );
};

export default ChatWidget;