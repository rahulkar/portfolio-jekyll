import { mountOrbitalHero, SOLAR_SYSTEM, type OrbitalHero, type OrbitalHeroOptions } from "./orbital-hero";

// The component draws Mars in red. On this site red only means "now", so Mars
// is drawn in a pale tan here.
const PLANETS = SOLAR_SYSTEM.map((p) => (p.name === "Mars" ? { ...p, color: "#e8b48c" } : p));

const BASE: Partial<OrbitalHeroOptions> = {
  background: "#121211",
  planets: PLANETS,
};

// The wide stage behind the home hero. The copy is on the left and the contact
// column on the right, so the Sun sits low on the right, clear of the contact
// column, and a scrim keeps the left-hand copy readable.
const STAGE: Partial<OrbitalHeroOptions> = {
  ...BASE,
  focus: [0.75, 0.5],
  scrim: "left",
  scrimStrength: 0.9,
  viewRadius: 2.6,
  lead: 0.12,
  glow: 0.9,
};

// The band below 1024px. Nothing sits over it, so the Sun can sit mid-band.
const BAND: Partial<OrbitalHeroOptions> = {
  ...BASE,
  focus: [0.6, 0.5],
  scrim: "none",
  viewRadius: 2.2,
  lead: 0.1,
  glow: 1,
};

const wide = window.matchMedia("(min-width: 64em)");
const narrow = window.matchMedia("(max-width: 63.99em)");

// Each host names its own layout: data-orbital-hero="wide" or "narrow".
function start() {
  document.querySelectorAll<HTMLElement>("[data-orbital-hero]").forEach((host) => {
    const isWide = host.dataset.orbitalHero === "wide";
    const media = isWide ? wide : narrow;
    const frame = isWide ? STAGE : BAND;
    let hero: OrbitalHero | null = null;
    const sync = () => {
      if (media.matches && !hero) hero = mountOrbitalHero(host, frame);
      else if (!media.matches && hero) {
        hero.destroy();
        hero = null;
      }
    };
    sync();
    media.addEventListener("change", sync);
  });
}

if (document.readyState !== "loading") start();
else document.addEventListener("DOMContentLoaded", start);
