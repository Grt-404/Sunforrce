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
const Message = require('../models/message-model');
const upload = multer();
const Post = require("../models/post-model");

router.get('/chat', isLoggedIn, async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.user._id).populate('connections');

    // If the alumni has connections, redirect to a chat with the first one.
    if (alumni.connections && alumni.connections.length > 0) {
      const firstConnectionId = alumni.connections[0]._id;
      return res.redirect(`/alumni/chat/${firstConnectionId}`);
    } else {
      // If no connections, render the chat page with an empty state.
      res.render('alumni-chat', {
        user: req.user,
        connections: [],
        activeChat: null, // No active chat
        messages: []
      });
    }
  } catch (error) {
    console.error("Error loading main alumni chat page:", error);
    req.flash('error', 'Something went wrong.');
    res.redirect('/alumni/dashboard');
  }
});


// --- ROUTE TO RENDER A SPECIFIC CHAT WITH A STUDENT ---
router.get('/chat/:studentId', isLoggedIn, async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.user._id).populate('connections');
    const student = await Student.findById(req.params.studentId);

    // Security Check: Ensure the student is actually a connection
    if (!student || !alumni.connections.some(conn => conn._id.equals(student._id))) {
      // If there are no connections at all, handle that case gracefully
      if (alumni.connections.length === 0) {
        return res.render('alumni-chat', {
          user: req.user,
          connections: [],
          activeChat: null,
          messages: []
        });
      }
      req.flash('error', 'You can only chat with your connections.');
      return res.redirect('/alumni/dashboard');
    }

    // Fetch the chat history between the alumnus and this student
    const messages = await Message.find({
      $or: [
        { from: alumni._id, to: student._id },
        { from: student._id, to: alumni._id }
      ]
    }).sort({ createdAt: 'asc' });

    // Render the chat view
    res.render('alumni-chat', {
      user: req.user,
      connections: alumni.connections, // This is a list of students
      activeChat: student,              // The student the alumni is currently chatting with
      messages: messages
    });

  } catch (error) {
    console.error("Error loading alumni chat page:", error);
    req.flash('error', 'Something went wrong.');
    res.redirect('/alumni/dashboard');
  }
});
// inside router.get('/dashboard', isLoggedIn, ...) handler:
router.get("/dashboard", isLoggedIn, async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.user._id)
      .populate('invitations');
    const user = req.user; // coming from isLoggedIn middleware
    // fetch posts (all alumni posts)
    const posts = await Post.find()
      .populate("author", "name currentCompany designation image")
      .sort({ createdAt: -1 });

    const requests = await EventRequest.find({ status: "pending", upvotes: { $gt: 4 } })
      .populate("requestedBy", "fullname") // populate student's name
      .sort({ createdAt: -1 })
      .limit(3);

    res.render("alumni-dashboard", { user, posts, requests, invitations: alumni.invitations });
  } catch (err) {
    console.error(err);
    req.flash?.("error", "Unable to load dashboard");
    res.redirect("/");
  }
});
// routes/alumni.js

router.post('/connections/respond/:studentId', isLoggedIn, async (req, res) => {
  try {
    const { action } = req.body; // This will be 'accept' or 'reject'
    const alumniId = req.user._id;
    const studentId = req.params.studentId;

    const alumni = await Alumni.findById(alumniId);
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    // --- ALWAYS REMOVE THE PENDING REQUEST ---
    // Pull the student's ID from the alumni's invitations list
    alumni.invitations.pull(studentId);
    // Pull the alumni's ID from the student's sent requests list
    student.sentRequests.pull(alumniId);

    // --- IF ACCEPTED, ADD TO CONNECTIONS ---
    if (action === 'accept') {
      // Add to both users' connections lists
      alumni.connections.push(studentId);
      student.connections.push(alumniId);
    }

    await alumni.save();
    await student.save();

    res.status(200).json({ message: `Request ${action}ed successfully.` });

  } catch (error) {
    console.error("Error responding to request:", error);
    res.status(500).json({ error: "Server error." });
  }
});

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL ,
    pass: process.env.EMAIL_PASS,
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
    const requests = await EventRequest.find({
      upvotes: { $gt: 4 },
      status: "pending",
    }).populate("requestedBy", "fullname email"); // populate who requested

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

router.get('/network', isLoggedIn, async (req, res) => {
    try {
        const { search, branch, graduationYear, location } = req.query;

        // Base query to only fetch verified alumni
        const filterQuery = { status: 'Verified' };

        // Add filters to the query if they exist
        if (search) {
            const searchRegex = new RegExp(search, 'i'); // Case-insensitive regex
            filterQuery.$or = [
                { name: searchRegex },
                { currentCompany: searchRegex },
                { designation: searchRegex }
            ];
        }
        if (branch) {
            filterQuery.branch = branch;
        }
        if (graduationYear) {
            filterQuery.graduationYear = parseInt(graduationYear);
        }
        if (location) {
            filterQuery.location = new RegExp(location, 'i');
        }

        const alumniList = await Alumni.find(filterQuery);

        res.render('network', {
            user: req.user, // The logged-in alumni
            alumniList: alumniList, // The filtered list of alumni to display
            query: req.query // Pass the query parameters to pre-fill the form
        });

    } catch (error) {
        console.error("Error fetching alumni network:", error);
        res.status(500).send("Server Error");
    }
});


router.get('/jobs', isLoggedIn, async (req, res) => {
    try {
        // In a real app, you would fetch from a 'Job' collection
        // const jobs = await Job.find({ status: 'active' });

        // For now, using sample data
        const sampleJobs = [
            { _id: '1', title: 'Senior Frontend Engineer', company: 'Google', location: 'Bengaluru', type: 'Full-time', postedAgo: '3d ago' },
            { _id: '2', title: 'Product Management Intern', company: 'Microsoft', location: 'Remote', type: 'Internship', postedAgo: '1w ago' },
            { _id: '3', title: 'Lead Data Scientist', company: 'Amazon', location: 'Hyderabad', type: 'Full-time', postedAgo: '1w ago' },
            { _id: '4', title: 'UX/UI Designer', company: 'Swiggy', location: 'Remote', type: 'Contract', postedAgo: '2w ago' },
            { _id: '5', title: 'DevOps Engineer', company: 'Oracle', location: 'Pune', type: 'Full-time', postedAgo: '3w ago' },
        ];
        
        res.render('jobs', {
            user: req.user,
            jobList: sampleJobs, // Pass sample data to the template
            query: req.query
        });
    } catch (error) {
        console.error("Error fetching jobs page:", error);
        res.status(500).send("Server Error");
    }
});

// Placeholder for the "Post New Job" page
router.get('/jobs/new', isLoggedIn, (req, res) => {
    res.send("Page to create a new job posting will go here.");
});

module.exports = router;
