import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Search, RefreshCw, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { usePlayerStore } from "@/lib/player-store";
import { getProxiedImageURL } from "@/lib/utils";
import { InlineLoader } from "@/components/Loader";

export function DownloadPage() {
  const [url, setUrl] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundTracks, setFoundTracks] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const fetchQueue = async () => {
    if (window.go?.main?.App?.GetDownloadQueue) {
      const q = await window.go.main.App.GetDownloadQueue();
      setQueue(q || []);
    }
  };

  const fetchHistory = async () => {
    if (window.go?.main?.App?.GetDownloadHistory) {
      const h = await window.go.main.App.GetDownloadHistory();
      setHistory(h || []);
    }
  };

  const clearHistory = async () => {
    if (window.go?.main?.App?.ClearDownloadHistory) {
      await window.go.main.App.ClearDownloadHistory();
      fetchHistory();
      toast.success("Download history cleared");
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchHistory();
    const interval = setInterval(() => {
      fetchQueue();
      fetchHistory();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async () => {
    if (!url) return;
    setIsSearching(true);
    setFoundTracks([]);
    try {
      const dabLibraryMatch = url.match(/\/library\/([a-f0-9-]+)/);

      if (dabLibraryMatch) {
        const libraryId = dabLibraryMatch[1];
        const libraryDetails = await window.go.main.App.GetLibraryDetails(
          libraryId
        );
        if (libraryDetails && libraryDetails.tracks) {
          setFoundTracks(libraryDetails.tracks);
          toast.success(
            `Found ${libraryDetails.tracks.length} tracks from library`
          );
        } else {
          toast.error("No tracks found in this library");
        }
      } else {
        const results = await window.go.main.App.SearchDAB(url);
        setFoundTracks(results || []);
        if (results && results.length > 0) {
          toast.success(`Found ${results.length} tracks`);
        } else {
          toast.error("No tracks found");
        }
      }
    } catch (error) {
      toast.error(
        "Search failed: " + (error as any).message || "Unknown error"
      );
    } finally {
      setIsSearching(false);
    }
  };

  const downloadTrack = async (track: any) => {
    try {
      await window.go.main.App.DownloadTrack(track);
      toast.success(`Added to queue: ${track.title}`);
      fetchQueue();
    } catch (error) {
      toast.error(String((error as any)?.message || error));
    }
  };

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const exp = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );
    const value = bytes / Math.pow(1024, exp);
    const decimals = exp === 0 ? 0 : value >= 10 ? 1 : 2;
    return `${value.toFixed(decimals)} ${units[exp]}`;
  };

  const downloadAll = async () => {
    for (const track of foundTracks) {
      await downloadTrack(track);
    }
    toast.success("All tracks added to queue");
  };

  const { play } = usePlayerStore();

  const playLocalTrack = (item: any) => {
    if (item.filePath) {
      const streamUrl = `http://127.0.0.1:34116/stream?trackId=${
        item.trackId
      }&path=${encodeURIComponent(item.filePath)}`;
      play({
        id: item.trackId,
        title: item.title,
        artist: item.artist,
        cover: item.coverArt,
        duration: 0,
        url: streamUrl,
        albumTitle: item.albumTitle || "",
        releaseDate: item.releaseDate || "",
        genre: item.genre || "",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">DAB Downloader</h1>
        <p className="text-muted-foreground">
          Download tracks and libraries from DAB Music directly to your library.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Download</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter song name or DAB Library URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="bg-slate-900 text-white border-slate-700 placeholder:text-slate-400"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                "Searching..."
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>

          {isSearching && <InlineLoader message="Searching for tracks..." />}

          {!isSearching && foundTracks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Found {foundTracks.length} tracks
                </h3>
                {foundTracks.length > 1 && (
                  <Button size="sm" onClick={downloadAll}>
                    <Download className="mr-2 h-4 w-4" />
                    Download All
                  </Button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
                {foundTracks.map((track, i) => (
                  <div
                    key={track.id || i}
                    className="flex items-center justify-between p-2 hover:bg-accent rounded-md"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img
                        src={getProxiedImageURL(
                          track.albumCover ||
                            track.cover ||
                            "https://placehold.co/40x40"
                        )}
                        alt={track.title}
                        className="h-10 w-10 rounded object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">
                          {track.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {track.artist}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => downloadTrack(track)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Download Queue</h2>
          <Button variant="ghost" size="sm" onClick={fetchQueue}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4">
          {queue.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No active downloads
              </CardContent>
            </Card>
          )}
          {queue.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="relative">
                  <img
                    src={getProxiedImageURL(
                      item.coverArt || "https://placehold.co/100x100"
                    )}
                    alt={item.title}
                    className="h-12 w-12 rounded object-cover"
                  />
                  {item.status === "downloading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded">
                      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{item.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.artist}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress
                      value={item.totalSize > 0 ? item.progress : 0}
                      className="h-2"
                    />
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {item.totalSize > 0
                        ? `${Math.round(item.progress)}%`
                        : formatBytes(item.downloaded || 0)}
                    </span>
                  </div>
                </div>
                <div className="text-sm font-medium capitalize px-2 py-1 rounded bg-secondary">
                  {item.status}
                </div>
              </CardContent>
            </Card>
          ))}
          {queue.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              No downloads in queue
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Download History</h2>
          <Button
            variant="destructive"
            size="sm"
            onClick={clearHistory}
            disabled={history.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear History
          </Button>
        </div>

        <div className="grid gap-4">
          {history.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <img
                  src={getProxiedImageURL(
                    item.coverArt || "https://placehold.co/100x100"
                  )}
                  alt={item.title}
                  className="h-12 w-12 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{item.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.artist}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.filePath}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => playLocalTrack(item)}
                  title="Play downloaded file"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {history.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              No download history
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
