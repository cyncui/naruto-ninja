import fs from "node:fs/promises";
import { chromium } from "@playwright/test";
import { serve } from "./serve.mjs";

const server = await serve(0);
let browser;
try {
  browser = await chromium.launch();
  for (const [route, output] of [
    ["/", "dist/index.html"],
    ["/guide", "dist/guide/index.html"],
    ["/404", "dist/404.html"],
  ]) {
    const page = await browser.newPage({
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    });
    await page.goto(`http://127.0.0.1:${server.address().port}${route}`);
    await page.waitForSelector("h1");
    await page.evaluate(() => document.fonts.ready);
    const html = await page.content();
    await fs.mkdir(output.substring(0, output.lastIndexOf("/")), {
      recursive: true,
    });
    await fs.writeFile(
      output,
      "<!doctype html>\n" + html.replace(/^<!doctype html>/i, ""),
    );
    await page.close();
  }
  const siteUrl = process.env.VITE_SITE_URL?.replace(/\/$/, "");
  await fs.writeFile(
    "dist/robots.txt",
    `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ""}`,
  );
  if (siteUrl)
    await fs.writeFile(
      "dist/sitemap.xml",
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", "/guide"].map((route) => `<url><loc>${siteUrl}${route}</loc></url>`).join("")}</urlset>`,
    );
  console.log("Prerendered training room, field guide and 404.");
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
