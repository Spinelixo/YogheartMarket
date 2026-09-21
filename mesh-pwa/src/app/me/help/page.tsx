"use client";

import { ArrowLeft, HelpCircle, Mail, MessageCircle, ChevronDown, ChevronUp, ExternalLink, FileText, Shield, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useModalHistory } from "@/hooks/useModalHistory";
import { useMockData } from "@/context/MockContext";

const FAQ_ITEMS = [
    {
        question: "How do I browse and buy items on Isoko?",
        answer: "Explore listings in the Marketplace tab or search by keyword and category. When you find an item you like, tap to view high-resolution photos, descriptions, condition, and fulfillment options. Tap 'Send Message' to chat directly with the seller and agree on details."
    },
    {
        question: "How do I list an item for sale in my store?",
        answer: "Go to Marketplace and tap '+ List Item' (or go to your Store Profile). Upload photos, enter a title, price, category, item condition, and fulfillment options (pickup, delivery, or shipping). Once published, your listing appears immediately across the marketplace."
    },
    {
        question: "How does payment and fulfillment work?",
        answer: "Sellers and buyers can coordinate in-person pickup, local drop-off, or shipping directly inside chat. Sellers can also accept secure debit and credit card payments directly via Stripe."
    },
    {
        question: "How do 24-hour Statuses and Store Feed Posts work?",
        answer: "From your Storefront, you can post a 24-hour Status update to share timely announcements or daily updates that expire automatically. You can also share permanent Photos and Video Clips to your Store Feed for buyers browsing your catalog."
    },
    {
        question: "How do voice notes, calls, and messaging work?",
        answer: "In any chat thread with a seller or buyer, you can send instant text messages, photos, and files. Tap and hold the microphone icon to record voice notes, or tap the phone or video icon in the top header to start an instant direct call."
    },
    {
        question: "Are my chat messages and communications private?",
        answer: "Yes, all chat conversations and messages between buyers and sellers are private and secure. Only the participants in the conversation can view the message history."
    },
    {
        question: "How do I delete my account?",
        answer: "Go to Settings → Account → Delete Account. This action is permanent and removes all your profile data, marketplace listings, and chat conversations."
    },
];

