"use client";

import { useState } from "react";
import { useMockData } from "@/context/MockContext";
import {
  Bell,
  Users,
  MapPin,
  ChevronLeft,
  X
} from "lucide-react";
import { clsx } from "clsx";

interface WhatsAppPermissionsModalProps {
  onClose: () => void;
}

interface StepConfig {
  id: string;
  stepNumber: number;
  screenTitle: string;
  previewTag: string;
  previewTime: string;
  previewTitle: string;
  previewSubtitle: string;
  previewIcon: any;
  previewIconBg: string;
  dialogTitle: string;
  dialogMessage: string;
}

const STEPS: StepConfig[] = [
  {
    id: "notifications",
    stepNumber: 1,
    screenTitle: "Get support from Yogheart",
    previewTag: "From Yogheart",
    previewTime: "now",
    previewTitle: "Stay in the loop with friends",
    previewSubtitle: "Incoming calls, new messages & ride updates appear directly on your phone.",
    previewIcon: Bell,
    previewIconBg: "bg-gradient-to-br from-orange-400 to-amber-500 text-white",
    dialogTitle: "'Yogheart' Would Like to Send You Notifications",
    dialogMessage: "Notifications may include alerts, sounds, and icon badges. These can be configured in Settings."
  },
  {
    id: "location",
    stepNumber: 2,
    screenTitle: "Explore your neighborhood",
    previewTag: "Nearby Discovery",
    previewTime: "live",
    previewTitle: "Local rides & marketplace deals",
    previewSubtitle: "Find campus carpools and deals posted by verified members around your area.",
    previewIcon: MapPin,
    previewIconBg: "bg-gradient-to-br from-amber-500 to-orange-500 text-white",
    dialogTitle: "'Yogheart' Would Like to Use Your Location",
    dialogMessage: "Your location is used to discover nearby rides, carpools, and community marketplace items while using the app."
  },
  {
    id: "contacts",
    stepNumber: 3,
    screenTitle: "Connect with your friends",
    previewTag: "Sync Contacts",
    previewTime: "secure",
    previewTitle: "Chat with people you know",
    previewSubtitle: "Instantly see which friends and classmates are already chatting on Yogheart.",
    previewIcon: Users,
    previewIconBg: "bg-gradient-to-br from-[#00a884] to-emerald-600 text-white",
    dialogTitle: "'Yogheart' Would Like to Access Your Contacts",
    dialogMessage: "Contacts are used to help you find friends and start secure conversations without typing phone numbers."
  }
];

