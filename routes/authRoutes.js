const express = require("express");

const {
    showRegister,
    showStudentRegister,
    register,
    showFacultyRegister,
    registerFaculty,
    showWorkerRegister,
    registerWorker,

    showLogin,
    showRoleLogin,
    login,

    logout,

    showForgotPassword,
   


    
} = require("../controllers/authController");

const {
    requireGuest,
    requireAuth
} = require("../middleware/auth");

const router = express.Router();


// =====================================================
// REGISTRATION
// =====================================================

// Registration choice page
router.get(
    "/register",
    requireGuest,
    showRegister
);


// =====================================================
// STUDENT REGISTRATION
// =====================================================

// Student registration page
router.get(
    "/register/student",
    requireGuest,
    showStudentRegister
);

// Student registration submit
router.post(
    "/register/student",
    requireGuest,
    register
);


// =====================================================
// FACULTY REGISTRATION
// =====================================================

// Faculty registration page
router.get(
    "/register/faculty",
    requireGuest,
    showFacultyRegister
);

// Faculty registration submit
router.post(
    "/register/faculty",
    requireGuest,
    registerFaculty
);


// =====================================================
// WORKER REGISTRATION
// =====================================================

// Worker registration page
router.get(
    "/register/worker",
    requireGuest,
    showWorkerRegister
);

// Worker registration submit
router.post(
    "/register/worker",
    requireGuest,
    registerWorker
);


// =====================================================
// LOGIN PORTAL
// =====================================================

// GET /auth/login
// Shows:
// Student | Faculty | Administrator | Worker

router.get(
    "/login",
    requireGuest,
    showLogin
);


// =====================================================
// ROLE BASED LOGIN PAGES
// =====================================================

// GET /auth/login/student
// GET /auth/login/faculty
// GET /auth/login/admin
// GET /auth/login/worker

router.get(
    "/login/:role",
    requireGuest,
    showRoleLogin
);


// =====================================================
// LOGIN CREDENTIAL SUBMIT
// =====================================================

// POST /auth/login/student
// POST /auth/login/faculty
// POST /auth/login/admin
// POST /auth/login/worker
//
// Student:
// Email + Password -> Login OTP -> Dashboard
//
// Faculty:
// Email + Password -> Login OTP -> Dashboard
//
// Admin:
// Email + Password -> Direct Admin Dashboard
//
// Worker:
// Email + Password -> Direct Worker Dashboard
//
// Admin aur Worker ko login OTP nahi milega.

router.post(
    "/login/:role",
    requireGuest,
    login
);


// =====================================================
// LOGIN OTP VERIFICATION
// =====================================================
//
// IMPORTANT:
// Ye OTP routes Student aur Faculty ke liye hain.
//
// Admin aur Worker in routes ka use nahi karenge.
//
// Student / Faculty:
// Correct credentials
//        ↓
// Generate OTP
//        ↓
// Email OTP
//        ↓
// /auth/verify-login-otp
//        ↓
// Dashboard



// =====================================================
// FORGOT PASSWORD
// =====================================================



// =====================================================
// PASSWORD RESET OTP
// =====================================================



// =====================================================
// RESET PASSWORD
// =====================================================




// =====================================================
// LOGOUT
// =====================================================

router.post(
    "/logout",
    requireAuth,
    logout
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;