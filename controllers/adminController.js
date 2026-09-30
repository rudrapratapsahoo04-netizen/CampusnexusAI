const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const FacultyProfile = require("../models/FacultyProfile");
const Course = require("../models/Course");
const Department = require("../models/Department");
const Program = require("../models/Program");
const Timetable = require("../models/Timetable");
const FacultyAssignment = require("../models/FacultyAssignment");
const WorkerProfile = require("../models/WorkerProfile");
const WorkerTask = require("../models/WorkerTask");
const WorkerLeave = require("../models/WorkerLeave");
const LostFoundReport = require("../models/LostFoundReport");
const Notification = require("../models/Notification");

// ============================================================
// HELPERS
// ============================================================

const escapeRegex = value => {
    return String(value).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
};


/*
 * Matches exact values while supporting:
 *
 * "computer science"
 * "computer-science"
 * "Computer Science"
 *
 * and:
 *
 * "BSC Cs"
 * "BSC CS"
 * "bsc-cs"
 *
 * This is required because master Department/Program data
 * and existing StudentProfile/FacultyProfile data may use
 * different formatting.
 */
const exactStringRegex = values => {
    const validValues = new Set();

    values.forEach(value => {
        const rawValue =
            String(value || "").trim();

        if (!rawValue) {
            return;
        }

        // Original value
        validValues.add(rawValue);

        // Lowercase value
        validValues.add(
            rawValue.toLowerCase()
        );

        // Slug value
        //
        // Examples:
        // "computer science" -> "computer-science"
        // "BSC Cs"           -> "bsc-cs"
        // "BSC CS"           -> "bsc-cs"
        const slugValue =
            rawValue
                .toLowerCase()
                .replace(
                    /[^a-z0-9]+/g,
                    "-"
                )
                .replace(
                    /^-+|-+$/g,
                    "");

        if (slugValue) {
            validValues.add(slugValue);
        }
    });

    const valuesArray =
        [...validValues];

    if (valuesArray.length === 0) {
        return null;
    }

    if (valuesArray.length === 1) {
        return {
            $regex:
                `^${escapeRegex(valuesArray[0])}$`,
            $options: "i"
        };
    }

    return {
        $in: valuesArray.map(
            value =>
                new RegExp(
                    `^${escapeRegex(value)}$`,
                    "i"
                )
        )
    };
};


const buildDepartmentProfileQuery = department => {
    if (!department) {
        return null;
    }

    const departmentName =
        String(department.name || "").trim();

    const departmentCode =
        String(department.code || "").trim();

    const departmentMatcher =
        exactStringRegex([
            departmentName,
            departmentCode
        ]);

    if (!departmentMatcher) {
        return null;
    }

    return {
        department: departmentMatcher
    };
};


const buildProgramProfileQuery = program => {
    if (!program) {
        return null;
    }

    const department =
        program.department || null;

    if (!department) {
        return null;
    }

    const departmentName =
        String(
            department.name || ""
        ).trim();

    const departmentCode =
        String(
            department.code || ""
        ).trim();

    const programName =
        String(
            program.name || ""
        ).trim();

    const programCode =
        String(
            program.code || ""
        ).trim();

    const departmentMatcher =
        exactStringRegex([
            departmentName,
            departmentCode
        ]);

    const programMatcher =
        exactStringRegex([
            programName,
            programCode
        ]);

    if (
        !departmentMatcher ||
        !programMatcher
    ) {
        return null;
    }

    return {
        department: departmentMatcher,
        program: programMatcher
    };
};


// ============================================================
// ADMIN DASHBOARD
// ============================================================

