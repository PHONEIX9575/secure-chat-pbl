// src/routes/message.js
import express from "express"
import multer from "multer"
import path from "path"
import Message from "../models/Message.js"
import authMiddleware from "../middleware/auth.js"
import { fileURLToPath } from "url"
import { dirname } from "path"

const router = express.Router()

// Enable __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 🔐 Protect routes with auth
router.use(authMiddleware)

// === GET /api/messages?with=<userId> ===
router.get("/", async (req, res) => {
  try {
    const other = req.query.with
    if (!other) return res.status(400).json({ error: "Missing ?with param" })

    const messages = await Message.find({
      $or: [
        { from: req.user.id, to: other },
        { from: other, to: req.user.id },
      ],
    }).sort({ timestamp: 1 })

    res.json(messages)
  } catch (err) {
    console.error("❌ Message fetch error:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// === POST /api/messages ===
router.post("/", async (req, res) => {
  try {
    const { to, content } = req.body
    if (!to || !content)
      return res.status(400).json({ error: "Missing fields" })

    const newMsg = new Message({
      from: req.user.id,
      to,
      content,
      timestamp: new Date()
    })
    await newMsg.save()

    // Broadcast to both sender and receiver
    const io = req.app.get("io")
    io.to(to.toString()).emit("message", newMsg)
    io.to(req.user.id.toString()).emit("message", newMsg)

    res.json(newMsg)
  } catch (err) {
    console.error("❌ Send message error:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// === File upload ===
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads")

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
})

const upload = multer({ storage })

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const url = `/uploads/${req.file.filename}`
    res.json({ url, filename: req.file.originalname })
  } catch (err) {
    console.error("❌ Upload error:", err)
    res.status(500).json({ error: "Upload failed" })
  }
})

export default router
