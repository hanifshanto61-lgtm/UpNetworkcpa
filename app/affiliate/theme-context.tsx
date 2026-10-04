"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AffiliateTheme = "dark" | "light";

type AffiliateThemeContextValue = {
  theme: AffiliateTheme;
  setTheme: (theme: AffiliateTheme) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "affiliate-theme";

const AffiliateThemeContext =
  createContext<AffiliateThemeContextValue | undefined>(undefined);

export function AffiliateThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, setThemeState] =
    useState<AffiliateTheme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === "dark" || saved === "light") {
      setThemeState(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);

    document.documentElement.dataset.affiliateTheme = theme;

    if (theme === "dark") {
      document.documentElement.classList.add("affiliate-dark");
      document.documentElement.classList.remove("affiliate-light");
    } else {
      document.documentElement.classList.add("affiliate-light");
      document.documentElement.classList.remove("affiliate-dark");
    }
  }, [theme]);

  function setTheme(nextTheme: AffiliateTheme) {
    setThemeState(nextTheme);
  }

  function toggleTheme() {
    setThemeState((current) =>
      current === "dark" ? "light" : "dark"
    );
  }

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme]
  );

  return (
    <AffiliateThemeContext.Provider value={value}>
      {children}
    </AffiliateThemeContext.Provider>
  );
}

export function useAffiliateTheme() {
  const context = useContext(AffiliateThemeContext);

  if (!context) {
    throw new Error(
      "useAffiliateTheme must be used inside AffiliateThemeProvider"
    );
  }

  return context;
}
