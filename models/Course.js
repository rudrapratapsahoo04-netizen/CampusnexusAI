const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
    {
        courseCode: {
            type: String,
            required: [true, "Course code is required"],
            trim: true,
            uppercase: true,
            maxlength: 30,
            index: true
        },

        courseName: {
            type: String,
            required: [true, "Course name is required"],
            trim: true,
            maxlength: 150
        },

        shortName: {
            type: String,
            trim: true,
            maxlength: 50,
            default: ""
        },

        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: true,
            index: true
        },

        program: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Program",
            required: true,
            index: true
        },

        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
            index: true
        },

        courseType: {
            type: String,
            enum: [
                "core",
                "elective",
                "practical",
                "tutorial",
                "project",
                "internship",
                "seminar"
            ],
            required: true,
            default: "core"
        },

        credits: {
            type: Number,
            required: true,
            min: 0,
            max: 30
        },

        theoryHours: {
            type: Number,
            default: 0,
            min: 0,
            max: 20
        },

        practicalHours: {
            type: Number,
            default: 0,
            min: 0,
            max: 20
        },

        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
            index: true
        },

        createdBy: {
               type: String,
               required: true,
               trim: true
              }
    },
    {
        timestamps: true
    }
);

courseSchema.index({
    department: 1,
    program: 1,
    semester: 1,
    status: 1
});

courseSchema.index(
    {
        program: 1,
        courseCode: 1
    },
    {
        unique: true
    }
);

module.exports =
    mongoose.models.Course ||
    mongoose.model("Course", courseSchema);