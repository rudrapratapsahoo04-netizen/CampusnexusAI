 id="r6x3k2"
const notFound = (req, res, next) => {

    const error = new Error(
        `Page not found: ${req.originalUrl}`
    );

    error.statusCode = 404;

    next(error);
};


const errorHandler = (err, req, res, next) => {

    console.error(
        "Application Error:",
        err
    );

    const statusCode =
        err.statusCode ||
        err.status ||
        500;

    const message =
        err.message ||
        "Something went wrong on the server.";

    res.status(statusCode);

    return res.render("error", {
        title:
            statusCode === 404
                ? "Page Not Found"
                : "Server Error",

        statusCode,

        message,

        currentUser:
            req.session?.user || null
    });
};


module.exports = {
    notFound,
    errorHandler
};
