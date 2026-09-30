
const express = require("express");

const {
    showStudentNotices
} = require("../controllers/studentNoticeController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();


/*
|--------------------------------------------------------------------------
| Student Notices
|--------------------------------------------------------------------------
*/

router.get(
    "/notices",
    requireAuth,
    requireRole("student"),
    showStudentNotices
);


module.exports = router;
