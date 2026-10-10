import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch();
await mkdir("evidence/arena/round-two", { recursive: true });
try {
  for (let i = Number(process.argv[2] ?? 1); i <= 3; i++) {
    const port = 4270 + i;
    const server = spawn(
      process.execPath,
      [
        "node_modules/vite/bin/vite.js",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
      ],
      { cwd: `/tmp/arena-naruto-ninja/candidate-${i}`, stdio: "ignore" },
    );
    try {
      let ready = false;
      for (let n = 0; n < 60; n++) {
        try {
          ready = (await fetch(`http://127.0.0.1:${port}`)).ok;
        } catch {}
        if (ready) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      if (!ready) throw new Error(`Candidate ${i} did not start`);
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.goto(`http://127.0.0.1:${port}`);
      await page
        .getByRole("button", { name: /Techniques/ })
        .first()
        .click();
      await page.getByRole("searchbox").fill("Great Fireball");
      await page.getByRole("button", { name: /Great Fireball/ }).click();
      await page.screenshot({
        path: `evidence/arena/round-two/candidate-${i}-desktop.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: `evidence/arena/round-two/candidate-${i}-mobile.png`,
        fullPage: true,
      });
      console.log(
        `Candidate ${i}: ${await page.title()}, overflow=${await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)}`,
      );
      await page.close();
    } finally {
      server.kill("SIGTERM");
    }
  }
} finally {
  await browser.close();
}
