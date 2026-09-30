const express = require("express");

const {
    showMyAttendance,
    showAdminFacultyAttendance,
    saveAdminFacultyAttendance
} = require("../controllers/facultyAttendanceController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();

// ==========================================
// FACULTY ATTENDANCE
// ==========================================

// Faculty → My Attendance
router.get(
    "/faculty/my-attendance",
    requireAuth,
    requireRole("faculty"),
    showMyAttendance
);

// ==========================================
// ADMIN → FACULTY ATTENDANCE
// ==========================================

// Admin → View Faculty Attendance
router.get(
    "/admin/faculty-attendance",
    requireAuth,
    requireRole("admin"),
    showAdminFacultyAttendance
);

// Admin → Save Faculty Attendance
router.post(
    "/admin/faculty-attendance/save",
    requireAuth,
    requireRole("admin"),
    saveAdminFacultyAttendance
);

module.exports = router;