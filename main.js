(function () {
'use strict';

/* ===== Spore Sprint — mushroom-forest vertical climber ===== */

const BEST_KEY = 'sporeSprint.best';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W = 0, H = 0, DPR = 1;

/* ---- Tunables (see SKILL.md "Customization hooks") ---- */
const GRAVITY      = 0.5;
const JUMP_V       = 11.6;   // normal auto-hop launch speed
const SPRING_V     = 19.5;   // springy platform launch speed
const MAX_VX       = 6.8;
const ACCEL_KEY    = 0.85;   // keyboard acceleration per frame
const ACCEL_TOUCH  = 0.95;   // drag / touch acceleration
const FRICTION     = 0.86;
const PLAYER_W     = 32;
const PLAYER_H     = 36;
const PLATFORM_H   = 14;
const BASE_MIN_GAP = 78;
const BASE_MAX_GAP = 116;
const STREAK_GOAL  = 5;
const BOOST_FRAMES = 90;     // ~1.5s speed boost
const INVULN_FRAMES = 90;
const START_LIVES  = 3;

/* ---- State ---- */
let state = 'start';            // start | playing | paused | over
let score = 0, lives = START_LIVES, best = 0;
let streak = 0, multiplier = 1;
let invuln = 0, boost = 0;
let maxClimb = 0;               // highest climb (px) above start
let camY = 0;                   // world y at top of screen (screenY = worldY - camY)
let startPlayerY = 0;
let rotSpawnTimer = 0;
let highestPY = 0;              // smallest world y among platforms (highest)
let lastT = 0;

let player = { x: 0, y: 0, vx: 0, vy: 0, w: PLAYER_W, h: PLAYER_H, anim: 0, facing: 1, squash: 0 };
let platforms = [];
let spores = [];
let rots = [];
let particles = [];
let fireflies = [];
let trees = [];

const keys = {};
const input = { touchDir: 0, targetX: null, pointerActive: false };

/* ---- DOM ---- */
const $ = function (id) { return document.getElementById(id); };
const elScore = $('score'), elBest = $('best'), elAlt = $('altitude'), elLives = $('lives');
const elStartBest = $('start-best');
const elFinalScore = $('final-score'), elFinalAlt = $('final-alt'), elFinalBest = $('final-best');
const screenStart = $('screen-start'), screenPause = $('screen-pause'), screenOver = $('screen-over');
const btnPlay = $('btn-play'), btnRetry = $('btn-retry'), btnHome = $('btn-home');
const btnPause = $('btn-pause'), btnResume = $('btn-resume'), btnPauseHome = $('btn-pause-home');
const btnLeft = $('btn-left'), btnRight = $('btn-right');

best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
elBest.textContent = best;
elStartBest.textContent = best;

/* ---- Helpers ---- */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function roundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---- Sizing ---- */
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  W = Math.max(1, Math.round(rect.width));
  H = Math.max(1, Math.round(rect.height));
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  initBackground();
}

function initBackground() {
  fireflies = [];
  const n = Math.max(14, Math.floor((W * H) / 16000));
  for (let i = 0; i < n; i++) {
    fireflies.push({
      x: Math.random() * W,
      y: Math.random() * H,
      phase: Math.random() * Math.PI * 2,
      speed: 0.2 + Math.random() * 0.5,
      size: 1 + Math.random() * 1.8,
      drift: (Math.random() - 0.5) * 0.35,
      hue: Math.random() < 0.3 ? 'rgba(180,255,200,' : 'rgba(225,255,150,'
    });
  }
  trees = [];
  const tn = 8;
  for (let i = 0; i < tn; i++) {
    trees.push({
      x: Math.random() * W,
      w: 60 + Math.random() * 110,
      h: 130 + Math.random() * 180,
      depth: 0.18 + Math.random() * 0.28
    });
  }
}

/* ---- Platform / spore / rot generation ---- */
function gapForAltitude() {
  const a = maxClimb / 1000;
  const minG = BASE_MIN_GAP + Math.min(46, a * 9);
  const maxG = BASE_MAX_GAP + Math.min(70, a * 13);
  return minG + Math.random() * (maxG - minG);
}
function pickType() {
  const r = Math.random();
  const altF = Math.min(1, maxClimb / 4000);
  if (r < 0.10 + altF * 0.05) return 'spring';
  if (r < 0.23 + altF * 0.08) return 'crumbly';
  if (r < 0.37 + altF * 0.10) return 'moving';
  return 'normal';
}
function makePlatform(x, y, w, type) {
  return { x: x, y: y, w: w, h: PLATFORM_H, type: type, broken: false, breakT: 0,
           phase: Math.random() * Math.PI * 2, baseX: x };
}
function ensurePlatforms() {
  while (highestPY > camY - 90) {
    const gap = gapForAltitude();
    const ny = highestPY - gap;
    const pw = 58 + Math.random() * 54;
    const px = Math.random() * Math.max(1, W - pw);
    const type = pickType();
    const p = makePlatform(px, ny, pw, type);
    platforms.push(p);
    if (Math.random() < 0.42) {
      spores.push({ x: px + pw / 2 + (Math.random() - 0.5) * 18, y: ny - 24 - Math.random() * 14,
                    r: 6, phase: Math.random() * Math.PI * 2, collected: false, missed: false });
    }
    highestPY = ny;
  }
  const cullY = camY + H + 90;
  for (let i = spores.length - 1; i >= 0; i--) {
    const s = spores[i];
    if (!s.collected && s.y > cullY) { streak = 0; }   // missing a spore breaks the streak
  }
  platforms = platforms.filter(function (p) { return p.y < cullY && !(p.broken && p.breakT > 32); });
  spores = spores.filter(function (s) { return !s.collected && s.y < cullY; });
}

function updateRots(dt) {
  rotSpawnTimer -= dt;
  const altF = Math.min(1, maxClimb / 3000);
  const interval = Math.max(26, 92 - altF * 58);
  if (rotSpawnTimer <= 0) {
    rotSpawnTimer = interval + Math.random() * 34;
    const rw = 28;
    const x = Math.random() * Math.max(1, W - rw);
    const y = camY - 34;
    const vy = 1.7 + altF * 1.7 + Math.random();
    rots.push({ x: x, y: y, w: rw, h: 26, vy: vy, phase: Math.random() * Math.PI * 2 });
  }
  for (let i = 0; i < rots.length; i++) {
    const r = rots[i];
    r.y += r.vy * dt;
    r.phase += 0.16 * dt;
  }
  rots = rots.filter(function (r) { return r.y < camY + H + 60; });
}

/* ---- Particles ---- */
function spawnParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 4.5,
      vy: (Math.random() - 0.5) * 4 - 1.2,
      life: 28 + Math.random() * 22,
      max: 50,
      color: color,
      size: 1 + Math.random() * 2.2
    });
  }
}
function updateParticles(dt) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.16 * dt;
    p.life -= dt;
  }
  particles = particles.filter(function (p) { return p.life > 0; });
}

