/* =========================================================
   Страница «Расписание» (schedule.html) — скрипт ТОЛЬКО этой страницы.
   Использует из js/common.js: ARTISTS, DAYS, NOMINATIONS, getArtist, getDay,
   getActiveOrders, showToast, initReveal, ORDERS_KEY.
   ========================================================= */

/* ---------- 1. Программа вечеров (ID артистов/номинаций — из common.js) ----------
   type: show — выступление, award — вручение, special — шоу/служебное (входы, открытие, Light Sync) */
const SCHEDULE = {
  'day-1': {
    weekday: 'суббота',
    desc: 'Закатный вечер под открытым небом: первые выступления, награды за хореографию и OST.',
    items: [
      { start: '17:00', end: '18:00', type: 'special', title: 'Открытие входов', text: 'Регистрация, выдача браслетов, синхронизация лайтстиков у входа.' },
      { start: '18:00', end: '18:15', type: 'special', title: 'Открытие премии', text: 'Обратный отсчёт и первый Light Sync всего зала.' },
      { start: '18:15', end: '18:45', type: 'show', artist: 'art-aespa' },
      { start: '18:45', end: '19:00', type: 'award', nom: 'nom-dance' },
      { start: '19:00', end: '19:30', type: 'show', artist: 'art-newjeans' },
      { start: '19:30', end: '19:45', type: 'award', nom: 'nom-ost' },
      { start: '19:45', end: '20:00', type: 'special', title: 'Light Sync Show', text: 'Сорок тысяч лайтстиков меняют цвет по сигналу со сцены.' },
      { start: '20:00', end: '20:35', type: 'show', artist: 'art-enhypen' },
      { start: '20:35', end: '20:50', type: 'award', nom: 'nom-stage' },
      { start: '20:50', end: '21:35', type: 'show', artist: 'art-twice', headliner: true },
      { start: '21:35', end: '21:55', type: 'award', nom: 'nom-global' },
      { start: '21:55', end: '22:15', type: 'special', title: 'Финал вечера', text: 'Общий выход артистов и салют над ареной.' }
    ]
  },
  'day-2': {
    weekday: 'воскресенье',
    desc: 'Главная ночь премии: альбом, песня и артист лета, голосование фанатов и большой финал.',
    items: [
      { start: '18:00', end: '19:00', type: 'special', title: 'Открытие входов', text: 'Регистрация, выдача браслетов, синхронизация лайтстиков у входа.' },
      { start: '19:00', end: '19:15', type: 'special', title: 'Открытие Night Stage', text: 'Сцена-шестигранник поднимается из-под пола.' },
      { start: '19:15', end: '19:50', type: 'show', artist: 'art-seventeen' },
      { start: '19:50', end: '20:05', type: 'award', nom: 'nom-album' },
      { start: '20:05', end: '20:40', type: 'show', artist: 'art-skz' },
      { start: '20:40', end: '20:55', type: 'award', nom: 'nom-song' },
      { start: '20:55', end: '21:10', type: 'special', title: 'Light Sync Show', text: 'Зал окрашивается в цвета фэндомов по очереди.' },
      { start: '21:10', end: '21:45', type: 'show', artist: 'art-blackpink' },
      { start: '21:45', end: '22:00', type: 'award', nom: 'nom-fan' },
      { start: '22:00', end: '22:45', type: 'show', artist: 'art-bts', headliner: true },
      { start: '22:45', end: '23:05', type: 'award', nom: 'nom-artist', grand: true },
      { start: '23:05', end: '23:20', type: 'special', title: 'Финал премии', text: 'Общий выход артистов, салют и последний Light Sync.' }
    ]
  }
};

/* ---------- 2. Утилиты ---------- */
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const dur = it => toMin(it.end) - toMin(it.start);
const getNom = id => NOMINATIONS.find(n => n.id === id);
const qs = (s, c = document) => c.querySelector(s);
const qsa = (s, c = document) => [...c.querySelectorAll(s)];
const plural = (n, one, few, many) => {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
};
const eventStart = dayId => `${getDay(dayId).date}T${SCHEDULE[dayId].items[1].start}:00+03:00`;

