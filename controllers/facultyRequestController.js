const FacultyRequest = require("../models/FacultyRequest");

// ==========================================
// FACULTY REQUESTS
// ==========================================

const showFacultyRequests = async (req, res, next) => {
    try {
        const facultyId = req.session.user?._id;


        const status =
            typeof req.query.status === "string"
                ? req.query.status.trim()
                : "";

        const requestType =
            typeof req.query.requestType === "string"
                ? req.query.requestType.trim()
                : "";

        const filter = {
            assignedFaculty: facultyId
        };

        if (status) {
            filter.status = status;
        }

        if (requestType) {
            filter.requestType = requestType;
        }

        const requests = await FacultyRequest.find(filter)
            .populate("student", "name email")
            .populate(
                "studentProfile",
                "studentId department program semester section"
            )
            .populate("assignedBy", "name email")
            .sort({ createdAt: -1 })
            .lean();

        // ------------------------------------------
        // Summary
        // ------------------------------------------

        const summary = {
            total: requests.length,

            pending: requests.filter(
                (request) => request.status === "pending"
            ).length,

            inProgress: requests.filter(
                (request) => request.status === "in_progress"
            ).length,

            resolved: requests.filter(
                (request) => request.status === "resolved"
            ).length,

            rejected: requests.filter(
                (request) => request.status === "rejected"
            ).length
        };

        res.render("faculty/requests", {
            title: "Faculty Requests",
            requests,
            summary,
            filters: {
                status,
                requestType
            }
        });

    } catch (error) {
        console.error(
            "Faculty Requests Error:",
            error
        );

        next(error);
    }
};


// ==========================================
// UPDATE REQUEST STATUS
// ==========================================

const updateFacultyRequest = async (
    req,
    res,
    next
) => {
    try {
        const facultyId = req.session.user?._id;
        const requestId = req.params.id;

        const {
            status,
            facultyRemarks
        } = req.body;

        const allowedStatuses = [
            "pending",
            "in_progress",
            "resolved",
            "rejected"
        ];

        if (!allowedStatuses.includes(status)) {
            req.flash(
                "error",
                "Invalid request status."
            );

            return res.redirect(
                "/faculty/requests"
            );
        }

        const request =
            await FacultyRequest.findOne({
                _id: requestId,
                assignedFaculty: facultyId
            });

        if (!request) {
            req.flash(
                "error",
                "Request not found or not assigned to you."
            );

            return res.redirect(
                "/faculty/requests"
            );
        }

        request.status = status;

        if (
            typeof facultyRemarks === "string"
        ) {
            request.facultyRemarks =
                facultyRemarks.trim();
        }

        if (
            status === "resolved" ||
            status === "rejected"
        ) {
            request.completedAt = new Date();
        } else {
            request.completedAt = null;
        }

        await request.save();

        req.flash(
            "success",
            "Request status updated successfully."
        );

        res.redirect("/faculty/requests");

    } catch (error) {
        console.error(
            "Update Faculty Request Error:",
            error
        );

        next(error);
    }
};


module.exports = {
    showFacultyRequests,
    updateFacultyRequest
};