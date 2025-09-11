
const { mongoose, Schema } = require('../config/mongoose-connection');

const alumniSchema = new Schema({
    name: {
        type: String,
        required: true,
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
        required: true
    },
    branch: {
        type: String,
        required: true
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
    }

});





module.exports = mongoose.model("alumni", alumniSchema);