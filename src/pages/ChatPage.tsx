import React, { useState, useEffect, useRef } from 'react';
import { postAIChat, AIChatResponse, AIChatRequest, getConversations, createConversation, activateConversation, deleteConversation, Conversation, Message, getProjects, getTasks, Project, Task } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  AiOutlineMessage, 
  AiOutlineClose, 
  AiOutlineBulb,
  AiOutlineProject,
  AiOutlineCheckSquare,
  AiOutlineFileText,
  AiOutlineStar,
  AiOutlineHeart,
  AiOutlineTrophy,
  AiOutlineRocket,
  AiOutlineClear,
  AiOutlineDownload,
  AiOutlinePlus,
  AiOutlineDelete
} from 'react-icons/ai';
import { FiMessageSquare, FiClipboard, FiTarget, FiTrendingUp } from 'react-icons/fi';

interface WhiteboardItem {
  id: string;
  type: 'project' | 'task' | 'note' | 'decision';
  title: string;
  description: string;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: Date;
  relatedTo?: string;
}

// Simple markdown renderer component
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const renderMarkdown = (text: string) => {
    return text
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-gray-100">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2 text-gray-900 dark:text-gray-100">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-gray-100">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // Lists
      .replace(/^• (.*$)/gm, '<li class="ml-4 mb-1">• $1</li>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 mb-1">• $1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 mb-1">$1</li>')
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

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'chat' | 'whiteboard' | 'analysis'>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [whiteboardItems, setWhiteboardItems] = useState<WhiteboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    loadData();
  }, []);

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

  const loadData = async () => {
    try {
      const [projectsData, tasksData] = await Promise.all([
        getProjects(),
        getTasks()
      ]);
      setProjects(projectsData);
      setTasks(tasksData);
      
      // Load whiteboard from localStorage
      const savedWhiteboard = localStorage.getItem('ai-whiteboard');
      if (savedWhiteboard) {
        setWhiteboardItems(JSON.parse(savedWhiteboard));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const switchConversation = async (conversationId: string) => {
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

  const handleDeleteConversation = async (conversationId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này?')) return;
    
    try {
      await deleteConversation(conversationId);
      const updatedConvs = conversations.filter(c => c._id !== conversationId);
      setConversations(updatedConvs);
      
      if (conversationId === activeConversationId) {
        if (updatedConvs.length > 0) {
          switchConversation(updatedConvs[0]._id);
        } else {
          createNewConversation();
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const saveWhiteboard = (items: WhiteboardItem[]) => {
    localStorage.setItem('ai-whiteboard', JSON.stringify(items));
    setWhiteboardItems(items);
  };

  const addToWhiteboard = (item: Omit<WhiteboardItem, 'id' | 'createdAt'>) => {
    const newItem: WhiteboardItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    const updatedItems = [...whiteboardItems, newItem];
    saveWhiteboard(updatedItems);
  };

  const updateWhiteboardItem = (id: string, updates: Partial<WhiteboardItem>) => {
    const updatedItems = whiteboardItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    saveWhiteboard(updatedItems);
  };

  const removeFromWhiteboard = (id: string) => {
    const updatedItems = whiteboardItems.filter(item => item.id !== id);
    saveWhiteboard(updatedItems);
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

      // Add to whiteboard if it's a project analysis
      if (response.type === 'project' && response.data) {
        addToWhiteboard({
          type: 'project',
          title: response.data.projectName,
          description: response.data.description,
          status: 'pending'
        });
      }

      // Refresh data if project/task was created
      if (response.type === 'task') {
        loadData();
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

  const renderChatTab = () => (
    <div className="flex h-full">
      {/* Conversations Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <AiOutlinePlus className="w-4 h-4" />
            <span>Cuộc trò chuyện mới</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv._id}
              className={`group flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                conv._id === activeConversationId ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''
              }`}
              onClick={() => switchConversation(conv._id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {conv.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(conv._id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition-all"
              >
                <AiOutlineDelete className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                message.from === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}>
                {message.from === 'bot' ? (
                  <MarkdownRenderer content={message.text} />
                ) : (
                  <div className="whitespace-pre-wrap">{message.text}</div>
                )}
                
                {message.type === 'project' && message.data && (
                  <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                    <button
                      onClick={() => sendMessage('Có, tạo dự án')}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                    >
                      ✅ Tạo dự án này
                    </button>
                  </div>
                )}
                
                <div className="text-xs opacity-70 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-2xl">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Mô tả công việc hoặc đặt câu hỏi..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Gửi
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWhiteboardTab = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          📋 Whiteboard - Ghi chú thông minh
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              const data = JSON.stringify(whiteboardItems, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'whiteboard-backup.json';
              a.click();
            }}
            className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            title="Xuất dữ liệu"
          >
            <AiOutlineDownload />
          </button>
          <button
            onClick={() => setWhiteboardItems([])}
            className="p-2 text-red-600 hover:text-red-800"
            title="Xóa tất cả"
          >
            <AiOutlineClear />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {whiteboardItems.map((item) => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {item.type === 'project' && <AiOutlineProject className="text-blue-500" />}
                {item.type === 'task' && <AiOutlineCheckSquare className="text-green-500" />}
                {item.type === 'note' && <AiOutlineFileText className="text-yellow-500" />}
                {item.type === 'decision' && <AiOutlineBulb className="text-purple-500" />}
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                  {item.type}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className={`w-2 h-2 rounded-full ${
                  item.status === 'completed' ? 'bg-green-500' :
                  item.status === 'confirmed' ? 'bg-blue-500' : 'bg-yellow-500'
                }`}></span>
                <button
                  onClick={() => removeFromWhiteboard(item.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  ×
                </button>
              </div>
            </div>
            
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {item.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {item.description}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
              <select
                value={item.status}
                onChange={(e) => updateWhiteboardItem(item.id, { status: e.target.value as any })}
                className="text-xs px-2 py-1 border rounded"
              >
                <option value="pending">Đang chờ</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="completed">Hoàn thành</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {whiteboardItems.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FiClipboard className="text-4xl mx-auto mb-4" />
          <p>Whiteboard trống. Bắt đầu chat với AI để thêm nội dung!</p>
        </div>
      )}
    </div>
  );

  const renderAnalysisTab = () => {
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const activeProjects = projects.filter(p => !p.completed).length;

    return (
      <div className="p-4 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          📊 Phân tích hiệu suất
        </h3>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Dự án đang thực hiện</p>
                <p className="text-2xl font-bold">{activeProjects}</p>
              </div>
              <FiTarget className="text-2xl opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Tỷ lệ hoàn thành</p>
                <p className="text-2xl font-bold">{completionRate.toFixed(1)}%</p>
              </div>
              <FiTrendingUp className="text-2xl opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Task hoàn thành</p>
                <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
              </div>
              <AiOutlineTrophy className="text-2xl opacity-80" />
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
            💡 Nhận xét từ AI
          </h4>
          
          <div className="space-y-4">
            {completionRate >= 80 && (
              <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <AiOutlineTrophy className="text-green-500 mt-1" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">Xuất sắc!</p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Tỷ lệ hoàn thành task rất cao. Bạn đang làm việc rất hiệu quả!
                  </p>
                </div>
              </div>
            )}

            {completionRate < 50 && totalTasks > 0 && (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AiOutlineRocket className="text-yellow-500 mt-1" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">Cần cải thiện</p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Hãy tập trung hoàn thành các task đã tạo để nâng cao hiệu suất!
                  </p>
                </div>
              </div>
            )}

            {activeProjects > 5 && (
              <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <AiOutlineBulb className="text-blue-500 mt-1" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-300">Gợi ý</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Bạn có nhiều dự án đang thực hiện. Hãy ưu tiên hoàn thành một số dự án trước khi bắt đầu dự án mới.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
            🏆 Thành tích gần đây
          </h4>
          
          <div className="space-y-3">
            {tasks.filter(t => t.status === 'done').slice(0, 5).map((task) => (
              <div key={task._id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <AiOutlineCheckSquare className="text-green-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{task.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {projects.find(p => p._id === task.projectId)?.name || 'Unknown Project'}
                  </p>
                </div>
                <AiOutlineStar className="text-yellow-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <AiOutlineMessage className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">AI Agent</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Trợ lý quản lý công việc thông minh</p>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <AiOutlineClose className="text-xl text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-all ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <FiMessageSquare className="w-4 h-4" />
            <span>Chat</span>
          </button>
          
          <button
            onClick={() => setActiveTab('whiteboard')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-all ${
              activeTab === 'whiteboard'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <FiClipboard className="w-4 h-4" />
            <span>Whiteboard</span>
            {whiteboardItems.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {whiteboardItems.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-all ${
              activeTab === 'analysis'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <FiTrendingUp className="w-4 h-4" />
            <span>Phân tích</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && renderChatTab()}
        {activeTab === 'whiteboard' && renderWhiteboardTab()}
        {activeTab === 'analysis' && renderAnalysisTab()}
      </div>
    </div>
  );
};

export default ChatPage;