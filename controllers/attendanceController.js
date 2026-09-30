const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const FacultyProfile = require("../models/FacultyProfile");
const Attendance = require("../models/Attendance");
const FacultyAttendance = require("../models/FacultyAttendance");
const Course = require("../models/Course");
const FacultyAssignment = require("../models/FacultyAssignment");

// ==========================================
// HELPERS
// ==========================================

const getMonthYear = req => {
    const currentDate = new Date();

    let month = Number(req.query.month);
    let year = Number(req.query.year);

    if (
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12
    ) {
        month = currentDate.getMonth() + 1;
    }

    if (
        !Number.isInteger(year) ||
        year < 2000
    ) {
        year = currentDate.getFullYear();
    }

    return {
        month,
        year
    };
};

const calculatePercentage = (present, total) => {
    const presentClasses = Number(present) || 0;
    const totalClasses = Number(total) || 0;

    if (totalClasses <= 0) {
        return 0;
    }

    return Number(
        ((presentClasses / totalClasses) * 100).toFixed(2)
    );
};

const calculateFacultyPercentage = (
    present,
    workingDays
) => {
    const presentDays = Number(present) || 0;
    const totalWorkingDays = Number(workingDays) || 0;

    if (totalWorkingDays <= 0) {
        return 0;
    }

    return Number(
        ((presentDays / totalWorkingDays) * 100).toFixed(2)
    );
};

// ==========================================
// ADMIN ATTENDANCE
// ==========================================

const showAdminAttendance = async (req, res, next) => {
    try {
        const {
            month,
            year
        } = getMonthYear(req);

        const type =
            req.query.type === "faculty"
                ? "faculty"
                : "student";

        const department =
            String(req.query.department || "")
                .trim()
                .toLowerCase();

        const program =
            String(req.query.program || "")
                .trim()
                .toLowerCase();

        const semester = Number(req.query.semester);

        const section =
            String(req.query.section || "")
                .trim()
                .toUpperCase();

        const courseCode =
            String(req.query.courseCode || "")
                .trim()
                .toUpperCase();

        const faculty =
            String(req.query.faculty || "")
                .trim();

        // ==========================================
        // DEPARTMENTS
        // ==========================================

        const departments =
            await StudentProfile.distinct(
                "department"
            );

        // ==========================================
        // PROGRAMS
        // ==========================================

        let programQuery = {};

        if (department) {
            programQuery.department = department;
        }

        const programs =
            await StudentProfile.distinct(
                "program",
                programQuery
            );

        // ==========================================
        // FACULTY PROFILES
        // ==========================================

        const facultyProfiles =
            await FacultyProfile.find({})
                .populate({
                    path: "user",
                    select: "name email isActive"
                })
                .sort({
                    employeeId: 1
                })
                .lean();

        // ==========================================
        // ACTIVE COURSES
        // ==========================================

        const courses =
            await Course.find({
                status: "active"
            })
                .populate("department")
                .populate("program")
                .sort({
                    courseCode: 1
                })
                .lean();

        // ==========================================
        // STUDENTS
        // Required for Add Attendance modal
        // ==========================================

        const students =
            await StudentProfile.find({})
                .populate({
                    path: "user",
                    select: "name email isActive"
                })
                .sort({
                    studentId: 1
                })
                .lean();

        // ==========================================
        // STUDENT ATTENDANCE
        // ==========================================

        let studentAttendance = [];

        if (type === "student") {
            const studentQuery = {
                month,
                year
            };

            if (department) {
                studentQuery.department =
                    department;
            }

            if (program) {
                studentQuery.program =
                    program;
            }

            if (
                Number.isInteger(semester) &&
                semester >= 1
            ) {
                studentQuery.semester =
                    semester;
            }

            if (section) {
                studentQuery.section =
                    section;
            }

            if (courseCode) {
                studentQuery.courseCode =
                    courseCode;
            }

            studentAttendance =
                await Attendance.find(
                    studentQuery
                )
                    .populate({
                        path: "student",
                        select:
                            "name email isActive"
                    })
                    .sort({
                        studentId: 1,
                        courseCode: 1
                    })
                    .lean();

            studentAttendance =
                studentAttendance.map(
                    attendance => ({
                        ...attendance,
                        percentage:
                            calculatePercentage(
                                attendance.presentClasses,
                                attendance.totalClasses
                            )
                    })
                );
        }

        // ==========================================
        // FACULTY ATTENDANCE
        // ==========================================

        let facultyAttendance = [];

        if (type === "faculty") {
            const facultyQuery = {
                month,
                year
            };

            let facultyIds = null;

            if (department) {
                const facultyProfilesForDepartment =
                    await FacultyProfile.find({
                        department
                    })
                        .select("user")
                        .lean();

                facultyIds =
                    facultyProfilesForDepartment.map(
                        item => item.user
                    );

                facultyQuery.faculty = {
                    $in: facultyIds
                };
            }

            if (faculty) {
                facultyQuery.faculty =
                    faculty;
            }

            facultyAttendance =
                await FacultyAttendance.find(
                    facultyQuery
                )
                    .populate({
                        path: "faculty",
                        select:
                            "name email isActive"
                    })
                    .sort({
                        "faculty.name": 1
                    })
                    .lean();

            facultyAttendance =
                facultyAttendance.map(
                    attendance => ({
                        ...attendance,
                        percentage:
                            calculateFacultyPercentage(
                                attendance.presentDays,
                                attendance.workingDays
                            )
                    })
                );
        }

        return res.render(
            "admin/attendance",
            {
                title: "Attendance Management",
                currentUser:
                    req.session.user,

                type,

                month,
                year,

                departments,
                programs,

                facultyProfiles,

                courses,

                students,

                studentAttendance,
                facultyAttendance,

                filters: {
                    department,
                    program,
                    semester:
                        Number.isInteger(semester)
                            ? semester
                            : "",
                    section,
                    courseCode,
                    faculty
                }
            }
        );
    } catch (error) {
        console.error(
            "Show admin attendance error:",
            error
        );

        return next(error);
    }
};

