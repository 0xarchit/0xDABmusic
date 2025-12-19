import { create } from "zustand";

interface UserState {
  user: any | null;
  isLoading: boolean;
  fetchUser: () => Promise<void>;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: false,

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const result = await window.go.main.App.GetCurrentUser();
      set({ user: result.user || null, isLoading: false });
    } catch (error) {
      set({ user: null, isLoading: false });
    }
  },

  clearUser: () => {
    set({ user: null });
  },
}));
