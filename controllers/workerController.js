const User = require("../models/User");
const WorkerProfile = require("../models/WorkerProfile");
const WorkerTask = require("../models/WorkerTask");
const WorkerLeave = require("../models/WorkerLeave");


/*
|--------------------------------------------------------------------------
| Worker Dashboard
|--------------------------------------------------------------------------
*/

const showWorkerDashboard = async (req, res, next) => {
    try {
        const userId =
            req.session.user?._id ||
            req.session.user?.id;

        if (!userId) {
            return res.redirect("/auth/login/worker");
        }

        const user = await User.findById(userId)
            .select("name email role isActive lastLogin");

        if (!user) {
            req.session.destroy(() => {});
            return res.redirect("/auth/login/worker");
        }

        if (
            user.role !== "worker" ||
            !user.isActive
        ) {
            return res.status(403).render("error", {
                title: "Access Denied",
                message:
                    "You do not have permission to access the worker dashboard."
            });
        }

        const workerProfile =
            await WorkerProfile.findOne({
                user: user._id
            });

        if (!workerProfile) {
            return res.status(404).render("error", {
                title: "Worker Profile Not Found",
                message:
                    "Your worker profile could not be found. Please contact the administrator."
            });
        }

        return res.render(
            "worker/dashboard",
            {
                title: "Worker Dashboard",
                user,
                workerProfile
            }
        );

    } catch (error) {
        console.error(
            "Worker dashboard error:",
            error
        );

        return next(error);
    }
};


/*
|--------------------------------------------------------------------------
| Worker Profile
|--------------------------------------------------------------------------
*/

const showWorkerProfile = async (
    req,
    res,
    next
) => {
    try {
        const userId =
            req.session.user?._id ||
            req.session.user?.id;

        if (!userId) {
            return res.redirect(
                "/auth/login/worker"
            );
        }

        const user = await User.findById(userId)
            .select(
                "name email role isActive lastLogin"
            );

        if (!user) {
            req.session.destroy(() => {});
            return res.redirect(
                "/auth/login/worker"
            );
        }

        if (
            user.role !== "worker" ||
            !user.isActive
        ) {
            return res.status(403).render("error", {
                title: "Access Denied",
                message:
                    "You do not have permission to access this page."
            });
        }

        const workerProfile =
            await WorkerProfile.findOne({
                user: user._id
            });

        if (!workerProfile) {
            return res.status(404).render("error", {
                title: "Worker Profile Not Found",
                message:
                    "Your worker profile could not be found."
            });
        }

        return res.render(
            "worker/profile",
            {
                title: "My Profile",
                user,
                workerProfile
            }
        );

    } catch (error) {
        console.error(
            "Worker profile error:",
            error
        );

        return next(error);
    }
};


/*
|--------------------------------------------------------------------------
| Worker Tasks
|--------------------------------------------------------------------------
*/

const showWorkerTasks = async (
    req,
    res,
    next
) => {
    try {
        const userId =
            req.session.user?._id ||
            req.session.user?.id;

        if (!userId) {
            return res.redirect(
                "/auth/login/worker"
            );
        }

        const user = await User.findById(userId)
            .select(
                "name email role isActive"
            );

        if (!user) {
            req.session.destroy(() => {});
            return res.redirect(
                "/auth/login/worker"
            );
        }

        if (
            user.role !== "worker" ||
            !user.isActive
        ) {
            return res.status(403).render("error", {
                title: "Access Denied",
                message:
                    "You do not have permission to access worker tasks."
            });
        }

        const tasks = await WorkerTask.find({
            worker: user._id
        })
            .populate(
                "assignedBy",
                "name email"
            )
            .sort({
                createdAt: -1
            });

        return res.render(
            "worker/tasks",
            {
                title: "My Work",
                user,
                tasks
            }
        );

    } catch (error) {
        console.error(
            "Worker tasks error:",
            error
        );

        return next(error);
    }
};


/*
|--------------------------------------------------------------------------
| Start Worker Task
|--------------------------------------------------------------------------
*/

