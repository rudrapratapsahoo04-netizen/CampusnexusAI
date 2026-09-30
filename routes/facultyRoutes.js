const express = require("express");

const {
    showFacultyDashboard,
    showFacultyTimetable,
    showFacultyStudents,
    showFacultyProfile
} = require("../controllers/facultyController");

const {
    showCampusPresence
} = require("../controllers/facultyCampusPresenceController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();

// ==========================================
// FACULTY DASHBOARD
// ==========================================

router.get(
    "/dashboard",
    requireAuth,
    requireRole("faculty"),
    showFacultyDashboard
);

// ==========================================
// FACULTY PROFILE
// ==========================================

router.get(
    "/profile",
    requireAuth,
    requireRole("faculty"),
    showFacultyProfile
);

// ==========================================
// FACULTY TIMETABLE
// ==========================================

router.get(
    "/timetable",
    requireAuth,
    requireRole("faculty"),
    showFacultyTimetable
);

// ==========================================
// FACULTY STUDENTS
// ==========================================

router.get(
    "/students",
    requireAuth,
    requireRole("faculty"),
    showFacultyStudents
);

// Singular alias
router.get(
    "/student",
    requireAuth,
    requireRole("faculty"),
    showFacultyStudents
);

// ==========================================
// CAMPUS PRESENCE
// ==========================================

router.get(
    "/campus-presence",
    requireAuth,
    requireRole("faculty"),
    showCampusPresence
);

module.exports = router;