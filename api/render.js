import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";
import fetch from "node-fetch";
import { FormData, Blob } from "formdata-node";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { html } = req.body;
    if (!html) return res.status(400).json({ error: "Missing HTML input" });

    const executablePath = await chromium.executablePath;

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1080, height: 1920 },
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const buffer = await page.screenshot({ type: "png" });
    await browser.close();

    // Subir a Cloudinary
    const CLOUD_NAME = "da25a8gze";
    const UPLOAD_PRESET = "unsigned";

    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: "image/png" }));
    formData.append("upload_preset", UPLOAD_PRESET);

    const upload = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    const result = await upload.json();
    if (!result.secure_url) throw new Error(result.error?.message || "Upload failed");

    return res.status(200).json({ url: result.secure_url });
  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
