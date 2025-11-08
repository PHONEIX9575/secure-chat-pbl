// src/routes/user.js
import express from "express"
import User from "../models/User.js"
import authMiddleware from "../middleware/auth.js"

const router = express.Router()

// Protect routes
router.use(authMiddleware)

// === GET /api/users/search?query=<text> ===
router.get("/search", async (req, res) => {
  try {
    const q = req.query.query || ""
    const users = await User.find({
      username: { $regex: q, $options: "i" },
      _id: { $ne: req.user.id }
    }).select("_id username")
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Server error" })
  }
})

// === GET /api/users === (list all except self)
router.get("/", async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select("_id username")
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Server error" })
  }
})

export default router
