import express from "express";
import chromium from "playwright-aws-lambda";
import fetch from "node-fetch";
import { FormData, Blob } from "formdata-node";
import { fileFromSync } from "formdata-node/file-from-path";

const app = express();
app.use(express.json({ limit: "10mb" }));

// Configura tu Cloudinary
const CLOUD_NAME = "da25a8gze";          // ← tu cloud name
const UPLOAD_PRESET = "unsigned";        // ← tu upload preset (modo sin firma)

app.post("/", async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return res.status(400).json({ error: "Missing HTML input" });

    // Renderizamos el HTML a PNG
    const browser = await chromium.launchChromium();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const buffer = await page.screenshot({ type: "png", fullPage: true });
    await browser.close();

    // Preparamos subida a Cloudinary
    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: "image/png" }));
    formData.append("upload_preset", UPLOAD_PRESET);

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    const uploadResult = await uploadResponse.json();

    if (!uploadResult.secure_url) {
      throw new Error(uploadResult.error?.message || "Cloudinary upload failed");
    }

    // Devuelve URL directa
    res.status(200).json({ url: uploadResult.secure_url });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("✅ Server ready on port 3000"));
export default app;
