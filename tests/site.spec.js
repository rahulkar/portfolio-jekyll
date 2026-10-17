const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

// Console noise that is not the site's fault (local antivirus injection).
const IGNORED = [/kaspersky/i];

const PAGES = ["/", "/how-i-work/", "/notes/", "/notes/6502-on-two-breadboards/", "/notes/the-bonsai/", "/notes/how-this-site-is-built/", "/404.html"];
const SCHEMES = ["light", "dark"];
const INK = { light: "rgb(22, 22, 21)", dark: "rgb(236, 234, 228)" };
const ACCENT = { light: "rgb(196, 43, 28)", dark: "rgb(238, 90, 63)" };
const LEDE = "I take ambiguous problems to a working prototype in days, then to a platform your team can run without me.";
const REDIRECTS = [
  ["/scribbles/", "/notes/"],
  ["/scribbles/6502-on-two-breadboards/", "/notes/6502-on-two-breadboards/"],
  ["/scribbles/the-bonsai/", "/notes/the-bonsai/"],
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
        await expect(page.locator("dialog")).toHaveCount(0);
        // The only style attribute is the clock's --now on the datum.
        const styled = await page.evaluate(() => [...document.querySelectorAll("[style]")].map((el) => [el.matches("[data-datum]"), el.getAttribute("style")]));
        for (const [isDatum, style] of styled) {
          expect(isDatum).toBe(true);
          expect(style).toMatch(/^--now:\s*[\d.]+;?$/);
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
    await expect(page.locator(".datum__note")).toContainText("Working hours");
  });
});

test.describe("datum for a visitor in Kolkata", () => {
  test.use({ timezoneId: "Asia/Kolkata" });

  test("no visitor clause", async ({ page }) => {
    await openPage(page, "/");
    await expect(page.locator(".datum__tick")).toBeVisible();
    await expect(page.locator(".datum__local")).toBeHidden();
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the datum's scale renders and the live parts stay hidden", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".datum__label")).toBeVisible();
    await expect(page.locator(".datum__hours")).toBeVisible();
    for (const sel of [".datum__tick", ".datum__now", ".datum__local", "#theme-btn", ".copy"]) {
      await expect(page.locator(sel)).toBeHidden();
    }
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
    await expect(page.locator(".hero__lede")).toHaveText(LEDE);
    await expect(page.locator(".hero__meta dt")).toHaveText(["Practice", "Now", "Earlier"]);
    await expect(page.locator(".hero .book .button")).toHaveAttribute("href", /^mailto:kar\.rahul@pm\.me\?subject=20%20minutes%3F/);
    await expect(page.locator(".hero .book__hint")).toHaveText("Opens an email with the subject filled in.");
  });

  test("sections, approach and background", async ({ page }) => {
    await openPage(page, "/");
    expect(await page.locator("main section[id]").evaluateAll((els) => els.map((el) => el.id))).toEqual(["approach", "background", "about", "notes"]);
    await expect(page.locator("#approach .stage")).toHaveCount(4);
    for (const stage of await page.locator("#approach .stage").all()) await expect(stage).toBeVisible();
    await expect(page.locator("#approach button")).toHaveCount(0);
    expect(await page.locator(".stage").first().evaluate((el) => getComputedStyle(el).listStyleType)).toBe("none");
    await expect(page.locator("#background h3")).toHaveText(["Quality engineering and automation", "DevOps and cloud", "Architecture and delivery", "Agentic AI"]);
    await expect(page.locator("#background img")).toHaveCount(0);
  });

  test("about, notes and contact", async ({ page }) => {
    await openPage(page, "/");
    const link = page.locator("#about figure a");
    await expect(link).toHaveAttribute("href", "/assets/img/6502-1280.jpg");
    expect(await link.evaluate((el) => getComputedStyle(el).display)).toBe("block");
    await link.scrollIntoViewIfNeeded();
    const [a, img] = [await link.boundingBox(), await page.locator("#about figure img").boundingBox()];
    expect(a.height).toBeGreaterThanOrEqual(img.height - 0.5);
    await expect(page.locator("#about")).toContainText("Kolkata");

    await expect(page.locator("#notes .row")).toHaveCount(3);
    expect(await page.locator("#notes .row__link").first().evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe("underline");

    // Contact sits in the hero, beside the intro, so it is on the first screen.
    await expect(page.locator(".hero #contact .email__address")).toHaveText("kar.rahul@pm.me");
    await expect(page.locator(".book__hint")).toHaveCount(1);
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
    const sels = [".site-header__name", ".site-nav a", "#theme-btn", ".button", ".link-arrow", ".copy", ".links a", ".section__coda > a"];
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
        ys.push((await p.locator(".hero__meta").boundingBox()).y);
        await ctx.close();
      }
      expect(Math.abs(ys[0] - ys[1]), `hero meta at ${viewport.width}px`).toBeLessThanOrEqual(1);
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
  for (const [path, scheme] of [["/", "light"], ["/how-i-work/", "light"], ["/", "dark"], ["/notes/the-bonsai/", "dark"]]) {
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

test.describe("approach page", () => {
  test("four stages, all text visible, one booking hint", async ({ page }) => {
    await openPage(page, "/how-i-work/");
    await expect(page.locator("h1")).toHaveText("How I'd approach your problem");
    await expect(page.locator(".playbook__stage")).toHaveCount(4);
    expect(await page.locator(".playbook__stage").first().evaluate((el) => getComputedStyle(el).listStyleType)).toBe("none");
    await expect(page.locator(".playbook dt")).toHaveText(Array(4).fill(["What happens", "What you get"]).flat());
    await expect(page.locator(".book__hint")).toBeVisible();
    await expect(page.locator('.site-nav a[aria-current="page"]')).toHaveText("Approach");
  });

  test("prints as a brief", async ({ page }, testInfo) => {
    await openPage(page, "/how-i-work/");
    await page.emulateMedia({ media: "print" });
    for (const sel of [".site-header", ".colophon", ".book", ".skip-link"]) await expect(page.locator(sel)).toBeHidden();
    await expect(page.locator(".print-only")).toBeVisible();
    expect(await page.locator("h1").evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(30);
    expect(await page.locator(".playbook dd").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(15);
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
    await expect(page.locator(".row__title")).toHaveText(["The 6502 on two breadboards", "The bonsai", "How this site is built"]);
    await expect(page.locator('main a[href="/feed.xml"]')).toHaveCount(1);
  });

  test("a note ends with the author line", async ({ page }) => {
    await openPage(page, "/notes/the-bonsai/");
    await expect(page.locator(".note__author")).toContainText("Rahul Kar is an enterprise solution architect in Kolkata.");
    await expect(page.locator('.note__author a[href^="mailto:"]')).toHaveCount(1);
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
    expect(xml).toContain("<id>https://www.rahulkar.com/scribbles/the-bonsai</id>");
  });

  test("the sitemap lists the new pages and none of the stubs", async ({ request }, testInfo) => {
    onlyDesktop(testInfo);
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const url of ["/notes/", "/notes/the-bonsai/", "/how-i-work/"]) expect(xml).toContain(`https://www.rahulkar.com${url}<`);
    expect(xml).not.toContain("/scribbles/");
    expect(xml).not.toContain("404");
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
    for (const path of ["/how-i-work/", "/notes/the-bonsai/"]) {
      await page.goto(path);
      const others = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
      expect(others.filter((b) => b["@type"] === "ProfilePage").length).toBe(0);
    }
  });
});
