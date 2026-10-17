// The site tests itself: structure, console/CSP cleanliness, keyboard paths
// and axe accessibility checks at phone and desktop widths, plus full-page
// screenshots kept as CI artifacts for a human look.
// Run `bundle exec jekyll build` first; tests serve the built _site folder.
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 45000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tools/serve.mjs 4173 _site",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "small", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 640 } } },
  ],
});
