import express from "express";
import multer from "multer";
import { destroy, index, store, storeChunk, view } from "../controllers/imageUploadController";
import bodyParser from "body-parser";

const router = express.Router();

// Configure multer for handling file uploads
const upload = multer({
    storage: multer.memoryStorage(), // Store chunks in memory
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per chunk (adjust as needed)
    },
});

// Routes configuration
router.get("/upload", index); // List all uploads
router.get("/upload/:id", upload.none(), view); // View/download specific file
router.put("/upload/:id", bodyParser.raw({ type: '*/*', limit: '10gb' }), upload.single('chunk'), storeChunk); // Handle chunk uploads
router.head("/upload/:id", bodyParser.raw({ type: '*/*', limit: '10gb' }), upload.single('chunk'), storeChunk); // Handle HEAD requests for chunk status
router.delete("/upload/:id", upload.none(), destroy); // Delete upload
router.post('/upload', upload.none(), store); // Initialize upload (metadata only)

export default router;