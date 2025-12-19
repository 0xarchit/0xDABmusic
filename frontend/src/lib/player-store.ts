import { create } from "zustand";

interface Track {
  id: string;
  title: string;
  artist: string;
  cover: string;
  url: string;
  duration: number;
  albumTitle?: string;
  releaseDate?: string;
  genre?: string;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  queue: Track[];
  originalQueue: Track[];
  isShuffle: boolean;
  repeatMode: "none" | "all" | "one";
  play: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (vol: number) => void;
  addToQueue: (track: Track) => void;
  setQueue: (tracks: Track[]) => void;
  removeFromQueue: (trackId: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  next: () => void;
  prev: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 1,
  queue: [],
  originalQueue: [],
  isShuffle: false,
  repeatMode: "none",

  play: async (track: Track) => {
    if (!track.url) {
      try {
        // @ts-ignore
        const url = await window.go.main.App.GetStreamURL(track.id);
        track.url = url;
      } catch (e) {
        console.error("Failed to get stream URL in play():", e);
      }
    }
    set({ currentTrack: { ...track }, isPlaying: true });
  },
  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  stop: () => set({ currentTrack: null, isPlaying: false }),
  setVolume: (vol: number) => set({ volume: vol }),
  addToQueue: (track: Track) =>
    set((state: PlayerState) => ({
      queue: [...state.queue, track],
      originalQueue: [...state.originalQueue, track],
    })),
  setQueue: (tracks: Track[]) => set({ queue: tracks, originalQueue: tracks }),

  removeFromQueue: (trackId: string) =>
    set((state: PlayerState) => {
      const newQueue = state.queue.filter((t) => t.id !== trackId);
      const newOriginalQueue = state.originalQueue.filter(
        (t) => t.id !== trackId
      );
      return { queue: newQueue, originalQueue: newOriginalQueue };
    }),

  reorderQueue: (fromIndex: number, toIndex: number) =>
    set((state: PlayerState) => {
      const newQueue = [...state.queue];
      const [movedTrack] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedTrack);
      return { queue: newQueue, originalQueue: newQueue };
    }),

  toggleShuffle: () => {
    const { isShuffle, queue, originalQueue, currentTrack } = get();
    const newShuffleState = !isShuffle;

    if (newShuffleState) {
      let shuffled = [...originalQueue];

      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      if (currentTrack) {
        const currentIdx = shuffled.findIndex((t) => t.id === currentTrack.id);
        if (currentIdx !== -1) {
          shuffled.splice(currentIdx, 1);
          shuffled.unshift(currentTrack);
        }
      }

      set({ isShuffle: true, queue: shuffled });
    } else {
      set({ isShuffle: false, queue: originalQueue });
    }
  },

  toggleRepeat: () =>
    set((state) => {
      const modes: ("none" | "all" | "one")[] = ["none", "all", "one"];
      const nextIndex = (modes.indexOf(state.repeatMode) + 1) % modes.length;
      return { repeatMode: modes[nextIndex] };
    }),

  next: async () => {
    const { queue, currentTrack, repeatMode } = get();
    if (queue.length === 0) {
      set({ isPlaying: false });
      return;
    }

    let nextIndex = -1;
    const currentIndex = queue.findIndex(
      (t: Track) => t.id === currentTrack?.id
    );

    if (repeatMode === "one") {
      nextIndex = currentIndex;
    } else {
      if (currentIndex < queue.length - 1) {
        nextIndex = currentIndex + 1;
      } else if (repeatMode === "all") {
        nextIndex = 0;
      }
    }

    if (nextIndex !== -1) {
      const nextTrack = queue[nextIndex];
      if (!nextTrack.url) {
        try {
          // @ts-ignore
          const url = await window.go.main.App.GetStreamURL(nextTrack.id);
          nextTrack.url = url;

          const newQueue = [...queue];
          newQueue[nextIndex] = nextTrack;
          set({ queue: newQueue });
        } catch (e) {}
      }
      set({ currentTrack: { ...nextTrack }, isPlaying: true });
    } else {
      set({ isPlaying: false });
    }
  },

  prev: async () => {
    const { queue, currentTrack } = get();
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex(
      (t: Track) => t.id === currentTrack?.id
    );
    if (currentIndex > 0) {
      const prevTrack = queue[currentIndex - 1];
      if (!prevTrack.url) {
        try {
          // @ts-ignore
          const url = await window.go.main.App.GetStreamURL(prevTrack.id);
          prevTrack.url = url;

          const newQueue = [...queue];
          newQueue[currentIndex - 1] = prevTrack;
          set({ queue: newQueue });
        } catch (e) {}
      }
      set({ currentTrack: { ...prevTrack }, isPlaying: true });
    }
  },
}));
