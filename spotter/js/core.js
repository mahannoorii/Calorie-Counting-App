/* Spotter — core: state, dates, icons, machine art, layers and reward effects. */
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
  const round = (n, step) => Math.round(n / step) * step;
  const fmtKg = (n) => (Math.round(n * 10) / 10).toString();
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── State ─────────────────────────────────────────────────────────────────
  const KEY = 'spotter.v1';
  function fresh() {
    return {
      v: 1,
      profile: null,          // filled by onboarding
      plan: null,             // generated plan
      log: [],                // finished sessions
      active: null,           // session in progress
      food: {},               // date → {s:'on'|'part'|'off', why:[]}
      events: [],             // gatherings, eating out, takeaway nights
      weekends: {},           // week key → weekend plan
      checkins: {},           // week key → weekly check-in
      moves: {},              // slot id → new date
      skips: {},              // slot id → true
      exSettings: {},         // exercise id → {seat, notes, photo, step}
      swaps: {},              // exercise id → replacement exercise id
      xp: 0, badges: {}, level: 0,
      rewards: null,          // partner rewards by week
      opened: {},             // rewards already opened
      coach: [],              // chat turns
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
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(App.S)); } catch (e) { /* storage full or blocked */ }
    }, 120);
  }
  function saveNow() { clearTimeout(saveTimer); try { localStorage.setItem(KEY, JSON.stringify(App.S)); } catch (e) {} }

  // ── Dates (local, Monday-first weeks) ─────────────────────────────────────
  const DAY = 86400000;
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function now() { return new Date(Date.now() + (App.S && App.S.dev ? App.S.dev.offset : 0) * DAY); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function today() { return iso(now()); }
  function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function dow(s) { return (parse(s).getDay() + 6) % 7; } // 0 = Monday
  function weekStart(s) { return addDays(s, -dow(s)); }
  function diffDays(a, b) { return Math.round((parse(b) - parse(a)) / DAY); }
  function fmtDate(s, opts) {
    const d = parse(s);
    if (opts === 'short') return DOW[dow(s)] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
    if (opts === 'long') return DOW_LONG[dow(s)] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
    if (opts === 'dm') return d.getDate() + ' ' + MON[d.getMonth()];
    return DOW_LONG[dow(s)] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
  }
  function rel(s) {
    const t = today(); const n = diffDays(t, s);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    if (n > 1 && n < 7) return DOW_LONG[dow(s)];
    return fmtDate(s, 'short');
  }
  function hour() { return now().getHours(); }
  function greeting() { const h = hour(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

  // ── Icons (24px line icons) ───────────────────────────────────────────────
  const P = {
    today: '<path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    journey: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    food: '<path d="M7 3v8a3 3 0 0 0 3 3v7"/><path d="M4 3v5a3 3 0 0 0 3 3"/><path d="M10 3v5a3 3 0 0 1-3 3"/><path d="M18 21V3c-2 1-3.5 3.5-3.5 7 0 2 1 3 3.5 3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12z"/>',
    plane: '<path d="M2.5 15.5 21 7.5c.8-.4.6-1.6-.3-1.7l-3.3-.3-6.9 3L5.5 5.7 3.6 6.5l3.6 4.3-3.1 1.4-1.8-1-1.4.6z"/><path d="M4 20h16"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    flame: '<path d="M12 22c4 0 7-2.8 7-7 0-4.5-4-7-4.5-11-2.5 1.5-4 4-4 6.5C9 9 8 8 7.8 6.5 6 8.3 5 10.6 5 15c0 4.2 3 7 7 7z"/>',
    shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 8 7.5 9 4.3-1 7.5-4.5 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    left: '<path d="m15 5-7 7 7 7"/>',
    down: '<path d="m5 9 7 7 7-7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
    leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19 13 11"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4"/><path d="M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z"/>',
    gift: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5V20h14v-7.5M12 8.5V20"/><path d="M12 8.5C10 8.5 7.5 7.8 7.5 5.8S10 3.5 12 8.5zM12 8.5c2 0 4.5-.7 4.5-2.7S14 3.5 12 8.5z"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.8"/><path d="M16.5 14.1c2.8.3 5 2.4 5 5.4"/>',
    fork: '<path d="M7 3v18M4 3v5a3 3 0 0 0 6 0V3"/><path d="M17 21V3c2.5 0 3.5 2.5 3.5 6S19 12 17 12"/>',
    bag: '<path d="M5 8h14l-1 12.5H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.5"/>',
    camera: '<path d="M4 8h3l1.6-2.5h6.8L17 8h3a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.5"/>',
    sliders: '<path d="M5 4v16M12 4v16M19 4v16"/><circle cx="5" cy="14" r="2.2"/><circle cx="12" cy="8" r="2.2"/><circle cx="19" cy="15" r="2.2"/>',
    send: '<path d="M4.5 12 20 4.5 15.5 20l-3-6.5z"/><path d="M12.5 13.5 20 4.5"/>',
    clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 4.5V3h6v1.5M9 11h6M9 15h4"/>',
    flag: '<path d="M5 21V4M5 4c3-1.5 5 1.5 8 0s4-1 6-.5V13c-2-.5-3-1-6 .5s-5-1.5-8 0"/>',
    up: '<path d="m4 16 5.5-5.5 4 4L20 8"/><path d="M15 8h5v5"/>',
    swap: '<path d="M16 4l4 4-4 4"/><path d="M20 8H6"/><path d="M8 20l-4-4 4-4"/><path d="M4 16h14"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5"/>',
    play: '<path d="M7 4.5v15L19.5 12z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    skip: '<path d="M5 5v14l10-7z"/><path d="M19 5v14"/>',
    sparkle: '<path d="M12 3c.6 4.3 2.7 6.4 7 7-4.3.6-6.4 2.7-7 7-.6-4.3-2.7-6.4-7-7 4.3-.6 6.4-2.7 7-7z"/><path d="M19 15c.3 1.7 1 2.4 2.7 2.7-1.7.3-2.4 1-2.7 2.7-.3-1.7-1-2.4-2.7-2.7 1.7-.3 2.4-1 2.7-2.7z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.7-4.4L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 14.7 4.4L20 15.5"/><path d="M20 20v-4.5h-4.5"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17v.5"/>',
    water: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    puffer: '<rect x="9.5" y="2.5" width="5" height="7" rx="1"/><path d="M8 9.5h8v9.5a2 2 0 0 1-2 2H8z"/><path d="M8 14.5H4.5A1.5 1.5 0 0 0 3 16v3a1.5 1.5 0 0 0 1.5 1.5H8"/>',
    towel: '<path d="M5 4h14v12H5z"/><path d="M5 16v4h9v-4M9 4v12"/>',
    headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3.5" y="14" width="4" height="6.5" rx="1.5"/><rect x="16.5" y="14" width="4" height="6.5" rx="1.5"/>',
    shoe: '<path d="M3 16.5V9.5l4.5 1 2.5-4 3 2.5 1.5 3.5 6 2.5a2 2 0 0 1 1.5 2v1.5z"/><path d="M3 19.5h18.5"/>',
    home: '<path d="M4 11.5 12 4l8 7.5V20H4z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14.5c1 1.5 2.4 2.2 4 2.2s3-.7 4-2.2"/><path d="M9 9.5v.5M15 9.5v.5"/>',
    meh: '<circle cx="12" cy="12" r="9"/><path d="M8.5 15.5h7"/><path d="M9 9.5v.5M15 9.5v.5"/>',
    frown: '<circle cx="12" cy="12" r="9"/><path d="M8 16.5c1-1.4 2.4-2 4-2s3 .6 4 2"/><path d="M9 9.5v.5M15 9.5v.5"/>',
    strain: '<circle cx="12" cy="12" r="9"/><path d="M8.5 15.5h7"/><path d="M8 9.5l2 1-2 1M16 9.5l-2 1 2 1"/>',
    feather: '<path d="M20 4c-8 0-14 6-14 14v2"/><path d="M20 4c0 7-4 12-11 12"/><path d="M6 18h7"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.info) + '</svg>';
  }

  // ── Machine art (64px line drawings, stroke = currentColor) ───────────────
  const A = {
    legpress: '<path d="M6 56h52"/><path d="M10 56v-8h22"/><path d="M30 48 54 14"/><path d="M14 28l6 19" stroke-width="6"/><path d="M20 47h12" stroke-width="6"/><path d="M38 20l10 10" stroke-width="6"/><circle cx="50" cy="38" r="6"/><path d="M50 44v12"/>',
    chestpress: '<path d="M6 56h52"/><rect x="8" y="8" width="12" height="48" rx="2"/><path d="M11 40h6M11 44h6M11 48h6"/><path d="M30 16v24" stroke-width="6"/><path d="M30 46h14" stroke-width="6"/><path d="M37 46v10"/><path d="M30 25h22"/><path d="M52 20v10" stroke-width="4"/>',
    row: '<path d="M6 56h52"/><path d="M8 44h30" stroke-width="6"/><path d="M12 44v12M34 44v12"/><path d="M42 34l4 16" stroke-width="5"/><rect x="50" y="8" width="8" height="48" rx="2"/><path d="M54 40 30 33"/><path d="M28 28v10" stroke-width="4"/>',
    legcurl: '<path d="M6 56h52"/><path d="M14 12l2 28" stroke-width="6"/><path d="M16 40h22" stroke-width="6"/><path d="M24 31h16" stroke-width="5"/><path d="M38 40l6 10"/><circle cx="46" cy="52" r="3.5"/><path d="M24 40v16"/><rect x="50" y="8" width="8" height="40" rx="2"/>',
    mat: '<path d="M6 56h52"/><rect x="6" y="42" width="44" height="8" rx="3"/><circle cx="52" cy="44" r="6"/><circle cx="52" cy="44" r="2"/><path d="M12 30c4-6 10-6 14 0s10 6 14 0"/>',
    abduction: '<path d="M6 56h52"/><path d="M32 12v22" stroke-width="6"/><path d="M22 38h20" stroke-width="6"/><path d="M18 24l-4 14" stroke-width="6"/><path d="M46 24l4 14" stroke-width="6"/><path d="M32 38v18"/><path d="M14 38 32 30 50 38"/>',
    hipthrust: '<path d="M6 56h52"/><path d="M8 32h16" stroke-width="6"/><path d="M16 32v24"/><path d="M28 24h18" stroke-width="6"/><path d="M46 24l8-12"/><path d="M54 12v44"/><path d="M28 54h18" stroke-width="4"/><path d="M37 24v6"/>',
    pulldown: '<path d="M6 56h52"/><path d="M46 6v50"/><path d="M18 8h30"/><path d="M24 8v12"/><path d="M10 22c4-2 24-2 28 0" stroke-width="4"/><path d="M16 48h18" stroke-width="6"/><path d="M25 48v8"/><path d="M16 38h18" stroke-width="5"/><rect x="40" y="30" width="12" height="18" rx="2"/>',
    shoulderpress: '<path d="M6 56h52"/><rect x="8" y="8" width="12" height="48" rx="2"/><path d="M11 40h6M11 44h6M11 48h6"/><path d="M32 16v24" stroke-width="6"/><path d="M32 44h14" stroke-width="6"/><path d="M39 44v12"/><path d="M26 12h26"/><path d="M28 8v8M50 8v8" stroke-width="4"/>',
    legext: '<path d="M6 56h52"/><path d="M16 12l2 26" stroke-width="6"/><path d="M18 40h20" stroke-width="6"/><path d="M38 40l6 12"/><circle cx="46" cy="52" r="3.5"/><path d="M26 40v16"/><rect x="50" y="8" width="8" height="40" rx="2"/>',
    pecdeck: '<path d="M6 56h52"/><path d="M32 12v26" stroke-width="6"/><path d="M24 42h16" stroke-width="6"/><path d="M32 42v14"/><path d="M32 16 16 20l-2 8"/><path d="M32 16l16 4 2 8"/><path d="M14 24v12" stroke-width="5"/><path d="M50 24v12" stroke-width="5"/>',
    bike: '<path d="M8 56h48"/><path d="M18 52 26 28h16l4 24"/><path d="M20 24h10" stroke-width="4"/><path d="M40 22l8-3"/><circle cx="44" cy="46" r="7"/><circle cx="30" cy="44" r="3.5"/>',
    crosstrainer: '<path d="M6 56h52"/><path d="M14 52h36"/><path d="M22 10l6 34M42 10l-6 34"/><path d="M18 46h10M36 46h10" stroke-width="4"/><circle cx="32" cy="30" r="6"/>',
    treadmill: '<path d="M6 56h52"/><path d="M8 50h44" stroke-width="5"/><circle cx="10" cy="50" r="3"/><circle cx="50" cy="50" r="3"/><path d="M48 48 42 14"/><rect x="34" y="8" width="16" height="9" rx="2"/>',
    dumbbell: '<path d="M6 56h52"/><path d="M14 24v18M50 24v18" stroke-width="6"/><path d="M8 28v10M56 28v10" stroke-width="4"/><path d="M14 33h36" stroke-width="4"/>',
    cable: '<path d="M6 56h52"/><rect x="40" y="6" width="14" height="50" rx="2"/><circle cx="40" cy="48" r="3"/><path d="M40 48 20 44"/><path d="M14 40l6 4-6 5" stroke-width="4"/><path d="M44 30h6M44 34h6M44 38h6"/>',
    abcrunch: '<path d="M6 56h52"/><path d="M30 14v26" stroke-width="6"/><path d="M22 44h18" stroke-width="6"/><path d="M31 44v12"/><path d="M30 18c8 0 14 4 16 10" /><path d="M42 24v10" stroke-width="5"/>',
  };
  function art(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (A[name] || A.dumbbell) + '</svg>';
  }

  // Bumper plate: the brand mark and the decorative motif.
  function plate(cls, fill, opts) {
    opts = opts || {};
    const f = fill || 'currentColor';
    const label = opts.label ? '<text x="50" y="57" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="900" font-size="22" fill="' + (opts.labelColor || '#fff') + '">' + esc(opts.label) + '</text>' : '';
    return '<svg class="' + (cls || '') + '" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="48" fill="' + f + '"/>' +
      '<circle cx="50" cy="50" r="37" fill="none" stroke="' + (opts.ring || 'rgba(255,255,255,.55)') + '" stroke-width="3"/>' +
      '<circle cx="50" cy="50" r="17" fill="' + (opts.hub || 'rgba(255,255,255,.22)') + '"/>' +
      (opts.label ? label : '<circle cx="50" cy="50" r="7" fill="' + (opts.hole || '#fff') + '"/>') +
      '</svg>';
  }
  function decoPlate(cls) {
    return '<svg class="' + cls + '" viewBox="0 0 100 100" fill="none" stroke="currentColor" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="46" stroke-width="7"/><circle cx="50" cy="50" r="33" stroke-width="2"/><circle cx="50" cy="50" r="15" stroke-width="7"/><circle cx="50" cy="50" r="4" fill="currentColor"/>' +
      '</svg>';
  }
  const PLATE_COLORS = { 'plate-white': '#eef1f8', 'plate-green': '#11a564', 'plate-yellow': '#ffbe1a', 'plate-blue': '#2448f5', 'plate-red': '#e5304a', 'plate-gold': '#e3b03c' };
  function levelPlate(level, cls) {
    const L = window.SpotterData.LEVELS[level];
    const c = PLATE_COLORS[L.color];
    const dark = L.color === 'plate-white' || L.color === 'plate-yellow' || L.color === 'plate-gold';
    return plate(cls, c, {
      label: L.kg ? String(L.kg) : '★',
      labelColor: dark ? '#231800' : '#fff',
      ring: dark ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.55)',
      hub: dark ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.18)',
    });
  }

  // ── Layers: sheets, modals, toasts ────────────────────────────────────────
  const layers = [];
  function openLayer(html, opts) {
    opts = opts || {};
    const el = document.createElement('div');
    el.className = 'layer' + (opts.modal ? ' modal-layer' : '') + (opts.cls ? ' ' + opts.cls : '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="layer__scrim" data-act="closeLayer"></div>' + html;
    document.body.appendChild(el);
    layers.push({ el, onClose: opts.onClose });
    document.body.style.overflow = 'hidden';
    return el;
  }
  function sheet(title, body, opts) {
    opts = opts || {};
    const foot = opts.foot ? '<div class="sheet__foot">' + opts.foot + '</div>' : '';
    return openLayer(
      '<div class="sheet">' +
        '<div class="sheet__grab"></div>' +
        '<div class="sheet__head"><h2 class="sheet__title">' + title + '</h2>' +
        '<button class="icon-btn icon-btn--flat" data-act="closeLayer" aria-label="Close">' + icon('x') + '</button></div>' +
        '<div class="sheet__body">' + body + '</div>' + foot +
      '</div>', opts);
  }
  function closeLayer(all) {
    const top = layers.pop();
    if (!top) return;
    top.el.classList.add('is-closing');
    setTimeout(() => top.el.remove(), 260);
    if (top.onClose) try { top.onClose(); } catch (e) {}
    if (all && layers.length) return closeLayer(true);
    if (!layers.length) {
      document.body.style.overflow = '';
      // queued celebrations wait until nothing else is open
      if (App.Q && App.Q.length) setTimeout(() => App.Views && App.Views.celebrate(), 380);
    }
  }
  function topLayer() { return layers.length ? layers[layers.length - 1].el : null; }
  function replaceSheetBody(html) { const t = topLayer(); const b = t && t.querySelector('.sheet__body'); if (b) b.innerHTML = html; }

  let toastTimer = null;
  function toast(text, iconName) {
    const old = $('.toast'); if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML = (iconName ? icon(iconName, 'ic-sm') : '') + '<span>' + esc(text) + '</span>';
    document.body.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 320); }, 2300);
  }

  // ── Sound (tiny synth, no files) ──────────────────────────────────────────
  let actx = null;
  function audio() {
    if (!App.S.settings.sound) return null;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      return actx;
    } catch (e) { return null; }
  }
  function tone(ctx, freq, start, dur, type, vol) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol || 0.08, ctx.currentTime + start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + start); o.stop(ctx.currentTime + start + dur + 0.05);
  }
  const SOUNDS = {
    tap: (c) => tone(c, 660, 0, 0.06, 'triangle', 0.04),
    set: (c) => { tone(c, 660, 0, 0.12, 'triangle'); tone(c, 990, 0.08, 0.18, 'triangle'); },
    success: (c) => { [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.09, 0.28, 'triangle', 0.07)); },
    level: (c) => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, f, i * 0.08, 0.35, 'square', 0.035)); },
    badge: (c) => { [1047, 1319, 1568, 2093].forEach((f, i) => tone(c, f, i * 0.06, 0.4, 'sine', 0.05)); },
    timer: (c) => { [0, 0.22, 0.44].forEach((t) => tone(c, 880, t, 0.16, 'square', 0.05)); },
    soft: (c) => { tone(c, 440, 0, 0.2, 'sine', 0.05); tone(c, 554, 0.1, 0.3, 'sine', 0.05); },
  };
  function sound(name) { const c = audio(); if (c && SOUNDS[name]) try { SOUNDS[name](c); } catch (e) {} }
  function haptic(p) { try { if (navigator.vibrate) navigator.vibrate(p || 12); } catch (e) {} }

  // ── Confetti engine (five celebration styles that rotate) ─────────────────
  const FX_COLORS = ['#2448f5', '#e5304a', '#ffbe1a', '#11a564', '#ffffff', '#8fa3ff'];
  let canvas, ctx2, parts = [], raf = null, W = 0, H = 0, dpr = 1;
  function fxInit() {
    canvas = document.getElementById('fx');
    if (!canvas) return;
    ctx2 = canvas.getContext('2d');
    const size = () => { dpr = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx2.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); window.addEventListener('resize', size);
  }
  function spawn(p) { parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0.18, drag: 0.992, r: 0, vr: (Math.random() - 0.5) * 0.3, s: 6 + Math.random() * 6, life: 1, decay: 0.006 + Math.random() * 0.006, shape: 'rect', color: FX_COLORS[(Math.random() * FX_COLORS.length) | 0], wob: Math.random() * 6 }, p)); }
  function loop() {
    ctx2.clearRect(0, 0, W, H);
    parts = parts.filter((p) => p.life > 0 && p.y < H + 60);
    for (const p of parts) {
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.x += p.vx + Math.sin((p.wob += 0.1)) * 0.4; p.y += p.vy; p.r += p.vr; p.life -= p.decay;
      ctx2.save(); ctx2.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6)); ctx2.translate(p.x, p.y); ctx2.rotate(p.r);
      ctx2.fillStyle = p.color; ctx2.strokeStyle = p.color;
      if (p.shape === 'rect') { ctx2.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); }
      else if (p.shape === 'circle') { ctx2.beginPath(); ctx2.arc(0, 0, p.s / 2.4, 0, 6.283); ctx2.fill(); }
      else if (p.shape === 'plate') { ctx2.beginPath(); ctx2.arc(0, 0, p.s, 0, 6.283); ctx2.fill(); ctx2.globalCompositeOperation = 'destination-out'; ctx2.beginPath(); ctx2.arc(0, 0, p.s * 0.28, 0, 6.283); ctx2.fill(); ctx2.globalCompositeOperation = 'source-over'; ctx2.lineWidth = 1.2; ctx2.strokeStyle = 'rgba(255,255,255,.6)'; ctx2.beginPath(); ctx2.arc(0, 0, p.s * 0.7, 0, 6.283); ctx2.stroke(); }
      else if (p.shape === 'star') { star(ctx2, p.s * 0.8); }
      else if (p.shape === 'spark') { ctx2.lineWidth = 2.5; ctx2.lineCap = 'round'; ctx2.beginPath(); ctx2.moveTo(0, 0); ctx2.lineTo(-p.vx * 3, -p.vy * 3); ctx2.stroke(); }
      ctx2.restore();
    }
    if (parts.length) raf = requestAnimationFrame(loop); else { raf = null; ctx2.clearRect(0, 0, W, H); }
  }
  function star(c, r) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283 - 1.5708; const rr = i % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); }
  function run() { if (!raf && ctx2) raf = requestAnimationFrame(loop); }
  const STYLES = {
    cannons() {
      for (let side = 0; side < 2; side++) for (let i = 0; i < 70; i++) {
        const left = side === 0; const a = (left ? -1.05 : -2.09) + (Math.random() - 0.5) * 0.5; const sp = 11 + Math.random() * 9;
        spawn({ x: left ? -10 : W + 10, y: H * 0.72, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, shape: Math.random() < 0.2 ? 'circle' : 'rect' });
      }
    },
    rain() { for (let i = 0; i < 150; i++) spawn({ x: Math.random() * W, y: -20 - Math.random() * H * 0.6, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, g: 0.05, decay: 0.004, shape: Math.random() < 0.3 ? 'circle' : 'rect' }); },
    plates() { const cols = ['#2448f5', '#e5304a', '#ffbe1a', '#11a564', '#eef1f8']; for (let i = 0; i < 46; i++) spawn({ x: Math.random() * W, y: -30 - Math.random() * H * 0.7, vx: (Math.random() - 0.5) * 1.5, vy: 2 + Math.random() * 2, g: 0.07, decay: 0.004, s: 9 + Math.random() * 9, shape: 'plate', color: cols[(Math.random() * cols.length) | 0] }); },
    fireworks() {
      const burst = (x, y) => { const col = FX_COLORS[(Math.random() * 4) | 0]; for (let i = 0; i < 46; i++) { const a = (i / 46) * 6.283; const sp = 3 + Math.random() * 4.5; spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.06, drag: 0.97, decay: 0.014, shape: 'spark', color: col }); } };
      [0, 260, 520, 780].forEach((t, i) => setTimeout(() => { burst(W * (0.22 + Math.random() * 0.56), H * (0.18 + Math.random() * 0.25)); run(); }, t + i * 30));
    },
    stars() { for (let i = 0; i < 60; i++) { const a = Math.random() * 6.283; const sp = 4 + Math.random() * 7; spawn({ x: W / 2, y: H * 0.38, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, g: 0.12, shape: 'star', s: 8 + Math.random() * 8, color: Math.random() < 0.6 ? '#ffbe1a' : '#ffffff' }); } },
  };
  const ORDER = ['cannons', 'plates', 'fireworks', 'stars', 'rain'];
  let styleIdx = 0;
  function confetti(style) {
    if (reduceMotion() || !ctx2) return;
    const s = style || ORDER[styleIdx++ % ORDER.length];
    STYLES[s](); run();
  }
  function burstAt(el, opts) {
    if (reduceMotion() || !ctx2 || !el) return;
    opts = opts || {};
    const r = el.getBoundingClientRect(); const x = r.left + r.width / 2; const y = r.top + r.height / 2;
    const cols = opts.colors || ['#11a564', '#ffbe1a', '#2448f5', '#e5304a'];
    for (let i = 0; i < (opts.n || 22); i++) { const a = Math.random() * 6.283; const sp = 2 + Math.random() * 4.5; spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5, g: 0.14, decay: 0.022, s: 4 + Math.random() * 5, shape: Math.random() < 0.5 ? 'circle' : 'star', color: cols[(Math.random() * cols.length) | 0] }); }
    run();
  }
  function floatText(el, text) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'xp-float';
    f.textContent = text;
    f.style.left = r.left + r.width / 2 + 'px';
    f.style.top = r.top - 6 + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1200);
  }
  function countUp(el, to, dur) {
    if (!el) return;
    const from = Number(el.dataset.from || 0); const t0 = performance.now(); dur = dur || 1100;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e).toLocaleString('en-AU'); if (k < 1) requestAnimationFrame(step); };
    if (reduceMotion()) el.textContent = to.toLocaleString('en-AU'); else requestAnimationFrame(step);
  }

  // ── Theme ─────────────────────────────────────────────────────────────────
  // Only clears a theme this app set itself, so a host's own light/dark choice is left alone.
  let themeSet = false;
  function applyTheme() {
    const t = App.S.settings.theme;
    if (t === 'light' || t === 'dark') { document.documentElement.setAttribute('data-theme', t); themeSet = true; }
    else if (themeSet) { document.documentElement.removeAttribute('data-theme'); themeSet = false; }
  }

  // ── Wake lock (keeps the screen on during a session) ──────────────────────
  let wake = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
      if (!on && wake) { await wake.release(); wake = null; }
    } catch (e) { wake = null; }
  }

  const App = (window.App = window.App || {});
  App.ACT = App.ACT || {};
  App.IN = App.IN || {};
  Object.assign(App, {
    $, $$, esc, clamp, uid, plural, sum, round, fmtKg, reduceMotion,
    fresh, load, save, saveNow, KEY,
    now, iso, parse, today, addDays, dow, weekStart, diffDays, fmtDate, rel, hour, greeting, DOW, DOW_LONG, MON,
    icon, art, plate, decoPlate, levelPlate,
    openLayer, sheet, closeLayer, topLayer, replaceSheetBody, toast,
    sound, haptic, fxInit, confetti, burstAt, floatText, countUp, applyTheme, keepAwake,
  });
})();
