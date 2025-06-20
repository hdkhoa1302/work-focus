import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WhiteboardItem {
  id: string;
  type: 'project' | 'task' | 'note' | 'decision';
  title: string;
  description: string;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: Date;
  relatedTo?: string;
  priority?: number;
  tags?: string[];
}

interface WhiteboardState {
  items: WhiteboardItem[];
  
  // Actions
  addItem: (item: Omit<WhiteboardItem, 'id' | 'createdAt'>) => void;
  updateItem: (itemId: string, updates: Partial<WhiteboardItem>) => void;
  updateItemByTitle: (itemTitle: string, updates: Partial<WhiteboardItem>) => void;
  deleteItem: (itemId: string) => void;
  clearItems: () => void;
}

const useWhiteboardStore = create<WhiteboardState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => set((state) => ({
        items: [
          ...state.items,
          {
            ...item,
            id: Date.now().toString(),
            createdAt: new Date()
          }
        ]
      })),
      
      updateItem: (itemId, updates) => set((state) => ({
        items: state.items.map(item => 
          item.id === itemId ? { ...item, ...updates } : item
        )
      })),
      
      updateItemByTitle: (itemTitle, updates) => set((state) => ({
        items: state.items.map(item => 
          item.title === itemTitle ? { ...item, ...updates } : item
        )
      })),
      
      deleteItem: (itemId) => set((state) => ({
        items: state.items.filter(item => item.id !== itemId)
      })),
      
      clearItems: () => set({ items: [] })
    }),
    {
      name: 'whiteboard-storage',
    }
  )
);

export default useWhiteboardStore;