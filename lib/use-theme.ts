import { useEffect, useState } from "react";
import { applyTheme, loadTheme, saveTheme, type ThemePref } from "@/lib/theme";

export function useTheme(): {
  theme: ThemePref;
  setTheme: (next: ThemePref) => void;
  resetTheme: () => void;
} {
  const [theme, setThemeState] = useState<ThemePref>("system");

  useEffect(() => {
    let active = true;
    void (async () => {
      const stored = await loadTheme();
      if (!active) return;
      setThemeState(stored);
      applyTheme(stored);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = (next: ThemePref) => {
    const previous = theme;
    setThemeState(next);
    applyTheme(next);
    void (async () => {
      try {
        await saveTheme(next);
      } catch {
        setThemeState(previous);
        applyTheme(previous);
      }
    })();
  };

  const resetTheme = () => {
    setThemeState("system");
    applyTheme("system");
  };

  return { theme, setTheme, resetTheme };
}
