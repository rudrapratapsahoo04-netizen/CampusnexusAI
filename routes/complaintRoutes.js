const express = require("express");

const {
    showComplaintForm,
    submitComplaint,
    showMyComplaints,
    showAdminComplaints,
     updateComplaintStatus,
      assignComplaint
} = require("../controllers/complaintController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();


// Submit complaint form
router.get(
    "/student/complaint/apply",
    requireAuth,
    requireRole("student"),
    showComplaintForm
);


// Submit complaint
router.post(
    "/student/complaint/apply",
    requireAuth,
    requireRole("student"),
    submitComplaint
);


// My complaints
router.get(
    "/student/complaints",
    requireAuth,
    requireRole("student"),
    showMyComplaints
);
// ======================================== // ADMIN COMPLAINT MANAGEMENT // ========================================

router.get( "/admin/complaints", requireAuth, requireRole("admin"), showAdminComplaints );

router.post( "/admin/complaints/:id/status", requireAuth, requireRole("admin"), updateComplaintStatus );

router.post( "/admin/complaints/:id/assign", requireAuth, requireRole("admin"), assignComplaint );

module.exports = router;