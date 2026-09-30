const express = require("express");

const {
    showTimetable
} = require("../controllers/timetableController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();

router.get(
    "/student/timetable",
    requireAuth,
    requireRole("student"),
    showTimetable
);

module.exports = router;