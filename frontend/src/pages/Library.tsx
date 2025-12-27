import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Play,
  Plus,
  Download,
  Heart,
  Library as LibraryIcon,
  RefreshCw,
  ArrowLeft,
  Shuffle,
  Clock,
  MoreHorizontal,
  Trash2,
  Settings as SettingsIcon,
  Copy,
} from "lucide-react";
import { usePlayerStore } from "@/lib/player-store";
import { useFavoriteStore } from "@/lib/favorite-store";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, getProxiedImageURL } from "@/lib/utils";
import { InlineLoader } from "@/components/Loader";
import { useProcessStore } from "@/lib/process-store";

interface LibraryPageProps {
  navigateTo?: (page: string, params: Record<string, string>) => void;
}

export function LibraryPage({ navigateTo }: LibraryPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [libraries, setLibraries] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<any | null>(null);
  const [libraryTracks, setLibraryTracks] = useState<any[]>([]);
  const { play, setQueue, currentTrack } = usePlayerStore();
  const {
    favorites,
    fetchFavorites,
    toggleFavorite: storeFavorite,
    isFavorite,
  } = useFavoriteStore();
  const { addProcess, removeProcess } = useProcessStore();

  const [isAddToLibraryOpen, setIsAddToLibraryOpen] = useState(false);
  const [trackToAdd, setTrackToAdd] = useState<any | null>(null);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("new");
  const [isEditLibraryOpen, setIsEditLibraryOpen] = useState(false);
  const [editLibraryName, setEditLibraryName] = useState("");
  const [editLibraryDesc, setEditLibraryDesc] = useState("");
  const [editLibraryPublic, setEditLibraryPublic] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const getErrorMessage = (error: any) => {
    if (!error) return "Unknown error";
    if (typeof error === "string") return error;
    return String(error?.message || error);
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    const processId = `search-${Date.now()}`;
    addProcess(processId, `Searching "${searchQuery}"`);
    try {
      const results = await window.go.main.App.SearchDAB(searchQuery);
      setSearchResults(results || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSearching(false);
      removeProcess(processId);
    }
  };

  const fetchLibraries = async () => {
    try {
      const libs = await window.go.main.App.GetLibraries();
      setLibraries(libs || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const refreshAll = async () => {
    const processId = `refresh-${Date.now()}`;
    if (selectedLibrary) {
      addProcess(processId, `Refreshing "${selectedLibrary.name}"`);
      try {
        const details = await window.go.main.App.GetLibraryDetails(
          selectedLibrary.id
        );
        setSelectedLibrary(details);
        setLibraryTracks(details.tracks || []);
        toast.success("Library refreshed");
      } catch (error) {
        const msg = getErrorMessage(error);
        toast.error(msg);
        if (
          msg.includes("401") ||
          msg.includes("403") ||
          msg.includes("session")
        ) {
          if (window.go?.main?.App?.Logout) {
            try {
              await window.go.main.App.Logout();
            } finally {
              window.location.reload();
            }
          }
        }
      } finally {
        removeProcess(processId);
      }
    } else {
      addProcess(processId, "Refreshing Libraries");
      try {
        await fetchFavorites();
        if (window.go?.main?.App?.RefreshLibraries) {
          const libs = await window.go.main.App.RefreshLibraries();
          setLibraries(libs || []);
        } else {
          await fetchLibraries();
        }
        toast.success("Refreshed");
      } catch (error) {
        const msg = getErrorMessage(error);
        toast.error(msg);
        if (
          msg.includes("401") ||
          msg.includes("403") ||
          msg.includes("session")
        ) {
          if (window.go?.main?.App?.Logout) {
            try {
              await window.go.main.App.Logout();
            } finally {
              window.location.reload();
            }
          }
        }
      } finally {
        removeProcess(processId);
      }
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handlePlay = async (track: any) => {
    try {
      const url = await window.go.main.App.GetStreamURL(track.id);

      let contextTracks: any[] = [];
      if (selectedLibrary) {
        contextTracks = libraryTracks;
      } else if (searchResults.length > 0) {
        contextTracks = searchResults;
      } else if (favorites.length > 0) {
        contextTracks = favorites;
      }

      if (contextTracks.length > 0) {
        const queueTracks = contextTracks.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          cover: t.albumCover,
          url: "",
          duration: typeof t.duration === "number" ? t.duration : 0,
          albumTitle: t.albumTitle || "",
          releaseDate: t.releaseDate || "",
          genre: t.genre || "",
        }));
        setQueue(queueTracks);
      }

      play({
        id: track.id,
        title: track.title,
        artist: track.artist,
        cover: track.albumCover,
        url: url,
        duration: typeof track.duration === "number" ? track.duration : 0,
        albumTitle: track.albumTitle || "",
        releaseDate: track.releaseDate || "",
        genre: track.genre || "",
      });
    } catch (error) {
      toast.error("Failed to play track");
    }
  };

  const handlePlayAll = async (tracks: any[], shuffle: boolean = false) => {
    if (tracks.length === 0) return;
    let queue = [...tracks];
    if (shuffle) {
      queue = queue.sort(() => Math.random() - 0.5);
    }

    const queueTracks = queue.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      cover: t.albumCover,
      url: "",
      duration: typeof t.duration === "number" ? t.duration : 0,
      albumTitle: t.albumTitle || "",
      releaseDate: t.releaseDate || "",
      genre: t.genre || "",
    }));
    setQueue(queueTracks);

    const firstTrack = queue[0];
    try {
      const url = await window.go.main.App.GetStreamURL(firstTrack.id);
      play({
        id: firstTrack.id,
        title: firstTrack.title,
        artist: firstTrack.artist,
        cover: firstTrack.albumCover,
        url: url,
        duration:
          typeof firstTrack.duration === "number" ? firstTrack.duration : 0,
        albumTitle: firstTrack.albumTitle || "",
        releaseDate: firstTrack.releaseDate || "",
        genre: firstTrack.genre || "",
      });
    } catch (error) {
      toast.error("Failed to play track");
    }
  };

  const handleDownload = async (track: any) => {
    try {
      await window.go.main.App.DownloadTrack(track);
      toast.success("Added to download queue");
    } catch (error) {
      toast.error("Failed to download");
    }
  };

  const toggleFavorite = async (track: any) => {
    await storeFavorite(track);
  };

  const openAddToLibrary = (track: any) => {
    setTrackToAdd(track);
    setIsAddToLibraryOpen(true);
    setNewLibraryName("");
    setSelectedLibraryId("new");
  };

  const handleAddToLibrary = async () => {
    if (!trackToAdd) return;
    try {
      if (selectedLibraryId === "new") {
        if (!newLibraryName) {
          toast.error("Please enter a library name");
          return;
        }
        const trackInfo = {
          title: trackToAdd.title,
          artist: trackToAdd.artist,
          isrc: "",
          duration_ms:
            typeof trackToAdd.duration === "number"
              ? Math.floor(trackToAdd.duration * 1000)
              : 0,
          spotify_id: "",
          source_id: String(trackToAdd.id),
        };
        await window.go.main.App.CreateDABLibrary(
          newLibraryName,
          "Created from Desktop App",
          [trackInfo]
        );
        toast.success("Library created and track added");
      } else {
        if (!selectedLibraryId) {
          toast.error("Please select a library");
          return;
        }

        const trackInfo = {
          title: trackToAdd.title,
          artist: trackToAdd.artist,
          isrc: "",
          duration_ms:
            typeof trackToAdd.duration === "number"
              ? Math.floor(trackToAdd.duration * 1000)
              : 0,
          spotify_id: "",
          source_id: String(trackToAdd.id),
          album_title: trackToAdd.albumTitle || "",
          album_cover: trackToAdd.albumCover || "",
          release_date: trackToAdd.releaseDate || "",
          genre: trackToAdd.genre || "",
        };

        await window.go.main.App.AddToLibrary(selectedLibraryId, trackInfo);
        toast.success("Added to library");

        if (selectedLibrary && selectedLibrary.id === selectedLibraryId) {
          const details = await window.go.main.App.GetLibraryDetails(
            selectedLibraryId
          );
          setSelectedLibrary(details);
          setLibraryTracks(details.tracks || []);
        }
      }
      setIsAddToLibraryOpen(false);
      fetchLibraries();
    } catch (error: any) {
      const errorMsg =
        typeof error === "string" ? error : error.message || "Unknown error";
      if (errorMsg.includes("track already exists")) {
        toast.error("Track already exists in this library");
      } else {
        toast.error(`Failed to add to library: ${errorMsg}`);
      }
    }
  };

  const handleRemoveFromLibrary = async (track: any) => {
    if (!selectedLibrary) return;
    try {
      await window.go.main.App.RemoveFromLibrary(
        selectedLibrary.id,
        String(track.id)
      );
      toast.success("Removed from library");

      const details = await window.go.main.App.GetLibraryDetails(
        selectedLibrary.id
      );
      setSelectedLibrary(details);
      setLibraryTracks(details.tracks || []);
    } catch (error) {
      toast.error("Failed to remove from library");
    }
  };

  const openLibrary = async (lib: any) => {
    const processId = `open-lib-${lib.id}`;
    addProcess(processId, `Opening "${lib.name}"`);
    try {
      const details = await window.go.main.App.GetLibraryDetails(lib.id);
      setSelectedLibrary(details);
      setLibraryTracks(details.tracks || []);
    } catch (error) {
      toast.error("Failed to load library details");
    } finally {
      removeProcess(processId);
    }
  };

  const openEditLibrary = () => {
    if (selectedLibrary) {
      console.log("[Library] Opening edit dialog for:", selectedLibrary);
      setEditLibraryName(selectedLibrary.name);
      setEditLibraryDesc(selectedLibrary.description || "");
      setEditLibraryPublic(selectedLibrary.isPublic || false);
      console.log("[Library] Edit dialog state set:", {
        name: selectedLibrary.name,
        description: selectedLibrary.description,
        isPublic: selectedLibrary.isPublic,
      });
      setIsEditLibraryOpen(true);
    }
  };
  const handleDeleteLibrary = async () => {
    if (!selectedLibrary) return;
    try {
      await window.go.main.App.DeleteLibrary(selectedLibrary.id);
      toast.success("Library deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedLibrary(null);
      setLibraryTracks([]);
      await fetchLibraries();
    } catch (error) {
      console.error("[Library] Failed to delete library:", error);
      toast.error("Failed to delete library");
    }
  };
  const handleUpdateLibrary = async () => {
    if (!selectedLibrary) return;
    console.log("[Library] Updating library:", {
      id: selectedLibrary.id,
      name: editLibraryName,
      description: editLibraryDesc,
      isPublic: editLibraryPublic,
    });
    try {
      await window.go.main.App.UpdateLibrary(
        selectedLibrary.id,
        editLibraryName,
        editLibraryDesc,
        editLibraryPublic
      );
      console.log("[Library] Update successful, updating local state...");

      const updatedLibrary = {
        ...selectedLibrary,
        name: editLibraryName,
        description: editLibraryDesc,
        isPublic: editLibraryPublic,
      };
      console.log("[Library] Updated library state:", updatedLibrary);
      setSelectedLibrary(updatedLibrary);

      toast.success("Library updated");
      setIsEditLibraryOpen(false);
      await fetchLibraries();
    } catch (error) {
      console.error("[Library] Failed to update library:", error);
      toast.error("Failed to update library");
    }
  };

  const formatDuration = (seconds: any) => {
    if (!seconds || isNaN(seconds)) return "-:--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const TrackTable = ({
    tracks,
    showCover = true,
  }: {
    tracks: any[];
    showCover?: boolean;
  }) => {
    return (
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-white/10">
            <TableHead className="w-12">#</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="hidden md:table-cell">Album</TableHead>
            <TableHead className="hidden lg:table-cell">Date</TableHead>
            <TableHead className="w-12 text-right">
              <Clock className="h-4 w-4 ml-auto" />
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tracks.map((track, index) => {
            const isFav = favorites.some(
              (f) => String(f.id) === String(track.id)
            );
            const isPlaying = currentTrack?.id === track.id;
            return (
              <TableRow
                key={track.id}
                className={cn(
                  "group hover:bg-white/5 border-0 transition-colors",
                  isPlaying && "bg-white/5"
                )}
              >
                <TableCell className="font-medium text-muted-foreground group-hover:text-white">
                  {isPlaying ? (
                    <div className="h-4 w-4 flex items-center justify-center">
                      <div className="w-1 h-3 bg-green-500 animate-pulse mx-px" />
                      <div className="w-1 h-4 bg-green-500 animate-pulse delay-75 mx-px" />
                      <div className="w-1 h-2 bg-green-500 animate-pulse delay-150 mx-px" />
                    </div>
                  ) : (
                    <>
                      <span className="group-hover:hidden">{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hidden group-hover:flex -ml-2 text-white"
                        onClick={() => handlePlay(track)}
                      >
                        <Play className="h-4 w-4 fill-current" />
                      </Button>
                    </>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {showCover && (
                      <img
                        src={getProxiedImageURL(track.albumCover)}
                        alt={track.title}
                        className="h-10 w-10 rounded object-cover"
                      />
                    )}
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "font-medium truncate max-w-50 md:max-w-75",
                          isPlaying ? "text-green-500" : "text-white"
                        )}
                      >
                        {track.title}
                      </span>
                      <span className="text-sm text-muted-foreground truncate max-w-50 md:max-w-75 text-left">
                        {track.artist}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground group-hover:text-white/80 truncate max-w-50">
                  {track.albumId ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (navigateTo) {
                          navigateTo("album", { albumId: track.albumId });
                        }
                      }}
                      className="hover:text-primary hover:underline text-left"
                      title="View album"
                    >
                      {track.albumTitle}
                    </button>
                  ) : (
                    track.albumTitle
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground group-hover:text-white/80">
                  {track.releaseDate}
                </TableCell>
                <TableCell className="text-right text-muted-foreground group-hover:text-white/80 font-variant-numeric tabular-nums">
                  {formatDuration(track.duration)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${
                        isFav
                          ? "text-green-500"
                          : "text-muted-foreground hover:text-white"
                      }`}
                      onClick={() => toggleFavorite(track)}
                    >
                      <Heart
                        className={`h-4 w-4 ${isFav ? "fill-current" : ""}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-white"
                      onClick={() => openAddToLibrary(track)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-white"
                      onClick={() => handleDownload(track)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {selectedLibrary && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={() => handleRemoveFromLibrary(track)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6 p-6 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 w-full max-w-md">
          {selectedLibrary || searchResults.length > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedLibrary(null);
                setSearchResults([]);
                setSearchQuery("");
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : null}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="What do you want to listen to?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 bg-white/10 border-transparent rounded-full focus-visible:ring-offset-0 focus-visible:bg-white/20 transition-colors"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={refreshAll}>
            <RefreshCw
              className={`h-5 w-5 ${isSearching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-6 px-6">
        {selectedLibrary ? (
          <div className="space-y-6">
            <div className="flex items-end gap-6 pb-6 border-b border-white/10">
              <div className="h-52 w-52 bg-linear-to-br from-indigo-500 to-purple-600 shadow-2xl flex items-center justify-center rounded-lg">
                <LibraryIcon className="h-24 w-24 text-white/20" />
              </div>
              <div className="flex-1 flex flex-col gap-4">
                <span className="text-sm font-medium uppercase tracking-wider">
                  Playlist
                </span>
                <h1 className="text-5xl font-bold md:text-7xl">
                  {selectedLibrary.name}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-white font-medium">0xDABmusic</span>
                  <span>•</span>
                  <span>{libraryTracks.length} songs</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 py-4">
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-lg hover:scale-105 transition-transform"
                onClick={() => handlePlayAll(libraryTracks)}
              >
                <Play className="h-6 w-6 fill-current ml-1" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-white"
                onClick={() => handlePlayAll(libraryTracks, true)}
              >
                <Shuffle className="h-6 w-6" />
              </Button>
              {selectedLibrary.isPublic && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-white"
                  onClick={async () => {
                    try {
                      let shareBase = "https://dabmusic.xyz";
                      if (window.go?.main?.App?.GetConfig) {
                        const cfg = await window.go.main.App.GetConfig();
                        const apiBase = String(cfg?.DAB_API_BASE || "").replace(
                          /\/+$/,
                          ""
                        );
                        if (apiBase) {
                          shareBase = apiBase.endsWith("/api")
                            ? apiBase.slice(0, -4)
                            : apiBase;
                        }
                      }
                      await navigator.clipboard.writeText(
                        `${shareBase}/shared/library/${selectedLibrary.id}`
                      );
                      toast.success("Library link copied to clipboard");
                    } catch (e: any) {
                      toast.error(
                        String(e?.message || e || "Failed to copy link")
                      );
                    }
                  }}
                >
                  <Copy className="h-6 w-6" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-white"
                onClick={openEditLibrary}
              >
                <SettingsIcon className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-red-500"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-6 w-6" />
              </Button>
            </div>

            <TrackTable tracks={libraryTracks} />
          </div>
        ) : isSearching ? (
          <InlineLoader message="Searching DAB music library..." />
        ) : searchResults.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Search Results</h2>
            <TrackTable tracks={searchResults} />
          </div>
        ) : (
          <Tabs defaultValue="favorites" className="w-full">
            <TabsList className="bg-transparent p-0 h-auto border-b border-white/10 w-full justify-start rounded-none">
              <TabsTrigger
                value="favorites"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-3"
              >
                Favorites
              </TabsTrigger>
              <TabsTrigger
                value="libraries"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-3"
              >
                Your Libraries
              </TabsTrigger>
            </TabsList>
            <TabsContent value="favorites" className="mt-6">
              <TrackTable tracks={favorites} />
            </TabsContent>
            <TabsContent value="libraries" className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {libraries.map((lib) => (
                  <div
                    key={lib.id}
                    className="group relative bg-white/5 hover:bg-white/10 p-4 rounded-md transition-all cursor-pointer"
                    onClick={() => openLibrary(lib)}
                  >
                    <div className="aspect-square bg-linear-to-br from-gray-800 to-gray-900 rounded-md mb-4 shadow-lg flex items-center justify-center group-hover:shadow-xl transition-shadow">
                      <LibraryIcon className="h-12 w-12 text-white/20" />
                    </div>
                    <h3 className="font-bold truncate">{lib.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      By 0xDABmusic
                    </p>
                    <div className="absolute right-4 bottom-24 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl">
                      <Button
                        size="icon"
                        className="h-12 w-12 rounded-full bg-green-500 hover:bg-green-400 text-black"
                      >
                        <Play className="h-6 w-6 fill-current ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </ScrollArea>

      <Dialog open={isAddToLibraryOpen} onOpenChange={setIsAddToLibraryOpen}>
        <DialogContent className="sm:max-w-106.25 bg-[#1e1e1e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Add to Library</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="library-select">Choose Library</Label>
              <Select
                value={selectedLibraryId}
                onValueChange={setSelectedLibraryId}
              >
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Select a library" />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e1e] border-white/10 text-white">
                  <SelectItem value="new">+ Create New Library</SelectItem>
                  {libraries.map((lib) => (
                    <SelectItem key={lib.id} value={lib.id}>
                      {lib.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedLibraryId === "new" && (
              <div className="grid gap-2">
                <Label htmlFor="new-name">Library Name</Label>
                <Input
                  id="new-name"
                  value={newLibraryName}
                  onChange={(e) => setNewLibraryName(e.target.value)}
                  className="bg-white/5 border-white/10"
                  placeholder="My Awesome Playlist"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddToLibraryOpen(false)}
              className="border-white/10 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddToLibrary}
              className="bg-green-500 hover:bg-green-400 text-black"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditLibraryOpen} onOpenChange={setIsEditLibraryOpen}>
        <DialogContent className="sm:max-w-106.25 bg-[#1e1e1e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Edit Library</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Library Name</Label>
              <Input
                id="edit-name"
                value={editLibraryName}
                onChange={(e) => setEditLibraryName(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={editLibraryDesc}
                onChange={(e) => setEditLibraryDesc(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                placeholder="shared"
                type="checkbox"
                id="edit-public"
                checked={editLibraryPublic}
                onChange={(e) => setEditLibraryPublic(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-white/5"
              />
              <Label htmlFor="edit-public" className="text-sm">
                Make library public
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditLibraryOpen(false)}
              className="border-white/10 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateLibrary}
              className="bg-green-500 hover:bg-green-400 text-black"
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Library</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedLibrary?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLibrary}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
