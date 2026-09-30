const express = require("express");

const {
    showCertificateForm,
    submitCertificateRequest,
    showMyCertificates,
    showAdminCertificates,
    reviewCertificateRequest,
    showCertificatePDF
} = require("../controllers/certificateController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();


// ==========================================
// APPLY FOR CERTIFICATE
// ==========================================

router.get(
    "/student/certificate/apply",
    requireAuth,
    requireRole("student"),
    showCertificateForm
);


router.post(
    "/student/certificate/apply",
    requireAuth,
    requireRole("student"),
    submitCertificateRequest
);


// ==========================================
// MY CERTIFICATES
// ==========================================

router.get(
    "/student/certificates",
    requireAuth,
    requireRole("student"),
    showMyCertificates
);



router.get( "/student/certificate/:id/pdf", requireAuth, requireRole("student"), showCertificatePDF );
// ========================================
// ADMIN CERTIFICATE MANAGEMENT
// ========================================

router.get(
    "/admin/certificates",
    requireAuth,
    requireRole("admin"),
    showAdminCertificates
);

router.post(
    "/admin/certificates/:id/review",
    requireAuth,
    requireRole("admin"),
    reviewCertificateRequest
);






module.exports = router;