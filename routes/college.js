const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const isLoggedIn = require("../middlewares/isLoggedin");


router.get("/register", (req, res) => {
    res.render("register-college");
});

router.post("/register", (req, res) => {
    req.body.role = "college";
    authController.registerUser(req, res);
});

router.get("/login", (req, res) => {
    res.render("login-college");
});
router.get("/dashboard", (req, res) => {
    res.render("college-dashboard");
})

router.post("/login", (req, res) => {
    req.body.role = "college";
    authController.loginUser(req, res);
});

module.exports = router;
