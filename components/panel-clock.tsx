"use client";

import { useEffect, useState } from "react";

const TIME_ZONE = "America/New_York";

export default function PanelClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) return null;

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(now);

  const zone = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    timeZoneName: "short",
  }).formatToParts(now).find(p => p.type === "timeZoneName")?.value;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl border border-purple-300/30 bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-500 px-2 py-3 text-center text-white shadow-lg sm:min-w-[230px] sm:flex-none sm:px-5">
      <div className="text-[12px] font-black tracking-tight sm:text-xl">
        {time}
      </div>
      <div className="mt-1 text-[9px] font-bold sm:text-xs">
        {date} · {zone}
      </div>
      <div className="mt-1 text-[8px] font-semibold uppercase tracking-widest text-white/80">
        New York Live Time
      </div>
    </div>
  );
}