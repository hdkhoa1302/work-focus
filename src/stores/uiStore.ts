import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  
  // Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  
  // Modals
  activeModal: string | null;
  openModal: (modalId: string, modalData?: any) => void;
  closeModal: () => void;
  modalData: any;
  
  // Floating timer
  isFloatingTimerOpen: boolean;
  toggleFloatingTimer: () => void;
  
  // Chat widget
  isChatWidgetOpen: boolean;
  toggleChatWidget: () => void;
  
  // Task detail
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  
  // Project detail
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
}

const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Theme
      isDarkMode: localStorage.getItem('darkMode') === 'true',
      toggleDarkMode: () => {
        const newValue = !get().isDarkMode;
        set({ isDarkMode: newValue });
        
        // Update document class for Tailwind
        if (newValue) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        localStorage.setItem('darkMode', String(newValue));
      },
      
      // Sidebar
      isSidebarOpen: window.innerWidth >= 1024, // Default open on desktop
      toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
      closeSidebar: () => set({ isSidebarOpen: false }),
      
      // Modals
      activeModal: null,
      modalData: null,
      openModal: (modalId, modalData = null) => set({ activeModal: modalId, modalData }),
      closeModal: () => set({ activeModal: null, modalData: null }),
      
      // Floating timer
      isFloatingTimerOpen: false,
      toggleFloatingTimer: () => set(state => ({ isFloatingTimerOpen: !state.isFloatingTimerOpen })),
      
      // Chat widget
      isChatWidgetOpen: false,
      toggleChatWidget: () => set(state => ({ isChatWidgetOpen: !state.isChatWidgetOpen })),
      
      // Task detail
      selectedTaskId: null,
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      
      // Project detail
      selectedProjectId: localStorage.getItem('selectedProjectId'),
      setSelectedProjectId: (id) => {
        set({ selectedProjectId: id });
        if (id) {
          localStorage.setItem('selectedProjectId', id);
        } else {
          localStorage.removeItem('selectedProjectId');
        }
      }
    }),
    {
      name: 'ui-state',
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        selectedProjectId: state.selectedProjectId
      })
    }
  )
);

// Initialize dark mode on first load
const { isDarkMode } = useUIStore.getState();
if (isDarkMode) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

export default useUIStore;