// какие артисты связаны с событием (выступает или номинирован)
function itemArtists(it) {
  if (it.type === 'show') return [it.artist];
  if (it.type === 'award') return getNom(it.nom).nominees;
  return [];
}
// день, в который выступает артист
const artistDay = id => DAYS.find(d => SCHEDULE[d.id].items.some(i => i.type === 'show' && i.artist === id));

/* ---------- 3. Состояние (синхронизируется с адресной строкой) ---------- */
const params = new URLSearchParams(location.search);
const state = {
  day: DAYS.some(d => d.id === params.get('day')) ? params.get('day') : 'day-1',
  artist: ARTISTS.some(a => a.id === params.get('artist')) ? params.get('artist') : null,
  type: ['show', 'award'].includes(params.get('type')) ? params.get('type') : 'all'
};
// если пришли по ссылке ?artist=… без дня — открываем день выступления
if (state.artist && !params.get('day')) state.day = artistDay(state.artist).id;

function syncUrl() {
  const p = new URLSearchParams();
  p.set('day', state.day);
  if (state.artist) p.set('artist', state.artist);
  if (state.type !== 'all') p.set('type', state.type);
  history.replaceState(null, '', '?' + p.toString());
}

function matches(it) {
  if (state.type !== 'all' && it.type !== state.type) return false;
  if (state.artist) return itemArtists(it).includes(state.artist);
  return true;
}
const countMatches = dayId => SCHEDULE[dayId].items.filter(it => it.type !== 'special' && matches(it)).length;

/* ---------- 4. Вкладки дней ---------- */
function renderTabs() {
  const box = qs('#day-tabs');
  box.innerHTML = DAYS.map((d, i) => {
    const s = SCHEDULE[d.id];
    const shows = s.items.filter(x => x.type === 'show').length;
    const on = d.id === state.day;
    const n = countMatches(d.id);
    const badge = (state.artist || state.type !== 'all')
      ? `<span class="sch-tab__match ${n ? '' : 'is-zero'}">${n ? n + ' ' + plural(n, 'совпадение', 'совпадения', 'совпадений') : 'нет совпадений'}</span>` : '';
    return `
      <button class="sch-tab ${on ? 'is-active' : ''}" role="tab" aria-selected="${on}" data-day="${d.id}" data-cursor="${on ? 'ВЫБРАН' : 'ОТКРЫТЬ'}">
        <span class="sch-tab__num label">День ${i + 1}</span>
        <span class="sch-tab__date led">${d.date.slice(8, 10)}.${d.date.slice(5, 7)}</span>
        <span class="sch-tab__title">${d.title}</span>
        <span class="sch-tab__meta label">${s.weekday} · старт ${s.items[1].start} · ${shows} ${plural(shows, 'группа', 'группы', 'групп')}</span>
        ${badge}
        <span class="sch-tab__bar"></span>
      </button>`;
  }).join('');
  qsa('.sch-tab', box).forEach(b => b.addEventListener('click', () => setDay(b.dataset.day)));
}

function setDay(id, silent) {
  if (id === state.day && !silent) return;
  state.day = id;
  render(true);
}

/* ---------- 5. Фильтры ---------- */
function renderArtistChips() {
  const box = qs('#artist-chips');
  box.innerHTML = `<button class="chip ${state.artist ? '' : 'is-active'}" data-artist="" aria-pressed="${!state.artist}">Все</button>` +
    ARTISTS.map(a => `
      <button class="chip ${state.artist === a.id ? 'is-active' : ''}" data-artist="${a.id}" style="--dot:${a.color}" aria-pressed="${state.artist === a.id}">
        <i class="chip__dot"></i>${a.name}
      </button>`).join('');
  qsa('.chip', box).forEach(c => c.addEventListener('click', () => setArtist(c.dataset.artist || null)));
}

function setArtist(id) {
  state.artist = state.artist === id ? null : id;
  if (state.artist) {
    const d = artistDay(state.artist);
    if (d.id !== state.day) {
      state.day = d.id;
      showToast(`${getArtist(state.artist).name} выступает ${d.label}. Открыт ${d.title}`);
    }
  }
  renderArtistChips();
  render(true);
}

