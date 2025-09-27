const { mongoose, Schema } = require('../config/mongoose-connection');

const collegeSchema = new Schema({
    role: String,
    fullname: String,
    domain: String,
    email: String,


    alumni: {
        type: Array,
        default: []
    },

    image: {
        type: Buffer,
        default: "/public/images/uploads/default.jpg"
    },
    password: {
        type: String,
        required: true
    },

})



module.exports = mongoose.model("college", collegeSchema);