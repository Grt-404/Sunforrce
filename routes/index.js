const express = require('express');
const router = express.Router();
const isLoggedin = require('../middlewares/isLoggedin');
const alumniModel = require("../models/alumni-model");
const collegeModel = require('../models/college-model');
const studentModel = require('../models/student-model');

router.get("/", (req, res) => {
    res.render("home");
})
router.get("/login", (req, res) => {
    res.render("login");
})
router.get("/register", (req, res) => {
    res.render("signup");
})
module.exports = router;