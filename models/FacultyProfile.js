
const mongoose = require("mongoose");

const facultyProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        employeeId: {
            type: String,
            required: true,
            unique: true,
            trim: true
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
            match: [/^[0-9]{10}$/, "Please enter a valid 10-digit mobile number"]
        },

        designation: {
            type: String,
            enum: [
                "professor",
                "associate-professor",
                "assistant-professor",
                "lecturer",
                "visiting-faculty",
                "guest-faculty",
                "research-faculty"
            ],
            required: true
        },

        employmentType: {
            type: String,
            enum: [
                "full-time",
                "part-time",
                "contract",
                "visiting"
            ],
            required: true
        },

        joiningDate: {
            type: Date,
            required: true
        },

        department: {
            type: String,
            required: true,
            trim: true
        },

        program: {
            type: String,
            required: true,
            trim: true
        },

        specialization: {
            type: String,
            required: true,
            trim: true
        },

        courses: {
            type: String,
            default: "",
            trim: true
        },

        highestQualification: {
            type: String,
            enum: [
                "phd",
                "mphil",
                "postgraduate",
                "graduate",
                "other"
            ],
            required: true
        },

        qualificationField: {
            type: String,
            required: true,
            trim: true
        },

        qualificationUniversity: {
            type: String,
            required: true,
            trim: true
        },

        experience: {
            type: String,
            enum: [
                "0-2",
                "3-5",
                "6-10",
                "11-15",
                "15+"
            ],
            required: true
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
            match: [/^[0-9]{6}$/, "Please enter a valid 6-digit PIN"]
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

module.exports = mongoose.model(
    "FacultyProfile",
    facultyProfileSchema
);
