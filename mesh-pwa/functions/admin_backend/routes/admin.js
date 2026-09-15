const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/auth");
const adminController = require("../controllers/admin");

// Health check does not strictly require auth for uptime monitoring systems
router.get("/health", adminController.systemHealth);

// All other endpoints are strictly protected by authentication
router.use(adminAuth);

router.post("/login", adminController.adminLogin);
router.get("/users", adminController.userLookup);
router.post("/users/:uid/ban", adminController.banUser);
router.get("/incidents", adminController.viewIncidents);
router.post("/incidents/:id/resolve", adminController.resolveIncident);

module.exports = router;
