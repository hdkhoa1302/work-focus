import React, { useState, useEffect, useRef } from 'react';
import { postAIChat, AIChatResponse, AIChatRequest, getConversations, createConversation, activateConversation, Conversation, Message, WhiteboardItem } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { AiOutlineMessage, AiOutlineClose, AiOutlineExpandAlt, AiOutlineBulb, AiOutlineCopy, AiOutlineCheck, AiOutlineArrowDown } from 'react-icons/ai';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatWidgetProps {
  fullPage?: boolean;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ fullPage = false }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [whiteboardItems, setWhiteboardItems] = useState<WhiteboardItem[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadMessageIndex, setLastReadMessageIndex] = useState(-1);
  
  const endRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    const newOpenState = !open;
    setOpen(newOpenState);
    
    if (newOpenState) {
      loadConversations();
      loadWhiteboard();
      // Focus to last message when opening
      setTimeout(() => {
        scrollToBottom();
        setUnreadCount(0);
        setLastReadMessageIndex(messages.length - 1);
      }, 100);
    }
  };

  const expandChat = () => navigate('/chat');

  // Enhanced scroll management
  useEffect(() => {
    if (open && messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom();
        setLastReadMessageIndex(messages.length - 1);
        setUnreadCount(0);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, open]);

  // Scroll detection for showing scroll-to-bottom button
  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
        setShowScrollToBottom(!isNearBottom && messages.length > 3);
        
        // Update unread count
        if (isNearBottom) {
          setUnreadCount(0);
          setLastReadMessageIndex(messages.length - 1);
        }
      }
    };

    const container = messagesContainerRef.current;
    if (container && open) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [messages.length, open]);

  const loadConversations = async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);
      
      // Find active conversation or create new one
      const activeConv = convs.find(c => c.isActive);
      if (activeConv) {
        setActiveConversationId(activeConv._id);
        setMessages(activeConv.messages);
        setLastReadMessageIndex(activeConv.messages.length - 1);
      } else if (convs.length === 0) {
        // Create first conversation
        const newConv = await createConversation();
        setConversations([newConv]);
        setActiveConversationId(newConv._id);
        setMessages(newConv.messages);
        setLastReadMessageIndex(newConv.messages.length - 1);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadWhiteboard = () => {
    const savedWhiteboard = localStorage.getItem('ai-whiteboard');
    if (savedWhiteboard) {
      setWhiteboardItems(JSON.parse(savedWhiteboard));
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

  const updateWhiteboardItem = (itemTitle: string, updates: Partial<WhiteboardItem>) => {
    const updatedItems = whiteboardItems.map(item => 
      item.title === itemTitle ? { ...item, ...updates } : item
    );
    saveWhiteboard(updatedItems);
  };

  const switchConversation = async (conversationId: string) => {
    if (conversationId === activeConversationId) return;
    
    setIsLoadingConversation(true);
    try {
      const conv = await activateConversation(conversationId);
      setActiveConversationId(conversationId);
      setMessages(conv.messages);
      setLastReadMessageIndex(conv.messages.length - 1);
      setUnreadCount(0);
      
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
      setLastReadMessageIndex(newConv.messages.length - 1);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const scrollToBottom = () => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;
    
    const userMsg: Message = { from: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Update unread count if user is not at bottom
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      if (!isNearBottom) {
        setUnreadCount(prev => prev + 1);
      }
    }

    try {
      const response: AIChatResponse = await postAIChat({ 
        message: text,
        conversationId: activeConversationId,
        whiteboardContext: whiteboardItems
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

      // Handle different response types
      if ((response.type === 'note' || response.type === 'decision') && response.data) {
        addToWhiteboard(response.data);
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

      // Handle whiteboard updates
      if (response.type === 'apply_whiteboard_update' && response.data) {
        updateWhiteboardItem(response.data.itemTitle, response.data.updates);
      }

      // Trigger tasks refresh if project was created
      if (response.type === 'task') {
        window.dispatchEvent(new Event('tasks-updated'));
      }

      // Update unread count for bot response
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
        if (!isNearBottom) {
          setUnreadCount(prev => prev + 1);
        }
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
    <div className={`${fullPage ? 'w-full max-w-4xl' : 'w-full sm:w-96'} ${fullPage ? 'h-full' : 'h-[500px] max-h-[70vh] sm:max-h-[500px]'} bg-white dark:bg-gray-800 shadow-2xl rounded-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95`}>
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <AiOutlineBulb className="text-lg" />
          <span className="font-medium">AI Agent</span>
          {whiteboardItems.length > 0 && (
            <span className="bg-white bg-opacity-20 text-xs px-2 py-1 rounded-full">
              {whiteboardItems.length} mục
            </span>
          )}
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
            title={fullPage ? 'Đóng' : 'Thu gọn'}
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
      
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 p-3 overflow-y-auto space-y-4 relative"
      >
        {isLoadingConversation ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Đang tải tin nhắn...</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => {
              const isUnread = i > lastReadMessageIndex;
              return (
                <div key={i} className={`${m.from === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-[90%] px-3 py-2 rounded-2xl text-sm relative group ${
                    m.from === 'user' 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  } ${isUnread ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}>
                    
                    {/* Unread indicator */}
                    {isUnread && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}

                    {/* Copy button */}
                    <button
                      onClick={() => copyToClipboard(m.text, `${i}`)}
                      className={`absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                        m.from === 'user' 
                          ? 'bg-white/20 hover:bg-white/30 text-white' 
                          : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-400'
                      }`}
                      title="Copy message"
                    >
                      {copiedMessageId === `${i}` ? (
                        <AiOutlineCheck className="w-3 h-3" />
                      ) : (
                        <AiOutlineCopy className="w-3 h-3" />
                      )}
                    </button>

                    <div className="pr-6">
                      {m.from === 'bot' ? (
                        <MarkdownRenderer content={m.text} />
                      ) : (
                        <div className="whitespace-pre-wrap">{m.text}</div>
                      )}
                    </div>
                    
                    {/* Interactive buttons */}
                    {m.type === 'project' && m.data && (
                      <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                        <button
                          onClick={() => sendMessage('Có, tạo dự án')}
                          className="w-full px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium"
                        >
                          ✅ Tạo dự án này
                        </button>
                      </div>
                    )}

                    {m.type === 'whiteboard_update' && m.data && (
                      <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 space-y-2">
                        <button
                          onClick={() => sendMessage('Có, áp dụng cập nhật')}
                          className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium"
                        >
                          ✅ Áp dụng cập nhật
                        </button>
                        <button
                          onClick={() => sendMessage('Không, bỏ qua')}
                          className="w-full px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-medium"
                        >
                          ❌ Bỏ qua
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
              );
            })}
            
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

        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 w-8 h-8 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-all duration-200 flex items-center justify-center z-10"
          >
            <AiOutlineArrowDown className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </div>
      
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2 mb-2">
          <input
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Mô tả công việc, ghi chú, quyết định hoặc cập nhật..."
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
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={scrollToBottom}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
              >
                <span>{unreadCount} tin nhắn mới</span>
                <AiOutlineArrowDown className="w-3 h-3" />
              </button>
            )}
            {!fullPage && (
              <button
                onClick={expandChat}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                🚀 Mở rộng & Whiteboard
              </button>
            )}
          </div>
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
      {/* Chat Panel - Positioned as overlay */}
      {open && (
        <>
          {/* Backdrop for mobile */}
          <div className="sm:hidden fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-30 animate-in fade-in duration-300" 
               onClick={toggleOpen} />
          
          <div className="absolute bottom-16 right-0 mb-2 animate-in slide-in-from-bottom-5 fade-in duration-300">
            {/* Mobile responsive container */}
            <div className="sm:hidden">
              <div className="fixed inset-x-4 bottom-20 z-40">
                {panel}
              </div>
            </div>
            
            {/* Desktop container */}
            <div className="hidden sm:block">
              {panel}
            </div>
          </div>
        </>
      )}
      
      {/* Chat Button - Always in fixed position */}
      <button
        onClick={toggleOpen}
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative z-50 ${
          open ? 'ring-4 ring-blue-300 ring-opacity-50' : ''
        }`}
      >
        {/* Icon with rotation animation */}
        <AiOutlineMessage className={`text-lg sm:text-xl transition-transform duration-300 ${
          open ? 'rotate-12 scale-110' : ''
        }`} />
        
        {/* Notification Badge */}
        {(whiteboardItems.length > 0 || unreadCount > 0) && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : whiteboardItems.length}
          </span>
        )}
        
        {/* Active indicator */}
        {open && (
          <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 animate-pulse"></div>
        )}
      </button>
    </div>
  );
};

export default ChatWidget;