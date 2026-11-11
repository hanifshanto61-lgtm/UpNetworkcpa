"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

const TIME_ZONE = "America/New_York";

type Position = {
  x: number;
  y: number;
};

export default function PanelClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);

  const dragRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const movedRef = useRef(false);

  const getSize = (isExpanded: boolean) => ({
    width: isExpanded ? 280 : 160,
    height: isExpanded ? 130 : 68,
  });

  useEffect(() => {
    setNow(new Date());

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    const initialSize = getSize(false);

    setPosition({
      x: Math.max(8, (window.innerWidth - initialSize.width) / 2),
      y: Math.max(8, (window.innerHeight - initialSize.height) / 2),
    });

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const size = getSize(expanded);

      setPosition((current) => {
        if (!current) return current;

        return {
          x: Math.max(8, Math.min(current.x, window.innerWidth - size.width - 8)),
          y: Math.max(8, Math.min(current.y, window.innerHeight - size.height - 8)),
        };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [expanded]);

  useEffect(() => {
    const size = getSize(expanded);

    setPosition((current) => {
      if (!current) return current;

      return {
        x: Math.max(8, Math.min(current.x, window.innerWidth - size.width - 8)),
        y: Math.max(8, Math.min(current.y, window.innerHeight - size.height - 8)),
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
    weekday: "long",
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

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    movedRef.current = false;

    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: position.x,
      startY: position.y,
    };

    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return;

    const deltaX = event.clientX - dragRef.current.pointerX;
    const deltaY = event.clientY - dragRef.current.pointerY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      movedRef.current = true;
    }

    const size = getSize(expanded);

    setPosition({
      x: Math.max(
        8,
        Math.min(
          dragRef.current.startX + deltaX,
          window.innerWidth - size.width - 8
        )
      ),
      y: Math.max(
        8,
        Math.min(
          dragRef.current.startY + deltaY,
          window.innerHeight - size.height - 8
        )
      ),
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
    setDragging(false);
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
      className="
        fixed z-[99999] flex flex-col items-center justify-center
        overflow-hidden rounded-2xl
        border-2 border-cyan-200
        bg-gradient-to-br from-[#071B55] via-[#0755B8] to-[#00A6C7]
        text-white
        shadow-[0_0_0_2px_rgba(255,255,255,0.2),0_8px_30px_rgba(0,25,90,0.7),0_0_25px_rgba(0,210,255,0.5)]
        select-none cursor-grab active:cursor-grabbing
      "
      style={{
        left: position.x,
        top: position.y,
        width: expanded ? 280 : 160,
        minHeight: expanded ? 130 : 68,
        padding: expanded ? "15px" : "10px",
        touchAction: "none",
        transition: dragging
          ? "none"
          : "width 180ms ease, min-height 180ms ease",
      }}
    >
      <span
        className={`whitespace-nowrap font-black tracking-wide text-white ${
          expanded
            ? "text-[25px] drop-shadow-[0_2px_5px_rgba(0,0,0,0.7)]"
            : "text-[20px] drop-shadow-[0_2px_5px_rgba(0,0,0,0.7)]"
        }`}
      >
        {expanded ? fullTime : time}
      </span>

      {expanded && (
        <>
          <span className="mt-2 whitespace-nowrap text-[13px] font-extrabold text-white drop-shadow-md">
            {date}
          </span>

          <span className="mt-2 rounded-full border border-white/60 bg-white/20 px-4 py-1 text-[12px] font-black tracking-widest text-white shadow-inner">
            NEW YORK · {zone}
          </span>

          <span className="mt-2 text-[10px] font-bold text-cyan-100">
            TAP TO MINIMIZE · DRAG TO MOVE
          </span>
        </>
      )}
    </button>
  );
}