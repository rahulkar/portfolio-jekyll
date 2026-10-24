// The orbital hero: the Sun's track through space, with a helical wake behind
// every planet. Ported from the React component supplied for this site. The
// maths and the drawing are the same; the React wrapper is gone, so nothing
// here writes inline styles or HTML strings, which the CSP lint checks for.
//
// The Sun moves at 19.4 km/s toward the solar apex in Hercules, so the camera
// rides with it: the stars slide past with depth, and each planet leaves a
// spiral behind it as it chases the Sun. Time runs only while the pointer is
// over the stage, and never under reduced motion, so the page starts still.

export type Planet = {
  name: string;
  /** Semi-major axis, in astronomical units. */
  a: number;
  /** Eccentricity. */
  e: number;
  /** Inclination to the ecliptic, in degrees. */
  i: number;
  /** Longitude of the ascending node, in degrees. */
  node: number;
  /** Argument of perihelion, in degrees. */
  peri: number;
  /** Mean anomaly at the J2000 epoch, in degrees. */
  M0: number;
  color: string;
  /** Dot radius in px. Not to scale: nothing would be visible if it were. */
  size: number;
  /** Per-planet brightness multiplier. */
  glow?: number;
};

export type OrbitalHeroOptions = {
  /** Bodies to run. Defaults to the eight planets with J2000 elements. */
  planets: Planet[];
  /** Seconds of wall clock per Earth year, while motion is running. */
  yearSeconds: number;
  /** How much past track each planet keeps, in Earth years. */
  trailYears: number;
  /**
   * Radial squeeze, applied to the drawing only: a planet at r AU is drawn at
   * r^compress. Around 0.42 the orbits spread out evenly across the frame.
   */
  compress: number;
  /** Cap on how many turns of wake a fast planet keeps, so it stays readable. */
  maxTurns: number;
  /** Fans the orbit planes apart, 0 to 1. At 0 the planets share one flat disc. */
  planeSpread: number;
  /** Stretches the orbits, 0 to 1. */
  eccentricity: number;
  /** Swings every orbit onto the plane square to the Sun's course, 0 to 1. */
  alignToCourse: number;
  /** The Sun's speed through the local star field, in drawn units per year. */
  driftSpeed: number;
  /** Ecliptic longitude and latitude of the solar apex, in degrees. */
  apex: [number, number];
  /** Half-width of the view, in AU. */
  viewRadius: number;
  /** Camera pitch in degrees. 0 looks straight down on the ecliptic, 90 is edge-on. */
  tilt: number;
  /** Camera yaw in degrees. */
  spin: number;
  /** Camera roll in degrees. Sets which way the helix runs across the screen. */
  roll: number;
  /** How far ahead of centre the Sun sits, as a fraction of the short side. */
  lead: number;
  /** Where to put the Sun in the frame, as fractions of width and height. */
  focus: [number, number];
  /** Lays a black veil over one edge so text can sit there and still be read. */
  scrim: "none" | "left" | "right" | "top" | "bottom";
  /** How dark the veil gets at the edge it starts from, 0 to 1. */
  scrimStrength: number;
  /** Number of background stars. */
  starCount: number;
  /** Overall bloom strength, 0 to 2. */
  glow: number;
  /** Add a faint closed ellipse behind each planet. */
  showOrbits: boolean;
  /** Draw the Sun's own straight track through space. */
  showSunTrack: boolean;
  /** Let the pointer nudge the camera. */
  interactive: boolean;
  /** Freeze on the current frame, whatever the pointer does. */
  paused: boolean;
  /** Fill behind the scene. A page can set it to match its own dark background. */
  background: string;
  sunColor: string;
};

export type OrbitalHero = {
  /** Stops the loop and removes the canvas and listeners. */
  destroy(): void;
};

/* Real orbital elements, J2000, referred to the ecliptic. */

