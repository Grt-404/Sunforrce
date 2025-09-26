const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const isLoggedIn = require("../middlewares/isLoggedin");
const Alumni = require('../models/alumni-model');
const Student = require("../models/student-model");
const multer = require("multer");
const path = require("path");


const fs = require("fs");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const stream = require("stream");

const { Parser } = require('json2csv');



const storage = multer.memoryStorage();

const upload = multer({ storage });


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
    res.render("college/dashboard");
})

router.post("/login", (req, res) => {
    req.body.role = "college";
    authController.loginUser(req, res);
});



router.get('/alumni', async (req, res) => {
    try {
        // Get filter criteria from the URL's query parameters
        const { search, department, year } = req.query;

        // --- DATABASE LOGIC (Updated for your schema) ---
        const filterQuery = { role: 'alumni' }; // Base query to only get alumni
        
        // Only add to query if search term is not empty
        if (search && search.trim() !== '') {
            filterQuery.$or = [
                { name: { $regex: search.trim(), $options: 'i' } },
                { email: { $regex: search.trim(), $options: 'i' } }
            ];
        }

        // Only add to query if department is selected and not empty
        if (department && department.trim() !== '') {
            // Searches the 'branch' field in your database
            filterQuery.branch = department;
        }

        // Only add to query if year is a valid number
        if (year && !isNaN(parseInt(year))) {
            // Searches the 'graduationYear' field
            filterQuery.graduationYear = parseInt(year);
        }

        const filteredAlumni = await Alumni.find(filterQuery).sort({ graduationYear: -1 });
        
        
        res.render('college/alumni', { 
            alumni: filteredAlumni,
            query: req.query 
        });

    } catch (error) {
        console.error("Error fetching alumni:", error);
        res.status(500).send("Server Error");
    }
});


router.get("/upload/csv" , (req,res)=>{
    res.render("college/uploadcsv");
});
router.get("/upload/sheet" , (req,res)=>{
    res.render("college/uploadsheet");
});




// CSV Upload Route
router.post("/upload/csv", upload.single("alumni-csv"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded.");
        }

        const results = [];

        // Convert buffer to readable stream
        const readable = new stream.Readable();
        readable._read = () => {}; // no-op
        readable.push(req.file.buffer);
        readable.push(null);

        readable
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", async () => {
                try {
                    // Map CSV rows to Alumni schema
                    const alumniDocs = results.map(row => ({
                        role: "alumni",
                        name: row.name?.trim(),
                        email: row.email?.toLowerCase(),
                        password: row.password || "default123", // ⚠️ hash in real system
                        branch: row.branch || "",
                        graduationYear: parseInt(row.graduationYear) || null,
                        currentCompany: row.currentCompany || "",
                        designation: row.designation || "",
                        location: row.location || "",
                        linkedin: row.linkedin || "",
                        status: row.status || "Verified"
                    }));

                    // Upsert into MongoDB
                    for (let doc of alumniDocs) {
                        await Alumni.updateOne(
                            { email: doc.email },
                            { $set: doc },
                            { upsert: true }
                        );
                    }

                    res.redirect("/college/alumni");
                } catch (err) {
                    console.error("Error saving alumni:", err);
                    res.status(500).send("Error processing CSV file");
                }
            })
            .on("error", (err) => {
                console.error("CSV parse error:", err);
                res.status(500).send("Error parsing CSV file");
            });

    } catch (error) {
        console.error("Error uploading CSV:", error);
        res.status(500).send("Server Error");
    }
});


router.post("/upload/sheet", upload.single("alumni-sheet"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded.");
        }

        // Read Excel buffer
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0]; // take first sheet
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const rows = XLSX.utils.sheet_to_json(sheet);

        // Map rows to Alumni schema
        const alumniDocs = rows
            .filter(row => row.name && row.email) // skip invalid rows
            .map(row => ({
                role: "alumni",
                name: row.name.trim(),
                email: row.email.toLowerCase(),
                password: row.password || "default123", // ⚠️ hash in real system
                branch: row.branch || "",
                graduationYear: parseInt(row.graduationYear) || null,
                currentCompany: row.currentCompany || "",
                designation: row.designation || "",
                location: row.location || "",
                linkedin: row.linkedin || "",
                status: row.status || "Verified"
            }));

        // Upsert in MongoDB
        for (let doc of alumniDocs) {
            await Alumni.updateOne(
                { email: doc.email },
                { $set: doc },
                { upsert: true }
            );
        }

        res.redirect("/college/alumni");
    } catch (error) {
        console.error("Error uploading Excel:", error);
        res.status(500).send("Server Error");
    }
});

