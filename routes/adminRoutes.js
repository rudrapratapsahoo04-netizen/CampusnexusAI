const express = require("express");

const {
    showAdminDashboard,
    showAdminSettings,
    showAdminStudents,
    showAdminStudent,
    showEditStudent,
    updateStudent,
    showAdminFaculty,
    showAdminFacultyProfile,
    showAdminDepartments,
    showAddDepartment,
    createDepartment,
    showAdminDepartment,
    showEditDepartment,
    updateDepartment,
    toggleDepartmentStatus,
    showAdminPrograms,
    showAddProgram,
    createProgram,
    showAdminProgram,
    showEditProgram,
    updateProgram,
    showAdminCourses,
    showAddCourse,
    createCourse,
    showEditCourse,
    updateCourse,
    toggleCourseStatus,
    showAdminCourse,
    showAdminTimetable,
    showAddTimetable,
    createTimetable,
    showEditTimetable,
    updateTimetable,
    showAdminTimetableEntry,
    toggleTimetableStatus,
    sendTimetableToStudents,
    deleteTimetable,
    showAdminUsers,
    showAdminUser,
    toggleUserStatus,
    resetUserPassword,
    deleteUser,
    showAdminWorkers,
    showAdminWorker,
    showAdminWorkerTasks,
    createWorkerTask,
    closeWorkerTask,
    showAdminWorkerLeaves,
    reviewWorkerLeave,
    showAdminLostFound,
    reviewLostFound
} = require("../controllers/adminController");



const {
    showAdminFees,
    showAdminStudentFee,
    saveStudentFee
} = require("../controllers/feeController");


const {
    showAdminGroupLinks,
    createGroupLink,
    toggleGroupLinkStatus,
    deleteGroupLink
} = require("../controllers/groupLinkController");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();


// ==========================================
// ADMIN DASHBOARD
// ==========================================

router.get(
    "/dashboard",
    requireAuth,
    requireRole("admin"),
    showAdminDashboard
);




// ==========================================
// ADMIN - SETTINGS
// ==========================================

router.get(
    "/settings",
    requireAuth,
    requireRole("admin"),
    showAdminSettings
);

// ==========================================
// ADMIN - USER MANAGEMENT
// ==========================================

router.get(
    "/users",
    requireAuth,
    requireRole("admin"),
    showAdminUsers
);

router.get(
    "/users/:id",
    requireAuth,
    requireRole("admin"),
    showAdminUser
);

router.post(
    "/users/:id/toggle-status",
    requireAuth,
    requireRole("admin"),
    toggleUserStatus
);

router.post(
    "/users/:id/reset-password",
    requireAuth,
    requireRole("admin"),
    resetUserPassword
);

router.post(
    "/users/:id/delete",
    requireAuth,
    requireRole("admin"),
    deleteUser
);

// ==========================================
// ADMIN - FACULTY MANAGEMENT
// ==========================================

router.get(
    "/faculty",
    requireAuth,
    requireRole("admin"),
    showAdminFaculty
);

router.get(
    "/faculty/:id",
    requireAuth,
    requireRole("admin"),
    showAdminFacultyProfile
);


// ==========================================
// ADMIN - STUDENT MANAGEMENT
// ==========================================

router.get(
    "/students",
    requireAuth,
    requireRole("admin"),
    showAdminStudents
);

router.get(
    "/students/:id/edit",
    requireAuth,
    requireRole("admin"),
    showEditStudent
);

router.post(
    "/students/:id/edit",
    requireAuth,
    requireRole("admin"),
    updateStudent
);

router.get(
    "/students/:id",
    requireAuth,
    requireRole("admin"),
    showAdminStudent
);


// ==========================================
// ADMIN - DEPARTMENT MANAGEMENT
// ==========================================

router.get(
    "/departments",
    requireAuth,
    requireRole("admin"),
    showAdminDepartments
);

router.get(
    "/departments/new",
    requireAuth,
    requireRole("admin"),
    showAddDepartment
);

router.post(
    "/departments",
    requireAuth,
    requireRole("admin"),
    createDepartment
);

router.get(
    "/departments/:id/edit",
    requireAuth,
    requireRole("admin"),
    showEditDepartment
);

router.post(
    "/departments/:id/edit",
    requireAuth,
    requireRole("admin"),
    updateDepartment
);

router.post(
    "/departments/:id/toggle-status",
    requireAuth,
    requireRole("admin"),
    toggleDepartmentStatus
);

router.get(
    "/departments/:id",
    requireAuth,
    requireRole("admin"),
    showAdminDepartment
);


// ==========================================
// ADMIN - PROGRAM MANAGEMENT
// ==========================================

router.get(
    "/programs",
    requireAuth,
    requireRole("admin"),
    showAdminPrograms
);

router.get(
    "/programs/new",
    requireAuth,
    requireRole("admin"),
    showAddProgram
);

