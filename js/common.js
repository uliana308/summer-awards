/* =========================================================
   SUMMERAWARDS 2027 — общий скрипт (common.js)
   Подключается на ВСЕХ страницах ПЕРЕД скриптом своей страницы.
   Здесь: общие данные (одинаковые ID), работа с заказами,
   боковая панель, меню, подвал, анимации появления.
   Меняем только по договорённости команды.
   ========================================================= */

/* ---------- 1. ОБЩИЕ ДАННЫЕ (ID не переименовывать!) ---------- */

// Артисты. color — цвет фэндома/лайтстика (примерный, уточняется командой)
// photo — путь к фото группы (источник: Wikimedia Commons, см. assets/img/artists/README.txt)
const ARTISTS = [
  { id: 'art-bts',       name: 'BTS',         fandom: 'ARMY',      color: '#A855F7', stickName: 'ARMY Bomb',      stickShape: 'sphere',  debut: 2013, photo: 'assets/img/artists/art-bts.jpg' },
  { id: 'art-seventeen', name: 'SEVENTEEN',   fandom: 'CARAT',     color: '#F7A8C4', stickName: 'Carat Bong',     stickShape: 'diamond', debut: 2015, photo: 'assets/img/artists/art-seventeen.jpg' },
  { id: 'art-skz',       name: 'Stray Kids',  fandom: 'STAY',      color: '#FF2E4C', stickName: 'Nachimbong',     stickShape: 'compass', debut: 2018, photo: 'assets/img/artists/art-skz.jpg' },
  { id: 'art-blackpink', name: 'BLACKPINK',   fandom: 'BLINK',     color: '#FF5FA2', stickName: 'Hammer Bong',    stickShape: 'heart',   debut: 2016, photo: 'assets/img/artists/art-blackpink.jpg' },
  { id: 'art-twice',     name: 'TWICE',       fandom: 'ONCE',      color: '#FF9A62', stickName: 'Candy Bong',     stickShape: 'candy',   debut: 2015, photo: 'assets/img/artists/art-twice.jpg' },
  { id: 'art-aespa',     name: 'aespa',       fandom: 'MY',        color: '#9EA9FF', stickName: 'aespa Lightstick', stickShape: 'aurora', debut: 2020, photo: 'assets/img/artists/art-aespa.jpg' },
  { id: 'art-newjeans',  name: 'NewJeans',    fandom: 'Bunnies',   color: '#3E9BFF', stickName: 'Binky Bong',     stickShape: 'bunny',   debut: 2022, photo: 'assets/img/artists/art-newjeans.jpg' },
  { id: 'art-enhypen',   name: 'ENHYPEN',     fandom: 'ENGENE',    color: '#FF6A2C', stickName: 'ENHYPEN Lightstick', stickShape: 'crown', debut: 2020, photo: 'assets/img/artists/art-enhypen.jpg' }
];

// Дни фестиваля
const DAYS = [
  { id: 'day-1', title: 'Sunset Stage', date: '2027-08-14', label: '14 августа' },
  { id: 'day-2', title: 'Night Stage',  date: '2027-08-15', label: '15 августа' }
];

// Зоны зала (цены в рублях)
const ZONES = [
  { id: 'zone-fan', title: 'FAN ZONE', price: 9500,  rows: 6,  seatsPerRow: 20 },
  { id: 'zone-vip', title: 'VIP',      price: 18000, rows: 4,  seatsPerRow: 12 },
  { id: 'zone-a',   title: 'Сектор A', price: 7500,  rows: 10, seatsPerRow: 16 },
  { id: 'zone-b',   title: 'Сектор B', price: 6500,  rows: 10, seatsPerRow: 16 },
  { id: 'zone-c',   title: 'Сектор C', price: 4500,  rows: 12, seatsPerRow: 18 }
];

// Номинации (nominees — ID артистов)
const NOMINATIONS = [
  { id: 'nom-artist', title: 'Артист лета',          nominees: ['art-bts', 'art-seventeen', 'art-skz', 'art-blackpink'] },
  { id: 'nom-song',   title: 'Песня лета',           nominees: ['art-newjeans', 'art-twice', 'art-aespa', 'art-bts'] },
  { id: 'nom-album',  title: 'Альбом лета',          nominees: ['art-bts', 'art-skz', 'art-enhypen', 'art-seventeen'] },
  { id: 'nom-stage',  title: 'Лучшее выступление',   nominees: ['art-seventeen', 'art-skz', 'art-bts', 'art-enhypen'] },
  { id: 'nom-global', title: 'Global Star',          nominees: ['art-bts', 'art-blackpink', 'art-twice', 'art-skz'] },
  { id: 'nom-dance',  title: 'Лучшая хореография',   nominees: ['art-seventeen', 'art-aespa', 'art-enhypen', 'art-newjeans'] },
  { id: 'nom-ost',    title: 'Лучший OST',           nominees: ['art-twice', 'art-aespa', 'art-newjeans', 'art-blackpink'] },
  { id: 'nom-fan',    title: 'Fan Choice',           nominees: ['art-bts', 'art-seventeen', 'art-skz', 'art-twice'] }
];

