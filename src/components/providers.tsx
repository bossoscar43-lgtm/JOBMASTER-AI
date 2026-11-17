"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, X, Info, AlertTriangle } from "lucide-react";
import { translate, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";
interface Toast { id: string; message: string; kind: "success" | "error" | "info" }

interface AppContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  toast: (message: string, kind?: Toast["kind"]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp doit être utilisé dans Providers");
  return ctx;
}

export function Providers({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const savedTheme = (localStorage.getItem("jm-theme") as Theme) || "system";
    const savedLang = (localStorage.getItem("jm-lang") as Locale) || "fr";
    setThemeState(savedTheme);
    setLocaleState(savedLang);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("jm-theme", t);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("jm-lang", l);
    document.documentElement.lang = l;
  }, []);

  const toast = useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4500);
  }, []);

  const value: AppContextValue = {
    theme, setTheme, locale, setLocale,
    t: (key) => translate(locale, key), toast,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((x) => (
          <div key={x.id} className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 text-sm shadow-xl backdrop-blur-xl animate-fade-up",
            "bg-white/95 dark:bg-[#151735]/95",
            x.kind === "success" && "border-emerald-500/40",
            x.kind === "error" && "border-rose-500/40",
            x.kind === "info" && "border-indigo-500/40"
          )}>
            {x.kind === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> :
              x.kind === "error" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" /> :
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />}
            <span className="flex-1 leading-snug">{x.message}</span>
            <button onClick={() => setToasts((p) => p.filter((y) => y.id !== x.id))} className="opacity-50 hover:opacity-100" aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}
