const { mongoose, Schema } = require('../config/mongoose-connection');

const collegeSchema = new Schema({
    fullname: String,
    domain: String,



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