/* ---- Player physics ---- */
function updatePlayer(dt) {
  /* horizontal intent */
  let dir = 0;
  const kl = keys['ArrowLeft'] || keys['KeyA'];
  const kr = keys['ArrowRight'] || keys['KeyD'];
  if (kl && !kr) dir = -1;
  else if (kr && !kl) dir = 1;
  if (input.touchDir !== 0) dir = input.touchDir;

  if (dir !== 0) {
    const acc = ACCEL_KEY * (boost > 0 ? 1.4 : 1);
    player.vx += dir * acc * dt;
    player.facing = dir > 0 ? 1 : -1;
    input.targetX = null;
  } else if (input.targetX !== null) {
    const cx = player.x + player.w / 2;
    const diff = input.targetX - cx;
    if (Math.abs(diff) > 3) {
      const acc = ACCEL_TOUCH * (boost > 0 ? 1.4 : 1);
      player.vx += Math.sign(diff) * acc * dt;
      player.facing = diff > 0 ? 1 : -1;
    }
  }
  const fric = Math.pow(FRICTION, dt);
  player.vx *= fric;
  const maxv = MAX_VX * (boost > 0 ? 1.45 : 1);
  player.vx = clamp(player.vx, -maxv, maxv);
  player.x += player.vx * dt;

  /* horizontal wrap */
  if (player.x + player.w < 0) player.x = W;
  else if (player.x > W) player.x = -player.w;

  /* vertical */
  player.vy += GRAVITY * dt;
  if (player.vy > 17) player.vy = 17;
  const prevBottom = player.y + player.h;
  player.y += player.vy * dt;
  const newBottom = player.y + player.h;

  /* one-way platform collision while falling */
  if (player.vy > 0) {
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (p.broken) continue;
      const overlapX = (player.x + player.w > p.x + 4) && (player.x < p.x + p.w - 4);
      if (!overlapX) continue;
      if (prevBottom <= p.y + 3 && newBottom >= p.y) {
        player.y = p.y - player.h;
        if (p.type === 'spring') {
          player.vy = -SPRING_V;
          spawnParticles(p.x + p.w / 2, p.y, '#ffe040', 9);
        } else {
          player.vy = -JUMP_V;
        }
        player.squash = 1;
        if (p.type === 'crumbly') {
          p.broken = true;
          p.breakT = 0;
          spawnParticles(p.x + p.w / 2, p.y + 4, '#7a5a30', 11);
        }
        break;
      }
    }
  }
  player.anim += 0.25 * dt;
  player.squash *= Math.pow(0.85, dt);

  /* moving platform drift */
  for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i];
    if (p.type === 'moving' && !p.broken) {
      p.phase += 0.018 * dt;
      p.x = clamp(p.baseX + Math.sin(p.phase) * (W * 0.18), 0, Math.max(0, W - p.w));
    }
    if (p.broken) p.breakT += dt;
  }

  /* camera follow */
  const screenY = player.y - camY;
  if (screenY < H * 0.33) {
    camY = player.y - H * 0.33;
  }

  /* altitude / multiplier */
  const climbed = startPlayerY - player.y;
  if (climbed > maxClimb) {
    maxClimb = climbed;
    multiplier = 1 + Math.floor(maxClimb / 100);
  }

  /* spore collection */
  for (let i = 0; i < spores.length; i++) {
    const s = spores[i];
    if (s.collected) continue;
    const dx = (player.x + player.w / 2) - s.x;
    const dy = (player.y + player.h / 2) - s.y;
    const rad = s.r + 15;
    if (dx * dx + dy * dy < rad * rad) {
      s.collected = true;
      streak++;
      const gain = 10 * multiplier;
      score += gain;
      if (streak >= STREAK_GOAL) {
        score += 50;
        streak = 0;
        boost = BOOST_FRAMES;
        spawnParticles(s.x, s.y, '#ffe040', 16);
      } else {
        spawnParticles(s.x, s.y, '#ffe080', 6);
      }
    }
  }

  /* rot cap collision */
  if (invuln <= 0) {
    for (let i = 0; i < rots.length; i++) {
      if (aabb(player, rots[i])) { loseLife(); break; }
    }
  }

  /* fall off bottom */
  if (player.y - camY > H + 30) {
    loseLife();
  }
}

