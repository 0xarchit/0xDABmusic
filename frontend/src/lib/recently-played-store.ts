import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Track {
  id: string;
  title: string;
  artist: string;
  albumTitle?: string;
  cover: string;
  duration: number;
  playedAt: number;
}

interface RecentlyPlayedState {
  tracks: Track[];
  addTrack: (track: Omit<Track, "playedAt">) => void;
  clearHistory: () => void;
}

export const useRecentlyPlayedStore = create<RecentlyPlayedState>()(
  persist(
    (set) => ({
      tracks: [],
      addTrack: (track) =>
        set((state) => {
          const newTrack = { ...track, playedAt: Date.now() };
          const filtered = state.tracks.filter((t) => t.id !== track.id);
          return {
            tracks: [newTrack, ...filtered].slice(0, 50),
          };
        }),
      clearHistory: () => set({ tracks: [] }),
    }),
    {
      name: "recently-played-storage",
    }
  )
);
