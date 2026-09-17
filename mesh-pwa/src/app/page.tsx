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
  const [isMounted, setIsMounted] = useState(() => typeof window !== "undefined");
  const [hasPersisted] = useState(() => checkHasPersistedAuth());

  // Track whether user just signed in during this page lifecycle
  // (went from no-user to user while component was mounted)
  const hadUserOnMount = useRef(!!user || hasPersisted);
  const [justSignedIn, setJustSignedIn] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // If user appeared but we didn't have one on mount and didn't have persisted auth,
    // that means user just completed sign-in → play the entrance animation
    if (user && !hadUserOnMount.current) {
      setJustSignedIn(true);
    }
  }, [user]);

  // During SSR / static pre-rendering before JS hydration:
  // Render the Welcome page instantly (0ms delay, no icon on launch)
  if (!isMounted) {
    return <LoginPage />;
  }

  // If user is authenticated, or has saved session tokens while auth hydrates:
  if (user || (hasPersisted && loading)) {
    return (
      <div className={`w-full h-full${justSignedIn ? " animate-lockscreen-entrance" : ""}`}>
        <MainAppShell />
      </div>
    );
  }

  // If not authenticated, render Welcome page instantly
  return <LoginPage />;
}

