import React, { useState, useEffect, useRef } from 'react';
import { postAIChat, AIChatResponse, AIChatRequest, createTask, getProjects, getTasks, getSuggestions, Project, Task, createProject } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  AiOutlineMessage, 
  AiOutlineClose, 
  AiOutlineExpandAlt, 
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
  AiOutlineUpload
} from 'react-icons/ai';
import { FiMessageSquare, FiClipboard, FiTarget, FiTrendingUp } from 'react-icons/fi';

interface Message {
  from: 'user' | 'bot';
  text: string;
  timestamp: Date;
  type?: 'text' | 'project' | 'task' | 'analysis' | 'encouragement';
  data?: any;
}

interface WhiteboardItem {
  id: string;
  type: 'project' | 'task' | 'note' | 'decision';
  title: string;
  description: string;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: Date;
  relatedTo?: string;
}

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'chat' | 'whiteboard' | 'analysis'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [whiteboardItems, setWhiteboardItems] = useState<WhiteboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeChat();
    loadData();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeChat = () => {
    const welcomeMessage: Message = {
      from: 'bot',
      text: `🎯 Chào mừng bạn đến với AI Agent - Trợ lý quản lý công việc thông minh!

Tôi có thể giúp bạn:
📋 **Quản lý dự án & công việc**
• Phân tích mô tả công việc và tạo dự án
• Chia nhỏ dự án thành các task cụ thể
• Theo dõi tiến độ và đưa ra gợi ý

🎨 **Whiteboard thông minh**
• Ghi nhớ các quyết định quan trọng
• Lưu trữ ý tưởng và kế hoạch
• Theo dõi các mục tiêu đã đặt ra

📊 **Phân tích & động viên**
• Đánh giá hiệu suất làm việc
• Đưa ra lời khuyên cải thiện
• Động viên khi hoàn thành mục tiêu

Hãy bắt đầu bằng cách mô tả công việc hoặc dự án bạn muốn thực hiện!`,
      timestamp: new Date(),
      type: 'text'
    };
    setMessages([welcomeMessage]);
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

  const analyzeWorkDescription = async (description: string) => {
    const analysisPrompt = `
Phân tích mô tả công việc sau và đưa ra cấu trúc dự án:
"${description}"

Hãy trả về JSON với format:
{
  "projectName": "Tên dự án",
  "description": "Mô tả chi tiết dự án",
  "tasks": [
    {
      "title": "Tên task",
      "description": "Mô tả task",
      "priority": 1-3,
      "estimatedPomodoros": 1-10
    }
  ],
  "timeline": "Thời gian dự kiến",
  "keyPoints": ["Điểm quan trọng 1", "Điểm quan trọng 2"]
}
`;

    try {
      const response = await postAIChat({
        model: 'gemini-2.0-flash',
        contents: analysisPrompt
      });

      // Try to parse JSON from response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return analysis;
      }
      return null;
    } catch (error) {
      console.error('Analysis failed:', error);
      return null;
    }
  };

  const generateEncouragement = async (completedTask: Task) => {
    const encouragementPrompt = `
Người dùng vừa hoàn thành task: "${completedTask.title}"
Dự án: ${projects.find(p => p._id === completedTask.projectId)?.name || 'Unknown'}

Hãy tạo lời động viên và phân tích:
1. Lời chúc mừng nhiệt tình
2. Phân tích tiến độ hiện tại
3. Điểm mạnh đã thể hiện
4. Gợi ý cải thiện (nếu có)
5. Động lực cho bước tiếp theo

Trả lời bằng tiếng Việt, thân thiện và tích cực.
`;

    try {
      const response = await postAIChat({
        model: 'gemini-2.0-flash',
        contents: encouragementPrompt
      });
      return response.text;
    } catch (error) {
      return `🎉 Chúc mừng bạn đã hoàn thành "${completedTask.title}"! Tiếp tục phát huy nhé!`;
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      from: 'user',
      text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Check for specific commands
      if (text.toLowerCase().includes('phân tích') && text.toLowerCase().includes('dự án')) {
        const analysis = await analyzeWorkDescription(text);
        if (analysis) {
          const botMessage: Message = {
            from: 'bot',
            text: `🎯 **Phân tích dự án hoàn tất!**

**📋 Dự án:** ${analysis.projectName}
**📝 Mô tả:** ${analysis.description}
**⏱️ Thời gian:** ${analysis.timeline}

**🎯 Các task được đề xuất:**
${analysis.tasks.map((task: any, index: number) => 
  `${index + 1}. **${task.title}** (${task.priority === 3 ? 'Cao' : task.priority === 2 ? 'Trung bình' : 'Thấp'}) - ${task.estimatedPomodoros} Pomodoro\n   ${task.description}`
).join('\n')}

**💡 Điểm quan trọng:**
${analysis.keyPoints.map((point: string) => `• ${point}`).join('\n')}

Bạn có muốn tôi tạo dự án và các task này không?`,
            timestamp: new Date(),
            type: 'project',
            data: analysis
          };
          setMessages(prev => [...prev, botMessage]);

          // Add to whiteboard
          addToWhiteboard({
            type: 'project',
            title: analysis.projectName,
            description: analysis.description,
            status: 'pending'
          });
        }
      } else if (text.toLowerCase().includes('tạo dự án')) {
        // Handle project creation from analysis
        const lastProjectMessage = messages.findLast(m => m.type === 'project');
        if (lastProjectMessage?.data) {
          try {
            const project = await createProject(lastProjectMessage.data.projectName);
            
            // Create tasks
            const createdTasks = [];
            for (const taskData of lastProjectMessage.data.tasks) {
              const task = await createTask({
                projectId: project._id,
                title: taskData.title,
                description: taskData.description,
                priority: taskData.priority,
                estimatedPomodoros: taskData.estimatedPomodoros
              });
              createdTasks.push(task);
            }

            const botMessage: Message = {
              from: 'bot',
              text: `✅ **Dự án đã được tạo thành công!**

📋 **${project.name}** với ${createdTasks.length} tasks
🎯 Bạn có thể bắt đầu làm việc ngay bây giờ!

Chuyển đến trang dự án để xem chi tiết?`,
              timestamp: new Date(),
              type: 'task'
            };
            setMessages(prev => [...prev, botMessage]);

            // Update whiteboard
            updateWhiteboardItem(
              whiteboardItems.find(item => item.title === project.name)?.id || '',
              { status: 'confirmed' }
            );

            // Refresh data
            loadData();
          } catch (error) {
            const errorMessage: Message = {
              from: 'bot',
              text: '❌ Có lỗi xảy ra khi tạo dự án. Vui lòng thử lại!',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
          }
        }
      } else {
        // General AI chat
        const context = `
Bạn là AI Agent trợ lý quản lý công việc thông minh. Hãy trả lời câu hỏi sau một cách hữu ích và thân thiện.

Dữ liệu hiện tại:
- Số dự án: ${projects.length}
- Số task: ${tasks.length}
- Task hoàn thành: ${tasks.filter(t => t.status === 'done').length}

Câu hỏi: ${text}
`;

        const response = await postAIChat({
          model: 'gemini-2.0-flash',
          contents: context
        });

        const botMessage: Message = {
          from: 'bot',
          text: response.text,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        from: 'bot',
        text: '❌ Xin lỗi, có lỗi xảy ra. Vui lòng thử lại!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChatTab = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${
              message.from === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            }`}>
              <div className="whitespace-pre-wrap">{message.text}</div>
              {message.type === 'project' && message.data && (
                <button
                  onClick={() => sendMessage()}
                  className="mt-3 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  ✅ Tạo dự án này
                </button>
              )}
              <div className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
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
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Gửi
          </button>
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
                {item.createdAt.toLocaleDateString()}
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