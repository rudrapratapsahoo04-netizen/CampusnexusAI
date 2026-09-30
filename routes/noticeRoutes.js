
const express = require("express");

const { 
    showStudentNotices,
     showAdminNotices,
      createAdminNotice, 
      toggleAdminNoticeStatus,
       createFacultyNotice 
    } = require("../controllers/noticeController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| STUDENT NOTICES
|--------------------------------------------------------------------------
*/

router.get(
    "/student/notices",
    requireAuth,
    requireRole("student"),
    showStudentNotices
);

/*
|--------------------------------------------------------------------------
| ADMIN NOTICES
|--------------------------------------------------------------------------
*/

router.get(
    "/admin/notices",
    requireAuth,
    requireRole("admin"),
    showAdminNotices
);

router.post( 
    "/admin/notices/create",
     requireAuth, 
     requireRole("admin"),
      createAdminNotice
     );

router.post(
     "/admin/notices/:id/toggle-status", 
     requireAuth,
      requireRole("admin"),
       toggleAdminNoticeStatus 
    );


router.post( 
    "/faculty/notices/create", 
    requireAuth,
     requireRole("faculty"), 
     createFacultyNotice
     );

router.post(
    "/faculty/notices/publish",
    requireAuth,
    requireRole("faculty"),
    createFacultyNotice
);

module.exports = router;