/* ---- Life / death ---- */
function loseLife() {
  lives--;
  invuln = INVULN_FRAMES;
  streak = 0;
  spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#c050d0', 16);
  updateLivesDisplay();
  if (lives <= 0) {
    gameOver();
    return;
  }
  /* respawn mid-screen on a guaranteed platform */
  player.x = W / 2 - player.w / 2;
  const py = camY + H * 0.45;
  const pw = 86;
  platforms.push(makePlatform(W / 2 - pw / 2, py + player.h + 6, pw, 'normal'));
  player.y = py;
  player.vx = 0;
  player.vy = -JUMP_V;
}

function gameOver() {
  state = 'over';
  if (score > best) {
    best = score;
    try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
  }
  elFinalScore.textContent = score;
  elFinalAlt.textContent = Math.floor(maxClimb / 10) + 'm';
  elFinalBest.textContent = best;
  elBest.textContent = best;
  elStartBest.textContent = best;
  screenOver.classList.add('show');
}

/* ---- HUD ---- */
function lifeIconSVG() {
  const s = document.createElement('span');
  s.className = 'life-icon';
  s.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M3 13a9 7 0 0 1 18 0v1H3z" fill="#c8312b"/>'
    + '<ellipse cx="12" cy="14" rx="9" ry="2.4" fill="#f5ecd8"/>'
    + '<circle cx="8" cy="11" r="1.5" fill="#fff"/><circle cx="12" cy="9" r="1.8" fill="#fff"/><circle cx="16" cy="11" r="1.5" fill="#fff"/>'
    + '<rect x="9" y="15" width="6" height="7" rx="2" fill="#f5ecd8"/>'
    + '</svg>';
  return s;
}
function updateLivesDisplay() {
  elLives.innerHTML = '';
  for (let i = 0; i < lives; i++) elLives.appendChild(lifeIconSVG());
}
function updateHud() {
  elScore.textContent = score;
  elAlt.textContent = Math.floor(maxClimb / 10) + 'm';
  elBest.textContent = best;
}

