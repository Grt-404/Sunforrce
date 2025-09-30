// grt-404/alumni/Alumni-67220b3b65b5ce14be27a370e7b6d58ac93eb7c3/models/eventRequest-model.js

const mongoose = require('mongoose');

const eventRequestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'student', required: true },
  // upvotes and upvotedBy fields have been removed
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('EventRequest', eventRequestSchema);