/*
 * Procedural top-down cat.
 * A small skeleton (spine, four legs, tail chain, head) is posed every frame and
 * painted onto a canvas. Walking uses a real lateral-sequence gait whose phase is
 * driven by distance travelled, so planted paws never slide. When the visitor stops
 * scrolling the cat sits down (rear first), then idles: looks around, licks its
 * flank, licks a paw and wipes its face, blinks, twitches ears and tail.
 *
 * Local frame: the cat faces -y, +x is the cat's right side, units are CSS px at scale 1.
 */

type Vec = { x: number; y: number };

const TAU = Math.PI * 2;
const V = (x: number, y: number): Vec => ({ x, y });
const add = (a: Vec, b: Vec) => V(a.x + b.x, a.y + b.y);
const sub = (a: Vec, b: Vec) => V(a.x - b.x, a.y - b.y);
const mul = (a: Vec, k: number) => V(a.x * k, a.y * k);
const rot = (a: Vec, r: number) => {
  const c = Math.cos(r);
  const s = Math.sin(r);
  return V(a.x * c - a.y * s, a.x * s + a.y * c);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: Vec, b: Vec, t: number) => V(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const smooth = (t: number) => {
  const u = clamp(t, 0, 1);
  return u * u * (3 - 2 * u);
};
const damp = (cur: number, target: number, rate: number, dt: number) => lerp(cur, target, 1 - Math.exp(-rate * dt));
const approach = (cur: number, target: number, step: number) =>
  cur < target ? Math.min(target, cur + step) : Math.max(target, cur - step);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randSide = () => (Math.random() < 0.5 ? -1 : 1);
/** Unit vector the cat's nose points to for a given orientation angle. */
const fwd = (ang: number) => V(Math.sin(ang), -Math.cos(ang));
/** Unit vector to the cat's right for a given orientation angle. */
const right = (ang: number) => V(Math.cos(ang), Math.sin(ang));

// Ginger tabby palette, tuned to sit on the warm cream page.
const FUR = "#dc9a63";
const FUR_LIMB = "#d38d57";
const FUR_EAR = "#cd8650";
const PAW = "#edc097";
const STRIPE = "rgba(146,70,32,0.5)";
const STRIPE_SOFT = "rgba(146,70,32,0.28)";
const EDGE = "rgba(104,52,24,0.25)";
const OUTLINE = "rgba(88,46,24,0.5)";
const CREAM = "rgba(248,226,200,0.9)";
const NOSE = "#c9787a";
const EAR_IN = "rgba(232,160,156,0.95)";
const EYE = "#2f2219";
const SHADOW = "rgba(70,40,24,0.32)";

// Spine nodes, neck (0) to tail base (8): position along the body axis and half width.
const WALK_Y = [-31, -24, -16, -8, 0, 8, 16, 23, 30];
const WALK_W = [7.6, 11.6, 13.4, 12.8, 12, 12.4, 13.2, 11.4, 7];
const SIT_Y = [-22, -17, -11, -5, 1, 7, 13, 19, 24];
const SIT_W = [8, 11.8, 12.8, 13.6, 15.8, 19.2, 20.6, 18, 9.5];
/** How much each node follows the front (1) or rear (0) of the body when sitting. */
const FRONT_W = [1, 1, 1, 0.8, 0.5, 0.2, 0, 0, 0];

const HEAD_HALF = [V(0, -15.5), V(3.8, -14.6), V(7.6, -11.6), V(11.4, -6.4), V(13.6, -0.8), V(13.4, 4.6), V(11, 9.4), V(6, 12.6)];
const HEAD = [...HEAD_HALF, V(0, 13.4), ...HEAD_HALF.slice(1).reverse().map((p) => V(-p.x, p.y))];

type IdleKind = "none" | "look" | "groomFlank" | "groomPaw";

export interface CatState {
  y: number;
  speed: number;
  heading: number;
  targetHeading: number;
  omega: number;
  sit: number;
  phase: number;
  gait: number;
  t: number;
  still: number;
  moving: boolean;
  headYaw: number;
  neck: number;
  pawLift: number;
  pawSide: number;
  wipe: number;
  lickAmp: number;
  tongue: number;
  eyeBase: number;
  eyeOpen: number;
  idle: { kind: IdleKind; t: number; dur: number; side: number; twice: boolean };
  nextIdle: number;
  nextBlink: number;
  blinkT: number;
  nextEar: number;
  earT: number;
  earSide: number;
  nextFlick: number;
  flickT: number;
  wrapSide: number;
  curlSide: number;
}

export function createCat(y: number, heading = -Math.PI): CatState {
  return {
    y,
    speed: 0,
    heading,
    targetHeading: heading,
    omega: 0,
    sit: 1,
    phase: 0,
    gait: 0,
    t: 0,
    still: 10,
    moving: false,
    headYaw: 0,
    neck: 0,
    pawLift: 0,
    pawSide: 1,
    wipe: 0,
    lickAmp: 0,
    tongue: 0,
    eyeBase: 1,
    eyeOpen: 1,
    idle: { kind: "none", t: 0, dur: 0, side: 1, twice: false },
    nextIdle: 1.2,
    nextBlink: 2,
    blinkT: 0,
    nextEar: 3,
    earT: 0,
    earSide: 1,
    nextFlick: 3,
    flickT: 0,
    wrapSide: Math.cos(heading) >= 0 ? 1 : -1,
    curlSide: 1,
  };
}

/** Local x sign that points toward the left of the screen (where the page content is). */
const contentSide = (heading: number) => (Math.cos(heading) >= 0 ? -1 : 1);

function startIdle(st: CatState) {
  const r = Math.random();
  const id = st.idle;
  id.t = 0;
  id.twice = Math.random() < 0.45;
  if (r < 0.42) {
    id.kind = "look";
    id.dur = rand(2.4, 4);
    id.side = Math.random() < 0.65 ? contentSide(st.heading) : -contentSide(st.heading);
  } else if (r < 0.72) {
    id.kind = "groomFlank";
    id.dur = rand(4.5, 6.5);
    id.side = randSide();
  } else {
    id.kind = "groomPaw";
    id.dur = rand(6, 8);
    id.side = randSide();
  }
}

export function updateCat(st: CatState, dt: number, targetY: number) {
  st.t += dt;

  // --- locomotion -------------------------------------------------------------
  const dy = targetY - st.y;
  // A cat never spins around to shuffle back a few pixels: small targets behind it are ignored.
  const behind = Math.sign(dy) !== Math.sign(-Math.cos(st.heading));
  const threshold = behind ? 26 : st.moving ? 1.5 : st.sit > 0.5 ? 10 : 4;
  const wantsMove = Math.abs(dy) > threshold;
  st.moving = wantsMove;
  if (wantsMove) {
    st.targetHeading = dy > 0 ? -Math.PI : 0; // turn via the content side, never off-screen
    st.still = 0;
  } else {
    st.still += dt;
  }

  const sitTarget = !wantsMove && st.speed < 4 && Math.abs(st.omega) < 0.3 && st.still > 0.45 ? 1 : 0;
  st.sit = approach(st.sit, sitTarget, dt / (sitTarget ? 1.05 : 0.5));
  const upright = (1 - st.sit) ** 2;

  const omegaT = st.sit < 0.15 ? clamp((st.targetHeading - st.heading) * 5, -3.8, 3.8) : 0;
  st.omega = damp(st.omega, omegaT, 8, dt);
  st.heading += st.omega * dt;

  const align = Math.max(0, Math.cos(st.heading - st.targetHeading)) ** 6;
  const desired = wantsMove ? Math.min(Math.abs(dy) * 3, 230) : 0;
  st.speed = Math.min(damp(st.speed, desired * align * upright, 4.5, dt), Math.abs(dy) * 3.5);
  const step = st.speed * dt * -Math.cos(st.heading);
  if (wantsMove && Math.sign(step) === Math.sign(dy) && Math.abs(step) > Math.abs(dy)) st.y = targetY;
  else st.y += step;

  const stride = 42 + st.speed * 0.06;
  const travel = st.speed * dt + Math.abs(st.omega) * 16 * dt;
  st.phase = (st.phase + travel / stride) % 1;
  st.gait = damp(st.gait, clamp(travel / Math.max(dt, 1e-4) / 25, 0, 1), 7, dt);

  if (st.sit < 0.05) {
    st.wrapSide = -contentSide(st.heading); // wrap the tail toward the screen edge
    if (st.gait > 0.5 && Math.random() < dt * 0.3) st.curlSide = randSide();
  }

  // --- idle behaviour -----------------------------------------------------------
  const settled = st.sit > 0.97 && !wantsMove;
  const id = st.idle;
  if (!settled) {
    id.kind = "none";
    st.nextIdle = Math.max(st.nextIdle, rand(0.9, 1.8));
  } else if (id.kind === "none") {
    st.nextIdle -= dt;
    if (st.nextIdle <= 0) startIdle(st);
  } else {
    id.t += dt;
    if (id.t >= id.dur) {
      id.kind = "none";
      st.nextIdle = rand(1.6, 4.5);
    }
  }

  let yawT = 0;
  let neckT = 0;
  let pawT = 0;
  let lickT = 0;
  let eyeT = 1;
  const u = id.dur > 0 ? id.t / id.dur : 0;
  const s = id.side;
  if (id.kind === "look") {
    if (u > 0.08 && u < 0.88) {
      yawT = s * 1.1;
      neckT = s * 0.18;
      if (id.twice && u > 0.46 && u < 0.74) {
        yawT = -s * 0.8;
        neckT = -s * 0.14;
      }
    }
  } else if (id.kind === "groomFlank") {
    if (u > 0.06 && u < 0.9) {
      yawT = s * 2.05;
      neckT = s;
      eyeT = 0.3;
    }
    if (u > 0.2 && u < 0.82) lickT = 1;
  } else if (id.kind === "groomPaw") {
    st.pawSide = s;
    if (u > 0.04 && u < 0.9) pawT = 1;
    if (u > 0.12 && u < 0.5) {
      yawT = s * 0.22;
      lickT = 1;
      eyeT = 0.35;
      st.wipe = 0;
    } else if (u >= 0.5 && u < 0.86) {
      const w = (u - 0.5) / 0.36;
      st.wipe = w;
      yawT = s * (0.5 + 0.12 * Math.sin(w * TAU * 2));
      eyeT = 0.1;
    } else {
      st.wipe = 0;
    }
  }

  st.headYaw = damp(st.headYaw, yawT + clamp(st.omega, -4, 4) * 0.16 * (1 - st.sit), 4.2, dt);
  st.neck = damp(st.neck, neckT, 3.5, dt);
  st.pawLift = damp(st.pawLift, pawT, 5, dt);
  st.lickAmp = damp(st.lickAmp, lickT, 6, dt);
  st.tongue = damp(st.tongue, lickT, 8, dt);
  st.eyeBase = damp(st.eyeBase, eyeT, 6, dt);

  // --- small life signs ---------------------------------------------------------
  st.nextBlink -= dt;
  if (st.nextBlink <= 0) {
    st.blinkT = 0.17;
    st.nextBlink = Math.random() < 0.2 ? 0.3 : rand(2.5, 6);
  }
  st.blinkT = Math.max(0, st.blinkT - dt);
  const blink = st.blinkT > 0 ? Math.sin(Math.PI * (1 - st.blinkT / 0.17)) : 0;
  st.eyeOpen = st.eyeBase * (1 - blink);

  st.nextEar -= dt;
  if (st.nextEar <= 0) {
    st.earT = 0.34;
    st.earSide = randSide();
    st.nextEar = rand(3, 8);
  }
  st.earT = Math.max(0, st.earT - dt);

  st.nextFlick -= dt;
  if (st.nextFlick <= 0 && st.sit > 0.9) {
    st.flickT = 0.9;
    st.nextFlick = rand(2.5, 6);
  }
  st.flickT = Math.max(0, st.flickT - dt);
}

// --- drawing ---------------------------------------------------------------------

function closedSpline(ctx: CanvasRenderingContext2D, pts: Vec[]) {
  const n = pts.length;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
  }
  ctx.closePath();
}

