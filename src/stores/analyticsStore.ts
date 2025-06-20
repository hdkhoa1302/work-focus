import { create } from 'zustand';
import { 
  getAnalysis, 
  getProactiveFeedback, 
  getSuggestions,
  AnalysisResponse, 
  ProactiveFeedbackResponse, 
  SuggestResponse 
} from '../services/api';

interface AnalyticsState {
  analysis: AnalysisResponse | null;
  proactiveFeedback: ProactiveFeedbackResponse | null;
  suggestions: SuggestResponse | null;
  isLoadingAnalysis: boolean;
  isLoadingFeedback: boolean;
  isLoadingSuggestions: boolean;
  error: string | null;
  
  // Actions
  fetchAnalysis: () => Promise<AnalysisResponse>;
  fetchProactiveFeedback: () => Promise<ProactiveFeedbackResponse>;
  fetchSuggestions: () => Promise<SuggestResponse>;
  
  // UI state
  showFeedback: boolean;
  setShowFeedback: (show: boolean) => void;
}

const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  analysis: null,
  proactiveFeedback: null,
  suggestions: null,
  isLoadingAnalysis: false,
  isLoadingFeedback: false,
  isLoadingSuggestions: false,
  error: null,
  showFeedback: false,
  
  fetchAnalysis: async () => {
    set({ isLoadingAnalysis: true, error: null });
    try {
      const analysis = await getAnalysis();
      set({ analysis, isLoadingAnalysis: false });
      return analysis;
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch analysis', 
        isLoadingAnalysis: false 
      });
      throw error;
    }
  },
  
  fetchProactiveFeedback: async () => {
    set({ isLoadingFeedback: true, error: null });
    try {
      const feedback = await getProactiveFeedback();
      set({ 
        proactiveFeedback: feedback, 
        isLoadingFeedback: false,
        // Show feedback notification if it's meaningful
        showFeedback: feedback.feedback && feedback.feedback.length > 50
      });
      return feedback;
    } catch (error) {
      console.error('Failed to fetch proactive feedback:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch proactive feedback', 
        isLoadingFeedback: false 
      });
      throw error;
    }
  },
  
  fetchSuggestions: async () => {
    set({ isLoadingSuggestions: true, error: null });
    try {
      const suggestions = await getSuggestions();
      set({ suggestions, isLoadingSuggestions: false });
      return suggestions;
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch suggestions', 
        isLoadingSuggestions: false 
      });
      throw error;
    }
  },
  
  setShowFeedback: (show) => set({ showFeedback: show })
}));

export default useAnalyticsStore;