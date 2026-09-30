const FacultyLeave = require("../models/FacultyLeave");

// ==========================================
// FACULTY LEAVE PAGE
// ==========================================

const showFacultyLeave = async (req, res, next) => {
    try {
        const facultyId = req.session.user?._id;


        const currentYear = new Date().getFullYear();

        // ------------------------------------------
        // Get current year's leave applications
        // ------------------------------------------

        const leaves = await FacultyLeave.find({
            faculty: facultyId,
            startDate: {
                $gte: new Date(`${currentYear}-01-01`)
            },
            endDate: {
                $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`)
            }
        })
            .sort({ createdAt: -1 })
            .lean();

        // ------------------------------------------
        // Calculate approved leave
        // ------------------------------------------

        const usedDays = leaves
            .filter((leave) => leave.status === "approved")
            .reduce(
                (total, leave) =>
                    total + Number(leave.totalDays || 0),
                0
            );

        const pendingDays = leaves
            .filter((leave) => leave.status === "pending")
            .reduce(
                (total, leave) =>
                    total + Number(leave.totalDays || 0),
                0
            );

        const annualLimit = 20;

        const remainingDays = Math.max(
            annualLimit - usedDays,
            0
        );

        res.render("faculty/leave", {
            title: "Faculty Leave",

            leaves,

            leaveBalance: {
                annualLimit,
                usedDays,
                pendingDays,
                remainingDays
            },

            currentYear
        });

    } catch (error) {
        console.error(
            "Faculty Leave Page Error:",
            error
        );

        next(error);
    }
};


// ==========================================
// APPLY FACULTY LEAVE
// ==========================================

const applyFacultyLeave = async (req, res, next) => {
    try {
        const facultyId = req.session.user?._id;
        const facultyName = req.session.user?.name;

        if (!facultyId) {
            return res.redirect("/login");
        }

        const {
            leaveType,
            startDate,
            endDate,
            reason
        } = req.body;

        if (
            !leaveType ||
            !startDate ||
            !endDate ||
            !reason
        ) {
            req.flash(
                "error",
                "Please fill all required fields."
            );

            return res.redirect("/faculty/leave");
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())
        ) {
            req.flash(
                "error",
                "Invalid leave dates."
            );

            return res.redirect("/faculty/leave");
        }

        if (end < start) {
            req.flash(
                "error",
                "End date cannot be before start date."
            );

            return res.redirect("/faculty/leave");
        }

        // ------------------------------------------
        // Calculate total days
        // ------------------------------------------

        const millisecondsPerDay =
            1000 * 60 * 60 * 24;

        const totalDays =
            Math.floor(
                (end - start) / millisecondsPerDay
            ) + 1;

        // ------------------------------------------
        // Annual 20-day limit
        // ------------------------------------------

        const year = start.getFullYear();

        const yearStart =
            new Date(`${year}-01-01`);

        const yearEnd =
            new Date(
                `${year}-12-31T23:59:59.999Z`
            );

        const approvedLeaves =
            await FacultyLeave.find({
                faculty: facultyId,
                status: "approved",
                startDate: {
                    $gte: yearStart
                },
                endDate: {
                    $lte: yearEnd
                }
            }).lean();

        const usedDays = approvedLeaves.reduce(
            (total, leave) =>
                total + Number(leave.totalDays || 0),
            0
        );

        if (usedDays + totalDays > 20) {
            req.flash(
                "error",
                `Leave limit exceeded. You have only ${
                    Math.max(20 - usedDays, 0)
                } day(s) remaining.`
            );

            return res.redirect("/faculty/leave");
        }

        // ------------------------------------------
        // Prevent overlapping pending/approved leave
        // ------------------------------------------

        const overlappingLeave =
            await FacultyLeave.findOne({
                faculty: facultyId,

                status: {
                    $in: ["pending", "approved"]
                },

                startDate: {
                    $lte: end
                },

                endDate: {
                    $gte: start
                }
            });

        if (overlappingLeave) {
            req.flash(
                "error",
                "You already have a leave request for these dates."
            );

            return res.redirect("/faculty/leave");
        }

        // ------------------------------------------
        // Create leave request
        // ------------------------------------------

        await FacultyLeave.create({
            faculty: facultyId,
            facultyName,
            leaveType,
            startDate: start,
            endDate: end,
            totalDays,
            reason
        });

        req.flash(
            "success",
            "Leave application submitted successfully."
        );

        res.redirect("/faculty/leave");

    } catch (error) {
        console.error(
            "Apply Faculty Leave Error:",
            error
        );

        next(error);
    }
};


// ==========================================
// CANCEL FACULTY LEAVE
// ==========================================

const cancelFacultyLeave = async (
    req,
    res,
    next
) => {
    try {
        const facultyId = req.session.user?._id;
        const leaveId = req.params.id;

        const leave =
            await FacultyLeave.findOne({
                _id: leaveId,
                faculty: facultyId
            });

        if (!leave) {
            req.flash(
                "error",
                "Leave application not found."
            );

            return res.redirect("/faculty/leave");
        }

        if (leave.status !== "pending") {
            req.flash(
                "error",
                "Only pending leave applications can be cancelled."
            );

            return res.redirect("/faculty/leave");
        }

        leave.status = "cancelled";

        await leave.save();

        req.flash(
            "success",
            "Leave application cancelled."
        );

        res.redirect("/faculty/leave");

    } catch (error) {
        console.error(
            "Cancel Faculty Leave Error:",
            error
        );

        next(error);
    }
};


module.exports = {
    showFacultyLeave,
    applyFacultyLeave,
    cancelFacultyLeave
};