/* ---- Drawing ---- */
function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0c1c11');
  g.addColorStop(0.5, '#16301d');
  g.addColorStop(1, '#1f3d28');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  /* distant tree silhouettes (parallax via camY) */
  ctx.fillStyle = 'rgba(7,16,10,0.78)';
  for (let i = 0; i < trees.length; i++) {
    const t = trees[i];
    const span = H + t.h + 40;
    let baseY = H + 20 - (((camY * t.depth) % span) + span) % span;
    drawTree(t.x, baseY, t.w, t.h);
    drawTree(t.x, baseY - span, t.w, t.h);
  }

  /* fireflies (screen space, twinkle + drift) */
  for (let i = 0; i < fireflies.length; i++) {
    const f = fireflies[i];
    f.phase += 0.045;
    f.y += Math.sin(f.phase) * f.speed * 0.35;
    f.x += f.drift;
    if (f.x < -4) f.x = W + 4;
    if (f.x > W + 4) f.x = -4;
    if (f.y < -4) f.y = H + 4;
    if (f.y > H + 4) f.y = -4;
    const a = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(f.phase * 1.7));
    ctx.fillStyle = f.hue + a + ')';
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawTree(x, baseY, w, h) {
  if (baseY < -h || baseY > H + h) return;
  ctx.beginPath();
  ctx.moveTo(x, baseY - h);
  ctx.lineTo(x - w / 2, baseY);
  ctx.lineTo(x + w / 2, baseY);
  ctx.closePath();
  ctx.fill();
  /* a smaller upper tier for a pine silhouette */
  ctx.beginPath();
  ctx.moveTo(x, baseY - h * 0.62);
  ctx.lineTo(x - w * 0.38, baseY - h * 0.18);
  ctx.lineTo(x + w * 0.38, baseY - h * 0.18);
  ctx.closePath();
  ctx.fill();
}

