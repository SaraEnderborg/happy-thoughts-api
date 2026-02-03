import mongoose, { Schema } from "mongoose";

// Mongoose schema and model for Thought
const thoughtsSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, "Message is required"],
    trim: true,
    minlength: [5, "Message must be at least 5 characters"],
    maxlength: [140, "Message cannot be longer than 140 characters"],
  },
  hearts: {
    type: Number,
    default: 0,
    min: [0, "Hearts cannot be negative"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Thoughts = mongoose.model("Thoughts", thoughtsSchema);
