import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

declare global {
  interface Window {
    workerEvents: string[];
    observedTracks: MediaStreamTrack[];
  }
}

async function choose(page: Page, query: string, name: RegExp) {
  await page.getByRole("button", { name: /Techniques/ }).click();
  await page.getByRole("searchbox").fill(query);
  await page.getByRole("dialog").getByRole("button", { name }).click();
}

test("manual practice casts only after the sequence and loads no vision assets", async ({
  page,
}) => {
  const assets: string[] = [];
  page.on("request", (request) => {
    if (/\/(models|vision)\//.test(request.url())) assets.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Fireball",
  );
  await expect(page.getByTestId("effect-stage")).toHaveAttribute(
    "data-effect",
    "none",
  );
  await page.screenshot({
    path: "evidence/app-desktop-before.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /^Practice step 2:.* Ram$/ }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Out of order" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /^Practice step 1:.* Snake$/ })
    .click();
  await expect(page.locator(".runtime-status")).toContainText(
    "Untimed rehearsal.",
  );
  await page.waitForTimeout(8300);
  await expect(page.locator(".training-seal")).toHaveAttribute(
    "data-progress",
    "1",
  );
  await page.getByRole("button", { name: "↺ Reset", exact: true }).click();
  for (const [index, name] of [
    "Snake",
    "Ram",
    "Monkey",
    "Boar",
    "Horse",
    "Tiger",
  ].entries()) {
    await page
      .getByRole("button", {
        name: new RegExp(`^Practice step ${index + 1}:.* ${name}$`),
      })
      .click();
  }
  await expect(page.getByTestId("effect-stage")).toHaveAttribute(
    "data-effect",
    "fire",
  );
  await expect(
    page.getByRole("status").filter({ hasText: "sequence complete" }),
  ).toBeVisible();
  await page.screenshot({
    path: "evidence/app-desktop-cast.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "↺ Reset", exact: true }).click();
  await expect(page.getByTestId("effect-stage")).toHaveAttribute(
    "data-effect",
    "none",
  );
  expect(assets).toEqual([]);
});

test("catalogue search, unresolved powers and repeated seals retain their meaning", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, "sharingan", /^Sharingan/);
  await expect(
    page.getByText("The hand-sign sequence is unresolved."),
  ).toBeVisible();
  await expect(page.getByTestId("effect-stage")).toHaveAttribute(
    "data-effect",
    "none",
  );
  await page.getByRole("button", { name: /Preview effect/ }).click();
  await expect(page.getByTestId("effect-stage")).toHaveAttribute(
    "data-effect",
    "eyes",
  );
  await choose(page, "byakugan", /^Byakugan/);
  await page.getByRole("button", { name: /Preview effect/ }).click();
  await expect(page.getByTestId("effect-stage")).toHaveAttribute(
    "data-effect",
    "pale-eyes",
  );
  await choose(page, "Uzumaki Sealing", /^Uzumaki Sealing Technique/);
  await expect(
    page.getByRole("button", { name: /^Practice step/ }),
  ).toHaveCount(7);
  await expect(
    page.getByRole("button", { name: /^Practice step 3:.* Dog$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Practice step 4:.* Dog$/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Techniques/ }).click();
  await page.getByRole("searchbox").fill("no-such-jutsu");
  await expect(page.getByText(/No matching techniques/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Techniques/ })).toBeFocused();
});

test("phone has full viewport camera, working preferences and no overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Calibration", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Reduce effect motion", exact: true }),
  ).toBeChecked();
  await page.keyboard.press("Escape");
  await choose(page, "chidori", /^Chidori/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chidori");
  await page.getByRole("button", { name: /Preview/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("effect-stage")).toHaveAttribute(
    "data-effect",
    "lightning",
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  const stage = await page.getByTestId("effect-stage").boundingBox();
  expect(stage?.width).toBe(390);
  expect(stage?.height).toBe(844);
  await page.screenshot({ path: "evidence/app-mobile.png", fullPage: true });
});

test("panel drag, resize, keyboard, reset and viewport persistence work", async ({
  page,
}) => {
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Movable hand sequence" });
  const before = (await panel.boundingBox())!;
  const handle = await page
    .getByRole("button", {
      name: "Move sequence panel: HAND SEQUENCE",
      exact: true,
    })
    .boundingBox();
  await page.mouse.move(handle!.x + 80, handle!.y + 20);
  await page.mouse.down();
  await page.mouse.move(handle!.x - 150, handle!.y - 160, { steps: 8 });
  await page.mouse.up();
  const moved = (await panel.boundingBox())!;
  expect(moved.x).toBeLessThan(before.x - 100);
  expect(moved.y).toBeLessThan(before.y - 100);
  const resize = page.getByRole("button", {
    name: "Resize sequence panel",
    exact: true,
  });
  await resize.focus();
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("ArrowDown");
  expect((await panel.boundingBox())!.width).toBe(moved.width + 50);
  const pointerHandle = (await resize.boundingBox())!;
  await page.mouse.move(pointerHandle.x + 20, pointerHandle.y + 18);
  await page.mouse.down();
  await page.mouse.move(pointerHandle.x + 60, pointerHandle.y + 48, {
    steps: 5,
  });
  await page.mouse.up();
  const resized = (await panel.boundingBox())!;
  expect(resized.width).toBe(moved.width + 90);
  await page.reload();
  expect((await panel.boundingBox())!.width).toBe(resized.width);
  await page.screenshot({ path: "evidence/app-panel-moved.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => (await panel.boundingBox())!.width)
    .toBeLessThanOrEqual(366);
  const phone = (await panel.boundingBox())!;
  expect(phone.x).toBeGreaterThanOrEqual(12);
  expect(phone.x + phone.width).toBeLessThanOrEqual(378);
  expect(phone.y + phone.height).toBeLessThanOrEqual(758);
  await page
    .getByRole("button", { name: "Reset panel position and size" })
    .click();
  expect((await panel.boundingBox())!.height).toBe(320);
});

test("camera denied keeps demo usable", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Permission denied", "NotAllowedError");
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Start camera/ }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Camera permission was denied",
  );
  await page.getByRole("button", { name: "Demo", exact: true }).click();
  await page.getByRole("button", { name: /Preview effect/ }).click();
  await expect(page.getByTestId("effect-stage")).toHaveAttribute(
    "data-effect",
    "fire",
  );
});

test("real worker and face model load on fake camera; stopping releases tracks", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const NativeWorker = Worker;
    window.workerEvents = [];
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (event) => {
          window.workerEvents.push(event.data.type);
        });
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Start camera/ }).click();
  await expect(page.getByRole("button", { name: /End camera/ })).toBeVisible();
  await expect(page.getByText("TRACKER: READY")).toBeVisible({
    timeout: 45000,
  });
  await choose(page, "sharingan", /^Sharingan/);
  await page.getByRole("button", { name: /Preview effect/ }).click();
  await page.waitForFunction(
    () => window.workerEvents.includes("face-ready"),
    undefined,
    { timeout: 30000 },
  );
  await page.evaluate(() => {
    const video = document.querySelector("video")!;
    window.observedTracks = (video.srcObject as MediaStream).getTracks();
  });
  await page.screenshot({ path: "evidence/app-camera.png", fullPage: true });
  await page.getByRole("button", { name: /End camera/ }).click();
  expect(
    await page.evaluate(() =>
      window.observedTracks.every((track) => track.readyState === "ended"),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("calibration countdown persists examples and clearing cancels pending capture", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // Controlled landmarks isolate the calibration UX from pose-model accuracy.
    window.Worker = class extends EventTarget {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      stopped = false;
      postMessage(data: { type: string; bitmap?: ImageBitmap }) {
        data.bitmap?.close();
        const result =
          data.type === "init"
            ? { type: "ready" }
            : {
                type: "result",
                face: [],
                hands: [0.25, 0.55].map((x) =>
                  Array.from({ length: 21 }, (_, i) => ({
                    x: x + i * 0.002,
                    y: 0.7 - i * 0.012,
                  })),
                ),
              };
        setTimeout(() => {
          if (!this.stopped) this.onmessage?.({ data: result });
        }, 10);
      }
      terminate() {
        this.stopped = true;
      }
    } as unknown as typeof Worker;
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Start camera/ }).click();
  await expect(page.getByText("TRACKER: READY")).toBeVisible();
  for (let sample = 1; sample <= 3; sample++) {
    await page
      .getByRole("button", { name: "Calibration", exact: true })
      .click();
    await page.getByLabel("Seal to teach").selectOption("rat");
    await page.getByRole("button", { name: /Capture in 3 seconds/ }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              JSON.parse(
                localStorage.getItem("naruto-ninja.calibration.v1") ?? "{}",
              ).rat?.length ?? 0,
          ),
        { timeout: 6000 },
      )
      .toBe(sample);
  }
  await page.getByRole("button", { name: "Calibration", exact: true }).click();
  await page.getByRole("button", { name: /Capture in 3 seconds/ }).click();
  await page.getByRole("button", { name: "Calibration", exact: true }).click();
  await page
    .getByRole("button", { name: "Clear saved examples", exact: true })
    .click();
  await page.waitForTimeout(3500);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("naruto-ninja.calibration.v1"),
    ),
  ).toBe("{}");
  await page.screenshot({ path: "evidence/app-calibration.png" });
});

