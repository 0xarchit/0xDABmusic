import { useState, useEffect } from "react";
import { useUserStore } from "@/lib/user-store";
import { useFavoriteStore } from "@/lib/favorite-store";
import { useRecentlyPlayedStore } from "@/lib/recently-played-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/Loader";
import {
  User,
  Heart,
  Library,
  Calendar,
  Clock,
  Play,
  Trash2,
} from "lucide-react";
import { getProxiedImageURL } from "@/lib/utils";
import { usePlayerStore } from "@/lib/player-store";
import { useProcessStore } from "@/lib/process-store";

export function ProfilePage() {
  const { user, isLoading, fetchUser } = useUserStore();
  const { favorites } = useFavoriteStore();
  const { tracks: recentlyPlayed, clearHistory } = useRecentlyPlayedStore();
  const { play } = usePlayerStore();
  const { addProcess, removeProcess } = useProcessStore();
  const [libraries, setLibraries] = useState<any[]>([]);

  useEffect(() => {
    const loadProfileData = async () => {
      const processId = "profile-load";
      addProcess(processId, "Loading Profile");
      try {
        await Promise.all([fetchUser(), fetchLibraries()]);
      } finally {
        removeProcess(processId);
      }
    };
    loadProfileData();
  }, []);

  const fetchLibraries = async () => {
    try {
      const libs = await window.go.main.App.GetLibraries();
      setLibraries(libs || []);
    } catch (error) {
      console.error("Failed to fetch libraries");
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <InlineLoader message="Loading profile..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Not logged in</p>
      </div>
    );
  }

  const initials = user.username
    ? user.username
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="h-full p-6 pb-24 space-y-6">
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24">
          <AvatarFallback className="text-2xl bg-linear-to-br from-indigo-500 to-purple-600">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">{user.username}</h1>
          <p className="text-muted-foreground">{user.email}</p>
          {user.created_at && (
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Favorites</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{favorites.length}</div>
            <p className="text-xs text-muted-foreground">Liked tracks</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Libraries</CardTitle>
            <Library className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{libraries.length}</div>
            <p className="text-xs text-muted-foreground">Playlists</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tracks</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {libraries.reduce((acc, lib) => acc + (lib.trackCount || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">In all libraries</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Recently Played</CardTitle>
          </div>
          {recentlyPlayed.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-red-500"
              onClick={clearHistory}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {recentlyPlayed.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No recently played tracks
            </p>
          ) : (
            <div className="space-y-2">
              {recentlyPlayed.slice(0, 10).map((track) => (
                <div
                  key={track.id + track.playedAt}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 group"
                >
                  <img
                    src={getProxiedImageURL(track.cover)}
                    alt={track.title}
                    className="h-12 w-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {track.artist}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(track.playedAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={async () => {
                      try {
                        const url = await window.go.main.App.GetStreamURL(
                          track.id
                        );
                        play({ ...track, url });
                      } catch (error) {
                        console.error("Failed to play track");
                      }
                    }}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
