const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const isLoggedIn = require("../middlewares/isLoggedin");
const isVerified = require("../middlewares/isVerified"); // <-- IMPORT THE NEW MIDDLEWARE
const Alumni = require("../models/alumni-model");
const Event = require("../models/event-model");
const Student = require("../models/student-model");
const multer = require("multer");
const nodemailer = require("nodemailer");
const EventRequest = require("../models/eventRequest-model");
const Message = require('../models/message-model');
const upload = multer();
const Post = require("../models/post-model");

// --- Nodemailer Transport Setup ---
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

// --- EMAIL FUNCTIONS ---

async function sendEmailsToAllStudents(title, description, link) {
  try {
    const studentList = await Student.find({}, "email fullname");
    const BATCH_SIZE = 10;
    for (let i = 0; i < studentList.length; i += BATCH_SIZE) {
      const batch = studentList.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((student) =>
          transporter.sendMail({
            from: '"Harish Monga" <aashutoshsharma2905@gmail.com>',
            to: student.email,
            subject: `New Event Scheduled: ${title}`,
            text: `Hello ${student.fullname},\n\nA new event has been scheduled by an alumnus.\n\nTitle:\n${title}\n\nDescription:\n${description}\n\nGoogle Meet Link:\n${link}\n\nThanks,\nHarish Monga`,
            html: `<p>Hello <b>${student.fullname}</b>,</p><p>A new event has been scheduled by an alumnus:</p><p><b>Title:</b><br>${title}</p><p><b>Description:</b><br>${description}</p><p><b>Google Meet Link:</b><br><a href="${link}" target="_blank">Join Meeting</a></p><p>Thanks,<br>Harish Monga</p>`,
          })
        )
      );
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (err) {
    console.error("Error sending bulk meeting emails:", err);
  }
}

async function sendEmailToOneStudent(student, title, description, link) {
  try {
    await transporter.sendMail({
      from: '"Harish Monga" <aashutoshsharma2905@gmail.com>',
      to: student.email,
      subject: `Your Event Request "${title}" has been Approved!`,
      text: `Hello ${student.fullname},\n\nYour requested event has been scheduled.\n\nTitle:\n${title}\n\nDescription:\n${description}\n\nGoogle Meet Link:\n${link}\n\nThanks,\nHarish Monga`,
      html: `<p>Hello <b>${student.fullname}</b>,</p><p>Your requested event, "${title}", has been scheduled!</p><p><b>Description:</b><br>${description}</p><p><b>Google Meet Link:</b><br><a href="${link}" target="_blank">Join Meeting</a></p><p>Thanks,<br>Harish Monga</p>`,
    });
  } catch (err) {
    console.error("Error sending single meeting email:", err);
  }
}

// --- AUTH ROUTES ---
router.get("/register", (req, res) => {
  if (req.cookies.token) return res.redirect('/alumni/dashboard');
  res.render("register-alumni");
});

router.post("/register", (req, res) => {
  req.body.role = "alumni";
  authController.registerUser(req, res);
});

router.get("/login", (req, res) => {
  if (req.cookies.token) return res.redirect('/alumni/dashboard');
  res.render("login-alumni");
});

router.post("/login", (req, res) => {
  req.body.role = "alumni";
  authController.loginUser(req, res);
});


// --- SECURED ALUMNI ROUTES ---

router.get("/dashboard", isLoggedIn, isVerified, async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.user._id).populate('invitations');
    const posts = await Post.find()
      .populate("author", "name currentCompany designation image")
      .sort({ createdAt: -1 });
    const requests = await EventRequest.find({ status: "pending" })
      .populate("requestedBy", "fullname")
      .sort({ createdAt: -1 })
      .limit(3);
    res.render("alumni-dashboard", { user: req.user, posts, requests, invitations: alumni.invitations });
  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to load dashboard");
    res.redirect("/");
  }
});

router.get("/donate", isLoggedIn, isVerified, (req, res) => res.render("donate"));

router.get("/profile", isLoggedIn, isVerified, (req, res) => {
  res.render("complete-profile", { alumni: req.user });
});

router.post("/profile", isLoggedIn, isVerified, upload.single("image"), async (req, res) => {
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
    req.flash("error", "Error updating profile");
    res.redirect("/alumni/dashboard");
  }
});

router.get("/event", isLoggedIn, isVerified, (req, res) => res.render("event"));

