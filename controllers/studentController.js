const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const Timetable = require("../models/Timetable");
const Fee = require("../models/Fee");
const LostFoundReport = require("../models/LostFoundReport");
const Notification = require("../models/Notification");
// ==========================================
// Student Dashboard
// ==========================================
const showDashboard = async (req, res, next) => {
    try {
        console.log("=================================");
        console.log("STUDENT DASHBOARD CONTROLLER HIT");
        console.log(
            "SESSION USER:",
            req.session.user
        );
        console.log("=================================");

        const userId = req.session.user.id;

        console.log(
            "USER ID FROM SESSION:",
            userId
        );

        // ==========================================
        // Find User
        // ==========================================
        const user = await User.findById(userId)
            .select(
                "name email role isActive createdAt lastLogin"
            )
            .lean();

        if (!user) {
            return res.status(404).send(
                "Student user not found in database."
            );
        }

        if (user.role !== "student") {
            return res.status(403).send(
                "Logged-in user is not a student."
            );
        }

        // ==========================================
        // Find Student Profile
        // ==========================================
        const studentProfile =
            await StudentProfile.findOne({
                user: user._id
            }).lean();

        console.log(
            "MATCHED STUDENT PROFILE:",
            studentProfile
        );

        // ==========================================
        // Profile Not Found
        // ==========================================
        if (!studentProfile) {
            const profiles =
                await StudentProfile.find({})
                    .select(
                        "_id user studentId name department program"
                    )
                    .lean();

            console.log(
                "ALL STUDENT PROFILES:",
                profiles
            );

            return res.status(404).send(
                "Student profile not found for this user."
            );
        }

        // ==========================================
        // Render Dashboard
        // ==========================================
        const notifications = await Notification.find({
    recipient: user._id
})
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

const unreadNotificationCount =
    await Notification.countDocuments({
        recipient: user._id,
        isRead: false
    });

return res.render(
    "student/dashboard",
    {
        title: "Student Dashboard",
        currentUser: req.session.user,
        user,
        studentProfile,
        notifications,
        unreadNotificationCount
    }
);

    } catch (error) {
        console.error(
            "STUDENT DASHBOARD ERROR:",
            error
        );

        return next(error);
    }
};

// ==========================================
// Student Profile
// ==========================================
const showProfile = async (req, res, next) => {
    try {
        const userId = req.session.user.id;

        const user = await User.findById(userId)
            .select(
                "name email role isActive createdAt"
            )
            .lean();

        if (!user) {
            return res.status(404).send(
                "Student user not found."
            );
        }

        if (user.role !== "student") {
            return res.status(403).send(
                "Logged-in user is not a student."
            );
        }

        const studentProfile =
            await StudentProfile.findOne({
                user: user._id
            }).lean();

        if (!studentProfile) {
            return res.status(404).send(
                "Student profile not found."
            );
        }

        return res.render(
            "student/profile",
            {
                title: "My Profile",
                currentUser: req.session.user,
                user,
                studentProfile
            }
        );

    } catch (error) {
        console.error(
            "STUDENT PROFILE ERROR:",
            error
        );

        return next(error);
    }
};

// ==========================================
// Student Timetable
// ==========================================
const showTimetable = async (
    req,
    res,
    next
) => {

    try {

        const userId =
            req.session.user.id;

        // ------------------------------------------
        // DAYS
        // ------------------------------------------

        const days = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday"
        ];

        // ------------------------------------------
        // STUDENT PROFILE
        // ------------------------------------------

        const studentProfile =
            await StudentProfile.findOne({
                user: userId
            }).lean();

        if (!studentProfile) {

            return res.status(404).send(
                "Student profile not found."
            );

        }

        // ------------------------------------------
        // STUDENT ACADEMIC DETAILS
        // ------------------------------------------

        const department =
            String(
                studentProfile.department || ""
            )
                .trim()
                .toLowerCase();

        const program =
            String(
                studentProfile.program || ""
            )
                .trim()
                .toLowerCase();

        const semester =
            Number(
                studentProfile.semester
            );

        const section =
            String(
                studentProfile.section || ""
            )
                .trim()
                .toUpperCase();

        // ------------------------------------------
        // REQUIRED ACADEMIC DETAILS
        // ------------------------------------------

        if (
            !department ||
            !program ||
            !Number.isInteger(semester) ||
            !section
        ) {

            return res.render(
                "student/timetable",
                {
                    title: "My Timetable",
                    currentUser:
                        req.session.user,
                    studentProfile,
                    timetable: [],
                    timetablePublished: false,
                    days
                }
            );

        }

        // ------------------------------------------
        // FIND PUBLISHED TIMETABLE
        // ------------------------------------------

        const timetable =
            await Timetable.find({
                department,
                program,
                semester,
                section,
                isActive: true,
                isPublished: true
            })
                .populate(
                    "course",
                    "courseCode courseName shortName"
                )
                .populate(
                    "faculty",
                    "name email"
                )
                .sort({
                    day: 1,
                    startTime: 1
                })
                .lean();
                // ------------------------------------------
// GROUP TIMETABLE BY DAY
// ------------------------------------------

const timetableByDay = {};

days.forEach((day) => {
    timetableByDay[day] = [];
});

timetable.forEach((item) => {

    const timetableDay =
        String(item.day || "")
            .trim();

    if (timetableByDay[timetableDay]) {
        timetableByDay[timetableDay].push(item);
    }

});

        // ------------------------------------------
        // RENDER
        // ------------------------------------------
        return res.render(
    "student/timetable",
    {
        title: "My Timetable",
        currentUser:
            req.session.user,
        studentProfile,
        timetable: [],
        timetablePublished: false,
        days,
        timetableByDay: {
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: []
        }
    } 
 )
        
   }   catch (error) {

        console.error(
            "Student timetable error:",
            error
        );

        return next(error);

    }

};
// ==========================================
// Student Fees
// ==========================================
const showFees = async (
    req,
    res,
    next
) => {
    try {
        const userId =
            req.session.user.id;

        // ------------------------------------------
        // FIND STUDENT PROFILE
        // ------------------------------------------
        const studentProfile =
            await StudentProfile.findOne({
                user: userId
            }).lean();

        if (!studentProfile) {
            return res.status(404).send(
                "Student profile not found."
            );
        }

        // ------------------------------------------
        // FIND OWN FEES ONLY
        // ------------------------------------------
        const fees =
            await Fee.find({
                student: userId
            })
                .sort({
                    academicSession: -1,
                    semester: -1
                })
                .lean();

        // ------------------------------------------
        // RENDER STUDENT FEES
        // ------------------------------------------
        return res.render(
            "student/fees",
            {
                title: "My Fees",
                currentUser:
                    req.session.user,
                studentProfile,
                fees
            }
        );

    } catch (error) {
        console.error(
            "STUDENT FEES ERROR:",
            error
        );

        return next(error);
    }
};


