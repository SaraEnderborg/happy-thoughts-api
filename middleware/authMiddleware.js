import { User } from "../models/User.js";

export const authenticateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      accessToken: req.header("Authorization").replace("Bearer ", ""),
    });

    if (user) {
      req.user = user;
      next();
    } else {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid or missing access token",
        loggedOut: true,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
