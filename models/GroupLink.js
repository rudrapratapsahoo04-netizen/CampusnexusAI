
const mongoose = require("mongoose");

const groupLinkSchema = new mongoose.Schema(
    {
        groupName: {
            type: String,
            required: true,
            trim: true
        },

        platform: {
            type: String,
            enum: [
                "whatsapp",
                "telegram",
                "discord",
                "class_group",
                "department_group",
                "program_group",
                "other"
            ],
            required: true
        },

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
            default: "university"
        },

        department: {
            type: String,
            trim: true,
            lowercase: true,
            default: null
        },

        program: {
            type: String,
            trim: true,
            lowercase: true,
            default: null
        },

        semester: {
            type: Number,
            min: 1,
            max: 8,
            default: null
        },

        section: {
            type: String,
            trim: true,
            uppercase: true,
            default: null
        },

        groupLink: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    {
        timestamps: true
    }
);

groupLinkSchema.index({
    scope: 1,
    department: 1,
    program: 1,
    semester: 1,
    section: 1,
    isActive: 1
});

module.exports =
    mongoose.models.GroupLink ||
    mongoose.model("GroupLink", groupLinkSchema);
