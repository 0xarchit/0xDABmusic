import { create } from "zustand";
import { persist } from "zustand/middleware";

interface QueueState {
  savedQueue: any[];
  syncQueue: (queue: any[]) => Promise<void>;
  loadQueue: () => Promise<void>;
  clearSavedQueue: () => Promise<void>;
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      savedQueue: [],

      syncQueue: async (queue: any[]) => {
        set({ savedQueue: queue });
        try {
          await window.go.main.App.SaveQueue(queue);
        } catch (error) {
          console.error("Failed to sync queue:", error);
        }
      },

      loadQueue: async () => {
        try {
          const queue = await window.go.main.App.GetQueue();
          set({ savedQueue: queue || [] });
        } catch (error) {
          console.error("Failed to load queue:", error);
        }
      },

      clearSavedQueue: async () => {
        set({ savedQueue: [] });
        try {
          await window.go.main.App.ClearQueue();
        } catch (error) {
          console.error("Failed to clear queue:", error);
        }
      },
    }),
    {
      name: "queue-storage",
      partialize: (state) => ({ savedQueue: state.savedQueue }),
    }
  )
);
