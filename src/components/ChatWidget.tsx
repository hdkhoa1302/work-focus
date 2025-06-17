import React, { useState, useEffect, useRef } from 'react';
import { postAIChat, AIChatResponse, AIChatRequest, createTask, getProjects, getTasks, getSuggestions, Project, Task } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { AiOutlineMessage, AiOutlineClose, AiOutlineExpandAlt, AiOutlineBulb } from 'react-icons/ai';

interface Message {
  from: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  fullPage?: boolean;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ fullPage = false }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    const newOpenState = !open;
    setOpen(newOpenState);
    
    if (newOpenState && !initialized) {
      setInitialized(true);
      setMessages([
        { 
          from: 'bot', 
          text: '🎯 Xin chào! Tôi là AI Agent - trợ lý quản lý công việc của bạn.\n\n' +
                '💡 **Tính năng nổi bật:**\n' +
                '• Phân tích mô tả công việc tự động\n' +
                '• Tạo dự án và task thông minh\n' +
                '• Whiteboard ghi nhớ ý tưởng\n' +
                '• Phân tích hiệu suất làm việc\n\n' +
                '📝 Hãy mô tả công việc bạn muốn thực hiện hoặc đặt câu hỏi!',
          timestamp: new Date()
        }
      ]);
    }
  };

  const expandChat = () => navigate('/chat');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) {
      getProjects().then(setProjects).catch(() => {});
      getTasks().then(setTasks).catch(() => {});
    }
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    
    const userMsg: Message = { from: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Quick responses for common patterns
      if (/^(tạo|thêm) (?:task|công việc)/i.test(text) && projects.length > 0) {
        const title = text.replace(/^(tạo|thêm) (?:task|công việc)\s+/i, '');
        try {
          const task = await createTask({ title, projectId: projects[0]._id });
          const botMsg: Message = { 
            from: 'bot', 
            text: `✅ Đã tạo task: "${task.title}"\n\n🚀 Bạn có thể bắt đầu làm việc ngay!`, 
            timestamp: new Date() 
          };
          setMessages(prev => [...prev, botMsg]);
          getTasks().then(setTasks).catch(() => {});
        } catch {
          const errMsg: Message = { 
            from: 'bot', 
            text: '❌ Không thể tạo task. Vui lòng thử lại!', 
            timestamp: new Date() 
          };
          setMessages(prev => [...prev, errMsg]);
        }
        setIsLoading(false);
        return;
      }

      if (/^(tìm|search)/i.test(text)) {
        const keyword = text.replace(/^(tìm|search)\s+/i, '').toLowerCase();
        const foundTasks = tasks.filter(t => 
          t.title.toLowerCase().includes(keyword) || 
          (t.description && t.description.toLowerCase().includes(keyword))
        );
        
        const resultText = foundTasks.length > 0 
          ? `🔍 **Tìm thấy ${foundTasks.length} task:**\n\n` + 
            foundTasks.slice(0, 5).map(t => 
              `• ${t.title} ${t.status ? `(${t.status})` : ''}`
            ).join('\n')
          : `🔍 Không tìm thấy task nào với từ khóa "${keyword}"`;
        
        const botMsg: Message = { from: 'bot', text: resultText, timestamp: new Date() };
        setMessages(prev => [...prev, botMsg]);
        setIsLoading(false);
        return;
      }

      if (/^(gợi ý|đề xuất|priority)/i.test(text)) {
        try {
          const { tasks: prioritizedTasks } = await getSuggestions();
          
          const resultText = prioritizedTasks.length > 0 
            ? `🎯 **Đề xuất ưu tiên:**\n\n` +
              prioritizedTasks.slice(0, 3).map((task, index) => 
                `${index + 1}. ${task.title} ${task.deadline ? `⏰ ${new Date(task.deadline).toLocaleDateString()}` : ''}`
              ).join('\n') +
              `\n\n💡 Bạn nên tập trung vào "${prioritizedTasks[0].title}" trước!`
            : '📝 Chưa có task nào để đề xuất. Hãy tạo task mới!';
          
          const botMsg: Message = { from: 'bot', text: resultText, timestamp: new Date() };
          setMessages(prev => [...prev, botMsg]);
        } catch (error) {
          const botMsg: Message = { 
            from: 'bot', 
            text: '❌ Không thể lấy gợi ý. Vui lòng thử lại!', 
            timestamp: new Date() 
          };
          setMessages(prev => [...prev, botMsg]);
        }
        setIsLoading(false);
        return;
      }

      // General AI chat with enhanced context
      const context = `
Bạn là AI Agent trợ lý quản lý công việc thông minh. Trả lời ngắn gọn, hữu ích và thân thiện.

Dữ liệu người dùng:
- Dự án: ${projects.length} (${projects.filter(p => !p.completed).length} đang thực hiện)
- Task: ${tasks.length} (${tasks.filter(t => t.status === 'done').length} hoàn thành)

Khả năng chính:
- Phân tích mô tả công việc và tạo dự án/task
- Gợi ý ưu tiên công việc
- Theo dõi tiến độ và động viên

Câu hỏi: ${text}

Gợi ý: Nếu người dùng mô tả công việc phức tạp, hãy đề xuất họ sử dụng tính năng "Mở rộng" để phân tích chi tiết hơn.
`;

      const res: AIChatResponse = await postAIChat({ 
        model: 'gemini-2.0-flash', 
        contents: context 
      });
      
      const botMsg: Message = { from: 'bot', text: res.text, timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);
    } catch {
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
    <div className="w-80 h-[500px] bg-white dark:bg-gray-800 shadow-xl rounded-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
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
      
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`${m.from === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
              m.from === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}>
              <div className="whitespace-pre-wrap">{m.text}</div>
              <div className="text-xs opacity-70 mt-1">
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      </div>
      
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <input
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Mô tả công việc..."
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Gửi
          </button>
        </div>
        
        {!fullPage && (
          <div className="mt-2 text-center">
            <button
              onClick={expandChat}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              🚀 Mở rộng để trải nghiệm đầy đủ
            </button>
          </div>
        )}
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
    <div className="fixed bottom-6 right-6 z-50">
      {open && panel}
      <button
        onClick={toggleOpen}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
      >
        <AiOutlineMessage size={24} />
      </button>
    </div>
  );
};

export default ChatWidget;