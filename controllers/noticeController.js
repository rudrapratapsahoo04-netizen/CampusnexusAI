
const Notice = require("../models/Notice");

const StudentProfile = require("../models/StudentProfile");

const Department = require("../models/Department");

const Program = require("../models/Program");

const FacultyAssignment = require("../models/FacultyAssignment");

const LeaveRequest = require("../models/LeaveRequest");

/*
|--------------------------------------------------------------------------
| STUDENT NOTICES
|--------------------------------------------------------------------------
*/

const showStudentNotices = async (
    req,
    res,
    next
) => {

    try {

        const userId =
            req.session.user.id;


        const studentProfile =
            await StudentProfile.findOne({
                user: userId
            }).lean();


        if (!studentProfile) {

            return res.status(404).render(
                "error",
                {
                    title: "Profile Not Found",
                    statusCode: 404,
                    message:
                        "Student profile was not found."
                }
            );

        }


        const notices =
            await Notice.find({

                isActive: true,

                $or: [

                    {
                        scope: "university"
                    },

                    {
                        scope: "department",

                        department:
                            studentProfile.department
                    },

                    {
                        scope: "program",

                        department:
                            studentProfile.department,

                        program:
                            studentProfile.program
                    },

                    {
                        scope: "semester",

                        department:
                            studentProfile.department,

                        program:
                            studentProfile.program,

                        semester:
                            studentProfile.semester
                    },

                    {
                        scope: "section",

                        department:
                            studentProfile.department,

                        program:
                            studentProfile.program,

                        semester:
                            studentProfile.semester,

                        section:
                            studentProfile.section
                    }

                ]

            })
                .populate(
                    "publishedBy",
                    "name role"
                )
                .sort({
                    publishedAt: -1
                })
                .lean();


        return res.render(
            "student/notices",
            {
                title: "Notices",
                studentProfile,
                notices
            }
        );


    } catch (error) {

        console.error(
            "Student notices error:",
            error
        );

        return next(error);

    }

};





/*
|--------------------------------------------------------------------------
| ADMIN NOTICES
|--------------------------------------------------------------------------
*/

const showAdminNotices = async (
    req,
    res,
    next
) => {

    try {

        const [
            notices,
            departments,
            programs
        ] = await Promise.all([

            Notice.find({})
                .populate(
                    "publishedBy",
                    "name role"
                )
                .sort({
                    publishedAt: -1
                })
                .lean(),


            Department.find({
                status: "active"
            })
                .sort({
                    name: 1
                })
                .lean(),


            Program.find({
                status: "active"
            })
                .populate(
                    "department",
                    "name code"
                )
                .sort({
                    name: 1
                })
                .lean()

        ]);


        return res.render(
            "admin/notices",
            {
                title: "Notice Management",
                notices,
                departments,
                programs
            }
        );


    } catch (error) {

        console.error(
            "Admin notices error:",
            error
        );

        return next(error);

    }

};





/*
|--------------------------------------------------------------------------
| CREATE ADMIN NOTICE
|--------------------------------------------------------------------------
*/

