"use client";

import { useMockData, User, isMarketplaceThread } from "@/context/MockContext";
import Link from "next/link";
import { clsx } from "clsx";
import { Search, Edit, X, Send, Archive, Users, UserPlus, Plus, UserCheck, UserX, Image, Bell, BellOff, Trash, Trash2, Ban, Flag, Pin, RefreshCw, Check, CheckCheck, AlertTriangle, ArrowLeft, EyeOff, CheckSquare, ChevronRight, CheckCircle2, Heart, Phone, Sparkles, ShoppingBag } from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useModalHistory } from "@/hooks/useModalHistory";
import ZoomedAvatarModal from "@/components/ZoomedAvatarModal";
import { useCall } from "@/context/CallContext";
import { triggerRipple } from "@/utils/ui";

const MOCK_DEVICE_CONTACTS: { name: string; phoneNumber: string }[] = [];

export default function ChatsView() {
  const router = useRouter();
  const { initiateCall } = useCall();
  const { 
    currentUser, statuses, suggestions, threads, archivedThreads, 
    sendIcebreaker, findUserByPhone, findUserByEmail, startDirectChat, startGroupChat, allDatingUsers, 
    addNewLocalContact, muteChat, archiveChat, blockUser, reportUser, 
    deleteThread, deleteThreads, togglePinThread, syncDeviceContacts, addNotification, 
    setActiveThreadId, leaveGroup, requestNotificationPermission, setActiveTab,
    callLogs, marketplaceItems = []
  } = useMockData();

  const missedCallsCount = (callLogs && currentUser) 
    ? callLogs.filter((log: any) => log.callerId !== currentUser.id && log.status === "missed" && log.read !== true).length 
    : 0;

  const handleThreadClick = (threadId: string, search = false) => {
    setActiveThreadId(threadId);
    window.history.pushState(null, "", `/inbox?id=${threadId}${search ? "&search=true" : ""}`);
  };

  const [isArchiveHidden, setIsArchiveHidden] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("mesh_hide_archived") === "true";
    }
    return false;
  });
  const [showArchivedContextMenu, setShowArchivedContextMenu] = useState(false);
  const archivedLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastChatsHeaderClickRef = useRef<number>(0);

  const handleArchivedTouchStart = () => {
    archivedLongPressTimerRef.current = setTimeout(() => {
      setShowArchivedContextMenu(true);
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleArchivedTouchEnd = () => {
    if (archivedLongPressTimerRef.current) {
      clearTimeout(archivedLongPressTimerRef.current);
      archivedLongPressTimerRef.current = null;
    }
  };

  const handleChatsHeaderClick = () => {
    const now = Date.now();
    if (now - lastChatsHeaderClickRef.current < 400) {
      const nextState = !isArchiveHidden;
      setIsArchiveHidden(nextState);
      if (nextState) {
        localStorage.setItem("mesh_hide_archived", "true");
        addNotification("Archived Chats hidden");
      } else {
        localStorage.removeItem("mesh_hide_archived");
        addNotification("Archived Chats unhidden");
      }
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40, 40]);
      }
      lastChatsHeaderClickRef.current = 0;
    } else {
      lastChatsHeaderClickRef.current = now;
    }
  };

  const checkPrivacy = (targetUser: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, settingKey: 'profilePicture' | 'feeds' | 'datingDetails') => {
    if (!targetUser || !currentUser) return true;
    if (targetUser.id === currentUser.id) return true;
    const settingValue = targetUser.settings?.privacy?.[settingKey] ?? "everyone";
    if (settingValue === "everyone") return true;
    if (settingValue === "contacts") {
      return currentUser.savedContactIds?.includes(targetUser.id) ?? false;
    }
    return false; // "nobody"
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [profileToRemove, setProfileToRemove] = useState<User | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const hasMovedHorizontally = useRef(false);
  const isLongPressTriggered = useRef(false);
  const suggestionLongPressTimerRef = useRef<any>(null);
  const currentSwipeOffset = useRef(0);
  const currentSwipingId = useRef<string | null>(null);
  const chatLongPressTimeoutRef = useRef<any>(null);
  const chatSwipeTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Context Menu States
  const [showChatContextMenu, setShowChatContextMenu] = useState(false);
  const [chatContextMenuPos, setChatContextMenuPos] = useState({ x: 0, y: 0 });
  const [selectedChat, setSelectedChat] = useState<any | null>(null);

  // Confirmation modals
  const [showConfirmDeleteChat, setShowConfirmDeleteChat] = useState(false);
  const [showConfirmBlock, setShowConfirmBlock] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showConfirmDeleteSyncedContacts, setShowConfirmDeleteSyncedContacts] = useState(false);
  const [deleteOption, setDeleteOption] = useState<"me" | "everyone">("me");

  // Multi-Selection Mode States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);



  // Swipe-to-dismiss states for popup modals (New Chat, Delete, Block, Report)
  const [popupDragY, setPopupDragY] = useState(0);
  const [isPopupDragging, setIsPopupDragging] = useState(false);
  const popupDragStartY = useRef(0);

  const handlePopupTouchStart = (e: React.TouchEvent) => {
    popupDragStartY.current = e.touches[0].clientY;
    setIsPopupDragging(true);
  };
  const handlePopupTouchMove = (e: React.TouchEvent) => {
    if (!isPopupDragging) return;
    const deltaY = e.touches[0].clientY - popupDragStartY.current;
    if (deltaY > 0) setPopupDragY(deltaY);
  };
  const handlePopupTouchEnd = (closeModalFn: () => void) => {
    setIsPopupDragging(false);
    if (popupDragY > 120) {
      closeModalFn();
    }
    setPopupDragY(0);
  };

  const handleChatContextMenu = (e: React.MouseEvent, chat: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
    e.preventDefault();
    setSelectedChat(chat);
    setChatContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowChatContextMenu(true);
  };

  const handleChatTouchStart = (e: React.TouchEvent, chat: any) => {
    const touch = e.touches[0];
    chatSwipeTouchStartRef.current = { x: touch.clientX, y: touch.clientY };

    if (chatLongPressTimeoutRef.current) {
      clearTimeout(chatLongPressTimeoutRef.current);
    }

    const clientX = touch.clientX;
    const clientY = touch.clientY;

    chatLongPressTimeoutRef.current = setTimeout(() => {
      chatSwipeTouchStartRef.current = null;
      setSelectedChat(chat);
      setChatContextMenuPos({ x: clientX, y: clientY });
      setShowChatContextMenu(true);

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(20);
      }
      chatLongPressTimeoutRef.current = null;
    }, 500);
  };

  const handleChatTouchMove = (e: React.TouchEvent) => {
    if (!chatSwipeTouchStartRef.current) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - chatSwipeTouchStartRef.current.x;
    const diffY = touch.clientY - chatSwipeTouchStartRef.current.y;

    if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
      if (chatLongPressTimeoutRef.current) {
        clearTimeout(chatLongPressTimeoutRef.current);
        chatLongPressTimeoutRef.current = null;
      }
    }
  };

  const handleChatTouchEnd = () => {
    if (chatLongPressTimeoutRef.current) {
      clearTimeout(chatLongPressTimeoutRef.current);
      chatLongPressTimeoutRef.current = null;
    }
    chatSwipeTouchStartRef.current = null;
  };

  const handleConfirmDeleteChat = () => {
    if (selectedChat) {
      deleteThread(selectedChat.id, deleteOption === "everyone");
      setShowConfirmDeleteChat(false);
      setSelectedChat(null);
    }
  };

  const toggleSelectThread = (threadId: string) => {
    setSelectedThreadIds((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
        if (next.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedThreadIds.size === filteredThreads.length) {
      setSelectedThreadIds(new Set());
    } else {
      setSelectedThreadIds(new Set(filteredThreads.map(t => t.id)));
    }
  };

  const handleBulkPin = async () => {
    for (const id of Array.from(selectedThreadIds)) {
      await togglePinThread(id);
    }
    const count = selectedThreadIds.size;
    setIsSelectionMode(false);
    setSelectedThreadIds(new Set());
    addNotification(`${count} ${count === 1 ? 'chat' : 'chats'} pin updated`);
  };

  const handleBulkMute = () => {
    for (const id of Array.from(selectedThreadIds)) {
      muteChat(id, true);
    }
    const count = selectedThreadIds.size;
    setIsSelectionMode(false);
    setSelectedThreadIds(new Set());
    addNotification(`${count} ${count === 1 ? 'chat' : 'chats'} muted`);
  };

  const handleBulkArchive = () => {
    for (const id of Array.from(selectedThreadIds)) {
      archiveChat(id);
    }
    const count = selectedThreadIds.size;
    setIsSelectionMode(false);
    setSelectedThreadIds(new Set());
    addNotification(`${count} ${count === 1 ? 'chat' : 'chats'} archived`);
  };

  const handleConfirmBulkDelete = async (forEveryone: boolean) => {
    const ids = Array.from(selectedThreadIds);
    setShowBulkDeleteModal(false);
    setIsSelectionMode(false);
    setSelectedThreadIds(new Set());
    await deleteThreads(ids, forEveryone, false);
  };

  const handleBlockUser = () => {
    if (selectedChat) {
      blockUser(selectedChat.user.id);
      setShowConfirmBlock(false);
      setSelectedChat(null);
    }
  };

  const handleReport = (reason: string) => {
    if (selectedChat) {
      reportUser(selectedChat.user.id, reason);
      setShowReportModal(false);
      setSelectedChat(null);
    }
  };

  // New Chat Modal States
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [inviteSentPhone, setInviteSentPhone] = useState<string | null>(null);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Set<string>>(new Set());

  // Discovery search state
  const [discoveryResult, setDiscoveryResult] = useState<User | null>(null);
  const [discoverySearched, setDiscoverySearched] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // Drawer Contacts Sync States
  const [showMockPicker, setShowMockPicker] = useState(false);
  const [selectedMockContacts, setSelectedMockContacts] = useState<Record<string, boolean>>({});
  const [customMockName, setCustomMockName] = useState("");
  const [customMockPhone, setCustomMockPhone] = useState("");

  const [zoomedUser, setZoomedUser] = useState<User | null>(null);
  const [customMockList, setCustomMockList] = useState<{ name: string; phoneNumber: string }[]>([]);
  const [seenStatusIds, setSeenStatusIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mesh_seen_status_ids");
      if (stored) {
        setSeenStatusIds(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.error("Failed to load seen status IDs in ChatsView:", e);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePermissionsClosed = () => {
      setShowMockPicker(false);
      setIsNewChatOpen(false);
      setShowNewContactForm(false);
    };
    window.addEventListener("yogheart_permissions_closed", handlePermissionsClosed);
    return () => window.removeEventListener("yogheart_permissions_closed", handlePermissionsClosed);
  }, []);

  const getUnreadStatusCount = (userId: string) => {
    const userStatuses = statuses.filter(s => s.userId === userId && Date.now() - new Date(s.timestamp).getTime() <= 24 * 60 * 60 * 1000);
    return userStatuses.filter(s => {
      const slides = s.mediaItems && s.mediaItems.length > 0
          ? s.mediaItems
          : (s.mediaUrl ? [{ id: 'legacy', mediaUrl: s.mediaUrl }] : []);
      if (slides.length === 0) {
          return !seenStatusIds.has(s.id) && !seenStatusIds.has(`${s.id}_text`);
      }
      return !slides.every((slide: any) => seenStatusIds.has(`${s.id}_${slide.id}`));
    }).length;
  };

  const getThreadUnreadCount = useCallback((chat: any) => {
    if (!chat) return 0;
    if (chat.messages && chat.messages.length > 0) {
      const unreadMsgs = chat.messages.filter((m: any) => {
        const isFromThem = m.sender ? m.sender === "them" : (m.senderId && m.senderId !== currentUser?.id);
        const isUnread = m.read !== true && m.isRead !== true;
        return isFromThem && isUnread;
      });
      if (unreadMsgs.length > 0) {
        return unreadMsgs.length;
      }
    }
    return chat.unread ? 1 : 0;
  }, [currentUser?.id]);

  // Lock body scroll and disable pull-to-refresh when any modal is open
  const anyModalOpen = isNewChatOpen || showConfirmDeleteChat || showConfirmBlock || showReportModal || showMockPicker || showConfirmDeleteSyncedContacts;

  // Android back-swipe modal dismissal
  useModalHistory("newChat", isNewChatOpen, () => { setIsNewChatOpen(false); setShowNewContactForm(false); setContactSearchQuery(""); });
  useModalHistory("mockPicker", showMockPicker, () => { setShowMockPicker(false); });
  useModalHistory("confirmDeleteChat", showConfirmDeleteChat, () => { setShowConfirmDeleteChat(false); });
  useModalHistory("confirmBlock", showConfirmBlock, () => { setShowConfirmBlock(false); });
  useModalHistory("reportModal", showReportModal, () => { setShowReportModal(false); });
  useModalHistory("confirmDeleteSyncedContacts", showConfirmDeleteSyncedContacts, () => { setShowConfirmDeleteSyncedContacts(false); });

  useEffect(() => {
    if (anyModalOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehaviorY = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.overscrollBehaviorY = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.overscrollBehaviorY = "";
    };
  }, [anyModalOpen]);

  // Window touchmove interceptor when dragging popup
  useEffect(() => {
    if (isPopupDragging) {
      const handleTouchMove = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
      };
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      return () => {
        window.removeEventListener("touchmove", handleTouchMove);
      };
    }
  }, [isPopupDragging]);

  const handleSyncContactsInDrawer = async () => {
    const isCapacitor = typeof window !== "undefined" && !!(window as any).Capacitor;
    if (isCapacitor) {
      try {
        const { Contacts } = await import("@capacitor-community/contacts");
        let permission = await Contacts.checkPermissions();
        if (permission.contacts !== "granted") {
          permission = await Contacts.requestPermissions();
        }
        if (permission.contacts === "granted") {
          const res = await Contacts.getContacts({
            projection: {
              name: true,
              phones: true
            }
          });
          if (res && res.contacts && res.contacts.length > 0) {
            const contactsList = res.contacts.map((c: any) => {
              const name = c.name?.display || [c.name?.given, c.name?.family].filter(Boolean).join(" ") || "Contact";
              const phoneNumber = c.phones?.[0]?.number || "";
              return { name, phoneNumber };
            }).filter((c: any) => c.phoneNumber && c.phoneNumber.trim().length > 0);

            if (contactsList.length > 0) {
              await syncDeviceContacts(contactsList);
              return;
            } else {
              addNotification("No contacts with phone numbers found on device");
              return;
            }
          } else {
            addNotification("No contacts found on device");
            return;
          }
        } else {
          addNotification("Contacts permission was not granted");
          return;
        }
      } catch (err) {
        console.error("Capacitor Contacts error in drawer:", err);
      }
    }

    const isSupported = typeof window !== "undefined" && 'contacts' in navigator && 'ContactsManager' in window;
    if (isSupported) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: true };
        const selected = await (navigator as any).contacts.select(props, opts);
        const contactsList = selected.map((c: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => ({
          name: c.name?.[0] || 'Unnamed Contact',
          phoneNumber: c.tel?.[0] || ''
        })).filter((c: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => c.phoneNumber);

        if (contactsList.length > 0) {
          await syncDeviceContacts(contactsList);
        } else {
          addNotification("No contacts selected");
        }
      } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
        console.error("Contacts Picker error:", err);
        setShowMockPicker(true);
      }
    } else {
      setShowMockPicker(true);
    }
  };

  const handleImportMockContacts = async () => {
    const selectedList = customMockList.filter(c => selectedMockContacts[c.phoneNumber]);
    if (selectedList.length === 0) {
      addNotification("Please select at least one contact");
      return;
    }
    await syncDeviceContacts(selectedList);
    setShowMockPicker(false);
  };

  const handleAddCustomMock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMockName.trim() || !customMockPhone.trim()) return;
    const newMock = { name: customMockName.trim(), phoneNumber: customMockPhone.trim() };
    setCustomMockList(prev => [...prev, newMock]);
    setSelectedMockContacts(prev => ({ ...prev, [newMock.phoneNumber]: true }));
    setCustomMockName("");
    setCustomMockPhone("");
  };


  const handleInviteContact = async (contact: { contactName: string; phoneNumber: string }) => {
    setInviteSentPhone(contact.phoneNumber);
    const inviteMessage = `Hey ${contact.contactName}! Connect with me on Yogheart: https://yogheartmarket.web.app`;
    try {
      if (typeof window !== "undefined" && !!(window as any).Capacitor) {
        const { Share } = await import("@capacitor/share");
        await Share.share({
          title: "Join Yogheart",
          text: inviteMessage,
          dialogTitle: `Invite ${contact.contactName} to Yogheart`
        });
      } else {
        window.open(`sms:${contact.phoneNumber}?body=${encodeURIComponent(inviteMessage)}`, "_blank");
      }
    } catch (_) {
      window.open(`sms:${contact.phoneNumber}?body=${encodeURIComponent(inviteMessage)}`, "_blank");
    }
    setTimeout(() => setInviteSentPhone(null), 4000);
  };

  const handleMatchedClick = async (user: User) => {
    setIsNewChatOpen(false);
    const existingThread = threads.find(t => t.user.id === user.id);
    if (existingThread) {
      handleThreadClick(existingThread.id);
    } else {
      const threadId = await startDirectChat(user, false);
      if (threadId) {
        handleThreadClick(threadId);
      }
    }
  };

  const handleCreateNewContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    await addNewLocalContact(newContactName, newContactPhone);
    setNewContactName("");
    setNewContactPhone("");
    setShowNewContactForm(false);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupMembers.size === 0) return;
    const selectedUsers = Array.from(selectedGroupMembers)
      .map(id => allDatingUsers.find(u => u.id === id))
      .filter((u): u is User => !!u);
    try {
      const newThreadId = await startGroupChat(groupName.trim(), selectedUsers);
      setIsNewChatOpen(false);
      setIsGroupMode(false);
      setGroupName("");
      setSelectedGroupMembers(new Set());
      if (newThreadId) {
        handleThreadClick(newThreadId);
      }
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  // Item Discover: only contacts whose phone number is saved in phone AND who have active items they are selling
  const itemDiscoverContacts = useMemo(() => {
    if (!currentUser) return [];

    const norm = (num?: string | null) => (num || "").replace(/[^0-9]/g, "");

    const savedPhones = new Set<string>();
    (currentUser.localContacts || []).forEach(c => {
      const p = norm(c.phoneNumber);
      if (p) savedPhones.add(p);
    });

    const savedIds = new Set<string>(currentUser.savedContactIds || []);

    return (allDatingUsers || []).filter(u => {
      if (u.id === currentUser.id) return false;
      if (dismissedIds.has(u.id)) return false;

      // 1. Must be a contact saved in phone (by ID in savedContactIds or phone matching device contacts)
      const isSavedById = savedIds.has(u.id);
      const isSavedByPhone = u.phoneNumber ? savedPhones.has(norm(u.phoneNumber)) : false;
      if (!isSavedById && !isSavedByPhone) return false;

      // 2. Must have active items they are selling in the marketplace
      const activeItems = (marketplaceItems || []).filter(item => 
        (item.sellerId === u.id || (item.sellerName && item.sellerName.toLowerCase() === u.name.toLowerCase())) &&
        item.status !== "sold"
      );

      return activeItems.length > 0;
    }).map(u => {
      const activeItems = (marketplaceItems || []).filter(item => 
        (item.sellerId === u.id || (item.sellerName && item.sellerName.toLowerCase() === u.name.toLowerCase())) &&
        item.status !== "sold"
      );
      return {
        ...u,
        itemsCount: activeItems.length,
        featuredItem: activeItems[0]
      };
    });
  }, [allDatingUsers, currentUser, marketplaceItems, dismissedIds]);

  const visibleSuggestions = itemDiscoverContacts;

  // Unified threads for main Chats list (includes personal chats, group chats, and marketplace inquiries)
  const regularThreads = useMemo(() => {
    return threads || [];
  }, [threads]);

  // Filter threads by search
  const filteredThreads = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return regularThreads;
    return regularThreads.filter(t =>
      t.user.name.toLowerCase().includes(q) ||
      t.lastMessage.toLowerCase().includes(q)
    );
  }, [regularThreads, searchQuery]);

  // Filter other profiles matching search query (only when searchQuery is not empty)
  const matchingProfiles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return allDatingUsers.filter(u => {
      if (u.id === currentUser.id) return false;
      // Don't show if thread already exists (it will show under Conversations)
      const hasThread = threads.some(t => t.user.id === u.id);
      if (hasThread) return false;
      
      return (
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phoneNumber && u.phoneNumber.includes(q))
      );
    });
  }, [searchQuery, allDatingUsers, currentUser.id, threads]);

  // Helper to normalize phone numbers
  const normalizePhone = (num: string) => num.replace(/[^0-9]/g, "");

  const localContacts = currentUser?.localContacts || [];

  // Build lookup and matched contacts with useMemo
  const { filteredMatched, filteredUnmatched } = useMemo(() => {
    const registeredUsersByPhone = new Map<string, User>();
    allDatingUsers.forEach(u => {
      if (u.phoneNumber) {
        registeredUsersByPhone.set(normalizePhone(u.phoneNumber), u);
      }
    });

    const matchedContacts: { contactName: string; user: User }[] = [];
    const unmatchedContacts: { contactName: string; phoneNumber: string }[] = [];

    localContacts.forEach(contact => {
      const norm = normalizePhone(contact.phoneNumber);
      if (!norm) return;
      const matchedUser = registeredUsersByPhone.get(norm);
      if (matchedUser && matchedUser.id !== currentUser.id) {
        if (!matchedContacts.some(m => m.user.id === matchedUser.id)) {
          matchedContacts.push({ contactName: contact.name, user: matchedUser });
        }
      } else {
        if (!unmatchedContacts.some(u => normalizePhone(u.phoneNumber) === norm)) {
          unmatchedContacts.push({ contactName: contact.name, phoneNumber: contact.phoneNumber });
        }
      }
    });

    const q = contactSearchQuery.toLowerCase().trim();
    const fMatched = matchedContacts.filter(m =>
      m.contactName.toLowerCase().includes(q) ||
      m.user.name.toLowerCase().includes(q)
    );

    const fUnmatched = unmatchedContacts.filter(u =>
      u.contactName.toLowerCase().includes(q) ||
      u.phoneNumber.includes(contactSearchQuery)
    );

    return { filteredMatched: fMatched, filteredUnmatched: fUnmatched };
  }, [allDatingUsers, currentUser, localContacts, contactSearchQuery]);



  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    hasMovedHorizontally.current = false;
    isLongPressTriggered.current = false;
    currentSwipingId.current = id;
    setSwipingId(id);

    if (suggestionLongPressTimerRef.current) {
      clearTimeout(suggestionLongPressTimerRef.current);
    }
    const profile = itemDiscoverContacts.find(s => s.id === id) || (allDatingUsers || []).find(s => s.id === id);
    if (profile) {
      suggestionLongPressTimerRef.current = setTimeout(() => {
        if (!hasMovedHorizontally.current && currentSwipeOffset.current < 10) {
          isLongPressTriggered.current = true;
          setProfileToRemove(profile);
          try {
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(40);
            }
          } catch (_) {}
        }
      }, 450);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!currentSwipingId.current) return;
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current);
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaX > 8) {
      hasMovedHorizontally.current = true;
      if (suggestionLongPressTimerRef.current) {
        clearTimeout(suggestionLongPressTimerRef.current);
      }
    }
    if (Math.abs(deltaY) > 8 && suggestionLongPressTimerRef.current) {
      clearTimeout(suggestionLongPressTimerRef.current);
    }
    if (deltaY > 0 && !hasMovedHorizontally.current && !isLongPressTriggered.current) {
      const offset = Math.min(deltaY, 100);
      currentSwipeOffset.current = offset;
      setSwipeOffset(offset);
    }
  };

  const handleTouchEnd = async () => {
    if (suggestionLongPressTimerRef.current) {
      clearTimeout(suggestionLongPressTimerRef.current);
    }
    if (currentSwipingId.current && !isLongPressTriggered.current) {
      if (!hasMovedHorizontally.current && currentSwipeOffset.current < 15) {
        // Deliberate tap: navigate directly to seller storefront page
        const contactId = currentSwipingId.current;
        window.history.pushState(null, "", `/profile?userId=${contactId}&from=chats`);
        window.dispatchEvent(new Event("locationchange"));
      }
    }
    currentSwipingId.current = null;
    currentSwipeOffset.current = 0;
    hasMovedHorizontally.current = false;
    isLongPressTriggered.current = false;
    setSwipingId(null);
    setSwipeOffset(0);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
    hasMovedHorizontally.current = false;
    isLongPressTriggered.current = false;
    currentSwipingId.current = id;
    currentSwipeOffset.current = 0;
    setSwipingId(id);

    if (suggestionLongPressTimerRef.current) {
      clearTimeout(suggestionLongPressTimerRef.current);
    }
    const profile = itemDiscoverContacts.find(s => s.id === id) || (allDatingUsers || []).find(s => s.id === id);
    if (profile) {
      suggestionLongPressTimerRef.current = setTimeout(() => {
        if (!hasMovedHorizontally.current && currentSwipeOffset.current < 10) {
          isLongPressTriggered.current = true;
          setProfileToRemove(profile);
        }
      }, 450);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = Math.abs(e.clientX - touchStartX.current);
      const deltaY = e.clientY - touchStartY.current;
      if (deltaX > 8) {
        hasMovedHorizontally.current = true;
        if (suggestionLongPressTimerRef.current) {
          clearTimeout(suggestionLongPressTimerRef.current);
        }
      }
      if (Math.abs(deltaY) > 8 && suggestionLongPressTimerRef.current) {
        clearTimeout(suggestionLongPressTimerRef.current);
      }
      if (deltaY > 0 && !hasMovedHorizontally.current && !isLongPressTriggered.current) {
        const offset = Math.min(deltaY, 100);
        currentSwipeOffset.current = offset;
        setSwipeOffset(offset);
      }
    };

    const handleMouseUp = async () => {
      if (suggestionLongPressTimerRef.current) {
        clearTimeout(suggestionLongPressTimerRef.current);
      }
      if (currentSwipingId.current && !isLongPressTriggered.current) {
        if (!hasMovedHorizontally.current && currentSwipeOffset.current < 15) {
          const contactId = currentSwipingId.current;
          window.history.pushState(null, "", `/profile?userId=${contactId}&from=chats`);
          window.dispatchEvent(new Event("locationchange"));
        }
      }
      currentSwipingId.current = null;
      currentSwipeOffset.current = 0;
      hasMovedHorizontally.current = false;
      isLongPressTriggered.current = false;
      setSwipingId(null);
      setSwipeOffset(0);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [suggestions]);





  return (
    <div className="h-full flex flex-col relative bg-[var(--background)] dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 bg-white dark:bg-gray-900 z-40 border-b border-[var(--border)] dark:border-gray-800 shrink-0">
        {isSelectionMode ? (
          <div className="h-13 flex items-center justify-between px-4 md:px-6 bg-[var(--primary)] text-white animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedThreadIds(new Set());
                }}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                title="Cancel Selection"
              >
                <X size={20} />
              </button>
              <span className="font-bold text-base select-none">
                {selectedThreadIds.size} selected
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
              >
                {selectedThreadIds.size === filteredThreads.length ? "Deselect All" : "Select All"}
              </button>

              <button
                type="button"
                onClick={handleBulkPin}
                disabled={selectedThreadIds.size === 0}
                title="Pin/Unpin Selected"
                className="p-2 rounded-full hover:bg-white/20 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Pin size={18} className="rotate-45" />
              </button>

              <button
                type="button"
                onClick={handleBulkMute}
                disabled={selectedThreadIds.size === 0}
                title="Mute Selected"
                className="p-2 rounded-full hover:bg-white/20 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <BellOff size={18} />
              </button>

              <button
                type="button"
                onClick={handleBulkArchive}
                disabled={selectedThreadIds.size === 0}
                title="Archive Selected"
                className="p-2 rounded-full hover:bg-white/20 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Archive size={18} />
              </button>

              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(true)}
                disabled={selectedThreadIds.size === 0}
                title="Delete Selected"
                className="p-2 rounded-full hover:bg-white/20 disabled:opacity-40 transition-colors text-white cursor-pointer"
              >
                <Trash2 size={19} />
              </button>
            </div>
          </div>
        ) : (
          <div className="h-13 flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2.5">
              <h1 
                onClick={handleChatsHeaderClick}
                className="text-xl font-bold dark:text-white cursor-pointer select-none"
                title="Double-tap to hide/unhide Archived Chats"
              >
                Chats
              </h1>
            </div>

            <div className="flex items-center gap-1.5">
              {/* New Message (+) */}
              <button
                onClick={() => setIsNewChatOpen(true)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center cursor-pointer"
                title="New Chat"
              >
                <Edit size={20} className="text-[var(--primary)]" />
              </button>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-4 md:px-6 pb-2.5">
          <div className="flex items-center gap-2.5 bg-[var(--card)] dark:bg-gray-800 rounded-xl px-3.5 py-2">
            <Search size={16} className="text-[var(--secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent outline-none text-xs sm:text-sm placeholder:text-[var(--secondary)] dark:text-white"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                <X size={15} className="text-[var(--secondary)]" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* New Chat Modal */}
      {isNewChatOpen && (
        <div className="modal-overlay" onClick={() => { setIsNewChatOpen(false); setShowNewContactForm(false); setContactSearchQuery(""); }}>
          <div 
            className="modal-content p-0 dark:bg-gray-900 bg-white flex flex-col h-full max-h-[85vh] md:max-h-[600px] overflow-hidden" 
            onClick={e => e.stopPropagation()}
            style={{
              transform: popupDragY > 0 ? `translateY(${popupDragY}px)` : undefined,
              transition: isPopupDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
            }}
          >

            {/* iOS style bar on mobile with touch events */}
            <div 
              className="w-full py-3 shrink-0 cursor-row-resize select-none flex justify-center md:hidden"
              style={{ touchAction: 'none' }}
              onTouchStart={handlePopupTouchStart}
              onTouchMove={handlePopupTouchMove}
              onTouchEnd={() => handlePopupTouchEnd(() => { setIsNewChatOpen(false); setShowNewContactForm(false); setContactSearchQuery(""); })}
            >
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2">
                {isGroupMode && (
                  <button
                    onClick={() => {
                      setIsGroupMode(false);
                      setGroupName("");
                      setSelectedGroupMembers(new Set());
                    }}
                    className="p-1 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-full mr-1 text-gray-500"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    {isGroupMode ? "Create Group" : "Select contact"}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isGroupMode ? `${selectedGroupMembers.size} selected` : `${localContacts.length} contacts`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isGroupMode && (
                  <button
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim() || selectedGroupMembers.size === 0}
                    className="px-4 py-1.5 bg-[#00a884] hover:bg-[#008f72] disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    Create
                  </button>
                )}
                <button 
                  onClick={() => {
                    setIsNewChatOpen(false);
                    setShowNewContactForm(false);
                    setContactSearchQuery("");
                    setIsGroupMode(false);
                    setGroupName("");
                    setSelectedGroupMembers(new Set());
                  }} 
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Search Box with Discovery */}
            {!isGroupMode && (
              <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-800/80 shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-2">
                  <Search size={16} className="text-gray-400" />
                  <input
                    type="text"
                    value={contactSearchQuery}
                    onChange={(e) => {
                      setContactSearchQuery(e.target.value);
                      setDiscoveryResult(null);
                      setDiscoverySearched(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && contactSearchQuery.trim()) {
                        setDiscoveryLoading(true);
                        setDiscoverySearched(false);
                        setTimeout(() => {
                          const q = contactSearchQuery.trim();
                          let found: User | undefined;
                          if (q.includes("@")) {
                            found = findUserByEmail(q);
                          } else if (/^\+?[0-9\s\-()]{6,}$/.test(q)) {
                            found = findUserByPhone(q);
                          }
                          setDiscoveryResult(found || null);
                          setDiscoverySearched(true);
                          setDiscoveryLoading(false);
                        }, 400);
                      }
                    }}
                    placeholder="Search name, phone, or email... (Enter to find)"
                    className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400 text-gray-950 dark:text-white"
                  />
                  {contactSearchQuery && (
                    <button 
                      onClick={() => { setContactSearchQuery(""); setDiscoveryResult(null); setDiscoverySearched(false); }} 
                      className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                    >
                      <X size={14} className="text-gray-400" />
                    </button>
                  )}
                </div>
                {/* Hint text */}
                {contactSearchQuery && !discoverySearched && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 px-1">
                    Press Enter to search by {contactSearchQuery.includes("@") ? "email" : "phone number"}
                  </p>
                )}
              </div>
            )}

            {/* Discovery Result */}
            {!isGroupMode && discoverySearched && (
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
                {discoveryLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : discoveryResult ? (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-800/40">
                    <div className="flex items-center gap-1.5 mb-2">
                      <UserCheck size={14} className="text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Found on Yogheart!</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {discoveryResult.avatar && checkPrivacy(discoveryResult, 'profilePicture') ? (
                        <img src={discoveryResult.avatar} alt={discoveryResult.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0", discoveryResult.color || "bg-emerald-150")}>
                          {discoveryResult.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[15px] text-gray-900 dark:text-white">
                          {discoveryResult.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{discoveryResult.bio}</p>
                      </div>
                      <button
                        onClick={async () => {
                          const threadId = await startDirectChat(discoveryResult, false);
                          setIsNewChatOpen(false);
                          setContactSearchQuery("");
                          setDiscoveryResult(null);
                          setDiscoverySearched(false);
                          if (threadId) handleThreadClick(threadId);
                        }}
                        className="px-3.5 py-2 bg-emerald-500 text-white text-xs font-bold rounded-full hover:bg-emerald-600 transition-colors shrink-0"
                      >
                        Message
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 text-center border border-gray-100 dark:border-gray-700/50">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-2">
                      <UserX size={18} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Not on Yogheart yet</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{"This person hasn't joined the platform yet."}</p>
                    <button
                      onClick={() => {
                        setInviteSentPhone(contactSearchQuery);
                        setTimeout(() => setInviteSentPhone(null), 3000);
                      }}
                      className="mt-3 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-500 text-xs font-bold rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      {inviteSentPhone === contactSearchQuery ? "Invite Sent ✓" : "Send Invite"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isGroupMode ? (
                /* Group Creation Form */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block px-1">
                      Group Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter group name..."
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#00a884] text-gray-950 dark:text-white shadow-sm font-semibold"
                      maxLength={40}
                    />
                  </div>
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                      Select Group Members
                    </h3>
                    {(() => {
                      const candidates: { id: string; name: string; avatar: string | null; color?: string; bio?: string }[] = [];
                      const seenIds = new Set<string>();

                      // Add active chat partners (who are not groups)
                      threads.forEach(t => {
                        if (!t.isGroup && t.user && !seenIds.has(t.user.id)) {
                          candidates.push({
                            id: t.user.id,
                            name: t.user.name,
                            avatar: t.user.avatar,
                            color: t.user.color,
                            bio: t.user.bio
                          });
                          seenIds.add(t.user.id);
                        }
                      });

                      // Add matched contacts who are not already added
                      filteredMatched.forEach(m => {
                        if (m.user && !seenIds.has(m.user.id)) {
                          candidates.push({
                            id: m.user.id,
                            name: m.contactName,
                            avatar: m.user.avatar,
                            color: m.user.color,
                            bio: m.user.bio
                          });
                          seenIds.add(m.user.id);
                        }
                      });

                      if (candidates.length > 0) {
                        return (
                          <div className="space-y-1">
                            {candidates.map((cand) => {
                              const initial = cand.name.charAt(0).toUpperCase() || "?";
                              const isChecked = selectedGroupMembers.has(cand.id);
                              return (
                                <div
                                  key={cand.id}
                                  onClick={() => {
                                    const newSelected = new Set(selectedGroupMembers);
                                    if (isChecked) {
                                      newSelected.delete(cand.id);
                                    } else {
                                      newSelected.add(cand.id);
                                    }
                                    setSelectedGroupMembers(newSelected);
                                  }}
                                  className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {cand.avatar ? (
                                      <img
                                        src={cand.avatar}
                                        alt={cand.name}
                                        className="w-10 h-10 rounded-full object-cover shrink-0"
                                      />
                                    ) : (
                                      <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-950 shrink-0", cand.color || "bg-emerald-150")}>
                                        {initial}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-[15px] text-gray-900 dark:text-white truncate">
                                        {cand.name}
                                      </h4>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {(cand as any).marketplaceStore?.headline || (cand.bio && !cand.bio.includes("Hey there") ? cand.bio : "Verified local seller on Yogheart Marketplace.")}
                                      </p>
                                    </div>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}} // handled by row click
                                    className="w-5 h-5 rounded border-gray-300 text-[#00a884] focus:ring-[#00a884] cursor-pointer"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        );
                      } else {
                        return (
                          <p className="text-xs text-gray-400 dark:text-gray-500 italic px-1">
                            No active chats or contacts available to add.
                          </p>
                        );
                      }
                    })()}
                  </div>
                </div>
              ) : (
                /* Normal Contact Selection */
                <>
                  {/* Quick Actions */}
                  {!contactSearchQuery && (
                    <div className="space-y-3">
                      <div 
                        onClick={() => setIsGroupMode(true)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center group-hover:bg-[#008f72] transition-colors shrink-0">
                          <Users size={18} />
                        </div>
                        <span className="font-semibold text-[15px] text-gray-900 dark:text-white">New group</span>
                      </div>

                      <div 
                        onClick={() => setShowNewContactForm(!showNewContactForm)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center group-hover:bg-[#008f72] transition-colors shrink-0">
                          <UserPlus size={18} />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className="font-semibold text-[15px] text-gray-900 dark:text-white">New contact</span>
                          <Plus size={16} className={clsx("text-gray-400 transition-transform duration-200", showNewContactForm && "rotate-45")} />
                        </div>
                      </div>

                      <div 
                        onClick={handleSyncContactsInDrawer}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center group-hover:bg-[#008f72] transition-colors shrink-0">
                          <RefreshCw size={18} />
                        </div>
                        <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Sync device contacts</span>
                      </div>

                      {currentUser?.localContacts && currentUser.localContacts.length > 0 && (
                        <div 
                          onClick={() => {
                            setShowConfirmDeleteSyncedContacts(true);
                          }}
                          className="flex items-center gap-3 cursor-pointer group text-rose-500 hover:text-rose-600 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center group-hover:bg-rose-100 dark:group-hover:bg-rose-950/60 transition-colors shrink-0">
                            <Trash2 size={18} />
                          </div>
                          <span className="font-semibold text-[15px]">Delete synced contacts</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* New Contact Form */}
                  {showNewContactForm && (
                    <form 
                      onSubmit={handleCreateNewContact} 
                      className="p-4 bg-gray-50 dark:bg-gray-800/45 rounded-2xl border border-gray-150 dark:border-gray-800/80 space-y-3 animate-in slide-in-from-top duration-250 shrink-0"
                    >
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">New Contact Details</h3>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Name"
                          value={newContactName}
                          onChange={(e) => setNewContactName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#00a884] text-gray-950 dark:text-white shadow-sm"
                          required
                        />
                        <input
                          type="tel"
                          placeholder="Phone Number (e.g. +15551234567)"
                          value={newContactPhone}
                          onChange={(e) => setNewContactPhone(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#00a884] text-gray-950 dark:text-white shadow-sm"
                          required
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => { setShowNewContactForm(false); setNewContactName(""); setNewContactPhone(""); }}
                          className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-850 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 text-xs font-semibold bg-[#00a884] text-white rounded-lg hover:bg-[#008f72] transition-colors shadow-sm"
                        >
                          Save Contact
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Matched Contacts Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                      Contacts on Yogheart
                    </h3>
                    {filteredMatched.length > 0 ? (
                      <div className="space-y-1">
                        {filteredMatched.map((m) => {
                          const initial = m.contactName.charAt(0).toUpperCase() || "?";
                          return (
                            <div
                              key={m.user.id}
                              onClick={() => handleMatchedClick(m.user)}
                              className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer transition-colors"
                            >
                              {m.user.avatar ? (
                                <img
                                  src={m.user.avatar}
                                  alt={m.contactName}
                                  className="w-10 h-10 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-950 shrink-0", m.user.color || "bg-emerald-150")}>
                                  {initial}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-[15px] text-gray-900 dark:text-white truncate">
                                  {m.contactName}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {m.user.marketplaceStore?.headline || (m.user.bio && !m.user.bio.includes("Hey there") ? m.user.bio : "Verified local seller on Yogheart Marketplace.")}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic px-1">
                        No synced contacts on the platform yet.
                      </p>
                    )}
                  </div>

                  {/* Unmatched Contacts Section */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                      Invite to Yogheart
                    </h3>
                    {filteredUnmatched.length > 0 ? (
                      <div className="space-y-1">
                        {filteredUnmatched.map((u, index) => {
                          const initial = u.contactName.charAt(0).toUpperCase() || "?";
                          const isInvited = inviteSentPhone === u.phoneNumber;
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center font-bold shrink-0">
                                  {initial}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-[15px] text-gray-900 dark:text-white truncate">
                                    {u.contactName}
                                  </h4>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {u.phoneNumber}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleInviteContact(u)}
                                disabled={isInvited}
                                className={clsx(
                                  "px-3 py-1.5 text-xs font-bold rounded-full transition-all shrink-0",
                                  isInvited 
                                    ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500" 
                                    : "bg-[#e8faf4] hover:bg-[#d0f5e8] dark:bg-[#12382f] dark:hover:bg-[#1a4a3e] text-[#00a884] font-bold"
                                )}
                              >
                                {isInvited ? "Invited ✓" : "Invite"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic px-1">
                        No contacts to invite.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-20 lg:pb-4 dark:bg-gray-900">


        {/* Archived Chats Link */}
        {archivedThreads.length > 0 && !isArchiveHidden && (
          <div
            onContextMenu={(e) => {
              e.preventDefault();
              setShowArchivedContextMenu(true);
            }}
            onTouchStart={handleArchivedTouchStart}
            onTouchEnd={handleArchivedTouchEnd}
            onTouchMove={handleArchivedTouchEnd}
          >
            <Link href="/archived">
              <div className="flex items-center gap-4 px-4 md:px-6 py-3 bg-[var(--card)] dark:bg-gray-800 border-b border-[var(--border)] dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Archive size={18} className="text-[var(--secondary)]" />
                </div>
                <span className="font-medium dark:text-white">Archived Chats</span>
                <span className="ml-auto text-sm text-[var(--secondary)]">{archivedThreads.length}</span>
              </div>
            </Link>
          </div>
        )}

        {/* Item Discover Section */}
        {currentUser?.settings?.privacy?.showDiscoverSuggestions !== false && itemDiscoverContacts.length > 0 && (
          <section className="border-b border-[var(--border)] dark:border-gray-800 py-2 sm:py-2.5">
            <div className="px-4 md:px-6 mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShoppingBag size={13} className="text-emerald-500" />
                <h2 className="text-[11px] font-bold text-[var(--secondary)] uppercase tracking-wider">Item Discover</h2>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-zinc-500">Tap to view store • Hold to hide</span>
            </div>
            <div className="flex gap-3.5 overflow-x-auto px-4 md:px-6 hide-scrollbar py-1">
              {itemDiscoverContacts.map((profile) => {
                return (
                  <div
                    key={profile.id}
                    className="flex flex-col items-center gap-1 min-w-[62px] select-none cursor-pointer group"
                    onClick={() => {
                      window.history.pushState(null, "", `/profile?userId=${profile.id}&from=chats`);
                      window.dispatchEvent(new Event("locationchange"));
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setProfileToRemove(profile);
                    }}
                    onTouchStart={(e) => handleTouchStart(e, profile.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={(e) => handleMouseDown(e, profile.id)}
                  >
                    <div className="relative">
                      <div
                        className={clsx(
                          "w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 border-emerald-500 transition-all overflow-hidden flex items-center justify-center shadow-xs group-hover:scale-105 group-active:scale-95",
                          (profile.avatar && checkPrivacy(profile, 'profilePicture')) ? "bg-white" : profile.color
                        )}
                      >
                        {profile.avatar && checkPrivacy(profile, 'profilePicture') ? (
                          <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm sm:text-base font-bold text-zinc-800 dark:text-white">{profile.name.charAt(0)}</span>
                        )}
                      </div>
                      {/* Active item badge */}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm border-2 border-white dark:border-zinc-900" title={`${profile.itemsCount} active listing${profile.itemsCount > 1 ? 's' : ''}`}>
                        <ShoppingBag size={10} className="stroke-[2.5]" />
                      </div>
                    </div>
                    <span className="text-[11px] text-center font-medium truncate w-16 dark:text-white group-hover:text-emerald-600 transition-colors">{profile.name}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Messages List */}
        <section>
          {!searchQuery.trim() ? (
            filteredThreads.length > 0 ? (
              <div>
                {filteredThreads.map((chat) => (
                  <div 
                    key={chat.id} 
                    onContextMenu={(e) => handleChatContextMenu(e, chat)}
                    onTouchStart={(e) => handleChatTouchStart(e, chat)}
                    onTouchMove={handleChatTouchMove}
                    onTouchEnd={handleChatTouchEnd}
                    onTouchCancel={handleChatTouchEnd}
                  >
                    <div 
                      onPointerDown={triggerRipple}
                      onClick={() => {
                        if (isSelectionMode) {
                          toggleSelectThread(chat.id);
                          return;
                        }
                        handleThreadClick(chat.id);
                      }} 
                      className={clsx(
                        "cursor-pointer flex items-center gap-4 px-4 md:px-6 py-3.5 sm:py-4 hover:bg-gray-50 dark:hover:bg-gray-800/70 border-b border-[var(--border)]/70 dark:border-gray-800/70 relative overflow-hidden transition-colors",
                        isSelectionMode && selectedThreadIds.has(chat.id) && "bg-blue-50/60 dark:bg-blue-950/30"
                      )}
                    >
                        {(() => {
                          const hasActiveStatus = !chat.isGroup && statuses.some(s => s.userId === chat.user.id);
                          const avatarElement = chat.isGroup ? (
                            chat.groupAvatar ? (
                              chat.groupAvatar.startsWith("http") ? (
                                <img src={chat.groupAvatar} alt={chat.groupName || "Group"} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-2xl">{chat.groupAvatar}</span>
                              )
                            ) : (
                              <Users size={24} className="text-[#00a884] dark:text-[#00c89a]" />
                            )
                          ) : chat.user.avatar && checkPrivacy(chat.user, 'profilePicture') ? (
                            <img src={chat.user.avatar} alt={chat.user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg font-bold">{chat.user.name.charAt(0)}</span>
                          );

                          if (hasActiveStatus) {
                            const hasUnreadStatus = getUnreadStatusCount(chat.user.id) > 0;
                            return (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSelectionMode) {
                                    toggleSelectThread(chat.id);
                                    return;
                                  }
                                  if (chat.user.avatar && checkPrivacy(chat.user, 'profilePicture')) {
                                    setZoomedUser(chat.user);
                                  }
                                }}
                                className={clsx(
                                  "w-12 h-12 rounded-full shrink-0 relative flex items-center justify-center cursor-pointer p-[2px]",
                                  hasUnreadStatus
                                    ? "story-gradient-ring bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600"
                                    : "bg-zinc-200 dark:bg-zinc-700"
                                )}
                                style={hasUnreadStatus ? { background: "linear-gradient(45deg, #f59e0b, #f43f5e, #9333ea)" } : undefined}
                              >
                                <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 p-[1.5px]">
                                  <div className={clsx("w-full h-full rounded-full flex items-center justify-center overflow-hidden", chat.user.color)}>
                                    {avatarElement}
                                  </div>
                                </div>
                                {chat.unread && !isSelectionMode && (
                                  <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-4.5 px-1 bg-[var(--primary)] rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-md z-10">
                                    {getThreadUnreadCount(chat)}
                                  </div>
                                )}
                                {isSelectionMode && selectedThreadIds.has(chat.id) && (
                                  <div className="absolute inset-0 rounded-full bg-[var(--primary)]/90 flex items-center justify-center text-white border-2 border-white dark:border-gray-800 shadow-md z-20">
                                    <Check size={20} strokeWidth={3.5} />
                                  </div>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div className="w-12 h-12 shrink-0 relative flex items-center justify-center">
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSelectionMode) {
                                    toggleSelectThread(chat.id);
                                    return;
                                  }
                                  if (chat.isGroup) return;
                                  if (chat.user.avatar && checkPrivacy(chat.user, 'profilePicture')) {
                                    setZoomedUser(chat.user);
                                  }
                                }}
                                className={clsx("w-full h-full rounded-full overflow-hidden flex items-center justify-center", 
                                  chat.isGroup 
                                    ? (chat.groupAvatar && !chat.groupAvatar.startsWith("http") ? "bg-emerald-100 dark:bg-[#12382f]" : chat.groupAvatar ? "bg-white" : "bg-emerald-100 dark:bg-[#12382f]")
                                    : (chat.user.avatar && checkPrivacy(chat.user, 'profilePicture')) ? "bg-white cursor-pointer" : chat.user.color)}
                              >
                                {avatarElement}
                              </div>
                              {chat.unread && !isSelectionMode && (
                                <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-4.5 px-1 bg-[var(--primary)] rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-md z-10">
                                  {getThreadUnreadCount(chat)}
                                </div>
                              )}
                              {isSelectionMode && selectedThreadIds.has(chat.id) && (
                                <div className="absolute inset-0 rounded-full bg-[var(--primary)]/90 flex items-center justify-center text-white border-2 border-white dark:border-zinc-900 shadow-md z-20">
                                  <Check size={20} strokeWidth={3.5} />
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1.5">
                            <h3 className="font-semibold text-[15px] truncate dark:text-white flex items-center gap-1.5">
                              <span className="truncate">{chat.user.name}</span>
                              {isMarketplaceThread(chat) && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 shrink-0">
                                  Marketplace
                                </span>
                              )}
                              {currentUser.pinnedThreadIds?.includes(chat.id) && (
                                <Pin size={12} className="text-blue-500 fill-blue-500 rotate-45 shrink-0" />
                              )}
                              {chat.isMuted && (
                                <BellOff size={13} className="text-gray-400 dark:text-gray-500 shrink-0 ml-0.5" />
                              )}
                            </h3>
                            <span className={clsx("text-xs shrink-0 ml-2", chat.unread ? "text-[var(--primary)] font-medium" : "text-[var(--secondary)]")}>
                              {chat.lastTime}
                            </span>
                          </div>
                          {(() => {
                            const isTyping = !!(chat.typingParticipantIds && chat.typingParticipantIds.includes(chat.user.id));
                            if (isTyping) {
                              return (
                                <p className="text-sm truncate text-[var(--success)] font-medium animate-pulse">
                                  typing...
                                </p>
                              );
                            }
                            const lastMsg = chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
                            const isMe = lastMsg ? lastMsg.sender === "me" : false;
                            return (
                              <p className={clsx("text-sm truncate flex items-center gap-1", chat.unread ? "font-medium text-black dark:text-white" : "text-[var(--secondary)]")}>
                                {isMe && lastMsg && (
                                  lastMsg.read ? (
                                    <CheckCheck size={16} className="text-[#34b7f1] dark:text-[#53bdeb] shrink-0" />
                                  ) : lastMsg.delivered ? (
                                    <CheckCheck size={16} className="text-[#8696a0] shrink-0" />
                                  ) : (
                                    <Check size={16} className="text-[#8696a0] shrink-0" />
                                  )
                                )}
                                <span className="truncate">{chat.lastMessage}</span>
                              </p>
                            );
                          })()}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-[var(--secondary)]">
                No messages yet. Tap someone above to start chatting!
              </div>
            )
          ) : (
            // Search Query is Active
            <div className="space-y-4">
              {/* Active Conversations Section */}
              {filteredThreads.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 md:px-6 pt-2 pb-1">
                    Conversations ({filteredThreads.length})
                  </h3>
                  <div>
                    {filteredThreads.map((chat) => (
                      <div 
                        key={chat.id} 
                        onContextMenu={(e) => handleChatContextMenu(e, chat)}
                        onTouchStart={(e) => handleChatTouchStart(e, chat)}
                        onTouchMove={handleChatTouchMove}
                        onTouchEnd={handleChatTouchEnd}
                        onTouchCancel={handleChatTouchEnd}
                      >
                        <div 
                          onPointerDown={triggerRipple}
                          onClick={() => {
                            if (isSelectionMode) {
                              toggleSelectThread(chat.id);
                              return;
                            }
                            handleThreadClick(chat.id);
                          }} 
                          className={clsx(
                            "cursor-pointer flex items-center gap-4 px-4 md:px-6 py-3.5 sm:py-4 hover:bg-gray-50 dark:hover:bg-gray-800/70 border-b border-[var(--border)]/70 dark:border-gray-800/70 relative overflow-hidden transition-colors",
                            isSelectionMode && selectedThreadIds.has(chat.id) && "bg-blue-50/60 dark:bg-blue-950/30"
                          )}
                        >
                        {(() => {
                          const hasActiveStatus = !chat.isGroup && statuses.some(s => s.userId === chat.user.id);
                          const avatarElement = chat.isGroup ? (
                            chat.groupAvatar ? (
                              chat.groupAvatar.startsWith("http") ? (
                                <img src={chat.groupAvatar} alt={chat.groupName || "Group"} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-2xl">{chat.groupAvatar}</span>
                              )
                            ) : (
                              <Users size={24} className="text-[#00a884] dark:text-[#00c89a]" />
                            )
                          ) : chat.user.avatar && checkPrivacy(chat.user, 'profilePicture') ? (
                            <img src={chat.user.avatar} alt={chat.user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg font-bold">{chat.user.name.charAt(0)}</span>
                          );

                          if (hasActiveStatus) {
                            const hasUnreadStatus = getUnreadStatusCount(chat.user.id) > 0;
                            return (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSelectionMode) {
                                    toggleSelectThread(chat.id);
                                    return;
                                  }
                                  if (chat.user.avatar && checkPrivacy(chat.user, 'profilePicture')) {
                                    setZoomedUser(chat.user);
                                  }
                                }}
                                className={clsx(
                                  "w-12 h-12 rounded-full shrink-0 relative flex items-center justify-center cursor-pointer p-[2px]",
                                  hasUnreadStatus
                                    ? "story-gradient-ring bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600"
                                    : "bg-zinc-200 dark:bg-zinc-700"
                                )}
                                style={hasUnreadStatus ? { background: "linear-gradient(45deg, #f59e0b, #f43f5e, #9333ea)" } : undefined}
                              >
                                <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 p-[1.5px]">
                                  <div className={clsx("w-full h-full rounded-full flex items-center justify-center overflow-hidden", chat.user.color)}>
                                    {avatarElement}
                                  </div>
                                </div>
                                {chat.unread && !isSelectionMode && (
                                  <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-4.5 px-1 bg-[var(--primary)] rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-md z-10">
                                    {getThreadUnreadCount(chat)}
                                  </div>
                                )}
                                {isSelectionMode && selectedThreadIds.has(chat.id) && (
                                  <div className="absolute inset-0 rounded-full bg-[var(--primary)]/90 flex items-center justify-center text-white border-2 border-white dark:border-gray-800 shadow-md z-20">
                                    <Check size={20} strokeWidth={3.5} />
                                  </div>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div className="w-12 h-12 shrink-0 relative flex items-center justify-center">
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSelectionMode) {
                                    toggleSelectThread(chat.id);
                                    return;
                                  }
                                  if (chat.isGroup) return;
                                  if (chat.user.avatar && checkPrivacy(chat.user, 'profilePicture')) {
                                    setZoomedUser(chat.user);
                                  }
                                }}
                                className={clsx("w-full h-full rounded-full overflow-hidden flex items-center justify-center", 
                                  chat.isGroup 
                                    ? (chat.groupAvatar && !chat.groupAvatar.startsWith("http") ? "bg-emerald-100 dark:bg-[#12382f]" : chat.groupAvatar ? "bg-white" : "bg-emerald-100 dark:bg-[#12382f]")
                                    : (chat.user.avatar && checkPrivacy(chat.user, 'profilePicture')) ? "bg-white cursor-pointer" : chat.user.color)}
                              >
                                {avatarElement}
                              </div>
                              {chat.unread && !isSelectionMode && (
                                <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-4.5 px-1 bg-[var(--primary)] rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-md z-10">
                                  {getThreadUnreadCount(chat)}
                                </div>
                              )}
                              {isSelectionMode && selectedThreadIds.has(chat.id) && (
                                <div className="absolute inset-0 rounded-full bg-[var(--primary)]/90 flex items-center justify-center text-white border-2 border-white dark:border-zinc-900 shadow-md z-20">
                                  <Check size={20} strokeWidth={3.5} />
                                </div>
                              )}
                            </div>
                          );
                        })()}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-1.5">
                                <h3 className="font-semibold text-[15px] truncate dark:text-white flex items-center gap-1.5">
                                  <span className="truncate">{chat.user.name}</span>
                                  {isMarketplaceThread(chat) && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 shrink-0">
                                      Marketplace
                                    </span>
                                  )}
                                  {currentUser.pinnedThreadIds?.includes(chat.id) && (
                                    <Pin size={12} className="text-blue-500 fill-blue-500 rotate-45 shrink-0" />
                                  )}
                                  {chat.isMuted && (
                                    <BellOff size={13} className="text-gray-400 dark:text-gray-500 shrink-0 ml-0.5" />
                                  )}
                                </h3>
                                <span className={clsx("text-xs shrink-0 ml-2", chat.unread ? "text-[var(--primary)] font-medium" : "text-[var(--secondary)]")}>
                                  {chat.lastTime}
                                </span>
                              </div>
                              {(() => {
                                const isTyping = !!(chat.typingParticipantIds && chat.typingParticipantIds.includes(chat.user.id));
                                if (isTyping) {
                                  return (
                                    <p className="text-sm truncate text-[var(--success)] font-medium animate-pulse">
                                      typing...
                                    </p>
                                  );
                                }
                                  const lastMsg = chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
                                  const isMe = lastMsg ? lastMsg.sender === "me" : false;
                                  return (
                                    <p className={clsx("text-sm truncate flex items-center gap-1", chat.unread ? "font-medium text-black dark:text-white" : "text-[var(--secondary)]")}>
                                      {isMe && lastMsg && (
                                        lastMsg.read ? (
                                          <CheckCheck size={16} className="text-[#34b7f1] dark:text-[#53bdeb] shrink-0" />
                                        ) : lastMsg.delivered ? (
                                          <CheckCheck size={16} className="text-[#8696a0] shrink-0" />
                                        ) : (
                                          <Check size={16} className="text-[#8696a0] shrink-0" />
                                        )
                                      )}
                                      <span className="truncate">{chat.lastMessage}</span>
                                    </p>
                                  );
                              })()}
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Profiles Section */}
              {matchingProfiles.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 md:px-6 pt-2 pb-1">
                    New Singles to Mingle ({matchingProfiles.length})
                  </h3>
                  <div>
                    {matchingProfiles.map((profile) => (
                      <div 
                        key={profile.id}
                        onPointerDown={triggerRipple}
                        onClick={async () => {
                          const threadId = await startDirectChat(profile);
                          if (threadId) {
                            handleThreadClick(threadId);
                          }
                        }}
                        className="flex items-center gap-4 px-4 md:px-6 py-3.5 sm:py-4 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors border-b border-[var(--border)]/70 dark:border-gray-800/70 cursor-pointer relative overflow-hidden"
                      >
                        <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (profile.avatar && checkPrivacy(profile, 'profilePicture')) {
                      setZoomedUser(profile);
                    }
                  }}
                  className={clsx("w-12 h-12 rounded-full shrink-0 overflow-hidden flex items-center justify-center", (profile.avatar && checkPrivacy(profile, 'profilePicture')) ? "bg-white cursor-pointer hover:scale-105 transition-transform" : profile.color)}
                >
                          {profile.avatar && checkPrivacy(profile, 'profilePicture') ? (
                            <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg font-bold">{profile.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-semibold text-[15px] truncate dark:text-white">
                              {profile.name}
                            </h3>
                            <span className="text-xs text-[var(--primary)] font-semibold">Start Chat</span>
                          </div>
                          <p className="text-sm truncate text-[var(--secondary)]">
                            {profile.marketplaceStore?.headline || (profile.bio && !profile.bio.includes("Hey there") ? profile.bio : "Verified local seller on Yogheart Marketplace.")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results state */}
              {filteredThreads.length === 0 && matchingProfiles.length === 0 && (
                <div className="text-center py-20 text-[var(--secondary)]">
                  {`No conversations or profiles found for "${searchQuery}"`}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Hide from Item Discover Confirmation Modal */}
      {profileToRemove && (
        <div 
          className="absolute inset-0 z-[160] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setProfileToRemove(null)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-150 dark:border-zinc-800 text-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-3 border-2 border-emerald-500 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 shadow-sm">
              {profileToRemove.avatar && checkPrivacy(profileToRemove, 'profilePicture') ? (
                <img src={profileToRemove.avatar} alt={profileToRemove.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-zinc-800 dark:text-white">{profileToRemove.name.charAt(0)}</span>
              )}
            </div>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
              Hide from Item Discover?
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
              Do you want to hide <span className="font-semibold text-zinc-800 dark:text-zinc-200">{profileToRemove.name}</span> from your Item Discover recommendations?
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setProfileToRemove(null)}
                className="flex-1 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDismissedIds(prev => new Set([...prev, profileToRemove.id]));
                  setProfileToRemove(null);
                  addNotification(`Hidden ${profileToRemove.name} from Item Discover.`);
                }}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Hide</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Context Menu Overlay */}
      {typeof window !== "undefined" && showChatContextMenu && selectedChat && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowChatContextMenu(false)} />
          <div
            className="fixed bg-white dark:bg-zinc-950 rounded-xl shadow-lg border border-[var(--border)] dark:border-zinc-800 py-2 min-w-[180px] z-50 animate-in fade-in zoom-in-95 duration-100"
            style={{
              ...(chatContextMenuPos.y > window.innerHeight / 2 ? { bottom: window.innerHeight - chatContextMenuPos.y } : { top: chatContextMenuPos.y }),
              ...(chatContextMenuPos.x > window.innerWidth / 2 ? { right: window.innerWidth - chatContextMenuPos.x } : { left: chatContextMenuPos.x })
            }}
          >
            <button
              onClick={() => {
                if (selectedChat.isGroup) {
                  window.history.pushState(null, "", `/profile?groupId=${selectedChat.id}&from=chats`);
                } else {
                  window.history.pushState(null, "", `/profile?userId=${selectedChat.user?.id || selectedChat.id}&from=chats`);
                }
                setShowChatContextMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-850 text-left text-black dark:text-white font-medium transition-colors text-sm"
            >
              <Image size={18} className="text-[var(--secondary)]" /> View Profile
            </button>
            <button
              onClick={() => {
                handleThreadClick(selectedChat.id, true);
                setShowChatContextMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-850 text-left text-black dark:text-white font-medium transition-colors text-sm"
            >
              <Search size={18} className="text-[var(--secondary)]" /> Search
            </button>
            <button
              onClick={() => {
                setIsSelectionMode(true);
                setSelectedThreadIds(new Set([selectedChat.id]));
                setShowChatContextMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-850 text-left text-black dark:text-white font-medium transition-colors text-sm"
            >
              <CheckSquare size={18} className="text-[var(--secondary)]" /> Select
            </button>
            <button
              onClick={() => {
                muteChat(selectedChat.id, !selectedChat.isMuted);
                setShowChatContextMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-850 text-left text-black dark:text-white font-medium transition-colors text-sm"
            >
              {selectedChat.isMuted ? <Bell size={18} className="text-[var(--secondary)]" /> : <BellOff size={18} className="text-[var(--secondary)]" />}
              {selectedChat.isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={async () => {
                await togglePinThread(selectedChat.id);
                setShowChatContextMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-850 text-left text-black dark:text-white font-medium transition-colors text-sm"
            >
              <Pin size={18} className="text-[var(--secondary)] rotate-45" />
              {currentUser.pinnedThreadIds?.includes(selectedChat.id) ? "Unpin Chat" : "Pin Chat"}
            </button>
            <div className="border-t border-[var(--border)] dark:border-zinc-800 my-1" />
            <button
              onClick={() => {
                archiveChat(selectedChat.id);
                setShowChatContextMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-850 text-left text-black dark:text-white font-medium transition-colors text-sm"
            >
              <Archive size={18} className="text-[var(--secondary)]" /> Archive Chat
            </button>
            <button
              onClick={() => {
                setShowConfirmDeleteChat(true);
                setShowChatContextMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-850 text-left text-[var(--danger)] font-medium transition-colors text-sm"
            >
              <Trash size={18} /> Delete Chat
            </button>
            <button
              onClick={() => {
                setShowConfirmBlock(true);
                setShowChatContextMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-850 text-left text-black dark:text-white font-medium transition-colors text-sm"
            >
              <Ban size={18} className="text-[var(--secondary)]" /> Block
            </button>
            <button
              onClick={() => {
                setShowReportModal(true);
                setShowChatContextMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-850 text-left text-[var(--danger)] font-medium transition-colors text-sm"
            >
              <Flag size={18} /> Report
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Confirmation Modals */}
      {showConfirmDeleteChat && selectedChat && (
        <div className="modal-overlay" onClick={() => setShowConfirmDeleteChat(false)}>
          <div 
            className="modal-content p-6 max-w-sm flex flex-col" 
            onClick={e => e.stopPropagation()}
            style={{
              transform: popupDragY > 0 ? `translateY(${popupDragY}px)` : undefined,
              transition: isPopupDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
            }}
          >
            {/* Drag Handle Container with touch events */}
            <div
              className="w-full pb-3 md:hidden shrink-0 cursor-row-resize select-none flex justify-center -mt-2 mb-2"
              style={{ touchAction: 'none' }}
              onTouchStart={handlePopupTouchStart}
              onTouchMove={handlePopupTouchMove}
              onTouchEnd={() => handlePopupTouchEnd(() => setShowConfirmDeleteChat(false))}
            >
              <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
            <h3 className="text-lg font-semibold mb-2 dark:text-white">Delete Chat?</h3>
            <p className="text-[var(--secondary)] text-sm mb-4">
              Are you sure you want to delete the chat with {selectedChat.user.name}? This action cannot be undone.
            </p>
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-zinc-700">
                <input
                  type="radio"
                  name="deleteOptionHome"
                  checked={deleteOption === "me"}
                  onChange={() => setDeleteOption("me")}
                  className="text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <div>
                  <p className="text-sm font-semibold dark:text-white">Delete for me</p>
                  <p className="text-[10px] text-[var(--secondary)]">Only remove it from your device</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-zinc-700">
                <input
                  type="radio"
                  name="deleteOptionHome"
                  checked={deleteOption === "everyone"}
                  onChange={() => setDeleteOption("everyone")}
                  className="text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <div>
                  <p className="text-sm font-semibold dark:text-white">Delete for everyone</p>
                  <p className="text-[10px] text-[var(--secondary)]">Remove it for both participants</p>
                </div>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDeleteChat(false)}
                className="flex-1 py-3 bg-[var(--card)] dark:bg-zinc-800 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteChat}
                className="flex-1 py-3 bg-[var(--danger)] text-white rounded-xl font-medium hover:opacity-90 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Selected Chats Modal */}
      {showBulkDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowBulkDeleteModal(false)}>
          <div 
            className="modal-content p-6 max-w-sm flex flex-col" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-500 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Delete {selectedThreadIds.size} {selectedThreadIds.size === 1 ? "Conversation" : "Conversations"}?
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3 mb-2">
              <button
                type="button"
                onClick={() => handleConfirmBulkDelete(false)}
                className="w-full py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-900 dark:text-white font-bold text-xs transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Delete for Me</span>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-normal">Remove from my chat list</span>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </button>

              <button
                type="button"
                onClick={() => handleConfirmBulkDelete(true)}
                className="w-full py-3 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs transition-colors text-left flex items-center justify-between shadow-sm cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-white">Delete for Everyone</span>
                  <span className="text-[11px] text-white/80 font-normal">Wipe permanently for all</span>
                </div>
                <ChevronRight size={16} className="text-white/80" />
              </button>

              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="w-full py-2 px-4 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 font-semibold text-xs transition-colors cursor-pointer mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmDeleteSyncedContacts && (
        <div className="modal-overlay" onClick={() => setShowConfirmDeleteSyncedContacts(false)}>
          <div 
            className="modal-content p-6 max-w-sm flex flex-col items-center text-center" 
            onClick={e => e.stopPropagation()}
            style={{
              transform: popupDragY > 0 ? `translateY(${popupDragY}px)` : undefined,
              transition: isPopupDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
            }}
          >
            {/* Drag Handle Container with touch events */}
            <div
              className="w-full pb-3 md:hidden shrink-0 cursor-row-resize select-none flex justify-center -mt-2 mb-2"
              style={{ touchAction: 'none' }}
              onTouchStart={handlePopupTouchStart}
              onTouchMove={handlePopupTouchMove}
              onTouchEnd={() => handlePopupTouchEnd(() => setShowConfirmDeleteSyncedContacts(false))}
            >
              <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 mb-4 shrink-0">
              <AlertTriangle size={32} />
            </div>

            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Delete Synced Contacts?</h3>
            <p className="text-[var(--secondary)] text-sm mb-6 leading-relaxed">
              Are you sure you want to delete all synced contacts? This action will remove all device contacts from your listing.
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowConfirmDeleteSyncedContacts(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 dark:text-white rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowConfirmDeleteSyncedContacts(false);
                  await syncDeviceContacts([]);
                }}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 active:scale-[0.98] transition-all shadow-lg shadow-rose-500/20 dark:shadow-none"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmBlock && selectedChat && (
        <div className="modal-overlay" onClick={() => setShowConfirmBlock(false)}>
          <div 
            className="modal-content p-6 max-w-sm flex flex-col" 
            onClick={e => e.stopPropagation()}
            style={{
              transform: popupDragY > 0 ? `translateY(${popupDragY}px)` : undefined,
              transition: isPopupDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
            }}
          >
            {/* Drag Handle Container with touch events */}
            <div
              className="w-full pb-3 md:hidden shrink-0 cursor-row-resize select-none flex justify-center -mt-2 mb-2"
              style={{ touchAction: 'none' }}
              onTouchStart={handlePopupTouchStart}
              onTouchMove={handlePopupTouchMove}
              onTouchEnd={() => handlePopupTouchEnd(() => setShowConfirmBlock(false))}
            >
              <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
            <h3 className="text-lg font-semibold mb-2 dark:text-white">Block {selectedChat.user.name}?</h3>
            <p className="text-[var(--secondary)] mb-6 text-sm">
              {"They won't be able to message you or see your profile. This can be undone in settings."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmBlock(false)}
                className="flex-1 py-3 bg-[var(--card)] dark:bg-zinc-800 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockUser}
                className="flex-1 py-3 bg-[var(--danger)] text-white rounded-xl font-medium hover:opacity-90"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && selectedChat && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div 
            className="modal-content p-6 max-w-sm flex flex-col" 
            onClick={e => e.stopPropagation()}
            style={{
              transform: popupDragY > 0 ? `translateY(${popupDragY}px)` : undefined,
              transition: isPopupDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
            }}
          >
            {/* Drag Handle Container with touch events */}
            <div
              className="w-full pb-3 md:hidden shrink-0 cursor-row-resize select-none flex justify-center -mt-2 mb-2"
              style={{ touchAction: 'none' }}
              onTouchStart={handlePopupTouchStart}
              onTouchMove={handlePopupTouchMove}
              onTouchEnd={() => handlePopupTouchEnd(() => setShowReportModal(false))}
            >
              <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Report {selectedChat.user.name}</h3>
            <p className="text-[var(--secondary)] text-sm mb-4">Why are you reporting this user?</p>
            <div className="space-y-2">
              {["Spam", "Inappropriate content", "Harassment", "Fake profile", "Other"].map(reason => (
                <button
                  key={reason}
                  onClick={() => handleReport(reason)}
                  className="w-full py-3 text-left px-4 bg-gray-50 dark:bg-zinc-800 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors dark:text-white text-sm"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowReportModal(false)}
              className="w-full py-3 mt-4 text-[var(--secondary)] font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showMockPicker && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowMockPicker(false)}>
          <div 
            className="modal-content p-0 dark:bg-gray-900 bg-white flex flex-col h-full max-h-[85vh] md:max-h-[550px] overflow-hidden" 
            onClick={e => e.stopPropagation()}
            style={{
              transform: popupDragY > 0 ? `translateY(${popupDragY}px)` : undefined,
              transition: isPopupDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
            }}
          >
            {/* iOS style bar on mobile with touch events */}
            <div 
              className="w-full py-3 shrink-0 cursor-row-resize select-none flex justify-center md:hidden"
              style={{ touchAction: 'none' }}
              onTouchStart={handlePopupTouchStart}
              onTouchMove={handlePopupTouchMove}
              onTouchEnd={() => handlePopupTouchEnd(() => setShowMockPicker(false))}
            >
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-150 dark:border-gray-800 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Sync device contacts</h2>
                <p className="text-[10px] text-gray-400">Desktop Fallback Address Book Simulator</p>
              </div>
              <button onClick={() => setShowMockPicker(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Quick custom contact add */}
            <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
              <form onSubmit={handleAddCustomMock} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={customMockName}
                  onChange={(e) => setCustomMockName(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={customMockPhone}
                  onChange={(e) => setCustomMockPhone(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                />
                <button type="submit" className="px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl shrink-0 transition-colors">
                  + Add
                </button>
              </form>
            </div>

            {/* Checklist */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Added Contacts</p>
              {customMockList.length > 0 ? (
                <div className="space-y-1">
                  {customMockList.map((contact, index) => {
                    const isSelected = !!selectedMockContacts[contact.phoneNumber];
                    const isDatabaseMatch = (allDatingUsers || []).some(u => u.phoneNumber && normalizePhone(u.phoneNumber) === normalizePhone(contact.phoneNumber));
                    
                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedMockContacts(prev => ({ ...prev, [contact.phoneNumber]: !isSelected }))}
                        className={clsx(
                          "flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all",
                          isSelected 
                            ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/40" 
                            : "bg-white dark:bg-zinc-950 border-gray-150 dark:border-gray-800"
                        )}
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div className={clsx(
                            "w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0",
                            isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300 dark:border-gray-700 bg-white dark:bg-transparent"
                          )}>
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-gray-900 dark:text-white truncate">{contact.name}</span>
                              {isDatabaseMatch && (
                                <span className="text-[8px] font-bold bg-emerald-500/10 text-emerald-500 px-1 py-0.5 rounded uppercase tracking-wide">On Yogheart</span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{contact.phoneNumber}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-gray-400 dark:text-gray-500">
                  No contacts entered yet. Type a name and phone number above, then click + Add.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0 flex gap-2">
              <button 
                type="button"
                onClick={() => setShowMockPicker(false)}
                className="flex-1 py-2 text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleImportMockContacts}
                className="flex-1 py-2 text-xs font-bold bg-[var(--primary)] hover:bg-blue-600 text-white rounded-xl shadow-md transition-colors"
              >
                Sync Contacts
              </button>
            </div>
          </div>
        </div>
      )}

      <ZoomedAvatarModal
          isOpen={!!zoomedUser}
          onClose={() => setZoomedUser(null)}
          userName={zoomedUser?.name || ""}
          userAvatar={zoomedUser?.avatar || null}
          userColor={zoomedUser?.color || "bg-gray-200"}
          location={zoomedUser?.location || null}
          showSendMessage={false}
          isGroup={!!zoomedUser && !!threads.find(t => t.id === zoomedUser.id && t.isGroup)}
          onLeaveGroup={async () => {
              if (zoomedUser) {
                  const thread = threads.find(t => t.id === zoomedUser.id && t.isGroup);
                  if (thread) {
                      const confirmed = window.confirm(`Are you sure you want to leave "${thread.groupName || "Group Chat"}"?`);
                      if (confirmed) {
                          await leaveGroup(thread.id);
                      }
                  }
              }
          }}
          onMessage={async () => {
              if (zoomedUser) {
                  const targetUser = zoomedUser;
                  setZoomedUser(null);
                  
                  setTimeout(async () => {
                      const thread = threads.find(t => t.user?.id === targetUser.id);
                      if (thread) {
                          handleThreadClick(thread.id);
                      } else {
                          try {
                              const threadId = await startDirectChat(targetUser);
                              handleThreadClick(threadId);
                          } catch (e) {
                              console.error(e);
                          }
                      }
                  }, 150);
              }
          }}
          onCall={(type) => zoomedUser && initiateCall(zoomedUser.id, zoomedUser.name, zoomedUser.avatar || null, type)}
          onInfo={() => {
              if (zoomedUser) {
                  setZoomedUser(null);
                  window.history.pushState(null, "", `/profile?userId=${zoomedUser.id}&from=chats`);
              }
          }}
      />


      {/* Context Menu for Archived Chats Row */}
      {showArchivedContextMenu && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowArchivedContextMenu(false)}
        >
          <div 
            className="w-full sm:max-w-xs bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-2 pt-1 pb-2 border-b border-gray-100 dark:border-gray-800">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[#00a884]">
                <Archive size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Archived Chats</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{archivedThreads.length} archived {archivedThreads.length === 1 ? 'chat' : 'chats'}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setIsArchiveHidden(true);
                localStorage.setItem("mesh_hide_archived", "true");
                setShowArchivedContextMenu(false);
                addNotification("Archived Chats hidden. Double-tap 'Chats' header to unhide.");
                if (typeof window !== "undefined" && navigator.vibrate) {
                  navigator.vibrate(50);
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-rose-600 dark:text-rose-400 font-medium text-sm transition-colors cursor-pointer"
            >
              <EyeOff size={18} />
              <span>Hide Archived Chats</span>
            </button>

            <button
              onClick={() => setShowArchivedContextMenu(false)}
              className="w-full py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
