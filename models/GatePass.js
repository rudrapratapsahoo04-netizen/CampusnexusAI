const mongoose = require("mongoose");

const gatePassSchema = new mongoose.Schema(
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

        passType: {
            type: String,
            enum: [
                "outing",
                "leave",
                "emergency"
            ],
            required: true,
            index: true
        },

        exitDate: {
            type: Date,
            required: true,
            index: true
        },

        expectedExitTime: {
            type: String,
            required: true,
            trim: true
        },

        expectedReturnTime: {
            type: String,
            required: true,
            trim: true
        },

        destination: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 300
        },

        reason: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
            maxlength: 1000
        },

        emergencyContact: {
            type: String,
            required: true,
            match: [
                /^[0-9]{10}$/,
                "Invalid emergency contact number"
            ]
        },

        additionalRemarks: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
        },

        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "rejected",
                "expired",
                "used",
                "cancelled"
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

        qrToken: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
            select: false
        },

        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        approvedAt: {
            type: Date,
            default: null
        },

        rejectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        rejectedAt: {
            type: Date,
            default: null
        },

        adminRemarks: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
        },

        actualExitAt: {
            type: Date,
            default: null
        },

        actualReturnAt: {
            type: Date,
            default: null
        },

        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        qrGeneratedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);


// Student's gate pass history
gatePassSchema.index({
    student: 1,
    createdAt: -1
});


// Admin filtering
gatePassSchema.index({
    department: 1,
    program: 1,
    status: 1,
    createdAt: -1
});


// Date + status
gatePassSchema.index({
    exitDate: 1,
    status: 1
});


module.exports = mongoose.model(
    "GatePass",
    gatePassSchema
);