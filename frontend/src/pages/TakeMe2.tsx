import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Github,
  ExternalLink,
  FolderOpen,
  Trash2,
  Database,
  Key,
  RefreshCw,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export function TakeMe2Page() {
  const [cacheSize, setCacheSize] = useState("Calculating...");
  const [version, setVersion] = useState("Loading...");
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const fetchCacheSize = async () => {
    if (window.go?.main?.App?.GetTotalCacheSize) {
      try {
        const size = await window.go.main.App.GetTotalCacheSize();
        setCacheSize(size);
      } catch (e) {
        setCacheSize("Unknown");
      }
    }
  };

  useEffect(() => {
    fetchCacheSize();
    fetchVersion();
  }, []);

  const fetchVersion = async () => {
    if (window.go?.main?.App?.GetAppVersion) {
      try {
        const v = await window.go.main.App.GetAppVersion();
        setVersion(v);
      } catch (e) {
        setVersion("Unknown");
      }
    }
  };

  const checkForUpdates = async () => {
    if (version === "Loading..." || version === "Unknown") return;

    setCheckingUpdate(true);
    try {
      const response = await fetch(
        "https://api.github.com/repos/0xarchit/0xDABmusic/releases/latest"
      );
      const data = await response.json();
      const latest = data.tag_name.replace(/^v/, "");

      if (latest !== version) {
        setUpdateAvailable(true);
        toast.success(`Update available: v${latest}`);
      } else {
        setUpdateAvailable(false);
        toast.info("You are up to date!");
      }
    } catch (e) {
      toast.error("Failed to check for updates");
    } finally {
      setCheckingUpdate(false);
    }
  };

  const openLink = (url: string) => {
    if (window.go?.main?.App?.OpenBrowser) {
      window.go.main.App.OpenBrowser(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const openMusicFolder = async () => {
    try {
      await window.go.main.App.OpenMusicFolder();
    } catch (e) {
      toast.error(String((e as any)?.message || e));
    }
  };

  const openConfigFolder = async () => {
    try {
      await window.go.main.App.OpenConfigFolder();
    } catch (e) {
      toast.error(String((e as any)?.message || e));
    }
  };

  const clearCache = async () => {
    try {
      await window.go.main.App.ClearAllCache();
      toast.success("Cache cleared successfully");
      fetchCacheSize();
    } catch (e) {
      toast.error("Failed to clear cache");
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          0xDABmusic
        </h1>
        <p className="text-muted-foreground text-lg">
          The ultimate music experience.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-secondary/20 border-secondary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              Developer Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex flex-col">
                <span className="font-medium">0xarchit</span>
                <span className="text-sm text-muted-foreground">
                  Lead Developer
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openLink("https://0xarchit.is-a.dev")}
              >
                Website <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex flex-col">
                <span className="font-medium">Repository</span>
                <span className="text-sm text-muted-foreground">
                  0xarchit/0xDABmusic
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    openLink("https://github.com/0xarchit/0xDABmusic")
                  }
                >
                  <Github className="mr-2 h-3 w-3" />
                  Star
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex flex-col">
                <span className="font-medium">Current Version</span>
                <span className="text-sm text-muted-foreground">
                  v{version}
                </span>
              </div>
              <Button
                variant={updateAvailable ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  updateAvailable
                    ? openLink(
                        "https://github.com/0xarchit/0xDABmusic/releases"
                      )
                    : checkForUpdates()
                }
                disabled={checkingUpdate}
              >
                {checkingUpdate ? (
                  <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                ) : updateAvailable ? (
                  <Download className="mr-2 h-3 w-3" />
                ) : (
                  <RefreshCw className="mr-2 h-3 w-3" />
                )}
                {checkingUpdate
                  ? "Checking..."
                  : updateAvailable
                  ? "Update Now"
                  : "Check Updates"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <Database className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Manage local data and system files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Music Folder</p>
                <p className="text-xs text-muted-foreground">
                  Open local downloads
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={openMusicFolder}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Open
              </Button>
            </div>

            <Separator className="bg-red-500/10" />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Config Folder</p>
                <p className="text-xs text-muted-foreground">
                  User credentials & logs
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={openConfigFolder}>
                <Key className="mr-2 h-4 w-4" />
                Open
              </Button>
            </div>

            <Separator className="bg-red-500/10" />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Cache Storage</p>
                <p className="text-xs text-muted-foreground">
                  Current size: {cacheSize}
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={clearCache}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
