//adminRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();




// Admin Registration (only for setup purpose)
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ username, password: hashedPassword });
    await newAdmin.save();
    res.json({ message: "Admin registered successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, username: admin.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
