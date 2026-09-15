// Service Worker for Mesh PWA and Push Notifications
// ──────────────────────────────────────────────────────
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyDCLQn3D2qUZyuh_0nmlR8if2GQ1SOfvzk",
    authDomain: "yoghearts.web.app",
    projectId: "mesh-app-prod-58473",
    storageBucket: "mesh-app-prod-58473.firebasestorage.app",
    messagingSenderId: "86437967745",
    appId: "1:86437967745:web:5f73a52bcd8815a485da80"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Fresh cache version - updated to purge stale assets and fast refresh caches
const CACHE_VERSION = 'mesh-cache-v20260825-v223';
const CACHE_NAME = CACHE_VERSION;

// Handle SKIP_WAITING message from the client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ==========================================
// Service Worker Install Lifecycle
// ==========================================
self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('[Service Worker] Installed — version:', CACHE_VERSION);
});

// ==========================================
// Service Worker Activate Lifecycle
// ==========================================
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            await self.clients.claim();

            // Purge ALL old caches
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', name);
                        return caches.delete(name);
                    }
                })
            );

            console.log('[Service Worker] Activated — version:', CACHE_VERSION);
        })()
    );
});

// ==========================================
// Service Worker Fetch Lifecycle Interceptor
// ==========================================
self.addEventListener('fetch', (event) => {
    // Only intercept GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);

    // Bypass caching completely for localhost/dev and external Firebase APIs
    const shouldBypass =
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname.startsWith('192.168.') ||
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('identitytoolkit.googleapis.com') ||
        url.hostname.includes('firebaseapp.com') ||
        url.hostname.includes('cloudfunctions.net') ||
        url.hostname.includes('firebasedatabase.app') ||
        url.hostname.includes('googleapis.com') ||
        url.pathname.includes('/__/auth') ||
        url.pathname.includes('/_next/webpack-hmr') ||
        url.pathname.includes('webpack-dev-server') ||
        url.pathname.includes('/sdr') ||
        url.protocol === 'chrome-extension:' ||
        url.protocol.startsWith('ws');

    if (shouldBypass) {
        return;
    }

    // Bypass range requests (streaming video/audio)
    const hasRangeHeader = event.request.headers.has('range');
    const isVideo = url.pathname.match(/\.(mp4|webm|ogg|mov)$/i);
    if (hasRangeHeader || isVideo) {
        return;
    }

    const isNavigationRequest =
        event.request.mode === 'navigate' ||
        (event.request.headers.get('accept') || '').includes('text/html');

    const isImmutableAsset = url.pathname.startsWith('/_next/static/');

    if (isNavigationRequest) {
        // ─── NETWORK-FIRST for navigation ──────────────────────
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    const cachedResponse = await caches.match(event.request);
                    if (cachedResponse) return cachedResponse;

                    const fallback = await caches.match('/index.html');
                    return fallback || new Response('Offline — please check your connection.', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain' },
                    });
                })
        );
    } else if (isImmutableAsset) {
        // ─── CACHE-FIRST for immutable hashed assets ───────────
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cachedResponse = await cache.match(event.request);
                if (cachedResponse) return cachedResponse;

                try {
                    const networkResponse = await fetch(event.request);
                    if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (err) {
                    return cachedResponse || new Response(null, { status: 404 });
                }
            })
        );
    } else {
        // ─── STALE-WHILE-REVALIDATE for other assets ───────────
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cachedResponse = await cache.match(event.request);

                const fetchPromise = fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse) {
                            const isSuccess = networkResponse.status === 200;
                            const isOpaque = networkResponse.type === 'opaque';
                            const isCors = networkResponse.type === 'cors';
                            const isBasic = networkResponse.type === 'basic';

                            if ((isSuccess && (isBasic || isCors)) || isOpaque) {
                                cache.put(event.request, networkResponse.clone());
                            }
                        }
                        return networkResponse;
                    })
                    .catch((err) => {
                        return cachedResponse || new Response(null, { status: 404 });
                    });

                return cachedResponse || fetchPromise;
            })
        );
    }
});

// ==========================================
// Background Message Reply handler
// ==========================================
const handleBackgroundReply = async (threadId, replyText) => {
    const user = await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            unsubscribe();
            resolve(u);
        });
    });

    if (!user) {
        console.error('[SW] User is not authenticated in Service Worker.');
        return;
    }

    const currentUserId = user.uid;
    const messageId = self.crypto.randomUUID();
    
    const messageRef = db.collection('threads').doc(threadId).collection('messages').doc(messageId);
    
    const firestoreMessage = {
        id: messageId,
        senderId: currentUserId,
        text: replyText,
        time: "Now",
        type: "text",
        read: false,
        createdAt: new Date().toISOString()
    };

    await messageRef.set(firestoreMessage);

    const threadRef = db.collection('threads').doc(threadId);
    const threadSnap = await threadRef.get();
    if (threadSnap.exists) {
        const threadData = threadSnap.data();
        const otherParticipants = (threadData.participantIds || []).filter(pid => pid !== currentUserId);

        if (otherParticipants.length > 0) {
            fetch('https://us-central1-mesh-app-prod-58473.cloudfunctions.net/sendNotification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientUserIds: otherParticipants,
                    title: threadData.groupName || user.displayName || "New Message",
                    body: replyText,
                    data: {
                        type: "chat",
                        threadId: threadId,
                        senderId: currentUserId,
                        url: `/inbox?id=${threadId}`
                    }
                })
            }).catch(err => console.error('[SW] Background notification failed:', err));
        }
    }
};

// ==========================================
// Web Push Notifications Handler
// ==========================================
self.addEventListener('push', (event) => {
    let data = { title: 'Yogheart', body: 'New notification', url: '/' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const notificationOptions = {
        body: data.body,
        icon: '/icon-192-v3.png',
        badge: '/icon-192-v3.png',
        data: data.data || { url: data.url || '/' },
        vibrate: [100, 50, 100],
        requireInteraction: false
    };

    if (data.data?.type === 'chat' && data.data?.threadId) {
        notificationOptions.actions = [
            {
                action: 'reply',
                title: '💬 Quick Reply',
                type: 'text',
                placeholder: 'Type a message...'
            }
        ];
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'Yogheart', notificationOptions)
    );
});

// ==========================================
// Push Notification Click/Action Handlers
// ==========================================
self.addEventListener('notificationclick', (event) => {
    const notification = event.notification;
    const action = event.action;
    const replyText = event.reply;
    const notifData = notification.data || {};
    const threadId = notifData.threadId;

    notification.close();

    if (action === 'reply' && replyText && threadId) {
        event.waitUntil(
            handleBackgroundReply(threadId, replyText)
        );
        return;
    }

    const urlToOpen = notifData.url || (threadId ? `/inbox?id=${threadId}` : '/');

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.postMessage({
                        type: 'NAVIGATE',
                        url: urlToOpen
                    });
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
