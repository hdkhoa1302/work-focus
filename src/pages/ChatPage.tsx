import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatWidget from '../components/ChatWidget';
import WhiteboardPanel from '../components/whiteboard/WhiteboardPanel';
import AnalysisPanel from '../components/AnalysisPanel';
import { AiOutlineArrowLeft, AiOutlineClose, AiOutlinePlus, AiOutlineMessage } from 'react-icons/ai';
import { getConversations, createConversation, activateConversation, Conversation } from '../services/api';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'chat' | 'whiteboard' | 'analysis'>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const convs = await getConversations();
      setConversations(convs);
      
      // Find active conversation
      const activeConv = convs.find(c => c.isActive);
      if (activeConv) {
        setActiveConversationId(activeConv._id);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const switchConversation = async (conversationId: string) => {
    if (conversationId === activeConversationId) return;
    
    try {
      const conv = await activateConversation(conversationId);
      setActiveConversationId(conversationId);
      
      // Update conversations list
      setConversations(prev => prev.map(c => ({
        ...c,
        isActive: c._id === conversationId
      })));
      
      // Trigger refresh in ChatWidget
      window.dispatchEvent(new CustomEvent('conversation-changed', { detail: { conversationId } }));
    } catch (error) {
      console.error('Failed to switch conversation:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const newConv = await createConversation(`Cuộc trò chuyện ${new Date().toLocaleDateString()}`);
      setConversations(prev => [newConv, ...prev.map(c => ({ ...c, isActive: false }))]);
      setActiveConversationId(newConv._id);
      
      // Trigger refresh in ChatWidget
      window.dispatchEvent(new CustomEvent('conversation-changed', { detail: { conversationId: newConv._id } }));
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Quay lại trang chính"
          >
            <AiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">AI Assistant & Whiteboard</h1>
          
          {/* Sidebar toggle for mobile */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Toggle sidebar"
          >
            <AiOutlineMessage className="text-xl text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('whiteboard')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'whiteboard'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Whiteboard
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'analysis'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Thống kê
            </button>
          </div>
          
          {/* Close button */}
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Đóng"
          >
            <AiOutlineClose className="text-xl text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar - Chat History */}
        {(activeTab === 'chat' && showSidebar) && (
          <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Lịch sử chat</h2>
                <button
                  onClick={createNewConversation}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Tạo cuộc trò chuyện mới"
                >
                  <AiOutlinePlus className="text-lg text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto p-2">
              {isLoadingConversations ? (
                <div className="flex items-center justify-center h-20">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <AiOutlineMessage className="text-3xl mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chưa có cuộc trò chuyện nào</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map(conv => (
                    <button
                      key={conv._id}
                      onClick={() => switchConversation(conv._id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        conv._id === activeConversationId
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-medium truncate ${
                            conv._id === activeConversationId
                              ? 'text-blue-900 dark:text-blue-100'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {conv.title}
                          </h3>
                          <p className={`text-xs mt-1 truncate ${
                            conv._id === activeConversationId
                              ? 'text-blue-600 dark:text-blue-300'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {conv.messages.length > 0 
                              ? conv.messages[conv.messages.length - 1].text.substring(0, 50) + '...'
                              : 'Cuộc trò chuyện trống'
                            }
                          </p>
                        </div>
                        {conv._id === activeConversationId && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs ${
                          conv._id === activeConversationId
                            ? 'text-blue-500 dark:text-blue-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {conv.messages.length} tin nhắn
                        </span>
                        <span className={`text-xs ${
                          conv._id === activeConversationId
                            ? 'text-blue-500 dark:text-blue-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {new Date(conv.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' ? (
            <ChatWidget fullPage />
          ) : activeTab === 'whiteboard' ? (
            <WhiteboardPanel />
          ) : (
            <AnalysisPanel />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;