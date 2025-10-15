import express from "express";
import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";
import fetch from "node-fetch";
import { FormData, Blob } from "formdata-node";

const app = express();
app.use(express.json({ limit: "10mb" }));

// Configura Cloudinary
const CLOUD_NAME = "da25a8gze";   // ← tu cloud name
const UPLOAD_PRESET = "unsigned"; // ← tu upload preset sin firma

app.post("/", async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return res.status(400).json({ error: "Missing HTML input" });

    // Lanzar navegador compatible con Vercel
    const executablePath = await chromium.executablePath;
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const buffer = await page.screenshot({ type: "png", fullPage: true });
    await browser.close();

    // Subir a Cloudinary
    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: "image/png" }));
    formData.append("upload_preset", UPLOAD_PRESET);

    const upload = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    const result = await upload.json();

    if (!result.secure_url) throw new Error(result.error?.message || "Upload failed");

    return res.json({ url: result.secure_url });
  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("✅ Server running"));
export default app;
