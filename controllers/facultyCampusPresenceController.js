const CampusPresence = require("../models/CampusPresence");
const StudentProfile = require("../models/StudentProfile");
const Timetable = require("../models/Timetable");


// ======================================================
// FACULTY - VIEW STUDENT CAMPUS PRESENCE
// ======================================================

const showCampusPresence = async (
    req,
    res,
    next
) => {
    try {
        const facultyName =
            req.session.user.name;

        const {
            department = "",
            program = "",
            semester = "",
            section = "",
            status = "",
            search = ""
        } = req.query;


        // ------------------------------------------
        // Find faculty's assigned academic areas
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
                    "department program semester section"
                )
                .lean();


        if (!timetableRecords.length) {
            return res.render(
                "faculty/campus-presence",
                {
                    title:
                        "Campus Presence",

                    students: [],

                    academicAreas: [],

                    filters: {
                        department,
                        program,
                        semester,
                        section,
                        status,
                        search
                    },

                    summary: {
                        total: 0,
                        onCampus: 0,
                        hostel: 0,
                        outsideCampus: 0,
                        onLeave: 0,
                        unknown: 0
                    }
                }
            );
        }


        // ------------------------------------------
        // Build faculty academic scope
        // ------------------------------------------

        const academicScope =
            timetableRecords.map(
                (item) => ({
                    department:
                        item.department,

                    program:
                        item.program,

                    semester:
                        item.semester,

                    section:
                        item.section
                })
            );


        // Remove duplicates

        const uniqueScopes =
            Array.from(
                new Map(
                    academicScope.map(
                        (item) => [
                            `${item.department}|${item.program}|${item.semester}|${item.section}`,
                            item
                        ]
                    )
                ).values()
            );


        // ------------------------------------------
        // Build student query
        // ------------------------------------------

        const studentConditions =
            uniqueScopes.map(
                (scope) => ({
                    department:
                        scope.department,

                    program:
                        scope.program,

                    semester:
                        scope.semester,

                    section:
                        scope.section
                })
            );


        const studentQuery = {
            $or: studentConditions
        };


        if (department) {
            studentQuery.department =
                department.toLowerCase();
        }

        if (program) {
            studentQuery.program =
                program.toLowerCase();
        }

        if (semester) {
            studentQuery.semester =
                Number(semester);
        }

        if (section) {
            studentQuery.section =
                section.toUpperCase();
        }


        const students =
            await StudentProfile.find(
                studentQuery
            )
                .populate({
                    path: "user",
                    select:
                        "name email mobile isActive"
                })
                .sort({
                    studentId: 1
                })
                .lean();


        // ------------------------------------------
        // Campus presence
        // ------------------------------------------

        const studentIds =
            students.map(
                (student) => student._id
            );


        const presenceRecords =
            await CampusPresence.find({
                studentProfile: {
                    $in: studentIds
                }
            })
                .lean();


        const presenceMap =
            new Map();


        presenceRecords.forEach(
            (record) => {
                presenceMap.set(
                    String(record.studentProfile),
                    record
                );
            }
        );


        // ------------------------------------------
        // Combine student + presence
        // ------------------------------------------

        let studentPresence =
            students.map(
                (student) => {

                    const presence =
                        presenceMap.get(
                            String(student._id)
                        );


                    return {
                        student,
                        presence:
                            presence || {
                                status: "unknown",
                                location: null,
                                lastVerifiedAt: null,
                                source: "system",
                                remarks: ""
                            }
                    };
                }
            );


        // ------------------------------------------
        // Status filter
        // ------------------------------------------

        if (status) {

            studentPresence =
                studentPresence.filter(
                    (item) =>
                        item.presence.status ===
                        status
                );
        }


        // ------------------------------------------
        // Search filter
        // ------------------------------------------

        if (search) {

            const searchText =
                search
                    .trim()
                    .toLowerCase();


            studentPresence =
                studentPresence.filter(
                    (item) => {

                        const name =
                            item.student.user?.name ||
                            "";

                        const email =
                            item.student.user?.email ||
                            "";

                        const studentId =
                            item.student.studentId ||
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
        // Summary
        // ------------------------------------------

        const summary = {
            total:
                studentPresence.length,

            onCampus:
                studentPresence.filter(
                    (item) =>
                        item.presence.status ===
                        "on_campus"
                ).length,

            hostel:
                studentPresence.filter(
                    (item) =>
                        item.presence.status ===
                        "hostel"
                ).length,

            outsideCampus:
                studentPresence.filter(
                    (item) =>
                        item.presence.status ===
                        "outside_campus"
                ).length,

            onLeave:
                studentPresence.filter(
                    (item) =>
                        item.presence.status ===
                        "on_leave"
                ).length,

            unknown:
                studentPresence.filter(
                    (item) =>
                        item.presence.status ===
                        "unknown"
                ).length
        };


        // ------------------------------------------
        // Academic areas for filters
        // ------------------------------------------

        const academicAreas =
            uniqueScopes.sort(
                (a, b) =>
                    a.department.localeCompare(
                        b.department
                    )
            );


        return res.render(
            "faculty/campus-presence",
            {
                title:
                    "Campus Presence",

                students:
                    studentPresence,

                academicAreas,

                filters: {
                    department,
                    program,
                    semester,
                    section,
                    status,
                    search
                },

                summary
            }
        );

    } catch (error) {

        console.error(
            "Faculty campus presence error:",
            error
        );

        return next(error);
    }
};


module.exports = {
    showCampusPresence
};