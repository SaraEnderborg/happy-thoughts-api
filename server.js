import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
console.log("RESET_DB:", process.env.RESET_DB);
import listEndpoints from "express-list-endpoints";
import thoughtsData from "./data.json" with { type: "json" };

const mongoUrl = process.env.MONGO_URL;
if (!mongoUrl) throw new Error("MONGO_URL is missing");
mongoose.connect(mongoUrl);

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
//const port = 8080; // This would break on most hosting platforms!
const port = process.env.PORT || 8080;
const app = express();

//middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

// Mongoose schema
const thoughtsSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, "Message is required"],
    trim: true,
    minLength: [5, "Message must be at least 5 characters"],
    maxLength: [140, "Message cannot be longer than 140 characters"],
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

const Thought = mongoose.model("Thought", thoughtsSchema);

if (process.env.RESET_DB === "true") {
  const seedDatabase = async () => {
    await Thought.deleteMany();

    thoughtsData.forEach((thought) => {
      new Thought({
        message: thought.message,
        hearts: thought.hearts,
        createdAt: thought.createdAt,
      }).save();
    });
  };

  console.log("seeding database");
  seedDatabase();
}
// === ROUTES ===

// Root endpoint: returns API documentation
// Lists all available endpoints using express-list-endpoints

app.get("/", (req, res) => {
  const endpoints = listEndpoints(app);

  res.json({
    message: "Welcome to my Happy Thoughts API.",
    endpoints: endpoints,
  });
});

// Get all thoughts (with optional filtering and sorting)
// Query parameters:
// - minHearts: filter thoughts with at least this many hearts
// - search: filter thoughts containing this text (case-insensitive)
// - sort: if set to "createdAt", sorts by newest first
// - limit: limits the number of results returned

app.get("/thoughts", (req, res) => {
  const { minHearts, search, limit, sort } = req.query;

  // start with all thoughts then apply filters
  let filteredThoughts = thoughtsData;

  // Filter by minimum hearts
  if (minHearts) {
    filteredThoughts = filteredThoughts.filter(
      (thought) => thought.hearts >= Number(minHearts),
    );
  }

  // Filter by search text ( case-insensitive)
  if (search) {
    filteredThoughts = filteredThoughts.filter((thought) =>
      thought.message.toLowerCase().includes(search.toLowerCase()),
    );
  }

  // Sort by createdAt (ex. newest first)
  if (sort === "createdAt") {
    filteredThoughts.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }

  // Limit the number of results
  if (limit) {
    filteredThoughts = filteredThoughts.slice(0, Number(limit));
  }

  res.json(filteredThoughts);
});

// Get a single thought by id
app.get("/thoughts/:id", (req, res) => {
  const { id } = req.params;

  // Find thought with matching id
  const thought = thoughtsData.find((thought) => thought._id === id);

  // If not found, return 404 error
  if (!thought) {
    return res
      .status(404)
      .json({ error: `thought with id ${id} does not exist` });
  }

  // Return the found thought
  res.json(thought);
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
