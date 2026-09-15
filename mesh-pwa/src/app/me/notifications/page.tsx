"use client";

import { useMockData } from "@/context/MockContext";
import { ArrowLeft, Bell, Music, Smartphone, Volume2, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

const SOUND_OPTIONS = ["Default", "Pop", "Chime", "Ding", "None"];

export default function NotificationsPage() {
    const { currentUser, updateSettings, requestNotificationPermission } = useMockData();
    const [showSoundModal, setShowSoundModal] = useState(false);

    const selectedSound = currentUser?.settings?.notificationSound || "Default";
    const notificationsEnabled = currentUser?.settings?.notifications ?? true;
    const vibrateEnabled = currentUser?.settings?.vibrate ?? true;
    const inAppSoundsEnabled = currentUser?.settings?.inAppSounds ?? true;

    return (
        <div className={`w-full h-full overflow-y-auto pb-20 lg:pb-4 bg-gray-50 dark:bg-gray-950 transition-transform`}>
            <header className="bg-white dark:bg-zinc-900 px-3 md:px-4 py-3 flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-10">
                <button 
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent("settings-subpage-back"));
                    }} 
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} className="text-blue-600" />
                </button>
                <h1 className="text-lg font-semibold dark:text-white">Notifications</h1>
            </header>

            <div className="p-4 md:p-6 space-y-4">
                <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/85 rounded-xl overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-gray-800">
                        <div className="flex items-center gap-4">
                            <Bell size={20} className="text-[var(--secondary)]" />
                            <div>
                                <span className="font-medium block dark:text-white">Show Notifications</span>
                                <span className="text-xs text-[var(--secondary)]">Banner and sound alerts</span>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                const nextVal = !notificationsEnabled;
                                if (nextVal) {
                                    await requestNotificationPermission();
                                }
                                updateSettings('notifications', nextVal);
                            }}
                            className={clsx("w-12 h-7 rounded-full transition-colors relative", notificationsEnabled ? "bg-[var(--success)]" : "bg-gray-300")}
                        >
                            <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", notificationsEnabled ? "left-6" : "left-1")} />
                        </button>
                    </div>

                    <div
                        onClick={() => setShowSoundModal(true)}
                        className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <Music size={20} className="text-[var(--secondary)]" />
                            <span className="font-medium dark:text-white">Notification Sound</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--primary)] font-medium">{selectedSound}</span>
                            <ChevronRight size={18} className="text-[var(--secondary)]" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-4 md:px-5 py-4">
                        <div className="flex items-center gap-4">
                            <Smartphone size={20} className="text-[var(--secondary)]" />
                            <span className="font-medium dark:text-white">Vibrate</span>
                        </div>
                        <button
                            onClick={() => updateSettings('vibrate', !vibrateEnabled)}
                            className={clsx("w-12 h-7 rounded-full transition-colors relative", vibrateEnabled ? "bg-[var(--success)]" : "bg-gray-300")}
                        >
                            <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", vibrateEnabled ? "left-6" : "left-1")} />
                        </button>
                    </div>
                </div>

                <p className="px-1 text-xs font-semibold text-[var(--secondary)] uppercase tracking-wide mt-6">In-App</p>

                <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/85 rounded-xl overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-4 md:px-5 py-4">
                        <div className="flex items-center gap-4">
                            <Volume2 size={20} className="text-[var(--secondary)]" />
                            <span className="font-medium dark:text-white">In-App Sounds</span>
                        </div>
                        <button
                            onClick={() => updateSettings('inAppSounds', !inAppSoundsEnabled)}
                            className={clsx("w-12 h-7 rounded-full transition-colors relative", inAppSoundsEnabled ? "bg-[var(--success)]" : "bg-gray-300")}
                        >
                            <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm", inAppSoundsEnabled ? "left-6" : "left-1")} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sound Picker Modal */}
            {showSoundModal && (
                <div className="modal-overlay" onClick={() => setShowSoundModal(false)}>
                    <div className="modal-content p-6 dark:bg-gray-800" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Notification Sound</h2>
                        <div className="space-y-1">
                            {SOUND_OPTIONS.map(sound => (
                                <div
                                    key={sound}
                                    onClick={() => {
                                        updateSettings('notificationSound', sound);
                                        setShowSoundModal(false);
                                    }}
                                    className={clsx(
                                        "px-4 py-3 rounded-xl cursor-pointer transition-colors dark:text-white",
                                        selectedSound === sound ? "bg-[var(--primary)] text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                    )}
                                >
                                    {sound}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
