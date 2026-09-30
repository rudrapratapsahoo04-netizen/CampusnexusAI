const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        studentProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StudentProfile",
            required: true,
            index: true
        },

        studentId: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            index: true
        },

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

        // Section is REQUIRED
        section: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            index: true
        },

        courseCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            index: true
        },

        courseName: {
            type: String,
            required: true,
            trim: true
        },

        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
            index: true
        },

        year: {
            type: Number,
            required: true,
            min: 2000,
            index: true
        },

        totalClasses: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        presentClasses: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        absentClasses: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        lastUpdatedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// One attendance record per student,
// course and month
attendanceSchema.index(
    {
        student: 1,
        courseCode: 1,
        month: 1,
        year: 1
    },
    {
        unique: true
    }
);

// Academic lookup
attendanceSchema.index({
    department: 1,
    program: 1,
    semester: 1,
    section: 1,
    courseCode: 1,
    year: 1,
    month: 1
});

module.exports = mongoose.model(
    "Attendance",
    attendanceSchema
);