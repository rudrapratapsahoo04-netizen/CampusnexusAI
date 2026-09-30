const mongoose = require("mongoose");

const workerProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true
        },

        workerId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
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
            match: [
                /^[0-9]{10}$/,
                "Please enter a valid 10-digit mobile number"
            ]
        },

        workerType: {
            type: String,
            enum: [
                "plumber",
                "electrician",
                "carpenter",
                "cleaner",
                "gardener",
                "security",
                "technician",
                "other"
            ],
            required: true
        },

        employmentType: {
            type: String,
            enum: [
                "full-time",
                "part-time",
                "contract",
                "temporary"
            ],
            required: true
        },

        joiningDate: {
            type: Date,
            required: true
        },

        salary: {
            type: Number,
            required: true,
            min: 0
        },

        address: {
            type: String,
            required: true,
            trim: true
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
            match: [
                /^[0-9]{6}$/,
                "Please enter a valid 6-digit PIN"
            ]
        },

        emergencyContact: {
            type: String,
            required: true,
            match: [
                /^[0-9]{10}$/,
                "Please enter a valid 10-digit emergency contact"
            ]
        },

        emergencyRelation: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.models.WorkerProfile ||
    mongoose.model("WorkerProfile", workerProfileSchema);