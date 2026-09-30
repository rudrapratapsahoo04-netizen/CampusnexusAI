require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const engine = require("ejs-mate");
const flash = require("connect-flash");
const connectDB = require("./config/db");

// ==========================================
// ROUTES
// ==========================================

const indexRoutes = require("./routes/index");
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const studentNoticeRoutes = require("./routes/studentNoticeRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const adminRoutes = require("./routes/adminRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const gatePassRoutes = require("./routes/gatePassRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const aiRoutes = require("./routes/aiRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const facultyAttendanceRoutes = require("./routes/facultyAttendanceRoutes");
const facultyLeaveRoutes = require("./routes/facultyLeaveRoutes");
const facultyRequestRoutes = require("./routes/facultyRequestRoutes");
const facultyNoticeRoutes = require("./routes/facultyNoticeRoutes");
const workerRoutes = require("./routes/workerRoutes");


// General / old AI route

// Faculty local AI route
const facultyAIRoutes = require("./routes/facultyAIRoutes");

// ==========================================
// ERROR HANDLING
// ==========================================

const {
    notFound,
    errorHandler
} = require("./middleware/errorHandler");

// ==========================================
// APP INITIALIZATION
// ==========================================

const app = express();

const PORT =
    process.env.PORT || 5000;

// ==========================================
// VIEW ENGINE
// ==========================================

app.engine(
    "ejs",
    engine
);

app.set(
    "view engine",
    "ejs"
);

app.set(
    "views",
    path.join(__dirname, "views")
);

// ==========================================
// GLOBAL MIDDLEWARE
// ==========================================

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    express.json()
);

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// ==========================================
// SESSION
// ==========================================

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "campusnexus-development-secret",

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            secure:
                process.env.NODE_ENV === "production",

            maxAge:
                1000 *
                60 *
                60 *
                24
        }
    })
);

// ==========================================
// FLASH MESSAGES
// ==========================================

app.use(flash());

// ==========================================
// CURRENT USER
// ==========================================
//
// IMPORTANT:
// Keep this middleware only ONCE.
//

app.use(
    (req, res, next) => {
        res.locals.currentUser =
            req.session.user || null;

        next();
    }
);

// ==========================================
// APPLICATION LOCALS
// ==========================================

app.locals.appName =
    process.env.APP_NAME ||
    "CampusNexus AI";

app.locals.currentYear =
    new Date().getFullYear();

// ==========================================
// PUBLIC / HOME
// ==========================================

app.use(
    "/",
    indexRoutes
);

// ==========================================
// AUTHENTICATION
// ==========================================

app.use(
    "/auth",
    authRoutes
);

// ==========================================
// STUDENT
// ==========================================

app.use(
    "/",
    studentRoutes
);

app.use(
    "/student",
    studentNoticeRoutes
);

// ==========================================
// DASHBOARD
// ==========================================

app.use(
    "/",
    dashboardRoutes
);

// ==========================================
// ADMIN
// ==========================================

app.use(
    "/admin",
    adminRoutes
);

// ==========================================
// TIMETABLE
// ==========================================

app.use(
    "/",
    timetableRoutes
);

// ==========================================
// GENERAL NOTICES
// ==========================================

app.use(
    "/",
    noticeRoutes
);

// ==========================================
// LEAVE
// ==========================================

app.use(
    "/",
    leaveRoutes
);

// ==========================================
// COMPLAINT
// ==========================================

app.use(
    "/",
    complaintRoutes
);

// ==========================================
// CERTIFICATE
// ==========================================

app.use(
    "/",
    certificateRoutes
);

// ==========================================
// GATE PASS
// ==========================================

app.use(
    "/",
    gatePassRoutes
);

// ==========================================
// ATTENDANCE
// ==========================================

app.use(
    "/",
    attendanceRoutes
);

// ==========================================
// FACULTY
// ==========================================

app.use(
    "/faculty",
    facultyRoutes
);

app.use(
    "/",
    facultyAttendanceRoutes
);

app.use(
    "/faculty",
    facultyLeaveRoutes
);

app.use(
    "/faculty",
    facultyRequestRoutes
);

app.use(
    "/faculty",
    facultyNoticeRoutes
);

// ==========================================
// FACULTY LOCAL AI
// ==========================================
//
// POST /faculty/ai/chat
//
// Protected by:
// requireAuth
// requireRole("faculty")
//

app.use("/api/ai", aiRoutes);
app.use("/faculty/ai", facultyAIRoutes);


// ==========================================
// WORKER
// ==========================================

app.use(
    "/worker",
    workerRoutes
);
// ==========================================
// GENERAL / OLD AI ROUTES
// ==========================================



// ==========================================
// 404 HANDLER
// ==========================================

app.use(notFound);

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use(errorHandler);

// ==========================================
// DATABASE + SERVER STARTUP
// ==========================================

const startServer = async () => {
    try {
        await connectDB();

        app.listen(
            PORT,
            () => {
                console.log(`
╔════════════════════════════════════════════╗
║          CampusNexus AI Server             ║
╠════════════════════════════════════════════╣
║ Environment : ${process.env.NODE_ENV || "development"}
║ Port        : ${PORT}
║ URL         : http://localhost:${PORT}
║ Database    : MongoDB
╚════════════════════════════════════════════╝
                `);
            }
        );
    } catch (error) {
        console.error(
            "Application startup failed:",
            error.message
        );

        process.exit(1);
    }
};

startServer();