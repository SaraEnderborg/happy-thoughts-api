import express from "express";
import mongoose from "mongoose";
import { Thoughts } from "../models/Thoughts.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all thoughts with optional filters
router.get("/", async (req, res) => {
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
    let thoughtsQuery = Thoughts.find(query).sort(sortOptions);

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
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        response: null,
        message: "Invalid ID format",
      });
    }

    const thought = await Thoughts.findById(id);

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

router.post("/", authenticateUser, async (req, res) => {
  const body = req.body;

  try {
    const newThought = new Thoughts({
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

router.delete("/:id", authenticateUser, async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        response: null,
        message: "Invalid ID format",
      });
    }

    const deletedThought = await Thoughts.findByIdAndDelete(id);

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
    res.status(500).json({
      success: false,
      response: null,
      message: "Failed to delete thought",
    });
  }
});

router.patch("/:id", authenticateUser, async (req, res) => {
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
    const updatedThought = await Thoughts.findByIdAndUpdate(
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

router.patch("/:id/like", async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        response: null,
        message: "Invalid ID format",
      });
    }

    const updatedThought = await Thoughts.findByIdAndUpdate(
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

export default router;
