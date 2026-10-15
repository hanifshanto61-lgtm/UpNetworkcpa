"use client";

import { Bell, CheckCheck, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAffiliateNotifications } from "./notification-context";

export default function NotificationBell() {
  const router = useRouter();
  const [testingSound, setTestingSound] = useState(false);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    syncError,
    leadSyncError,
    soundEnabled,
    setSoundEnabled,
    soundReady,
    soundError,
    testSound,
  } = useAffiliateNotifications();

  const recentNotifications = notifications.slice(0, 8);

  return (
    <div className="relative">
      <details className="group">
        <summary
          className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </summary>

        <div className="absolute right-0 z-50 mt-3 w-[350px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#111827]">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-white/10">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${
                      unreadCount > 1 ? "s" : ""
                    }`
                  : "You're all caught up"}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Read all
              </button>
            )}
          </div>

          <div className="border-b border-gray-200 px-4 py-3 dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Sound: {soundEnabled ? (soundReady ? "On · Ready" : "On · Tap to enable audio") : "Off"}
              </p>
              <button type="button" onClick={() => {
                if (soundEnabled) setSoundEnabled(false);
                else void testSound();
              }} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-200">
                {soundEnabled ? "Mute" : "Enable Sound"}
              </button>
            </div>
            <button type="button" disabled={testingSound} onClick={async () => {
              setTestingSound(true);
              try { await testSound(); } finally { setTestingSound(false); }
            }} className="mt-2 w-full rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">
              {testingSound ? "Testing..." : "Enable & Test Sound"}
            </button>
            <p className="mt-2 text-[10px] leading-4 text-gray-500 dark:text-gray-400">
              Leads sync every 10 seconds while the panel is visible. Keep your device volume on.
            </p>
            {soundError && <p role="status" className="mt-2 text-xs text-amber-600 dark:text-amber-300">{soundError}</p>}
          </div>

          {leadSyncError && <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">Lead sync: {leadSyncError}</div>}

          {syncError && (
            <div
              role="alert"
              className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
            >
              {syncError}
            </div>
          )}

          <div className="max-h-[420px] overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell className="mx-auto mb-3 h-9 w-9 text-gray-300 dark:text-gray-600" />

                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {syncError
                    ? "Notifications could not be synced"
                    : "No notifications"}
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  {syncError
                    ? "The panel will retry automatically."
                    : "New payments, leads and offers will appear here."}
                </p>
              </div>
            ) : (
              recentNotifications.map((notification) => {
                const payment =
                  notification.data?.kind === "payment";

                const icon = payment
                  ? "💳"
                  : notification.type === "lead"
                    ? "💰"
                    : notification.type === "offer"
                      ? "🎁"
                      : "🔔";

                const iconColor = payment
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                  : notification.type === "lead"
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : notification.type === "offer"
                      ? "bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
                      : "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400";

                return (
                  <div
                    key={notification.id}
                    className={`relative border-b border-gray-100 px-4 py-3 transition dark:border-white/5 ${
                      notification.read
                        ? "bg-white dark:bg-[#111827]"
                        : "bg-blue-50/70 dark:bg-blue-500/5"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        removeNotification(notification.id)
                      }
                      className="absolute right-2 top-2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label="Remove notification"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        markAsRead(notification.id);

                        if (payment) {
                          router.push("/affiliate/payments");
                        } else if (notification.type === "lead") {
                          router.push("/affiliate/statistics");
                        }
                      }}
                      className="w-full pr-5 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${iconColor}`}
                        >
                          {icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {notification.title}
                            </p>

                            {!notification.read && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                            )}
                          </div>

                          <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400">
                            {notification.message}
                          </p>

                          {payment && (
                            <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                              View payment history →
                            </p>
                          )}

                          <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                            {new Date(
                              notification.createdAt
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </details>
    </div>
  );
}