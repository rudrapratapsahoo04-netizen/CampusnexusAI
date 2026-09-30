const FacultyAttendance = require("../models/FacultyAttendance");
const User = require("../models/User");
const Timetable = require("../models/Timetable");


// ======================================================
// FACULTY - MY ATTENDANCE
// ======================================================

const showMyAttendance = async (req, res, next) => {
    try {
        const facultyId = req.session.user.id;

        const currentDate = new Date();

        const selectedMonth = req.query.month
            ? Number(req.query.month)
            : currentDate.getMonth() + 1;

        const selectedYear = req.query.year
            ? Number(req.query.year)
            : currentDate.getFullYear();

        const month =
            selectedMonth >= 1 &&
            selectedMonth <= 12
                ? selectedMonth
                : currentDate.getMonth() + 1;

        const year =
            selectedYear >= 2000 &&
            selectedYear <= currentDate.getFullYear() + 1
                ? selectedYear
                : currentDate.getFullYear();


        // Find logged-in faculty
        const faculty = await User.findOne({
            _id: facultyId,
            role: "faculty"
        })
            .select(
                "name email role isActive lastLogin"
            )
            .lean();


        if (!faculty) {
            return res.status(404).render("error", {
                title: "Faculty Not Found",
                statusCode: 404,
                message:
                    "Faculty account was not found.",
                currentUser:
                    req.session.user || null
            });
        }


        // Find monthly attendance
        const attendance =
            await FacultyAttendance.findOne({
                faculty: facultyId,
                month,
                year
            }).lean();


        // Calculate attendance percentage
        let attendancePercentage = "0.00";

        if (attendance) {

            const effectiveWorkingDays =
                attendance.workingDays -
                attendance.leaveDays;

            if (effectiveWorkingDays > 0) {

                attendancePercentage = (
                    (attendance.presentDays /
                        effectiveWorkingDays) *
                    100
                ).toFixed(2);
            }
        }


        return res.render(
            "faculty/my-attendance",
            {
                title: "My Attendance",
                faculty,
                attendance,
                month,
                year,
                attendancePercentage
            }
        );

    } catch (error) {

        console.error(
            "Faculty my attendance error:",
            error
        );

        return next(error);
    }
};
// ======================================================
// FACULTY - VIEW STUDENT ATTENDANCE
// ======================================================

