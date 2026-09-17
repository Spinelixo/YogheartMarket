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
      Object.keys(localStorage).some((k) => k.startsWith("firebase:authUser"))
    );
  } catch (_) {
    return false;
  }
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const [hasPersisted, setHasPersisted] = useState(() => checkHasPersistedAuth());
  const [isMounted, setIsMounted] = useState(() => typeof window !== "undefined");
  const [isJustSignedIn, setIsJustSignedIn] = useState(false);
  
  // splashStage:
  // "holding"   -> App icon splash visible while Firestore database items connect
  // "unlocking" -> iPhone/Samsung lockscreen unlock transition (splash scales up & fades, home scales in)
  // "done"      -> Splash unmounted, user is fully in the app
  const [splashStage, setSplashStage] = useState<"holding" | "unlocking" | "done">(() => {
    if (typeof window === "undefined") return "done";
    const hasSession = checkHasPersistedAuth();
    const justSignedIn = sessionStorage.getItem("mesh_just_signed_in") === "true";
    return (hasSession || justSignedIn) ? "holding" : "done";
  });
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    setIsMounted(true);
    const persisted = checkHasPersistedAuth();
    setHasPersisted(persisted);

    // If the user has no persisted auth and is not logged in, dismiss splash immediately
    if (!persisted && !user && !loading) {
      setSplashStage("done");
      return;
    }

    // If user just finished signing in (e.g. from Google sign-in),
    // immediately trigger the lockscreen unlock transition to land into the item feed!
    const justSignedIn = typeof window !== "undefined" && sessionStorage.getItem("mesh_just_signed_in") === "true";
    if (justSignedIn) {
      setIsJustSignedIn(true);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("mesh_just_signed_in");
        sessionStorage.setItem("mesh_app_launched", "true");
      }
      setSplashStage("unlocking");
      const exitTimer = setTimeout(() => {
        setSplashStage("done");
      }, 450);
      timersRef.current.push(exitTimer);
      return;
    }

    // If app already launched in this session, skip splash delay
    const alreadyLaunched = typeof window !== "undefined" && sessionStorage.getItem("mesh_app_launched") === "true";
    if (alreadyLaunched) {
      setSplashStage("done");
      return;
    }

    // On cold start / relaunch while signed in:
    // Hold the app icon splash screen for ~700ms so items hydrate, then unlock smoothly
    const holdTimer = setTimeout(() => {
      setSplashStage("unlocking");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("mesh_app_launched", "true");
      }

      const exitTimer = setTimeout(() => {
        setSplashStage("done");
      }, 450);
      timersRef.current.push(exitTimer);
    }, 700);

    timersRef.current.push(holdTimer);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [user, loading]);

  // If user has no saved session and is not authenticated, render Welcome page immediately!
  // This guarantees ZERO spinning icon or splash screen before the Welcome page on fresh launch.
  if (!hasPersisted && !user && !loading) {
    return <LoginPage />;
  }

  // During static SSR/export before client hydration, if not persisted, also render LoginPage
  if (!isMounted && !hasPersisted) {
    return <LoginPage />;
  }

  // When user is authenticated or has persisted session:
  // Render MainAppShell with the smooth lockscreen unlock animation transitioning from the splash
  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden">
      <style>{`
        @keyframes smoothIconSpin {
          0% {
            transform: rotate(0deg) translateZ(0);
          }
          100% {
            transform: rotate(360deg) translateZ(0);
          }
        }
        .animate-icon-spin {
          animation: smoothIconSpin 1.2s linear infinite;
          transform-origin: center center;
          will-change: transform;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
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
          <div className="relative flex items-center justify-center">
            {/* Static ambient soft shadow */}
            <div className="absolute w-16 h-16 rounded-[22px] bg-black/15 dark:bg-black/50 blur-xl pointer-events-none" />
            <div 
              className={`relative w-20 h-20 rounded-[22px] overflow-hidden flex items-center justify-center ${
                isJustSignedIn ? "animate-icon-spin" : ""
              }`}
              style={{
                willChange: "transform",
                transform: "translate3d(0, 0, 0)",
                WebkitTransform: "translate3d(0, 0, 0)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              <img
                src="/icon-192-v3.png"
                alt="Yogheart Market"
                className="w-full h-full object-cover select-none pointer-events-none"
                style={{
                  transform: "translateZ(0)",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

