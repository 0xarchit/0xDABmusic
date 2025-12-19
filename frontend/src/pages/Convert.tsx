import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EventsOn } from "../../wailsjs/runtime/runtime";
import { InlineLoader } from "@/components/Loader";

export function ConvertPage({
  onTransferComplete,
}: {
  onTransferComplete?: () => void;
}) {
  const [url, setUrl] = useState(
    () => localStorage.getItem("convert_url") || ""
  );
  const [mode, setMode] = useState("lenient");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tracks, setTracks] = useState<any[]>(() => {
    const saved = localStorage.getItem("convert_tracks");
    return saved ? JSON.parse(saved) : [];
  });
  const tracksRef = useRef<any[]>(tracks);
  const [playlistName, setPlaylistName] = useState(
    () => localStorage.getItem("convert_playlistName") || ""
  );
  const [logs, setLogs] = useState<string[]>(() => {
    const saved = localStorage.getItem("convert_logs");
    return saved ? JSON.parse(saved) : [];
  });
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [lastTransferStats, setLastTransferStats] = useState<any>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    localStorage.setItem("convert_url", url);
  }, [url]);

  useEffect(() => {
    localStorage.setItem("convert_tracks", JSON.stringify(tracks));
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    localStorage.setItem("convert_playlistName", playlistName);
  }, [playlistName]);

  useEffect(() => {
    localStorage.setItem("convert_logs", JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    const cancelLog = EventsOn("conversion-log", (msg: string) => {
      setLogs((prev) => [...prev, msg]);
    });

    const cancelStatus = EventsOn("track-status", (data: any) => {
      setTracks((prev) => {
        const newTracks = [...prev];
        if (newTracks[data.index]) {
          newTracks[data.index] = {
            ...newTracks[data.index],
            status: data.status,
            error: data.error,
          };
        }
        return newTracks;
      });
    });

    return () => {
      cancelLog();
      cancelStatus();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleFetch = async () => {
    if (!url) return;

    setTracks([]);
    setLogs([]);
    setLoading(true);
    setProgress(10);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLogs((prev) => [...prev, `Starting fetch for: ${url}`]);

    try {
      if (window.go?.main?.App?.GetSpotifyPlaylist) {
        const playlist = await window.go.main.App.GetSpotifyPlaylist(url);

        if (controller.signal.aborted) {
          setLogs((prev) => [...prev, "Fetch aborted by user."]);
          return;
        }

        setTracks(
          playlist.tracks.map((t: any) => ({ ...t, status: "pending" }))
        );
        setPlaylistName(playlist.name);
        setProgress(100);
        toast.success(`Fetched ${playlist.tracks.length} tracks`);
        setLogs((prev) => [
          ...prev,
          `Successfully fetched ${playlist.tracks.length} tracks from "${playlist.name}"`,
        ]);
      }
    } catch (e: any) {
      if (controller.signal.aborted) {
        return;
      }
      toast.error("Fetch failed: " + e);
      setLogs((prev) => [...prev, `Error: ${e}`]);
      setProgress(0);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleCreateLibrary = async () => {
    if (tracks.length === 0) return;
    setCreating(true);
    setLogs([]);

    const startTime = Date.now();
    let matchedCount = 0;
    let addedCount = 0;
    let failedCount = 0;

    try {
      if (window.go?.main?.App?.CreateDABLibrary) {
        const stats = await window.go.main.App.CreateDABLibrary(
          playlistName || "Imported Playlist",
          "Imported via 0xDABmusic Desktop",
          tracks
        );

        matchedCount = stats.matched;
        addedCount = stats.added;
        failedCount = stats.failed;

        const transferRecord = {
          playlistName: playlistName || "Imported Playlist",
          sourceURL: url,
          totalTracks: stats.total,
          matchedTracks: matchedCount,
          addedTracks: addedCount,
          failedTracks: failedCount,
          status: "completed",
          createdAt: new Date(),
          completedAt: new Date(),
          libraryID: "",
          duration: Math.floor((Date.now() - startTime) / 1000),
          source: url.includes("youtube") ? "YouTube" : "Spotify",
        };

        setLastTransferStats(transferRecord);

        if (window.go?.main?.App?.RecordTransfer) {
          await window.go.main.App.RecordTransfer(transferRecord);
        }

        toast.success("Conversion process completed.");
        setShowCompleteDialog(true);
        if (onTransferComplete) {
          onTransferComplete();
        }
      }
    } catch (e: any) {
      toast.error("Failed to create library: " + e);
    } finally {
      setCreating(false);
    }
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setUrl("");
    setTracks([]);
    setPlaylistName("");
    setLogs([]);
    setProgress(0);
    setLoading(false);
    localStorage.removeItem("convert_url");
    localStorage.removeItem("convert_tracks");
    localStorage.removeItem("convert_playlistName");
    localStorage.removeItem("convert_logs");
  };

  const getStatusBadge = (status: string, error?: string) => {
    switch (status) {
      case "searching":
        return <Badge variant="secondary">Searching...</Badge>;
      case "found":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Found</Badge>;
      case "not-found":
        return <Badge variant="destructive">Not Found</Badge>;
      case "adding":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">Adding...</Badge>
        );
      case "added":
        return <Badge className="bg-green-500 hover:bg-green-600">Added</Badge>;
      case "error":
        return (
          <Badge variant="destructive" title={error}>
            Error
          </Badge>
        );
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Convert</h3>
        <p className="text-sm text-muted-foreground">
          Convert Spotify or YouTube links to DAB libraries.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source</CardTitle>
          <CardDescription>
            Enter a Spotify Playlist/Album URL or YouTube Link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://open.spotify.com/playlist/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-slate-900 border-slate-800 text-white placeholder:text-slate-400"
            />
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strict">Strict Match</SelectItem>
                <SelectItem value="lenient">Lenient Match</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleFetch} disabled={loading}>
              {loading ? "Fetching..." : "Fetch Tracks"}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={creating}>
              {loading ? "Cancel" : "Reset"}
            </Button>
          </div>
          {loading && (
            <>
              <Progress value={progress} className="w-full" />
              <InlineLoader message="Processing playlist/link..." />
            </>
          )}
        </CardContent>
      </Card>

      {!loading && tracks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Tracks</CardTitle>
            <CardDescription>
              Review tracks before creating library.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-75 overflow-y-auto mb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tracks.map((track, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {track.title}
                      </TableCell>
                      <TableCell>{track.artist}</TableCell>
                      <TableCell>
                        {Math.floor(track.duration_ms / 1000)}s
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(track.status, track.error)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {logs.length > 0 && (
              <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-xs h-50 overflow-y-auto mb-4 border border-slate-800">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className="whitespace-pre-wrap border-b border-slate-900/50 pb-1 mb-1 last:border-0"
                  >
                    {log}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleCreateLibrary} disabled={creating}>
                {creating ? "Creating..." : "Create Library on DAB"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conversion Complete</DialogTitle>
            <DialogDescription>
              The library has been successfully created on DAB.
            </DialogDescription>
          </DialogHeader>

          {lastTransferStats && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="flex flex-col space-y-1.5 p-4 border rounded-lg bg-slate-950/50">
                <span className="text-xs text-muted-foreground uppercase font-bold">
                  Total Tracks
                </span>
                <span className="text-2xl font-bold">
                  {lastTransferStats.totalTracks}
                </span>
              </div>
              <div className="flex flex-col space-y-1.5 p-4 border rounded-lg bg-slate-950/50">
                <span className="text-xs text-muted-foreground uppercase font-bold">
                  Duration
                </span>
                <span className="text-2xl font-bold">
                  {lastTransferStats.duration}s
                </span>
              </div>
              <div className="flex flex-col space-y-1.5 p-4 border rounded-lg bg-green-950/20 border-green-900/50">
                <span className="text-xs text-green-500 uppercase font-bold">
                  Added
                </span>
                <span className="text-2xl font-bold text-green-400">
                  {lastTransferStats.addedTracks}
                </span>
              </div>
              <div className="flex flex-col space-y-1.5 p-4 border rounded-lg bg-red-950/20 border-red-900/50">
                <span className="text-xs text-red-500 uppercase font-bold">
                  Failed
                </span>
                <span className="text-2xl font-bold text-red-400">
                  {lastTransferStats.failedTracks}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => {
                setShowCompleteDialog(false);
                handleReset();
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
