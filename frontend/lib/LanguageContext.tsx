"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Lang, type Translations, getT, LANGUAGES } from "./i18n";
// Lang type: "en" | "tr" | "ko" | "es" | "zh" | "ar"  (pt removed, zh added)

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  dir: "ltr" | "rtl";
}

const Ctx = createContext<LangCtx>({
  lang: "en",
  setLang: () => {},
  t: getT("en"),
  dir: "ltr",
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    // 1. Manual override: user already chose a language → always respect it
    const saved = localStorage.getItem("abs_lang") as Lang | null;
    if (saved && LANGUAGES.find(l => l.code === saved)) {
      setLangState(saved);
      document.documentElement.dir = LANGUAGES.find(x => x.code === saved)?.dir ?? "ltr";
      return;
    }

    // 2. First visit: detect from browser preferred languages
    // navigator.languages = ["tr-TR", "tr", "en-US", "en"] etc.
    const browserLangs = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];

    const supported = LANGUAGES.map(l => l.code);
    let detected: Lang = "en";

    for (const bl of browserLangs) {
      // exact match first (e.g. "tr"), then prefix match (e.g. "tr-TR" → "tr")
      const exact  = supported.find(c => c === bl.toLowerCase()) as Lang | undefined;
      const prefix = supported.find(c => bl.toLowerCase().startsWith(c)) as Lang | undefined;
      const match  = exact ?? prefix;
      if (match) { detected = match; break; }
    }

    setLangState(detected);
    document.documentElement.dir = LANGUAGES.find(x => x.code === detected)?.dir ?? "ltr";
    // Do NOT write to localStorage here — only save on explicit user selection
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("abs_lang", l);
    // RTL support
    document.documentElement.dir = LANGUAGES.find(x => x.code === l)?.dir ?? "ltr";
  };

  const dir = LANGUAGES.find(x => x.code === lang)?.dir ?? "ltr";

  return (
    <Ctx.Provider value={{ lang, setLang, t: getT(lang), dir }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLang() {
  return useContext(Ctx);
}
