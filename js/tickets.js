/* =========================================================
   Страница «Билеты» (tickets.html) — скрипт ТОЛЬКО этой страницы.
   Использует из js/common.js: DAYS, ZONES, getZone, getDay, formatPrice,
   getOrders, getActiveOrders, addOrder, cancelOrder, getTakenSeats,
   showToast, initReveal, ORDERS_KEY, REDUCE_MOTION.
   ID места: <зона>-r<ряд>-s<место>, например zone-b-r4-s12.
   ========================================================= */

const MAX_SEATS = 8;
const SVGNS = 'http://www.w3.org/2000/svg';
const VB_FULL = { x: 0, y: 0, w: 1000, h: 800 };
const $t = (s, c = document) => c.querySelector(s);
const $$t = (s, c = document) => [...c.querySelectorAll(s)];
const plural = (n, one, few, many) => {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
};

/* ---------- 1. Геометрия зала (единицы viewBox 1000×800) ----------
   Каждая зона — один или несколько блоков. Ряд 1 — ближе к сцене.
   seats: [первое, последнее] место блока; angle — поворот блока к сцене;
   curve — изгиб рядов дугой. */
const LAYOUT = {
  'zone-fan': { label: [500, 128], blocks: [
    { cx: 392, cy: 200, angle: 0, seats: [1, 10], pitchX: 15, pitchY: 21 },
    { cx: 608, cy: 200, angle: 0, seats: [11, 20], pitchX: 15, pitchY: 21 }
  ] },
  'zone-vip': { label: [500, 438], blocks: [
    { cx: 452, cy: 485, angle: 0, seats: [1, 6], pitchX: 15, pitchY: 18 },
    { cx: 548, cy: 485, angle: 0, seats: [7, 12], pitchX: 15, pitchY: 18 }
  ] },
  'zone-a': { label: [170, 452], blocks: [
    { cx: 205, cy: 575, angle: 24, seats: [1, 16], pitchX: 15, pitchY: 17, curve: 0.0009 }
  ] },
  'zone-b': { label: [830, 452], blocks: [
    { cx: 795, cy: 575, angle: -24, seats: [1, 16], pitchX: 15, pitchY: 17, curve: 0.0009 }
  ] },
  'zone-c': { label: [500, 788], blocks: [
    { cx: 500, cy: 660, angle: 0, seats: [1, 18], pitchX: 15, pitchY: 16, curve: 0.0011 }
  ] }
};
const SEAT = 11;           // размер места
// заполненность зала «другими зрителями» (для реалистичной схемы), 0..1
const PRESOLD = { 'zone-fan': .62, 'zone-vip': .5, 'zone-a': .38, 'zone-b': .42, 'zone-c': .3 };
const ZONE_CLASS = { 'zone-fan': 'z-fan', 'zone-vip': 'z-vip', 'zone-a': 'z-a', 'zone-b': 'z-b', 'zone-c': 'z-c' };

/* ---------- 2. Состояние ---------- */
const urlDay = new URLSearchParams(location.search).get('day');
const state = {
  day: DAYS.some(d => d.id === urlDay) ? urlDay : 'day-1',
  selected: new Map(),     // seatId -> { seatId, zoneId, price, row, seat }
  zone: null,              // подсвеченная зона
  ordersFilter: 'active',
  qty: 2
};
const seatEls = new Map(); // seatId -> <rect>
let taken = new Set();

/* детерминированный «шум» — одинаковые занятые места при каждом открытии */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}
function isPresold(seatId, zoneId, dayId) {
  const p = PRESOLD[zoneId] * (dayId === 'day-2' ? 1.12 : 1);  // ночь популярнее
  return hash(seatId + dayId) < p;
}
function computeTaken() {
  const fromOrders = new Set(getTakenSeats(state.day));
  taken = new Set(fromOrders);
  seatEls.forEach((el, id) => { if (isPresold(id, el.dataset.zone, state.day)) taken.add(id); });
  return fromOrders;
}

