"use client";

import { Sun, Moon } from "lucide-react";
import { useAffiliateTheme } from "./theme-context";

export default function AffiliateThemeToggle() {
  const { theme, toggleTheme } = useAffiliateTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed right-4 top-4 z-[100] flex h-11 items-center gap-2 rounded-full border border-white/20 bg-slate-900/90 px-4 text-sm font-semibold text-white shadow-xl backdrop-blur transition hover:scale-105"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
      <span>{dark ? "White Mode" : "Dark Mode"}</span>
    </button>
  );
}