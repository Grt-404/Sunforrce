const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const isLoggedIn = require("../middlewares/isLoggedin");
const Post = require("../models/post-model")
router.get("/register", (req, res) => {
    res.render("register-student");
});


router.post("/register", (req, res) => {
    req.body.role = "student";
    authController.registerUser(req, res);
});
router.get("/dashboard", isLoggedIn, async (req, res) => {
    try {
        const posts = await Post.find().populate("author");
        res.render("student-dashboard", {
            user: req.user,
            posts
        });
    } catch (err) {
        console.error("❌ Error loading dashboard:", err);
        res.status(500).send("Server Error");
    }
});

router.get("/login", (req, res) => {
    res.render("login-student");
});

router.post("/login", (req, res) => {
    req.body.role = "student";
    authController.loginUser(req, res);
});

module.exports = router;
