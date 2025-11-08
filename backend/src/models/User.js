// src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  publicKey: { type: String },
  privateKeyEncrypted: {
  iv: { type: String, required: true },
  ct: { type: String, required: true }
},
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
export default User;
