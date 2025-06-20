import { create } from 'zustand';
import { 
  getConversations, 
  createConversation, 
  getConversation, 
  activateConversation, 
  deleteConversation,
  postAIChat,
  Conversation,
  Message,
  AIChatRequest,
  AIChatResponse
} from '../services/api';
import useWhiteboardStore from './whiteboardStore';

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  
  // Actions
  fetchConversations: () => Promise<void>;
  createNewConversation: (title?: string) => Promise<Conversation>;
  activateConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (message: string, conversationId?: string) => Promise<AIChatResponse>;
  
  // Computed
  getActiveConversation: () => Conversation | null;
  getConversationById: (id: string) => Conversation | null;
}

const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  
  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await getConversations();
      
      // Find active conversation
      const activeConversation = conversations.find(c => c.isActive);
      
      set({ 
        conversations, 
        activeConversationId: activeConversation?._id || null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch conversations', 
        isLoading: false 
      });
    }
  },
  
  createNewConversation: async (title) => {
    set({ isLoading: true, error: null });
    try {
      const newConversation = await createConversation(title);
      
      set(state => ({ 
        conversations: [newConversation, ...state.conversations.map(c => ({ ...c, isActive: false }))],
        activeConversationId: newConversation._id,
        isLoading: false 
      }));
      
      return newConversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create conversation', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  activateConversation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const conversation = await activateConversation(id);
      
      set(state => ({ 
        conversations: state.conversations.map(c => ({
          ...c,
          isActive: c._id === id
        })),
        activeConversationId: id,
        isLoading: false 
      }));
    } catch (error) {
      console.error('Failed to activate conversation:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to activate conversation', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  deleteConversation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteConversation(id);
      
      set(state => ({ 
        conversations: state.conversations.filter(c => c._id !== id),
        activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
        isLoading: false 
      }));
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete conversation', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  sendMessage: async (message, conversationId) => {
    set({ isSubmitting: true, error: null });
    try {
      const activeId = conversationId || get().activeConversationId;
      const whiteboardItems = useWhiteboardStore.getState().items;
      
      // Add user message to UI immediately (optimistic update)
      if (activeId) {
        set(state => ({
          conversations: state.conversations.map(c => {
            if (c._id === activeId) {
              return {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    from: 'user',
                    text: message,
                    timestamp: new Date()
                  }
                ]
              };
            }
            return c;
          })
        }));
      }
      
      // Send to API
      const response = await postAIChat({ 
        message,
        conversationId: activeId || undefined,
        whiteboardContext: whiteboardItems
      });
      
      // Update conversation with bot response
      const botMessage: Message = { 
        from: 'bot', 
        text: response.message, 
        timestamp: new Date(),
        type: response.type as any,
        data: response.data
      };
      
      // Update state with response
      set(state => {
        // If conversation ID changed (new conversation created)
        if (response.conversationId !== activeId) {
          // Need to fetch conversations to get the new one
          get().fetchConversations();
          return { isSubmitting: false };
        }
        
        // Otherwise update existing conversation
        return {
          conversations: state.conversations.map(c => {
            if (c._id === response.conversationId) {
              return {
                ...c,
                messages: [...c.messages, botMessage]
              };
            }
            return c;
          }),
          isSubmitting: false
        };
      });
      
      return response;
    } catch (error) {
      console.error('Failed to send message:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to send message', 
        isSubmitting: false 
      });
      throw error;
    }
  },
  
  // Computed values
  getActiveConversation: () => {
    const { conversations, activeConversationId } = get();
    if (!activeConversationId) return null;
    return conversations.find(c => c._id === activeConversationId) || null;
  },
  
  getConversationById: (id) => {
    return get().conversations.find(c => c._id === id) || null;
  }
}));

export default useConversationStore;