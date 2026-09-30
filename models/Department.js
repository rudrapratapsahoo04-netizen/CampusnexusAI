const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Department name is required"],
            trim: true,
            minlength: 2,
            maxlength: 150
        },

        code: {
            type: String,
            required: [true, "Department code is required"],
            unique: true,
            trim: true,
            uppercase: true,
            minlength: 2,
            maxlength: 20
        },

        hod: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
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

departmentSchema.index({
    name: 1
});

module.exports =
    mongoose.models.Department ||
    mongoose.model("Department", departmentSchema);