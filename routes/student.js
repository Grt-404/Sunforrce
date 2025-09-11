const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const isLoggedIn = require("../middlewares/isLoggedin");

router.get("/register", (req, res) => {
    res.render("register-student");
});


router.post("/register", (req, res) => {
    req.body.role = "student";
    authController.registerUser(req, res);
});
router.get("/dashboard", (req, res) => {
    res.render("student-dashboard");
})
router.get("/login", (req, res) => {
    res.render("login-student");
});

router.post("/login", (req, res) => {
    req.body.role = "student";
    authController.loginUser(req, res);
});

module.exports = router;
