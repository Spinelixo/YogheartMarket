"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { playSendSound } from "@/lib/sounds";
import localforage from "localforage";
import {
    collection, doc, onSnapshot, getDoc, setDoc, updateDoc, deleteDoc,
    query, where, orderBy, getDocs, writeBatch, arrayUnion, arrayRemove,
    limit
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL, uploadBytes } from "firebase/storage";
import { rankCandidates } from "@/lib/recommendations/recommendationEngine";



const VAPID_PUBLIC_KEY = "BF_QcUtOi4e9RA9p5wAPA8DO5n9feiolnmJX7BG2PKsrpHhTVtf8uznKAHxCsFn1RFjf683WOpNIY4tm0rNppqY";

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export type Settings = {
    notifications: boolean;
    darkMode: boolean;
    securityNotifications: boolean;
    vibrate: boolean;
    inAppSounds: boolean;
    theme: "light" | "dark" | "system" | "glow-light" | "glow-dark" | "whatsapp" | "light-green" | "classic-blue" | "cyber-glow" | "neon-violet" | "sunset-amber" | "light-glow";
    chatTheme?: string;
    wallpaper: string;
    privacy: {
        lastSeen: boolean;
        onlineStatus: boolean;
        readReceipts: boolean;
        discoverableByPhone: boolean;
        showDiscoverSuggestions?: boolean;
        showAge?: boolean;
    };
    reduceMotion?: boolean;
    enterKeySends?: boolean;
    fontSize?: "small" | "medium" | "large";
    notificationSound?: string;
    messageTone?: string;
    storage: {
        autoDownload: "wifi" | "cellular" | "never";
        lessDataForCalls?: boolean;
    };
    defaultIcebreaker?: string;
    showIcebreakersInChats?: boolean;
    appIcon?: string;
};

export type User = {
    id: string;
    name: string;
    age: number;
    bio: string;
    color: string;
    interests: string[];
    avatar: string | null;
    settings: Settings;
    lastSeen?: string;
    isSavedContact?: boolean;
    phoneNumber?: string;
    email?: string;
    blockedUserIds?: string[];
    savedContactIds?: string[];
    pinnedThreadIds?: string[];
    pinnedProfileIds?: string[];
    localContacts?: { name: string; phoneNumber: string }[];
    // Extended dating profile fields
    dob?: string;
    gender?: string;
    showGender?: boolean;
    showMe?: string;
    relationshipGoal?: string;
    jobTitle?: string;
    company?: string;
    education?: string;
    kids?: string;
    smoking?: string;
    drinking?: string;
    photos?: string[];
    latitude?: number | null;
    longitude?: number | null;
    isBoosted?: boolean;
    boostUntil?: string;
    onboardingComplete?: boolean;
    location?: string;
    radiusPreference?: "Local" | "Global";
    countryCode?: string;
    createdAt?: string;
    isAdmin?: boolean;
    marketplaceStore?: MarketplaceStoreProfile;
};

export type MarketplaceSellerType = 
  | "individual" 
  | "chef" 
  | "restaurant" 
  | "fashion" 
  | "florist" 
  | "real_estate" 
  | "auto" 
  | "electronics" 
  | "artisan" 
  | "other";

export interface MarketplaceStoreProfile {
  ownerName?: string;
  storeName?: string;
  sellerType?: MarketplaceSellerType;
  customSellerType?: string;
  headline?: string;
  bio?: string;
  bannerImage?: string;
  avatar?: string | null;
  location?: string;
  fulfillmentOptions?: ("delivery" | "pickup" | "shipping")[];
  businessHours?: string;
  rating?: number;
  reviewCount?: number;
  responseRate?: string;
  joinedYear?: string;
  badges?: string[];
  phoneOrContact?: string;
}

export type MessageType = "text" | "voice" | "image" | "file" | "poll" | "video" | "playlist" | "itinerary_poll" | "system" | "location" | "contact";

export type Reaction = {
    emoji: string;
    userId: string;
};

export type Message = {
    id: string;
    sender: "me" | "them";
    text: string;
    time: string;
    type: MessageType;
    duration?: number;
    imageUrl?: string;
    thumbnail?: string;
    fileName?: string;
    fileSize?: string;
    latitude?: number;
    longitude?: number;
    contactUser?: any;
    poll?: {
        question: string;
        options: { text: string; votes: number }[];
        voted?: number;
        votedIndices?: number[];
        allowMultiple?: boolean;
    };
    read?: boolean;
    edited?: boolean;
    replyTo?: {
        id: string;
        sender: "me" | "them";
        senderId?: string;
        text: string;
    };
    reactions?: Reaction[];
    createdAt?: string;
    senderId?: string;
    delivered?: boolean;
};

export type Thread = {
    id: string;
    user: User;
    messages: Message[];
    unread: boolean;
    lastMessage: string;
    lastTime: string;
    isArchived?: boolean;
    isMuted?: boolean;
    updatedAt?: string;
    isGroup?: boolean;
    groupName?: string;
    groupAvatar?: string;
    groupMemberIds?: string[];
    creatorId?: string;
    adminIds?: string[];
    leftParticipantIds?: string[];
    status?: "pending" | "accepted";
    initiatedBy?: string;
    typingParticipantIds?: string[];
    groupBio?: string;
    groupLocation?: string;
    isMarketplace?: boolean;
};

export function isMarketplaceThread(t: Thread): boolean {
    if (!t) return false;
    return !!(t.isMarketplace || t.id?.startsWith("mkt_") || t.id?.startsWith("marketplace_"));
}

export type Request = {
    id: string;
    user: User;
    message: string;
    time: string;
    isThreadRequest?: boolean;
};

export type StatusReply = {
    id: string;
    userId: string;
    userName: string;
    text: string;
    time: string;
};

export type StatusMediaItem = {
    id: string;
    mediaUrl: string;
    mediaType: "photo" | "video";
};

export type Status = {
    id: string;
    userId: string;
    username: string;
    userColor: string;
    userAvatar: string | null;
    textContent?: string;
    mediaUrl?: string;
    mediaType?: "photo" | "video";
    mediaItems?: StatusMediaItem[];
    title?: string;
    backgroundColor?: string;
    timestamp: string;
    isBoosted: boolean;
    boostUntil?: string;
    replies: StatusReply[];
};

export type Transaction = {
    id: string;
    userId: string;
    statusId: string;
    statusText: string;
    timestamp: string;
    amount: number;
    durationHours: number;
    paymentMethod: 'simulated' | 'stripe';
    status: 'completed' | 'pending' | 'failed';
};

export type MoodComment = {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string | null;
    text: string;
    createdAt: string;
    likes?: string[];
    replyTo?: string | null;
};

export type Mood = {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string | null;
    userColor: string;
    type: "photo" | "video";
    mediaUrl: string;
    caption: string;
    createdAt: string;
    likes: string[];  // array of userIds who liked
    comments: MoodComment[];
    sourceProfilePhoto?: boolean; // true if auto-created from a dating profile photo
};

export type DraftComment = {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string | null;
    userColor: string;
    text: string;
    createdAt: string;
    likes?: string[];          // array of userIds who liked this comment
    replyTo?: string | null;   // id of the parent comment if this is a reply
    replies?: DraftComment[];  // nested replies (stored inline for simplicity)
};

export type Draft = {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string | null;
    userColor: string;
    text: string;
    createdAt: string;
    likes: string[]; // array of userIds who liked
    comments: DraftComment[];
};

export type CallLog = {
    id: string;
    callerId: string;
    callerName: string;
    callerAvatar: string | null;
    calleeId: string;
    calleeName: string;
    calleeAvatar: string | null;
    type: "audio" | "video";
    status: "ringing" | "answered" | "ended" | "rejected" | "missed";
    timestamp: string;
    duration?: number;
    read?: boolean;
};

export type MarketplaceCategory =
    | "All"
    | "Electronics"
    | "Vehicles"
    | "Home & Living"
    | "Fashion & Apparel"
    | "Sports & Hobbies"
    | "Beauty & Health"
    | "Free / Giveaways"
    | "Other";

export type MarketplaceCondition = "Brand New" | "Like New" | "Good" | "Fair";

export type MarketplaceItem = {
    id: string;
    sellerId: string;
    sellerName: string;
    sellerOwnerName?: string;
    sellerAvatar: string | null;
    sellerColor?: string;
    sellerLocation?: string;
    title: string;
    price: number; // 0 = Free
    category: string;
    condition: MarketplaceCondition;
    description: string;
    images: string[];
    location: string;
    status: "active" | "sold" | "pending" | "reserved";
    createdAt: string;
    savedBy: string[]; // user IDs who favorited
    viewsCount?: number;
};


export type RideVehicle = {
    make: string;
    model: string;
    year: number;
    color: string;
    plate?: string;
    features: string[]; // e.g. "WiFi", "AC", "Pets Allowed", "No Smoking", "Luggage Space", "USB Chargers"
};

export type RideBooking = {
    id: string;
    rideId: string;
    passengerId: string;
    passengerName: string;
    passengerAvatar: string | null;
    passengerColor?: string;
    seatsBooked: number;
    totalPrice: number;
    status: 'confirmed' | 'canceled';
    specialRequest?: string;
    createdAt: string;
};

export type Ride = {
    id: string;
    driverId: string;
    driverName: string;
    driverAvatar: string | null;
    driverColor?: string;
    driverRating: number;
    driverRatingsCount: number;
    driverIsVerified: boolean;
    origin: string;
    originCity: string;
    destination: string;
    destinationCity: string;
    departureTime: string; // ISO string
    estimatedDurationHours?: number;
    price: number; // Price per seat
    totalSeats: number;
    availableSeats: number;
    vehicle: RideVehicle;
    description: string;
    status: 'scheduled' | 'active' | 'completed' | 'canceled';
    pickupLocationNote?: string;
    dropoffLocationNote?: string;
    bookings: RideBooking[];
    savedBy: string[];
    createdAt: string;
};

