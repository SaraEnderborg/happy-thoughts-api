import cors from "cors";
import express from "express";
import listEndpoints from "express-list-endpoints";
import thoughtsData from "./data.json" with { type: "json" };

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

// Start defining your routes here
app.get("/", (req, res) => {
  const endpoints = listEndpoints(app);

  res.json({
    message: "Welcome to my Happy Thoughts API.",
    endpoints: endpoints,
  });
});

app.get("/thoughts", (req, res) => {
  const { minHearts, search, limit, sort } = req.query;
  let filteredThoughts = thoughtsData;

  if (minHearts) {
    filteredThoughts = filteredThoughts.filter(
      (thought) => thought.hearts >= Number(minHearts),
    );
  }

  if (search) {
    filteredThoughts = filteredThoughts.filter((thought) =>
      thought.message.toLowerCase().includes(search.toLowerCase()),
    );
  }

  if (sort === "createdAt") {
    filteredThoughts.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }

  if (limit) {
    filteredThoughts = filteredThoughts.slice(0, Number(limit));
  }

  res.json(filteredThoughts);
});

app.get("/thoughts/:id", (req, res) => {
  const { id } = req.params;
  const thought = thoughtsData.find((thought) => thought._id === id);

  if (!thought) {
    return res
      .status(404)
      .json({ error: `thought with id ${id} does not exist` });
  }

  res.json(thought);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
