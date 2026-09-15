const admin = require("firebase-admin");

/**
 * Automatically creates an audit log entry for admin actions.
 */
async function createAuditLog(adminInfo, action, targetId, details) {
    const db = admin.firestore();
    const logRef = db.collection("audit_logs").doc();
    const timestamp = new Date().toISOString();
    
    const detailsStr = typeof details === "string" ? details : JSON.stringify(details);

    const logEntry = {
        id: logRef.id,
        // Backend keys
        adminId: adminInfo.uid,
        adminEmail: adminInfo.email,
        targetId: targetId || "",
        // Frontend keys
        actorId: adminInfo.uid,
        actorEmail: adminInfo.email,
        target: targetId || "",
        
        action: action,
        details: detailsStr,
        timestamp: timestamp
    };
    
    await logRef.set(logEntry);
    console.log(`[Audit Log] Admin ${adminInfo.email} performed ${action} on ${targetId}`);
    return logEntry;
}

/**
 * Searches and lists users with filters and sorting.
 */
async function searchUsers(filters = {}) {
    const db = admin.firestore();
    let query = db.collection("users");

    // Apply sorting
    const sortBy = filters.sortBy || "createdAt";
    const sortOrder = filters.sortOrder === "desc" ? "desc" : "asc";
    query = query.orderBy(sortBy, sortOrder);

    const snapshot = await query.get();
    let users = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        const detectedDevice = detectDeviceType(data);
        
        users.push({
            id: doc.id,
            name: data.name || "",
            email: data.email || "",
            phoneNumber: data.phoneNumber || "",
            createdAt: data.createdAt || "",
            moderationState: data.moderationState || "ACTIVE",
            deviceType: detectedDevice,
            avatar: data.avatar || null
        });
    });

    // Post-filter by registration date if requested (since Firestore can filter by ranges)
    if (filters.registeredAfter) {
        const afterDate = new Date(filters.registeredAfter);
        users = users.filter(u => u.createdAt && new Date(u.createdAt) >= afterDate);
    }
    if (filters.registeredBefore) {
        const beforeDate = new Date(filters.registeredBefore);
        users = users.filter(u => u.createdAt && new Date(u.createdAt) <= beforeDate);
    }

    // Filter by device type
    if (filters.deviceType) {
        const devFilter = filters.deviceType.toLowerCase();
        users = users.filter(u => u.deviceType.toLowerCase().includes(devFilter));
    }

    // Pagination/Limit
    if (filters.limit) {
        const limitNum = parseInt(filters.limit, 10);
        if (!isNaN(limitNum)) {
            users = users.slice(0, limitNum);
        }
    }

    return users;
}

function detectDeviceType(user) {
    if (user.pushSubscriptions && Array.isArray(user.pushSubscriptions)) {
        for (const sub of user.pushSubscriptions) {
            if (sub.endpoint) {
                if (sub.endpoint.includes("fcm.googleapis.com")) return "Android/Web";
                if (sub.endpoint.includes("apple.com") || sub.endpoint.includes("apns") || sub.endpoint.includes("apple-mobile")) return "iOS";
            }
        }
    }
    if (user.deviceType) return user.deviceType;
    return "Web";
}

/**
 * Bans or suspends a user, and revokes their Firebase Auth refresh tokens.
 */
async function banUser(adminInfo, targetUid, moderationState, reason) {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(targetUid);
    
    // Check if user exists
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        throw new Error(`User with ID ${targetUid} not found`);
    }

    // Update status in Firestore
    await userRef.update({
        moderationState: moderationState
    });

    // Revoke refresh tokens to sign user out immediately
    try {
        await admin.auth().revokeRefreshTokens(targetUid);
    } catch (authErr) {
        console.warn(`Could not revoke refresh tokens for user ${targetUid}:`, authErr);
    }

    // Write audit log
    await createAuditLog(adminInfo, "BAN_USER", targetUid, {
        moderationState: moderationState,
        reason: reason || "No reason provided"
    });

    return { success: true, targetUid, moderationState };
}

/**
 * Lists incident reports.
 */
async function listIncidentReports(statusFilter) {
    const db = admin.firestore();
    let query = db.collection("incident_reports");
    
    if (statusFilter) {
        query = query.where("status", "==", statusFilter);
    }
    
    const snapshot = await query.orderBy("createdAt", "desc").get();
    const reports = [];
    
    snapshot.forEach(doc => {
        reports.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    return reports;
}

/**
 * Resolves an incident report with admin notes.
 */
async function resolveIncidentReport(adminInfo, incidentId, adminNote) {
    const db = admin.firestore();
    const reportRef = db.collection("incident_reports").doc(incidentId);
    
    const reportSnap = await reportRef.get();
    if (!reportSnap.exists) {
        throw new Error(`Incident report with ID ${incidentId} not found`);
    }
    
    await reportRef.update({
        status: "RESOLVED",
        adminNote: adminNote || "",
        resolvedAt: new Date().toISOString(),
        resolvedBy: adminInfo.uid
    });
    
    // Write audit log
    await createAuditLog(adminInfo, "RESOLVE_INCIDENT", incidentId, {
        adminNote: adminNote || ""
    });
    
    return { success: true, incidentId };
}

/**
 * Checks Firebase/System health.
 */
async function getSystemHealth() {
    const db = admin.firestore();
    let dbStatus = "CONNECTED";
    try {
        // Quick verification read
        await db.collection("admin_users").limit(1).get();
    } catch (err) {
        console.error("Firestore health check failed:", err);
        dbStatus = "DISCONNECTED";
    }

    return {
        status: "OK",
        timestamp: new Date().toISOString(),
        uptimeSeconds: process.uptime(),
        memoryUsage: process.memoryUsage(),
        database: {
            status: dbStatus,
            projectId: admin.instanceId ? admin.instanceId().app.options.projectId : "unknown"
        }
    };
}

module.exports = {
    createAuditLog,
    searchUsers,
    banUser,
    listIncidentReports,
    resolveIncidentReport,
    getSystemHealth
};
