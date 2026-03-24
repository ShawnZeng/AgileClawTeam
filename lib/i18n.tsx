"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import zh from "@/lib/locales/zh";
import en from "@/lib/locales/en";

export type Lang = "zh" | "en";

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "zh",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("zh");

  useEffect(() => {
    // 1. Check localStorage first
    const stored = localStorage.getItem("lang") as Lang | null;
    if (stored === "zh" || stored === "en") {
      setLangState(stored);
    } else {
      // 2. Fall back to browser/system language
      const browserLang = navigator.language ?? "";
      setLangState(browserLang.toLowerCase().startsWith("zh") ? "zh" : "en");
    }
  }, []);

  useEffect(() => {
    // Keep <html lang> in sync
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const dict = lang === "zh" ? zh : en;
      let str = dict[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
        }
      }
      return str;
    },
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
