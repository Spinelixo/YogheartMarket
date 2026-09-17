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

  // During SSR / static pre-rendering before JS hydration:
  // Render the Welcome page instantly (0ms delay, no icon on launch)
  if (!isMounted) {
    return <LoginPage />;
  }

  // If user is authenticated, or has saved session tokens while auth hydrates:
  if (user || (hasPersisted && loading)) {
    return (
      <div className="w-full h-full animate-fade-in">
        <MainAppShell />
      </div>
    );
  }

  // If not authenticated, render Welcome page instantly
  return <LoginPage />;
}