router.get('/download/csv', async (req, res) => {
    try {
        const alumni = await Alumni.find({ role: 'alumni' }).lean();

        if (alumni.length === 0) {
            return res.status(404).send("No alumni data found");
        }

        const fields = ['name','email','password','branch','graduationYear','currentCompany','designation','location','linkedin','status'];
        const parser = new Parser({ fields });
        const csvData = parser.parse(alumni);

        res.header('Content-Type', 'text/csv');
        res.attachment('alumni_data.csv');
        return res.send(csvData);

    } catch (error) {
        console.error("Error generating CSV:", error);
        res.status(500).send("Server Error");
    }
});

router.get('/download/excel', async (req, res) => {
    try {
        const alumni = await Alumni.find({ role: 'alumni' }).lean();

        if (alumni.length === 0) {
            return res.status(404).send("No alumni data found");
        }

        const worksheet = XLSX.utils.json_to_sheet(alumni);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Alumni');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment('alumni_data.xlsx');
        res.send(buffer);

    } catch (error) {
        console.error("Error generating Excel:", error);
        res.status(500).send("Server Error");
    }
});

router.get('/jobs', (req, res) => {
    // This temporary data will be replaced with a database query later
    const sampleJobs = [
        { title: 'Frontend Developer', company: 'Google', location: 'Bengaluru', type: 'Full-time', postedAgo: '2d ago' },
        { title: 'Backend Engineering Intern', company: 'Microsoft', location: 'Remote', type: 'Internship', postedAgo: '5d ago' },
        { title: 'Product Manager', company: 'Amazon', location: 'Pune', type: 'Full-time', postedAgo: '1w ago' },
        { title: 'Data Analyst', company: 'Tata Consultancy Services', location: 'Ahmedabad', type: 'Full-time', postedAgo: '1w ago' },
        { title: 'UX/UI Design Intern', company: 'Swiggy', location: 'Remote', type: 'Internship', postedAgo: '2w ago' },
        { title: 'Cloud Solutions Architect', company: 'Oracle', location: 'Bengaluru', type: 'Contract', postedAgo: '3w ago' },
    ];

    res.render('college/jobIntern', {
        jobs: sampleJobs
    });
});

// NEW: Route to render the 'Post New Job' page
router.get('/jobs/new', (req, res) => {
    // This will eventually render a form for creating a new job post.
    // For now, it can render a placeholder or a new EJS file.
    res.send("This is the page to create a new job posting.");
});


router.get('/campaigns', (req, res) => {
    // This is temporary data. You'll fetch this from your database later.
    const sampleCampaigns = [
        { 
            title: 'Tech Lab Modernization', 
            raised: 850000, 
            goal: 1500000, 
            daysLeft: 45,
            imageUrl: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&q=80'
        },
        { 
            title: 'Student Scholarship Fund', 
            raised: 210000, 
            goal: 500000, 
            daysLeft: 60,
            imageUrl: 'https://newhorizonindia.edu/wp-content/uploads/2024/08/download-15-1024x683.png'
        },
        { 
            title: 'Campus Green Initiative', 
            raised: 95000, 
            goal: 200000, 
            daysLeft: 30,
            imageUrl: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&q=80'
        },
    ];
    
    const donationStats = {
        totalRaised: 1155000,
        totalDonors: 478,
    };

    res.render('college/donations', {
        campaigns: sampleCampaigns,
        stats: donationStats
    });
});
router.get('/campaigns/new', (req, res) => {
    res.send("This is the page to create a new campaign.");
});


router.get('/verification', async (req, res) => {
    try {
        // Fetch all alumni with a 'Pending' status
        const pendingAlumni = await Alumni.find({ status: 'Pending' });

        // Fetch all students with a 'Pending' status
        const pendingStudents = await Student.find({ status: 'Pending' });

        res.render('college/verification', {
            alumniRequests: pendingAlumni,
            studentRequests: pendingStudents
        });
    } catch (error) {
        console.error("Error fetching verification requests:", error);
        res.status(500).send("Server Error");
    }
});

router.post('/verification/approve/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.query; 

        if (role === 'alumni') {
            await Alumni.findByIdAndUpdate(id, { status: 'Verified' });
        } else if (role === 'student') {
            await Student.findByIdAndUpdate(id, { status: 'Verified' });
        }
        
        console.log(`Approved ${role} with ID: ${id}`);
        res.redirect('/college/verification');
    } catch (error) {
        console.error("Error approving request:", error);
        res.status(500).send("Server Error");
    }
});

// POST route for rejecting a request
router.post('/verification/reject/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.query;

        if (role === 'alumni') {
            await Alumni.findByIdAndUpdate(id, { status: 'Rejected' });
        } else if (role === 'student') {
            await Student.findByIdAndUpdate(id, { status: 'Rejected' });
        }

        console.log(`Rejected ${role} with ID: ${id}`);
        res.redirect('/college/verification');
    } catch (error) {
        console.error("Error rejecting request:", error);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
