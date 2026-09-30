const LeaveRequest = require("../models/LeaveRequest");
const StudentProfile = require("../models/StudentProfile");
const FacultyProfile = require("../models/FacultyProfile");


// ==========================================
// HELPERS
// ==========================================

const calculateTotalDays = (startDate, endDate) => {
    const difference =
        endDate.getTime() - startDate.getTime();

    return (
        Math.floor(
            difference / (1000 * 60 * 60 * 24)
        ) + 1
    );
};


const validateLeaveDates = (startDateValue, endDateValue) => {
    const startDate = new Date(startDateValue);
    const endDate = new Date(endDateValue);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
    ) {
        return {
            valid: false,
            message: "Invalid leave dates."
        };
    }

    if (endDate < startDate) {
        return {
            valid: false,
            message: "End date cannot be before start date."
        };
    }

    return {
        valid: true,
        startDate,
        endDate,
        totalDays: calculateTotalDays(
            startDate,
            endDate
        )
    };
};


// ==========================================
// STUDENT
// ==========================================

const showLeaveForm = async (req, res, next) => {
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

        return res.render("student/leave-form", {
            title: "Apply for Leave",
            studentProfile
        });
    } catch (error) {
        console.error(
            "Show leave form error:",
            error
        );

        return next(error);
    }
};


const submitLeaveRequest = async (
    req,
    res,
    next
) => {
    try {
        const userId = req.session.user.id;

        const {
            leaveType,
            fromDate,
            toDate,
            reason
        } = req.body;

        if (
            !leaveType ||
            !fromDate ||
            !toDate ||
            !reason
        ) {
            req.flash(
                "error",
                "Please fill all required leave fields."
            );

            return res.redirect(
                "/student/leave/apply"
            );
        }

        const dateValidation =
            validateLeaveDates(
                fromDate,
                toDate
            );

        if (!dateValidation.valid) {
            req.flash(
                "error",
                dateValidation.message
            );

            return res.redirect(
                "/student/leave/apply"
            );
        }

        const studentProfile =
            await StudentProfile.findOne({
                user: userId
            });

        if (!studentProfile) {
            req.flash(
                "error",
                "Student profile not found."
            );

            return res.redirect(
                "/student/dashboard"
            );
        }

        const leaveRequest =
            await LeaveRequest.create({
                applicantType: "student",
                applicant: userId,

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

                leaveType,

                fromDate:
                    dateValidation.startDate,
                toDate:
                    dateValidation.endDate,

                totalDays:
                    dateValidation.totalDays,

                reason: reason.trim(),

                status: "pending_admin"
            });

        console.log(
            "Student leave request created:",
            leaveRequest._id
        );

        req.flash(
            "success",
            "Leave request submitted successfully."
        );

        return res.redirect(
            "/student/leave"
        );
    } catch (error) {
        console.error(
            "Submit student leave error:",
            error
        );

        return next(error);
    }
};