function initTypeChips() {
  qsa('#type-chips .chip').forEach(c => {
    c.classList.toggle('is-active', c.dataset.type === state.type);
    c.setAttribute('aria-pressed', c.dataset.type === state.type);
    c.addEventListener('click', () => {
      state.type = c.dataset.type;
      qsa('#type-chips .chip').forEach(x => {
        x.classList.toggle('is-active', x === c);
        x.setAttribute('aria-pressed', x === c);
      });
      render(true);
    });
  });
  qs('#filter-reset').addEventListener('click', () => {
    state.artist = null; state.type = 'all';
    renderArtistChips();
    qsa('#type-chips .chip').forEach(x => { x.classList.toggle('is-active', x.dataset.type === 'all'); x.setAttribute('aria-pressed', x.dataset.type === 'all'); });
    render(true);
  });
}

/* ---------- 6. Таймлайн ---------- */
function itemHTML(it, idx) {
  const id = `ev-${state.day}-${it.start.replace(':', '')}`;
  const time = `
    <div class="ev__time">
      <b class="led">${it.start}</b>
      <span class="label">— ${it.end}</span>
    </div>
    <span class="ev__dot" aria-hidden="true"></span>`;
  const d = `--d:${Math.min(idx * 0.04, 0.3)}s`;

  if (it.type === 'show') {
    const a = getArtist(it.artist);
    const hl = state.artist === a.id ? ' is-match' : '';
    return `
      <li class="ev ev--show${it.headliner ? ' ev--head' : ''}${hl}" id="${id}" data-idx="${idx}" style="--a:${a.color};${d}" data-reveal>
        ${time}
        <article class="ev__card">
          <div class="ev__media">
            <img src="${a.photo}" alt="${a.name}" loading="lazy" onerror="this.remove()">
            ${it.headliner ? '<span class="ev__badge">Хедлайнер</span>' : ''}
          </div>
          <div class="ev__body">
            <span class="label label--pink">Выступление · ${dur(it)} мин</span>
            <h3 class="ev__name">${a.name}</h3>
            <dl class="ev__meta">
              <div><dt>Фандом</dt><dd>${a.fandom}</dd></div>
              <div><dt>Дебют</dt><dd>${a.debut}</dd></div>
              <div><dt>Лайтстик</dt><dd>${a.stickName}</dd></div>
            </dl>
            <div class="ev__actions">
              <a class="btn btn--sm" href="lightstick.html?artist=${a.id}" data-cursor="ЛАЙТСТИК">Лайтстик <span>↗</span></a>
              <button class="btn btn--sm" data-ics="${idx}" data-cursor="СКАЧАТЬ">В календарь</button>
            </div>
          </div>
        </article>
      </li>`;
  }

  if (it.type === 'award') {
    const n = getNom(it.nom);
    const hl = state.artist && n.nominees.includes(state.artist) ? ' is-match' : '';
    return `
      <li class="ev ev--award${it.grand ? ' ev--grand' : ''}${hl}" id="${id}" data-idx="${idx}" style="${d}" data-reveal>
        ${time}
        <article class="ev__card">
          <div class="ev__body">
            <span class="label label--pink">${it.grand ? 'Гран-при · ' : ''}Вручение · ${dur(it)} мин</span>
            <h3 class="ev__name">${n.title}</h3>
            <ul class="ev__noms">
              ${n.nominees.map(nid => {
                const a = getArtist(nid);
                return `<li class="${state.artist === nid ? 'is-on' : ''}" style="--dot:${a.color}"><i class="chip__dot"></i>${a.name}</li>`;
              }).join('')}
            </ul>
            <p class="ev__note label">Победитель объявляется на сцене</p>
          </div>
          <span class="ev__trophy" aria-hidden="true"></span>
        </article>
      </li>`;
  }

  return `
    <li class="ev ev--special" id="${id}" data-idx="${idx}" style="${d}" data-reveal>
      ${time}
      <article class="ev__card">
        <div class="ev__body">
          <h3 class="ev__name">${it.title}</h3>
          <p>${it.text}</p>
        </div>
      </article>
    </li>`;
}

