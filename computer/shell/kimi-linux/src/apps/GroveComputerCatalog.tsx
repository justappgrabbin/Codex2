import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type GrovePackage = {
  id: string;
  name?: string;
  description?: string;
  kind?: string;
  location?: string;
  already?: boolean;
};

type GroveCatalog = {
  builtin?: { id: string; name: string; installed?: boolean }[];
  packages?: GrovePackage[];
  installed?: { id: string; path?: string; location?: string; kind?: string }[];
  supabase?: {
    configured?: boolean;
    status?: string;
    error?: string;
    needed?: { url?: string; key?: string; bucket?: string };
    packages?: GrovePackage[];
  };
};

export function GroveComputerCatalog() {
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<GroveCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const response = await fetch("/api/grove");
      if (!response.ok) throw new Error(`Grove catalog failed (${response.status})`);
      setCatalog(await response.json());
      setError(null);
    } catch (reason) {
      setError(String(reason));
    }
  };

  useEffect(() => { void refresh(); }, []);

  const install = async (packageId: string) => {
    setBusy(packageId);
    try {
      const response = await fetch("/api/grove/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: packageId }),
      });
      const receipt = await response.json();
      if (!response.ok || receipt?.ok === false) throw new Error(receipt.error || receipt.message || `Install failed (${response.status})`);
      toast({
        title: receipt.already ? "Already on this computer" : "Installed",
        description: receipt.location
          ? `${packageId} is available at ${receipt.location} and stays usable offline.`
          : `${packageId} is installed on this computer and stays usable offline.`,
      });
      await refresh();
    } catch (reason) {
      toast({ title: "Install did not finish", description: String(reason) });
    } finally {
      setBusy(null);
    }
  };

  const supabase = catalog?.supabase;
  const remote = supabase?.packages ?? [];
  const modules = catalog?.packages ?? [];
  const installed = catalog?.installed ?? [];

  return (
    <section className="mb-8" data-testid="grove-computer-catalog">
      <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
        <Store className="h-5 w-5 text-primary" />
        Computer apps
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Built-in apps stay on the computer. Optional modules install next to your files, not into the computer itself.
        Installed apps keep working when Supabase is offline.
      </p>
      {error && <p className="text-sm text-muted-foreground mb-3">{error}. The local catalog below still works when the computer is online later.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {(catalog?.builtin ?? []).map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{item.name}</h3>
              <Badge variant="outline">built in</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Already part of this computer.</p>
          </Card>
        ))}
        {modules.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{item.name ?? item.id}</h3>
              <Badge variant="outline">{item.kind ?? "module"}</Badge>
            </div>
            {item.description && <p className="text-sm text-muted-foreground mb-3">{item.description}</p>}
            <Button
              data-testid={`button-install-${item.id}`}
              className="w-full"
              disabled={busy === item.id}
              onClick={() => install(item.id)}
            >
              <Download className="h-4 w-4 mr-2" />
              {busy === item.id ? "Installing…" : "Install on this computer"}
            </Button>
          </Card>
        ))}
      </div>
      {installed.length > 0 && (
        <p className="text-xs text-muted-foreground mb-4">
          Installed offline: {installed.map((item) => item.id).join(", ")}
        </p>
      )}
      {supabase && !supabase.configured && (
        <p className="text-xs text-muted-foreground" data-testid="grove-supabase-needed">
          Remote Grove listing from Supabase is waiting on local configuration:
          {" "}{supabase.needed?.url}, and {supabase.needed?.key}.
          {supabase.needed?.bucket ? ` ${supabase.needed.bucket}.` : ""}
          Nothing is stored in the app. Already-installed apps stay usable without it.
        </p>
      )}
      {supabase?.configured && supabase.status === "error" && (
        <p className="text-xs text-muted-foreground">Supabase catalog could not be read: {supabase.error}. Local and installed apps still work.</p>
      )}
      {remote.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {remote.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{item.name ?? item.id}</h3>
                <Badge variant="outline">Supabase</Badge>
              </div>
              <Button
                data-testid={`button-install-remote-${item.id}`}
                className="w-full"
                disabled={busy === item.id}
                onClick={() => install(item.id)}
              >
                <Download className="h-4 w-4 mr-2" />
                {busy === item.id ? "Installing…" : "Install from Supabase"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
