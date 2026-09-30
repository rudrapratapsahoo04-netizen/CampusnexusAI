/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

const notFound = (req, res, next) => {
    const error = new Error(`Page not found: ${req.originalUrl}`);
    error.status = 404;

    next(error);
};

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

const errorHandler = (err, req, res, next) => {
    const statusCode = err.status || 500;

    console.error("Error:", err.message);

    res.status(statusCode).render("error", {
        title: statusCode === 404 ? "Page Not Found" : "Server Error",
        statusCode,
        error:
            process.env.NODE_ENV === "development"
                ? err
                : null
    });
};

module.exports = {
    notFound,
    errorHandler
};