
const express = require("express");

const {
     showDashboard,
    showProfile,
    showTimetable,
    showFees,
    showLostFound,
    submitLostFound

} = require("../controllers/studentController");

const {
    showStudentGroupLinks
} = require("../controllers/groupLinkController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();


// Student Dashboard
router.get(
    "/student/dashboard",
    requireAuth,
    requireRole("student"),
    showDashboard
);


// Student Profile
router.get(
    "/student/profile",
    requireAuth,
    requireRole("student"),
    showProfile
);

// Student Timetable

router.get(
    "/student/timetable",
    requireAuth,
    requireRole("student"),
    showTimetable
);


router.get(
    "/student/fees",
    requireAuth,
    requireRole("student"),
    showFees
);

router.get(
    "/student/group-links",
    requireAuth,
    requireRole("student"),
    showStudentGroupLinks
);

// Student Lost & Found - Report Lost Item
router.get(
    "/student/lost-found",
    requireAuth,
    requireRole("student"),
    showLostFound
);

router.post(
    "/student/lost-found",
    requireAuth,
    requireRole("student"),
    submitLostFound
);


module.exports = router;
