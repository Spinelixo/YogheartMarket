const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe");

admin.initializeApp();

exports.createStripeSession = functions.https.onRequest(async (req, res) => {
    // Set CORS headers for all responses (including OPTIONS)
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle OPTIONS request pre-flight
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const { statusId, userId, durationHours, successUrl, cancelUrl } = req.body || {};

        if (!statusId || !userId || !durationHours) {
            res.status(400).json({ error: "Missing required parameters: statusId, userId, durationHours" });
            return;
        }

        // Get Stripe Secret Key from process.env (or process.env.STRIPE_SECRET_KEY)
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

        const stripeClient = stripe(stripeSecretKey);

        // Determine price details based on duration (1h = $2.99, 6h = $9.99, 24h = $19.99)
        let amountCents = 299;
        let productName = "1 Hour Status Boost";
        if (durationHours === 6) {
            amountCents = 999;
            productName = "6 Hour Status Boost";
        } else if (durationHours === 24) {
            amountCents = 1999;
            productName = "24 Hour Status Boost";
        } else if (durationHours !== 1) {
            // custom duration
            amountCents = Math.round(durationHours * 299 * 0.8);
            productName = `${durationHours} Hours Status Boost`;
        }

        // Create Stripe Checkout Session
        const session = await stripeClient.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: productName,
                            description: `Promote your status update for ${durationHours} hours to the top of the Status Pool.`,
                        },
                        unit_amount: amountCents,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                statusId: statusId,
                userId: userId,
                durationHours: String(durationHours),
            },
        });

        res.status(200).json({ url: session.url });
    } catch (err) {
        console.error("Error creating Stripe session:", err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// Stripe Connect & Fundraiser Endpoints
// ==========================================
exports.fundraisingConnect = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
        const stripeClient = stripe(stripeSecretKey);

        const body = req.body || {};
        const { action, accountId, organizerId, organizerEmail, organizerName, returnUrl, refreshUrl } = body;

        // Retrieve status if requested
        if (action === "status" && accountId) {
            const account = await stripeClient.accounts.retrieve(accountId);
            res.status(200).json({
                accountId: account.id,
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                detailsSubmitted: account.details_submitted,
                payoutSchedule: account.settings?.payouts?.schedule?.interval || "daily",
            });
            return;
        }

        const origin = req.headers.origin || "https://yoghearts.web.app";

        // 1. Create Connected Account with daily automated payouts
        const account = await stripeClient.accounts.create({
            type: "express",
            country: "US",
            email: organizerEmail || undefined,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: "individual",
            settings: {
                payouts: {
                    schedule: {
                        interval: "daily",
                    },
                },
            },
            metadata: {
                organizerId: organizerId || "",
                organizerName: organizerName || "",
                app: "Yogheart HeartFund",
            },
        });

        // 2. Generate Account Link for organizer bank/identity onboarding
        const accountLink = await stripeClient.accountLinks.create({
            account: account.id,
            refresh_url: refreshUrl || `${origin}/marketplace?subpage=fundraising&connect=refresh`,
            return_url: returnUrl || `${origin}/marketplace?subpage=fundraising&connect=success&accountId=${account.id}`,
            type: "account_onboarding",
        });

        res.status(200).json({
            success: true,
            accountId: account.id,
            onboardingUrl: accountLink.url,
        });
    } catch (err) {
        console.error("Error creating Stripe connected account:", err);
        res.status(500).json({ error: err.message || "Failed to create Stripe connected account" });
    }
});