const createAdminNotice = async (
    req,
    res,
    next
) => {

    try {

        const {
            title,
            noticeType,
            description,
            audience,
            scope,
            department,
            program,
            semester,
            section,
            courseCode,
            courseName,
            noticeDate,
            attachment
        } = req.body;



        /*
        |--------------------------------------------------------------------------
        | BASIC VALIDATION
        |--------------------------------------------------------------------------
        */

        if (!title || !title.trim()) {

            req.flash(
                "error",
                "Notice title is required."
            );

            return res.redirect(
                "/admin/notices"
            );

        }


        if (!noticeType) {

            req.flash(
                "error",
                "Notice type is required."
            );

            return res.redirect(
                "/admin/notices"
            );

        }


        if (
            !description ||
            !description.trim()
        ) {

            req.flash(
                "error",
                "Notice description is required."
            );

            return res.redirect(
                "/admin/notices"
            );

        }


        const allowedAudiences = [
            "students",
            "faculty",
            "both"
        ];


        if (
            !allowedAudiences.includes(
                audience
            )
        ) {

            req.flash(
                "error",
                "Invalid notice audience."
            );

            return res.redirect(
                "/admin/notices"
            );

        }


        const allowedScopes = [
            "university",
            "department",
            "program",
            "semester",
            "section"
        ];


        if (
            !allowedScopes.includes(
                scope
            )
        ) {

            req.flash(
                "error",
                "Invalid notice scope."
            );

            return res.redirect(
                "/admin/notices"
            );

        }



        /*
        |--------------------------------------------------------------------------
        | CLEAN VALUES
        |--------------------------------------------------------------------------
        */

        const cleanDepartment =
            department
                ? department
                    .trim()
                    .toLowerCase()
                : null;


        const cleanProgram =
            program
                ? program
                    .trim()
                    .toLowerCase()
                : null;


        const cleanSection =
            section
                ? section
                    .trim()
                    .toUpperCase()
                : null;


        const parsedSemester =
            semester
                ? Number(semester)
                : null;



        /*
        |--------------------------------------------------------------------------
        | SCOPE VALIDATION
        |--------------------------------------------------------------------------
        */

        if (
            scope === "department" ||
            scope === "program" ||
            scope === "semester" ||
            scope === "section"
        ) {

            if (!cleanDepartment) {

                req.flash(
                    "error",
                    "Department is required for this notice scope."
                );

                return res.redirect(
                    "/admin/notices"
                );

            }

        }


        if (
            scope === "program" ||
            scope === "semester" ||
            scope === "section"
        ) {

            if (!cleanProgram) {

                req.flash(
                    "error",
                    "Program is required for this notice scope."
                );

                return res.redirect(
                    "/admin/notices"
                );

            }

        }


        if (
            scope === "semester" ||
            scope === "section"
        ) {

            if (
                !parsedSemester ||
                parsedSemester < 1 ||
                parsedSemester > 8
            ) {

                req.flash(
                    "error",
                    "Valid semester is required."
                );

                return res.redirect(
                    "/admin/notices"
                );

            }

        }


        if (scope === "section") {

            if (!cleanSection) {

                req.flash(
                    "error",
                    "Section is required."
                );

                return res.redirect(
                    "/admin/notices"
                );

            }

        }



        /*
        |--------------------------------------------------------------------------
        | DEPARTMENT VALIDATION
        |--------------------------------------------------------------------------
        */

        let departmentDocument = null;


        if (cleanDepartment) {

            departmentDocument =
                await Department.findOne({

                    code:
                        cleanDepartment.toUpperCase(),

                    status: "active"

                }).lean();


            if (!departmentDocument) {

                req.flash(
                    "error",
                    "Selected department is invalid."
                );

                return res.redirect(
                    "/admin/notices"
                );

            }

        }



        /*
        |--------------------------------------------------------------------------
        | PROGRAM VALIDATION
        |--------------------------------------------------------------------------
        */

        let programDocument = null;


        if (cleanProgram) {

            if (!departmentDocument) {

                req.flash(
                    "error",
                    "Department is required before selecting program."
                );

                return res.redirect(
                    "/admin/notices"
                );

            }


            programDocument =
                await Program.findOne({

                    code:
                        cleanProgram.toUpperCase(),

                    department:
                        departmentDocument._id,

                    status: "active"

                }).lean();


            if (!programDocument) {

                req.flash(
                    "error",
                    "Selected program does not belong to the selected department."
                );

                return res.redirect(
                    "/admin/notices"
                );

            }

        }



        /*
        |--------------------------------------------------------------------------
        | BUILD NOTICE TARGET
        |--------------------------------------------------------------------------
        */

        const target = {};


        if (cleanDepartment) {

            target.department =
                cleanDepartment;

        }


        if (cleanProgram) {

            target.program =
                cleanProgram;

        }


        if (parsedSemester) {

            target.semester =
                parsedSemester;

        }


        if (cleanSection) {

            target.section =
                cleanSection;

        }


        if (
            courseCode &&
            courseCode.trim()
        ) {

            target.courseCode =
                courseCode
                    .trim()
                    .toUpperCase();

        }


        if (
            courseName &&
            courseName.trim()
        ) {

            target.courseName =
                courseName.trim();

        }



        /*
        |--------------------------------------------------------------------------
        | CREATE NOTICE
        |--------------------------------------------------------------------------
        */

        const notice =
            await Notice.create({

                noticeType,

                title:
                    title.trim(),

                description:
                    description.trim(),

                audience,

                scope,

                department:
                    cleanDepartment,

                program:
                    cleanProgram,

                semester:
                    parsedSemester,

                section:
                    cleanSection,

                courseCode:
                    target.courseCode ||
                    null,

                courseName:
                    target.courseName ||
                    null,

                targets:
                    Object.keys(target).length > 0
                        ? [target]
                        : [],

                publishedBy:
                    req.session.user.id,

                publisherRole:
                    "admin",

                noticeDate:
                    noticeDate
                        ? new Date(noticeDate)
                        : new Date(),

                attachment:
                    attachment &&
                    attachment.trim()
                        ? attachment.trim()
                        : null,

                publishedAt:
                    new Date(),

                isActive:
                    true

            });


        console.log(
            "Admin notice published:",
            notice._id
        );


        req.flash(
            "success",
            "Notice published successfully."
        );


        return res.redirect(
            "/admin/notices"
        );


    } catch (error) {

        console.error(
            "Create admin notice error:",
            error
        );


        req.flash(
            "error",
            "Unable to publish notice."
        );


        return res.redirect(
            "/admin/notices"
        );

    }

};





