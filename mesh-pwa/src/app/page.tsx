"use client";

import MainAppShell from "@/components/MainAppShell";
import LoginPage from "@/app/login/page";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const hasPersistedAuth = typeof window !== "undefined" && (
    !!localStorage.getItem("mesh_session_token") || 
    localStorage.getItem("mesh_onboarding_complete") === "true" ||
    Object.keys(localStorage).some(k => k.startsWith("firebase:authUser"))
  );

  // If there's definitely no cached auth (fresh install / logged out), render LoginPage immediately!
  // This also ensures static build (out/index.html) has LoginPage pre-rendered for 0ms initial launch!
  if (!hasPersistedAuth && !user) {
    return <LoginPage />;
  }

  // Only if there is a cached session and auth is hydrating, show the brief spinner
  if ((!isMounted || loading) && !user) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <MainAppShell />;
}