const startWorkerTask = async (
    req,
    res,
    next
) => {
    try {
        const userId =
            req.session.user?._id ||
            req.session.user?.id;

        if (!userId) {
            return res.redirect(
                "/auth/login/worker"
            );
        }

        const taskId = req.params.taskId;

        if (!taskId) {
            req.flash(
                "error",
                "Task was not found."
            );

            return res.redirect(
                "/worker/tasks"
            );
        }

        const task = await WorkerTask.findOne({
            _id: taskId,
            worker: userId
        });

        if (!task) {
            req.flash(
                "error",
                "Task not found or you do not have permission to access it."
            );

            return res.redirect(
                "/worker/tasks"
            );
        }

        if (task.status !== "assigned") {
            req.flash(
                "error",
                "This task cannot be started in its current status."
            );

            return res.redirect(
                "/worker/tasks"
            );
        }

        task.status = "in-progress";

        await task.save();

        req.flash(
            "success",
            "Task started successfully."
        );

        return res.redirect(
            "/worker/tasks"
        );

    } catch (error) {
        console.error(
            "Start worker task error:",
            error
        );

        return next(error);
    }
};


/*
|--------------------------------------------------------------------------
| Complete Worker Task
|--------------------------------------------------------------------------
*/

const completeWorkerTask = async (
    req,
    res,
    next
) => {
    try {
        const userId =
            req.session.user?._id ||
            req.session.user?.id;

        if (!userId) {
            return res.redirect(
                "/auth/login/worker"
            );
        }

        const taskId = req.params.taskId;

        const completionMessage =
            String(
                req.body?.completionMessage || ""
            ).trim();

        if (!taskId) {
            req.flash(
                "error",
                "Task was not found."
            );

            return res.redirect(
                "/worker/tasks"
            );
        }

        if (!completionMessage) {
            req.flash(
                "error",
                "Please enter a completion message for the administrator."
            );

            return res.redirect(
                "/worker/tasks"
            );
        }

        if (completionMessage.length > 2000) {
            req.flash(
                "error",
                "Completion message cannot exceed 2000 characters."
            );

            return res.redirect(
                "/worker/tasks"
            );
        }

        const task = await WorkerTask.findOne({
            _id: taskId,
            worker: userId
        });

        if (!task) {
            req.flash(
                "error",
                "Task not found or you do not have permission to access it."
            );

            return res.redirect(
                "/worker/tasks"
            );
        }

        if (
            task.status !== "assigned" &&
            task.status !== "in-progress"
        ) {
            req.flash(
                "error",
                "This task cannot be marked as completed."
            );

            return res.redirect(
                "/worker/tasks"
            );
        }

        task.status = "completed";

        task.workerCompletionMessage =
            completionMessage;

        task.completedAt = new Date();

        await task.save();

        req.flash(
            "success",
            "Task marked as completed. Your completion message has been sent to the administrator."
        );

        return res.redirect(
            "/worker/tasks"
        );

    } catch (error) {
        console.error(
            "Complete worker task error:",
            error
        );

        return next(error);
    }
};


/*
|--------------------------------------------------------------------------
| Show Worker Leave
|--------------------------------------------------------------------------
|
| GET /worker/leave
|
| Worker:
| - Leave apply form dekhega
| - Apni leave history dekhega
| - Pending / Approved / Rejected status dekhega
|
*/

const showWorkerLeave = async (
    req,
    res,
    next
) => {
    try {
        const userId =
            req.session.user?._id ||
            req.session.user?.id;

        if (!userId) {
            return res.redirect(
                "/auth/login/worker"
            );
        }

        const user = await User.findById(userId)
            .select(
                "name email role isActive"
            );

        if (!user) {
            req.session.destroy(() => {});

            return res.redirect(
                "/auth/login/worker"
            );
        }

        if (
            user.role !== "worker" ||
            !user.isActive
        ) {
            return res.status(403).render("error", {
                title: "Access Denied",
                message:
                    "You do not have permission to access worker leave."
            });
        }

        /*
         * IMPORTANT:
         * Sirf current logged-in worker ki leaves.
         */

        const leaves = await WorkerLeave.find({
            worker: user._id
        })
            .populate(
                "reviewedBy",
                "name email"
            )
            .sort({
                createdAt: -1
            });

        return res.render(
            "worker/leave",
            {
                title: "My Leave",
                user,
                leaves
            }
        );

    } catch (error) {
        console.error(
            "Show worker leave error:",
            error
        );

        return next(error);
    }
};


/*
|--------------------------------------------------------------------------
| Apply Worker Leave
|--------------------------------------------------------------------------
|
| POST /worker/leave/apply
|
| New leave always starts as:
| pending
|
| Worker approve/reject nahi kar sakta.
| Admin later review karega.
|
*/

