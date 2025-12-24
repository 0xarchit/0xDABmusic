import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "@/lib/player-store";
import { useFavoriteStore } from "@/lib/favorite-store";
import { useQueueStore } from "@/lib/queue-store";
import { useRecentlyPlayedStore } from "@/lib/recently-played-store";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize2,
  ChevronDown,
  Shuffle,
  Repeat,
  Heart,
  ListMusic,
  Download,
  X,
  GripVertical,
  FileText,
} from "lucide-react";
import { cn, getProxiedImageURL } from "@/lib/utils";
import { toast } from "sonner";
import { LyricsDisplay } from "@/components/LyricsDisplay";

export function Player() {
  const {
    currentTrack,
    isPlaying,
    volume,
    pause,
    resume,
    stop,
    next,
    prev,
    setVolume,
    queue,
    play,
    isShuffle,
    repeatMode,
    toggleShuffle,
    toggleRepeat,
    removeFromQueue,
    reorderQueue,
  } = usePlayerStore();

  const {
    favorites,
    toggleFavorite: storeFavorite,
    fetchFavorites,
  } = useFavoriteStore();

  const { syncQueue } = useQueueStore();
  const { addTrack: addToRecentlyPlayed } = useRecentlyPlayedStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const nextAudioRef = useRef<HTMLAudioElement>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [nextTrackUrl, setNextTrackUrl] = useState<string>("");
  const crossfadeIntervalRef = useRef<number | null>(null);
  const hasStartedCrossfadeRef = useRef(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isFavorite = currentTrack
    ? favorites.some((f) => String(f.id) === String(currentTrack.id))
    : false;

  const toggleFavorite = async () => {
    if (!currentTrack) return;
    await storeFavorite(currentTrack);
  };

  const handleDownload = async () => {
    if (!currentTrack) return;
    try {
      const trackToDownload = {
        id: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        albumCover: currentTrack.cover,
        duration: currentTrack.duration,
      };
      await window.go.main.App.DownloadTrack(trackToDownload);
      toast.success("Added to download queue");
    } catch (error) {
      toast.error("Failed to download track");
    }
  };

  useEffect(() => {
    if (currentTrack) {
      setIsHidden(false);
    }
  }, [currentTrack]);

  useEffect(() => {
    if ("mediaSession" in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        artwork: [
          {
            src: getProxiedImageURL(currentTrack.cover),
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => resume());
      navigator.mediaSession.setActionHandler("pause", () => pause());
      navigator.mediaSession.setActionHandler("previoustrack", () => prev());
      navigator.mediaSession.setActionHandler("nexttrack", () => next());
    }
  }, [currentTrack, resume, pause, prev, next]);

  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  useEffect(() => {
    fetchFavorites();
  }, []);

  useEffect(() => {
    if (currentTrack && isPlaying) {
      addToRecentlyPlayed({
        id: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        albumTitle: currentTrack.albumTitle,
        cover: currentTrack.cover,
        duration: currentTrack.duration,
      });
    }
  }, [currentTrack?.id, isPlaying]);

  useEffect(() => {
    if (currentTrack) {
      if (!isCrossfading) {
        loadNextTrackUrl();
      }
    }

    if (!isCrossfading) {
      hasStartedCrossfadeRef.current = false;
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
        crossfadeIntervalRef.current = null;
      }
      if (audioRef.current) audioRef.current.volume = volume;
      if (nextAudioRef.current) {
        nextAudioRef.current.pause();
        nextAudioRef.current.currentTime = 0;
        nextAudioRef.current.volume = 0;
      }
    }
  }, [currentTrack]);

  const loadNextTrackUrl = async () => {
    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id);
    let nextTrack = queue[currentIndex + 1];

    if (!nextTrack && repeatMode === "all" && queue.length > 0) {
      nextTrack = queue[0];
    }
    if (repeatMode === "one" && currentTrack) {
      nextTrack = currentTrack;
    }

    if (nextTrack && !nextTrack.url) {
      try {
        const url = await window.go.main.App.GetStreamURL(nextTrack.id);
        nextTrack.url = url;
        setNextTrackUrl(url);
      } catch (error) {}
    } else if (nextTrack) {
      setNextTrackUrl(nextTrack.url);
    } else {
      setNextTrackUrl("");
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && currentTrack?.url) {
      const playAudio = async () => {
        try {
          if (audio.src !== currentTrack.url && currentTrack.url) {
            audio.load();
          }
          await audio.play();
        } catch (err) {
          console.log("Playback promise interrupted or prevented:", err);
        }
      };
      playAudio();
    } else {
      audio.pause();
      if (nextAudioRef.current) nextAudioRef.current.pause();
    }
  }, [isPlaying, currentTrack?.id, currentTrack?.url, isHidden]);

  useEffect(() => {
    if (audioRef.current && !isCrossfading) {
      audioRef.current.volume = volume;
    }
  }, [volume, isCrossfading]);

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      const current = audioRef.current.currentTime;
      const dur = audioRef.current.duration || 0;
      setCurrentTime(current);
      setDuration(dur);

      const crossfadeDuration = Number(
        localStorage.getItem("crossfadeDuration") || "0"
      );

      if (crossfadeDuration > 0 && dur > 0 && !hasStartedCrossfadeRef.current) {
        const timeLeft = dur - current;
        const preloadBuffer = 2;

        if (timeLeft <= crossfadeDuration + preloadBuffer && !nextTrackUrl) {
          loadNextTrackUrl();
        }

        if (timeLeft <= crossfadeDuration && timeLeft > 0 && nextTrackUrl) {
          hasStartedCrossfadeRef.current = true;
          startCrossfade(crossfadeDuration);
        }
      }
    }
  };

  const startCrossfade = (crossfadeDuration: number) => {
    const currentAudio = audioRef.current;
    const nextAudio = nextAudioRef.current;

    if (!currentAudio || !nextAudio || !nextTrackUrl) return;

    setIsCrossfading(true);

    nextAudio.currentTime = 0;
    nextAudio.volume = 0;
    nextAudio.play().catch(() => {});

    const startTime = Date.now();
    const fadeInterval = 50;

    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
    }

    crossfadeIntervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / crossfadeDuration, 1);

      if (currentAudio && nextAudio) {
        currentAudio.volume = Math.max(0, volume * (1 - progress));
        nextAudio.volume = Math.min(volume, volume * progress);
      }

      if (progress >= 1) {
        finishCrossfade();
      }
    }, fadeInterval);
  };

  const finishCrossfade = () => {
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }

    const prevAudio = audioRef.current;
    const nextAudio = nextAudioRef.current;

    if (prevAudio) {
      prevAudio.pause();
      prevAudio.currentTime = 0;
    }

    if (nextAudio) {
      nextAudio.volume = volume;
    }

    if (audioRef.current && nextAudioRef.current) {
      const tempSrc = nextAudioRef.current.src;
      const tempTime = nextAudioRef.current.currentTime;

      audioRef.current.src = tempSrc;
      audioRef.current.currentTime = tempTime;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {});
    }

    setIsCrossfading(false);
    hasStartedCrossfadeRef.current = false;

    next();
  };

  useEffect(() => {
    return () => {
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
      }
    };
  }, []);

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    loadNextTrackUrl();
  }, [currentTrack, queue, repeatMode]);

  useEffect(() => {
    if (queue.length > 0) {
      syncQueue(queue);
    }
  }, [queue]);

  if (!currentTrack) return null;

  const audioElements = (
    <>
      <audio
        ref={audioRef}
        src={currentTrack.url}
        onEnded={() => {
          if (!isCrossfading) next();
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onPlay={() => {
          if (!isPlaying) resume();
        }}
        onPause={() => {
          if (
            isPlaying &&
            !isCrossfading &&
            audioRef.current &&
            audioRef.current.readyState > 0
          ) {
            pause();
          }
        }}
      />
      <audio ref={nextAudioRef} src={nextTrackUrl} preload="auto" />
    </>
  );

  if (isHidden) return audioElements;

  const isLocalTrack =
    (currentTrack?.url?.includes("127.0.0.1:34116") ||
      currentTrack?.url?.includes("localhost:34116")) &&
    currentTrack?.url?.includes("path=");

  return (
    <>
      {audioElements}

      {isExpanded ? (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-xl z-100 flex flex-col p-8 animate-in slide-in-from-bottom-10">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronDown className="h-6 w-6" />
            </Button>
          </div>

          {showLyrics ? (
            <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full space-y-4">
              <div className="flex items-center justify-between sticky top-0 bg-background/95 p-4 border-b z-10">
                <h2 className="text-2xl font-bold">Lyrics</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLyrics(false)}
                >
                  Close
                </Button>
              </div>
              <LyricsDisplay
                artist={currentTrack.artist}
                title={currentTrack.title}
                currentTime={currentTime}
              />
            </div>
          ) : showQueue ? (
            <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full space-y-4">
              <div className="flex items-center justify-between sticky top-0 bg-background/95 p-4 border-b z-10">
                <h2 className="text-2xl font-bold">Queue</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQueue(false)}
                >
                  Close
                </Button>
              </div>
              <div className="space-y-2">
                {queue.map((track, i) => (
                  <div
                    key={`${track.id}-${i}`}
                    draggable
                    onDragStart={() => setDraggedIndex(i)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverIndex(i);
                    }}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedIndex !== null && draggedIndex !== i) {
                        reorderQueue(draggedIndex, i);
                      }
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors border",
                      currentTrack.id === track.id
                        ? "bg-secondary border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                        : "border-transparent",
                      dragOverIndex === i && "border-green-500 bg-secondary/70",
                      draggedIndex === i && "opacity-50"
                    )}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
                    <img
                      src={getProxiedImageURL(track.cover)}
                      alt={track.title}
                      className="h-12 w-12 rounded object-cover shrink-0"
                      onClick={async () => {
                        if (!track.url) {
                          try {
                            // @ts-ignore
                            const url = await window.go.main.App.GetStreamURL(
                              track.id
                            );
                            track.url = url;
                          } catch (e) {}
                        }
                        play(track);
                        setShowQueue(false);
                      }}
                    />
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={async () => {
                        if (!track.url) {
                          try {
                            // @ts-ignore
                            const url = await window.go.main.App.GetStreamURL(
                              track.id
                            );
                            track.url = url;
                          } catch (e) {}
                        }
                        play(track);
                        setShowQueue(false);
                      }}
                    >
                      <p
                        className={cn(
                          "font-medium truncate",
                          currentTrack.id === track.id && "text-primary"
                        )}
                      >
                        {track.title}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {track.artist}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentTrack.id === track.id) {
                          toast.error("Cannot remove currently playing track");
                          return;
                        }
                        removeFromQueue(track.id);
                        toast.success("Removed from queue");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              <img
                src={getProxiedImageURL(currentTrack.cover)}
                alt={currentTrack.title}
                className="h-64 w-64 md:h-96 md:w-96 rounded-lg shadow-2xl object-cover"
              />
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">{currentTrack.title}</h2>
                <p className="text-xl text-muted-foreground">
                  {currentTrack.artist}
                </p>
              </div>

              <div className="w-full max-w-2xl space-y-6">
                <div className="flex items-center justify-center gap-2 w-full">
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {formatTime(currentTime)}
                  </span>
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={1}
                    className="flex-1"
                    onValueChange={(val: number[]) => {
                      setIsDragging(true);
                      setCurrentTime(val[0]);
                    }}
                    onValueCommit={(val: number[]) => {
                      setIsDragging(false);
                      handleSeek(val);
                    }}
                  />
                  <span className="text-xs text-muted-foreground w-10">
                    {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-8">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "text-muted-foreground hover:text-primary transition-colors",
                      isShuffle && "text-green-500 hover:text-green-400",
                      isLocalTrack && "hidden"
                    )}
                    onClick={toggleShuffle}
                  >
                    <Shuffle className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12"
                    onClick={prev}
                  >
                    <SkipBack className="h-8 w-8" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-16 w-16 rounded-full"
                    onClick={isPlaying ? pause : resume}
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8" />
                    ) : (
                      <Play className="h-8 w-8" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12"
                    onClick={next}
                  >
                    <SkipForward className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "text-muted-foreground hover:text-primary transition-colors",
                      repeatMode !== "none" &&
                        "text-green-500 hover:text-green-400"
                    )}
                    onClick={toggleRepeat}
                  >
                    <Repeat className="h-6 w-6" />
                    {repeatMode === "one" && (
                      <span className="absolute text-[10px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-500">
                        1
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "text-muted-foreground hover:text-primary",
                      showQueue && "text-primary"
                    )}
                    onClick={() => {
                      setShowQueue(!showQueue);
                      if (showLyrics) setShowLyrics(false);
                    }}
                  >
                    <ListMusic className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "text-muted-foreground hover:text-primary",
                      showLyrics && "text-primary"
                    )}
                    onClick={() => {
                      setShowLyrics(!showLyrics);
                      if (showQueue) setShowQueue(false);
                    }}
                  >
                    <FileText className="h-6 w-6" />
                  </Button>
                  {!isLocalTrack && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "text-muted-foreground hover:text-primary transition-colors",
                          isFavorite && "text-red-500 hover:text-red-400"
                        )}
                        onClick={toggleFavorite}
                      >
                        <Heart
                          className={cn(
                            "h-6 w-6",
                            isFavorite && "fill-current"
                          )}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary"
                        onClick={handleDownload}
                      >
                        <Download className="h-6 w-6" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4 justify-center">
                  <Volume2 className="h-5 w-5 text-muted-foreground" />
                  <Slider
                    value={[volume * 100]}
                    max={100}
                    step={1}
                    className="w-64"
                    onValueChange={(val: number[]) => setVolume(val[0] / 100)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : isMinimized ? (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            size="icon"
            className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 shadow-lg animate-spin-slow"
            onClick={() => setIsMinimized(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M22 12h-4M6 12H2" />
            </svg>
          </Button>
        </div>
      ) : (
        <div className="fixed bottom-0 right-0 left-0 md:left-64 h-24 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-t px-4 flex items-center justify-between z-50 transition-all duration-300">
          <div className="flex items-center gap-2 w-[30%] min-w-45">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => setIsMinimized(true)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-500"
              onClick={() => {
                stop();
                setIsHidden(true);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
            <div
              className="relative group cursor-pointer"
              onClick={() => setIsExpanded(true)}
            >
              <img
                src={getProxiedImageURL(currentTrack.cover)}
                alt={currentTrack.title}
                className="h-14 w-14 rounded object-cover shadow-md group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="h-6 w-6 text-white drop-shadow-md" />
              </div>
            </div>
            <div className="overflow-hidden mr-2">
              <h4 className="font-medium text-sm truncate hover:underline cursor-pointer">
                {currentTrack.title}
              </h4>
              <p className="text-xs text-muted-foreground truncate hover:underline cursor-pointer">
                {currentTrack.artist}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "text-muted-foreground hover:text-primary hidden sm:flex transition-colors",
                isLocalTrack && "hidden",
                isFavorite && "text-red-500 hover:text-red-400"
              )}
              onClick={toggleFavorite}
            >
              <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
            </Button>
            {!isLocalTrack && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary hidden sm:flex"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 w-[40%] max-w-2xl">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "text-muted-foreground hover:text-primary h-8 w-8 hidden sm:flex transition-colors",
                  isShuffle && "text-green-500 hover:text-green-400",
                  isLocalTrack && "hidden"
                )}
                onClick={toggleShuffle}
              >
                <Shuffle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={prev}
                className="text-foreground hover:text-primary"
              >
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                className="rounded-full h-8 w-8 bg-primary text-primary-foreground hover:scale-105 transition-transform"
                onClick={isPlaying ? pause : resume}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={next}
                className="text-foreground hover:text-primary"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "text-muted-foreground hover:text-primary h-8 w-8 hidden sm:flex transition-colors",
                  repeatMode !== "none" && "text-green-500 hover:text-green-400"
                )}
                onClick={toggleRepeat}
              >
                <Repeat className="h-4 w-4" />
                {repeatMode === "one" && (
                  <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-500">
                    1
                  </span>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-muted-foreground w-8 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                className="flex-1 h-1.5"
                onValueChange={(val: number[]) => {
                  setIsDragging(true);
                  setCurrentTime(val[0]);
                }}
                onValueCommit={(val: number[]) => {
                  setIsDragging(false);
                  handleSeek(val);
                }}
              />
              <span className="text-xs text-muted-foreground w-8">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-[30%] justify-end min-w-35">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              className="w-24"
              onValueChange={(val: number[]) => setVolume(val[0] / 100)}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(true)}
              className="ml-2 text-muted-foreground hover:text-primary"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