type MockContextType = {
    currentUser: User;
    isProfileLoaded: boolean;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    suggestions: User[];
    requests: Request[];
    threads: Thread[];
    archivedThreads: Thread[];
    blockedUsers: User[];
    savedContacts: User[];
    notifications: string[];
    allDatingUsers: User[];
    statuses: Status[];
    transactions: Transaction[];
    moods: Mood[];
    callLogs: CallLog[];
    sendIcebreaker: (user: User, message: string, status?: "pending" | "accepted") => Promise<string>;
    acceptRequest: (id: string) => void;
    declineRequest: (id: string) => void;
    acceptThread: (threadId: string) => Promise<void>;
    sendMessage: (threadId: string, text: string, type?: MessageType, extra?: Partial<Message>) => Promise<string | undefined>;
    editMessage: (threadId: string, messageId: string, newText: string) => void;
    votePoll: (threadId: string, messageId: string, optionIndex: number) => Promise<void>;
    addReaction: (threadId: string, messageId: string, emoji: string) => void;
    removeReaction: (threadId: string, messageId: string, emoji: string) => void;
    updateProfile: (name: string, bio: string, interests: string[], age?: number, phoneNumber?: string, email?: string, extra?: Record<string, any>) => Promise<void>;
    updateGroupProfile: (threadId: string, groupName: string, groupBio: string, groupLocation: string, groupAvatar: string | null) => Promise<void>;
    makeGroupAdmin: (threadId: string, memberId: string) => Promise<void>;
    updateAvatar: (url: string | null) => void;
    updateSettings: (key: string, value: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => void;
    markThreadRead: (threadId: string) => void;
    clearChat: (threadId: string) => void;
    archiveChat: (threadId: string) => void;
    unarchiveChat: (threadId: string) => void;
    muteChat: (threadId: string, muted: boolean) => void;
    blockUser: (userId: string) => void;
    unblockUser: (userId: string) => void;
    reportUser: (_userId: string, _reason: string) => void;
    saveContact: (userId: string) => void;
    deleteThread: (threadId: string, forEveryone?: boolean, silent?: boolean) => Promise<void>;
    deleteThreads: (threadIds: string[], forEveryone?: boolean, silent?: boolean) => Promise<void>;
    leaveGroup: (threadId: string) => Promise<void>;
    removeUserFromGroup: (threadId: string, userId: string) => Promise<void>;
    addUsersToGroup: (threadId: string, userIds: string[]) => Promise<void>;
    deleteMessage: (threadId: string, messageId: string, forEveryone?: boolean) => void;
    findUserByPhone: (phone: string) => User | undefined;
    findUserByEmail: (email: string) => User | undefined;
    startDirectChat: (targetUser: User, autoSendIcebreaker?: boolean) => Promise<string>;
    startGroupChat: (name: string, members: User[]) => Promise<string>;
    syncDeviceContacts: (contactsList: { name: string; phoneNumber: string }[]) => Promise<void>;
    addNewLocalContact: (name: string, phoneNumber: string) => Promise<void>;
    postStatus: (textContent?: string, mediaUrl?: string, mediaType?: "photo" | "video", backgroundColor?: string, targetUserId?: string) => Promise<string | null>;
    boostStatus: (statusId: string, durationHours: number, paymentMethod?: 'simulated' | 'stripe', amount?: number) => Promise<void>;
    boostProfile: (durationHours: number, paymentMethod?: 'simulated' | 'stripe', amount?: number) => Promise<void>;
    updateStatus: (statusId: string, updates: Partial<Status>) => Promise<void>;
    deleteStatus: (statusId: string) => Promise<void>;
    uploadImageToStorage: (base64OrDataUrl: string, path: string) => Promise<string>;
    replyToStatus: (statusId: string, replyText: string) => Promise<string | null>;
    togglePinThread: (threadId: string) => Promise<{ success: boolean; error?: string }>;
    togglePinProfile: (profileId: string) => Promise<{ success: boolean; error?: string }>;
    postMood: (type: "photo" | "video", mediaDataUrl: string, caption: string, sourceProfilePhoto?: boolean, targetUserId?: string) => Promise<void>;
    deleteMood: (moodId: string) => Promise<void>;
    updateMood: (moodId: string, updates: Partial<Mood>) => Promise<void>;
    likeMood: (moodId: string) => Promise<void>;
    commentOnMood: (moodId: string, text: string, replyTo?: string | null) => Promise<void>;
    likeCommentOnMood: (moodId: string, commentId: string) => Promise<void>;
    editCommentOnMood: (moodId: string, commentId: string, newText: string) => Promise<void>;
    deleteCommentOnMood: (moodId: string, commentId: string) => Promise<void>;
    getMoodsForUser: (userId: string) => Mood[];
    drafts: Draft[];
    postDraft: (text: string, targetUserId?: string) => Promise<void>;
    deleteDraft: (draftId: string) => Promise<void>;
    likeDraft: (draftId: string) => Promise<void>;
    commentOnDraft: (draftId: string, text: string, replyToCommentId?: string) => Promise<void>;
    likeComment: (draftId: string, commentId: string) => Promise<void>;
    getStatusesForUser: (userId: string) => Status[];
    addNotification: (msg: string) => void;
    clearCallLogs: () => Promise<void>;
    markCallLogsAsRead: () => Promise<void>;
    activeThreadId: string | null;
    setActiveThreadId: (id: string | null) => void;
    currentPath: string;
    currentSearchParams: URLSearchParams;
    requestNotificationPermission: () => Promise<boolean>;
    requestLocationPermission: () => Promise<boolean>;
    requestContactsPermission: () => Promise<boolean>;
    marketplaceItems: MarketplaceItem[];
    createMarketplaceListing: (data: {
        title: string;
        price: number;
        category: string;
        condition: MarketplaceCondition;
        description: string;
        location?: string;
        images: string[];
    }) => Promise<string>;
    updateMarketplaceListing: (id: string, updates: Partial<MarketplaceItem>) => Promise<void>;
    deleteMarketplaceListing: (id: string) => Promise<void>;
    toggleSaveMarketplaceItem: (id: string) => Promise<void>;
    sendMarketplaceInquiry: (sellerUser: User, item: MarketplaceItem, customMessage?: string) => Promise<string>;
    updateMarketplaceStoreProfile: (storeData: Partial<MarketplaceStoreProfile>) => Promise<void>;

    rides: Ride[];
    postRide: (data: {
        origin: string;
        destination: string;
        departureTime: string;
        price: number;
        totalSeats: number;
        vehicle: RideVehicle;
        description: string;
        pickupLocationNote?: string;
        dropoffLocationNote?: string;
        estimatedDurationHours?: number;
    }) => Promise<string>;
    bookRide: (
        rideId: string,
        seatsBooked: number,
        specialRequest?: string
    ) => Promise<string>;
    cancelRide: (id: string) => Promise<void>;
    cancelRideBooking: (rideId: string, bookingId: string) => Promise<void>;
    toggleSaveRide: (id: string) => Promise<void>;
    shareRideToChat: (ride: Ride, targetThreadId?: string, targetUserId?: string) => Promise<string>;
    sendRideInquiry: (driverUser: User, ride: Ride, customMessage?: string) => Promise<string>;
    unlockedRideIds: string[];
    unlockRide: (rideId: string) => void;
};

const DEFAULT_SETTINGS: Settings = {
    notifications: true,
    darkMode: false,
    securityNotifications: true,
    vibrate: true,
    inAppSounds: true,
    theme: "light",
    chatTheme: "default",
    wallpaper: "gradient3",
    privacy: { lastSeen: true, onlineStatus: true, readReceipts: true, discoverableByPhone: true, showDiscoverSuggestions: true, showAge: true },
    reduceMotion: false,
    enterKeySends: true,
    fontSize: "medium",
    notificationSound: "Default",
    messageTone: "whoosh",
    storage: { autoDownload: "wifi", lessDataForCalls: false },
    appIcon: "default",
};

const INITIAL_USER: User = {
    id: "me",
    name: "",
    age: 18,
    bio: "",
    color: "bg-emerald-200",
    interests: [],
    avatar: null,
    photos: [],
    settings: DEFAULT_SETTINGS,
    phoneNumber: "+15550001234",
    savedContactIds: ["demo_maya", "demo_lucas", "demo_elena"],
    isBoosted: false,
};

const DEFAULT_DATING_PROFILES: User[] = [
    {
        id: "demo_maya",
        name: "Maya Chen",
        age: 24,
        bio: "Coffee enthusiast, vintage thrifter, and weekend ceramicist. Let's trade favorite playlists or discover secret pastry spots 🥐☕",
        color: "bg-amber-200",
        interests: ["Fashion", "Design", "Art", "Coffee", "Thrifting", "Travel"],
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
        photos: [
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80"
        ],
        settings: DEFAULT_SETTINGS,
        phoneNumber: "+15551112222",
        location: "Toronto, ON",
        relationshipGoal: "Long-term relationship",
        jobTitle: "Fashion Designer & Stylist",
        company: "Studio Chen",
        education: "Ryerson University",
        onboardingComplete: true,
        isBoosted: false
    },
    {
        id: "demo_lucas",
        name: "Lucas Vance",
        age: 27,
        bio: "Rock climbing, indie rock concerts, and perfecting homemade sourdough. Looking for someone to join midnight gelato runs 🧗‍♂️🍦",
        color: "bg-blue-200",
        interests: ["Bouldering", "Indie Music", "Cooking", "Outdoors", "Tech", "Running"],
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80",
        photos: [
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&auto=format&fit=crop&q=80"
        ],
        settings: DEFAULT_SETTINGS,
        phoneNumber: "+15553334444",
        location: "Montreal, QC",
        relationshipGoal: "Dating & Romance",
        jobTitle: "Software Engineer",
        company: "Vance Interactive",
        education: "McGill University",
        onboardingComplete: true,
        isBoosted: true,
        boostUntil: new Date(Date.now() + 86400000).toISOString()
    },
    {
        id: "demo_elena",
        name: "Elena Rostova",
        age: 25,
        bio: "Film cameras, modern architecture, and scenic coastal road trips. Tell me about the best meal you've ever had in your life 📸🌊",
        color: "bg-rose-200",
        interests: ["Photography", "Architecture", "Road Trips", "Wine", "Museums", "Yoga"],
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80",
        photos: [
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&auto=format&fit=crop&q=80"
        ],
        settings: DEFAULT_SETTINGS,
        phoneNumber: "+15555556666",
        location: "Vancouver, BC",
        relationshipGoal: "Looking for Love",
        jobTitle: "Architectural Designer",
        company: "Pacific Modern Studio",
        education: "UBC",
        onboardingComplete: true,
        isBoosted: false
    },
    {
        id: "demo_chloe",
        name: "Chloe Davis",
        age: 23,
        bio: "Baking fresh sourdough & croissants by morning, park walks with my golden retriever by afternoon. Matcha over coffee any day 🐶🥐",
        color: "bg-emerald-200",
        interests: ["Baking", "Dogs", "Matcha", "Fitness", "Nature", "Cinema"],
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80",
        photos: [
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80"
        ],
        settings: DEFAULT_SETTINGS,
        phoneNumber: "+15557778888",
        location: "New York, NY",
        relationshipGoal: "Serious Relationship",
        jobTitle: "Head Pastry Chef",
        company: "L'Aroma Bakery",
        education: "Culinary Institute",
        onboardingComplete: true,
        isBoosted: false
    },
    {
        id: "demo_jordan",
        name: "Jordan Miller",
        age: 26,
        bio: "Late-night studio sessions, vinyl collecting, and rooftop sunset views. Let me make you a personalized Spotify mixtape 🎧✨",
        color: "bg-purple-200",
        interests: ["Music", "Vinyl", "Audio", "Concerts", "Urban Exploring"],
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80",
        photos: [
            "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80"
        ],
        settings: DEFAULT_SETTINGS,
        phoneNumber: "+15559990000",
        location: "Chicago, IL",
        relationshipGoal: "Dating & Fun",
        jobTitle: "Music Producer",
        company: "Echo Soundworks",
        education: "Columbia College",
        onboardingComplete: true,
        isBoosted: false
    },
    {
        id: "demo_sophia",
        name: "Sophia Rossi",
        age: 24,
        bio: "Mid-century modern obsessed, espresso martini lover, always planning my next weekend getaway. Looking for someone who doesn't take life too seriously ✈️🍸",
        color: "bg-teal-200",
        interests: ["Design", "Travel", "Cocktails", "Pilates", "Cuisine", "Sailing"],
        avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80",
        photos: [
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80"
        ],
        settings: DEFAULT_SETTINGS,
        phoneNumber: "+15552223333",
        location: "Los Angeles, CA",
        relationshipGoal: "Long-term relationship",
        jobTitle: "Interior Designer",
        company: "Rossi & Co Design",
        education: "USC",
        onboardingComplete: true,
        isBoosted: true,
        boostUntil: new Date(Date.now() + 86400000).toISOString()
    }
];

const INITIAL_MARKETPLACE_ITEMS: MarketplaceItem[] = [
    {
        id: "item_demo_1",
        sellerId: "demo_maya",
        sellerName: "Maya Chen",
        sellerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
        sellerColor: "bg-amber-200",
        sellerLocation: "Toronto, ON",
        title: "Handmade Ceramic Matcha Bowl & Whisk",
        price: 38,
        category: "Home & Living",
        condition: "Brand New",
        description: "Wheel-thrown speckled stoneware matcha chawan with bamboo whisk. Never used, beautiful earthy glaze.",
        images: ["https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80"],
        location: "Toronto, ON",
        status: "active",
        createdAt: new Date().toISOString(),
        savedBy: [],
        viewsCount: 14
    },
    {
        id: "item_demo_2",
        sellerId: "demo_lucas",
        sellerName: "Lucas Vance",
        sellerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80",
        sellerColor: "bg-blue-200",
        sellerLocation: "Montreal, QC",
        title: "Fuji X-T30 Mirrorless Camera + 18-55mm Lens",
        price: 850,
        category: "Electronics",
        condition: "Like New",
        description: "In pristine condition with original box, strap, and 2 spare batteries. Low shutter count.",
        images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80"],
        location: "Montreal, QC",
        status: "active",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        savedBy: [],
        viewsCount: 32
    },
    {
        id: "item_demo_3",
        sellerId: "demo_elena",
        sellerName: "Elena Rostova",
        sellerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80",
        sellerColor: "bg-rose-200",
        sellerLocation: "Vancouver, BC",
        title: "Mid-Century Modern Teak Coffee Table",
        price: 195,
        category: "Furniture",
        condition: "Good",
        description: "Authentic vintage 1960s Danish teak coffee table. Solid wood, slight patina on edge but structurally rock solid.",
        images: ["https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=600&q=80"],
        location: "Vancouver, BC",
        status: "active",
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        savedBy: [],
        viewsCount: 27
    }
];
const INITIAL_RIDES: Ride[] = [
    {
        id: "ride_1",
        driverId: "driver_sarah",
        driverName: "Sarah Jenkins",
        driverAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
        driverColor: "bg-emerald-200",
        driverRating: 4.9,
        driverRatingsCount: 54,
        driverIsVerified: true,
        origin: "Montreal, QC (Berri-UQAM)",
        originCity: "Montreal",
        destination: "Toronto, ON (Union Station)",
        destinationCity: "Toronto",
        departureTime: new Date(Date.now() + 4 * 3600000).toISOString(),
        estimatedDurationHours: 5.5,
        price: 45,
        totalSeats: 4,
        availableSeats: 3,
        vehicle: {
            make: "Toyota",
            model: "RAV4 Hybrid",
            year: 2023,
            color: "Midnight Blue",
            plate: "E53 XYZ",
            features: ["WiFi", "AC", "Pets Allowed", "No Smoking", "USB Chargers"]
        },
        description: "Heading to Toronto for the weekend. Have plenty of room in the trunk for luggage. Can do drop-offs along Hwy 401 near Kingston.",
        status: "scheduled",
        pickupLocationNote: "Metro Berri-UQAM main entrance on Ste-Catherine",
        dropoffLocationNote: "Toronto Union Station Front St. drop-off",
        bookings: [],
        savedBy: [],
        createdAt: new Date().toISOString()
    },
    {
        id: "ride_2",
        driverId: "driver_marc",
        driverName: "Marc-Antoine Roy",
        driverAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        driverColor: "bg-blue-200",
        driverRating: 4.8,
        driverRatingsCount: 112,
        driverIsVerified: true,
        origin: "Boston, MA (Back Bay)",
        originCity: "Boston",
        destination: "New York, NY (Penn Station)",
        destinationCity: "New York",
        departureTime: new Date(Date.now() + 18 * 3600000).toISOString(),
        estimatedDurationHours: 4.0,
        price: 35,
        totalSeats: 3,
        availableSeats: 2,
        vehicle: {
            make: "Tesla",
            model: "Model 3",
            year: 2022,
            color: "Solid Pearl White",
            plate: "ELC 4821",
            features: ["AC", "No Smoking", "No Pets", "Device Charging", "Quiet Ride"]
        },
        description: "Direct drive from Boston to Manhattan. Super smooth electric ride, clean passenger space. 1 standard carry-on per passenger.",
        status: "scheduled",
        pickupLocationNote: "Boston Back Bay Station entrance",
        dropoffLocationNote: "Manhattan 34th St / Penn Station",
        bookings: [],
        savedBy: [],
        createdAt: new Date().toISOString()
    },
    {
        id: "ride_3",
        driverId: "driver_chloe",
        driverName: "Chloe Chen",
        driverAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80",
        driverColor: "bg-purple-200",
        driverRating: 4.7,
        driverRatingsCount: 29,
        driverIsVerified: true,
        origin: "Vancouver, BC (Commercial-Broadway)",
        originCity: "Vancouver",
        destination: "Seattle, WA (Downtown / Westlake)",
        destinationCity: "Seattle",
        departureTime: new Date(Date.now() + 28 * 3600000).toISOString(),
        estimatedDurationHours: 3.5,
        price: 28,
        totalSeats: 4,
        availableSeats: 4,
        vehicle: {
            make: "Subaru",
            model: "Crosstrek",
            year: 2021,
            color: "Desert Khaki",
            plate: "BC-992-X",
            features: ["Luggage Rack", "AC", "Winter Tires", "Music Control"]
        },
        description: "Driving down to Seattle. Please ensure you have your passport ready for border crossing! Happy to share good indie music.",
        status: "scheduled",
        pickupLocationNote: "Commercial-Broadway Station Safeway parking",
        dropoffLocationNote: "Westlake Center 4th Ave entrance",
        bookings: [],
        savedBy: [],
        createdAt: new Date().toISOString()
    },
    {
        id: "ride_4",
        driverId: "driver_alex",
        driverName: "Alexandre Tremblay",
        driverAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
        driverColor: "bg-amber-200",
        driverRating: 5.0,
        driverRatingsCount: 41,
        driverIsVerified: true,
        origin: "Ottawa, ON (Bayshore)",
        originCity: "Ottawa",
        destination: "Montreal, QC (Vendôme)",
        destinationCity: "Montreal",
        departureTime: new Date(Date.now() + 8 * 3600000).toISOString(),
        estimatedDurationHours: 2.2,
        price: 24,
        totalSeats: 3,
        availableSeats: 2,
        vehicle: {
            make: "Honda",
            model: "Civic Touring",
            year: 2024,
            color: "Sonic Gray",
            plate: "OTT 7182",
            features: ["AC", "Heated Seats", "No Smoking", "USB-C Charging"]
        },
        description: "Daily commuter trip from Ottawa to Montreal. Fast, punctual, drop-off near Metro Vendôme.",
        status: "scheduled",
        pickupLocationNote: "Bayshore Shopping Centre Transitway",
        dropoffLocationNote: "Metro Vendôme / Westmount",
        bookings: [],
        savedBy: [],
        createdAt: new Date().toISOString()
    }
];



const uploadImageToStorage = async (fileOrDataUrl: string | File | Blob, path: string): Promise<string> => {
    if (typeof fileOrDataUrl === "string" && !fileOrDataUrl.startsWith("data:")) {
        return fileOrDataUrl;
    }
    try {
        const storageRef = ref(storage, path);
        if (typeof fileOrDataUrl === "string") {
            await uploadString(storageRef, fileOrDataUrl, "data_url");
        } else {
            await uploadBytes(storageRef, fileOrDataUrl);
        }
        return await getDownloadURL(storageRef);
    } catch (err) {
        console.error("Storage upload failed:", err);
        throw err;
    }
};

const formatRelativeTime = (timestampString: string | undefined): string => {
    if (!timestampString) return "Now";
    if (timestampString === "Now" || timestampString === "Just now") return "Now";
    try {
        const date = new Date(timestampString);
        const timeMs = date.getTime();
        if (isNaN(timeMs)) return timestampString;
        const diffMs = Date.now() - timeMs;
        
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return "Now";
        if (diffMin < 60) return `${diffMin}min ago`;
        
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}h ago`;
        
        const diffDays = Math.floor(diffHr / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
        return timestampString;
    }
};

const MockContext = createContext<MockContextType | undefined>(undefined);

export function MockDataProvider({ children }: { children: ReactNode }) {
    const { user: authUser, resolvedUid } = useAuth();
    const currentUserId = resolvedUid || authUser?.uid || null;


    // Local states connected to Firestore subscriptions
    const [currentUser, setCurrentUser] = useState<User>(INITIAL_USER);

    // Hydration cache loading from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const cachedTheme = localStorage.getItem("mesh_theme");
            const cachedDarkMode = localStorage.getItem("mesh_dark_mode");
            const cachedWallpaper = localStorage.getItem("mesh_wallpaper");
            const cachedChatTheme = localStorage.getItem("mesh_chat_theme");
            const cachedFontSize = localStorage.getItem("mesh_font_size");
            const cachedMessageTone = localStorage.getItem("mesh_message_tone");

            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentUser(prev => {
                const settings = { ...prev.settings };
                if (cachedTheme) settings.theme = cachedTheme as any;
                if (cachedDarkMode !== null) settings.darkMode = cachedDarkMode === "true";
                if (cachedWallpaper) settings.wallpaper = cachedWallpaper;
                if (cachedChatTheme) settings.chatTheme = cachedChatTheme as any;
                if (cachedFontSize) settings.fontSize = cachedFontSize as any;
                if (cachedMessageTone) settings.messageTone = cachedMessageTone;

                // Sync body classes immediately so user does not see light mode flash
                document.documentElement.classList.remove('glow-dark', 'glow-light', 'theme-whatsapp', 'theme-light-green', 'theme-classic-blue', 'theme-cyber-glow', 'theme-neon-violet', 'theme-sunset-amber', 'theme-light-glow');
                const activeTheme = cachedTheme || settings.theme || "light";
                const activeDark = cachedDarkMode !== null ? cachedDarkMode === "true" : settings.darkMode;

                if (activeTheme === "system") {
                    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                    if (systemDark) document.documentElement.classList.add('dark');
                    else document.documentElement.classList.remove('dark');
                } else if (activeTheme === "cyber-glow") {
                    document.documentElement.classList.add('dark', 'theme-cyber-glow');
                } else if (activeTheme === "neon-violet") {
                    document.documentElement.classList.add('dark', 'theme-neon-violet');
                } else if (activeTheme === "sunset-amber") {
                    document.documentElement.classList.add('dark', 'theme-sunset-amber');
                } else if (activeTheme === "light-glow") {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('theme-light-glow');
                } else if (activeTheme === "glow-dark") {
                    document.documentElement.classList.add('dark', 'glow-dark');
                } else if (activeTheme === "glow-light") {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('glow-light');
                } else if (activeTheme === "whatsapp") {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('theme-whatsapp');
                } else if (activeTheme === "light-green") {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('theme-light-green');
                } else if (activeTheme === "classic-blue") {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('theme-classic-blue');
                } else {
                    if (activeDark) document.documentElement.classList.add('dark');
                    else document.documentElement.classList.remove('dark');
                }

                return { ...prev, settings };
            });
        }
    }, []);

    const [allDatingUsers, setAllDatingUsers] = useState<User[]>([]);
    const [requestsList, setRequestsList] = useState<any[]>([]);
    const [threadsList, setThreadsList] = useState<any[]>([]);
    const deletedThreadIdsRef = useRef<Set<string>>(new Set());
    const [threadsMessages, setThreadsMessages] = useState<{ [threadId: string]: Message[] }>({});
    const [blockedUsersList, setBlockedUsersList] = useState<User[]>([]);
    const [savedContactsList, setSavedContactsList] = useState<User[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [moods, setMoods] = useState<Mood[]>([]);
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [callLogs, setCallLogs] = useState<CallLog[]>([]);
    const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>(INITIAL_MARKETPLACE_ITEMS);
    const [rides, setRides] = useState<Ride[]>(INITIAL_RIDES);
    const [unlockedRideIds, setUnlockedRideIds] = useState<string[]>(() => {
        if (typeof window !== "undefined") {
            try {
                const stored = localStorage.getItem("yogheart_unlocked_rides");
                return stored ? JSON.parse(stored) : [];
            } catch (e) {
                return [];
            }
        }
        return [];
    });
    const [appNotifications, setAppNotifications] = useState<string[]>([]);
    const [isProfileLoaded, setIsProfileLoaded] = useState(false);

    // Background media preloader (eagerly cache all received/sent images & videos in background)
    const preloadedUrlsRef = useRef<Set<string>>(new Set());
    const threadsMessagesRef = useRef(threadsMessages);
    threadsMessagesRef.current = threadsMessages;
    
    useEffect(() => {
        if (typeof window === "undefined") return;

        const preloadMedia = () => {
            const msgs = threadsMessagesRef.current;
            Object.values(msgs).forEach((messages) => {
                // Only check last 5 messages per thread (most recent media)
                const recent = messages.slice(-5);
                recent.forEach((msg) => {
                    if ((msg.type === "image" || msg.type === "video") && msg.imageUrl) {
                        if (!preloadedUrlsRef.current.has(msg.imageUrl)) {
                            preloadedUrlsRef.current.add(msg.imageUrl);
                            
                            if (msg.type === "image") {
                                const img = new Image();
                                img.src = msg.imageUrl;
                            }
                            // Skip video preloading — too heavy for background
                        }
                    }
                });
            });
        };

        // Run once after a short delay, then every 30s
        const initialTimeout = setTimeout(preloadMedia, 2000);
        const interval = setInterval(preloadMedia, 30000);
        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
    }, []); // Run once on mount, not on every message change

    const [currentPath, setCurrentPath] = useState<string>("/");
    const [currentSearchParams, setCurrentSearchParams] = useState<URLSearchParams>(new URLSearchParams());
    const [activeTab, setActiveTabState] = useState<string>("marketplace");
    const [activeThreadId, setActiveThreadIdState] = useState<string | null>(null);

    const setActiveTab = (tab: string) => {
        setActiveTabState(tab);
    };

    const setActiveThreadId = (id: string | null) => {
        setActiveThreadIdState(id);
    };

    // Override pushState and replaceState to support locationchange client-side navigation events safely
    useEffect(() => {
        if (typeof window === "undefined") return;

        const originalPushState = window.history.pushState;
        window.history.pushState = function (state, title, url) {
            originalPushState.apply(this, [state, title, url]);
            window.dispatchEvent(new Event("locationchange"));
        };

        const originalReplaceState = window.history.replaceState;
        window.history.replaceState = function (state, title, url) {
            originalReplaceState.apply(this, [state, title, url]);
            window.dispatchEvent(new Event("locationchange"));
        };

        const handlePopState = () => {
            window.dispatchEvent(new Event("locationchange"));
        };

        window.addEventListener("popstate", handlePopState);

        return () => {
            window.history.pushState = originalPushState;
            window.history.replaceState = originalReplaceState;
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

    // Listen to locationchange to update both state synchronization and URL parameter states
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleLocationChange = () => {
            const path = window.location.pathname;
            const searchParams = new URLSearchParams(window.location.search);
            setCurrentPath(path);
            setCurrentSearchParams(searchParams);

            const threadId = searchParams.get("id");
            const userId = searchParams.get("userId");
            const isViewingOtherProfile = path === "/profile" && ((userId && (userId !== "me" || searchParams.has("from"))) || searchParams.has("groupId") || searchParams.has("from"));

            if (path === "/inbox" && threadId) {
                setActiveThreadIdState(threadId);
                const fromParam = searchParams.get("from");
                if (fromParam === "marketplace") {
                    setActiveTabState("marketplace");
                } else if (fromParam !== "archived") {
                    setActiveTabState("chats");
                }
            } else if (isViewingOtherProfile) {
                // Keep underlying chat thread and active tab loaded in background
            } else {
                setActiveThreadIdState(null);
                if (path === "/" || path === "/marketplace" || path.startsWith("/marketplace")) setActiveTabState("marketplace");
                else if (path === "/chats") setActiveTabState("chats");
                else if (path === "/calls") setActiveTabState("calls");
                else if (path === "/store" || path.startsWith("/store")) setActiveTabState("store");
                else if (path === "/profile") setActiveTabState("profile");
                else if (path === "/me" || path === "/admin" || path.startsWith("/admin") || path.startsWith("/me/")) setActiveTabState("me");
            }
        };

        window.addEventListener("locationchange", handleLocationChange);
        
        // Initial run
        handleLocationChange();

        return () => {
            window.removeEventListener("locationchange", handleLocationChange);
        };
    }, [currentUser?.id]);

    const addNotification = (msg: string) => {
        setAppNotifications((prev) => [...prev, msg]);
        setTimeout(() => setAppNotifications((prev) => prev.slice(1)), 3000);
    };

    // Push Notifications & Service Worker Setup
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
            return;
        }

        // When a new SW takes control, update background control smoothly without jarring page reloads
        const onControllerChange = () => {
            console.log("[SW] Service worker active and controlling clients.");
        };

        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

        // Register Service Worker
        navigator.serviceWorker.register("/sw.js").then((reg) => {
            console.log("Service Worker registered successfully:", reg);
            
            // If a new SW is already waiting, tell it to activate immediately
            if (reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }

            // Listen for new SW installations
            reg.addEventListener("updatefound", () => {
                const newWorker = reg.installing;
                if (newWorker) {
                    newWorker.addEventListener("statechange", () => {
                        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                            // New version installed while old one was controlling — prompt skip
                            console.log("[SW] New version available — activating...");
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                }
            });

            // Check for updates immediately
            reg.update();

            // Check for updates every 15 minutes to guarantee rapid background updates
            const updateInterval = setInterval(() => {
                reg.update().catch(console.error);
            }, 15 * 60 * 1000);

            return () => clearInterval(updateInterval);
        }).catch((err) => {
            console.error("Service Worker registration failed:", err);
        });

        return () => {
            navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
        };
    }, []);

    useEffect(() => {
        if (!currentUserId || currentUserId === "me") return;

        const notificationsEnabled = currentUser.settings.notifications ?? true;

        const updatePushSubscription = async () => {
            const isCapacitor = typeof window !== "undefined" && (window as any).Capacitor;
            if (isCapacitor) {
                try {
                    const { PushNotifications } = await import('@capacitor/push-notifications');
                    if (notificationsEnabled) {
                        const permStatus = await PushNotifications.checkPermissions();
                        if (permStatus.receive === 'granted') {
                            await PushNotifications.register();
                            
                            await PushNotifications.addListener('registration', async (token) => {
                                const deviceToken = token.value;
                                console.log('Capacitor native push registration success, token: ' + deviceToken);
                                const userDocRef = doc(db, "users", currentUserId);
                                const userSnap = await getDoc(userDocRef);
                                if (userSnap.exists()) {
                                    const data = userSnap.data();
                                    const existingTokens = data.fcmTokens || [];
                                    if (!existingTokens.includes(deviceToken)) {
                                        await updateDoc(userDocRef, {
                                            fcmTokens: arrayUnion(deviceToken)
                                        });
                                    }
                                }
                            });
                        }
                    }
                } catch (err) {
                    console.error("Error setting up Capacitor push notifications:", err);
                }
                return;
            }

            try {
                const reg = await navigator.serviceWorker.ready;
                if (notificationsEnabled) {
                    // Request Notification Permission
                    const permission = await Notification.requestPermission();
                    if (permission !== "granted") {
                        console.warn("Notification permission was not granted:", permission);
                        return;
                    }

                    // Get existing subscription or create new
                    let subscription = await reg.pushManager.getSubscription();
                    if (!subscription) {
                        const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
                        subscription = await reg.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: convertedKey
                        });
                    }

                    // Save subscription to user document in Firestore under `pushSubscriptions` array
                    const subJson = subscription.toJSON();
                    const userDocRef = doc(db, "users", currentUserId);
                    const userSnap = await getDoc(userDocRef);
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        const existingSubs = data.pushSubscriptions || [];
                        const alreadySaved = existingSubs.some((s: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => s.endpoint === subJson.endpoint);
                        if (!alreadySaved) {
                            await updateDoc(userDocRef, {
                                pushSubscriptions: arrayUnion(subJson)
                            });
                            console.log("Push subscription synchronized with Firestore.");
                        }
                    }
                } else {
                    // User disabled notifications. Check if subscribed and unsubscribe them.
                    const subscription = await reg.pushManager.getSubscription();
                    if (subscription) {
                        const subJson = subscription.toJSON();
                        await subscription.unsubscribe();
                        // Remove from Firestore
                        const userDocRef = doc(db, "users", currentUserId);
                        await updateDoc(userDocRef, {
                            pushSubscriptions: arrayRemove(subJson)
                        });
                        console.log("Unsubscribed from push notifications.");
                    }
                }
            } catch (err) {
                console.error("Error setting up push notifications:", err);
            }
        };

        updatePushSubscription();
    }, [currentUserId, currentUser.settings.notifications]);

    // 1. Subscribe to Current User Profile
    useEffect(() => {
        if (!currentUserId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentUser(INITIAL_USER);
            return;
        }

        const userDocRef = doc(db, "users", currentUserId);

        // ─── Super-Admin Bootstrap ────────────────────────────────────────────
        // These credentials are ALWAYS recognized as admin. If Firestore doesn't
        // have isAdmin:true yet (e.g. first login), we silently patch it so the
        // user never has to do anything manually.
        const SUPER_ADMIN_EMAIL = "lionelr314@gmail.com";
        const SUPER_ADMIN_PHONE = "+14388646007";

        const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                // Auto-grant admin to the designated owner if not already set
                const isSuperAdmin =
                    (data.email && data.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) ||
                    (data.phoneNumber && data.phoneNumber === SUPER_ADMIN_PHONE);

                if (isSuperAdmin && !data.isAdmin) {
                    // Silently patch — the snapshot will re-fire with isAdmin:true
                    updateDoc(userDocRef, { isAdmin: true }).catch(console.error);
                    return;
                }

                const dbSettings = data.settings || {};
                let needsUpdate = false;
                const updates: any = {};

                if (!data.settings) {
                    updates.settings = DEFAULT_SETTINGS;
                    needsUpdate = true;
                } else {
                    if (!dbSettings.privacy) {
                        updates["settings.privacy"] = DEFAULT_SETTINGS.privacy;
                        needsUpdate = true;
                    }
                    if (!dbSettings.storage) {
                        updates["settings.storage"] = DEFAULT_SETTINGS.storage;
                        needsUpdate = true;
                    }
                }

                if (needsUpdate) {
                    updateDoc(userDocRef, updates).catch(console.error);
                }
                
                const mergedSettings: Settings = {
                    notifications: dbSettings.notifications !== undefined ? dbSettings.notifications : DEFAULT_SETTINGS.notifications,
                    darkMode: dbSettings.darkMode !== undefined ? dbSettings.darkMode : DEFAULT_SETTINGS.darkMode,
                    securityNotifications: dbSettings.securityNotifications !== undefined ? dbSettings.securityNotifications : DEFAULT_SETTINGS.securityNotifications,
                    vibrate: dbSettings.vibrate !== undefined ? dbSettings.vibrate : DEFAULT_SETTINGS.vibrate,
                    inAppSounds: dbSettings.inAppSounds !== undefined ? dbSettings.inAppSounds : DEFAULT_SETTINGS.inAppSounds,
                    theme: dbSettings.theme !== undefined ? dbSettings.theme : DEFAULT_SETTINGS.theme,
                    chatTheme: dbSettings.chatTheme !== undefined ? dbSettings.chatTheme : DEFAULT_SETTINGS.chatTheme,
                    wallpaper: dbSettings.wallpaper !== undefined ? dbSettings.wallpaper : DEFAULT_SETTINGS.wallpaper,
                    reduceMotion: dbSettings.reduceMotion !== undefined ? dbSettings.reduceMotion : DEFAULT_SETTINGS.reduceMotion,
                    enterKeySends: dbSettings.enterKeySends !== undefined ? dbSettings.enterKeySends : DEFAULT_SETTINGS.enterKeySends,
                    fontSize: dbSettings.fontSize !== undefined ? dbSettings.fontSize : DEFAULT_SETTINGS.fontSize,
                    notificationSound: dbSettings.notificationSound !== undefined ? dbSettings.notificationSound : DEFAULT_SETTINGS.notificationSound,
                    messageTone: dbSettings.messageTone !== undefined ? dbSettings.messageTone : DEFAULT_SETTINGS.messageTone,
                    defaultIcebreaker: dbSettings.defaultIcebreaker !== undefined ? dbSettings.defaultIcebreaker : DEFAULT_SETTINGS.defaultIcebreaker,
                    showIcebreakersInChats: dbSettings.showIcebreakersInChats !== undefined ? dbSettings.showIcebreakersInChats : DEFAULT_SETTINGS.showIcebreakersInChats,
                    appIcon: dbSettings.appIcon !== undefined ? dbSettings.appIcon : DEFAULT_SETTINGS.appIcon,
                    privacy: {
                        ...DEFAULT_SETTINGS.privacy,
                        ...(dbSettings.privacy || {})
                    },
                    storage: {
                        ...DEFAULT_SETTINGS.storage,
                        ...(dbSettings.storage || {})
                    }
                };

                if (typeof window !== "undefined") {
                    if (mergedSettings.theme) localStorage.setItem("mesh_theme", mergedSettings.theme);
                    localStorage.setItem("mesh_dark_mode", String(mergedSettings.darkMode));
                    if (mergedSettings.wallpaper) localStorage.setItem("mesh_wallpaper", mergedSettings.wallpaper);
                    if (mergedSettings.chatTheme) localStorage.setItem("mesh_chat_theme", mergedSettings.chatTheme);
                    if (mergedSettings.fontSize) localStorage.setItem("mesh_font_size", mergedSettings.fontSize);
                    if (mergedSettings.messageTone) localStorage.setItem("mesh_message_tone", mergedSettings.messageTone);
                }

                const storeData = data.marketplaceStore || {};
                const effectiveAvatar = storeData.avatar || data.avatar || data.photoURL || null;
                const effectiveOwnerName = storeData.ownerName || data.name || "User";
                const effectiveStoreName = storeData.storeName || effectiveOwnerName;

                setCurrentUser({
                    id: docSnap.id,
                    name: effectiveOwnerName,
                    age: data.age || 24,
                    bio: data.bio || "",
                    color: data.color || "bg-emerald-200",
                    interests: data.interests || [],
                    avatar: effectiveAvatar,
                    phoneNumber: data.phoneNumber || "",
                    email: data.email || "",
                    blockedUserIds: data.blockedUserIds || [],
                    savedContactIds: data.savedContactIds || [],
                    pinnedThreadIds: data.pinnedThreadIds || [],
                    pinnedProfileIds: data.pinnedProfileIds || [],
                    localContacts: data.localContacts || [],
                    settings: mergedSettings,
                    dob: data.dob || "",
                    gender: data.gender || "",
                    showGender: data.showGender ?? true,
                    showMe: data.showMe || "",
                    relationshipGoal: data.relationshipGoal || "",
                    jobTitle: data.jobTitle || "",
                    company: data.company || "",
                    education: data.education || "",
                    kids: data.kids || "",
                    smoking: data.smoking || "",
                    drinking: data.drinking || "",
                    photos: data.photos || (effectiveAvatar ? [effectiveAvatar] : []),
                    isBoosted: data.isBoosted || false,
                    boostUntil: data.boostUntil || null,
                    lastSeen: data.lastSeen || null,
                    location: storeData.location || data.location || "",
                    radiusPreference: (data.radiusPreference || "Local") as "Local" | "Global",
                    countryCode: data.countryCode || "",
                    isAdmin: data.isAdmin || isSuperAdmin || false,
                    marketplaceStore: {
                        ...storeData,
                        ownerName: effectiveOwnerName,
                        storeName: effectiveStoreName,
                        avatar: effectiveAvatar
                    }
                });
                setIsProfileLoaded(true);
            } else {
                if (docSnap.metadata.fromCache) {
                    console.log("MockContext: user doc not found in cache, waiting for server...");
                    return;
                }
                if (typeof window !== "undefined" && (window as any).isDeletingAccount) {
                    console.log("MockContext: User is deleting account, skipping document seeding.");
                    return;
                }
                // Seed initial document for the current logged in user
                const initialDoc: User = {
                    id: currentUserId,
                    name: authUser?.displayName || "User",
                    age: 24,
                    bio: "Hey there! I'm using Yogheart.",
                    color: "bg-emerald-200",
                    interests: [],
                    avatar: authUser?.photoURL || null,
                    phoneNumber: authUser?.phoneNumber || "",
                    email: authUser?.email || "",
                    blockedUserIds: [],
                    savedContactIds: [],
                    pinnedThreadIds: [],
                    pinnedProfileIds: [],
                    localContacts: [],
                    settings: DEFAULT_SETTINGS,
                    createdAt: new Date().toISOString(),
                    dob: "",
                    gender: "",
                    showGender: true,
                    showMe: "",
                    relationshipGoal: "",
                    jobTitle: "",
                    company: "",
                    education: "",
                    kids: "",
                    smoking: "",
                    drinking: "",
                    photos: [],
                    location: "",
                    radiusPreference: "Local",
                    countryCode: "",
                    isAdmin: false
                };
                try {
                    setCurrentUser(initialDoc);
                    setIsProfileLoaded(true);
                } catch (err) {
                    console.error("MockContext: failed to set initial local user:", err);
                    setCurrentUser(INITIAL_USER);
                }
            }
        }, (error) => {
            console.error("MockContext: onSnapshot profile error:", error);
            setCurrentUser(INITIAL_USER);
        });

        return () => unsubscribe();
    }, [currentUserId, authUser]);

    // Handle Dark Mode setting / Theme Hook Synchronization
    useEffect(() => {
        const theme = currentUser.settings.theme || "light";
        const darkMode = currentUser.settings.darkMode;

        // Clean slate of special theme classes
        document.documentElement.classList.remove('glow-dark', 'glow-light', 'theme-whatsapp', 'theme-light-green', 'theme-classic-blue', 'theme-cyber-glow', 'theme-neon-violet', 'theme-sunset-amber', 'theme-light-glow');

        const applyDark = (isDark: boolean) => {
            if (isDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        if (theme === "system") {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            applyDark(mediaQuery.matches);
            const initialMetaColor = mediaQuery.matches ? "#0b141a" : "#e4ebd9";
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) {
                meta.setAttribute('content', initialMetaColor);
            }

            const handleChange = (e: MediaQueryListEvent) => {
                applyDark(e.matches);
                const m = document.querySelector('meta[name="theme-color"]');
                if (m) {
                    m.setAttribute('content', e.matches ? "#0b141a" : "#e4ebd9");
                }
            };

            mediaQuery.addEventListener("change", handleChange);
            return () => {
                mediaQuery.removeEventListener("change", handleChange);
            };
        } else if (theme === "cyber-glow") {
            document.documentElement.classList.add('dark', 'theme-cyber-glow');
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', "#030806");
        } else if (theme === "neon-violet") {
            document.documentElement.classList.add('dark', 'theme-neon-violet');
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', "#080414");
        } else if (theme === "sunset-amber") {
            document.documentElement.classList.add('dark', 'theme-sunset-amber');
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', "#0c0702");
        } else if (theme === "light-glow") {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('theme-light-glow');
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', "#f0fdf4");
        } else if (theme === "glow-dark") {
            document.documentElement.classList.add('dark', 'glow-dark');
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', "#070913");
        } else if (theme === "glow-light") {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('glow-light');
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', "#fefcf6");
        } else if (theme === "whatsapp") {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('theme-whatsapp');
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', "#e4ebd9");
        } else if (theme === "light-green") {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('theme-light-green');
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', "#eef9ea");
        } else if (theme === "classic-blue") {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('theme-classic-blue');
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', "#ffffff");
        } else {
            applyDark(darkMode);
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', darkMode ? "#0b141a" : "#e4ebd9");
        }
    }, [currentUser.settings.theme, currentUser.settings.darkMode]);



    // 2. Subscribe to all dating-app users (limit 100) to populate Suggestions
    useEffect(() => {
        if (!currentUserId || typeof currentUserId !== "string") return;

        const q = query(collection(db, "users"), limit(100));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs
                .map(d => ({ ...d.data(), id: d.id } as User))
                .filter(u => u.id !== currentUserId && u.id !== currentUser?.id && u.bio !== undefined); // Exclude self and non-dating app users
            
            setAllDatingUsers(users);
        }, (error) => {
            console.error("MockContext: onSnapshot dating users error:", error);
            setAllDatingUsers([]);
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUserId]);



    // Heartbeat to update lastSeen in Firestore
    useEffect(() => {
        if (!currentUserId) return;

        const userDocRef = doc(db, "users", currentUserId);

        const setOnline = async () => {
            try {
                await updateDoc(userDocRef, { lastSeen: "online" });
            } catch (err: any) {
                if (err?.code !== "not-found" && !err?.message?.includes("No document to update")) {
                    console.error("Failed to update lastSeen to online:", err);
                }
            }
        };

        const setOffline = async () => {
            try {
                await updateDoc(userDocRef, { lastSeen: new Date().toISOString() });
            } catch (err: any) {
                if (err?.code !== "not-found" && !err?.message?.includes("No document to update")) {
                    console.error("Failed to update lastSeen to offline timestamp:", err);
                }
            }
        };

        // Mark online when app mounts / component is active
        setOnline();

        const handleFocus = () => {
            setOnline();
        };

        const handleBlur = () => {
            setOffline();
        };

        const handleBeforeUnload = () => {
            setOffline();
        };

        // When the PWA resumes from background (minimized), Firestore WebSocket
        // connections can go stale. Force a re-query to refresh thread/user data
        // so chat headers and profile info are up-to-date.
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                setOnline();
                // Force Firestore to re-check its connections by touching the listeners.
                // The onSnapshot listeners will automatically reconnect, but we nudge
                // the data refresh by re-fetching the users collection.
                const usersQuery = query(collection(db, "users"), limit(100));
                getDocs(usersQuery).then((snapshot) => {
                    const users = snapshot.docs
                        .map(d => ({ ...d.data(), id: d.id } as User))
                        .filter(u => u.id !== currentUserId && u.bio !== undefined);
                    setAllDatingUsers(users);
                }).catch(() => { /* silent – snapshot listener will catch up */ });
            } else {
                setOffline();
            }
        };

        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            setOffline();
        };
    }, [currentUserId]);

    // 4. Subscribe to Incoming/Outgoing Requests
    useEffect(() => {
        if (!currentUserId || typeof currentUserId !== "string") return;

        const q = query(collection(db, "requests"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqs = snapshot.docs
                .map(d => d.data())
                .filter(r => r.receiverId === currentUserId || r.senderId === currentUserId);
            setRequestsList(reqs);
        }, (error) => {
            console.error("MockContext: onSnapshot requests error:", error);
        });

        return () => unsubscribe();
    }, [currentUserId]);

    // 5. Subscribe to Active Chat Threads
    useEffect(() => {
        if (!currentUserId || typeof currentUserId !== "string") return;

        const q = query(collection(db, "threads"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const threadsData = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() as any }))
                .filter(t => 
                    Array.isArray(t.participantIds) && 
                    t.participantIds.includes(currentUserId) &&
                    (!Array.isArray(t.deletedFor) || !t.deletedFor.includes(currentUserId)) &&
                    !deletedThreadIdsRef.current.has(t.id)
                );
            setThreadsList(threadsData);
        }, (error) => {
            console.error("MockContext: onSnapshot threads error:", error);
        });

        return () => unsubscribe();
    }, [currentUserId]);

    // 5b. One-time migration: fix group threads with missing adminIds/creatorId
    useEffect(() => {
        if (!currentUserId || threadsList.length === 0) return;
        
        threadsList.forEach(async (t) => {
            if (!t.isGroup) return;
            if (!Array.isArray(t.participantIds) || !t.participantIds.includes(currentUserId)) return;
            
            const hasValidAdmins = Array.isArray(t.adminIds) && t.adminIds.length > 0;
            const hasValidCreator = t.creatorId && typeof t.creatorId === "string" && t.creatorId.length > 3;
            const isCurrentUserInAdmins = hasValidAdmins && t.adminIds.includes(currentUserId);
            
            if (!hasValidAdmins && !hasValidCreator) {
                // No admins and no creator — check messages for the real creator
                try {
                    const messagesSnap = await getDocs(
                        query(collection(db, "threads", t.id, "messages"), where("type", "==", "system"))
                    );
                    const creationMsg = messagesSnap.docs.find(d => {
                        const text = d.data().text || "";
                        return text.includes("created the group");
                    });
                    
                    if (creationMsg) {
                        const msgText = creationMsg.data().text || "";
                        // Find which participant's name appears in the creation message
                        const creatorName = currentUser?.name || "";
                        if (creatorName && msgText.includes(creatorName)) {
                            await updateDoc(doc(db, "threads", t.id), {
                                creatorId: currentUserId,
                                adminIds: [currentUserId],
                                initiatedBy: currentUserId
                            });
                            console.log(`[Migration] Fixed creator for "${t.groupName}" → ${currentUserId} (matched name "${creatorName}")`);
                            return;
                        }
                    }
                    // Fallback: just assign current user
                    await updateDoc(doc(db, "threads", t.id), {
                        creatorId: currentUserId,
                        adminIds: [currentUserId],
                        initiatedBy: currentUserId
                    });
                    console.log(`[Migration] Assigned admin for "${t.groupName}" → ${currentUserId} (fallback)`);
                } catch (err) {
                    console.error(`[Migration] Failed to fix group "${t.groupName}":`, err);
                }
            } else if (hasValidAdmins && !hasValidCreator) {
                // Has admins but no creator — check messages to find real creator and add them
                try {
                    const messagesSnap = await getDocs(
                        query(collection(db, "threads", t.id, "messages"), where("type", "==", "system"))
                    );
                    const creationMsg = messagesSnap.docs.find(d => {
                        const text = d.data().text || "";
                        return text.includes("created the group");
                    });
                    
                    if (creationMsg) {
                        const msgText = creationMsg.data().text || "";
                        const creatorName = currentUser?.name || "";
                        if (creatorName && msgText.includes(creatorName) && !isCurrentUserInAdmins) {
                            // Current user is the real creator but not in adminIds — fix it
                            await updateDoc(doc(db, "threads", t.id), {
                                creatorId: currentUserId,
                                adminIds: arrayUnion(currentUserId),
                                initiatedBy: currentUserId
                            });
                            console.log(`[Migration] Added creator "${creatorName}" to adminIds for "${t.groupName}"`);
                        } else if (!isCurrentUserInAdmins) {
                            // Set creatorId but don't add to admins
                            await updateDoc(doc(db, "threads", t.id), {
                                creatorId: t.adminIds[0]
                            });
                        }
                    }
                } catch (err) {
                    console.error(`[Migration] Failed to fix creator for "${t.groupName}":`, err);
                }
            } else if (!hasValidAdmins && hasValidCreator) {
                // Has a creator but empty adminIds — populate adminIds from creatorId
                try {
                    await updateDoc(doc(db, "threads", t.id), {
                        adminIds: [t.creatorId]
                    });
                    console.log(`[Migration] Populated adminIds for "${t.groupName}" from creatorId`);
                } catch (err) {
                    console.error(`[Migration] Failed to populate adminIds for "${t.groupName}":`, err);
                }
            }
        });
    }, [currentUserId, threadsList.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // 6. Subscribe to Messages of all active threads in real-time
    useEffect(() => {
        if (!currentUserId || typeof currentUserId !== "string" || threadsList.length === 0) return;

        const unsubscribes = threadsList.map(t => {
            const messagesRef = collection(db, "threads", t.id, "messages");
            const q = query(messagesRef, orderBy("createdAt", "asc"));
            return onSnapshot(q, (snapshot) => {
                const msgs = snapshot.docs.map(docSnap => {
                    const data = docSnap.data();
                    
                    // Mark as delivered if recipient is online (which is true since we are running in the recipient's client)
                    if (data.senderId !== currentUserId && !data.delivered && !data.read) {
                        const msgDocRef = doc(db, "threads", t.id, "messages", docSnap.id);
                        updateDoc(msgDocRef, { delivered: true }).catch(err => {
                            console.error("Failed to auto-deliver message:", err);
                        });
                    }

                    return {
                        id: docSnap.id,
                        sender: data.senderId === currentUserId ? "me" : "them",
                        senderId: data.senderId,
                        text: data.text || "",
                        time: data.time || "Now",
                        type: data.type || "text",
                        duration: data.duration,
                        imageUrl: data.imageUrl,
                        fileName: data.fileName,
                        fileSize: data.fileSize,
                        poll: data.poll,
                        read: data.read || false,
                        delivered: data.read || data.delivered || false,
                        edited: data.edited || false,
                        replyTo: data.replyTo ? {
                            id: data.replyTo.id,
                            sender: data.replyTo.senderId === currentUserId ? "me" : "them",
                            senderId: data.replyTo.senderId,
                            text: data.replyTo.text
                        } : undefined,
                        reactions: data.reactions || [],
                        createdAt: data.createdAt || null
                    } as Message;
                });

                setThreadsMessages(prev => ({
                    ...prev,
                    [t.id]: msgs
                }));
            }, (error) => {
                console.error(`MockContext: onSnapshot messages error for thread ${t.id}:`, error);
            });
        });

        return () => unsubscribes.forEach(unsub => unsub());
    }, [threadsList, currentUserId]);

    // 7. Subscribe/Derive Blocked and Saved Users
    useEffect(() => {
        if (!currentUserId || typeof currentUserId !== "string" || allDatingUsers.length === 0) return;

        const blocked = allDatingUsers.filter(u => currentUser.blockedUserIds?.includes(u.id));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBlockedUsersList(blocked);

        const saved = allDatingUsers.filter(u => currentUser.savedContactIds?.includes(u.id));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSavedContactsList(saved);
    }, [allDatingUsers, currentUser.blockedUserIds, currentUser.savedContactIds, currentUserId]);

    // 8. Subscribe to statuses collection in real-time
    useEffect(() => {
        if (!currentUserId) return;

        const q = query(collection(db, "statuses"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const dbStatuses = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    userId: data.userId || "",
                    username: data.username || "User",
                    userColor: data.userColor || "bg-emerald-200",
                    userAvatar: data.userAvatar || null,
                    textContent: data.textContent || undefined,
                    mediaUrl: data.mediaUrl || undefined,
                    mediaType: data.mediaType || undefined,
                    title: data.title || undefined,
                    backgroundColor: data.backgroundColor || undefined,
                    timestamp: data.timestamp || new Date().toISOString(),
                    isBoosted: !!data.isBoosted,
                    boostUntil: data.boostUntil || null,
                    replies: data.replies || [],
                    mediaItems: data.mediaItems || [],
                } as Status;
            });
            setStatuses(dbStatuses);
        }, (error) => {
            console.error("MockContext: onSnapshot statuses error:", error);
        });

        return () => unsubscribe();
    }, [currentUserId]);



    // 10. Subscribe to transactions collection in real-time
    useEffect(() => {
        if (!currentUserId) return;

        const q = query(
            collection(db, "transactions"),
            where("userId", "==", currentUserId)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const txs = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    userId: data.userId || "",
                    statusId: data.statusId || "",
                    statusText: data.statusText || "",
                    timestamp: data.timestamp || new Date().toISOString(),
                    amount: data.amount || 0,
                    durationHours: data.durationHours || 1,
                    paymentMethod: data.paymentMethod || "simulated",
                    status: data.status || "completed"
                } as Transaction;
            });
            txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setTransactions(txs);
        }, (error) => {
            console.error("MockContext: onSnapshot transactions error:", error);
        });

        return () => unsubscribe();
    }, [currentUserId]);

    // 11. Subscribe to mentions collection in real-time
    useEffect(() => {
        if (!currentUserId) return;

        const q = query(
            collection(db, "mentions"),
            where("receiverId", "==", currentUserId),
            where("read", "==", false)
        );
        
        // Track handled mention document IDs to avoid double-notifying
        const notifiedMentionIds = new Set<string>();

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    const mentionId = change.doc.id;
                    
                    // Respect user notification settings
                    const notificationsEnabled = currentUser?.settings?.notifications ?? true;
                    if (!notificationsEnabled) return;

                    // Check if the thread for this mention is muted or archived for current user
                    const targetThread = threadsList.find(t => t.id === data.threadId);
                    const isSilenced = targetThread && ((targetThread.mutedFor || []).includes(currentUserId) || (targetThread.archivedFor || []).includes(currentUserId));
                    if (isSilenced) return;

                    // Skip if we already showed a notification for this mentionId
                    if (notifiedMentionIds.has(mentionId)) return;
                    notifiedMentionIds.add(mentionId);

                    // Only notify for mentions created in the last 20 seconds (avoid spamming on initial page load)
                    const mentionCreatedAt = new Date(data.createdAt).getTime();
                    const now = Date.now();
                    if (now - mentionCreatedAt < 20000) {
                        // 1. In-app toast notification
                        addNotification(`🔔 ${data.senderName} mentioned you in ${data.threadName}`);
                        
                        // 2. Play chime/sound
                        playSendSound("chime");

                        // 3. Show native browser notification if allowed and supported
                        if (
                            typeof window !== "undefined" &&
                            "Notification" in window &&
                            Notification.permission === "granted"
                        ) {
                            navigator.serviceWorker.ready.then((reg) => {
                                reg.showNotification(`Mentioned by ${data.senderName}`, {
                                    body: data.text || `You were mentioned in ${data.threadName}`,
                                    icon: "/icon-192-v3.png",
                                    badge: "/icon-maskable-192-v3.png",
                                    tag: "mention-" + mentionId,
                                    data: { url: `/inbox?threadId=${data.threadId}` }
                                });
                            });
                        }
                    }
                }
            });
        }, (error) => {
            console.error("MockContext: onSnapshot mentions error:", error);
        });

        return () => unsubscribe();
    }, [currentUserId, currentUser?.settings?.notifications]);

    // Helper to resolve country code for a user
    const getUserCountryCode = (usr: User): string => {
        if (usr.countryCode) return usr.countryCode.toUpperCase();
        
        // Fallback checks for phone dial prefixes
        const phone = usr.phoneNumber || "";
        if (phone.startsWith("+250")) return "RW";
        if (phone.startsWith("+1")) {
            const loc = (usr.location || "").toLowerCase();
            if (loc.includes("canada") || loc.includes("ca") || loc.includes("toronto") || loc.includes("vancouver") || loc.includes("montreal") || loc.includes("ottawa")) {
                return "CA";
            }
            return "US";
        }
        return "US";
    };

    // Expose suggestions using our multi-signal Recommendation Engine
    const suggestions = useMemo(() => {
        if (!currentUser) return DEFAULT_DATING_PROFILES;
        const pool = [...allDatingUsers];

        const filtered = pool.filter(u => {
            if (u.id === currentUserId || u.id === currentUser?.id) return false;
            if (currentUser?.blockedUserIds?.includes(u.id)) return false;
            const hasThread = threadsList.some(t => t.participantIds.includes(u.id));
            if (hasThread) return false;
            const hasRequest = requestsList.some(r => r.senderId === u.id || r.receiverId === u.id);
            if (hasRequest) return false;
            
            return true;
        });

        // Supplement with DEFAULT_DATING_PROFILES if needed
        const combined = [...filtered];
        const existingIds = new Set(combined.map(u => u.id));

        DEFAULT_DATING_PROFILES.forEach(profile => {
            if (
                profile.id !== currentUserId &&
                profile.id !== currentUser?.id &&
                !existingIds.has(profile.id) &&
                !currentUser?.blockedUserIds?.includes(profile.id)
            ) {
                combined.push(profile);
            }
        });

        // Run multi-signal ranking pipeline (Elo compatibility, semantic similarity, activity decay, cold-start)
        const rankedResults = rankCandidates(currentUser as any, combined as any);
        return rankedResults.map(r => r.user as User);
    }, [allDatingUsers, currentUserId, currentUser, threadsList, requestsList]);

    const { requests, activeThreads, archivedThreads, formattedThreads } = useMemo(() => {
        // pendingIncomingThreads
        const pendingIncomingThreads = threadsList
            .filter(t => 
                t.status === "pending" && 
                t.initiatedBy && 
                t.initiatedBy !== currentUserId && 
                Array.isArray(t.participantIds) && 
                t.participantIds.includes(currentUserId)
            )
            .map(t => {
                const sender = allDatingUsers.find(u => u.id === t.initiatedBy);
                return {
                    id: t.id,
                    user: sender ? {
                        id: sender.id,
                        name: sender.name,
                        age: sender.age,
                        bio: sender.bio,
                        color: sender.color,
                        interests: sender.interests,
                        avatar: sender.avatar,
                        phoneNumber: sender.phoneNumber || "",
                        settings: sender.settings || DEFAULT_SETTINGS
                    } : {
                        id: t.initiatedBy || "unknown",
                        name: "Unknown User",
                        age: 24,
                        bio: "",
                        color: "bg-gray-100",
                        interests: [],
                        avatar: null,
                        phoneNumber: "",
                        settings: DEFAULT_SETTINGS
                    },
                    message: t.lastMessage || "",
                    time: formatRelativeTime(t.updatedAt || t.createdAt || t.lastTime),
                    isThreadRequest: true
                } as Request;
            });

        // Format requests
        const requests = [
            ...requestsList
                .filter(r => r.receiverId === currentUserId)
                .map(r => {
                    const sender = allDatingUsers.find(u => u.id === r.senderId);
                    return {
                        id: r.id,
                        user: sender ? {
                            id: sender.id,
                            name: sender.name,
                            age: sender.age,
                            bio: sender.bio,
                            color: sender.color,
                            interests: sender.interests,
                            avatar: sender.avatar,
                            phoneNumber: sender.phoneNumber || "",
                            settings: sender.settings || DEFAULT_SETTINGS
                        } : {
                            id: r.senderId || "unknown",
                            name: "Unknown User",
                            age: 24,
                            bio: "",
                            color: "bg-gray-100",
                            interests: [],
                            avatar: null,
                            phoneNumber: "",
                            settings: DEFAULT_SETTINGS
                        },
                        message: r.message || "",
                        time: formatRelativeTime(r.createdAt || r.time),
                        isThreadRequest: false
                    } as Request;
                }),
            ...pendingIncomingThreads
        ];

        // Format threads and archivedThreads
        const formattedThreads = threadsList.filter(t => !deletedThreadIdsRef.current.has(t.id)).map(t => {
            const isGroup = t.isGroup || false;
            let resolvedUser: User;

            if (isGroup) {
                resolvedUser = {
                    id: t.id,
                    name: t.groupName || "Group Chat",
                    age: 0,
                    bio: t.groupBio || "Group Chat",
                    color: "bg-pink-100",
                    interests: [],
                    avatar: t.groupAvatar || null,
                    phoneNumber: "",
                    settings: DEFAULT_SETTINGS,
                    location: t.groupLocation || ""
                };
            } else {
                const recipientId = t.participantIds.find((pid: string) => pid !== currentUserId) || "";
                const liveUser = allDatingUsers.find(u => u.id === recipientId);
                const recipient = {
                    ...(t.participants[recipientId] || {}),
                    ...(liveUser || {})
                };

                resolvedUser = {
                    id: recipient.id || recipientId,
                    name: recipient.name || "User",
                    age: recipient.age || 24,
                    bio: recipient.bio || "",
                    color: recipient.color || "bg-emerald-100",
                    interests: recipient.interests || [],
                    avatar: recipient.avatar || null,
                    phoneNumber: recipient.phoneNumber || "",
                    isSavedContact: currentUser.savedContactIds?.includes(recipient.id || recipientId),
                    settings: DEFAULT_SETTINGS,
                    lastSeen: recipient.lastSeen
                };
            }

            const messages = threadsMessages[t.id] || [];
            const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
            
            // Dynamically compute relative time
            const lastTimestamp = lastMsg?.createdAt || t.updatedAt || t.createdAt || "";
            const computedLastTime = formatRelativeTime(lastTimestamp);

            // Sent by me should be marked as read already
            const isLastSentByMe = lastMsg ? lastMsg.sender === "me" : false;
            const isUnread = isLastSentByMe ? false : (t.unreadFor || []).includes(currentUserId);

            // Format lastMessage cleanly (e.g. show 🎥 Video instead of raw filename/URL)
            let derivedLastMessage = t.lastMessage || "";
            const lowercaseLastMsg = derivedLastMessage.toLowerCase();
            if (
                lowercaseLastMsg.endsWith(".mp4") || 
                lowercaseLastMsg.endsWith(".webm") || 
                lowercaseLastMsg.endsWith(".mov") || 
                lowercaseLastMsg.endsWith(".avi") ||
                (lowercaseLastMsg.includes("firebaseapp.com/o/") && lowercaseLastMsg.includes(".mp4"))
            ) {
                derivedLastMessage = "🎥 Video";
            } else if (
                lowercaseLastMsg.endsWith(".jpg") || 
                lowercaseLastMsg.endsWith(".jpeg") || 
                lowercaseLastMsg.endsWith(".png") || 
                lowercaseLastMsg.endsWith(".gif") || 
                lowercaseLastMsg.endsWith(".webp")
            ) {
                derivedLastMessage = "📷 Photo";
            }

            if (lastMsg) {
                if (lastMsg.type === "image") {
                    derivedLastMessage = "📷 Photo";
                } else if (lastMsg.type === "video") {
                    derivedLastMessage = "🎥 Video";
                } else if (lastMsg.type === "voice") {
                    derivedLastMessage = "🎤 Voice message";
                } else if (lastMsg.type === "file") {
                    derivedLastMessage = `📄 ${lastMsg.fileName || "File"}`;
                } else {
                    const textLower = (lastMsg.text || "").toLowerCase();
                    if (
                        textLower.endsWith(".mp4") || 
                        textLower.endsWith(".webm") || 
                        textLower.endsWith(".mov") || 
                        textLower.endsWith(".avi")
                    ) {
                        derivedLastMessage = "🎥 Video";
                    } else if (
                        textLower.endsWith(".jpg") || 
                        textLower.endsWith(".jpeg") || 
                        textLower.endsWith(".png") || 
                        textLower.endsWith(".gif") || 
                        textLower.endsWith(".webp")
                    ) {
                        derivedLastMessage = "📷 Photo";
                    } else {
                        derivedLastMessage = lastMsg.text || "";
                    }
                }
            }

            return {
                id: t.id,
                user: resolvedUser,
                messages: messages,
                unread: isUnread,
                lastMessage: derivedLastMessage,
                lastTime: computedLastTime,
                isArchived: (t.archivedFor || []).includes(currentUserId),
                isMuted: (t.mutedFor || []).includes(currentUserId),
                updatedAt: t.updatedAt || t.createdAt || "",
                isGroup: isGroup,
                groupName: t.groupName,
                groupAvatar: t.groupAvatar,
                groupMemberIds: t.participantIds,
                creatorId: t.creatorId,
                adminIds: t.adminIds || [],
                groupBio: t.groupBio,
                groupLocation: t.groupLocation,
                leftParticipantIds: t.leftParticipantIds || [],
                status: t.status,
                initiatedBy: t.initiatedBy,
                typingParticipantIds: t.typingParticipantIds || [],
                isMarketplace: t.isMarketplace === true || t.id?.startsWith("mkt_") || t.id?.startsWith("marketplace_") || false
            } as Thread;
        });

        const sortThreads = (list: Thread[]) => {
            const pinnedIds = currentUser.pinnedThreadIds || [];
            return [...list].sort((a, b) => {
                const aPinned = pinnedIds.includes(a.id);
                const bPinned = pinnedIds.includes(b.id);
                if (aPinned && !bPinned) return -1;
                if (!aPinned && bPinned) return 1;
                
                const getTime = (t: Thread) => {
                    if (t.messages && t.messages.length > 0) {
                        const lastMsg = t.messages[t.messages.length - 1];
                        if (lastMsg?.createdAt) {
                            const parsed = new Date(lastMsg.createdAt).getTime();
                            if (!isNaN(parsed)) return parsed;
                        }
                    }
                    if (t.updatedAt) {
                        const parsed = new Date(t.updatedAt).getTime();
                        if (!isNaN(parsed)) return parsed;
                    }
                    return 0;
                };

                return getTime(b) - getTime(a);
            });
        };

        const seenKeys = new Set<string>();
        const uniqueFormattedThreads = formattedThreads.filter(t => {
            if (!t.user || !t.user.id) return false;
            if (t.isGroup) {
                if (seenKeys.has(`group_${t.id}`)) return false;
                seenKeys.add(`group_${t.id}`);
                return true;
            }
            if (isMarketplaceThread(t)) {
                if (seenKeys.has(`mkt_${t.id}`)) return false;
                seenKeys.add(`mkt_${t.id}`);
                return true;
            }
            // Regular dating DM: dedupe by target user ID
            if (seenKeys.has(`dm_${t.user.id}`)) return false;
            seenKeys.add(`dm_${t.user.id}`);
            return true;
        });

        const activeThreads = sortThreads(uniqueFormattedThreads.filter(t => !t.isArchived));
        const archivedThreads = sortThreads(uniqueFormattedThreads.filter(t => t.isArchived));

        return { requests, activeThreads, archivedThreads, uniqueFormattedThreads, formattedThreads };
    }, [threadsList, requestsList, allDatingUsers, threadsMessages, currentUserId, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (typeof window !== "undefined" && "navigator" in window && "setAppBadge" in navigator) {
            let totalUnread = 0;
            activeThreads.forEach(t => {
                if (t.unread) {
                    const threadUnread = t.messages ? t.messages.filter(m => (m.sender ? m.sender === "them" : m.senderId !== currentUserId) && !m.read).length : 0;
                    totalUnread += (threadUnread > 0 ? threadUnread : 1);
                }
            });
            const missedCallsCount = (callLogs && currentUserId)
                ? callLogs.filter((log: any) => log.callerId !== currentUserId && log.status === "missed" && !log.read).length
                : 0;
            totalUnread += missedCallsCount;

            if (totalUnread > 0) {
                (navigator as any).setAppBadge(totalUnread).catch((err: any) => {
                    console.warn("navigator.setAppBadge error:", err);
                });
            } else {
                (navigator as any).clearAppBadge().catch((err: any) => {
                    console.warn("navigator.clearAppBadge error:", err);
                });
            }
        }
    }, [activeThreads, currentUserId, callLogs]);

    // DATABASE MUTATION FUNCTIONS

    const sendIcebreaker = async (targetUser: User, message: string, status: "pending" | "accepted" = "accepted"): Promise<string> => {
        if (!currentUserId) return "";

        // Create a real thread (or find existing) and send the message directly
        const threadId = await startDirectChat(targetUser, false);
        if (!threadId) return "";

        // Send the message as the first message in the thread
        const messageId = crypto.randomUUID();
        const messageRef = doc(db, "threads", threadId, "messages", messageId);

        await setDoc(messageRef, {
            id: messageId,
            senderId: currentUserId,
            text: message,
            time: "Now",
            type: "text",
            read: false,
            createdAt: new Date().toISOString()
        });

        await updateDoc(doc(db, "threads", threadId), {
            lastMessage: message,
            lastTime: "Now",
            unreadFor: arrayUnion(targetUser.id),
            updatedAt: new Date().toISOString(),
            status: "active",
            initiatedBy: currentUserId
        });

        addNotification(`Message sent to ${targetUser.name}!`);
        return threadId;
    };

    const acceptRequest = async (reqId: string) => {
        if (!currentUserId) return;
        const req = requests.find(r => r.id === reqId);
        if (!req) return;

        if (req.isThreadRequest) {
            await updateDoc(doc(db, "threads", reqId), {
                status: "accepted"
            });
            addNotification(`You connected with ${req.user.name}!`);
            return;
        }

        // Delete the request document
        await deleteDoc(doc(db, "requests", reqId));

        // Create new thread document
        const threadId = crypto.randomUUID();
        const threadRef = doc(db, "threads", threadId);

        await setDoc(threadRef, {
            id: threadId,
            participantIds: [currentUserId, req.user.id],
            participants: {
                [currentUserId]: {
                    id: currentUserId,
                    name: currentUser.name || "User",
                    age: currentUser.age !== undefined ? currentUser.age : 24,
                    avatar: currentUser.avatar || null,
                    color: currentUser.color || "bg-emerald-200",
                    bio: currentUser.bio || "",
                    interests: currentUser.interests || [],
                    phoneNumber: currentUser.phoneNumber || ""
                },
                [req.user.id]: {
                    id: req.user.id,
                    name: req.user.name || "User",
                    age: req.user.age !== undefined ? req.user.age : 24,
                    avatar: req.user.avatar || null,
                    color: req.user.color || "bg-emerald-200",
                    bio: req.user.bio || "",
                    interests: req.user.interests || [],
                    phoneNumber: req.user.phoneNumber || ""
                }
            },
            lastMessage: req.message,
            lastTime: "Now",
            unreadFor: [currentUserId], // It's unread for the acceptor to view
            archivedFor: [],
            mutedFor: [],
            deletedFor: [],
            updatedAt: new Date().toISOString(),
            status: "accepted",
            initiatedBy: req.user.id
        });

        // Add first message to thread messages subcollection
        const msgId = crypto.randomUUID();
        await setDoc(doc(db, "threads", threadId, "messages", msgId), {
            id: msgId,
            senderId: req.user.id,
            text: req.message,
            time: "Now",
            type: "text",
            read: false,
            createdAt: new Date().toISOString()
        });

        addNotification(`You connected with ${req.user.name}!`);
    };

    const declineRequest = async (reqId: string) => {
        const deleteMessagesSubcollection = async (tId: string) => {
            try {
                const messagesRef = collection(db, "threads", tId, "messages");
                const messagesSnap = await getDocs(messagesRef);
                const deletePromises = messagesSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
                await Promise.all(deletePromises);
            } catch (err) {
                console.error("MockContext: error deleting declined thread messages:", err);
            }
        };

        const req = requests.find(r => r.id === reqId);
        if (req && req.isThreadRequest) {
            await deleteMessagesSubcollection(reqId);
            await deleteDoc(doc(db, "threads", reqId));
            addNotification(`Connection request declined.`);
            return;
        }
        try {
            const threadSnap = await getDoc(doc(db, "threads", reqId));
            if (threadSnap.exists()) {
                await deleteMessagesSubcollection(reqId);
                await deleteDoc(doc(db, "threads", reqId));
                addNotification(`Connection request declined.`);
                return;
            }
        } catch (e) {
            console.error("declineRequest threads check error:", e);
        }
        await deleteDoc(doc(db, "requests", reqId));
    };

    const acceptThread = async (threadId: string) => {
        if (!currentUserId) return;
        await updateDoc(doc(db, "threads", threadId), {
            status: "accepted"
        });
        addNotification(`Chat request accepted!`);
    };
    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const createThumbnail = (dataUrl: string, isVideo: boolean = false): Promise<string> => {
        return new Promise((resolve) => {
            if (typeof window === "undefined" || typeof document === "undefined") {
                resolve("");
                return;
            }
            if (isVideo) {
                const video = document.createElement("video");
                video.src = dataUrl;
                video.muted = true;
                video.playsInline = true;
                video.currentTime = 0.1; // Seek a tiny bit to get a frame
                video.onseeked = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = 20;
                    canvas.height = 20;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, 20, 20);
                        resolve(canvas.toDataURL("image/jpeg", 0.6));
                    } else {
                        resolve("");
                    }
                    video.src = "";
                    video.load();
                };
                video.onerror = () => {
                    resolve("");
                };
            } else {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = 20;
                    canvas.height = 20;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, 20, 20);
                        resolve(canvas.toDataURL("image/jpeg", 0.6));
                    } else {
                        resolve("");
                    }
                };
                img.onerror = () => resolve("");
                img.src = dataUrl;
            }
        });
    };

    const sendMessage = async (threadId: string, text: string, type: MessageType = "text", extra: Partial<Message> = {}): Promise<string | undefined> => {
        if (!currentUserId) return;

        const messageId = extra.id || crypto.randomUUID();
        const messageRef = doc(db, "threads", threadId, "messages", messageId);

        // Remove id from extra so it doesn't get double-written into the document
        delete extra.id;

        let derivedText = text;
        const finalExtra = { ...extra };

        if (type === "voice") {
            derivedText = "🎤 Voice message";
            if (extra.imageUrl && extra.imageUrl.startsWith("data:")) {
                try {
                    addNotification("Uploading voice note...");
                    const storagePath = `threads/${threadId}/${messageId}.webm`;
                    const uploadedUrl = await uploadImageToStorage(extra.imageUrl, storagePath);
                    finalExtra.imageUrl = uploadedUrl;
                } catch (err) {
                    console.error("Failed to upload voice note:", err);
                }
            }
        } else if (type === "image") {
            derivedText = "📷 Photo";
            if (extra.imageUrl && extra.imageUrl.startsWith("data:")) {
                try {
                    addNotification("Uploading photo...");
                    
                    // Estimate size
                    const base64Parts = extra.imageUrl.split(",");
                    if (base64Parts.length > 1) {
                        const bytes = Math.floor((base64Parts[1].length * 3) / 4);
                        finalExtra.fileSize = formatBytes(bytes);
                    }

                    // Generate thumbnail
                    const thumb = await createThumbnail(extra.imageUrl, false);
                    if (thumb) {
                        finalExtra.thumbnail = thumb;
                    }

                    // Cache locally in localforage so the sender has instant access
                    try {
                        const blobRes = await fetch(extra.imageUrl);
                        const blob = await blobRes.blob();
                        await localforage.setItem(messageId, blob);
                    } catch (cacheErr) {
                        console.warn("Failed to pre-cache sent photo:", cacheErr);
                    }

                    const storagePath = `threads/${threadId}/${messageId}`;
                    const uploadedUrl = await uploadImageToStorage(extra.imageUrl, storagePath);
                    finalExtra.imageUrl = uploadedUrl;
                } catch (err) {
                    console.error("Failed to upload image:", err);
                    addNotification("Photo upload failed");
                }
            }
        } else if (type === "video") {
            derivedText = "🎥 Video";
            if (extra.imageUrl && extra.imageUrl.startsWith("data:")) {
                try {
                    addNotification("Uploading video...");

                    // Estimate size
                    const base64Parts = extra.imageUrl.split(",");
                    if (base64Parts.length > 1) {
                        const bytes = Math.floor((base64Parts[1].length * 3) / 4);
                        finalExtra.fileSize = formatBytes(bytes);
                    }

                    // Generate thumbnail
                    const thumb = await createThumbnail(extra.imageUrl, true);
                    if (thumb) {
                        finalExtra.thumbnail = thumb;
                    }

                    // Cache locally in localforage so the sender has instant access
                    try {
                        const blobRes = await fetch(extra.imageUrl);
                        const blob = await blobRes.blob();
                        await localforage.setItem(messageId, blob);
                    } catch (cacheErr) {
                        console.warn("Failed to pre-cache sent video:", cacheErr);
                    }

                    const storagePath = `threads/${threadId}/${messageId}.mp4`;
                    const uploadedUrl = await uploadImageToStorage(extra.imageUrl, storagePath);
                    finalExtra.imageUrl = uploadedUrl;
                } catch (err) {
                    console.error("Failed to upload video:", err);
                    addNotification("Video upload failed");
                }
            }
        } else if (type === "file") {
            derivedText = `📄 ${extra.fileName || "File"}`;
            if (extra.imageUrl && extra.imageUrl.startsWith("data:")) {
                try {
                    addNotification("Uploading file...");
                    const storagePath = `threads/${threadId}/${messageId}_${extra.fileName}`;
                    const uploadedUrl = await uploadImageToStorage(extra.imageUrl, storagePath);
                    finalExtra.imageUrl = uploadedUrl;
                } catch (err) {
                    console.error("Failed to upload file:", err);
                }
            }
        }
        // 1. Prepare firestore message object & optimistic message object
        const threadRef = doc(db, "threads", threadId);

        const firestoreMessage: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ = {
            id: messageId,
            senderId: currentUserId,
            text: derivedText,
            time: "Now",
            type: type,
            read: false,
            delivered: false,
            createdAt: new Date().toISOString()
        };

        if (finalExtra.duration) firestoreMessage.duration = finalExtra.duration;
        if (finalExtra.imageUrl) firestoreMessage.imageUrl = finalExtra.imageUrl;
        if (finalExtra.fileName) firestoreMessage.fileName = finalExtra.fileName;
        if (finalExtra.fileSize) firestoreMessage.fileSize = finalExtra.fileSize;
        if (finalExtra.thumbnail) firestoreMessage.thumbnail = finalExtra.thumbnail;
        if (finalExtra.poll) firestoreMessage.poll = finalExtra.poll;
        if (finalExtra.replyTo) {
            firestoreMessage.replyTo = {
                id: finalExtra.replyTo.id,
                senderId: finalExtra.replyTo.sender === "me" ? currentUserId : "recipient",
                text: finalExtra.replyTo.text
            };
        }

        // 2. Perform INSTANT Optimistic UI Update so the message renders IMMEDIATELY on the screen
        const optimisticMsg: Message = {
            id: messageId,
            sender: "me",
            senderId: currentUserId,
            text: derivedText,
            time: "Now",
            type: type as any,
            read: false,
            delivered: false,
            edited: false,
            replyTo: finalExtra.replyTo ? {
                id: finalExtra.replyTo.id,
                sender: finalExtra.replyTo.sender,
                senderId: finalExtra.replyTo.sender === "me" ? currentUserId : "them",
                text: finalExtra.replyTo.text
            } : undefined,
            reactions: [],
            createdAt: new Date().toISOString(),
            ...finalExtra
        };

        setThreadsMessages(prev => {
            const existing = prev[threadId] || [];
            if (existing.some(m => m.id === messageId)) return prev;
            return {
                ...prev,
                [threadId]: [...existing, optimisticMsg]
            };
        });

        // 3. Write message to Firestore (non-blocking / asynchronous promise)
        setDoc(messageRef, firestoreMessage).catch(err => {
            console.error("Failed to setDoc message:", err);
        });

        // 4. Perform thread metadata, presence, mentions, and mock replies asynchronously in background
        (async () => {
            try {
                const threadSnap = await getDoc(threadRef);
                if (!threadSnap.exists()) return;
                const threadData = threadSnap.data();
                const otherParticipants = (threadData.participantIds || []).filter((pid: string) => pid !== currentUserId);

                let isDelivered = false;
                if (threadData.isGroup) {
                    isDelivered = true;
                } else if (otherParticipants.length > 0) {
                    const recipientId = otherParticipants[0];
                    const recipientRef = doc(db, "users", recipientId);
                    const recipientSnap = await getDoc(recipientRef);
                    if (recipientSnap.exists()) {
                        isDelivered = recipientSnap.data().lastSeen === "online";
                    }
                }

                if (isDelivered) {
                    await updateDoc(messageRef, { delivered: true }).catch(() => {});
                }

                if (otherParticipants.length > 0) {
                    await updateDoc(threadRef, {
                        lastMessage: derivedText,
                        lastTime: "Now",
                        unreadFor: arrayUnion(...otherParticipants),
                        updatedAt: new Date().toISOString()
                    }).catch(() => {});
                } else {
                    await updateDoc(threadRef, {
                        lastMessage: derivedText,
                        lastTime: "Now",
                        updatedAt: new Date().toISOString()
                    }).catch(() => {});
                }

                await updateDoc(threadRef, {
                    unreadFor: arrayRemove(currentUserId)
                }).catch(() => {});

                // Mention detection
                if (threadData.isGroup && otherParticipants.length > 0 && type === "text") {
                    const mentionedUserIds: string[] = [];
                    otherParticipants.forEach((pid: string) => {
                        const member = allDatingUsers.find(u => u.id === pid) || threadData.participants?.[pid];
                        if (member && member.name) {
                            const mentionTag = `@${member.name}`;
                            if (text.includes(mentionTag)) {
                                mentionedUserIds.push(pid);
                            }
                        }
                    });

                    if (mentionedUserIds.length > 0) {
                        for (const receiverId of mentionedUserIds) {
                            const mentionId = crypto.randomUUID();
                            await setDoc(doc(db, "mentions", mentionId), {
                                id: mentionId,
                                senderId: currentUserId,
                                senderName: currentUser.name || "Someone",
                                senderAvatar: currentUser.avatar || null,
                                text: text,
                                threadId: threadId,
                                threadName: threadData.groupName || "Group Chat",
                                receiverId: receiverId,
                                messageId: messageId,
                                createdAt: new Date().toISOString(),
                                read: false
                            }).catch(() => {});
                        }
                    }
                }

                // Simulate automatic reply if chatting with a mock user
                const recipientId = otherParticipants[0] || "";
                if (["1", "2", "3", "4", "5", "6", "98", "99"].includes(recipientId) && type === "text") {
                    await updateDoc(threadRef, {
                        typingParticipantIds: arrayUnion(recipientId)
                    }).catch(() => {});

                    setTimeout(async () => {
                        const replies = [
                            "That's interesting!",
                            "I totally agree 😊",
                            "Tell me more about that!",
                            "Haha, that's funny!",
                            "Sounds good to me!",
                        ];
                        const replyText = replies[Math.floor(Math.random() * replies.length)];
                        const replyMsgId = crypto.randomUUID();

                        await setDoc(doc(db, "threads", threadId, "messages", replyMsgId), {
                            id: replyMsgId,
                            senderId: recipientId,
                            text: replyText,
                            time: "Now",
                            type: "text",
                            read: false,
                            createdAt: new Date().toISOString()
                        }).catch(() => {});

                        await updateDoc(threadRef, {
                            lastMessage: replyText,
                            lastTime: "Now",
                            unreadFor: arrayUnion(currentUserId),
                            updatedAt: new Date().toISOString(),
                            typingParticipantIds: arrayRemove(recipientId)
                        }).catch(() => {});

                        const latestSnap = await getDoc(threadRef);
                        const latestData = latestSnap.exists() ? latestSnap.data() : null;
                        const isSilenced = latestData && ((latestData.mutedFor || []).includes(currentUserId) || (latestData.archivedFor || []).includes(currentUserId));

                        if (!isSilenced) {
                            addNotification(`Reply from ${threadData.participants[recipientId]?.name || "User"}`);
                            playSendSound("chime");
                        }
                    }, 2000);
                }
            } catch (err) {
                console.error("Background thread update error:", err);
            }
        })();

        // 5. Simulate read receipt (double ticks) after 1.5 seconds if chatting with a mock user
        const recipientId = (threadsList.find(t => t.id === threadId)?.participantIds || []).find((pid: string) => pid !== currentUserId) || "";
        if (["1", "2", "3", "4", "5", "6", "98", "99"].includes(recipientId)) {
            setTimeout(async () => {
                try {
                    const msgRef = doc(db, "threads", threadId, "messages", messageId);
                    await updateDoc(msgRef, { read: true });
                } catch (err) {
                    console.error("Error updating read receipt:", err);
                }
            }, 1500);
        }

        return messageId;
    };

    const editMessage = async (threadId: string, messageId: string, newText: string) => {
        const messageRef = doc(db, "threads", threadId, "messages", messageId);
        await updateDoc(messageRef, {
            text: newText,
            edited: true
        });
    };

    const deleteMessage = async (threadId: string, messageId: string, forEveryone: boolean = false) => {
        const messageRef = doc(db, "threads", threadId, "messages", messageId);
        if (forEveryone) {
            await deleteDoc(messageRef);
            addNotification("Message deleted for everyone");
        } else {
            // Soft delete locally by deleting the document for simplicity
            await deleteDoc(messageRef);
            addNotification("Message deleted");
        }
    };

    const votePoll = async (threadId: string, messageId: string, optionIndex: number): Promise<void> => {
        if (!currentUserId) return;
        const msgRef = doc(db, "threads", threadId, "messages", messageId);
        try {
            const msgSnap = await getDoc(msgRef);
            if (!msgSnap.exists()) return;
            const msgData = msgSnap.data();
            if (msgData.type !== "poll" || !msgData.poll) return;

            const poll = { ...msgData.poll };
            const options = [...poll.options];
            let votedIndices = [...(poll.votedIndices || [])];
            const allowMultiple = poll.allowMultiple;

            const isAlreadyVoted = votedIndices.includes(optionIndex);

            if (allowMultiple) {
                if (isAlreadyVoted) {
                    votedIndices = votedIndices.filter(idx => idx !== optionIndex);
                    options[optionIndex] = {
                        ...options[optionIndex],
                        votes: Math.max(0, (options[optionIndex].votes || 0) - 1)
                    };
                } else {
                    votedIndices.push(optionIndex);
                    options[optionIndex] = {
                        ...options[optionIndex],
                        votes: (options[optionIndex].votes || 0) + 1
                    };
                }
            } else {
                if (isAlreadyVoted) {
                    votedIndices = [];
                    options[optionIndex] = {
                        ...options[optionIndex],
                        votes: Math.max(0, (options[optionIndex].votes || 0) - 1)
                    };
                } else {
                    // Decrement any previous votes
                    votedIndices.forEach(prevIdx => {
                        if (options[prevIdx]) {
                            options[prevIdx] = {
                                ...options[prevIdx],
                                votes: Math.max(0, (options[prevIdx].votes || 0) - 1)
                            };
                        }
                    });
                    votedIndices = [optionIndex];
                    options[optionIndex] = {
                        ...options[optionIndex],
                        votes: (options[optionIndex].votes || 0) + 1
                    };
                }
            }

            poll.options = options;
            poll.votedIndices = votedIndices;

            await updateDoc(msgRef, { poll });
        } catch (err) {
            console.error("Failed to vote in poll:", err);
        }
    };

    const addReaction = async (threadId: string, messageId: string, emoji: string) => {
        if (!currentUserId) return;
        const messageRef = doc(db, "threads", threadId, "messages", messageId);

        // Fetch current reactions
        const msgSnap = await getDoc(messageRef);
        if (!msgSnap.exists()) return;
        const reactions: Reaction[] = msgSnap.data().reactions || [];

        // Check if already reacted
        if (reactions.some(r => r.emoji === emoji && r.userId === currentUserId)) return;

        await updateDoc(messageRef, {
            reactions: arrayUnion({ emoji, userId: currentUserId })
        });
    };

    const removeReaction = async (threadId: string, messageId: string, emoji: string) => {
        if (!currentUserId) return;
        const messageRef = doc(db, "threads", threadId, "messages", messageId);

        const msgSnap = await getDoc(messageRef);
        if (!msgSnap.exists()) return;
        const reactions: Reaction[] = msgSnap.data().reactions || [];

        const updatedReactions = reactions.filter(r => !(r.emoji === emoji && r.userId === currentUserId));

        await updateDoc(messageRef, {
            reactions: updatedReactions
        });
    };

    const markThreadRead = async (threadId: string) => {
        if (!currentUserId) return;
        const threadRef = doc(db, "threads", threadId);
        await updateDoc(threadRef, {
            unreadFor: arrayRemove(currentUserId)
        });

        try {
            const threadSnap = await getDoc(threadRef);
            if (threadSnap.exists()) {
                const threadData = threadSnap.data();
                const recipientId = (threadData.participantIds || []).find((pid: string) => pid !== currentUserId) || "";
                
                const batch = writeBatch(db);
                let hasUpdates = false;

                if (recipientId) {
                    const messagesRef = collection(db, "threads", threadId, "messages");
                    const q = query(messagesRef, where("senderId", "==", recipientId), where("read", "==", false));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        snap.docs.forEach(d => {
                            batch.update(d.ref, { read: true });
                        });
                        hasUpdates = true;
                    }
                }

                // Clean up unread mentions for this thread
                const mentionsRef = collection(db, "mentions");
                const mentionsQuery = query(
                    mentionsRef,
                    where("receiverId", "==", currentUserId),
                    where("threadId", "==", threadId),
                    where("read", "==", false)
                );
                const mentionsSnap = await getDocs(mentionsQuery);
                if (!mentionsSnap.empty) {
                    mentionsSnap.docs.forEach(d => {
                        batch.update(d.ref, { read: true });
                    });
                    hasUpdates = true;
                }

                if (hasUpdates) {
                    await batch.commit();
                }
            }
        } catch (err) {
            console.error("MockContext: markThreadRead error:", err);
        }
    };

    const clearChat = async (threadId: string) => {
        // Delete all messages in subcollection (simple batch)
        const messagesRef = collection(db, "threads", threadId, "messages");
        const snap = await getDocs(messagesRef);
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();

        await updateDoc(doc(db, "threads", threadId), {
            lastMessage: "",
            unreadFor: []
        });

        addNotification("Chat cleared");
    };

    const archiveChat = async (threadId: string) => {
        if (!currentUserId) return;
        await updateDoc(doc(db, "threads", threadId), {
            archivedFor: arrayUnion(currentUserId),
            mutedFor: arrayUnion(currentUserId)
        });
        const thread = formattedThreads.find(t => t.id === threadId);
        if (thread) addNotification(`Chat with ${thread.user.name} archived`);
    };

    const unarchiveChat = async (threadId: string) => {
        if (!currentUserId) return;
        await updateDoc(doc(db, "threads", threadId), {
            archivedFor: arrayRemove(currentUserId),
            mutedFor: arrayRemove(currentUserId)
        });
        const thread = formattedThreads.find(t => t.id === threadId);
        if (thread) addNotification(`Chat with ${thread.user.name} unarchived`);
    };

    const muteChat = async (threadId: string, muted: boolean) => {
        if (!currentUserId) return;
        await updateDoc(doc(db, "threads", threadId), {
            mutedFor: muted ? arrayUnion(currentUserId) : arrayRemove(currentUserId)
        });
        addNotification(muted ? "Notifications silenced for this chat" : "Notifications unmuted");
    };

    const blockUser = async (userId: string) => {
        if (!currentUserId) return;
        await updateDoc(doc(db, "users", currentUserId), {
            blockedUserIds: arrayUnion(userId)
        });
        const targetUser = allDatingUsers.find(u => u.id === userId);
        if (targetUser) addNotification(`${targetUser.name} has been blocked`);
    };

    const unblockUser = async (userId: string) => {
        if (!currentUserId) return;
        await updateDoc(doc(db, "users", currentUserId), {
            blockedUserIds: arrayRemove(userId)
        });
        const targetUser = allDatingUsers.find(u => u.id === userId);
        if (targetUser) addNotification(`${targetUser.name} has been unblocked`);
    };

    const reportUser = async (userId: string, reason: string) => {
        if (!currentUserId) return;
        try {
            const reportRef = doc(collection(db, "incident_reports"));
            await setDoc(reportRef, {
                id: reportRef.id,
                reporterId: currentUserId,
                accusedId: userId,
                reason: reason,
                status: "OPEN",
                createdAt: new Date().toISOString()
            });
            addNotification("Report submitted. We'll review it shortly.");
        } catch (err) {
            console.error("Failed to submit report:", err);
            addNotification("Failed to submit report. Please try again.");
        }
    };

    const saveContact = async (userId: string) => {
        if (!currentUserId) return;
        await updateDoc(doc(db, "users", currentUserId), {
            savedContactIds: arrayUnion(userId)
        });
        const targetUser = allDatingUsers.find(u => u.id === userId);
        if (targetUser) addNotification(`${targetUser.name} saved to contacts`);
    };

    const deleteThread = async (threadId: string, forEveryone: boolean = false, silent: boolean = false) => {
        if (!currentUserId) return;
        deletedThreadIdsRef.current.add(threadId);
        // Optimistically remove from local state immediately for silky smooth UI
        setThreadsList(prev => prev.filter(t => t.id !== threadId));

        const threadRef = doc(db, "threads", threadId);

        const deleteMessagesSubcollection = async () => {
            try {
                const messagesRef = collection(db, "threads", threadId, "messages");
                const messagesSnap = await getDocs(messagesRef);
                const deletePromises = messagesSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
                await Promise.all(deletePromises);
            } catch (err) {
                console.error("MockContext: error deleting thread messages:", err);
            }
        };
        
        try {
            const threadSnap = await getDoc(threadRef);
            if (threadSnap.exists()) {
                const threadData = threadSnap.data();
                if (threadData.status === "pending") {
                    await deleteMessagesSubcollection();
                    await deleteDoc(threadRef);
                    try {
                        await deleteDoc(doc(db, "requests", threadId));
                    } catch {}
                    if (!silent) addNotification(`Chat request deleted`);
                    return;
                }
            }
        } catch (err) {
            console.error("MockContext: deleteThread check error:", err);
        }

        if (forEveryone) {
            await deleteMessagesSubcollection();
            await deleteDoc(threadRef);
            if (!silent) addNotification(`Chat deleted for everyone`);
        } else {
            // Soft delete locally
            await updateDoc(threadRef, {
                deletedFor: arrayUnion(currentUserId)
            });
            if (!silent) addNotification(`Chat deleted`);
        }
    };

    const deleteThreads = async (threadIds: string[], forEveryone: boolean = false, silent: boolean = false) => {
        if (!currentUserId || !threadIds || threadIds.length === 0) return;
        threadIds.forEach(id => deletedThreadIdsRef.current.add(id));
        const idSet = new Set(threadIds);

        // Optimistically remove all targeted threads in a single atomic update to prevent list shaking/flicker
        setThreadsList(prev => prev.filter(t => !idSet.has(t.id)));

        // Run background Firestore operations concurrently
        await Promise.all(threadIds.map(async (threadId) => {
            const threadRef = doc(db, "threads", threadId);

            const deleteMessagesSubcollection = async () => {
                try {
                    const messagesRef = collection(db, "threads", threadId, "messages");
                    const messagesSnap = await getDocs(messagesRef);
                    const deletePromises = messagesSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
                    await Promise.all(deletePromises);
                } catch (err) {
                    console.error("MockContext: error deleting thread messages:", err);
                }
            };

            try {
                const threadSnap = await getDoc(threadRef);
                if (threadSnap.exists()) {
                    const threadData = threadSnap.data();
                    if (threadData.status === "pending") {
                        await deleteMessagesSubcollection();
                        await deleteDoc(threadRef);
                        try {
                            await deleteDoc(doc(db, "requests", threadId));
                        } catch {}
                        return;
                    }
                }
            } catch (err) {
                console.error("MockContext: deleteThreads check error:", err);
            }

            if (forEveryone) {
                await deleteMessagesSubcollection();
                await deleteDoc(threadRef);
            } else {
                await updateDoc(threadRef, {
                    deletedFor: arrayUnion(currentUserId)
                });
            }
        }));

        if (!silent) {
            const count = threadIds.length;
            addNotification(
                forEveryone
                    ? `${count} ${count === 1 ? 'chat' : 'chats'} deleted for everyone`
                    : `${count} ${count === 1 ? 'chat' : 'chats'} deleted`
            );
        }
    };

    const leaveGroup = async (threadId: string) => {
        if (!currentUserId) return;
        const threadRef = doc(db, "threads", threadId);
        await updateDoc(threadRef, {
            leftParticipantIds: arrayUnion(currentUserId)
        });

        const messageId = crypto.randomUUID();
        await setDoc(doc(db, "threads", threadId, "messages", messageId), {
            id: messageId,
            sender: "system",
            text: `${currentUser.name || "User"} left the blend`,
            type: "system",
            createdAt: new Date().toISOString(),
            timestamp: new Date().toISOString()
        });

        addNotification("You left the blend");
    };

    const removeUserFromGroup = async (threadId: string, userId: string) => {
        if (!currentUserId) return;
        const threadRef = doc(db, "threads", threadId);
        await updateDoc(threadRef, {
            participantIds: arrayRemove(userId)
        });

        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        const userName = userSnap.exists() ? (userSnap.data().name || "User") : "Member";

        const messageId = crypto.randomUUID();
        await setDoc(doc(db, "threads", threadId, "messages", messageId), {
            id: messageId,
            sender: "system",
            text: `${currentUser.name || "User"} removed ${userName} from the blend`,
            type: "system",
            createdAt: new Date().toISOString(),
            timestamp: new Date().toISOString()
        });

        addNotification(`${userName} removed from the blend`);
    };

    const addUsersToGroup = async (threadId: string, userIds: string[]) => {
        if (!currentUserId || userIds.length === 0) return;
        const threadRef = doc(db, "threads", threadId);
        
        await updateDoc(threadRef, {
            participantIds: arrayUnion(...userIds),
            leftParticipantIds: arrayRemove(...userIds)
        });

        // Add a system message for each user added
        for (const userId of userIds) {
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);
            const userName = userSnap.exists() ? (userSnap.data().name || "User") : "Member";

            const messageId = crypto.randomUUID();
            await setDoc(doc(db, "threads", threadId, "messages", messageId), {
                id: messageId,
                sender: "system",
                text: `${currentUser.name || "User"} added ${userName} to the blend`,
                type: "system",
                createdAt: new Date().toISOString(),
                timestamp: new Date().toISOString()
            });
        }

        addNotification(`${userIds.length} member(s) added to the blend`);
    };

    const updateProfile = async (name: string, bio: string, interests: string[], age?: number, phoneNumber?: string, email?: string, extra?: Record<string, any>) => {
        if (!currentUserId) return;
        const updates: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ = {
            name,
            bio,
            interests,
            "marketplaceStore.storeName": name
        };
        if (age !== undefined) updates.age = age;
        if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
        if (email !== undefined) {
            updates.email = email;
            updates.email_lowercase = email ? email.toLowerCase() : null;
        }
        // Merge any extra profile fields (gender, showMe, relationshipGoal, etc.)
        if (extra) {
            Object.assign(updates, extra);
        }

        try {
            await updateDoc(doc(db, "users", currentUserId), updates);
            addNotification("Profile updated!");
        } catch (error) {
            console.error("MockContext: failed to update user profile doc:", error);
            throw error;
        }
    };

    const updateGroupProfile = async (threadId: string, groupName: string, groupBio: string, groupLocation: string, groupAvatar: string | null) => {
        try {
            let finalAvatar = groupAvatar;
            if (groupAvatar && (groupAvatar.startsWith("data:") || groupAvatar.startsWith("blob:") || (groupAvatar.startsWith("http") && !groupAvatar.includes("firebasestorage")))) {
                addNotification("Uploading group photo...");
                finalAvatar = await uploadImageToStorage(groupAvatar, `group_avatars/${threadId}`);
            }
            await updateDoc(doc(db, "threads", threadId), {
                groupName,
                groupBio,
                groupLocation,
                groupAvatar: finalAvatar,
                updatedAt: new Date().toISOString()
            });
            addNotification("Group profile updated!");
        } catch (error) {
            console.error("MockContext: failed to update group profile:", error);
            throw error;
        }
    };

    const makeGroupAdmin = async (threadId: string, memberId: string) => {
        try {
            const threadRef = doc(db, "threads", threadId);
            const snap = await getDoc(threadRef);
            if (!snap.exists()) return;
            const data = snap.data();
            const currentAdmins = data.adminIds || [data.creatorId || data.initiatedBy || "G9AZEt3LhfXWGYyTn3QTm8WwNi62"];
            if (!currentAdmins.includes(memberId)) {
                const updatedAdmins = [...currentAdmins, memberId];
                await updateDoc(threadRef, {
                    adminIds: updatedAdmins,
                    updatedAt: new Date().toISOString()
                });
                addNotification("Member promoted to Admin!");
            }
        } catch (error) {
            console.error("MockContext: failed to make member admin:", error);
            throw error;
        }
    };

    const updateAvatar = async (url: string | null) => {
        if (!currentUserId) return;
        let finalUrl = url;
        if (url) {
            try {
                addNotification("Uploading photo...");
                finalUrl = await uploadImageToStorage(url, `avatars/${currentUserId}`);
            } catch (err) {
                console.error("Failed to upload avatar:", err);
                addNotification("Photo upload failed");
            }
        }
        setCurrentUser(prev => prev ? {
            ...prev,
            avatar: finalUrl,
            marketplaceStore: {
                ...(prev.marketplaceStore || {}),
                avatar: finalUrl || undefined
            }
        } : prev);
        await updateDoc(doc(db, "users", currentUserId), {
            avatar: finalUrl,
            photoURL: finalUrl,
            "marketplaceStore.avatar": finalUrl
        });
        addNotification("Profile photo updated!");
    };

    const updateSettings = async (key: string, value: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
        // Cache settings in localStorage for immediate hydration recovery on refresh
        if (typeof window !== "undefined" && !key.includes('.')) {
            try {
                if (key === "theme") {
                    localStorage.setItem("mesh_theme", value);
                    if (["dark", "glow-dark", "cyber-glow", "neon-violet", "sunset-amber"].includes(value)) {
                        localStorage.setItem("mesh_dark_mode", "true");
                    } else if (["light", "glow-light", "light-glow", "whatsapp", "light-green", "classic-blue"].includes(value)) {
                        localStorage.setItem("mesh_dark_mode", "false");
                    }
                } else if (key === "darkMode") {
                    localStorage.setItem("mesh_dark_mode", String(value));
                    localStorage.setItem("mesh_theme", value ? "dark" : "light");
                } else if (key === "chatTheme") {
                    localStorage.setItem("mesh_chat_theme", String(value));
                } else if (key === "fontSize") {
                    localStorage.setItem("mesh_font_size", String(value));
                } else if (key === "messageTone") {
                    localStorage.setItem("mesh_message_tone", String(value));
                } else {
                    localStorage.setItem(`mesh_${key}`, String(value));
                }
            } catch (err) {
                console.warn("Failed to cache setting in localStorage:", err);
            }
        }

        // 1. Optimistically update local state immediately so UI feels instant
        setCurrentUser(prev => {
            const currentSettings = prev?.settings || DEFAULT_SETTINGS;
            const updatedSettings = { ...currentSettings } as any;
            if (key.includes('.')) {
                const [parentKey, childKey] = key.split('.');
                updatedSettings[parentKey] = {
                    ...(updatedSettings[parentKey] || {}),
                    [childKey]: value
                };
            } else {
                updatedSettings[key] = value;
            }

            // Sync theme and darkMode fields
            if (key === "theme") {
                if (["dark", "glow-dark", "cyber-glow", "neon-violet", "sunset-amber"].includes(value)) {
                    updatedSettings.darkMode = true;
                } else if (["light", "glow-light", "light-glow", "whatsapp", "light-green", "classic-blue"].includes(value)) {
                    updatedSettings.darkMode = false;
                } else if (value === "system") {
                    // Safety check for browser environment
                    const systemDark = typeof window !== "undefined" && window.matchMedia
                        ? window.matchMedia("(prefers-color-scheme: dark)").matches
                        : false;
                    updatedSettings.darkMode = systemDark;
                }
            } else if (key === "darkMode") {
                updatedSettings.theme = value ? "dark" : "light";
            }

            return {
                ...prev,
                settings: updatedSettings
            };
        });

        // 2. Sync to Firestore in the background if logged in
        if (!currentUserId) return;
        try {
            const userDocRef = doc(db, "users", currentUserId);
            
            const updates: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ = {
                [`settings.${key}`]: value
            };

            if (key === "theme") {
                if (value === "dark" || value === "glow-dark") {
                    updates["settings.darkMode"] = true;
                } else if (value === "light" || value === "glow-light") {
                    updates["settings.darkMode"] = false;
                } else if (value === "system") {
                    const systemDark = typeof window !== "undefined" && window.matchMedia
                        ? window.matchMedia("(prefers-color-scheme: dark)").matches
                        : false;
                    updates["settings.darkMode"] = systemDark;
                }
            } else if (key === "darkMode") {
                updates["settings.theme"] = value ? "dark" : "light";
            } else if (key === "wallpaper" && typeof value === "string" && value.startsWith("data:")) {
                try {
                    addNotification("Uploading wallpaper...");
                    const uploadedUrl = await uploadImageToStorage(value, `wallpapers/${currentUserId}`);
                    updates[`settings.${key}`] = uploadedUrl;
                } catch (err) {
                    console.error("Failed to upload wallpaper:", err);
                    addNotification("Wallpaper upload failed");
                    return;
                }
            }

            await updateDoc(userDocRef, updates);
        } catch (error) {
            console.error("Error updating settings in Firestore:", error);
        }
    };


    const findUserByPhone = (phone: string) => {
        const normalizedInput = phone.replace(/[^0-9+]/g, "");
        const found = allDatingUsers.find(u => {
            if (!u.phoneNumber) return false;
            const normalizedUser = u.phoneNumber.replace(/[^0-9+]/g, "");
            return (normalizedUser === normalizedInput || normalizedUser.endsWith(normalizedInput) || normalizedInput.endsWith(normalizedUser)) &&
                u.settings?.privacy?.discoverableByPhone !== false;
        });

        if (found) {
            setAllDatingUsers(prev => {
                const filtered = prev.filter(u => u.id !== found.id);
                return [found, ...filtered];
            });
        }

        return found;
    };

    const findUserByEmail = (email: string) => {
        const normalizedInput = email.toLowerCase().trim();
        return allDatingUsers.find(u =>
            u.email?.toLowerCase().trim() === normalizedInput
        );
    };

    const startDirectChat = async (targetUser: User, autoSendIcebreaker = false): Promise<string> => {
        if (!currentUserId) return "";

        // 1. Check if regular direct thread already exists in local state (exclude groups and marketplace threads)
        const existingThread = formattedThreads.find(t => !t.isGroup && !isMarketplaceThread(t) && t.user.id === targetUser.id);
        if (existingThread) return existingThread.id;

        // 2. Query Firestore to find if a thread already exists between these two users
        try {
            const q = query(
                collection(db, "threads"),
                where("participantIds", "array-contains", currentUserId)
            );
            const querySnap = await getDocs(q);
            const existingThreadDoc = querySnap.docs.find(d => {
                const data = d.data();
                // Exclude group threads and marketplace threads — we only want 1-on-1 DMs
                if (data.isGroup || data.isMarketplace || d.id.startsWith("mkt_") || d.id.startsWith("marketplace_")) return false;
                return Array.isArray(data.participantIds) && data.participantIds.includes(targetUser.id);
            });

            if (existingThreadDoc) {
                const threadId = existingThreadDoc.id;
                const threadData = existingThreadDoc.data();
                const updates: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ = {};
                
                // Re-activate the thread if it was soft-deleted or archived
                if (Array.isArray(threadData.deletedFor) && threadData.deletedFor.includes(currentUserId)) {
                    updates.deletedFor = arrayRemove(currentUserId);
                }
                if (Array.isArray(threadData.archivedFor) && threadData.archivedFor.includes(currentUserId)) {
                    updates.archivedFor = arrayRemove(currentUserId);
                }
                
                if (Object.keys(updates).length > 0) {
                    await updateDoc(doc(db, "threads", threadId), updates);
                }
                return threadId;
            }
        } catch (err) {
            console.error("Error querying existing threads in Firestore:", err);
        }

        // 3. Create a brand new thread document if none exists
        const threadId = crypto.randomUUID();

        const threadRef = doc(db, "threads", threadId);
        const defaultIcebreakerText = currentUser?.settings?.defaultIcebreaker || "Hey, do you want to chat? 😊✨";

        await setDoc(threadRef, {
            id: threadId,
            participantIds: [currentUserId, targetUser.id],
            participants: {
                [currentUserId]: {
                    id: currentUserId,
                    name: currentUser.name || "User",
                    age: currentUser.age !== undefined ? currentUser.age : 24,
                    avatar: currentUser.avatar || null,
                    color: currentUser.color || "bg-emerald-200",
                    bio: currentUser.bio || "",
                    interests: currentUser.interests || [],
                    phoneNumber: currentUser.phoneNumber || ""
                },
                [targetUser.id]: {
                    id: targetUser.id,
                    name: targetUser.name || "User",
                    age: targetUser.age !== undefined ? targetUser.age : 24,
                    avatar: targetUser.avatar || null,
                    color: targetUser.color || "bg-emerald-200",
                    bio: targetUser.bio || "",
                    interests: targetUser.interests || [],
                    phoneNumber: targetUser.phoneNumber || ""
                }
            },
            lastMessage: autoSendIcebreaker ? defaultIcebreakerText : "",
            lastTime: "Now",
            unreadFor: autoSendIcebreaker ? [targetUser.id] : [],
            archivedFor: [],
            mutedFor: [],
            deletedFor: [],
            updatedAt: new Date().toISOString(),
            status: "active",
            initiatedBy: currentUserId
        });

        if (autoSendIcebreaker) {
            const messageId = crypto.randomUUID();
            const messageRef = doc(db, "threads", threadId, "messages", messageId);
            await setDoc(messageRef, {
                id: messageId,
                senderId: currentUserId,
                text: defaultIcebreakerText,
                time: "Now",
                type: "text",
                read: false,
                createdAt: new Date().toISOString()
            });
        }

        return threadId;
    };

    const startGroupChat = async (name: string, members: User[]): Promise<string> => {
        if (!currentUserId) return "";

        const threadId = crypto.randomUUID();
        const threadRef = doc(db, "threads", threadId);

        const participantIds = [currentUserId, ...members.map(m => m.id)];
        
        const participants: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ = {
            [currentUserId]: {
                id: currentUserId,
                name: currentUser.name || "User",
                age: currentUser.age !== undefined ? currentUser.age : 24,
                avatar: currentUser.avatar || null,
                color: currentUser.color || "bg-emerald-200",
                bio: currentUser.bio || "",
                interests: currentUser.interests || [],
                phoneNumber: currentUser.phoneNumber || ""
            }
        };

        members.forEach(member => {
            participants[member.id] = {
                id: member.id,
                name: member.name || "User",
                age: member.age !== undefined ? member.age : 24,
                avatar: member.avatar || null,
                color: member.color || "bg-emerald-200",
                bio: member.bio || "",
                interests: member.interests || [],
                phoneNumber: member.phoneNumber || ""
            };
        });

        await setDoc(threadRef, {
            id: threadId,
            isGroup: true,
            groupName: name,
            groupAvatar: "🥤",
            creatorId: currentUserId,
            adminIds: [currentUserId],
            initiatedBy: currentUserId,
            participantIds,
            participants,
            lastMessage: "Group created",
            lastTime: "Now",
            unreadFor: [],
            archivedFor: [],
            mutedFor: [],
            deletedFor: [],
            updatedAt: new Date().toISOString()
        });

        const messageId = crypto.randomUUID();
        await setDoc(doc(db, "threads", threadId, "messages", messageId), {
            id: messageId,
            sender: "system",
            text: `${currentUser.name || "User"} created the group "${name}"`,
            type: "system",
            createdAt: new Date().toISOString(),
            read: false
        });

        return threadId;
    };

    const postStatus = async (
        textContent?: string,
        mediaUrl?: string,
        mediaType?: "photo" | "video",
        backgroundColor?: string,
        targetUserId?: string
    ): Promise<string | null> => {
        if (!currentUserId) return null;
        if (!textContent?.trim() && !mediaUrl) return null;

        const statusId = `status_${Date.now()}`;
        let finalMediaUrl = mediaUrl;

        // If mediaUrl is base64, upload it to Storage
        if (mediaUrl && mediaUrl.startsWith("data:")) {
            try {
                addNotification("Uploading status media...");
                const storagePath = `statuses/${currentUserId}/${statusId}`;
                finalMediaUrl = await uploadImageToStorage(mediaUrl, storagePath);
            } catch (err) {
                console.error("Failed to upload status media:", err);
                addNotification("Failed to upload media. Posting text only.");
                finalMediaUrl = undefined;
            }
        }

        const mediaItems = finalMediaUrl ? [{
            id: `item_${Date.now()}`,
            mediaUrl: finalMediaUrl,
            mediaType: mediaType || "photo"
        }] : [];

        const postAsId = targetUserId || currentUserId;
        const groupThread = targetUserId ? threadsList.find(t => t.id === targetUserId) : null;

        const newStatus = {
            userId: postAsId,
            username: groupThread ? (groupThread.groupName || "Group Chat") : currentUser.name,
            userColor: groupThread ? "bg-emerald-100" : currentUser.color,
            userAvatar: groupThread ? (groupThread.groupAvatar || null) : currentUser.avatar,
            textContent: textContent?.trim() || null,
            mediaUrl: finalMediaUrl || null,
            mediaType: mediaType || null,
            mediaItems: mediaItems,
            backgroundColor: backgroundColor || null,
            timestamp: new Date().toISOString(),
            isBoosted: false,
            replies: [],
        };

        try {
            await setDoc(doc(db, "statuses", statusId), newStatus);
            addNotification("Status posted! 🌟");
            return statusId;
        } catch (err) {
            console.error("Failed to save status to Firestore:", err);
            addNotification("Failed to post status.");
            return null;
        }
    };

    const updateStatus = async (statusId: string, updates: Partial<Status>) => {
        try {
            await updateDoc(doc(db, "statuses", statusId), updates);
            addNotification("Status updated!");
        } catch (err) {
            console.error("Failed to update status:", err);
            addNotification("Failed to update status.");
        }
    };

    const boostStatus = async (statusId: string, durationHours: number, paymentMethod: 'simulated' | 'stripe' = 'simulated', amount: number = 2.99) => {
        if (!currentUserId) return;
        const boostUntil = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
        try {
            await updateDoc(doc(db, "statuses", statusId), {
                isBoosted: true,
                boostUntil: boostUntil
            });

            // Get status details for transaction context
            const statusRef = doc(db, "statuses", statusId);
            const statusSnap = await getDoc(statusRef);
            let statusText = "Status Update";
            if (statusSnap.exists()) {
                const data = statusSnap.data();
                statusText = data.textContent || (data.mediaUrl ? "Media Status" : "Status Update");
            }

            // Create transaction record
            const transactionId = `tx_${Date.now()}`;
            await setDoc(doc(db, "transactions", transactionId), {
                id: transactionId,
                userId: currentUserId,
                statusId: statusId,
                statusText: statusText,
                timestamp: new Date().toISOString(),
                amount: amount,
                durationHours: durationHours,
                paymentMethod: paymentMethod,
                status: "completed"
            });

            addNotification(`Status boosted for ${durationHours} hours! 🔥`);
        } catch (err) {
            console.error("Failed to boost status:", err);
            addNotification("Failed to boost status.");
        }
    };

    const boostProfile = async (durationHours: number, paymentMethod: 'simulated' | 'stripe' = 'simulated', amount: number = 2.99) => {
        if (!currentUserId) return;
        const boostUntil = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
        try {
            await updateDoc(doc(db, "users", currentUserId), {
                isBoosted: true,
                boostUntil: boostUntil
            });

            // Create transaction record
            const transactionId = `tx_${Date.now()}`;
            await setDoc(doc(db, "transactions", transactionId), {
                id: transactionId,
                userId: currentUserId,
                statusId: "profile",
                statusText: "Profile Boost",
                timestamp: new Date().toISOString(),
                amount: amount,
                durationHours: durationHours,
                paymentMethod: paymentMethod,
                status: "completed"
            });

            addNotification(`Profile boosted for ${durationHours} hours! ⚡`);
        } catch (err) {
            console.error("Failed to boost profile:", err);
            addNotification("Failed to boost profile.");
        }
    };

    const deleteStatus = async (statusId: string) => {
        try {
            await deleteDoc(doc(db, "statuses", statusId));
            addNotification("Status deleted!");
        } catch (err) {
            console.error("Failed to delete status:", err);
            addNotification("Failed to delete status.");
        }
    };

    const replyToStatus = async (statusId: string, replyText: string): Promise<string | null> => {
        if (!currentUserId || !replyText.trim()) return null;

        // Find the status
        const status = statuses.find(s => s.id === statusId);
        if (!status) return null;

        // Add reply to status replies list
        const newReply: StatusReply = {
            id: `reply_${Date.now()}`,
            userId: currentUserId,
            userName: currentUser.name,
            text: replyText,
            time: "Now",
        };

        // Update document in Firestore
        try {
            const statusRef = doc(db, "statuses", statusId);
            await updateDoc(statusRef, {
                replies: arrayUnion(newReply)
            });
        } catch (err) {
            console.error("Failed to save reply to Firestore:", err);
        }

        // Find the status author as a User
        const statusAuthor = allDatingUsers.find(u => u.id === status.userId);
        if (!statusAuthor) {
            addNotification(`Reply sent to ${status.username}!`);
            return null;
        }

        // Start a direct chat and send the reply as a message
        const threadId = await startDirectChat(statusAuthor, false);
        if (threadId) {
            const formattedReply = `↩️ Reply to status: "${status.textContent?.slice(0, 50)}..."\n\n${replyText}`;
            await sendMessage(threadId, formattedReply, "text");
        }

        addNotification(`Reply sent to ${status.username}!`);
        return threadId;
    };

    const syncDeviceContacts = async (contactsList: { name: string; phoneNumber: string }[]) => {
        if (!currentUserId) return;
        try {
            await updateDoc(doc(db, "users", currentUserId), {
                localContacts: contactsList
            });
            addNotification("Contacts synced!");
        } catch (err) {
            console.error("Failed to sync device contacts:", err);
        }
    };

    const addNewLocalContact = async (name: string, phoneNumber: string) => {
        if (!currentUserId) return;
        try {
            await updateDoc(doc(db, "users", currentUserId), {
                localContacts: arrayUnion({ name, phoneNumber })
            });
            addNotification("New contact added!");
        } catch (err) {
            console.error("Failed to add new local contact:", err);
        }
    };

    const togglePinThread = async (threadId: string): Promise<{ success: boolean; error?: string }> => {
        if (!currentUserId) return { success: false, error: "Not logged in" };
        const pinnedList = currentUser.pinnedThreadIds || [];
        const isPinned = pinnedList.includes(threadId);

        if (!isPinned) {
            if (pinnedList.length >= 3) {
                const errMsg = "Maximum of 3 chats can be pinned.";
                addNotification(errMsg);
                return { success: false, error: errMsg };
            }
            try {
                await updateDoc(doc(db, "users", currentUserId), {
                    pinnedThreadIds: arrayUnion(threadId)
                });
                addNotification("Chat pinned!");
                return { success: true };
            } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
                console.error("Failed to pin chat:", err);
                return { success: false, error: err.message || "Failed to pin chat" };
            }
        } else {
            try {
                await updateDoc(doc(db, "users", currentUserId), {
                    pinnedThreadIds: arrayRemove(threadId)
                });
                addNotification("Chat unpinned!");
                return { success: true };
            } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
                console.error("Failed to unpin chat:", err);
                return { success: false, error: err.message || "Failed to unpin chat" };
            }
        }
    };

    const togglePinProfile = async (profileId: string): Promise<{ success: boolean; error?: string }> => {
        if (!currentUserId) return { success: false, error: "Not logged in" };
        const pinnedList = currentUser.pinnedProfileIds || [];
        const isPinned = pinnedList.includes(profileId);

        if (!isPinned) {
            if (pinnedList.length >= 7) {
                const errMsg = "Maximum of 7 Profiles can be pinned.";
                addNotification(errMsg);
                return { success: false, error: errMsg };
            }
            try {
                await updateDoc(doc(db, "users", currentUserId), {
                    pinnedProfileIds: arrayUnion(profileId)
                });
                addNotification("Profile pinned!");
                return { success: true };
            } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
                console.error("Failed to pin profile:", err);
                return { success: false, error: err.message || "Failed to pin profile" };
            }
        } else {
            try {
                await updateDoc(doc(db, "users", currentUserId), {
                    pinnedProfileIds: arrayRemove(profileId)
                });
                addNotification("Profile unpinned!");
                return { success: true };
            } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
                console.error("Failed to unpin profile:", err);
                return { success: false, error: err.message || "Failed to unpin profile" };
            }
        }
    };

    const requestNotificationPermission = async (): Promise<boolean> => {
        if (!currentUserId || typeof window === "undefined") return false;
        
        const isCapacitor = typeof window !== "undefined" && (window as any).Capacitor;
        if (isCapacitor) {
            try {
                const { PushNotifications } = await import('@capacitor/push-notifications');
                let permStatus = await PushNotifications.checkPermissions();
                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                }
                if (permStatus.receive === 'granted') {
                    await PushNotifications.register();
                    
                    await PushNotifications.addListener('registration', async (token) => {
                        const deviceToken = token.value;
                        console.log('Capacitor native push registration success, token: ' + deviceToken);
                        const userDocRef = doc(db, "users", currentUserId);
                        const userSnap = await getDoc(userDocRef);
                        if (userSnap.exists()) {
                            const data = userSnap.data();
                            const existingTokens = data.fcmTokens || [];
                            if (!existingTokens.includes(deviceToken)) {
                                await updateDoc(userDocRef, {
                                    fcmTokens: arrayUnion(deviceToken)
                                });
                            }
                        }
                    });
                    addNotification("Notifications enabled successfully!");
                    return true;
                } else {
                    addNotification("Notification permission denied");
                    return false;
                }
            } catch (err) {
                console.error("Failed to request native push notification permission:", err);
                return false;
            }
        }

        if (!("Notification" in window)) return false;
        try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                const reg = await navigator.serviceWorker.ready;
                let subscription = await reg.pushManager.getSubscription();
                if (!subscription) {
                    const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
                    subscription = await reg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: convertedKey
                    });
                }
                const subJson = subscription.toJSON();
                const userDocRef = doc(db, "users", currentUserId);
                const userSnap = await getDoc(userDocRef);
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    const existingSubs = data.pushSubscriptions || [];
                    const alreadySaved = existingSubs.some((s: any) => s.endpoint === subJson.endpoint);
                    if (!alreadySaved) {
                        await updateDoc(userDocRef, {
                            pushSubscriptions: arrayUnion(subJson)
                        });
                    }
                }
                addNotification("Notifications enabled successfully!");
                return true;
            } else {
                addNotification("Notification permission denied");
                return false;
            }
        } catch (err) {
            console.error("Failed to request notification permission:", err);
            return false;
        }
    };

    const requestLocationPermission = async (): Promise<boolean> => {
        if (typeof window === "undefined" || !navigator.geolocation) {
            addNotification("Location access enabled!");
            return true;
        }

        return new Promise((resolve) => {
            let resolved = false;

            const fallbackTimer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    addNotification("Location access enabled!");
                    resolve(true);
                }
            }, 3500);

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    if (resolved) return;
                    resolved = true;
                    clearTimeout(fallbackTimer);
                    const { latitude, longitude } = position.coords;
                    if (currentUserId) {
                        try {
                            const userDocRef = doc(db, "users", currentUserId);
                            await updateDoc(userDocRef, {
                                latitude,
                                longitude,
                                locationUpdatedAt: new Date().toISOString()
                            });
                        } catch (e) {}
                    }
                    addNotification("Location access enabled!");
                    resolve(true);
                },
                (err) => {
                    if (resolved) return;
                    resolved = true;
                    clearTimeout(fallbackTimer);
                    console.error("Location permission error:", err);
                    addNotification("Location access enabled!");
                    resolve(true);
                },
                { enableHighAccuracy: false, timeout: 3500 }
            );
        });
    };

    const requestContactsPermission = async (): Promise<boolean> => {
        if (typeof window === "undefined") return false;
        if ("contacts" in navigator && "ContactsManager" in window) {
            try {
                const props = ["name", "tel"];
                const contacts = await (navigator as any).contacts.select(props, { multiple: true });
                if (contacts && contacts.length > 0) {
                    const formatted = contacts.map((c: any) => ({
                        name: c.name?.[0] || "Unknown",
                        phoneNumber: c.tel?.[0] || ""
                    })).filter((c: any) => c.phoneNumber);
                    await syncDeviceContacts(formatted);
                    addNotification(`Synced ${formatted.length} contacts!`);
                    return true;
                }
            } catch (e) {
                console.error("Contacts picker error:", e);
            }
        }
        addNotification("Contacts access enabled!");
        return true;
    };

    // ===== MOODS FEATURE =====

    // Subscribe to moods collection (all users' moods)
    useEffect(() => {
        if (!currentUserId) return;

        const moodsQuery = query(collection(db, "moods"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(moodsQuery, (snapshot) => {
            const moodsList: Mood[] = snapshot.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    userId: data.userId || "",
                    userName: data.userName || "User",
                    userAvatar: data.userAvatar || null,
                    userColor: data.userColor || "bg-gray-200",
                    type: data.type || "photo",
                    mediaUrl: data.mediaUrl || "",
                    caption: data.caption || "",
                    createdAt: data.createdAt || new Date().toISOString(),
                    likes: data.likes || [],
                    comments: data.comments || [],
                    sourceProfilePhoto: data.sourceProfilePhoto || false,
                } as Mood;
            });
            setMoods(moodsList);
        }, (error) => {
            console.error("MockContext: onSnapshot moods error:", error);
        });

        return () => unsubscribe();
    }, [currentUserId]);

    // Subscribe to callLogs collection in real-time
    useEffect(() => {
        if (!currentUserId) return;

        const callLogsRef = collection(db, "callLogs");
        const unsubscribe = onSnapshot(callLogsRef, (snapshot) => {
            const logs = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    callerId: data.callerId || "",
                    callerName: data.callerName || "",
                    callerAvatar: data.callerAvatar || null,
                    calleeId: data.calleeId || "",
                    calleeName: data.calleeName || "",
                    calleeAvatar: data.calleeAvatar || null,
                    type: data.type || "audio",
                    status: data.status || "ringing",
                    timestamp: data.timestamp || new Date().toISOString(),
                    duration: data.duration !== undefined ? data.duration : undefined,
                    read: data.read !== undefined ? data.read : false,
                } as CallLog;
            }).filter(log => log.callerId === currentUserId || log.calleeId === currentUserId);
            
            // Sort by timestamp descending
            logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setCallLogs(logs);
        }, (error) => {
            console.error("MockContext: onSnapshot callLogs error:", error);
        });

        return () => unsubscribe();
    }, [currentUserId]);

    const clearCallLogs = async () => {
        if (!currentUserId) return;
        try {
            const batch = writeBatch(db);
            const q = query(collection(db, "callLogs"));
            const snapshot = await getDocs(q);
            let count = 0;
            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (data.callerId === currentUserId || data.calleeId === currentUserId) {
                    batch.delete(docSnap.ref);
                    count++;
                }
            });
            if (count > 0) {
                await batch.commit();
            }
            addNotification("Call logs cleared");
        } catch (error) {
            console.error("Error clearing call logs:", error);
            addNotification("Failed to clear call logs");
        }
    };

    const markCallLogsAsRead = async () => {
        if (!currentUserId || !callLogs.length) return;
        try {
            const batch = writeBatch(db);
            let updatedCount = 0;
            const unreadLogs = callLogs.filter(
                log => log.calleeId === currentUserId && log.status === "missed" && !log.read
            );
            
            unreadLogs.forEach(log => {
                const logRef = doc(db, "callLogs", log.id);
                batch.update(logRef, { read: true });
                updatedCount++;
            });

            if (updatedCount > 0) {
                await batch.commit();
            }
        } catch (error) {
            console.error("Error marking call logs read:", error);
        }
    };

    const postMood = async (
        type: "photo" | "video",
        mediaDataUrl: string,
        caption: string,
        sourceProfilePhoto?: boolean,
        targetUserId?: string
    ) => {
        if (!currentUserId) return;

        const moodId = crypto.randomUUID();
        let finalMediaUrl = mediaDataUrl;

        // Upload media to Firebase Storage
        if (mediaDataUrl.startsWith("data:")) {
            try {
                addNotification("Uploading mood...");
                const storagePath = `moods/${currentUserId}/${moodId}`;
                finalMediaUrl = await uploadImageToStorage(mediaDataUrl, storagePath);
            } catch (err) {
                console.error("Failed to upload mood media:", err);
                addNotification("Upload failed. Please try again.");
                return;
            }
        }

        const postAsId = targetUserId || currentUserId;
        const groupThread = targetUserId ? threadsList.find(t => t.id === targetUserId) : null;

        const moodDoc: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ = {
            userId: postAsId,
            userName: groupThread ? (groupThread.groupName || "Group Chat") : currentUser.name,
            userAvatar: groupThread ? (groupThread.groupAvatar || null) : currentUser.avatar,
            userColor: groupThread ? "bg-emerald-100" : currentUser.color,
            type,
            mediaUrl: finalMediaUrl,
            caption,
            createdAt: new Date().toISOString(),
            likes: [],
            comments: [],
        };

        if (sourceProfilePhoto) {
            moodDoc.sourceProfilePhoto = true;
        }

        await setDoc(doc(db, "moods", moodId), moodDoc);
        if (!sourceProfilePhoto) {
            addNotification("Mood posted! 🎉");
        }
    };

    const deleteMood = async (moodId: string) => {
        if (!currentUserId) return;
        try {
            await deleteDoc(doc(db, "moods", moodId));
            addNotification("Mood deleted.");
        } catch (err) {
            console.error("Failed to delete mood:", err);
        }
    };

    const updateMood = async (moodId: string, updates: Partial<Mood>) => {
        try {
            await updateDoc(doc(db, "moods", moodId), updates);
            addNotification("Mood updated! 📝");
        } catch (err) {
            console.error("Failed to update mood:", err);
            addNotification("Failed to update mood.");
        }
    };

    const likeMood = async (moodId: string) => {
        if (!currentUserId) return;
        const moodRef = doc(db, "moods", moodId);
        const moodSnap = await getDoc(moodRef);
        if (!moodSnap.exists()) return;

        const currentLikes: string[] = moodSnap.data().likes || [];
        if (currentLikes.includes(currentUserId)) {
            // Unlike
            await updateDoc(moodRef, { likes: arrayRemove(currentUserId) });
        } else {
            // Like
            await updateDoc(moodRef, { likes: arrayUnion(currentUserId) });
        }
    };

    const commentOnMood = async (moodId: string, text: string, replyTo?: string | null) => {
        if (!currentUserId || !text.trim()) return;
        const moodRef = doc(db, "moods", moodId);
        const newComment: MoodComment = {
            id: crypto.randomUUID(),
            userId: currentUserId,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            text: text.trim(),
            createdAt: new Date().toISOString(),
            likes: [],
            replyTo: replyTo || null
        };
        await updateDoc(moodRef, {
            comments: arrayUnion(newComment)
        });
    };

    const likeCommentOnMood = async (moodId: string, commentId: string) => {
        if (!currentUserId) return;
        const moodRef = doc(db, "moods", moodId);
        const moodSnap = await getDoc(moodRef);
        if (!moodSnap.exists()) return;
        
        const currentComments: MoodComment[] = moodSnap.data().comments || [];
        const updatedComments = currentComments.map(c => {
            if (c.id === commentId) {
                const likes = c.likes || [];
                if (likes.includes(currentUserId)) {
                    return { ...c, likes: likes.filter(uid => uid !== currentUserId) };
                } else {
                    return { ...c, likes: [...likes, currentUserId] };
                }
            }
            return c;
        });
        await updateDoc(moodRef, { comments: updatedComments });
    };

    const editCommentOnMood = async (moodId: string, commentId: string, newText: string) => {
        if (!currentUserId) return;
        const moodRef = doc(db, "moods", moodId);
        const moodSnap = await getDoc(moodRef);
        if (!moodSnap.exists()) return;

        const currentComments: MoodComment[] = moodSnap.data().comments || [];
        const updatedComments = currentComments.map(c => {
            if (c.id === commentId) {
                return { ...c, text: newText.trim() };
            }
            return c;
        });
        await updateDoc(moodRef, { comments: updatedComments });
    };

    const deleteCommentOnMood = async (moodId: string, commentId: string) => {
        if (!currentUserId) return;
        const moodRef = doc(db, "moods", moodId);
        const moodSnap = await getDoc(moodRef);
        if (!moodSnap.exists()) return;

        const currentComments: MoodComment[] = moodSnap.data().comments || [];
        const updatedComments = currentComments.filter(c => c.id !== commentId && c.replyTo !== commentId);
        await updateDoc(moodRef, { comments: updatedComments });
    };

    const getMoodsForUser = (userId: string): Mood[] => {
        return moods.filter(m => m.userId === userId);
    };

    // ===== DRAFTS FEATURE =====

    // Subscribe to drafts collection (all users' drafts)
    useEffect(() => {
        if (!currentUserId) return;

        const draftsQuery = query(collection(db, "drafts"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(draftsQuery, (snapshot) => {
            const draftsList: Draft[] = snapshot.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    userId: data.userId || "",
                    userName: data.userName || "User",
                    userAvatar: data.userAvatar || null,
                    userColor: data.userColor || "bg-gray-200",
                    text: data.text || "",
                    createdAt: data.createdAt || new Date().toISOString(),
                    likes: data.likes || [],
                    comments: data.comments || [],
                } as Draft;
            });
            setDrafts(draftsList);
        }, (error) => {
            console.error("MockContext: onSnapshot drafts error:", error);
        });

        return () => unsubscribe();
    }, [currentUserId]);

    const postDraft = async (text: string, targetUserId?: string) => {
        if (!currentUserId || !text.trim()) return;

        const draftId = crypto.randomUUID();
        const postAsId = targetUserId || currentUserId;
        const groupThread = targetUserId ? threadsList.find(t => t.id === targetUserId) : null;

        const draftDoc = {
            userId: postAsId,
            userName: groupThread ? (groupThread.groupName || "Group Chat") : currentUser.name,
            userAvatar: groupThread ? (groupThread.groupAvatar || null) : currentUser.avatar,
            userColor: groupThread ? "bg-emerald-100" : currentUser.color,
            text: text.trim(),
            createdAt: new Date().toISOString(),
            likes: [],
            comments: [],
        };

        try {
            await setDoc(doc(db, "drafts", draftId), draftDoc);
            addNotification("Draft posted! 📝");
        } catch (err) {
            console.error("Failed to post draft:", err);
            addNotification("Failed to post draft.");
        }
    };

    const deleteDraft = async (draftId: string) => {
        if (!currentUserId) return;
        try {
            await deleteDoc(doc(db, "drafts", draftId));
            addNotification("Draft deleted.");
        } catch (err) {
            console.error("Failed to delete draft:", err);
            addNotification("Failed to delete draft.");
        }
    };

    const likeDraft = async (draftId: string) => {
        if (!currentUserId) return;
        const draftRef = doc(db, "drafts", draftId);
        const draftSnap = await getDoc(draftRef);
        if (!draftSnap.exists()) return;

        const currentLikes: string[] = draftSnap.data().likes || [];
        if (currentLikes.includes(currentUserId)) {
            await updateDoc(draftRef, { likes: arrayRemove(currentUserId) });
        } else {
            await updateDoc(draftRef, { likes: arrayUnion(currentUserId) });
        }
    };

    const commentOnDraft = async (draftId: string, text: string, replyToCommentId?: string) => {
        if (!currentUserId || !text.trim()) return;
        const draftRef = doc(db, "drafts", draftId);
        const newComment: DraftComment = {
            id: crypto.randomUUID(),
            userId: currentUserId,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            userColor: currentUser.color,
            text: text.trim(),
            createdAt: new Date().toISOString(),
            likes: [],
            replyTo: replyToCommentId ?? null,
            replies: [],
        };
        try {
            await updateDoc(draftRef, {
                comments: arrayUnion(newComment)
            });
            addNotification("Comment added!");
        } catch (err) {
            console.error("Failed to add comment to draft:", err);
            addNotification("Failed to add comment.");
        }
    };

    const likeComment = async (draftId: string, commentId: string) => {
        if (!currentUserId) return;
        const draft = drafts.find(d => d.id === draftId);
        if (!draft) return;
        const updatedComments = draft.comments.map(c => {
            if (c.id === commentId) {
                const alreadyLiked = (c.likes ?? []).includes(currentUserId!);
                return { ...c, likes: alreadyLiked ? (c.likes ?? []).filter(id => id !== currentUserId) : [...(c.likes ?? []), currentUserId!] };
            }
            return c;
        });
        const draftRef = doc(db, "drafts", draftId);
        try {
            await updateDoc(draftRef, { comments: updatedComments });
        } catch (err) {
            console.error("Failed to like comment:", err);
        }
    };

    // ===== MARKETPLACE FEATURE =====

    // Subscribe to marketplace_items collection (all active listings)
    useEffect(() => {
        const marketplaceRef = collection(db, "marketplace_items");
        const unsubscribe = onSnapshot(marketplaceRef, (snapshot) => {
            if (!snapshot.empty) {
                const itemsList: MarketplaceItem[] = snapshot.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        sellerId: data.sellerId || "",
                        sellerName: data.sellerName || "Seller",
                        sellerAvatar: data.sellerAvatar || null,
                        sellerColor: data.sellerColor || "bg-gray-200",
                        sellerLocation: data.sellerLocation || "",
                        title: data.title || "",
                        price: data.price !== undefined ? Number(data.price) : 0,
                        category: data.category || "Other",
                        condition: data.condition || "Good",
                        description: data.description || "",
                        images: Array.isArray(data.images) && data.images.length > 0 ? data.images : (data.imageUrl ? [data.imageUrl] : []),
                        location: data.location || data.sellerLocation || "Local",
                        status: data.status || "active",
                        createdAt: data.createdAt || new Date().toISOString(),
                        savedBy: Array.isArray(data.savedBy) ? data.savedBy : [],
                        viewsCount: data.viewsCount || 0,
                    } as MarketplaceItem;
                }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                
                // Merge snapshot items with INITIAL_MARKETPLACE_ITEMS so demo items are preserved and updated
                const itemMap = new Map<string, MarketplaceItem>();
                INITIAL_MARKETPLACE_ITEMS.forEach(i => itemMap.set(i.id, i));
                itemsList.forEach(i => itemMap.set(i.id, i));
                const combined = Array.from(itemMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setMarketplaceItems(combined);
            } else {
                setMarketplaceItems(INITIAL_MARKETPLACE_ITEMS);
            }
        }, (error) => {
            console.error("MockContext: onSnapshot marketplace items error:", error);
            setMarketplaceItems(INITIAL_MARKETPLACE_ITEMS);
        });

        return () => unsubscribe();
    }, []);

    const createMarketplaceListing = async (data: {
        title: string;
        price: number;
        category: string;
        condition: MarketplaceCondition;
        description: string;
        location?: string;
        images: string[];
    }): Promise<string> => {
        const itemId = `mkt_${Date.now()}`;
        
        // Upload images concurrently with timeout safety
        const uploadedImages = await Promise.all(
            data.images.map(async (img, i) => {
                if (img.startsWith("data:") && currentUserId) {
                    try {
                        const storagePath = `marketplace/${currentUserId}/${itemId}_${i}`;
                        const uploadPromise = uploadImageToStorage(img, storagePath);
                        const timeoutPromise = new Promise<string>((_, reject) =>
                            setTimeout(() => reject(new Error("Storage timeout")), 3500)
                        );
                        return await Promise.race([uploadPromise, timeoutPromise]);
                    } catch (err) {
                        console.warn("Storage upload deferred/fallback for listing image:", err);
                        return img;
                    }
                }
                return img;
            })
        );

        const newItem: MarketplaceItem = {
            id: itemId,
            sellerId: currentUserId || "me",
            sellerName: currentUser?.marketplaceStore?.storeName || currentUser?.name || "Me",
            sellerOwnerName: currentUser?.marketplaceStore?.ownerName || currentUser?.name || "Seller",
            sellerAvatar: currentUser?.marketplaceStore?.avatar || currentUser?.avatar || null,
            sellerColor: currentUser?.color || "bg-emerald-200",
            sellerLocation: currentUser?.location || "Local",
            title: data.title,
            price: Number(data.price),
            category: data.category,
            condition: data.condition,
            description: data.description,
            images: uploadedImages.length > 0 ? uploadedImages : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"],
            location: data.location || currentUser?.location || "Local",
            status: "active",
            createdAt: new Date().toISOString(),
            savedBy: [],
            viewsCount: 0
        };

        // Optimistically update local state immediately so user sees their listing instantly
        setMarketplaceItems(prev => [newItem, ...prev]);
        addNotification("Listing published to Marketplace! 🛍️");

        // Save to Firestore with timeout guarantee so user is never blocked
        try {
            const itemRef = doc(db, "marketplace_items", itemId);
            await Promise.race([
                setDoc(itemRef, newItem),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore write timeout")), 4000))
            ]);
        } catch (err) {
            console.warn("Marketplace listing Firestore sync fallback:", err);
        }

        return itemId;
    };

    const updateMarketplaceListing = async (id: string, updates: Partial<MarketplaceItem>) => {
        setMarketplaceItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
        try {
            const itemRef = doc(db, "marketplace_items", id);
            await Promise.race([
                setDoc(itemRef, updates, { merge: true }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore write timeout")), 4000))
            ]);
            addNotification("Listing updated!");
        } catch (err) {
            console.warn("Failed to update listing:", err);
        }
    };

    const deleteMarketplaceListing = async (id: string) => {
        setMarketplaceItems(prev => prev.filter(item => item.id !== id));
        try {
            const itemRef = doc(db, "marketplace_items", id);
            await deleteDoc(itemRef);
            addNotification("Listing removed.");
        } catch (err) {
            console.error("Failed to delete listing:", err);
        }
    };

    const toggleSaveMarketplaceItem = async (id: string) => {
        if (!currentUserId) return;
        const target = marketplaceItems.find(item => item.id === id);
        if (!target) return;

        const isSaved = target.savedBy.includes(currentUserId);
        const newSavedBy = isSaved 
            ? target.savedBy.filter(uid => uid !== currentUserId)
            : [...target.savedBy, currentUserId];

        setMarketplaceItems(prev => prev.map(item => item.id === id ? { ...item, savedBy: newSavedBy } : item));

        try {
            const itemRef = doc(db, "marketplace_items", id);
            await updateDoc(itemRef, {
                savedBy: isSaved ? arrayRemove(currentUserId) : arrayUnion(currentUserId)
            });
            addNotification(isSaved ? "Removed from saved items" : "Saved to your items! ❤️");
        } catch (err) {
            console.error("Failed to toggle save marketplace item:", err);
        }
    };

    const sendMarketplaceInquiry = async (
        sellerUser: User,
        item: MarketplaceItem,
        customMessage?: string
    ): Promise<string> => {
        if (!currentUserId) throw new Error("Must be logged in to message seller");

        // 1. Check local state specifically for an existing dedicated marketplace thread
        const existingMktThread = formattedThreads.find(
            t => !t.isGroup && isMarketplaceThread(t) && (t.user.id === sellerUser.id || (t as any).sellerId === sellerUser.id)
        );

        let threadId: string;

        if (existingMktThread) {
            threadId = existingMktThread.id;
        } else {
            // Check Firestore for dedicated marketplace thread
            try {
                const q = query(
                    collection(db, "threads"),
                    where("participantIds", "array-contains", currentUserId),
                    where("isMarketplace", "==", true)
                );
                const querySnap = await getDocs(q);
                const existingDoc = querySnap.docs.find(d => {
                    const data = d.data();
                    return !data.isGroup && Array.isArray(data.participantIds) && data.participantIds.includes(sellerUser.id);
                });
                if (existingDoc) {
                    threadId = existingDoc.id;
                } else {
                    threadId = `mkt_${currentUserId}_${sellerUser.id}_${item.id}`;
                    const threadRef = doc(db, "threads", threadId);
                    const threadDocData = {
                        id: threadId,
                        isMarketplace: true,
                        marketplaceItemId: item.id,
                        participantIds: [currentUserId, sellerUser.id],
                        participants: {
                            [currentUserId]: {
                                id: currentUserId,
                                name: currentUser?.name || "User",
                                age: currentUser?.age !== undefined ? currentUser.age : 24,
                                avatar: currentUser?.avatar || null,
                                color: currentUser?.color || "bg-emerald-200",
                                bio: currentUser?.bio || "",
                                interests: currentUser?.interests || [],
                                phoneNumber: currentUser?.phoneNumber || ""
                            },
                            [sellerUser.id]: {
                                id: sellerUser.id,
                                name: sellerUser.name || "User",
                                age: sellerUser.age !== undefined ? sellerUser.age : 24,
                                avatar: sellerUser.avatar || null,
                                color: sellerUser.color || "bg-rose-200",
                                bio: sellerUser.bio || "",
                                interests: sellerUser.interests || [],
                                phoneNumber: sellerUser.phoneNumber || ""
                            }
                        },
                        status: "accepted",
                        initiatedBy: currentUserId,
                        unread: false,
                        lastMessage: `Marketplace Listing: ${item.title}`,
                        lastTime: "Just now",
                        updatedAt: new Date().toISOString()
                    };
                    await setDoc(threadRef, threadDocData);
                    setThreadsList(prev => {
                        if (prev.some(t => t.id === threadId)) {
                            return prev.map(t => t.id === threadId ? { ...t, ...threadDocData } : t);
                        }
                        return [threadDocData, ...prev];
                    });
                }
            } catch (err) {
                console.error("Error querying/creating marketplace thread in Firestore:", err);
                threadId = `mkt_${currentUserId}_${sellerUser.id}_${item.id}`;
            }
        }

        const defaultMsg = `Hi ${sellerUser.name}, is "${item.title}" still available?`;
        const messageText = customMessage?.trim() || defaultMsg;
        
        await sendMessage(threadId, messageText, "text", {
            imageUrl: item.images && item.images.length > 0 ? item.images[0] : undefined,
            replyTo: {
                id: item.id,
                sender: "them",
                senderId: sellerUser.id,
                text: `Marketplace Listing: ${item.title} (${item.price === 0 ? "FREE" : `$${item.price.toFixed(2)}`})`
            }
        });

        return threadId;
    };

    const updateMarketplaceStoreProfile = async (storeData: Partial<MarketplaceStoreProfile>) => {
        if (!currentUser) return;
        const currentStore = currentUser.marketplaceStore || {};
        const updatedStore: MarketplaceStoreProfile = { ...currentStore, ...storeData };
        const effectiveAvatar = updatedStore.avatar || currentUser.avatar || null;
        const effectiveOwnerName = updatedStore.ownerName || currentUser.name || "User";
        const effectiveStoreName = updatedStore.storeName || effectiveOwnerName;
        updatedStore.ownerName = effectiveOwnerName;
        updatedStore.storeName = effectiveStoreName;
        
        setCurrentUser(prev => prev ? { 
            ...prev, 
            name: effectiveOwnerName,
            avatar: effectiveAvatar,
            marketplaceStore: updatedStore 
        } : prev);
        
        if (currentUserId) {
            try {
                await updateDoc(doc(db, "users", currentUserId), {
                    name: effectiveOwnerName,
                    avatar: effectiveAvatar,
                    photoURL: effectiveAvatar,
                    marketplaceStore: updatedStore
                });
            } catch (err) {
                console.error("MockContext: failed to update marketplace store:", err);
            }
        }
        addNotification("Marketplace storefront updated! 🏪");
    };

    const getStatusesForUser = (userId: string): Status[] => {
        return statuses
            .filter(s => s.userId === userId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    // Sort statuses: boosted first, then by most recent
    const sortedStatuses = useMemo(() => {
        // eslint-disable-next-line react-hooks/purity
        const now = Date.now();
        return [...statuses]
            .filter(s => {
                const statusTime = new Date(s.timestamp).getTime();
                return now - statusTime < 24 * 60 * 60 * 1000; // Only show statuses less than 24h old
            })
            .map(s => {
                if (s.isBoosted && s.boostUntil) {
                    if (new Date(s.boostUntil).getTime() < now) {
                        return { ...s, isBoosted: false };
                    }
                }
                return s;
            })
            .sort((a, b) => {
                if (a.isBoosted && !b.isBoosted) return -1;
                if (!a.isBoosted && b.isBoosted) return 1;
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
    }, [statuses]);

    // Subscribe to rides collection (all active carpool trips)
    useEffect(() => {
        const ridesRef = collection(db, "rides");
        const unsubscribe = onSnapshot(ridesRef, (snapshot) => {
            if (!snapshot.empty) {
                const list = snapshot.docs.map(docSnap => {
                    const data = docSnap.data();
                    return {
                        id: docSnap.id,
                        driverId: data.driverId || "",
                        driverName: data.driverName || "Driver",
                        driverAvatar: data.driverAvatar || null,
                        driverColor: data.driverColor || "bg-emerald-200",
                        driverRating: Number(data.driverRating) || 5.0,
                        driverRatingsCount: Number(data.driverRatingsCount) || 1,
                        driverIsVerified: data.driverIsVerified !== false,
                        origin: data.origin || "",
                        originCity: data.originCity || data.origin?.split(",")[0]?.trim() || "",
                        destination: data.destination || "",
                        destinationCity: data.destinationCity || data.destination?.split(",")[0]?.trim() || "",
                        departureTime: data.departureTime || new Date().toISOString(),
                        estimatedDurationHours: Number(data.estimatedDurationHours) || 3.0,
                        price: Number(data.price) || 25,
                        totalSeats: Number(data.totalSeats) || 3,
                        availableSeats: typeof data.availableSeats === 'number' ? data.availableSeats : Number(data.totalSeats) || 3,
                        vehicle: data.vehicle || {
                            make: "Car",
                            model: "Sedan",
                            year: 2022,
                            color: "Silver",
                            features: ["AC", "No Smoking"]
                        },
                        description: data.description || "",
                        status: data.status || "scheduled",
                        pickupLocationNote: data.pickupLocationNote || "",
                        dropoffLocationNote: data.dropoffLocationNote || "",
                        bookings: Array.isArray(data.bookings) ? data.bookings : [],
                        savedBy: Array.isArray(data.savedBy) ? data.savedBy : [],
                        createdAt: data.createdAt || new Date().toISOString(),
                    } as Ride;
                }).sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
                setRides(list);
            } else {
                setRides(INITIAL_RIDES);
            }
        }, (error) => {
            console.error("MockContext: onSnapshot rides error:", error);
            setRides(INITIAL_RIDES);
        });

        return () => unsubscribe();
    }, []);

    const postRide = async (data: {
        origin: string;
        destination: string;
        departureTime: string;
        price: number;
        totalSeats: number;
        vehicle: RideVehicle;
        description: string;
        pickupLocationNote?: string;
        dropoffLocationNote?: string;
        estimatedDurationHours?: number;
    }): Promise<string> => {
        if (!currentUserId) throw new Error("Must be logged in to post a ride");

        const rideId = crypto.randomUUID();
        const originCity = data.origin.split(",")[0]?.trim() || data.origin;
        const destinationCity = data.destination.split(",")[0]?.trim() || data.destination;

        const newRide: Ride = {
            id: rideId,
            driverId: currentUserId,
            driverName: currentUser.name || "Driver",
            driverAvatar: currentUser.avatar || null,
            driverColor: currentUser.color || "bg-emerald-200",
            driverRating: 5.0,
            driverRatingsCount: 1,
            driverIsVerified: true,
            origin: data.origin,
            originCity: originCity,
            destination: data.destination,
            destinationCity: destinationCity,
            departureTime: data.departureTime,
            estimatedDurationHours: data.estimatedDurationHours || 3.0,
            price: data.price,
            totalSeats: data.totalSeats,
            availableSeats: data.totalSeats,
            vehicle: data.vehicle,
            description: data.description,
            status: "scheduled",
            pickupLocationNote: data.pickupLocationNote || "",
            dropoffLocationNote: data.dropoffLocationNote || "",
            bookings: [],
            savedBy: [],
            createdAt: new Date().toISOString(),
        };

        setRides(prev => [newRide, ...prev.filter(r => r.id !== rideId)]);

        try {
            await setDoc(doc(db, "rides", rideId), newRide);
            addNotification("Trip published successfully! 🚗💨");
        } catch (err) {
            console.error("Failed to save ride to Firestore:", err);
            addNotification("Trip posted locally");
        }

        return rideId;
    };

    const bookRide = async (
        rideId: string,
        seatsBooked: number,
        specialRequest?: string
    ): Promise<string> => {
        if (!currentUserId) throw new Error("Must be logged in to book a ride");

        const target = rides.find(r => r.id === rideId);
        if (!target) throw new Error("Ride not found");
        if (target.availableSeats < seatsBooked) throw new Error("Not enough available seats");

        const bookingId = crypto.randomUUID();
        const totalPrice = target.price * seatsBooked;

        const newBooking: RideBooking = {
            id: bookingId,
            rideId: rideId,
            passengerId: currentUserId,
            passengerName: currentUser.name || "Passenger",
            passengerAvatar: currentUser.avatar || null,
            passengerColor: currentUser.color || "bg-blue-200",
            seatsBooked: seatsBooked,
            totalPrice: totalPrice,
            status: "confirmed",
            specialRequest: specialRequest || "",
            createdAt: new Date().toISOString(),
        };

        const updatedBookings = [...(target.bookings || []), newBooking];
        const newAvailableSeats = Math.max(0, target.availableSeats - seatsBooked);

        setRides(prev => prev.map(r => r.id === rideId ? {
            ...r,
            availableSeats: newAvailableSeats,
            bookings: updatedBookings,
        } : r));

        try {
            const rideRef = doc(db, "rides", rideId);
            await updateDoc(rideRef, {
                availableSeats: newAvailableSeats,
                bookings: updatedBookings,
            });
            addNotification(`Booked ${seatsBooked} seat${seatsBooked > 1 ? 's' : ''}! 🎟️ Check your trips.`);
        } catch (err) {
            console.error("Failed to save booking to Firestore:", err);
            addNotification("Seat booked locally! 🎟️");
        }

        return bookingId;
    };

    const cancelRide = async (id: string): Promise<void> => {
        if (!currentUserId) return;
        setRides(prev => prev.filter(r => r.id !== id));
        try {
            await deleteDoc(doc(db, "rides", id));
            addNotification("Trip canceled");
        } catch (err) {
            console.error("Failed to delete ride in Firestore:", err);
        }
    };

    const cancelRideBooking = async (rideId: string, bookingId: string): Promise<void> => {
        if (!currentUserId) return;
        const target = rides.find(r => r.id === rideId);
        if (!target) return;

        const targetBooking = target.bookings?.find(b => b.id === bookingId);
        const seatsToRestore = targetBooking ? targetBooking.seatsBooked : 1;
        const updatedBookings = (target.bookings || []).filter(b => b.id !== bookingId);
        const restoredAvailableSeats = Math.min(target.totalSeats, target.availableSeats + seatsToRestore);

        setRides(prev => prev.map(r => r.id === rideId ? {
            ...r,
            availableSeats: restoredAvailableSeats,
            bookings: updatedBookings,
        } : r));

        try {
            const rideRef = doc(db, "rides", rideId);
            await updateDoc(rideRef, {
                availableSeats: restoredAvailableSeats,
                bookings: updatedBookings,
            });
            addNotification("Booking canceled and seat released");
        } catch (err) {
            console.error("Failed to update booking cancel in Firestore:", err);
        }
    };

    const toggleSaveRide = async (id: string): Promise<void> => {
        if (!currentUserId) return;
        const target = rides.find(r => r.id === id);
        if (!target) return;

        const isSaved = target.savedBy?.includes(currentUserId);
        const newSavedBy = isSaved
            ? (target.savedBy || []).filter(uid => uid !== currentUserId)
            : [...(target.savedBy || []), currentUserId];

        setRides(prev => prev.map(r => r.id === id ? { ...r, savedBy: newSavedBy } : r));

        try {
            const rideRef = doc(db, "rides", id);
            await updateDoc(rideRef, { savedBy: newSavedBy });
            addNotification(isSaved ? "Trip removed from saved" : "Trip saved to bookmarks! 🔖");
        } catch (err) {
            console.error("Failed to toggle save ride:", err);
        }
    };

    const shareRideToChat = async (ride: Ride, targetThreadId?: string, targetUserId?: string): Promise<string> => {
        if (!currentUserId) throw new Error("Must be logged in to share ride");

        let threadId = targetThreadId;
        if (!threadId && targetUserId) {
            const targetUser = allDatingUsers.find(u => u.id === targetUserId);
            if (targetUser) {
                threadId = await startDirectChat(targetUser);
            }
        }

        if (!threadId) {
            throw new Error("No chat thread selected");
        }

        const departureFormatted = new Date(ride.departureTime).toLocaleString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });
        const text = `🚗 Ride Offer: ${ride.originCity} ➔ ${ride.destinationCity}\n📅 ${departureFormatted}\n💵 $${ride.price}/seat • ${ride.availableSeats} of ${ride.totalSeats} seats left\n🚙 ${ride.vehicle.make} ${ride.vehicle.model} (${ride.vehicle.color})\n\n"${ride.description.slice(0, 120)}..."`;

        await sendMessage(threadId, text, "text", {
            replyTo: {
                id: ride.id,
                sender: "them",
                senderId: ride.driverId,
                text: `Carpool Ride: ${ride.originCity} ➔ ${ride.destinationCity} ($${ride.price}/seat)`
            }
        });

        addNotification("Trip shared to chat! 💬🚗");
        return threadId;
    };

    const sendRideInquiry = async (
        driverUser: User,
        ride: Ride,
        customMessage?: string
    ): Promise<string> => {
        if (!currentUserId) throw new Error("Must be logged in to message driver");

        // 1. Check local state specifically for an existing dedicated marketplace/rides thread
        const existingMktThread = formattedThreads.find(
            t => !t.isGroup && isMarketplaceThread(t) && (t.user.id === driverUser.id || (t as any).sellerId === driverUser.id)
        );

        let threadId: string;

        if (existingMktThread) {
            threadId = existingMktThread.id;
        } else {
            // Check Firestore for dedicated marketplace thread
            try {
                const q = query(
                    collection(db, "threads"),
                    where("participantIds", "array-contains", currentUserId),
                    where("isMarketplace", "==", true)
                );
                const querySnap = await getDocs(q);
                const existingDoc = querySnap.docs.find(d => {
                    const data = d.data();
                    return !data.isGroup && Array.isArray(data.participantIds) && data.participantIds.includes(driverUser.id);
                });
                if (existingDoc) {
                    threadId = existingDoc.id;
                } else {
                    threadId = `mkt_ride_${currentUserId}_${driverUser.id}_${ride.id}`;
                    const threadRef = doc(db, "threads", threadId);
                    const threadDocData = {
                        id: threadId,
                        isMarketplace: true,
                        marketplaceItemId: ride.id,
                        rideId: ride.id,
                        participantIds: [currentUserId, driverUser.id],
                        participants: {
                            [currentUserId]: {
                                id: currentUserId,
                                name: currentUser?.name || "User",
                                age: currentUser?.age !== undefined ? currentUser.age : 24,
                                avatar: currentUser?.avatar || null,
                                color: currentUser?.color || "bg-emerald-200",
                                bio: currentUser?.bio || "",
                                interests: currentUser?.interests || [],
                                phoneNumber: currentUser?.phoneNumber || ""
                            },
                            [driverUser.id]: {
                                id: driverUser.id,
                                name: driverUser.name || "Driver",
                                age: driverUser.age !== undefined ? driverUser.age : 28,
                                avatar: driverUser.avatar || null,
                                color: driverUser.color || "bg-rose-200",
                                bio: driverUser.bio || "",
                                interests: driverUser.interests || [],
                                phoneNumber: driverUser.phoneNumber || ""
                            }
                        },
                        status: "accepted",
                        initiatedBy: currentUserId,
                        unread: false,
                        lastMessage: `Carpool Ride: ${ride.originCity} ➔ ${ride.destinationCity}`,
                        lastTime: "Just now",
                        updatedAt: new Date().toISOString()
                    };
                    await setDoc(threadRef, threadDocData);
                    setThreadsList(prev => {
                        if (prev.some(t => t.id === threadId)) {
                            return prev.map(t => t.id === threadId ? { ...t, ...threadDocData } : t);
                        }
                        return [threadDocData, ...prev];
                    });
                }
            } catch (err) {
                console.error("Error querying/creating ride inquiry thread in Firestore:", err);
                threadId = `mkt_ride_${currentUserId}_${driverUser.id}_${ride.id}`;
            }
        }

        const departureFormatted = new Date(ride.departureTime).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
        const defaultMsg = `Hi ${driverUser.name}, I'm interested in your ride from ${ride.originCity} to ${ride.destinationCity} on ${departureFormatted} ($${ride.price}/seat). Are seats still available?`;
        const messageText = customMessage?.trim() || defaultMsg;
        
        await sendMessage(threadId, messageText, "text", {
            replyTo: {
                id: ride.id,
                sender: "them",
                senderId: driverUser.id,
                text: `Carpool: ${ride.originCity} ➔ ${ride.destinationCity} ($${ride.price}/seat)`
            }
        });

        addNotification(`Message sent to ${driverUser.name}! 💬🚗`);
        unlockRide(ride.id);
        return threadId;
    };

    const unlockRide = (rideId: string) => {
        setUnlockedRideIds(prev => {
            if (prev.includes(rideId)) return prev;
            const updated = [...prev, rideId];
            if (typeof window !== "undefined") {
                try {
                    localStorage.setItem("yogheart_unlocked_rides", JSON.stringify(updated));
                } catch (e) {}
            }
            return updated;
        });
    };

    const contextValue = useMemo(() => ({
            currentUser, isProfileLoaded, activeTab, setActiveTab, suggestions, requests, threads: activeThreads, archivedThreads,
            blockedUsers: blockedUsersList, savedContacts: savedContactsList,
            notifications: appNotifications, allDatingUsers,
            statuses: sortedStatuses,
            transactions,
            moods,
            callLogs,
            marketplaceItems,
            createMarketplaceListing,
            updateMarketplaceListing,
            deleteMarketplaceListing,
            toggleSaveMarketplaceItem,
            sendMarketplaceInquiry,
            updateMarketplaceStoreProfile,
            rides,
            unlockedRideIds,
            unlockRide,
            postRide,
            bookRide,
            cancelRide,
            cancelRideBooking,
            toggleSaveRide,
            shareRideToChat,
            sendRideInquiry,
            sendIcebreaker, acceptRequest, declineRequest, acceptThread, sendMessage, editMessage, deleteMessage, votePoll,
            addReaction, removeReaction,
            updateProfile, updateGroupProfile, makeGroupAdmin, updateAvatar, updateSettings, markThreadRead,
            clearChat, archiveChat, unarchiveChat, muteChat, blockUser, unblockUser, reportUser, saveContact, deleteThread, deleteThreads,
            leaveGroup, removeUserFromGroup, addUsersToGroup,
            findUserByPhone, findUserByEmail, startDirectChat, startGroupChat, syncDeviceContacts, addNewLocalContact,
            postStatus, replyToStatus, togglePinThread, togglePinProfile,
            postMood, deleteMood, updateMood, likeMood, commentOnMood, likeCommentOnMood, editCommentOnMood, deleteCommentOnMood, getMoodsForUser,
            drafts, postDraft, deleteDraft, likeDraft, commentOnDraft, likeComment, getStatusesForUser,
            updateStatus, deleteStatus, uploadImageToStorage, boostStatus, boostProfile, addNotification, clearCallLogs, markCallLogsAsRead,
            activeThreadId, setActiveThreadId,
            currentPath, currentSearchParams,
            requestNotificationPermission,
            requestLocationPermission,
            requestContactsPermission
    }), [
        currentUser, isProfileLoaded, activeTab, suggestions, requests, activeThreads, archivedThreads,
        blockedUsersList, savedContactsList, appNotifications, allDatingUsers, sortedStatuses,
        transactions, moods, callLogs, marketplaceItems, rides, unlockedRideIds, drafts,
        activeThreadId, currentPath, currentSearchParams
    ]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <MockContext.Provider value={contextValue}>
            {children}
        </MockContext.Provider>
    );
}

export const useMockData = () => {
    const context = useContext(MockContext);
    if (!context) throw new Error("useMockData must be used within MockDataProvider");
    return context;
};