export default function HelpPage() {
    const router = useRouter();
    const { startDirectChat, setActiveThreadId, setActiveTab } = useMockData();
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const handleContactSupport = async () => {
        const supportUser = {
            id: "support",
            name: "Yogheart Support",
            age: 25,
            bio: "Yogheart Customer Support Team",
            color: "bg-emerald-500",
            interests: [],
            avatar: null,
            settings: {
                theme: "whatsapp" as const,
                notifications: true,
                darkMode: false,
                securityNotifications: false,
                vibrate: true,
                inAppSounds: true,
                wallpaper: "default",
                privacy: { lastSeen: true, onlineStatus: true, readReceipts: true, discoverableByPhone: true },
                storage: { autoDownload: "wifi" as const }
            }
        };
        const threadId = await startDirectChat(supportUser);
        if (threadId) {
            setActiveThreadId(threadId);
            setActiveTab("chats");
            router.push("/");
        }
    };
    const [contactForm, setContactForm] = useState({ subject: "", message: "" });
    const [showContactModal, setShowContactModal] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);

    useModalHistory("contactModal", showContactModal, () => setShowContactModal(false));
    useModalHistory("termsModal", showTermsModal, () => setShowTermsModal(false));
    useModalHistory("privacyModal", showPrivacyModal, () => setShowPrivacyModal(false));


    const handleSubmit = () => {
        if (contactForm.subject && contactForm.message) {
            setSubmitted(true);
            setTimeout(() => {
                setShowContactModal(false);
                setSubmitted(false);
                setContactForm({ subject: "", message: "" });
            }, 2000);
        }
    };

    return (
        <div className={`w-full h-full overflow-y-auto pb-20 lg:pb-4 bg-[var(--card)] dark:bg-zinc-950 transition-transform`}>
            <header className="bg-white dark:bg-zinc-900 px-3 md:px-4 py-3 flex items-center gap-2 border-b border-[var(--border)] dark:border-zinc-800 sticky top-0 z-10">
                <button 
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent("settings-subpage-back"));
                    }} 
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-850 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} className="text-[var(--primary)]" />
                </button>
                <h1 className="text-lg font-semibold dark:text-white">Help</h1>
            </header>

            <div className="p-4 md:p-6 space-y-4">
                {/* Contact Options */}
                <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div
                        onClick={handleContactSupport}
                        className="flex items-center gap-4 px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="p-2 bg-[var(--card)] dark:bg-zinc-850 rounded-lg">
                            <Mail size={20} className="text-[var(--primary)]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium dark:text-white">Contact Us</h3>
                            <p className="text-xs text-[var(--secondary)]">Send us a message</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <div className="p-2 bg-[var(--card)] dark:bg-zinc-850 rounded-lg">
                            <MessageCircle size={20} className="text-[var(--primary)]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium dark:text-white">Community</h3>
                            <p className="text-xs text-[var(--secondary)]">Join discussions</p>
                        </div>
                        <ExternalLink size={16} className="text-[var(--secondary)]" />
                    </div>

                    <div onClick={() => setShowTermsModal(true)} className="flex items-center gap-4 px-4 md:px-5 py-4 border-b border-[var(--border)] dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <div className="p-2 bg-[var(--card)] dark:bg-zinc-850 rounded-lg">
                            <FileText size={20} className="text-[var(--primary)]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium dark:text-white">Terms of Service</h3>
                            <p className="text-xs text-[var(--secondary)]">Read our terms of use</p>
                        </div>
                    </div>

                    <div onClick={() => setShowPrivacyModal(true)} className="flex items-center gap-4 px-4 md:px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <div className="p-2 bg-[var(--card)] dark:bg-zinc-850 rounded-lg">
                            <Shield size={20} className="text-[var(--primary)]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium dark:text-white">Privacy Policy</h3>
                            <p className="text-xs text-[var(--secondary)]">Read our privacy practices</p>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <p className="px-1 text-xs font-semibold text-[var(--secondary)] uppercase tracking-wide mt-6">Frequently Asked Questions</p>

                <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    {FAQ_ITEMS.map((item, idx) => (
                        <div key={idx} className="border-b border-[var(--border)] dark:border-zinc-800 last:border-0">
                            <div
                                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                                className="flex items-center justify-between px-4 md:px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <HelpCircle size={18} className="text-[var(--primary)] shrink-0" />
                                    <span className="font-medium text-[15px] dark:text-white">{item.question}</span>
                                </div>
                                {expandedFaq === idx ? (
                                    <ChevronUp size={18} className="text-[var(--secondary)] shrink-0" />
                                ) : (
                                    <ChevronDown size={18} className="text-[var(--secondary)] shrink-0" />
                                )}
                            </div>
                            {expandedFaq === idx && (
                                <div className="px-4 md:px-5 pb-4 -mt-2">
                                    <p className="text-sm text-[var(--secondary)] ml-8 pl-2 border-l-2 border-[var(--primary)] dark:text-gray-300">
                                        {item.answer}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* App Info */}
                <div className="bg-white dark:bg-zinc-900 border border-[var(--border)] dark:border-zinc-800 rounded-xl p-4 md:p-5 text-center shadow-sm">
                    <h3 className="font-bold text-lg text-[var(--primary)]">Isoko</h3>
                    <p className="text-sm text-[var(--secondary)] mt-1">Version 1.0.0</p>
                    <p className="text-xs text-[var(--secondary)] mt-2">Made with ❤️ for local buying, selling, and community trade</p>
                </div>
            </div>

            {/* Contact Modal */}
            {showContactModal && (
                <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
                    <div className="modal-content p-6 dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
                        {!submitted ? (
                            <>
                                <h2 className="text-xl font-bold mb-4 dark:text-white">Contact Us</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-[var(--secondary)] uppercase block mb-2">Subject</label>
                                        <input
                                            type="text"
                                            value={contactForm.subject}
                                            onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                                            placeholder="What's this about?"
                                            className="w-full px-4 py-3 bg-[var(--card)] dark:bg-zinc-850 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary)] border border-transparent dark:border-zinc-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-[var(--secondary)] uppercase block mb-2">Message</label>
                                        <textarea
                                            value={contactForm.message}
                                            onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                                            placeholder="Tell us more..."
                                            rows={4}
                                            className="w-full px-4 py-3 bg-[var(--card)] dark:bg-zinc-850 dark:text-white rounded-xl outline-none resize-none focus:ring-2 focus:ring-[var(--primary)] border border-transparent dark:border-zinc-800"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button onClick={() => setShowContactModal(false)} className="flex-1 py-3 bg-[var(--card)] dark:bg-zinc-850 dark:text-white rounded-xl font-medium">Cancel</button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!contactForm.subject || !contactForm.message}
                                        className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl font-medium disabled:opacity-50"
                                    >
                                        Send
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="py-8 text-center">
                                <div className="w-16 h-16 bg-[var(--success)] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Mail size={28} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold dark:text-white">Message Sent!</h3>
                                <p className="text-[var(--secondary)] mt-2">We&apos;ll get back to you soon.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Terms of Service Modal */}
            {showTermsModal && (
                <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
                    <div className="modal-content p-6 max-w-md w-full mx-4 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl shadow-xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-zinc-900 z-10 pb-2">
                            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                <FileText size={22} className="text-[var(--primary)]" />
                                Terms of Service
                            </h2>
                            <button onClick={() => setShowTermsModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                <X size={20} className="text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-sm text-gray-600 dark:text-gray-300 text-left">
                            <p className="text-xs text-[var(--secondary)]">Last updated: May 25, 2026</p>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">1. Acceptance of Terms</h4>
                                <p>By accessing or using Yogheart, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.</p>
                                <p className="mt-2 text-xs text-[var(--secondary)]">We use your information to create your account, deliver our services, and help keep Yogheart safe and secure. In settings, you can access, manage, and delete your account information.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">2. Eligibility</h4>
                                <p>You must be at least 18 years old to register an account and use the services provided by Yogheart. By signing up, you represent and warrant that you meet this requirement.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">3. Safety and User Conduct</h4>
                                <p>We are committed to providing a safe, respectful environment. You agree not to engage in harassment, post fake profiles, spam other users, or upload illegal or offensive content. Violation of these policies will result in immediate ban.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">4. Content Ownership</h4>
                                <p>You retain all ownership rights to any text, photos, or videos (Moods) that you post. By sharing them, you grant Yogheart a non-exclusive license to host, display, and distribute this content within the platform.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">5. Account Deletion</h4>
                                <p>You have full control over your data and may permanently delete your account and all associated messages at any time under Settings → Account.</p>
                            </div>
                        </div>
                        <button onClick={() => setShowTermsModal(false)} className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-semibold mt-4 shadow-md transition-all active:scale-95">
                            I Agree & Close
                        </button>
                    </div>
                </div>
            )}

            {/* Privacy Policy Modal */}
            {showPrivacyModal && (
                <div className="modal-overlay" onClick={() => setShowPrivacyModal(false)}>
                    <div className="modal-content p-6 max-w-md w-full mx-4 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl shadow-xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-zinc-900 z-10 pb-2">
                            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                <Shield size={22} className="text-[var(--primary)]" />
                                Privacy Policy
                            </h2>
                            <button onClick={() => setShowPrivacyModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                <X size={20} className="text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-sm text-gray-600 dark:text-gray-300 text-left">
                            <p className="text-xs text-[var(--secondary)]">Last updated: May 25, 2026</p>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">1. Information We Collect</h4>
                                <p>We collect information you provide directly during registration and onboarding, including your name, age, phone number, bio, interests, profile photos, and public Moods. We do not track location unless explicitly authorized.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">2. Chat Privacy</h4>
                                <p>All chat messages and media shared within direct chats are end-to-end encrypted on device levels to guarantee confidentiality. Only participants of the chat can view them.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">3. Last Seen & Online Reciprocity</h4>
                                <p>To encourage respect, your online status and last seen settings are reciprocal. If you disable your online status, other users will not see when you are online, and you will not see their online status.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">4. Data Sharing & Security</h4>
                                <p>We do not sell, rent, or lease your personal information to third parties. We utilize industrial-standard security protocols to guard your account records against unauthorized access.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">5. Managing Your Data</h4>
                                <p>You hold complete authority over your information. You can edit profile parameters anytime, block contacts, or choose to delete your account entirely to remove all associated backups from our servers.</p>
                            </div>
                        </div>
                        <button onClick={() => setShowPrivacyModal(false)} className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-semibold mt-4 shadow-md transition-all active:scale-95">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
