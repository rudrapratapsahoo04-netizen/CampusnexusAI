const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const FacultyProfile = require("../models/FacultyProfile");
const StudentProfile = require("../models/StudentProfile");
const WorkerProfile = require("../models/WorkerProfile");
const Department = require("../models/Department");
const Program = require("../models/Program");



console.log(
    "StudentProfile model:",
    StudentProfile.modelName
);

// ============================================================
// COMMON HELPERS
// ============================================================

const generateOTP = () => {
    return crypto.randomInt(100000, 1000000).toString();
};

const hashOTP = (otp) => {
    return crypto
        .createHash("sha256")
        .update(String(otp))
        .digest("hex");
};







const maskEmail = (email) => {
    const parts = String(email).split("@");

    if (parts.length !== 2) {
        return email;
    }

    const username = parts[0];
    const domain = parts[1];

    if (username.length <= 2) {
        return `${username[0] || "*"}*@${domain}`;
    }

    return (
        username.substring(0, 2) +
        "*".repeat(
            Math.max(username.length - 2, 2)
        ) +
        "@" +
        domain
    );
};

// ============================================================
// SAFE DASHBOARD REDIRECT
// ============================================================

const getDashboardByRole = (role, returnTo) => {
    if (
        returnTo &&
        typeof returnTo === "string" &&
        returnTo.startsWith("/") &&
        !returnTo.startsWith("//")
    ) {
        return returnTo;
    }

    switch (role) {
        case "student":
            return "/student/dashboard";

        case "faculty":
            return "/faculty/dashboard";

        case "admin":
            return "/admin/dashboard";

        case "worker":
            return "/worker/dashboard";

        default:
            return "/";
    }
};
// ============================================================
// USER LOGIN OTP CLEANUP
// ============================================================



// ============================================================
// PASSWORD RESET OTP CLEANUP
// ============================================================


// ============================================================
// REGISTRATION PORTAL
// ============================================================

const showRegister = async (req, res) => {
    try {
        const departments = await Department.find({
            status: "active"
        }).sort({ name: 1 });

        const programs = await Program.find({
            status: "active"
        })
            .populate("department")
            .sort({ name: 1 });

        return res.render("auth/register-choice", {
            title: "Create Account",
            departments,
            programs
        });
    } catch (error) {
        console.error("Error loading registration data:", error);

        return res.status(500).send("Unable to load registration page.");
    }
};

// ============================================================
// STUDENT REGISTRATION PAGE
// ============================================================



const showStudentRegister = async (req, res, next) => {

    try {

        const departments = await Department.find({
            status: "active"
        })
            .sort({ name: 1 })
            .lean();

        const programs = await Program.find({
            status: "active"
        })
            .populate("department", "name code")
            .sort({ name: 1 })
            .lean();


            console.log(
    "Student registration departments:",
    departments.length,
    departments.map(department => ({
        id: department._id,
        name: department.name,
        code: department.code,
        status: department.status
    }))
);

        return res.render(
            "auth/register",
            {
                title: "Student Registration",
                departments,
                programs
            }
        );

    } catch (error) {

        console.error(
            "Show student registration page error:",
            error
        );

        return next(error);
    }
};
// ============================================================
// STUDENT REGISTRATION
// ============================================================

