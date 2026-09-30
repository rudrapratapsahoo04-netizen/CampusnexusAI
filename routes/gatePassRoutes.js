const express = require("express");

const {
    showGatePassForm,
    submitGatePass,
    showMyGatePasses,
    showAdminGatePass,
    approveGatePass,
    rejectGatePass,
    generateGatePassQR,
    showGatePassQR
} = require("../controllers/gatePassController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();

// ==========================================
// STUDENT - APPLY GATE PASS
// ==========================================

router.get(
    "/student/gate-pass",
    requireAuth,
    requireRole("student"),
    showGatePassForm
);

router.get(
    "/student/gate-pass/apply",
    requireAuth,
    requireRole("student"),
    showGatePassForm
);

// ==========================================
// STUDENT - GENERATE QR
// ==========================================

console.log(
    "REGISTERING QR ROUTE: POST /student/gate-pass/:id/generate-qr"
);


router.post(
    "/student/gate-pass/:id/generate-qr",
    requireAuth,
    requireRole("student"),
    (req, res, next) => {
        console.log("=================================");
        console.log("QR POST ROUTE HIT");
        console.log("METHOD:", req.method);
        console.log("URL:", req.originalUrl);
        console.log("PARAMS:", req.params);
        console.log("USER:", req.session.user);
        console.log("=================================");

        return generateGatePassQR(req, res, next);
    }
);


// ==========================================
// STUDENT - SUBMIT GATE PASS
// ==========================================

router.post(
    "/student/gate-pass/apply",
    requireAuth,
    requireRole("student"),
    submitGatePass
);

// ==========================================
// STUDENT - MY GATE PASSES
// ==========================================

router.get(
    "/student/gate-passes",
    requireAuth,
    requireRole("student"),
    showMyGatePasses
);

router.get( "/student/gate-pass/:id/qr", 
    requireAuth, 
    requireRole("student"),
     showGatePassQR 
    );

// ==========================================
// ADMIN - GATE PASS MANAGEMENT
// ==========================================

router.get(
    "/admin/gate-pass",
    requireAuth,
    requireRole("admin"),
    showAdminGatePass
);

// ==========================================
// ADMIN - APPROVE
// ==========================================

router.post(
    "/admin/gate-pass/:id/approve",
    requireAuth,
    requireRole("admin"),
    approveGatePass
);

// ==========================================
// ADMIN - REJECT
// ==========================================

router.post(
    "/admin/gate-pass/:id/reject",
    requireAuth,
    requireRole("admin"),
    rejectGatePass
);

module.exports = router;