/*
|--------------------------------------------------------------------------
| TOGGLE ADMIN NOTICE STATUS
|--------------------------------------------------------------------------
*/

const toggleAdminNoticeStatus = async (
    req,
    res,
    next
) => {

    try {

        const { id } =
            req.params;


        const notice =
            await Notice.findById(id);


        if (!notice) {

            req.flash(
                "error",
                "Notice not found."
            );

            return res.redirect(
                "/admin/notices"
            );

        }


        notice.isActive =
            !notice.isActive;


        await notice.save();


        req.flash(
            "success",
            notice.isActive
                ? "Notice activated successfully."
                : "Notice deactivated successfully."
        );


        return res.redirect(
            "/admin/notices"
        );


    } catch (error) {

        console.error(
            "Toggle admin notice status error:",
            error
        );


        req.flash(
            "error",
            "Unable to update notice status."
        );


        return res.redirect(
            "/admin/notices"
        );

    }

};





/*
|--------------------------------------------------------------------------
| FACULTY CREATE NOTICE
|--------------------------------------------------------------------------
|
| Faculty can publish notices only for an academic area
| assigned through FacultyAssignment.
|
*/

const createFacultyNotice = async (
    req,
    res,
    next
) => {
    try {
        const facultyId =
            req.session.user.id;

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


        /* =========================================================
           BASIC VALIDATION
        ========================================================== */

        if (
            !noticeType ||
            !title ||
            !description ||
            !department ||
            !program ||
            !semester ||
            !section ||
            !courseCode
        ) {
            req.flash(
                "error",
                "Please complete all required notice and academic fields."
            );

            return res.redirect(
                "/faculty/notices"
            );
        }


        const cleanDepartment =
            String(department)
                .trim()
                .toLowerCase();

        const cleanProgram =
            String(program)
                .trim()
                .toLowerCase();

        const cleanSemester =
            Number(semester);

        const cleanSection =
            String(section)
                .trim()
                .toUpperCase();

        const cleanCourseCode =
            String(courseCode)
                .trim()
                .toUpperCase();


        if (
            !Number.isInteger(
                cleanSemester
            ) ||
            cleanSemester < 1 ||
            cleanSemester > 8
        ) {
            req.flash(
                "error",
                "Invalid semester selected."
            );

            return res.redirect(
                "/faculty/notices"
            );
        }


        /* =========================================================
           FACULTY ASSIGNMENT SECURITY CHECK
        ========================================================== */

        const assignment =
            await FacultyAssignment.findOne({
                faculty: facultyId,
                department: cleanDepartment,
                program: cleanProgram,
                semester: cleanSemester,
                section: cleanSection,
                courseCode: cleanCourseCode,
                isActive: true
            }).lean();


        if (!assignment) {

            req.flash(
                "error",
                "You are not assigned to this academic area or course."
            );

            return res.redirect(
                "/faculty/notices"
            );
        }


        /* =========================================================
           NOTICE TYPE VALIDATION
        ========================================================== */

        const allowedNoticeTypes = [
            "faculty_leave",
            "class_cancelled",
            "class_rescheduled",
            "academic",
            "assignment",
            "other"
        ];


        if (
            !allowedNoticeTypes.includes(
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


        /* =========================================================
           TARGET
        ========================================================== */

        const target = {
            department: cleanDepartment,
            program: cleanProgram,
            semester: cleanSemester,
            section: cleanSection,
            courseCode: cleanCourseCode,
            courseName:
                String(
                    courseName ||
                    assignment.courseName ||
                    ""
                ).trim()
        };


        /* =========================================================
           FACULTY LEAVE
        ========================================================== */

        let facultyLeaveData = null;


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


            const leave =
                await LeaveRequest.findOne({
                    _id: facultyLeave,
                    applicant: facultyId,
                    applicantType: "faculty",
                    status: "approved"
                }).lean();


            if (!leave) {

                req.flash(
                    "error",
                    "Selected leave is not a valid approved faculty leave."
                );

                return res.redirect(
                    "/faculty/notices"
                );
            }


            facultyLeaveData = {
                leaveType:
                    leave.leaveType || "Leave",

                startDate:
                    leave.fromDate,

                endDate:
                    leave.toDate
            };
        }


        /* =========================================================
           RESCHEDULE VALIDATION
        ========================================================== */

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
                    "Please provide the new class date and time."
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


        /* =========================================================
           CREATE NOTICE
        ========================================================== */

        await Notice.create({

            noticeType,

            title:
                String(title)
                    .trim(),

            description:
                String(description)
                    .trim(),

            /*
             * Faculty notices are for students.
             * Faculty cannot create university-wide notices.
             */
            audience: "students",

            scope: "section",

            department:
                cleanDepartment,

            program:
                cleanProgram,

            semester:
                cleanSemester,

            section:
                cleanSection,

            courseCode:
                cleanCourseCode,

            courseName:
                target.courseName,

            targets: [
                target
            ],

            publishedBy:
                facultyId,

            publisherRole:
                "faculty",

            facultyLeave:
                facultyLeaveData,

            noticeDate:
                noticeDate
                    ? new Date(noticeDate)
                    : new Date(),

            rescheduledDate:
                noticeType ===
                "class_rescheduled"
                    ? new Date(
                        rescheduledDate
                    )
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

            publishedAt:
                new Date(),

            isActive:
                true
        });


        req.flash(
            "success",
            "Notice published successfully."
        );

        return res.redirect(
            "/faculty/notices"
        );

    } catch (error) {

        console.error(
            "Faculty notice publish error:",
            error
        );

        req.flash(
            "error",
            "Unable to publish notice."
        );

        return res.redirect(
            "/faculty/notices"
        );
    }
};



/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {

    showStudentNotices,

    showAdminNotices,

    createAdminNotice,

    toggleAdminNoticeStatus,

    createFacultyNotice

};
