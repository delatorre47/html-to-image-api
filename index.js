import express from "express";
import { chromium } from "playwright-core";

const app = express();
app.use(express.json({ limit: "10mb" }));

app.post("/", async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return res.status(400).json({ error: "Missing HTML input" });

    const browser = await chromium.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const buffer = await page.screenshot({ type: "png", fullPage: true });
    await browser.close();

    res.status(200).json({
      image: `data:image/png;base64,${buffer.toString("base64")}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));

export default app;
