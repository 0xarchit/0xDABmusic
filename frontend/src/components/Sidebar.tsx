import {
  LayoutDashboard,
  Settings,
  Music,
  LogOut,
  User,
  Download,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ className, activeTab, setActiveTab }: SidebarProps) {
  return (
    <div className={cn("pb-12 w-64 border-r bg-background", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            0xDABmusic
          </h2>
          <div className="space-y-1">
            <Button
              variant={activeTab === "dashboard" ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                activeTab === "dashboard" &&
                  "border-l-4 border-green-500 bg-secondary/50"
              )}
              onClick={() => setActiveTab("dashboard")}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant={activeTab === "library" ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                activeTab === "library" &&
                  "border-l-4 border-green-500 bg-secondary/50"
              )}
              onClick={() => setActiveTab("library")}
            >
              <Music className="mr-2 h-4 w-4" />
              Library
            </Button>
            <Button
              variant={activeTab === "download" ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                activeTab === "download" &&
                  "border-l-4 border-green-500 bg-secondary/50"
              )}
              onClick={() => setActiveTab("download")}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button
              variant={activeTab === "convert" ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                activeTab === "convert" &&
                  "border-l-4 border-green-500 bg-secondary/50"
              )}
              onClick={() => setActiveTab("convert")}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Convert
            </Button>
            <Button
              variant={activeTab === "profile" ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                activeTab === "profile" &&
                  "border-l-4 border-green-500 bg-secondary/50"
              )}
              onClick={() => setActiveTab("profile")}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
            <Button
              variant={activeTab === "settings" ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                activeTab === "settings" &&
                  "border-l-4 border-green-500 bg-secondary/50"
              )}
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button
              variant={activeTab === "takeme2" ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                activeTab === "takeme2" &&
                  "border-l-4 border-green-500 bg-secondary/50"
              )}
              onClick={() => setActiveTab("takeme2")}
            >
              <User className="mr-2 h-4 w-4" />
              Take Me 2
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
