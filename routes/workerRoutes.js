const express = require("express");

const {
    showWorkerDashboard,
    showWorkerProfile,

    showWorkerTasks,
    startWorkerTask,
    completeWorkerTask,

    showWorkerLeave,
    applyWorkerLeave
} = require("../controllers/workerController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();


/*
|--------------------------------------------------------------------------
| Worker Dashboard
|--------------------------------------------------------------------------
*/

router.get(
    "/dashboard",
    requireAuth,
    requireRole("worker"),
    showWorkerDashboard
);


/*
|--------------------------------------------------------------------------
| Worker Profile
|--------------------------------------------------------------------------
*/

router.get(
    "/profile",
    requireAuth,
    requireRole("worker"),
    showWorkerProfile
);


/*
|--------------------------------------------------------------------------
| Worker Tasks
|--------------------------------------------------------------------------
*/

router.get(
    "/tasks",
    requireAuth,
    requireRole("worker"),
    showWorkerTasks
);

router.post(
    "/tasks/:taskId/start",
    requireAuth,
    requireRole("worker"),
    startWorkerTask
);

router.post(
    "/tasks/:taskId/complete",
    requireAuth,
    requireRole("worker"),
    completeWorkerTask
);


/*
|--------------------------------------------------------------------------
| Worker Leave
|--------------------------------------------------------------------------
|
| GET  /worker/leave
|      Worker apni leave application/history dekhega.
|
| POST /worker/leave/apply
|      Worker new leave application submit karega.
|
| Approval/rejection yahan nahi hai.
| Woh Admin side se hoga.
|
|--------------------------------------------------------------------------
*/

router.get(
    "/leave",
    requireAuth,
    requireRole("worker"),
    showWorkerLeave
);

router.post(
    "/leave/apply",
    requireAuth,
    requireRole("worker"),
    applyWorkerLeave
);


module.exports = router;