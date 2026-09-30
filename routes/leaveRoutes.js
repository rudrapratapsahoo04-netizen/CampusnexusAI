const express = require("express");

const {
    showLeaveForm,
    submitLeaveRequest,
    showMyLeaves,

    showFacultyLeaveForm,
    submitFacultyLeaveRequest,
    showFacultyLeaves,
    cancelFacultyLeave,

    showAdminLeave,
    approveLeave,
    rejectLeave
} = require("../controllers/leaveController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();


// ==========================================
// STUDENT
// ==========================================

router.get(
    "/student/leave/apply",
    requireAuth,
    requireRole("student"),
    showLeaveForm
);

router.post(
    "/student/leave/apply",
    requireAuth,
    requireRole("student"),
    submitLeaveRequest
);

router.get(
    "/student/leave",
    requireAuth,
    requireRole("student"),
    showMyLeaves
);


// ==========================================
// FACULTY
// ==========================================

router.get(
    "/faculty/leave/apply",
    requireAuth,
    requireRole("faculty"),
    showFacultyLeaveForm
);

router.post(
    "/faculty/leave/apply",
    requireAuth,
    requireRole("faculty"),
    submitFacultyLeaveRequest
);

router.get(
    "/faculty/leave",
    requireAuth,
    requireRole("faculty"),
    showFacultyLeaves
);

router.post(
    "/faculty/leave/cancel/:id",
    requireAuth,
    requireRole("faculty"),
    cancelFacultyLeave
);


// ==========================================
// ADMIN
// ==========================================

router.get(
    "/admin/leave",
    requireAuth,
    requireRole("admin"),
    showAdminLeave
);

router.post(
    "/admin/leave/:id/approve",
    requireAuth,
    requireRole("admin"),
    approveLeave
);

router.post(
    "/admin/leave/:id/reject",
    requireAuth,
    requireRole("admin"),
    rejectLeave
);


module.exports = router;