function renderTimeline() {
  const items = SCHEDULE[state.day].items;
  const list = qs('#sch-list');

  // при фильтре по артисту служебные события показываем приглушёнными для контекста
  const rows = items.map((it, i) => {
    if (it.type === 'special') {
      if (state.type !== 'all') return '';
      const html = itemHTML(it, i);
      return state.artist ? html.replace('class="ev ev--special"', 'class="ev ev--special is-dim"') : html;
    }
    return matches(it) ? itemHTML(it, i) : '';
  }).join('');

  list.innerHTML = rows;
  const empty = qs('#sch-empty');
  const hasReal = items.some(it => it.type !== 'special' && matches(it));
  if (!hasReal) {
    const other = DAYS.find(d => d.id !== state.day);
    const a = state.artist && getArtist(state.artist);
    empty.hidden = false;
    empty.innerHTML = `
      <p class="label label--pink">Пусто</p>
      <p class="h3">${a ? `У ${a.name} в этот день нет событий этого типа` : 'Нет событий этого типа'}</p>
      <button class="btn btn--sm" data-goto="${other.id}">Смотреть ${other.title} <span>→</span></button>`;
    qs('[data-goto]', empty).addEventListener('click', e => setDay(e.currentTarget.dataset.goto));
  } else {
    empty.hidden = true;
  }

  qsa('[data-ics]', list).forEach(b => b.addEventListener('click', () => downloadIcs([items[+b.dataset.ics]])));

  // результат фильтра
  const n = countMatches(state.day);
  const res = qs('#filter-result');
  const filtered = state.artist || state.type !== 'all';
  res.textContent = filtered ? `Найдено: ${n}` : `${items.filter(i => i.type !== 'special').length} событий в программе`;
  qs('#filter-reset').hidden = !filtered;

  if (typeof initReveal === 'function') initReveal();
  observeActive();
  updateRail();
}

/* ---------- 7. Сводка вечера ---------- */
function renderSide() {
  const day = getDay(state.day);
  const s = SCHEDULE[state.day];
  const items = s.items;
  qs('#side-date').textContent = `${day.label} · ${s.weekday}`;
  qs('#side-stage').textContent = day.title;
  qs('#side-desc').textContent = s.desc;

  const shows = items.filter(i => i.type === 'show');
  const awards = items.filter(i => i.type === 'award');
  const total = toMin(items[items.length - 1].end) - toMin(items[1].start);
  qs('#side-stats').innerHTML = `
    <div><dt class="label">Группы</dt><dd class="led">${String(shows.length).padStart(2, '0')}</dd></div>
    <div><dt class="label">Вручения</dt><dd class="led">${String(awards.length).padStart(2, '0')}</dd></div>
    <div><dt class="label">Шоу идёт</dt><dd class="led">${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}</dd></div>`;

  // мини-шкала: блоки пропорциональны длительности
  const from = toMin(items[0].start), to = toMin(items[items.length - 1].end);
  qs('#side-range').textContent = `${items[0].start}—${items[items.length - 1].end}`;
  const bar = qs('#mini-bar');
  bar.innerHTML = items.map((it, i) => {
    const left = (toMin(it.start) - from) / (to - from) * 100;
    const w = dur(it) / (to - from) * 100;
    const a = it.type === 'show' ? getArtist(it.artist) : null;
    const name = a ? a.name : it.type === 'award' ? getNom(it.nom).title : it.title;
    const dim = it.type !== 'special' && !matches(it) ? ' is-dim' : '';
    return `<button class="sch-bar__seg sch-bar__seg--${it.type}${dim}" style="left:${left}%;width:${w}%;${a ? `--a:${a.color}` : ''}" data-idx="${i}" data-cursor="${it.start} ${name.toUpperCase().slice(0, 12)}" aria-label="${it.start} ${name}"></button>`;
  }).join('') + '<span class="sch-bar__now" id="bar-now"></span>';
  bar.setAttribute('aria-hidden', 'false');
  qsa('.sch-bar__seg', bar).forEach(b => b.addEventListener('click', () => {
    const el = qs(`.ev[data-idx="${b.dataset.idx}"]`);
    if (el) el.scrollIntoView({ behavior: REDUCE_MOTION ? 'auto' : 'smooth', block: 'center' });
    else showToast('Это событие скрыто фильтром');
  }));

  qs('#buy-day').href = `tickets.html?day=${state.day}`;
  qs('#buy-day').firstChild.textContent = `Купить билет на ${day.label} `;
  renderMyTickets();
}