exports.fundraisingDonate = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
        const stripeClient = stripe(stripeSecretKey);

        const body = req.body || {};
        const {
            campaignId,
            campaignTitle,
            organizerStripeAccountId,
            donationAmount,
            tipAmount = 0,
            donorName = "Kind Supporter",
            comment = "",
            isAnonymous = false,
            successUrl,
            cancelUrl,
        } = body;

        if (!campaignId || !donationAmount || Number(donationAmount) <= 0) {
            res.status(400).json({ error: "Missing required parameters: campaignId, donationAmount" });
            return;
        }

        const donationCents = Math.round(Number(donationAmount) * 100);
        const tipCents = Math.round(Number(tipAmount) * 100);
        const totalChargedCents = donationCents + tipCents;

        // Platform fee: 10% + $0.50 ($0.50 = 50 cents)
        const basePlatformFeeCents = Math.round(donationCents * 0.10) + 50;
        const totalApplicationFeeCents = basePlatformFeeCents + tipCents;

        const origin = req.headers.origin || "https://yoghearts.web.app";

        const lineItems = [
            {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: `HeartFund Donation: ${campaignTitle || "Community Fund"}`,
                        description: `Support donation to ${campaignTitle || "fundraiser"}.`,
                    },
                    unit_amount: donationCents,
                },
                quantity: 1,
            },
        ];

        if (tipCents > 0) {
            lineItems.push({
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: "Support Yogheart Platform Tip",
                        description: "Voluntary tip to help run the platform.",
                    },
                    unit_amount: tipCents,
                },
                quantity: 1,
            });
        }

        const sessionParams = {
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: successUrl || `${origin}/marketplace?subpage=fundraising&donation=success&campaignId=${campaignId}&amount=${donationAmount}`,
            cancel_url: cancelUrl || `${origin}/marketplace?subpage=fundraising&donation=cancelled&campaignId=${campaignId}`,
            metadata: {
                type: "fundraising_donation",
                campaignId,
                campaignTitle: campaignTitle || "",
                donationAmount: String(donationAmount),
                tipAmount: String(tipAmount),
                donorName: isAnonymous ? "Anonymous" : donorName,
                comment: comment || "",
                isAnonymous: String(isAnonymous),
            },
        };

        // If organizer has connected Stripe account, route payment through Stripe Destination Split
        if (organizerStripeAccountId && organizerStripeAccountId.startsWith("acct_")) {
            sessionParams.payment_intent_data = {
                application_fee_amount: totalApplicationFeeCents,
                transfer_data: {
                    destination: organizerStripeAccountId,
                },
            };
        }

        const session = await stripeClient.checkout.sessions.create(sessionParams);

        res.status(200).json({
            success: true,
            sessionId: session.id,
            url: session.url,
            platformFeeCents: totalApplicationFeeCents,
            netToOrganizerCents: donationCents - basePlatformFeeCents,
        });
    } catch (err) {
        console.error("Error creating donation session:", err);
        res.status(500).json({ error: err.message || "Failed to create donation session" });
    }
});

exports.fundraisingVerify = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
        const stripeClient = stripe(stripeSecretKey);

        const { sessionId } = req.body || {};

        if (!sessionId) {
            res.status(400).json({ error: "Missing sessionId" });
            return;
        }

        const session = await stripeClient.checkout.sessions.retrieve(sessionId);

        const isPaid = session.payment_status === "paid";
        const meta = session.metadata || {};

        res.status(200).json({
            paid: isPaid,
            amount: Number(meta.donationAmount) || ((session.amount_total || 0) / 100),
            campaignId: meta.campaignId || "",
            donorName: meta.donorName || "Kind Supporter",
            comment: meta.comment || "",
            isAnonymous: meta.isAnonymous === "true",
            customerEmail: session.customer_details?.email || "",
        });
    } catch (err) {
        console.error("Error verifying donation session:", err);
        res.status(500).json({ error: err.message || "Failed to verify donation session" });
    }
});

// ==========================================
// Web Push Notifications Trigger
// ==========================================
const webpush = require("web-push");

webpush.setVapidDetails(
    "mailto:admin@mesh.dating",
    "BF_QcUtOi4e9RA9p5wAPA8DO5n9feiolnmJX7BG2PKsrpHhTVtf8uznKAHxCsFn1RFjf683WOpNIY4tm0rNppqY", // Public Key
    "ol2mJ8J_DzreSC-smXwRSpU9WMrM5KpzHcGa7-pYan8" // Private Key
);

