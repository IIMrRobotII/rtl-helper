import { useMemo, useState } from "react";
import { Globe, Search, X } from "lucide-react";
import type { ManagedSite } from "@/lib/storage";
import { cn, FOCUS_RING } from "@/lib/utils";

function hostnameOf(origin: string): string {
  try {
    return new URL(origin).hostname;
  } catch {
    return origin;
  }
}

function Pill({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
      {children}
    </span>
  );
}

export function SitesPanel({
  sites,
  onRemove,
}: {
  sites: ManagedSite[];
  onRemove: (origin: string) => void;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((site) =>
      hostnameOf(site.origin).toLowerCase().includes(q),
    );
  }, [sites, query]);

  if (sites.length === 0) {
    return (
      <p className="text-[11px] leading-[1.35] text-muted-foreground">
        No sites enabled yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter sites"
          aria-label="Filter sites"
          className={cn(
            "w-full rounded-md border border-border bg-transparent py-1.5 pl-7 pr-2 text-sm placeholder:text-muted-foreground",
            FOCUS_RING,
          )}
        />
      </div>
      {visible.length === 0 ? (
        <p className="text-[11px] leading-[1.35] text-muted-foreground">
          No matches.
        </p>
      ) : (
        <ul className="flex max-h-[26rem] flex-col gap-1 overflow-y-auto">
          {visible.map((site) => {
            const host = hostnameOf(site.origin);
            return (
              <li
                key={site.origin}
                className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
              >
                <Globe
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1 truncate text-sm" title={host}>
                  {host}
                </span>
                {site.rtl && <Pill>RTL</Pill>}
                {site.force && <Pill>Force</Pill>}
                <button
                  type="button"
                  aria-label={`Remove ${host}`}
                  onClick={() => onRemove(site.origin)}
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    FOCUS_RING,
                  )}
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
