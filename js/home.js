/* =========================================================
   Главная страница (index.html)
   Использует из js/common.js: ARTISTS, NOMINATIONS, FEST_START,
   getArtist(), scrambleText(), initReveal(), fitText(), REDUCE_MOTION
   ========================================================= */

const PINK = [255, 45, 149];
const PURPLE = [157, 59, 255];
const WHITE = [255, 236, 248];
const isMobile = () => innerWidth <= 900;
const lightSync = false; // режим синхронизации света убран, оставлено для арены

/* ---------- Утилиты ---------- */
function splitChars(el) {
  const text = el.textContent;
  el.textContent = '';
  return [...text].map(ch => {
    const s = document.createElement('span');
    s.className = ch === ' ' ? 'char char--space' : 'char';
    s.textContent = ch === ' ' ? ' ' : ch;
    s.setAttribute('aria-hidden', 'true');
    el.appendChild(s);
    return s;
  });
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k].map(Math.round);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// следит, видно ли элемент — чтобы не рисовать canvas за экраном
function watchVisible(el) {
  const state = { visible: true };
  new IntersectionObserver(([e]) => { state.visible = e.isIntersecting; }).observe(el);
  return state;
}

/* =========================================================
   1. ПРЕЛОАДЕР
   ========================================================= */
function runPreloader(onDone) {
  const pre = document.getElementById('preloader');
  const num = document.getElementById('pre-num');
  const log = document.getElementById('pre-log');
  const bar = document.getElementById('pre-bar');
  const segs = Array.from({ length: 24 }, () => bar.appendChild(document.createElement('i')));
  const lines = ['Init light system', 'Connect 40 000 lightsticks', 'Load stage / HEX-01', 'Sync 128 BPM', 'Signal ready'];
  const duration = REDUCE_MOTION ? 300 : 2100;
  const start = performance.now();
  let shown = 0;

  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 2);
    num.textContent = String(Math.round(eased * 100)).padStart(3, '0');
    segs.forEach((s, i) => s.classList.toggle('is-on', i < Math.round(eased * segs.length)));
    while (shown < lines.length && eased >= shown / lines.length) {
      const li = document.createElement('li');
      li.innerHTML = `> ${lines[shown]} ... <b>OK</b>`;
      log.appendChild(li);
      shown++;
    }
    if (p < 1) return requestAnimationFrame(tick);
    setTimeout(() => {
      pre.classList.add('is-done');
      document.body.classList.add('is-loaded');
      onDone();
      setTimeout(() => pre.remove(), 1400);
    }, 200);
  }
  requestAnimationFrame(tick);
}

/* =========================================================
   2. 3D-АРЕНА ИЗ ОГНЕЙ (canvas)
   Сцена-шестигранник, подиумы, танцпол и трибуны,
   где каждая точка — лайтстик. Камера облетает зал.
   ========================================================= */