router.post("/event", isLoggedIn, isVerified, async (req, res) => {
  try {
    const { title, description, date, gmeetLink } = req.body;
    const event = new Event({ title, description, date, gmeetLink, createdBy: req.user._id });
    await event.save();
    await sendEmailsToAllStudents(title, description, gmeetLink);
    res.redirect("/alumni/dashboard");
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/eventrequests", isLoggedIn, isVerified, async (req, res) => {
  try {
    const requests = await EventRequest.find({ status: "pending" })
      .populate("requestedBy", "fullname email");
    res.render("eventRequestsAlum", { requests });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.post("/eventrequests/accept/:id", isLoggedIn, isVerified, async (req, res) => {
  try {
    const request = await EventRequest.findById(req.params.id);
    if (!request) return res.status(404).send("Request not found");
    res.render("create-event-from-request", { request });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.post("/eventrequests/create-event/:id", isLoggedIn, isVerified, async (req, res) => {
  try {
    const request = await EventRequest.findById(req.params.id).populate("requestedBy");
    if (!request) return res.status(404).send("Request not found");
    const { date, gmeetLink } = req.body;
    const event = new Event({
      title: request.title,
      description: request.description,
      date,
      gmeetLink,
      createdBy: req.user._id,
    });
    await event.save();
    request.status = "approved";
    await request.save();
    await sendEmailToOneStudent(request.requestedBy, event.title, event.description, event.gmeetLink);
    res.redirect("/alumni/eventrequests");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.post('/connections/respond/:studentId', isLoggedIn, isVerified, async (req, res) => {
  try {
    const { action } = req.body;
    const alumni = await Alumni.findById(req.user._id);
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ error: "Student not found." });
    alumni.invitations.pull(student._id);
    student.sentRequests.pull(alumni._id);
    if (action === 'accept') {
      alumni.connections.push(student._id);
      student.connections.push(alumni._id);
    }
    await alumni.save();
    await student.save();
    res.status(200).json({ message: `Request ${action}ed successfully.` });
  } catch (error) {
    console.error("Error responding to request:", error);
    res.status(500).json({ error: "Server error." });
  }
});

router.get('/network', isLoggedIn, isVerified, async (req, res) => {
  try {
    const { search, branch, graduationYear, location } = req.query;
    const filterQuery = { status: 'Verified' };
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filterQuery.$or = [
        { name: searchRegex },
        { currentCompany: searchRegex },
        { designation: searchRegex }
      ];
    }
    if (branch) filterQuery.branch = branch;
    if (graduationYear) filterQuery.graduationYear = parseInt(graduationYear);
    if (location) filterQuery.location = new RegExp(location, 'i');
    const alumniList = await Alumni.find(filterQuery);
    res.render('network', { user: req.user, alumniList, query: req.query });
  } catch (error) {
    console.error("Error fetching alumni network:", error);
    res.status(500).send("Server Error");
  }
});

router.get('/jobs', isLoggedIn, isVerified, async (req, res) => {
  try {
    const sampleJobs = [
      { _id: '1', title: 'Senior Frontend Engineer', company: 'Google', location: 'Bengaluru', type: 'Full-time', postedAgo: '3d ago' },
      { _id: '2', title: 'Product Management Intern', company: 'Microsoft', location: 'Remote', type: 'Internship', postedAgo: '1w ago' },
      { _id: '3', title: 'Lead Data Scientist', company: 'Amazon', location: 'Hyderabad', type: 'Full-time', postedAgo: '1w ago' },
    ];
    res.render('jobs', { user: req.user, jobList: sampleJobs, query: req.query });
  } catch (error) {
    console.error("Error fetching jobs page:", error);
    res.status(500).send("Server Error");
  }
});

router.get('/jobs/new', isLoggedIn, isVerified, (req, res) => {
  res.send("Page to create a new job posting will go here.");
});

router.get('/chat', isLoggedIn, isVerified, async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.user._id).populate('connections');
    if (alumni.connections && alumni.connections.length > 0) {
      return res.redirect(`/alumni/chat/${alumni.connections[0]._id}`);
    }
    res.render('alumni-chat', { user: req.user, connections: [], activeChat: null, messages: [] });
  } catch (error) {
    res.redirect('/alumni/dashboard');
  }
});

router.get('/chat/:studentId', isLoggedIn, isVerified, async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.user._id).populate('connections');
    const student = await Student.findById(req.params.studentId);
    if (!student || !alumni.connections.some(conn => conn._id.equals(student._id))) {
      if (alumni.connections.length === 0) {
        return res.render('alumni-chat', { user: req.user, connections: [], activeChat: null, messages: [] });
      }
      return res.redirect('/alumni/dashboard');
    }
    const messages = await Message.find({
      $or: [{ from: alumni._id, to: student._id }, { from: student._id, to: alumni._id }]
    }).sort({ createdAt: 'asc' });
    res.render('alumni-chat', { user: req.user, connections: alumni.connections, activeChat: student, messages });
  } catch (error) {
    res.redirect('/alumni/dashboard');
  }
});

module.exports = router;