// ==========================================
// CREATE STUDENT ATTENDANCE
// ==========================================

const createStudentAttendance = async (
    req,
    res,
    next
) => {
    try {
        const {
            student,
            courseCode,
            month,
            year,
            totalClasses,
            presentClasses
        } = req.body;

        if (
            !student ||
            !courseCode ||
            !month ||
            !year
        ) {
            req.flash(
                "error",
                "Student, course, month and year are required."
            );

            return res.redirect(
                `/admin/attendance?type=student&month=${month || ""}&year=${year || ""}`
            );
        }

        const total = Number(
            totalClasses
        );

        const present = Number(
            presentClasses
        );

        if (
            !Number.isInteger(total) ||
            total < 0
        ) {
            req.flash(
                "error",
                "Total classes must be a valid number."
            );

            return res.redirect(
                `/admin/attendance?type=student&month=${month}&year=${year}`
            );
        }

        if (
            !Number.isInteger(present) ||
            present < 0 ||
            present > total
        ) {
            req.flash(
                "error",
                "Present classes must be between 0 and total classes."
            );

            return res.redirect(
                `/admin/attendance?type=student&month=${month}&year=${year}`
            );
        }

        const studentProfile =
            await StudentProfile.findOne({
                user: student
            }).lean();

        if (!studentProfile) {
            req.flash(
                "error",
                "Student profile not found."
            );

            return res.redirect(
                `/admin/attendance?type=student&month=${month}&year=${year}`
            );
        }

        const normalizedCourseCode =
            String(courseCode)
                .trim()
                .toUpperCase();

        const course =
            await Course.findOne({
                courseCode:
                    normalizedCourseCode,
                status: "active"
            }).lean();

        if (!course) {
            req.flash(
                "error",
                "Course not found."
            );

            return res.redirect(
                `/admin/attendance?type=student&month=${month}&year=${year}`
            );
        }

        const monthNumber =
            Number(month);

        const yearNumber =
            Number(year);

        if (
            !Number.isInteger(monthNumber) ||
            monthNumber < 1 ||
            monthNumber > 12
        ) {
            req.flash(
                "error",
                "Invalid month."
            );

            return res.redirect(
                "/admin/attendance?type=student"
            );
        }

        if (
            !Number.isInteger(yearNumber) ||
            yearNumber < 2000
        ) {
            req.flash(
                "error",
                "Invalid year."
            );

            return res.redirect(
                "/admin/attendance?type=student"
            );
        }

        // ==========================================
        // DUPLICATE CHECK
        // ==========================================

        const existingAttendance =
            await Attendance.findOne({
                student,
                courseCode:
                    normalizedCourseCode,
                month: monthNumber,
                year: yearNumber
            });

        if (existingAttendance) {
            req.flash(
                "error",
                "Attendance already exists for this student, course and month."
            );

            return res.redirect(
                `/admin/attendance?type=student&month=${monthNumber}&year=${yearNumber}`
            );
        }

        const absent =
            total - present;

        // ==========================================
        // ADMIN IS NOT A MONGODB USER DOCUMENT
        // Therefore updatedBy must remain null.
        // ==========================================

        await Attendance.create({
            student,

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

            courseCode:
                normalizedCourseCode,

            courseName:
                course.courseName,

            month:
                monthNumber,

            year:
                yearNumber,

            totalClasses:
                total,

            presentClasses:
                present,

            absentClasses:
                absent,

            updatedBy:
                null,

            lastUpdatedAt:
                new Date()
        });

        req.flash(
            "success",
            "Student attendance added successfully."
        );

        return res.redirect(
            `/admin/attendance?type=student&month=${monthNumber}&year=${yearNumber}`
        );
    } catch (error) {
        console.error(
            "Create student attendance error:",
            error
        );

        if (
            error.code === 11000
        ) {
            req.flash(
                "error",
                "Attendance already exists for this student, course and month."
            );

            return res.redirect(
                `/admin/attendance?type=student&month=${req.body.month}&year=${req.body.year}`
            );
        }

        return next(error);
    }
};

