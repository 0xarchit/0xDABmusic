import { useEffect, useState, useRef } from "react";
import { useLyricsStore } from "@/lib/lyrics-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InlineLoader } from "@/components/Loader";
import { FileText } from "lucide-react";

interface LyricsDisplayProps {
  artist: string;
  title: string;
  currentTime?: number;
}

interface LyricLine {
  time: number;
  text: string;
}

export function LyricsDisplay({
  artist,
  title,
  currentTime = 0,
}: LyricsDisplayProps) {
  const { lyrics, isLoading, isUnsynced, fetchLyrics } = useLyricsStore();
  const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (artist && title) {
      fetchLyrics(artist, title);
    }
  }, [artist, title, fetchLyrics]);

  useEffect(() => {
    if (!lyrics) {
      setParsedLyrics([]);
      return;
    }

    const hasLRCFormat = /\[\d{2}:\d{2}\.\d{2}\]/.test(lyrics);
    console.log(
      "[Lyrics] Has LRC timestamps:",
      hasLRCFormat,
      "API unsynced flag:",
      isUnsynced
    );

    if (!hasLRCFormat) {
      console.log("[Lyrics] Displaying unsynced lyrics (no timestamps found)");
      setParsedLyrics([]);
      return;
    }

    console.log("[Lyrics] Parsing as synced lyrics...");
    console.log("[Lyrics] Raw lyrics:", lyrics.substring(0, 200));
    const lines: LyricLine[] = [];
    const lrcPattern = /\[(\d{2}):(\d{2})\.(\d{2})\](.+)/g;
    let match;
    while ((match = lrcPattern.exec(lyrics)) !== null) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const centiseconds = parseInt(match[3]);
      const time = minutes * 60 + seconds + centiseconds / 100;
      const text = match[4].trim();
      if (text) lines.push({ time, text });
    }
    console.log("[Lyrics] Parsed", lines.length, "lines");
    if (lines.length > 0) {
      console.log("[Lyrics] First few lines:", lines.slice(0, 3));
    }
    setParsedLyrics(lines);
  }, [lyrics, isUnsynced]);

  useEffect(() => {
    if (parsedLyrics.length > 0 && currentTime > 0) {
      let index = parsedLyrics.findIndex((line) => line.time > currentTime);
      index = index === -1 ? parsedLyrics.length - 1 : Math.max(0, index - 1);
      if (index !== currentLineIndex) {
        console.log(
          "[Lyrics] Current time:",
          currentTime,
          "Line index:",
          index
        );
      }
      setCurrentLineIndex(index);
    }
  }, [currentTime, parsedLyrics, currentLineIndex]);

  useEffect(() => {
    if (scrollRef.current && parsedLyrics.length > 0) {
      const activeElement = scrollRef.current.querySelector(
        `[data-line="${currentLineIndex}"]`
      );
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentLineIndex, parsedLyrics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <InlineLoader message="Fetching lyrics..." />
      </div>
    );
  }

  if (!lyrics) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-20" />
        <p>No lyrics available</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4" ref={scrollRef}>
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-muted-foreground">{artist}</p>
        </div>
        {parsedLyrics.length > 0 ? (
          <div className="space-y-3">
            {parsedLyrics.map((line, index) => (
              <p
                key={index}
                data-line={index}
                className={`text-center transition-all duration-300 ${
                  index === currentLineIndex
                    ? "text-green-500 text-xl font-bold scale-110"
                    : "text-muted-foreground text-base"
                }`}
              >
                {line.text}
              </p>
            ))}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-center leading-loose">
            {lyrics}
          </pre>
        )}
      </div>
    </ScrollArea>
  );
}
