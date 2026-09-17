"use client";

import MainAppShell from "@/components/MainAppShell";
import LoginPage from "@/app/login/page";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef } from "react";

function checkHasPersistedAuth(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!(
      localStorage.getItem("mesh_session_token") ||
      localStorage.getItem("mesh_onboarding_complete") === "true" ||
      Object.keys(localStorage).some((k) => k.startsWith("firebase:authUser"))
    );
  } catch (_) {
    return false;
  }
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [hasPersisted, setHasPersisted] = useState(false);
  
  // splashStage:
  // "holding"   -> Splash visible, holding briefly to give Firestore database items time to load
  // "unlocking" -> iPhone/Samsung lockscreen unlock transition (splash scales up & fades, home scales into view with ios-entrance)
  // "done"      -> Splash unmounted, user is fully in the app
  const [splashStage, setSplashStage] = useState<"holding" | "unlocking" | "done">("holding");
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    setIsMounted(true);
    const persisted = checkHasPersistedAuth();
    setHasPersisted(persisted);

    // If app already launched in this browser/tab session, skip splash delay
    const alreadyLaunched = typeof window !== "undefined" && sessionStorage.getItem("mesh_app_launched") === "true";
    if (alreadyLaunched) {
      setSplashStage("done");
      return;
    }

    // On cold start / relaunch:
    // Hold the app icon splash screen for ~850ms so Firestore database items and feeds have time to load
    const holdTimer = setTimeout(() => {
      setSplashStage("unlocking");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("mesh_app_launched", "true");
      }

      // Unlock animation runs for 450ms
      const exitTimer = setTimeout(() => {
        setSplashStage("done");
      }, 450);
      timersRef.current.push(exitTimer);
    }, 850);

    timersRef.current.push(holdTimer);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  // During SSR / static pre-rendering before JS hydration:
  // Always render the neutral App Icon Splash screen matching native Android splash
  if (!isMounted) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#0b141a]">
        <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-xl flex items-center justify-center">
          <img
            src="/icon-192-v3.png"
            alt="Yogheart Market"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    );
  }

  // If user is definitively logged out (auth finished and no persisted token), render Login / Welcome page
  if (!loading && !user && !hasPersisted) {
    return <LoginPage />;
  }

  // When user is authenticated (or loading with persisted session):
  // Render MainAppShell with the smooth lockscreen unlock animation transitioning from the splash
  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden">
      <style>{`
        @keyframes lockscreenSplashExit {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.08);
            pointer-events: none;
          }
        }
        @keyframes iosScaleUpEntrance {
          0% {
            opacity: 0;
            transform: scale(0.96);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-lockscreen-exit {
          animation: lockscreenSplashExit 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          pointer-events: none;
        }
        .animate-lockscreen-entrance {
          animation: iosScaleUpEntrance 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: center center;
          will-change: transform, opacity;
        }
      `}</style>

      {/* Main Home Shell - renders underneath and enters with iPhone/Samsung lockscreen scale-up */}
      <div
        className={`w-full h-full ${
          splashStage === "unlocking" ? "animate-lockscreen-entrance" : ""
        }`}
      >
        <MainAppShell />
      </div>

      {/* App Icon Splash Overlay */}
      {splashStage !== "done" && (
        <div
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#0b141a] select-none ${
            splashStage === "unlocking" ? "animate-lockscreen-exit" : ""
          }`}
        >
          <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-xl flex items-center justify-center">
            <img
              src="/icon-192-v3.png"
              alt="Yogheart Market"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}



