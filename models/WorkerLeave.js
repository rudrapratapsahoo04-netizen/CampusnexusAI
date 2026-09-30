const mongoose = require("mongoose");

const workerLeaveSchema = new mongoose.Schema(
    {
        worker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        leaveType: {
            type: String,
            enum: [
                "casual",
                "sick",
                "earned",
                "emergency",
                "personal",
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

        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1500
        },

        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "rejected"
            ],
            default: "pending",
            index: true
        },

        adminResponse: {
            type: String,
            trim: true,
            maxlength: 1500,
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


module.exports =
    mongoose.models.WorkerLeave ||
    mongoose.model(
        "WorkerLeave",
        workerLeaveSchema
    );