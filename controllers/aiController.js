const mongoose = require("mongoose");

const StudentProfile = require("../models/StudentProfile");
const Attendance = require("../models/Attendance");
const Timetable = require("../models/Timetable");
const Course = require("../models/Course");
const Fee = require("../models/Fee");
const Notice = require("../models/Notice");


// ============================================================
// HELPERS
// ============================================================

const normalize = (value) => {
    return String(value || "")
        .trim()
        .toLowerCase();
};


const formatMoney = (amount) => {
    const value = Number(amount || 0);

    return `₹${value.toLocaleString("en-IN")}`;
};


const formatDate = (date) => {
    if (!date) return "Not available";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
        return "Not available";
    }

    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};


const formatTime = (time) => {
    if (!time) return "";

    const value = String(time).trim();

    if (/am|pm/i.test(value)) {
        return value;
    }

    const match = value.match(/^(\d{1,2}):(\d{2})$/);

    if (!match) {
        return value;
    }

    let hour = Number(match[1]);
    const minute = match[2];

    const suffix = hour >= 12 ? "PM" : "AM";

    if (hour === 0) {
        hour = 12;
    } else if (hour > 12) {
        hour -= 12;
    }

    return `${String(hour).padStart(2, "0")}:${minute} ${suffix}`;
};


const getTodayName = () => {
    const days = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday"
    ];

    return days[new Date().getDay()];
};


// ============================================================
// INTENT DETECTION
// ============================================================

const detectIntent = (message) => {

    const text = normalize(message);

    // ATTENDANCE
    if (
        /\b(attendance|attendence|present|absent|percentage|percent)\b/i.test(text) ||
        /meri attendance/i.test(text) ||
        /mera attendance/i.test(text) ||
        /attendance kitni/i.test(text) ||
        /attendance batao/i.test(text)
    ) {
        return "attendance";
    }


    // TIMETABLE
    if (
        /\b(timetable|time table|schedule|class|classes)\b/i.test(text) ||
        /aaj ki class/i.test(text) ||
        /aaj ka timetable/i.test(text) ||
        /mera timetable/i.test(text) ||
        /my timetable/i.test(text)
    ) {
        return "timetable";
    }


    // COURSES
    if (
        /\b(course|courses|subject|subjects)\b/i.test(text) ||
        /mere course/i.test(text) ||
        /mere courses/i.test(text) ||
        /mere subjects/i.test(text)
    ) {
        return "courses";
    }


    // FEES
    if (
        /\b(fee|fees|payment|paid|due|dues|tuition|examination fee|hostel fee)\b/i.test(text) ||
        /meri fees/i.test(text) ||
        /fees kitni/i.test(text) ||
        /fee status/i.test(text) ||
        /kitna pay/i.test(text)
    ) {
        return "fees";
    }


    // NOTICES
    if (
        /\b(notice|notices|announcement|announcements|notification|notifications)\b/i.test(text) ||
        /latest notice/i.test(text) ||
        /new notice/i.test(text) ||
        /college notice/i.test(text)
    ) {
        return "notices";
    }


    // PROFILE
    if (
        /\b(profile|student profile|my profile|details|information)\b/i.test(text) ||
        /meri details/i.test(text) ||
        /mere details/i.test(text) ||
        /mera profile/i.test(text)
    ) {
        return "profile";
    }


    // HELP
    if (
        /\b(help|what can you do|what do you know)\b/i.test(text)
    ) {
        return "help";
    }


    return "unknown";
};


// ============================================================
// PROFILE
// ============================================================

const getProfileReply = async (profile) => {

    const user = profile.user || {};

    return [
        `Your name: ${user.name || "Not available"}`,
        `Student ID: ${profile.studentId || "Not available"}`,
        `Department: ${profile.department || "Not available"}`,
        `Program: ${profile.program || "Not available"}`,
        `Semester: ${profile.semester || "Not available"}`,
        `Section: ${profile.section || "Not available"}`,
        `Batch: ${profile.batch || "Not available"}`,
        `Mobile: ${profile.mobile || "Not available"}`,
        `Profile status: ${profile.profileStatus || "Not available"}`
    ].join("\n");
};