/* ---------- 3. Сцена (по референсу: экраны, подиум, шестигранник, крылья) ---------- */
function el(tag, attrs, parent) {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
function hexPoints(cx, cy, r, rot = 0) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + rot;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}
function drawStage() {
  const g = $t('#stage');
  // лучи прожекторов
  [[380, 0, 300, 360], [620, 0, 700, 360], [500, 0, 500, 380]].forEach(([x1, y1, x2, y2], i) => {
    el('polygon', { points: `${x1 - 6},${y1} ${x1 + 6},${y1} ${x2 + 70},${y2} ${x2 - 70},${y2}`, fill: 'url(#beam)', class: `beam beam--${i}` }, g);
  });
  // подвесные экраны
  el('polygon', { points: hexPoints(500, 42, 30, Math.PI / 6), class: 'scr scr--main' }, g);
  el('polygon', { points: '410,22 450,32 450,62 410,52', class: 'scr' }, g);
  el('polygon', { points: '590,22 550,32 550,62 590,52', class: 'scr' }, g);
  el('text', { x: 500, y: 46, class: 'scr__txt' }, g).textContent = 'SA';
  // главная сцена
  el('polygon', { points: '330,84 670,84 650,110 350,110', class: 'stg' }, g);
  el('text', { x: 500, y: 102, class: 'stg__txt' }, g).textContent = 'ГЛАВНАЯ СЦЕНА';
  // подиум к центру
  el('rect', { x: 489, y: 110, width: 22, height: 222, class: 'stg stg--run' }, g);
  // крылья: прямо, затем вверх под углом — как на фото
  const wingL = '452,352 262,352 205,318 72,318 72,340 196,340 254,386 452,386';
  const wingR = '548,352 738,352 795,318 928,318 928,340 804,340 746,386 548,386';
  el('polygon', { points: wingL, class: 'stg stg--wing' }, g);
  el('polygon', { points: wingR, class: 'stg stg--wing' }, g);
  el('polyline', { points: '452,352 262,352 205,318 72,318', class: 'neon' }, g);
  el('polyline', { points: '452,386 254,386 196,340 72,340', class: 'neon' }, g);
  el('polyline', { points: '548,352 738,352 795,318 928,318', class: 'neon' }, g);
  el('polyline', { points: '548,386 746,386 804,340 928,340', class: 'neon' }, g);
  // центральная сцена-шестигранник
  el('polygon', { points: hexPoints(500, 369, 62, 0), class: 'hex-glow', filter: 'url(#glow-soft)' }, g);
  el('polygon', { points: hexPoints(500, 369, 56, 0), class: 'hex' }, g);
  el('polygon', { points: hexPoints(500, 369, 56, 0), class: 'neon neon--pink', filter: 'url(#glow)' }, g);
  el('polygon', { points: hexPoints(500, 369, 34, 0), class: 'hex-in' }, g);
  el('text', { x: 500, y: 374, class: 'hex__txt' }, g).textContent = 'STAGE';
}

/* ---------- 4. Места ---------- */
function drawSeats() {
  const root = $t('#seats');
  ZONES.forEach((z, zi) => {
    const g = el('g', { class: `zone ${ZONE_CLASS[z.id]}`, 'data-zone': z.id }, root);
    LAYOUT[z.id].blocks.forEach(b => {
      // блок поворачивается целиком, места внутри — в локальных координатах
      const bg = el('g', { transform: `translate(${b.cx} ${b.cy}) rotate(${b.angle})` }, g);
      const n = b.seats[1] - b.seats[0] + 1;
      for (let r = 1; r <= z.rows; r++) {
        for (let s = b.seats[0]; s <= b.seats[1]; s++) {
          const lx = (s - b.seats[0] - (n - 1) / 2) * b.pitchX;
          let ly = (r - 1 - (z.rows - 1) / 2) * b.pitchY;
          if (b.curve) ly -= b.curve * lx * lx * (1 + r * 0.04);  // ряды выгибаются к сцене
          const id = `${z.id}-r${r}-s${s}`;
          const rect = el('rect', {
            x: (lx - SEAT / 2).toFixed(1), y: (ly - SEAT / 2).toFixed(1), width: SEAT, height: SEAT,
            class: 'seat', 'data-id': id, 'data-zone': z.id, 'data-row': r, 'data-seat': s,
            style: `--i:${(zi * 40 + r * 6 + (s % 20)) * 6}ms`
          }, bg);
          seatEls.set(id, rect);
        }
      }
    });
    const [lx, ly] = LAYOUT[z.id].label;
    const t = el('text', { x: lx, y: ly, class: 'zone__label' }, g);
    t.textContent = `${z.title} · ${formatPrice(z.price)}`;
  });
}