function renderMyTickets() {
  const box = qs('#my-tickets');
  const orders = getActiveOrders().filter(o => o.day === state.day);
  const seats = orders.reduce((n, o) => n + o.seats.length, 0);
  box.innerHTML = seats
    ? `<span class="label label--pink">Ваши билеты</span>
       <p class="sch-mine__num"><b class="led">${String(seats).padStart(2, '0')}</b> ${plural(seats, 'место', 'места', 'мест')} на этот вечер</p>
       <a class="label label--white sch-mine__link" href="tickets.html#orders">Мои заказы ↗</a>`
    : `<span class="label">Ваши билеты</span>
       <p class="sch-mine__num">На этот вечер билетов пока нет</p>`;
}

/* ---------- 8. Обратный отсчёт до выбранного дня ---------- */
let cdTimer;
function startCountdown() {
  clearInterval(cdTimer);
  const idx = DAYS.findIndex(d => d.id === state.day);
  qs('#cd-label').textContent = `До начала дня ${idx + 1} · ${SCHEDULE[state.day].items[1].start}`;
  const target = new Date(eventStart(state.day)).getTime();
  const tick = () => {
    let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    qs('#cd-d').textContent = String(d).padStart(3, '0');
    qs('#cd-h').textContent = String(h).padStart(2, '0');
    qs('#cd-m').textContent = String(m).padStart(2, '0');
    qs('#cd-s').textContent = String(s).padStart(2, '0');
  };
  tick();
  cdTimer = setInterval(tick, 1000);
}

/* ---------- 9. Прокрутка: розовая линия и активное событие ---------- */
let activeObs;
function observeActive() {
  if (activeObs) activeObs.disconnect();
  activeObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      qsa('.ev.is-current').forEach(x => x.classList.remove('is-current'));
      e.target.classList.add('is-current');
      const i = e.target.dataset.idx;
      qsa('.sch-bar__seg').forEach(s => s.classList.toggle('is-current', s.dataset.idx === i));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  qsa('#sch-list .ev').forEach(el => activeObs.observe(el));
}

function updateRail() {
  const tl = qs('#timeline');
  const r = tl.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, (innerHeight * 0.5 - r.top) / r.height));
  qs('#rail-fill').style.transform = `scaleY(${p})`;
  const now = qs('#bar-now');
  if (now) now.style.left = (p * 100) + '%';
}
addEventListener('scroll', () => requestAnimationFrame(updateRail), { passive: true });
addEventListener('resize', updateRail);