async function getRecipientBadgeCount(db, recipientId, currentThreadId = null) {
    let unreadCount = 0;
    try {
        const unreadSnap = await db.collection("threads")
            .where("participantIds", "array-contains", recipientId)
            .get();
        
        const threadPromises = unreadSnap.docs.map(async (docSnap) => {
            const d = docSnap.data();
            const unreadFor = d.unreadFor || [];
            if (docSnap.id === currentThreadId || unreadFor.includes(recipientId)) {
                const messagesSnap = await docSnap.ref.collection("messages")
                    .where("read", "==", false)
                    .get();
                
                let unreadInThread = 0;
                messagesSnap.forEach(msgDoc => {
                    const msgData = msgDoc.data();
                    if (msgData.senderId !== recipientId) {
                        unreadInThread++;
                    }
                });
                
                return unreadInThread > 0 ? unreadInThread : 1;
            }
            return 0;
        });

        const threadCounts = await Promise.all(threadPromises);
        unreadCount = threadCounts.reduce((acc, c) => acc + c, 0);

        const callLogsSnap = await db.collection("callLogs")
            .where("read", "==", false)
            .get();
        
        let missedCalls = 0;
        callLogsSnap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.status === "missed" && data.callerId !== recipientId) {
                missedCalls++;
            }
        });

        unreadCount += missedCalls;
    } catch (err) {
        console.error("Error calculating badge count:", err);
    }
    return unreadCount > 0 ? unreadCount : 1;
}

exports.onNewMessageSendPush = functions.firestore
    .document("threads/{threadId}/messages/{messageId}")
    .onCreate(async (snap, context) => {
        const messageData = snap.data();
        if (!messageData) {
            console.log("No data associated with the event.");
            return;
        }
        const senderId = messageData.senderId;
        const text = messageData.text || "New message";
        const threadId = context.params.threadId;

        console.log(`New message created: ${snap.id} in thread ${threadId} by ${senderId}`);

        try {
            // 1. Fetch parent thread details to get recipient
            const db = admin.firestore();
            const threadRef = db.doc(`threads/${threadId}`);
            const threadSnap = await threadRef.get();
            if (!threadSnap.exists) {
                console.log(`Thread ${threadId} not found.`);
                return;
            }
            const threadData = threadSnap.data();
            const participantIds = threadData.participantIds || [];
            
            // Recipient is the participant who is NOT the sender
            const recipientId = participantIds.find(id => id !== senderId);
            if (!recipientId) {
                console.log("No recipient found in thread.");
                return;
            }

            // 2. Fetch sender name dynamically from user document to support real-time name changes
            const senderRef = db.doc(`users/${senderId}`);
            const senderSnap = await senderRef.get();
            let senderName = "Someone";
            if (senderSnap.exists) {
                senderName = senderSnap.data().name || "Someone";
            } else {
                const senderInfo = threadData.participants?.[senderId] || {};
                senderName = senderInfo.name || "Someone";
            }

            // 3. Fetch recipient's push subscriptions
            const recipientRef = db.doc(`users/${recipientId}`);
            const recipientSnap = await recipientRef.get();
            if (!recipientSnap.exists) {
                console.log(`Recipient ${recipientId} user doc not found.`);
                return;
            }
            const recipientData = recipientSnap.data();
            
            // Check if notifications are disabled in user settings
            const notificationsEnabled = recipientData.settings?.notifications ?? true;
            if (!notificationsEnabled) {
                console.log(`Recipient ${recipientId} has disabled notifications.`);
                return;
            }

            const pushSubscriptions = recipientData.pushSubscriptions || [];
            const fcmTokens = recipientData.fcmTokens || [];
            if (pushSubscriptions.length === 0 && fcmTokens.length === 0) {
                console.log(`Recipient ${recipientId} has no active push subscriptions or FCM tokens.`);
                return;
            }

            // 4. Calculate unread thread badge count for recipient
            const unreadCount = await getRecipientBadgeCount(db, recipientId, threadId);

            // 5. Send Web Push notifications
            if (pushSubscriptions.length > 0) {
                console.log(`Sending Web Push notifications to ${pushSubscriptions.length} subscriptions for user ${recipientId}`);
                const payload = JSON.stringify({
                    title: senderName,
                    body: text,
                    url: `/inbox?id=${threadId}`,
                    tag: `msg-${threadId}`,
                    image: messageData.imageUrl || null,
                    badgeCount: unreadCount
                });

                const invalidSubscriptions = [];
                const sendPromises = pushSubscriptions.map(async (sub) => {
                    try {
                        await webpush.sendNotification(sub, payload);
                    } catch (err) {
                        console.error("Error sending Web Push notification:", err);
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            invalidSubscriptions.push(sub);
                        }
                    }
                });

                await Promise.all(sendPromises);

                if (invalidSubscriptions.length > 0) {
                    console.log(`Removing ${invalidSubscriptions.length} invalid Web Push subscriptions for user ${recipientId}`);
                    const updatedSubs = pushSubscriptions.filter(
                        sub => !invalidSubscriptions.some(inv => inv.endpoint === sub.endpoint)
                    );
                    await recipientRef.update({ pushSubscriptions: updatedSubs });
                }
            }

            // 6. Send FCM Native Push Notifications
            if (fcmTokens.length > 0) {
                console.log(`Sending FCM notifications to ${fcmTokens.length} devices for user ${recipientId}`);
                const message = {
                    notification: {
                        title: senderName,
                        body: text
                    },
                    data: {
                        url: `/inbox?id=${threadId}`,
                        tag: `msg-${threadId}`,
                        image: messageData.imageUrl || ""
                    },
                    apns: {
                        payload: {
                            aps: {
                                badge: unreadCount,
                                sound: "default"
                            }
                        }
                    },
                    tokens: fcmTokens
                };

                try {
                    const response = await admin.messaging().sendEachForMulticast(message);
                    const invalidTokens = [];
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            console.error(`FCM token send error:`, resp.error);
                            if (resp.error.code === "messaging/invalid-registration-token" ||
                                resp.error.code === "messaging/registration-token-not-registered") {
                                invalidTokens.push(fcmTokens[idx]);
                            }
                        }
                    });
                    if (invalidTokens.length > 0) {
                        console.log(`Removing ${invalidTokens.length} invalid FCM tokens for user ${recipientId}`);
                        await recipientRef.update({
                            fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
                        });
                    }
                } catch (fcmErr) {
                    console.error("Error sending FCM notification multicast:", fcmErr);
                }
            }
        } catch (err) {
            console.error("Fatal error in onNewMessageSendPush trigger:", err);
        }
    });

