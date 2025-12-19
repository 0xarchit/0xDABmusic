import { create } from "zustand";
import { toast } from "sonner";

interface FavoriteState {
  favorites: any[];
  isLoading: boolean;
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (track: any) => Promise<boolean>;
  isFavorite: (trackId: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  isLoading: false,

  fetchFavorites: async () => {
    set({ isLoading: true });
    try {
      const favs = await window.go.main.App.GetFavorites();
      set({ favorites: favs || [], isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  toggleFavorite: async (track: any) => {
    const { favorites, fetchFavorites } = get();
    const trackId = String(track.id);
    const favoriteTrack = favorites.find((f) => String(f.id) === trackId);
    const isFav = !!favoriteTrack;

    try {
      if (isFav && favoriteTrack) {
        await window.go.main.App.RemoveFromFavorites(String(favoriteTrack.id));
        await fetchFavorites();
        toast.success("Removed from favorites");
        return false;
      } else {
        const trackToAdd = {
          id: trackId,
          title: track.title || "",
          artist: track.artist || "",
          albumCover: track.albumCover || track.cover || "",
          albumTitle: track.albumTitle || "",
          duration: Number(track.duration) || 0,
          releaseDate: track.releaseDate || "",
          genre: track.genre || "",
        };
        await window.go.main.App.AddToFavorites(trackToAdd);
        await fetchFavorites();
        toast.success("Added to favorites");
        return true;
      }
    } catch (error: any) {
      await fetchFavorites();
      const errorMsg =
        typeof error === "string" ? error : error.message || "Unknown error";

      if (
        errorMsg.includes("track already exists") ||
        errorMsg.includes("already in favorites")
      ) {
        toast.error("Already in favorites");
      } else if (errorMsg.includes("404")) {
        toast.error("Track not found in favorites");
      } else {
        toast.error("Failed to update favorites");
      }
      return isFav;
    }
  },

  isFavorite: (trackId: string) => {
    const { favorites } = get();
    return favorites.some((f) => String(f.id) === String(trackId));
  },
}));