// ==========================================
// UPDATE STUDENT ATTENDANCE
// ==========================================

const updateStudentAttendance = async (
    req,
    res,
    next
) => {
    try {
        const attendance =
            await Attendance.findById(
                req.params.id
            );

        if (!attendance) {
            req.flash(
                "error",
                "Attendance record not found."
            );

            return res.redirect(
                `/admin/attendance?type=student&month=${req.body.month || ""}&year=${req.body.year || ""}`
            );
        }

        const total =
            Number(
                req.body.totalClasses
            );

        const present =
            Number(
                req.body.presentClasses
            );

        if (
            !Number.isInteger(total) ||
            total < 0
        ) {
            req.flash(
                "error",
                "Total classes must be a valid number."
            );

            return res.redirect(
                `/admin/attendance?type=student&month=${attendance.month}&year=${attendance.year}`
            );
        }

        if (
            !Number.isInteger(present) ||
            present < 0 ||
            present > total
        ) {
            req.flash(
                "error",
                "Present classes must be between 0 and total classes."
            );

            return res.redirect(
                `/admin/attendance?type=student&month=${attendance.month}&year=${attendance.year}`
            );
        }

        attendance.totalClasses =
            total;

        attendance.presentClasses =
            present;

        attendance.absentClasses =
            total - present;

        // Admin session id is "admin",
        // not a MongoDB ObjectId.
        attendance.updatedBy =
            null;

        attendance.lastUpdatedAt =
            new Date();

        await attendance.save();

        req.flash(
            "success",
            "Student attendance updated successfully."
        );

        return res.redirect(
            `/admin/attendance?type=student&month=${attendance.month}&year=${attendance.year}`
        );
    } catch (error) {
        console.error(
            "Update student attendance error:",
            error
        );

        return next(error);
    }
};

// ==========================================
// UPDATE FACULTY ATTENDANCE
// ==========================================

const updateFacultyAttendance = async (
    req,
    res,
    next
) => {
    try {
        const attendance =
            await FacultyAttendance.findById(
                req.params.id
            );

        if (!attendance) {
            req.flash(
                "error",
                "Faculty attendance record not found."
            );

            return res.redirect(
                `/admin/attendance?type=faculty&month=${req.body.month || ""}&year=${req.body.year || ""}`
            );
        }

        const workingDays =
            Number(
                req.body.workingDays
            );

        const presentDays =
            Number(
                req.body.presentDays
            );

        const leaveDays =
            Number(
                req.body.leaveDays
            );

        if (
            !Number.isInteger(
                workingDays
            ) ||
            workingDays < 0
        ) {
            req.flash(
                "error",
                "Working days must be a valid number."
            );

            return res.redirect(
                `/admin/attendance?type=faculty&month=${attendance.month}&year=${attendance.year}`
            );
        }

        if (
            !Number.isInteger(
                presentDays
            ) ||
            presentDays < 0
        ) {
            req.flash(
                "error",
                "Present days must be a valid number."
            );

            return res.redirect(
                `/admin/attendance?type=faculty&month=${attendance.month}&year=${attendance.year}`
            );
        }

        if (
            !Number.isInteger(
                leaveDays
            ) ||
            leaveDays < 0
        ) {
            req.flash(
                "error",
                "Leave days must be a valid number."
            );

            return res.redirect(
                `/admin/attendance?type=faculty&month=${attendance.month}&year=${attendance.year}`
            );
        }

        if (
            presentDays + leaveDays >
            workingDays
        ) {
            req.flash(
                "error",
                "Present days and leave days cannot exceed working days."
            );

            return res.redirect(
                `/admin/attendance?type=faculty&month=${attendance.month}&year=${attendance.year}`
            );
        }

        attendance.workingDays =
            workingDays;

        attendance.presentDays =
            presentDays;

        attendance.leaveDays =
            leaveDays;

        attendance.absentDays =
            workingDays -
            presentDays -
            leaveDays;

        // Admin session id is "admin",
        // not a MongoDB ObjectId.
        attendance.updatedBy =
            null;

        attendance.lastUpdatedAt =
            new Date();

        await attendance.save();

        req.flash(
            "success",
            "Faculty attendance updated successfully."
        );

        return res.redirect(
            `/admin/attendance?type=faculty&month=${attendance.month}&year=${attendance.year}`
        );
    } catch (error) {
        console.error(
            "Update faculty attendance error:",
            error
        );

        return next(error);
    }
};