// Дата начала (для таймера)
const FEST_START = '2027-08-14T18:00:00+03:00';

function getArtist(id) { return ARTISTS.find(a => a.id === id); }
function getZone(id)   { return ZONES.find(z => z.id === id); }
function getDay(id)    { return DAYS.find(d => d.id === id); }
function formatPrice(n) { return n.toLocaleString('ru-RU') + ' ₽'; }


/* ---------- 2. ЗАКАЗЫ (единый ключ localStorage) ---------- */

const ORDERS_KEY = 'summerawards_orders';
const LIGHTSTICK_KEY = 'summerawards_lightstick';

/*  Формат заказа:
    {
      id: 'ord-1723650000000',
      day: 'day-2',
      seats: [{ seatId: 'zone-b-r4-s12', zoneId: 'zone-b', price: 6500 }],
      total: 6500,
      name: 'Иван', email: 'ivan@mail.ru',
      status: 'active' | 'cancelled',
      createdAt: '2027-08-01T12:00:00.000Z'
    }
*/

function getOrders() {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; }
  catch (e) { return []; }
}

function saveOrders(orders) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  updateOrdersBadge();
}

function addOrder({ day, seats, name, email }) {
  const order = {
    id: 'ord-' + Date.now(),
    day,
    seats,
    total: seats.reduce((sum, s) => sum + s.price, 0),
    name, email,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  const orders = getOrders();
  orders.push(order);
  saveOrders(orders);
  return order;
}

function cancelOrder(id) {
  const orders = getOrders().map(o => o.id === id ? { ...o, status: 'cancelled' } : o);
  saveOrders(orders);
}

function getActiveOrders() { return getOrders().filter(o => o.status === 'active'); }

// Занятые места на день (из активных заказов)
function getTakenSeats(dayId) {
  return getActiveOrders().filter(o => o.day === dayId).flatMap(o => o.seats.map(s => s.seatId));
}


/* ---------- 3. ОБЩИЙ КАРКАС: панель, меню, верхняя панель, подвал ---------- */

const PAGES = [
  { href: 'index.html',      title: 'Главная',    num: '01' },
  { href: 'schedule.html',   title: 'Расписание', num: '02' },
  { href: 'tickets.html',    title: 'Билеты',     num: '03' },
  { href: 'lightstick.html', title: 'Лайтстик',   num: '04' }
];

const ICONS = {
  logo: '<svg viewBox="0 0 40 40"><polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="none" stroke="#FF2D95" stroke-width="2"/><polygon points="20,10 29,15 29,25 20,30 11,25 11,15" fill="#FF2D95"/></svg>',
  ig: '<svg viewBox="0 0 24 24" style="fill:none;stroke:#F2F0F5;stroke-width:1.8"><rect x="3" y="3" width="18" height="18"/><circle cx="12" cy="12" r="4"/><rect x="16.5" y="5.5" width="2" height="2" style="fill:#F2F0F5;stroke:none"/></svg>',
  yt: '<svg viewBox="0 0 24 24"><path d="M23 7.2a3 3 0 00-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 001 7.2 31 31 0 00.5 12 31 31 0 001 16.8a3 3 0 002.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 002.1-2.1 31 31 0 00.5-4.8 31 31 0 00-.5-4.8zM9.7 15V9l5.8 3-5.8 3z"/></svg>',
  tg: '<svg viewBox="0 0 24 24"><path d="M21.9 4.3l-3.2 15c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2l-11 6.9-4.7-1.5c-1-.3-1-1 .2-1.5L20.6 3c.9-.3 1.6.2 1.3 1.3z"/></svg>',
  vk: '<svg viewBox="0 0 24 24"><path d="M13 18c-6.8 0-10.7-4.7-10.9-12.4h3.4c.1 5.7 2.6 8.1 4.6 8.6V5.6h3.2v4.9c2-.2 4-2.4 4.7-4.9h3.2c-.5 3-2.7 5.2-4.3 6.1 1.6.7 4.1 2.6 5 6.3h-3.5c-.8-2.4-2.7-4.3-5.1-4.5V18H13z"/></svg>'
};

function currentPage() {
  const file = location.pathname.split('/').pop();
  return file || 'index.html';
}

function renderLayout() {
  const page = currentPage();

  // линии сетки на фоне
  if (!document.querySelector('.grid-lines')) {
    const g = document.createElement('div');
    g.className = 'grid-lines';
    g.setAttribute('aria-hidden', 'true');
    g.innerHTML = '<span></span>'.repeat(12);
    document.body.prepend(g);
  }

  const rail = document.getElementById('sa-rail');
  if (rail) {
    rail.innerHTML = `
      <div class="rail__top">
        <a class="rail__logo" href="index.html" aria-label="На главную">${ICONS.logo}</a>
        <button class="rail__burger" id="sa-burger" aria-label="Открыть меню" aria-expanded="false" data-cursor="МЕНЮ"><span></span><span></span><span></span></button>
      </div>
      <div class="rail__title"><b>SUMMERAWARDS</b> <i>2027</i> · SOLAR ARENA</div>
      <div class="rail__social">
        <a href="#" aria-label="Instagram">${ICONS.ig}</a>
        <a href="#" aria-label="YouTube">${ICONS.yt}</a>
        <a href="#" aria-label="Telegram">${ICONS.tg}</a>
        <a href="#" aria-label="VK">${ICONS.vk}</a>
      </div>`;
  }

  const menu = document.getElementById('sa-menu');
  if (menu) {
    menu.innerHTML = `
      <nav class="menu__nav">
        ${PAGES.map(p => `<a class="menu__link ${p.href === page ? 'is-current' : ''}" href="${p.href}"><small>[${p.num}]</small><span>${p.title}</span>${p.href === page ? '<em>Вы здесь</em>' : ''}</a>`).join('')}
      </nav>
      <a class="menu__cta" href="tickets.html" data-cursor-off>Купить билет <span>↗</span></a>
      <div class="menu__side">
        <div>
          <p class="label label--pink">Solar Arena</p>
          <p class="label">14—15.08.2027</p>
        </div>
        <div class="led">2027</div>
        <p class="label">Летняя музыкальная премия</p>
      </div>`;
  }

  const topbar = document.getElementById('sa-topbar');
  if (topbar) {
    topbar.innerHTML = `
      <a class="topbar__brand" href="index.html">SUMMER<span>AWARDS</span></a>
      <nav class="topbar__nav">
        ${PAGES.map(p => `<a href="${p.href}" class="${p.href === page ? 'is-current' : ''}">${p.title}</a>`).join('')}
      </nav>
      <div class="topbar__actions">
        <a class="btn btn--solid" href="tickets.html" data-cursor-off>Купить билет</a>
        <a class="topbar__orders" href="tickets.html#orders" aria-label="Мои заказы" data-cursor="ЗАКАЗЫ"><small>ORD</small><span class="topbar__count" id="sa-orders-count">0</span></a>
      </div>`;
  }

  const footer = document.getElementById('sa-footer');
  if (footer) {
    footer.innerHTML = `
      <div class="wrap">
        <div class="footer__grid">
          <div>
            <p class="label label--pink">Get notified first</p>
            <p class="h3" style="margin-top:22px;max-width:560px">Летняя премия, где светится каждый зритель</p>
          </div>
          <div>
            <h4 class="label">Страницы</h4>
            ${PAGES.map(p => `<a href="${p.href}"><span>${p.title}</span><span>${p.num}</span></a>`).join('')}
          </div>
          <div>
            <h4 class="label">Соцсети</h4>
            <a href="#"><span>Instagram</span><span>↗</span></a><a href="#"><span>YouTube</span><span>↗</span></a><a href="#"><span>Telegram</span><span>↗</span></a><a href="#"><span>VK</span><span>↗</span></a>
          </div>
        </div>
        <div class="footer__wrap"><div class="footer__word" data-fit="1">${[...'SUMMERAWARDS'].map(c => `<span>${c}</span>`).join('')}</div></div>
        <div class="footer__bottom">
          <span class="label">© 2027 SUMMERAWARDS · учебный проект, некоммерческое использование</span>
          <span class="label">Solar Arena · 14—15.08</span>
        </div>
      </div>`;
  }

  if (!document.getElementById('sa-toast')) {
    const t = document.createElement('div');
    t.id = 'sa-toast';
    document.body.appendChild(t);
  }

  const burger = document.getElementById('sa-burger');
  if (burger) {
    burger.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open);
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') document.body.classList.remove('menu-open');
    });
  }

  updateOrdersBadge();
}

