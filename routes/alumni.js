const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const isLoggedIn = require("../middlewares/isLoggedin");
const Alumni = require("../models/alumni-model");
const Event = require("../models/event-model");
const Student = require("../models/student-model");
const multer = require("multer");
const nodemailer = require("nodemailer");
const EventRequest = require("../models/eventRequest-model");

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

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "aashutoshsharma2905@gmail.com",
    pass: "lgdbmlqvqwuotory",
  },
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

router.post(
  "/profile",
  isLoggedIn,
  upload.single("image"),
  async (req, res) => {
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
  }
);

router.get("/event", (req, res) => {
  res.render("event");
});

async function sendEmails(title, description, link) {
  try {
    const studentList = await Student.find({}, "email fullname");
    const BATCH_SIZE = 10; // send 10 emails at a time

    for (let i = 0; i < studentList.length; i += BATCH_SIZE) {
      const batch = studentList.slice(i, i + BATCH_SIZE);

      // send this batch in parallel
      await Promise.all(
        batch.map((student) =>
          transporter.sendMail({
            from: '"Ashutosh" <aashutoshsharma2905@gmail.com>',
            to: student.email,
            subject: title,
            text: `Hello ${student.fullname},

Your meeting has been scheduled.

Title:\n${title}
Description:\n${description}
Google Meet Link:\n${link}

Thanks,
Ashutosh Sharma`,
            html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Meeting Scheduled</h2>
                <p>Hello <b>${student.fullname}</b>,</p>
                <p>Your meeting has been scheduled with the following details:</p>
                <p><b>Title:</b><br>${title}</p>
                <p><b>Description:</b><br>${description}</p>
                <p><b>Google Meet Link:</b><br>
                    <a href="${link}" target="_blank">Join Meeting</a>
                </p>
                <p>Thanks,<br>Ashutosh Sharma</p>
            </div>
          `,
          })
        )
      );

      console.log(`Batch ${i / BATCH_SIZE + 1} sent`);
      await new Promise((r) => setTimeout(r, 1000)); // wait 1 second between batches
    }
  } catch (err) {
    console.error("Error sending meeting emails:", err);
    throw err;
  }
}


router.post("/event", async (req, res) => {
  try {
    const { title, description, date, gmeetLink } = req.body;
    const event = new Event({ title, description, date, gmeetLink });
    await event.save();

    res.redirect("/alumni/dashboard");

    // send emails in batches
    await sendEmails(title, description, gmeetLink);

    
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/eventrequests", isLoggedIn, async (req, res) => {
  try {
    // Fetch requests with more than 10 upvotes and status pending
    const requests = await EventRequest.find({ upvotes: { $gt: 10 }, status: 'pending' })
      .populate("requestedBy", "fullname email"); // populate who requested

    res.render("eventRequestsAlum", { requests });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


router.post("/eventrequests/accept/:id", async (req, res) => {
  try {
    const request = await EventRequest.findById(req.params.id);
    if (!request) return res.status(404).send("Request not found");

    // Render form with title & description prefilled
    res.render("create-event-from-request", { request });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.post("/eventrequests/create-event/:id", async (req, res) => {
  try {
    const request = await EventRequest.findById(req.params.id);
    if (!request) return res.status(404).send("Request not found");

    const { date, gmeetLink } = req.body;
    const event = new Event({
      title: request.title,
      description: request.description,
      date,
      gmeetLink,
    });

    await event.save();


    // mark request as approved
    request.status = "approved";
    await request.save();

    // Send emails as before
    res.redirect("/alumni/eventrequests");
    await sendEmails(event.title, event.description, event.gmeetLink);

    
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


module.exports = router;