// ==========================================
// STUDENT ATTENDANCE
// ==========================================

const showStudentAttendance = async (
    req,
    res,
    next
) => {
    try {

        const {
            month,
            year
        } = getMonthYear(req);

        const studentId =
            req.session.user.id;

        const studentProfile =
            await StudentProfile.findOne({
                user: studentId
            }).lean();

        if (!studentProfile) {

            req.flash(
                "error",
                "Student profile not found."
            );

            return res.redirect(
                "/student/dashboard"
            );
        }

        const attendanceRecords =
            await Attendance.find({
                student:
                    studentId,
                month,
                year
            })
                .sort({
                    courseCode: 1
                })
                .lean();

        const attendance =
            attendanceRecords.map(
                record => ({
                    ...record,
                    percentage:
                        calculatePercentage(
                            record.presentClasses,
                            record.totalClasses
                        )
                })
            );

        const totalClasses =
            attendance.reduce(
                (sum, record) =>
                    sum +
                    (
                        Number(
                            record.totalClasses
                        ) || 0
                    ),
                0
            );

        const totalPresent =
            attendance.reduce(
                (sum, record) =>
                    sum +
                    (
                        Number(
                            record.presentClasses
                        ) || 0
                    ),
                0
            );

        const totalAbsent =
            Math.max(
                totalClasses - totalPresent,
                0
            );

        const overallPercentage =
            calculatePercentage(
                totalPresent,
                totalClasses
            );

        return res.render(
            "student/attendance",
            {
                title:
                    "My Attendance",

                currentUser:
                    req.session.user,

                studentProfile,

                attendance,

                month,

                year,

                totalClasses,

                totalPresent,

                totalAbsent,

                overallPercentage
            }
        );

    } catch (error) {

        console.error(
            "Show student attendance error:",
            error
        );

        return next(error);
    }
};
// ==========================================
// FACULTY ATTENDANCE
// ==========================================

const showFacultyAttendance = async (
    req,
    res,
    next
) => {
    try {
        const {
            month,
            year
        } = getMonthYear(req);

        const facultyId =
            req.session.user.id;

        const facultyProfile =
            await FacultyProfile.findOne({
                user: facultyId
            }).lean();

        if (!facultyProfile) {
            req.flash(
                "error",
                "Faculty profile not found."
            );

            return res.redirect(
                "/faculty/dashboard"
            );
        }

        const attendanceRecord =
            await FacultyAttendance.findOne({
                faculty:
                    facultyId,

                month,

                year
            }).lean();

        let attendance = null;

        if (attendanceRecord) {
            attendance = {
                ...attendanceRecord,

                percentage:
                    calculateFacultyPercentage(
                        attendanceRecord.presentDays,
                        attendanceRecord.workingDays
                    )
            };
        }

        return res.render(
            "faculty/attendance",
            {
                title:
                    "My Attendance",

                currentUser:
                    req.session.user,

                facultyProfile,

                attendance,

                month,

                year
            }
        );
    } catch (error) {
        console.error(
            "Show faculty attendance error:",
            error
        );

        return next(error);
    }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    showAdminAttendance,
    createStudentAttendance,
    updateStudentAttendance,
    updateFacultyAttendance,
    showStudentAttendance,
    showFacultyAttendance
};