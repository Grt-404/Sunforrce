// This middleware runs AFTER isLoggedIn and checks the user's status.
module.exports = function (req, res, next) {
    // Check if the user object from isLoggedIn exists and has a status of 'Verified'
    if (req.user && req.user.status === 'Verified') {
        // If they are verified, allow them to proceed to the requested page (e.g., the dashboard).
        return next();
    } else {
        // If they are 'Pending' or 'Rejected', flash an error message.
        req.flash("error", "Your account is pending verification. Please wait for approval from the owner.");
        // Log them out by clearing the cookie and redirect to the login page.
        res.cookie("token", "");
        return res.redirect("/login");
    }
};