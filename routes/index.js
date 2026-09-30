const express = require("express");

const {
    home
} = require("../controllers/homeController");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

router.get("/", home);

module.exports = router;