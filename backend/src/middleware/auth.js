// src/middleware/auth.js
import * as jwt from "../utils/jwt.js";

export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT verify error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
}
