const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const isLoggedIn = require("../middlewares/isLoggedin");
const Alumni = require("../models/alumni-model");
const multer = require("multer");


const upload = multer();
const Post = require('../models/post-model');

// inside router.get('/dashboard', isLoggedIn, ...) handler:
router.get('/dashboard', isLoggedIn, async (req, res) => {
    try {
        const user = req.user; // coming from isLoggedIn middleware
        // fetch posts (all alumni posts)
        const posts = await Post.find()
            .populate('author', 'name currentCompany designation image')
            .sort({ createdAt: -1 });

        res.render('alumni-dashboard', { user, posts });
    } catch (err) {
        console.error(err);
        req.flash?.('error', 'Unable to load dashboard');
        res.redirect('/');
    }
});


router.get("/register", (req, res) => {
    res.render("register-alumni");
});

router.post("/register", (req, res) => {
    req.body.role = "alumni";
    authController.registerUser(req, res);
});


router.get("/login", (req, res) => {
    res.render("login-alumni");
});

router.post("/login", (req, res) => {
    req.body.role = "alumni";
    authController.loginUser(req, res);
});


router.get("/dashboard", isLoggedIn, (req, res) => {
    const user = req.user;
    res.render("alumni-dashboard", { user });
});


router.get("/donate", isLoggedIn, (req, res) => {
    res.render("donate");
});


router.get("/profile", isLoggedIn, async (req, res) => {
    res.render("complete-profile", { alumni: req.user });
});


router.post("/profile", isLoggedIn, upload.single("image"), async (req, res) => {
    try {
        const alumni = await Alumni.findById(req.user._id);


        alumni.name = req.body.name || alumni.name;
        alumni.graduationYear = req.body.graduationYear || alumni.graduationYear;
        alumni.branch = req.body.branch || alumni.branch;
        alumni.currentCompany = req.body.currentCompany || alumni.currentCompany;
        alumni.designation = req.body.designation || alumni.designation;
        alumni.location = req.body.location || alumni.location;
        alumni.bio = req.body.bio || alumni.bio;
        alumni.linkedin = req.body.linkedin || alumni.linkedin;


        if (req.file) {
            alumni.image = req.file.buffer;
        }

        await alumni.save();

        req.flash("success", "Profile updated successfully");
        res.redirect("/alumni/dashboard");
    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong while updating profile");
        res.redirect("/alumni/dashboard");
    }
});

module.exports = router;
