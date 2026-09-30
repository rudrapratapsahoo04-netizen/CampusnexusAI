const GatePass = require("../models/GatePass");
const StudentProfile = require("../models/StudentProfile");
const crypto = require("crypto");
const QRCode = require("qrcode");

// ==========================================
// SHOW GATE PASS FORM
// ==========================================

const showGatePassForm = async (req, res, next) => {
    try {
        const userId = req.session.user.id;

        const studentProfile =
            await StudentProfile.findOne({
                user: userId
            }).lean();

        if (!studentProfile) {
            return res.status(404).render("error", {
                title: "Profile Not Found",
                statusCode: 404,
                message:
                    "Student profile was not found. Please contact the administrator.",
                currentUser:
                    req.session.user || null
            });
        }

        return res.render(
            "student/gate-pass-form",
            {
                title: "Apply Gate Pass",
                studentProfile
            }
        );
    } catch (error) {
        console.error(
            "Show gate pass form error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// SUBMIT GATE PASS
// ==========================================

const submitGatePass = async (
    req,
    res,
    next
) => {
    try {
        const userId = req.session.user.id;

        const {
            passType,
            exitDate,
            expectedExitTime,
            expectedReturnTime,
            destination,
            reason,
            emergencyContact,
            additionalRemarks
        } = req.body;


        // --------------------------------------
        // Basic validation
        // --------------------------------------

        if (
            !passType ||
            !exitDate ||
            !expectedExitTime ||
            !expectedReturnTime ||
            !destination ||
            !reason ||
            !emergencyContact
        ) {
            req.flash(
                "error",
                "Please fill all required gate pass fields."
            );

            return res.redirect(
                "/student/gate-pass/apply"
            );
        }


        // --------------------------------------
        // Validate emergency contact
        // --------------------------------------

        if (
            !/^[0-9]{10}$/.test(
                emergencyContact.trim()
            )
        ) {
            req.flash(
                "error",
                "Please enter a valid 10-digit emergency contact number."
            );

            return res.redirect(
                "/student/gate-pass/apply"
            );
        }


        // --------------------------------------
        // Validate exit date
        // --------------------------------------

        const selectedDate =
            new Date(exitDate);

        if (
            Number.isNaN(
                selectedDate.getTime()
            )
        ) {
            req.flash(
                "error",
                "Invalid exit date."
            );

            return res.redirect(
                "/student/gate-pass/apply"
            );
        }


        // --------------------------------------
        // Find student profile
        // --------------------------------------

        const studentProfile =
            await StudentProfile.findOne({
                user: userId
            });

        if (!studentProfile) {
            req.flash(
                "error",
                "Student profile was not found."
            );

            return res.redirect(
                "/student/dashboard"
            );
        }


        // --------------------------------------
        // Generate application number
        // --------------------------------------

        const applicationNumber =
            `CN-GP-${Date.now()}`;


        // --------------------------------------
        // Create gate pass
        // --------------------------------------

        const gatePass =
            await GatePass.create({
                student: userId,

                studentProfile:
                    studentProfile._id,

                studentId:
                    studentProfile.studentId,

                department:
                    studentProfile.department,

                program:
                    studentProfile.program,

                semester:
                    studentProfile.semester,

                section:
                    studentProfile.section,

                passType:
                    passType.trim(),

                exitDate:
                    selectedDate,

                expectedExitTime:
                    expectedExitTime.trim(),

                expectedReturnTime:
                    expectedReturnTime.trim(),

                destination:
                    destination.trim(),

                reason:
                    reason.trim(),

                emergencyContact:
                    emergencyContact.trim(),

                additionalRemarks:
                    additionalRemarks
                        ? additionalRemarks.trim()
                        : "",

                status: "pending",

                applicationNumber
            });


        console.log(
            "Gate pass created:",
            gatePass._id
        );


        req.flash(
            "success",
            "Gate pass application submitted successfully."
        );


        return res.redirect(
            "/student/gate-passes"
        );

    } catch (error) {
        console.error(
            "Submit gate pass error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// MY GATE PASSES
// ==========================================


const showMyGatePasses = async (
    req,
    res,
    next
) => {
    try {
        const userId = req.session.user.id;

        const gatePasses =
            await GatePass.find({
                student: userId
            })
                .select("+qrToken")
                .sort({
                    createdAt: -1
                })
                .lean();

        return res.render(
            "student/my-gate-passes",
            {
                title: "My Gate Passes",
                gatePasses
            }
        );

    } catch (error) {
        console.error(
            "Show my gate passes error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// ADMIN - SHOW GATE PASS REQUESTS
// ==========================================

const showAdminGatePass = async (
    req,
    res,
    next
) => {
    try {
        const {
            status = "all",
            department = "",
            program = "",
            passType = ""
        } = req.query;

        const filter = {};

        // --------------------------------------
        // STATUS FILTER
        // --------------------------------------

        if (status !== "all") {
            filter.status = status;
        }

        // --------------------------------------
        // DEPARTMENT FILTER
        // --------------------------------------

        if (department) {
            filter.department =
                department.toLowerCase();
        }

        // --------------------------------------
        // PROGRAM FILTER
        // --------------------------------------

        if (program) {
            filter.program =
                program.toLowerCase();
        }

        // --------------------------------------
        // PASS TYPE FILTER
        // --------------------------------------

        if (passType) {
            filter.passType = passType;
        }

        // --------------------------------------
        // GET GATE PASSES
        // --------------------------------------

        const gatePasses =
            await GatePass.find(filter)
                .populate(
                    "student",
                    "name email"
                )
                .populate(
                    "studentProfile"
                )
                .sort({
                    createdAt: -1
                })
                .lean();

        // --------------------------------------
        // FILTER OPTIONS
        // --------------------------------------

        const departments =
            await GatePass.distinct(
                "department"
            );

        const programs =
            await GatePass.distinct(
                "program"
            );

        // --------------------------------------
        // SUMMARY
        // --------------------------------------

        const total =
            await GatePass.countDocuments({});

        const pending =
            await GatePass.countDocuments({
                status: "pending"
            });

        const approved =
            await GatePass.countDocuments({
                status: "approved"
            });

        const rejected =
            await GatePass.countDocuments({
                status: "rejected"
            });

        const used =
            await GatePass.countDocuments({
                status: "used"
            });

        const cancelled =
            await GatePass.countDocuments({
                status: "cancelled"
            });

        return res.render(
            "admin/gate-pass",
            {
                title: "Gate Pass Management",

                gatePasses,

                departments:
                    departments.filter(Boolean),

                programs:
                    programs.filter(Boolean),

                filters: {
                    status,
                    department,
                    program,
                    passType
                },

                summary: {
                    total,
                    pending,
                    approved,
                    rejected,
                    used,
                    cancelled
                }
            }
        );
    } catch (error) {
        console.error(
            "Show admin gate pass error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// ADMIN - APPROVE GATE PASS
// ==========================================

const approveGatePass = async (
    req,
    res,
    next
) => {
    try {
        const { id } = req.params;

        const gatePass =
            await GatePass.findById(id);

        if (!gatePass) {
            req.flash(
                "error",
                "Gate pass request not found."
            );

            return res.redirect(
                "/admin/gate-pass"
            );
        }

        // --------------------------------------
        // ONLY PENDING CAN BE APPROVED
        // --------------------------------------

        if (
            gatePass.status !==
            "pending"
        ) {
            req.flash(
                "error",
                "Only pending gate pass requests can be approved."
            );

            return res.redirect(
                "/admin/gate-pass"
            );
        }

        // --------------------------------------
        // APPROVE
        // --------------------------------------

        gatePass.status = "approved";

        /*
         * Admin login in this project uses
         * a session id like "admin", which is
         * not a MongoDB ObjectId.
         *
         * Therefore approvedBy is kept null
         * instead of causing an ObjectId cast
         * error.
         */
        gatePass.approvedBy = null;

        gatePass.approvedAt = new Date();

        await gatePass.save();

        req.flash(
            "success",
            "Gate pass approved successfully."
        );

        return res.redirect(
            "/admin/gate-pass"
        );
    } catch (error) {
        console.error(
            "Approve gate pass error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// ADMIN - REJECT GATE PASS
// ==========================================

const rejectGatePass = async (
    req,
    res,
    next
) => {
    try {
        const { id } = req.params;

        const gatePass =
            await GatePass.findById(id);

        if (!gatePass) {
            req.flash(
                "error",
                "Gate pass request not found."
            );

            return res.redirect(
                "/admin/gate-pass"
            );
        }

        // --------------------------------------
        // ONLY PENDING CAN BE REJECTED
        // --------------------------------------

        if (
            gatePass.status !==
            "pending"
        ) {
            req.flash(
                "error",
                "Only pending gate pass requests can be rejected."
            );

            return res.redirect(
                "/admin/gate-pass"
            );
        }

        // --------------------------------------
        // REJECT
        // --------------------------------------

        gatePass.status = "rejected";

        /*
         * Same reason as approvedBy:
         * current .env admin session id
         * is not a MongoDB ObjectId.
         */
        gatePass.rejectedBy = null;

        gatePass.rejectedAt = new Date();

        await gatePass.save();

        req.flash(
            "success",
            "Gate pass rejected successfully."
        );

        return res.redirect(
            "/admin/gate-pass"
        );
    } catch (error) {
        console.error(
            "Reject gate pass error:",
            error
        );

        return next(error);
    }
};



const generateGatePassQR = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const gatePassId = req.params.id;

        console.log("=================================");
        console.log("GENERATE GATE PASS QR CONTROLLER HIT");
        console.log("User ID:", userId);
        console.log("Gate Pass ID:", gatePassId);
        console.log("=================================");

        const gatePass = await GatePass
            .findOne({
                _id: gatePassId,
                student: userId
            })
            .select("+qrToken");

        console.log("Gate Pass Result:", gatePass);

        if (!gatePass) {
            console.log("❌ GATE PASS NOT FOUND");

            req.flash(
                "error",
                "Gate pass not found."
            );

            return res.redirect(
                "/student/gate-passes"
            );
        }

        console.log(
            "Gate Pass Found:",
            gatePass._id.toString()
        );

        console.log(
            "Gate Pass Status:",
            gatePass.status
        );

        console.log(
            "Existing QR Token:",
            gatePass.qrToken
        );

        if (gatePass.status !== "approved") {
            console.log(
                "❌ QR BLOCKED: STATUS IS NOT APPROVED"
            );

            req.flash(
                "error",
                "QR can only be generated for an approved gate pass."
            );

            return res.redirect(
                "/student/gate-passes"
            );
        }

        if (gatePass.qrToken) {
            console.log(
                "⚠️ QR TOKEN ALREADY EXISTS"
            );

            req.flash(
                "success",
                "QR code has already been generated."
            );

            return res.redirect(
                "/student/gate-passes"
            );
        }

        const qrToken =
            crypto.randomBytes(32).toString("hex");

        console.log(
            "New QR Token Generated:",
            qrToken
        );

        gatePass.qrToken = qrToken;
        gatePass.qrGeneratedAt = new Date();

        console.log(
            "Saving Gate Pass..."
        );

        await gatePass.save();

        console.log(
            "✅ QR TOKEN SAVED SUCCESSFULLY"
        );

        console.log(
            "Saved QR Token:",
            gatePass.qrToken
        );

        console.log(
            "QR Generated At:",
            gatePass.qrGeneratedAt
        );

        req.flash(
            "success",
            "Gate pass QR generated successfully."
        );

        return res.redirect(
            "/student/gate-passes"
        );

    } catch (error) {

        console.error(
            "❌ Generate Gate Pass QR Error:"
        );

        console.error(error);

        req.flash(
            "error",
            "Unable to generate gate pass QR."
        );

        return res.redirect(
            "/student/gate-passes"
        );
    }
};



const showGatePassQR = async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        const gatePassId = req.params.id;

        const gatePass = await GatePass
            .findOne({
                _id: gatePassId,
                student: userId
            })
            .select("+qrToken")
            .lean();

        if (!gatePass) {
            req.flash(
                "error",
                "Gate pass not found."
            );

            return res.redirect(
                "/student/gate-passes"
            );
        }

        if (gatePass.status !== "approved") {
            req.flash(
                "error",
                "QR is available only for approved gate passes."
            );

            return res.redirect(
                "/student/gate-passes"
            );
        }

        if (!gatePass.qrToken) {
            req.flash(
                "error",
                "QR code has not been generated yet."
            );

            return res.redirect(
                "/student/gate-passes"
            );
        }

        const qrData = JSON.stringify({
            type: "campus_gate_pass",
            gatePassId: gatePass._id.toString(),
            applicationNumber:
                gatePass.applicationNumber || null,
            token: gatePass.qrToken
        });

        const qrImage =
            await QRCode.toDataURL(qrData, {
                errorCorrectionLevel: "H",
                width: 320,
                margin: 2
            });

        return res.render(
            "student/gate-pass-qr",
            {
                title: "Gate Pass QR",
                gatePass,
                qrImage
            }
        );

    } catch (error) {
        console.error(
            "Show Gate Pass QR Error:",
            error
        );

        return next(error);
    }
};





        


module.exports = {
    showGatePassForm,
    submitGatePass,
    showMyGatePasses,

    showAdminGatePass,
    approveGatePass,
    rejectGatePass,

    generateGatePassQR,
    showGatePassQR
};