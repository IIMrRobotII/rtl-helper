import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SettingsPanel } from "@/components/settings-panel";
import { SitesPanel } from "@/components/sites-panel";
import { useTheme } from "@/lib/use-theme";
import { loadPopupModel, type PopupModel } from "@/lib/rtl";
import {
  clearAll,
  getState,
  managedSites,
  removeSite,
  setForceEnabled,
  setMaster,
  setSiteEnabled,
  subscribe,
  type ManagedSite,
} from "@/lib/storage";
import { cn, FOCUS_RING } from "@/lib/utils";

type View = "checking" | "master-off" | "unsupported" | "available";

const DOT: Record<View, string> = {
  checking: "bg-indicator-disabled",
  "master-off": "bg-indicator-disabled",
  unsupported: "bg-indicator-disabled",
  available: "bg-indicator-active",
};

function viewOf(model: PopupModel | null): View {
  if (!model) return "checking";
  if (!model.supported) return "unsupported";
  if (!model.master) return "master-off";
  return "available";
}

function statusOf(view: View, hostname: string | undefined): string {
  switch (view) {
    case "unsupported":
      return "Not available on this page.";
    case "master-off":
      return "Extension is off.";
    case "available":
      return hostname ? `Available on ${hostname}.` : "Available on this page.";
    default:
      return "Checking this page…";
  }
}

