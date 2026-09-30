const mongoose = require("mongoose");

const lostFoundReportSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        itemName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        category: {
            type: String,
            enum: [
                "wallet",
                "mobile",
                "laptop",
                "documents",
                "id-card",
                "keys",
                "bag",
                "books",
                "clothing",
                "electronics",
                "jewellery",
                "other"
            ],
            default: "other"
        },

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },

        lostLocation: {
            type: String,
            required: true,
            trim: true,
            maxlength: 300
        },

        lostDate: {
            type: Date,
            required: true
        },

        image: {
            type: String,
            default: ""
        },

        contactInfo: {
            type: String,
            trim: true,
            maxlength: 300,
            default: ""
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            index: true
        },

        adminResponse: {
            type: String,
            trim: true,
            maxlength: 1500,
            default: ""
        },

        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        verifiedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.models.LostFoundReport ||
    mongoose.model("LostFoundReport", lostFoundReportSchema);