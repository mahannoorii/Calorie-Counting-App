/* Spotter — core: state, dates, icons, layers (sheets and dialogs), sound, haptics and effects. */
(function () {
  'use strict';

  // ── Tiny helpers ──────────────────────────────────────────────────────────
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const plural = (n, one, many) => (n === 1 ? one : (many || one + 's'));
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const fmtKg = (n) => (Math.round(n * 100) / 100).toString();
  const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
  // For a name mid-sentence: "Barbell row" → "barbell row", but "EZ-bar curl", "TRX row" and
  // proper names after the first word ("dumbbell Romanian deadlift") keep their capitals.
  const lc = (s) => { s = String(s || ''); return /^[A-Z][a-z]/.test(s) && !/^(Smith|Romanian|Bulgarian|Arnold|Pallof|Turkish|Nordic|Meadows|Russian)\b/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; };
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── State ─────────────────────────────────────────────────────────────────
  const KEY = 'spotter.v2';
  function fresh() {
    return {
      v: 2,
      profile: null, plan: null,
      log: [], active: null,
      food: {},            // date → {s:'on'|'part'|'off', why}
      events: [],          // planned meals out, family events, takeaway nights
      places: [],          // recent restaurants {name, cuisine, at}
      checkins: {},        // week key → {feel, hard, at}
      moves: {}, skips: {}, trims: {}, eases: {},
      exSettings: {}, swaps: {},
      awards: {}, opened: {},
      rewards: null,
      chat: [], chatPosted: {}, chatRead: 0,
      usage: {}, recent: [],
      dinnerSeed: 0,
      settings: { sound: true, theme: 'system' },
      dev: { offset: 0 },
      seen: {},
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const data = JSON.parse(raw);
      return Object.assign(fresh(), data, { settings: Object.assign(fresh().settings, data.settings || {}), dev: Object.assign({ offset: 0 }, data.dev || {}) });
    } catch (e) { return fresh(); }
  }
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(App.S)); } catch (e) { /* storage full or blocked */ } }, 120);
  }
  function saveNow() { clearTimeout(saveTimer); try { localStorage.setItem(KEY, JSON.stringify(App.S)); } catch (e) {} }

  // ── Dates (local, Monday-first weeks) ─────────────────────────────────────
  const DAY = 86400000;
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function nowMs() { return Date.now() + (App.S && App.S.dev ? App.S.dev.offset : 0) * DAY; }
  function now() { return new Date(nowMs()); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function today() { return iso(now()); }
  function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function dow(s) { return (parse(s).getDay() + 6) % 7; }
  function weekStart(s) { return addDays(s, -dow(s)); }
  function diffDays(a, b) { return Math.round((parse(b) - parse(a)) / DAY); }
  function fmtDate(s, f) {
    const d = parse(s);
    if (f === 'short') return DOW[dow(s)] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
    if (f === 'long') return DOW_LONG[dow(s)] + ' ' + d.getDate() + ' ' + MON_LONG[d.getMonth()];
    if (f === 'dm') return d.getDate() + ' ' + MON[d.getMonth()];
    return DOW_LONG[dow(s)] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
  }
  function rel(s) {
    const n = diffDays(today(), s);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    if (n > 1 && n < 7) return DOW_LONG[dow(s)];
    if (n < -1 && n > -7) return 'Last ' + DOW_LONG[dow(s)];
    return fmtDate(s, 'short');
  }
  // "today", "tomorrow", "last Friday", "Friday": for use mid-sentence
  function relLow(s) { const r = rel(s); return /^(Today|Tomorrow|Yesterday)$/.test(r) ? r.toLowerCase() : r.replace(/^Last /, 'last '); }
  function hour() { return now().getHours(); }
  function timeAgo(ms) {
    const d = new Date(ms); const t = today(); const ds = iso(d);
    const hm = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }).replace(' ', ' ');
    if (ds === t) return hm;
    if (ds === addDays(t, -1)) return 'Yesterday';
    return fmtDate(ds, 'dm');
  }

  // ── Icons (SF Symbols-style line icons) ───────────────────────────────────
  const P = {
    today: '<circle cx="12" cy="12" r="8.25"/><path d="M12 7.5V12l3 2"/>',
    train: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
    eat: '<path d="M7 3v8a2.5 2.5 0 0 0 2.5 2.5V21"/><path d="M4.5 3v5.5A2.5 2.5 0 0 0 7 11M9.5 3v5.5A2.5 2.5 0 0 1 7 11"/><path d="M18 21V3.5c-2 1-3.2 3.6-3.2 6.7 0 1.9.9 3 3.2 3"/>',
    coach: '<path d="M20.5 11.5c0 4.1-3.8 7.5-8.5 7.5-1.2 0-2.3-.2-3.3-.6L4 20l1.2-3.7A7 7 0 0 1 3.5 11.5C3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.5z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    plane: '<path d="M2.5 15.5 21 7.5c.8-.4.6-1.6-.3-1.7l-3.3-.3-6.9 3L5.5 5.7 3.6 6.5l3.6 4.3-3.1 1.4-1.8-1-1.4.6z"/><path d="M4 20h16"/>',
    bolt: '<path d="M13 2.5 4.5 14H11l-1 7.5 8.5-11.5H12z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    flame: '<path d="M12 21.5c3.9 0 6.8-2.7 6.8-6.6 0-4.4-3.9-6.8-4.4-10.7-2.4 1.4-3.9 3.9-3.9 6.3C9.2 9 8.2 8 8 6.6 6.3 8.4 5.2 10.6 5.2 14.9c0 3.9 2.9 6.6 6.8 6.6z"/>',
    shield: '<path d="M12 3 4.8 5.8v5.9c0 4.4 3.1 7.8 7.2 8.8 4.1-1 7.2-4.4 7.2-8.8V5.8z"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    right: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
    left: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    down: '<path d="m5.5 9.5 6.5 6.5 6.5-6.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    more: '<circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    trend: '<path d="m4 16 5.5-5.5 4 4L20 8"/><path d="M15 8h5v5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    calendar: '<rect x="3.75" y="5" width="16.5" height="15.25" rx="3"/><path d="M3.75 9.75h16.5M8 3v4M16 3v4"/>',
    dumbbell: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
    leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19 13 11"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3.4 4M16 6h3a3 3 0 0 1-3.4 4"/><path d="M12 13v3.5M9 20.5h6M10 16.5h4v4h-4z"/>',
    gift: '<rect x="3.75" y="8.5" width="16.5" height="4" rx="1"/><path d="M5.25 12.5V20h13.5v-7.5M12 8.5V20"/><path d="M12 8.5C10 8.5 7.5 7.8 7.5 5.8S10 3.5 12 8.5zM12 8.5c2 0 4.5-.7 4.5-2.7S14 3.5 12 8.5z"/>',
    people: '<circle cx="9" cy="8" r="3.25"/><path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.8 14.2c2.5.3 4.4 2.2 4.4 4.9"/>',
    fork: '<path d="M7 3v8a2.5 2.5 0 0 0 2.5 2.5V21"/><path d="M4.5 3v5.5A2.5 2.5 0 0 0 7 11M9.5 3v5.5A2.5 2.5 0 0 1 7 11"/><path d="M18 21V3.5c-2 1-3.2 3.6-3.2 6.7 0 1.9.9 3 3.2 3"/>',
    bag: '<path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.4"/>',
    camera: '<path d="M4 8h3l1.6-2.5h6.8L17 8h3a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.75v.5"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    send: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    flag: '<path d="M5 21V4M5 4c3-1.5 5 1.5 8 0s4-1 6-.5V13c-2-.5-3-1-6 .5s-5-1.5-8 0"/>',
    swap: '<path d="M16 4l4 4-4 4"/><path d="M20 8H6"/><path d="M8 20l-4-4 4-4"/><path d="M4 16h14"/>',
    play: '<path d="M7.5 5v14l11-7z"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
    skip: '<path d="M6 5.5v13l9-6.5z"/><path d="M18.5 5.5v13"/>',
    sparkle: '<path d="M12 3.5c.6 4.2 2.6 6.3 6.8 6.8-4.2.6-6.3 2.6-6.8 6.8-.6-4.2-2.6-6.3-6.8-6.8 4.2-.6 6.3-2.6 6.8-6.8z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.7-4.4L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 14.7 4.4L20 15.5"/><path d="M20 20v-4.5h-4.5"/>',
    shuffle: '<path d="M16 4h4v4M20 4l-6.5 6.5M4 20l6-6M16 20h4v-4M20 20 4 4"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17v.5"/>',
    water: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    puffer: '<rect x="9.5" y="2.5" width="5" height="7" rx="1"/><path d="M8 9.5h8v9.5a2 2 0 0 1-2 2H8z"/><path d="M8 14.5H4.5A1.5 1.5 0 0 0 3 16v3a1.5 1.5 0 0 0 1.5 1.5H8"/>',
    towel: '<path d="M5 4h14v12H5z"/><path d="M5 16v4h9v-4M9 4v12"/>',
    headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3.5" y="14" width="4" height="6.5" rx="1.5"/><rect x="16.5" y="14" width="4" height="6.5" rx="1.5"/>',
    shoe: '<path d="M3 16.5V9.5l4.5 1 2.5-4 3 2.5 1.5 3.5 6 2.5a2 2 0 0 1 1.5 2v1.5z"/><path d="M3 19.5h18.5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    list: '<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12"/><circle cx="4.5" cy="6.5" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="17.5" r="1" fill="currentColor"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/><path d="M12 7.5V12l3 2"/>',
    person: '<circle cx="12" cy="8" r="3.75"/><path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5"/>',
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.info) + '</svg>';
  }

  // ── Machine line drawings (64px) ──────────────────────────────────────────
  const A = {
    legpress: '<path d="M6 56h52"/><path d="M10 56v-8h22"/><path d="M30 48 54 14"/><path d="M14 28l6 19" stroke-width="5"/><path d="M20 47h12" stroke-width="5"/><path d="M38 20l10 10" stroke-width="5"/><circle cx="50" cy="38" r="6"/><path d="M50 44v12"/>',
    chestpress: '<path d="M6 56h52"/><rect x="8" y="8" width="12" height="48" rx="2"/><path d="M11 40h6M11 44h6M11 48h6"/><path d="M30 16v24" stroke-width="5"/><path d="M30 46h14" stroke-width="5"/><path d="M37 46v10"/><path d="M30 25h22"/><path d="M52 20v10" stroke-width="3.5"/>',
    row: '<path d="M6 56h52"/><path d="M8 44h30" stroke-width="5"/><path d="M12 44v12M34 44v12"/><path d="M42 34l4 16" stroke-width="4"/><rect x="50" y="8" width="8" height="48" rx="2"/><path d="M54 40 30 33"/><path d="M28 28v10" stroke-width="3.5"/>',
    legcurl: '<path d="M6 56h52"/><path d="M14 12l2 28" stroke-width="5"/><path d="M16 40h22" stroke-width="5"/><path d="M24 31h16" stroke-width="4"/><path d="M38 40l6 10"/><circle cx="46" cy="52" r="3.5"/><path d="M24 40v16"/><rect x="50" y="8" width="8" height="40" rx="2"/>',
    mat: '<path d="M6 56h52"/><rect x="6" y="42" width="44" height="8" rx="3"/><circle cx="52" cy="44" r="6"/><circle cx="52" cy="44" r="2"/>',
    abduction: '<path d="M6 56h52"/><path d="M32 12v22" stroke-width="5"/><path d="M22 38h20" stroke-width="5"/><path d="M18 24l-4 14" stroke-width="5"/><path d="M46 24l4 14" stroke-width="5"/><path d="M32 38v18"/>',
    hipthrust: '<path d="M6 56h52"/><path d="M8 32h16" stroke-width="5"/><path d="M16 32v24"/><path d="M28 24h18" stroke-width="5"/><path d="M46 24l8-12"/><path d="M54 12v44"/><path d="M28 54h18" stroke-width="3.5"/><path d="M37 24v6"/>',
    pulldown: '<path d="M6 56h52"/><path d="M46 6v50"/><path d="M18 8h30"/><path d="M24 8v12"/><path d="M10 22c4-2 24-2 28 0" stroke-width="3.5"/><path d="M16 48h18" stroke-width="5"/><path d="M25 48v8"/><path d="M16 38h18" stroke-width="4"/><rect x="40" y="30" width="12" height="18" rx="2"/>',
    shoulderpress: '<path d="M6 56h52"/><rect x="8" y="8" width="12" height="48" rx="2"/><path d="M11 40h6M11 44h6M11 48h6"/><path d="M32 16v24" stroke-width="5"/><path d="M32 44h14" stroke-width="5"/><path d="M39 44v12"/><path d="M26 12h26"/><path d="M28 8v8M50 8v8" stroke-width="3.5"/>',
    legext: '<path d="M6 56h52"/><path d="M16 12l2 26" stroke-width="5"/><path d="M18 40h20" stroke-width="5"/><path d="M38 40l6 12"/><circle cx="46" cy="52" r="3.5"/><path d="M26 40v16"/><rect x="50" y="8" width="8" height="40" rx="2"/>',
    pecdeck: '<path d="M6 56h52"/><path d="M32 12v26" stroke-width="5"/><path d="M24 42h16" stroke-width="5"/><path d="M32 42v14"/><path d="M32 16 16 20l-2 8"/><path d="M32 16l16 4 2 8"/><path d="M14 24v12" stroke-width="4"/><path d="M50 24v12" stroke-width="4"/>',
    bike: '<path d="M8 56h48"/><path d="M18 52 26 28h16l4 24"/><path d="M20 24h10" stroke-width="3.5"/><path d="M40 22l8-3"/><circle cx="44" cy="46" r="7"/><circle cx="30" cy="44" r="3.5"/>',
    crosstrainer: '<path d="M6 56h52"/><path d="M14 52h36"/><path d="M22 10l6 34M42 10l-6 34"/><path d="M18 46h10M36 46h10" stroke-width="3.5"/><circle cx="32" cy="30" r="6"/>',
    treadmill: '<path d="M6 56h52"/><path d="M8 50h44" stroke-width="4"/><circle cx="10" cy="50" r="3"/><circle cx="50" cy="50" r="3"/><path d="M48 48 42 14"/><rect x="34" y="8" width="16" height="9" rx="2"/>',
    dumbbell: '<path d="M6 56h52"/><path d="M14 24v18M50 24v18" stroke-width="5"/><path d="M8 28v10M56 28v10" stroke-width="3.5"/><path d="M14 33h36" stroke-width="3.5"/>',
    cable: '<path d="M6 56h52"/><rect x="40" y="6" width="14" height="50" rx="2"/><circle cx="40" cy="48" r="3"/><path d="M40 48 20 44"/><path d="M14 40l6 4-6 5" stroke-width="3.5"/>',
    abcrunch: '<path d="M6 56h52"/><path d="M30 14v26" stroke-width="5"/><path d="M22 44h18" stroke-width="5"/><path d="M31 44v12"/><path d="M30 18c8 0 14 4 16 10"/><path d="M42 24v10" stroke-width="4"/>',
    hack: '<path d="M6 56h52"/><path d="M12 56 30 8M20 56 38 8"/><path d="M22 44l8-22" stroke-width="5"/><path d="M28 18h9" stroke-width="4"/><path d="M34 54l16-6" stroke-width="5"/><path d="M44 51v5"/>',
    rack: '<path d="M6 56h52"/><path d="M14 8v48M50 8v48"/><path d="M10 56h8M46 56h8"/><path d="M6 22h52" stroke-width="3"/><path d="M8 13v18M56 13v18" stroke-width="5"/><path d="M14 38h7M43 38h7" stroke-width="3.5"/>',
    barbell: '<path d="M6 56h52"/><path d="M3 40h58" stroke-width="3"/><rect x="9" y="25" width="6" height="30" rx="2"/><rect x="49" y="25" width="6" height="30" rx="2"/><rect x="16" y="31" width="4" height="18" rx="1.5"/><rect x="44" y="31" width="4" height="18" rx="1.5"/>',
    smith: '<path d="M6 56h52"/><path d="M12 6v50M52 6v50"/><path d="M8 6h48"/><path d="M8 26h48" stroke-width="3.5"/><path d="M18 21v10M46 21v10" stroke-width="4"/><path d="M20 48h24" stroke-width="5"/><path d="M26 48v8M38 48v8"/>',
    bench: '<path d="M6 56h52"/><path d="M10 40h44" stroke-width="5"/><path d="M16 40v16M48 40v16"/><path d="M22 20v12M42 20v12" stroke-width="4.5"/><path d="M22 26h20" stroke-width="2.5"/>',
    kettlebell: '<path d="M6 56h52"/><path d="M24 30c0-10 16-10 16 0" stroke-width="3.5"/><circle cx="32" cy="42" r="12.5"/><path d="M24 54h16" stroke-width="3"/>',
    pullupbar: '<path d="M6 56h52"/><path d="M14 56V12M50 56V12"/><path d="M8 14h48" stroke-width="3.5"/><path d="M22 14v7M42 14v7" stroke-width="4"/><path d="M10 56h8M46 56h8"/>',
    dips: '<path d="M6 56h52"/><path d="M16 56V24M48 56V24"/><path d="M8 24h16M40 24h16" stroke-width="4"/><path d="M32 8v38" stroke-width="5"/><path d="M26 56h12"/><path d="M24 34h16" stroke-width="3"/>',
    backext: '<path d="M6 56h52"/><path d="M10 54 42 22"/><path d="M36 16l12 12" stroke-width="5"/><path d="M12 46l8 8" stroke-width="4"/><path d="M42 22v34"/><path d="M14 56h36"/>',
    calf: '<path d="M6 56h52"/><rect x="44" y="8" width="10" height="48" rx="2"/><path d="M20 18h24" stroke-width="5"/><path d="M28 18v7"/><path d="M16 50h22" stroke-width="5"/><path d="M27 50v6"/>',
    rower: '<path d="M6 56h52"/><path d="M8 50h42" stroke-width="3"/><circle cx="50" cy="40" r="9"/><circle cx="50" cy="40" r="3"/><path d="M18 46h12" stroke-width="5"/><path d="M42 42l-3 8"/><path d="M38 34H30" stroke-width="3.5"/><path d="M10 50v6"/>',
    stairs: '<path d="M6 56h52"/><path d="M10 56v-8h10v-8h10v-8h10v-8h10v32"/><path d="M50 24V8h-12"/><path d="M38 8v8"/>',
    sled: '<path d="M6 56h52"/><path d="M10 54h38c4 0 6-2 8-6"/><path d="M20 54V20M34 54V20" stroke-width="4"/><path d="M14 44h26" stroke-width="5"/><path d="M16 20h8M30 20h8" stroke-width="3"/>',
    ropes: '<path d="M6 56h52"/><circle cx="52" cy="48" r="5"/><path d="M8 28c5-7 9 7 14 0s9 7 14 0 9 9 12 16" stroke-width="3"/><path d="M8 40c5-7 9 7 14 0s9 7 14 0 8 6 12 8" stroke-width="3"/>',
    trx: '<path d="M6 56h52"/><path d="M26 4h12"/><path d="M32 4v6"/><path d="M32 10 22 40M32 10l10 30" stroke-width="2.5"/><path d="M17 41h10M37 41h10" stroke-width="4"/>',
    landmine: '<path d="M6 56h52"/><path d="M10 52 50 24" stroke-width="3"/><path d="M6 50h8v6H6z"/><path d="M44 16l12 16" stroke-width="5"/><path d="M40 20l10 13" stroke-width="3.5"/>',
    trapbar: '<path d="M6 56h52"/><path d="M3 40h12M49 40h12" stroke-width="3"/><path d="M15 40l6-10h22l6 10-6 10H21z"/><path d="M26 35v10M38 35v10" stroke-width="3.5"/><rect x="5" y="30" width="5" height="20" rx="1.5"/><rect x="54" y="30" width="5" height="20" rx="1.5"/>',
  };
  function art(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (A[name] || A.dumbbell) + '</svg>';
  }

  // ── The week as a barbell ────────────────────────────────────────────────
  // Training plates load onto the left sleeve, good food days onto the right. A
  // week where both sides are full locks the collars and the bar lifts.
  // from: {t, e} plates already shown, so only new plates slide on.
  function bar(o) {
    const tMax = Math.max(1, o.trainMax || 2), eMax = o.eatMax || 5;
    const t = Math.min(o.train || 0, tMax), e = Math.min(o.eat || 0, eMax);
    const from = o.from || { t: 0, e: 0 };
    const W = 320, H = 104, cy = 52;
    const perfect = t >= tMax && e >= eMax;
    let s = '<svg class="bar' + (perfect ? ' is-perfect' : '') + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 ' + W + ' ' + H + '"' + (o.label ? ' role="img" aria-label="' + esc(o.label) + '"' : ' aria-hidden="true"') + '><g class="bar__lift">';
    s += '<rect class="bar__sleeve" x="12" y="' + (cy - 5) + '" width="82" height="10" rx="5"/>';
    s += '<rect class="bar__sleeve" x="226" y="' + (cy - 5) + '" width="82" height="10" rx="5"/>';
    s += '<rect class="bar__shaft" x="94" y="' + (cy - 3) + '" width="132" height="6" rx="3"/>';
    for (let x = 124; x <= 198; x += 6) s += '<line class="bar__knurl" x1="' + x + '" y1="' + (cy - 2.5) + '" x2="' + (x - 3) + '" y2="' + (cy + 2.5) + '"/>';
    s += '<rect class="bar__collar" x="87" y="' + (cy - 13) + '" width="8" height="26" rx="2.5"/>';
    s += '<rect class="bar__collar" x="225" y="' + (cy - 13) + '" width="8" height="26" rx="2.5"/>';
    // training plates: tall, fill the left sleeve from the collar out
    const pw = Math.max(7, Math.min(16, Math.floor((66 - (tMax - 1) * 3) / tMax)));
    let lastT = 87;
    for (let i = 0; i < tMax; i++) {
      const x = 84 - (i + 1) * pw - i * 3; const h = 84; const on = i < Math.floor(t);
      if (on) lastT = x;
      s += '<rect class="bar__plate p-train' + (on ? ' is-on' + (i >= Math.floor(from.t) ? ' is-new' : '') : '') + '" style="--i:' + (i - Math.floor(from.t)) + '" x="' + x + '" y="' + (cy - h / 2) + '" width="' + pw + '" height="' + h + '" rx="3"/>';
    }
    // food plates: one per good day, a half-tone plate for "partly"
    const fw = 9; let lastE = 233;
    for (let i = 0; i < eMax; i++) {
      const x = 236 + i * (fw + 3); const h = 68; const full = i < Math.floor(e); const half = !full && i < e;
      if (full || half) lastE = x + fw;
      const fresh = (full && i >= Math.floor(from.e)) || (half && (from.e <= i || from.e % 1 === 0));
      s += '<rect class="bar__plate p-eat' + (full ? ' is-on' : half ? ' is-half' : '') + (fresh ? ' is-new' : '') + '" style="--i:' + (i - Math.floor(from.e)) + '" x="' + x + '" y="' + (cy - h / 2) + '" width="' + fw + '" height="' + h + '" rx="3"/>';
    }
    // outer collars lock a full bar
    if (perfect) {
      s += '<rect class="bar__lock" x="' + (lastT - 9) + '" y="' + (cy - 9) + '" width="7" height="18" rx="2"/>';
      s += '<rect class="bar__lock" x="' + (lastE + 2) + '" y="' + (cy - 9) + '" width="7" height="18" rx="2"/>';
    }
    return s + '</g></svg>';
  }
  // The Spotter mark: a small barbell, training plates orange, food plates green.
  function mark(mono) {
    const a = mono ? 'currentColor' : 'var(--accent)'; const g = mono ? 'currentColor' : 'var(--green)';
    return '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true">' +
      '<rect x="2" y="14.6" width="28" height="2.8" rx="1.4" fill="currentColor"/>' +
      '<rect x="5.5" y="7" width="4.6" height="18" rx="1.6" fill="' + a + '"/><rect x="11" y="9.5" width="3.2" height="13" rx="1.3" fill="' + a + '"/>' +
      '<rect x="21.9" y="7" width="4.6" height="18" rx="1.6" fill="' + g + '"/><rect x="17.8" y="9.5" width="3.2" height="13" rx="1.3" fill="' + g + '"/>' +
      '</svg>';
  }

  // ── Award medals ──────────────────────────────────────────────────────────
  const METALS = {
    gold: ['#fbe7a1', '#e7b84f', '#a8761c', '#5c3d07'],
    silver: ['#f4f6f9', '#c9d0d9', '#8a94a3', '#3d4552'],
    platinum: ['#ffffff', '#d9dfec', '#9aa6be', '#3a4459'],
    locked: ['#e9e9ee', '#d4d4dc', '#b4b4bf', '#8e8e99'],
  };
  let medalN = 0;
  function medal(iconName, metal, size) {
    const m = METALS[metal] || METALS.gold; const id = 'md' + (++medalN);
    size = size || 96;
    const inner = (P[iconName] || P.star);
    return '<svg class="medal-svg" viewBox="0 0 100 100" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      '<defs><radialGradient id="' + id + 'a" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="' + m[0] + '"/><stop offset=".55" stop-color="' + m[1] + '"/><stop offset="1" stop-color="' + m[2] + '"/></radialGradient>' +
      '<linearGradient id="' + id + 'b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + m[2] + '"/><stop offset="1" stop-color="' + m[0] + '"/></linearGradient></defs>' +
      '<circle cx="50" cy="50" r="47" fill="url(#' + id + 'b)"/>' +
      '<circle cx="50" cy="50" r="41" fill="url(#' + id + 'a)"/>' +
      '<circle cx="50" cy="50" r="41" fill="none" stroke="' + m[0] + '" stroke-opacity=".7" stroke-width="1"/>' +
      '<g transform="translate(26 26) scale(2)" fill="none" stroke="' + m[3] + '" stroke-opacity=".85" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + inner + '</g>' +
      '<ellipse cx="38" cy="27" rx="18" ry="8" fill="#fff" opacity=".28" transform="rotate(-25 38 27)"/>' +
      '</svg>';
  }

  // ── Layers: sheets and dialogs ────────────────────────────────────────────
  const layers = [];
  function openLayer(html, opts) {
    opts = opts || {};
    const el = document.createElement('div');
    el.className = 'layer' + (opts.dialog ? ' layer--dialog' : '') + (opts.cls ? ' ' + opts.cls : '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="layer__scrim" data-act="closeLayer"></div>' + html;
    document.body.appendChild(el);
    layers.push({ el, onClose: opts.onClose });
    document.body.classList.add('has-layer');
    return el;
  }
  // iOS-style sheet: centred title, Done on the right.
  function sheet(title, body, opts) {
    opts = opts || {};
    const foot = opts.foot ? '<div class="sheet__foot">' + opts.foot + '</div>' : '';
    return openLayer(
      '<div class="sheet' + (opts.tall ? ' sheet--tall' : '') + '">' +
        '<div class="sheet__grab"></div>' +
        '<header class="sheet__head">' + (opts.left || '<span></span>') + '<h2 class="sheet__title">' + title + '</h2>' +
        '<button class="sheet__done" data-act="closeLayer">' + (opts.doneLabel || 'Done') + '</button></header>' +
        '<div class="sheet__body">' + body + '</div>' + foot +
      '</div>', opts);
  }
  function closeLayer(all) {
    const top = layers.pop();
    if (!top) return;
    top.el.classList.add('is-closing');
    setTimeout(() => top.el.remove(), 280);
    if (top.onClose) try { top.onClose(); } catch (e) {}
    if (all && layers.length) return closeLayer(true);
    if (!layers.length) {
      document.body.classList.remove('has-layer');
      if (App.Q && App.Q.length) setTimeout(() => App.Views && App.Views.celebrate(), 420);
    }
  }
  function topLayer() { return layers.length ? layers[layers.length - 1].el : null; }
  function replaceSheet(body, foot) {
    const t = topLayer(); if (!t) return;
    const b = t.querySelector('.sheet__body'); if (b) b.innerHTML = body;
    const f = t.querySelector('.sheet__foot'); if (f && foot != null) f.innerHTML = foot;
  }

  let toastTimer = null;
  function toast(text, iconName) {
    const old = $('.toast'); if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML = (iconName ? icon(iconName, 'ic-sm') : '') + '<span>' + esc(text) + '</span>';
    document.body.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 320); }, 2200);
  }

  // ── Sound: soft sine tones through a small reverb, kept quiet ─────────────
  let actx = null, master = null, verb = null;
  function audio() {
    if (!App.S.settings.sound) return null;
    try {
      if (!actx) {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        master = actx.createGain(); master.gain.value = 0.55;
        const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
        verb = actx.createConvolver(); verb.buffer = impulse(actx, 1.8);
        const wet = actx.createGain(); wet.gain.value = 0.28;
        master.connect(lp); lp.connect(actx.destination);
        lp.connect(verb); verb.connect(wet); wet.connect(actx.destination);
      }
      if (actx.state === 'suspended') actx.resume();
      return actx;
    } catch (e) { return null; }
  }
  function impulse(ctx, secs) {
    const len = Math.floor(ctx.sampleRate * secs); const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    return buf;
  }
  // A soft bell: fundamental plus a quiet upper partial, fast attack, long smooth tail.
  function bell(f, at, dur, vol) {
    const c = actx; const t0 = c.currentTime + at;
    [[1, 1], [2.01, 0.18], [3.0, 0.05]].forEach(([mult, amp]) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = 'sine'; o.frequency.value = f * mult;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol * amp, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * (mult > 1 ? 0.6 : 1));
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.1);
    });
  }
  function click(at, vol) {
    const c = actx; const t0 = c.currentTime + at;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(1900, t0); o.frequency.exponentialRampToValueAtTime(900, t0 + 0.03);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.06);
  }
  const SOUNDS = {
    tick: () => click(0, 0.05),
    set: () => { bell(1046.5, 0, 0.55, 0.08); bell(1568, 0.07, 0.7, 0.06); },
    done: () => { [523.25, 659.25, 783.99, 987.77, 1174.66].forEach((f, i) => bell(f, i * 0.07, 1.6, 0.055)); },
    award: () => { [1567.98, 2093, 2637, 3135.96].forEach((f, i) => bell(f, i * 0.05, 1.3, 0.04)); bell(523.25, 0, 1.8, 0.05); },
    timer: () => { bell(1318.5, 0, 0.6, 0.07); bell(1318.5, 0.22, 0.8, 0.07); },
    soft: () => bell(659.25, 0, 0.7, 0.06),
    message: () => { bell(1174.66, 0, 0.35, 0.045); bell(1567.98, 0.06, 0.45, 0.04); },
  };
  function sound(name) { const c = audio(); if (c && SOUNDS[name]) try { SOUNDS[name](); } catch (e) {} }

  // ── Haptics: vibrate where supported; iOS 18 Safari ticks on a switch toggle ─
  let hapticEl = null;
  function haptic(kind) {
    try {
      if (navigator.vibrate) { navigator.vibrate(kind === 'success' ? [12, 60, 18] : kind === 'heavy' ? 24 : 10); return; }
      if (!/iP(hone|ad|od)|Macintosh/.test(navigator.userAgent)) return;
      if (!hapticEl) {
        hapticEl = document.createElement('label');
        hapticEl.setAttribute('aria-hidden', 'true');
        hapticEl.className = 'haptic';
        const input = document.createElement('input');
        input.type = 'checkbox'; input.setAttribute('switch', ''); input.tabIndex = -1;
        hapticEl.appendChild(input);
        document.body.appendChild(hapticEl);
      }
      hapticEl.click();
      if (kind === 'success') setTimeout(() => hapticEl && hapticEl.click(), 90);
    } catch (e) {}
  }

  // ── Effects: a calm gold shimmer for awards, a restrained celebration for big moments ─
  let canvas, ctx2, parts = [], raf = null, W = 0, H = 0;
  function fxInit() {
    canvas = document.getElementById('fx'); if (!canvas) return;
    ctx2 = canvas.getContext('2d');
    const size = () => { const dpr = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx2.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); window.addEventListener('resize', size);
  }
  function loop() {
    ctx2.clearRect(0, 0, W, H);
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) {
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= p.decay;
      const a = Math.max(0, Math.min(1, p.life * 1.4));
      ctx2.save(); ctx2.globalAlpha = a; ctx2.translate(p.x, p.y); ctx2.rotate(p.r); ctx2.fillStyle = p.color;
      if (p.shape === 'dot') { ctx2.beginPath(); ctx2.arc(0, 0, p.s, 0, 6.283); ctx2.fill(); }
      else if (p.shape === 'spark') { ctx2.beginPath(); ctx2.moveTo(0, -p.s); ctx2.lineTo(p.s * 0.28, 0); ctx2.lineTo(0, p.s); ctx2.lineTo(-p.s * 0.28, 0); ctx2.closePath(); ctx2.fill(); }
      else { ctx2.fillRect(-p.s / 2, -p.s / 5, p.s, p.s / 2.5); }
      ctx2.restore();
    }
    if (parts.length) raf = requestAnimationFrame(loop); else { raf = null; ctx2.clearRect(0, 0, W, H); }
  }
  function run() { if (!raf && ctx2) raf = requestAnimationFrame(loop); }
  function shimmer(x, y, n) {
    if (reduceMotion() || !ctx2) return;
    x = x == null ? W / 2 : x; y = y == null ? H * 0.38 : y;
    const golds = ['#f7dc8d', '#e7b84f', '#fff4cf', '#ffffff'];
    for (let i = 0; i < (n || 34); i++) {
      const a = Math.random() * 6.283; const sp = 0.6 + Math.random() * 2.6;
      parts.push({ x: x + Math.cos(a) * 30, y: y + Math.sin(a) * 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.8, g: -0.012, drag: 0.985, r: Math.random() * 3, vr: (Math.random() - 0.5) * 0.08, s: 1.5 + Math.random() * 3.5, life: 1, decay: 0.008 + Math.random() * 0.008, shape: Math.random() < 0.5 ? 'spark' : 'dot', color: golds[(Math.random() * golds.length) | 0] });
    }
    run();
  }
  function celebrate() {
    if (reduceMotion() || !ctx2) return;
    const cols = ['#ff5a1f', '#ff8a5c', '#34c759', '#ffd36b', '#ffffff', '#8e8e93'];
    for (let i = 0; i < 70; i++) {
      parts.push({ x: Math.random() * W, y: -10 - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 1.2, vy: 1.4 + Math.random() * 2.2, g: 0.025, drag: 0.995, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.12, s: 5 + Math.random() * 5, life: 1, decay: 0.0045 + Math.random() * 0.003, shape: 'rect', color: cols[(Math.random() * cols.length) | 0] });
    }
    run();
  }
  function countUp(el, to, dur, fmt) {
    if (!el) return;
    const t0 = performance.now(); dur = dur || 1000; fmt = fmt || ((v) => Math.round(v).toLocaleString('en-AU'));
    if (reduceMotion()) { el.textContent = fmt(to); return; }
    const step = (t) => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // ── Theme (leaves a host's own light/dark choice alone) ───────────────────
  let themeSet = false;
  function applyTheme() {
    const t = App.S.settings.theme;
    if (t === 'light' || t === 'dark') { document.documentElement.setAttribute('data-theme', t); themeSet = true; }
    else if (themeSet) { document.documentElement.removeAttribute('data-theme'); themeSet = false; }
  }

  let wake = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
      if (!on && wake) { await wake.release(); wake = null; }
    } catch (e) { wake = null; }
  }

  // Shrink a photo to a small JPEG data URL, so it can be kept on the phone.
  function thumb(file, max, q) {
    return new Promise((resolve, reject) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, (max || 900) / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', q || 0.72));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
      img.src = url;
    });
  }

  const App = (window.App = window.App || {});
  App.ACT = App.ACT || {};
  App.IN = App.IN || {};
  Object.assign(App, {
    $, $$, esc, clamp, uid, plural, sum, fmtKg, cap, lc, reduceMotion, thumb,
    fresh, load, save, saveNow, KEY,
    now, nowMs, iso, parse, today, addDays, dow, weekStart, diffDays, fmtDate, rel, relLow, hour, timeAgo, DOW, DOW_LONG, MON,
    icon, art, bar, mark, medal,
    openLayer, sheet, closeLayer, topLayer, replaceSheet, toast,
    sound, haptic, fxInit, shimmer, celebrateFx: celebrate, countUp, applyTheme, keepAwake,
  });
})();
