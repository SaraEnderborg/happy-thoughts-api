import express, { response } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/User.js";

const router = express.Router();

router.post("/user-signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email, and password are required",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An error occurred when creating the user",
      });
    }

    const salt = bcrypt.genSaltSync();
    const hashedPassword = bcrypt.hashSync(password, salt);
    const user = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      response: {
        email: user.email,
        userId: user._id,
        accessToken: user.accessToken,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to create user",
      response: error,
    });
  }
});

router.post("/user-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user && bcrypt.compareSync(password, user.password)) {
      res.json({
        success: true,
        message: "Login successful",
        response: {
          email: user.email,
          userId: user._id,
          accessToken: user.accessToken,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
        response: null,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Login failed",
      response: error,
    });
  }
});

export default router;
