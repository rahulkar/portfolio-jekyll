import { mountOrbitalHero, SOLAR_SYSTEM, type OrbitalHero, type OrbitalHeroOptions } from "./orbital-hero";

// The component draws Mars in red. On this site red only means "now", so Mars
// is drawn in a pale tan here.
const PLANETS = SOLAR_SYSTEM.map((p) => (p.name === "Mars" ? { ...p, color: "#e8b48c" } : p));

// The home hero keeps its copy on the left and its contact column on the right.
// The Sun sits low on the right, clear of the contact column, and a scrim keeps
// the left-hand copy readable.
const FRAME: Partial<OrbitalHeroOptions> = {
  background: "#121211",
  planets: PLANETS,
  focus: [0.8, 0.8],
  scrim: "left",
  scrimStrength: 0.9,
  viewRadius: 3.1,
  lead: 0.12,
  glow: 0.9,
};

// Below 1024px the hero stacks into one column, and the copy, datum and contact
// fill the stage, so the orbit is not drawn there.
const wide = window.matchMedia("(min-width: 64em)");

function start() {
  document.querySelectorAll<HTMLElement>("[data-orbital-hero]").forEach((host) => {
    let hero: OrbitalHero | null = null;
    const sync = () => {
      if (wide.matches && !hero) hero = mountOrbitalHero(host, FRAME);
      else if (!wide.matches && hero) {
        hero.destroy();
        hero = null;
      }
    };
    sync();
    wide.addEventListener("change", sync);
  });
}

if (document.readyState !== "loading") start();
else document.addEventListener("DOMContentLoaded", start);
