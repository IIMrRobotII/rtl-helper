export type ThemePref = "system" | "light" | "dark";

const STORAGE_KEY = "popup-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export function isThemePref(value: unknown): value is ThemePref {
  return value === "system" || value === "light" || value === "dark";
}

export async function loadTheme(): Promise<ThemePref> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const value = stored[STORAGE_KEY];
    return isThemePref(value) ? value : "system";
  } catch {
    return "system";
  }
}

export async function saveTheme(pref: ThemePref): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: pref });
}

function prefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

function resolveDark(pref: ThemePref): boolean {
  return pref === "dark" || (pref === "system" && prefersDark());
}

export function applyTheme(pref: ThemePref): void {
  document.documentElement.classList.toggle("dark", resolveDark(pref));
}
