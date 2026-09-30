const express = require("express");

const {
    showFacultyLeave,
    applyFacultyLeave,
    cancelFacultyLeave
} = require("../controllers/facultyLeaveController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();

// ==========================================
// FACULTY LEAVE
// ==========================================

router.get(
    "/leave",
    requireAuth,
    requireRole("faculty"),
    showFacultyLeave
);

router.post(
    "/leave/apply",
    requireAuth,
    requireRole("faculty"),
    applyFacultyLeave
);

router.post(
    "/leave/cancel/:id",
    requireAuth,
    requireRole("faculty"),
    cancelFacultyLeave
);

module.exports = router;