const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

// Console noise that is not the site's fault (local antivirus injection).
const IGNORED = [/kaspersky/i];

async function openPage(page, path) {
  const errors = [];
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      window.__csp.push(e.violatedDirective + " " + (e.blockedURI || e.sourceFile || ""));
    });
  });
  page.on("console", (msg) => {
    if (msg.type() === "error" && !IGNORED.some((re) => re.test(msg.text()))) errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  await page.goto(path);
  await page.waitForSelector("html.is-ready", { timeout: 10000 });
  return errors;
}

for (const path of ["/", "/notes/", "/notes/the-bonsai/", "/how-i-work/", "/404.html"]) {
  test.describe(`page ${path}`, () => {
    test("loads clean: no console errors, no CSP violations, no horizontal overflow", async ({ page }) => {
      const errors = await openPage(page, path);
      await page.waitForTimeout(1200);
      expect(errors).toEqual([]);
      expect(await page.evaluate(() => window.__csp)).toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("has no serious accessibility violations (axe)", async ({ page }) => {
      await openPage(page, path);
      await page.waitForTimeout(1500);
      const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });

    test("keeps a full-page screenshot for review", async ({ page }, testInfo) => {
      await openPage(page, path);
      await page.waitForTimeout(2500);
      const name = path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
      await page.screenshot({ path: testInfo.outputPath(`${name}-${testInfo.project.name}.png`), fullPage: true });
    });
  });
}

test.describe("home page structure", () => {
  test("hero, desk, cake, where/when note and polaroid are present", async ({ page }) => {
    await openPage(page, "/");
    await expect(page.locator("h1")).toContainText("rahul");
    await expect(page.locator(".desk__scene")).toBeVisible();
    await expect(page.locator(".cake__tier")).toHaveCount(4);
    await expect(page.locator(".note--when")).toContainText("Kolkata");
    await expect(page.locator("#local-time")).not.toHaveText("--:--");
    await expect(page.locator(".polaroid img")).toBeVisible();
    await expect(page.locator(".loop__node")).toHaveCount(4);
  });

  test("delivery-loop notes respond to activation", async ({ page }) => {
    await openPage(page, "/");
    const node = page.locator(".loop__node").nth(1);
    await node.scrollIntoViewIfNeeded();
    await node.click();
    await expect(page.locator("#loop-detail")).toContainText("proof-of-concept");
    await expect(node).toHaveClass(/is-active/);
  });

  test("theme and calm toggles work and persist", async ({ page }) => {
    await openPage(page, "/");
    await page.locator("#theme-btn").click();
    const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(["dark", "light"]).toContain(theme);
    await page.locator("#calm-btn").click();
    await expect(page.locator("html")).toHaveClass(/is-calm/);
    await page.reload();
    await page.waitForSelector("html.is-ready");
    await expect(page.locator("html")).toHaveClass(/is-calm/);
    expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe(theme);
  });

  test("polaroid opens a dialog and Escape closes it", async ({ page }) => {
    await openPage(page, "/");
    const opener = page.locator(".polaroid__open").first();
    await opener.scrollIntoViewIfNeeded();
    await opener.click();
    await expect(page.locator("#sbc-lightbox")).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(page.locator("#sbc-lightbox")).not.toHaveAttribute("open", "");
  });

  test("skip link is the first tab stop and jumps to main", async ({ page }) => {
    await openPage(page, "/");
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("mobile menu traps focus and closes on Escape", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "phone layout only");
    await openPage(page, "/");
    await page.locator("#menu-btn").click();
    await expect(page.locator("#menu-sheet")).toHaveClass(/is-open/);
    await expect(page.locator("#menu-sheet a").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator("#menu-sheet")).not.toHaveClass(/is-open/);
    await expect(page.locator("#menu-btn")).toBeFocused();
  });
});
