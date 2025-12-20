import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DABLogin } from "@/pages/Login";
import { SettingsPage } from "@/pages/Settings";
import { ConvertPage } from "@/pages/Convert";
import { Player } from "@/components/Player";
import { LibraryPage } from "@/pages/Library";
import { DownloadPage } from "@/pages/Download";
import { TakeMe2Page } from "@/pages/TakeMe2";
import { AlbumPage } from "@/pages/Album";
import { ProfilePage } from "@/pages/Profile";
import { Toaster } from "@/components/ui/sonner";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { FullPageLoader } from "@/components/Loader";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { useQueueStore } from "@/lib/queue-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    go: {
      main: {
        App: {
          SpotifyLogin: () => Promise<string>;
          GetSpotifyPlaylist: (url: string) => Promise<any>;
          SaveConfig: (id: string, secret: string) => Promise<void>;
          SaveGeneralSettings: (
            fuzzyScale: number,
            maxConcurrency: number,
            maxCacheSize: number
          ) => Promise<void>;
          GetConfig: () => Promise<any>;
          DABLogin: (email: string, pass: string) => Promise<string>;
          CreateDABLibrary: (
            name: string,
            desc: string,
            tracks: any[]
          ) => Promise<any>;
          AddToLibrary: (libraryID: string, track: any) => Promise<void>;
          RecordTransfer: (record: any) => Promise<void>;
          GetTransferHistory: () => Promise<any[]>;
          ClearTransferHistory: () => Promise<void>;
          DeleteTransferRecord: (id: string) => Promise<void>;
          CheckDABSession: () => Promise<boolean>;
          CheckSpotifySession: () => Promise<boolean>;
          Logout: () => Promise<void>;
          DownloadTrack: (track: any) => Promise<string>;
          GetDownloadQueue: () => Promise<any[]>;
          SearchDAB: (query: string) => Promise<any[]>;
          GetStreamURL: (trackID: string) => Promise<string>;
          GetFavorites: () => Promise<any[]>;
          AddToFavorites: (track: any) => Promise<void>;
          RemoveFromFavorites: (trackID: string) => Promise<void>;
          RemoveFromLibrary: (
            libraryID: string,
            trackID: string
          ) => Promise<void>;
          GetLibraries: () => Promise<any[]>;
          RefreshLibraries: () => Promise<any[]>;
          GetLibraryDetails: (id: string) => Promise<any>;
          GetDownloadHistory: () => Promise<any[]>;
          ClearDownloadHistory: () => Promise<void>;
          GetTotalCacheSize: () => Promise<string>;
          ClearAllCache: () => Promise<void>;
          OpenBrowser: (url: string) => Promise<void>;
          OpenMusicFolder: () => Promise<void>;
          OpenConfigFolder: () => Promise<void>;
          GetLyrics: (artist: string, title: string) => Promise<any>;
          GetAlbumByID: (albumId: string) => Promise<any>;
          GetQueue: () => Promise<any[]>;
          SaveQueue: (queue: any[]) => Promise<void>;
          ClearQueue: () => Promise<void>;
          UpdateLibrary: (
            libraryID: string,
            name: string,
            description: string,
            isPublic: boolean
          ) => Promise<void>;
          DeleteLibrary: (libraryID: string) => Promise<void>;
          GetCurrentUser: () => Promise<any>;
          GetAppVersion: () => Promise<string>;
        };
      };
    };
  }
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [viewState, setViewState] = useState<{
    page: string;
    params: Record<string, string>;
  }>({ page: "", params: {} });

  const { loadQueue } = useQueueStore();

  const navigateTo = (page: string, params: Record<string, string> = {}) => {
    setViewState({ page, params });
  };

  const goBack = () => {
    setViewState({ page: "", params: {} });
  };

  const loadHistory = () => {
    if (window.go?.main?.App?.GetTransferHistory) {
      window.go.main.App.GetTransferHistory().then((records) => {
        setHistory(records || []);
      });
    }
  };

  useEffect(() => {
    if (window.go?.main?.App?.CheckDABSession) {
      window.go.main.App.CheckDABSession().then((isValid) => {
        setIsLoggedIn(isValid);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    if (window.go?.main?.App?.CheckSpotifySession) {
      window.go.main.App.CheckSpotifySession().then(() => {});
    }
    loadQueue();

    loadHistory();
  }, [isLoggedIn]);

  const handleClearHistory = () => {
    setShowClearHistoryDialog(true);
  };

  const confirmClearHistory = async () => {
    try {
      await window.go.main.App.ClearTransferHistory();
      setHistory([]);
      toast.success("History cleared successfully");
    } catch (e) {
      toast.error("Failed to clear history");
    } finally {
      setShowClearHistoryDialog(false);
    }
  };

  if (loading) {
    return <FullPageLoader message="Initializing 0xDABmusic..." />;
  }

  if (!isLoggedIn) {
    return (
      <>
        <DABLogin onLoginSuccess={() => setIsLoggedIn(true)} />
        <Toaster />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        {viewState.page === "album" ? (
          <AlbumPage albumId={viewState.params.albumId} onBack={goBack} />
        ) : (
          <div className="container mx-auto p-8">
            <div className={activeTab === "dashboard" ? "block" : "hidden"}>
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                      Dashboard
                    </h2>
                    <p className="text-muted-foreground">
                      Welcome to 0xDABmusic Desktop.
                    </p>
                  </div>
                  {history.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                    >
                      Clear History
                    </button>
                  )}
                </div>

                {history.length > 0 ? (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-slate-800 bg-slate-900">
                          <tr>
                            <th className="px-6 py-3 text-left font-medium">
                              Playlist
                            </th>
                            <th className="px-6 py-3 text-left font-medium">
                              Source
                            </th>
                            <th className="px-6 py-3 text-left font-medium">
                              Tracks
                            </th>
                            <th className="px-6 py-3 text-left font-medium">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left font-medium">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left font-medium">
                              Duration
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...history].reverse().map((record: any) => (
                            <tr
                              key={record.id}
                              className="border-b border-slate-800 hover:bg-slate-900"
                            >
                              <td className="px-6 py-3 truncate max-w-xs">
                                {record.playlistName}
                              </td>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                  <a
                                    href={record.sourceURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline"
                                  >
                                    {record.source || "Link"}
                                  </a>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        record.sourceURL
                                      );
                                      toast.success("Link copied to clipboard");
                                    }}
                                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                                    title="Copy Link"
                                  >
                                    <Copy size={14} />
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-3">
                                <span className="text-green-400">
                                  {record.addedTracks}
                                </span>
                                <span className="text-slate-500">
                                  /{record.totalTracks}
                                </span>
                              </td>
                              <td className="px-6 py-3">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    record.status === "completed"
                                      ? "bg-green-500/20 text-green-400"
                                      : record.status === "failed"
                                      ? "bg-red-500/20 text-red-400"
                                      : "bg-yellow-500/20 text-yellow-400"
                                  }`}
                                >
                                  {record.status}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-slate-400">
                                {new Date(
                                  record.createdAt
                                ).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-3 text-slate-400">
                                {record.duration}s
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center">
                    <p className="text-muted-foreground">
                      No transfer history yet. Start by converting a playlist!
                    </p>
                  </div>
                )}

                <div className="text-xs text-slate-600 pt-4 border-t border-slate-900">
                  History stored in:{" "}
                  <code className="bg-slate-900 px-1 py-0.5 rounded">
                    ~/.0xdabmusic/transfer_history.json
                  </code>
                </div>
              </div>
            </div>

            <div className={activeTab === "convert" ? "block" : "hidden"}>
              <ConvertPage onTransferComplete={loadHistory} />
            </div>

            <div
              className={`h-full ${
                activeTab === "library" ? "block" : "hidden"
              }`}
            >
              <LibraryPage navigateTo={navigateTo} />
            </div>

            <div className={activeTab === "download" ? "block" : "hidden"}>
              <DownloadPage />
            </div>

            <div className={activeTab === "settings" ? "block" : "hidden"}>
              <SettingsPage />
            </div>

            <div className={activeTab === "takeme2" ? "block" : "hidden"}>
              <TakeMe2Page />
            </div>

            <div className={activeTab === "profile" ? "block" : "hidden"}>
              <ProfilePage />
            </div>
          </div>
        )}
      </main>

      <Player />

      <Dialog
        open={showClearHistoryDialog}
        onOpenChange={setShowClearHistoryDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear History</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all transfer history? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearHistoryDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmClearHistory}>
              Clear History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
      <ProcessingStatus />
    </div>
  );
}

export default App;