const showFacultyAttendance = async (
    req,
    res,
    next
) => {
    try {
        const facultyId = req.session.user.id;
        const facultyName = req.session.user.name;

        const currentDate = new Date();

        // ------------------------------------------
        // Filters
        // ------------------------------------------

        const department =
            req.query.department || "";

        const program =
            req.query.program || "";

        const semester =
            req.query.semester
                ? Number(req.query.semester)
                : "";

        const section =
            req.query.section || "";

        const courseCode =
            req.query.courseCode || "";

        const month =
            req.query.month
                ? Number(req.query.month)
                : currentDate.getMonth() + 1;

        const year =
            req.query.year
                ? Number(req.query.year)
                : currentDate.getFullYear();


        // ------------------------------------------
        // Validate month/year
        // ------------------------------------------

        const selectedMonth =
            month >= 1 && month <= 12
                ? month
                : currentDate.getMonth() + 1;

        const selectedYear =
            year >= 2000 &&
            year <= currentDate.getFullYear() + 1
                ? year
                : currentDate.getFullYear();


        // ------------------------------------------
        // Find faculty
        // ------------------------------------------

        const faculty =
            await User.findOne({
                _id: facultyId,
                role: "faculty"
            })
                .select(
                    "name email role isActive"
                )
                .lean();


        if (!faculty) {
            return res.status(404).render(
                "error",
                {
                    title: "Faculty Not Found",
                    statusCode: 404,
                    message:
                        "Faculty account was not found.",
                    currentUser:
                        req.session.user || null
                }
            );
        }


        // ------------------------------------------
        // Find faculty's assigned timetable
        // ------------------------------------------

        const timetableQuery = {
            facultyName: {
                $regex:
                    `^${facultyName}$`,
                $options: "i"
            },
            isActive: true
        };


        if (department) {
            timetableQuery.department =
                department.toLowerCase();
        }

        if (program) {
            timetableQuery.program =
                program.toLowerCase();
        }

        if (semester) {
            timetableQuery.semester =
                semester;
        }

        if (section) {
            timetableQuery.section =
                section.toUpperCase();
        }

        if (courseCode) {
            timetableQuery.courseCode =
                courseCode.toUpperCase();
        }


        const assignedTimetable =
            await Timetable.find(
                timetableQuery
            )
                .sort({
                    department: 1,
                    program: 1,
                    semester: 1,
                    section: 1,
                    courseCode: 1
                })
                .lean();


        // ------------------------------------------
        // Build allowed academic combinations
        // ------------------------------------------

        const assignedCourses =
            assignedTimetable.map(
                (item) => ({
                    department:
                        item.department,

                    program:
                        item.program,

                    semester:
                        item.semester,

                    section:
                        item.section,

                    courseCode:
                        item.courseCode,

                    courseName:
                        item.courseName
                })
            );


        // ------------------------------------------
        // Attendance records
        // ------------------------------------------

        let attendanceRecords = [];


        if (assignedCourses.length > 0) {

            const attendanceQueries =
                assignedCourses.map(
                    (course) => ({
                        department:
                            course.department,

                        program:
                            course.program,

                        semester:
                            course.semester,

                        section:
                            course.section,

                        courseCode:
                            course.courseCode,

                        month:
                            selectedMonth,

                        year:
                            selectedYear
                    })
                );


            attendanceRecords =
                await require("../models/Attendance")
                    .find({
                        $or: attendanceQueries
                    })
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
        }


        // ------------------------------------------
        // Calculate percentage
        // ------------------------------------------

        const attendance =
            attendanceRecords.map(
                (record) => {

                    const percentage =
                        record.totalClasses > 0
                            ? (
                                (
                                    record.presentClasses /
                                    record.totalClasses
                                ) * 100
                            ).toFixed(2)
                            : "0.00";


                    return {
                        ...record,
                        percentage
                    };
                }
            );


        // ------------------------------------------
        // Summary
        // ------------------------------------------

        let totalStudents = 0;
        let totalClasses = 0;
        let totalPresent = 0;
        let totalAbsent = 0;


        const uniqueStudents =
            new Set();


        attendance.forEach(
            (record) => {

                if (record.studentId) {
                    uniqueStudents.add(
                        record.studentId
                    );
                }

                totalClasses +=
                    record.totalClasses || 0;

                totalPresent +=
                    record.presentClasses || 0;

                totalAbsent +=
                    record.absentClasses || 0;
            }
        );


        totalStudents =
            uniqueStudents.size;


        const overallPercentage =
            totalClasses > 0
                ? (
                    (
                        totalPresent /
                        totalClasses
                    ) * 100
                ).toFixed(2)
                : "0.00";


        // ------------------------------------------
        // Render
        // ------------------------------------------

        return res.render(
            "faculty/attendance",
            {
                title:
                    "Student Attendance",

                faculty,

                attendance,

                assignedCourses,

                filters: {
                    department,
                    program,
                    semester,
                    section,
                    courseCode,
                    month:
                        selectedMonth,
                    year:
                        selectedYear
                },

                summary: {
                    totalStudents,
                    totalClasses,
                    totalPresent,
                    totalAbsent,
                    overallPercentage
                }
            }
        );

    } catch (error) {

        console.error(
            "Faculty student attendance error:",
            error
        );

        return next(error);
    }
};


// ======================================================
// ADMIN - FACULTY ATTENDANCE MANAGEMENT
// ======================================================

