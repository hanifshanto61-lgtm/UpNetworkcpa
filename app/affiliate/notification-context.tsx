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
};

const NotificationContext =
  createContext<NotificationContextValue | null>(null);

const STORAGE_KEY = "upnetwork-affiliate-notifications";
const SOUND_KEY = "upnetwork-affiliate-notification-sound";
const MAX_NOTIFICATIONS = 100;

function createNotificationId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function AffiliateNotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [notifications, setNotifications] = useState<
    AffiliateNotification[]
  >([]);

  const [soundEnabled, setSoundEnabledState] = useState(true);

  const audioContextRef =
    useRef<AudioContext | null>(null);

  // Load saved notifications and sound setting.
  useEffect(() => {
    try {
      const savedNotifications =
        localStorage.getItem(STORAGE_KEY);

      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications);

        if (Array.isArray(parsed)) {
          setNotifications(parsed);
        }
      }

      const savedSound =
        localStorage.getItem(SOUND_KEY);

      if (savedSound !== null) {
        setSoundEnabledState(savedSound !== "false");
      }
    } catch {
      // Ignore invalid localStorage data.
    }
  }, []);

  // Persist notifications.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(notifications)
      );
    } catch {
      // Ignore storage errors.
    }
  }, [notifications]);

  // Persist sound preference.
  useEffect(() => {
    try {
      localStorage.setItem(
        SOUND_KEY,
        String(soundEnabled)
      );
    } catch {
      // Ignore storage errors.
    }
  }, [soundEnabled]);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current =
          new AudioContextClass();
      }

      const audioContext =
        audioContextRef.current;

      if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
      }

      const oscillator =
        audioContext.createOscillator();

      const gainNode =
        audioContext.createGain();

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(
        880,
        audioContext.currentTime
      );

      oscillator.frequency.exponentialRampToValueAtTime(
        1320,
        audioContext.currentTime + 0.12
      );

      gainNode.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
      );

      gainNode.gain.exponentialRampToValueAtTime(
        0.12,
        audioContext.currentTime + 0.02
      );

      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.35
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(
        audioContext.currentTime + 0.35
      );
    } catch {
      // Browser may block audio until user interaction.
    }
  }, [soundEnabled]);

  const addNotification = useCallback(
    (
      notification: Omit<
        AffiliateNotification,
        "id" | "createdAt" | "read"
      >
    ) => {
      const newNotification: AffiliateNotification = {
        ...notification,
        id: createNotificationId(),
        createdAt: new Date().toISOString(),
        read: false,
      };

      setNotifications((current) =>
        [newNotification, ...current].slice(
          0,
          MAX_NOTIFICATIONS
        )
      );

      if (
        notification.sound !== false &&
        soundEnabled
      ) {
        playNotificationSound();
      }
    },
    [playNotificationSound, soundEnabled]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              read: true,
            }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  }, []);

  const removeNotification = useCallback(
    (id: string) => {
      setNotifications((current) =>
        current.filter(
          (notification) =>
            notification.id !== id
        )
      );
    },
    []
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const setSoundEnabled = useCallback(
    (enabled: boolean) => {
      setSoundEnabledState(enabled);
    },
    []
  );

  const toggleSound = useCallback(() => {
    setSoundEnabledState((current) => !current);
  }, []);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.read
      ).length,
    [notifications]
  );

  const value = useMemo<NotificationContextValue>(
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
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
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
