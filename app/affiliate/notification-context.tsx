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
  leadSyncError: string;
  soundReady: boolean;
  soundError: string;
  testSound: () => Promise<void>;
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

function isLead(id: string) {
  return id.startsWith("lead-");
}

function mergeLeads(current: AffiliateNotification[], incoming: AffiliateNotification[], dismissed: Set<string>) {
  const items = new Map(current.map(item => [item.id, item]));
  for (const item of incoming) {
    if (dismissed.has(item.id)) continue;
    const existing = items.get(item.id);
    items.set(item.id, { ...item, read: existing?.read ?? item.read });
  }
  return Array.from(items.values())
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, MAX_NOTIFICATIONS);
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
  const [leadSyncError, setLeadSyncError] = useState("");
  const [soundReady, setSoundReady] = useState(false);
  const [soundError, setSoundError] = useState("");
  const dismissedLeadsRef = useRef(new Set<string>());
  const pendingSoundRef = useRef(false);
  const pendingLeadSoundRef = useRef(false);

  const ownerRef = useRef<string | null>(null);
  const revisionRef = useRef(0);
  const soundRef = useRef(true);
  const audioRef = useRef<AudioContext | null>(null);
  const soundUntilRef = useRef(0);
  const soundNodesRef = useRef(new Set<{
    oscillator: OscillatorNode;
    gain: GainNode;
  }>());

  const stopSound = useCallback(() => {
    soundNodesRef.current.forEach((node) => {
      try { node.oscillator.stop(); } catch {}
      node.oscillator.disconnect();
      node.gain.disconnect();
    });
    soundNodesRef.current.clear();
    soundUntilRef.current = 0;
  }, []);

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

      stopSound();
      pendingLeadSoundRef.current = false;
      ownerRef.current = next;
      revisionRef.current++;
      dismissedLeadsRef.current = new Set<string>();
      pendingSoundRef.current = false;
      setLeadSyncError("");
      setSoundError("");

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

          const dismissed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY + ":dismissed-leads:" + next) || "[]");
          if (Array.isArray(dismissed)) {
            dismissedLeadsRef.current = new Set(dismissed.filter((id): id is string => typeof id === "string" && isLead(id)));
            items = items.filter(item => !dismissedLeadsRef.current.has(item.id));
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
  }, [stopSound]);

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

  const playSound = useCallback(async (leadMelody = false): Promise<boolean> => {
    if (!soundRef.current) return false;
    const owner = ownerRef.current;
    try {
      const audio = getAudio();
      if (!audio) {
        setSoundReady(false);
        setSoundError("This browser does not support notification sound.");
        return false;
      }
      if (audio.state !== "running") await audio.resume();
      if (ownerRef.current !== owner || !soundRef.current) return false;
      if (audio.state !== "running") throw new Error("Tap Enable & Test Sound to allow audio.");
      const now = audio.currentTime;
      // Coalesce alerts arriving during the same tune.
      if (soundUntilRef.current > now) return true;
      const notes = leadMelody
        ? [659.25, 783.99, 987.77, 783.99, 659.25, 783.99,
           1046.50, 987.77, 783.99, 659.25, 783.99, 987.77, 1046.50]
        : [880];
      soundUntilRef.current = now + (leadMelody ? 5.5 : 0.35);

      notes.forEach((frequency, index) => {
        const at = now + (leadMelody ? index * 0.4 : 0);
        const duration = leadMelody
          ? (index === notes.length - 1 ? 0.7 : 0.34)
          : 0.35;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const node = { oscillator, gain };
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, at);
        if (!leadMelody) {
          oscillator.frequency.exponentialRampToValueAtTime(1320, at + 0.12);
        }
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        soundNodesRef.current.add(node);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
          soundNodesRef.current.delete(node);
        };
        oscillator.start(at);
        oscillator.stop(at + duration);
      });
      pendingSoundRef.current = false;
      pendingLeadSoundRef.current = false;
      setSoundReady(true);
      setSoundError("");
      return true;
    } catch {
      if (ownerRef.current === owner) {
        pendingSoundRef.current = true;
        pendingLeadSoundRef.current = pendingLeadSoundRef.current || leadMelody;
        setSoundReady(false);
        setSoundError("Tap Enable & Test Sound. Also check your device volume.");
      }
      return false;
    }
  }, [getAudio]);

  // A browser interaction allows notification audio.
  useEffect(() => {
    const unlock = () => {
      if (!soundRef.current) return;
      try {
        const audio = getAudio();
        if (!audio) return;
        void audio.resume().then(() => {
          setSoundReady(audio.state === "running");
          if (pendingSoundRef.current && audio.state === "running") void playSound(pendingLeadSoundRef.current);
        }).catch(() => {});
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

      stopSound();
      void audioRef.current
        ?.close()
        .catch(() => {});

      audioRef.current = null;
    };
  }, [getAudio, playSound, stopSound]);

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

  // Lead sync is separate so payment notification handling stays intact.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let busy = false;
    let initialized = false;
    const seen = new Set<string>();
    const controller = new AbortController();

    async function syncLeads() {
      if (busy || cancelled || document.visibilityState === "hidden") return;
      busy = true;
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session?.access_token || session.user.id !== userId || ownerRef.current !== userId || cancelled) return;
        const response = await fetch("/api/affiliate/lead-notifications", {
          headers: { Authorization: "Bearer " + session.access_token },
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Unable to sync lead notifications.");
        if (cancelled || ownerRef.current !== userId) return;
        const incoming: AffiliateNotification[] = Array.isArray(result.notifications)
          ? result.notifications.filter(validNotification).filter((item: AffiliateNotification) => isLead(item.id) && item.type === "lead")
          : [];
        const shouldSound = initialized && incoming.some(item => !seen.has(item.id) && !dismissedLeadsRef.current.has(item.id) && !item.read && item.sound !== false);
        incoming.forEach(item => seen.add(item.id));
        initialized = true;
        updateItems(userId!, items => mergeLeads(items, incoming, dismissedLeadsRef.current));
        setLeadSyncError("");
        if (shouldSound) void playSound(true);
      } catch (error) {
        if (!cancelled && ownerRef.current === userId) {
          setLeadSyncError(error instanceof Error ? error.message : "Lead notification sync failed.");
        }
      } finally { busy = false; }
    }
    const wake = () => { void syncLeads(); };
    void syncLeads();
    const timer = window.setInterval(wake, 10000);
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [userId, updateItems, playSound]);

  const dismissLeads = useCallback((owner: string, ids: string[]) => {
    if (ownerRef.current !== owner) return;
    const next = new Set(dismissedLeadsRef.current);
    ids.filter(isLead).forEach(id => next.add(id));
    const kept = Array.from(next).slice(-2000);
    dismissedLeadsRef.current = new Set(kept);
    try { localStorage.setItem(STORAGE_KEY + ":dismissed-leads:" + owner, JSON.stringify(kept)); } catch {}
  }, []);

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
        void playSound(notification.type === "lead");
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

      if (isLead(id)) dismissLeads(owner, [id]);
      updateItems(owner, (items) =>
        items.filter(
          (item) => item.id !== id
        )
      );
    },
    [updateItems, saveRemote, dismissLeads]
  );

  const clearAll = useCallback(() => {
    const owner = ownerRef.current;

    if (!owner) return;

    dismissLeads(owner, notifications.filter(item => isLead(item.id)).map(item => item.id));

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
    dismissLeads,
  ]);

  const setSoundEnabled = useCallback(
    (enabled: boolean) => {
      const owner = ownerRef.current;

      if (!owner) return;

      soundRef.current = enabled;
      if (!enabled) {
        pendingSoundRef.current = false;
        pendingLeadSoundRef.current = false;
        stopSound();
      }

      setSoundPreference({
        userId: owner,
        enabled,
      });
    },
    [stopSound]
  );

  const testSound = useCallback(async () => {
    setSoundEnabled(true);
    await playSound(true);
  }, [setSoundEnabled, playSound]);

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
        leadSyncError,
        soundReady,
        soundError,
        testSound,
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
        leadSyncError,
        soundReady,
        soundError,
        testSound,
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