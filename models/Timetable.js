const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
    {
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
            max: 12,
            index: true
        },

        section: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            index: true
        },

        day: {
            type: String,
            required: true,
            enum: [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday"
            ],
            index: true
        },

        startTime: {
            type: String,
            required: true,
            trim: true
        },

        endTime: {
            type: String,
            required: true,
            trim: true
        },

        // ----------------------------------------------------
        // COURSE REFERENCE
        // ----------------------------------------------------

        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            default: null,
            index: true
        },

        courseCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true
        },

        courseName: {
            type: String,
            required: true,
            trim: true
        },

        // ----------------------------------------------------
        // FACULTY REFERENCE
        // ----------------------------------------------------

        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },

        facultyName: {
            type: String,
            required: true,
            trim: true
        },

        // ----------------------------------------------------
        // ROOM
        // ----------------------------------------------------

        room: {
            type: String,
            trim: true,
            default: "TBA",
            index: true
        },

        // ----------------------------------------------------
        // CLASS TYPE
        // ----------------------------------------------------

        type: {
            type: String,
            enum: [
                "lecture",
                "lab",
                "tutorial",
                "practical",
                "seminar"
            ],
            default: "lecture"
        },

        // ----------------------------------------------------
        // STATUS
        // ----------------------------------------------------

        isActive: {
                type: Boolean,
                default: true,
                  index: true
               },

        isPublished: {
              type: Boolean,
              default: false,
              index: true
           },

         publishedAt:  {
              type: Date,
              default: null
          },

        // ----------------------------------------------------
        // CREATED BY
        // ----------------------------------------------------

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

// ------------------------------------------------------------
// SECTION TIMETABLE LOOKUP
// ------------------------------------------------------------

timetableSchema.index({
    department: 1,
    program: 1,
    semester: 1,
    section: 1,
    day: 1,
    startTime: 1
});

// ------------------------------------------------------------
// FACULTY TIMETABLE LOOKUP
// ------------------------------------------------------------

timetableSchema.index({
    faculty: 1,
    day: 1,
    startTime: 1
});

// ------------------------------------------------------------
// ROOM TIMETABLE LOOKUP
// ------------------------------------------------------------

timetableSchema.index({
    room: 1,
    day: 1,
    startTime: 1
});

// ------------------------------------------------------------
// COURSE LOOKUP
// ------------------------------------------------------------

timetableSchema.index({
    course: 1,
    day: 1,
    startTime: 1
});

module.exports =
    mongoose.models.Timetable ||
    mongoose.model("Timetable", timetableSchema);