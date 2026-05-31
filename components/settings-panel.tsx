import { useState } from "react";
import { ChevronRight, ExternalLink, Globe, RotateCcw } from "lucide-react";
import { ThemeControl } from "@/components/theme-control";
import { Label } from "@/components/ui/label";
import type { ThemePref } from "@/lib/theme";
import type { ManagedSite } from "@/lib/storage";
import { cn, FOCUS_RING } from "@/lib/utils";

const REPO_URL = "https://github.com/IIMrRobotII/RTL-Helper";
const PRIVACY_URL = "https://iimrrobotii.github.io/RTL-Helper/privacy/";

export function SettingsPanel({
  theme,
  onThemeChange,
  sites,
  shortcut,
  onManageSites,
  onReset,
}: {
  theme: ThemePref;
  onThemeChange: (next: ThemePref) => void;
  sites: ManagedSite[];
  shortcut?: string;
  onManageSites: () => void;
  onReset: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  const runReset = () => {
    setBusy(true);
    setFailed(false);
    void (async () => {
      try {
        await onReset();
        setConfirming(false);
        setDone(true);
      } catch {
        setFailed(true);
      } finally {
        setBusy(false);
      }
    })();
  };

  const openShortcuts = () => {
    void chrome.tabs
      .create({ url: "chrome://extensions/shortcuts" })
      .catch(() => {});
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label className="font-normal">Theme</Label>
        <ThemeControl value={theme} onValueChange={onThemeChange} />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="font-normal">Sites</Label>
        {sites.length === 0 ? (
          <p className="text-[11px] leading-[1.35] text-muted-foreground">
            No sites enabled yet.
          </p>
        ) : (
          <button
            type="button"
            onClick={onManageSites}
            className={cn(
              "flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted",
              FOCUS_RING,
            )}
          >
            <Globe
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="flex-1 text-left">Manage sites</span>
            <span className="text-muted-foreground">{sites.length}</span>
            <ChevronRight
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label className="font-normal">Keyboard shortcut</Label>
        <button
          type="button"
          onClick={openShortcuts}
          aria-label="Change keyboard shortcut in Chrome settings"
          className={cn(
            "flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted",
            FOCUS_RING,
          )}
        >
          <span className="flex-1 text-left">Toggle RTL Mode</span>
          {shortcut ? (
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
              {shortcut}
            </kbd>
          ) : (
            <span className="text-[11px] text-muted-foreground">Not set</span>
          )}
          <ExternalLink
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </button>
      </div>

      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer noopener"
        className={cn(
          "flex items-center justify-between rounded-md border border-border px-3 py-2",
          "text-sm text-foreground transition-colors hover:bg-muted",
          FOCUS_RING,
        )}
      >
        <span>View source on GitHub</span>
        <ExternalLink
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
      </a>

      <a
        href={PRIVACY_URL}
        target="_blank"
        rel="noreferrer noopener"
        className={cn(
          "flex items-center justify-between rounded-md border border-border px-3 py-2",
          "text-sm text-foreground transition-colors hover:bg-muted",
          FOCUS_RING,
        )}
      >
        <span>Privacy policy</span>
        <ExternalLink
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
      </a>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <Label className="font-normal">Reset</Label>
          <p className="text-[11px] leading-[1.35] text-muted-foreground">
            Erase all saved sites and preferences, like a fresh install.
          </p>
        </div>

        {done ? (
          <p
            role="status"
            className="text-[11px] leading-[1.35] text-muted-foreground"
          >
            All data cleared.
          </p>
        ) : confirming ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className={cn(
                  "flex-1 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  FOCUS_RING,
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runReset}
                disabled={busy}
                className={cn(
                  "flex-1 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  FOCUS_RING,
                )}
              >
                {busy ? "Resetting…" : "Reset"}
              </button>
            </div>
            {failed ? (
              <p
                role="alert"
                className="text-[11px] leading-[1.35] text-destructive"
              >
                Couldn&apos;t clear data. Try again.
              </p>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md border border-destructive/40 px-3 py-1.5",
              "text-sm font-medium text-destructive transition-colors hover:bg-destructive/10",
              FOCUS_RING,
            )}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Reset all data
          </button>
        )}
      </div>
    </div>
  );
}
