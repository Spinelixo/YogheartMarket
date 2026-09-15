const admin = require("firebase-admin");

module.exports = async function adminAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: Missing or invalid token format" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;
        const db = admin.firestore();

        // 1. Check if user exists in admin_users collection
        let adminUserSnap = await db.collection("admin_users").doc(uid).get();
        let role = null;

        if (adminUserSnap.exists) {
            role = adminUserSnap.data().role;
        } else {
            // 2. Self-healing / Backwards compatibility check
            // If they have isAdmin: true on their user document, auto-promote them to SUPER_ADMIN
            const userSnap = await db.collection("users").doc(uid).get();
            if (userSnap.exists && userSnap.data().isAdmin === true) {
                role = "SUPER_ADMIN";
                await db.collection("admin_users").doc(uid).set({
                    role: "SUPER_ADMIN",
                    email: decodedToken.email || userSnap.data().email || "",
                    createdAt: new Date().toISOString()
                });
                console.log(`Auto-promoted user ${uid} to SUPER_ADMIN in admin_users`);
            }
        }

        if (!role) {
            return res.status(403).json({ error: "Forbidden: Access denied" });
        }

        // Attach admin details to request
        req.admin = {
            uid: uid,
            email: decodedToken.email || (adminUserSnap.exists ? adminUserSnap.data().email : "") || "",
            role: role
        };

        next();
    } catch (err) {
        console.error("Admin Auth Error:", err);
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
};
