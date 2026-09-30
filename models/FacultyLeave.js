const mongoose = require("mongoose");

const facultyLeaveSchema = new mongoose.Schema(
    {
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        facultyName: {
            type: String,
            required: true,
            trim: true
        },

        leaveType: {
            type: String,
            enum: [
                "casual",
                "medical",
                "earned",
                "emergency",
                "other"
            ],
            required: true
        },

        startDate: {
            type: Date,
            required: true
        },

        endDate: {
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
            maxlength: 1000
        },

        attachment: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "rejected",
                "cancelled"
            ],
            default: "pending",
            index: true
        },

        adminRemarks: {
            type: String,
            trim: true,
            default: ""
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        reviewedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

facultyLeaveSchema.index({
    faculty: 1,
    startDate: 1,
    endDate: 1
});

module.exports = mongoose.model(
    "FacultyLeave",
    facultyLeaveSchema
);