// ============================================================
// ATTENDANCE
// ============================================================

const getAttendanceReply = async (userId) => {

    const records = await Attendance.find({
        student: userId
    })
        .sort({
            year: -1,
            month: -1,
            courseName: 1
        })
        .lean();


    if (!records.length) {
        return "I couldn't find any attendance records for your account.";
    }


    let totalClasses = 0;
    let totalPresent = 0;
    let totalAbsent = 0;

    const courseMap = new Map();


    for (const record of records) {

        totalClasses += Number(record.totalClasses || 0);

        totalPresent += Number(
            record.presentClasses || 0
        );

        totalAbsent += Number(
            record.absentClasses || 0
        );


        const key =
            record.courseCode ||
            record.courseName ||
            "UNKNOWN";


        if (!courseMap.has(key)) {

            courseMap.set(key, {
                courseCode: record.courseCode,
                courseName: record.courseName,
                totalClasses: 0,
                presentClasses: 0,
                absentClasses: 0
            });
        }


        const course = courseMap.get(key);


        course.totalClasses += Number(
            record.totalClasses || 0
        );

        course.presentClasses += Number(
            record.presentClasses || 0
        );

        course.absentClasses += Number(
            record.absentClasses || 0
        );
    }


    const overallPercentage =
        totalClasses > 0
            ? ((totalPresent / totalClasses) * 100).toFixed(2)
            : "0.00";


    const lines = [
        `Your overall attendance is ${overallPercentage}%.`,
        "",
        `Total classes: ${totalClasses}`,
        `Present: ${totalPresent}`,
        `Absent: ${totalAbsent}`,
        "",
        "Course-wise attendance:"
    ];


    for (const course of courseMap.values()) {

        const percentage =
            course.totalClasses > 0
                ? (
                    (course.presentClasses /
                        course.totalClasses) *
                    100
                ).toFixed(2)
                : "0.00";


        lines.push(
            `${course.courseCode || ""} - ` +
            `${course.courseName || "Course"}: ` +
            `${percentage}% ` +
            `(${course.presentClasses}/${course.totalClasses})`
        );
    }


    return lines.join("\n");
};


// ============================================================
// TIMETABLE
// ============================================================

const getTimetableReply = async (
    profile,
    message
) => {

    const text = normalize(message);


    const wantsToday =
        text.includes("today") ||
        text.includes("aaj");


    const query = {
        department: profile.department,
        program: profile.program,
        semester: profile.semester,
        section: profile.section,
        isActive: true,
        isPublished: true
    };


    if (wantsToday) {
        query.day = getTodayName();
    }


    const records = await Timetable.find(query)
        .sort({
            day: 1,
            startTime: 1
        })
        .lean();


    if (!records.length) {

        if (wantsToday) {
            return "I couldn't find any published timetable classes for today.";
        }

        return "I couldn't find a published timetable for your section.";
    }


    const dayOrder = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6
    };


    records.sort((a, b) => {

        const dayDifference =
            (dayOrder[a.day] || 99) -
            (dayOrder[b.day] || 99);


        if (dayDifference !== 0) {
            return dayDifference;
        }


        return String(a.startTime || "")
            .localeCompare(
                String(b.startTime || "")
            );
    });


    const lines = [
        wantsToday
            ? "Today's timetable:"
            : "Your timetable:"
    ];


    let currentDay = null;


    for (const item of records) {

        if (item.day !== currentDay) {

            currentDay = item.day;

            lines.push("");

            lines.push(
                currentDay.charAt(0).toUpperCase() +
                currentDay.slice(1)
            );
        }


        lines.push(
            `${formatTime(item.startTime)} - ` +
            `${formatTime(item.endTime)} | ` +
            `${item.courseCode || ""} ` +
            `${item.courseName || "Course"} | ` +
            `Room: ${item.room || "TBA"} | ` +
            `Faculty: ${item.facultyName || "Not available"}`
        );
    }


    return lines.join("\n");
};


// ============================================================
// COURSES
// ============================================================

