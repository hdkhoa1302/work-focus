import { useRootStore, useProjectStore, useTaskStore, useTimerStore, useNotificationStore, useWhiteboardStore, useConfigStore } from '../stores/rootStore';
import useSessionStore from '../stores/sessionStore';
import useConversationStore from '../stores/conversationStore';
import useAnalyticsStore from '../stores/analyticsStore';
import useUIStore from '../stores/uiStore';

// Custom hook to access all stores in one place
export const useStores = () => {
  return {
    rootStore: useRootStore,
    projectStore: useProjectStore,
    taskStore: useTaskStore,
    timerStore: useTimerStore,
    notificationStore: useNotificationStore,
    whiteboardStore: useWhiteboardStore,
    configStore: useConfigStore,
    sessionStore: useSessionStore,
    conversationStore: useConversationStore,
    analyticsStore: useAnalyticsStore,
    uiStore: useUIStore
  };
};

export default useStores;