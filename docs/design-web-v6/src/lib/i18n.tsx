import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "bn" | "en";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (bn: string, en: string) => string;
};

const LangContext = createContext<Ctx>({ lang: "bn", setLang: () => {}, t: (bn) => bn });

const KEY = "bv-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("bn");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Lang | null;
      if (saved === "bn" || saved === "en") setLangState(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang: (l) => {
      setLangState(l);
      try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
    },
    t: (bn, en) => (lang === "bn" ? bn : en),
  }), [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
