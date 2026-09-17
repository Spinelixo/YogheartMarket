"use client";

import MainAppShell from "@/components/MainAppShell";
import LoginPage from "@/app/login/page";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";

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

  useEffect(() => {
    setIsMounted(true);
    setHasPersisted(checkHasPersistedAuth());
  }, []);

  // During static SSR/export and the initial frame before hydration:
  // Render the App Icon launch screen matching the native splash screen.
  // This completely eliminates any split-second flash of the Welcome page or spinning circles!
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

  // If user is authenticated, or has saved session tokens while auth hydrates:
  // Go straight to the main Market feed without flashing any spinner or Welcome page!
  if (user || (hasPersisted && loading)) {
    return <MainAppShell />;
  }

  // If auth has finished and no user exists (or user logged out), render the Welcome page
  if (!user) {
    return <LoginPage />;
  }

  return <MainAppShell />;
}