export function WhatsAppPermissionsModal({ onClose }: WhatsAppPermissionsModalProps) {
  const {
    requestNotificationPermission,
    requestLocationPermission,
    requestContactsPermission,
    addNotification
  } = useMockData();

  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const activeStep = STEPS[currentStep] || STEPS[0];
  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  const finalizePermissions = (message?: string) => {
    setIsClosing(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("yogheart_permissions_prompted_v2", "true");
      sessionStorage.setItem("yogheart_permissions_prompted_v2", "true");
      window.dispatchEvent(new CustomEvent("yogheart_permissions_closed"));
    }
    if (message) {
      addNotification(message);
    }
    setTimeout(() => {
      onClose();
    }, 250);
  };

  const handleNextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      finalizePermissions("Welcome to Yogheart! You're all set. 🚀");
    }
  };

  const handleAllow = async () => {
    setIsProcessing(true);
    try {
      if (activeStep.id === "notifications") {
        await requestNotificationPermission();
      } else if (activeStep.id === "location") {
        await requestLocationPermission();
      } else if (activeStep.id === "contacts") {
        await requestContactsPermission();
      }
    } catch (err) {
      console.error("Permission request error:", err);
    } finally {
      setIsProcessing(false);
      handleNextStep();
    }
  };

  const handleDeny = () => {
    handleNextStep();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      finalizePermissions();
    }
  };

  const handleSkipAll = () => {
    finalizePermissions();
  };

  const IconComponent = activeStep.previewIcon;

  return (
    <div
      className={clsx(
        "fixed inset-0 z-[120] bg-[#FBF7EE] dark:bg-[#121214] flex flex-col justify-between p-5 sm:p-8 select-none transition-opacity duration-200 overflow-y-auto overscroll-contain",
        isClosing ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* Top Header Bar with Back, Progress Bar, and Skip */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between gap-3 pt-2 sm:pt-4">
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBack}
          className="w-10 h-10 rounded-full border border-[#E5DAC6] dark:border-zinc-800 bg-[#F7F2E5] dark:bg-zinc-900 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-[#EFE7D5] dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 shadow-xs"
          title="Back"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Progress Bar (Focustown Style) */}
        <div className="flex-1 max-w-[200px] sm:max-w-[240px] h-3 bg-[#EEDEC7] dark:bg-zinc-800 rounded-full overflow-hidden p-0.5 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-[#FF8A3D] transition-all duration-300 ease-out shadow-xs"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Skip / Dismiss Button */}
        <button
          type="button"
          onClick={handleSkipAll}
          className="h-10 px-3 rounded-full border border-[#E5DAC6] dark:border-zinc-800 bg-[#F7F2E5] dark:bg-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-[#EFE7D5] dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 shadow-xs"
          title="Skip"
        >
          Skip
        </button>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-md mx-auto my-auto py-6 flex flex-col items-center justify-center space-y-6 sm:space-y-8">
        {/* Screen Title (Warm Focustown Aesthetic) */}
        <h2 className="text-2xl sm:text-3xl font-black text-center text-[#3D2E1E] dark:text-zinc-100 tracking-tight leading-snug px-2">
          {activeStep.screenTitle}
        </h2>

        {/* Feature Context Preview Card */}
        <div
          key={`preview-${activeStep.id}`}
          className="w-full bg-[#F6EEE0] dark:bg-zinc-900/90 border border-[#E8DAC2] dark:border-zinc-800 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div
            className={clsx(
              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
              activeStep.previewIconBg
            )}
          >
            <IconComponent size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mb-0.5">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {activeStep.previewTag}
              </span>
              <span className="font-medium text-zinc-400 dark:text-zinc-500">
                {activeStep.previewTime}
              </span>
            </div>
            <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
              {activeStep.previewTitle}
            </p>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed line-clamp-2">
              {activeStep.previewSubtitle}
            </p>
          </div>
        </div>

        {/* The Native-Styled Popup Dialog Card */}
        <div
          key={`dialog-${activeStep.id}`}
          className="w-full bg-[#FAF6EE] dark:bg-[#1E1E22] border border-[#E6D8C0] dark:border-zinc-800 rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        >
          {/* Dialog Header & Body Text */}
          <div className="px-6 pt-6 pb-5 text-center">
            <h3 className="font-bold text-[16px] sm:text-[17px] text-[#2B2117] dark:text-white leading-snug">
              {activeStep.dialogTitle}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-2.5 leading-relaxed font-normal px-1">
              {activeStep.dialogMessage}
            </p>
          </div>

          {/* Divided 2-Button Row (Don't Allow | Allow) */}
          <div className="border-t border-[#E6D8C0] dark:border-zinc-800 flex items-stretch divide-x divide-[#E6D8C0] dark:divide-zinc-800">
            <button
              type="button"
              onClick={handleDeny}
              disabled={isProcessing}
              className="flex-1 py-3.5 text-center text-sm font-semibold text-[#007AFF] dark:text-sky-400 hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              Don&apos;t Allow
            </button>
            <button
              type="button"
              onClick={handleAllow}
              disabled={isProcessing}
              className="flex-1 py-3.5 text-center text-sm font-bold text-[#FF8A3D] dark:text-orange-400 hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-[#FF8A3D] border-t-transparent rounded-full animate-spin" />
              ) : (
                "Allow"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Step Indicator Dots */}
      <div className="w-full max-w-md mx-auto flex items-center justify-center gap-2 pb-2">
        {STEPS.map((step, idx) => (
          <div
            key={step.id}
            className={clsx(
              "h-1.5 rounded-full transition-all duration-300",
              idx === currentStep
                ? "w-6 bg-[#FF8A3D]"
                : idx < currentStep
                ? "w-2 bg-[#E5DAC6] dark:bg-zinc-700"
                : "w-2 bg-[#EEDEC7]/60 dark:bg-zinc-800"
            )}
          />
        ))}
      </div>
    </div>
  );
}