router.post(
    "/programs",
    requireAuth,
    requireRole("admin"),
    createProgram
);


router.get(
    "/programs/:id/edit",
    requireAuth,
    requireRole("admin"),
    showEditProgram
);

router.post(
    "/programs/:id/edit",
    requireAuth,
    requireRole("admin"),
    updateProgram
);



router.get(
    "/programs/:id",
    requireAuth,
    requireRole("admin"),
    showAdminProgram
);



// ==========================================
// COURSES
// ==========================================

router.get(
    "/courses",
    requireAuth,
    requireRole("admin"),
    showAdminCourses
);

router.get(
    "/courses/new",
    requireAuth,
    requireRole("admin"),
    showAddCourse
);

router.post(
    "/courses",
    requireAuth,
    requireRole("admin"),
    createCourse
);

router.get(
    "/courses/:id/edit",
    requireAuth,
    requireRole("admin"),
    showEditCourse
);

router.post(
    "/courses/:id/edit",
    requireAuth,
    requireRole("admin"),
    updateCourse
);

router.post(
    "/courses/:id/toggle-status",
    requireAuth,
    requireRole("admin"),
    toggleCourseStatus
);
router.get(
    "/courses/:id",
    requireAuth,
    requireRole("admin"),
    showAdminCourse
);



// ==========================================
// ADMIN - TIMETABLE MANAGEMENT
// ==========================================

router.get(
    "/timetable",
    requireAuth,
    requireRole("admin"),
    showAdminTimetable
);

router.get(
    "/timetable/new",
    requireAuth,
    requireRole("admin"),
    showAddTimetable
);

router.post(
    "/timetable",
    requireAuth,
    requireRole("admin"),
    createTimetable
);

router.get(
    "/timetable/:id/edit",
    requireAuth,
    requireRole("admin"),
    showEditTimetable
);

router.post(
    "/timetable/:id/edit",
    requireAuth,
    requireRole("admin"),
    updateTimetable
);

router.post(
    "/timetable/:id/send-to-students",
    requireAuth,
    requireRole("admin"),
    sendTimetableToStudents
);

router.post(
    "/timetable/:id/toggle-status",
    requireAuth,
    requireRole("admin"),
    toggleTimetableStatus
);

router.get(
    "/timetable/:id",
    requireAuth,
    requireRole("admin"),
    showAdminTimetableEntry
);

router.post(
    "/timetable/:id/delete",
    requireAuth,
    requireRole("admin"),
    deleteTimetable
);




// ==========================================
// FEE MANAGEMENT
// ==========================================

router.get(
    "/fee",
    requireAuth,
    requireRole("admin"),
    showAdminFees
);

router.get(
    "/fee/student/:studentId",
    requireAuth,
    requireRole("admin"),
    showAdminStudentFee
);

router.post(
    "/fee/save",
    requireAuth,
    requireRole("admin"),
    saveStudentFee
);



// ==========================================
// GROUP LINKS
// ==========================================

router.get(
    "/grouplink",
    requireAuth,
    requireRole("admin"),
    showAdminGroupLinks
);

router.post(
    "/grouplink/create",
    requireAuth,
    requireRole("admin"),
    createGroupLink
);

router.post(
    "/grouplink/:id/toggle-status",
    requireAuth,
    requireRole("admin"),
    toggleGroupLinkStatus
);

router.post(
    "/grouplink/:id/delete",
    requireAuth,
    requireRole("admin"),
    deleteGroupLink
);


// ==========================================
// ADMIN - WORKER MANAGEMENT
// ==========================================

router.get(
    "/workers",
    requireAuth,
    requireRole("admin"),
    showAdminWorkers
);

router.get(
    "/workers/:id",
    requireAuth,
    requireRole("admin"),
    showAdminWorker
);

router.get(
    "/worker-tasks",
    requireAuth,
    requireRole("admin"),
    showAdminWorkerTasks
);

router.post(
    "/worker-tasks/create",
    requireAuth,
    requireRole("admin"),
    createWorkerTask
);

router.post(
    "/worker-tasks/:taskId/close",
    requireAuth,
    requireRole("admin"),
    closeWorkerTask
);

router.get(
    "/worker-leaves",
    requireAuth,
    requireRole("admin"),
    showAdminWorkerLeaves
);

router.post(
    "/worker-leaves/:leaveId/review",
    requireAuth,
    requireRole("admin"),
    reviewWorkerLeave
);

// ==========================================
// ADMIN - LOST & FOUND MANAGEMENT
// ==========================================

router.get(
    "/lost-found",
    requireAuth,
    requireRole("admin"),
    showAdminLostFound
);

router.post(
    "/lost-found/:reportId/review",
    requireAuth,
    requireRole("admin"),
    reviewLostFound
);


module.exports = router;