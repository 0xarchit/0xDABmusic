import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

declare global {
  interface Window {
    runtime: {
      EventsOn: (eventName: string, callback: (data: any) => void) => void;
      EventsOff: (eventName: string) => void;
    };
  }
}

export function SettingsPage() {
  const [spotifyID, setSpotifyID] = useState("");
  const [spotifySecret, setSpotifySecret] = useState("");
  const [dabEmail, setDabEmail] = useState("");
  const [fuzzyScale, setFuzzyScale] = useState(85);
  const [maxConcurrency, setMaxConcurrency] = useState(1);
  const [maxCacheSize, setMaxCacheSize] = useState(1024);
  const [crossfadeDuration, setCrossfadeDuration] = useState(0);
  const [spotifyAuthenticated, setSpotifyAuthenticated] = useState(false);
  const [spotifyAuthUrl, setSpotifyAuthUrl] = useState("");

  useEffect(() => {
    if (window.go?.main?.App?.GetConfig) {
      window.go.main.App.GetConfig().then((cfg: any) => {
        if (cfg) {
          setSpotifyID(cfg.SPOTIFY_CLIENT_ID || "");
          setSpotifySecret(cfg.SPOTIFY_CLIENT_SECRET || "");
          setDabEmail(cfg.DAB_EMAIL || "");
          setFuzzyScale(cfg.FUZZY_MATCH_SCALE || 85);
          setMaxConcurrency(cfg.MAX_CONCURRENCY || 1);

          const sizeMB = (cfg.MAX_CACHE_SIZE || 1073741824) / (1024 * 1024);
          setMaxCacheSize(Math.round(sizeMB));
        }
      });
    }

    const storedCrossfade = localStorage.getItem("crossfadeDuration");
    if (storedCrossfade) {
      setCrossfadeDuration(Number(storedCrossfade));
    }

    if (window.go?.main?.App?.CheckSpotifySession) {
      window.go.main.App.CheckSpotifySession().then((isAuth: boolean) => {
        setSpotifyAuthenticated(isAuth);
      });
    }

    if (window.runtime?.EventsOn) {
      window.runtime.EventsOn("spotify-authenticated", () => {
        setSpotifyAuthenticated(true);
        toast.success("Spotify authenticated successfully!");
      });
    }

    return () => {
      if (window.runtime?.EventsOff) {
        window.runtime.EventsOff("spotify-authenticated");
      }
    };
  }, []);

  const handleSaveSpotify = async () => {
    if (window.go?.main?.App?.SaveConfig) {
      try {
        await window.go.main.App.SaveConfig(spotifyID, spotifySecret);
        toast.success("Spotify settings saved");
      } catch (e: any) {
        toast.error("Failed to save: " + e);
      }
    }
  };

  const handleSaveGeneral = async () => {
    if (window.go?.main?.App?.SaveGeneralSettings) {
      try {
        const sizeBytes = Number(maxCacheSize) * 1024 * 1024;
        await window.go.main.App.SaveGeneralSettings(
          Number(fuzzyScale),
          Number(maxConcurrency),
          Number(sizeBytes)
        );
        toast.success("General settings saved");
      } catch (e: any) {
        toast.error("Failed to save: " + e);
      }
    }
  };

  const handleSpotifyLogin = async () => {
    if (window.go?.main?.App?.SpotifyLogin) {
      try {
        const url = await window.go.main.App.SpotifyLogin();
        if (url) {
          setSpotifyAuthUrl(url);
          if (window.go?.main?.App?.OpenBrowser) {
            await window.go.main.App.OpenBrowser(url);
          } else {
            window.open(url, "_blank");
          }
          if (navigator.clipboard?.writeText) {
            try {
              await navigator.clipboard.writeText(url);
              toast.info("Login URL copied to clipboard");
            } catch {
              toast.info("Please complete login in your browser");
            }
          } else {
            toast.info("Please complete login in your browser");
          }
        }
      } catch (e: any) {
        toast.error("Spotify login failed: " + e);
      }
    }
  };

  const handleLogout = async () => {
    if (window.go?.main?.App?.Logout) {
      await window.go.main.App.Logout();
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      <Separator />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Spotify Configuration</CardTitle>
              {spotifyAuthenticated && (
                <Badge className="bg-green-600">Authenticated</Badge>
              )}
            </div>
            <CardDescription>
              Configure your Spotify Developer credentials to access playlists.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="client-id">Client ID</Label>
              <Input
                id="client-id"
                value={spotifyID}
                onChange={(e) => setSpotifyID(e.target.value)}
                className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-secret">Client Secret</Label>
              <Input
                id="client-secret"
                type="password"
                value={spotifySecret}
                onChange={(e) => setSpotifySecret(e.target.value)}
                className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveSpotify}>Save Credentials</Button>
              <Button
                variant={spotifyAuthenticated ? "outline" : "secondary"}
                onClick={handleSpotifyLogin}
              >
                {spotifyAuthenticated
                  ? "Re-login with Spotify"
                  : "Login with Spotify"}
              </Button>
            </div>

            {spotifyAuthUrl ? (
              <div className="grid gap-2 pt-2">
                <Label htmlFor="spotify-auth-url">Spotify Login URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="spotify-auth-url"
                    readOnly
                    value={spotifyAuthUrl}
                    className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-400"
                  />
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (navigator.clipboard?.writeText) {
                        try {
                          await navigator.clipboard.writeText(spotifyAuthUrl);
                          toast.success("Copied");
                        } catch {
                          toast.error("Copy failed");
                        }
                      }
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure matching algorithm and performance settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="fuzzy-scale">Fuzzy Match Scale (0-100)</Label>
              <div className="flex gap-4 items-center">
                <Input
                  id="fuzzy-scale"
                  type="number"
                  min="0"
                  max="100"
                  value={fuzzyScale}
                  onChange={(e) => setFuzzyScale(Number(e.target.value))}
                  className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-400 w-24"
                />
                <span className="text-sm text-muted-foreground">
                  Higher values mean stricter matching. Default is 85.
                </span>
              </div>
            </div>

            <Separator className="bg-slate-800" />

            <div className="grid gap-2">
              <Label htmlFor="concurrency">
                Parallel Processing (Concurrency)
              </Label>
              <div className="flex gap-4 items-center">
                <Input
                  id="concurrency"
                  type="number"
                  min="1"
                  max="10"
                  value={maxConcurrency}
                  onChange={(e) => setMaxConcurrency(Number(e.target.value))}
                  className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-400 w-24"
                />
                <span className="text-sm text-muted-foreground">
                  Number of tracks to process simultaneously. Default is 1.
                </span>
              </div>
              <div className="rounded-md bg-yellow-500/10 p-3 border border-yellow-500/20 mt-2">
                <p className="text-xs text-yellow-200 flex items-start gap-2">
                  <span className="text-lg leading-none">⚠</span>
                  <span>
                    <strong>Warning:</strong> Increasing concurrency speeds up
                    processing but significantly increases the risk of API rate
                    limits and failures.
                    <br />
                    Safe limit: <strong>1-3</strong>. Use higher values (5+)
                    with caution.
                  </span>
                </p>
              </div>
            </div>

            <Separator className="bg-slate-800" />

            <div className="grid gap-2">
              <Label htmlFor="cache-size">Max Cache Size (MB)</Label>
              <div className="flex gap-4 items-center">
                <Input
                  id="cache-size"
                  type="number"
                  min="100"
                  value={maxCacheSize}
                  onChange={(e) => setMaxCacheSize(Number(e.target.value))}
                  className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-400 w-24"
                />
                <span className="text-sm text-muted-foreground">
                  Limit the disk space used for caching songs. Default is 1024
                  MB (1 GB).
                </span>
              </div>
            </div>

            <Separator className="bg-slate-800" />

            <div className="grid gap-2">
              <Label htmlFor="crossfade">Crossfade Duration (seconds)</Label>
              <div className="flex gap-4 items-center">
                <Input
                  id="crossfade"
                  type="number"
                  min="0"
                  max="15"
                  value={crossfadeDuration}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCrossfadeDuration(val);
                    localStorage.setItem("crossfadeDuration", val.toString());
                    toast.success("Crossfade updated");
                  }}
                  className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-400 w-24"
                />
                <span className="text-sm text-muted-foreground">
                  Smoothly transition between tracks. 0 disables crossfade.
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveGeneral}>Save Preferences</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>DAB Account</CardTitle>
            <CardDescription>Manage your 0xDABmusic session.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">
                  Logged in as:
                </p>
                <p
                  className={`text-lg font-bold ${
                    dabEmail ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {dabEmail || "Not logged in"}
                </p>
              </div>
              <Button variant="destructive" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
