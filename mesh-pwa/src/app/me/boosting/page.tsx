"use client";

import { useMockData } from "@/context/MockContext";
import { ArrowLeft, Flame, Clock, CreditCard, CheckCircle, AlertCircle, Sparkles, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useState, useEffect } from "react";


function CountdownTimer({ expiry }: { expiry: string }) {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const update = () => {
            const diff = new Date(expiry).getTime() - Date.now();
            if (diff <= 0) {
                setTimeLeft("Expired");
                return;
            }
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s remaining`);
            } else if (minutes > 0) {
                setTimeLeft(`${minutes}m ${seconds}s remaining`);
            } else {
                setTimeLeft(`${seconds}s remaining`);
            }
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [expiry]);

    return (
        <span className="text-xs font-semibold bg-amber-500/10 text-amber-500 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5 shrink-0">
            <Clock size={12} className="stroke-[2.5] animate-spin" style={{ animationDuration: '3s' }} />
            {timeLeft}
        </span>
    );
}

export default function BoostingPage() {
    const { currentUser, transactions, isProfileLoaded, boostProfile } = useMockData();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"history" | "active">("history");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            if (params.get("success") === "true") {
                const duration = Number(params.get("duration")) || 1;
                const amount = Number(params.get("amount")) || (duration === 24 ? 19.99 : duration === 6 ? 9.99 : 2.99);
                boostProfile(duration, "stripe", amount);
                window.history.replaceState(null, "", "/me/boosting");
            }
        }
    }, [boostProfile]);

    if (!isProfileLoaded) {
        return (
            <div className="h-full flex items-center justify-center bg-[var(--card)] dark:bg-zinc-950">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Check if the current user has an active profile boost
    // eslint-disable-next-line react-hooks/purity
    const isProfileBoostActive = currentUser.isBoosted && currentUser.boostUntil && new Date(currentUser.boostUntil).getTime() > Date.now();

    // Format timestamps nicely
    const formatDateTime = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            });
        } catch {
            return isoString;
        }
    };

    return (
        <div className={`w-full h-full overflow-y-auto pb-20 lg:pb-4 bg-[var(--card)] dark:bg-zinc-950 transition-transform`}>
            {/* Header */}
            <header className="bg-white dark:bg-zinc-900 px-3 md:px-4 py-3 flex items-center gap-2 border-b border-[var(--border)] dark:border-zinc-800 sticky top-0 z-10">
                <button 
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent("settings-subpage-back"));
                    }} 
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} className="text-[var(--primary)] dark:text-zinc-300" />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold dark:text-white flex items-center gap-2">
                        Boosting History
                    </h1>
                </div>
            </header>

            <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
                
                {/* Stats Summary Panel */}
                <div className="relative overflow-hidden bg-gradient-to-r from-sky-400 via-blue-500 to-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/10">
                    {/* Background abstract shapes */}
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-5 -mt-5" />
                    <div className="absolute left-1/3 bottom-0 w-24 h-24 bg-sky-300/20 rounded-full blur-xl" />

                    <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-white/95 text-xs font-bold uppercase tracking-wider bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-md">
                                <Sparkles size={12} className="fill-white" />
                                Profile Boosts
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Highlight Your Presence</h2>
                            <p className="text-sm text-white/85 max-w-md leading-relaxed">
                                Boosted profiles appear at the top of others&apos; Swipe Matches deck, earning you maximum visibility, likes, and matches.
                            </p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="text-center bg-white/10 rounded-2xl px-4 py-3 min-w-[80px] backdrop-blur-md">
                                <div className="text-2xl font-black">{isProfileBoostActive ? 1 : 0}</div>
                                <div className="text-[10px] uppercase font-bold text-white/70 tracking-wider">Active</div>
                            </div>
                            <div className="text-center bg-white/10 rounded-2xl px-4 py-3 min-w-[80px] backdrop-blur-md">
                                <div className="text-2xl font-black">{transactions.length}</div>
                                <div className="text-[10px] uppercase font-bold text-white/70 tracking-wider">Total</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                {transactions.length > 0 && (
                    <div className="flex border-b border-[var(--border)] dark:border-zinc-800 pb-px">
                        <button
                            onClick={() => setActiveTab("history")}
                            className={clsx(
                                "flex-1 py-3 text-sm font-semibold border-b-2 transition-all text-center",
                                activeTab === "history"
                                    ? "border-[var(--primary)] text-[var(--primary)] dark:text-blue-400 dark:border-blue-400"
                                    : "border-transparent text-[var(--secondary)] hover:text-[var(--primary)] dark:hover:text-zinc-200"
                            )}
                        >
                            Transaction History ({transactions.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("active")}
                            className={clsx(
                                "flex-1 py-3 text-sm font-semibold border-b-2 transition-all text-center flex items-center justify-center gap-2",
                                activeTab === "active"
                                    ? "border-[var(--primary)] text-[var(--primary)] dark:text-blue-400 dark:border-blue-400"
                                    : "border-transparent text-[var(--secondary)] hover:text-[var(--primary)] dark:hover:text-zinc-200"
                            )}
                        >
                            Active Boosts
                            {isProfileBoostActive && (
                                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
                            )}
                        </button>
                    </div>
                )}

                {/* Main Content Area */}
                <div>
                    {transactions.length === 0 ? (
                        /* Empty State: Never boosted before */
                        <div className="text-center py-12 px-6 border border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900/50 flex flex-col items-center">
                            <div className="w-16 h-16 bg-gradient-to-tr from-sky-400 to-blue-500 rounded-[24px] flex items-center justify-center mb-5 text-white shadow-lg shadow-blue-500/20 animate-bounce" style={{ animationDuration: '3s' }}>
                                <Flame size={32} className="fill-white" />
                            </div>
                            <h3 className="text-xl font-bold dark:text-white mb-2">No Boost History Yet</h3>
                            <p className="text-sm text-[var(--secondary)] max-w-sm leading-relaxed mb-6">
                                You haven&apos;t boosted your profile yet. Boost your presence to display at the top of others&apos; Swipe Matches deck.
                            </p>
                            <button
                                onClick={() => router.push("/requests?showBoost=true")}
                                className="px-6 py-3 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white font-bold rounded-2xl shadow-md transition-all active:scale-[0.98]"
                            >
                                Go to Find Connections
                            </button>
                        </div>
                    ) : activeTab === "active" ? (
                        /* Active Boosts Tab */
                        <div className="space-y-4">
                            {isProfileBoostActive ? (
                                <div 
                                    className="bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                                >
                                    {/* Glowing visual accent for active status */}
                                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-400 to-blue-500" />
                                    
                                    <div className="flex justify-between items-start gap-4 mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-blue-500">
                                                <Flame size={18} className="fill-blue-500 animate-pulse" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm dark:text-white">Active Profile Boost</h4>
                                                <p className="text-[10px] text-[var(--secondary)] uppercase font-semibold tracking-wider">Swipe Matches Feed</p>
                                            </div>
                                        </div>
                                        {currentUser.boostUntil && (
                                            <CountdownTimer expiry={currentUser.boostUntil} />
                                        )}
                                    </div>

                                    {/* Profile Preview Card */}
                                    <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 flex items-center gap-3">
                                        <div className={clsx("w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0", currentUser.avatar ? "bg-white" : currentUser.color)}>
                                            {currentUser.avatar ? (
                                                <>
                                                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                                                </>
                                            ) : (
                                                <span className="text-sm font-bold">{currentUser.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h5 className="font-bold text-xs dark:text-white truncate">{currentUser.name}, {currentUser.age}</h5>
                                            <p className="text-[10px] text-[var(--secondary)] truncate mt-0.5">{currentUser.bio || "Yogheart Profile"}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-end items-center text-[11px] text-[var(--secondary)] mt-3">
                                        {currentUser.boostUntil && (
                                            <span>Ends: {formatDateTime(currentUser.boostUntil)}</span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-[var(--secondary)]">
                                    <Clock size={28} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">You currently don&apos;t have any active profile boosts.</p>
                                    <button 
                                        onClick={() => router.push("/requests?showBoost=true")}
                                        className="text-xs text-[var(--primary)] font-bold mt-2 hover:underline"
                                    >
                                        Boost profile now
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Transaction History Tab */
                        <div className="space-y-3">
                            {transactions.map(tx => (
                                <div
                                    key={tx.id}
                                    className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-2xl p-4 shadow-sm"
                                >
                                    <div className="flex justify-between items-start gap-4 mb-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-sm dark:text-white">
                                                    {tx.durationHours} Hours Profile Boost
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[var(--secondary)]">
                                                {formatDateTime(tx.timestamp)}
                                            </p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <span className="font-black text-sm dark:text-white block">
                                                ${tx.amount.toFixed(2)}
                                            </span>
                                            <div className="flex items-center gap-1.5 justify-end">
                                                {tx.paymentMethod === "stripe" ? (
                                                    <span className="text-[9px] font-extrabold uppercase tracking-wide bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                        <CreditCard size={8} />
                                                        Stripe
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-extrabold uppercase tracking-wide bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/20 px-1.5 py-0.5 rounded">
                                                        Simulated
                                                    </span>
                                                )}

                                                {tx.status === "completed" ? (
                                                    <span className="text-[9px] font-extrabold uppercase tracking-wide bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                        <CheckCircle size={8} />
                                                        Paid
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-extrabold uppercase tracking-wide bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                        <AlertCircle size={8} />
                                                        {tx.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Profile preview associated with transaction */}
                                    <div className="mt-2.5 px-3 py-2 bg-gray-50 dark:bg-zinc-800/40 rounded-xl border border-gray-100 dark:border-zinc-800/60 flex items-center justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[10px] text-[var(--secondary)] block font-semibold uppercase tracking-wider mb-0.5">Boosted Item</span>
                                            <p className="text-xs text-gray-700 dark:text-zinc-300 truncate italic">
                                                &quot;{tx.statusText || "Profile Boost"}&quot;
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-[var(--secondary)] shrink-0 bg-gray-200/50 dark:bg-zinc-800 px-2 py-1 rounded-md font-mono text-[9px]">
                                            ID: {tx.id.substring(3, 10)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FAQ Section */}
                <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-3xl p-5 md:p-6 space-y-4">
                    <h3 className="font-bold text-sm dark:text-white flex items-center gap-2">
                        <HelpCircle size={16} className="text-blue-500" />
                        Frequently Asked Questions
                    </h3>
                    <div className="space-y-3.5 text-xs text-[var(--secondary)] leading-relaxed divide-y divide-gray-100 dark:divide-zinc-800/60">
                        <div className="pt-0">
                            <h4 className="font-bold text-gray-900 dark:text-zinc-200 mb-1">What does boosting do?</h4>
                            <p>Boosting floats your profile to the top of other users&apos; swipe decks for all users in your preferred demographic. It increases profile visibility by up to 10x, leading to more likes, connections, and matches.</p>
                        </div>
                        <div className="pt-3">
                            <h4 className="font-bold text-gray-900 dark:text-zinc-200 mb-1">Can I cancel a boost?</h4>
                            <p>Boosts are active for the full duration purchased (1 hour, 6 hours, or 24 hours) and cannot be paused. Refunds are not issued for unused time.</p>
                        </div>
                        <div className="pt-3">
                            <h4 className="font-bold text-gray-900 dark:text-zinc-200 mb-1">How do Stripe payments work?</h4>
                            <p>Stripe payments are processed securely. Real transactions will generate an invoice and display in this history marked with the &quot;Stripe&quot; badge, while test mode checkouts are labeled &quot;Simulated&quot;.</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
