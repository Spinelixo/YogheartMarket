const adminService = require("../services/admin");

async function adminLogin(req, res) {
    try {
        // req.admin is populated by auth middleware
        res.status(200).json({
            status: "success",
            message: "Successfully logged in as administrator",
            admin: req.admin
        });
    } catch (err) {
        console.error("Login controller error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function userLookup(req, res) {
    try {
        const { sortBy, sortOrder, deviceType, registeredAfter, registeredBefore, limit } = req.query;
        const filters = { sortBy, sortOrder, deviceType, registeredAfter, registeredBefore, limit };
        
        const users = await adminService.searchUsers(filters);
        res.status(200).json({ users });
    } catch (err) {
        console.error("User lookup controller error:", err);
        res.status(500).json({ error: err.message || "Internal server error" });
    }
}

async function banUser(req, res) {
    try {
        const { uid } = req.params;
        const { moderationState, reason } = req.body;

        if (!uid) {
            return res.status(400).json({ error: "Missing required parameter: uid" });
        }

        if (!moderationState || !["SUSPENDED", "PERMANENTLY_BANNED", "ACTIVE"].includes(moderationState)) {
            return res.status(400).json({ 
                error: "Invalid or missing moderationState. Must be ACTIVE, SUSPENDED, or PERMANENTLY_BANNED" 
            });
        }

        const result = await adminService.banUser(req.admin, uid, moderationState, reason);
        res.status(200).json(result);
    } catch (err) {
        console.error("Ban user controller error:", err);
        res.status(500).json({ error: err.message || "Internal server error" });
    }
}

async function viewIncidents(req, res) {
    try {
        const { status } = req.query;
        const reports = await adminService.listIncidentReports(status);
        res.status(200).json({ reports });
    } catch (err) {
        console.error("View incidents controller error:", err);
        res.status(500).json({ error: err.message || "Internal server error" });
    }
}

async function resolveIncident(req, res) {
    try {
        const { id } = req.params;
        const { adminNote } = req.body;

        if (!id) {
            return res.status(400).json({ error: "Missing required parameter: id" });
        }

        const result = await adminService.resolveIncidentReport(req.admin, id, adminNote);
        res.status(200).json(result);
    } catch (err) {
        console.error("Resolve incident controller error:", err);
        res.status(500).json({ error: err.message || "Internal server error" });
    }
}

async function systemHealth(req, res) {
    try {
        const health = await adminService.getSystemHealth();
        res.status(200).json(health);
    } catch (err) {
        console.error("System health controller error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = {
    adminLogin,
    userLookup,
    banUser,
    viewIncidents,
    resolveIncident,
    systemHealth
};
