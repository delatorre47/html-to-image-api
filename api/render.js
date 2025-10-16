import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {
  try {
    const { html } = req.method === "POST" ? req.body : { html: "<h1>No HTML</h1>" };

    const executablePath = await chromium.executablePath;
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1080, height: 1920 },
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const imageBuffer = await page.screenshot({ type: "png", fullPage: true });
    await browser.close();

    res.setHeader("Content-Type", "image/png");
    res.send(imageBuffer);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
}
