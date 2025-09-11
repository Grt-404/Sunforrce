const mongoose = require('mongoose');

const MONGO_URL = 'mongodb://127.0.0.1:27017/SIH';

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
