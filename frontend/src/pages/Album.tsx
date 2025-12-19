import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Download, ArrowLeft, Plus, Heart } from "lucide-react";
import { usePlayerStore } from "@/lib/player-store";
import { useFavoriteStore } from "@/lib/favorite-store";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InlineLoader } from "@/components/Loader";
import { getProxiedImageURL } from "@/lib/utils";

interface AlbumPageProps {
  albumId: string;
  onBack: () => void;
}

export function AlbumPage({ albumId, onBack }: AlbumPageProps) {
  const [album, setAlbum] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { play, setQueue } = usePlayerStore();
  const { toggleFavorite: storeFavorite, favorites } = useFavoriteStore();

  useEffect(() => {
    if (albumId) {
      fetchAlbum();
    }
  }, [albumId]);

  const fetchAlbum = async () => {
    if (!albumId) return;
    setIsLoading(true);
    try {
      const result = await window.go.main.App.GetAlbumByID(albumId);
      setAlbum(result.album);
    } catch (error) {
      toast.error("Failed to load album");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayTrack = async (track: any, trackList: any[]) => {
    try {
      const url = await window.go.main.App.GetStreamURL(track.id);
      const queueTracks = trackList.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        cover: album.cover,
        url: "",
        duration: typeof t.duration === "number" ? t.duration : 0,
        albumTitle: album.title || "",
        releaseDate: album.releaseDate || "",
        genre: album.genre || "",
      }));
      setQueue(queueTracks);

      play({
        id: track.id,
        title: track.title,
        artist: track.artist,
        cover: album.cover,
        url: url,
        duration: typeof track.duration === "number" ? track.duration : 0,
        albumTitle: album.title || "",
        releaseDate: album.releaseDate || "",
        genre: album.genre || "",
      });
    } catch (error) {
      toast.error("Failed to play track");
    }
  };

  const handlePlayAll = () => {
    if (album?.tracks?.length > 0) {
      handlePlayTrack(album.tracks[0], album.tracks);
    }
  };

  const handleDownloadAlbum = async () => {
    if (!album?.tracks) return;
    try {
      for (const track of album.tracks) {
        await window.go.main.App.DownloadTrack({
          ...track,
          albumCover: album.cover,
          albumTitle: album.title,
        });
      }
      toast.success("Album added to download queue");
    } catch (error) {
      toast.error("Failed to download album");
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <InlineLoader message="Loading album..." />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 pb-24">
      <Button variant="ghost" onClick={onBack} className="w-fit mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <ScrollArea className="flex-1">
        <div className="space-y-6">
          <div className="flex items-end gap-6 pb-6 border-b border-white/10">
            <img
              src={getProxiedImageURL(album.cover)}
              alt={album.title}
              className="h-52 w-52 rounded-lg shadow-2xl"
            />
            <div className="flex flex-col gap-4">
              <span className="text-sm font-medium uppercase tracking-wider">
                Album
              </span>
              <h1 className="text-5xl font-bold md:text-7xl">{album.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-white font-medium">{album.artist}</span>
                <span>•</span>
                <span>{album.releaseDate}</span>
                <span>•</span>
                <span>{album.trackCount} songs</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-lg"
              onClick={handlePlayAll}
            >
              <Play className="h-6 w-6 fill-current ml-1" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDownloadAlbum}>
              <Download className="h-6 w-6" />
            </Button>
          </div>

          <div className="space-y-2">
            {album.tracks?.map((track: any, index: number) => {
              const isFav = favorites.some(
                (f) => String(f.id) === String(track.id)
              );
              return (
                <div
                  key={track.id}
                  className="group flex items-center gap-4 p-3 rounded-md hover:bg-white/5 transition-colors"
                >
                  <span className="text-muted-foreground w-8">{index + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    onClick={() => handlePlayTrack(track, album.tracks)}
                  >
                    <Play className="h-4 w-4 fill-current" />
                  </Button>
                  <div className="flex-1">
                    <p className="font-medium">{track.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {track.artist}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => storeFavorite(track)}
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          isFav ? "fill-current text-green-500" : ""
                        }`}
                      />
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDuration(track.duration)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
