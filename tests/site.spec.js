const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

// Console noise that is not the site's fault (local antivirus injection).
const IGNORED = [/kaspersky/i];

const PAGES = ["/", "/how-i-work/", "/notes/", "/notes/vintage-silicon/", "/notes/6502-on-two-breadboards/", "/notes/how-this-site-is-built/", "/404.html"];
const SCHEMES = ["light", "dark"];
const INK = { light: "rgb(22, 22, 21)", dark: "rgb(236, 234, 228)" };
const ACCENT = { light: "rgb(196, 43, 28)", dark: "rgb(238, 90, 63)" };
const REDIRECTS = [
  ["/scribbles/", "/notes/"],
  ["/scribbles/6502-on-two-breadboards/", "/notes/6502-on-two-breadboards/"],
  ["/scribbles/the-bonsai/", "/notes/"],
  ["/notes/the-bonsai/", "/notes/"],
  ["/scribbles/how-this-notebook-is-drawn/", "/notes/how-this-site-is-built/"],
];

const slug = (p) => p.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
const fmt = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
// Kolkata time now, plus the minutes either side so a tick over a minute boundary passes.
function ist() {
  const m = (Math.floor(Date.now() / 60000) + 330) % 1440;
  return { m, ok: [fmt((m + 1439) % 1440), fmt(m), fmt((m + 1) % 1440)] };
}
const onlyDesktop = (testInfo) => test.skip(testInfo.project.name !== "desktop", "desktop only");

async function openPage(page, path, scheme = "light") {
  const errors = [];
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
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

for (const path of PAGES) {
  for (const scheme of SCHEMES) {
    test.describe(`page ${path} (${scheme})`, () => {
      test("loads clean: no console errors, no CSP violations, no overflow, no inline styles", async ({ page }) => {
        const errors = await openPage(page, path, scheme);
        await page.waitForTimeout(600);
        expect(errors).toEqual([]);
        expect(await page.evaluate(() => window.__csp)).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
        // The command menu is the only dialog, and it starts closed.
        await expect(page.locator("dialog")).toHaveCount(1);
        await expect(page.locator("dialog[open]")).toHaveCount(0);
        // The only style attribute is the datum's: the clock's --now (and the probe's --probe once used).
        const styled = await page.evaluate(() => [...document.querySelectorAll("[style]")].map((el) => [el.matches("[data-datum]"), el.getAttribute("style")]));
        for (const [isDatum, style] of styled) {
          expect(isDatum).toBe(true);
          expect(style).toMatch(/^--now:\s*[\d.]+;(\s*--probe:\s*[\d.]+;)?$/);
        }
      });

      test("has no serious accessibility violations (axe, contrast included)", async ({ page }) => {
        await openPage(page, path, scheme);
        const results = await new AxeBuilder({ page }).analyze();
        const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      });

      test("keeps a full-page screenshot for review", async ({ page }, testInfo) => {
        await openPage(page, path, scheme);
        await page.screenshot({ path: testInfo.outputPath(`${slug(path)}-${scheme}-${testInfo.project.name}.png`), fullPage: true });
      });
    });
  }

  test(`datum placement on ${path}`, async ({ page }) => {
    await openPage(page, path);
    if (path === "/") {
      await expect(page.locator("[data-datum]")).toHaveCount(1);
      await expect(page.locator(".colophon__clock")).toHaveCount(0);
    } else {
      await expect(page.locator("[data-datum]")).toHaveCount(0);
      await expect(page.locator(".colophon__clock")).toBeVisible();
      await expect(page.locator(".colophon__clock")).toHaveText(/^Kolkata \d\d:\d\d IST$/);
    }
  });
}

test.describe("datum for a visitor in London", () => {
  test.use({ timezoneId: "Europe/London" });

  test("tick, Kolkata time and the visitor's own time", async ({ page }) => {
    await openPage(page, "/");
    const now = ist();
    await expect(page.locator(".datum__tick")).toBeVisible();
    expect(now.ok).toContain(await page.locator(".datum__now time").textContent());
    const f = await page.locator("[data-datum]").evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--now")));
    const d = Math.abs(f - now.m / 1440);
    expect(Math.min(d, 1 - d)).toBeLessThanOrEqual(2 / 1440);
    await expect(page.locator(".datum__local")).toBeVisible();
    await expect(page.locator(".datum__label")).toHaveText("Kolkata · IST · UTC+05:30");
    await expect(page.locator(".datum__local")).toContainText("Your time now");
  });

  test("the scale converts a Kolkata time to the visitor's, by keyboard and pointer", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await openPage(page, "/");
    const slider = page.getByRole("slider", { name: "Convert a time in Kolkata to your time" });
    await expect(slider).toHaveAttribute("aria-valuemax", "1435");
    await slider.focus();
    await expect(page.locator("[data-datum]")).toHaveClass(/is-probing/);
    await page.keyboard.press("Home");
    await expect(slider).toHaveAttribute("aria-valuenow", "0");
    // Midnight in Kolkata is the evening before in London.
    await expect(slider).toHaveAttribute("aria-valuetext", /^00:00 in Kolkata is (18|19):30 your time the previous day, (now|.+ ago)$/);
    await expect(page.locator(".datum__probe-time")).toHaveText("00:00");
    await expect(page.locator(".datum__reading")).toContainText("your time the previous day");
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuetext", /^00:15 in Kolkata is (18|19):45 your time/);
    await page.keyboard.press("PageUp");
    await expect(slider).toHaveAttribute("aria-valuenow", "75");
    await page.keyboard.press("End");
    await expect(slider).toHaveAttribute("aria-valuenow", "1435");
    // The red tick stays put while the ink probe moves. The scale sits on the
    // dark orbit stage, so its ink is the dark theme's in both page themes.
    await expect(page.locator(".datum__tick")).toBeVisible();
    expect(await page.locator(".datum__probe").evaluate((el) => getComputedStyle(el).borderLeftColor)).toBe(INK.dark);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-datum]")).not.toHaveClass(/is-probing/);

    await slider.blur();
    const box = await slider.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator(".datum__probe-time")).toHaveText("12:00");
    await page.mouse.move(box.x + box.width / 2, box.y - 80);
    await expect(page.locator("[data-datum]")).not.toHaveClass(/is-probing/);
  });
});