const getCoursesReply = async (profile) => {

    /*
     * Course model uses ObjectId references for
     * department and program.
     *
     * StudentProfile stores department/program as strings.
     *
     * Therefore we first use the student's timetable,
     * because Timetable already stores the same academic
     * values as strings and also references Course.
     */


    const timetableRecords =
        await Timetable.find({
            department: profile.department,
            program: profile.program,
            semester: profile.semester,
            section: profile.section,
            isActive: true,
            isPublished: true
        })
            .select(
                "course courseCode courseName"
            )
            .lean();


    if (!timetableRecords.length) {

        return "I couldn't find any published courses for your section.";
    }


    const courseIds = [
        ...new Set(
            timetableRecords
                .map(item => item.course)
                .filter(Boolean)
                .map(id => String(id))
        )
    ];


    let courseRecords = [];


    if (courseIds.length) {

        courseRecords =
            await Course.find({
                _id: {
                    $in: courseIds
                },
                status: "active"
            })
                .select(
                    "courseCode courseName shortName courseType credits theoryHours practicalHours description"
                )
                .lean();
    }


    /*
     * If Course references are missing on timetable records,
     * safely fall back to timetable's courseCode/courseName.
     */

    const courseMap = new Map();


    for (const course of courseRecords) {

        courseMap.set(
            String(course._id),
            course
        );
    }


    const finalCourses = new Map();


    for (const item of timetableRecords) {

        let course = null;


        if (item.course) {

            course =
                courseMap.get(
                    String(item.course)
                );
        }


        const courseCode =
            course?.courseCode ||
            item.courseCode;


        const courseName =
            course?.courseName ||
            item.courseName;


        if (!courseCode && !courseName) {
            continue;
        }


        const key =
            courseCode ||
            courseName;


        if (!finalCourses.has(key)) {

            finalCourses.set(key, {
                courseCode,
                courseName,
                courseType:
                    course?.courseType || null,
                credits:
                    course?.credits ?? null,
                theoryHours:
                    course?.theoryHours ?? null,
                practicalHours:
                    course?.practicalHours ?? null
            });
        }
    }


    if (!finalCourses.size) {

        return "I couldn't find active course information for your section.";
    }


    const lines = [
        "Your courses:"
    ];


    let number = 1;


    for (const course of finalCourses.values()) {

        let line =
            `${number}. ` +
            `${course.courseCode || ""} - ` +
            `${course.courseName || "Course"}`;


        if (course.credits !== null) {

            line +=
                ` | Credits: ${course.credits}`;
        }


        if (course.courseType) {

            line +=
                ` | Type: ${course.courseType}`;
        }


        lines.push(line);

        number++;
    }


    return lines.join("\n");
};


// ============================================================
// FEES
// ============================================================

const getFeesReply = async (
    userId,
    profile
) => {

    /*
     * One student can have one fee record per
     * academic session + semester.
     *
     * We retrieve the latest relevant record.
     */

    const fee = await Fee.findOne({
        student: userId,
        studentProfile: profile._id
    })
        .sort({
            academicSession: -1,
            semester: -1,
            updatedAt: -1
        })
        .lean();


    if (!fee) {

        return "I couldn't find any fee record for your account.";
    }


    const lines = [
        "Your latest fee details:",
        "",
        `Academic session: ${fee.academicSession || "Not available"}`,
        `Semester: ${fee.semester || "Not available"}`,
        "",
        `Tuition fee: ${formatMoney(fee.tuitionFee)}`,
        `Examination fee: ${formatMoney(fee.examinationFee)}`,
        `Hostel fee: ${formatMoney(fee.hostelFee)}`,
        `Library fee: ${formatMoney(fee.libraryFee)}`,
        `Transport fee: ${formatMoney(fee.transportFee)}`,
        `Other fee: ${formatMoney(fee.otherFee)}`,
        "",
        `Total fee: ${formatMoney(fee.totalFee)}`,
        `Paid amount: ${formatMoney(fee.paidAmount)}`,
        `Due amount: ${formatMoney(fee.dueAmount)}`,
        `Payment status: ${fee.paymentStatus || "Not available"}`
    ];


    if (fee.dueDate) {

        lines.push(
            `Due date: ${formatDate(fee.dueDate)}`
        );
    }


    if (fee.remarks) {

        lines.push(
            "",
            `Remarks: ${fee.remarks}`
        );
    }


    return lines.join("\n");
};


