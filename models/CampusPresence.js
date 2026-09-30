const mongoose = require("mongoose");

const campusPresenceSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
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

        section: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            index: true
        },

        status: {
            type: String,
            enum: [
                "on_campus",
                "hostel",
                "outside_campus",
                "on_leave",
                "unknown"
            ],
            default: "unknown",
            index: true
        },

        location: {
            type: String,
            trim: true,
            default: null
        },

        lastVerifiedAt: {
            type: Date,
            default: null
        },

        lastVerifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        source: {
            type: String,
            enum: [
                "admin",
                "gate_pass",
                "qr_scan",
                "hostel",
                "system"
            ],
            default: "system"
        },

        remarks: {
            type: String,
            trim: true,
            maxlength: 500,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

campusPresenceSchema.index({
    department: 1,
    program: 1,
    semester: 1,
    section: 1,
    status: 1
});

module.exports = mongoose.model(
    "CampusPresence",
    campusPresenceSchema
);