const register = async (req, res, next) => {

    try {

        console.log("\n========================================");
        console.log("STUDENT REGISTRATION REQUEST");
        console.log("========================================");

        const {
            name,
            dob,
            gender,
            mobile,
            email,
            studentId,
            department,
            program,
            semester,
            section,
            batch,
            permanentAddress,
            currentAddress,
            city,
            state,
            pin,
            guardianName,
            guardianMobile,
            emergencyContact,
            hostelRequired,
            hostelName,
            roomNumber,
            password,
            confirmPassword,
            termsAccepted
        } = req.body || {};

        console.log("REQUEST BODY:", req.body);
        console.log("Gender:", gender);
        console.log("Hostel Required:", hostelRequired);
        console.log("Terms Accepted:", termsAccepted);

        // ====================================================
        // REQUIRED FIELD VALIDATION
        // ====================================================

        const requiredFields = {
            name,
            dob,
            gender,
            mobile,
            email,
            studentId,
            department,
            program,
            semester,
            batch,
            permanentAddress,
            city,
            state,
            pin,
            guardianName,
            guardianMobile,
            emergencyContact,
            hostelRequired,
            password,
            confirmPassword
        };

        const missingFields = Object.entries(requiredFields)
            .filter(
                ([, value]) =>
                    value === undefined ||
                    value === null ||
                    String(value).trim() === ""
            )
            .map(([key]) => key);

        if (missingFields.length > 0) {

            req.flash(
                "error",
                `Please fill all required fields: ${missingFields.join(", ")}`
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // TERMS & CONDITIONS
        // ====================================================

        if (termsAccepted !== "yes") {

            req.flash(
                "error",
                "You must accept the terms and conditions."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // NORMALIZE BASIC VALUES
        // ====================================================

        const trimmedName =
            String(name).trim();

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();

        const normalizedStudentId =
            String(studentId)
                .trim()
                .toUpperCase();

        const normalizedMobile =
            String(mobile).trim();

        const normalizedGuardianMobile =
            String(guardianMobile).trim();

        const normalizedEmergencyContact =
            String(emergencyContact).trim();

        const normalizedPin =
            String(pin).trim();

        // ====================================================
        // DEPARTMENT VALIDATION
        // ====================================================

        const selectedDepartment =
            await Department.findOne({
                _id: department,
                status: "active"
            }).lean();

        if (!selectedDepartment) {

            req.flash(
                "error",
                "Please select a valid department."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // PROGRAM VALIDATION
        // ====================================================

        const selectedProgram =
            await Program.findOne({
                _id: program,
                department: selectedDepartment._id,
                status: "active"
            }).lean();

        if (!selectedProgram) {

            req.flash(
                "error",
                "Please select a valid program for the selected department."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // CREATE COMPATIBLE SLUG VALUES
        // ====================================================
        // StudentProfile currently stores department/program
        // as strings. Other modules such as timetable/notices
        // also use these string values.
        //
        // Therefore:
        // DB Department/Program IDs are used for validation,
        // but compatible slug strings are saved in StudentProfile.

        const createSlug = (value) => {

            return String(value || "")
                .trim()
                .toLowerCase()
                .replace(/^department\s+of\s+/i, "")
                .replace(/^dept\.?\s+of\s+/i, "")
                .replace(/&/g, "and")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
        };

        const normalizedDepartment =
            createSlug(
                selectedDepartment.name
            );

        const normalizedProgram =
            createSlug(
                selectedProgram.name
            );

        if (
            !normalizedDepartment ||
            !normalizedProgram
        ) {

            req.flash(
                "error",
                "Selected department or program has invalid configuration."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // OTHER NORMALIZED VALUES
        // ====================================================

        const normalizedGender =
            String(gender)
                .trim()
                .toLowerCase();

        const normalizedSection =
            section &&
            String(section).trim() !== ""
                ? String(section)
                    .trim()
                    .toUpperCase()
                : null;

        const normalizedCurrentAddress =
            currentAddress
                ? String(currentAddress).trim()
                : "";

        // ====================================================
        // NAME VALIDATION
        // ====================================================

        if (trimmedName.length < 2) {

            req.flash(
                "error",
                "Name must contain at least 2 characters."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // GENDER VALIDATION
        // ====================================================

        const allowedGenders = [
            "male",
            "female",
            "other"
        ];

        if (
            !allowedGenders.includes(
                normalizedGender
            )
        ) {

            req.flash(
                "error",
                "Please select a valid gender."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // DATE OF BIRTH VALIDATION
        // ====================================================

        const parsedDOB =
            new Date(dob);

        if (
            !dob ||
            Number.isNaN(
                parsedDOB.getTime()
            )
        ) {

            req.flash(
                "error",
                "Please enter a valid date of birth."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        if (parsedDOB > new Date()) {

            req.flash(
                "error",
                "Date of birth cannot be in the future."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // PASSWORD VALIDATION
        // ====================================================

        if (password.length < 6) {

            req.flash(
                "error",
                "Password must be at least 6 characters."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        if (password !== confirmPassword) {

            req.flash(
                "error",
                "Passwords do not match."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // MOBILE VALIDATION
        // ====================================================

        if (
            !/^[0-9]{10}$/.test(
                normalizedMobile
            )
        ) {

            req.flash(
                "error",
                "Please enter a valid 10-digit mobile number."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        if (
            !/^[0-9]{10}$/.test(
                normalizedGuardianMobile
            )
        ) {

            req.flash(
                "error",
                "Please enter a valid guardian mobile number."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        if (
            !/^[0-9]{10}$/.test(
                normalizedEmergencyContact
            )
        ) {

            req.flash(
                "error",
                "Please enter a valid emergency contact number."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // PIN VALIDATION
        // ====================================================

        if (
            !/^[0-9]{6}$/.test(
                normalizedPin
            )
        ) {

            req.flash(
                "error",
                "Please enter a valid 6-digit PIN code."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // SEMESTER VALIDATION
        // ====================================================

        const numericSemester =
            Number(semester);

        if (
            !Number.isInteger(
                numericSemester
            ) ||
            numericSemester < 1 ||
            numericSemester > 8
        ) {

            req.flash(
                "error",
                "Please select a valid semester."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // BATCH VALIDATION
        // ====================================================

        const numericBatch =
            Number(batch);

        if (
            !Number.isInteger(
                numericBatch
            ) ||
            numericBatch < 2000
        ) {

            req.flash(
                "error",
                "Please select a valid admission year."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // HOSTEL VALIDATION
        // ====================================================

        const normalizedHostelRequired =
            String(hostelRequired)
                .trim()
                .toLowerCase();

        if (
            !["yes", "no"].includes(
                normalizedHostelRequired
            )
        ) {

            req.flash(
                "error",
                "Please select whether hostel accommodation is required."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        const isHostelRequired =
            normalizedHostelRequired === "yes";

        // ====================================================
        // DUPLICATE USER CHECK
        // ====================================================

        const existingUser =
            await User.findOne({
                email: normalizedEmail
            });

        if (existingUser) {

            req.flash(
                "error",
                "An account with this email already exists."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // DUPLICATE STUDENT CHECK
        // ====================================================

        const existingStudent =
            await StudentProfile.findOne({
                studentId:
                    normalizedStudentId
            });

        if (existingStudent) {

            req.flash(
                "error",
                "This Student ID / Roll Number is already registered."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // CREATE USER + STUDENT PROFILE
        // ====================================================

        let user = null;

        try {

            user = new User({

                name: trimmedName,

                email: normalizedEmail,

                password,

                role: "student",

                isActive: true

            });

            await user.save();

            const studentProfile =
                new StudentProfile({

                    user: user._id,

                    dob: parsedDOB,

                    gender: normalizedGender,

                    mobile: normalizedMobile,

                    studentId:
                        normalizedStudentId,

                    department:
                        normalizedDepartment,

                    program:
                        normalizedProgram,

                    semester:
                        numericSemester,

                    section:
                        normalizedSection,

                    batch:
                        numericBatch,

                    academicApprovalStatus:
                        "pending",

                    permanentAddress:
                        String(
                            permanentAddress
                        ).trim(),

                    currentAddress:
                        normalizedCurrentAddress,

                    city:
                        String(city).trim(),

                    state:
                        String(state).trim(),

                    pin:
                        normalizedPin,

                    guardianName:
                        String(
                            guardianName
                        ).trim(),

                    guardianMobile:
                        normalizedGuardianMobile,

                    emergencyContact:
                        normalizedEmergencyContact,

                    hostelRequired:
                        isHostelRequired,

                    hostelName:
                        isHostelRequired &&
                        hostelName
                            ? String(
                                hostelName
                            ).trim()
                            : null,

                    roomNumber:
                        isHostelRequired &&
                        roomNumber
                            ? String(
                                roomNumber
                            ).trim()
                            : null,

                    profileStatus:
                        "complete"

                });

            await studentProfile.validate();

            await studentProfile.save();

        } catch (profileError) {

            console.error(
                "Student profile creation failed:",
                profileError
            );

            // Rollback created User if
            // StudentProfile creation fails.

            if (
                user &&
                user._id
            ) {

                try {

                    await User.findByIdAndDelete(
                        user._id
                    );

                } catch (rollbackError) {

                    console.error(
                        "Student user rollback failed:",
                        rollbackError
                    );

                }
            }

            throw profileError;
        }

        // ====================================================
        // SUCCESS
        // ====================================================

        req.flash(
            "success",
            "Registration successful. Your student profile has been created. You can now login."
        );

        return res.redirect(
            "/auth/login/student"
        );

    } catch (error) {

        console.error(
            "Student registration error:",
            error
        );

        // ====================================================
        // DUPLICATE KEY ERROR
        // ====================================================

        if (error.code === 11000) {

            const duplicateFields =
                Object.keys(
                    error.keyPattern || {}
                );

            let duplicateMessage =
                "Email or Student ID is already registered.";

            if (
                duplicateFields.includes(
                    "email"
                )
            ) {

                duplicateMessage =
                    "This email is already registered.";

            }

            if (
                duplicateFields.includes(
                    "studentId"
                )
            ) {

                duplicateMessage =
                    "This Student ID / Roll Number is already registered.";

            }

            if (
                duplicateFields.includes(
                    "user"
                )
            ) {

                duplicateMessage =
                    "This student profile is already linked to an account.";

            }

            req.flash(
                "error",
                duplicateMessage
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // MONGOOSE VALIDATION ERROR
        // ====================================================

        if (
            error.name ===
            "ValidationError"
        ) {

            const validationMessages =
                Object.values(
                    error.errors || {}
                ).map(
                    (fieldError) =>
                        fieldError.message
                );

            req.flash(
                "error",
                validationMessages.length > 0
                    ? validationMessages[0]
                    : "Please check the entered information."
            );

            return res.redirect(
                "/auth/register/student"
            );
        }

        // ====================================================
        // OTHER ERRORS
        // ====================================================

        return next(error);
    }
};
// ============================================================
// FACULTY REGISTRATION PAGE
// ============================================================

const showFacultyRegister = (req, res) => {
    return res.render(
        "auth/faculty-register",
        {
            title: "Faculty Registration"
        }
    );
};

// ============================================================
// FACULTY REGISTRATION
// ============================================================

const registerFaculty = async (
    req,
    res,
    next
) => {
    try {
        const {
            name,
            dob,
            gender,
            mobile,
            email,
            employeeId,
            designation,
            employmentType,
            joiningDate,
            department,
            program,
            specialization,
            courses,
            highestQualification,
            qualificationField,
            qualificationUniversity,
            experience,
            address,
            city,
            state,
            pin,
            emergencyContact,
            emergencyRelation,
            password,
            confirmPassword
        } = req.body || {};

        const requiredFields = {
            name,
            dob,
            gender,
            mobile,
            email,
            employeeId,
            designation,
            employmentType,
            joiningDate,
            department,
            program,
            specialization,
            highestQualification,
            qualificationField,
            qualificationUniversity,
            experience,
            address,
            city,
            state,
            pin,
            emergencyContact,
            emergencyRelation,
            password,
            confirmPassword
        };

        const missingFields =
            Object.entries(requiredFields)
                .filter(
                    ([, value]) =>
                        value === undefined ||
                        value === null ||
                        String(value).trim() === ""
                )
                .map(([key]) => key);

        if (missingFields.length > 0) {
            req.flash(
                "error",
                `Please fill all required fields: ${missingFields.join(", ")}`
            );

            return res.redirect(
                "/auth/register/faculty"
            );
        }

        if (password !== confirmPassword) {
            req.flash(
                "error",
                "Passwords do not match."
            );

            return res.redirect(
                "/auth/register/faculty"
            );
        }

        if (password.length < 6) {
            req.flash(
                "error",
                "Password must be at least 6 characters long."
            );

            return res.redirect(
                "/auth/register/faculty"
            );
        }

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();

        const normalizedEmployeeId =
            String(employeeId).trim();

        const existingUser =
            await User.findOne({
                email: normalizedEmail
            });

        if (existingUser) {
            req.flash(
                "error",
                "An account with this email already exists."
            );

            return res.redirect(
                "/auth/register/faculty"
            );
        }

        const existingFaculty =
            await FacultyProfile.findOne({
                employeeId:
                    normalizedEmployeeId
            });

        if (existingFaculty) {
            req.flash(
                "error",
                "This Employee ID is already registered."
            );

            return res.redirect(
                "/auth/register/faculty"
            );
        }

        let user = null;

        try {
            user = new User({
                name:
                    String(name).trim(),

                email:
                    normalizedEmail,

                password,

                role:
                    "faculty",

                isActive:
                    true
            });

            await user.save();



            const selectedDepartment = await Department.findOne({
    _id: department,
    status: "active"
}).lean();

if (!selectedDepartment) {
    req.flash(
        "error",
        "Please select a valid department."
    );

    return res.redirect(
        "/auth/register/faculty"
    );
}

const selectedProgram = await Program.findOne({
    _id: program,
    department: selectedDepartment._id,
    status: "active"
}).lean();

if (!selectedProgram) {
    req.flash(
        "error",
        "Please select a valid program for the selected department."
    );

    return res.redirect(
        "/auth/register/faculty"
    );
}

const normalizedDepartment =
    selectedDepartment.name.trim();

const normalizedProgram =
    selectedProgram.name.trim();

            const facultyProfile =
    new FacultyProfile({
        user: user._id,

        employeeId:
            normalizedEmployeeId,

        dob,
        gender,

        mobile:
            String(mobile).trim(),

        designation,
        employmentType,
        joiningDate,

        department:
            normalizedDepartment,

        program:
            normalizedProgram,

        specialization:
            String(
                specialization
            ).trim(),

        courses:
            courses
                ? String(
                    courses
                ).trim()
                : "",

        highestQualification,

        qualificationField:
            String(
                qualificationField
            ).trim(),

        qualificationUniversity:
            String(
                qualificationUniversity
            ).trim(),

        experience,

        address:
            String(
                address
            ).trim(),

        city:
            String(city).trim(),

        state:
            String(state).trim(),

        pin:
            String(pin).trim(),

        emergencyContact:
            String(
                emergencyContact
            ).trim(),

        emergencyRelation:
            String(
                emergencyRelation
            ).trim()
    });

await facultyProfile.save();

        } catch (profileError) {
            console.error(
                "Faculty profile creation failed:",
                profileError
            );

            if (user && user._id) {
                try {
                    await User.findByIdAndDelete(
                        user._id
                    );
                } catch (rollbackError) {
                    console.error(
                        "Faculty user rollback failed:",
                        rollbackError
                    );
                }
            }

            throw profileError;
        }

        req.flash(
            "success",
            "Faculty account created successfully. You can now login."
        );

        return res.redirect(
            "/auth/login/faculty"
        );

    } catch (error) {
        console.error(
            "Faculty registration error:",
            error
        );

        if (error.code === 11000) {
            req.flash(
                "error",
                "Email or Employee ID is already registered."
            );

            return res.redirect(
                "/auth/register/faculty"
            );
        }

        if (
            error.name ===
            "ValidationError"
        ) {
            const firstError =
                Object.values(
                    error.errors
                )[0];

            req.flash(
                "error",
                firstError
                    ? firstError.message
                    : "Please check the entered information."
            );

            return res.redirect(
                "/auth/register/faculty"
            );
        }

        return next(error);
    }
};


// ============================================================
// WORKER REGISTRATION PAGE
// ============================================================

// ============================================================
// WORKER REGISTRATION PAGE
// ============================================================

const showWorkerRegister = (req, res) => {
    return res.render(
        "auth/worker-register",
        {
            title: "Worker Registration"
        }
    );
};


// ============================================================
// WORKER REGISTRATION
// ============================================================

const registerWorker = async (
    req,
    res,
    next
) => {
    try {

        const {
            name,
            dob,
            gender,
            mobile,
            email,
            workerType,
            employmentType,
            joiningDate,
            salary,
            address,
            city,
            state,
            pin,
            emergencyContact,
            emergencyRelation,
            password,
            confirmPassword
        } = req.body || {};

        // ====================================================
        // REQUIRED FIELDS
        // ====================================================

        const requiredFields = {
            name,
            dob,
            gender,
            mobile,
            email,
            workerType,
            employmentType,
            joiningDate,
            salary,
            address,
            city,
            state,
            pin,
            emergencyContact,
            emergencyRelation,
            password,
            confirmPassword
        };

        const missingFields =
            Object.entries(requiredFields)
                .filter(
                    ([, value]) =>
                        value === undefined ||
                        value === null ||
                        String(value).trim() === ""
                )
                .map(([key]) => key);

        if (missingFields.length > 0) {

            req.flash(
                "error",
                `Please fill all required fields: ${missingFields.join(", ")}`
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }


        // ====================================================
        // NORMALIZE
        // ====================================================

        const trimmedName =
            String(name).trim();

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();

        const normalizedMobile =
            String(mobile).trim();

        const normalizedGender =
            String(gender)
                .trim()
                .toLowerCase();

        const normalizedWorkerType =
            String(workerType)
                .trim()
                .toLowerCase();

        const normalizedEmploymentType =
            String(employmentType)
                .trim()
                .toLowerCase();

        const normalizedPin =
            String(pin).trim();

        const normalizedEmergencyContact =
            String(emergencyContact).trim();

        // ====================================================
        // NAME
        // ====================================================

        if (trimmedName.length < 2) {

            req.flash(
                "error",
                "Name must contain at least 2 characters."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        // ====================================================
        // EMAIL
        // ====================================================

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail)) {

            req.flash(
                "error",
                "Please enter a valid email address."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        // ====================================================
        // GENDER
        // ====================================================

        const allowedGenders = [
            "male",
            "female",
            "other"
        ];

        if (
            !allowedGenders.includes(
                normalizedGender
            )
        ) {

            req.flash(
                "error",
                "Please select a valid gender."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        // ====================================================
        // WORKER TYPE
        // ====================================================

        const allowedWorkerTypes = [
            "plumber",
            "electrician",
            "carpenter",
            "cleaner",
            "gardener",
            "security",
            "technician",
            "other"
        ];

        if (
            !allowedWorkerTypes.includes(
                normalizedWorkerType
            )
        ) {

            req.flash(
                "error",
                "Please select a valid worker type."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        // ====================================================
        // EMPLOYMENT TYPE
        // ====================================================

        const allowedEmploymentTypes = [
            "full-time",
            "part-time",
            "contract",
            "temporary"
        ];

        if (
            !allowedEmploymentTypes.includes(
                normalizedEmploymentType
            )
        ) {

            req.flash(
                "error",
                "Please select a valid employment type."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        // ====================================================
        // DATE OF BIRTH
        // ====================================================

        const parsedDOB =
            new Date(dob);

        if (
            !dob ||
            Number.isNaN(
                parsedDOB.getTime()
            )
        ) {

            req.flash(
                "error",
                "Please enter a valid date of birth."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        if (parsedDOB > new Date()) {

            req.flash(
                "error",
                "Date of birth cannot be in the future."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        // ====================================================
        // JOINING DATE
        // ====================================================

        const parsedJoiningDate =
            new Date(joiningDate);

        if (
            !joiningDate ||
            Number.isNaN(
                parsedJoiningDate.getTime()
            )
        ) {

            req.flash(
                "error",
                "Please enter a valid joining date."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        // ====================================================
        // MOBILE
        // ====================================================

        if (
            !/^[0-9]{10}$/.test(
                normalizedMobile
            )
        ) {

            req.flash(
                "error",
                "Please enter a valid 10-digit mobile number."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        // ====================================================
        // EMERGENCY CONTACT
        // ====================================================

        if (
            !/^[0-9]{10}$/.test(
                normalizedEmergencyContact
            )
        ) {

            req.flash(
                "error",
                "Please enter a valid 10-digit emergency contact number."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        // ====================================================
        // PIN
        // ====================================================

        if (
            !/^[0-9]{6}$/.test(
                normalizedPin
            )
        ) {

            req.flash(
                "error",
                "Please enter a valid 6-digit PIN code."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        // ====================================================
        // SALARY
        // ====================================================

        const numericSalary =
            Number(salary);

        if (
            !Number.isFinite(
                numericSalary
            ) ||
            numericSalary < 0
        ) {

            req.flash(
                "error",
                "Please enter a valid salary."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        // ====================================================
        // PASSWORD
        // ====================================================

        if (
            String(password).length < 6
        ) {

            req.flash(
                "error",
                "Password must be at least 6 characters."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        if (
            password !== confirmPassword
        ) {

            req.flash(
                "error",
                "Passwords do not match."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        // ====================================================
        // DUPLICATE EMAIL
        // ====================================================

        const existingUser =
            await User.findOne({
                email: normalizedEmail
            });

        if (existingUser) {

            req.flash(
                "error",
                "An account with this email already exists."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        // ====================================================
        // CREATE USER + WORKER PROFILE
        // ====================================================

        let user = null;

        try {

            user = new User({
                name: trimmedName,
                email: normalizedEmail,
                password,
                role: "worker",
                isActive: true
            });

            await user.save();

            let workerId;

            let workerIdExists = true;

            while (workerIdExists) {

                workerId =
                    `WRK-${Date.now()}-${Math.floor(
                        1000 + Math.random() * 9000
                    )}`;

                workerIdExists =
                    await WorkerProfile.exists({
                        workerId
                    });
            }

            const workerProfile =
                new WorkerProfile({

                    user: user._id,

                    workerId,

                    dob: parsedDOB,

                    gender:
                        normalizedGender,

                    mobile:
                        normalizedMobile,

                    workerType:
                        normalizedWorkerType,

                    employmentType:
                        normalizedEmploymentType,

                    joiningDate:
                        parsedJoiningDate,

                    salary:
                        numericSalary,

                    address:
                        String(address).trim(),

                    city:
                        String(city).trim(),

                    state:
                        String(state).trim(),

                    pin:
                        normalizedPin,

                    emergencyContact:
                        normalizedEmergencyContact,

                    emergencyRelation:
                        String(
                            emergencyRelation
                        ).trim()
                });

            await workerProfile.validate();

            await workerProfile.save();

        } catch (profileError) {

            console.error(
                "Worker profile creation failed:",
                profileError
            );

            if (
                user &&
                user._id
            ) {

                try {

                    await User.findByIdAndDelete(
                        user._id
                    );

                } catch (rollbackError) {

                    console.error(
                        "Worker user rollback failed:",
                        rollbackError
                    );
                }
            }

            throw profileError;
        }

        // ====================================================
        // SUCCESS
        // ====================================================

        req.flash(
            "success",
            "Worker registration successful. You can now login."
        );

        return res.redirect(
            "/auth/login/worker"
        );

    } catch (error) {

        console.error(
            "Worker registration error:",
            error
        );

        // ====================================================
        // DUPLICATE KEY
        // ====================================================

        if (error.code === 11000) {

            const duplicateFields =
                Object.keys(
                    error.keyPattern || {}
                );

            let duplicateMessage =
                "Worker account or profile already exists.";

            if (
                duplicateFields.includes(
                    "email"
                )
            ) {
                duplicateMessage =
                    "This email is already registered.";
            }

            if (
                duplicateFields.includes(
                    "workerId"
                )
            ) {
                duplicateMessage =
                    "Worker ID already exists. Please try again.";
            }

            if (
                duplicateFields.includes(
                    "user"
                )
            ) {
                duplicateMessage =
                    "This worker profile is already linked to an account.";
            }

            req.flash(
                "error",
                duplicateMessage
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        // ====================================================
        // MONGOOSE VALIDATION
        // ====================================================

        if (
            error.name ===
            "ValidationError"
        ) {

            const validationMessages =
                Object.values(
                    error.errors || {}
                ).map(
                    (fieldError) =>
                        fieldError.message
                );

            req.flash(
                "error",
                validationMessages.length > 0
                    ? validationMessages[0]
                    : "Please check the entered information."
            );

            return res.redirect(
                "/auth/register/worker"
            );
        }

        return next(error);
    }
};

// ============================================================
// LOGIN PORTAL
// ============================================================

const showLogin = (req, res) => {
    return res.render(
        "auth/login",
        {
            title: "Login"
        }
    );
};

// ============================================================
// ROLE-SPECIFIC LOGIN PAGE
// ============================================================

const showRoleLogin = (req, res) => {
    const role =
        String(req.params.role || "")
            .trim()
            .toLowerCase();

    const roleConfig = {
    student: {
        title: "Student Login",
        heading: "Student Portal",
        description:
            "Sign in to access your CampusNexus student account."
    },

    faculty: {
        title: "Faculty Login",
        heading: "Faculty Portal",
        description:
            "Sign in to access your academic workspace."
    },

    admin: {
        title: "Administrator Login",
        heading: "Administrator Portal",
        description:
            "Authorized university administrators only."
    },

    worker: {
        title: "Worker Login",
        heading: "Worker Portal",
        description:
            "Sign in to access your assigned work and profile."
    }
};

    if (!roleConfig[role]) {
        return res.status(404).render(
            "404",
            {
                title: "Login Type Not Found"
            }
        );
    }

    if (role === "admin") {
        return res.render(
            "auth/admin-login",
            {
                title:
                    roleConfig[role].title,

                role,

                heading:
                    roleConfig[role].heading,

                description:
                    roleConfig[role].description
            }
        );
    }

    return res.render(
        "auth/login-form",
        {
            title:
                roleConfig[role].title,

            role,

            heading:
                roleConfig[role].heading,

            description:
                roleConfig[role].description
        }
    );
};

// ============================================================
// LOGIN
// ============================================================

// ============================================================
// LOGIN
// ============================================================

const login = async (
    req,
    res,
    next
) => {
    try {

        const role =
            String(req.params.role || "")
                .trim()
                .toLowerCase();

        const allowedRoles = [
            "student",
            "faculty",
            "admin",
            "worker"
        ];

        if (!allowedRoles.includes(role)) {
            req.flash(
                "error",
                "Invalid login type."
            );

            return res.redirect(
                "/auth/login/student"
            );
        }

        const email =
            String(
                req.body?.email || ""
            )
                .trim()
                .toLowerCase();

        const password =
            String(
                req.body?.password || ""
            );

        if (!email || !password) {
            req.flash(
                "error",
                "Please enter email and password."
            );

            return res.redirect(
                `/auth/login/${role}`
            );
        }

        // ====================================================
        // ADMIN LOGIN
        // ====================================================

        if (role === "admin") {

            const adminEmail =
                String(
                    process.env.ADMIN_EMAIL || ""
                )
                    .trim()
                    .toLowerCase();

            const adminPasswordHash =
                String(
                    process.env.ADMIN_PASSWORD_HASH || ""
                ).trim();

            if (
                !adminEmail ||
                !adminPasswordHash
            ) {

                console.error(
                    "Admin login configuration is missing."
                );

                req.flash(
                    "error",
                    "Administrator login is not configured correctly."
                );

                return res.redirect(
                    "/auth/login/admin"
                );
            }

            if (email !== adminEmail) {

                req.flash(
                    "error",
                    "Invalid email or password."
                );

                return res.redirect(
                    "/auth/login/admin"
                );
            }

            const passwordCorrect =
                await bcrypt.compare(
                    password,
                    adminPasswordHash
                );

            if (!passwordCorrect) {

                req.flash(
                    "error",
                    "Invalid email or password."
                );

                return res.redirect(
                    "/auth/login/admin"
                );
            }

            // Admin login successful
            delete req.session.pendingLogin;

            req.session.user = {
                _id: "admin",
                id: "admin",
                name: "Administrator",
                email: adminEmail,
                role: "admin"
            };

            return req.session.save(
                (err) => {

                    if (err) {
                        return next(err);
                    }

                    return res.redirect(
                        "/admin/dashboard"
                    );
                }
            );
        }

        // ====================================================
        // STUDENT / FACULTY / WORKER LOGIN
        // ====================================================

        const user =
            await User.findOne({
                email
            }).select("+password");
            console.log("LOGIN DEBUG:", {
                   email,
                   role,
                    userFound: !!user,
                  userRole: user?.role,
                  isActive: user?.isActive,
                 isDeleted: user?.isDeleted
            });

        if (!user) {

            req.flash(
                "error",
                "Invalid email or password."
            );

            return res.redirect(
                `/auth/login/${role}`
            );
        }

        if (!user.isActive) {

            req.flash(
                "error",
                "Your account has been deactivated."
            );

            return res.redirect(
                `/auth/login/${role}`
            );
        }

        if (user.role !== role) {

            req.flash(
                "error",
                "This account does not belong to the selected login portal."
            );

            return res.redirect(
                `/auth/login/${role}`
            );
        }

        const passwordCorrect =
            await user.comparePassword(
                password
            );
             console.log("PASSWORD DEBUG:", {
              passwordCorrect
            });

        if (!passwordCorrect) {

            req.flash(
                "error",
                "Invalid email or password."
            );

            return res.redirect(
                `/auth/login/${role}`
            );
        }

        // ====================================================
        // WORKER LOGIN
        // NO OTP
        // ====================================================

        if (role === "worker") {

            delete req.session.pendingLogin;

            req.session.user = {
                _id: user._id.toString(),
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role
            };

            user.lastLogin = new Date();

            await user.save({
                validateBeforeSave: false
            });

            return req.session.save(
                (err) => {

                    if (err) {
                        return next(err);
                    }

                    return res.redirect(
                        "/worker/dashboard"
                    );
                }
            );
        }

        // ====================================================
        // STUDENT / FACULTY LOGIN
        // OTP REQUIRED
        // ====================================================


        // ====================================================
        // GENERATE LOGIN OTP
        // ====================================================

       // ====================================================
// DIRECT LOGIN
// STUDENT / FACULTY / WORKER - NO LOGIN OTP
// ====================================================

delete req.session.pendingLogin;

const userSession = {
    _id: user._id.toString(),
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role
};

// Update last login
user.lastLogin = new Date();

await user.save({
    validateBeforeSave: false
});

// Preserve requested protected route
const returnTo =
    req.session.returnTo;

// ====================================================
// SESSION REGENERATION
// ====================================================

return req.session.regenerate(
    (error) => {

        if (error) {
            console.error(
                "Session regenerate error:",
                error
            );

            return next(error);
        }

        req.session.user =
            userSession;

        delete req.session.pendingLogin;
        delete req.session.returnTo;

        const dashboard =
            getDashboardByRole(
                user.role,
                returnTo
            );

        return req.session.save(
            (saveError) => {

                if (saveError) {
                    console.error(
                        "Authenticated session save error:",
                        saveError
                    );

                    return next(saveError);
                }

                console.log(
                    "LOGIN SUCCESS"
                );

                console.log(
                    "USER:",
                    req.session.user
                );

                console.log(
                    "REDIRECT:",
                    dashboard
                );

                return res.redirect(
                    dashboard
                );
            }
        );
    }
);

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        return next(error);
    }
};

// ============================================================
// LOGOUT
// ============================================================

const logout = (req, res, next) => {
    req.session.destroy(
        (error) => {
            if (error) {
                return next(error);
            }

            res.clearCookie(
                "connect.sid"
            );

            return res.redirect(
                "/auth/login"
            );
        }
    );
}

// ============================================================
// FORGOT PASSWORD PAGE
// ============================================================




    





// ============================================================
// RESET PASSWORD PAGE
// ============================================================

const showResetPassword = (
    req,
    res
) => {
    if (
        !req.session.passwordResetVerified ||
        !req.session.passwordResetUserId
    ) {
        req.flash(
            "error",
            "Please verify your OTP first."
        );

        return res.redirect(
            "/auth/forgot-password"
        );
    }

    return res.render(
        "auth/reset-password",
        {
            title: "Reset Password"
        }
    );
};

// ============================================================
// RESET PASSWORD
// ============================================================



// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    // Registration
    showRegister,
    showStudentRegister,
    register,
    showFacultyRegister,
    registerFaculty,
    showWorkerRegister,
    registerWorker,

    // Login
    showLogin,
    showRoleLogin,
    login,

    // Login OTP
    
    
    

    // Logout
    logout,

    // Password reset
   
    
    
    showResetPassword,
    
};