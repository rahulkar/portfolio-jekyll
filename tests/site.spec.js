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
        // The command menu is on every page and notes with photos add the photo
        // viewer; no other dialog, and all start closed.
        await expect(page.locator("dialog#cmdk")).toHaveCount(1);
        await expect(page.locator("dialog:not(#cmdk):not(.lightbox)")).toHaveCount(0);
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
      expect(Math.abs(size - 96)).toBeLessThan(0.5);
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

    // Contact sits in the footer, which every page carries.
    await expect(page.locator("footer #contact .email__address")).toHaveText("kar.rahul@pm.me");
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
        ys.push((await p.locator(".orbit-band").boundingBox()).y);
        await ctx.close();
      }
      expect(Math.abs(ys[0] - ys[1]), `orbit band at ${viewport.width}px`).toBeLessThanOrEqual(1);
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
  test("four steps, each with what it produces", async ({ page }) => {
    await openPage(page, "/how-i-work/");
    await expect(page.locator("h1")).toHaveText("How I work");
    await expect(page.locator(".playbook__stage")).toHaveCount(4);
    expect(await page.locator(".playbook__stage").first().evaluate((el) => getComputedStyle(el).listStyleType)).toBe("none");
    await expect(page.locator(".playbook__stage h2")).toHaveText(["Discover", "Prototype", "Architect", "Scale"]);
    expect(await page.locator(".playbook__out").evaluateAll((lists) => lists.map((l) => l.children.length))).toEqual([4, 3, 2, 2]);
    // Hand-offs link to the step they feed; the go / no-go mark after
    // Prototype repeats its last output, so screen readers skip it.
    await expect(page.getByRole("link", { name: "Step 2, Prototype" })).toHaveAttribute("href", "#prototype");
    await expect(page.getByRole("link", { name: "Step 3, Architect" })).toHaveAttribute("href", "#architect");
    await expect(page.locator(".playbook__gate")).toHaveCount(1);
    await expect(page.locator("#prototype .playbook__gate")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator('.site-nav a[aria-current="page"]')).toHaveText("How I work");
  });

  test("a hand-off rings the chip of the step it feeds", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await openPage(page, "/how-i-work/");
    const ring = (id) => page.locator(`#${id} > h2`).evaluate((el) => getComputedStyle(el, "::before").outlineStyle);
    const next = page.locator('.playbook__next[href="#prototype"]');
    await next.hover();
    expect(await ring("prototype")).toBe("solid");
    expect(await ring("architect")).toBe("none");
    await next.click();
    await expect(page).toHaveURL(/#prototype$/);
    await page.mouse.move(0, 0);
    expect(await ring("prototype")).toBe("solid");
  });

  test("from 1280px the steps share one rail and their rows line up", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await openPage(page, "/how-i-work/");
    const boxes = (sel) => page.locator(sel).evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((b) => ({ left: Math.round(b.left), top: Math.round(b.top), right: Math.round(b.right) })));
    const names = await boxes(".playbook__stage > h2");
    expect(new Set(names.map((b) => b.top)).size).toBe(1);
    // Each name's rail runs on to the next step's chip.
    for (let i = 0; i < 3; i++) expect(Math.abs(names[i].right - names[i + 1].left)).toBeLessThanOrEqual(1);
    expect(new Set((await boxes(".playbook__label")).map((b) => b.top)).size).toBe(1);
  });

  test("hand-offs are 44px targets", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone sizes only");
    await openPage(page, "/how-i-work/");
    for (const a of await page.locator(".playbook__next").all()) {
      const box = await a.boundingBox();
      expect(Math.round(box.width)).toBeGreaterThanOrEqual(44);
      expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
    }
  });

  test("prints as a one-page brief", async ({ page }, testInfo) => {
    await openPage(page, "/how-i-work/");
    await page.emulateMedia({ media: "print" });
    for (const sel of [".site-header", ".colophon", ".book", ".skip-link"]) await expect(page.locator(sel)).toBeHidden();
    await expect(page.locator(".print-only")).toBeVisible();
    expect(await page.locator("h1").evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(30);
    expect(await page.locator(".playbook__stage p").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(17);
    if (testInfo.project.name === "desktop") {
      const pdf = await page.pdf({ path: testInfo.outputPath("how-i-work.pdf"), format: "A4" });
      expect(pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g)).toHaveLength(1);
    }
  });

  test("printed links spell out their address", async ({ page }) => {
    await openPage(page, "/");
    await page.emulateMedia({ media: "print" });
    const content = await page.locator(".row__link").first().evaluate((el) => getComputedStyle(el, "::after").content);
    // Chrome either resolves attr(href) or serialises the tokens separately.
    expect(content).toMatch(/rahulkar\.com(\/notes\/|"\s+attr\(href\))/);
  });
});

test.describe("icons and drawings", () => {
  test("every icon and drawing is hidden from assistive tech", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    for (const path of PAGES) {
      await openPage(page, path);
      const exposed = await page.evaluate(() => [...document.querySelectorAll("svg.icon, svg.art")].filter((svg) => !svg.closest('[aria-hidden="true"]')).map((svg) => svg.outerHTML.slice(0, 60)));
      expect(exposed, path).toEqual([]);
    }
  });

  test("each step has its drawing and each output its icon", async ({ page }) => {
    await openPage(page, "/how-i-work/");
    await expect(page.locator(".playbook__art > svg.art")).toHaveCount(4);
    await expect(page.locator(".playbook__out > li > svg.icon")).toHaveCount(11);
  });

  test("notes and the 404 carry their drawings; Background, notes and profiles their icons", async ({ page }) => {
    for (const [path, art] of [["/notes/vintage-silicon/", "silicon"], ["/notes/6502-on-two-breadboards/", "breadboard"], ["/notes/how-this-site-is-built/", "site"], ["/404.html", "open-circuit"]]) {
      await openPage(page, path);
      await expect(page.locator(`svg.art--${art}`), path).toHaveCount(1);
    }
    await openPage(page, "/");
    await expect(page.locator(".career__stage > h3 > svg.icon")).toHaveCount(4);
    await expect(page.locator(".fluent > li > svg.icon")).toHaveCount(6);
    await expect(page.locator(".rows .row__title > svg.icon")).toHaveCount(3);
    await expect(page.locator(".links svg.icon--md")).toHaveCount(4);
  });
});