test("field guide navigation, reduced motion and missing routes work in production", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("link", { name: "Field guide" }).click();
  await expect(page).toHaveURL(/\/guide$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Shinobi training manual.",
  );
  await expect(page).toHaveTitle("Field guide | Naruto Ninja");
  await expect(page.locator("#main")).toBeFocused();
  await page.getByRole("link", { name: "Enter the training room" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Fireball",
  );
  await page
    .getByRole("button", { name: /^Practice step 1:.* Snake$/ })
    .click();
  await expect(page.locator(".training-seal")).toHaveAttribute(
    "data-progress",
    "1",
  );
  const response = await page.goto("/missing-scroll");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "signal lost",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  );
  await page.getByRole("link", { name: "Return to practice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Fireball",
  );
});

test("short phone keeps the seal, instructions and guide outside the floating panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const panel = (await page
    .getByRole("region", { name: "Movable hand sequence" })
    .boundingBox())!;
  const seal = (await page.locator(".training-seal").boundingBox())!;
  expect(seal.y + seal.height).toBeLessThan(panel.y);
  await page
    .getByRole("button", { name: /^Practice step 1:.* Snake$/ })
    .click();
  const message = (await page.locator(".runtime-status").boundingBox())!;
  const body = (await page.locator(".floating-panel-content").boundingBox())!;
  expect(message.y).toBeGreaterThanOrEqual(body.y);
  expect(message.y + message.height).toBeLessThanOrEqual(
    panel.y + panel.height - 36,
  );
  await page.getByRole("link", { name: "Field guide" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Shinobi training manual.",
  );
});

