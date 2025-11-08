// src/server.js
import express from "express"
import http from "http"
import { Server } from "socket.io"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import jwt from "./utils/jwt.js"   // ✅ Add this import for token verification

// === Routes ===
import authRoutes from "./routes/auth.js"
import messageRoutes from "./routes/message.js"
import userRoutes from "./routes/user.js"

dotenv.config()

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// make io accessible in routes
app.set("io", io)

// === Middlewares ===
app.use(cors())
app.use(express.json())
app.use("/uploads", express.static("uploads"))

// === MongoDB Connection ===
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/secure_chat"
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err))

// === Routes ===
app.use("/api/auth", authRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/users", userRoutes)

// === Basic route ===
app.get("/", (req, res) => {
  res.send("Secure Chat Backend is running...")
})


// === ✅ Add this Socket.IO JWT verification before the connection block ===
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error("Authentication error"))

    const payload = jwt.verify(token, process.env.JWT_SECRET || "secretkey")
    socket.userId = payload.id
    next()
  } catch (err) {
    next(new Error("Authentication error"))
  }
})


// === Socket.IO ===
io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}, userId: ${socket.userId}`)

  socket.on("register-user", (userId) => {
    socket.join(userId)
    console.log(`User ${userId} joined their room`)
  })

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id)
  })
})

// === Start server ===
const PORT = process.env.PORT || 4000
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