test.describe("notes", () => {
  test("index lists every note as a card, newest first", async ({ page }) => {
    await openPage(page, "/notes/");
    await expect(page.locator("h1")).toHaveText("Notes");
    await expect(page.locator(".note-card")).toHaveCount(3);
    await expect(page.locator(".note-card__title")).toHaveText(["Vintage silicon", "A 6502 computer on two breadboards", "How this site is built"]);
    await expect(page.locator(".note-card__meta").first()).toHaveText(/^\d{1,2} \w{3} \d{4}\s·\s\d+ min read$/);
    await expect(page.locator(".note-card .note-card__art > svg.art")).toHaveCount(3);
    await expect(page.locator('main a[href="/feed.xml"]')).toHaveCount(1);
    await expect(page.locator(".notes-index__meta")).toContainText("3 notes");
    // The whole card is the title link's target.
    const [card, link] = await Promise.all([page.locator(".note-card__inner").first().boundingBox(), page.locator(".note-card__link").first().evaluate((el) => {
      const r = getComputedStyle(el, "::after");
      return [r.position, r.content];
    })]);
    expect(card.height).toBeGreaterThan(200);
    expect(link).toEqual(["absolute", '""']);
  });

  test("the grid closes every row: three across from 1024px, the first card wide at tablet width", async ({ browser }, testInfo) => {
    onlyDesktop(testInfo);
    for (const [width, expected] of [[1440, [1, 1, 1]], [768, [2, 1, 1]], [390, [1, 1, 1]]]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", baseURL: testInfo.project.use.baseURL || "http://127.0.0.1:4173" });
      const p = await ctx.newPage();
      await p.goto("/notes/");
      await p.waitForSelector("html.is-ready");
      const tops = await p.locator(".note-card").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
      const widths = await p.locator(".note-card").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
      const spans = widths.map((w) => Math.round((w / Math.min(...widths)) * 10) / 10);
      expect(spans.map(Math.round), `${width}px`).toEqual(expected);
      if (width === 1440) expect(new Set(tops).size).toBe(1);
      await ctx.close();
    }
  });

  test("topic filter: narrows the grid, keeps the choice in the address, and Back undoes it", async ({ page }) => {
    await openPage(page, "/notes/");
    const topics = page.getByRole("navigation", { name: "Topics" });
    await expect(topics).toBeVisible();
    await expect(topics.locator(".topic")).toHaveText(["All, 3 notes", "Electronics, 1 note", "Retro computing, 2 notes", "Silicon, 1 note", "Web, 1 note"]);
    // Chrome puts a space before the count's hidden comma: "All , 3 notes".
    await expect(topics.locator('[aria-current="true"]')).toHaveAccessibleName(/^All ?, 3 notes$/);
    await topics.locator('[data-topic="retro-computing"]').click();
    await expect(page).toHaveURL(/\/notes\/\?topic=retro-computing$/);
    await expect(page.locator(".note-card__title")).toHaveText(["Vintage silicon", "A 6502 computer on two breadboards"]);
    await expect(topics.locator('[aria-current="true"]')).toHaveAttribute("data-topic", "retro-computing");
    await expect(page.locator("[data-topics-status]")).toHaveText("2 notes on Retro computing");
    // A tag on a card filters in place too.
    await page.locator('.note-card a.tag[href$="topic=silicon"]').click();
    await expect(page.locator(".note-card__title")).toHaveText(["Vintage silicon"]);
    await page.goBack();
    await expect(page.locator(".note-card")).toHaveCount(2);
    await page.goBack();
    await expect(page).toHaveURL(/\/notes\/$/);
    await expect(page.locator(".note-card")).toHaveCount(3);
  });

  test("a topic link on a note lands on the filtered list; an unknown topic shows every note", async ({ page }) => {
    await openPage(page, "/notes/how-this-site-is-built/");
    await page.locator(".note__facts a.tag").click();
    await expect(page).toHaveURL(/\/notes\/\?topic=web$/);
    await page.waitForSelector("html.is-ready");
    await expect(page.locator(".note-card__title")).toHaveText(["How this site is built"]);
    await openPage(page, "/notes/?topic=nothing-here");
    await expect(page.locator(".note-card")).toHaveCount(3);
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
    // The table scrolls on its own if it is wider than the text.
    await expect(page.locator(".note__body .table-scroll > table")).toHaveCount(1);
    await expect(page.locator(".pager__link")).toHaveCount(1);
    await expect(page.locator(".pager__link--older .pager__title")).toHaveText("A 6502 computer on two breadboards");
    await openPage(page, "/");
    await expect(page.locator('#about a[href="/notes/vintage-silicon/"]')).toHaveCount(1);
  });

  test("a note links to the newer and older notes and back to the list", async ({ page }) => {
    await openPage(page, "/notes/6502-on-two-breadboards/");
    await expect(page.locator(".pager__link--newer")).toHaveAttribute("href", "/notes/vintage-silicon/");
    await expect(page.locator(".pager__link--newer")).toHaveAttribute("rel", "prev");
    await expect(page.locator(".pager__link--older .pager__title")).toHaveText("How this site is built");
    await expect(page.locator(".pager__link--older")).toHaveAttribute("rel", "next");
    await expect(page.locator(".note__more .link-arrow")).toHaveText("All notes");
    await expect(page.locator(".note__top")).toHaveAttribute("href", "#main");
    await expect(page.locator('.site-nav a[aria-current="true"]')).toHaveText("Notes");
    await openPage(page, "/notes/how-this-site-is-built/");
    await expect(page.locator(".pager__link")).toHaveCount(1);
    await expect(page.locator(".pager__link--newer .pager__title")).toHaveText("A 6502 computer on two breadboards");
  });

  test("the head of a note: facts, and contents that match its sections", async ({ page }) => {
    await openPage(page, "/notes/6502-on-two-breadboards/");
    const facts = page.locator(".note__facts");
    await expect(facts.locator("dt")).toHaveText(["Author", "Published", "Updated", "Reading time", "Topics"]);
    await expect(facts.locator("dd").nth(1)).toHaveText("11 Oct 2026");
    await expect(facts.locator("dd time").nth(1)).toHaveAttribute("datetime", "2026-10-17");
    await expect(facts.locator("dd").nth(3)).toHaveText(/^\d+ min$/);
    await expect(facts.locator("a.tag")).toHaveText(["Retro computing", "Electronics"]);
    // A note without an update shows no Updated line.
    await openPage(page, "/notes/vintage-silicon/");
    await expect(page.locator(".note__facts dt")).toHaveText(["Author", "Published", "Reading time", "Topics"]);
    const toc = page.getByRole("navigation", { name: "Contents" });
    const ids = await page.locator(".note__body > h2").evaluateAll((hs) => hs.map((h) => "#" + h.id));
    expect(ids).toHaveLength(4);
    expect(await toc.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")))).toEqual(ids);
    await expect(toc.locator("a").first()).toHaveText("01Apollo Guidance Computer logic chip");
    // Each section heading links to itself.
    for (const id of ids) await expect(page.locator(`.note__body > h2${id} > a.heading-link`)).toHaveAttribute("href", id);
    // A note with no sections has no contents list.
    await openPage(page, "/notes/how-this-site-is-built/");
    await expect(page.locator(".toc")).toHaveCount(0);
  });

  test("from 1024px the contents and share links stay beside the text and mark the section being read", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await openPage(page, "/notes/vintage-silicon/");
    const rail = page.locator(".note__rail");
    await expect(rail.locator(".share")).toBeVisible();
    await expect(page.locator(".note__foot .share")).toBeHidden();
    await page.locator("#intel-c4004").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 200));
    await expect(rail.locator('.toc a[aria-current="location"]')).toHaveAttribute("href", "#intel-c4004");
    const box = await rail.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(64);
    expect(box.y).toBeLessThan(120);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(rail.locator('.toc a[aria-current="location"]')).toHaveAttribute("href", "#side-by-side");
  });

  test("share links: each network gets the note's address, and open in a new tab", async ({ page }) => {
    await openPage(page, "/notes/vintage-silicon/");
    const u = encodeURIComponent("https://www.rahulkar.com/notes/vintage-silicon/");
    const t = encodeURIComponent("Vintage silicon");
    const share = page.locator(".share:visible");
    await expect(share).toHaveCount(1);
    const hrefs = await share.locator(".share__link").evaluateAll((as) => as.map((a) => [a.dataset.label, a.getAttribute("href"), a.target, a.rel]));
    expect(hrefs.map((h) => h[0])).toEqual(["LinkedIn", "X", "Bluesky", "Hacker News", "Reddit", "WhatsApp", "Email"]);
    const href = Object.fromEntries(hrefs.map((h) => [h[0], h[1]]));
    expect(href.LinkedIn).toBe(`https://www.linkedin.com/sharing/share-offsite/?url=${u}`);
    expect(href.X).toBe(`https://x.com/intent/tweet?text=${t}&url=${u}`);
    expect(href.Bluesky).toBe(`https://bsky.app/intent/compose?text=${t}%20${u}`);
    expect(href["Hacker News"]).toBe(`https://news.ycombinator.com/submitlink?u=${u}&t=${t}`);
    expect(href.Reddit).toBe(`https://www.reddit.com/submit?url=${u}&title=${t}`);
    expect(href.WhatsApp).toBe(`https://wa.me/?text=${t}%20${u}`);
    expect(href.Email.startsWith(`mailto:?subject=${t}&body=Three%20chips%20from`)).toBe(true);
    expect(href.Email.endsWith(`%0A%0A${u}`)).toBe(true);
    for (const [label, , target, rel] of hrefs) {
      if (label === "Email") continue;
      expect(target, label).toBe("_blank");
      expect(rel, label).toBe("noopener noreferrer");
    }
    await expect(share.locator(".share__link").first()).toHaveAccessibleName("Share on LinkedIn (opens in a new tab)");
  });

  test("Copy link copies the note's address and says so", async ({ page, context }, testInfo) => {
    onlyDesktop(testInfo);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openPage(page, "/notes/6502-on-two-breadboards/");
    const copy = page.locator(".share:visible [data-copy-link]");
    await expect(copy).toBeVisible();
    await copy.click();
    await expect(copy).toHaveText("Copied");
    await expect(page.locator(".share:visible [data-share-status]")).toHaveText("Link copied.");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("https://www.rahulkar.com/notes/6502-on-two-breadboards/");
  });

  test("without clipboard access, Copy link shows the address selected", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: undefined }));
    await openPage(page, "/notes/6502-on-two-breadboards/");
    await page.locator(".share:visible [data-copy-link]").click();
    const field = page.locator(".share:visible .share__url");
    await expect(field).toBeVisible();
    await expect(field).toBeFocused();
    expect(await field.evaluate((el) => el.value.slice(el.selectionStart, el.selectionEnd))).toBe("https://www.rahulkar.com/notes/6502-on-two-breadboards/");
    await expect(page.locator(".share:visible [data-share-status]")).toContainText("The link is selected");
  });

  test("the photo viewer opens a photo large, steps through the note's photos and gives focus back", async ({ page }) => {
    await openPage(page, "/notes/vintage-silicon/");
    const viewer = page.getByRole("dialog", { name: "Photo viewer" });
    const first = page.locator(".note__body .figure__link").first();
    await first.click();
    await expect(viewer).toBeVisible();
    await expect(page.locator("[data-lightbox-count]")).toHaveText("1 of 4");
    await expect(viewer.locator("img")).toHaveAttribute("src", "/assets/img/apollo-agc-chip-1-1280.webp");
    await expect(viewer.locator("figcaption")).toHaveText("In its potting compound, on an anti-static bag.");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("[data-lightbox-count]")).toHaveText("2 of 4");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("[data-lightbox-count]")).toHaveText("4 of 4");
    await expect(viewer.locator("img")).toHaveAttribute("alt", /Pentium/);
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
    await expect(first).toBeFocused();
  });

  test("the photo viewer passes axe while open", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    for (const scheme of SCHEMES) {
      await openPage(page, "/notes/6502-on-two-breadboards/", scheme);
      await page.locator(".note__body .figure__link").first().click();
      await expect(page.locator(".lightbox[open]")).toBeVisible();
      // The parts key does not carry over (the viewer has no callouts); the alt text stands in.
      await expect(page.locator(".lightbox figcaption")).toHaveText(/^A 6502 computer built on two breadboards/);
      const results = await new AxeBuilder({ page }).include(".lightbox").analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), scheme).toEqual([]);
    }
  });

  test("a reading-progress line follows the scroll, with no script", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await openPage(page, "/notes/vintage-silicon/");
    const progress = page.locator(".progress");
    expect(await progress.evaluate((el) => [getComputedStyle(el).animationName, getComputedStyle(el).position])).toEqual(["note-progress", "fixed"]);
    const scale = () => progress.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    expect(await scale()).toBeLessThan(0.05);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(scale).toBeGreaterThan(0.95);
  });

  test("touch targets on notes are at least 44px", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone sizes only");
    for (const [path, sels] of [["/notes/", [".topic", ".notes-index__feed"]], ["/notes/6502-on-two-breadboards/", [".note__crumb a", ".share:visible .share__link", ".share:visible .share__button:visible", ".pager__link", ".note__more a"]]]) {
      await openPage(page, path);
      for (const sel of sels) {
        const els = await page.locator(sel).all();
        expect(els.length, sel).toBeGreaterThan(0);
        for (const el of els) {
          const box = await el.boundingBox();
          expect(Math.round(box.width), `${sel} width`).toBeGreaterThanOrEqual(44);
          expect(Math.round(box.height), `${sel} height`).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });
});