const applyWorkerLeave = async (
    req,
    res,
    next
) => {
    try {
        const userId =
            req.session.user?._id ||
            req.session.user?.id;

        if (!userId) {
            return res.redirect(
                "/auth/login/worker"
            );
        }

        const user = await User.findById(userId)
            .select(
                "name email role isActive"
            );

        if (!user) {
            req.session.destroy(() => {});

            return res.redirect(
                "/auth/login/worker"
            );
        }

        if (
            user.role !== "worker" ||
            !user.isActive
        ) {
            return res.status(403).render("error", {
                title: "Access Denied",
                message:
                    "You do not have permission to apply for worker leave."
            });
        }


        const {
            leaveType,
            fromDate,
            toDate,
            reason
        } = req.body || {};


        /*
         * Required fields
         */

        if (
            !leaveType ||
            !fromDate ||
            !toDate ||
            !reason ||
            !String(reason).trim()
        ) {
            req.flash(
                "error",
                "Please fill all leave application fields."
            );

            return res.redirect(
                "/worker/leave"
            );
        }


        /*
         * Allowed leave types
         */

        const allowedLeaveTypes = [
            "casual",
            "sick",
            "earned",
            "emergency",
            "personal",
            "other"
        ];

        if (
            !allowedLeaveTypes.includes(
                String(leaveType)
                    .trim()
                    .toLowerCase()
            )
        ) {
            req.flash(
                "error",
                "Please select a valid leave type."
            );

            return res.redirect(
                "/worker/leave"
            );
        }


        /*
         * Date validation
         */

        const startDate = new Date(
            `${fromDate}T00:00:00`
        );

        const endDate = new Date(
            `${toDate}T23:59:59`
        );


        if (
            Number.isNaN(
                startDate.getTime()
            ) ||
            Number.isNaN(
                endDate.getTime()
            )
        ) {
            req.flash(
                "error",
                "Please enter valid leave dates."
            );

            return res.redirect(
                "/worker/leave"
            );
        }


        if (startDate > endDate) {
            req.flash(
                "error",
                "To date cannot be earlier than from date."
            );

            return res.redirect(
                "/worker/leave"
            );
        }


        /*
         * Reason length
         */

        const normalizedReason =
            String(reason).trim();

        if (
            normalizedReason.length < 3
        ) {
            req.flash(
                "error",
                "Please provide a proper reason for your leave."
            );

            return res.redirect(
                "/worker/leave"
            );
        }


        if (
            normalizedReason.length > 1500
        ) {
            req.flash(
                "error",
                "Leave reason cannot exceed 1500 characters."
            );

            return res.redirect(
                "/worker/leave"
            );
        }


        /*
         * Prevent duplicate/overlapping pending
         * or approved leave applications.
         *
         * Existing leave:
         *
         * start <= new end
         * AND
         * end >= new start
         */

        const overlappingLeave =
            await WorkerLeave.findOne({
                worker: user._id,

                status: {
                    $in: [
                        "pending",
                        "approved"
                    ]
                },

                fromDate: {
                    $lte: endDate
                },

                toDate: {
                    $gte: startDate
                }
            });


        if (overlappingLeave) {
            req.flash(
                "error",
                "You already have a pending or approved leave for some or all of these dates."
            );

            return res.redirect(
                "/worker/leave"
            );
        }


        /*
         * Create leave application.
         *
         * Status intentionally pending.
         */

        const leave =
            new WorkerLeave({

                worker: user._id,

                leaveType:
                    String(leaveType)
                        .trim()
                        .toLowerCase(),

                fromDate:
                    startDate,

                toDate:
                    endDate,

                reason:
                    normalizedReason,

                status:
                    "pending",

                adminResponse:
                    "",

                reviewedBy:
                    null,

                reviewedAt:
                    null

            });


        await leave.save();


        req.flash(
            "success",
            "Leave application submitted successfully. It is now waiting for administrator approval."
        );


        return res.redirect(
            "/worker/leave"
        );

    } catch (error) {

        console.error(
            "Apply worker leave error:",
            error
        );


        if (
            error.name ===
            "ValidationError"
        ) {

            const firstError =
                Object.values(
                    error.errors
                )[0];


            req.flash(
                "error",
                firstError
                    ? firstError.message
                    : "Please check your leave application."
            );


            return res.redirect(
                "/worker/leave"
            );
        }


        return next(error);
    }
};


/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

module.exports = {

    showWorkerDashboard,

    showWorkerProfile,

    showWorkerTasks,

    startWorkerTask,

    completeWorkerTask,

    showWorkerLeave,

    applyWorkerLeave

};