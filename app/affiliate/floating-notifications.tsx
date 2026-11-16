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
            className={`pointer-events-auto relative overflow-hidden rounded-xl border p-4 shadow-2xl backdrop-blur-xl ${
              payment
                ? "border-orange-300 bg-orange-50/95 text-orange-950 dark:border-orange-400/40 dark:bg-orange-950/95 dark:text-orange-100"
                : "border-blue-300 bg-blue-50/95 text-blue-950 dark:border-blue-400/40 dark:bg-blue-950/95 dark:text-blue-100"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                void removeNotification(item.id);
              }}
              aria-label="Dismiss notification"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-xl font-bold opacity-70 hover:bg-black/10 hover:opacity-100"
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
                  {payment ? "🟠" : "🔵"}
                </span>

                <span className="text-sm font-bold">
                  {item.title}
                </span>
              </div>

              <p className="text-xs leading-5 opacity-90">
                {item.message}
              </p>

              <p className="mt-2 text-[10px] opacity-60">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </button>
          </div>
        );
      })}
    </div>
  );
}