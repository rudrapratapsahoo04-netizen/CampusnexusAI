const mongoose = require("mongoose");

const facultyAssignmentSchema = new mongoose.Schema(
    {
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
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
            max: 8,
            index: true
        },

        section: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            index: true
        },

        courseCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            index: true
        },

        courseName: {
            type: String,
            required: true,
            trim: true
        },

        assignmentType: {
            type: String,
            enum: [
                "primary",
                "co_faculty",
                "lab",
                "tutorial",
                "substitute"
            ],
            default: "primary"
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true
        },

        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        assignedAt: {
            type: Date,
            default: Date.now
        },

        remarks: {
            type: String,
            trim: true,
            maxlength: 500,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

/*
|--------------------------------------------------------------------------
| Prevent duplicate faculty-course-section assignments
|--------------------------------------------------------------------------
*/

facultyAssignmentSchema.index(
    {
        faculty: 1,
        department: 1,
        program: 1,
        semester: 1,
        section: 1,
        courseCode: 1
    },
    {
        unique: true
    }
);

/*
|--------------------------------------------------------------------------
| Academic scope lookup
|--------------------------------------------------------------------------
*/

facultyAssignmentSchema.index({
    department: 1,
    program: 1,
    semester: 1,
    section: 1,
    isActive: 1
});

module.exports = mongoose.model(
    "FacultyAssignment",
    facultyAssignmentSchema
);