function drawPlatform(p) {
  const sy = p.y - camY;
  if (sy < -30 || sy > H + 30) return;
  const sx = p.x, w = p.w, h = p.h;
  let alpha = 1;
  if (p.broken) alpha = Math.max(0, 1 - p.breakT / 32);
  ctx.globalAlpha = alpha;

  const fill = p.type === 'spring' ? '#3f6f2c' :
               p.type === 'crumbly' ? '#566434' :
               p.type === 'moving' ? '#2f6a4a' : '#4a7a34';
  const edge = p.type === 'crumbly' ? '#2a321a' : '#21361a';
  const r = 7;
  ctx.fillStyle = fill;
  roundRect(sx, sy, w, h, r); ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  roundRect(sx, sy, w, h, r); ctx.stroke();
  /* top moss highlight */
  ctx.fillStyle = 'rgba(190,225,150,0.45)';
  roundRect(sx + 3, sy + 1.5, Math.max(2, w - 6), 3, 2); ctx.fill();

  /* tiny mushroom caps on top */
  const capCount = Math.max(2, Math.floor(w / 22));
  for (let i = 0; i < capCount; i++) {
    const cx = sx + (i + 0.5) * (w / capCount);
    const cy = sy + 1.5;
    ctx.fillStyle = '#c8312b';
    ctx.beginPath();
    ctx.arc(cx, cy + 3, 3, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx - 1, cy + 2.2, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 1.4, cy + 2.6, 0.7, 0, Math.PI * 2); ctx.fill();
  }

  /* type decoration */
  if (p.type === 'crumbly') {
    ctx.strokeStyle = 'rgba(18,26,10,0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.3, sy + 2);
    ctx.lineTo(sx + w * 0.4, sy + h * 0.5);
    ctx.lineTo(sx + w * 0.32, sy + h - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.66, sy + 3);
    ctx.lineTo(sx + w * 0.72, sy + h * 0.6);
    ctx.stroke();
  } else if (p.type === 'spring') {
    ctx.strokeStyle = '#e6d24a';
    ctx.lineWidth = 2;
    const cx = sx + w / 2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(cx - 6, sy - 2 - i * 3);
      ctx.lineTo(cx + 6, sy - 5 - i * 3);
    }
    ctx.stroke();
  } else if (p.type === 'moving') {
    ctx.fillStyle = 'rgba(190,235,205,0.6)';
    const cy = sy + h / 2;
    ctx.beginPath();
    ctx.moveTo(sx + 4, cy); ctx.lineTo(sx + 9, cy - 3); ctx.lineTo(sx + 9, cy + 3); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + w - 4, cy); ctx.lineTo(sx + w - 9, cy - 3); ctx.lineTo(sx + w - 9, cy + 3); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSpore(s) {
  const sy = s.y - camY;
  if (sy < -20 || sy > H + 20) return;
  s.phase += 0.08;
  const bob = Math.sin(s.phase) * 2;
  const cx = s.x, cy = sy + bob;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
  grad.addColorStop(0, 'rgba(255,240,120,0.65)');
  grad.addColorStop(1, 'rgba(255,240,120,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe040';
  ctx.beginPath(); ctx.arc(cx, cy, s.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffbe0';
  ctx.beginPath(); ctx.arc(cx - 1.5, cy - 1.6, s.r * 0.4, 0, Math.PI * 2); ctx.fill();
}

function drawRot(r) {
  const sy = r.y - camY;
  if (sy < -30 || sy > H + 30) return;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const wob = Math.sin(r.phase) * 0.14;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wob);
  /* cap */
  ctx.fillStyle = '#3a1f4a';
  ctx.beginPath();
  ctx.ellipse(0, -2, r.w / 2, r.h / 2.2, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#241033';
  ctx.beginPath(); ctx.arc(-4, -3, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -2, 2.2, 0, Math.PI * 2); ctx.fill();
  /* stem */
  ctx.fillStyle = '#2a1838';
  ctx.fillRect(-5, 0, 10, r.h / 2 + 2);
  /* angry eyes */
  ctx.fillStyle = '#ff4040';
  ctx.beginPath(); ctx.arc(-4, 3, 1.9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, 3, 1.9, 0, Math.PI * 2); ctx.fill();
  /* angry brows */
  ctx.strokeStyle = '#140820'; ctx.lineWidth = 1.7;
  ctx.beginPath(); ctx.moveTo(-6.5, 0); ctx.lineTo(-2, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6.5, 0); ctx.lineTo(2, 2); ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  const sy = player.y - camY;
  const sx = player.x;
  const cx = sx + player.w / 2;
  const baseY = sy + player.h;
  /* blink while invulnerable */
  if (invuln > 0 && Math.floor(invuln / 6) % 2 === 0) return;

  const sq = player.squash;
  const scaleY = 1 - sq * 0.22;
  const scaleX = 1 + sq * 0.22;
  const airborne = player.vy < -1;
  const moving = Math.abs(player.vx) > 0.5;
  const legSwing = airborne ? 3.5 : (moving ? Math.sin(player.anim) * 3.2 : 0);

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(player.facing * scaleX, scaleY);

  /* legs */
  ctx.fillStyle = '#e8d8b0';
  ctx.fillRect(-7, -7 + legSwing, 4, 7);
  ctx.fillRect(3, -7 - legSwing, 4, 7);
  ctx.fillStyle = '#5a3a22';
  ctx.fillRect(-8, -2 + legSwing, 6, 3);
  ctx.fillRect(2, -2 - legSwing, 6, 3);

  /* stem (white rounded rect) */
  ctx.fillStyle = '#f5ecd8';
  roundRect(-9, -23, 18, 18, 5); ctx.fill();
  /* stem shadow */
  ctx.fillStyle = 'rgba(170,150,110,0.4)';
  roundRect(3, -23, 6, 18, 4); ctx.fill();

  /* cap (red semicircle) */
  ctx.fillStyle = '#c8312b';
  ctx.beginPath();
  ctx.ellipse(0, -23, 16, 12, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#7a1d18';
  ctx.beginPath();
  ctx.ellipse(0, -23, 16, 12, 0, Math.PI, 0);
  ctx.lineWidth = 0;
  /* cap underside rim */
  ctx.fillStyle = '#f5ecd8';
  ctx.beginPath();
  ctx.ellipse(0, -23, 14, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();

  /* white dots */
  ctx.fillStyle = '#ffffff';
  const dots = [[-7, -27, 2.2], [0, -31, 2.5], [7, -27, 2.2], [-3, -24, 1.6], [4, -25, 1.6]];
  for (let i = 0; i < dots.length; i++) {
    const d = dots[i];
    ctx.beginPath(); ctx.arc(d[0], d[1], d[2], 0, Math.PI * 2); ctx.fill();
  }

  /* eyes on stem */
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath(); ctx.arc(-4, -17, 1.9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -17, 1.9, 0, Math.PI * 2); ctx.fill();
  /* smile */
  ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, -14, 2.6, 0.15, Math.PI - 0.15); ctx.stroke();

  ctx.restore();
}

function drawParticles() {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const sy = p.y - camY;
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, sy, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function render() {
  drawBackground();
  if (state === 'start') return;
  for (let i = 0; i < platforms.length; i++) drawPlatform(platforms[i]);
  for (let i = 0; i < spores.length; i++) drawSpore(spores[i]);
  for (let i = 0; i < rots.length; i++) drawRot(rots[i]);
  drawPlayer();
  drawParticles();
}

/* ---- Update ---- */
function update(dt) {
  if (invuln > 0) invuln -= dt;
  if (boost > 0) boost -= dt;
  updatePlayer(dt);
  ensurePlatforms();
  updateRots(dt);
  updateParticles(dt);
  updateHud();
}

/* ---- Loop ---- */
function loop(t) {
  if (!lastT) lastT = t;
  let dt = (t - lastT) / 16.6667;
  lastT = t;
  if (dt > 3) dt = 3;
  if (dt <= 0) dt = 1;
  if (state === 'playing') update(dt);
  render();
  requestAnimationFrame(loop);
}

/* ---- Screens ---- */
function hideAllScreens() {
  screenStart.classList.remove('show');
  screenPause.classList.remove('show');
  screenOver.classList.remove('show');
}
function pause() {
  if (state !== 'playing') return;
  state = 'paused';
  screenPause.classList.add('show');
}
function resume() {
  if (state !== 'paused') return;
  hideAllScreens();
  state = 'playing';
}
function goHome() {
  state = 'start';
  hideAllScreens();
  screenStart.classList.add('show');
}
function startGame() {
  resize();
  score = 0; lives = START_LIVES; streak = 0; multiplier = 1;
  invuln = 0; boost = 0; maxClimb = 0; rotSpawnTimer = 60;
  platforms = []; spores = []; rots = []; particles = [];
  player.x = W / 2 - player.w / 2;
  player.y = H - 110;
  startPlayerY = player.y;
  player.vx = 0; player.vy = -JUMP_V; player.facing = 1; player.squash = 0;
  camY = player.y - H * 0.45;
  const baseP = makePlatform(W / 2 - 45, player.y + player.h + 6, 90, 'normal');
  platforms.push(baseP);
  highestPY = baseP.y;
  ensurePlatforms();
  hideAllScreens();
  state = 'playing';
  updateLivesDisplay();
  updateHud();
}

/* ---- Input ---- */
window.addEventListener('keydown', function (e) {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyP'].indexOf(e.code) >= 0) {
    e.preventDefault();
  }
  keys[e.code] = true;
  if (e.repeat) return;
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (state === 'playing') pause();
    else if (state === 'paused') resume();
  } else if (e.code === 'Space' || e.code === 'Enter') {
    if (state === 'start' || state === 'over') startGame();
    else if (state === 'paused') resume();
  }
});
window.addEventListener('keyup', function (e) { keys[e.code] = false; });
window.addEventListener('blur', function () { keys = {}; });

function bindHold(el, dir) {
  if (!el) return;
  const on = function (e) { e.preventDefault(); input.touchDir = dir; el.classList.add('active'); };
  const off = function (e) { e.preventDefault(); if (input.touchDir === dir) input.touchDir = 0; el.classList.remove('active'); };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointerleave', off);
  el.addEventListener('pointercancel', off);
}
bindHold(btnLeft, -1);
bindHold(btnRight, 1);

/* pointer drag steering on the canvas (mouse + touch + pen) */
canvas.addEventListener('pointerdown', function (e) {
  if (state !== 'playing') return;
  if (e.target === btnPause) return;
  input.pointerActive = true;
  const r = canvas.getBoundingClientRect();
  input.targetX = e.clientX - r.left;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
});
canvas.addEventListener('pointermove', function (e) {
  if (!input.pointerActive) return;
  const r = canvas.getBoundingClientRect();
  input.targetX = e.clientX - r.left;
});
function endPointer() { input.pointerActive = false; input.targetX = null; }
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

/* buttons */
btnPlay.addEventListener('click', startGame);
btnRetry.addEventListener('click', startGame);
btnHome.addEventListener('click', goHome);
btnPauseHome.addEventListener('click', goHome);
btnResume.addEventListener('click', resume);
btnPause.addEventListener('click', function () { if (state === 'playing') pause(); });

/* resize */
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });

/* boot */
resize();
updateLivesDisplay();
requestAnimationFrame(loop);

})();