test.describe("notes without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every note shows, the filter and script-only buttons stay hidden, and photos link to their files", async ({ page }) => {
    await page.goto("/notes/?topic=web");
    await expect(page.locator(".note-card")).toHaveCount(3);
    await expect(page.locator(".topics")).toBeHidden();
    await page.goto("/notes/vintage-silicon/");
    await expect(page.locator(".share__link:visible")).toHaveCount(7);
    for (const sel of ["[data-copy-link]", "[data-share-native]", ".share__url", ".lightbox"]) {
      for (const el of await page.locator(sel).all()) await expect(el).toBeHidden();
    }
    await expect(page.locator(".note__body .figure__link").first()).toHaveAttribute("href", "/assets/img/apollo-agc-chip-1-1280.jpg");
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
    expect(xml).toContain('<category term="retro-computing" label="Retro computing"/>');
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

  test("a note shares as an article: its own card, dates, topics and breadcrumbs", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await page.goto("/notes/6502-on-two-breadboards/");
    const meta = (sel) => page.locator(sel).getAttribute("content");
    expect(await meta('meta[property="og:type"]')).toBe("article");
    expect(await meta('meta[property="og:image"]')).toBe("https://www.rahulkar.com/assets/og/notes/6502-on-two-breadboards-v1.png");
    expect(await meta('meta[property="twitter:image"]')).toBe("https://www.rahulkar.com/assets/og/notes/6502-on-two-breadboards-v1.png");
    expect(await meta('meta[property="article:modified_time"]')).toMatch(/^2026-10-17T/);
    expect(await page.locator('meta[property="article:tag"]').evaluateAll((ms) => ms.map((m) => m.content))).toEqual(["Retro computing", "Electronics"]);
    const card = await page.request.get("/assets/og/notes/6502-on-two-breadboards-v1.png");
    expect(card.status()).toBe(200);
    expect(card.headers()["content-type"]).toBe("image/png");
    const blocks = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
    const crumbs = blocks.find((b) => b["@type"] === "BreadcrumbList");
    expect(crumbs.itemListElement.map((i) => i.name)).toEqual(["Home", "Notes", "A 6502 computer on two breadboards"]);
    expect(crumbs.itemListElement[2].item).toBe("https://www.rahulkar.com/notes/6502-on-two-breadboards/");
    expect(blocks.find((b) => b["@type"] === "BlogPosting").dateModified).toMatch(/^2026-10-17/);
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
    const box = await page.locator('[data-orbital-hero="wide"]').boundingBox();
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
    const box = await page.locator('[data-orbital-hero="wide"]').boundingBox();
    const still = await frame(page);
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
    await page.waitForTimeout(800);
    expect(await frame(page)).toBe(still);
  });

  test("the canvas is hidden from assistive tech, and there is one orbit at every width", async ({ page }) => {
    await openPage(page, "/");
    const canvas = page.locator(".orbital-hero__canvas");
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("#hero-name")).toHaveText("Rahul Kar");
  });

  test("below 1024px the orbit band sits between the hero and Background", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone and tablet widths only");
    await openPage(page, "/");
    const band = await page.locator('[data-orbital-hero="narrow"]').boundingBox();
    const datum = await page.locator(".hero .datum").boundingBox();
    const background = await page.locator("#background").boundingBox();
    expect(band.y).toBeGreaterThanOrEqual(datum.y + datum.height);
    expect(band.y + band.height).toBeLessThanOrEqual(background.y);
  });

  test("the copy and datum stay above the orbit", async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await openPage(page, "/");
    const covered = await page.evaluate(() =>
      [".hero__name", ".hero__role", ".datum", ".hero__facts"].filter((sel) => {
        const r = document.querySelector(sel).getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !(hit && hit.closest(sel));
      })
    );
    expect(covered).toEqual([]);
  });
});
