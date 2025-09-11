require('dotenv').config();
const express = require("express");
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const expressSession = require("express-session");
const flash = require("connect-flash");

const studentRouter = require("./routes/student");
const alumniRouter = require("./routes/alumni");
const collegeRouter = require("./routes/college");
const indexRouter = require("./routes/index");
const postsRoutes = require('./routes/post');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// Serve static files correctly
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

// Optional: session + flash
app.use(expressSession({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false
}));
app.use(flash());

// Routers
app.use("/student", studentRouter);
app.use("/alumni", alumniRouter);
app.use("/college", collegeRouter);
app.use('/', indexRouter);
app.use('/post', postsRoutes);

app.listen(3000, () => {
    console.log("server running on http://localhost:3000");
});
