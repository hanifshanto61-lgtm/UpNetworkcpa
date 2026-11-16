"use client";

import { useRouter } from "next/navigation";
import { useAffiliateNotifications } from "./notification-context";

export default function FloatingNotifications() {
  const router = useRouter();

  const {
    notifications,
    removeNotification,
  } = useAffiliateNotifications();

  const floating = notifications
    .filter(
      (item) =>
        item.type === "lead" ||
        item.id.startsWith("payment-")
    )
    .slice(0, 4);

  if (!floating.length) return null;

  return (
    <div
      className="pointer-events-none fixed right-3 top-20 z-[9999] flex w-[min(390px,calc(100vw-24px))] flex-col gap-3 sm:right-5 sm:top-24"
      aria-live="polite"
    >
      {floating.map((item) => {
        const payment = item.id.startsWith("payment-");

        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto relative overflow-hidden rounded-xl border p-4 shadow-2xl ${
              payment
                ? "border-orange-300 bg-orange-500 text-white"
                : "border-green-300 bg-green-600 text-white"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                void removeNotification(item.id);
              }}
              aria-label="Dismiss notification"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-xl font-bold text-white opacity-80 hover:bg-black/20 hover:opacity-100"
            >
              ×
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  payment
                    ? "/affiliate/payments"
                    : "/affiliate/statistics"
                )
              }
              className="w-full pr-6 text-left"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-lg">
                  {payment ? "🟠" : "🟢"}
                </span>

                <span className="text-sm font-bold">
                  {item.title}
                </span>
              </div>

              <p className="text-xs leading-5 text-white">
                {item.message}
              </p>

              <p className="mt-2 text-[10px] text-white/80">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </button>
          </div>
        );
      })}
    </div>
  );
}