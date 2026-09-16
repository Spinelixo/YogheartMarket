"use client";

import { useState } from "react";
import { useMockData } from "@/context/MockContext";
import { clsx } from "clsx";

interface WhatsAppPermissionsModalProps {
  onClose: () => void;
}

interface PermissionStep {
  id: "notifications" | "location" | "contacts";
  title: string;
  description: string;
}

const PERMISSION_STEPS: PermissionStep[] = [
  {
    id: "notifications",
    title: "“Yogheart” Would Like to Send You Notifications",
    description: "Notifications may include alerts, sounds, incoming calls, and icon badges. These can be configured in Settings."
  },
  {
    id: "location",
    title: "Allow “Yogheart” to Access Your Location?",
    description: "Your location is used to show nearby marketplace listings, carpools, local stores, and distance calculations."
  },
  {
    id: "contacts",
    title: "Allow “Yogheart” to Access Your Contacts?",
    description: "Sync contacts to discover friends already on Yogheart, quickly start chats, and place calls with ease."
  }
];

export function WhatsAppPermissionsModal({ onClose }: WhatsAppPermissionsModalProps) {
  const {
    requestNotificationPermission,
    requestLocationPermission,
    requestContactsPermission,
  } = useMockData();

  const [stepIndex, setStepIndex] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);

  const currentStep = PERMISSION_STEPS[stepIndex];

  const finishPermissions = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("yogheart_permissions_prompted_v3", "true");
      sessionStorage.setItem("yogheart_permissions_prompted_v3", "true");
      window.dispatchEvent(new CustomEvent("yogheart_permissions_closed"));
    }
    onClose();
  };

  const advanceStep = () => {
    if (stepIndex < PERMISSION_STEPS.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      finishPermissions();
    }
  };

  const handleDeny = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRequesting) return;
    advanceStep();
  };

  const handleAllow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRequesting) return;

    setIsRequesting(true);
    try {
      if (currentStep.id === "notifications") {
        await requestNotificationPermission();
      } else if (currentStep.id === "location") {
        await requestLocationPermission();
      } else if (currentStep.id === "contacts") {
        await requestContactsPermission();
      }
    } catch (err) {
      console.warn(`Permission request error for ${currentStep.id}:`, err);
    } finally {
      setIsRequesting(false);
      advanceStep();
    }
  };

  if (!currentStep) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        // Prevent background clicks from accidentally closing the system dialog prompt flow
        e.stopPropagation();
      }}
    >
      <div
        key={currentStep.id}
        className={clsx(
          "w-[285px] sm:w-[305px] bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-200/70 dark:border-zinc-800 overflow-hidden flex flex-col items-center select-none",
          "animate-in fade-in zoom-in-95 duration-150"
        )}
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.32)"
        }}
      >
        {/* Content Area */}
        <div className="pt-6 pb-5 px-5 flex flex-col items-center text-center">
          <h3 className="font-bold text-[16px] sm:text-[17px] text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug">
            {currentStep.title}
          </h3>

          <p className="text-[12.5px] sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-[1.38] mt-2.5 px-0.5 font-normal">
            {currentStep.description}
          </p>
        </div>

        {/* Action Buttons Row */}
        <div className="w-full border-t border-zinc-200/80 dark:border-zinc-800 grid grid-cols-2">
          <button
            type="button"
            onClick={handleDeny}
            disabled={isRequesting}
            className="w-full py-3.5 text-center text-[16px] font-normal text-[#007AFF] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors border-r border-zinc-200/80 dark:border-zinc-800 cursor-pointer select-none disabled:opacity-50"
          >
            Don't Allow
          </button>

          <button
            type="button"
            onClick={handleAllow}
            disabled={isRequesting}
            className="w-full py-3.5 text-center text-[16px] font-semibold text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors cursor-pointer select-none disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isRequesting ? (
              <span className="inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Allow"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