// ==========================================
// Incoming Call Push Notification Trigger
// ==========================================
exports.onCallCreated = functions.firestore
    .document("calls/{callId}")
    .onCreate(async (snap, context) => {
        const callData = snap.data();
        if (!callData) {
            console.log("No data in call document.");
            return;
        }

        // Only send notification for ringing calls
        if (callData.status !== "ringing") {
            return;
        }

        const calleeId = callData.calleeId;
        const callerName = callData.callerName || "Someone";
        const callType = callData.type === "video" ? "Video" : "Voice";
        const callId = context.params.callId;

        console.log(`New ${callType} call from ${callerName} to ${calleeId}`);

        try {
            const db = admin.firestore();
            const recipientRef = db.doc(`users/${calleeId}`);
            const recipientSnap = await recipientRef.get();
            if (!recipientSnap.exists) {
                console.log(`Callee ${calleeId} user doc not found.`);
                return;
            }
            const recipientData = recipientSnap.data();

            const notificationsEnabled = recipientData.settings?.notifications ?? true;
            if (!notificationsEnabled) {
                console.log(`Callee ${calleeId} has disabled notifications.`);
                return;
            }

            const pushSubscriptions = recipientData.pushSubscriptions || [];
            const fcmTokens = recipientData.fcmTokens || [];
            if (pushSubscriptions.length === 0 && fcmTokens.length === 0) {
                console.log(`Callee ${calleeId} has no active push subscriptions or FCM tokens.`);
                return;
            }

            // 4. Send Web Push call notifications
            if (pushSubscriptions.length > 0) {
                console.log(`Sending Web Push call notifications to ${pushSubscriptions.length} subscriptions for callee ${calleeId}`);
                const payload = JSON.stringify({
                    title: `Incoming ${callType} Call`,
                    body: `${callerName} is calling you`,
                    url: `/inbox`,
                    tag: `call-${callId}`
                });

                const invalidSubscriptions = [];
                const sendPromises = pushSubscriptions.map(async (sub) => {
                    try {
                        await webpush.sendNotification(sub, payload);
                    } catch (err) {
                        console.error("Error sending Web Push call notification:", err);
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            invalidSubscriptions.push(sub);
                        }
                    }
                });

                await Promise.all(sendPromises);

                if (invalidSubscriptions.length > 0) {
                    console.log(`Removing ${invalidSubscriptions.length} invalid Web Push subscriptions for callee ${calleeId}`);
                    const updatedSubs = pushSubscriptions.filter(
                        sub => !invalidSubscriptions.some(inv => inv.endpoint === sub.endpoint)
                    );
                    await recipientRef.update({ pushSubscriptions: updatedSubs });
                }
            }

            // 5. Send FCM call notifications
            if (fcmTokens.length > 0) {
                console.log(`Sending FCM call notifications to ${fcmTokens.length} devices for callee ${calleeId}`);
                const unreadBadge = await getRecipientBadgeCount(db, calleeId);
                const message = {
                    notification: {
                        title: `Incoming ${callType} Call`,
                        body: `${callerName} is calling you`
                    },
                    data: {
                        url: `/inbox`,
                        tag: `call-${callId}`
                    },
                    apns: {
                        payload: {
                            aps: {
                                badge: unreadBadge,
                                sound: "default"
                            }
                        }
                    },
                    tokens: fcmTokens
                };

                try {
                    const response = await admin.messaging().sendEachForMulticast(message);
                    const invalidTokens = [];
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            console.error("FCM call token send error:", resp.error);
                            if (resp.error.code === "messaging/invalid-registration-token" ||
                                resp.error.code === "messaging/registration-token-not-registered") {
                                invalidTokens.push(fcmTokens[idx]);
                            }
                        }
                    });
                    if (invalidTokens.length > 0) {
                        console.log(`Removing ${invalidTokens.length} invalid FCM tokens for callee ${calleeId}`);
                        await recipientRef.update({
                            fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
                        });
                    }
                } catch (fcmErr) {
                    console.error("Error sending FCM call notification multicast:", fcmErr);
                }
            }
        } catch (err) {
            console.error("Fatal error in onCallCreated trigger:", err);
        }
    });

