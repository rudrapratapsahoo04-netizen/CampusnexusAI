
const Fee = require("../models/Fee");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");


// ==========================================
// ADMIN - FEE MANAGEMENT
// ==========================================

const showAdminFees = async (req, res, next) => {
    try {
        const search = (req.query.search || "").trim();

        let students = [];

        if (search) {
            const regex = new RegExp(search, "i");

            const profiles = await StudentProfile.find({
                $or: [
                    { studentId: regex },
                    { department: regex },
                    { program: regex }
                ]
            })
                .populate("user", "name email isActive isDeleted")
                .sort({ createdAt: -1 })
                .limit(50);

            students = profiles;
        }

        return res.render("admin/fee", {
            title: "Fee Management",
            students,
            search
        });
    } catch (error) {
        console.error("Admin fee page error:", error);
        return next(error);
    }
};


// ==========================================
// ADMIN - SHOW PARTICULAR STUDENT FEE
// ==========================================

const showAdminStudentFee = async (req, res, next) => {
    try {
        const { studentId } = req.params;

        const studentProfile = await StudentProfile.findOne({
            _id: studentId
        }).populate(
            "user",
            "name email isActive isDeleted"
        );

        if (!studentProfile) {
            return res.status(404).render("404", {
                title: "Student Not Found"
            });
        }

        const fees = await Fee.find({
            studentProfile: studentProfile._id
        })
            .sort({
                academicSession: -1,
                semester: 1
            });

        return res.render("admin/student-fee", {
            title: "Student Fee Management",
            studentProfile,
            fees
        });
    } catch (error) {
        console.error("Admin student fee error:", error);
        return next(error);
    }
};


// ==========================================
// ADMIN - CREATE / UPDATE FEE
// ==========================================

const saveStudentFee = async (req, res, next) => {
    try {
        const {
            feeId,
            studentProfileId,
            academicSession,
            semester,
            tuitionFee,
            examinationFee,
            hostelFee,
            libraryFee,
            transportFee,
            otherFee,
            paidAmount,
            dueDate,
            remarks
        } = req.body;

        if (!studentProfileId) {
            req.flash("error", "Student information is required.");
            return res.redirect("/admin/fee");
        }

        const studentProfile = await StudentProfile.findById(
            studentProfileId
        ).populate("user", "name email");

        if (!studentProfile || !studentProfile.user) {
            req.flash("error", "Student not found.");
            return res.redirect("/admin/fee");
        }

        const semesterNumber = Number(semester);

        if (
            !academicSession ||
            !semesterNumber ||
            semesterNumber < 1 ||
            semesterNumber > 8
        ) {
            req.flash(
                "error",
                "Valid academic session and semester are required."
            );

            return res.redirect(
                `/admin/fee/student/${studentProfileId}`
            );
        }

        const tuition = Math.max(Number(tuitionFee) || 0, 0);
        const examination = Math.max(
            Number(examinationFee) || 0,
            0
        );
        const hostel = Math.max(Number(hostelFee) || 0, 0);
        const library = Math.max(Number(libraryFee) || 0, 0);
        const transport = Math.max(
            Number(transportFee) || 0,
            0
        );
        const other = Math.max(Number(otherFee) || 0, 0);

        const totalFee =
            tuition +
            examination +
            hostel +
            library +
            transport +
            other;

        let paid = Math.max(Number(paidAmount) || 0, 0);

        if (paid > totalFee) {
            paid = totalFee;
        }

        const dueAmount = Math.max(
            totalFee - paid,
            0
        );

        let paymentStatus = "pending";

        if (totalFee > 0 && paid >= totalFee) {
            paymentStatus = "paid";
        } else if (paid > 0 && paid < totalFee) {
            paymentStatus = "partially_paid";
        }

        if (
            dueAmount > 0 &&
            dueDate &&
            new Date(dueDate) < new Date()
        ) {
            paymentStatus = "overdue";
        }

        const feeData = {
            student: studentProfile.user._id,
            studentProfile: studentProfile._id,
            studentId: studentProfile.studentId,

            department: studentProfile.department,
            program: studentProfile.program,
            semester: semesterNumber,
            section: studentProfile.section,

            academicSession: academicSession.trim(),

            tuitionFee: tuition,
            examinationFee: examination,
            hostelFee: hostel,
            libraryFee: library,
            transportFee: transport,
            otherFee: other,

            totalFee,
            paidAmount: paid,
            dueAmount,

            dueDate: dueDate
                ? new Date(dueDate)
                : null,

            paymentStatus,

            remarks: remarks
                ? remarks.trim()
                : "",

            lastUpdatedBy:
                req.session.user.id === "admin"
                    ? null
                    : req.session.user.id,

            lastUpdatedAt: new Date()
        };

        let fee;

        if (feeId) {
            fee = await Fee.findOneAndUpdate(
                {
                    _id: feeId,
                    studentProfile: studentProfile._id
                },
                feeData,
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!fee) {
                req.flash(
                    "error",
                    "Fee record not found."
                );

                return res.redirect(
                    `/admin/fee/student/${studentProfileId}`
                );
            }

            req.flash(
                "success",
                "Student fee updated successfully."
            );
        } else {
            fee = await Fee.findOne({
                studentProfile: studentProfile._id,
                academicSession: academicSession.trim(),
                semester: semesterNumber
            });

            if (fee) {
                await Fee.findByIdAndUpdate(
                    fee._id,
                    feeData,
                    {
                        new: true,
                        runValidators: true
                    }
                );

                req.flash(
                    "success",
                    "Student fee updated successfully."
                );
            } else {
                await Fee.create(feeData);

                req.flash(
                    "success",
                    "Student fee added successfully."
                );
            }
        }

        return res.redirect(
            `/admin/fee/student/${studentProfileId}`
        );
    } catch (error) {
        console.error("Save student fee error:", error);

        if (error.code === 11000) {
            req.flash(
                "error",
                "Fee record already exists for this student, academic session and semester."
            );

            return res.redirect(
                `/admin/fee/student/${req.body.studentProfileId}`
            );
        }

        return next(error);
    }
};


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    showAdminFees,
    showAdminStudentFee,
    saveStudentFee
};