function initArena() {
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(canvas);
  let w, h, dpr;
  const points = [];   // огоньки
  const lines = [];    // контуры сцены, ферм
  let mouseX = 0, mouseY = 0, camYaw = 0.6, intro = 0;

  // --- шестиугольник: вершины ---
  const hex = (r, y, rot = 0) => Array.from({ length: 6 }, (_, i) => {
    const a = rot + i * Math.PI / 3;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  });
  const addLoop = (pts, color, width = 1.5) => lines.push({ pts: [...pts, pts[0]], color, width });

  // --- строим зал ---
  const rand = (a, b) => a + Math.random() * (b - a);
  const pickColor = () => { const r = Math.random(); return r < 0.5 ? PINK : r < 0.85 ? PURPLE : WHITE; };
  const mobile = isMobile();

  // сцена
  addLoop(hex(1.15, 0.12), PINK, 2.2);
  addLoop(hex(0.8, 0.12), PURPLE, 1);
  addLoop(hex(0.45, 0.12), PINK, 1);
  // подиумы в стороны (как на MAMA)
  for (const s of [-1, 1]) {
    lines.push({ pts: [[s * 1.0, 0.12, -0.18], [s * 3.3, 0.12, -0.18]], color: PINK, width: 1.6 });
    lines.push({ pts: [[s * 1.0, 0.12, 0.18], [s * 3.3, 0.12, 0.18]], color: PINK, width: 1.6 });
    addLoop(hex(0.45, 0.12).map(p => [p[0] + s * 3.6, p[1], p[2]]), PINK, 1.6);
  }
  // подиум вперёд
  lines.push({ pts: [[-0.16, 0.12, 1.0], [-0.16, 0.12, 2.6]], color: PINK, width: 1.4 });
  lines.push({ pts: [[0.16, 0.12, 1.0], [0.16, 0.12, 2.6]], color: PINK, width: 1.4 });
  // подвесной экран-шестигранник и ферма
  const screen = { r: 0.6, y: 2.6 };
  addLoop(hex(3.2, 4.2, Math.PI / 6), [120, 120, 140], 1);
  addLoop(hex(4.6, 4.6, Math.PI / 6), [80, 80, 100], 1);

  // танцпол (стоячие)
  const floorCount = mobile ? 900 : 1900;
  for (let i = 0; i < floorCount; i++) {
    const x = rand(-4.4, 4.4), z = rand(-3.4, 3.4);
    const r = Math.hypot(x, z);
    if (r < 1.35) continue;
    if (Math.abs(z) < 0.4 && Math.abs(x) < 4.1) continue;
    if (Math.abs(x) < 0.4 && z > 0 && z < 2.8) continue;
    points.push({ x, y: 0.28, z, c: pickColor(), ph: Math.random() * 6.28, sp: rand(1, 3), s: 1 });
  }
  // трибуны: ряды по шестиугольнику, поднимаются вверх
  const rows = mobile ? 9 : 15;
  for (let k = 0; k < rows; k++) {
    const R = 5.3 + k * 0.34, y = 0.5 + k * 0.27;
    const corners = hex(R, y, Math.PI / 6);
    const step = mobile ? 0.2 : 0.13;
    for (let e = 0; e < 6; e++) {
      const a = corners[e], b = corners[(e + 1) % 6];
      const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
      for (let t = 0; t < len; t += step) {
        const k2 = t / len;
        points.push({
          x: a[0] + (b[0] - a[0]) * k2 + rand(-.03, .03), y: y + rand(0, .06), z: a[2] + (b[2] - a[2]) * k2 + rand(-.03, .03),
          c: pickColor(), ph: Math.random() * 6.28, sp: rand(1, 3), s: 0.9
        });
      }
    }
  }
  points.forEach(p => { p.ang = Math.atan2(p.z, p.x); });

  // прожекторы: из-под потолка в зал
  const beams = Array.from({ length: 8 }, (_, i) => ({
    a: i / 8 * Math.PI * 2, r: 3.2, y: 4.2, c: i % 2 ? PINK : PURPLE, ph: Math.random() * 6.28
  }));

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // камера
  let cy, sy, cp, sp, dist, focal, ox, oy;
  function setupCamera(t) {
    const scroll = clamp(scrollY / innerHeight);
    camYaw += 0.0016;
    const yaw = camYaw + mouseX * 0.5;
    const pitch = 0.5 + mouseY * 0.14 + (1 - intro) * 0.5 - scroll * 0.15;
    dist = (mobile ? 12.5 : 9.4) + (1 - intro) * 10 - scroll * 3;
    cy = Math.cos(yaw); sy = Math.sin(yaw); cp = Math.cos(pitch); sp = Math.sin(pitch);
    focal = Math.min(w, h * 1.5) * 0.9;
    ox = w / 2; oy = h * 0.66;
  }
  function project(x, y, z) {
    const x1 = x * cy - z * sy, z1 = x * sy + z * cy;  // поворот по Y
    const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp; // наклон по X
    const zz = z2 + dist;
    if (zz < 0.5) return null;
    const k = focal / zz;
    return [ox + x1 * k, oy - (y2 - 1.2) * k, k];
  }

  function draw(now) {
    requestAnimationFrame(draw);
    if (!vis.visible) return;
    const t = now / 1000;
    if (intro < 1 && document.body.classList.contains('is-loaded')) intro = Math.min(1, intro + 0.008);
    setupCamera(t);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    // ритм: 128 BPM
    const beatPos = (t * 128 / 60);
    const beat = Math.exp(-(beatPos % 1) * 5);
    const beatColor = Math.floor(beatPos) % 2 ? PINK : PURPLE;

    // лучи прожекторов
    for (const b of beams) {
      const sx = Math.cos(b.a + t * 0.1) * b.r, sz = Math.sin(b.a + t * 0.1) * b.r;
      const tx = Math.cos(b.ph + t * 0.6) * 2.4, tz = Math.sin(b.ph * 1.3 + t * 0.45) * 2.0;
      const p1 = project(sx, b.y, sz), p2 = project(tx, 0, tz);
      if (!p1 || !p2) continue;
      const spread = 0.55 * p2[2];
      const g = ctx.createLinearGradient(p1[0], p1[1], p2[0], p2[1]);
      const alpha = (lightSync ? 0.08 + beat * 0.2 : 0.11) * intro;
      g.addColorStop(0, rgba(b.c, alpha * 1.6));
      g.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(p1[0] - 2, p1[1]); ctx.lineTo(p1[0] + 2, p1[1]);
      ctx.lineTo(p2[0] + spread, p2[1]); ctx.lineTo(p2[0] - spread, p2[1]);
      ctx.closePath(); ctx.fill();
    }

    // контуры сцены
    for (const l of lines) {
      ctx.beginPath();
      let ok = true;
      l.pts.forEach((p, i) => {
        const q = project(p[0], p[1], p[2]);
        if (!q) { ok = false; return; }
        i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      });
      if (!ok) continue;
      const pulse = l.color === PINK ? 0.6 + 0.4 * Math.sin(t * 2) : 0.5;
      ctx.strokeStyle = rgba(l.color, (lightSync ? 0.5 + beat * 0.5 : pulse) * intro);
      ctx.lineWidth = l.width;
      ctx.shadowColor = rgba(l.color, 1); ctx.shadowBlur = 12;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // вращающийся подвесной экран
    const sr = t * 0.5;
    for (let ring = 0; ring < 3; ring++) {
      const r = screen.r - ring * 0.15, yy = screen.y + Math.sin(t) * 0.05;
      const pts = hex(r, yy, sr + ring * 0.3);
      ctx.beginPath();
      pts.concat([pts[0]]).forEach((p, i) => {
        const q = project(p[0], p[1], p[2]);
        if (q) i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      });
      ctx.strokeStyle = rgba(ring === 1 ? PURPLE : PINK, 0.8 * intro);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // огоньки зала
    for (const p of points) {
      const bob = Math.sin(t * 3 + p.ph) * 0.03;
      const q = project(p.x, p.y + bob, p.z);
      if (!q) continue;
      // волна по кругу зала
      const wave = (Math.sin(p.ang * 3 - t * 1.8) + 1) / 2;
      const tw = (Math.sin(t * p.sp + p.ph) + 1) / 2;
      let a = 0.28 + wave * 0.6 + tw * 0.3;
      let c = p.c;
      if (lightSync) { c = mix(p.c, beatColor, 0.85); a = 0.25 + beat * 0.9; }
      a *= intro;
      const size = Math.max(1.2, p.s * q[2] * 0.045);
      ctx.fillStyle = rgba(c, clamp(a));
      ctx.fillRect(q[0] - size / 2, q[1] - size / 2, size, size);
      if (size > 2.2) {
        ctx.fillStyle = rgba(c, clamp(a) * 0.16);
        ctx.fillRect(q[0] - size * 1.6, q[1] - size * 1.6, size * 3.2, size * 3.2);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  addEventListener('mousemove', e => {
    mouseX = e.clientX / innerWidth - 0.5;
    mouseY = e.clientY / innerHeight - 0.5;
  });
  addEventListener('resize', resize);
  resize();
  if (REDUCE_MOTION) intro = 1;
  requestAnimationFrame(draw);
}

/* =========================================================
   3. ЗАГОЛОВОК: проявление + глитч
   ========================================================= */
function initHeroTitle() {
  const title = document.getElementById('hero-title');
  const chars = splitChars(title);
  const bar = document.querySelector('.hero__glitch-bar');
  chars.forEach(c => c.classList.add('is-hidden'));

  return function reveal() {
    chars.forEach((c, i) => {
      setTimeout(() => {
        c.classList.remove('is-hidden');
        const final = c.textContent;
        let n = 0;
        const iv = setInterval(() => {
          c.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          if (++n > 6) { clearInterval(iv); c.textContent = final; }
        }, 45);
      }, 300 + i * 70);
    });
    if (REDUCE_MOTION) return;
    // случайный глитч: буквы гаснут до контура или вспыхивают розовым
    setInterval(() => {
      const c = chars[Math.floor(Math.random() * chars.length)];
      const cls = Math.random() < 0.6 ? 'is-off' : 'is-pink';
      c.classList.add(cls);
      setTimeout(() => c.classList.remove(cls), 160 + Math.random() * 500);
    }, 420);
    // полоса, которая пробегает по заголовку
    setInterval(() => {
      bar.classList.remove('is-run'); void bar.offsetWidth; bar.classList.add('is-run');
    }, 4800);
    setTimeout(() => bar.classList.add('is-run'), 1600);
  };
}

/* ---------- Таймер ---------- */
function initCountdown() {
  const target = new Date(FEST_START).getTime();
  const $ = id => document.getElementById(id);
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  function update() {
    let diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff / 864e5); diff -= d * 864e5;
    const hh = Math.floor(diff / 36e5); diff -= hh * 36e5;
    const m = Math.floor(diff / 6e4); diff -= m * 6e4;
    const s = Math.floor(diff / 1e3);
    $('cd-days').textContent = pad(d, 3); $('cd-hours').textContent = pad(hh);
    $('cd-min').textContent = pad(m); $('cd-sec').textContent = pad(s);
  }
  update(); setInterval(update, 1000);
}

/* =========================================================
   4. БЕГУЩАЯ СТРОКА
   ========================================================= */
function renderMarquee() {
  const track = document.getElementById('marquee-artists');
  const items = ARTISTS.map(a => `<span>${a.name}</span><span>✕</span>`).join('');
  track.innerHTML = items + items;
}

/* =========================================================
   5. О ПРЕМИИ: осциллограф + строки заявления
   ========================================================= */
function initWave() {
  const canvas = document.getElementById('wave');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(canvas);
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw(now) {
    requestAnimationFrame(draw);
    if (!vis.visible) return;
    const t = now / 1000, W = canvas.clientWidth, H = canvas.clientHeight;
    ctx.clearRect(0, 0, W, H);
    // сетка
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.stroke(); }
    // три сигнала
    [[PINK, 1, 0], [PURPLE, 0.6, 1.3], [WHITE, 0.3, 2.1]].forEach(([c, amp, off]) => {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const k = x / W;
        const env = Math.sin(k * Math.PI);
        const y = H / 2 + env * amp * H * 0.36 * (Math.sin(k * 18 - t * 5 + off) * 0.6 + Math.sin(k * 41 + t * 3 + off) * 0.3 + Math.sin(k * 7 - t * 2) * 0.4);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = rgba(c, c === WHITE ? 0.35 : 0.9);
      ctx.lineWidth = c === PINK ? 1.6 : 1;
      ctx.shadowColor = rgba(c, 1); ctx.shadowBlur = c === PINK ? 10 : 0;
      ctx.stroke();
    });
    ctx.shadowBlur = 0;
  }
  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
}

function initStatement() {
  const el = document.getElementById('statement');
  new IntersectionObserver(([e], io) => {
    if (e.isIntersecting) { el.classList.add('is-in'); io.disconnect(); }
  }, { threshold: 0.3 }).observe(el);
}

/* =========================================================
   6. АРТИСТЫ: карточки с фото групп
   ========================================================= */
function renderArtists() {
  const box = document.getElementById('artist-cards');
  box.innerHTML = ARTISTS.map((a, i) => `
    <a class="card" href="lightstick.html?artist=${a.id}" style="--c:${a.color}; --d:${(i % 4) * 0.07}s" data-reveal data-cursor="ЛАЙТСТИК">
      <div class="card__media">
        ${a.photo ? `<img src="${a.photo}" alt="${a.name}" loading="lazy">` : ''}
        <span class="card__num">${String(i + 1).padStart(2, '0')}</span>
        <span class="card__arrow" aria-hidden="true">↗</span>
      </div>
      <div class="card__body">
        <h3 class="card__name">${a.name}</h3>
        <dl class="card__meta">
          <div><dt>Фэндом</dt><dd>${a.fandom}</dd></div>
          <div><dt>Лайтстик</dt><dd>${a.stickName}</dd></div>
          <div><dt>Дебют</dt><dd class="led">${a.debut}</dd></div>
        </dl>
      </div>
    </a>`).join('');
  initReveal();
}

/* =========================================================
   7. НОМИНАЦИИ
   ========================================================= */
function renderNominations() {
  const grid = document.getElementById('noms-grid');
  grid.innerHTML = NOMINATIONS.map((n, i) => `
    <div class="nom" id="${n.id}" tabindex="0" data-reveal style="--d:${(i % 4) * 0.07}s" data-cursor="НОМИНАНТЫ">
      <span class="nom__bg" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
      <div class="nom__top">
        <span class="nom__num">N°${String(i + 1).padStart(2, '0')}</span>
        <svg class="nom__hex" viewBox="0 0 48 48" aria-hidden="true">
          <polygon points="24,2 43,13 43,35 24,46 5,35 5,13"/>
          <polygon points="24,12 34,18 34,30 24,36 14,30 14,18"/>
        </svg>
      </div>
      <ul class="nom__list">${n.nominees.map(id => `<li>${getArtist(id).name}</li>`).join('')}</ul>
      <h3 class="nom__title">${n.title}</h3>
    </div>`).join('');
  grid.querySelectorAll('.nom').forEach(n => {
    n.addEventListener('click', () => n.classList.toggle('is-open'));
    n.addEventListener('keydown', e => { if (e.key === 'Enter') n.classList.toggle('is-open'); });
  });
  initReveal();
}

/* =========================================================
   8. «ЗАЖГИ ЛЕТО»: матрица огней + буквы по прокрутке
   ========================================================= */
function initGlow() {
  const section = document.getElementById('glow');
  const chars = splitChars(document.getElementById('glow-title'));
  chars.forEach((c, i) => { if (i > 5) c.classList.add('is-white'); });
  const percent = document.getElementById('glow-percent');
  const canvas = document.getElementById('matrix');
  const ctx = canvas.getContext('2d');
  const vis = watchVisible(section);
  let cells = [], W, H, progress = 0;
  const S = 18;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cells = [];
    const cx = W / 2, cy = H / 2, maxR = Math.hypot(cx, cy);
    for (let y = S / 2; y < H; y += S) for (let x = S / 2; x < W; x += S) {
      // зажигаются от центра к краям с небольшим шумом
      const d = Math.hypot(x - cx, (y - cy) * 1.4) / maxR;
      cells.push({ x, y, th: d * 0.85 + Math.random() * 0.15, c: Math.random() < 0.7 ? PINK : PURPLE, ph: Math.random() * 6.28 });
    }
  }
  function update() {
    const r = section.getBoundingClientRect();
    progress = clamp(-r.top / (section.offsetHeight - innerHeight));
    const lit = Math.round(progress * 1.3 * chars.length);
    chars.forEach((c, i) => c.classList.toggle('is-lit', i < lit));
    percent.textContent = String(Math.round(progress * 100)).padStart(3, '0') + '%';
  }
  function draw(now) {
    requestAnimationFrame(draw);
    if (!vis.visible) return;
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    for (const c of cells) {
      const on = progress * 1.1 > c.th;
      const flick = (Math.sin(t * 3 + c.ph) + 1) / 2;
      const a = on ? 0.35 + flick * 0.5 : 0.05;
      ctx.fillStyle = rgba(on ? c.c : WHITE, a);
      ctx.fillRect(c.x - 2.5, c.y - 2.5, 5, 5);
    }
  }
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', () => { resize(); update(); });
  resize(); update();
  requestAnimationFrame(draw);
}

/* =========================================================
   ЗАПУСК
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  renderMarquee();
  renderArtists();
  renderNominations();
  initStatement();
  initWave();
  initGlow();
  initCountdown();
  initArena();
  const reveal = initHeroTitle();
  fitText();
  runPreloader(reveal);
});