const showMyLeaves = async (
    req,
    res,
    next
) => {
    try {
        const userId = req.session.user.id;

        const leaves =
            await LeaveRequest.find({
                $or: [
                    {
                        applicant: userId,
                        applicantType: "student"
                    },
                    {
                        student: userId
                    }
                ]
            })
                .sort({
                    createdAt: -1
                })
                .lean();

        return res.render(
            "student/my-leaves",
            {
                title: "My Leave Requests",
                leaves
            }
        );
    } catch (error) {
        console.error(
            "Show student leaves error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// FACULTY
// EXISTING faculty/leave.ejs IS USED
// ==========================================

const showFacultyLeaveForm = async (
    req,
    res,
    next
) => {
    try {
        const userId = req.session.user.id;

        const facultyProfile =
            await FacultyProfile.findOne({
                user: userId
            }).lean();

        if (!facultyProfile) {
            return res.status(404).render(
                "error",
                {
                    title:
                        "Faculty Profile Not Found",
                    statusCode: 404,
                    message:
                        "Faculty profile was not found. Please contact the administrator.",
                    currentUser:
                        req.session.user || null
                }
            );
        }

        const currentYear =
            new Date().getFullYear();

        // Approved faculty leave for current year
        const approvedLeaves =
            await LeaveRequest.find({
                applicant: userId,
                applicantType: "faculty",
                status: "approved",
                fromDate: {
                    $gte: new Date(
                        `${currentYear}-01-01T00:00:00.000Z`
                    ),
                    $lte: new Date(
                        `${currentYear}-12-31T23:59:59.999Z`
                    )
                }
            }).lean();

        const usedDays =
            approvedLeaves.reduce(
                (total, leave) =>
                    total + Number(
                        leave.totalDays || 0
                    ),
                0
            );

        const annualLimit = 20;

        const remainingDays =
            Math.max(
                annualLimit - usedDays,
                0
            );

        const rawLeaves =
            await LeaveRequest.find({
                applicant: userId,
                applicantType: "faculty"
            })
                .sort({
                    createdAt: -1
                })
                .lean();

        /*
         * Existing EJS expects:
         *
         * leave.startDate
         * leave.endDate
         * leave.status === "pending"
         *
         * Database stores:
         *
         * fromDate
         * toDate
         * pending_admin
         *
         * So we transform only the data sent
         * to the existing EJS.
         */
        const leaves =
            rawLeaves.map((leave) => ({
                ...leave,

                startDate:
                    leave.fromDate,

                endDate:
                    leave.toDate,

                status:
                    leave.status ===
                    "pending_admin"
                        ? "pending"
                        : leave.status
            }));

        const leaveBalance = {
            annualLimit,
            usedDays,
            remainingDays
        };

        return res.render(
            "faculty/leave",
            {
                title: "Faculty Leave",
                facultyProfile,
                currentYear,
                leaveBalance,
                leaves
            }
        );
    } catch (error) {
        console.error(
            "Show faculty leave error:",
            error
        );

        return next(error);
    }
};


const submitFacultyLeaveRequest =
    async (req, res, next) => {
        try {
            const userId =
                req.session.user.id;

            /*
             * IMPORTANT:
             * Existing EJS sends startDate
             * and endDate.
             */
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
                    "Please fill all required leave fields."
                );

                return res.redirect(
                    "/faculty/leave/apply"
                );
            }

            const dateValidation =
                validateLeaveDates(
                    startDate,
                    endDate
                );

            if (!dateValidation.valid) {
                req.flash(
                    "error",
                    dateValidation.message
                );

                return res.redirect(
                    "/faculty/leave/apply"
                );
            }

            const facultyProfile =
                await FacultyProfile.findOne({
                    user: userId
                });

            if (!facultyProfile) {
                req.flash(
                    "error",
                    "Faculty profile not found."
                );

                return res.redirect(
                    "/faculty/dashboard"
                );
            }

            const currentYear =
                new Date().getFullYear();

            /*
             * Check current approved leave balance.
             */
            const approvedLeaves =
                await LeaveRequest.find({
                    applicant: userId,
                    applicantType: "faculty",
                    status: "approved",
                    fromDate: {
                        $gte: new Date(
                            `${currentYear}-01-01T00:00:00.000Z`
                        ),
                        $lte: new Date(
                            `${currentYear}-12-31T23:59:59.999Z`
                        )
                    }
                }).lean();

            const usedDays =
                approvedLeaves.reduce(
                    (total, leave) =>
                        total +
                        Number(
                            leave.totalDays || 0
                        ),
                    0
                );

            const annualLimit = 20;

            const remainingDays =
                Math.max(
                    annualLimit - usedDays,
                    0
                );

            if (
                dateValidation.totalDays >
                remainingDays
            ) {
                req.flash(
                    "error",
                    `You have only ${remainingDays} leave day(s) remaining this year.`
                );

                return res.redirect(
                    "/faculty/leave/apply"
                );
            }

            const leaveRequest =
                await LeaveRequest.create({
                    applicantType: "faculty",
                    applicant: userId,

                    facultyProfile:
                        facultyProfile._id,

                    employeeId:
                        facultyProfile.employeeId,

                    department:
                        facultyProfile.department,

                    program:
                        facultyProfile.program,

                    leaveType,

                    fromDate:
                        dateValidation.startDate,

                    toDate:
                        dateValidation.endDate,

                    totalDays:
                        dateValidation.totalDays,

                    reason: reason.trim(),

                    status: "pending_admin"
                });

            console.log(
                "Faculty leave request created:",
                leaveRequest._id
            );

            req.flash(
                "success",
                "Leave request submitted successfully."
            );

            return res.redirect(
                "/faculty/leave/apply"
            );
        } catch (error) {
            console.error(
                "Submit faculty leave error:",
                error
            );

            return next(error);
        }
    };


const showFacultyLeaves = async (
    req,
    res,
    next
) => {
    /*
     * Existing faculty UI already shows
     * leave history on faculty/leave.ejs.
     *
     * Therefore simply redirect to the
     * existing page.
     */
    return res.redirect(
        "/faculty/leave/apply"
    );
};


// ==========================================
// FACULTY CANCEL LEAVE
// ==========================================

const cancelFacultyLeave = async (
    req,
    res,
    next
) => {
    try {
        const userId =
            req.session.user.id;

        const { id } = req.params;

        const leave =
            await LeaveRequest.findOne({
                _id: id,
                applicant: userId,
                applicantType: "faculty"
            });

        if (!leave) {
            req.flash(
                "error",
                "Leave request not found."
            );

            return res.redirect(
                "/faculty/leave/apply"
            );
        }

        /*
         * Only pending leave can be cancelled.
         */
        if (
            leave.status !==
            "pending_admin"
        ) {
            req.flash(
                "error",
                "Only pending leave requests can be cancelled."
            );

            return res.redirect(
                "/faculty/leave/apply"
            );
        }

        leave.status = "cancelled";

        await leave.save();

        req.flash(
            "success",
            "Leave request cancelled successfully."
        );

        return res.redirect(
            "/faculty/leave/apply"
        );
    } catch (error) {
        console.error(
            "Cancel faculty leave error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// ADMIN
// ==========================================

const showAdminLeave = async (
    req,
    res,
    next
) => {
    try {
        const {
            type = "all",
            status = "all",
            department = "",
            program = ""
        } = req.query;

        const filter = {};

        if (type === "student") {
            filter.$or = [
                {
                    applicantType: "student"
                },
                {
                    student: {
                        $ne: null
                    }
                }
            ];
        }

        if (type === "faculty") {
            filter.applicantType =
                "faculty";
        }

        if (status !== "all") {
            filter.status = status;
        }

        if (department) {
            filter.department =
                department.toLowerCase();
        }

        if (program) {
            filter.program =
                program.toLowerCase();
        }

        const leaves =
            await LeaveRequest.find(filter)
                .populate(
                    "applicant",
                    "name email role"
                )
                .populate(
                    "studentProfile"
                )
                .populate(
                    "facultyProfile"
                )
                .sort({
                    createdAt: -1
                })
                .lean();

        const departments =
            await LeaveRequest.distinct(
                "department"
            );

        const programs =
            await LeaveRequest.distinct(
                "program"
            );

        return res.render(
            "admin/leave",
            {
                title: "Leave Management",
                leaves,
                departments:
                    departments.filter(Boolean),
                programs:
                    programs.filter(Boolean),
                filters: {
                    type,
                    status,
                    department,
                    program
                }
            }
        );
    } catch (error) {
        console.error(
            "Show admin leave error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// ADMIN APPROVE
// ==========================================

const approveLeave = async (
    req,
    res,
    next
) => {
    try {
        const { id } = req.params;

        const leave =
            await LeaveRequest.findById(id);

        if (!leave) {
            req.flash(
                "error",
                "Leave request not found."
            );

            return res.redirect(
                "/admin/leave"
            );
        }

        if (
            leave.status !==
            "pending_admin"
        ) {
            req.flash(
                "error",
                "This leave request cannot be approved."
            );

            return res.redirect(
                "/admin/leave"
            );
        }

        leave.status = "approved";

        await leave.save();

        req.flash(
            "success",
            "Leave request approved successfully."
        );

        return res.redirect(
            "/admin/leave"
        );
    } catch (error) {
        console.error(
            "Approve leave error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// ADMIN REJECT
// ==========================================

const rejectLeave = async (
    req,
    res,
    next
) => {
    try {
        const { id } = req.params;

        const leave =
            await LeaveRequest.findById(id);

        if (!leave) {
            req.flash(
                "error",
                "Leave request not found."
            );

            return res.redirect(
                "/admin/leave"
            );
        }

        if (
            leave.status !==
            "pending_admin"
        ) {
            req.flash(
                "error",
                "This leave request cannot be rejected."
            );

            return res.redirect(
                "/admin/leave"
            );
        }

        leave.status = "rejected";

        await leave.save();

        req.flash(
            "success",
            "Leave request rejected successfully."
        );

        return res.redirect(
            "/admin/leave"
        );
    } catch (error) {
        console.error(
            "Reject leave error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    showLeaveForm,
    submitLeaveRequest,
    showMyLeaves,

    showFacultyLeaveForm,
    submitFacultyLeaveRequest,
    showFacultyLeaves,
    cancelFacultyLeave,

    showAdminLeave,
    approveLeave,
    rejectLeave
};