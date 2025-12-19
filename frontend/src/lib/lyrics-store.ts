import { create } from "zustand";

interface LyricsState {
  lyrics: string | null;
  isLoading: boolean;
  isUnsynced: boolean;
  fetchLyrics: (artist: string, title: string) => Promise<void>;
  clearLyrics: () => void;
}

export const useLyricsStore = create<LyricsState>((set) => ({
  lyrics: null,
  isLoading: false,
  isUnsynced: true,

  fetchLyrics: async (artist: string, title: string) => {
    console.log("[Lyrics Store] Fetching lyrics for:", { artist, title });
    set({ isLoading: true });
    try {
      const result = await window.go.main.App.GetLyrics(artist, title);
      console.log("[Lyrics Store] API response:", result);
      console.log("[Lyrics Store] Is unsynced:", result.unsynced !== false);
      set({
        lyrics: result.lyrics || null,
        isUnsynced: result.unsynced !== false,
        isLoading: false,
      });
    } catch (error) {
      console.error("[Lyrics Store] Error fetching lyrics:", error);
      set({ lyrics: null, isLoading: false });
    }
  },

  clearLyrics: () => {
    set({ lyrics: null, isUnsynced: true });
  },
}));
