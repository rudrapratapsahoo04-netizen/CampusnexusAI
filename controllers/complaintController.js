const Complaint = require("../models/Complaint");
const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");

// ========================================
// SHOW COMPLAINT FORM
// ========================================
const showComplaintForm = async (req, res, next) => {
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
            "student/complaint-form",
            {
                title: "Submit Complaint",
                studentProfile
            }
        );
    } catch (error) {
        console.error(
            "Show complaint form error:",
            error
        );

        return next(error);
    }
};


// ========================================
// SUBMIT COMPLAINT
// ========================================
const submitComplaint = async (
    req,
    res,
    next
) => {
    try {
        const userId = req.session.user.id;

        const {
            category,
            subject,
            description,
            priority
        } = req.body;

        // --------------------------------
        // BASIC VALIDATION
        // --------------------------------
        if (
            !category ||
            !subject ||
            !description ||
            !priority
        ) {
            req.flash(
                "error",
                "Please fill all required complaint fields."
            );

            return res.redirect(
                "/student/complaint/apply"
            );
        }

        // --------------------------------
        // GET STUDENT PROFILE
        // --------------------------------
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

        // --------------------------------
        // CREATE COMPLAINT
        // --------------------------------
        const complaint =
            await Complaint.create({

                // Required by Complaint schema
                applicant: studentProfile._id,
                applicantType: "student",

                // Student information
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

                // Complaint information
                category:
                    category.trim(),

                subject:
                    subject.trim(),

                description:
                    description.trim(),

                priority:
                    priority.trim(),

                status:
                    "submitted"
            });

        console.log(
            "Complaint created:",
            complaint._id
        );

        req.flash(
            "success",
            "Your complaint has been submitted successfully."
        );

        return res.redirect(
            "/student/complaints"
        );

    } catch (error) {
        console.error(
            "Submit complaint error:",
            error
        );

        return next(error);
    }
};


// ========================================
// STUDENT COMPLAINT HISTORY
// ========================================
const showMyComplaints = async (
    req,
    res,
    next
) => {
    try {
        const userId = req.session.user.id;

        const complaints =
            await Complaint.find({
                student: userId
            })
                .sort({
                    createdAt: -1
                })
                .lean();

        return res.render(
            "student/my-complaints",
            {
                title: "My Complaints",
                complaints
            }
        );
    } catch (error) {
        console.error(
            "Show my complaints error:",
            error
        );

        return next(error);
    }
};





// ========================================
// ADMIN - SHOW ALL COMPLAINTS
// ========================================

const showAdminComplaints = async (
    req,
    res,
    next
) => {
    try {
        const complaints =
            await Complaint.find({})
                .populate(
                    "applicant",
                    "name email role"
                )
                .populate(
                    "studentProfile",
                    "studentId department program semester section"
                )
                .populate(
                    "assignedTo",
                    "name email role"
                )
                .populate(
                    "assignedBy",
                    "name email role"
                )
                .sort({
                    createdAt: -1
                })
                .lean();

        const admins =
            await User.find({
                role: "admin",
                isActive: true,
                isDeleted: false
            })
                .select("name email")
                .sort({
                    name: 1
                })
                .lean();

        return res.render(
            "admin/complaints",
            {
                title: "Complaint Management",
                complaints,
                admins
            }
        );

    } catch (error) {
        console.error(
            "Admin complaints error:",
            error
        );

        return next(error);
    }
};


// ========================================
// ADMIN - UPDATE COMPLAINT STATUS
// ========================================

const updateComplaintStatus = async (
    req,
    res,
    next
) => {
    try {
        const { id } = req.params;

        const {
            status,
            remarks
        } = req.body;

        const allowedStatuses = [
            "submitted",
            "under_review",
            "in_progress",
            "resolved",
            "rejected"
        ];

        if (
            !allowedStatuses.includes(
                status
            )
        ) {
            req.flash(
                "error",
                "Invalid complaint status."
            );

            return res.redirect(
                "/admin/complaints"
            );
        }

        const complaint =
            await Complaint.findById(id);

        if (!complaint) {
            req.flash(
                "error",
                "Complaint not found."
            );

            return res.redirect(
                "/admin/complaints"
            );
        }

        complaint.status = status;

        if (
            typeof remarks ===
            "string"
        ) {
            complaint.remarks =
                remarks.trim();
        }

        if (
            status === "resolved"
        ) {
            complaint.resolvedAt =
                new Date();
        } else {
            complaint.resolvedAt =
                null;
        }

        if (
            status === "rejected"
        ) {
            complaint.rejectedAt =
                new Date();
        } else {
            complaint.rejectedAt =
                null;
        }

        await complaint.save();

        req.flash(
            "success",
            "Complaint status updated successfully."
        );

        return res.redirect(
            "/admin/complaints"
        );

    } catch (error) {
        console.error(
            "Update complaint status error:",
            error
        );

        req.flash(
            "error",
            "Unable to update complaint status."
        );

        return res.redirect(
            "/admin/complaints"
        );
    }
};


// ========================================
// ADMIN - ASSIGN COMPLAINT
// ========================================

const assignComplaint = async (
    req,
    res,
    next
) => {
    try {
        const { id } = req.params;

        const {
            assignedTo
        } = req.body;

        if (!assignedTo) {
            req.flash(
                "error",
                "Please select an admin."
            );

            return res.redirect(
                "/admin/complaints"
            );
        }

        const complaint =
            await Complaint.findById(id);

        if (!complaint) {
            req.flash(
                "error",
                "Complaint not found."
            );

            return res.redirect(
                "/admin/complaints"
            );
        }

        const admin =
            await User.findOne({
                _id: assignedTo,
                role: "admin",
                isActive: true,
                isDeleted: false
            });

        if (!admin) {
            req.flash(
                "error",
                "Invalid admin selected."
            );

            return res.redirect(
                "/admin/complaints"
            );
        }

        complaint.assignedTo =
            admin._id;

        complaint.assignedBy =
            req.session.user.id;

        complaint.assignedAt =
            new Date();

        if (
            complaint.status ===
            "submitted"
        ) {
            complaint.status =
                "under_review";
        }

        await complaint.save();

        req.flash(
            "success",
            "Complaint assigned successfully."
        );

        return res.redirect(
            "/admin/complaints"
        );

    } catch (error) {
        console.error(
            "Assign complaint error:",
            error
        );

        req.flash(
            "error",
            "Unable to assign complaint."
        );

        return res.redirect(
            "/admin/complaints"
        );
    }
};






module.exports = {
    showComplaintForm,
    submitComplaint,
    showMyComplaints,
    showAdminComplaints,
    updateComplaintStatus,
    assignComplaint
};