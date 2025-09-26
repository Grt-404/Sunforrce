const { mongoose, Schema } = require('../config/mongoose-connection');

const studentSchema = mongoose.Schema({
    role: String,
    fullname: String,
    email: String,
    setrequests: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "alumni"
            },

        }
    ],




    // isadmin: Boolean,
    acceptedRequests: {
        type: Array,
        default: []
    },
    contact: Number,
    image: {
        type: Buffer,
        required: false
    },
    password: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Verified', 'Rejected'],
        default: 'Pending'
    },

})
module.exports = mongoose.model("student", studentSchema);
