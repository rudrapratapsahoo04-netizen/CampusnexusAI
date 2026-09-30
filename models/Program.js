const mongoose = require("mongoose");

const programSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Program name is required"],
            trim: true,
            minlength: 2,
            maxlength: 150
        },

        code: {
            type: String,
            required: [true, "Program code is required"],
            unique: true,
            trim: true,
            uppercase: true,
            minlength: 2,
            maxlength: 20
        },

        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: [true, "Department is required"],
            index: true
        },

        duration: {
            type: Number,
            required: [true, "Program duration is required"],
            min: 1,
            max: 10
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
            index: true
        }
    },
    {
        timestamps: true
    }
);

programSchema.index({
    name: 1
});

module.exports =
    mongoose.models.Program ||
    mongoose.model("Program", programSchema);