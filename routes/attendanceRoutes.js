const express = require("express");

const {
    showAdminAttendance,
    createStudentAttendance,
    updateStudentAttendance,
    updateFacultyAttendance,
    showStudentAttendance,
    showFacultyAttendance
} = require("../controllers/attendanceController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();

// ==========================================
// ADMIN ATTENDANCE
// ==========================================

router.get(
    "/admin/attendance",
    requireAuth,
    requireRole("admin"),
    showAdminAttendance
);

router.post(
    "/admin/attendance/student/create",
    requireAuth,
    requireRole("admin"),
    createStudentAttendance
);

router.post(
    "/admin/attendance/student/:id",
    requireAuth,
    requireRole("admin"),
    updateStudentAttendance
);


router.post(
    "/admin/attendance/faculty/:id",
    requireAuth,
    requireRole("admin"),
    updateFacultyAttendance
);

// ==========================================
// STUDENT ATTENDANCE
// ==========================================

router.get(
    "/student/attendance",
    requireAuth,
    requireRole("student"),
    showStudentAttendance
);

// ==========================================
// FACULTY ATTENDANCE
// ==========================================

router.get(
    "/faculty/attendance",
    requireAuth,
    requireRole("faculty"),
    showFacultyAttendance
);



router.post(
    "/admin/attendance/student/create",
    requireAuth,
    requireRole("admin"),
    createStudentAttendance
);


module.exports = router;