function updateOrdersBadge() {
  const el = document.getElementById('sa-orders-count');
  if (!el) return;
  const n = getActiveOrders().length;
  el.textContent = String(n).padStart(2, '0');
  el.classList.toggle('is-visible', n > 0);
}


/* ---------- 4. ОБЩИЕ ЭФФЕКТЫ ---------- */

const REDUCE_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

// «Расшифровка» текста: буквы перебираются и встают на место.
// В HTML: <h2 data-scramble>Номинации</h2> — сработает при появлении на экране.
const SCRAMBLE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*/<>[]_АБВГДЖЗИКЛМНПРСТУФЦШЭЯ';
function scrambleText(el, duration = 900) {
  const final = el.dataset.text || el.textContent;
  el.dataset.text = final;
  if (REDUCE_MOTION) { el.textContent = final; return; }
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const fixed = Math.floor(p * final.length);
    let out = '';
    for (let i = 0; i < final.length; i++) {
      const ch = final[i];
      if (i < fixed || ch === ' ' || ch === '\n') out += ch;
      else out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Появление элементов: data-reveal (сдвиг/прозрачность) и data-scramble (расшифровка)
let revealObserver;
function initReveal() {
  const items = document.querySelectorAll('[data-reveal]:not(.is-in), [data-scramble]:not(.is-scrambled), .line-x:not(.is-in)');
  if (!('IntersectionObserver' in window)) { items.forEach(i => i.classList.add('is-in')); return; }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.classList.add('is-in');
        if (el.hasAttribute('data-scramble') && !el.classList.contains('is-scrambled')) {
          el.classList.add('is-scrambled');
          setTimeout(() => scrambleText(el, +el.dataset.scramble || 900), parseFloat(getComputedStyle(el).getPropertyValue('--d') || 0) * 1000);
        }
        revealObserver.unobserve(el);
      });
    }, { threshold: 0.15 });
  }
  items.forEach(i => revealObserver.observe(i));
}

