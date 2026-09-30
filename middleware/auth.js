const requireAuth = (req, res, next) => {

    if (!req.session.user) {

        req.session.returnTo = req.originalUrl;

        return res.redirect(
            "/auth/login/student"
        );
    }

    res.locals.currentUser =
        req.session.user;

    next();
};


const requireGuest = (req, res, next) => {

    /*
    |--------------------------------------------------------------------------
    | User is not logged in
    |--------------------------------------------------------------------------
    */

    if (!req.session.user) {
        return next();
    }


    /*
    |--------------------------------------------------------------------------
    | User already logged in
    |--------------------------------------------------------------------------
    */

    const role =
        req.session.user.role;


    if (role === "student") {

        return res.redirect(
            "/student/dashboard"
        );
    }


    if (role === "faculty") {

        return res.redirect(
            "/faculty/dashboard"
        );
    }


    if (role === "admin") {

        return res.redirect(
            "/admin/dashboard"
        );
    }

    if (role === "worker") {
    return res.redirect(
        "/worker/dashboard"
    );
    }


    return res.redirect("/");
};


const requireRole = (...roles) => {

    return (req, res, next) => {

        /*
        |--------------------------------------------------------------------------
        | Authentication check
        |--------------------------------------------------------------------------
        */

        if (!req.session.user) {

            req.session.returnTo =
                req.originalUrl;

            return res.redirect(
                "/auth/login/student"
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Role authorization
        |--------------------------------------------------------------------------
        */

        if (
            !roles.includes(
                req.session.user.role
            )
        ) {

            return res.status(403).render(
                "error",
                {
                    title: "Access Denied",

                    message:
                        "You do not have permission to access this page."
                }
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Make current user available to EJS
        |--------------------------------------------------------------------------
        */

        res.locals.currentUser =
            req.session.user;

        next();
    };
};


module.exports = {
    requireAuth,
    requireGuest,
    requireRole
};