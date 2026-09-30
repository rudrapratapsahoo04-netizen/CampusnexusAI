
const mongoose = require("mongoose");

const Notice = require("../models/Notice");
const Timetable = require("../models/Timetable");
const FacultyLeave = require("../models/FacultyLeave");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const normalizeText = (value) => {
    return String(value || "")
        .trim()
        .toLowerCase();
};

const normalizeUpper = (value) => {
    return String(value || "")
        .trim()
        .toUpperCase();
};

const normalizeSemester = (value) => {
    const semester = Number(value);

    if (
        !Number.isInteger(semester) ||
        semester < 1 ||
        semester > 8
    ) {
        return null;
    }

    return semester;
};

/*
|--------------------------------------------------------------------------
| Build Unique Targets
|--------------------------------------------------------------------------
*/

const buildUniqueTargets = (assignments) => {
    const targetMap = new Map();

    for (const assignment of assignments) {
        const department =
            normalizeText(
                assignment.department
            );

        const program =
            normalizeText(
                assignment.program
            );

        const semester =
            normalizeSemester(
                assignment.semester
            );

        const section =
            normalizeUpper(
                assignment.section
            );

        const courseCode =
            normalizeUpper(
                assignment.courseCode
            );

        const courseName =
            String(
                assignment.courseName || ""
            ).trim();

        if (
            !department ||
            !program ||
            !semester ||
            !section
        ) {
            continue;
        }

        const key = [
            department,
            program,
            semester,
            section,
            courseCode
        ].join("|");

        if (!targetMap.has(key)) {
            targetMap.set(
                key,
                {
                    department,
                    program,
                    semester,
                    section,
                    courseCode:
                        courseCode || null,
                    courseName:
                        courseName || null
                }
            );
        }
    }

    return Array.from(
        targetMap.values()
    );
};

/*
|--------------------------------------------------------------------------
| Get Faculty Timetable Assignments
|--------------------------------------------------------------------------
|
| Timetable is the current source of truth for faculty academic assignments.
|
|--------------------------------------------------------------------------
*/

const getFacultyAssignments = async (
    facultyName
) => {
    if (!facultyName) {
        return [];
    }

    return Timetable.find({
        facultyName: {
            $regex: `^${facultyName}$`,
            $options: "i"
        },
        isActive: true
    })
        .sort({
            department: 1,
            program: 1,
            semester: 1,
            section: 1,
            courseCode: 1
        })
        .lean();
};

/*
|--------------------------------------------------------------------------
| Show Faculty Notices
|--------------------------------------------------------------------------
*/