function paintSeats() {
  seatEls.forEach((r, id) => {
    r.classList.toggle('is-taken', taken.has(id));
    r.classList.toggle('is-sel', state.selected.has(id));
  });
  // свободные места по зонам
  const free = {};
  ZONES.forEach(z => (free[z.id] = 0));
  seatEls.forEach((r, id) => { if (!taken.has(id)) free[r.dataset.zone]++; });
  const total = Object.values(free).reduce((a, b) => a + b, 0);
  $t('#tk-free').textContent = `Свободно ${total} из ${seatEls.size}`;
  return free;
}

/* ---------- 5. Масштаб и перемещение схемы ---------- */
const svg = () => $t('#arena');
let vb = { ...VB_FULL }, vbAnim;
function setVB(v) { vb = v; svg().setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`); updateHint(); }
function clampVB(v) {
  const w = Math.min(VB_FULL.w, Math.max(160, v.w)), h = w * VB_FULL.h / VB_FULL.w;
  return { w, h, x: Math.min(VB_FULL.w - w, Math.max(0, v.x)), y: Math.min(VB_FULL.h - h, Math.max(0, v.y)) };
}
function animateVB(target, ms = 700) {
  target = clampVB(target);
  cancelAnimationFrame(vbAnim);
  if (REDUCE_MOTION) return setVB(target);
  const from = { ...vb }, t0 = performance.now();
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = now => {
    const p = Math.min(1, (now - t0) / ms), e = ease(p);
    setVB({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e });
    if (p < 1) vbAnim = requestAnimationFrame(step);
  };
  vbAnim = requestAnimationFrame(step);
}
function zoomBy(f, cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2) {
  const w = vb.w / f, h = vb.h / f;
  animateVB({ x: cx - w / 2, y: cy - h / 2, w, h }, 400);
}
function zoomToZone(zoneId) {
  const b = $t(`.zone[data-zone="${zoneId}"]`).getBBox();
  const pad = 40, ratio = VB_FULL.w / VB_FULL.h;
  let w = b.width + pad * 2, h = b.height + pad * 2;
  if (w / h < ratio) w = h * ratio; else h = w / ratio;
  animateVB({ x: b.x + b.width / 2 - w / 2, y: b.y + b.height / 2 - h / 2, w, h });
}
const zoomed = () => vb.w < 700;
const coarse = matchMedia('(pointer: coarse)').matches;
function updateHint() {
  const hint = $t('#tk-hint');
  hint.textContent = zoomed() ? 'Перетаскивайте схему · ⤢ весь зал' : (coarse ? 'Нажмите на зону, чтобы приблизить' : 'Нажмите на место или зону');
  $t('#tk-map').classList.toggle('is-zoomed', zoomed());
}

function initMapControls() {
  $t('#zoom-in').addEventListener('click', () => zoomBy(1.6));
  $t('#zoom-out').addEventListener('click', () => zoomBy(1 / 1.6));
  $t('#zoom-reset').addEventListener('click', () => { highlightZone(null); animateVB(VB_FULL); });

  // перетаскивание
  const map = svg();
  let drag = null;
  map.addEventListener('pointerdown', e => {
    if (!zoomed()) return;
    drag = { x: e.clientX, y: e.clientY, vb: { ...vb }, moved: false };
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const k = vb.w / map.clientWidth;
    const dx = (e.clientX - drag.x) * k, dy = (e.clientY - drag.y) * k;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved) setVB(clampVB({ ...drag.vb, x: drag.vb.x - dx, y: drag.vb.y - dy }));
  });
  addEventListener('pointerup', () => { setTimeout(() => (drag = null), 0); });
  map.addEventListener('click', e => {
    if (drag && drag.moved) return;
    const seat = e.target.closest('.seat');
    if (seat) {
      // на телефоне сначала приближаем зону, потом выбираем место
      if (coarse && !zoomed()) { highlightZone(seat.dataset.zone); zoomToZone(seat.dataset.zone); return; }
      return toggleSeat(seat.dataset.id);
    }
    const zone = e.target.closest('.zone');
    if (zone) { highlightZone(zone.dataset.zone); zoomToZone(zone.dataset.zone); }
  });
  map.addEventListener('dblclick', e => {
    const pt = map.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(map.getScreenCTM().inverse());
    zoomBy(1.8, p.x, p.y);
  });

  // подсказка над местом
  const tip = $t('#tk-tip'), wrap = $t('#tk-map');
  map.addEventListener('pointermove', e => {
    const s = e.target.closest('.seat');
    if (!s || (drag && drag.moved)) { tip.classList.remove('is-on'); return; }
    const z = getZone(s.dataset.zone);
    const st = taken.has(s.dataset.id) ? '<em class="is-taken">Занято</em>' : state.selected.has(s.dataset.id) ? '<em>Выбрано · нажмите, чтобы убрать</em>' : `<em>${formatPrice(z.price)}</em>`;
    tip.innerHTML = `<b>${z.title}</b><span>Ряд ${s.dataset.row} · Место ${s.dataset.seat}</span>${st}`;
    const r = wrap.getBoundingClientRect();
    let x = e.clientX - r.left + 16, y = e.clientY - r.top + 16;
    if (x > r.width - 190) x -= 210;
    if (y > r.height - 90) y -= 100;
    tip.style.transform = `translate(${x}px, ${y}px)`;
    tip.classList.add('is-on');
  });
  map.addEventListener('pointerleave', () => tip.classList.remove('is-on'));
}

function highlightZone(zoneId) {
  state.zone = zoneId;
  $$t('.zone').forEach(g => g.classList.toggle('is-dim', !!zoneId && g.dataset.zone !== zoneId));
  $$t('.tk-zone').forEach(b => {
    const on = b.dataset.zone === (zoneId || '');
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', on);
  });
  if (zoneId) $t('#auto-zone').value = zoneId;
}

/* ---------- 6. Выбор мест ---------- */
function seatInfo(id) {
  const r = seatEls.get(id);
  const z = getZone(r.dataset.zone);
  return { seatId: id, zoneId: z.id, price: z.price, row: +r.dataset.row, seat: +r.dataset.seat };
}
function toggleSeat(id) {
  if (taken.has(id)) { showToast('Это место уже занято'); return; }
  if (state.selected.has(id)) state.selected.delete(id);
  else {
    if (state.selected.size >= MAX_SEATS) { showToast(`Не больше ${MAX_SEATS} мест в одном заказе`); return; }
    state.selected.set(id, seatInfo(id));
    const r = seatEls.get(id);
    r.classList.remove('pop'); void r.getBBox(); r.classList.add('pop');
  }
  hideDone();
  paintSeats();
  renderCart();
}

// автоподбор: N соседних свободных мест в самом близком к сцене ряду, ближе к центру ряда
function autoPick() {
  const zoneId = $t('#auto-zone').value, n = state.qty;
  const z = getZone(zoneId);
  if (state.selected.size + n > MAX_SEATS) { showToast(`В заказе максимум ${MAX_SEATS} мест`); return; }
  for (let r = 1; r <= z.rows; r++) {
    let best = null;
    LAYOUT[zoneId].blocks.forEach(b => {
      const mid = (b.seats[0] + b.seats[1]) / 2;
      for (let s = b.seats[0]; s + n - 1 <= b.seats[1]; s++) {
        const ids = Array.from({ length: n }, (_, k) => `${zoneId}-r${r}-s${s + k}`);
        if (ids.every(id => !taken.has(id) && !state.selected.has(id))) {
          const d = Math.abs(s + (n - 1) / 2 - mid);
          if (!best || d < best.d) best = { ids, d };
        }
      }
    });
    if (best) {
      best.ids.forEach(id => state.selected.set(id, seatInfo(id)));
      hideDone(); paintSeats(); renderCart();
      highlightZone(zoneId); zoomToZone(zoneId);
      best.ids.forEach(id => { const el = seatEls.get(id); el.classList.remove('pop'); void el.getBBox(); el.classList.add('pop'); });
      showToast(`${z.title}: ряд ${r}, места ${best.ids.map(id => id.split('-s')[1]).join(', ')}`);
      return;
    }
  }
  showToast(`В зоне ${z.title} нет ${n} мест подряд`);
}

/* ---------- 7. Корзина и оформление ---------- */
function renderCart() {
  const day = getDay(state.day);
  $t('#cart-day').textContent = `${day.date.slice(8, 10)}.${day.date.slice(5, 7)} · ${day.title}`;
  const list = $t('#cart-list');
  const items = [...state.selected.values()].sort((a, b) => a.seatId.localeCompare(b.seatId, 'en', { numeric: true }));
  list.innerHTML = items.length ? items.map(s => `
    <li class="tk-line ${ZONE_CLASS[s.zoneId]}">
      <i class="tk-line__sw"></i>
      <span><b>${getZone(s.zoneId).title}</b><small>Ряд ${s.row} · Место ${s.seat}</small></span>
      <span class="tk-line__price">${formatPrice(s.price)}</span>
      <button class="tk-line__x" data-del="${s.seatId}" aria-label="Убрать место" data-cursor="УБРАТЬ">×</button>
    </li>`).join('')
    : `<li class="tk-cart__empty">Места не выбраны. Нажмите на свободное место на схеме или подберите автоматически.</li>`;
  $$t('[data-del]', list).forEach(b => b.addEventListener('click', () => toggleSeat(b.dataset.del)));
  const total = items.reduce((s, i) => s + i.price, 0);
  $t('#cart-total').textContent = formatPrice(total);
  $t('#f-submit').disabled = !items.length;
  $t('#f-submit').firstChild.textContent = items.length
    ? `Оформить ${items.length} ${plural(items.length, 'билет', 'билета', 'билетов')} `
    : 'Оформить заказ ';
}

function initForm() {
  const form = $t('#tk-form'), err = $t('#f-err');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $t('#f-name').value.trim(), email = $t('#f-email').value.trim();
    $$t('.tk-field').forEach(f => f.classList.remove('is-bad'));
    if (!state.selected.size) { err.textContent = 'Выберите хотя бы одно место'; return; }
    if (name.length < 2) { err.textContent = 'Введите имя'; $t('#f-name').closest('.tk-field').classList.add('is-bad'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = 'Проверьте почту'; $t('#f-email').closest('.tk-field').classList.add('is-bad'); return; }
    // место могли занять в другой вкладке
    computeTaken();
    const lost = [...state.selected.keys()].filter(id => taken.has(id));
    if (lost.length) { lost.forEach(id => state.selected.delete(id)); paintSeats(); renderCart(); err.textContent = 'Часть мест уже заняли, проверьте заказ'; return; }
    err.textContent = '';

    const seats = [...state.selected.values()].map(({ seatId, zoneId, price }) => ({ seatId, zoneId, price }));
    const order = addOrder({ day: state.day, seats, name, email });
    state.selected.clear();
    computeTaken(); paintSeats(); renderCart(); renderTabs(); renderOrders();
    showDone(order);
    showToast('Билеты оформлены!');
  });
}

function showDone(order) {
  const day = getDay(order.day);
  const box = $t('#tk-done');
  box.hidden = false;
  box.innerHTML = `
    <div class="tk-ticket">
      <span class="label label--pink">Заказ оформлен</span>
      <b class="tk-ticket__id led">#${order.id.slice(-6)}</b>
      <p>${day.label} · ${day.title}<br>${order.seats.length} ${plural(order.seats.length, 'место', 'места', 'мест')} · ${formatPrice(order.total)}</p>
      <div class="tk-ticket__code" aria-hidden="true">${barcode(order.id)}</div>
    </div>
    <div class="tk-done__links">
      <a class="btn btn--sm" href="#orders">Мои заказы <span>↓</span></a>
      <a class="btn btn--sm" href="lightstick.html" data-cursor="ЛАЙТСТИК">Подключить лайтстик <span>↗</span></a>
      <a class="btn btn--sm" href="schedule.html?day=${order.day}" data-cursor="ПРОГРАММА">Программа вечера <span>↗</span></a>
    </div>`;
  $t('#tk-form').hidden = true;
  $t('.tk-auto').hidden = true;
}
function hideDone() {
  if ($t('#tk-done').hidden) return;
  $t('#tk-done').hidden = true;
  $t('#tk-form').hidden = false;
  $t('.tk-auto').hidden = false;
}
function barcode(seed) {
  return Array.from({ length: 34 }, (_, i) => `<i style="width:${1 + Math.floor(hash(seed + i) * 4)}px"></i>`).join('');
}

/* ---------- 8. Вкладки вечеров и зоны ---------- */
function renderTabs() {
  const box = $t('#tk-days');
  box.innerHTML = DAYS.map((d, i) => {
    let free = 0;
    const own = new Set(getTakenSeats(d.id));
    seatEls.forEach((r, id) => { if (!(own.has(id) || isPresold(id, r.dataset.zone, d.id))) free++; });
    const on = d.id === state.day;
    const min = Math.min(...ZONES.map(z => z.price));
    return `
      <button class="tk-tab ${on ? 'is-active' : ''}" role="tab" aria-selected="${on}" data-day="${d.id}" data-cursor="${on ? 'ВЫБРАН' : 'ВЫБРАТЬ'}">
        <span class="label">Вечер ${i + 1}</span>
        <span class="tk-tab__date led">${d.date.slice(8, 10)}.${d.date.slice(5, 7)}</span>
        <span class="tk-tab__title">${d.title}</span>
        <span class="tk-tab__meta"><span class="label">от ${formatPrice(min)}</span><span class="label label--white">${free} мест свободно</span></span>
        <span class="tk-tab__fill" style="--p:${(1 - free / seatEls.size) * 100}%"><i></i></span>
      </button>`;
  }).join('');
  $$t('.tk-tab', box).forEach(b => b.addEventListener('click', () => setDay(b.dataset.day)));
}

function setDay(id) {
  if (id === state.day) return;
  state.day = id;
  history.replaceState(null, '', `?day=${id}`);
  // выбранные места относятся к вечеру — при смене очищаем
  if (state.selected.size) showToast('Выбор мест сброшен: другой вечер');
  state.selected.clear();
  hideDone();
  const map = $t('#tk-map');
  map.classList.remove('is-switch'); void map.offsetWidth; map.classList.add('is-switch');
  computeTaken(); renderTabs(); renderZones(); paintSeats(); renderCart();
}

function renderZones() {
  const free = paintSeats();
  const box = $t('#tk-zones');
  box.innerHTML = `<button class="tk-zone ${state.zone ? '' : 'is-active'}" data-zone="" aria-pressed="${!state.zone}">Весь зал</button>` +
    ZONES.map(z => `
      <button class="tk-zone ${ZONE_CLASS[z.id]} ${state.zone === z.id ? 'is-active' : ''}" data-zone="${z.id}" aria-pressed="${state.zone === z.id}">
        <i class="tk-zone__sw"></i><b>${z.title}</b><span>${formatPrice(z.price)}</span><small>${free[z.id]} св.</small>
      </button>`).join('');
  $$t('.tk-zone', box).forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.zone || null;
    highlightZone(id);
    id ? zoomToZone(id) : animateVB(VB_FULL);
  }));
  const sel = $t('#auto-zone');
  const keep = sel.value;
  sel.innerHTML = ZONES.map(z => `<option value="${z.id}">${z.title} · ${formatPrice(z.price)}</option>`).join('');
  sel.value = keep || 'zone-b';
}

/* ---------- 9. Мои заказы ---------- */
function seatsSummary(seats) {
  const by = {};
  seats.forEach(s => {
    const [, r, n] = s.seatId.match(/-r(\d+)-s(\d+)$/);
    const key = `${s.zoneId}|${r}`;
    (by[key] = by[key] || []).push(+n);
  });
  return Object.entries(by).map(([k, ns]) => {
    const [z, r] = k.split('|');
    return `<span>${getZone(z).title} · ряд ${r} · ${ns.sort((a, b) => a - b).join(', ')}</span>`;
  }).join('');
}

function renderOrders() {
  const all = getOrders().slice().reverse();
  const act = all.filter(o => o.status === 'active');
  $t('#orders-meta').textContent = `${act.length} ${plural(act.length, 'активный', 'активных', 'активных')}`;
  const list = state.ordersFilter === 'active' ? act : all;
  const box = $t('#orders-list');
  if (!list.length) {
    box.innerHTML = `
      <div class="tk-orders__empty">
        <p class="h3">${state.ordersFilter === 'active' ? 'Активных заказов нет' : 'Заказов пока нет'}</p>
        <a class="btn btn--sm" href="#tk-map" data-cursor-off>Выбрать места <span>↑</span></a>
      </div>`;
    return;
  }
  box.innerHTML = list.map(o => {
    const d = getDay(o.day) || { label: o.day, title: '' };
    const date = new Date(o.createdAt);
    const off = o.status !== 'active';
    return `
      <article class="tk-order ${off ? 'is-off' : ''}" data-reveal>
        <div class="tk-order__id">
          <span class="label ${off ? '' : 'label--pink'}">${off ? 'Отменён' : 'Активен'}</span>
          <b class="led">#${o.id.slice(-6)}</b>
          <small class="label">${isNaN(date) ? '' : date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}</small>
        </div>
        <div class="tk-order__body">
          <p class="tk-order__day">${d.label} · ${d.title}</p>
          <p class="tk-order__seats">${seatsSummary(o.seats)}</p>
          <p class="label">${o.name} · ${o.email}</p>
        </div>
        <div class="tk-order__sum">
          <span class="label">${o.seats.length} ${plural(o.seats.length, 'место', 'места', 'мест')}</span>
          <b class="led">${formatPrice(o.total)}</b>
          ${off ? '' : `<button class="btn btn--sm tk-order__cancel" data-cancel="${o.id}" data-cursor="ОТМЕНА">Отменить</button>`}
        </div>
        <div class="tk-order__code" aria-hidden="true">${barcode(o.id)}</div>
      </article>`;
  }).join('');

  $$t('[data-cancel]', box).forEach(b => b.addEventListener('click', () => {
    if (!b.classList.contains('is-confirm')) {
      b.classList.add('is-confirm');
      b.textContent = 'Точно отменить?';
      setTimeout(() => { if (b.isConnected) { b.classList.remove('is-confirm'); b.textContent = 'Отменить'; } }, 3500);
      return;
    }
    cancelOrder(b.dataset.cancel);
    showToast('Заказ отменён, места освобождены');
    computeTaken(); renderTabs(); renderZones(); renderOrders();
  }));
  if (typeof initReveal === 'function') initReveal();
}

function initOrdersFilter() {
  $$t('.tk-orders__filter .chip').forEach(c => c.addEventListener('click', () => {
    state.ordersFilter = c.dataset.of;
    $$t('.tk-orders__filter .chip').forEach(x => { x.classList.toggle('is-active', x === c); x.setAttribute('aria-pressed', x === c); });
    renderOrders();
  }));
}

/* ---------- 10. Запуск ---------- */
document.addEventListener('DOMContentLoaded', () => {
  drawStage();
  drawSeats();
  computeTaken();
  renderTabs();
  renderZones();
  renderCart();
  renderOrders();
  initMapControls();
  initForm();
  initOrdersFilter();
  updateHint();

  $$t('.tk-qty button').forEach(b => b.addEventListener('click', () => {
    state.qty = Math.min(6, Math.max(1, state.qty + +b.dataset.q));
    $t('#auto-qty').textContent = state.qty;
  }));
  $t('#auto-pick').addEventListener('click', autoPick);

  // появление схемы: места «загораются» волной
  const map = $t('#tk-map');
  const io = new IntersectionObserver(en => {
    if (en[0].isIntersecting) { map.classList.add('is-lit'); io.disconnect(); }
  }, { threshold: .25 });
  io.observe(map);

  // заказы изменились в другой вкладке
  addEventListener('storage', e => {
    if (e.key !== ORDERS_KEY) return;
    computeTaken(); renderTabs(); renderZones(); renderOrders();
  });
});
