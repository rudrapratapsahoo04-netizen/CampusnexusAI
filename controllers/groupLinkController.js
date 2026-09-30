
const GroupLink = require("../models/GroupLink");


// ==========================================
// ADMIN — SHOW ALL GROUP LINKS
// ==========================================

const showAdminGroupLinks = async (req, res, next) => {
    try {
        const groupLinks = await GroupLink
            .find()
            .sort({
                isActive: -1,
                createdAt: -1
            })
            .lean();

        return res.render(
            "admin/grouplink",
            {
                title: "College Group Links",
                groupLinks
            }
        );

    } catch (error) {
        console.error(
            "Show Admin Group Links Error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// ADMIN — CREATE GROUP LINK
// ==========================================

const createGroupLink = async (req, res, next) => {
    try {
        const {
            groupName,
            platform,
            scope,
            department,
            program,
            semester,
            section,
            groupLink,
            description
        } = req.body;

        if (
            !groupName ||
            !platform ||
            !scope ||
            !groupLink
        ) {
            req.flash(
                "error",
                "Group name, platform, scope and group link are required."
            );

            return res.redirect(
                "/admin/grouplink"
            );
        }

        const group = await GroupLink.create({
            groupName: groupName.trim(),
            platform,
            scope,
            department:
                department?.trim().toLowerCase() || null,
            program:
                program?.trim().toLowerCase() || null,
            semester:
                semester
                    ? Number(semester)
                    : null,
            section:
                section?.trim().toUpperCase() || null,
            groupLink: groupLink.trim(),
            description:
                description?.trim() || "",
            isActive: true,
            createdBy:
                req.session.user.id === "admin"
                    ? null
                    : req.session.user.id
        });

        req.flash(
            "success",
            `Group "${group.groupName}" created successfully.`
        );

        return res.redirect(
            "/admin/grouplink"
        );

    } catch (error) {
        console.error(
            "Create Group Link Error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// ADMIN — TOGGLE GROUP LINK STATUS
// ==========================================

const toggleGroupLinkStatus = async (
    req,
    res,
    next
) => {
    try {
        const groupLink =
            await GroupLink.findById(
                req.params.id
            );

        if (!groupLink) {
            req.flash(
                "error",
                "Group link not found."
            );

            return res.redirect(
                "/admin/grouplink"
            );
        }

        groupLink.isActive =
            !groupLink.isActive;

        groupLink.updatedBy =
            req.session.user.id === "admin"
                ? null
                : req.session.user.id;

        await groupLink.save();

        req.flash(
            "success",
            `Group link ${
                groupLink.isActive
                    ? "activated"
                    : "deactivated"
            } successfully.`
        );

        return res.redirect(
            "/admin/grouplink"
        );

    } catch (error) {
        console.error(
            "Toggle Group Link Status Error:",
            error
        );

        return next(error);
    }
};


// ==========================================
// ADMIN — DELETE GROUP LINK
// ==========================================

const deleteGroupLink = async (
    req,
    res,
    next
) => {
    try {
        const groupLink =
            await GroupLink.findByIdAndDelete(
                req.params.id
            );

        if (!groupLink) {
            req.flash(
                "error",
                "Group link not found."
            );

            return res.redirect(
                "/admin/grouplink"
            );
        }

        req.flash(
            "success",
            "Group link deleted successfully."
        );

        return res.redirect(
            "/admin/grouplink"
        );

    } catch (error) {
        console.error(
            "Delete Group Link Error:",
            error
        );

        return next(error);
    }
};


const showStudentGroupLinks = async (
    req,
    res,
    next
) => {
    try {
        const StudentProfile =
            require("../models/StudentProfile");

        const studentProfile =
            await StudentProfile
                .findOne({
                    user: req.session.user.id
                })
                .lean();

        if (!studentProfile) {
            req.flash(
                "error",
                "Student profile not found."
            );

            return res.redirect(
                "/student/dashboard"
            );
        }

        const department =
            (studentProfile.department || "")
                .toLowerCase()
                .trim();

        const program =
            (studentProfile.program || "")
                .toLowerCase()
                .trim();

        const semester =
            Number(studentProfile.semester);

        const section =
            (studentProfile.section || "")
                .toUpperCase()
                .trim();


        const groupLinks =
            await GroupLink.find({
                isActive: true,

                $or: [

                    // University-wide
                    {
                        scope: "university"
                    },

                    // Department
                    {
                        scope: "department",
                        department
                    },

                    // Program
                    {
                        scope: "program",
                        department,
                        program
                    },

                    // Semester
                    {
                        scope: "semester",
                        department,
                        program,
                        semester
                    },

                    // Section
                    {
                        scope: "section",
                        department,
                        program,
                        semester,
                        section
                    }

                ]

            })
            .sort({
                scope: 1,
                createdAt: -1
            })
            .lean();


        return res.render(
            "student/group-links",
            {
                title: "College Group Links",
                groupLinks,
                studentProfile
            }
        );

    } catch (error) {

        console.error(
            "Show Student Group Links Error:",
            error
        );

        return next(error);
    }
};

module.exports = {
    showAdminGroupLinks,
    createGroupLink,
    toggleGroupLinkStatus,
    deleteGroupLink,
    showStudentGroupLinks
};
