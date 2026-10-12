"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

export type AffiliateNotificationType =
  | "lead"
  | "offer"
  | "system";

export type AffiliateNotification = {
  id: string;
  type: AffiliateNotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  sound?: boolean;
  data?: Record<string, unknown>;
};

type NotificationContextValue = {
  notifications: AffiliateNotification[];
  unreadCount: number;
  addNotification: (
    notification: Omit<
      AffiliateNotification,
      "id" | "createdAt" | "read"
    >
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  syncError: string;
};

const NotificationContext =
  createContext<NotificationContextValue | null>(null);

const STORAGE_KEY = "upnetwork-affiliate-notifications";
const SOUND_KEY = "upnetwork-affiliate-notification-sound";
const MAX_NOTIFICATIONS = 100;

function isPayment(id: string) {
  return /^payment-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
}

function validNotification(
  value: unknown
): value is AffiliateNotification {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as AffiliateNotification;

  return (
    typeof item.id === "string" &&
    ["lead", "offer", "system"].includes(item.type) &&
    typeof item.title === "string" &&
    typeof item.message === "string" &&
    typeof item.createdAt === "string" &&
    !Number.isNaN(Date.parse(item.createdAt)) &&
    typeof item.read === "boolean"
  );
}

function mergeNotifications(
  current: AffiliateNotification[],
  incoming: AffiliateNotification[]
) {
  const items = new Map<
    string,
    AffiliateNotification
  >();

  for (const item of current) {
    if (!isPayment(item.id)) {
      items.set(item.id, item);
    }
  }

  for (const item of incoming) {
    items.set(item.id, item);
  }

  return Array.from(items.values())
    .sort(
      (a, b) =>
        Date.parse(b.createdAt) -
        Date.parse(a.createdAt)
    )
    .slice(0, MAX_NOTIFICATIONS);
}

export function AffiliateNotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [userId, setUserId] = useState<
    string | null
  >(null);

  const [store, setStore] = useState<{
    userId: string | null;
    items: AffiliateNotification[];
  }>({
    userId: null,
    items: [],
  });

  const [
    soundPreference,
    setSoundPreference,
  ] = useState({
    userId: null as string | null,
    enabled: true,
  });

  const [syncError, setSyncError] = useState("");

  const ownerRef = useRef<string | null>(null);
  const revisionRef = useRef(0);
  const soundRef = useRef(true);
  const audioRef = useRef<AudioContext | null>(null);

  const notifications = useMemo(
    () =>
      store.userId === userId
        ? store.items
        : [],
    [store, userId]
  );

  const soundEnabled =
    soundPreference.userId === userId
      ? soundPreference.enabled
      : true;

  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);

  const updateItems = useCallback(
    (
      owner: string,
      update: (
        items: AffiliateNotification[]
      ) => AffiliateNotification[]
    ) => {
      if (ownerRef.current !== owner) return;

      setStore((current) =>
        current.userId === owner
          ? {
              userId: owner,
              items: update(current.items),
            }
          : current
      );
    },
    []
  );

  // Keep each account's local notifications separate.
  useEffect(() => {
    let active = true;
    let authEventSeen = false;

    function switchUser(next: string | null) {
      if (
        !active ||
        ownerRef.current === next
      ) {
        return;
      }

      ownerRef.current = next;
      revisionRef.current++;

      let items: AffiliateNotification[] = [];
      let enabled = true;

      if (next) {
        try {
          const saved = JSON.parse(
            localStorage.getItem(
              STORAGE_KEY + ":" + next
            ) || "[]"
          );

          if (Array.isArray(saved)) {
            items = saved
              .filter(validNotification)
              .filter(
                (item) => !isPayment(item.id)
              )
              .slice(0, MAX_NOTIFICATIONS);
          }

          enabled =
            localStorage.getItem(
              SOUND_KEY + ":" + next
            ) !== "false";
        } catch {}
      }

      setUserId(next);
      setStore({
        userId: next,
        items,
      });

      setSoundPreference({
        userId: next,
        enabled,
      });

      soundRef.current = enabled;
      setSyncError("");
    }

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          authEventSeen = true;

          switchUser(
            session?.user.id || null
          );
        }
      );

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active && !authEventSeen) {
          switchUser(
            data.session?.user.id || null
          );
        }
      })
      .catch(() => {
        if (active && !authEventSeen) {
          switchUser(null);
        }
      });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (
      !userId ||
      store.userId !== userId
    ) {
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEY + ":" + userId,
        JSON.stringify(
          store.items.filter(
            (item) => !isPayment(item.id)
          )
        )
      );
    } catch {}
  }, [store, userId]);

  useEffect(() => {
    if (
      !userId ||
      soundPreference.userId !== userId
    ) {
      return;
    }

    try {
      localStorage.setItem(
        SOUND_KEY + ":" + userId,
        String(soundPreference.enabled)
      );
    } catch {}
  }, [soundPreference, userId]);

  const getAudio = useCallback(() => {
    const AudioClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioClass) return null;

    if (!audioRef.current) {
      audioRef.current = new AudioClass();
    }

    return audioRef.current;
  }, []);

  const playSound = useCallback(() => {
    if (!soundRef.current) return;

    try {
      const audio = getAudio();

      if (!audio) return;

      const beep = () => {
        if (
          !soundRef.current ||
          audio.state !== "running"
        ) {
          return;
        }

        const oscillator =
          audio.createOscillator();

        const gain = audio.createGain();

        oscillator.type = "sine";

        oscillator.frequency.setValueAtTime(
          880,
          audio.currentTime
        );

        oscillator.frequency.exponentialRampToValueAtTime(
          1320,
          audio.currentTime + 0.12
        );

        gain.gain.setValueAtTime(
          0.0001,
          audio.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
          0.12,
          audio.currentTime + 0.02
        );

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          audio.currentTime + 0.35
        );

        oscillator.connect(gain);
        gain.connect(audio.destination);

        oscillator.start();

        oscillator.stop(
          audio.currentTime + 0.35
        );
      };

      if (audio.state === "suspended") {
        void audio
          .resume()
          .then(beep)
          .catch(() => {});
      } else {
        beep();
      }
    } catch {}
  }, [getAudio]);

  // A browser interaction allows notification audio.
  useEffect(() => {
    const unlock = () => {
      if (!soundRef.current) return;

      try {
        void getAudio()
          ?.resume()
          .catch(() => {});
      } catch {}
    };

    window.addEventListener(
      "pointerdown",
      unlock
    );

    window.addEventListener(
      "keydown",
      unlock
    );

    return () => {
      window.removeEventListener(
        "pointerdown",
        unlock
      );

      window.removeEventListener(
        "keydown",
        unlock
      );

      void audioRef.current
        ?.close()
        .catch(() => {});

      audioRef.current = null;
    };
  }, [getAudio]);

  // Load persistent payment notifications from the server.
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let busy = false;
    let retryBusy = false;
    let initialized = false;

    const seen = new Set<string>();
    const controller = new AbortController();

    async function token() {
      const { data } =
        await supabase.auth.getSession();

      if (
        !data.session?.access_token ||
        cancelled ||
        data.session.user.id !== userId ||
        ownerRef.current !== userId
      ) {
        return null;
      }

      return data.session.access_token;
    }

    async function sync() {
      if (
        busy ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      busy = true;

      const revision = revisionRef.current;

      try {
        const accessToken = await token();

        if (!accessToken) return;

        const response = await fetch(
          "/api/affiliate/notifications",
          {
            headers: {
              Authorization:
                "Bearer " + accessToken,
            },
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
              "Unable to sync payment notifications."
          );
        }

        if (
          cancelled ||
          ownerRef.current !== userId ||
          revisionRef.current !== revision
        ) {
          return;
        }

        const incoming: AffiliateNotification[] =
          Array.isArray(result.notifications)
            ? result.notifications
                .filter(validNotification)
                .filter(
                  (
                    item: AffiliateNotification
                  ) => isPayment(item.id)
                )
            : [];

        const shouldSound =
          initialized &&
          incoming.some(
            (item) =>
              !seen.has(item.id) &&
              !item.read &&
              item.sound !== false
          );

        incoming.forEach((item) =>
          seen.add(item.id)
        );

        initialized = true;

        updateItems(userId!, (items) =>
          mergeNotifications(
            items,
            incoming
          )
        );

        setSyncError("");

        if (shouldSound) {
          playSound();
        }
      } catch (error) {
        if (
          !cancelled &&
          ownerRef.current === userId
        ) {
          setSyncError(
            error instanceof Error
              ? error.message
              : "Notification sync failed."
          );
        }
      } finally {
        busy = false;
      }
    }

    async function retryEmails() {
      if (
        retryBusy ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      retryBusy = true;

      try {
        const accessToken = await token();

        if (!accessToken) return;

        const response = await fetch(
          "/api/affiliate/notifications",
          {
            method: "POST",
            headers: {
              Authorization:
                "Bearer " + accessToken,
            },
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          console.error(
            "Pending payment email retry failed."
          );
        }
      } catch {
      } finally {
        retryBusy = false;
      }
    }

    const wake = () => {
      void sync();
    };

    void sync();
    void retryEmails();

    const poll = window.setInterval(
      () => void sync(),
      15000
    );

    const retry = window.setInterval(
      () => void retryEmails(),
      60000
    );

    window.addEventListener(
      "focus",
      wake
    );

    document.addEventListener(
      "visibilitychange",
      wake
    );

    return () => {
      cancelled = true;
      controller.abort();

      window.clearInterval(poll);
      window.clearInterval(retry);

      window.removeEventListener(
        "focus",
        wake
      );

      document.removeEventListener(
        "visibilitychange",
        wake
      );
    };
  }, [userId, updateItems, playSound]);

  const saveRemote = useCallback(
    async (
      owner: string,
      action: "read" | "dismiss",
      notificationIds: string[]
    ) => {
      const ids = notificationIds
        .filter(isPayment)
        .map((id) => id.slice(8));

      if (!ids.length) return;

      revisionRef.current++;

      try {
        const { data } =
          await supabase.auth.getSession();

        if (
          !data.session?.access_token ||
          ownerRef.current !== owner ||
          data.session.user.id !== owner
        ) {
          return;
        }

        const response = await fetch(
          "/api/affiliate/notifications",
          {
            method: "PATCH",
            headers: {
              Authorization:
                "Bearer " +
                data.session.access_token,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action,
              ids,
            }),
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
              "Unable to save notification changes."
          );
        }

        if (
          ownerRef.current !== owner
        ) {
          return;
        }

        revisionRef.current++;

        updateItems(owner, (items) =>
          action === "read"
            ? items.map((item) =>
                notificationIds.includes(
                  item.id
                )
                  ? {
                      ...item,
                      read: true,
                    }
                  : item
              )
            : items.filter(
                (item) =>
                  !notificationIds.includes(
                    item.id
                  )
              )
        );

        setSyncError("");
      } catch (error) {
        if (
          ownerRef.current === owner
        ) {
          revisionRef.current++;

          setSyncError(
            error instanceof Error
              ? error.message
              : "Unable to save notification changes."
          );
        }
      }
    },
    [updateItems]
  );

  const addNotification = useCallback(
    (
      notification: Omit<
        AffiliateNotification,
        "id" | "createdAt" | "read"
      >
    ) => {
      const owner = ownerRef.current;

      if (!owner) return;

      const item: AffiliateNotification = {
        ...notification,
        id:
          Date.now() +
          "-" +
          Math.random()
            .toString(36)
            .slice(2, 10),
        createdAt:
          new Date().toISOString(),
        read: false,
      };

      updateItems(owner, (items) =>
        [item, ...items].slice(
          0,
          MAX_NOTIFICATIONS
        )
      );

      if (
        notification.sound !== false
      ) {
        playSound();
      }
    },
    [updateItems, playSound]
  );

  const markAsRead = useCallback(
    (id: string) => {
      const owner = ownerRef.current;

      if (!owner) return;

      if (isPayment(id)) {
        void saveRemote(
          owner,
          "read",
          [id]
        );
        return;
      }

      updateItems(owner, (items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                read: true,
              }
            : item
        )
      );
    },
    [updateItems, saveRemote]
  );

  const markAllAsRead = useCallback(() => {
    const owner = ownerRef.current;

    if (!owner) return;

    const ids = notifications
      .filter(
        (item) =>
          isPayment(item.id) &&
          !item.read
      )
      .map((item) => item.id);

    updateItems(owner, (items) =>
      items.map((item) =>
        isPayment(item.id)
          ? item
          : {
              ...item,
              read: true,
            }
      )
    );

    void saveRemote(
      owner,
      "read",
      ids
    );
  }, [
    notifications,
    updateItems,
    saveRemote,
  ]);

  const removeNotification = useCallback(
    (id: string) => {
      const owner = ownerRef.current;

      if (!owner) return;

      if (isPayment(id)) {
        void saveRemote(
          owner,
          "dismiss",
          [id]
        );
        return;
      }

      updateItems(owner, (items) =>
        items.filter(
          (item) => item.id !== id
        )
      );
    },
    [updateItems, saveRemote]
  );

  const clearAll = useCallback(() => {
    const owner = ownerRef.current;

    if (!owner) return;

    const ids = notifications
      .filter((item) =>
        isPayment(item.id)
      )
      .map((item) => item.id);

    updateItems(owner, (items) =>
      items.filter((item) =>
        isPayment(item.id)
      )
    );

    void saveRemote(
      owner,
      "dismiss",
      ids
    );
  }, [
    notifications,
    updateItems,
    saveRemote,
  ]);

  const setSoundEnabled = useCallback(
    (enabled: boolean) => {
      const owner = ownerRef.current;

      if (!owner) return;

      soundRef.current = enabled;

      setSoundPreference({
        userId: owner,
        enabled,
      });
    },
    []
  );

  const toggleSound = useCallback(
    () =>
      setSoundEnabled(
        !soundRef.current
      ),
    [setSoundEnabled]
  );

  const unreadCount =
    notifications.filter(
      (item) => !item.read
    ).length;

  const value =
    useMemo<NotificationContextValue>(
      () => ({
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        soundEnabled,
        setSoundEnabled,
        toggleSound,
        syncError,
      }),
      [
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        soundEnabled,
        setSoundEnabled,
        toggleSound,
        syncError,
      ]
    );

  return (
    <NotificationContext.Provider
      value={value}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useAffiliateNotifications() {
  const context =
    useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useAffiliateNotifications must be used inside AffiliateNotificationProvider"
    );
  }

  return context;
}
