const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

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
            maxlength: 2000
        },

        type: {
            type: String,
            enum: [
                "lost-found",
                "general",
                "announcement",
                "system"
            ],
            default: "general",
            index: true
        },

        relatedReport: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LostFoundReport",
            default: null
        },

        isRead: {
            type: Boolean,
            default: false,
            index: true
        },

        readAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.models.Notification ||
    mongoose.model("Notification", notificationSchema);