export const SOLAR_SYSTEM: Planet[] = [
  { name: "Mercury", a: 0.38710, e: 0.20563, i: 7.005, node: 48.331, peri: 29.125, M0: 174.796, color: "#fff0d0", size: 2.2 },
  { name: "Venus",   a: 0.72333, e: 0.00677, i: 3.395, node: 76.680, peri: 54.853, M0: 50.115,  color: "#ffc65a", size: 3.4 },
  { name: "Earth",   a: 1.00000, e: 0.01671, i: 0.000, node: 348.739, peri: 114.208, M0: 357.517, color: "#5fd8ff", size: 3.8, glow: 1.1 },
  { name: "Mars",    a: 1.52371, e: 0.09339, i: 1.850, node: 49.558, peri: 286.483, M0: 19.373, color: "#ff4a32", size: 2.9 },
  { name: "Jupiter", a: 5.20290, e: 0.04839, i: 1.303, node: 100.464, peri: 273.867, M0: 20.020, color: "#ffa62e", size: 5.4 },
  { name: "Saturn",  a: 9.53700, e: 0.05386, i: 2.485, node: 113.665, peri: 339.392, M0: 317.020, color: "#ffd884", size: 4.8 },
  { name: "Uranus",  a: 19.1913, e: 0.04726, i: 0.773, node: 74.006, peri: 98.999, M0: 142.238, color: "#7fe6ff", size: 4.2 },
  { name: "Neptune", a: 30.0690, e: 0.00859, i: 1.770, node: 131.784, peri: 276.336, M0: 256.228, color: "#3f7dff", size: 4.4 },
];

/** Just the four rocky ones, for a tighter frame. */
export const INNER_PLANETS: Planet[] = SOLAR_SYSTEM.slice(0, 4);

const DEFAULTS: OrbitalHeroOptions = {
  planets: SOLAR_SYSTEM,
  yearSeconds: 16,
  trailYears: 2.6,
  compress: 0.42,
  maxTurns: 3,
  planeSpread: 1,
  eccentricity: 0.25,
  alignToCourse: 1,
  driftSpeed: 1.5,
  apex: [272, 53],
  viewRadius: 3.4,
  tilt: 45,
  spin: 252,
  roll: 13.5,
  lead: 0.12,
  focus: [0.5, 0.5],
  scrim: "none",
  scrimStrength: 0.88,
  starCount: 1500,
  glow: 1,
  showOrbits: false,
  showSunTrack: true,
  interactive: true,
  paused: false,
  background: "#000000",
  sunColor: "#FFF2CC",
};

/**
 * Extra tilt and swing added to each orbit plane at planeSpread = 1, in
 * degrees. Fixed rather than random, so the rosette is the same every load.
 */
const PLANE_FAN: Array<[number, number]> = [
  [58, 35], [27, 145], [71, 250], [40, 80],
  [84, 190], [33, 310], [62, 120], [15, 20],
];

/** Eccentricity each orbit is pulled toward at eccentricity = 1. */
const ECC_FAN = [0.52, 0.34, 0.63, 0.44, 0.3, 0.58, 0.4, 0.68];

const TAU = Math.PI * 2;
const RAD = Math.PI / 180;

type RGB = [number, number, number];
type Vec = { x: number; y: number; z: number };

type Elements = {
  p: Planet;
  rgb: RGB;
  /** Eccentricity actually drawn. */
  e: number;
  /** Years for one lap, from Kepler's third law on the drawn spacing. */
  period: number;
  /** Mean motion, in radians per year. */
  n: number;
  cw: number;
  sw: number;
  ci: number;
  si: number;
  cn: number;
  sn: number;
  M0: number;
  /** Turns the orbit plane onto the one square to the Sun's course. */
  swing: number[] | null;
};

type Shot = { el: Elements; x: number; y: number; depth: number; s: number };

const NOOP: OrbitalHero = { destroy() {} };

