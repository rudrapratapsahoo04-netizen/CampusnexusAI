
const express = require("express");

const {
    requireAuth
} = require("../middleware/auth");

const router = express.Router();


// ==========================================
// Common Dashboard Redirect
// ==========================================

router.get(
    "/dashboard",
    requireAuth,
    (req, res) => {

        const role = req.session.user.role;


        if (role === "student") {
            return res.redirect(
                "/student/dashboard"
            );
        }


        if (role === "faculty") {
            return res.redirect(
                "/faculty/dashboard"
            );
        }


        if (role === "admin") {
            return res.redirect(
                "/admin/dashboard"
            );
        }


        return res.status(403).render("error", {
            title: "Access Denied",
            message: "Invalid user role."
        });
    }
);


module.exports = router;
