import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAll,
  getState,
  managedSites,
  removeSite,
  setForceEnabled,
  setMaster,
  setSiteEnabled,
} from "./storage";

let store: Record<string, unknown>;

beforeEach(() => {
  store = {};
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: async (keys: string | string[]) => {
          const names = Array.isArray(keys) ? keys : [keys];
          const out: Record<string, unknown> = {};
          for (const name of names) if (name in store) out[name] = store[name];
          return out;
        },
        set: async (values: Record<string, unknown>) => {
          Object.assign(store, values);
        },
        clear: async () => {
          store = {};
        },
      },
    },
  };
});

describe("clearAll", () => {
  it("wipes site, force, and master state back to fresh-install defaults", async () => {
    await setMaster(false);
    await setSiteEnabled("https://example.com", true);
    await setForceEnabled("https://example.com", true);

    await clearAll();

    const state = await getState();
    expect(state.master).toBe(true);
    expect(state.sites).toEqual({});
    expect(state.forceSites).toEqual({});
    expect(store).toEqual({});
  });
});

describe("managedSites", () => {
  it("returns the sorted union of RTL and Force origins with per-mode flags", async () => {
    await setSiteEnabled("https://b.com", true);
    await setForceEnabled("https://a.com", true);
    await setForceEnabled("https://b.com", true);

    expect(managedSites(await getState())).toEqual([
      { origin: "https://a.com", rtl: false, force: true },
      { origin: "https://b.com", rtl: true, force: true },
    ]);
  });
});

describe("getState", () => {
  it("ignores corrupt site map entries", async () => {
    store["rtl-sites"] = {
      "https://valid.com": true,
      "https://disabled.com": false,
      "https://string.com": "true",
      "https://path.com/page": true,
      "ftp://files.com": true,
      "not a url": true,
    };
    store["rtl-force-sites"] = {
      "http://force.test": true,
      "https://slash.test/": true,
      "https://off.test": false,
    };

    const state = await getState();

    expect(state.sites).toEqual({ "https://valid.com": true });
    expect(state.forceSites).toEqual({ "http://force.test": true });
  });
});

describe("removeSite", () => {
  it("forgets an origin across both RTL and Force maps", async () => {
    await setSiteEnabled("https://a.com", true);
    await setForceEnabled("https://a.com", true);
    await setSiteEnabled("https://b.com", true);

    await removeSite("https://a.com");

    const state = await getState();
    expect(state.sites).toEqual({ "https://b.com": true });
    expect(state.forceSites).toEqual({});
  });
});
