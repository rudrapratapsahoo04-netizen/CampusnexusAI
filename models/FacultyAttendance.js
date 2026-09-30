const mongoose = require("mongoose");

const facultyAttendanceSchema = new mongoose.Schema(
    {
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
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

        workingDays: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        presentDays: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        leaveDays: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        absentDays: {
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

/*
 * One attendance record per faculty
 * for each month and year.
 */
facultyAttendanceSchema.index(
    {
        faculty: 1,
        month: 1,
        year: 1
    },
    {
        unique: true
    }
);

module.exports = mongoose.model(
    "FacultyAttendance",
    facultyAttendanceSchema
);