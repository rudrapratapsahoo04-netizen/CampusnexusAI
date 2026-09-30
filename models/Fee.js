
const mongoose = require("mongoose");

const feeSchema = new mongoose.Schema(
    {
        // ==========================================
        // STUDENT
        // ==========================================

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        studentProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StudentProfile",
            required: true,
            index: true
        },

        studentId: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            index: true
        },


        // ==========================================
        // ACADEMIC DETAILS
        // ==========================================

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
            uppercase: true
        },

        academicSession: {
            type: String,
            required: true,
            trim: true,
            index: true
        },


        // ==========================================
        // FEE BREAKDOWN
        // ==========================================

        tuitionFee: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        examinationFee: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        hostelFee: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        libraryFee: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        transportFee: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        otherFee: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },


        // ==========================================
        // PAYMENT DETAILS
        // ==========================================

        totalFee: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        paidAmount: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        dueAmount: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        dueDate: {
            type: Date,
            default: null
        },

        paymentStatus: {
            type: String,
            enum: [
                "pending",
                "partially_paid",
                "paid",
                "overdue"
            ],
            default: "pending",
            index: true
        },


        // ==========================================
        // ADMIN INFORMATION
        // ==========================================

        remarks: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
        },

        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        lastUpdatedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);


// ==========================================
// INDEXES
// ==========================================

feeSchema.index({
    student: 1,
    academicSession: 1,
    semester: 1
});


feeSchema.index({
    department: 1,
    program: 1,
    semester: 1,
    academicSession: 1
});


// ==========================================
// UNIQUE FEE RECORD
// One student = one fee record per
// academic session + semester
// ==========================================

feeSchema.index(
    {
        student: 1,
        academicSession: 1,
        semester: 1
    },
    {
        unique: true
    }
);


module.exports =
    mongoose.models.Fee ||
    mongoose.model("Fee", feeSchema);