export default function App() {
  const { theme, setTheme, resetTheme } = useTheme();
  const [model, setModel] = useState<PopupModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [route, setRoute] = useState<"main" | "settings" | "sites">("main");
  const [shortcut, setShortcut] = useState<string | undefined>();
  const [sites, setSites] = useState<ManagedSite[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [next, state] = await Promise.all([loadPopupModel(), getState()]);
        if (!active) return;
        setModel(next);
        setSites(managedSites(state));
      } catch {
        if (!active) return;
        setError("Could not read extension state.");
        setModel({
          supported: false,
          master: true,
          siteEnabled: false,
          forceEnabled: false,
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onToggleMaster = useCallback((next: boolean) => {
    setError(undefined);
    setSaving(true);
    void (async () => {
      try {
        await setMaster(next);
        setModel((m) => (m ? { ...m, master: next } : m));
      } catch {
        setError("Could not save setting.");
      } finally {
        setSaving(false);
      }
    })();
  }, []);

  const toggleSiteSetting = useCallback(
    (
      persist: (origin: string, on: boolean) => Promise<void>,
      field: "siteEnabled" | "forceEnabled",
      next: boolean,
    ) => {
      if (!model || !model.master || !model.supported || !model.origin) return;
      const origin = model.origin;
      setError(undefined);
      setSaving(true);
      void (async () => {
        try {
          await persist(origin, next);
          setModel((m) => (m ? { ...m, [field]: next } : m));
        } catch {
          setError("Could not save setting.");
        } finally {
          setSaving(false);
        }
      })();
    },
    [model],
  );

  const onToggleSite = (next: boolean) =>
    toggleSiteSetting(setSiteEnabled, "siteEnabled", next);
  const onToggleForce = (next: boolean) =>
    toggleSiteSetting(setForceEnabled, "forceEnabled", next);

  const reloadModel = useCallback(async () => {
    try {
      setModel(await loadPopupModel());
    } catch {}
  }, []);

  const reloadSites = useCallback(async () => {
    try {
      setSites(managedSites(await getState()));
    } catch {}
  }, []);

  const onResetAll = useCallback(async () => {
    await clearAll();
    resetTheme();
    setError(undefined);
    setSites([]);
    await reloadModel();
  }, [reloadModel, resetTheme]);

  const onRemoveSite = useCallback(
    (origin: string) => {
      setSites((current) => current.filter((site) => site.origin !== origin));
      void removeSite(origin).catch(() => void reloadSites());
    },
    [reloadSites],
  );

  useEffect(
    () =>
      subscribe((state) => {
        setSites(managedSites(state));
        void reloadModel();
      }),
    [reloadModel],
  );

  useEffect(() => {
    if (!chrome.commands?.getAll) return;
    let active = true;
    void (async () => {
      const commands = await chrome.commands.getAll();
      const toggle = commands.find((command) => command.name === "toggle-rtl");
      if (active) setShortcut(toggle?.shortcut || undefined);
    })();
    return () => {
      active = false;
    };
  }, []);

  const view = viewOf(model);
  const loading = model === null;
  const controlsDisabled = loading || saving;
  const siteInteractive = !!model && model.master && model.supported && !saving;

  const iconButton = cn(
    "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
    FOCUS_RING,
  );

  if (route === "settings") {
    return (
      <main className="flex w-80 flex-col gap-4 rounded-lg bg-background p-4 text-foreground">
        <header className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Back"
            onClick={() => {
              setRoute("main");
              void reloadModel();
            }}
            className={iconButton}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </button>
          <h1 className="text-sm font-semibold">Settings</h1>
        </header>
        <SettingsPanel
          theme={theme}
          onThemeChange={setTheme}
          sites={sites}
          shortcut={shortcut}
          onManageSites={() => setRoute("sites")}
          onReset={onResetAll}
        />
      </main>
    );
  }

  if (route === "sites") {
    return (
      <main className="flex w-80 flex-col gap-4 rounded-lg bg-background p-4 text-foreground">
        <header className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Back"
            onClick={() => setRoute("settings")}
            className={iconButton}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </button>
          <h1 className="text-sm font-semibold">Sites</h1>
        </header>
        <SitesPanel sites={sites} onRemove={onRemoveSite} />
      </main>
    );
  }

  return (
    <main className="flex w-80 flex-col gap-4 rounded-lg bg-background p-4 text-foreground">
      <header className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn("size-2 rounded-full", DOT[view])}
        />
        <h1 className="text-sm font-semibold">RTL Helper</h1>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => setRoute("settings")}
          className={cn("ml-auto", iconButton)}
        >
          <Settings aria-hidden="true" className="size-4" />
        </button>
      </header>

      <div className="flex items-center justify-between">
        <Label htmlFor="master-switch" className="font-normal">
          Extension
        </Label>
        <Switch
          id="master-switch"
          aria-label="Extension Toggle"
          checked={model?.master ?? false}
          disabled={controlsDisabled}
          onCheckedChange={onToggleMaster}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="rtl-mode-switch" className="font-normal">
                RTL Mode
              </Label>
              {shortcut ? (
                <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[10px] leading-none text-muted-foreground">
                  {shortcut}
                </kbd>
              ) : null}
            </div>
            <Switch
              id="rtl-mode-switch"
              aria-label="RTL Mode Toggle"
              aria-describedby="rtl-mode-desc page-status"
              checked={model?.siteEnabled ?? false}
              disabled={controlsDisabled}
              aria-disabled={!loading && !siteInteractive ? true : undefined}
              onCheckedChange={siteInteractive ? onToggleSite : () => {}}
            />
          </div>
          <p
            id="rtl-mode-desc"
            className="text-[11px] leading-[1.35] text-muted-foreground"
          >
            Right-to-left for content text.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="force-rtl-switch" className="font-normal">
              Force RTL Layout
            </Label>
            <Switch
              id="force-rtl-switch"
              aria-label="Force RTL Layout Toggle"
              aria-describedby="force-rtl-desc page-status"
              checked={model?.forceEnabled ?? false}
              disabled={controlsDisabled}
              aria-disabled={!loading && !siteInteractive ? true : undefined}
              onCheckedChange={siteInteractive ? onToggleForce : () => {}}
            />
          </div>
          <p
            id="force-rtl-desc"
            className="text-[11px] leading-[1.35] text-muted-foreground"
          >
            Mirrors the whole page layout.
          </p>
        </div>

        <p
          id="page-status"
          className={cn(
            "text-[11px] leading-[1.35]",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error ?? statusOf(view, model?.hostname)}
        </p>
      </div>
    </main>
  );
}
