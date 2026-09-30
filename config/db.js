const mongoose = require("mongoose");

const connectDB = async () => {
    try {

        if (!process.env.MONGO_URI) {
            throw new Error(
                "MONGO_URI is not defined in the environment variables."
            );
        }

        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected successfully.");
        console.log(`Database: ${mongoose.connection.name}`);

    } catch (error) {

        console.error("MongoDB connection failed.");
        console.error(error.message);

        process.exit(1);
    }
};

mongoose.connection.on("connected", () => {
    console.log("MongoDB connection established.");
});

mongoose.connection.on("error", (error) => {
    console.error(
        "MongoDB runtime error:",
        error.message
    );
});

mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected.");
});

module.exports = connectDB;