test.describe("datum for a visitor in Kolkata", () => {
  test.use({ timezoneId: "Asia/Kolkata" });

  test("no visitor clause", async ({ page }) => {
    await openPage(page, "/");
    await expect(page.locator(".datum__tick")).toBeVisible();
    await expect(page.locator(".datum__local")).toBeHidden();
    await expect(page.getByRole("slider")).toHaveAttribute("aria-valuetext", /^\d\d:\d\d in Kolkata, (now|in .+|.+ ago)$/);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the datum's scale renders and the live parts stay hidden", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".datum__label")).toBeVisible();
    await expect(page.locator(".datum__ticks")).toBeVisible();
    for (const sel of [".datum__tick", ".datum__now", ".datum__local", "#theme-btn", "#cmdk-btn", ".copy", ".colophon__weight"]) {
      await expect(page.locator(sel)).toBeHidden();
    }
    // Controls that only work with the script are not there at all.
    await expect(page.locator(".datum__track")).toHaveCount(0);
    // The parts key and its callouts are plain markup and CSS.
    await expect(page.locator("#about .parts li")).toHaveCount(7);
  });
});

test.describe("home page", () => {
  test("hero", async ({ page }, testInfo) => {
    await openPage(page, "/");
    await expect(page.locator("h1")).toHaveText("Rahul Kar");
    if (testInfo.project.name === "desktop") {
      const size = await page.locator("h1").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(Math.abs(size - 112)).toBeLessThan(0.5);
    }
    await expect(page.locator(".hero__role")).toContainText("11+ years");
    await expect(page.locator(".hero__facts dt")).toHaveText(["Now", "Before"]);
    await expect(page.locator(".hero .book .button")).toHaveAttribute("href", /^mailto:kar\.rahul@pm\.me/);
  });

  test("sections and background", async ({ page }) => {
    await openPage(page, "/");
    expect(await page.locator("main section[id]").evaluateAll((els) => els.map((el) => el.id))).toEqual(["background", "about", "notes"]);
    await expect(page.locator("#background h3")).toHaveText(["Quality engineering and automation", "DevOps and cloud", "Architecture and delivery", "Agentic AI"]);
    await expect(page.locator("#background img")).toHaveCount(0);
    // A career scale: four stages in order, the last one marked now.
    await expect(page.locator(".career > .career__stage")).toHaveCount(4);
    await expect(page.locator(".career__stage.is-now h3")).toHaveText("Agentic AI");
    await expect(page.locator(".career__stage.is-now .career__now")).toHaveText("Now");
  });

  test("the parts key pairs with the callouts on the photo", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await openPage(page, "/");
    await expect(page.locator("#about .parts li")).toHaveText(["1W65C02S CPU", "2AT28C256 EEPROM", "3HM62256 RAM", "4W65C22 interface chip", "574HC00 NAND gates", "6Crystal oscillator", "716×2 LCD"]);
    await expect(page.locator("#about .callout")).toHaveCount(7);
    await expect(page.locator("#about .callouts")).toHaveAttribute("aria-hidden", "true");
    const shadow = () => page.locator("#about .callout--via").evaluate((el) => getComputedStyle(el).boxShadow);
    expect(await shadow()).toBe("none");
    await page.locator("#about .parts li").nth(3).hover();
    await expect.poll(shadow).toContain("rgba(18, 18, 17, 0.55)");
  });

  test("about, notes and contact", async ({ page }) => {
    await openPage(page, "/");
    const link = page.locator("#about figure a");
    await expect(link).toHaveAttribute("href", "/assets/img/6502-1280.jpg");
    expect(await link.evaluate((el) => getComputedStyle(el).display)).toBe("block");
    await link.scrollIntoViewIfNeeded();
    const [a, img] = [await link.boundingBox(), await page.locator("#about figure img").boundingBox()];
    expect(a.height).toBeGreaterThanOrEqual(img.height - 0.5);
    await expect(page.locator("#contact")).toContainText("Kolkata");

    await expect(page.locator("#notes .row")).toHaveCount(3);
    expect(await page.locator("#notes .row__link").first().evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe("underline");

    // Contact sits in the hero, beside the intro, so it is on the first screen.
    await expect(page.locator(".hero #contact .email__address")).toHaveText("kar.rahul@pm.me");
    for (const href of ["https://github.com/rahulkar", "https://www.linkedin.com/in/karrahul/", "https://www.credly.com/users/rahul-kar"]) {
      await expect(page.locator(`#contact a[href="${href}"]`)).toHaveCount(1);
    }
    await expect(page.locator('#contact a[download="rahul-kar.vcf"]')).toHaveCount(1);
    expect(await page.locator(".links__name").first().evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe("underline");
  });

  test("stays within the word budget", async ({ page }) => {
    await openPage(page, "/");
    const words = await page.locator("main").evaluate((el) => el.innerText.split(/\s+/).filter(Boolean).length);
    expect(words).toBeLessThanOrEqual(600);
  });

  test("copy button copies the address and says so", async ({ page, context }, testInfo) => {
    onlyDesktop(testInfo);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openPage(page, "/");
    await page.locator(".copy").click();
    await expect(page.locator(".copy__label")).toHaveText("Copied");
    await expect(page.locator("[data-copy-status]")).toHaveText("Email address copied.");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("kar.rahul@pm.me");
  });

  test("without clipboard access, copy selects the address and says so", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: undefined }));
    await openPage(page, "/");
    await page.locator(".copy").click();
    await expect(page.locator(".copy__label")).toHaveText("Selected");
    await expect(page.locator("[data-copy-status]")).toContainText("The address is selected");
    expect(await page.evaluate(() => String(window.getSelection()))).toBe("kar.rahul@pm.me");
  });

  test("touch targets are at least 44px", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone sizes only");
    await openPage(page, "/");
    const sels = [".site-header__name", ".site-nav a", "#cmdk-btn", "#theme-btn", ".button", ".link-arrow", ".copy", ".links a", ".section__coda > a"];
    for (const sel of sels) {
      for (const el of await page.locator(sel).all()) {
        const box = await el.boundingBox();
        expect(box, sel).not.toBeNull();
        expect(Math.round(box.width), `${sel} width`).toBeGreaterThanOrEqual(44);
        expect(Math.round(box.height), `${sel} height`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("nothing shifts when the scripts run", async ({ browser }, testInfo) => {
    onlyDesktop(testInfo);
    for (const viewport of [{ width: 360, height: 640 }, { width: 768, height: 1024 }]) {
      const ys = [];
      for (const javaScriptEnabled of [false, true]) {
        const ctx = await browser.newContext({ viewport, javaScriptEnabled, timezoneId: "Europe/London", reducedMotion: "reduce", baseURL: testInfo.project.use.baseURL || "http://127.0.0.1:4173" });
        const p = await ctx.newPage();
        await p.goto("/");
        if (javaScriptEnabled) await p.waitForSelector("html.is-ready");
        else await p.waitForTimeout(800);
        ys.push((await p.locator(".hero__side").boundingBox()).y);
        await ctx.close();
      }
      expect(Math.abs(ys[0] - ys[1]), `hero side at ${viewport.width}px`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("theme, focus and skip link", () => {
  test("theme toggle switches and persists", async ({ page }) => {
    await openPage(page, "/");
    await page.locator("#theme-btn").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("#theme-btn")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).not.toHaveClass(/theme-switching/);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(18, 18, 17)");
    await page.reload();
    await page.waitForSelector("html.is-ready");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  for (const scheme of SCHEMES) {
    test(`focus ring is ink (${scheme})`, async ({ page }, testInfo) => {
      onlyDesktop(testInfo);
      await openPage(page, "/", scheme);
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await expect(page.locator(".site-header__name")).toBeFocused();
      const ring = await page.locator(".site-header__name").evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.outlineStyle, s.outlineWidth, s.outlineOffset, s.outlineColor];
      });
      expect(ring).toEqual(["solid", "2px", "3px", INK[scheme]]);
    });
  }

  test("skip link is the first tab stop and jumps to main", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await openPage(page, "/");
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await expect(page.locator(".skip-link")).toHaveText("Skip to content");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
    expect(await page.locator("main").evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("none");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement.closest("main"))).toBe(true);
  });

  test("higher contrast lifts the faintest ink in dark mode", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await page.emulateMedia({ colorScheme: "dark", contrast: "more" });
    await page.goto("/");
    const ink3 = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ink-3").trim().toUpperCase());
    expect(await ink3()).toBe("#A9A79F");
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    expect(await ink3()).toBe("#A9A79F");
  });

  // Red means "now": at rest, nothing but the tick and the current nav item is red.
  for (const [path, scheme] of [["/", "light"], ["/how-i-work/", "light"], ["/", "dark"], ["/notes/how-this-site-is-built/", "dark"]]) {
    test(`red only on the tick and current nav (${path}, ${scheme})`, async ({ page }, testInfo) => {
      onlyDesktop(testInfo);
      await openPage(page, path, scheme);
      const hits = await page.evaluate((accent) => {
        const out = [];
        const exempt = (el) => el.matches(".datum__tick, .site-nav a[aria-current]");
        for (const el of document.querySelectorAll("body *")) {
          if (exempt(el)) continue;
          for (const pseudo of [null, "::before", "::after"]) {
            const s = getComputedStyle(el, pseudo);
            if (s.display === "none") continue;
            const props = [];
            const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
            if (!pseudo && hasText) props.push(["color", s.color]);
            props.push(["background-color", s.backgroundColor]);
            for (const side of ["Top", "Right", "Bottom", "Left"]) {
              if (s[`border${side}Style`] !== "none" && parseFloat(s[`border${side}Width`]) > 0) props.push([`border-${side}`, s[`border${side}Color`]]);
            }
            if (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) props.push(["outline", s.outlineColor]);
            if (s.textDecorationLine !== "none") props.push(["text-decoration", s.textDecorationColor]);
            for (const [prop, value] of props) if (value === accent) out.push(`${el.tagName.toLowerCase()}.${el.className}${pseudo || ""} ${prop}`);
          }
        }
        return out;
      }, ACCENT[scheme]);
      expect(hits).toEqual([]);
    });
  }
});

test.describe("command menu", () => {
  const menu = (page) => page.getByRole("dialog", { name: "Command menu" });
  const input = (page) => page.getByRole("combobox", { name: "Search pages and actions" });
  const active = (page) => input(page).evaluate((el) => document.getElementById(el.getAttribute("aria-activedescendant"))?.textContent.trim());

  test("Ctrl+K opens it on every page; typing filters; Enter goes", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await openPage(page, "/how-i-work/");
    await page.keyboard.press("Control+K");
    await expect(menu(page)).toBeVisible();
    await expect(input(page)).toBeFocused();
    expect(await page.getByRole("option").count()).toBeGreaterThanOrEqual(17);
    expect(await active(page)).toMatch(/^Home/);
    await input(page).fill("6502");
    await expect(page.getByRole("option", { includeHidden: false })).toHaveText([/A 6502 computer on two breadboards/, /About/]);
    await expect(page.locator(".cmdk__item mark").first()).toHaveText("6502");
    await page.keyboard.press("ArrowDown");
    expect(await active(page)).toMatch(/^About/);
    await page.keyboard.press("ArrowDown");
    expect(await active(page)).toMatch(/^A 6502 computer/);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/notes\/6502-on-two-breadboards\/$/);
  });

  test("the header button opens it; Esc closes it and gives focus back", async ({ page }) => {
    await openPage(page, "/");
    const btn = page.locator("#cmdk-btn");
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute("aria-keyshortcuts", /^(Control|Meta)\+K$/);
    await btn.click();
    await expect(menu(page)).toBeVisible();
    await input(page).fill("zzzz");
    await expect(page.locator(".cmdk__empty")).toBeVisible();
    await expect(input(page)).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Escape");
    await expect(menu(page)).toBeHidden();
    await expect(btn).toBeFocused();
  });

  test("a section command scrolls the home page to it", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await openPage(page, "/");
    await page.keyboard.press("Control+K");
    await input(page).fill("about");
    await page.keyboard.press("Enter");
    await expect(menu(page)).toBeHidden();
    await expect(page).toHaveURL(/\/#about$/);
    await expect(page.locator("#about")).toBeInViewport();
  });

  test("the theme command switches the theme and stays open", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await openPage(page, "/");
    await page.keyboard.press("Control+K");
    await input(page).fill("theme");
    await expect(page.locator("#cmdk-theme .cmdk__label")).toHaveText("Switch to dark theme");
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(menu(page)).toBeVisible();
    await expect(page.locator("#cmdk-theme .cmdk__label")).toHaveText("Switch to light theme");
    await expect(page.locator("[data-cmdk-status]")).toHaveText("Dark theme on.");
  });

  test("the grid command lays the page's own columns over it", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await openPage(page, "/");
    await page.keyboard.press("Control+K");
    await input(page).fill("grid");
    await page.keyboard.press("Enter");
    await expect(menu(page)).toBeHidden();
    const grid = page.locator(".layout-grid");
    await expect(grid).toBeVisible();
    await expect(grid).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".layout-grid__cols > span:visible")).toHaveCount(12);
    await expect(page.locator(".layout-grid__spec")).toHaveText(/^12 columns · 24px gutters · \d+px wide$/);
    // The overlay's columns are the content's columns.
    const [a, b] = await Promise.all([page.locator(".layout-grid__cols").boundingBox(), page.locator(".hero").boundingBox()]);
    expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(1);
    await page.keyboard.press("Escape");
    await expect(grid).toBeHidden();
  });

  test("the copy command copies the address", async ({ page, context }, testInfo) => {
    onlyDesktop(testInfo);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openPage(page, "/notes/");
    await page.keyboard.press("Control+K");
    await input(page).fill("copy");
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-cmdk-status]")).toHaveText("Email address copied.");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("kar.rahul@pm.me");
    await expect(menu(page)).toBeHidden();
  });

  for (const scheme of SCHEMES) {
    test(`is accessible while open (axe, ${scheme})`, async ({ page }, testInfo) => {
      onlyDesktop(testInfo);
      await openPage(page, "/", scheme);
      await page.keyboard.press("Control+K");
      await input(page).fill("no");
      const results = await new AxeBuilder({ page }).include("#cmdk").analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});

test("the colophon reports the page weight", async ({ page }) => {
  await openPage(page, "/notes/");
  await expect(page.locator(".colophon__weight")).toHaveText(/^This page: \d+ (KB|B), \d+ requests?, loaded in \d+ ms$/);
});

test.describe("approach page", () => {
  test("four stages, all text visible", async ({ page }) => {
    await openPage(page, "/how-i-work/");
    await expect(page.locator("h1")).toHaveText("How I work");
    await expect(page.locator(".playbook__stage")).toHaveCount(4);
    expect(await page.locator(".playbook__stage").first().evaluate((el) => getComputedStyle(el).listStyleType)).toBe("none");
    await expect(page.locator(".playbook__stage h2")).toHaveText(["Discover", "Prototype", "Architect", "Scale"]);
    await expect(page.locator('.site-nav a[aria-current="page"]')).toHaveText("How I work");
  });

  test("prints as a brief", async ({ page }, testInfo) => {
    await openPage(page, "/how-i-work/");
    await page.emulateMedia({ media: "print" });
    for (const sel of [".site-header", ".colophon", ".book", ".skip-link"]) await expect(page.locator(sel)).toBeHidden();
    await expect(page.locator(".print-only")).toBeVisible();
    expect(await page.locator("h1").evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(30);
    expect(await page.locator(".playbook__stage p").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(17);
    if (testInfo.project.name === "desktop") await page.pdf({ path: testInfo.outputPath("how-i-work.pdf"), format: "A4" });
  });

  test("printed links spell out their address", async ({ page }) => {
    await openPage(page, "/");
    await page.emulateMedia({ media: "print" });
    const content = await page.locator(".row__link").first().evaluate((el) => getComputedStyle(el, "::after").content);
    // Chrome either resolves attr(href) or serialises the tokens separately.
    expect(content).toMatch(/rahulkar\.com(\/notes\/|"\s+attr\(href\))/);
  });
});

test.describe("notes", () => {
  test("index lists every note, newest first", async ({ page }) => {
    await openPage(page, "/notes/");
    await expect(page.locator("h1")).toHaveText("Notes");
    await expect(page.locator(".row")).toHaveCount(3);
    await expect(page.locator(".row__title")).toHaveText(["Vintage silicon", "A 6502 computer on two breadboards", "How this site is built"]);
    await expect(page.locator('main a[href="/feed.xml"]')).toHaveCount(1);
  });

  test("vintage silicon: four photos, the source and the table; About links to it", async ({ page }) => {
    await openPage(page, "/notes/vintage-silicon/");
    await expect(page.locator("h1")).toHaveText("Vintage silicon");
    await expect(page.locator(".note__body h2")).toHaveText(["Apollo Guidance Computer logic chip", "Intel C4004", "Intel Pentium A80501-60", "Side by side"]);
    const imgs = page.locator(".note__body figure img");
    await expect(imgs).toHaveCount(4);
    for (const img of await imgs.all()) {
      expect(await img.getAttribute("alt")).toBeTruthy();
      expect(await img.getAttribute("width")).toBe("640");
      expect(await img.getAttribute("loading")).toBe("lazy");
    }
    await expect(page.locator('.note__body a[href^="https://airandspace.si.edu/"]')).toHaveCount(1);
    await expect(page.locator(".note__body tbody tr")).toHaveCount(3);
    await expect(page.locator(".note__next a")).toHaveText("A 6502 computer on two breadboards");
    await openPage(page, "/");
    await expect(page.locator('#about a[href="/notes/vintage-silicon/"]')).toHaveCount(1);
  });

  test("a note links to the next note and back to the list", async ({ page }) => {
    await openPage(page, "/notes/6502-on-two-breadboards/");
    await expect(page.locator(".note__next a")).toHaveText("How this site is built");
    await expect(page.locator(".note__more a")).toHaveText("All notes");
    await expect(page.locator('.site-nav a[aria-current="true"]')).toHaveText("Notes");
  });
});

test("404 names the missing path", async ({ page }) => {
  await openPage(page, "/404.html");
  await expect(page.locator("h1")).toHaveText("Page not found");
  await expect(page.locator("#err-path")).toHaveText("/404.html");
  await expect(page.locator("#err-meta")).toBeVisible();
});

test.describe("urls, feed and structured data", () => {
  for (const [from, to] of REDIRECTS) {
    test(`${from} moves to ${to}`, async ({ page, request }, testInfo) => {
      onlyDesktop(testInfo);
      const html = await (await request.get(from)).text();
      expect(html).toContain('content="noindex"');
      expect(html).toContain(`rel="canonical" href="https://www.rahulkar.com${to}"`);
      await page.goto(from);
      await expect(page).toHaveURL(new RegExp(`${to.replace(/\//g, "\\/")}$`));
    });
  }

  test("the feed keeps its entry IDs and points at /notes/", async ({ request }, testInfo) => {
    onlyDesktop(testInfo);
    const xml = await (await request.get("/feed.xml")).text();
    expect(xml).toContain("Rahul Kar | Notes");
    expect(xml).toContain("<name>Rahul Kar</name>");
    const links = [...xml.matchAll(/<entry>[\s\S]*?<link href="([^"]+)"/g)].map((m) => m[1]);
    expect(links.length).toBe(3);
    for (const href of links) expect(href.startsWith("https://www.rahulkar.com/notes/")).toBe(true);
    expect(xml).toContain("<id>https://www.rahulkar.com/scribbles/6502-on-two-breadboards</id>");
    expect(xml).toContain("<id>https://www.rahulkar.com/notes/vintage-silicon</id>");
    expect(xml).not.toContain("the-bonsai");
  });

  test("the sitemap lists the new pages and none of the stubs", async ({ request }, testInfo) => {
    onlyDesktop(testInfo);
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const url of ["/notes/", "/notes/vintage-silicon/", "/notes/6502-on-two-breadboards/", "/how-i-work/"]) expect(xml).toContain(`https://www.rahulkar.com${url}<`);
    expect(xml).not.toContain("/scribbles/");
    expect(xml).not.toContain("404");
    expect(xml).not.toContain("the-bonsai");
  });

  test("the profile schema is on the home page only", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await page.goto("/");
    const blocks = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
    const profiles = blocks.filter((b) => b["@type"] === "ProfilePage");
    expect(profiles.length).toBe(1);
    const person = profiles[0].mainEntity;
    expect(person.knowsAbout).toContain("Google ADK");
    expect(person.knowsAbout).not.toContain(null);
    expect(person.address.addressLocality).toBe("Kolkata");
    for (const path of ["/how-i-work/", "/notes/6502-on-two-breadboards/"]) {
      await page.goto(path);
      const others = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
      expect(others.filter((b) => b["@type"] === "ProfilePage").length).toBe(0);
    }
  });
});

test.describe("home hero orbit", () => {
  // A checksum of the canvas pixels: it changes whenever the frame changes.
  const frame = (page) =>
    page.evaluate(() => {
      const c = document.querySelector(".orbital-hero__canvas");
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let h = 0;
      for (let i = 0; i < d.length; i += 997) h = (h * 31 + d[i]) | 0;
      return h;
    });

  test("holds still until the pointer is over it, moves while it is, and stops after it leaves", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
    await page.goto("/");
    await page.waitForSelector("html.is-ready");
    const box = await page.locator("[data-orbital-hero]").boundingBox();
    const still = await frame(page);
    await page.waitForTimeout(400);
    expect(await frame(page)).toBe(still);
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
    await page.waitForTimeout(800);
    expect(await frame(page)).not.toBe(still);
    await page.mouse.move(box.x + box.width * 0.5, 5);
    await page.waitForTimeout(5000);
    const rested = await frame(page);
    await page.waitForTimeout(500);
    expect(await frame(page)).toBe(rested);
  });

  test("reduced motion: the frame does not move, even under the pointer", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForSelector("html.is-ready");
    const box = await page.locator("[data-orbital-hero]").boundingBox();
    const still = await frame(page);
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
    await page.waitForTimeout(800);
    expect(await frame(page)).toBe(still);
  });

  test("the canvas is hidden from assistive tech, and drawn only where the hero has two columns", async ({ page }, testInfo) => {
    await openPage(page, "/");
    const canvas = page.locator(".orbital-hero__canvas");
    await expect(canvas).toHaveCount(testInfo.project.name === "desktop" ? 1 : 0);
    if (testInfo.project.name === "desktop") await expect(canvas).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("#hero-name")).toHaveText("Rahul Kar");
  });

  test("the copy, datum and contact stay above the orbit", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await openPage(page, "/");
    const covered = await page.evaluate(() =>
      [".hero__name", ".hero__role", ".datum", ".contact__title", ".email__address", ".links"].filter((sel) => {
        const r = document.querySelector(sel).getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !(hit && hit.closest(sel));
      })
    );
    expect(covered).toEqual([]);
  });
});
