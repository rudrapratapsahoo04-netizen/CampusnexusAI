const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema(
    {
        // =========================
        // APPLICANT INFORMATION
        // =========================

        applicantType: {
            type: String,
            enum: ["student", "faculty"],
            required: true,
            index: true
        },

        applicant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        // =========================
        // STUDENT INFORMATION
        // =========================

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },

        studentProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StudentProfile",
            default: null,
            index: true
        },

        studentId: {
            type: String,
            trim: true,
            uppercase: true,
            default: null
        },

        // =========================
        // FACULTY INFORMATION
        // =========================

        facultyProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FacultyProfile",
            default: null,
            index: true
        },

        employeeId: {
            type: String,
            trim: true,
            uppercase: true,
            default: null
        },

        // =========================
        // ACADEMIC / DEPARTMENT
        // =========================

        department: {
            type: String,
            trim: true,
            lowercase: true,
            default: null,
            index: true
        },

        program: {
            type: String,
            trim: true,
            lowercase: true,
            default: null,
            index: true
        },

        semester: {
            type: Number,
            min: 1,
            max: 8,
            default: null,
            index: true
        },

        section: {
            type: String,
            trim: true,
            uppercase: true,
            default: null,
            index: true
        },

        // =========================
        // LEAVE DETAILS
        // =========================

        leaveType: {
            type: String,
            enum: [
                "casual",
                "medical",
                "emergency",
                "other"
            ],
            required: true
        },

        fromDate: {
            type: Date,
            required: true
        },

        toDate: {
            type: Date,
            required: true
        },

        totalDays: {
            type: Number,
            required: true,
            min: 1
        },

        reason: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
            maxlength: 1000
        },

        attachment: {
            type: String,
            default: null
        },

        // =========================
        // APPROVAL WORKFLOW
        // =========================

        status: {
            type: String,
            enum: [
                "pending_admin",
                "forwarded_to_hod",
                "approved",
                "rejected",
                "cancelled"
            ],
            default: "pending_admin",
            index: true
        },

        // =========================
        // HOD INFORMATION
        // =========================

        hod: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },

        forwardedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        forwardedAt: {
            type: Date,
            default: null
        },

        // =========================
        // HOD ACTION
        // =========================

        hodActionAt: {
            type: Date,
            default: null
        },

        hodRemarks: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

// ========================================
// INDEXES
// ========================================

leaveRequestSchema.index({
    applicant: 1,
    createdAt: -1
});

leaveRequestSchema.index({
    applicantType: 1,
    status: 1,
    createdAt: -1
});

leaveRequestSchema.index({
    department: 1,
    program: 1,
    semester: 1,
    section: 1,
    status: 1
});

leaveRequestSchema.index({
    hod: 1,
    status: 1,
    createdAt: -1
});

module.exports = mongoose.model(
    "LeaveRequest",
    leaveRequestSchema
);