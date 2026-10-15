"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Target,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

type Offer = {
  id: string;
  name: string;
  description?: string | null;
  country?: string | null;
  category?: string | null;
  payout?: number | null;
  currency?: string | null;
  image_url?: string | null;
  access_status?: string;
};

export default function DashboardOffers({
  dark,
}: {
  dark: boolean;
}) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);

  const requestRef = useRef<AbortController | null>(null);
  const newestRef = useRef("");

  async function loadOffers() {
    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const {
        data,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (controller.signal.aborted) return;

      const token = data.session?.access_token;

      if (sessionError || !token) {
        throw new Error("Please log in to view offers.");
      }

      const response = await fetch("/api/affiliate/offers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: controller.signal,
      });

      const result = await response.json();

      if (
        !response.ok ||
        !result.success ||
        !Array.isArray(result.offers)
      ) {
        throw new Error(
          result.error || "Unable to load offers."
        );
      }

      if (controller.signal.aborted) return;

      // The API returns active offers newest first.
      const next: Offer[] = result.offers;
      const newestId = next[0]?.id || "";
      const hasNewFirst = newestId !== newestRef.current;

      newestRef.current = newestId;

      setOffers(next);

      setActiveId((current) => {
        if (
          hasNewFirst ||
          !next.some((offer) => offer.id === current)
        ) {
          return newestId;
        }

        return current;
      });

      setError("");
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load offers."
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadOffers();

    return () => requestRef.current?.abort();
  }, []);

  // Refresh offer data without reloading the dashboard.
  useAutoRefresh(loadOffers, 15000);

  // Automatically show the next offer every five seconds.
  useEffect(() => {
    if (
      offers.length < 2 ||
      paused ||
      hovered ||
      keyboardFocused
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;

      setActiveId((current) => {
        const currentIndex = offers.findIndex(
          (offer) => offer.id === current
        );

        const nextIndex =
          (currentIndex + 1) % offers.length;

        return offers[nextIndex].id;
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [
    offers,
    paused,
    hovered,
    keyboardFocused,
  ]);

  const index = Math.max(
    0,
    offers.findIndex((offer) => offer.id === activeId)
  );

  const offer = offers[index];

  const muted = dark
    ? "text-slate-400"
    : "text-slate-500";

  const control = `flex h-10 w-10 items-center justify-center rounded-xl border transition ${
    dark
      ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
  }`;

  function move(direction: number) {
    if (offers.length < 2) return;

    // Keep a manually selected offer visible until Play is pressed.
    setPaused(true);

    setActiveId((current) => {
      const currentIndex = Math.max(
        0,
        offers.findIndex((item) => item.id === current)
      );

      const nextIndex =
        (currentIndex + direction + offers.length) %
        offers.length;

      return offers[nextIndex].id;
    });
  }

  function togglePlayback() {
    setPaused((current) => !current);
  }

  return (
    <section
      aria-label="Latest offers"
      aria-roledescription="carousel"
      onPointerEnter={(event) => {
        // Touch interaction must not create a sticky hover pause.
        if (event.pointerType === "mouse") {
          setHovered(true);
        }
      }}
      onPointerLeave={() => setHovered(false)}
      onPointerCancel={() => setHovered(false)}
      onFocusCapture={(event) => {
        const target = event.target as HTMLElement;

        if (target.matches(":focus-visible")) {
          setKeyboardFocused(true);
        }
      }}
      onBlurCapture={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget as Node | null
          )
        ) {
          setKeyboardFocused(false);
        }
      }}
      className={`overflow-hidden rounded-2xl border p-5 sm:p-6 ${
        dark
          ? "border-cyan-400/15 bg-slate-900/70 text-white"
          : "border-cyan-100 bg-white text-slate-900"
      }`}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-500">
            <Target size={22} />
          </div>

          <div>
            <h2 className="text-lg font-bold">
              Latest Offers
            </h2>

            <p className={`mt-1 text-xs ${muted}`}>
              Newest offers first · Updates automatically
            </p>
          </div>
        </div>

        <Link
          href="/affiliate/offers"
          className="text-sm font-semibold text-cyan-500"
        >
          View All Offers →
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className={`mb-4 rounded-xl bg-amber-500/10 p-3 text-sm ${
            dark ? "text-amber-300" : "text-amber-700"
          }`}
        >
          {offers.length
            ? "Could not refresh offers. Showing the last loaded offers."
            : error}

          <button
            type="button"
            onClick={() => void loadOffers()}
            className="ml-3 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p
          role="status"
          className={`py-10 text-center text-sm ${muted}`}
        >
          Loading offers...
        </p>
      ) : !offer ? (
        <p className={`py-10 text-center text-sm ${muted}`}>
          {error
            ? "Offers are currently unavailable."
            : "No active offers yet. New offers will appear here automatically."}
        </p>
      ) : (
        <>
          <article
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${offers.length}`}
            className="grid gap-5 sm:grid-cols-[180px_1fr]"
          >
            <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-500/15">
              {offer.image_url ? (
                <img
                  key={offer.image_url}
                  src={offer.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Target
                  size={60}
                  className="text-cyan-500/40"
                />
              )}
            </div>

            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2 text-xs">
                {index === 0 && (
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-cyan-500">
                    Latest
                  </span>
                )}

                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-500">
                  Active
                </span>

                <span
                  className={`rounded-full px-3 py-1 ${
                    dark
                      ? "bg-white/5"
                      : "bg-slate-100"
                  }`}
                >
                  {offer.country || "Worldwide"}
                </span>

                {offer.category && (
                  <span className={`px-2 py-1 ${muted}`}>
                    {offer.category}
                  </span>
                )}
              </div>

              <h3 className="break-words text-xl font-bold">
                {offer.name}
              </h3>

              <p className="mt-2 text-lg font-bold text-emerald-500">
                {offer.currency || "USD"}{" "}
                {Number(offer.payout || 0).toFixed(2)}{" "}

                <span
                  className={`text-xs font-normal ${muted}`}
                >
                  per conversion
                </span>
              </p>

              {offer.description && (
                <p
                  className={`mt-2 line-clamp-2 text-sm ${muted}`}
                >
                  {offer.description}
                </p>
              )}

              <Link
                href="/affiliate/offers"
                className="mt-4 inline-flex rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950"
              >
                {offer.access_status === "approved"
                  ? "View Offer & Tracking Link"
                  : offer.access_status === "pending"
                    ? "View Pending Request"
                    : "View Offer / Request Access"}
              </Link>
            </div>
          </article>

          <div
            className={`mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${
              dark
                ? "border-white/10"
                : "border-slate-200"
            }`}
          >
            <div>
              <p className={`text-xs ${muted}`}>
                Offer {index + 1} of {offers.length}
              </p>

              {offers.length > 1 && (
                <p className={`mt-1 text-[10px] ${muted}`}>
                  {paused
                    ? "Paused · Press Play to continue"
                    : hovered || keyboardFocused
                      ? "Paused while interacting"
                      : "Auto change every 5 seconds"}
                </p>
              )}
            </div>

            {offers.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous offer"
                  onClick={() => move(-1)}
                  className={control}
                >
                  <ChevronLeft size={17} />
                </button>

                <button
                  type="button"
                  aria-label={
                    paused
                      ? "Start automatic offers"
                      : "Pause automatic offers"
                  }
                  onClick={togglePlayback}
                  className={control}
                >
                  {paused ? (
                    <Play size={17} />
                  ) : (
                    <Pause size={17} />
                  )}
                </button>

                <button
                  type="button"
                  aria-label="Next offer"
                  onClick={() => move(1)}
                  className={control}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}