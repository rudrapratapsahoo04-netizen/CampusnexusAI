const User = require("../models/User");
const Timetable = require("../models/Timetable");
const StudentProfile = require("../models/StudentProfile");
const CampusPresence = require("../models/CampusPresence");
// ==========================================
// FACULTY DASHBOARD
// ==========================================

const showFacultyDashboard = async (req, res, next) => {
    try {

        const faculty = await User.findById(
            req.session.user.id
        )
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

        return res.render(
            "faculty/dashboard",
            {
                title: "Faculty Dashboard",
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
// ==========================================
// FACULTY PROFILE
// ==========================================

const showFacultyProfile = async (req, res, next) => {
    try {
        const faculty = await User.findById(
            req.session.user.id
        )
            .select(
                "name email role isActive lastLogin createdAt"
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

        return res.render(
            "faculty/profile",
            {
                title: "My Profile",
                faculty
            }
        );
    } catch (error) {
        console.error(
            "Faculty profile error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// FACULTY TIMETABLE
// ==========================================

const showFacultyTimetable = async (
    req,
    res,
    next
) => {
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


        timetable.sort((a, b) => {

            const dayDifference =
                dayOrder.indexOf(a.day) -
                dayOrder.indexOf(b.day);

            if (dayDifference !== 0) {
                return dayDifference;
            }

            return a.startTime.localeCompare(
                b.startTime
            );
        });


        return res.render(
            "faculty/timetable",
            {
                title: "My Timetable",

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
// FACULTY - MY STUDENTS
// ======================================================

const showFacultyStudents = async (req, res, next) => {
    try {
        const facultyName = req.session.user.name;

        const {
            department = "",
            program = "",
            semester = "",
            section = "",
            courseCode = "",
            search = ""
        } = req.query;


        // ------------------------------------------
        // Find faculty's assigned courses/sections
        // ------------------------------------------

        const timetableRecords =
            await Timetable.find({
                facultyName: {
                    $regex: `^${facultyName}$`,
                    $options: "i"
                },
                isActive: true
            })
                .select(
                    "department program semester section courseCode courseName"
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
        // No assignments
        // ------------------------------------------

        if (!timetableRecords.length) {
            return res.render(
                "faculty/students",
                {
                    title: "My Students",

                    students: [],

                    assignedCourses: [],

                    filters: {
                        department,
                        program,
                        semester,
                        section,
                        courseCode,
                        search
                    },

                    summary: {
                        totalStudents: 0,
                        totalCourses: 0,
                        totalSections: 0
                    }
                }
            );
        }


        // ------------------------------------------
        // Apply faculty-side filters
        // ------------------------------------------

        let assignments =
            timetableRecords;


        if (department) {
            assignments =
                assignments.filter(
                    item =>
                        item.department ===
                        department.toLowerCase()
                );
        }


        if (program) {
            assignments =
                assignments.filter(
                    item =>
                        item.program ===
                        program.toLowerCase()
                );
        }


        if (semester) {
            assignments =
                assignments.filter(
                    item =>
                        Number(item.semester) ===
                        Number(semester)
                );
        }


        if (section) {
            assignments =
                assignments.filter(
                    item =>
                        item.section ===
                        section.toUpperCase()
                );
        }


        if (courseCode) {
            assignments =
                assignments.filter(
                    item =>
                        item.courseCode ===
                        courseCode.toUpperCase()
                );
        }


        // ------------------------------------------
        // Build unique academic scopes
        // ------------------------------------------

        const scopes =
            Array.from(
                new Map(
                    assignments.map(
                        item => [
                            [
                                item.department,
                                item.program,
                                item.semester,
                                item.section
                            ].join("|"),

                            {
                                department:
                                    item.department,

                                program:
                                    item.program,

                                semester:
                                    item.semester,

                                section:
                                    item.section
                            }
                        ]
                    )
                ).values()
            );


        // ------------------------------------------
        // Query students only inside assignments
        // ------------------------------------------

        let students = [];


        if (scopes.length > 0) {

            const studentQuery = {
                $or: scopes
            };


            students =
                await StudentProfile.find(
                    studentQuery
                )
                    .populate({
                        path: "user",
                        select:
                            "name email isActive"
                    })
                    .sort({
                        studentId: 1
                    })
                    .lean();
        }


        // ------------------------------------------
        // Search
        // ------------------------------------------

        if (search) {

            const searchText =
                search.trim().toLowerCase();


            students =
                students.filter(
                    student => {

                        const name =
                            student.user?.name ||
                            "";

                        const email =
                            student.user?.email ||
                            "";

                        const studentId =
                            student.studentId ||
                            "";


                        return (
                            name
                                .toLowerCase()
                                .includes(searchText) ||

                            email
                                .toLowerCase()
                                .includes(searchText) ||

                            studentId
                                .toLowerCase()
                                .includes(searchText)
                        );
                    }
                );
        }


        // ------------------------------------------
        // Unique courses
        // ------------------------------------------

        const assignedCourses =
            Array.from(
                new Map(
                    assignments.map(
                        item => [
                            `${item.courseCode}|${item.department}|${item.program}|${item.semester}|${item.section}`,
                            item
                        ]
                    )
                ).values()
            );


        // ------------------------------------------
        // Unique sections
        // ------------------------------------------

        const uniqueSections =
            new Set(
                assignments.map(
                    item =>
                        `${item.department}|${item.program}|${item.semester}|${item.section}`
                )
            );


        // ------------------------------------------
        // Render
        // ------------------------------------------

        return res.render(
            "faculty/students",
            {
                title: "My Students",

                students,

                assignedCourses,

                filters: {
                    department,
                    program,
                    semester,
                    section,
                    courseCode,
                    search
                },

                summary: {
                    totalStudents:
                        students.length,

                    totalCourses:
                        assignedCourses.length,

                    totalSections:
                        uniqueSections.size
                }
            }
        );

    } catch (error) {

        console.error(
            "Faculty students error:",
            error
        );

        return next(error);
    }
};

// ==========================================
// FACULTY - CAMPUS PRESENCE
// ==========================================

const showCampusPresence = async (req, res, next) => {
    try {
        const facultyName = req.session.user?.name;

        if (!facultyName) {
            return res.redirect("/login");
        }

        // ------------------------------------------
        // 1. Find faculty's assigned timetable
        // ------------------------------------------

        const assignments = await Timetable.find({
            facultyName: facultyName,
            isActive: true
        }).lean();

        // ------------------------------------------
        // 2. If no assignment found
        // ------------------------------------------

        if (!assignments.length) {
            return res.render("faculty/campus-presence", {
                title: "Campus Presence",
                students: [],
                summary: {
                    total: 0,
                    onCampus: 0,
                    hostel: 0,
                    outsideCampus: 0,
                    onLeave: 0,
                    unknown: 0
                },
                filters: {
                    status: "",
                    search: ""
                },
                noAssignment: true
            });
        }

        // ------------------------------------------
        // 3. Create unique academic scopes
        // ------------------------------------------

        const scopes = [];

        for (const assignment of assignments) {
            const exists = scopes.some(
                (scope) =>
                    scope.department === assignment.department &&
                    scope.program === assignment.program &&
                    Number(scope.semester) === Number(assignment.semester) &&
                    scope.section === assignment.section
            );

            if (!exists) {
                scopes.push({
                    department: assignment.department,
                    program: assignment.program,
                    semester: assignment.semester,
                    section: assignment.section
                });
            }
        }

        // ------------------------------------------
        // 4. Build student query
        // ------------------------------------------

        const scopeQueries = scopes.map((scope) => ({
            department: scope.department,
            program: scope.program,
            semester: scope.semester,
            section: scope.section
        }));

        const studentProfiles = await StudentProfile.find({
            $or: scopeQueries
        })
            .populate("user", "name email isActive")
            .lean();

        // ------------------------------------------
        // 5. Get campus presence records
        // ------------------------------------------

        const studentIds = studentProfiles.map(
            (student) => student._id
        );

        const presenceRecords = await CampusPresence.find({
            studentProfile: { $in: studentIds }
        })
            .sort({ lastVerifiedAt: -1 })
            .lean();

        // ------------------------------------------
        // 6. Map latest presence by student
        // ------------------------------------------

        const presenceMap = new Map();

        for (const record of presenceRecords) {
            const key = record.studentProfile.toString();

            if (!presenceMap.has(key)) {
                presenceMap.set(key, record);
            }
        }

        // ------------------------------------------
        // 7. Merge student + presence information
        // ------------------------------------------

        let students = studentProfiles.map((student) => {
            const presence = presenceMap.get(
                student._id.toString()
            );

            return {
                _id: student._id,
                studentId: student.studentId,

                name: student.user?.name || "N/A",
                email: student.user?.email || "N/A",

                department: student.department,
                program: student.program,
                semester: student.semester,
                section: student.section,

                status: presence?.status || "unknown",

                location: presence?.location || "Not available",

                lastVerifiedAt:
                    presence?.lastVerifiedAt || null,

                source: presence?.source || null,

                remarks: presence?.remarks || ""
            };
        });

        // ------------------------------------------
        // 8. Search filter
        // ------------------------------------------

        const search =
            typeof req.query.search === "string"
                ? req.query.search.trim().toLowerCase()
                : "";

        if (search) {
            students = students.filter((student) => {
                return (
                    student.name
                        ?.toLowerCase()
                        .includes(search) ||
                    student.email
                        ?.toLowerCase()
                        .includes(search) ||
                    student.studentId
                        ?.toLowerCase()
                        .includes(search)
                );
            });
        }

        // ------------------------------------------
        // 9. Status filter
        // ------------------------------------------

        const status =
            typeof req.query.status === "string"
                ? req.query.status.trim()
                : "";

        if (status) {
            students = students.filter(
                (student) => student.status === status
            );
        }

        // ------------------------------------------
        // 10. Summary
        // ------------------------------------------

        const summary = {
            total: students.length,

            onCampus: students.filter(
                (student) => student.status === "on_campus"
            ).length,

            hostel: students.filter(
                (student) => student.status === "hostel"
            ).length,

            outsideCampus: students.filter(
                (student) => student.status === "outside_campus"
            ).length,

            onLeave: students.filter(
                (student) => student.status === "on_leave"
            ).length,

            unknown: students.filter(
                (student) => student.status === "unknown"
            ).length
        };

        // ------------------------------------------
        // 11. Render page
        // ------------------------------------------

        res.render("faculty/campus-presence", {
            title: "Campus Presence",
            students,
            summary,
            filters: {
                status,
                search
            },
            scopes,
            noAssignment: false
        });

    } catch (error) {
        console.error(
            "Faculty Campus Presence Error:",
            error
        );

        next(error);
    }
};


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    showFacultyDashboard,
    showFacultyProfile,
    showFacultyTimetable,
    showFacultyStudents,
    showCampusPresence
};