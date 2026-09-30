
const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Notice Target Schema
|--------------------------------------------------------------------------
*/

const noticeTargetSchema = new mongoose.Schema(
    {
        department: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        program: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 8
        },

        section: {
            type: String,
            required: true,
            trim: true,
            uppercase: true
        },

        courseCode: {
            type: String,
            trim: true,
            uppercase: true,
            default: null
        },

        courseName: {
            type: String,
            trim: true,
            default: null
        }
    },
    {
        _id: false
    }
);

/*
|--------------------------------------------------------------------------
| Notice Schema
|--------------------------------------------------------------------------
*/

const noticeSchema = new mongoose.Schema(
    {
        noticeType: {
            type: String,
            enum: [
                "faculty_leave",
                "class_cancelled",
                "class_rescheduled",
                "academic",
                "assignment",
                "other"
            ],
            default: "academic",
            index: true
        },

        title: {
            type: String,
            required: [
                true,
                "Notice title is required"
            ],
            trim: true,
            maxlength: 200
        },

        description: {
            type: String,
            required: [
                true,
                "Notice description is required"
            ],
            trim: true,
            maxlength: 5000
        },

        /*
        |--------------------------------------------------------------------------
        | Audience
        |--------------------------------------------------------------------------
        | Who should receive this notice?
        */

        audience: {
            type: String,
            enum: [
                "students",
                "faculty",
                "both"
            ],
            default: "students",
            index: true
        },

        /*
        |--------------------------------------------------------------------------
        | Notice Scope
        |--------------------------------------------------------------------------
        */

        scope: {
            type: String,
            enum: [
                "university",
                "department",
                "program",
                "semester",
                "section"
            ],
            required: true,
            index: true
        },

        /*
        |--------------------------------------------------------------------------
        | Primary / Legacy Target Fields
        |--------------------------------------------------------------------------
        */

        department: {
            type: String,
            trim: true,
            lowercase: true,
            default: null,
            index: true
        },

        program: {
            type: String,
            trim: true,
            lowercase: true,
            default: null,
            index: true
        },

        semester: {
            type: Number,
            min: 1,
            max: 8,
            default: null,
            index: true
        },

        section: {
            type: String,
            trim: true,
            uppercase: true,
            default: null,
            index: true
        },

        courseCode: {
            type: String,
            trim: true,
            uppercase: true,
            default: null,
            index: true
        },

        courseName: {
            type: String,
            trim: true,
            default: null
        },

        /*
        |--------------------------------------------------------------------------
        | Multiple Academic Targets
        |--------------------------------------------------------------------------
        */

        targets: {
            type: [noticeTargetSchema],
            default: []
        },

        /*
        |--------------------------------------------------------------------------
        | Publisher
        |--------------------------------------------------------------------------
        */

        publishedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        publisherRole: {
            type: String,
            enum: [
                "admin",
                "faculty"
            ],
            required: true,
            index: true
        },

        /*
        |--------------------------------------------------------------------------
        | Faculty Leave
        |--------------------------------------------------------------------------
        */

        facultyLeave: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FacultyLeave",
            default: null,
            index: true
        },

        /*
        |--------------------------------------------------------------------------
        | Dates
        |--------------------------------------------------------------------------
        */

        noticeDate: {
            type: Date,
            default: null,
            index: true
        },

        rescheduledDate: {
            type: Date,
            default: null
        },

        rescheduledStartTime: {
            type: String,
            trim: true,
            default: null
        },

        rescheduledEndTime: {
            type: String,
            trim: true,
            default: null
        },

        /*
        |--------------------------------------------------------------------------
        | Attachment
        |--------------------------------------------------------------------------
        */

        attachment: {
            type: String,
            default: null
        },

        /*
        |--------------------------------------------------------------------------
        | Publishing
        |--------------------------------------------------------------------------
        */

        publishedAt: {
            type: Date,
            default: Date.now,
            index: true
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

noticeSchema.index({
    scope: 1,
    department: 1,
    program: 1,
    semester: 1,
    section: 1,
    isActive: 1,
    publishedAt: -1
});

noticeSchema.index({
    department: 1,
    program: 1,
    semester: 1,
    section: 1,
    courseCode: 1,
    isActive: 1,
    publishedAt: -1
});

noticeSchema.index({
    publishedBy: 1,
    publisherRole: 1,
    publishedAt: -1
});

noticeSchema.index({
    "targets.department": 1,
    "targets.program": 1,
    "targets.semester": 1,
    "targets.section": 1,
    isActive: 1,
    publishedAt: -1
});

noticeSchema.index({
    audience: 1,
    isActive: 1,
    publishedAt: -1
});

/*
|--------------------------------------------------------------------------
| Prevent OverwriteModelError during Nodemon / development reload
|--------------------------------------------------------------------------
*/

module.exports =
    mongoose.models.Notice ||
    mongoose.model("Notice", noticeSchema);