const showFacultyNotices = async (
    req,
    res,
    next
) => {
    try {
        const facultyId =
            req.session.user?._id ||
            req.session.user?.id;

        const facultyName =
            req.session.user?.name;

        if (!facultyId || !facultyName) {
            req.flash(
                "error",
                "Please login first."
            );

            return res.redirect(
                "/auth/login/faculty"
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Active faculty assignments
        |--------------------------------------------------------------------------
        */

        const assignments =
            await getFacultyAssignments(
                facultyName
            );

        /*
        |--------------------------------------------------------------------------
        | Approved faculty leaves
        |--------------------------------------------------------------------------
        */

        const approvedLeaves =
            await FacultyLeave.find({
                faculty: facultyId,
                status: "approved"
            })
                .sort({
                    startDate: -1
                })
                .lean();

        /*
        |--------------------------------------------------------------------------
        | Published faculty notices
        |--------------------------------------------------------------------------
        */

        const notices =
            await Notice.find({
                publishedBy: facultyId,
                publisherRole: "faculty"
            })
                .populate(
                    "facultyLeave"
                )
                .sort({
                    publishedAt: -1
                })
                .lean();

        return res.render(
            "faculty/notices",
            {
                title:
                    "Faculty Notices",

                assignments,

                approvedLeaves,

                notices
            }
        );
    } catch (error) {
        console.error(
            "Show Faculty Notices Error:",
            error
        );

        return next(error);
    }
};

/*
|--------------------------------------------------------------------------
| Publish Faculty Notice
|--------------------------------------------------------------------------
*/

const publishFacultyNotice = async (
    req,
    res,
    next
) => {
    try {
        const facultyId =
            req.session.user?._id ||
            req.session.user?.id;

        const facultyName =
            req.session.user?.name;

        if (!facultyId || !facultyName) {
            req.flash(
                "error",
                "Please login first."
            );

            return res.redirect(
                "/auth/login/faculty"
            );
        }

        const {
            noticeType,
            title,
            description,
            department,
            program,
            semester,
            section,
            courseCode,
            courseName,
            noticeDate,
            facultyLeave,
            rescheduledDate,
            rescheduledStartTime,
            rescheduledEndTime
        } = req.body;

        /*
        |--------------------------------------------------------------------------
        | Basic validation
        |--------------------------------------------------------------------------
        */

        const allowedTypes = [
            "faculty_leave",
            "class_cancelled",
            "class_rescheduled",
            "academic",
            "assignment",
            "other"
        ];

        if (
            !allowedTypes.includes(
                noticeType
            )
        ) {
            req.flash(
                "error",
                "Invalid notice type."
            );

            return res.redirect(
                "/faculty/notices"
            );
        }

        const cleanTitle =
            String(title || "")
                .trim();

        const cleanDescription =
            String(description || "")
                .trim();

        if (
            !cleanTitle ||
            !cleanDescription
        ) {
            req.flash(
                "error",
                "Title and description are required."
            );

            return res.redirect(
                "/faculty/notices"
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Get current faculty assignments
        |--------------------------------------------------------------------------
        */

        const assignments =
            await getFacultyAssignments(
                facultyName
            );

        /*
        |--------------------------------------------------------------------------
        | FACULTY LEAVE NOTICE
        |--------------------------------------------------------------------------
        */

        if (
            noticeType ===
            "faculty_leave"
        ) {
            if (!facultyLeave) {
                req.flash(
                    "error",
                    "Please select an approved faculty leave."
                );

                return res.redirect(
                    "/faculty/notices"
                );
            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    facultyLeave
                )
            ) {
                req.flash(
                    "error",
                    "Invalid faculty leave."
                );

                return res.redirect(
                    "/faculty/notices"
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Verify approved leave belongs to current faculty
            |--------------------------------------------------------------------------
            */

            const selectedLeave =
                await FacultyLeave.findOne({
                    _id: facultyLeave,
                    faculty: facultyId,
                    status: "approved"
                }).lean();

            if (!selectedLeave) {
                req.flash(
                    "error",
                    "Selected leave is not approved or does not belong to you."
                );

                return res.redirect(
                    "/faculty/notices"
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Faculty must have active timetable assignments
            |--------------------------------------------------------------------------
            */

            if (
                assignments.length === 0
            ) {
                req.flash(
                    "error",
                    "You do not have any active teaching assignments."
                );

                return res.redirect(
                    "/faculty/notices"
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Build notice targets
            |--------------------------------------------------------------------------
            */

            const targets =
                buildUniqueTargets(
                    assignments
                );

            if (
                targets.length === 0
            ) {
                req.flash(
                    "error",
                    "No valid academic targets found."
                );

                return res.redirect(
                    "/faculty/notices"
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Create faculty leave notice
            |--------------------------------------------------------------------------
            */

            const notice =
                new Notice({
                    noticeType:
                        "faculty_leave",

                    title:
                        cleanTitle,

                    description:
                        cleanDescription,

                    scope:
                        "section",

                    department:
                        null,

                    program:
                        null,

                    semester:
                        null,

                    section:
                        null,

                    courseCode:
                        null,

                    courseName:
                        null,

                    targets,

                    publishedBy:
                        facultyId,

                    publisherRole:
                        "faculty",

                    facultyLeave:
                        selectedLeave._id,

                    noticeDate:
                        selectedLeave.startDate,

                    isActive:
                        true
                });

            await notice.save();

            req.flash(
                "success",
                `Faculty leave notice sent to ${targets.length} assigned class target(s).`
            );

            return res.redirect(
                "/faculty/notices"
            );
        }

        /*
        |--------------------------------------------------------------------------
        | NORMAL FACULTY NOTICE
        |--------------------------------------------------------------------------
        */

        const normalizedDepartment =
            normalizeText(
                department
            );

        const normalizedProgram =
            normalizeText(
                program
            );

        const normalizedSemester =
            normalizeSemester(
                semester
            );

        const normalizedSection =
            normalizeUpper(
                section
            );

        const normalizedCourseCode =
            normalizeUpper(
                courseCode
            );

        if (
            !normalizedDepartment ||
            !normalizedProgram ||
            !normalizedSemester ||
            !normalizedSection ||
            !normalizedCourseCode
        ) {
            req.flash(
                "error",
                "Please select Department, Program, Semester, Section and Course."
            );

            return res.redirect(
                "/faculty/notices"
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Security:
        | Faculty can only publish to their assigned
        | department/program/semester/section/course.
        |--------------------------------------------------------------------------
        */

        const assignment =
            assignments.find(
                (item) =>
                    normalizeText(
                        item.department
                    ) ===
                        normalizedDepartment &&

                    normalizeText(
                        item.program
                    ) ===
                        normalizedProgram &&

                    Number(
                        item.semester
                    ) ===
                        normalizedSemester &&

                    normalizeUpper(
                        item.section
                    ) ===
                        normalizedSection &&

                    normalizeUpper(
                        item.courseCode
                    ) ===
                        normalizedCourseCode
            );

        if (!assignment) {
            req.flash(
                "error",
                "You are not assigned to this course and section."
            );

            return res.redirect(
                "/faculty/notices"
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Notice date
        |--------------------------------------------------------------------------
        */

        let parsedNoticeDate =
            null;

        if (noticeDate) {
            parsedNoticeDate =
                new Date(
                    noticeDate
                );

            if (
                Number.isNaN(
                    parsedNoticeDate.getTime()
                )
            ) {
                req.flash(
                    "error",
                    "Invalid notice date."
                );

                return res.redirect(
                    "/faculty/notices"
                );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Rescheduled class validation
        |--------------------------------------------------------------------------
        */

        let parsedRescheduledDate =
            null;

        if (
            noticeType ===
            "class_rescheduled"
        ) {
            if (
                !rescheduledDate ||
                !rescheduledStartTime ||
                !rescheduledEndTime
            ) {
                req.flash(
                    "error",
                    "Please provide new class date and time."
                );

                return res.redirect(
                    "/faculty/notices"
                );
            }

            parsedRescheduledDate =
                new Date(
                    rescheduledDate
                );

            const timeRegex =
                /^([01]\d|2[0-3]):[0-5]\d$/;

            if (
                Number.isNaN(
                    parsedRescheduledDate.getTime()
                ) ||
                !timeRegex.test(
                    rescheduledStartTime
                ) ||
                !timeRegex.test(
                    rescheduledEndTime
                )
            ) {
                req.flash(
                    "error",
                    "Invalid rescheduled date or time."
                );

                return res.redirect(
                    "/faculty/notices"
                );
            }

            if (
                rescheduledStartTime >=
                rescheduledEndTime
            ) {
                req.flash(
                    "error",
                    "End time must be after start time."
                );

                return res.redirect(
                    "/faculty/notices"
                );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Create normal notice
        |--------------------------------------------------------------------------
        */

        const notice =
            new Notice({
                noticeType,

                title:
                    cleanTitle,

                description:
                    cleanDescription,

                scope:
                    "section",

                department:
                    assignment.department,

                program:
                    assignment.program,

                semester:
                    assignment.semester,

                section:
                    assignment.section,

                courseCode:
                    assignment.courseCode,

                courseName:
                    assignment.courseName,

                targets: [
                    {
                        department:
                            assignment.department,

                        program:
                            assignment.program,

                        semester:
                            assignment.semester,

                        section:
                            assignment.section,

                        courseCode:
                            assignment.courseCode,

                        courseName:
                            assignment.courseName
                    }
                ],

                publishedBy:
                    facultyId,

                publisherRole:
                    "faculty",

                noticeDate:
                    parsedNoticeDate,

                rescheduledDate:
                    noticeType ===
                    "class_rescheduled"
                        ? parsedRescheduledDate
                        : null,

                rescheduledStartTime:
                    noticeType ===
                    "class_rescheduled"
                        ? rescheduledStartTime
                        : null,

                rescheduledEndTime:
                    noticeType ===
                    "class_rescheduled"
                        ? rescheduledEndTime
                        : null,

                isActive:
                    true
            });

        await notice.save();

        req.flash(
            "success",
            "Notice published successfully."
        );

        return res.redirect(
            "/faculty/notices"
        );
    } catch (error) {
        console.error(
            "Publish Faculty Notice Error:",
            error
        );

        return next(error);
    }
};

/*
|--------------------------------------------------------------------------
| Deactivate Faculty Notice
|--------------------------------------------------------------------------
*/

const deactivateFacultyNotice = async (
    req,
    res,
    next
) => {
    try {
        const facultyId =
            req.session.user?._id ||
            req.session.user?.id;

        const { id } =
            req.params;

        if (!facultyId) {
            req.flash(
                "error",
                "Please login first."
            );

            return res.redirect(
                "/auth/login/faculty"
            );
        }

        if (
            !mongoose.Types.ObjectId.isValid(
                id
            )
        ) {
            req.flash(
                "error",
                "Invalid notice."
            );

            return res.redirect(
                "/faculty/notices"
            );
        }

        const notice =
            await Notice.findOne({
                _id: id,

                publishedBy:
                    facultyId,

                publisherRole:
                    "faculty"
            });

        if (!notice) {
            req.flash(
                "error",
                "Notice not found or you are not authorized."
            );

            return res.redirect(
                "/faculty/notices"
            );
        }

        notice.isActive =
            false;

        await notice.save();

        req.flash(
            "success",
            "Notice removed successfully."
        );

        return res.redirect(
            "/faculty/notices"
        );
    } catch (error) {
        console.error(
            "Deactivate Faculty Notice Error:",
            error
        );

        return next(error);
    }
};

module.exports = {
    showFacultyNotices,
    publishFacultyNotice,
    deactivateFacultyNotice
};
