"use client";

import { useState, useEffect } from "react";
import { useMockData } from "@/context/MockContext";
import {
  Bell,
  Users,
  MapPin,
  CheckCircle2,
  X,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { clsx } from "clsx";

interface WhatsAppPermissionsModalProps {
  onClose: () => void;
}

export function WhatsAppPermissionsModal({ onClose }: WhatsAppPermissionsModalProps) {
  const {
    requestNotificationPermission,
    requestLocationPermission,
    requestContactsPermission,
    addNotification
  } = useMockData();

  const [notifGranted, setNotifGranted] = useState(false);
  const [contactsGranted, setContactsGranted] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGrantNotifications = async () => {
    const ok = await requestNotificationPermission();
    if (ok) setNotifGranted(true);
  };

  const handleGrantContacts = async () => {
    const ok = await requestContactsPermission();
    if (ok) setContactsGranted(true);
  };

  const handleGrantLocation = async () => {
    const ok = await requestLocationPermission();
    if (ok) setLocationGranted(true);
  };

  const handleGrantAll = async () => {
    setIsProcessing(true);
    setLocationGranted(true);
    setNotifGranted(true);
    setContactsGranted(true);

    if (typeof window !== "undefined") {
      localStorage.setItem("yogheart_permissions_prompted_v2", "true");
      sessionStorage.setItem("yogheart_permissions_prompted_v2", "true");
      window.dispatchEvent(new CustomEvent("yogheart_permissions_closed"));
    }

    try {
      await Promise.allSettled([
        requestLocationPermission(),
        requestNotificationPermission()
      ]);
      addNotification("Welcome to Yogheart! Permissions configured. 🚀");
      setTimeout(() => {
        onClose();
      }, 350);
    } catch (e) {
      console.error("Permissions setup error:", e);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("yogheart_permissions_prompted_v2", "true");
      sessionStorage.setItem("yogheart_permissions_prompted_v2", "true");
      window.dispatchEvent(new CustomEvent("yogheart_permissions_closed"));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 space-y-5 animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with WhatsApp / Yogheart style icon */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00a884] to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white leading-tight">
                Welcome to Yogheart
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                Permissions for chat, calls & rides
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
          To help you connect with friends, receive live calls & message alerts, and discover nearby rides, Yogheart needs these permissions:
        </p>

        {/* 3 WhatsApp Style Permissions Items */}
        <div className="space-y-3">
          {/* 1. Location & Nearby Rides (Moved to top) */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <MapPin size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  Location & Nearby Rides
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  Explore local carpools, market & matches
                </p>
              </div>
            </div>

            <button
              onClick={handleGrantLocation}
              disabled={locationGranted}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs",
                locationGranted
                  ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 cursor-default"
                  : "bg-[#00a884] hover:bg-[#008f72] text-white"
              )}
            >
              {locationGranted ? "Enabled ✓" : "Allow"}
            </button>
          </div>

          {/* 2. Notifications & Calls */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-[#12382f] text-[#00a884] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Bell size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  Notifications & Calls
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  Incoming calls, chat alerts & ride updates
                </p>
              </div>
            </div>

            <button
              onClick={handleGrantNotifications}
              disabled={notifGranted}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs",
                notifGranted
                  ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 cursor-default"
                  : "bg-[#00a884] hover:bg-[#008f72] text-white"
              )}
            >
              {notifGranted ? "Enabled ✓" : "Allow"}
            </button>
          </div>

          {/* 3. Contacts Access */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-[#12382f] text-[#00a884] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Users size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  Contacts Access
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  Find friends on Yogheart & chat easily
                </p>
              </div>
            </div>

            <button
              onClick={handleGrantContacts}
              disabled={contactsGranted}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs",
                contactsGranted
                  ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 cursor-default"
                  : "bg-[#00a884] hover:bg-[#008f72] text-white"
              )}
            >
              {contactsGranted ? "Enabled ✓" : "Allow"}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            onClick={handleGrantAll}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00a884] via-emerald-600 to-[#008f72] hover:brightness-105 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            <span>{isProcessing ? "Configuring Permissions..." : "Continue & Enable All"}</span>
          </button>

          <button
            onClick={handleDismiss}
            className="w-full py-2.5 text-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
