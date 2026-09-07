import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "eye";

type Ctx = { theme: Theme; setTheme: (t: Theme) => void; mounted: boolean };

const ThemeContext = createContext<Ctx>({ theme: "light", setTheme: () => {}, mounted: false });

const KEY = "bv-theme";

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.classList.remove("dark", "eye");
  if (theme !== "light") el.classList.add(theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let initial: Theme = "light";
    try {
      const saved = localStorage.getItem(KEY) as Theme | null;
      if (saved === "light" || saved === "dark" || saved === "eye") initial = saved;
      else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) initial = "dark";
    } catch { /* ignore */ }
    setThemeState(initial);
    apply(initial);
    setMounted(true);
  }, []);

  const value = useMemo<Ctx>(() => ({
    theme,
    mounted,
    setTheme: (t) => {
      setThemeState(t);
      apply(t);
      try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
    },
  }), [theme, mounted]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
