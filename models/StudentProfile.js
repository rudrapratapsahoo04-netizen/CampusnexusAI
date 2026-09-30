const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true
        },

        dob: {
            type: Date,
            required: true
        },

        gender: {
            type: String,
            enum: ["male", "female", "other"],
            required: true
        },

        mobile: {
            type: String,
            required: true,
            match: [/^[0-9]{10}$/, "Invalid mobile number"]
        },

        photo: {
            type: String,
            default: null
        },

        studentId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true
        },

        department: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        program: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 8
        },

        section: {
            type: String,
            trim: true,
            uppercase: true,
            default: null
        },

        batch: {
            type: Number,
            required: true,
            min: 2000
        },

        academicApprovalStatus: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },

        permanentAddress: {
            type: String,
            required: true,
            trim: true
        },

        currentAddress: {
            type: String,
            trim: true,
            default: ""
        },

        city: {
            type: String,
            required: true,
            trim: true
        },

        state: {
            type: String,
            required: true,
            trim: true
        },

        pin: {
            type: String,
            required: true,
            match: [/^[0-9]{6}$/, "Invalid PIN code"]
        },

        guardianName: {
            type: String,
            required: true,
            trim: true
        },

        guardianMobile: {
            type: String,
            required: true,
            match: [/^[0-9]{10}$/, "Invalid guardian mobile number"]
        },

        emergencyContact: {
            type: String,
            required: true,
            match: [/^[0-9]{10}$/, "Invalid emergency contact number"]
        },

        hostelRequired: {
            type: Boolean,
            required: true,
            default: false
        },

        hostelName: {
            type: String,
            trim: true,
            default: null
        },

        roomNumber: {
            type: String,
            trim: true,
            default: null
        },

        profileStatus: {
            type: String,
            enum: ["incomplete", "complete"],
            default: "complete"
        }
    },
    {
        timestamps: true
    }
);

studentProfileSchema.index({
    department: 1,
    program: 1,
    semester: 1,
    section: 1
});

module.exports =
    mongoose.models.StudentProfile ||
    mongoose.model("StudentProfile", studentProfileSchema);