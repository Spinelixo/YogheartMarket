"use client";

import { useState } from "react";
import { useMockData } from "@/context/MockContext";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";

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
    title: "“Isoko” Would Like to Send You Notifications",
    description: "Notifications may include alerts, sounds, incoming calls, and icon badges. These can be configured in Settings."
  },
  {
    id: "location",
    title: "Allow “Isoko” to Access Your Location?",
    description: "Your location is used to show nearby marketplace listings, carpools, local stores, and distance calculations."
  },
  {
    id: "contacts",
    title: "Allow “Isoko” to Access Your Contacts?",
    description: "Sync contacts to discover friends already on Isoko, quickly start chats, and place calls with ease."
  }
];

export function WhatsAppPermissionsModal({ onClose }: WhatsAppPermissionsModalProps) {
  // On desktop devices (screens >= 768px), never show this permissions modal
  if (typeof window !== "undefined" && window.innerWidth >= 768) {
    return null;
  }

  const {
    requestNotificationPermission,
    requestLocationPermission,
    requestContactsPermission,
  } = useMockData();

  const [isOpen, setIsOpen] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);

  const currentStep = PERMISSION_STEPS[stepIndex];

  const finishPermissions = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("yogheart_permissions_prompted_v7", "true");
      sessionStorage.setItem("yogheart_permissions_prompted_v7", "true");
      window.dispatchEvent(new CustomEvent("yogheart_permissions_closed"));
    }
    setIsOpen(false);
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

  return (
    <AnimatePresence 
      mode="wait"
      onExitComplete={() => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      {isOpen && (
        <motion.div 
          key="permissions-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[120] bg-black/20 flex items-end justify-center px-4 pb-20 sm:pb-24 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence mode="wait">
            {currentStep && (
              <motion.div
                key={currentStep.id}
                initial={{ y: 160, opacity: 0, scale: 0.94 }}
                animate={{ 
                  y: 0, 
                  opacity: 1, 
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 420,
                    damping: 24,
                    mass: 0.8
                  }
                }}
                exit={{ 
                  y: 180, 
                  opacity: 0, 
                  scale: 0.94,
                  transition: {
                    duration: 0.22,
                    ease: [0.36, 0, 0.66, -0.04]
                  }
                }}
                className={clsx(
                  "w-[calc(100%-20px)] max-w-[370px] bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col items-center select-none shadow-2xl"
                )}
                onClick={(e) => e.stopPropagation()}
                style={{
                  boxShadow: "0 22px 50px -10px rgba(0,0,0,0.38)"
                }}
              >
                {/* Content Area */}
                <div className="pt-6 pb-5 px-6 flex flex-col items-center text-center">
                  <h3 className="font-bold text-[17px] sm:text-[18px] text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug">
                    {currentStep.title}
                  </h3>

                  <p className="text-[13.5px] sm:text-[14px] text-zinc-600 dark:text-zinc-400 leading-[1.4] mt-2.5 px-1 font-normal">
                    {currentStep.description}
                  </p>
                </div>

                {/* Action Buttons Row */}
                <div className="w-full border-t border-zinc-200/80 dark:border-zinc-800 grid grid-cols-2">
                  <button
                    type="button"
                    onClick={handleDeny}
                    disabled={isRequesting}
                    className="w-full py-4 text-center text-[16.5px] font-normal text-[#007AFF] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors border-r border-zinc-200/80 dark:border-zinc-800 cursor-pointer select-none disabled:opacity-50"
                  >
                    Don't Allow
                  </button>

                  <button
                    type="button"
                    onClick={handleAllow}
                    disabled={isRequesting}
                    className="w-full py-4 text-center text-[16.5px] font-semibold text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors cursor-pointer select-none disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isRequesting ? (
                      <span className="inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Allow"
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
