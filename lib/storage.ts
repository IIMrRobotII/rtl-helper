export interface RtlState {
  master: boolean;
  sites: Record<string, true>;
  forceSites: Record<string, true>;
}

export interface ManagedSite {
  origin: string;
  rtl: boolean;
  force: boolean;
}

const MASTER_KEY = "rtl-master";
const SITES_KEY = "rtl-sites";
const FORCE_SITES_KEY = "rtl-force-sites";
const DEFAULT_MASTER = true;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.origin === origin
    );
  } catch {
    return false;
  }
}

function sanitizeSitesMap(value: unknown): Record<string, true> {
  const sites: Record<string, true> = {};
  if (!isRecord(value)) return sites;

  for (const [origin, enabled] of Object.entries(value)) {
    if (enabled === true && isHttpOrigin(origin)) sites[origin] = true;
  }

  return sites;
}

export async function getState(): Promise<RtlState> {
  try {
    const stored = await chrome.storage.local.get([
      MASTER_KEY,
      SITES_KEY,
      FORCE_SITES_KEY,
    ]);
    return {
      master:
        typeof stored[MASTER_KEY] === "boolean"
          ? stored[MASTER_KEY]
          : DEFAULT_MASTER,
      sites: sanitizeSitesMap(stored[SITES_KEY]),
      forceSites: sanitizeSitesMap(stored[FORCE_SITES_KEY]),
    };
  } catch {
    return { master: DEFAULT_MASTER, sites: {}, forceSites: {} };
  }
}

export async function setMaster(on: boolean): Promise<void> {
  await chrome.storage.local.set({ [MASTER_KEY]: on });
}

export async function setSiteEnabled(
  origin: string,
  on: boolean,
): Promise<void> {
  const { sites } = await getState();
  if (on) sites[origin] = true;
  else delete sites[origin];
  await chrome.storage.local.set({ [SITES_KEY]: sites });
}

export async function setForceEnabled(
  origin: string,
  on: boolean,
): Promise<void> {
  const { forceSites } = await getState();
  if (on) forceSites[origin] = true;
  else delete forceSites[origin];
  await chrome.storage.local.set({ [FORCE_SITES_KEY]: forceSites });
}

export async function removeSite(origin: string): Promise<void> {
  const { sites, forceSites } = await getState();
  delete sites[origin];
  delete forceSites[origin];
  await chrome.storage.local.set({
    [SITES_KEY]: sites,
    [FORCE_SITES_KEY]: forceSites,
  });
}

export async function clearAll(): Promise<void> {
  await chrome.storage.local.clear();
}

export function managedSites(state: RtlState): ManagedSite[] {
  const origins = new Set([
    ...Object.keys(state.sites),
    ...Object.keys(state.forceSites),
  ]);
  return [...origins].sort().map((origin) => ({
    origin,
    rtl: state.sites[origin] === true,
    force: state.forceSites[origin] === true,
  }));
}

export function isActiveFor(
  state: RtlState,
  origin: string | undefined,
): boolean {
  return state.master && origin !== undefined && state.sites[origin] === true;
}

export function isForceActiveFor(
  state: RtlState,
  origin: string | undefined,
): boolean {
  return (
    state.master && origin !== undefined && state.forceSites[origin] === true
  );
}

export function subscribe(listener: (state: RtlState) => void): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area !== "local") return;
    if (
      !(MASTER_KEY in changes) &&
      !(SITES_KEY in changes) &&
      !(FORCE_SITES_KEY in changes)
    )
      return;
    void (async () => listener(await getState()))();
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