const showAdminFacultyAttendance =
    async (req, res, next) => {

        try {

            const {
                facultyId,
                month,
                year
            } = req.query;


            const currentDate = new Date();


            const selectedMonth =
                month
                    ? Number(month)
                    : currentDate.getMonth() + 1;


            const selectedYear =
                year
                    ? Number(year)
                    : currentDate.getFullYear();


            const selectedMonthValue =
                selectedMonth >= 1 &&
                selectedMonth <= 12
                    ? selectedMonth
                    : currentDate.getMonth() + 1;


            const selectedYearValue =
                selectedYear >= 2000 &&
                selectedYear <=
                    currentDate.getFullYear() + 1
                    ? selectedYear
                    : currentDate.getFullYear();


            // Get all faculty
            const facultyList =
                await User.find({
                    role: "faculty"
                })
                    .select(
                        "name email isActive"
                    )
                    .sort({
                        name: 1
                    })
                    .lean();


            let selectedFaculty = null;
            let attendance = null;


            // If faculty selected
            if (facultyId) {

                selectedFaculty =
                    await User.findOne({
                        _id: facultyId,
                        role: "faculty"
                    })
                        .select(
                            "name email isActive"
                        )
                        .lean();


                if (selectedFaculty) {

                    attendance =
                        await FacultyAttendance.findOne({
                            faculty: facultyId,
                            month:
                                selectedMonthValue,
                            year:
                                selectedYearValue
                        }).lean();
                }
            }


            return res.render(
                "admin/faculty-attendance/index",
                {
                    title:
                        "Faculty Attendance Management",

                    facultyList,

                    selectedFaculty,

                    attendance,

                    filters: {
                        facultyId:
                            facultyId || "",

                        month:
                            selectedMonthValue,

                        year:
                            selectedYearValue
                    }
                }
            );

        } catch (error) {

            console.error(
                "Admin faculty attendance page error:",
                error
            );

            return next(error);
        }
    };



// ======================================================
// ADMIN - SAVE FACULTY ATTENDANCE
// ======================================================

const saveAdminFacultyAttendance =
    async (req, res, next) => {

        try {

            const {
                facultyId,
                month,
                year,
                workingDays,
                presentDays,
                leaveDays
            } = req.body;


            // ------------------------------------------
            // Required fields
            // ------------------------------------------

            if (
                !facultyId ||
                !month ||
                !year
            ) {

                req.flash(
                    "error",
                    "Please select faculty, month and year."
                );

                return res.redirect(
                    "/admin/faculty-attendance"
                );
            }


            // ------------------------------------------
            // Convert values to numbers
            // ------------------------------------------

            const monthNumber =
                Number(month);

            const yearNumber =
                Number(year);

            const workingDaysNumber =
                Number(workingDays);

            const presentDaysNumber =
                Number(presentDays);

            const leaveDaysNumber =
                Number(leaveDays);


            // ------------------------------------------
            // Validate month
            // ------------------------------------------

            if (
                Number.isNaN(monthNumber) ||
                monthNumber < 1 ||
                monthNumber > 12
            ) {

                req.flash(
                    "error",
                    "Invalid month."
                );

                return res.redirect(
                    "/admin/faculty-attendance"
                );
            }


            // ------------------------------------------
            // Validate year
            // ------------------------------------------

            if (
                Number.isNaN(yearNumber) ||
                yearNumber < 2000
            ) {

                req.flash(
                    "error",
                    "Invalid year."
                );

                return res.redirect(
                    "/admin/faculty-attendance"
                );
            }


            // ------------------------------------------
            // Validate attendance numbers
            // ------------------------------------------

            if (
                Number.isNaN(
                    workingDaysNumber
                ) ||
                Number.isNaN(
                    presentDaysNumber
                ) ||
                Number.isNaN(
                    leaveDaysNumber
                )
            ) {

                req.flash(
                    "error",
                    "Attendance values must be valid numbers."
                );

                return res.redirect(
                    `/admin/faculty-attendance?facultyId=${encodeURIComponent(
                        facultyId
                    )}&month=${monthNumber}&year=${yearNumber}`
                );
            }


            // ------------------------------------------
            // Negative values not allowed
            // ------------------------------------------

            if (
                workingDaysNumber < 0 ||
                presentDaysNumber < 0 ||
                leaveDaysNumber < 0
            ) {

                req.flash(
                    "error",
                    "Attendance values cannot be negative."
                );

                return res.redirect(
                    `/admin/faculty-attendance?facultyId=${encodeURIComponent(
                        facultyId
                    )}&month=${monthNumber}&year=${yearNumber}`
                );
            }


            // ------------------------------------------
            // Present + Leave <= Working Days
            // ------------------------------------------

            if (
                presentDaysNumber +
                    leaveDaysNumber >
                workingDaysNumber
            ) {

                req.flash(
                    "error",
                    "Present days and leave days cannot exceed working days."
                );

                return res.redirect(
                    `/admin/faculty-attendance?facultyId=${encodeURIComponent(
                        facultyId
                    )}&month=${monthNumber}&year=${yearNumber}`
                );
            }


            // ------------------------------------------
            // Calculate absent days
            // ------------------------------------------

            const absentDaysNumber =
                workingDaysNumber -
                presentDaysNumber -
                leaveDaysNumber;


            // ------------------------------------------
            // Verify faculty
            // ------------------------------------------

            const faculty =
                await User.findOne({
                    _id: facultyId,
                    role: "faculty"
                });


            if (!faculty) {

                req.flash(
                    "error",
                    "Selected faculty member was not found."
                );

                return res.redirect(
                    "/admin/faculty-attendance"
                );
            }


            // ------------------------------------------
            // Create / Update attendance
            // ------------------------------------------

            await FacultyAttendance.findOneAndUpdate(
                {
                    faculty: facultyId,
                    month: monthNumber,
                    year: yearNumber
                },
                {
                    faculty: facultyId,

                    month:
                        monthNumber,

                    year:
                        yearNumber,

                    workingDays:
                        workingDaysNumber,

                    presentDays:
                        presentDaysNumber,

                    leaveDays:
                        leaveDaysNumber,

                    absentDays:
                        absentDaysNumber,

                    updatedBy:
                        req.session.user.id,

                    lastUpdatedAt:
                        new Date()
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }
            );


            // ------------------------------------------
            // Success
            // ------------------------------------------

            req.flash(
                "success",
                "Faculty attendance updated successfully."
            );


            return res.redirect(
                `/admin/faculty-attendance?facultyId=${encodeURIComponent(
                    facultyId
                )}&month=${monthNumber}&year=${yearNumber}`
            );

        } catch (error) {

            console.error(
                "Save faculty attendance error:",
                error
            );

            return next(error);
        }
    };



