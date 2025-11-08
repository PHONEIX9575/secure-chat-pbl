import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey"

export function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

export function verify(token) {
  return jwt.verify(token, JWT_SECRET)
}

export default { sign, verify }