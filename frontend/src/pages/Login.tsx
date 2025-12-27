import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DABLogin({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiBase, setApiBase] = useState("https://dabmusic.xyz/api");

  useEffect(() => {
    if (window.go?.main?.App?.GetConfig) {
      window.go.main.App.GetConfig().then((cfg: any) => {
        const current = String(cfg?.DAB_API_BASE || "").replace(/\/+$/, "");
        if (current) {
          setApiBase(current);
        }
      });
    }
  }, []);

  const normalizeApiBase = (value: string) => {
    const v = String(value || "")
      .trim()
      .replace(/\/+$/, "");
    if (!v) return "https://dabmusic.xyz/api";
    if (v.endsWith("/api")) return v;
    return `${v}/api`;
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      if (window.go?.main?.App?.SetDABAPIBase) {
        await window.go.main.App.SetDABAPIBase(normalizeApiBase(apiBase));
      }
      if (window.go?.main?.App?.DABLogin) {
        await window.go.main.App.DABLogin(email, password);
        toast.success("Logged in successfully");
        onLoginSuccess();
      } else {
        onLoginSuccess();
      }
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <Card className="w-87.5">
        <CardHeader>
          <CardTitle>DAB Login</CardTitle>
          <CardDescription>
            Enter your DAB credentials to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="api-base">API Base</Label>
              <Select
                value={apiBase}
                onValueChange={async (v) => {
                  const next = normalizeApiBase(v);
                  setApiBase(next);
                  if (window.go?.main?.App?.SetDABAPIBase) {
                    try {
                      await window.go.main.App.SetDABAPIBase(next);
                      toast.success("API base updated");
                    } catch (e: any) {
                      toast.error(String(e?.message || e));
                    }
                  }
                }}
              >
                <SelectTrigger
                  id="api-base"
                  className="bg-slate-900 border-slate-800 text-white"
                >
                  <SelectValue placeholder="Select API base" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="https://dabmusic.xyz/api">
                    dabmusic.xyz (prod)
                  </SelectItem>
                  <SelectItem value="https://dab.yeet.su/api">
                    dab.yeet.su (legacy)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-400"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleLogin} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
