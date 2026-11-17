/* Spotter — body weight. Weigh-ins, a trend line that smooths out the day-to-day swings
   (water, salt, a big dinner), the rate you're gaining or losing, and an optional goal
   weight. The chart is drawn for the width it has, folded or unfolded. */
(function () {
  'use strict';
  const App = window.App;
  const { esc, icon, today, addDays, fmtDate, diffDays, MON } = App;
  const S = () => App.S;
  const U = () => App.Views.ui;

  const TAU = 7; // days: how quickly the trend line follows the scale
  const RANGES = [['1m', '1M', 30], ['3m', '3M', 91], ['6m', '6M', 182], ['1y', '1Y', 365], ['all', 'All', 0]];

  // ── Data ──────────────────────────────────────────────────────────────────
  function store() {
    const s = S();
    if (!s.body || typeof s.body !== 'object') s.body = { log: [], goal: null, range: '3m' };
    if (!Array.isArray(s.body.log)) s.body.log = [];
    return s.body;
  }
  const entries = () => store().log;
  const r2 = (n) => Math.round(n * 100) / 100;
  const r1 = (n) => Math.round(n * 10) / 10;
  const fmt = (n) => App.fmtKg(r1(n));
  // "82,4" (a European keyboard), "82.4kg", " 82.4 " all read as 82.4
  function parseKg(v) {
    const t = String(v == null ? '' : v).trim().replace(',', '.').replace(/[^\d.]/g, '');
    const n = Number(t);
    return t && isFinite(n) && n >= 20 && n <= 400 ? r2(n) : null;
  }
  function isDay(d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d)) && App.iso(App.parse(d)) === d; }
  function sortLog() { entries().sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)); }
  function add(d, kg, src) {
    const L = entries(); const i = L.findIndex((e) => e.d === d);
    const e = { d, kg: r2(kg) }; if (src) e.src = src;
    if (i >= 0) L[i] = e; else L.push(e);
    sortLog(); App.save();
    return e;
  }
  function remove(d) { const b = store(); b.log = b.log.filter((e) => e.d !== d); App.save(); }
  const entryOn = (d) => entries().find((e) => e.d === d) || null;
  const latest = () => { const L = entries(); return L.length ? L[L.length - 1] : null; };

  // Every weigh-in with the trend at that point: a moving average that weighs each
  // reading by the days since the last one, so weekly weigh-ins still move it properly.
  function series() {
    let t = null; let prev = null;
    return entries().map((e) => {
      if (t == null) t = e.kg;
      else { const a = 1 - Math.exp(-Math.max(1, diffDays(prev, e.d)) / TAU); t += a * (e.kg - t); }
      prev = e.d;
      return { d: e.d, kg: e.kg, t };
    });
  }
  function trendNow() { const s = series(); return s.length ? s[s.length - 1].t : null; }
  // The trend on a given day, between weigh-ins drawn as a straight line.
  function trendOn(ser, d) {
    if (!ser.length) return null;
    if (d <= ser[0].d) return ser[0].t;
    for (let i = 1; i < ser.length; i++) {
      if (ser[i].d >= d) { const a = ser[i - 1]; const b = ser[i]; const k = diffDays(a.d, d) / Math.max(1, diffDays(a.d, b.d)); return a.t + (b.t - a.t) * k; }
    }
    return ser[ser.length - 1].t;
  }
  // kg a week over the last four weeks of weigh-ins: a straight line through them.
  function rate() {
    const L = entries(); if (L.length < 2) return null;
    const end = L[L.length - 1].d; const pts = L.filter((e) => e.d >= addDays(end, -28));
    const span = diffDays(pts[0].d, end);
    if (pts.length >= 4 && span >= 12) {
      const xs = pts.map((e) => diffDays(pts[0].d, e.d)); const ys = pts.map((e) => e.kg);
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length; const my = ys.reduce((a, b) => a + b, 0) / ys.length;
      let num = 0; let den = 0; xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) * (x - mx); });
      return den ? (num / den) * 7 : null;
    }
    // fewer readings: first to last, if they're at least a week apart
    const first = L.filter((e) => e.d >= addDays(end, -42))[0];
    const days = diffDays(first.d, end);
    return days >= 7 ? ((L[L.length - 1].kg - first.kg) / days) * 7 : null;
  }

  // Which way they want the scale to go: the goal weight if there is one, else their goals.
  function direction() {
    const g = store().goal; const t = trendNow();
    if (g && g.kg && t != null) return g.kg < t - 0.3 ? 'lose' : g.kg > t + 0.3 ? 'gain' : 'keep';
    const goals = (S().profile && S().profile.goals) || [];
    if (goals.includes('fat')) return 'lose';
    if (goals.includes('muscle')) return 'gain';
    return '';
  }
  // One honest line about the pace, for the goal they have.
  function verdict(r, dir) {
    if (r == null) return { tone: '', text: entries().length < 2 ? 'Weigh in again in a day or two and your trend line starts.' : 'Keep weighing in. Your weekly rate shows once there’s a week of readings.' };
    const a = Math.abs(r);
    if (dir === 'lose') {
      if (r <= -1) return { tone: 'warn', text: 'Losing fast. Over 1 kg a week can cost muscle, so keep protein high and don’t cut any harder.' };
      if (r <= -0.2) return { tone: 'good', text: 'Right on pace for losing fat and keeping your muscle.' };
      if (r < 0.1) return { tone: '', text: 'Holding steady. To get it moving, tighten up a couple of food days a week.' };
      return { tone: 'warn', text: 'Creeping up. Start with the off-track food days.' };
    }
    if (dir === 'gain') {
      if (r >= 0.6) return { tone: 'warn', text: 'Gaining fast. Some of that will be fat, so ease off a little.' };
      if (r >= 0.1) return { tone: 'good', text: 'A good pace for building muscle without much fat.' };
      if (r > -0.1) return { tone: '', text: 'Holding steady. To build muscle, eat a little more, mostly protein.' };
      return { tone: 'warn', text: 'Going down. To build muscle you’ll need to eat a bit more.' };
    }
    if (dir === 'keep') return a < 0.25 ? { tone: 'good', text: 'Holding steady, right where you want it.' } : { tone: '', text: (r > 0 ? 'Drifting up' : 'Drifting down') + ' about ' + fmt(a) + ' kg a week.' };
    return { tone: '', text: a < 0.1 ? 'Holding steady.' : (r > 0 ? 'Going up' : 'Going down') + ' about ' + fmt(a) + ' kg a week.' };
  }
  function rateWords(r) {
    if (r == null) return '';
    if (Math.abs(r) < 0.1) return 'Steady';
    return (r > 0 ? 'Up ' : 'Down ') + fmt(Math.abs(r)) + ' kg a week';
  }
  // Goal progress: how far from where they started towards it, and when at this pace.
  function goalInfo() {
    const g = store().goal; const t = trendNow(); if (!g || !g.kg || t == null) return null;
    const left = r1(Math.abs(t - g.kg)); const from = g.from != null ? g.from : t;
    const total = Math.abs(from - g.kg);
    const pct = total < 0.1 ? (left < 0.3 ? 1 : 0) : App.clamp((total - Math.abs(t - g.kg)) / total, 0, 1);
    const r = rate(); const towards = r != null && Math.abs(r) >= 0.05 && Math.sign(g.kg - t) === Math.sign(r);
    const weeks = towards && left >= 0.3 ? Math.ceil(left / Math.abs(r)) : null;
    return { kg: g.kg, left, pct, weeks: weeks && weeks <= 104 ? weeks : null, reached: left < 0.3 };
  }
  function weekAvg(wk) { const L = entries().filter((e) => e.d >= wk && e.d <= addDays(wk, 6)); return L.length ? L.reduce((a, e) => a + e.kg, 0) / L.length : null; }

  // ── The chart ─────────────────────────────────────────────────────────────
  function rangeKey() { const k = store().range; return RANGES.some((r) => r[0] === k) ? k : '3m'; }
  function win(rk) {
    const ser = series(); if (!ser.length) return null;
    const R = RANGES.find((r) => r[0] === rk) || RANGES[1];
    const last = ser[ser.length - 1].d; const end = today() > last ? today() : last;
    let start = R[2] ? addDays(end, -R[2]) : ser[0].d;
    if (ser[0].d > start) start = ser[0].d;
    if (diffDays(start, end) < 6) start = addDays(end, -6);
    return { ser, start, end, pts: ser.filter((p) => p.d >= start && p.d <= end), before: ser.filter((p) => p.d < start).pop() || null };
  }
  function niceStep(span) { const c = [0.2, 0.5, 1, 2, 2.5, 5, 10, 20, 50]; return c.find((s) => span / s <= 4) || 50; }
  function xLabel(d, long) { const x = App.parse(d); return long ? MON[x.getMonth()] + (x.getFullYear() !== App.parse(today()).getFullYear() ? ' ’' + String(x.getFullYear()).slice(2) : '') : fmtDate(d, 'dm'); }

  function chartSvg(w, h, W) {
    const P = { l: 6, r: 38, t: 12, b: 24 };
    const pts = W.pts; const g = store().goal;
    const vals = pts.map((p) => p.kg).concat(pts.map((p) => p.t)); if (W.before) vals.push(trendOn(W.ser, W.start));
    let lo = Math.min.apply(null, vals); let hi = Math.max.apply(null, vals);
    const span0 = Math.max(hi - lo, 1);
    let goalIn = false;
    if (g && g.kg && g.kg >= lo - Math.max(2, span0) && g.kg <= hi + Math.max(2, span0)) { lo = Math.min(lo, g.kg); hi = Math.max(hi, g.kg); goalIn = true; }
    const padV = Math.max(0.4, (hi - lo) * 0.12); lo -= padV; hi += padV;
    const step = niceStep(hi - lo); lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    const days = Math.max(1, diffDays(W.start, W.end));
    const X = (d) => P.l + (diffDays(W.start, d) / days) * (w - P.l - P.r);
    const Y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (h - P.t - P.b);
    const f = (n) => n.toFixed(1);
    let s = '<svg class="wchart__svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + esc(ariaText(W)) + '">';
    // grid and y labels
    for (let v = lo; v <= hi + 1e-9; v += step) {
      const y = Y(v);
      s += '<line class="wchart__grid" x1="' + P.l + '" x2="' + f(w - P.r + 6) + '" y1="' + f(y) + '" y2="' + f(y) + '"/>';
      s += '<text class="wchart__ylab" x="' + (w - 2) + '" y="' + f(y + 4) + '" text-anchor="end">' + App.fmtKg(Math.round(v * 10) / 10) + '</text>';
    }
    // x labels: start, middle, end
    const long = days > 150;
    [[W.start, 'start'], [addDays(W.start, Math.round(days / 2)), 'middle'], [W.end, 'end']].forEach(([d, a]) => {
      s += '<text class="wchart__xlab" x="' + f(a === 'end' ? w - P.r : X(d)) + '" y="' + (h - 6) + '" text-anchor="' + a + '">' + esc(xLabel(d, long)) + '</text>';
    });
    // goal
    if (g && g.kg) {
      if (goalIn) {
        const y = Y(g.kg);
        s += '<line class="wchart__goal" x1="' + P.l + '" x2="' + f(w - P.r) + '" y1="' + f(y) + '" y2="' + f(y) + '"/>';
        s += '<text class="wchart__goallab" x="' + (P.l + 2) + '" y="' + f(y > P.t + 14 ? y - 5 : y + 13) + '">Goal ' + App.fmtKg(g.kg) + '</text>';
      } else {
        const up = g.kg > hi;
        s += '<text class="wchart__goallab" x="' + (P.l + 2) + '" y="' + (up ? P.t + 9 : h - P.b - 5) + '">Goal ' + App.fmtKg(g.kg) + ' kg ' + (up ? '↑' : '↓') + '</text>';
      }
    }
    // the readings: dots while there's room, a faint line when there are lots
    if (pts.length <= 90) pts.forEach((p) => { s += '<circle class="wchart__dot" cx="' + f(X(p.d)) + '" cy="' + f(Y(p.kg)) + '" r="3"/>'; });
    else s += '<polyline class="wchart__raw" points="' + pts.map((p) => f(X(p.d)) + ',' + f(Y(p.kg))).join(' ') + '"/>';
    // the trend, entering from the left edge when it started earlier
    const line = (W.before ? [[X(W.start), Y(trendOn(W.ser, W.start))]] : []).concat(pts.map((p) => [X(p.d), Y(p.t)]));
    if (line.length > 1) s += '<polyline class="wchart__trend" points="' + line.map((q) => f(q[0]) + ',' + f(q[1])).join(' ') + '"/>';
    const last = pts[pts.length - 1];
    if (last) s += '<circle class="wchart__end" cx="' + f(X(last.d)) + '" cy="' + f(Y(last.t)) + '" r="4.5"/>';
    s += '<line class="wchart__cross" x1="0" x2="0" y1="' + P.t + '" y2="' + (h - P.b) + '" visibility="hidden"/><circle class="wchart__focus" r="5" cx="0" cy="0" visibility="hidden"/>';
    s += '</svg>';
    return { svg: s, X, Y, P };
  }
  function ariaText(W) {
    const a = W.pts[0]; const b = W.pts[W.pts.length - 1]; if (!a || !b) return 'Body weight chart';
    return 'Body weight from ' + fmtDate(W.start, 'dm') + ' to ' + fmtDate(W.end, 'dm') + ': trend ' + fmt(a.t) + ' kg to ' + fmt(b.t) + ' kg, ' + W.pts.length + ' weigh-ins.';
  }
  // Draw (or redraw) the chart at the width it has. Called after each render and on a fold.
  function mount() {
    const host = App.$('[data-wchart]'); if (!host) return;
    const W = win(rangeKey());
    if (!W || !W.pts.length) { host.innerHTML = ''; return; }
    const w = Math.max(240, Math.round(host.clientWidth)); const h = w > 520 ? 240 : 196;
    if (host._w === w && host._key === rangeKey() + entries().length + JSON.stringify(store().goal) && host.firstChild) return;
    host._w = w; host._key = rangeKey() + entries().length + JSON.stringify(store().goal);
    const C = chartSvg(w, h, W);
    host.innerHTML = C.svg + '<div class="wchart__tip" hidden></div>';
    host.style.height = h + 'px';
    wire(host, C, W);
  }
  // Touch or hover anywhere on the chart to read a day: a crosshair, the reading and the trend.
  function wire(host, C, W) {
    const svg = host.querySelector('svg'); const tip = host.querySelector('.wchart__tip');
    const cross = svg.querySelector('.wchart__cross'); const dot = svg.querySelector('.wchart__focus');
    let hideT = null;
    const show = (ev) => {
      const r = svg.getBoundingClientRect(); const x = ev.clientX - r.left;
      let best = null; let bd = 1e9;
      W.pts.forEach((p) => { const d = Math.abs(C.X(p.d) - x); if (d < bd) { bd = d; best = p; } });
      if (!best) return;
      clearTimeout(hideT);
      const px = C.X(best.d); const py = C.Y(best.kg);
      cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.setAttribute('visibility', 'visible');
      tip.innerHTML = '<b>' + esc(fmtDate(best.d, 'short')) + '</b><span>' + fmt(best.kg) + ' kg</span><span class="wchart__tipsub">Trend ' + fmt(best.t) + '</span>';
      tip.hidden = false;
      const tw = tip.offsetWidth; const left = App.clamp(px - tw / 2, 0, r.width - tw);
      tip.style.left = left + 'px'; tip.style.top = Math.max(0, Math.min(py, C.Y(best.t)) - 52) + 'px';
    };
    const hide = (later) => { clearTimeout(hideT); hideT = setTimeout(() => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); }, later ? 1600 : 0); };
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointermove', (ev) => { if (ev.pointerType === 'mouse' || ev.buttons || ev.pressure) show(ev); });
    svg.addEventListener('pointerup', (ev) => hide(ev.pointerType !== 'mouse'));
    svg.addEventListener('pointercancel', () => hide(false));
    svg.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') hide(false); });
  }

  // ── Screens ───────────────────────────────────────────────────────────────
  function deltaText(d) { return Math.abs(d) < 0.05 ? '±0' : (d > 0 ? '+' : '−') + fmt(Math.abs(d)); }
  function rangeSeg() {
    const k = rangeKey();
    return '<div class="seg wrange" role="group" aria-label="Chart range">' + RANGES.map(([id, label]) => '<button class="seg__btn' + (id === k ? ' is-on' : '') + '" data-act="bodyRange" data-v="' + id + '"' + (id === k ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + label + '</button>').join('') + '</div>';
  }
  function heroCard() {
    const L = entries(); const last = latest();
    if (!last) {
      return '<div class="card wcard wcard--empty"><div class="wcard__icon">' + icon('scale') + '</div><h2 class="wcard__title">Track your body weight</h2>' +
        '<p class="wcard__text">Weigh in a few mornings a week. I’ll draw a trend line that smooths out the daily ups and downs, and show whether you’re gaining or losing, and how fast.</p>' +
        U().btn(icon('plus', 'ic-sm') + 'Log your weight', 'bodyLog', null, 'btn--accent btn--block') + '</div>';
    }
    const r = rate(); const v = verdict(r, direction()); const t = trendNow();
    const ago = diffDays(last.d, today()); const when = ago === 0 ? 'Today' : ago === 1 ? 'Yesterday' : fmtDate(last.d, 'short');
    const arrow = r == null || Math.abs(r) < 0.1 ? 'minus' : r > 0 ? 'up' : 'down';
    return '<div class="card wcard">' +
      '<div class="wcard__top"><div><div class="wcard__eyebrow">Latest · ' + esc(when) + '</div><div class="wcard__num">' + fmt(last.kg) + '<small>kg</small></div>' +
        (L.length > 1 ? '<div class="wcard__trend">Trend ' + fmt(t) + ' kg' + (r != null ? ' · <span class="wrate">' + icon(arrow === 'down' ? 'downarrow' : arrow, 'ic-sm') + esc(rateWords(r)) + '</span>' : '') + '</div>' : '') + '</div>' +
        '<button class="btn btn--accent btn--icon wcard__add" data-act="bodyLog" aria-label="Log your weight">' + icon('plus') + '</button></div>' +
      (L.length > 1 ? rangeSeg() + '<div class="wchart" data-wchart></div>' : '') +
      '<p class="wcard__verdict' + (v.tone ? ' is-' + v.tone : '') + '">' + (v.tone === 'good' ? icon('check', 'ic-sm') : v.tone === 'warn' ? icon('info', 'ic-sm') : '') + '<span>' + esc(v.text) + '</span></p></div>';
  }
  function goalBlock() {
    const gi = goalInfo();
    if (!gi) return U().group([U().cell({ act: 'bodyGoal', tile: ['target', 'bg-green'], title: 'Set a goal weight', sub: 'See how far you’ve come and when you’ll get there' })], true);
    const sub = gi.reached ? 'You’re there. Now hold it.' : fmt(gi.left) + ' kg to go' + (gi.weeks ? ' · about ' + gi.weeks + ' ' + App.plural(gi.weeks, 'week') + ' at this pace' : '');
    return '<div class="group group--tiles"><button class="cell" data-act="bodyGoal"><span class="cell__tile bg-green">' + icon('target') + '</span><span class="cell__main"><span class="cell__title">Goal ' + App.fmtKg(gi.kg) + ' kg</span><span class="cell__sub">' + esc(sub) + '</span>' +
      '<span class="wmeter" aria-label="' + Math.round(gi.pct * 100) + '% of the way"><i style="width:' + Math.round(gi.pct * 100) + '%"></i></span></span>' + icon('right', 'cell__chev') + '</button></div>';
  }
  function statsBlock() {
    const W = win(rangeKey()); if (!W || W.pts.length < 2) return '';
    const a = W.before ? trendOn(W.ser, W.start) : W.pts[0].t; const b = W.pts[W.pts.length - 1].t;
    const kgs = W.pts.map((p) => p.kg);
    const wk = App.weekStart(today()); const tw = weekAvg(wk); const lw = weekAvg(addDays(wk, -7));
    const label = (RANGES.find((x) => x[0] === rangeKey()) || [])[1];
    return U().group([
      U().cell({ title: 'Change', sub: label === 'All' || (!W.before && W.start === W.ser[0].d) ? 'Trend since your first weigh-in, ' + fmtDate(W.ser[0].d, 'dm') : 'Trend over the last ' + ({ '1M': 'month', '3M': '3 months', '6M': '6 months', '1Y': 'year' }[label] || 'while'), value: deltaText(b - a) + ' kg' }),
      tw != null ? U().cell({ title: 'This week’s average', sub: lw != null ? 'Last week ' + fmt(lw) + ' kg' : '', value: fmt(tw) + ' kg' }) : '',
      U().cell({ title: 'Lowest and highest', sub: W.pts.length + ' weigh-ins in this range', value: fmt(Math.min.apply(null, kgs)) + '–' + fmt(Math.max.apply(null, kgs)) }),
    ]);
  }
  function historyRows(list) {
    return list.map((e, i, arr) => {
      const prev = arr[i + 1]; const d = prev ? e.kg - prev.kg : null;
      return U().cell({ act: 'bodyLog', v: e.d, title: esc(fmtDate(e.d, 'short')) + (e.src === 'ironlog' ? ' <span class="tag" style="margin-left:6px;vertical-align:2px">Iron Log</span>' : ''), sub: d != null ? deltaText(d) + ' kg on ' + esc(fmtDate(prev.d, 'dm')) : '', value: fmt(e.kg) + ' kg' });
    }).join('');
  }
  function historyBlock() {
    const L = entries().slice().reverse(); if (!L.length) return '';
    return U().sec('Weigh-ins', L.length > 7 ? '<button class="sec__link" data-act="bodyAll">See all</button>' : '', '<div class="group">' + historyRows(L.slice(0, 8)) + '</div>');
  }
  function view() {
    const last = latest();
    let h = U().header('Body', last ? fmt(last.kg) + ' kg · ' + fmtDate(last.d, 'dm') : 'Body weight') + '<div class="page">';
    const tip = '<p class="fn">Weigh in first thing in the morning, after the toilet and before you eat or drink. Swings of a kilo or two from day to day are mostly water. The trend line is what counts.</p>';
    h += U().cols('<section class="sec">' + heroCard() + '</section>',
      (last ? U().sec('Goal', '', goalBlock()) + U().sec('Numbers', '', statsBlock()) : '') + historyBlock() + tip);
    return h + '</div>';
  }

  // ── Sheets ────────────────────────────────────────────────────────────────
  let logDate = null;
  function logBody() {
    const ex = entryOn(logDate); const last = latest();
    const val = ex ? ex.kg : last ? last.kg : '';
    const t = today(); const y = addDays(t, -1);
    const chip = (d, label) => '<button class="chip' + (logDate === d ? ' is-on' : '') + '" data-act="bodyDay" data-v="' + d + '">' + label + '</button>';
    return '<div class="wlog">' +
        '<button class="wlog__step" data-act="bodyStep" data-v="-0.1" aria-label="Down 0.1 kg">' + icon('minus') + '</button>' +
        '<div class="wlog__field"><label class="vh" for="wIn">Weight in kilograms</label><input id="wIn" class="wlog__in" inputmode="decimal" enterkeyhint="done" autocomplete="off" value="' + esc(val === '' ? '' : App.fmtKg(val)) + '" placeholder="0.0" data-enter="bodySave"><span class="wlog__unit">kg</span></div>' +
        '<button class="wlog__step" data-act="bodyStep" data-v="0.1" aria-label="Up 0.1 kg">' + icon('plus') + '</button></div>' +
      '<div class="sec"><div class="sec__label">Day</div><div class="chips wlog__days">' + chip(t, 'Today') + chip(y, 'Yesterday') +
        '<label class="chip wlog__pick' + (logDate !== t && logDate !== y ? ' is-on' : '') + '">' + icon('calendar', 'ic-sm') + '<span>' + (logDate !== t && logDate !== y ? esc(fmtDate(logDate, 'short')) : 'Another day') + '</span><input type="date" class="wlog__date" max="' + t + '" value="' + logDate + '" data-change="bodyDate" aria-label="Pick a day"></label></div></div>' +
      (ex ? '<p class="fn">Replaces the ' + fmt(ex.kg) + ' kg you logged for ' + esc(fmtDate(logDate, 'short')) + '.</p>' : '<p class="fn">Same time of day each time keeps the trend honest.</p>');
  }
  function logFoot() {
    const ex = entryOn(logDate);
    return U().btn('Save', 'bodySave', null, 'btn--block btn--accent') + (ex ? U().btn('Delete this weigh-in', 'bodyDelete', logDate, 'btn--block btn--plain t-red') : '');
  }
  function logSheet(d) {
    logDate = d && isDay(d) && d <= today() ? d : today();
    App.sheet(entryOn(logDate) && d ? 'Edit weigh-in' : 'Log your weight', logBody(), { foot: logFoot() });
    const i = App.$('#wIn'); if (i) { i.focus(); try { i.select(); } catch (e) {} }
  }
  function refreshLog() {
    const keep = (App.$('#wIn') || {}).value;
    App.replaceSheet(logBody(), logFoot());
    const i = App.$('#wIn'); if (i && keep != null && !entryOn(logDate)) i.value = keep;
  }
  function goalSheet() {
    const g = store().goal; const t = trendNow();
    const body = '<div class="sheet__lead"><h1 class="sheet__h1">Goal weight</h1><p class="lead">' + (t != null ? 'Your trend is ' + fmt(t) + ' kg. ' : '') + 'A steady pace is a quarter to half a kilo a week, either way.</p></div>' +
      '<div class="wlog"><div class="wlog__field"><label class="vh" for="wGoal">Goal weight in kilograms</label><input id="wGoal" class="wlog__in" inputmode="decimal" enterkeyhint="done" autocomplete="off" value="' + esc(g && g.kg ? App.fmtKg(g.kg) : '') + '" placeholder="' + (t != null ? fmt(t) : '0.0') + '" data-enter="bodyGoalSave"><span class="wlog__unit">kg</span></div></div>';
    App.sheet('Goal', body, { foot: U().btn('Save goal', 'bodyGoalSave', null, 'btn--block btn--accent') + (g ? U().btn('Remove goal', 'bodyGoalClear', null, 'btn--block btn--plain') : '') });
    const i = App.$('#wGoal'); if (i) i.focus();
  }
  function allSheet() { App.sheet('Weigh-ins', '<div class="group">' + historyRows(entries().slice().reverse()) + '</div><p class="fn">Tap a weigh-in to change or delete it.</p>'); }

  function rerender() { App.render(); }
  App.ACT = App.ACT || {};
  Object.assign(App.ACT, {
    // opened straight from the tap when nothing is in the way, so iOS brings up the keyboard
    bodyLog(el) { const d = el && el.dataset && el.dataset.v; const had = !!App.topLayer(); App.closeLayer(true); if (had) setTimeout(() => logSheet(d), 300); else logSheet(d); },
    bodyDay(el) { logDate = el.dataset.v; refreshLog(); },
    bodyDate(el) { const d = el.value; if (isDay(d) && d <= today()) { logDate = d; refreshLog(); } },
    bodyStep(el) {
      const i = App.$('#wIn'); if (!i) return;
      const cur = parseKg(i.value) || (latest() || {}).kg || 70;
      i.value = App.fmtKg(r1(cur + Number(el.dataset.v))); App.haptic();
    },
    bodySave() {
      const i = App.$('#wIn'); const kg = parseKg(i && i.value);
      if (kg == null) { App.toast('Enter your weight in kg, like 82.4', 'alert'); if (i) i.focus(); return; }
      if (i) i.blur();
      const prevT = trendNow();
      add(logDate || today(), kg); App.E && App.E.track && App.E.track('weighin');
      App.closeLayer(true); App.sound('set'); App.haptic('success');
      const t = trendNow();
      App.toast('Logged ' + App.fmtKg(kg) + ' kg' + (prevT != null && entries().length > 1 ? ' · trend ' + fmt(t) : ''), 'check');
      rerender();
    },
    bodyDelete(el) { remove(el.dataset.v); App.closeLayer(true); App.toast('Weigh-in deleted', 'check'); rerender(); },
    bodyRange(el) { store().range = el.dataset.v; App.save(); rerender(); },
    bodyGoal() { goalSheet(); },
    bodyGoalSave() {
      const i = App.$('#wGoal'); const kg = parseKg(i && i.value);
      if (kg == null) { App.toast('Enter a goal in kg, like 78', 'alert'); if (i) i.focus(); return; }
      setGoal(kg); App.closeLayer(true); App.sound('set'); App.haptic('success'); App.toast('Goal set: ' + App.fmtKg(kg) + ' kg', 'target'); rerender();
    },
    bodyGoalClear() { store().goal = null; App.save(); App.closeLayer(true); rerender(); },
    bodyAll() { allSheet(); },
  });
  // Progress counts from the furthest the trend has been from the goal since tracking began,
  // so a goal set months in still shows how far you've come.
  function setGoal(kg) {
    const ser = series(); let from = null;
    ser.forEach((p) => { if (from == null || (kg < p.t ? p.t > from : p.t < from)) from = p.t; });
    if (from != null && (kg < from) !== (kg < trendNow())) from = trendNow();
    store().goal = kg ? { kg: r2(kg), from: from != null ? r2(from) : null, at: today() } : null; App.save();
  }

  // Weigh-ins from an Iron Log backup, wherever it keeps them: a list of {date, weight}
  // under a body-weight-ish key, a date → weight map, or a weight on each session.
  function fromBackup(data) {
    const out = {}; if (!data || typeof data !== 'object') return [];
    const day = (x) => { const s = String(x || ''); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); const n = Number(x); const t = new Date(isFinite(n) && n > 1e9 ? (n < 1e11 ? n * 1000 : n) : s); return isNaN(t) ? '' : App.iso(t); };
    const num = (o) => { for (const k of ['kg', 'w', 'wt', 'weight', 'bw', 'value', 'v', 'val']) if (o[k] != null && parseKg(o[k]) != null) return parseKg(o[k]); return null; };
    const date = (o) => { for (const k of ['d', 'date', 'day', 'dt', 'at', 'ts', 't', 'time']) if (o[k] != null && day(o[k])) return day(o[k]); return ''; };
    const put = (d, kg) => { const v = parseKg(kg); if (d && v != null && d <= today()) out[d] = v; };
    const scan = (v) => {
      if (Array.isArray(v)) v.forEach((o) => { if (Array.isArray(o)) { if (o.length >= 2) put(day(o[0]), o[1]); } else if (o && typeof o === 'object') put(date(o), num(o)); });
      else if (v && typeof v === 'object') Object.keys(v).forEach((k) => { const x = v[k]; if (day(k) && (typeof x === 'number' || typeof x === 'string')) put(day(k), x); else if (x && typeof x === 'object' && !Array.isArray(x)) put(day(k) || date(x), num(x)); });
    };
    const KEYS = /^(bw|bws|bodyweight|bodyweights|body_weight|body|weights|weighins|weigh_ins|weight|weightlog|weight_log|scale)$/i;
    [data, data.settings || {}].forEach((src) => Object.keys(src).forEach((k) => { if (KEYS.test(k)) scan(src[k]); }));
    (Array.isArray(data.sessions) ? data.sessions : []).forEach((s) => { if (s && s.bw != null) put(day(s.d || s.date), s.bw); });
    return Object.keys(out).sort().map((d) => ({ d, kg: out[d] }));
  }
  // Merge imported weigh-ins: anything already logged in Spotter for that day stays.
  function merge(list) {
    if (!Array.isArray(list) || !list.length) return 0;
    let n = 0; const have = new Set(entries().map((e) => e.d));
    list.forEach((e) => { if (!have.has(e.d)) { entries().push({ d: e.d, kg: e.kg, src: 'ironlog' }); n++; } });
    sortLog(); App.save(); return n;
  }

  // For Today, the coach and search.
  function summary() {
    const last = latest(); if (!last) return null;
    const r = rate(); const gi = goalInfo();
    return { last, trend: trendNow(), rate: r, rateText: rateWords(r), goal: gi, dir: direction(), verdict: verdict(r, direction()).text, count: entries().length, ago: diffDays(last.d, today()) };
  }
  // Weekly averages for the coach: the last eight weeks that have weigh-ins.
  function weekly(n) {
    const out = []; const wk = App.weekStart(today());
    for (let i = 0; i < (n || 8); i++) { const w = addDays(wk, -7 * i); const a = weekAvg(w); if (a != null) out.push({ wk: w, avg: r1(a) }); }
    return out.reverse();
  }

  App.Body = { view, mount, add, remove, latest, entries, series, trendNow, rate, rateWords, goalInfo, setGoal, summary, weekly, parseKg, isDay, fromBackup, merge, logSheet, direction };
})();
