import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
const router = Router();
// Ensure uploads directory exists in apps/api
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
// @route   POST /api/upload
// @desc    Upload an image (base64 or data URL) and save to disk
// @access  Private (LOTTERY_MANAGER, SUPER_ADMIN)
router.post("/", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"), async (req, res) => {
    try {
        const { image, base64Data: altData, filename: originalName } = req.body;
        const rawImage = image || altData;
        if (!rawImage || typeof rawImage !== "string") {
            return res.status(400).json({ message: "Image data is required (base64 data URL)" });
        }
        // Match base64 data URL: e.g. "data:image/jpeg;base64,/9j/4AAQ..."
        const matches = rawImage.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
        let ext = "jpg";
        let base64Data = rawImage;
        if (matches && matches.length === 3) {
            ext = matches[1].replace("+xml", "").toLowerCase();
            if (ext === "jpeg")
                ext = "jpg";
            base64Data = matches[2];
        }
        else {
            // If raw base64 without prefix, detect or default to originalName extension
            if (originalName && originalName.includes(".")) {
                ext = originalName.split(".").pop()?.toLowerCase() || "jpg";
            }
        }
        const buffer = Buffer.from(base64Data, "base64");
        // Limit file size to 25MB
        if (buffer.length > 25 * 1024 * 1024) {
            return res.status(400).json({ message: "Image file exceeds 25MB limit" });
        }
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
        const safeFilename = `car-${uniqueSuffix}.${ext}`;
        const filePath = path.join(uploadsDir, safeFilename);
        await fs.promises.writeFile(filePath, buffer);
        // Construct public URL
        const host = req.get("host") || "localhost:5000";
        const protocol = req.protocol === "https" ? "https" : "http";
        const fileUrl = `${protocol}://${host}/uploads/${safeFilename}`;
        res.status(201).json({
            success: true,
            url: fileUrl,
            filename: safeFilename,
            sizeBytes: buffer.length,
        });
    }
    catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Failed to process image upload" });
    }
});
export default router;
