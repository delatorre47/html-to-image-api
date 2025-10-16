import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";
import fetch from "node-fetch";
import { FormData, Blob } from "formdata-node";

const CLOUD_NAME = "da25a8gze";      // ← tu Cloudinary Cloud Name
const UPLOAD_PRESET = "unsigned";    // ← tu upload preset sin firma

export default async function handler(req, res) {
  try {
    // Aceptar tanto POST como GET (por si lo pruebas desde navegador)
    if (req.method !== "POST") {
      return res.status(200).send("✅ API lista. Usa POST con JSON { html }");
    }

    const { html } = req.body;
    if (!html) return res.status(400).json({ error: "Missing HTML input" });

    const executablePath = await chromium.executablePath;

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1080, height: 1920 },
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const buffer = await page.screenshot({
      type: "png",
      fullPage: false,
      clip: { x: 0, y: 0, width: 1080, height: 1920 },
    });

    await browser.close();

    // Subida a Cloudinary
    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: "image/png" }));
    formData.append("upload_preset", UPLOAD_PRESET);

    const upload = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    const result = await upload.json();

    if (!result.secure_url)
      throw new Error(result.error?.message || "Upload failed");

    return res.status(200).json({ url: result.secure_url });
  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