// Счётчики: <span data-count="8">0</span>
function initCounters() {
  const items = document.querySelectorAll('[data-count]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count, start = performance.now(), dur = 1800;
      const pad = el.dataset.pad ? +el.dataset.pad : 0;
      const tick = now => {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 4)))).padStart(pad, '0');
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  items.forEach(i => io.observe(i));
}

// Курсор: точка + квадратная рамка с подписью (data-cursor="ТЕКСТ")
function initCursor() {
  if (!matchMedia('(pointer: fine)').matches) return;
  document.body.classList.add('has-cursor');
  const ring = document.createElement('div'); ring.id = 'sa-cursor'; ring.innerHTML = '<span></span>';
  const dot = document.createElement('div'); dot.id = 'sa-cursor-dot';
  document.body.append(ring, dot);
  const label = ring.querySelector('span');
  let x = -100, y = -100, rx = x, ry = y;
  addEventListener('mousemove', e => {
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    if (rx < -50) { rx = x; ry = y; } // первое движение — без «прилёта» из угла
  });
  document.addEventListener('mouseover', e => {
    let t = e.target.closest('[data-cursor-off], [data-cursor], a, button');
    if (t && t.hasAttribute('data-cursor-off')) t = null; // на «Купить билет» курсор не меняется
    ring.classList.toggle('is-hover', !!t);
    const text = t && t.dataset.cursor;
    ring.classList.toggle('has-label', !!text);
    label.textContent = text || '';
  });
  (function loop() {
    rx += (x - rx) * 0.5; ry += (y - ry) * 0.5;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(loop);
  })();
}

// Огромные надписи по ширине контейнера: <h1 data-fit="0.9" data-fit-max="200">…</h1>
function fitText() {
  document.querySelectorAll('[data-fit]').forEach(el => {
    const ratio = parseFloat(el.dataset.fit) || 1;
    const max = parseFloat(el.dataset.fitMax) || 600;
    el.style.fontSize = '100px';
    const w = el.offsetWidth; // ширина по раскладке (трансформации букв не влияют)
    const target = el.parentElement.clientWidth * ratio;
    el.style.fontSize = Math.min(max, 100 * target / w) + 'px';
  });
}
addEventListener('resize', fitText);
if (document.fonts) document.fonts.ready.then(fitText);

// Уведомление: showToast('Билет оформлен!')
function showToast(text) {
  const t = document.getElementById('sa-toast');
  if (!t) return;
  t.textContent = text;
  t.classList.add('is-shown');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('is-shown'), 2600);
}

document.addEventListener('DOMContentLoaded', () => {
  renderLayout();
  fitText();
  initReveal();
  initCounters();
  initCursor();
});

// Если заказы меняются в другой вкладке — обновляем счётчик
addEventListener('storage', e => { if (e.key === ORDERS_KEY) updateOrdersBadge(); });
