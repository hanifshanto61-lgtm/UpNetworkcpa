
"use client";

import { useEffect, useRef } from "react";

export function useAutoRefresh(
  refresh: () => void | Promise<void>,
  intervalMs: number = 15000
) {
  const refreshRef = useRef(refresh);
  const busyRef = useRef(false);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (intervalMs <= 0) return;

    let active = true;

    const run = async () => {
      if (
        !active ||
        document.visibilityState !== "visible" ||
        busyRef.current
      ) return;

      busyRef.current = true;

      try {
        await refreshRef.current();
      } catch (error) {
        console.error("Auto refresh failed:", error);
      } finally {
        busyRef.current = false;
      }
    };

    const timer = window.setInterval(run, intervalMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [intervalMs]);
}