test("calibration starts the camera in place and focuses the seal picker when ready", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Calibration", exact: true }).click();
  await page
    .getByRole("button", { name: "Start camera for calibration", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: /Capture in 3 seconds/ }),
  ).toBeEnabled({ timeout: 45000 });
  await expect(page.getByLabel("Seal to teach")).toBeFocused();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /End camera/ }).click();
  await expect(
    page.getByRole("button", { name: /Start camera/ }),
  ).toBeVisible();
});

test("long techniques keep practice feedback visible and disclose reported variants", async ({
  page,
}) => {
  await page.goto("/");
  await choose(
    page,
    "Water Dragon",
    /Water Release: Water Dragon Bullet Technique/,
  );
  await expect(
    page.getByRole("button", { name: /^Practice step/ }),
  ).toHaveCount(44);
  await expect(page.locator(".rail-hint")).toBeVisible();
  const panel = (await page
    .getByRole("region", { name: "Movable hand sequence" })
    .boundingBox())!;
  const feedback = (await page.locator(".runtime-status").boundingBox())!;
  expect(feedback.y + feedback.height).toBeLessThanOrEqual(
    panel.y + panel.height - 36,
  );
  await expect(page.getByLabel("Sequence", { exact: true })).toBeHidden();
  await page.locator(".source-notes summary").click();
  await expect(page.getByLabel("Sequence", { exact: true })).toBeVisible();
  await page.getByLabel("Sequence", { exact: true }).selectOption({ index: 1 });
  expect(
    await page.getByRole("button", { name: /^Practice step/ }).count(),
  ).toBeLessThan(44);
});
