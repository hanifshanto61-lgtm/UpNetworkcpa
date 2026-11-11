"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const TIME_ZONE = "America/New_York";

export default function PanelClock() {
  const pathname = usePathname();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const isAdmin = pathname.startsWith("/admin");
  const isAffiliate = pathname.startsWith("/affiliate");

  const isLoginOrPublicPage =
    pathname === "/admin/login" ||
    pathname === "/affiliate/login" ||
    pathname === "/affiliate/register" ||
    pathname.includes("/forgot-password") ||
    pathname.includes("/reset-password");

  if (!isAdmin && !isAffiliate) return null;
  if (isLoginOrPublicPage || !now) return null;

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
    day: "2-digit",
    year: "numeric",
  }).format(now);

  const zone = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    timeZoneName: "short",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;

  return (
    <div
      style={{
        position: "fixed",
        right: "12px",
        bottom: "12px",
        zIndex: 9999,
        padding: "9px 13px",
        borderRadius: "12px",
        background: "rgba(15, 23, 42, 0.94)",
        color: "#ffffff",
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
        fontFamily: "Arial, sans-serif",
        textAlign: "right",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "0.4px",
        }}
      >
        {time} {zone}
      </div>

      <div
        style={{
          marginTop: "3px",
          fontSize: "10px",
          opacity: 0.8,
        }}
      >
        {date}
      </div>
    </div>
  );
}