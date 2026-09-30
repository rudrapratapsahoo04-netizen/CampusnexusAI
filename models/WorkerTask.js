const mongoose = require("mongoose");

const workerTaskSchema = new mongoose.Schema(
    {
        // Worker jisko admin ne task assign kiya hai
        worker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        // Task assign karne wala admin
        // Admin login env-based hai, isliye DB User ObjectId
        // available nahi hone par ye null rahega.
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },

        // Task ka short title
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        // Complete task description
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },

        // Task kis jagah ka hai
        location: {
            type: String,
            trim: true,
            maxlength: 300,
            default: ""
        },

        // Task kis category ka hai
        taskType: {
            type: String,
            enum: [
                "plumbing",
                "electrical",
                "carpentry",
                "cleaning",
                "gardening",
                "security",
                "maintenance",
                "technical",
                "other"
            ],
            default: "other"
        },

        // Priority
        priority: {
            type: String,
            enum: [
                "low",
                "medium",
                "high",
                "urgent"
            ],
            default: "medium"
        },

        // Task kab assign hua
        assignedAt: {
            type: Date,
            default: Date.now
        },

        // Optional deadline
        dueDate: {
            type: Date,
            default: null
        },

        // Current task status
        status: {
            type: String,
            enum: [
                "assigned",
                "in-progress",
                "completed",
                "closed"
            ],
            default: "assigned",
            index: true
        },

        // Worker ne task complete karne ke baad jo message admin ko bheja
        workerCompletionMessage: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: ""
        },

        // Worker ne completion message kab bheja
        completedAt: {
            type: Date,
            default: null
        },

        // Admin ke liye optional response
        adminResponse: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: ""
        },

        // Admin ne task close kab kiya
        closedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.models.WorkerTask ||
    mongoose.model("WorkerTask", workerTaskSchema);