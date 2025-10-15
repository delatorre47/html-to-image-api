import express from "express";
import chromium from "chrome-aws-lambda";
import fetch from "node-fetch";
import { FormData, Blob } from "formdata-node";

const app = express();
app.use(express.json({ limit: "10mb" }));

// 🔧 Configura tus datos de Cloudinary
const CLOUD_NAME = "da25a8gze";      // ← cambia por el tuyo
const UPLOAD_PRESET = "unsigned";    // ← preset sin firma

app.post("/", async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return res.status(400).json({ error: "Missing HTML input" });

    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const buffer = await page.screenshot({ type: "png", fullPage: true });
    await browser.close();

    // 📤 Subimos a Cloudinary
    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: "image/png" }));
    formData.append("upload_preset", UPLOAD_PRESET);

    const upload = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    const result = await upload.json();

    if (!result.secure_url) throw new Error(result.error?.message || "Cloudinary upload failed");

    return res.json({ url: result.secure_url });
  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("✅ Server running"));
export default app;
