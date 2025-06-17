import React, { useState, useEffect, useRef } from 'react';
import { postAIChat, AIChatResponse, AIChatRequest, createTask, getProjects, getTasks, getSuggestions, Project, Task } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { AiOutlineMessage, AiOutlineClose, AiOutlineExpandAlt } from 'react-icons/ai';

interface Message {
  from: 'user' | 'bot';
  text: string;
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
  const endRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    const newOpenState = !open;
    setOpen(newOpenState);
    
    if (newOpenState && !initialized) {
      setInitialized(true);
      setMessages([
        { 
          from: 'bot', 
          text: 'Xin chào! Tôi là AI Agent trợ lý công việc cá nhân của bạn. Tôi có thể giúp bạn:\n\n' +
                '• Tạo công việc mới (VD: "tạo task viết báo cáo")\n' +
                '• Liệt kê công việc của bạn\n' +
                '• Tìm kiếm công việc theo từ khóa\n' +
                '• Tóm tắt công việc theo dự án\n' +
                '• Đề xuất ưu tiên công việc\n' +
                '• Trả lời câu hỏi về dự án của bạn\n\n' +
                'Bạn cần giúp gì hôm nay?'
        }
      ]);
    }
  };

  const expandChat = () => navigate('/chat');

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { from: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (/^tạo (?:task|công việc)/i.test(text) && projects.length > 0) {
      const title = text.replace(/^tạo (?:task|công việc)\s+/i, '');
      try {
        const task = await createTask({ title, projectId: projects[0]._id });
        const botMsg: Message = { from: 'bot', text: `Đã tạo task: ${task.title}` };
        setMessages(prev => [...prev, botMsg]);
        getTasks().then(setTasks).catch(() => {});
      } catch {
        const errMsg: Message = { from: 'bot', text: 'Tạo task thất bại.' };
        setMessages(prev => [...prev, errMsg]);
      }
      return;
    }
    if (/^tìm (?:task|công việc)|^tìm kiếm/i.test(text)) {
      const keyword = text.replace(/^tìm (?:task|công việc|kiếm)\s+/i, '').toLowerCase();
      const foundTasks = tasks.filter(t => 
        t.title.toLowerCase().includes(keyword) || 
        (t.description && t.description.toLowerCase().includes(keyword))
      );
      
      if (foundTasks.length > 0) {
        const resultText = `Tìm thấy ${foundTasks.length} công việc:\n\n` + 
          foundTasks.map(t => `• ${t.title}${t.status ? ` (${t.status})` : ''}${t.deadline ? ` - Deadline: ${new Date(t.deadline).toLocaleDateString()}` : ''}`).join('\n');
        const botMsg: Message = { from: 'bot', text: resultText };
        setMessages(prev => [...prev, botMsg]);
      } else {
        const botMsg: Message = { from: 'bot', text: `Không tìm thấy công việc nào với từ khóa "${keyword}".` };
        setMessages(prev => [...prev, botMsg]);
      }
      return;
    }
    if (/^(?:liệt kê|danh sách|xem) (?:task|công việc|tasks)/i.test(text)) {
      if (tasks.length > 0) {
        const tasksByStatus = tasks.reduce((acc: Record<string, Task[]>, task) => {
          const status = task.status || 'không xác định';
          if (!acc[status]) acc[status] = [];
          acc[status].push(task);
          return acc;
        }, {});
        
        let resultText = `Danh sách công việc:\n\n`;
        for (const [status, statusTasks] of Object.entries(tasksByStatus)) {
          resultText += `${status.toUpperCase()}:\n`;
          resultText += statusTasks.map(t => 
            `• ${t.title}${t.deadline ? ` - Deadline: ${new Date(t.deadline).toLocaleDateString()}` : ''}`
          ).join('\n');
          resultText += '\n\n';
        }
        
        const botMsg: Message = { from: 'bot', text: resultText };
        setMessages(prev => [...prev, botMsg]);
      } else {
        const botMsg: Message = { from: 'bot', text: 'Bạn chưa có công việc nào.' };
        setMessages(prev => [...prev, botMsg]);
      }
      return;
    }
    if (/^(?:gợi ý|đề xuất|ưu tiên|priority)/i.test(text)) {
      try {
        const { tasks: prioritizedTasks } = await getSuggestions();
        
        if (prioritizedTasks.length > 0) {
          let resultText = `Đề xuất thứ tự ưu tiên công việc:\n\n`;
          
          prioritizedTasks.slice(0, 5).forEach((task, index) => {
            const deadline = task.deadline ? ` - Deadline: ${new Date(task.deadline).toLocaleDateString()}` : '';
            const status = task.status ? ` (${task.status})` : '';
            resultText += `${index + 1}. ${task.title}${status}${deadline}\n`;
          });
          
          if (prioritizedTasks.length > 5) {
            resultText += `\n... và ${prioritizedTasks.length - 5} công việc khác.`;
          }
          
          resultText += `\n\nGợi ý: Bạn nên tập trung vào "${prioritizedTasks[0].title}" trước tiên.`;
          
          const botMsg: Message = { from: 'bot', text: resultText };
          setMessages(prev => [...prev, botMsg]);
        } else {
          const botMsg: Message = { from: 'bot', text: 'Bạn chưa có công việc nào để đề xuất ưu tiên.' };
          setMessages(prev => [...prev, botMsg]);
        }
      } catch (error) {
        const botMsg: Message = { from: 'bot', text: 'Không thể lấy đề xuất ưu tiên công việc.' };
        setMessages(prev => [...prev, botMsg]);
      }
      return;
    }
    if (/^phân tích dự án\s+/i.test(text)) {
      const match = text.match(/^phân tích dự án\s+(.+)/i);
      const projectName = match?.[1]?.trim();
      if (!projectName) {
        setMessages(prev => [...prev, { from: 'bot', text: 'Vui lòng cung cấp tên dự án.' }]);
        return;
      }
      const project = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
      if (!project) {
        setMessages(prev => [...prev, { from: 'bot', text: `Không tìm thấy dự án "${projectName}".` }]);
        return;
      }
      const projectTasks = tasks.filter(t => t.projectId === project._id);
      const details = projectTasks.map(t =>
        `- ${t.title}${t.status ? ` [${t.status}]` : ''}${t.deadline ? ` (Deadline: ${new Date(t.deadline).toLocaleDateString()})` : ''}`
      ).join('\n');
      const prompt = `Dưới đây là các công việc của dự án "${project.name}":\n${details}\n\n` +
        'Hãy phân tích tiến độ, điểm mạnh, điểm yếu và đề xuất cách cải thiện tiến độ dự án.';
      try {
        const res = await postAIChat({ model: 'gemini-2.0-flash', contents: prompt });
        setMessages(prev => [...prev, { from: 'bot', text: res.text }]);
      } catch {
        setMessages(prev => [...prev, { from: 'bot', text: 'Lỗi khi phân tích dự án.' }]);
      }
      return;
    }
    try {
      const context = [
        `Bạn là AI Agent trợ lý cá nhân quản lý công việc. Tên bạn là WorkFocus Assistant.`,
        `Khả năng của bạn:`,
        `1. Tạo công việc mới khi user nhập "tạo task [tên task]" hoặc "tạo công việc [tên công việc]"`,
        `2. Liệt kê và tóm tắt công việc hiện có theo dự án, deadline, ưu tiên`,
        `3. Tìm kiếm công việc theo từ khóa, trạng thái`,
        `4. Đề xuất thứ tự ưu tiên công việc dựa trên deadline và mức độ quan trọng`,
        `5. Trả lời câu hỏi về dự án và công việc`,
        `6. Nhắc nhở deadline sắp đến`,
        `Dự án hiện có: ${projects.map(p => p.name).join(', ') || 'Không có dự án'}`,
        `Công việc hiện có: ${tasks.map(t => `${t.title}${t.status ? ` (${t.status})` : ''}`).join(', ') || 'Không có công việc'}`,
        `Hãy trả lời ngắn gọn, rõ ràng và thân thiện. Luôn đề xuất hành động cụ thể.`
      ].join('\n');
      const payload: AIChatRequest = { model: 'gemini-2.0-flash', contents: context + '\n\n' + text };
      const res: AIChatResponse = await postAIChat(payload);
      const botMsg: Message = { from: 'bot', text: res.text };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      const errMsg: Message = { from: 'bot', text: 'Lỗi khi gọi AI.' };
      setMessages(prev => [...prev, errMsg]);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    getProjects().then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    getTasks().then(setTasks).catch(() => {});
  }, []);

  // Panel content
  const panel = (
    <div className="w-72 h-96 bg-white dark:bg-gray-800 shadow-lg rounded-lg flex flex-col overflow-hidden">
      <div className="bg-blue-500 text-white px-4 py-2 flex justify-between items-center">
        <span>AI Agent</span>
        <div className="flex space-x-2">
          {!fullPage && <button onClick={expandChat}><AiOutlineExpandAlt className="text-xl" /></button>}
          <button onClick={fullPage ? () => navigate('/') : toggleOpen}><AiOutlineClose className="text-xl" /></button>
        </div>
      </div>
      <div className="flex-1 p-2 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 ${m.from === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block px-3 py-1 rounded ${m.from === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
              {m.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex">
        <input
          className="flex-1 px-2 py-1 rounded-l border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          placeholder="Nhập tin nhắn..."
        />
        <button
          onClick={sendMessage}
          className="px-3 bg-blue-500 text-white rounded-r hover:bg-blue-600 focus:outline-none"
        >
          Gửi
        </button>
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
        className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 focus:outline-none"
      >
        <AiOutlineMessage size={24} />
      </button>
    </div>
  );
};

export default ChatWidget; 