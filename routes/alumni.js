const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const isLoggedIn = require("../middlewares/isLoggedin");

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

router.get("/dashboard", (req, res) => {
    const user = req.user;
    res.render("alumni-dashboard", { user });
})
router.post("/login", (req, res) => {
    req.body.role = "alumni";
    authController.loginUser(req, res);
});
router.get("/donate", (req, res) => {
    res.render("donate");
})

module.exports = router;
