const alumniModel = require('../models/alumni-model');
const collegeModel = require('../models/college-model');
const studentModel = require('../models/student-model');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/generateToken');

module.exports.loginUser = async function (req, res) {
    try {
        const { email, password } = req.body;

        // Check in all three models
        let user = await alumniModel.findOne({ email }) ||
            await collegeModel.findOne({ email }) ||
            await studentModel.findOne({ email });

        if (!user) {
            req.flash("error", "Email or password is incorrect");
            return res.redirect("/");
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash("error", "Email or password is incorrect");
            return res.redirect("/");
        }

        // Generate token
        let token = generateToken(user);
        res.cookie("token", token);

        // Redirect (you can customize this per role if needed)
        res.redirect('/shop');
    } catch (err) {
        console.error(err.message);
        req.flash("error", "Server Error");
        return res.redirect("/");
    }
};

module.exports.registerUser = async function (req, res) {
    try {
        const { email, fullname, password, role } = req.body;

        // Decide which model to use
        let Model;
        if (role === "alumni") Model = alumniModel;
        else if (role === "college") Model = collegeModel;
        else if (role === "student") Model = studentModel;
        else {
            req.flash("error", "Invalid role selected");
            return res.redirect("/");
        }

        // Check if user already exists in that collection
        let existingUser = await Model.findOne({ email });
        if (existingUser) {
            req.flash("error", "You already have an account, please login");
            return res.redirect("/");
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Create user
        const createdUser = await Model.create({
            email,
            fullname,
            password: hash,
            role
        });

        // Generate token
        const token = generateToken(createdUser);
        res.cookie("token", token);

        // Redirect — you can customize per role
        return res.redirect(`/${role}/dashboard`);

    } catch (err) {
        console.error(err.message);
        req.flash("error", "Server Error");
        return res.redirect("/");
    }
};
