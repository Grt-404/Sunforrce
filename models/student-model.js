const { mongoose, Schema } = require('../config/mongoose-connection');

const studentSchema = mongoose.Schema({
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

})
module.exports = mongoose.model("student", studentSchema);
