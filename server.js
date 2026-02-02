import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";
import listEndpoints from "express-list-endpoints";
import thoughtsData from "./data.json" with { type: "json" };

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/auth";

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
app.use(cors());
app.use(express.json());

// Mongoose schema and model for User
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      required: [true, "Username is required"],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      required: true,
    },
    password: { type: String, required: true, minlength: 8 },
    accessToken: {
      type: String,
      default: () => crypto.randomBytes(128).toString("hex"),
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

const authenticateUser = async (req, res, next) => {
  const authHeader = req.header("Authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Authorization token missing" });
  }

  const user = await User.findOne({ accessToken: token });

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid authorization token" });
  }

  req.user = user;
  next();
};

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

app.get("/secrets", authenticateUser, (req, res) => {
  res.json({
    success: true,
    secret: "this is a secret message",
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
    },
  });
});

// Get all thoughts (with optional filtering and sorting)
// Query parameters:
// - minHearts: filter thoughts with at least this many hearts
// - search: filter thoughts containing this text (case-insensitive)
// - sort: if set to "createdAt", sorts by newest first
// - limit: limits the number of results returned

app.get("/thoughts", async (req, res) => {
  const { minHearts, search, limit, sort } = req.query;

  const query = {};

  if (minHearts) {
    query.hearts = { $gte: Number(minHearts) }; //$gte-greater than or equal to
  }
  if (search) {
    query.message = { $regex: search, $options: "i" }; //i for case-insensitive, regex=regular expression) for pattern matching, options for additional settings
  }

  const sortOptions = sort === "createdAt" ? { createdAt: -1 } : {};

  try {
    let thoughtsQuery = Thought.find(query).sort(sortOptions);

    if (limit) {
      thoughtsQuery = thoughtsQuery.limit(Number(limit));
    }

    const thoughts = await thoughtsQuery;

    if (thoughts.length === 0) {
      return res.status(404).json({
        success: false,
        response: [],
        message: "No thoughts found matching the criteria",
      });
    }
    return res.status(200).json({
      success: true,
      response: thoughts,
      message: "Thoughts retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      response: [],
      message: "An error occurred while retrieving thoughts",
    });
  }
});

// Get a single thought by id
app.get("/thoughts/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        response: null,
        message: "Invalid ID format",
      });
    }

    const thought = await Thought.findById(id);

    if (!thought) {
      return res.status(404).json({
        success: false,
        response: null,
        message: "Thought not found",
      });
    }

    return res.status(200).json({
      success: true,
      response: thought,
      message: "Thought retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      response: null,
      message: "An error occurred while retrieving the thought",
    });
  }
});

app.post("/users", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email, and password are required",
      });
    }

    const salt = bcrypt.genSaltSync();
    const user = new User({
      username,
      email,
      password: bcrypt.hashSync(password, salt),
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      userId: user._id,
      accessToken: user.accessToken,
    });
  } catch (error) {
    // Duplicate key error from MongoDB (unique constraints)
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Username or email already exists",
      });
    }
    return res.status(400).json({
      success: false,
      message: "An error occurred while creating the user",
    });
  }
});
// TODO: fixa bugg med login/ secrets accesstoken
app.post("/sessions", async (req, res) => {
  const { username, password, email } = req.body;

  const user = await User.findOne({ email: (email || "").toLowerCase() });

  if (user && bcrypt.compareSync(password, user.password)) {
    res.status(200).json({
      success: true,
      message: "Login successful",
      userId: user._id,
      accessToken: user.accessToken,
    });
  } else {
    res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }
});

app.post("/thoughts", authenticateUser, async (req, res) => {
  const body = req.body;

  try {
    const newThought = new Thought({
      message: body.message,
      hearts: body.hearts,
    });

    const createdThought = await newThought.save();

    return res.status(201).json({
      success: true,
      response: createdThought,
      message: "Thought created successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      response: null,
      message: error.message,
    });
  }
});

app.delete("/thoughts/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        response: null,
        message: "Invalid ID format",
      });
    }

    const deletedThought = await Thought.findByIdAndDelete(id);

    if (!deletedThought) {
      return res.status(404).json({
        success: false,
        response: null,
        message: "Thought not found",
      });
    }

    return res.status(200).json({
      success: true,
      response: deletedThought,
      message: "Thought deleted successfully",
    });
  } catch (error) {
    console.log("Delete error:", error);
    return res.status(500).json({
      success: false,
      response: null,
      message: "Failed to delete thought",
    });
  }
});

app.patch("/thoughts/:id", async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      response: null,
      message: "Message is required for update",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      response: null,
      message: "Invalid ID format",
    });
  }

  try {
    const updatedThought = await Thought.findByIdAndUpdate(
      id,
      { message },
      { new: true, runValidators: true },
    );

    if (!updatedThought) {
      return res.status(404).json({
        success: false,
        response: null,
        message: "Thought not found",
      });
    }

    return res.status(200).json({
      success: true,
      response: updatedThought,
      message: "Thought updated successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      response: null,
      message: error.message,
    });
  }
});

app.patch("/thoughts/:id/like", async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        response: null,
        message: "Invalid ID format",
      });
    }

    const updatedThought = await Thought.findByIdAndUpdate(
      id,
      { $inc: { hearts: 1 } }, // $inc is a MongoDB operator, increments the hearts field by 1 and saves the updated value in the database
      { new: true, runValidators: true },
    );

    if (!updatedThought) {
      return res.status(404).json({
        success: false,
        response: null,
        message: "Thought not found",
      });
    }
    return res.status(200).json({
      success: true,
      response: updatedThought,
      message: "Thought liked successfully",
    });
  } catch (error) {
    console.log("LIKE error:", error);
    return res.status(500).json({
      success: false,
      response: null,
      message: "An error occurred while liking the thought",
    });
  }
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
