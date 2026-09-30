const express = require("express");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const {
    facultyAIChat
} = require("../controllers/facultyAIController");

const router = express.Router();

// ==========================================
// FACULTY LOCAL AI CHAT
// ==========================================

router.post(
    "/chat",
    requireAuth,
    requireRole("faculty"),
    facultyAIChat
);

module.exports = router;