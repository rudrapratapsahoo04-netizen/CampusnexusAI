
const express = require("express");

const {
    showFacultyNotices,
    publishFacultyNotice,
    deactivateFacultyNotice
} = require("../controllers/facultyNoticeController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();


/*
|--------------------------------------------------------------------------
| Faculty Notices
|--------------------------------------------------------------------------
*/

router.get(
    "/notices",
    requireAuth,
    requireRole("faculty"),
    showFacultyNotices
);


/*
|--------------------------------------------------------------------------
| Publish Notice
|--------------------------------------------------------------------------
*/

router.post(
    "/notices/publish",
    requireAuth,
    requireRole("faculty"),
    publishFacultyNotice
);


/*
|--------------------------------------------------------------------------
| Deactivate Notice
|--------------------------------------------------------------------------
*/

router.post(
    "/notices/:id/deactivate",
    requireAuth,
    requireRole("faculty"),
    deactivateFacultyNotice
);


module.exports = router;
