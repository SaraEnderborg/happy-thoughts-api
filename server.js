import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import userRoutes from "./routes/userRoutes.js";
import thoughtRoutes from "./routes/thoughtRoutes.js";
import listEndpoints from "express-list-endpoints";

const mongoUrl = process.env.MONGO_URL;

try {
  await mongoose.connect(mongoUrl);
  console.log("Connected to MongoDB");
} catch (error) {
  console.error("MongoDB connection error:", error);
  process.exit(1);
}

const port = process.env.PORT || 8080;
const app = express();

app.use(cors());
app.use(express.json());

const endpoints = listEndpoints(app);

app.get("/", (_req, res) => {
  res.json({
    message: "Welcome to my Happy Thoughts API.",
    endpoints,
  });
});

app.use("/users", userRoutes);
app.use("/thoughts", thoughtRoutes);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