// ==========================================
// Generate QR Login Token Function
// ==========================================
exports.generateQRLoginToken = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const { sessionId } = req.body || {};
        const authHeader = req.headers.authorization;

        if (!sessionId) {
            res.status(400).json({ error: "Missing sessionId" });
            return;
        }

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ error: "Unauthorized: No token provided" });
            return;
        }

        const idToken = authHeader.split("Bearer ")[1];
        
        // Verify the ID Token from the phone
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Generate Custom Token
        const customToken = await admin.auth().createCustomToken(uid);

        // Update the session in Firestore
        const db = admin.firestore();
        await db.collection("qr_sessions").doc(sessionId).set({
            status: "authenticated",
            uid: uid,
            customToken: customToken,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Error in generateQRLoginToken:", err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// Admin Backend API System (Express App)
// ==========================================
const express = require("express");
const adminApp = express();

// Apply CORS middleware
adminApp.use((req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    next();
});

// JSON parser
adminApp.use(express.json());

// Load Admin Backend Routes under /api/v1/admin prefix
const adminRoutes = require("./admin_backend/routes/admin");
adminApp.use("/api/v1/admin", adminRoutes);

// Export HTTPS Cloud Function
exports.adminApi = functions.https.onRequest(adminApp);

// ==========================================
// Cleanup Firestore data on Auth User Deletion
// ==========================================
exports.onUserAuthDeleted = functions.auth.user().onDelete(async (user) => {
    const uid = user.uid;
    const db = admin.firestore();
    console.log(`[Auth Trigger] User deleted from Auth: ${uid}. Cleaning up Firestore records...`);
    try {
        await db.doc(`users/${uid}`).delete();
        console.log(`Successfully deleted users/${uid} document.`);
    } catch (err) {
        console.error(`Failed to delete user document for ${uid}:`, err);
    }
});

// ==========================================
// Configure Firebase Storage CORS One-time Trigger
// ==========================================
exports.configureStorageCors = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    try {
        const bucket = admin.storage().bucket();
        await bucket.setCorsConfiguration([
            {
                maxAgeSeconds: 3600,
                method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
                origin: ['*'],
                responseHeader: ['*']
            }
        ]);
        res.status(200).send("CORS configured successfully on default Firebase Storage bucket.");
    } catch (err) {
        console.error("Failed to configure Storage CORS:", err);
        res.status(500).send("Failed to configure Storage CORS: " + err.message);
    }
});

