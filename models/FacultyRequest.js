const mongoose = require("mongoose");

const facultyRequestSchema = new mongoose.Schema(
    {
        requestType: {
            type: String,
            enum: [
                "gate_pass",
                "student_complaint",
                "leave_review",
                "academic_request",
                "other"
            ],
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        studentProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StudentProfile",
            default: null
        },

        studentId: {
            type: String,
            trim: true,
            default: null
        },

        department: {
            type: String,
            trim: true,
            lowercase: true,
            default: null
        },

        program: {
            type: String,
            trim: true,
            lowercase: true,
            default: null
        },

        semester: {
            type: Number,
            default: null
        },

        section: {
            type: String,
            trim: true,
            uppercase: true,
            default: null
        },

        assignedFaculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium"
        },

        status: {
            type: String,
            enum: [
                "pending",
                "in_progress",
                "resolved",
                "rejected",
                "cancelled"
            ],
            default: "pending",
            index: true
        },

        facultyRemarks: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: ""
        },

        completedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

facultyRequestSchema.index({
    assignedFaculty: 1,
    status: 1,
    createdAt: -1
});

module.exports = mongoose.model(
    "FacultyRequest",
    facultyRequestSchema
);