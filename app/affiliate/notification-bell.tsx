"use client";

import { Bell, CheckCheck, X } from "lucide-react";
import { useAffiliateNotifications } from "./notification-context";

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
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

          <div className="max-h-[420px] overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell className="mx-auto mb-3 h-9 w-9 text-gray-300 dark:text-gray-600" />

                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  No notifications
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  New leads and offers will appear here.
                </p>
              </div>
            ) : (
              recentNotifications.map((notification) => (
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
                    onClick={() =>
                      markAsRead(notification.id)
                    }
                    className="w-full pr-5 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${
                          notification.type === "lead"
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : notification.type === "offer"
                              ? "bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
                              : "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                        }`}
                      >
                        {notification.type === "lead"
                          ? "💰"
                          : notification.type === "offer"
                            ? "🎁"
                            : "🔔"}
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

                        <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                          {new Date(
                            notification.createdAt
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
