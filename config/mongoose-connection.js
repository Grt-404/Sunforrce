require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URL = process.env.ATLASDB_URL;

mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to DB");
}).catch((err) => {
    console.log(err);
});


const Schema = mongoose.Schema;

module.exports = { mongoose, Schema };
