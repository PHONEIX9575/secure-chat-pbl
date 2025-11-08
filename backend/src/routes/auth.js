// src/routes/auth.js
import express from "express";
import bcrypt from "bcrypt";
import { sign, verify } from "../utils/jwt.js";
import User from "../models/User.js";

const router = express.Router();

// === POST /api/auth/register ===
router.post("/register", async (req, res) => {
  try {
    const { username, password, publicKey = "", privateKeyEncrypted = "" } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: "Username and password are required" });

    const existing = await User.findOne({ username });
    if (existing)
      return res.status(400).json({ error: "Username already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      passwordHash,
      publicKey,
      privateKeyEncrypted
    });

    // ✅ Use unified sign helper
    const token = sign({ id: user._id, username: user.username });

    res.status(201).json({
      success: true,
      token,
      message: "User registered successfully"
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// === POST /api/auth/login ===
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Invalid password" });

    // ✅ Use same helper for token creation
    const token = sign({ id: user._id, username: user.username });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        publicKey: user.publicKey,
        privateKeyEncrypted: user.privateKeyEncrypted
      }
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// === GET /api/auth/:id/publicKey ===
router.get("/:id/publicKey", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ publicKey: user.publicKey });
  } catch (err) {
    console.error("❌ Public key fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// === GET /api/auth/me/privateKey ===
router.get("/me/privateKey", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });

    const token = authHeader.split(" ")[1];
    const payload = verify(token); // ✅ Uses same secret consistently

    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ privateKeyEncrypted: user.privateKeyEncrypted });
  } catch (err) {
    console.error("❌ Private key fetch error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;