// ===============================
// SHOW LOST & FOUND
// ===============================
const showLostFound = async (req, res) => {
    try {
        const userId =
            req.session.user._id ||
            req.session.user.id;

        const reports = await LostFoundReport
            .find({ student: userId })
            .sort({ createdAt: -1 });

        res.render("student/lost-found", {
            title: "Lost & Found",
            currentUser: req.session.user,
            reports
        });

    } catch (error) {

        console.error(
            "Error loading lost & found:",
            error
        );

        req.flash(
            "error",
            "Unable to load your lost & found reports."
        );

        res.redirect("/student/dashboard");
    }
};


const submitLostFound = async (
    req,
    res,
    next
) => {
    try {

        const userId =
            req.session.user.id;

        const {
            itemName,
            category,
            description,
            lostLocation,
            lostDate,
            contactInfo
        } = req.body || {};

        // ------------------------------------------
        // Basic Validation
        // ------------------------------------------

        const cleanItemName =
            String(itemName || "").trim();

        const cleanDescription =
            String(description || "").trim();

        const cleanLocation =
            String(lostLocation || "").trim();

        const cleanContactInfo =
            String(contactInfo || "").trim();

        const cleanCategory =
            String(category || "other")
                .trim()
                .toLowerCase();

        if (!cleanItemName) {
            req.flash(
                "error",
                "Please enter the lost item name."
            );

            return res.redirect(
                "/student/lost-found"
            );
        }

        if (!cleanDescription) {
            req.flash(
                "error",
                "Please enter a description of the lost item."
            );

            return res.redirect(
                "/student/lost-found"
            );
        }

        if (!cleanLocation) {
            req.flash(
                "error",
                "Please enter where you lost the item."
            );

            return res.redirect(
                "/student/lost-found"
            );
        }

        if (!lostDate) {
            req.flash(
                "error",
                "Please select the lost date."
            );

            return res.redirect(
                "/student/lost-found"
            );
        }

        const parsedLostDate =
            new Date(lostDate);

        if (Number.isNaN(parsedLostDate.getTime())) {
            req.flash(
                "error",
                "Please enter a valid lost date."
            );

            return res.redirect(
                "/student/lost-found"
            );
        }

        // ------------------------------------------
        // Prevent Future Date
        // ------------------------------------------

        const today = new Date();

        today.setHours(
            23,
            59,
            59,
            999
        );

        if (parsedLostDate > today) {
            req.flash(
                "error",
                "Lost date cannot be in the future."
            );

            return res.redirect(
                "/student/lost-found"
            );
        }

        // ------------------------------------------
        // Allowed Categories
        // ------------------------------------------

        const allowedCategories = [
            "wallet",
            "mobile",
            "laptop",
            "documents",
            "id-card",
            "keys",
            "bag",
            "books",
            "clothing",
            "electronics",
            "jewellery",
            "other"
        ];

        if (
            !allowedCategories.includes(
                cleanCategory
            )
        ) {
            req.flash(
                "error",
                "Invalid item category."
            );

            return res.redirect(
                "/student/lost-found"
            );
        }

        // ------------------------------------------
        // Create Lost & Found Report
        // ------------------------------------------

        const report =
            await LostFoundReport.create({
                student: userId,
                itemName: cleanItemName,
                category: cleanCategory,
                description: cleanDescription,
                lostLocation: cleanLocation,
                lostDate: parsedLostDate,
                contactInfo: cleanContactInfo,
                status: "pending"
            });

        console.log(
            "LOST & FOUND REPORT CREATED:",
            report._id.toString()
        );

        req.flash(
            "success",
            "Your lost item report has been submitted to the admin for verification."
        );

        return res.redirect(
            "/student/lost-found"
        );

    } catch (error) {

        console.error(
            "SUBMIT LOST FOUND ERROR:",
            error
        );

        return next(error);
    }
};


// ==========================================
// Student Lost & Found - My Reports
// ==========================================
const showMyLostFoundReports = async (
    req,
    res,
    next
) => {
    try {

        const userId =
            req.session.user.id;

        const reports =
            await LostFoundReport.find({
                student: userId
            })
                .sort({
                    createdAt: -1
                })
                .lean();

        return res.render(
            "student/lost-found-history",
            {
                title: "My Lost Item Reports",
                currentUser:
                    req.session.user,
                reports
            }
        );

    } catch (error) {

        console.error(
            "SHOW LOST FOUND HISTORY ERROR:",
            error
        );

        return next(error);
    }
};


module.exports = {
    showDashboard,
    showProfile,
    showTimetable,
    showFees,
    showLostFound,
    submitLostFound,
    showMyLostFoundReports

};