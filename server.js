import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import userRoutes from "./routes/userRoutes.js";
import thoughtRoutes from "./routes/thoughtRoutes.js";

import listEndpoints from "express-list-endpoints";
import thoughtsData from "./data.json" with { type: "json" };

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/happy-thoughts";

try {
  await mongoose.connect(mongoUrl);
  console.log("Connected to MongoDB");
} catch (error) {
  console.error("MongoDB connection error:", error);
  process.exit(1);
}

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
//const port = 8080; // This would break on most hosting platforms!
const port = process.env.PORT || 8080;
const app = express();

//middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  const endpoints = listEndpoints(app);
  res.json({
    message: "Welcome to my Happy Thoughts API.",
    endpoints: endpoints,
  });
});

app.use("/users", userRoutes);
app.use("/thoughts", thoughtRoutes);

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
