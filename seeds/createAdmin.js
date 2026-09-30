require("dotenv").config();

const connectDB =
    require("../config/db");

const User =
    require("../models/User");


const createAdmin = async () => {

    try {

        await connectDB();


        const email =
            process.env.ADMIN_EMAIL
                .trim()
                .toLowerCase();


        const password =
            process.env.ADMIN_PASSWORD;


        const name =
            process.env.ADMIN_NAME ||
            "CampusNexus Administrator";


        if (!email || !password) {

            throw new Error(
                "ADMIN_EMAIL and ADMIN_PASSWORD are required."
            );
        }


        const existing =
            await User.findOne({
                email
            });


        if (existing) {

            console.log(
                "Admin already exists."
            );

            process.exit(0);
        }


        await User.create({

            name,

            email,

            password,

            role: "admin",

            isActive: true

        });


        console.log(
            "Admin created successfully."
        );

        process.exit(0);

    } catch (error) {

        console.error(
            "Admin creation failed:",
            error.message
        );

        process.exit(1);
    }
};


createAdmin();