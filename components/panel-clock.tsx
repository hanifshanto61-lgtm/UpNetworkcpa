"use client";

import { useEffect, useRef, useState } from "react";

const TIME_ZONE = "America/New_York";

type Position = {
  x: number;
  y: number;
};

export default function PanelClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const dragRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const movedRef = useRef(false);

  useEffect(() => {
    setNow(new Date());

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    const width = window.innerWidth;
    const height = window.innerHeight;

    setPosition({
      x: Math.max(8, width - 112),
      y: Math.max(8, height - 105),
    });

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!position) return;

    const widgetWidth = expanded ? 215 : 104;
    const widgetHeight = expanded ? 88 : 46;

    setPosition((current) => {
      if (!current) return current;

      return {
        x: Math.max(
          8,
          Math.min(current.x, window.innerWidth - widgetWidth - 8)
        ),
        y: Math.max(
          8,
          Math.min(current.y, window.innerHeight - widgetHeight - 8)
        ),
      };
    });
  }, [expanded]);

  if (!now || !position) return null;

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  const fullTime = new Intl.DateTimeFormat("en-US", {
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
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;

  function handlePointerDown(
    event: React.PointerEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    movedRef.current = false;

    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: position.x,
      startY: position.y,
    };
  }

  function handlePointerMove(
    event: React.PointerEvent<HTMLButtonElement>
  ) {
    if (!dragRef.current) return;

    const deltaX = event.clientX - dragRef.current.pointerX;
    const deltaY = event.clientY - dragRef.current.pointerY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      movedRef.current = true;
    }

    const widgetWidth = expanded ? 215 : 104;
    const widgetHeight = expanded ? 88 : 46;

    setPosition({
      x: Math.max(
        8,
        Math.min(
          dragRef.current.startX + deltaX,
          window.innerWidth - widgetWidth - 8
        )
      ),
      y: Math.max(
        8,
        Math.min(
          dragRef.current.startY + deltaY,
          window.innerHeight - widgetHeight - 8
        )
      ),
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleClick() {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }

    setExpanded((value) => !value);
  }

  return (
    <button
      type="button"
      aria-label="Move or expand New York clock"
      aria-expanded={expanded}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((value) => !value);
        }
      }}
      className="fixed z-[9999] flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/40 bg-gradient-to-br from-violet-700 via-blue-700 to-cyan-600 text-white shadow-2xl shadow-blue-950/40 select-none cursor-grab active:cursor-grabbing"
      style={{
        left: position.x,
        top: position.y,
        width: expanded ? 215 : 104,
        minHeight: expanded ? 88 : 46,
        padding: expanded ? "10px" : "7px",
        touchAction: "none",
        transition: dragRef.current ? "none" : "width 180ms, min-height 180ms",
      }}
    >
      <span className="whitespace-nowrap text-sm font-black tabular-nums">
        {expanded ? fullTime : time}
      </span>

      {expanded && (
        <>
          <span className="mt-1 whitespace-nowrap text-[10px] font-bold">
            {date} · {zone}
          </span>

          <span className="mt-1 text-[8px] font-semibold uppercase tracking-widest text-white/80">
            New York Live Time
          </span>

          <span className="mt-1 text-[8px] text-white/70">
            Tap to minimize · Drag to move
          </span>
        </>
      )}
    </button>
  );
}