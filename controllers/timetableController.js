const Timetable = require("../models/Timetable");
const StudentProfile = require("../models/StudentProfile");

const showTimetable = async (req, res, next) => {
    try {

        console.log("\n========================================");
        console.log("TIMETABLE ROUTE HIT");
        console.log("========================================");

        console.log(
            "SESSION USER:",
            req.session.user
        );

        const userId = req.session.user.id;

        console.log(
            "USER ID:",
            userId
        );

        const studentProfile =
            await StudentProfile.findOne({
                user: userId
            }).lean();

        console.log(
            "STUDENT PROFILE:",
            studentProfile
        );

        if (!studentProfile) {

            console.log(
                "NO STUDENT PROFILE FOUND"
            );

            return res.status(404).render("error", {
                title: "Profile Not Found",
                statusCode: 404,
                message:
                    "Student profile was not found. Please contact the administrator.",
                currentUser:
                    req.session.user || null
            });
        }

        console.log(
            "SEARCHING TIMETABLE FOR:"
        );

        console.log({
            department: studentProfile.department,
            program: studentProfile.program,
            semester: studentProfile.semester,
            section: studentProfile.section
        });

        const timetable =
            await Timetable.find({
                department: studentProfile.department,
                program: studentProfile.program,
                semester: studentProfile.semester,
                section: studentProfile.section,
                isActive: true
            })
                .sort({
                    day: 1,
                    startTime: 1
                })
                .lean();

        console.log(
            "TIMETABLE COUNT:",
            timetable.length
        );

        const days = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday"
        ];

        const timetableByDay = {};

        days.forEach((day) => {

            timetableByDay[day] =
                timetable.filter(
                    (item) =>
                        item.day === day
                );

        });

        console.log(
            "TIMETABLE GROUPED SUCCESSFULLY"
        );

        return res.render(
            "student/timetable",
            {
                title: "My Timetable",
                studentProfile,
                timetable,
                timetableByDay,
                days
            }
        );

    } catch (error) {

        console.error(
            "TIMETABLE ERROR:",
            error
        );

        return next(error);
    }
};

module.exports = {
    showTimetable
};