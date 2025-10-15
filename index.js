import express from "express";
import chromium from "playwright-aws-lambda";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "10mb" }));

// 🧠 Configura tus credenciales de Cloudinary
const CLOUD_NAME = "da25a8gze";          // ← pon tu cloud name
const UPLOAD_PRESET = "unsigned";        // ← o el preset que tengas configurado

app.post("/", async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return res.status(400).json({ error: "Missing HTML input" });

    // Renderizamos el HTML a PNG usando playwright-aws-lambda
    const browser = await chromium.launchChromium();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const buffer = await page.screenshot({ type: "png", fullPage: true });
    await browser.close();

    // Subimos a Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append("file", `data:image/png;base64,${buffer.toString("base64")}`);
    formData.append("upload_preset", UPLOAD_PRESET);

    const uploadResponse = await fetch(cloudinaryUrl, {
      method: "POST",
      body: formData
    });

    const uploadResult = await uploadResponse.json();

    if (!uploadResult.secure_url) throw new Error("Cloudinary upload failed");

    res.status(200).json({ url: uploadResult.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
export default app;