// ============================================================
// NOTICE MATCHING
// ============================================================

const noticeMatchesStudent = (
    notice,
    profile
) => {

    const department =
        normalize(profile.department);

    const program =
        normalize(profile.program);

    const semester =
        Number(profile.semester);

    const section =
        normalize(profile.section);


    // --------------------------------------------------------
    // Direct / legacy fields
    // --------------------------------------------------------

    const noticeDepartment =
        normalize(notice.department);

    const noticeProgram =
        normalize(notice.program);

    const noticeSemester =
        notice.semester !== null &&
        notice.semester !== undefined
            ? Number(notice.semester)
            : null;

    const noticeSection =
        normalize(notice.section);


    let directMatch = false;


    switch (notice.scope) {

        case "university":

            directMatch = true;
            break;


        case "department":

            directMatch =
                noticeDepartment === department;
            break;


        case "program":

            directMatch =
                noticeDepartment === department &&
                noticeProgram === program;
            break;


        case "semester":

            directMatch =
                noticeDepartment === department &&
                noticeProgram === program &&
                noticeSemester === semester;
            break;


        case "section":

            directMatch =
                noticeDepartment === department &&
                noticeProgram === program &&
                noticeSemester === semester &&
                noticeSection === section;
            break;


        default:

            /*
             * For legacy notices where scope is not enough,
             * use progressively restrictive matching.
             */

            directMatch =
                (
                    !noticeDepartment ||
                    noticeDepartment === department
                ) &&
                (
                    !noticeProgram ||
                    noticeProgram === program
                ) &&
                (
                    noticeSemester === null ||
                    noticeSemester === semester
                ) &&
                (
                    !noticeSection ||
                    noticeSection === section
                );
    }


    if (directMatch) {
        return true;
    }


    // --------------------------------------------------------
    // Multiple targets
    // --------------------------------------------------------

    if (
        Array.isArray(notice.targets) &&
        notice.targets.length
    ) {

        return notice.targets.some(target => {

            const targetDepartment =
                normalize(target.department);

            const targetProgram =
                normalize(target.program);

            const targetSemester =
                Number(target.semester);

            const targetSection =
                normalize(target.section);


            const departmentMatch =
                targetDepartment === department;

            const programMatch =
                targetProgram === program;

            const semesterMatch =
                targetSemester === semester;

            const sectionMatch =
                targetSection === section;


            return (
                departmentMatch &&
                programMatch &&
                semesterMatch &&
                sectionMatch
            );
        });
    }


    return false;
};


// ============================================================
// NOTICES
// ============================================================

const getNoticesReply = async (profile) => {

    /*
     * First fetch active published student/both notices.
     *
     * Matching is additionally checked in JavaScript so
     * both legacy fields and targets[] are supported safely.
     */

    const notices = await Notice.find({
        audience: {
            $in: [
                "students",
                "both"
            ]
        },
        isActive: true,
        publishedAt: {
            $ne: null
        }
    })
        .sort({
            publishedAt: -1
        })
        .limit(100)
        .lean();


    const matchingNotices =
        notices.filter(notice =>
            noticeMatchesStudent(
                notice,
                profile
            )
        );


    if (!matchingNotices.length) {

        return "I couldn't find any active notices for your academic profile.";
    }


    const latest =
        matchingNotices.slice(0, 10);


    const lines = [
        "Latest notices for you:"
    ];


    latest.forEach((notice, index) => {

        lines.push("");

        lines.push(
            `${index + 1}. ${notice.title}`
        );

        lines.push(
            `Type: ${notice.noticeType || "academic"}`
        );

        if (notice.noticeDate) {

            lines.push(
                `Date: ${formatDate(notice.noticeDate)}`
            );
        } else if (notice.publishedAt) {

            lines.push(
                `Published: ${formatDate(notice.publishedAt)}`
            );
        }


        if (notice.description) {

            lines.push(
                notice.description
            );
        }
    });


    return lines.join("\n");
};


// ============================================================
// HELP
// ============================================================