function openSpline(ctx: CanvasRenderingContext2D, pts: Vec[]) {
  const n = pts.length;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
  }
}

export interface ShadowSpec {
  x: number;
  y: number;
  blur: number;
}

function footCycle(ph: number) {
  const duty = 0.62;
  if (ph < duty) return { s: lerp(-1, 1, ph / duty), lift: 0 };
  const u = (ph - duty) / (1 - duty);
  return { s: lerp(1, -1, smooth(u)), lift: Math.sin(Math.PI * u) };
}

export function drawCat(ctx: CanvasRenderingContext2D, st: CatState, shadow: ShadowSpec) {
  const withShadow = (lift: number, paint: () => void) => {
    ctx.save();
    ctx.shadowColor = SHADOW;
    ctx.shadowOffsetX = shadow.x * (1 + lift);
    ctx.shadowOffsetY = shadow.y * (1 + lift);
    ctx.shadowBlur = shadow.blur * (1 + lift * 0.6);
    paint();
    ctx.restore();
  };

  // Rear sits down first; front stands up first.
  const eF = smooth(clamp(st.sit * 1.45 - 0.45, 0, 1));
  const eR = smooth(clamp(st.sit * 1.45, 0, 1));
  const breath = 1 + (0.012 + 0.01 * st.sit) * Math.sin(st.t * TAU * 0.42);

  // --- spine -----------------------------------------------------------------------
  const ys: number[] = [];
  const ws: number[] = [];
  for (let i = 0; i < 9; i++) {
    const k = lerp(eR, eF, FRONT_W[i]);
    ys.push(lerp(WALK_Y[i], SIT_Y[i], k));
    ws.push(lerp(WALK_W[i], SIT_W[i], k) * (i > 1 && i < 8 ? breath : 1));
  }
  const turnK = clamp(st.omega, -4, 4) * 0.0048;
  const kappa = (i: number) =>
    turnK + st.gait * 0.004 * Math.sin(TAU * st.phase + i * 0.75) + st.neck * 0.028 * (i <= 3 ? ((4 - i) / 4) * 1.6 : 0);
  const pts: Vec[] = new Array(9);
  const ang: number[] = new Array(9);
  pts[4] = V(0, ys[4]);
  ang[4] = 0;
  let a = 0;
  for (let i = 3; i >= 0; i--) {
    const L = ys[i + 1] - ys[i];
    a += kappa(i) * L;
    ang[i] = a;
    pts[i] = add(pts[i + 1], mul(fwd(a), L));
  }
  a = 0;
  for (let i = 5; i < 9; i++) {
    const L = ys[i] - ys[i - 1];
    a -= kappa(i) * L;
    ang[i] = a;
    pts[i] = sub(pts[i - 1], mul(fwd(a), L));
  }

  const leftSide = pts.map((p, i) => sub(p, mul(right(ang[i]), ws[i])));
  const rightSide = pts.map((p, i) => add(p, mul(right(ang[i]), ws[i])));
  const outline = [
    ...leftSide,
    sub(pts[8], mul(fwd(ang[8]), ws[8] * 0.95)),
    ...rightSide.reverse(),
    add(pts[0], mul(fwd(ang[0]), ws[0] * 0.7)),
  ];

  // --- head pose -----------------------------------------------------------------------
  const lickSin = Math.sin(st.t * TAU * 2.6);
  const lick = st.lickAmp * lickSin;
  const headAng = ang[0] + st.headYaw + lick * 0.06;
  const neckLen = lerp(6.5, 4.5, eF);
  const hc = add(add(pts[0], mul(fwd(ang[0] + st.headYaw * 0.4), neckLen)), mul(fwd(headAng), 7 + lick * 1.3));
  const toBody = (p: Vec) => add(hc, rot(p, headAng));

  // --- legs ------------------------------------------------------------------------------
  const stride = 42 + st.speed * 0.06;
  const A = (0.62 * stride) / 2;
  const legDefs = [
    { front: false, side: -1, off: 0 },
    { front: false, side: 1, off: 0.5 },
    { front: true, side: -1, off: 0.25 },
    { front: true, side: 1, off: 0.75 },
  ];
  const legs = legDefs.map(({ front, side, off }) => {
    const ni = front ? 1 : 6;
    const f = fwd(ang[ni]);
    const r = right(ang[ni]);
    const joint = add(pts[ni], mul(r, side * (front ? 6 : 7)));
    const { s, lift } = footCycle((st.phase + off) % 1);
    const g = st.gait;
    let paw = add(add(joint, mul(f, -s * A * g + (front ? 2 : -2) * (1 - g))), mul(r, side * (front ? 6.4 : 5.6)));
    const sitPaw = front
      ? add(add(pts[0], mul(fwd(ang[0]), 20)), mul(right(ang[0]), side * 5.4))
      : add(add(pts[3], mul(fwd(ang[3]), 0.5)), mul(right(ang[3]), side * 15.2));
    const k = front ? eF : eR;
    paw = lerpV(paw, sitPaw, k);
    let pawLift = lift * g * (1 - k);
    let pawAng = front ? lerp(ang[ni], ang[0], k) : ang[ni] + side * 0.25 * k;
    let raised = false;
    if (front && side === st.pawSide && st.pawLift > 0.01) {
      const path = [V(side * 2.5, -13.5 - lick * 0.8), V(side * 12.5, -3), V(side * 10, 7)];
      const c = (1 - Math.cos(TAU * 2 * st.wipe)) / 2;
      const hp = c < 0.5 ? lerpV(path[0], path[1], c * 2) : lerpV(path[1], path[2], (c - 0.5) * 2);
      paw = lerpV(paw, toBody(hp), st.pawLift);
      pawLift = Math.max(pawLift, st.pawLift * 1.4);
      pawAng = lerp(pawAng, headAng + side * (0.6 + c * 1.4), st.pawLift);
      raised = st.pawLift > 0.35;
    }
    return { front, joint, paw, pawLift, pawAng, raised };
  });

  const drawLimb = (joint: Vec, paw: Vec, w0: number, w1: number) => {
    const d = sub(paw, joint);
    const len = Math.hypot(d.x, d.y) || 1;
    const n = V(-d.y / len, d.x / len);
    ctx.beginPath();
    ctx.moveTo(joint.x + n.x * w0, joint.y + n.y * w0);
    ctx.lineTo(paw.x + n.x * w1, paw.y + n.y * w1);
    ctx.lineTo(paw.x - n.x * w1, paw.y - n.y * w1);
    ctx.lineTo(joint.x - n.x * w0, joint.y - n.y * w0);
    ctx.closePath();
    ctx.fillStyle = FUR_LIMB;
    ctx.fill();
  };
  const drawPaw = (p: Vec, angle: number, lift: number) => {
    const sc = 1 + lift * 0.14;
    withShadow(lift, () => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.scale(sc, sc);
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.2, 5.2, 0, 0, TAU);
      ctx.fillStyle = PAW;
      ctx.fill();
      ctx.restore();
    });
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.scale(sc, sc);
    ctx.strokeStyle = "rgba(120,66,36,0.35)";
    ctx.lineWidth = 0.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-1.4, -5);
    ctx.lineTo(-1.2, -2.8);
    ctx.moveTo(1.4, -5);
    ctx.lineTo(1.2, -2.8);
    ctx.stroke();
    ctx.restore();
  };

  // --- tail ------------------------------------------------------------------------------
  const flick = st.flickT > 0 ? Math.sin((0.9 - st.flickT) * 15) * (st.flickT / 0.9) : 0;
  const tail: Vec[] = [lerpV(pts[8], pts[7], 0.35 * eR)];
  let ta = ang[8] + Math.PI;
  const TAIL_N = 12;
  for (let i = 0; i < TAIL_N; i++) {
    const u = i / (TAIL_N - 1);
    const walkDa =
      (i === 0 ? 0 : 0.085 * Math.sin(st.t * 2.3 - i * 0.55)) +
      (i >= 8 ? 0.3 * st.curlSide : 0) -
      clamp(st.omega, -4, 4) * 0.03 * (i < 6 ? 1 : 0.5);
    const sitDa =
      -st.wrapSide * (i === 0 ? 0.8 : i < 3 ? 0.5 : 0.17) + (i >= 8 ? 0.07 * Math.sin(st.t * 0.9) + flick * 0.32 * ((i - 7) / 4) : 0);
    ta += lerp(walkDa, sitDa, eR);
    const segL = lerp(lerp(2.6, 5.4, u), i < 3 ? 4.6 : 5.6, eR);
    tail.push(add(tail[tail.length - 1], mul(fwd(ta), segL)));
  }
  const tailW = (i: number) => lerp(4.4, 2.7, i / TAIL_N);
  const tailNormal = (i: number) => {
    const p = tail[Math.max(0, i - 1)];
    const q = tail[Math.min(tail.length - 1, i + 1)];
    const d = sub(q, p);
    const l = Math.hypot(d.x, d.y) || 1;
    return V(-d.y / l, d.x / l);
  };
  const tailL: Vec[] = [];
  const tailR: Vec[] = [];
  tail.forEach((p, i) => {
    const n = tailNormal(i);
    tailL.push(add(p, mul(n, tailW(i))));
    tailR.push(sub(p, mul(n, tailW(i))));
  });
  const tipDir = sub(tail[TAIL_N], tail[TAIL_N - 1]);
  const tipLen = Math.hypot(tipDir.x, tipDir.y) || 1;
  const tailOutline = [...tailL, add(tail[TAIL_N], mul(tipDir, (tailW(TAIL_N) * 0.9) / tipLen)), ...tailR.reverse()];

  withShadow(0, () => {
    closedSpline(ctx, tailOutline);
    ctx.fillStyle = FUR;
    ctx.fill();
  });
  ctx.save();
  closedSpline(ctx, tailOutline);
  ctx.clip();
  ctx.lineCap = "round";
  for (const k of [3, 5, 7, 9, 11, 12]) {
    const n = tailNormal(k);
    const w = tailW(k) + 1;
    ctx.beginPath();
    ctx.moveTo(tail[k].x + n.x * w, tail[k].y + n.y * w);
    ctx.lineTo(tail[k].x - n.x * w, tail[k].y - n.y * w);
    ctx.strokeStyle = STRIPE;
    ctx.lineWidth = k === 12 ? 4 : 2.2;
    ctx.stroke();
  }
  closedSpline(ctx, tailOutline);
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  closedSpline(ctx, tailOutline);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // --- legs under the body -----------------------------------------------------------------
  for (const leg of legs) {
    withShadow(leg.pawLift, () => drawLimb(leg.joint, leg.paw, leg.front ? 3.4 : 4.4, 3));
  }
  for (const leg of legs) if (!leg.raised) drawPaw(leg.paw, leg.pawAng, leg.pawLift);

  // --- body ---------------------------------------------------------------------------------
  withShadow(0, () => {
    closedSpline(ctx, outline);
    ctx.fillStyle = FUR;
    ctx.fill();
  });
  ctx.save();
  closedSpline(ctx, outline);
  ctx.clip();
  // Shoulder blades rolling under the skin while walking.
  if (st.gait > 0.02) {
    const r1 = right(ang[1]);
    const f1 = fwd(ang[1]);
    for (const side of [-1, 1]) {
      const roll = Math.sin(TAU * (st.phase + (side < 0 ? 0.25 : 0.75))) * 2.6 * st.gait;
      const c = add(add(pts[1], mul(r1, side * 5.2)), mul(f1, roll));
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 3.6, 5.4, ang[1], 0, TAU);
      ctx.fillStyle = `rgba(255,226,192,${0.22 * st.gait})`;
      ctx.fill();
    }
  }
  // Mackerel-tabby stripes: start near the spine and sweep back down each flank.
  ctx.lineCap = "round";
  for (let j = 0; j < 15; j++) {
    const fpos = 0.6 + j * 0.52; // fractional node index along the spine
    const i0 = Math.min(7, Math.floor(fpos));
    const tt = fpos - i0;
    const c = lerpV(pts[i0], pts[i0 + 1], tt);
    const an = lerp(ang[i0], ang[i0 + 1], tt);
    const w = lerp(ws[i0], ws[i0 + 1], tt);
    const f = fwd(an);
    const r = right(an);
    const jitter = Math.sin(j * 12.9898) * 0.5;
    for (const side of [-1, 1]) {
      const sweep = 3.2 + jitter * 1.6 + (side > 0 ? 0.6 : 0);
      const start = add(c, mul(r, side * (1.2 + Math.abs(jitter))));
      const mid = sub(add(c, mul(r, side * w * 0.55)), mul(f, sweep * 0.45));
      const end = sub(add(c, mul(r, side * (w + 2))), mul(f, sweep));
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(mid.x, mid.y, end.x, end.y);
      ctx.strokeStyle = j % 3 === 1 ? STRIPE_SOFT : STRIPE;
      ctx.lineWidth = 1.9 + (j % 2) * 0.6;
      ctx.stroke();
    }
  }
  // Broken dark line along the spine.
  ctx.setLineDash([5, 2.5]);
  openSpline(ctx, pts.slice(1));
  ctx.strokeStyle = STRIPE;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.setLineDash([]);
  closedSpline(ctx, outline);
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.restore();
  closedSpline(ctx, outline);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // --- head ---------------------------------------------------------------------------------
  ctx.save();
  ctx.translate(hc.x, hc.y);
  ctx.rotate(headAng);
  withShadow(0.15, () => {
    closedSpline(ctx, HEAD);
    ctx.fillStyle = FUR;
    ctx.fill();
  });
  ctx.save();
  closedSpline(ctx, HEAD);
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(0, -11, 6.4, 4.6, 0, 0, TAU);
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.lineCap = "round";
  ctx.strokeStyle = STRIPE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const [x0, y0, x1, y1] of [
    [-1.4, -7.5, -2.2, 7],
    [1.4, -7.5, 2.2, 7],
    [-4.6, -5, -6.6, 4],
    [4.6, -5, 6.6, 4],
  ]) {
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  }
  ctx.stroke();
  closedSpline(ctx, HEAD);
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
  closedSpline(ctx, HEAD);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Eyes peek from the front of the head.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 7.2, -9.2);
    ctx.rotate(side * 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.5, Math.max(0.25, 1.45 * st.eyeOpen), 0, 0, TAU);
    ctx.fillStyle = EYE;
    ctx.fill();
    if (st.eyeOpen > 0.5) {
      ctx.beginPath();
      ctx.arc(side * -0.7, -0.4, 0.45, 0, TAU);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.beginPath();
  ctx.moveTo(-1.7, -14.4);
  ctx.quadraticCurveTo(0, -13.6, 1.7, -14.4);
  ctx.lineTo(0, -16.2);
  ctx.closePath();
  ctx.fillStyle = NOSE;
  ctx.fill();
  const tongue = st.tongue * clamp(lickSin * 1.6, 0, 1);
  if (tongue > 0.02) {
    ctx.beginPath();
    ctx.ellipse(0, -16.8 - tongue * 0.8, 1.6, 1.4 + tongue * 1.2, 0, 0, TAU);
    ctx.fillStyle = `rgba(226,128,134,${tongue})`;
    ctx.fill();
  }

  // Ears: seen from behind, with a sliver of pink inner ear on the front edge.
  const earTwitch = st.earT > 0 ? Math.sin(((0.34 - st.earT) / 0.34) * TAU * 2) * 0.45 * (st.earT / 0.34) : 0;
  for (const side of [-1, 1]) {
    const swivel = clamp(st.headYaw, -1.2, 1.2) * 0.22 * side + (side === st.earSide ? earTwitch : 0) + st.lickAmp * 0.25;
    ctx.save();
    ctx.scale(side, 1);
    ctx.translate(8.6, 2.6);
    ctx.rotate(0.35);
    ctx.rotate(swivel);
    withShadow(0.2, () => {
      ctx.beginPath();
      ctx.moveTo(-4.6, -2.4);
      ctx.quadraticCurveTo(1.6, -2.2, 6.6, 0.2);
      ctx.quadraticCurveTo(4.2, 3.4, 1.6, 3.6);
      ctx.quadraticCurveTo(-2, 2.8, -4.6, -2.4);
      ctx.closePath();
      ctx.fillStyle = FUR_EAR;
      ctx.fill();
    });
    ctx.beginPath();
    ctx.moveTo(-3.8, -2.2);
    ctx.quadraticCurveTo(1.6, -2, 6, 0.1);
    ctx.strokeStyle = EAR_IN;
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }

  // Whiskers.
  const whiskerSweep = st.lickAmp * 1.6;
  for (const side of [-1, 1]) {
    for (const [tx, ty] of [
      [21, -17],
      [22.5, -11.5],
      [20.5, -5.5],
    ]) {
      const end = V(side * (tx - whiskerSweep), ty + whiskerSweep * 1.5);
      const start = V(side * 4.4, -11.2);
      const ctrl = V(side * (tx * 0.55), (ty - 11.2) / 2 - 1.5);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y, end.x, end.y);
      ctx.strokeStyle = "rgba(96,58,36,0.22)";
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,252,246,0.92)";
      ctx.lineWidth = 0.55;
      ctx.stroke();
    }
  }
  ctx.restore();

  // --- a paw raised to the face is drawn above the head -------------------------------------
  for (const leg of legs) if (leg.raised) drawPaw(leg.paw, leg.pawAng, leg.pawLift);
}
