const express = require("express");

const {
    showFacultyRequests,
    updateFacultyRequest
} = require("../controllers/facultyRequestController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();

// ==========================================
// FACULTY REQUESTS
// ==========================================

router.get(
    "/requests",
    requireAuth,
    requireRole("faculty"),
    showFacultyRequests
);

router.post(
    "/requests/:id/update",
    requireAuth,
    requireRole("faculty"),
    updateFacultyRequest
);

module.exports = router;