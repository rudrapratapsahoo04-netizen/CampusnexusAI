
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const showStudentDashboard = async (req, res, next) => {
    try {
        // =====================================================
        // AUTHENTICATED USER
        // =====================================================

        const userId = req.session.user.id;

        // =====================================================
        // LOAD ONLY THE LOGGED-IN USER
        // =====================================================

        const user = await User.findById(userId)
            .select("name email role isActive lastLogin")
            .lean();

        if (!user || user.role !== "student") {
            return res.status(403).render("error", {
                title: "Access Denied",
                message: "Student account could not be verified."
            });
        }

        // =====================================================
        // LOAD ONLY THIS STUDENT'S PROFILE
        // =====================================================

        const studentProfile =
            await StudentProfile.findOne({
                user: userId
            }).lean();

        // =====================================================
        // DEFAULT EMPTY DATA
        // =====================================================

        const academic = studentProfile
            ? {
                studentId: studentProfile.studentId,
                department: studentProfile.department,
                program: studentProfile.program,
                semester: studentProfile.semester,
                section: studentProfile.section,
                batch: studentProfile.batch,
                academicApprovalStatus:
                    studentProfile.academicApprovalStatus
            }
            : {
                studentId: null,
                department: null,
                program: null,
                semester: null,
                section: null,
                batch: null,
                academicApprovalStatus: "pending"
            };

        // =====================================================
        // HOSTEL STATUS
        // =====================================================

        const hostel = studentProfile
            ? {
                isResident:
                    studentProfile.hostelRequired === true,
                name: studentProfile.hostelName || null,
                roomNumber:
                    studentProfile.roomNumber || null
            }
            : {
                isResident: false,
                name: null,
                roomNumber: null
            };

        // =====================================================
        // CURRENT DASHBOARD PLACEHOLDERS
        // =====================================================
        // These will be connected to actual modules as we build:
        //
        // Attendance
        // Courses
        // Timetable
        // Notices
        // Gate Pass
        // Certificates
        // Complaints
        // =====================================================

        const dashboardData = {
            attendance: {
                overallPercentage: 0,
                monthlyPercentage: 0,
                month: null
            },

            courses: {
                total: 0,
                items: []
            },

            timetable: {
                today: [],
                upcoming: []
            },

            notices: [],

            gatePasses: [],

            certificates: [],

            complaints: []
        };

        // =====================================================
        // PENDING REQUEST COUNT
        // =====================================================

        const pendingCount =
            dashboardData.gatePasses.filter(
                item => item.status === "pending"
            ).length
            +
            dashboardData.certificates.filter(
                item => item.status === "pending"
            ).length
            +
            dashboardData.complaints.filter(
                item => item.status === "pending"
            ).length;

        // =====================================================
        // RENDER
        // =====================================================

        return res.render("student/dashboard", {
            title: "Student Dashboard",

            user,

            studentProfile,

            academic,

            hostel,

            dashboardData,

            pendingCount
        });

    } catch (error) {
        console.error(
            "Student dashboard error:",
            error
        );

        return next(error);
    }
};

module.exports = {
    showStudentDashboard
};
