"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./dashboard.module.css";

export type MetricFormat =
  | "integer"
  | "currency"
  | "percent";

function useReducedMotion() {
  const [reduced, setReduced] =
    useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const update = () =>
      setReduced(query.matches);

    update();

    query.addEventListener("change", update);

    return () =>
      query.removeEventListener(
        "change",
        update
      );
  }, []);

  return reduced;
}

function formatMetric(
  value: number,
  format: MetricFormat
) {
  if (format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (format === "percent") {
    return `${value.toFixed(2)}%`;
  }

  return Math.round(value).toLocaleString(
    "en-US"
  );
}

export function AnimatedMetric({
  value,
  format = "integer",
}: {
  value: number;
  format?: MetricFormat;
}) {
  const target = Number.isFinite(value)
    ? value
    : 0;

  const [display, setDisplay] =
    useState(target);

  const current = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced === null) return;

    if (
      reduced ||
      document.visibilityState === "hidden"
    ) {
      current.current = target;
      setDisplay(target);
      return;
    }

    const from = current.current;

    if (from === target) return;

    let frame = 0;
    let started: number | null = null;

    const tick = (time: number) => {
      if (started === null) {
        started = time;
      }

      const progress = Math.min(
        1,
        (time - started) / 650
      );

      const eased =
        1 - Math.pow(1 - progress, 3);

      current.current =
        progress === 1
          ? target
          : from + (target - from) * eased;

      setDisplay(current.current);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () =>
      cancelAnimationFrame(frame);
  }, [target, reduced]);

  return (
    <span
      className={styles.metricNumber}
      aria-label={formatMetric(
        target,
        format
      )}
    >
      <span aria-hidden="true">
        {formatMetric(
          reduced === null || reduced
            ? target
            : display,
          format
        )}
      </span>
    </span>
  );
}

export function useMetricChanged(
  value: number | string
) {
  const previous = useRef(value);

  const [changed, setChanged] =
    useState(false);

  useEffect(() => {
    if (
      Object.is(
        previous.current,
        value
      )
    ) {
      return;
    }

    previous.current = value;
    setChanged(true);

    const timer = window.setTimeout(
      () => setChanged(false),
      900
    );

    return () =>
      window.clearTimeout(timer);
  }, [value]);

  return changed;
}

export function DashboardSkeleton({
  dark,
}: {
  dark: boolean;
}) {
  return (
    <main
      className={`${styles.dashboard} ${styles.loading}`}
      data-dashboard-theme={
        dark ? "dark" : "light"
      }
      aria-busy="true"
      aria-label="Loading affiliate dashboard"
    >
      <div
        className={styles.skeletonWrap}
      >
        <p
          role="status"
          className={styles.loadingLabel}
        >
          Loading your dashboard…
        </p>

        <div
          className={`${styles.skeletonBlock} ${styles.skeletonHero}`}
          aria-hidden="true"
        />

        <div
          className={styles.skeletonGrid}
          aria-hidden="true"
        >
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className={
                styles.skeletonBlock
              }
            />
          ))}
        </div>

        <div
          className={`${styles.skeletonBlock} ${styles.skeletonTable}`}
          aria-hidden="true"
        />
      </div>
    </main>
  );
}