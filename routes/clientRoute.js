import express from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import Client from "../models/Client.js";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();
const router = express.Router();

// =============================
// ☁️ Cloudinary Configuration
// =============================
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// =============================
// 📂 Multer Temporary Storage
// =============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"), // temporary folder
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

// =============================
// 🟢 CLIENT REGISTER
// =============================
router.post("/register", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password)
      return res.status(400).json({ message: "Mobile and password are required" });

    const existing = await Client.findOne({ mobile });
    if (existing)
      return res.status(400).json({ message: "Client already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newClient = new Client({
      mobile,
      password: hashedPassword,
    });

    await newClient.save();
    res.status(201).json({ message: "Client registered successfully", client: newClient });
  } catch (err) {
    console.error("Error registering client:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// =============================
// 🟢 CLIENT LOGIN
// =============================
router.post("/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const client = await Client.findOne({ mobile });

    if (!client)
      return res.status(400).json({ message: "Invalid mobile or password" });

    const isMatch = await bcrypt.compare(password, client.password || "");
    if (!isMatch)
      return res.status(400).json({ message: "Invalid mobile or password" });

    const token = jwt.sign({ id: client._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({ token, client });
  } catch (err) {
    console.error("Error logging in client:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// =============================
// 🟢 CREATE CLIENT (Upload to Cloudinary)
// =============================
router.post(
  "/create",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "licenseFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        firstName,
        applicationNo,
        mobile,
        password,
        relation,
        permanentAddress,
        temporaryAddress,
        dob,
        classOfVehicle,
        dateOfEnrolment,
        learnersLicenseNo,
        expiryOfLL,
        mainTestDate,
      } = req.body;

      if (!firstName || !mobile || !password)
        return res.status(400).json({ message: "Name, Mobile & Password required" });

      const existing = await Client.findOne({ mobile });
      if (existing)
        return res.status(400).json({ message: "Client already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);

      // Upload to Cloudinary
      let photoUrl = null;
      let licenseUrl = null;

      if (req.files.photo) {
        const result = await cloudinary.uploader.upload(req.files.photo[0].path, {
          folder: "driving_school/photos",
        });
        photoUrl = result.secure_url;
        fs.unlinkSync(req.files.photo[0].path);
      }

      if (req.files.licenseFile) {
        const result = await cloudinary.uploader.upload(req.files.licenseFile[0].path, {
          folder: "driving_school/licenses",
        });
        licenseUrl = result.secure_url;
        fs.unlinkSync(req.files.licenseFile[0].path);
      }

      const newClient = new Client({
        firstName,
        applicationNo,
        mobile,
        password: hashedPassword,
        relation,
        permanentAddress,
        temporaryAddress,
        dob,
        classOfVehicle,
        dateOfEnrolment,
        learnersLicenseNo,
        expiryOfLL,
        mainTestDate,
        photo: photoUrl,
        licenseFile: licenseUrl,
      });

      await newClient.save();
      res.status(201).json({ message: "Client created successfully", client: newClient });
    } catch (err) {
      console.error("Error creating client:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// =============================
// 🟢 GET ALL CLIENTS
// =============================
router.get("/", async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================
// 🟢 GET CLIENT BY ID
// =============================
router.get("/:id", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================
// 🟢 UPDATE CLIENT (Re-upload to Cloudinary)
// =============================
router.put(
  "/update/:id",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "licenseFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const updateData = { ...req.body };

      // Convert date strings to Date objects
      ["dob", "dateOfEnrolment", "expiryOfLL", "mainTestDate"].forEach((f) => {
        if (updateData[f]) updateData[f] = new Date(updateData[f]);
      });

      // Upload new files to Cloudinary
      if (req.files.photo) {
        const result = await cloudinary.uploader.upload(req.files.photo[0].path, {
          folder: "driving_school/photos",
        });
        updateData.photo = result.secure_url;
        fs.unlinkSync(req.files.photo[0].path);
      }

      if (req.files.licenseFile) {
        const result = await cloudinary.uploader.upload(req.files.licenseFile[0].path, {
          folder: "driving_school/licenses",
        });
        updateData.licenseFile = result.secure_url;
        fs.unlinkSync(req.files.licenseFile[0].path);
      }

      const updatedClient = await Client.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
      });

      if (!updatedClient)
        return res.status(404).json({ message: "Client not found" });

      res.json({ message: "Client updated successfully", updatedClient });
    } catch (err) {
      console.error("Error updating client:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

// =============================
// 🗑️ DELETE CLIENT
// =============================
router.delete("/:id", async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json({ message: "Client deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