/** Kepler's equation M = E - e sin E, solved for the eccentric anomaly. */
function eccentricAnomaly(M: number, e: number): number {
  let m = M % TAU;
  if (m < 0) m += TAU;
  let E = m + e * Math.sin(m) * (1 + e * Math.cos(m));
  for (let k = 0; k < 8; k++) {
    const step = (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
    E -= step;
    if (Math.abs(step) < 1e-10) break;
  }
  return E;
}

function parseRGB(color: string): RGB {
  const c = color.trim();
  if (c[0] === "#") {
    const hex = c.slice(1);
    const full = hex.length === 3 ? hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] : hex.slice(0, 6);
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = color.match(/(\d+(?:\.\d+)?)/g);
  if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  return [255, 255, 255];
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds the rotation that swings an orbit plane toward the plane standing
 * square to the Sun's course. At align = 1 the normal ends up along the course,
 * so every wake is a true helix about one shared axis.
 */
function swingToCourse(nx: number, ny: number, nz: number, align: number, dir: Vec): number[] | null {
  // Aim at whichever end of the course the plane already leans toward, so an
  // orbit is never turned inside out.
  const s = nx * dir.x + ny * dir.y + nz * dir.z >= 0 ? 1 : -1;
  let tx = nx + align * (s * dir.x - nx);
  let ty = ny + align * (s * dir.y - ny);
  let tz = nz + align * (s * dir.z - nz);
  const tl = Math.hypot(tx, ty, tz);
  if (tl < 1e-9) return null;
  tx /= tl; ty /= tl; tz /= tl;
  // Rodrigues: rotate n onto the blended normal, about their cross product.
  let ax = ny * tz - nz * ty;
  let ay = nz * tx - nx * tz;
  let az = nx * ty - ny * tx;
  const al = Math.hypot(ax, ay, az);
  if (al < 1e-9) return null;
  ax /= al; ay /= al; az /= al;
  const c = Math.max(-1, Math.min(1, nx * tx + ny * ty + nz * tz));
  const k = 1 - c;
  return [
    c + ax * ax * k, ax * ay * k - az * al, ax * az * k + ay * al,
    ay * ax * k + az * al, c + ay * ay * k, ay * az * k - ax * al,
    az * ax * k - ay * al, az * ay * k + ax * al, c + az * az * k,
  ];
}

/** Mounts the hero into `host`, adding one canvas to it. */
export function mountOrbitalHero(host: HTMLElement, options: Partial<OrbitalHeroOptions> = {}): OrbitalHero {
  const canvas = document.createElement("canvas");
  canvas.className = "orbital-hero__canvas";
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return NOOP;
  host.appendChild(canvas);
  return createHero(host, canvas, ctx, options);
}

/** Runs the hero on a canvas that is already in the host. */
function createHero(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  options: Partial<OrbitalHeroOptions>
): OrbitalHero {
  const reduced =
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const opts: OrbitalHeroOptions = { ...DEFAULTS, ...options };
  let width = 0;
  let height = 0;
  let dpr = 1;
  /** Simulation clock, in Earth years since J2000. */
  let years = 1.7;
  /** How far the Sun has travelled, in AU. */
  let dist = 0;
  let running = true;
  let visible = true;
  let hovering = false;
  let raf = 0;
  let lastFrame = 0;

  // Camera. World axes: x and y span the ecliptic, z points to its north pole.
  let pxPerAU = 1;
  let cx = 0;
  let cy = 0;
  let camDist = 1;
  let dNear = 60;
  let dFar = 1400;
  let pointerX = 0;
  let pointerY = 0;
  let camX = 0;
  let camY = 0;
  const RIGHT: Vec = { x: 1, y: 0, z: 0 };
  const UP: Vec = { x: 0, y: 1, z: 0 };
  const FWD: Vec = { x: 0, y: 0, z: 1 };
  // Ecliptic direction of the solar apex, as a unit vector.
  const DIR: Vec = { x: 0, y: 0, z: 0 };
  // Scratch output for project() and helio(), reused to keep the loop allocation-free.
  const P = { x: 0, y: 0, depth: 0, s: 0, ok: false };
  const R3: Vec = { x: 0, y: 0, z: 0 };

  function setCamera(yawDeg: number, pitchDeg: number, rollDeg: number) {
    const A = yawDeg * RAD;
    const B = pitchDeg * RAD;
    const ca = Math.cos(A);
    const sa = Math.sin(A);
    const cb = Math.cos(B);
    const sb = Math.sin(B);
    const rx = ca, ry = sa, rz = 0;
    const ux = -sa * cb, uy = ca * cb, uz = sb;
    FWD.x = sa * sb; FWD.y = -ca * sb; FWD.z = cb;
    // Roll turns the picture about the line of sight. It changes nothing in
    // space, only which way the helix runs across the screen.
    const C = rollDeg * RAD;
    const cr = Math.cos(C);
    const sr = Math.sin(C);
    RIGHT.x = rx * cr + ux * sr;
    RIGHT.y = ry * cr + uy * sr;
    RIGHT.z = rz * cr + uz * sr;
    UP.x = -rx * sr + ux * cr;
    UP.y = -ry * sr + uy * cr;
    UP.z = -rz * sr + uz * cr;
  }

  /** World offset from the Sun to screen. Writes P. */
  function project(dx: number, dy: number, dz: number) {
    const vx = dx * RIGHT.x + dy * RIGHT.y + dz * RIGHT.z;
    const vy = dx * UP.x + dy * UP.y + dz * UP.z;
    const vz = dx * FWD.x + dy * FWD.y + dz * FWD.z;
    const depth = camDist - vz;
    if (depth < 0.6) {
      P.ok = false;
      return;
    }
    const s = camDist / depth;
    P.x = cx + vx * pxPerAU * s;
    P.y = cy - vy * pxPerAU * s;
    P.depth = depth;
    P.s = s;
    P.ok = true;
  }

  function setApex(lonDeg: number, latDeg: number) {
    const l = lonDeg * RAD;
    const b = latDeg * RAD;
    DIR.x = Math.cos(b) * Math.cos(l);
    DIR.y = Math.cos(b) * Math.sin(l);
    DIR.z = Math.sin(b);
  }

  function elementsOf(p: Planet, index: number): Elements {
    // Kepler's third law on the squeezed spacing: P squared is a cubed.
    const aDraw = Math.pow(p.a, opts.compress);
    const period = Math.pow(aDraw, 1.5);
    const fan = PLANE_FAN[index % PLANE_FAN.length];
    const inc = (p.i + opts.planeSpread * fan[0]) * RAD;
    const node = (p.node + opts.planeSpread * fan[1]) * RAD;
    const target = ECC_FAN[index % ECC_FAN.length];
    const ci = Math.cos(inc);
    const si = Math.sin(inc);
    const cn = Math.cos(node);
    const sn = Math.sin(node);
    return {
      p,
      rgb: parseRGB(p.color),
      e: Math.min(0.85, p.e + opts.eccentricity * (target - p.e)),
      period,
      n: TAU / period,
      cw: Math.cos(p.peri * RAD),
      sw: Math.sin(p.peri * RAD),
      ci,
      si,
      cn,
      sn,
      M0: p.M0 * RAD,
      swing: opts.alignToCourse > 0 ? swingToCourse(si * sn, -si * cn, ci, opts.alignToCourse, DIR) : null,
    };
  }

  /** Heliocentric position at mean anomaly M, already squeezed. Writes R3. */
  function helio(el: Elements, M: number) {
    const e = el.e;
    const E = eccentricAnomaly(M, e);
    const xo = el.p.a * (Math.cos(E) - e);
    const yo = el.p.a * Math.sqrt(1 - e * e) * Math.sin(E);
    // Turn by the argument of perihelion, inside the orbit plane.
    const x1 = xo * el.cw - yo * el.sw;
    const y1 = xo * el.sw + yo * el.cw;
    // Tip the plane by the inclination, then swing it round by the node.
    const y2 = y1 * el.ci;
    const z2 = y1 * el.si;
    let x = x1 * el.cn - y2 * el.sn;
    let y = x1 * el.sn + y2 * el.cn;
    let z = z2;
    // Swing the whole plane toward the Sun's course.
    const S = el.swing;
    if (S) {
      const rx = S[0] * x + S[1] * y + S[2] * z;
      const ry = S[3] * x + S[4] * y + S[5] * z;
      const rz = S[6] * x + S[7] * y + S[8] * z;
      x = rx;
      y = ry;
      z = rz;
    }
    // Squeeze along the radius. Angles are untouched, so the tilt of every
    // orbit plane survives the squeeze.
    if (opts.compress !== 1) {
      const r = Math.sqrt(x * x + y * y + z * z);
      if (r > 1e-9) {
        const s = Math.pow(r, opts.compress - 1);
        x *= s;
        y *= s;
        z *= s;
      }
    }
    R3.x = x;
    R3.y = y;
    R3.z = z;
  }

  let elems: Elements[] = [];

  /* Background stars. Kept in world coords, so turning the camera does not drag
     them along. Depth parallax is real, though the depth range is squeezed:
     real stars sit about 270,000 AU away and would never shift on screen. */
  const EMPTY = new Float64Array(0);
  let sx = EMPTY;
  let sy = EMPTY;
  let sz = EMPTY;
  let sMag = EMPTY;
  let sPhase = EMPTY;
  let sTint = new Uint8Array(0);
  let starN = 0;
  let rand = mulberry32(0xc0ffee);

  /** Places one star at a random spot in the frustum, at an optional fixed depth. */
  function seedStar(k: number, depth?: number, edge?: 0 | 1 | 2 | 3) {
    const d = depth ?? dNear * Math.pow(dFar / dNear, Math.pow(rand(), 0.55));
    // Screen offset in px, then back out to world units at that depth.
    const halfW = width * 0.5 * 1.15;
    const halfH = height * 0.5 * 1.15;
    let ox: number;
    let oy: number;
    if (edge === 0) { ox = -halfW; oy = (rand() * 2 - 1) * halfH; }
    else if (edge === 1) { ox = halfW; oy = (rand() * 2 - 1) * halfH; }
    else if (edge === 2) { ox = (rand() * 2 - 1) * halfW; oy = -halfH; }
    else if (edge === 3) { ox = (rand() * 2 - 1) * halfW; oy = halfH; }
    else { ox = (rand() * 2 - 1) * halfW; oy = (rand() * 2 - 1) * halfH; }
    const scale = d / (camDist * pxPerAU);
    const vx = ox * scale;
    const vy = -oy * scale;
    const vz = camDist - d;
    // View basis to world, then offset by where the Sun is right now.
    sx[k] = vx * RIGHT.x + vy * UP.x + vz * FWD.x + DIR.x * dist;
    sy[k] = vx * RIGHT.y + vy * UP.y + vz * FWD.y + DIR.y * dist;
    sz[k] = vx * RIGHT.z + vy * UP.z + vz * FWD.z + DIR.z * dist;
    sMag[k] = Math.pow(rand(), 2.4);
    sPhase[k] = rand() * TAU;
    const t = rand();
    sTint[k] = t > 0.9 ? 1 : t < 0.08 ? 2 : 0;
  }

  function buildStars() {
    starN = Math.max(60, Math.round(opts.starCount * Math.min(2, (width * height) / (1440 * 900))));
    sx = new Float64Array(starN);
    sy = new Float64Array(starN);
    sz = new Float64Array(starN);
    sMag = new Float64Array(starN);
    sPhase = new Float64Array(starN);
    sTint = new Uint8Array(starN);
    rand = mulberry32(0xc0ffee);
    for (let k = 0; k < starN; k++) seedStar(k);
  }

  const glowCache = new Map<string, HTMLCanvasElement>();
  /** A soft round sprite in the planet's colour, drawn behind each body. */
  function glowSprite(color: string): HTMLCanvasElement {
    const hit = glowCache.get(color);
    if (hit) return hit;
    const R = 64;
    const c = document.createElement("canvas");
    c.width = R * 2;
    c.height = R * 2;
    const g2 = c.getContext("2d");
    if (!g2) return c;
    const [r, g, b] = parseRGB(color);
    const grad = g2.createRadialGradient(R, R, 0, R, R, R);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.15, `rgba(${r},${g},${b},0.95)`);
    grad.addColorStop(0.36, `rgba(${r},${g},${b},0.26)`);
    grad.addColorStop(0.66, `rgba(${r},${g},${b},0.05)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    g2.fillStyle = grad;
    g2.fillRect(0, 0, R * 2, R * 2);
    glowCache.set(color, c);
    return c;
  }

  /** Measures the host. Returns true when the size changed. */
  function resize(): boolean {
    const rect = host.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === width && h === height) return false;
    width = w;
    height = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function layout() {
    pxPerAU = (Math.min(width, height) * 0.5) / opts.viewRadius;
    camDist = opts.viewRadius * 3.1;
    dNear = camDist * 5;
    dFar = camDist * 120;
    setCamera(opts.spin, opts.tilt, opts.roll);
  }

  /** Everything that depends on the options: apex, orbits, camera and stars. */
  function configure() {
    setApex(opts.apex[0], opts.apex[1]);
    elems = opts.planets.map((p, idx) => elementsOf(p, idx));
    layout();
    buildStars();
  }

  /* The Sun itself: a bright disc with a tight halo, not a wash. */
  function drawSun(k: number, t: number) {
    const [r, g, b] = parseRGB(opts.sunColor);
    const pulse = 1 + Math.sin(t * 2.1) * 0.02;
    // The real Sun is 0.0093 AU across, a fifth of a pixel here, so what is
    // drawn is its glare.
    const R = Math.max(5, Math.min(width, height) * 0.013) * pulse;

    const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 14);
    haze.addColorStop(0, `rgba(${r},${g},${b},${0.05 * k})`);
    haze.addColorStop(0.4, `rgba(255,190,110,${0.014 * k})`);
    haze.addColorStop(1, "rgba(255,160,80,0)");
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 14, 0, TAU);
    ctx.fill();

    const outer = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 4.6);
    outer.addColorStop(0, `rgba(${r},${g},${b},${0.34 * k})`);
    outer.addColorStop(0.3, `rgba(255,222,160,${0.1 * k})`);
    outer.addColorStop(0.62, `rgba(255,196,110,${0.025 * k})`);
    outer.addColorStop(1, "rgba(255,180,90,0)");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 4.6, 0, TAU);
    ctx.fill();

    const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.3);
    bloom.addColorStop(0, `rgba(255,255,255,${k})`);
    bloom.addColorStop(0.42, `rgba(255,252,240,${0.7 * k})`);
    bloom.addColorStop(0.72, `rgba(${r},${g},${b},${0.22 * k})`);
    bloom.addColorStop(1, "rgba(255,210,140,0)");
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 2.3, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();
  }

  /** Draws one frame at simulation time t, in years. */
  function render(t: number) {
    const k = opts.glow;
    setCamera(opts.spin + camX * 7, opts.tilt + camY * 5, opts.roll);

    dist = opts.driftSpeed * t;
    cx = width * opts.focus[0];
    cy = height * opts.focus[1];
    // Put the Sun a little ahead of centre, so the spirals have room behind it.
    project(DIR.x, DIR.y, DIR.z);
    if (P.ok) {
      const dxs = P.x - cx;
      const dys = P.y - cy;
      const len = Math.hypot(dxs, dys) || 1;
      const push = Math.min(width, height) * opts.lead;
      cx += (dxs / len) * push;
      cy += (dys / len) * push;
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    /* Stars. */
    const dRef = dNear * 3.3;
    const left = -width * 0.12;
    const right = width * 1.12;
    const top = -height * 0.12;
    const bottom = height * 1.12;
    for (let s = 0; s < starN; s++) {
      // Position relative to the Sun, which is where the camera rides.
      project(sx[s] - DIR.x * dist, sy[s] - DIR.y * dist, sz[s] - DIR.z * dist);
      if (!P.ok || P.depth > dFar * 1.25) {
        seedStar(s);
        continue;
      }
      if (P.x < left || P.x > right || P.y < top || P.y > bottom) {
        // Gone off an edge: bring it back in on the opposite side.
        seedStar(s, undefined, P.x < left ? 1 : P.x > right ? 0 : P.y < top ? 3 : 2);
        continue;
      }
      if (P.depth < dNear * 0.75) continue;

      // Apparent brightness falls off with distance, and fades out at the far
      // wall so nothing pops in.
      const near = Math.min(1, (P.depth - dNear * 0.75) / (dNear * 0.6));
      const far = 1 - Math.max(0, (P.depth - dFar * 0.78) / (dFar * 0.32));
      let a = (0.2 + sMag[s] * 1.05) * Math.pow(dRef / P.depth, 0.8) * near * far;
      if (a <= 0.012) continue;
      a *= 0.82 + 0.18 * Math.sin(t * 9 + sPhase[s]);
      const col = sTint[s] === 1 ? "175,205,255" : sTint[s] === 2 ? "255,214,170" : "255,255,255";
      const size = Math.min(2.3, 0.55 + sMag[s] * 1.5 * Math.pow(dRef / P.depth, 0.5));
      ctx.fillStyle = `rgba(${col},${Math.min(1, a).toFixed(3)})`;
      if (size < 1.05) {
        ctx.fillRect(P.x, P.y, size, size);
      } else {
        ctx.beginPath();
        ctx.arc(P.x, P.y, size * 0.5, 0, TAU);
        ctx.fill();
      }
    }

    /* The Sun's own track through space. The planets' wakes are clipped for
       legibility; this one is a straight line, so it can run further back. */
    if (opts.showSunTrack) {
      const back = opts.driftSpeed * opts.trailYears * 1.1;
      project(0, 0, 0);
      const hx = P.x;
      const hy = P.y;
      project(-DIR.x * back, -DIR.y * back, -DIR.z * back);
      if (P.ok) {
        const grad = ctx.createLinearGradient(hx, hy, P.x, P.y);
        grad.addColorStop(0, `rgba(255,246,214,${k})`);
        grad.addColorStop(0.45, `rgba(255,206,110,${0.55 * k})`);
        grad.addColorStop(1, "rgba(255,180,80,0)");
        ctx.strokeStyle = grad;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(P.x, P.y);
        ctx.lineWidth = 11;
        ctx.globalAlpha = 0.16;
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    }

    /* Orbit guides. */
    if (opts.showOrbits) {
      for (const el of elems) {
        const [r, g, b] = el.rgb;
        const steps = 160;
        ctx.beginPath();
        let started = false;
        for (let q = 0; q <= steps; q++) {
          // Step in eccentric anomaly, then back out the mean anomaly.
          const E = (q / steps) * TAU;
          const M = E - el.e * Math.sin(E);
          helio(el, M);
          project(R3.x, R3.y, R3.z);
          if (!P.ok) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(P.x, P.y);
            started = true;
          } else {
            ctx.lineTo(P.x, P.y);
          }
        }
        // A soft wide pass under a thin bright one, so the line glows.
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.045 * k})`;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.3 * k})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    /* Planets and their helical wakes. */
    const shots: Shot[] = [];

    for (const el of elems) {
      const [r, g, b] = el.rgb;
      const bright = (el.p.glow ?? 1) * k;
      // A wake is a window on the past. Fast planets get theirs clipped to a
      // few turns, or they would wind into a scribble.
      const span = Math.min(opts.trailYears, opts.maxTurns * el.period);
      const turns = span / el.period;
      // Enough samples to keep the tight coils smooth. A stretched orbit needs
      // more, since a planet covers far more ground near perihelion.
      const N = Math.max(48, Math.min(360, Math.ceil(turns * 46 * (1 + 2.2 * el.e)) + 48));

      const xs = new Float64Array(N + 1);
      const ys = new Float64Array(N + 1);
      const okArr = new Uint8Array(N + 1);
      for (let q = 0; q <= N; q++) {
        const age = (1 - q / N) * span; // years back from now
        const M = el.M0 + el.n * (t - age);
        helio(el, M);
        // Where the planet really was: its place around the Sun at that moment,
        // minus how far the Sun has moved since. Ellipse plus drift is a helix.
        const back = opts.driftSpeed * age;
        project(R3.x - DIR.x * back, R3.y - DIR.y * back, R3.z - DIR.z * back);
        xs[q] = P.x;
        ys[q] = P.y;
        okArr[q] = P.ok ? 1 : 0;
        if (q === N && P.ok) shots.push({ el, x: P.x, y: P.y, depth: P.depth, s: P.s });
      }

      const stroke = (from: number, to: number, alpha: number, wide: number) => {
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx.lineWidth = wide;
        ctx.beginPath();
        let started = false;
        for (let q = from; q <= to; q++) {
          if (!okArr[q]) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(xs[q], ys[q]);
            started = true;
          } else {
            ctx.lineTo(xs[q], ys[q]);
          }
        }
        ctx.stroke();
      };

      // The soft halo first, as two unbroken paths near the head.
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      stroke(Math.floor(N * 0.72), N, 0.05 * bright, 6.5);
      stroke(Math.floor(N * 0.86), N, 0.05 * bright, 3);

      // Then the line itself, one segment at a time, each with its own alpha.
      // That gives as many steps in the fade as there are samples. Butt ends
      // keep it seamless: two round ends would overlap and light up as a bead.
      ctx.lineCap = "butt";
      ctx.lineWidth = 1.3;
      for (let q = 0; q < N; q++) {
        if (!okArr[q] || !okArr[q + 1]) continue;
        const f = (q + 1) / N; // 0 at the tail, 1 at the planet
        const a = Math.pow(f, 2.6) * 0.95 * bright;
        if (a < 0.005) continue; // the tail is already invisible here
        ctx.strokeStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(xs[q], ys[q]);
        ctx.lineTo(xs[q + 1], ys[q + 1]);
        ctx.stroke();
      }
    }

    /* Bodies, back to front around the Sun. */
    shots.sort((p, q) => q.depth - p.depth);
    const sizeScale = Math.min(width, height) / 660;
    const drawShot = (o: Shot) => {
      const depth = Math.min(1.3, Math.max(0.5, o.s));
      const size = o.el.p.size * depth * sizeScale;
      const bright = (o.el.p.glow ?? 1) * k;
      const R = size * 3.3;
      ctx.globalAlpha = Math.min(1, 0.9 * bright);
      ctx.drawImage(glowSprite(o.el.p.color), o.x - R, o.y - R, R * 2, R * 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(o.x, o.y, size * 0.5, 0, TAU);
      ctx.fill();
    };

    let idx = 0;
    while (idx < shots.length && shots[idx].depth > camDist) drawShot(shots[idx++]);
    drawSun(k, t);
    while (idx < shots.length) drawShot(shots[idx++]);

    ctx.globalCompositeOperation = "source-over";

    /* The veil that copy sits on. Heavy at the edge, then off quickly: a
       straight ramp would grey the whole frame. */
    if (opts.scrim !== "none") {
      const strength = Math.max(0, Math.min(1, opts.scrimStrength));
      const g =
        opts.scrim === "left" ? ctx.createLinearGradient(0, 0, width, 0)
        : opts.scrim === "right" ? ctx.createLinearGradient(width, 0, 0, 0)
        : opts.scrim === "top" ? ctx.createLinearGradient(0, 0, 0, height)
        : ctx.createLinearGradient(0, height, 0, 0);
      for (let q = 0; q <= 12; q++) {
        const x = q / 12;
        g.addColorStop(x, `rgba(0,0,0,${(strength * Math.pow(1 - x, 2.4)).toFixed(4)})`);
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }
  }

  /* Motion. The clock runs only while the pointer is over the host, and the
     loop stops once nothing is moving, so an idle page costs nothing. */

  function kick() {
    if (reduced || !running || !visible || raf) return;
    lastFrame = 0;
    raf = requestAnimationFrame(frame);
  }

  function frame(now: number) {
    raf = 0;
    if (!running || !visible) return;
    const elapsed = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;

    const moving = hovering && !reduced && !opts.paused;
    if (moving) years += Math.min(0.05, elapsed) / Math.max(0.1, opts.yearSeconds);
    // Ease the camera toward the pointer. The rate is set per second rather
    // than per frame, so it settles in the same time on a slow machine.
    const ease = 1 - Math.pow(0.96, elapsed * 60);
    camX += (pointerX - camX) * ease;
    camY += (pointerY - camY) * ease;
    render(years);

    const easing = Math.abs(pointerX - camX) > 1e-3 || Math.abs(pointerY - camY) > 1e-3;
    if (moving || easing) raf = requestAnimationFrame(frame);
    else lastFrame = 0;
  }

  function onEnter() {
    hovering = true;
    kick();
  }

  function onMove(ev: PointerEvent) {
    if (!opts.interactive) return;
    const rect = host.getBoundingClientRect();
    pointerX = ((ev.clientX - rect.left) / (rect.width || 1) - 0.5) * 2;
    pointerY = ((ev.clientY - rect.top) / (rect.height || 1) - 0.5) * 2;
    kick();
  }

  function onLeave() {
    hovering = false;
    pointerX = 0;
    pointerY = 0;
    kick();
  }

  resize();
  configure();
  render(years);

  const ro = new ResizeObserver(() => {
    if (!resize()) return;
    layout();
    buildStars();
    render(years);
  });
  ro.observe(host);

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) kick();
    },
    { threshold: 0 }
  );
  io.observe(host);

  host.addEventListener("pointerenter", onEnter);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerleave", onLeave);

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      canvas.remove();
    },
  };
}
