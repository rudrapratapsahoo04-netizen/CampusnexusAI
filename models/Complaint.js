
const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
    {
        // ========================================
        // COMPLAINT SUBMITTER
        // ========================================

        applicant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        applicantType: {
            type: String,
            enum: ["student", "faculty"],
            required: true,
            index: true
        },

        // ========================================
        // STUDENT INFORMATION
        // ========================================

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

        // ========================================
        // ACADEMIC INFORMATION
        // ========================================

        department: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true
        },

        program: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true
        },

        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 8,
            index: true
        },

        section: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            index: true
        },

        // ========================================
        // COMPLAINT DETAILS
        // ========================================

        category: {
            type: String,
            enum: [
                "academic",
                "faculty",
                "hostel",
                "mess",
                "library",
                "transport",
                "infrastructure",
                "internet",
                "fees",
                "examination",
                "administration",
                "other"
            ],
            required: true,
            index: true
        },

        subject: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
            maxlength: 200
        },

        description: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 2000
        },

        priority: {
            type: String,
            enum: [
                "low",
                "medium",
                "high",
                "urgent"
            ],
            default: "medium",
            index: true
        },

        attachment: {
            type: String,
            default: null
        },

        // ========================================
        // COMPLAINT STATUS
        // ========================================

        status: {
            type: String,
            enum: [
                "submitted",
                "under_review",
                "in_progress",
                "resolved",
                "rejected"
            ],
            default: "submitted",
            index: true
        },

        // ========================================
        // ADMIN ASSIGNMENT
        // ========================================

        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },

        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        assignedAt: {
            type: Date,
            default: null
        },

        // ========================================
        // ADMIN REMARKS
        // ========================================

        remarks: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: ""
        },

        resolvedAt: {
            type: Date,
            default: null
        },

        rejectedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// ========================================
// INDEXES
// ========================================

complaintSchema.index({
    applicant: 1,
    createdAt: -1
});

complaintSchema.index({
    student: 1,
    createdAt: -1
});

complaintSchema.index({
    department: 1,
    program: 1,
    semester: 1,
    section: 1,
    status: 1
});

complaintSchema.index({
    category: 1,
    status: 1,
    priority: 1
});

complaintSchema.index({
    assignedTo: 1,
    status: 1,
    createdAt: -1
});

module.exports = mongoose.model(
    "Complaint",
    complaintSchema
);
