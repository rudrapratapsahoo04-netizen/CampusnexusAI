
const StudentProfile = require("../models/StudentProfile");
const Notice = require("../models/Notice");


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


/*
|--------------------------------------------------------------------------
| Show Student Notices
|--------------------------------------------------------------------------
*/

const showStudentNotices = async (
    req,
    res,
    next
) => {
    try {

        const userId =
            req.session.user?._id;

        if (!userId) {

            req.flash(
                "error",
                "Please login first."
            );

            return res.redirect(
                "/auth/login/student"
            );
        }

        // ------------------------------------------
        // Student Profile
        // ------------------------------------------

        const student =
            await StudentProfile.findOne({
                user: userId
            })
                .populate(
                    "user",
                    "name email"
                )
                .lean();

        if (!student) {

            req.flash(
                "error",
                "Student profile not found."
            );

            return res.redirect(
                "/student/dashboard"
            );
        }

        // ------------------------------------------
        // Student Academic Data
        // ------------------------------------------

        const department =
            normalizeText(
                student.department
            );

        const program =
            normalizeText(
                student.program
            );

        const semester =
            Number(
                student.semester
            );

        const section =
            normalizeUpper(
                student.section
            );

        // ------------------------------------------
        // Applicable Notices
        // ------------------------------------------

        const notices =
            await Notice.find({

                isActive: true,

                publishedAt: {
                    $lte: new Date()
                },

                audience: {
                    $in: [
                        "students",
                        "both"
                    ]
                },

                $or: [

                    // ------------------------------------------
                    // University
                    // ------------------------------------------

                    {
                        scope:
                            "university"
                    },

                    // ------------------------------------------
                    // Department
                    // ------------------------------------------

                    {
                        scope:
                            "department",

                        department
                    },

                    // ------------------------------------------
                    // Program
                    // ------------------------------------------

                    {
                        scope:
                            "program",

                        department,

                        program
                    },

                    // ------------------------------------------
                    // Semester
                    // ------------------------------------------

                    {
                        scope:
                            "semester",

                        department,

                        program,

                        semester
                    },

                    // ------------------------------------------
                    // Section
                    // ------------------------------------------

                    {
                        scope:
                            "section",

                        department,

                        program,

                        semester,

                        section
                    },

                    // ------------------------------------------
                    // Faculty Leave / Multiple Targets
                    // ------------------------------------------

                    {
                        targets: {
                            $elemMatch: {

                                department,

                                program,

                                semester,

                                section

                            }
                        }
                    }
                ]

            })
                .populate(
                    "publishedBy",
                    "name email role"
                )
                .populate(
                    "facultyLeave"
                )
                .sort({
                    publishedAt: -1
                })
                .lean();

        // ------------------------------------------
        // Prepare Notices
        // ------------------------------------------

        const preparedNotices =
            notices.map(
                (notice) => {

                    let matchedTarget =
                        null;

                    if (
                        Array.isArray(
                            notice.targets
                        )
                    ) {

                        matchedTarget =
                            notice.targets.find(
                                (target) => {

                                    return (

                                        normalizeText(
                                            target.department
                                        ) ===
                                        department &&

                                        normalizeText(
                                            target.program
                                        ) ===
                                        program &&

                                        Number(
                                            target.semester
                                        ) ===
                                        semester &&

                                        normalizeUpper(
                                            target.section
                                        ) ===
                                        section

                                    );

                                }
                            );

                    }

                    return {

                        ...notice,

                        matchedTarget,

                        displayDepartment:
                            matchedTarget?.department ||
                            notice.department ||
                            null,

                        displayProgram:
                            matchedTarget?.program ||
                            notice.program ||
                            null,

                        displaySemester:
                            matchedTarget?.semester ||
                            notice.semester ||
                            null,

                        displaySection:
                            matchedTarget?.section ||
                            notice.section ||
                            null,

                        displayCourseCode:
                            matchedTarget?.courseCode ||
                            notice.courseCode ||
                            null,

                        displayCourseName:
                            matchedTarget?.courseName ||
                            notice.courseName ||
                            null
                    };

                }
            );

        // ------------------------------------------
        // Summary
        // ------------------------------------------

        const summary = {

            total:
                preparedNotices.length,

            facultyLeave:
                preparedNotices.filter(
                    (notice) =>
                        notice.noticeType ===
                        "faculty_leave"
                ).length,

            academic:
                preparedNotices.filter(
                    (notice) =>
                        notice.noticeType ===
                        "academic"
                ).length,

            classRelated:
                preparedNotices.filter(
                    (notice) =>
                        notice.noticeType ===
                            "class_cancelled" ||

                        notice.noticeType ===
                            "class_rescheduled"
                ).length
        };

        // ------------------------------------------
        // Render
        // ------------------------------------------

        return res.render(
            "student/notices",
            {
                title:
                    "My Notices",

                studentProfile:
                    student,

                notices:
                    preparedNotices,

                summary,

                academic: {
                    department,
                    program,
                    semester,
                    section
                }
            }
        );

    } catch (error) {

        console.error(
            "Student Notices Error:",
            error
        );

        next(error);
    }
};



module.exports = {
    showStudentNotices
};
