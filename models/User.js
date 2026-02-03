import mongoose, { Schema } from "mongoose";
import crypto from "crypto";

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      default: () => crypto.randomBytes(128).toString("hex"),
    },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", UserSchema);
