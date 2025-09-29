const jwt = require("jsonwebtoken");
const alumniModel = require("../models/alumni-model");
const studentModel = require("../models/student-model");
const collegeModel = require("../models/college-model");

module.exports = async function (req, res, next) {
  if (!req.cookies.token) {
    req.flash("error", "You need to login first");
    return res.redirect("/");
  }

  try {
    const decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY);

    let Model;
    if (decoded.role === "alumni") Model = alumniModel;
    else if (decoded.role === "student") Model = studentModel;
    else if (decoded.role === "college") Model = collegeModel;
    else {
      req.flash("error", "Invalid user role");
      return res.redirect("/");
    }

    const user = await Model.findOne({ email: decoded.email }).select(
      "-password"
    );

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/");
    }

    req.user = user;
    next();
  } catch (err) {
    console.error(err.message);
    req.flash("error", "Something went wrong");
    res.redirect("/");
  }
};
