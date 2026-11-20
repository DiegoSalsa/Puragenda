"use client";

import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Volume2, VolumeX } from "lucide-react";

const soundKey = "puragenda:christmas-sound";
const soundEvent = "puragenda:christmas-sound-changed";
let fallbackSoundEnabled = true;

function readSoundPreference() {
  try {
    return localStorage.getItem(soundKey) !== "muted";
  } catch {
    return fallbackSoundEnabled;
  }
}

function subscribeToSoundPreference(refresh: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === soundKey || event.key === null) refresh();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener(soundEvent, refresh);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(soundEvent, refresh);
  };
}

function toggleSound() {
  const enabled = !readSoundPreference();
  fallbackSoundEnabled = enabled;
  try {
    localStorage.setItem(soundKey, enabled ? "enabled" : "muted");
  } catch {
    // Keep the setting for this page when storage is unavailable.
  }
  window.dispatchEvent(new Event(soundEvent));
}

const ChristmasContext = createContext({ active: false, businessId: "", soundEnabled: true });

export function useDashboardChristmas() {
  return useContext(ChristmasContext);
}

export function DashboardChristmasProvider({ active, businessId, children }: {
  active: boolean;
  businessId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const soundEnabled = useSyncExternalStore(subscribeToSoundPreference, readSoundPreference, () => false);
  const player = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!active || !soundEnabled || !pathname || document.hidden) return;

    // Celesta samples by Neil Bickford / echo~parallax, CC0.
    // https://gitlab.com/echoparallax/a-sampled-celesta
    const audio = player.current ??= new Audio("/dashboard-seasonal/we-wish-you-celesta.mp3");
    let disposed = false;

    function removeGestureListeners() {
      window.removeEventListener("click", retryAfterGesture, true);
      window.removeEventListener("keydown", retryAfterGesture, true);
    }

    function retryAfterGesture(event: Event) {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (link instanceof HTMLAnchorElement && link.origin === location.origin && link.pathname !== pathname
        && (link.pathname === "/dashboard" || link.pathname.startsWith("/dashboard/"))) return;

      removeGestureListeners();
      void audio.play().catch(() => undefined);
    }

    audio.currentTime = 0;
    void audio.play().catch((error: unknown) => {
      if (!disposed && error instanceof DOMException && error.name === "NotAllowedError") {
        window.addEventListener("click", retryAfterGesture, true);
        window.addEventListener("keydown", retryAfterGesture, true);
      }
    });

    return () => {
      disposed = true;
      removeGestureListeners();
      audio.pause();
    };
  }, [active, businessId, pathname, soundEnabled]);

  return (
    <ChristmasContext.Provider value={{ active, businessId, soundEnabled }}>
      {children}
    </ChristmasContext.Provider>
  );
}

export function ChristmasSoundToggle({ mobile = false }: { mobile?: boolean }) {
  const t = useTranslations("dashboard.christmas");
  const { active, soundEnabled } = useDashboardChristmas();
  if (!active) return null;

  const Icon = soundEnabled ? Volume2 : VolumeX;
  return (
    <button
      type="button"
      className={`christmas-sound-button ${mobile ? "christmas-sound-button--mobile" : ""}`}
      aria-label={t("sound")}
      title={t("sound")}
      aria-pressed={soundEnabled}
      onClick={toggleSound}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
