
const CertificateRequest = require("../models/CertificateRequest");
const StudentProfile = require("../models/StudentProfile");

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// ==========================================
// SHOW CERTIFICATE APPLICATION FORM
// ==========================================

const showCertificateForm = async (
    req,
    res,
    next
) => {
    try {
        const userId =
            req.session.user.id;

        const studentProfile =
            await StudentProfile.findOne({
                user: userId
            }).lean();

        if (!studentProfile) {
            return res.status(404).render(
                "error",
                {
                    title: "Profile Not Found",
                    statusCode: 404,
                    message:
                        "Student profile was not found. Please contact the administrator.",
                    currentUser:
                        req.session.user || null
                }
            );
        }

        return res.render(
            "student/certificate-form",
            {
                title: "Apply for Certificate",
                studentProfile
            }
        );

    } catch (error) {
        console.error(
            "Show certificate form error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// SUBMIT CERTIFICATE APPLICATION
// ==========================================

const submitCertificateRequest = async (
    req,
    res,
    next
) => {
    try {
        const userId =
            req.session.user.id;

        const {
            certificateType,
            purpose,
            additionalDetails
        } = req.body;


        // --------------------------------------
        // Basic validation
        // --------------------------------------

        if (
            !certificateType ||
            !purpose
        ) {
            req.flash(
                "error",
                "Please fill all required certificate fields."
            );

            return res.redirect(
                "/student/certificate/apply"
            );
        }


        // --------------------------------------
        // Find student profile
        // --------------------------------------

        const studentProfile =
            await StudentProfile.findOne({
                user: userId
            });

        if (!studentProfile) {
            req.flash(
                "error",
                "Student profile was not found."
            );

            return res.redirect(
                "/student/dashboard"
            );
        }


        // --------------------------------------
        // Create application number
        // --------------------------------------

        const applicationNumber =
            `CN-CERT-${Date.now()}`;


        // --------------------------------------
        // Create certificate request
        // --------------------------------------

        const certificateRequest =
            await CertificateRequest.create({
                student: userId,

                studentProfile:
                    studentProfile._id,

                studentId:
                    studentProfile.studentId,

                department:
                    studentProfile.department,

                program:
                    studentProfile.program,

                semester:
                    studentProfile.semester,

                section:
                    studentProfile.section,

                certificateType:
                    certificateType.trim(),

                purpose:
                    purpose.trim(),

                additionalDetails:
                    additionalDetails
                        ? additionalDetails.trim()
                        : "",

                status: "pending",

                applicationNumber
            });


        console.log(
            "Certificate request created:",
            certificateRequest._id
        );


        req.flash(
            "success",
            "Certificate application submitted successfully."
        );

        return res.redirect(
            "/student/certificates"
        );

    } catch (error) {
        console.error(
            "Submit certificate request error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// SHOW MY CERTIFICATE APPLICATIONS
// ==========================================

const showMyCertificates = async (
    req,
    res,
    next
) => {
    try {
        const userId =
            req.session.user.id;

        const certificates =
            await CertificateRequest.find({
                student: userId
            })
                .sort({
                    createdAt: -1
                })
                .lean();

        return res.render(
            "student/my-certificates",
            {
                title: "My Certificates",
                certificates
            }
        );

    } catch (error) {
        console.error(
            "Show my certificates error:",
            error
        );

        return next(error);
    }
};


// ========================================
// ADMIN - SHOW CERTIFICATE REQUESTS
// ========================================

const showAdminCertificates = async (
    req,
    res,
    next
) => {
    try {
        const certificateRequests =
            await CertificateRequest.find({})
                .populate(
                    "student",
                    "name email"
                )
                .populate(
                    "studentProfile",
                    "studentId department program semester section"
                )
                .populate(
                    "reviewedBy",
                    "name email"
                )
                .sort({
                    createdAt: -1
                })
                .lean();


        return res.render(
            "admin/certificates",
            {
                title: "Certificate Management",
                certificateRequests
            }
        );

    } catch (error) {
        console.error(
            "Admin certificates error:",
            error
        );

        return next(error);
    }
};


// ========================================
// ADMIN - REVIEW CERTIFICATE REQUEST
// ========================================

const reviewCertificateRequest = async (
    req,
    res,
    next
) => {
    try {
        const { id } =
            req.params;

        const {
            status,
            adminRemarks
        } = req.body;


        const allowedStatuses = [
            "under_review",
            "approved",
            "rejected"
        ];


        if (
            !allowedStatuses.includes(
                status
            )
        ) {
            req.flash(
                "error",
                "Invalid certificate status."
            );

            return res.redirect(
                "/admin/certificates"
            );
        }


        const certificateRequest =
            await CertificateRequest.findById(
                id
            );


        if (!certificateRequest) {
            req.flash(
                "error",
                "Certificate request not found."
            );

            return res.redirect(
                "/admin/certificates"
            );
        }


        // ========================================
        // UPDATE STATUS
        // ========================================

        certificateRequest.status =
            status;


        // ========================================
        // ADMIN REMARKS
        // ========================================

        if (
            typeof adminRemarks ===
            "string"
        ) {
            certificateRequest.adminRemarks =
                adminRemarks.trim();
        }


        // ========================================
        // REVIEW INFORMATION
        // ========================================

        
         certificateRequest.reviewedBy =
              req.session.user.id === "admin"
                         ? null
                           : req.session.user.id;


        
        certificateRequest.reviewedAt =
            new Date();

       if (status === "approved") {

             const populatedRequest =
                      await CertificateRequest
                        .findById(
                            certificateRequest._id
                          )
                            .populate(
                                    "student",
                                    "name email"
                                     );

               const generated =
                        await generateCertificatePDF(
                          populatedRequest
                      );

              certificateRequest.certificateNumber =
                 generated.certificateNumber;

               certificateRequest.certificateFile =
                 generated.certificateFile;

            certificateRequest.generatedAt =
               new Date();

             certificateRequest.status =
                 "ready";
              }

              await certificateRequest.save();



        req.flash(
            "success",
            "Certificate request updated successfully."
        );

        return res.redirect(
            "/admin/certificates"
        );

    } catch (error) {
        console.error(
            "Review certificate request error:",
            error
        );

        req.flash(
            "error",
            "Unable to update certificate request."
        );

        return res.redirect(
            "/admin/certificates"
        );
    }
};







const generateCertificatePDF = async (
    certificateRequest
) => {

    // ========================================
    // CERTIFICATE NUMBER
    // ========================================

    const certificateNumber =
        `CN-${new Date().getFullYear()}-${Date.now()}`;


    // ========================================
    // CERTIFICATE DIRECTORY
    // ========================================

    const certificateDirectory =
        path.resolve(
            process.cwd(),
            "uploads",
            "certificates"
        );


    // ========================================
    // ENSURE DIRECTORY EXISTS
    // ========================================

    await fs.promises.mkdir(
        certificateDirectory,
        {
            recursive: true
        }
    );


    // ========================================
    // VERIFY DIRECTORY
    // ========================================

    const directoryInfo =
        await fs.promises.stat(
            certificateDirectory
        );

    if (!directoryInfo.isDirectory()) {
        throw new Error(
            `Certificate path is not a directory: ${certificateDirectory}`
        );
    }


    // ========================================
    // PDF FILE
    // ========================================

    const fileName =
        `${certificateNumber}.pdf`;

    const filePath =
        path.join(
            certificateDirectory,
            fileName
        );


    // ========================================
    // CREATE PDF
    // ========================================

    const doc =
        new PDFDocument({
            size: "A4",
            margin: 50
        });


    // ========================================
    // CREATE FILE STREAM
    // ========================================

    const writeStream =
        fs.createWriteStream(
            filePath
        );


    // ========================================
    // HANDLE STREAM ERROR
    // ========================================

    const streamErrorPromise =
        new Promise(
            (
                resolve,
                reject
            ) => {

                writeStream.once(
                    "finish",
                    resolve
                );

                writeStream.once(
                    "error",
                    reject
                );

            }
        );


    doc.pipe(writeStream);


    // ========================================
    // UNIVERSITY HEADER
    // ========================================

    doc
        .fontSize(22)
        .font("Helvetica-Bold")
        .text(
            "CAMPUSNEXUS UNIVERSITY",
            {
                align: "center"
            }
        );


    doc
        .moveDown(0.4)
        .fontSize(11)
        .font("Helvetica")
        .text(
            "University Digital Certificate",
            {
                align: "center"
            }
        );


    // ========================================
    // HEADER LINE
    // ========================================

    doc.moveDown(1);

    doc
        .moveTo(70, doc.y)
        .lineTo(525, doc.y)
        .stroke();


    // ========================================
    // CERTIFICATE TITLE
    // ========================================

    doc
        .moveDown(2)
        .fontSize(24)
        .font("Helvetica-Bold")
        .text(
            "CERTIFICATE",
            {
                align: "center"
            }
        );


    // ========================================
    // STUDENT NAME
    // ========================================

    const studentName =
        certificateRequest.student &&
        certificateRequest.student.name
            ? certificateRequest.student.name
            : "Student";


    doc
        .moveDown(2)
        .fontSize(14)
        .font("Helvetica")
        .text(
            "This is to certify that",
            {
                align: "center"
            }
        );


    doc
        .moveDown(0.5)
        .fontSize(22)
        .font("Helvetica-Bold")
        .text(
            studentName,
            {
                align: "center"
            }
        );


    // ========================================
    // STUDENT DETAILS
    // ========================================

    doc
        .moveDown(1.2)
        .fontSize(12)
        .font("Helvetica")
        .text(
            `Student ID: ${certificateRequest.studentId || "-"}`,
            {
                align: "center"
            }
        );

    doc
        .moveDown(0.3)
        .text(
            `Department: ${certificateRequest.department || "-"}`,
            {
                align: "center"
            }
        );

    doc
        .moveDown(0.3)
        .text(
            `Program: ${certificateRequest.program || "-"}`,
            {
                align: "center"
            }
        );

    doc
        .moveDown(0.3)
        .text(
            `Semester: ${certificateRequest.semester || "-"}`,
            {
                align: "center"
            }
        );

    doc
        .moveDown(0.3)
        .text(
            `Section: ${certificateRequest.section || "-"}`,
            {
                align: "center"
            }
        );


    // ========================================
    // CERTIFICATE TYPE
    // ========================================

    const certificateType =
        String(
            certificateRequest.certificateType || ""
        )
            .replaceAll("_", " ")
            .replace(
                /\b\w/g,
                function (letter) {
                    return letter.toUpperCase();
                }
            );


    doc
        .moveDown(1.5)
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(
            `Certificate Type: ${certificateType}`,
            {
                align: "center"
            }
        );


    // ========================================
    // PURPOSE
    // ========================================

    doc
        .moveDown(1)
        .fontSize(11)
        .font("Helvetica")
        .text(
            `Purpose: ${certificateRequest.purpose || "-"}`,
            {
                align: "center",
                width: 450
            }
        );


    // ========================================
    // CERTIFICATE NUMBER
    // ========================================

    doc
        .moveDown(2)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(
            `Certificate No: ${certificateNumber}`,
            {
                align: "center"
            }
        );


    // ========================================
    // ISSUE DATE
    // ========================================

    doc
        .moveDown(0.5)
        .fontSize(11)
        .font("Helvetica")
        .text(
            `Issued On: ${new Date().toLocaleDateString("en-IN")}`,
            {
                align: "center"
            }
        );


    // ========================================
    // FOOTER
    // ========================================

    doc
        .moveDown(4)
        .fontSize(10)
        .font("Helvetica")
        .text(
            "This is a digitally generated certificate.",
            {
                align: "center"
            }
        );

    doc
        .moveDown(0.3)
        .text(
            "Verification can be performed through CampusNexus.",
            {
                align: "center"
            }
        );


    // ========================================
    // FINISH PDF
    // ========================================

    doc.end();


    // ========================================
    // WAIT FOR FILE TO FINISH
    // ========================================

    await streamErrorPromise;


    // ========================================
    // VERIFY GENERATED FILE
    // ========================================

    const generatedFile =
        await fs.promises.stat(
            filePath
        );

    if (!generatedFile.isFile()) {
        throw new Error(
            "Certificate PDF was not created correctly."
        );
    }


    // ========================================
    // RETURN DATA
    // ========================================

    return {
        certificateNumber,

        certificateFile:
            `uploads/certificates/${fileName}`
    };
};



// STUDENT - VIEW / DOWNLOAD OWN CERTIFICATE
const showCertificatePDF = async (
    req,
    res,
    next
) => {
    try {
        const userId =
            req.session.user.id;

        const { id } = req.params;

        const certificate =
            await CertificateRequest.findOne({
                _id: id,
                student: userId,
                status: "ready"
            }).lean();

        if (!certificate) {
            return res.status(404).render(
                "error",
                {
                    title: "Certificate Not Found",
                    statusCode: 404,
                    message:
                        "Certificate was not found or is not available yet.",
                    currentUser:
                        req.session.user || null
                }
            );
        }

        if (!certificate.certificateFile) {
            return res.status(404).render(
                "error",
                {
                    title: "Certificate Not Available",
                    statusCode: 404,
                    message:
                        "The digital certificate has not been generated yet.",
                    currentUser:
                        req.session.user || null
                }
            );
        }

        const certificatePath =
            path.resolve(
                process.cwd(),
                certificate.certificateFile
            );

        if (
            !fs.existsSync(
                certificatePath
            )
        ) {
            return res.status(404).render(
                "error",
                {
                    title: "Certificate File Not Found",
                    statusCode: 404,
                    message:
                        "The certificate file could not be found.",
                    currentUser:
                        req.session.user || null
                }
            );
        }

        return res.sendFile(
            certificatePath
        );

    } catch (error) {
        console.error(
            "Show certificate PDF error:",
            error
        );

        return next(error);
    }
};




module.exports = {
    showCertificateForm,
    submitCertificateRequest,
    showMyCertificates,
    showAdminCertificates,
    reviewCertificateRequest,
    generateCertificatePDF,
    showCertificatePDF
};