/* ---------- 10. Календарь (.ics) ---------- */
function icsDate(dayId, hhmm) {
  // время в программе — московское (UTC+3)
  const d = new Date(`${getDay(dayId).date}T${hhmm}:00+03:00`);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
function downloadIcs(items) {
  const day = getDay(state.day);
  const events = items.map((it, i) => {
    const name = it.type === 'show' ? `${getArtist(it.artist).name} — выступление`
      : it.type === 'award' ? `Вручение: ${getNom(it.nom).title}` : it.title;
    return [
      'BEGIN:VEVENT',
      `UID:${state.day}-${it.start.replace(':', '')}-${i}@summerawards`,
      `DTSTAMP:${icsDate(state.day, '00:00')}`,
      `DTSTART:${icsDate(state.day, it.start)}`,
      `DTEND:${icsDate(state.day, it.end)}`,
      `SUMMARY:SUMMERAWARDS · ${name}`,
      `LOCATION:Solar Arena · ${day.title}`,
      'END:VEVENT'
    ].join('\r\n');
  });
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SUMMERAWARDS 2027//RU', ...events, 'END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `summerawards-${state.day}.ics` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(items.length > 1 ? 'Программа дня добавлена в календарь' : 'Событие добавлено в календарь');
}


/* ---------- 11. Погода у Solar Arena (внешний API Open-Meteo, без ключа) ----------
   Премия под открытым небом: показываем погоду сейчас и как было в эти же даты
   в прошлом году — по ней понятно, брать ли дождевик и тёплую кофту. */
const ARENA = { lat: 55.7558, lon: 37.6173 };
const WMO = {
  0: 'Ясно', 1: 'Почти ясно', 2: 'Переменная облачность', 3: 'Пасмурно', 45: 'Туман', 48: 'Туман',
  51: 'Морось', 53: 'Морось', 55: 'Сильная морось', 61: 'Небольшой дождь', 63: 'Дождь', 65: 'Ливень',
  71: 'Снег', 73: 'Снег', 75: 'Сильный снег', 80: 'Ливни', 81: 'Ливни', 82: 'Сильные ливни',
  95: 'Гроза', 96: 'Гроза с градом', 99: 'Гроза с градом'
};
const weatherCache = {};

async function fetchJson(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

async function loadWeather() {
  const box = qs('#weather-body');
  const dayId = state.day;
  const date = getDay(dayId).date;                       // 2027-08-14
  const lastYear = (+date.slice(0, 4) - 1) + date.slice(4); // 2026-08-14
  box.innerHTML = `<div class="sch-weather__load"><i></i><i></i><i></i><span class="label">Загружаем погоду…</span></div>`;
  try {
    const base = `latitude=${ARENA.lat}&longitude=${ARENA.lon}&timezone=Europe%2FMoscow`;
    const [now, past] = weatherCache[dayId] || await Promise.all([
      fetchJson(`https://api.open-meteo.com/v1/forecast?${base}&current=temperature_2m,weather_code,wind_speed_10m`),
      fetchJson(`https://archive-api.open-meteo.com/v1/archive?${base}&start_date=${lastYear}&end_date=${lastYear}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code`)
    ]);
    weatherCache[dayId] = [now, past];
    if (state.day !== dayId) return;                     // пока грузили, переключили день
    const c = now.current, d = past.daily;
    if (!c || !d || !d.time || !d.time.length) throw new Error('Пустой ответ');
    const tMax = Math.round(d.temperature_2m_max[0]), tMin = Math.round(d.temperature_2m_min[0]);
    const rain = d.precipitation_sum[0] || 0;
    const tips = [];
    if (rain >= 1) tips.push('возьмите дождевик');
    if (tMin < 17) tips.push('к ночи прохладно — нужна кофта');
    if (tMax >= 26) tips.push('днём жарко — вода и кепка');
    box.innerHTML = `
      <div class="sch-weather__now">
        <b class="led">${c.temperature_2m > 0 ? '+' : ''}${Math.round(c.temperature_2m)}°</b>
        <span><span class="label label--white">Сейчас в Москве</span><small>${WMO[c.weather_code] || 'Погода'} · ветер ${Math.round(c.wind_speed_10m)} км/ч</small></span>
      </div>
      <div class="sch-weather__past">
        <span class="label label--pink">${getDay(dayId).label} прошлого года</span>
        <p><b class="led">${tMin}…${tMax}°</b> ${WMO[d.weather_code[0]] || ''}, осадки ${rain.toFixed(1)} мм</p>
        <p class="sch-weather__tip">${tips.length ? 'Совет: ' + tips.join(', ') + '.' : 'Совет: лёгкая одежда подойдёт.'}</p>
      </div>`;
  } catch (e) {
    if (state.day !== dayId) return;
    box.innerHTML = `
      <div class="sch-weather__err">
        <p>Не удалось загрузить погоду${e.name === 'AbortError' ? ': сервис долго не отвечает' : ''}.</p>
        <button class="btn btn--sm" id="weather-retry" data-cursor="ПОВТОРИТЬ">Повторить <span>↻</span></button>
      </div>`;
    qs('#weather-retry').addEventListener('click', loadWeather);
  }
}

/* ---------- 12. Сборка ---------- */
function render(animate) {
  syncUrl();
  renderTabs();
  renderSide();
  const tl = qs('#timeline');
  if (animate && !REDUCE_MOTION) {
    tl.classList.add('is-switching');
    setTimeout(() => { renderTimeline(); tl.classList.remove('is-switching'); }, 220);
  } else {
    renderTimeline();
  }
  startCountdown();
  loadWeather();
}

document.addEventListener('DOMContentLoaded', () => {
  renderArtistChips();
  initTypeChips();
  render(false);
  qs('#ics-day').addEventListener('click', () => {
    const items = SCHEDULE[state.day].items.filter(it => it.type === 'special' || matches(it));
    downloadIcs(items);
  });
  // заказы могли измениться в другой вкладке
  addEventListener('storage', e => { if (e.key === ORDERS_KEY) renderMyTickets(); });
});