const showAdminDashboard = async (
    req,
    res,
    next
) => {
    try {

        const [
            totalUsers,
            totalStudents,
            totalFaculty,
            activeStudents,
            activeFaculty,
            inactiveUsers
        ] = await Promise.all([

            User.countDocuments(),

            User.countDocuments({
                role: "student"
            }),

            User.countDocuments({
                role: "faculty"
            }),

            User.countDocuments({
                role: "student",
                isActive: true
            }),

            User.countDocuments({
                role: "faculty",
                isActive: true
            }),

            User.countDocuments({
                isActive: false
            })
        ]);


        const recentStudents =
            await User.find({
                role: "student"
            })
                .select(
                    "name email isActive createdAt"
                )
                .sort({
                    createdAt: -1
                })
                .limit(8)
                .lean();


        const recentFaculty =
            await User.find({
                role: "faculty"
            })
                .select(
                    "name email isActive createdAt"
                )
                .sort({
                    createdAt: -1
                })
                .limit(8)
                .lean();


        const recentUsers =
            await User.find({})
                .select(
                    "name email role isActive createdAt lastLogin"
                )
                .sort({
                    createdAt: -1
                })
                .limit(10)
                .lean();


        const recentlyActiveUsers =
            await User.find({
                lastLogin: {
                    $ne: null
                }
            })
                .select(
                    "name email role lastLogin"
                )
                .sort({
                    lastLogin: -1
                })
                .limit(10)
                .lean();


        const roleDistribution = {
            students: totalStudents,
            faculty: totalFaculty
        };


        return res.render(
            "admin/dashboard",
            {
                title: "Admin Dashboard",

                currentUser:
                    req.session.user || null,

                stats: {
                    totalUsers,
                    totalStudents,
                    totalFaculty,
                    activeStudents,
                    activeFaculty,
                    inactiveUsers,
                    recentStudents,
                    recentFaculty,
                    recentUsers,
                    recentlyActiveUsers,
                    roleDistribution
                }
            }
        );

    } catch (error) {

        console.error(
            "Admin dashboard error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - STUDENT MANAGEMENT
// ============================================================

const showAdminStudents = async (
    req,
    res,
    next
) => {
    try {

        const {
            search = "",
            department = "",
            program = "",
            semester = "",
            section = "",
            batch = "",
            status = "",
            approval = ""
        } = req.query;


        // ----------------------------------------------------
        // USER QUERY
        // ----------------------------------------------------

        const userQuery = {
            role: "student"
        };


        if (status === "active") {
            userQuery.isActive = true;
        }


        if (status === "inactive") {
            userQuery.isActive = false;
        }


        // ----------------------------------------------------
        // FETCH STUDENT USERS
        // ----------------------------------------------------

        const studentUsers =
            await User.find(userQuery)
                .select(
                    "name email role isActive lastLogin createdAt"
                )
                .sort({
                    createdAt: -1
                })
                .lean();


        // ----------------------------------------------------
        // FETCH STUDENT PROFILES
        // ----------------------------------------------------

        const userIds =
            studentUsers.map(
                student => student._id
            );


        const studentProfiles =
            userIds.length > 0
                ? await StudentProfile.find({
                    user: {
                        $in: userIds
                    }
                }).lean()
                : [];


        // ----------------------------------------------------
        // PROFILE MAP
        // ----------------------------------------------------

        const profileMap =
            new Map();


        for (
            const profile
            of studentProfiles
        ) {

            if (profile.user) {

                profileMap.set(
                    profile.user.toString(),
                    profile
                );
            }
        }


        // ----------------------------------------------------
        // COMBINE USER + PROFILE
        // ----------------------------------------------------

        let students =
            studentUsers.map(
                user => {

                    const profile =
                        profileMap.get(
                            user._id.toString()
                        );


                    return {

                        _id:
                            profile?._id ||
                            null,

                        userId:
                            user._id,

                        profile:
                            profile ||
                            null,

                        user: {
                            _id:
                                user._id,

                            name:
                                user.name,

                            email:
                                user.email,

                            role:
                                user.role,

                            isActive:
                                user.isActive,

                            lastLogin:
                                user.lastLogin,

                            createdAt:
                                user.createdAt
                        },

                        studentId:
                            profile?.studentId ||
                            null,

                        department:
                            profile?.department ||
                            null,

                        program:
                            profile?.program ||
                            null,

                        semester:
                            profile?.semester ??
                            null,

                        section:
                            profile?.section ||
                            null,

                        batch:
                            profile?.batch ??
                            null,

                        academicApprovalStatus:
                            profile?.academicApprovalStatus ||
                            "pending",

                        profileStatus:
                            profile?.profileStatus ||
                            "incomplete",

                        mobile:
                            profile?.mobile ||
                            null
                    };
                }
            );


        // ----------------------------------------------------
        // DEPARTMENT FILTER
        // ----------------------------------------------------

        if (department.trim()) {

            const normalizedDepartment =
                department
                    .trim()
                    .toLowerCase();


            students =
                students.filter(
                    student =>
                        String(
                            student.department || ""
                        ).toLowerCase() ===
                        normalizedDepartment
                );
        }


        // ----------------------------------------------------
        // PROGRAM FILTER
        // ----------------------------------------------------

        if (program.trim()) {

            const normalizedProgram =
                program
                    .trim()
                    .toLowerCase();


            students =
                students.filter(
                    student =>
                        String(
                            student.program || ""
                        ).toLowerCase() ===
                        normalizedProgram
                );
        }


        // ----------------------------------------------------
        // SEMESTER FILTER
        // ----------------------------------------------------

        if (semester) {

            const semesterNumber =
                Number(semester);


            if (
                Number.isInteger(
                    semesterNumber
                )
            ) {

                students =
                    students.filter(
                        student =>
                            Number(
                                student.semester
                            ) ===
                            semesterNumber
                    );
            }
        }


        // ----------------------------------------------------
        // SECTION FILTER
        // ----------------------------------------------------

        if (section.trim()) {

            const normalizedSection =
                section
                    .trim()
                    .toUpperCase();


            students =
                students.filter(
                    student =>
                        String(
                            student.section || ""
                        ).toUpperCase() ===
                        normalizedSection
                );
        }


        // ----------------------------------------------------
        // BATCH FILTER
        // ----------------------------------------------------

        if (batch) {

            const batchNumber =
                Number(batch);


            if (
                Number.isInteger(
                    batchNumber
                )
            ) {

                students =
                    students.filter(
                        student =>
                            Number(
                                student.batch
                            ) ===
                            batchNumber
                    );
            }
        }


        // ----------------------------------------------------
        // APPROVAL FILTER
        // ----------------------------------------------------

        if (
            [
                "pending",
                "approved",
                "rejected"
            ].includes(approval)
        ) {

            students =
                students.filter(
                    student =>
                        student.academicApprovalStatus ===
                        approval
                );
        }


        // ----------------------------------------------------
        // SEARCH
        // ----------------------------------------------------

        const searchText =
            search
                .trim()
                .toLowerCase();


        if (searchText) {

            students =
                students.filter(
                    student => {

                        const name =
                            String(
                                student.user?.name ||
                                ""
                            ).toLowerCase();


                        const email =
                            String(
                                student.user?.email ||
                                ""
                            ).toLowerCase();


                        const studentId =
                            String(
                                student.studentId ||
                                ""
                            ).toLowerCase();


                        const mobile =
                            String(
                                student.mobile ||
                                ""
                            ).toLowerCase();


                        const departmentName =
                            String(
                                student.department ||
                                ""
                            ).toLowerCase();


                        const programName =
                            String(
                                student.program ||
                                ""
                            ).toLowerCase();


                        return (
                            name.includes(searchText) ||
                            email.includes(searchText) ||
                            studentId.includes(searchText) ||
                            mobile.includes(searchText) ||
                            departmentName.includes(searchText) ||
                            programName.includes(searchText)
                        );
                    }
                );
        }


        // ----------------------------------------------------
        // FILTER OPTIONS
        // ----------------------------------------------------

        const [
            departments,
            programs,
            sections,
            batches
        ] = await Promise.all([

            StudentProfile.distinct(
                "department"
            ),

            StudentProfile.distinct(
                "program"
            ),

            StudentProfile.distinct(
                "section"
            ),

            StudentProfile.distinct(
                "batch"
            )
        ]);


        departments.sort();
        programs.sort();
        sections.sort();


        batches.sort(
            (a, b) =>
                Number(b) -
                Number(a)
        );


        // ----------------------------------------------------
        // SUMMARY
        // ----------------------------------------------------

        const summary = {

            total:
                students.length,

            active:
                students.filter(
                    student =>
                        student.user?.isActive ===
                        true
                ).length,

            inactive:
                students.filter(
                    student =>
                        student.user?.isActive ===
                        false
                ).length,

            pending:
                students.filter(
                    student =>
                        student.academicApprovalStatus ===
                        "pending"
                ).length,

            approved:
                students.filter(
                    student =>
                        student.academicApprovalStatus ===
                        "approved"
                ).length,

            rejected:
                students.filter(
                    student =>
                        student.academicApprovalStatus ===
                        "rejected"
                ).length,

            incomplete:
                students.filter(
                    student =>
                        student.profileStatus ===
                        "incomplete"
                ).length
        };


        // ----------------------------------------------------
        // RENDER
        // ----------------------------------------------------

        return res.render(
            "admin/students",
            {
                title:
                    "Student Management",

                currentUser:
                    req.session.user || null,

                students,

                summary,

                filters: {
                    search,
                    department,
                    program,
                    semester,
                    section,
                    batch,
                    status,
                    approval
                },

                filterOptions: {
                    departments,
                    programs,
                    sections,
                    batches
                }
            }
        );

    } catch (error) {

        console.error(
            "Admin students error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - STUDENT VIEW
// ============================================================

const showAdminStudent = async (
    req,
    res,
    next
) => {
    try {

        const { id } =
            req.params;


        const student =
            await StudentProfile.findById(id)
                .populate({
                    path: "user",
                    select:
                        "name email role isActive lastLogin createdAt updatedAt"
                })
                .lean();


        if (
            !student ||
            !student.user
        ) {

            return res.status(404).render(
                "error",
                {
                    title:
                        "Student Not Found",

                    statusCode:
                        404,

                    message:
                        "The requested student profile was not found.",

                    currentUser:
                        req.session.user || null
                }
            );
        }


        return res.render(
            "admin/student-view",
            {
                title:
                    `Student - ${student.user.name}`,

                currentUser:
                    req.session.user || null,

                student
            }
        );

    } catch (error) {

        console.error(
            "Admin student view error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - EDIT STUDENT
// ============================================================

const showEditStudent = async (
    req,
    res,
    next
) => {
    try {

        const { id } =
            req.params;


        const student =
            await StudentProfile.findById(id)
                .populate({
                    path: "user",
                    select:
                        "name email role isActive lastLogin createdAt updatedAt"
                })
                .lean();


        if (
            !student ||
            !student.user
        ) {

            return res.status(404).render(
                "error",
                {
                    title:
                        "Student Not Found",

                    statusCode:
                        404,

                    message:
                        "The requested student profile was not found.",

                    currentUser:
                        req.session.user || null
                }
            );
        }


        return res.render(
            "admin/student-edit",
            {
                title:
                    `Edit Student - ${student.user.name}`,

                currentUser:
                    req.session.user || null,

                student
            }
        );

    } catch (error) {

        console.error(
            "Admin edit student page error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - UPDATE STUDENT
// ============================================================

const updateStudent = async (
    req,
    res,
    next
) => {
    try {

        const { id } =
            req.params;


        const {
            name,
            dob,
            gender,
            mobile,
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
            academicApprovalStatus,
            isActive
        } = req.body;


        const student =
            await StudentProfile.findById(id);


        if (!student) {

            req.flash(
                "error",
                "Student profile not found."
            );

            return res.redirect(
                "/admin/students"
            );
        }


        const user =
            await User.findById(
                student.user
            );


        if (!user) {

            req.flash(
                "error",
                "Student account not found."
            );

            return res.redirect(
                "/admin/students"
            );
        }


        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!name || !name.trim()) {

            req.flash(
                "error",
                "Student name is required."
            );

            return res.redirect(
                `/admin/students/${id}/edit`
            );
        }


        if (
            !studentId ||
            !studentId.trim()
        ) {

            req.flash(
                "error",
                "Student ID is required."
            );

            return res.redirect(
                `/admin/students/${id}/edit`
            );
        }


        if (
            !department ||
            !department.trim()
        ) {

            req.flash(
                "error",
                "Department is required."
            );

            return res.redirect(
                `/admin/students/${id}/edit`
            );
        }


        if (
            !program ||
            !program.trim()
        ) {

            req.flash(
                "error",
                "Program is required."
            );

            return res.redirect(
                `/admin/students/${id}/edit`
            );
        }


        if (!semester) {

            req.flash(
                "error",
                "Semester is required."
            );

            return res.redirect(
                `/admin/students/${id}/edit`
            );
        }


        if (!batch) {

            req.flash(
                "error",
                "Batch is required."
            );

            return res.redirect(
                `/admin/students/${id}/edit`
            );
        }


        // ----------------------------------------------------
        // NORMALIZE
        // ----------------------------------------------------

        const normalizedStudentId =
            String(studentId)
                .trim()
                .toUpperCase();


        const normalizedDepartment =
            String(department)
                .trim()
                .toLowerCase();


        const normalizedProgram =
            String(program)
                .trim()
                .toLowerCase();


        const normalizedSection =
            section
                ? String(section)
                    .trim()
                    .toUpperCase()
                : null;


        const numericSemester =
            Number(semester);


        const numericBatch =
            Number(batch);


        // ----------------------------------------------------
        // NUMBER VALIDATION
        // ----------------------------------------------------

        if (
            !Number.isInteger(
                numericSemester
            ) ||
            numericSemester < 1 ||
            numericSemester > 8
        ) {

            req.flash(
                "error",
                "Invalid semester."
            );

            return res.redirect(
                `/admin/students/${id}/edit`
            );
        }


        if (
            !Number.isInteger(
                numericBatch
            ) ||
            numericBatch < 2000
        ) {

            req.flash(
                "error",
                "Invalid batch year."
            );

            return res.redirect(
                `/admin/students/${id}/edit`
            );
        }


        // ----------------------------------------------------
        // DUPLICATE STUDENT ID
        // ----------------------------------------------------

        const duplicateStudent =
            await StudentProfile.findOne({
                studentId:
                    normalizedStudentId,

                _id: {
                    $ne: id
                }
            });


        if (duplicateStudent) {

            req.flash(
                "error",
                "Another student already uses this Student ID."
            );

            return res.redirect(
                `/admin/students/${id}/edit`
            );
        }


        // ----------------------------------------------------
        // UPDATE USER
        // ----------------------------------------------------

        user.name =
            String(name).trim();


        user.isActive =
            isActive === "active";


        await user.save();


        // ----------------------------------------------------
        // UPDATE PROFILE
        // ----------------------------------------------------

        student.dob =
            dob
                ? new Date(dob)
                : student.dob;


        student.gender =
            gender ||
            student.gender;


        student.mobile =
            mobile
                ? String(mobile).trim()
                : student.mobile;


        student.studentId =
            normalizedStudentId;


        student.department =
            normalizedDepartment;


        student.program =
            normalizedProgram;


        student.semester =
            numericSemester;


        student.section =
            normalizedSection;


        student.batch =
            numericBatch;


        student.permanentAddress =
            permanentAddress
                ? String(
                    permanentAddress
                ).trim()
                : "";


        student.currentAddress =
            currentAddress
                ? String(
                    currentAddress
                ).trim()
                : "";


        student.city =
            city
                ? String(city).trim()
                : "";


        student.state =
            state
                ? String(state).trim()
                : "";


        student.pin =
            pin
                ? String(pin).trim()
                : "";


        student.guardianName =
            guardianName
                ? String(
                    guardianName
                ).trim()
                : "";


        student.guardianMobile =
            guardianMobile
                ? String(
                    guardianMobile
                ).trim()
                : "";


        student.emergencyContact =
            emergencyContact
                ? String(
                    emergencyContact
                ).trim()
                : "";


        student.hostelRequired =
            hostelRequired === "yes";


        if (
            student.hostelRequired
        ) {

            student.hostelName =
                hostelName
                    ? String(
                        hostelName
                    ).trim()
                    : null;


            student.roomNumber =
                roomNumber
                    ? String(
                        roomNumber
                    ).trim()
                    : null;

        } else {

            student.hostelName =
                null;

            student.roomNumber =
                null;
        }


        // ----------------------------------------------------
        // APPROVAL
        // ----------------------------------------------------

        if (
            [
                "pending",
                "approved",
                "rejected"
            ].includes(
                academicApprovalStatus
            )
        ) {

            student.academicApprovalStatus =
                academicApprovalStatus;
        }


        await student.save();


        req.flash(
            "success",
            "Student information updated successfully."
        );


        return res.redirect(
            `/admin/students/${id}`
        );

    } catch (error) {

        console.error(
            "Admin update student error:",
            error
        );


        if (error.code === 11000) {

            req.flash(
                "error",
                "Student ID already exists."
            );

            return res.redirect(
                `/admin/students/${req.params.id}/edit`
            );
        }


        if (
            error.name ===
            "ValidationError"
        ) {

            const message =
                Object.values(
                    error.errors
                )
                    .map(
                        item =>
                            item.message
                    )
                    .join(" ");


            req.flash(
                "error",
                message
            );


            return res.redirect(
                `/admin/students/${req.params.id}/edit`
            );
        }


        return next(error);
    }
};


// ============================================================
// ADMIN - FACULTY MANAGEMENT
// ============================================================

const showAdminFaculty = async (
    req,
    res,
    next
) => {
    try {

        const {
            search = "",
            department = "",
            program = "",
            designation = "",
            employmentType = "",
            status = ""
        } = req.query;


        // ----------------------------------------------------
        // USER QUERY
        // ----------------------------------------------------

        const userQuery = {
            role: "faculty"
        };


        if (status === "active") {
            userQuery.isActive = true;
        }


        if (status === "inactive") {
            userQuery.isActive = false;
        }


        // ----------------------------------------------------
        // FACULTY USERS
        // ----------------------------------------------------

        const facultyUsers =
            await User.find(userQuery)
                .select(
                    "name email role isActive lastLogin createdAt"
                )
                .sort({
                    createdAt: -1
                })
                .lean();


        const userIds =
            facultyUsers.map(
                faculty =>
                    faculty._id
            );


        // ----------------------------------------------------
        // FACULTY PROFILES
        // ----------------------------------------------------

        const facultyProfiles =
            userIds.length > 0
                ? await FacultyProfile.find({
                    user: {
                        $in: userIds
                    }
                }).lean()
                : [];


        // ----------------------------------------------------
        // PROFILE MAP
        // ----------------------------------------------------

        const profileMap =
            new Map();


        for (
            const profile
            of facultyProfiles
        ) {

            if (profile.user) {

                profileMap.set(
                    profile.user.toString(),
                    profile
                );
            }
        }


        // ----------------------------------------------------
        // COMBINE
        // ----------------------------------------------------

        let faculty =
            facultyUsers.map(
                user => {

                    const profile =
                        profileMap.get(
                            user._id.toString()
                        );


                    return {

                        _id:
                            profile?._id ||
                            null,

                        userId:
                            user._id,

                        profile:
                            profile ||
                            null,

                        user: {
                            _id:
                                user._id,

                            name:
                                user.name,

                            email:
                                user.email,

                            role:
                                user.role,

                            isActive:
                                user.isActive,

                            lastLogin:
                                user.lastLogin,

                            createdAt:
                                user.createdAt
                        },

                        employeeId:
                            profile?.employeeId ||
                            null,

                        department:
                            profile?.department ||
                            null,

                        program:
                            profile?.program ||
                            null,

                        designation:
                            profile?.designation ||
                            null,

                        employmentType:
                            profile?.employmentType ||
                            null,

                        mobile:
                            profile?.mobile ||
                            null,

                        specialization:
                            profile?.specialization ||
                            null,

                        highestQualification:
                            profile?.highestQualification ||
                            null,

                        experience:
                            profile?.experience ||
                            null,

                        joiningDate:
                            profile?.joiningDate ||
                            null
                    };
                }
            );


        // ----------------------------------------------------
        // DEPARTMENT FILTER
        // ----------------------------------------------------

        if (
            department.trim()
        ) {

            const normalizedDepartment =
                department
                    .trim()
                    .toLowerCase();


            faculty =
                faculty.filter(
                    item =>
                        String(
                            item.department || ""
                        ).toLowerCase() ===
                        normalizedDepartment
                );
        }


        // ----------------------------------------------------
        // PROGRAM FILTER
        // ----------------------------------------------------

        if (
            program.trim()
        ) {

            const normalizedProgram =
                program
                    .trim()
                    .toLowerCase();


            faculty =
                faculty.filter(
                    item =>
                        String(
                            item.program || ""
                        ).toLowerCase() ===
                        normalizedProgram
                );
        }


        // ----------------------------------------------------
        // DESIGNATION
        // ----------------------------------------------------

        if (
            designation.trim()
        ) {

            faculty =
                faculty.filter(
                    item =>
                        item.designation ===
                        designation
                );
        }


        // ----------------------------------------------------
        // EMPLOYMENT TYPE
        // ----------------------------------------------------

        if (
            employmentType.trim()
        ) {

            faculty =
                faculty.filter(
                    item =>
                        item.employmentType ===
                        employmentType
                );
        }


        // ----------------------------------------------------
        // SEARCH
        // ----------------------------------------------------

        const searchText =
            search
                .trim()
                .toLowerCase();


        if (searchText) {

            faculty =
                faculty.filter(
                    item => {

                        const name =
                            String(
                                item.user?.name ||
                                ""
                            ).toLowerCase();


                        const email =
                            String(
                                item.user?.email ||
                                ""
                            ).toLowerCase();


                        const employeeId =
                            String(
                                item.employeeId ||
                                ""
                            ).toLowerCase();


                        const mobile =
                            String(
                                item.mobile ||
                                ""
                            ).toLowerCase();


                        const departmentName =
                            String(
                                item.department ||
                                ""
                            ).toLowerCase();


                        const programName =
                            String(
                                item.program ||
                                ""
                            ).toLowerCase();


                        const designationName =
                            String(
                                item.designation ||
                                ""
                            ).toLowerCase();


                        const specialization =
                            String(
                                item.specialization ||
                                ""
                            ).toLowerCase();


                        return (
                            name.includes(searchText) ||
                            email.includes(searchText) ||
                            employeeId.includes(searchText) ||
                            mobile.includes(searchText) ||
                            departmentName.includes(searchText) ||
                            programName.includes(searchText) ||
                            designationName.includes(searchText) ||
                            specialization.includes(searchText)
                        );
                    }
                );
        }


        // ----------------------------------------------------
        // FILTER OPTIONS
        // ----------------------------------------------------

        const [
            departments,
            programs
        ] = await Promise.all([

            FacultyProfile.distinct(
                "department"
            ),

            FacultyProfile.distinct(
                "program"
            )
        ]);


        departments.sort();
        programs.sort();


        // ----------------------------------------------------
        // SUMMARY
        // ----------------------------------------------------

        const summary = {

            total:
                faculty.length,

            active:
                faculty.filter(
                    item =>
                        item.user?.isActive ===
                        true
                ).length,

            inactive:
                faculty.filter(
                    item =>
                        item.user?.isActive ===
                        false
                ).length,

            withProfile:
                faculty.filter(
                    item =>
                        item.profile !== null
                ).length,

            withoutProfile:
                faculty.filter(
                    item =>
                        item.profile === null
                ).length
        };


        return res.render(
            "admin/faculty",
            {
                title:
                    "Faculty Management",

                currentUser:
                    req.session.user || null,

                faculty,

                summary,

                filters: {
                    search,
                    department,
                    program,
                    designation,
                    employmentType,
                    status
                },

                filterOptions: {
                    departments,
                    programs
                }
            }
        );

    } catch (error) {

        console.error(
            "Admin faculty error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - FACULTY VIEW
// ============================================================

const showAdminFacultyProfile = async (
    req,
    res,
    next
) => {
    try {

        const { id } =
            req.params;


        const faculty =
            await FacultyProfile.findById(id)
                .populate({
                    path: "user",
                    select:
                        "name email role isActive lastLogin createdAt updatedAt"
                })
                .lean();


        if (
            !faculty ||
            !faculty.user
        ) {

            return res.status(404).render(
                "error",
                {
                    title:
                        "Faculty Not Found",

                    statusCode:
                        404,

                    message:
                        "The requested faculty profile was not found.",

                    currentUser:
                        req.session.user || null
                }
            );
        }


        return res.render(
            "admin/faculty-view",
            {
                title:
                    `Faculty - ${faculty.user.name}`,

                currentUser:
                    req.session.user || null,

                faculty
            }
        );

    } catch (error) {

        console.error(
            "Admin faculty profile error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - ADD PROGRAM
// ============================================================

// ============================================================
// ADMIN - ADD PROGRAM
// ============================================================

const showAddProgram = async (
    req,
    res,
    next
) => {
    try {

        const departments =
            await Department.find({
                status: "active"
            })
                .select(
                    "name code"
                )
                .sort({
                    name: 1
                })
                .lean();


        return res.render(
            "admin/program-form",
            {
                title:
                    "Add Program",

                currentUser:
                    req.session.user || null,

                program:
                    null,

                departments,

                // IMPORTANT:
                // program-form.ejs uses isEdit
                isEdit:
                    false
            }
        );

    } catch (error) {

        console.error(
            "Show add program error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - CREATE PROGRAM
// ============================================================

const createProgram = async (
    req,
    res,
    next
) => {
    try {

        const {
            department,
            name,
            code,
            durationYears,
            totalSemesters,
            description
        } = req.body;


        const programName =
            String(name || "").trim();


        const programCode =
            String(code || "")
                .trim()
                .toUpperCase();


        const departmentId =
            String(
                department || ""
            ).trim();


        const years =
            Number(durationYears);


        const semesters =
            Number(totalSemesters);


        if (
            !departmentId ||
            !programName ||
            !programCode ||
            !years ||
            !semesters
        ) {

            req.flash(
                "error",
                "All required program fields must be filled."
            );


            return res.redirect(
                "/admin/programs/new"
            );
        }


        const selectedDepartment =
            await Department.findOne({
                _id:
                    departmentId,

                status:
                    "active"
            });


        if (!selectedDepartment) {

            req.flash(
                "error",
                "Selected department is not valid."
            );


            return res.redirect(
                "/admin/programs/new"
            );
        }


        const existingProgram =
            await Program.findOne({
                department:
                    selectedDepartment._id,

                $or: [

                    {
                        name: {
                            $regex:
                                `^${escapeRegex(
                                    programName
                                )}$`,
                            $options:
                                "i"
                        }
                    },

                    {
                        code:
                            programCode
                    }
                ]
            });


        if (existingProgram) {

            req.flash(
                "error",
                "This program already exists in the selected department."
            );


            return res.redirect(
                "/admin/programs/new"
            );
        }


        const program =
            await Program.create({

                department:
                    selectedDepartment._id,

                name:
                    programName,

                code:
                    programCode,

                durationYears:
                    years,

                totalSemesters:
                    semesters,

                description:
                    String(
                        description || ""
                    ).trim(),

                status:
                    "active"
            });


        console.log(
            "Program created:",
            {
                id:
                    program._id,

                name:
                    program.name,

                code:
                    program.code,

                department:
                    selectedDepartment.name
            }
        );


        req.flash(
            "success",
            "Program created successfully."
        );


        return res.redirect(
            `/admin/programs/${program._id}`
        );

    } catch (error) {

        console.error(
            "Create program error:",
            error
        );


        if (
            error.code ===
            11000
        ) {

            req.flash(
                "error",
                "Program code already exists in this department."
            );


            return res.redirect(
                "/admin/programs/new"
            );
        }


        return next(error);
    }
};


// ============================================================
// ADMIN - EDIT PROGRAM
// ============================================================

const showEditProgram = async (
    req,
    res,
    next
) => {
    try {

        const { id } =
            req.params;


        if (
            !id ||
            !/^[0-9a-fA-F]{24}$/.test(id)
        ) {

            return res.status(404).render(
                "error",
                {
                    title:
                        "Program Not Found",

                    statusCode:
                        404,

                    message:
                        "The requested program was not found.",

                    currentUser:
                        req.session.user || null
                }
            );
        }


        const [
            program,
            departments
        ] = await Promise.all([

            Program.findById(id)
                .populate({
                    path:
                        "department",

                    select:
                        "name code status"
                })
                .lean(),

            Department.find({
                status:
                    "active"
            })
                .select(
                    "name code"
                )
                .sort({
                    name: 1
                })
                .lean()
        ]);


        if (!program) {

            return res.status(404).render(
                "error",
                {
                    title:
                        "Program Not Found",

                    statusCode:
                        404,

                    message:
                        "The requested program was not found.",

                    currentUser:
                        req.session.user || null
                }
            );
        }


        return res.render(
            "admin/program-form",
            {
                title:
                    "Edit Program",

                currentUser:
                    req.session.user || null,

                program,

                departments,

                isEdit:
                    true
            }
        );

    } catch (error) {

        console.error(
            "Admin edit program page error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - UPDATE PROGRAM
// ============================================================

const updateProgram = async (
    req,
    res,
    next
) => {
    try {

        const { id } =
            req.params;


        const {
            department,
            name,
            code,
            durationYears,
            totalSemesters,
            description
        } = req.body;


        if (
            !id ||
            !/^[0-9a-fA-F]{24}$/.test(id)
        ) {

            req.flash(
                "error",
                "Invalid program."
            );


            return res.redirect(
                "/admin/programs"
            );
        }


        const program =
            await Program.findById(id);


        if (!program) {

            req.flash(
                "error",
                "Program not found."
            );


            return res.redirect(
                "/admin/programs"
            );
        }


        const departmentId =
            String(
                department || ""
            ).trim();


        const programName =
            String(
                name || ""
            ).trim();


        const programCode =
            String(
                code || ""
            )
                .trim()
                .toUpperCase();


        if (
            !departmentId ||
            !programName ||
            !programCode ||
            !durationYears ||
            !totalSemesters
        ) {

            req.flash(
                "error",
                "Department, program name, code, duration and semesters are required."
            );


            return res.redirect(
                `/admin/programs/${id}/edit`
            );
        }


        const selectedDepartment =
            await Department.findOne({
                _id:
                    departmentId,

                status:
                    "active"
            });


        if (!selectedDepartment) {

            req.flash(
                "error",
                "Selected department is not active or does not exist."
            );


            return res.redirect(
                `/admin/programs/${id}/edit`
            );
        }


        const existingProgram =
            await Program.findOne({

                _id: {
                    $ne:
                        id
                },

                department:
                    departmentId,

                code:
                    programCode
            });


        if (existingProgram) {

            req.flash(
                "error",
                "A program with this code already exists in the selected department."
            );


            return res.redirect(
                `/admin/programs/${id}/edit`
            );
        }


        program.department =
            departmentId;


        program.name =
            programName;


        program.code =
            programCode;


        program.durationYears =
            Number(durationYears);


        program.totalSemesters =
            Number(totalSemesters);


        program.description =
            String(
                description || ""
            ).trim();


        await program.save();


        req.flash(
            "success",
            "Program updated successfully."
        );


        return res.redirect(
            `/admin/programs/${program._id}`
        );

    } catch (error) {

        console.error(
            "Admin update program error:",
            error
        );


        if (
            error.code ===
            11000
        ) {

            req.flash(
                "error",
                "A program with this code already exists in the selected department."
            );


            return res.redirect(
                `/admin/programs/${req.params.id}/edit`
            );
        }


        return next(error);
    }
};


// ============================================================
// ADMIN - PROGRAM VIEW
// ============================================================

const showAdminProgram = async (
    req,
    res,
    next
) => {
    try {

        const { id } =
            req.params;


        if (
            !id ||
            !/^[0-9a-fA-F]{24}$/.test(id)
        ) {

            return res.status(404).render(
                "error",
                {
                    title:
                        "Program Not Found",

                    statusCode:
                        404,

                    message:
                        "The requested program was not found.",

                    currentUser:
                        req.session.user || null
                }
            );
        }


        const program =
            await Program.findById(id)
                .populate({
                    path:
                        "department",

                    select:
                        "name code status"
                })
                .lean();


        if (!program) {

            return res.status(404).render(
                "error",
                {
                    title:
                        "Program Not Found",

                    statusCode:
                        404,

                    message:
                        "The requested program was not found.",

                    currentUser:
                        req.session.user || null
                }
            );
        }


        let studentCount = 0;
        let facultyCount = 0;


        const profileQuery =
            buildProgramProfileQuery(
                program
            );


        if (profileQuery) {

            [
                studentCount,
                facultyCount
            ] = await Promise.all([

                StudentProfile.countDocuments(
                    profileQuery
                ),

                FacultyProfile.countDocuments(
                    profileQuery
                )
            ]);
        }


        return res.render(
            "admin/program-view",
            {
                title:
                    program.name,

                currentUser:
                    req.session.user || null,

                program,

                statistics: {
                    students:
                        studentCount,

                    faculty:
                        facultyCount
                }
            }
        );

    } catch (error) {

        console.error(
            "Admin program view error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - PROGRAM MANAGEMENT
// ============================================================

const showAdminPrograms = async (
    req,
    res,
    next
) => {
    try {

        const {
            search = "",
            department = "",
            status = ""
        } = req.query;


        const programQuery = {};


        if (department) {

            programQuery.department =
                department;
        }


        if (
            status === "active" ||
            status === "inactive"
        ) {

            programQuery.status =
                status;
        }


        if (search.trim()) {

            const searchRegex =
                new RegExp(
                    escapeRegex(
                        search.trim()
                    ),
                    "i"
                );


            programQuery.$or = [

                {
                    name:
                        searchRegex
                },

                {
                    code:
                        searchRegex
                }
            ];
        }


        const [
            programs,
            departments
        ] = await Promise.all([

            Program.find(programQuery)
                .populate({
                    path:
                        "department",

                    select:
                        "name code status"
                })
                .sort({
                    name: 1
                })
                .lean(),

            Department.find({
                status:
                    "active"
            })
                .select(
                    "name code"
                )
                .sort({
                    name: 1
                })
                .lean()
        ]);


        // ----------------------------------------------------
        // PROGRAM COUNTS
        // ----------------------------------------------------

        const programRows =
            await Promise.all(

                programs.map(
                    async program => {

                        if (
                            !program.department
                        ) {

                            return {
                                ...program,

                                studentCount:
                                    0,

                                facultyCount:
                                    0
                            };
                        }


                        const profileQuery =
                            buildProgramProfileQuery(
                                program
                            );


                        if (
                            !profileQuery
                        ) {

                            return {
                                ...program,

                                studentCount:
                                    0,

                                facultyCount:
                                    0
                            };
                        }


                        const [
                            studentCount,
                            facultyCount
                        ] = await Promise.all([

                            StudentProfile.countDocuments(
                                profileQuery
                            ),

                            FacultyProfile.countDocuments(
                                profileQuery
                            )
                        ]);


                        return {
                            ...program,

                            studentCount,

                            facultyCount
                        };
                    }
                )
            );


        // ----------------------------------------------------
        // SUMMARY
        // ----------------------------------------------------

        const summary = {

            total:
                await Program.countDocuments(),

            active:
                await Program.countDocuments({
                    status:
                        "active"
                }),

            inactive:
                await Program.countDocuments({
                    status:
                        "inactive"
                }),

            students:
                programRows.reduce(
                    (
                        total,
                        program
                    ) =>
                        total +
                        program.studentCount,
                    0
                ),

            faculty:
                programRows.reduce(
                    (
                        total,
                        program
                    ) =>
                        total +
                        program.facultyCount,
                    0
                )
        };


        return res.render(
            "admin/programs",
            {
                title:
                    "Program Management",

                currentUser:
                    req.session.user || null,

                programs:
                    programRows,

                departments,

                summary,

                filters: {
                    search,
                    department,
                    status
                }
            }
        );

    } catch (error) {

        console.error(
            "Admin programs error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - DEPARTMENT MANAGEMENT
// ============================================================

const showAdminDepartments = async (
    req,
    res,
    next
) => {
    try {

        const {
            search = "",
            status = ""
        } = req.query;


        const departmentQuery = {};


        if (
            status === "active" ||
            status === "inactive"
        ) {

            departmentQuery.status =
                status;
        }


        if (search.trim()) {

            const searchRegex =
                new RegExp(
                    escapeRegex(
                        search.trim()
                    ),
                    "i"
                );


            departmentQuery.$or = [

                {
                    name:
                        searchRegex
                },

                {
                    code:
                        searchRegex
                }
            ];
        }


        const departments =
            await Department.find(
                departmentQuery
            )
                .populate({
                    path:
                        "hod",

                    select:
                        "name email role isActive"
                })
                .sort({
                    name: 1
                })
                .lean();


        // ----------------------------------------------------
        // DEPARTMENT COUNTS
        // ----------------------------------------------------

        const departmentRows =
            await Promise.all(

                departments.map(
                    async department => {

                        const programCount =
                            await Program.countDocuments({
                                department:
                                    department._id
                            });


                        const profileQuery =
                            buildDepartmentProfileQuery(
                                department
                            );


                        let studentCount = 0;
                        let facultyCount = 0;


                        if (
                            profileQuery
                        ) {

                            [
                                studentCount,
                                facultyCount
                            ] =
                                await Promise.all([

                                    StudentProfile.countDocuments(
                                        profileQuery
                                    ),

                                    FacultyProfile.countDocuments(
                                        profileQuery
                                    )
                                ]);
                        }


                        return {
                            ...department,

                            programCount,

                            studentCount,

                            facultyCount
                        };
                    }
                )
            );


        // ----------------------------------------------------
        // SUMMARY
        // ----------------------------------------------------

        const summary = {

            total:
                await Department.countDocuments(),

            active:
                await Department.countDocuments({
                    status:
                        "active"
                }),

            inactive:
                await Department.countDocuments({
                    status:
                        "inactive"
                }),

            programs:
                departmentRows.reduce(
                    (
                        total,
                        department
                    ) =>
                        total +
                        department.programCount,
                    0
                ),

            students:
                departmentRows.reduce(
                    (
                        total,
                        department
                    ) =>
                        total +
                        department.studentCount,
                    0
                ),

            faculty:
                departmentRows.reduce(
                    (
                        total,
                        department
                    ) =>
                        total +
                        department.facultyCount,
                    0
                )
        };


        return res.render(
            "admin/departments",
            {
                title:
                    "Department Management",

                currentUser:
                    req.session.user || null,

                departments:
                    departmentRows,

                summary,

                filters: {
                    search,
                    status
                }
            }
        );

    } catch (error) {

        console.error(
            "Admin departments error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - ADD DEPARTMENT
// ============================================================

const showAddDepartment = async (
    req,
    res,
    next
) => {
    try {

        const faculty =
            await FacultyProfile.find({})
                .populate({
                    path:
                        "user",

                    select:
                        "name email isActive role"
                })
                .lean();


        const availableFaculty =
            faculty.filter(
                item =>
                    item.user &&
                    item.user.role ===
                        "faculty" &&
                    item.user.isActive ===
                        true
            );


        return res.render(
            "admin/department-form",
            {
                title:
                    "Add Department",

                currentUser:
                    req.session.user || null,

                department:
                    null,

                faculty:
                    availableFaculty,

                formMode:
                    "create"
            }
        );

    } catch (error) {

        console.error(
            "Show add department error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - CREATE DEPARTMENT
// ============================================================

const createDepartment = async (
    req,
    res,
    next
) => {
    try {

        const {
            name,
            code,
            hod
        } = req.body;


        const departmentName =
            String(
                name || ""
            ).trim();


        const departmentCode =
            String(
                code || ""
            )
                .trim()
                .toUpperCase();


        if (
            !departmentName ||
            !departmentCode
        ) {

            req.flash(
                "error",
                "Department name and code are required."
            );


            return res.redirect(
                "/admin/departments/new"
            );
        }


        const existingDepartment =
            await Department.findOne({
                $or: [

                    {
                        name: {
                            $regex:
                                `^${escapeRegex(
                                    departmentName
                                )}$`,
                            $options:
                                "i"
                        }
                    },

                    {
                        code:
                            departmentCode
                    }
                ]
            });


        if (existingDepartment) {

            req.flash(
                "error",
                "A department with this name or code already exists."
            );


            return res.redirect(
                "/admin/departments/new"
            );
        }


        let hodId = null;


        if (hod) {

            const facultyProfile =
                await FacultyProfile.findOne({
                    user:
                        hod
                })
                    .populate({
                        path:
                            "user",

                        select:
                            "role isActive"
                    });


            if (
                !facultyProfile ||
                !facultyProfile.user ||
                facultyProfile.user.role !==
                    "faculty" ||
                facultyProfile.user.isActive !==
                    true
            ) {

                req.flash(
                    "error",
                    "Selected HOD is not a valid active faculty member."
                );


                return res.redirect(
                    "/admin/departments/new"
                );
            }


            hodId =
                facultyProfile.user._id;
        }


        const department =
            await Department.create({

                name:
                    departmentName,

                code:
                    departmentCode,

                hod:
                    hodId,

                status:
                    "active"
            });


        console.log(
            "Department created:",
            {
                id:
                    department._id,

                name:
                    department.name,

                code:
                    department.code
            }
        );


        req.flash(
            "success",
            "Department created successfully."
        );


        return res.redirect(
            `/admin/departments/${department._id}`
        );

    } catch (error) {

        console.error(
            "Create department error:",
            error
        );


        if (
            error.code ===
            11000
        ) {

            req.flash(
                "error",
                "Department name or code already exists."
            );


            return res.redirect(
                "/admin/departments/new"
            );
        }


        return next(error);
    }
};


// ============================================================
// ADMIN - DEPARTMENT VIEW
// ============================================================

const showAdminDepartment = async (
    req,
    res,
    next
) => {
    try {

        const { id } =
            req.params;


        const department =
            await Department.findById(id)
                .populate({
                    path:
                        "hod",

                    select:
                        "name email role isActive"
                })
                .lean();


        if (!department) {

            return res.status(404).render(
                "error",
                {
                    title:
                        "Department Not Found",

                    statusCode:
                        404,

                    message:
                        "The requested department was not found.",

                    currentUser:
                        req.session.user || null
                }
            );
        }


        const programCount =
            await Program.countDocuments({
                department:
                    department._id
            });


        const profileQuery =
            buildDepartmentProfileQuery(
                department
            );


        let studentCount = 0;
        let facultyCount = 0;


        if (profileQuery) {

            [
                studentCount,
                facultyCount
            ] = await Promise.all([

                StudentProfile.countDocuments(
                    profileQuery
                ),

                FacultyProfile.countDocuments(
                    profileQuery
                )
            ]);
        }


        return res.render(
            "admin/department-view",
            {
                title:
                    department.name,

                currentUser:
                    req.session.user || null,

                department,

                statistics: {

                    programs:
                        programCount,

                    students:
                        studentCount,

                    faculty:
                        facultyCount
                }
            }
        );

    } catch (error) {

        console.error(
            "Admin department view error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - EDIT DEPARTMENT
// ============================================================

const showEditDepartment = async (
    req,
    res,
    next
) => {
    try {

        const { id } =
            req.params;


        const department =
            await Department.findById(id)
                .lean();


        if (!department) {

            return res.status(404).render(
                "error",
                {
                    title:
                        "Department Not Found",

                    statusCode:
                        404,

                    message:
                        "The requested department was not found.",

                    currentUser:
                        req.session.user || null
                }
            );
        }


        const faculty =
            await FacultyProfile.find({})
                .populate({
                    path:
                        "user",

                    select:
                        "name email isActive role"
                })
                .lean();


        const availableFaculty =
            faculty.filter(
                item =>
                    item.user &&
                    item.user.role ===
                        "faculty" &&
                    item.user.isActive ===
                        true
            );


        return res.render(
            "admin/department-form",
            {
                title:
                    "Edit Department",

                currentUser:
                    req.session.user || null,

                department,

                faculty:
                    availableFaculty,

                formMode:
                    "edit"
            }
        );

    } catch (error) {

        console.error(
            "Show edit department error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - UPDATE DEPARTMENT
// ============================================================

const updateDepartment = async (
    req,
    res,
    next
) => {
    try {

        const { id } =
            req.params;


        const {
            name,
            code,
            hod,
            status
        } = req.body;


        const department =
            await Department.findById(id);


        if (!department) {

            return res.status(404).render(
                "error",
                {
                    title:
                        "Department Not Found",

                    statusCode:
                        404,

                    message:
                        "The requested department was not found.",

                    currentUser:
                        req.session.user || null
                }
            );
        }


        const departmentName =
            String(
                name || ""
            ).trim();


        const departmentCode =
            String(
                code || ""
            )
                .trim()
                .toUpperCase();


        if (
            !departmentName ||
            !departmentCode
        ) {

            req.flash(
                "error",
                "Department name and code are required."
            );


            return res.redirect(
                `/admin/departments/${id}/edit`
            );
        }


        const duplicate =
            await Department.findOne({

                _id: {
                    $ne:
                        department._id
                },

                $or: [

                    {
                        name: {
                            $regex:
                                `^${escapeRegex(
                                    departmentName
                                )}$`,
                            $options:
                                "i"
                        }
                    },

                    {
                        code:
                            departmentCode
                    }
                ]
            });


        if (duplicate) {

            req.flash(
                "error",
                "Another department with this name or code already exists."
            );


            return res.redirect(
                `/admin/departments/${id}/edit`
            );
        }


        let hodId = null;


        if (hod) {

            const facultyProfile =
                await FacultyProfile.findById(
                    hod
                )
                    .populate({
                        path:
                            "user",

                        select:
                            "role isActive"
                    });


            if (
                !facultyProfile ||
                !facultyProfile.user ||
                facultyProfile.user.role !==
                    "faculty" ||
                facultyProfile.user.isActive !==
                    true
            ) {

                req.flash(
                    "error",
                    "Selected HOD is not a valid active faculty member."
                );


                return res.redirect(
                    `/admin/departments/${id}/edit`
                );
            }


            hodId =
                facultyProfile.user._id;
        }


        department.name =
            departmentName;


        department.code =
            departmentCode;


        department.hod =
            hodId;


        if (
            status === "active" ||
            status === "inactive"
        ) {

            department.status =
                status;
        }


        await department.save();


        req.flash(
            "success",
            "Department updated successfully."
        );


        return res.redirect(
            `/admin/departments/${id}`
        );

    } catch (error) {

        console.error(
            "Update department error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - TOGGLE DEPARTMENT STATUS
// ============================================================

const toggleDepartmentStatus = async (
    req,
    res,
    next
) => {
    try {

        const { id } =
            req.params;


        const department =
            await Department.findById(id);


        if (!department) {

            req.flash(
                "error",
                "Department not found."
            );

            return res.redirect(
                "/admin/departments"
            );
        }


        department.status =
            department.status ===
                "active"
                ? "inactive"
                : "active";


        await department.save();


        req.flash(
            "success",
            `Department ${
                department.status ===
                "active"
                    ? "activated"
                    : "deactivated"
            } successfully.`
        );


        return res.redirect(
            "/admin/departments"
        );

    } catch (error) {

        console.error(
            "Toggle department status error:",
            error
        );

        return next(error);
    }
};



// ==========================================
// COURSE MANAGEMENT
// ==========================================

const showAdminCourses = async (
    req,
    res,
    next
) => {
    try {

        const {
            search = "",
            department = "",
            program = "",
            semester = "",
            courseType = "",
            status = ""
        } = req.query;

        const query = {};

        if (search.trim()) {

            const searchRegex =
                new RegExp(
                    escapeRegex(search.trim()),
                    "i"
                );

            query.$or = [
                {
                    courseCode:
                        searchRegex
                },
                {
                    courseName:
                        searchRegex
                },
                {
                    shortName:
                        searchRegex
                }
            ];
        }

        if (department) {
            query.department = department;
        }

        if (program) {
            query.program = program;
        }

        if (semester) {
            query.semester =
                Number(semester);
        }

        if (courseType) {
            query.courseType =
                courseType;
        }

        if (status) {
            query.status = status;
        }

        const [
            courses,
            departments,
            programs
        ] = await Promise.all([

            Course.find(query)
                .populate(
                    "department",
                    "name code"
                )
                .populate(
                    "program",
                    "name code"
                )
                .sort({
                    courseCode: 1
                })
                .lean(),

            Department.find({
                status: "active"
            })
                .select("name code")
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
                .select(
                    "name code department"
                )
                .sort({
                    name: 1
                })
                .lean()
        ]);

        return res.render(
            "admin/courses",
            {
                title:
                    "Course Management",

                currentUser:
                    req.session.user || null,

                courses,
                departments,
                programs,

                filters: {
                    search,
                    department,
                    program,
                    semester,
                    courseType,
                    status
                }
            }
        );

    } catch (error) {

        console.error(
            "Show admin courses error:",
            error
        );

        return next(error);
    }
};


const showAddCourse = async (
    req,
    res,
    next
) => {
    try {

        const [
            departments,
            programs
        ] = await Promise.all([

            Department.find({
                status: "active"
            })
                .select(
                    "name code"
                )
                .sort({
                    name: 1
                })
                .lean(),

            Program.find({
                status: "active"
            })
                .select(
                    "name code department totalSemesters"
                )
                .sort({
                    name: 1
                })
                .lean()
        ]);

        return res.render(
            "admin/course-form",
            {
                title:
                    "Add Course",

                currentUser:
                    req.session.user || null,

                course:
                    null,

                departments,
                programs,

                isEdit:
                    false
            }
        );

    } catch (error) {

        console.error(
            "Show add course error:",
            error
        );

        return next(error);
    }
};


const createCourse = async (
    req,
    res,
    next
) => {
    try {

        const {
            courseCode,
            courseName,
            shortName,
            department,
            program,
            semester,
            courseType,
            credits,
            theoryHours,
            practicalHours,
            description
        } = req.body;

        if (
            !courseCode ||
            !courseName ||
            !department ||
            !program ||
            !semester ||
            !courseType ||
            credits === undefined ||
            credits === ""
        ) {

            req.flash(
                "error",
                "Please fill all required course fields."
            );

            return res.redirect(
                "/admin/courses/new"
            );
        }

        const selectedProgram =
            await Program.findOne({
                _id: program,
                department,
                status: "active"
            }).lean();

        if (!selectedProgram) {

            req.flash(
                "error",
                "Selected program does not belong to the selected department."
            );

            return res.redirect(
                "/admin/courses/new"
            );
        }

        if (
            Number(semester) >
            Number(
                selectedProgram.totalSemesters
            )
        ) {

            req.flash(
                "error",
                "Selected semester is not valid for this program."
            );

            return res.redirect(
                "/admin/courses/new"
            );
        }

        const existingCourse =
            await Course.findOne({
                program,
                courseCode:
                    String(courseCode)
                        .trim()
                        .toUpperCase()
            });

        if (existingCourse) {

            req.flash(
                "error",
                "This course code already exists for the selected program."
            );

            return res.redirect(
                "/admin/courses/new"
            );
        }

        await Course.create({
            courseCode:
                String(courseCode)
                    .trim()
                    .toUpperCase(),

            courseName:
                String(courseName)
                    .trim(),

            shortName:
                String(shortName || "")
                    .trim(),

            department,
            program,

            semester:
                Number(semester),

            courseType,

            credits:
                Number(credits),

            theoryHours:
                Number(theoryHours || 0),

            practicalHours:
                Number(
                    practicalHours || 0
                ),

            description:
                String(description || "")
                    .trim(),

            status:
                "active",

            createdBy:
                req.session.user.id
        });

        req.flash(
            "success",
            "Course created successfully."
        );

        return res.redirect(
            "/admin/courses"
        );

    } catch (error) {

        console.error(
            "Create course error:",
            error
        );

        return next(error);
    }
};


const showEditCourse = async (
    req,
    res,
    next
) => {
    try {

        const course =
            await Course.findById(
                req.params.id
            )
                .populate(
                    "department",
                    "name code"
                )
                .populate(
                    "program",
                    "name code department totalSemesters"
                )
                .lean();

        if (!course) {

            req.flash(
                "error",
                "Course not found."
            );

            return res.redirect(
                "/admin/courses"
            );
        }

        const [
            departments,
            programs
        ] = await Promise.all([

            Department.find({
                status: "active"
            })
                .select(
                    "name code"
                )
                .sort({
                    name: 1
                })
                .lean(),

            Program.find({
                status: "active"
            })
                .select(
                    "name code department totalSemesters"
                )
                .sort({
                    name: 1
                })
                .lean()
        ]);

        return res.render(
            "admin/course-form",
            {
                title:
                    "Edit Course",

                currentUser:
                    req.session.user || null,

                course,

                departments,
                programs,

                isEdit:
                    true
            }
        );

    } catch (error) {

        console.error(
            "Show edit course error:",
            error
        );

        return next(error);
    }
};


const updateCourse = async (
    req,
    res,
    next
) => {
    try {

        const {
            courseCode,
            courseName,
            shortName,
            department,
            program,
            semester,
            courseType,
            credits,
            theoryHours,
            practicalHours,
            description
        } = req.body;

        const course =
            await Course.findById(
                req.params.id
            );

        if (!course) {

            req.flash(
                "error",
                "Course not found."
            );

            return res.redirect(
                "/admin/courses"
            );
        }

        const selectedProgram =
            await Program.findOne({
                _id: program,
                department,
                status: "active"
            }).lean();

        if (!selectedProgram) {

            req.flash(
                "error",
                "Invalid department/program combination."
            );

            return res.redirect(
                `/admin/courses/${req.params.id}/edit`
            );
        }

        if (
            Number(semester) >
            Number(
                selectedProgram.totalSemesters
            )
        ) {

            req.flash(
                "error",
                "Selected semester is not valid for this program."
            );

            return res.redirect(
                `/admin/courses/${req.params.id}/edit`
            );
        }

        const duplicate =
            await Course.findOne({
                _id: {
                    $ne:
                        req.params.id
                },
                program,
                courseCode:
                    String(courseCode)
                        .trim()
                        .toUpperCase()
            });

        if (duplicate) {

            req.flash(
                "error",
                "This course code already exists for the selected program."
            );

            return res.redirect(
                `/admin/courses/${req.params.id}/edit`
            );
        }

        course.courseCode =
            String(courseCode)
                .trim()
                .toUpperCase();

        course.courseName =
            String(courseName)
                .trim();

        course.shortName =
            String(shortName || "")
                .trim();

        course.department =
            department;

        course.program =
            program;

        course.semester =
            Number(semester);

        course.courseType =
            courseType;

        course.credits =
            Number(credits);

        course.theoryHours =
            Number(theoryHours || 0);

        course.practicalHours =
            Number(
                practicalHours || 0
            );

        course.description =
            String(description || "")
                .trim();

        await course.save();

        req.flash(
            "success",
            "Course updated successfully."
        );

        return res.redirect(
            "/admin/courses"
        );

    } catch (error) {

        console.error(
            "Update course error:",
            error
        );

        return next(error);
    }
};


const toggleCourseStatus = async (
    req,
    res,
    next
) => {
    try {

        const course =
            await Course.findById(
                req.params.id
            );

        if (!course) {

            req.flash(
                "error",
                "Course not found."
            );

            return res.redirect(
                "/admin/courses"
            );
        }

        course.status =
            course.status === "active"
                ? "inactive"
                : "active";

        await course.save();

        req.flash(
            "success",
            `Course ${
                course.status === "active"
                    ? "activated"
                    : "deactivated"
            } successfully.`
        );

        return res.redirect(
            "/admin/courses"
        );

    } catch (error) {

        console.error(
            "Toggle course status error:",
            error
        );

        return next(error);
    }
};


const showAdminCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate("department", "name code")
            .populate("program", "name code durationYears totalSemesters")
            .lean();

        if (!course) {
            req.flash("error", "Course not found.");
            return res.redirect("/admin/courses");
        }

        return res.render(
            "admin/course-detail",
            {
                title: `${course.courseCode} - Course Details`,
                currentUser: req.session.user || null,
                course
            }
        );
    } catch (error) {
        console.error("Show admin course error:", error);

        if (error.name === "CastError") {
            req.flash("error", "Invalid course ID.");
            return res.redirect("/admin/courses");
        }

        return next(error);
    }
};




// ============================================================
// ADMIN - TIMETABLE MANAGEMENT
// ============================================================

const showAdminTimetable = async (
    req,
    res,
    next
) => {
    try {
        const {
            department = "",
            program = "",
            semester = "",
            section = "",
            day = "",
            course = "",
            faculty = "",
            room = "",
            status = ""
        } = req.query;

        const query = {};

        // ----------------------------------------------------
        // FILTERS
        // ----------------------------------------------------

        if (department.trim()) {
            query.department =
                department.trim().toLowerCase();
        }

        if (program.trim()) {
            query.program =
                program.trim().toLowerCase();
        }

        if (semester) {
            const semesterNumber =
                Number(semester);

            if (
                Number.isInteger(
                    semesterNumber
                )
            ) {
                query.semester =
                    semesterNumber;
            }
        }

        if (section.trim()) {
            query.section =
                section.trim().toUpperCase();
        }

        if (day) {
            query.day = day;
        }

        if (course) {
            query.course = course;
        }

        if (faculty) {
            query.faculty = faculty;
        }

        if (room.trim()) {
            query.room = new RegExp(
                escapeRegex(room.trim()),
                "i"
            );
        }

        if (status === "active") {
            query.isActive = true;
        }

        if (status === "inactive") {
            query.isActive = false;
        }

        // ----------------------------------------------------
        // DATA
        // ----------------------------------------------------

        const [
            timetable,
            departments,
            programs,
            courses,
            facultyAssignments
        ] = await Promise.all([

            Timetable.find(query)
                .populate(
                    "course",
                    "courseCode courseName shortName"
                )
                .populate(
                    "faculty",
                    "name email role"
                )
                .sort({
                    day: 1,
                    startTime: 1
                })
                .lean(),

            Department.find({
                status: "active"
            })
                .select("name code")
                .sort({
                    name: 1
                })
                .lean(),

            Program.find({
                status: "active"
            })
                .select(
                    "name code department totalSemesters"
                )
                .sort({
                    name: 1
                })
                .lean(),

            Course.find({
                status: "active"
            })
                .select(
                    "courseCode courseName department program semester courseType"
                )
                .sort({
                    courseCode: 1
                })
                .lean(),

            FacultyAssignment.find({
                isActive: true
            })
                .populate(
                    "faculty",
                    "name email role isActive"
                )
                .sort({
                    courseCode: 1
                })
                .lean()
        ]);

        // ----------------------------------------------------
        // SECTIONS
        // ----------------------------------------------------

        const sectionQuery = {};

        if (department.trim()) {
            sectionQuery.department =
                exactStringRegex([
                    department
                ]);
        }

        if (program.trim()) {
            sectionQuery.program =
                exactStringRegex([
                    program
                ]);
        }

        if (semester) {
            sectionQuery.semester =
                Number(semester);
        }

        const sections =
            await StudentProfile.distinct(
                "section",
                sectionQuery
            );

        sections.sort();

        // ----------------------------------------------------
        // RENDER
        // ----------------------------------------------------

        return res.render(
            "admin/timetable",
            {
                title:
                    "Timetable Management",

                currentUser:
                    req.session.user || null,

                timetable,

                departments,

                programs,

                courses,

                facultyAssignments,

                sections,

                filters: {
                    department,
                    program,
                    semester,
                    section,
                    day,
                    course,
                    faculty,
                    room,
                    status
                }
            }
        );

    } catch (error) {

        console.error(
            "Show admin timetable error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - ADD TIMETABLE
// ============================================================

const showAddTimetable = async (
    req,
    res,
    next
) => {
    try {

        const [
            departments,
            programs,
            courses,
            facultyAssignments
        ] = await Promise.all([

            Department.find({
                status: "active"
            })
                .select("name code")
                .sort({
                    name: 1
                })
                .lean(),

            Program.find({
                status: "active"
            })
                .select(
                    "name code department totalSemesters"
                )
                .sort({
                    name: 1
                })
                .lean(),

            Course.find({
                status: "active"
            })
                .select(
                    "courseCode courseName department program semester courseType"
                )
                .sort({
                    courseCode: 1
                })
                .lean(),

            FacultyAssignment.find({
                isActive: true
            })
                .populate(
                    "faculty",
                    "name email role isActive"
                )
                .sort({
                    courseCode: 1
                })
                .lean()
        ]);

        return res.render(
            "admin/timetable-form",
            {
                title:
                    "Add Timetable Entry",

                currentUser:
                    req.session.user || null,

                timetable:
                    null,

                departments,
                programs,
                courses,
                facultyAssignments,

                isEdit: false
            }
        );

    } catch (error) {

        console.error(
            "Show add timetable error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// TIMETABLE TIME HELPER
// ============================================================

const timeToMinutes = time => {

    if (
        !time ||
        typeof time !== "string"
    ) {
        return null;
    }

    const parts =
        time.split(":");

    if (
        parts.length !== 2
    ) {
        return null;
    }

    const hours =
        Number(parts[0]);

    const minutes =
        Number(parts[1]);

    if (
        !Number.isInteger(hours) ||
        !Number.isInteger(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
    ) {
        return null;
    }

    return (
        hours * 60 +
        minutes
    );
};


// ============================================================
// TIMETABLE OVERLAP CHECK
// ============================================================

const hasTimeOverlap = (
    startA,
    endA,
    startB,
    endB
) => {

    const start1 =
        timeToMinutes(startA);

    const end1 =
        timeToMinutes(endA);

    const start2 =
        timeToMinutes(startB);

    const end2 =
        timeToMinutes(endB);

    if (
        start1 === null ||
        end1 === null ||
        start2 === null ||
        end2 === null
    ) {
        return false;
    }

    return (
        start1 < end2 &&
        end1 > start2
    );
};


// ============================================================
// TIMETABLE CONFLICT CHECK
// ============================================================

const checkTimetableConflicts = async ({
    timetableId = null,
    department,
    program,
    semester,
    section,
    day,
    startTime,
    endTime,
    faculty,
    room
}) => {
    const baseQuery = {
        day,
        isActive: true
    };

    if (timetableId) {
        baseQuery._id = {
            $ne: timetableId
        };
    }

    const entries =
        await Timetable.find(
            baseQuery
        ).lean();

    const conflicts = [];

    for (
        const entry
        of entries
    ) {
        if (
            !hasTimeOverlap(
                startTime,
                endTime,
                entry.startTime,
                entry.endTime
            )
        ) {
            continue;
        }

        // ------------------------------------------------
        // SECTION CONFLICT
        // ------------------------------------------------

        const sameSection =
            String(
                entry.department || ""
            ).toLowerCase() ===
                String(
                    department || ""
                ).toLowerCase() &&

            String(
                entry.program || ""
            ).toLowerCase() ===
                String(
                    program || ""
                ).toLowerCase() &&

            Number(
                entry.semester
            ) ===
                Number(semester) &&

            String(
                entry.section || ""
            ).toUpperCase() ===
                String(
                    section || ""
                ).toUpperCase();

        if (sameSection) {
            conflicts.push(
                `Section conflict: ${entry.courseCode} is already scheduled from ${entry.startTime} to ${entry.endTime}.`
            );
        }

        // ------------------------------------------------
        // FACULTY CONFLICT
        // ------------------------------------------------

        if (
            faculty &&
            entry.faculty &&
            String(entry.faculty) ===
                String(faculty)
        ) {
            conflicts.push(
                `Faculty conflict: ${entry.facultyName} already has a class from ${entry.startTime} to ${entry.endTime}.`
            );
        }

        // ------------------------------------------------
        // ROOM CONFLICT
        // ------------------------------------------------

        const normalizedRoom =
            String(room || "")
                .trim()
                .toLowerCase();

        const existingRoom =
            String(entry.room || "")
                .trim()
                .toLowerCase();

        if (
            normalizedRoom &&
            normalizedRoom !== "tba" &&
            existingRoom &&
            existingRoom !== "tba" &&
            normalizedRoom === existingRoom
        ) {
            conflicts.push(
                `Room conflict: ${entry.room} is already occupied from ${entry.startTime} to ${entry.endTime}.`
            );
        }
    }

    // ------------------------------------------------
    // FINAL CONFLICT RESULT
    // ------------------------------------------------

    const uniqueConflicts = [
        ...new Set(conflicts)
    ];

    if (
        uniqueConflicts.length === 0
    ) {
        return null;
    }

    return uniqueConflicts.join(" ");
};


// ============================================================
// ADMIN - CREATE TIMETABLE
// ============================================================

const createTimetable = async (
    req,
    res,
    next
) => {
    try {
        const {
            department = "",
            program = "",
            semester = "",
            section = "",
            entries = []
        } = req.body;

        // ==========================================
        // BASIC VALIDATION
        // ==========================================

        if (!department.trim()) {
            req.flash(
                "error",
                "Department is required."
            );

            return res.redirect(
                "/admin/timetable/new"
            );
        }

        if (!program.trim()) {
            req.flash(
                "error",
                "Program is required."
            );

            return res.redirect(
                "/admin/timetable/new"
            );
        }

        const semesterNumber =
            Number(semester);

        if (
            !Number.isInteger(
                semesterNumber
            ) ||
            semesterNumber < 1 ||
            semesterNumber > 12
        ) {
            req.flash(
                "error",
                "Invalid semester."
            );

            return res.redirect(
                "/admin/timetable/new"
            );
        }

        const sectionValue =
            String(section)
                .trim()
                .toUpperCase();

        if (
            !["A", "B", "C", "D", "E"].includes(
                sectionValue
            )
        ) {
            req.flash(
                "error",
                "Invalid section."
            );

            return res.redirect(
                "/admin/timetable/new"
            );
        }

        // ==========================================
        // FIND DEPARTMENT
        // ==========================================

        const selectedDepartment =
            await Department.findOne({
                _id: department,
                status: "active"
            }).lean();

        if (!selectedDepartment) {
            req.flash(
                "error",
                "Selected department not found."
            );

            return res.redirect(
                "/admin/timetable/new"
            );
        }

        // ==========================================
        // FIND PROGRAM
        // ==========================================

        const selectedProgram =
            await Program.findOne({
                _id: program,
                department:
                    selectedDepartment._id,
                status: "active"
            }).lean();

        if (!selectedProgram) {
            req.flash(
                "error",
                "Selected program does not belong to the selected department."
            );

            return res.redirect(
                "/admin/timetable/new"
            );
        }

        // ==========================================
        // VALIDATE SEMESTER AGAINST PROGRAM
        // ==========================================

        if (
            selectedProgram.totalSemesters &&
            semesterNumber >
                selectedProgram.totalSemesters
        ) {
            req.flash(
                "error",
                `Selected program has only ${selectedProgram.totalSemesters} semesters.`
            );

            return res.redirect(
                "/admin/timetable/new"
            );
        }

        // ==========================================
        // NORMALIZE DEPARTMENT / PROGRAM
        // ==========================================

        const departmentValue =
            String(
                selectedDepartment.name || ""
            )
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");

        const programValue =
            String(
                selectedProgram.name || ""
            )
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");

        if (
            !departmentValue ||
            !programValue
        ) {
            req.flash(
                "error",
                "Invalid department or program data."
            );

            return res.redirect(
                "/admin/timetable/new"
            );
        }

        // ==========================================
        // NORMALIZE ENTRIES
        // ==========================================

        const submittedEntries =
            Array.isArray(entries)
                ? entries
                : Object.values(entries || {});

        const allowedTypes = [
            "lecture",
            "lab",
            "tutorial",
            "practical",
            "seminar"
        ];

        const finalEntries = [];

        // ==========================================
        // PROCESS EACH TIMETABLE SLOT
        // ==========================================

        for (
            const entry of submittedEntries
        ) {
            if (!entry) {
                continue;
            }

            const day =
                String(
                    entry.day || ""
                )
                    .trim()
                    .toLowerCase();

            const startTime =
                String(
                    entry.startTime || ""
                ).trim();

            const endTime =
                String(
                    entry.endTime || ""
                ).trim();

            const courseName =
                String(
                    entry.courseName || ""
                ).trim();

            const facultyName =
                String(
                    entry.facultyName || ""
                ).trim();

            const room =
                String(
                    entry.room || ""
                ).trim();

            const type =
                String(
                    entry.type || ""
                )
                    .trim()
                    .toLowerCase();

            // --------------------------------------
            // EMPTY SLOT
            // --------------------------------------

            if (
                !courseName &&
                !facultyName &&
                !room &&
                !type
            ) {
                continue;
            }

            // --------------------------------------
            // DAY VALIDATION
            // --------------------------------------

            const allowedDays = [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday"
            ];

            if (
                !allowedDays.includes(day)
            ) {
                req.flash(
                    "error",
                    "Invalid timetable day."
                );

                return res.redirect(
                    "/admin/timetable/new"
                );
            }

            // --------------------------------------
            // TIME VALIDATION
            // --------------------------------------

            if (
                !startTime ||
                !endTime
            ) {
                req.flash(
                    "error",
                    "Start time and end time are required."
                );

                return res.redirect(
                    "/admin/timetable/new"
                );
            }

            // --------------------------------------
            // COURSE VALIDATION
            // --------------------------------------

            if (!courseName) {
                req.flash(
                    "error",
                    `Course is required for ${day} ${startTime}.`
                );

                return res.redirect(
                    "/admin/timetable/new"
                );
            }

            // --------------------------------------
            // FACULTY VALIDATION
            // --------------------------------------

            if (!facultyName) {
                req.flash(
                    "error",
                    `Faculty is required for ${courseName} on ${day} ${startTime}.`
                );

                return res.redirect(
                    "/admin/timetable/new"
                );
            }

            // --------------------------------------
            // TYPE VALIDATION
            // --------------------------------------

            if (
                type &&
                !allowedTypes.includes(type)
            ) {
                req.flash(
                    "error",
                    `Invalid timetable type for ${courseName}.`
                );

                return res.redirect(
                    "/admin/timetable/new"
                );
            }

            // --------------------------------------
            // TIME CONFLICT CHECK
            // --------------------------------------

            const conflict =
                await checkTimetableConflicts({
                    department:
                        departmentValue,
                    program:
                        programValue,
                    semester:
                        semesterNumber,
                    section:
                        sectionValue,
                    day,
                    startTime,
                    endTime,
                    faculty: null
                });

            if (conflict) {
                req.flash(
                    "error",
                    conflict
                );

                return res.redirect(
                    "/admin/timetable/new"
                );
            }

            // --------------------------------------
            // COURSE CODE
            // --------------------------------------

            const generatedCourseCode =
                courseName
                    .toUpperCase()
                    .replace(
                        /[^A-Z0-9]+/g,
                        "-"
                    )
                    .replace(
                        /^-+|-+$/g,
                        ""
                    )
                    .substring(0, 30);

            // --------------------------------------
            // FINAL TIMETABLE ENTRY
            // --------------------------------------

            finalEntries.push({
                department:
                    departmentValue,

                program:
                    programValue,

                semester:
                    semesterNumber,

                section:
                    sectionValue,

                day,

                startTime,

                endTime,

                courseCode:
                    generatedCourseCode,

                courseName,

                faculty: null,

                facultyName,

                room:
                    room || "TBA",

                // IMPORTANT:
                // Do not save null because the schema
                // expects a valid enum value.
                type:
                    type || "lecture",

                isActive: true,

                // Newly created timetable stays hidden
                // from students until admin publishes it.
                isPublished: false,

                publishedAt: null,

                createdBy:
                    req.session.user.id
            });
        }

        // ==========================================
        // AT LEAST ONE ENTRY REQUIRED
        // ==========================================

        if (
            finalEntries.length === 0
        ) {
            req.flash(
                "error",
                "Please add at least one timetable entry."
            );

            return res.redirect(
                "/admin/timetable/new"
            );
        }

        // ==========================================
        // SAVE TIMETABLE
        // ==========================================

        await Timetable.insertMany(
            finalEntries
        );

        req.flash(
            "success",
            `Timetable created successfully. ${finalEntries.length} entries added.`
        );

        return res.redirect(
            "/admin/timetable"
        );
    } catch (error) {
        console.error(
            "Create timetable error:",
            error
        );

        return next(error);
    }
};

// ============================================================
// ADMIN - EDIT TIMETABLE
// ============================================================

const showEditTimetable = async (
    req,
    res,
    next
) => {

    try {

        const timetable =
            await Timetable.findById(
                req.params.id
            )
                .populate(
                    "course",
                    "courseCode courseName department program semester courseType"
                )
                .populate(
                    "faculty",
                    "name email role isActive"
                )
                .lean();

        if (!timetable) {

            req.flash(
                "error",
                "Timetable entry not found."
            );

            return res.redirect(
                "/admin/timetable"
            );
        }

        const [
            departments,
            programs,
            courses,
            facultyAssignments
        ] = await Promise.all([

            Department.find({
                status: "active"
            })
                .select("name code")
                .sort({
                    name: 1
                })
                .lean(),

            Program.find({
                status: "active"
            })
                .select(
                    "name code department totalSemesters"
                )
                .sort({
                    name: 1
                })
                .lean(),

            Course.find({
                status: "active"
            })
                .select(
                    "courseCode courseName department program semester courseType"
                )
                .sort({
                    courseCode: 1
                })
                .lean(),

            FacultyAssignment.find({
                isActive: true
            })
                .populate(
                    "faculty",
                    "name email role isActive"
                )
                .sort({
                    course
                })
                .lean()
        ]);

        return res.render(
            "admin/timetable-form",
            {
                title:
                    "Edit Timetable Entry",

                currentUser:
                    req.session.user || null,

                timetable,

                departments,
                programs,
                courses,
                facultyAssignments,

                isEdit: true
            }
        );

    } catch (error) {

        console.error(
            "Show edit timetable error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - UPDATE TIMETABLE
// ============================================================

const updateTimetable = async (
    req,
    res,
    next
) => {

    try {

        const {
            department,
            program,
            semester,
            section,
            day,
            startTime,
            endTime,
            course,
            faculty,
            room,
            type
        } = req.body;

        const timetable =
            await Timetable.findById(
                req.params.id
            );

        if (!timetable) {

            req.flash(
                "error",
                "Timetable entry not found."
            );

            return res.redirect(
                "/admin/timetable"
            );
        }

        const startMinutes =
            timeToMinutes(startTime);

        const endMinutes =
            timeToMinutes(endTime);

        if (
            startMinutes === null ||
            endMinutes === null ||
            startMinutes >= endMinutes
        ) {

            req.flash(
                "error",
                "Start time must be earlier than end time."
            );

            return res.redirect(
                `/admin/timetable/${req.params.id}/edit`
            );
        }

        const semesterNumber =
            Number(semester);

        const selectedProgram =
            await Program.findOne({
                _id: program,
                department,
                status: "active"
            }).lean();

        if (!selectedProgram) {

            req.flash(
                "error",
                "Invalid department/program combination."
            );

            return res.redirect(
                `/admin/timetable/${req.params.id}/edit`
            );
        }

        if (
            !Number.isInteger(
                semesterNumber
            ) ||
            semesterNumber < 1 ||
            semesterNumber >
                Number(
                    selectedProgram.totalSemesters
                )
        ) {

            req.flash(
                "error",
                "Invalid semester."
            );

            return res.redirect(
                `/admin/timetable/${req.params.id}/edit`
            );
        }

        const selectedCourse =
            await Course.findOne({
                _id: course,
                department,
                program,
                semester:
                    semesterNumber,
                status: "active"
            }).lean();

        if (!selectedCourse) {

            req.flash(
                "error",
                "Selected course is not valid for this academic group."
            );

            return res.redirect(
                `/admin/timetable/${req.params.id}/edit`
            );
        }

        const selectedAssignment =
            await FacultyAssignment.findOne({
                _id: faculty,
                department:
                    String(
                        department
                    ).toLowerCase(),
                program:
                    String(
                        program
                    ).toLowerCase(),
                semester:
                    semesterNumber,
                section:
                    String(
                        section
                    ).toUpperCase(),
                courseCode:
                    selectedCourse.courseCode,
                isActive: true
            })
                .populate(
                    "faculty",
                    "name email role isActive"
                )
                .lean();

        if (
            !selectedAssignment ||
            !selectedAssignment.faculty
        ) {

            req.flash(
                "error",
                "Selected faculty is not assigned to this course/section."
            );

            return res.redirect(
                `/admin/timetable/${req.params.id}/edit`
            );
        }

        const conflicts =
            await checkTimetableConflicts({
                timetableId:
                    timetable._id,

                department,
                program,
                semester:
                    semesterNumber,
                section,
                day,
                startTime,
                endTime,
                faculty:
                    selectedAssignment
                        .faculty._id,
                room:
                    room || "TBA"
            });

        if (conflicts.length > 0) {

            req.flash(
                "error",
                conflicts.join(" ")
            );

            return res.redirect(
                `/admin/timetable/${req.params.id}/edit`
            );
        }

        timetable.department =
            String(
                department
            ).trim().toLowerCase();

        timetable.program =
            String(
                program
            ).trim().toLowerCase();

        timetable.semester =
            semesterNumber;

        timetable.section =
            String(
                section
            ).trim().toUpperCase();

        timetable.day =
            day;

        timetable.startTime =
            String(
                startTime
            ).trim();

        timetable.endTime =
            String(
                endTime
            ).trim();

        timetable.course =
            selectedCourse._id;

        timetable.courseCode =
            selectedCourse.courseCode;

        timetable.courseName =
            selectedCourse.courseName;

        timetable.faculty =
            selectedAssignment
                .faculty._id;

        timetable.facultyName =
            selectedAssignment
                .faculty.name;

        timetable.room =
            String(
                room || "TBA"
            ).trim() || "TBA";

        timetable.type =
            type;

        await timetable.save();

        req.flash(
            "success",
            "Timetable entry updated successfully."
        );

        return res.redirect(
            "/admin/timetable"
        );

    } catch (error) {

        console.error(
            "Update timetable error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - TIMETABLE DETAIL
// ============================================================

const showAdminTimetableEntry = async (
    req,
    res,
    next
) => {

    try {

        const timetable =
            await Timetable.findById(
                req.params.id
            )
                .populate(
                    "course",
                    "courseCode courseName shortName credits courseType"
                )
                .populate(
                    "faculty",
                    "name email role"
                )
                .lean();

        if (!timetable) {

            req.flash(
                "error",
                "Timetable entry not found."
            );

            return res.redirect(
                "/admin/timetable"
            );
        }

        return res.render(
            "admin/timetable-detail",
            {
                title:
                    "Timetable Details",

                currentUser:
                    req.session.user || null,

                timetable
            }
        );

    } catch (error) {

        console.error(
            "Show timetable detail error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - TOGGLE TIMETABLE STATUS
// ============================================================

const toggleTimetableStatus = async (
    req,
    res,
    next
) => {

    try {

        const timetable =
            await Timetable.findById(
                req.params.id
            );

        if (!timetable) {

            req.flash(
                "error",
                "Timetable entry not found."
            );

            return res.redirect(
                "/admin/timetable"
            );
        }

        timetable.isActive =
            !timetable.isActive;

        await timetable.save();

        req.flash(
            "success",
            `Timetable entry ${
                timetable.isActive
                    ? "activated"
                    : "deactivated"
            } successfully.`
        );

        return res.redirect(
            "/admin/timetable"
        );

    } catch (error) {

        console.error(
            "Toggle timetable status error:",
            error
        );

        return next(error);
    }
};




// ============================================================
// ADMIN - SEND TIMETABLE TO STUDENTS
// ============================================================

const sendTimetableToStudents = async (
    req,
    res,
    next
) => {
    try {
        const timetable =
            await Timetable.findById(
                req.params.id
            ).lean();

        if (!timetable) {
            req.flash(
                "error",
                "Timetable entry not found."
            );

            return res.redirect(
                "/admin/timetable"
            );
        }

        const timetableGroup =
            await Timetable.find({
                department:
                    timetable.department,
                program:
                    timetable.program,
                semester:
                    timetable.semester,
                section:
                    timetable.section,
                isActive: true
            }).select("_id");

        if (
            timetableGroup.length === 0
        ) {
            req.flash(
                "error",
                "No active timetable entries found."
            );

            return res.redirect(
                "/admin/timetable"
            );
        }

        await Timetable.updateMany(
            {
                _id: {
                    $in:
                        timetableGroup.map(
                            entry =>
                                entry._id
                        )
                }
            },
            {
                $set: {
                    isPublished: true,
                    publishedAt: new Date()
                }
            }
        );

        req.flash(
            "success",
            `Timetable sent to students successfully. ${timetableGroup.length} entries published.`
        );

        return res.redirect(
            "/admin/timetable"
        );
    } catch (error) {
        console.error(
            "Send timetable to students error:",
            error
        );

        return next(error);
    }
};


const deleteTimetable = async (
    req,
    res,
    next
) => {

    try {

        const timetable =
            await Timetable.findById(
                req.params.id
            );

        if (!timetable) {

            req.flash(
                "error",
                "Timetable entry not found."
            );

            return res.redirect(
                "/admin/timetable"
            );

        }


        await Timetable.findByIdAndDelete(
            req.params.id
        );


        req.flash(
            "success",
            "Timetable entry deleted successfully."
        );


        return res.redirect(
            "/admin/timetable"
        );


    } catch (error) {

        console.error(
            "Delete timetable error:",
            error
        );


        if (
            error.name === "CastError"
        ) {

            req.flash(
                "error",
                "Invalid timetable ID."
            );

            return res.redirect(
                "/admin/timetable"
            );

        }


        return next(error);

    }

};




// ============================================================
// ADMIN - USER MANAGEMENT
// ============================================================

const showAdminUsers = async (req, res, next) => {
    try {
        const {
            search = "",
            role = "",
            status = "",
            department = "",
            program = "",
            semester = ""
        } = req.query;

        const userQuery = {};

        // ------------------------------------------
        // SEARCH
        // ------------------------------------------

        if (search.trim()) {
            const searchRegex = new RegExp(
                escapeRegex(search.trim()),
                "i"
            );

            userQuery.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];
        }

        // ------------------------------------------
        // ROLE FILTER
        // ------------------------------------------

        if (
            ["admin", "faculty", "student"].includes(
                role
            )
        ) {
            userQuery.role = role;
        }

        // ------------------------------------------
        // STATUS FILTER
        // ------------------------------------------

        if (status === "active") {
            userQuery.isActive = true;
        }

        if (status === "inactive") {
            userQuery.isActive = false;
        }

        // ------------------------------------------
        // GET USERS
        // ------------------------------------------

        const users = await User.find(userQuery)
            .select(
                "name email role isActive lastLogin createdAt"
            )
            .sort({
                createdAt: -1
            })
            .lean();

        // ------------------------------------------
        // GET RELATED PROFILES
        // ------------------------------------------

        const userIds = users.map(
            user => user._id
        );

        const [
            studentProfiles,
            facultyProfiles
        ] = await Promise.all([
            StudentProfile.find({
                user: {
                    $in: userIds
                }
            })
                .select(
                    "user studentId department program semester section"
                )
                .lean(),

            FacultyProfile.find({
                user: {
                    $in: userIds
                }
            })
                .select(
                    "user employeeId department program designation"
                )
                .lean()
        ]);

        const studentMap = new Map();

        studentProfiles.forEach(profile => {
            studentMap.set(
                String(profile.user),
                profile
            );
        });

        const facultyMap = new Map();

        facultyProfiles.forEach(profile => {
            facultyMap.set(
                String(profile.user),
                profile
            );
        });

        // ------------------------------------------
        // MERGE USER + PROFILE DATA
        // ------------------------------------------

        let userList = users.map(user => {
            const userId =
                String(user._id);

            const studentProfile =
                studentMap.get(userId) || null;

            const facultyProfile =
                facultyMap.get(userId) || null;

            return {
                ...user,
                studentProfile,
                facultyProfile
            };
        });

        // ------------------------------------------
        // DEPARTMENT FILTER
        // ------------------------------------------

        if (department.trim()) {
            const departmentMatcher =
                exactStringRegex([
                    department
                ]);

            if (departmentMatcher) {
                userList =
                    userList.filter(user => {
                        const profile =
                            user.role === "student"
                                ? user.studentProfile
                                : user.role === "faculty"
                                ? user.facultyProfile
                                : null;

                        if (!profile) {
                            return false;
                        }

                        const value =
                            profile.department || "";

                        return (
                            String(value).match(
                                departmentMatcher.$regex
                            ) !== null
                        );
                    });
            }
        }

        // ------------------------------------------
        // PROGRAM FILTER
        // ------------------------------------------

        if (program.trim()) {
            const programMatcher =
                exactStringRegex([
                    program
                ]);

            if (programMatcher) {
                userList =
                    userList.filter(user => {
                        const profile =
                            user.role === "student"
                                ? user.studentProfile
                                : user.role === "faculty"
                                ? user.facultyProfile
                                : null;

                        if (!profile) {
                            return false;
                        }

                        const value =
                            profile.program || "";

                        return (
                            String(value).match(
                                programMatcher.$regex
                            ) !== null
                        );
                    });
            }
        }

        // ------------------------------------------
        // SEMESTER FILTER
        // ------------------------------------------

        if (semester) {
            const semesterNumber =
                Number(semester);

            if (
                Number.isInteger(
                    semesterNumber
                )
            ) {
                userList =
                    userList.filter(user => {
                        if (
                            user.role !==
                                "student" ||
                            !user.studentProfile
                        ) {
                            return false;
                        }

                        return (
                            Number(
                                user.studentProfile
                                    .semester
                            ) ===
                            semesterNumber
                        );
                    });
            }
        }

        // ------------------------------------------
        // SUMMARY COUNTS
        // ------------------------------------------

        const [
            totalUsers,
            totalStudents,
            totalFaculty,
            totalAdmins,
            activeUsers,
            inactiveUsers
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({
                role: "student"
            }),
            User.countDocuments({
                role: "faculty"
            }),
            User.countDocuments({
                role: "admin"
            }),
            User.countDocuments({
                isActive: true
            }),
            User.countDocuments({
                isActive: false
            })
        ]);

        // ------------------------------------------
        // FILTER OPTIONS
        // ------------------------------------------

        const [
            departments,
            programs
        ] = await Promise.all([
            Department.find({
                status: "active"
            })
                .select(
                    "name code"
                )
                .sort({
                    name: 1
                })
                .lean(),

            Program.find({
                status: "active"
            })
                .select(
                    "name code department"
                )
                .sort({
                    name: 1
                })
                .lean()
        ]);

        const semesters = [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12
        ];

        return res.render(
            "admin/users",
            {
                title:
                    "User Management",

                currentUser:
                    req.session.user || null,

                users: userList,

                summary: {
                    totalUsers,
                    totalStudents,
                    totalFaculty,
                    totalAdmins,
                    activeUsers,
                    inactiveUsers
                },

                departments,
                programs,
                semesters,

                filters: {
                    search,
                    role,
                    status,
                    department,
                    program,
                    semester
                }
            }
        );
    } catch (error) {
        console.error(
            "Show admin users error:",
            error
        );

        return next(error);
    }
};


const showAdminUser = async (
    req,
    res,
    next
) => {
    try {
        const user =
            await User.findById(
                req.params.id
            )
                .select(
                    "name email role isActive lastLogin createdAt updatedAt"
                )
                .lean();

        if (!user) {
            req.flash(
                "error",
                "User not found."
            );

            return res.redirect(
                "/admin/users"
            );
        }

        let profile = null;

        if (
            user.role === "student"
        ) {
            profile =
                await StudentProfile.findOne({
                    user: user._id
                }).lean();
        }

        if (
            user.role === "faculty"
        ) {
            profile =
                await FacultyProfile.findOne({
                    user: user._id
                }).lean();
        }

        return res.render(
            "admin/user-view",
            {
                title:
                    "User Details",
                currentUser:
                    req.session.user ||
                    null,
                user,
                profile
            }
        );
    } catch (error) {
        console.error(
            "Show admin user error:",
            error
        );

        return next(error);
    }
};


const toggleUserStatus = async (
    req,
    res,
    next
) => {
    try {
        const user =
            await User.findById(
                req.params.id
            );

        if (!user) {
            req.flash(
                "error",
                "User not found."
            );

            return res.redirect(
                "/admin/users"
            );
        }

        // ------------------------------------------
        // PREVENT ADMIN FROM DEACTIVATING SELF
        // ------------------------------------------

        if (
            req.session.user &&
            String(
                req.session.user.id
            ) ===
                String(user._id)
        ) {
            req.flash(
                "error",
                "You cannot change your own account status."
            );

            return res.redirect(
                "/admin/users"
            );
        }

        user.isActive =
            !user.isActive;

        await user.save();

        req.flash(
            "success",
            user.isActive
                ? "User activated successfully."
                : "User deactivated successfully."
        );

        return res.redirect(
            req.get("Referer") ||
                "/admin/users"
        );
    } catch (error) {
        console.error(
            "Toggle user status error:",
            error
        );

        return next(error);
    }
};


const resetUserPassword = async (
    req,
    res,
    next
) => {
    try {
        const user =
            await User.findById(
                req.params.id
            ).select(
                "+password"
            );

        if (!user) {
            req.flash(
                "error",
                "User not found."
            );

            return res.redirect(
                "/admin/users"
            );
        }

        // ------------------------------------------
        // DO NOT RESET ADMIN PASSWORD FROM HERE
        // ------------------------------------------

        if (
            user.role === "admin"
        ) {
            req.flash(
                "error",
                "Admin password cannot be reset from User Management."
            );

            return res.redirect(
                `/admin/users/${user._id}`
            );
        }

        // ------------------------------------------
        // GENERATE TEMPORARY PASSWORD
        // ------------------------------------------

        const temporaryPassword =
            `Campus@${Math.random()
                .toString(36)
                .slice(2, 8)}${Math.floor(
                10 +
                    Math.random() * 90
            )}`;

        user.password =
            temporaryPassword;

        await user.save();

        req.flash(
            "success",
            `Temporary password generated: ${temporaryPassword}`
        );

        return res.redirect(
            `/admin/users/${user._id}`
        );
    } catch (error) {
        console.error(
            "Reset user password error:",
            error
        );

        return next(error);
    }
};

const deleteUser = async (
    req,
    res,
    next
) => {
    try {
        const user =
            await User.findById(
                req.params.id
            );

        if (!user) {
            req.flash(
                "error",
                "User not found."
            );

            return res.redirect(
                "/admin/users"
            );
        }

        // Admin account cannot be deleted
        if (user.role === "admin") {
            req.flash(
                "error",
                "Admin accounts cannot be deleted."
            );

            return res.redirect(
                "/admin/users"
            );
        }

        // Current admin cannot delete itself
        if (
            req.session.user &&
            String(req.session.user.id) ===
                String(user._id)
        ) {
            req.flash(
                "error",
                "You cannot delete your own account."
            );

            return res.redirect(
                "/admin/users"
            );
        }

        // Soft delete ONLY the User account
        // StudentProfile / FacultyProfile remain untouched
        user.isDeleted = true;
        user.deletedAt = new Date();
        user.isActive = false;

        await user.save();

        req.flash(
            "success",
            "User deleted successfully."
        );

        return res.redirect(
            "/admin/users"
        );
    } catch (error) {
        console.error(
            "Delete user error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// ADMIN - SETTINGS
// ==========================================

const showAdminSettings = async (
    req,
    res,
    next
) => {
    try {
        return res.render(
            "admin/settings",
            {
                title: "Admin Settings"
            }
        );

    } catch (error) {
        console.error(
            "Admin settings error:",
            error
        );

        return next(error);
    }
};



// ============================================================
// ADMIN - WORKER MANAGEMENT
// ============================================================

const showAdminWorkers = async (req, res, next) => {
    try {
        const {
            search = "",
            workerType = "",
            employmentType = "",
            status = ""
        } = req.query;

        const userQuery = {
            role: "worker"
        };

        if (status === "active") {
            userQuery.isActive = true;
        }

        if (status === "inactive") {
            userQuery.isActive = false;
        }

        const workerUsers = await User.find(userQuery)
            .select("name email role isActive lastLogin createdAt")
            .sort({ createdAt: -1 })
            .lean();

        const userIds = workerUsers.map(
            worker => worker._id
        );

        const workerProfiles = userIds.length
            ? await WorkerProfile.find({
                user: { $in: userIds }
            }).lean()
            : [];

        const profileMap = new Map();

        for (const profile of workerProfiles) {
            if (profile.user) {
                profileMap.set(
                    profile.user.toString(),
                    profile
                );
            }
        }

        let workers = workerUsers.map(user => {
            const profile = profileMap.get(
                user._id.toString()
            );

            return {
                _id: profile?._id || null,

                userId: user._id,

                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt
                },

                profile: profile || null,

                workerId: profile?.workerId || null,
                mobile: profile?.mobile || null,
                workerType: profile?.workerType || null,
                employmentType:
                    profile?.employmentType || null,
                joiningDate:
                    profile?.joiningDate || null,
                salary: profile?.salary ?? null
            };
        });

        if (workerType.trim()) {
            workers = workers.filter(
                worker =>
                    worker.workerType ===
                    workerType.trim().toLowerCase()
            );
        }

        if (employmentType.trim()) {
            workers = workers.filter(
                worker =>
                    worker.employmentType ===
                    employmentType.trim().toLowerCase()
            );
        }

        const searchText = search
            .trim()
            .toLowerCase();

        if (searchText) {
            workers = workers.filter(worker => {
                const name = String(
                    worker.user?.name || ""
                ).toLowerCase();

                const email = String(
                    worker.user?.email || ""
                ).toLowerCase();

                const workerId = String(
                    worker.workerId || ""
                ).toLowerCase();

                const mobile = String(
                    worker.mobile || ""
                ).toLowerCase();

                const type = String(
                    worker.workerType || ""
                ).toLowerCase();

                return (
                    name.includes(searchText) ||
                    email.includes(searchText) ||
                    workerId.includes(searchText) ||
                    mobile.includes(searchText) ||
                    type.includes(searchText)
                );
            });
        }

        const summary = {
            total: workers.length,

            active: workers.filter(
                worker =>
                    worker.user?.isActive === true
            ).length,

            inactive: workers.filter(
                worker =>
                    worker.user?.isActive === false
            ).length,

            withProfile: workers.filter(
                worker =>
                    worker.profile !== null
            ).length,

            withoutProfile: workers.filter(
                worker =>
                    worker.profile === null
            ).length
        };

        return res.render(
            "admin/workers",
            {
                title: "Worker Management",

                currentUser:
                    req.session.user || null,

                workers,

                summary,

                filters: {
                    search,
                    workerType,
                    employmentType,
                    status
                }
            }
        );

    } catch (error) {
        console.error(
            "Admin workers error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - WORKER VIEW
// ============================================================

const showAdminWorker = async (req, res, next) => {
    try {
        const workerProfileId = req.params.id;

        if (!workerProfileId) {
            return res.status(404).render("error", {
                title: "Worker Not Found",
                message: "Worker profile was not found."
            });
        }

        const worker = await WorkerProfile.findById(workerProfileId)
            .populate(
                "user",
                "name email role isActive lastLogin createdAt"
            )
            .lean();

        if (!worker) {
            return res.status(404).render("error", {
                title: "Worker Not Found",
                message: "Worker profile was not found."
            });
        }

        if (!worker.user) {
            return res.status(404).render("error", {
                title: "Worker Account Not Found",
                message: "The worker account linked to this profile was not found."
            });
        }

        if (worker.user.role !== "worker") {
            return res.status(403).render("error", {
                title: "Access Denied",
                message: "This profile does not belong to a worker."
            });
        }

        const tasks = await WorkerTask.find({
            worker: worker.user._id
        })
            .populate(
                "assignedBy",
                "name email"
            )
            .sort({
                createdAt: -1
            })
            .lean();

        const leaves = await WorkerLeave.find({
            worker: worker.user._id
        })
            .populate(
                "reviewedBy",
                "name email"
            )
            .sort({
                createdAt: -1
            })
            .lean();

        return res.render(
            "admin/worker-view",
            {
                title: "Worker Details",
                worker: {
                    ...worker,
                    tasks,
                    leaves
                }
            }
        );

    } catch (error) {

        console.error(
            "Admin worker detail error:",
            error
        );

        return next(error);
    }
};

// ============================================================
// ADMIN - WORKER TASKS
// ============================================================

const showAdminWorkerTasks = async (
    req,
    res,
    next
) => {
    try {

        const tasks =
            await WorkerTask.find({})
                .populate({
                    path: "worker",
                    select: "name email role isActive"
                })
                .populate({
                    path: "assignedBy",
                    select: "name email role"
                })
                .sort({
                    createdAt: -1
                })
                .lean();


        const workers =
            await User.find({
                role: "worker",
                isActive: true
            })
                .select(
                    "name email role isActive"
                )
                .sort({
                    name: 1
                })
                .lean();


        // ----------------------------------------------------
        // SUMMARY
        // ----------------------------------------------------

        const totalTasks =
            tasks.length;

        const summary = {

            total:
                totalTasks,

            assigned:
                tasks.filter(
                    task =>
                        task.status ===
                        "assigned"
                ).length,

            inProgress:
                tasks.filter(
                    task =>
                        task.status ===
                        "in-progress"
                ).length,

            completed:
                tasks.filter(
                    task =>
                        task.status ===
                        "completed"
                ).length,

            closed:
                tasks.filter(
                    task =>
                        task.status ===
                        "closed"
                ).length
        };


        // ----------------------------------------------------
        // RENDER
        // ----------------------------------------------------

        return res.render(
            "admin/worker-tasks",
            {
                title:
                    "Worker Tasks",

                currentUser:
                    req.session.user ||
                    null,

                tasks,

                workers,

                summary
            }
        );

    } catch (error) {

        console.error(
            "Show admin worker tasks error:",
            error
        );

        return next(error);
    }
};

// ============================================================
// ADMIN - ASSIGN WORKER TASK
// ============================================================

const createWorkerTask = async (
    req,
    res,
    next
) => {
    try {
        const {
            worker,
            title,
            description,
            location,
            taskType,
            priority,
            dueDate
        } = req.body || {};

        if (
            !worker ||
            !title ||
            !String(title).trim() ||
            !description ||
            !String(description).trim()
        ) {
            req.flash(
                "error",
                "Worker, title and description are required."
            );

            return res.redirect(
                "/admin/worker-tasks"
            );
        }

        const selectedWorker =
            await User.findOne({
                _id: worker,
                role: "worker",
                isActive: true
            });

        if (!selectedWorker) {
            req.flash(
                "error",
                "Selected worker is not valid."
            );

            return res.redirect(
                "/admin/worker-tasks"
            );
        }

        const allowedTaskTypes = [
            "plumbing",
            "electrical",
            "carpentry",
            "cleaning",
            "gardening",
            "security",
            "maintenance",
            "technical",
            "other"
        ];

        const allowedPriorities = [
            "low",
            "medium",
            "high",
            "urgent"
        ];

        const normalizedTaskType =
            String(
                taskType || "other"
            )
                .trim()
                .toLowerCase();

        const normalizedPriority =
            String(
                priority || "medium"
            )
                .trim()
                .toLowerCase();

        if (
            !allowedTaskTypes.includes(
                normalizedTaskType
            )
        ) {
            req.flash(
                "error",
                "Invalid task type."
            );

            return res.redirect(
                "/admin/worker-tasks"
            );
        }

        if (
            !allowedPriorities.includes(
                normalizedPriority
            )
        ) {
            req.flash(
                "error",
                "Invalid task priority."
            );

            return res.redirect(
                "/admin/worker-tasks"
            );
        }

        let parsedDueDate = null;

        if (dueDate) {
            parsedDueDate =
                new Date(
                    `${dueDate}T23:59:59`
                );

            if (
                Number.isNaN(
                    parsedDueDate.getTime()
                )
            ) {
                req.flash(
                    "error",
                    "Invalid due date."
                );

                return res.redirect(
                    "/admin/worker-tasks"
                );
            }
        }

         const task =
    await WorkerTask.create({
        worker:
            selectedWorker._id,

        assignedBy:
            null,

        title:
            String(title).trim(),

        description:
            String(description).trim(),

        location:
            String(
                location || ""
            ).trim(),

        taskType:
            normalizedTaskType,

        priority:
            normalizedPriority,

        dueDate:
            parsedDueDate
    });

        req.flash(
            "success",
            "Task assigned to worker successfully."
        );

        return res.redirect(
            `/admin/worker-tasks`
        );

    } catch (error) {
        console.error(
            "Create worker task error:",
            error
        );

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
                    : "Please check the task details."
            );

            return res.redirect(
                "/admin/worker-tasks"
            );
        }

        return next(error);
    }
};


// ============================================================
// ADMIN - CLOSE WORKER TASK
// ============================================================

const closeWorkerTask = async (
    req,
    res,
    next
) => {
    try {
        const { taskId } =
            req.params;

        const task =
            await WorkerTask.findById(
                taskId
            );

        if (!task) {
            req.flash(
                "error",
                "Task not found."
            );

            return res.redirect(
                "/admin/worker-tasks"
            );
        }

        if (
            task.status !== "completed"
        ) {
            req.flash(
                "error",
                "Only completed tasks can be closed."
            );

            return res.redirect(
                "/admin/worker-tasks"
            );
        }

        task.status = "closed";

        task.closedAt =
            new Date();

        task.adminResponse =
            String(
                req.body?.adminResponse ||
                ""
            ).trim();

        await task.save();

        req.flash(
            "success",
            "Worker task closed successfully."
        );

        return res.redirect(
            "/admin/worker-tasks"
        );

    } catch (error) {
        console.error(
            "Close worker task error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - WORKER LEAVE MANAGEMENT
// ============================================================

// ============================================================
// ADMIN - WORKER LEAVE MANAGEMENT
// ============================================================

const showAdminWorkerLeaves = async (
    req,
    res,
    next
) => {
    try {

        const leaves =
            await WorkerLeave.find({})
                .populate(
                    "worker",
                    "name email role isActive"
                )
                .populate(
                    "reviewedBy",
                    "name email role"
                )
                .sort({
                    createdAt: -1
                })
                .lean();


        const summary = {
            total:
                leaves.length,

            pending:
                leaves.filter(
                    leave =>
                        leave.status ===
                        "pending"
                ).length,

            approved:
                leaves.filter(
                    leave =>
                        leave.status ===
                        "approved"
                ).length,

            rejected:
                leaves.filter(
                    leave =>
                        leave.status ===
                        "rejected"
                ).length
        };


        return res.render(
            "admin/worker-leaves",
            {
                title:
                    "Worker Leave Management",

                currentUser:
                    req.session.user ||
                    null,

                leaves,

                summary
            }
        );

    } catch (error) {

        console.error(
            "Admin worker leaves error:",
            error
        );

        return next(error);
    }
};







// ============================================================
// ADMIN - REVIEW WORKER LEAVE
// ============================================================




// ============================================================
// ADMIN - REVIEW WORKER LEAVE
// ============================================================

const reviewWorkerLeave = async (
    req,
    res,
    next
) => {
    try {
        const { leaveId } =
            req.params;

        const {
            status,
            adminResponse
        } = req.body || {};

        const allowedStatuses = [
            "approved",
            "rejected"
        ];

        const normalizedStatus =
            String(
                status || ""
            )
                .trim()
                .toLowerCase();

        if (
            !allowedStatuses.includes(
                normalizedStatus
            )
        ) {
            req.flash(
                "error",
                "Invalid leave decision."
            );

            return res.redirect(
                "/admin/worker-leaves"
            );
        }

        const leave =
            await WorkerLeave.findById(
                leaveId
            );

        if (!leave) {
            req.flash(
                "error",
                "Worker leave application not found."
            );

            return res.redirect(
                "/admin/worker-leaves"
            );
        }

        if (
            leave.status !== "pending"
        ) {
            req.flash(
                "error",
                "This leave application has already been reviewed."
            );

            return res.redirect(
                "/admin/worker-leaves"
            );
        }

        const response =
            String(
                adminResponse || ""
            ).trim();

        if (response.length > 1500) {
            req.flash(
                "error",
                "Admin response cannot exceed 1500 characters."
            );

            return res.redirect(
                "/admin/worker-leaves"
            );
        }

        leave.status =
            normalizedStatus;

        leave.adminResponse =
            response;

        leave.reviewedBy = null;
            

        leave.reviewedAt =
            new Date();

        await leave.save();

        req.flash(
            "success",
            `Worker leave ${normalizedStatus} successfully.`
        );

        return res.redirect(
            "/admin/worker-leaves"
        );

    } catch (error) {
        console.error(
            "Review worker leave error:",
            error
        );

        return next(error);
    }
};



// ============================================================
// ADMIN - LOST & FOUND MANAGEMENT
// ============================================================

const showAdminLostFound = async (
    req,
    res,
    next
) => {

    try {

        const reports =
            await LostFoundReport.find({})
                .populate(
                    "student",
                    "name email role isActive"
                )
                .sort({
                    createdAt: -1
                })
                .lean();


        const summary = {

            total:
                reports.length,

            pending:
                reports.filter(
                    report =>
                        report.status ===
                        "pending"
                ).length,

            approved:
                reports.filter(
                    report =>
                        report.status ===
                        "approved"
                ).length,

            rejected:
                reports.filter(
                    report =>
                        report.status ===
                        "rejected"
                ).length

        };


        return res.render(
            "admin/lost-found",
            {

                title:
                    "Lost & Found Management",

                currentUser:
                    req.session.user ||
                    null,

                reports,

                summary

            }
        );

    } catch (error) {

        console.error(
            "Admin lost & found error:",
            error
        );

        return next(error);
    }
};


// ============================================================
// ADMIN - REVIEW LOST & FOUND
// ============================================================

const reviewLostFound = async (
    req,
    res,
    next
) => {

    try {

        const { reportId } =
            req.params;


        const {
            status,
            adminResponse
        } = req.body || {};


        const allowedStatuses = [
            "approved",
            "rejected"
        ];


        const normalizedStatus =
            String(
                status || ""
            )
                .trim()
                .toLowerCase();


        if (
            !allowedStatuses.includes(
                normalizedStatus
            )
        ) {

            req.flash(
                "error",
                "Invalid Lost & Found decision."
            );

            return res.redirect(
                "/admin/lost-found"
            );
        }


        const report =
            await LostFoundReport.findById(
                reportId
            );


        if (!report) {

            req.flash(
                "error",
                "Lost & Found report not found."
            );

            return res.redirect(
                "/admin/lost-found"
            );
        }


        if (
            report.status !==
            "pending"
        ) {

            req.flash(
                "error",
                "This report has already been reviewed."
            );

            return res.redirect(
                "/admin/lost-found"
            );
        }


        const response =
            String(
                adminResponse || ""
            ).trim();


        if (response.length > 1500) {

            req.flash(
                "error",
                "Admin response cannot exceed 1500 characters."
            );

            return res.redirect(
                "/admin/lost-found"
            );
        }


        // ----------------------------------------
        // UPDATE REPORT
        // ----------------------------------------

        report.status =
            normalizedStatus;

        report.adminResponse =
            response;

        // Current admin session uses
        // "admin" instead of MongoDB ObjectId.
        // Therefore keep verifiedBy null.
        report.verifiedBy =
            null;

        report.verifiedAt =
            new Date();


        await report.save();


        // ----------------------------------------
        // APPROVED
        // ----------------------------------------

        if (
            normalizedStatus ===
            "approved"
        ) {

            const students =
                await User.find({
                    role: "student",
                    isActive: true
                })
                    .select("_id")
                    .lean();


            if (
                students.length > 0
            ) {

                const notificationMessage =
                    response
                        ? `${report.itemName} has been verified by the administration. ${response}`
                        : `${report.itemName} has been verified by the administration. Please check the Lost & Found section if this item belongs to you.`;


                const notifications =
                    students.map(
                        student => ({

                            recipient:
                                student._id,

                            title:
                                "Lost & Found Alert",

                            message:
                                notificationMessage,

                            type:
                                "lost-found",

                            relatedReport:
                                report._id,

                            isRead:
                                false

                        })
                    );


                await Notification.insertMany(
                    notifications
                );
            }
        }


        req.flash(
            "success",
            `Lost & Found report ${normalizedStatus} successfully.`
        );


        return res.redirect(
            "/admin/lost-found"
        );

    } catch (error) {

        console.error(
            "Review Lost & Found error:",
            error
        );

        return next(error);
    }
};
// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    showAdminDashboard,
    showAdminSettings,
    showAdminStudents,
    showAdminStudent,
    showEditStudent,
    updateStudent,

    showAdminFaculty,
    showAdminFacultyProfile,

        // Worker Management
    showAdminWorkers,
    showAdminWorker,
    showAdminWorkerTasks,
    createWorkerTask,
    closeWorkerTask,
    showAdminWorkerLeaves,
    reviewWorkerLeave,

    showAdminDepartments,
    showAddDepartment,
    createDepartment,

    // Lost & Found
    showAdminLostFound,
    reviewLostFound,
    
    showAdminDepartment,
    showEditDepartment,
    updateDepartment,
    toggleDepartmentStatus,

    showAdminPrograms,
    showAddProgram,
    createProgram,
    showAdminProgram,
    showEditProgram,
    updateProgram,

    showAdminCourses,
    showAddCourse,
    createCourse,
    showEditCourse,
    updateCourse,
    toggleCourseStatus,
    showAdminCourse,

    showAdminTimetable,
    showAddTimetable,
    createTimetable,
    showEditTimetable,
    updateTimetable,
    showAdminTimetableEntry,
    toggleTimetableStatus,
    deleteTimetable,
    sendTimetableToStudents,

    showAdminUsers,
    showAdminUser,
    toggleUserStatus,
    resetUserPassword,
    deleteUser,

};