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

  // During SSR / static generation or while auth is checking on the client,
  // do NOT render LoginPage so it never gets baked into static HTML or flashed before auth check.
  if (!isMounted || loading) {
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