const getHelpReply = () => {

    return [
        "I can help you with your CampusNexus student information.",
        "",
        "Try asking:",
        "",
        "• What is my attendance?",
        "• Show my attendance course-wise.",
        "• What is my timetable?",
        "• What classes do I have today?",
        "• What are my courses?",
        "• Show my fees.",
        "• How much fee is due?",
        "• What is my fee status?",
        "• Show my latest notices.",
        "• Show my profile.",
        "",
        "I only use information available for your logged-in student account."
    ].join("\n");
};


// ============================================================
// MAIN CHAT CONTROLLER
// ============================================================

const chat = async (req, res) => {

    try {

        // ========================================================
        // AUTHENTICATION
        // ========================================================

        if (
            !req.session ||
            !req.session.user ||
            !req.session.user._id
        ) {

            return res.status(401).json({
                success: false,
                reply: "Please login first."
            });
        }


        const userId =
            String(req.session.user._id);


        // ========================================================
        // STUDENT ROLE CHECK
        // ========================================================

        if (
            normalize(req.session.user.role) !==
            "student"
        ) {

            return res.status(403).json({
                success: false,
                reply:
                    "This assistant is available from the student account."
            });
        }


        if (
            !mongoose.Types.ObjectId.isValid(
                userId
            )
        ) {

            return res.status(401).json({
                success: false,
                reply:
                    "Your login session is invalid. Please login again."
            });
        }


        // ========================================================
        // MESSAGE
        // ========================================================

        const message =
            String(req.body?.message || "")
                .trim();


        if (!message) {

            return res.status(400).json({
                success: false,
                reply: "Please enter a question."
            });
        }


        if (message.length > 500) {

            return res.status(400).json({
                success: false,
                reply:
                    "Please keep your question under 500 characters."
            });
        }


        // ========================================================
        // STUDENT PROFILE
        // ========================================================

        const profile =
            await StudentProfile.findOne({
                user: userId
            })
                .populate(
                    "user",
                    "name email role"
                )
                .lean();


        if (!profile) {

            return res.status(404).json({
                success: false,
                reply:
                    "Your student profile could not be found."
            });
        }


        // ========================================================
        // DETECT QUESTION
        // ========================================================

        const intent =
            detectIntent(message);


        let reply;


        // ========================================================
        // ANSWER
        // ========================================================
     switch(intent){
          case "leave":

        reply =
            await getLeaveReply(
                userId,
                profile
            );

        break;


    case "complaints":

        reply =
            await getComplaintsReply(
                userId,
                profile
            );

        break;


    case "gate_pass":

        reply =
            await getGatePassReply(
                userId,
                profile
            );

        break;


    case "lost_found":

        reply =
            await getLostFoundReply(
                userId,
                profile
            );

        break;


    case "hostel":

        reply =
            await getHostelReply(
                userId,
                profile
            );

        break;


    case "library":

        reply =
            await getLibraryReply(
                userId,
                profile
            );

        break;


    case "transport":

        reply =
            await getTransportReply(
                userId,
                profile
            );

        break;


    // ========================================================
    // STUDENT INFORMATION
    // ========================================================

    case "student_id":

        reply =
            await getStudentIdReply(
                profile
            );

        break;


    case "department":

        reply =
            await getDepartmentReply(
                profile
            );

        break;


    case "semester":

        reply =
            await getSemesterReply(
                profile
            );

        break;


    case "section":

        reply =
            await getSectionReply(
                profile
            );

        break;


    case "academic_session":

        reply =
            await getAcademicSessionReply(
                profile
            );

        break;


    // ========================================================
    // CLASS / TIMETABLE EXTRA
    // ========================================================

    case "today_class":

        reply =
            await getTodayClassReply(
                profile
            );

        break;


    case "tomorrow_class":

        reply =
            await getTomorrowClassReply(
                profile
            );

        break;


    case "next_class":

        reply =
            await getNextClassReply(
                profile
            );

        break;


    case "previous_class":

        reply =
            await getPreviousClassReply(
                profile
            );

        break;


    case "free_period":

        reply =
            await getFreePeriodReply(
                profile
            );

        break;


    case "classroom":

        reply =
            await getClassroomReply(
                profile,
                message
            );

        break;


    // ========================================================
    // HELP
    // ========================================================

    case "help":

        reply =
            getHelpReply();

        break;


    case "services":

        reply = [
            "CampusNexus Student Services:",
            "",
            "• Attendance",
            "• Timetable",
            "• Courses",
            "• Fees",
            "• Notices",
            "• Leave",
            "• Complaints",
            "• Gate Pass",
            "• Lost & Found",
            "• Hostel",
            "• Library",
            "• Transport",
            "• Student Profile"
        ].join("\n");

        break;


    // ========================================================
    // GENERAL CONVERSATION
    // ========================================================

    case "greeting":

        reply =
            "Hello! 👋 Main aapka CampusNexus Student AI Assistant hoon. Aapki kya help kar sakta hoon?";

        break;


    case "identity":

        reply =
            "Main CampusNexus ka Student AI Assistant hoon. Main aapko university services aur aapke available student information ke saath help kar sakta hoon.";

        break;


    case "capabilities":

        reply = [
            "Main aapki help kar sakta hoon:",
            "",
            "• Attendance",
            "• Timetable",
            "• Courses",
            "• Fees",
            "• Notices",
            "• Leave",
            "• Gate Pass",
            "• Complaints",
            "• Lost & Found",
            "• Hostel",
            "• Library",
            "• Transport",
            "• Student Profile",
            "• General Campus Information"
        ].join("\n");

        break;


    case "thanks":

        reply =
            "You're welcome! 😊 Agar CampusNexus se related aur kuch poochna ho to pooch sakte ho.";

        break;


    case "bye":

        reply =
            "Goodbye! 👋 Have a great day and best wishes for your studies!";

        break;


    case "how_are_you":

        reply =
            "I'm doing great! 😊 Main aapki help ke liye ready hoon.";

        break;


    // ========================================================
    // FUN / JOKE
    // ========================================================

    case "joke":

        reply =
            "😂 Student: Sir attendance kam hai.\nTeacher: Kitni classes attend ki?\nStudent: Sir, jitni important thi... 😄";

        break;


    case "motivation":

        reply =
            "🌟 Keep learning, keep improving and don't give up. Small progress every day can make a big difference.";

        break;


    // ========================================================
    // GENERAL KNOWLEDGE
    // ========================================================

    case "general_knowledge":

        reply =
            getGeneralKnowledgeReply(
                message
            );

        break;


    case "education":

        reply =
            "Education is the process of developing knowledge, skills and understanding. If you have a specific academic question, you can ask me directly.";

        break;


    case "technology":

        reply =
            "Technology is the use of scientific knowledge, tools and systems to solve problems and make tasks easier.";

        break;


    case "ai":

        reply =
            "Artificial Intelligence is a technology that allows computer systems to perform tasks that normally require human-like reasoning, such as understanding text, recognizing patterns and generating responses.";

        break;


    case "internet":

        reply =
            "The Internet is a global network of connected computer systems that allows devices and services to communicate and exchange information.";

        break;


    // ========================================================
    // GENERAL OUTSIDE QUESTIONS
    // ========================================================

    case "general_question":

        reply =
            await getGeneralQuestionReply(
                message
            );

        break;


    case "date_time":

        reply =
            "You can ask me about CampusNexus schedules, classes and other time-related academic information.";

        break;


    // ========================================================
    // UNKNOWN
    // ========================================================

    default:

        reply = [
            "I can help you with your CampusNexus student services:",
            "",
            "• Attendance",
            "• Timetable",
            "• Courses",
            "• Fees",
            "• Notices",
            "• Leave",
            "• Gate Pass",
            "• Complaints",
            "• Lost & Found",
            "• Hostel",
            "• Library",
            "• Transport",
            "• Student Profile",
            "",
            "You can also ask me general questions or say:",
            "\"What can you do?\""
        ].join("\n");
}


        // ========================================================
        // RESPONSE
        // ========================================================

        return res.status(200).json({
            success: true,
            reply
        });

    } catch (error) {

        console.error(
            "LOCAL AI ERROR:",
            error
        );


        return res.status(500).json({
            success: false,
            reply:
                "I couldn't process that request right now. Please try again."
        });
    }
};


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    chat
};