
const { mongoose, Schema } = require('../config/mongoose-connection');

const alumniSchema = new Schema({
    role: String,
    name: {
        type: String,

        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    graduationYear: {
        type: Number,

    },
    branch: {
        type: String,

    },
    currentCompany: {
        type: String,
        default: ""
    },
    designation: {
        type: String,
        default: ""
    },
    location: {
        type: String,
        default: ""
    },
    bio: {
        type: String,
        maxlength: 500,
        default: ""
    },
    linkedin: {
        type: String,
        default: ""
    },
    // For role-based access
    role: {
        type: String,
        enum: ["alumni", "student", "admin"],
        default: "alumni"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    image: {
        type: Buffer,

    },
    invitations: {
        type: Array,
        default: []
    },
    posts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            default: []
        }
    ],
    status: {
        type: String,
        enum: ['Pending', 'Verified', 'Rejected'],
        default: 'Pending'
    },

});





module.exports = mongoose.model("alumni", alumniSchema);