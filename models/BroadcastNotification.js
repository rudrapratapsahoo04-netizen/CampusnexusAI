const mongoose = require("mongoose");

const broadcastNotificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000
        },

        recipientType: {
            type: String,
            enum: ["student", "faculty"],
            required: true,
            index: true
        },

        recipients: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            }
        ],

        sentBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        sentAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.models.BroadcastNotification ||
    mongoose.model(
        "BroadcastNotification",
        broadcastNotificationSchema
    );