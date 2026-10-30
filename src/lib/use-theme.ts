"use client";
import { useEffect, useSyncExternalStore } from "react";
let memoryTheme: boolean | null = null;
function snapshot() {
  if (memoryTheme !== null) return memoryTheme;
  try {
    const stored = localStorage.getItem("moneyflow-theme");
    if (stored) return stored === "dark";
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
function subscribe(listener: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const storage = (e: StorageEvent) => {
    if (e.key === "moneyflow-theme") {
      memoryTheme = null;
      listener();
    }
  };
  media.addEventListener("change", listener);
  window.addEventListener("moneyflow-theme-change", listener);
  window.addEventListener("storage", storage);
  return () => {
    media.removeEventListener("change", listener);
    window.removeEventListener("moneyflow-theme-change", listener);
    window.removeEventListener("storage", storage);
  };
}
export function useTheme() {
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  function toggleTheme() {
    memoryTheme = !dark;
    try {
      localStorage.setItem("moneyflow-theme", memoryTheme ? "dark" : "light");
    } catch {}
    window.dispatchEvent(new Event("moneyflow-theme-change"));
  }
  return { dark, toggleTheme };
}
