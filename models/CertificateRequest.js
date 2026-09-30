const mongoose = require("mongoose");

const certificateRequestSchema = new mongoose.Schema(
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
            max: 8
        },

        section: {
            type: String,
            required: true,
            trim: true,
            uppercase: true
        },

        certificateType: {
            type: String,
            enum: [
                "bonafide",
                "character",
                "study",
                "attendance",
                "fee",
                "medium_of_instruction",
                "course_completion",
                "migration",
                "transfer",
                "provisional_degree",
                "transcript",
                "no_dues"
            ],
            required: true,
            index: true
        },

        purpose: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
            maxlength: 500
        },

        additionalDetails: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
        },

        status: {
            type: String,
            enum: [
                "pending",
                "under_review",
                "approved",
                "rejected",
                "ready"
            ],
            default: "pending",
            index: true
        },

        applicationNumber: {
            type: String,
            unique: true,
            sparse: true,
            index: true
        },

        certificateNumber: {
            type: String,
            unique: true,
            sparse: true,
            index: true
        },

        adminRemarks: {
            type: String,
            trim: true,
            maxlength: 1000,
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
        },

        generatedAt: {
            type: Date,
            default: null
        },

        certificateFile: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

certificateRequestSchema.index({
    student: 1,
    createdAt: -1
});

certificateRequestSchema.index({
    department: 1,
    program: 1,
    status: 1
});

module.exports = mongoose.model(
    "CertificateRequest",
    certificateRequestSchema
);