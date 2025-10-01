const express = require('express');
const router = express.Router();
const isLoggedin = require('../middlewares/isLoggedin');
const alumniModel = require("../models/alumni-model");
const collegeModel = require('../models/college-model');
const studentModel = require('../models/student-model');
const authController = require("../controllers/authController");

router.get("/", (req, res) => {
    res.render("home");
})
router.get("/soon", (req, res) => {
    res.render("comingSoon");
})
router.get("/login", (req, res) => {
    res.render("login");
});
router.get("/solution", (req, res) => {
    res.render("solution.ejs");
});
router.get("/contact", (req, res) => {
    res.render("contact");
});
router.get("/projects", (req, res) => {
    res.render("ourWork.ejs");
})
router.post("/login", (req, res) => {
    authController.loginUser(req, res);
});
router.get("/register", (req, res) => {
    res.render("signup");
})
router.get("/logout", authController.logout);
module.exports = router;