// ======================================================
// FACULTY DASHBOARD
// ======================================================

const showFacultyDashboard =
    async (req, res, next) => {

        try {

            const faculty =
                await User.findById(
                    req.session.user.id
                )
                    .select(
                        "name email role isActive lastLogin"
                    )
                    .lean();


            if (!faculty) {

                return res.status(404).render(
                    "error",
                    {
                        title:
                            "Faculty Not Found",

                        statusCode: 404,

                        message:
                            "Faculty account was not found.",

                        currentUser:
                            req.session.user || null
                    }
                );
            }


            return res.render(
                "faculty/dashboard",
                {
                    title:
                        "Faculty Dashboard",

                    faculty
                }
            );

        } catch (error) {

            console.error(
                "Faculty dashboard error:",
                error
            );

            return next(error);
        }
    };



// ======================================================
// FACULTY TIMETABLE
// ======================================================

const showFacultyTimetable =
    async (req, res, next) => {

        try {

            const facultyName =
                req.session.user.name;


            const timetable =
                await Timetable.find({
                    facultyName: {
                        $regex:
                            `^${facultyName}$`,

                        $options: "i"
                    },

                    isActive: true
                })
                    .sort({
                        day: 1,
                        startTime: 1
                    })
                    .lean();


            const dayOrder = [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday"
            ];


            timetable.sort(
                (a, b) => {

                    const dayDifference =
                        dayOrder.indexOf(
                            a.day
                        ) -
                        dayOrder.indexOf(
                            b.day
                        );


                    if (
                        dayDifference !== 0
                    ) {
                        return dayDifference;
                    }


                    return a.startTime.localeCompare(
                        b.startTime
                    );
                }
            );


            return res.render(
                "faculty/timetable",
                {
                    title:
                        "My Timetable",

                    faculty:
                        req.session.user,

                    timetable
                }
            );

        } catch (error) {

            console.error(
                "Faculty timetable error:",
                error
            );

            return next(error);
        }
    };



// ======================================================
// EXPORTS
// ======================================================

module.exports = {
    showMyAttendance,
    showAdminFacultyAttendance,
    saveAdminFacultyAttendance,
    showFacultyDashboard,
    showFacultyTimetable,
    showFacultyAttendance
};