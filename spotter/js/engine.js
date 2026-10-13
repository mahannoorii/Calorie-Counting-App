/* Spotter — engine: your gym and its equipment, plan generation, scheduling, weight
   suggestions and personal records, weekly goals, search, restaurant matching and when the
   coach checks in. No rendering here. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const DB = D.GYMDB;
  const { today, addDays, dow, weekStart, diffDays, rel, fmtDate, hour, DOW_LONG } = App;
  const S = () => App.S;
  const uniq = (a) => Array.from(new Set(a));
  const norm = (s) => String(s || '').toLowerCase().replace(/[’'+&]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  function listWords(a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }

  // ── Your gym and what's in it ─────────────────────────────────────────────
  // The profile keeps its own copy of the gym (name, chain, equipment), so edits stick and a
  // gym added by hand works the same as one from the directory.
  function chainOf(g) { return (g && DB.CHAINS[g.chain]) || null; }
  // Equipment in layers: listed on the club's own page, typical for the chain and standard on
  // any gym floor are ticked; common at the chain, or mentioned in reviews, is offered.
  function kitLayers(g) {
    const ch = chainOf(g); const home = g && g.chain === 'home';
    const listed = (g && g.listed) || [];
    const typical = ch ? ch.typical : [];
    const standard = home ? DB.HOME : ch && ch.classOnly ? [] : DB.STANDARD;
    const mentioned = uniq(((g && g.extra) || []).reduce((a, x) => a.concat(x[2] || []), []));
    const on = uniq(listed.concat(typical, standard));
    const maybe = uniq((ch ? ch.common : []).concat(mentioned)).filter((t) => !on.includes(t));
    return { on, maybe, listed, typical, standard, mentioned };
  }
  function gymFromDirectory(e) {
    return { id: e.id, chain: e.chain, name: e.name, short: e.short, suburb: e.suburb, address: e.address || '', lat: e.lat, lng: e.lng, url: e.url || '', classOnly: !!e.classOnly, kit: kitLayers(e).on, checked: DB.checked };
  }
  function customGym(name, chain, suburb) {
    const g = { id: 'my-' + norm(name).replace(/ /g, '-').slice(0, 40), chain: chain || 'independent', name, short: name, suburb: suburb || '', custom: true };
    if (DB.CHAINS[g.chain] && name.toLowerCase().indexOf(DB.CHAINS[g.chain].name.toLowerCase()) === 0) g.short = name.slice(DB.CHAINS[g.chain].name.length).trim() || name;
    g.kit = kitLayers(g).on;
    return g;
  }
  function legacyGym(id) {
    const e = DB.GYMS.find((g) => g.legacy === id);
    return e ? gymFromDirectory(e) : customGym('My gym', 'independent');
  }
  function gym() { const p = S().profile; if (!p) return null; if (!p.gym) p.gym = legacyGym(p.gymId); return p.gym; }
  // Some kit stands in for other kit: an adjustable bench lies flat, a crossover is a cable station.
  const COVERS = { adjustable_bench: ['flat_bench'], cable_crossover: ['cable_station'] };
  function kitSet(list) { const k = new Set(list); list.forEach((t) => (COVERS[t] || []).forEach((x) => k.add(x))); return k; }
  function kit() { const g = gym(); return kitSet(g ? g.kit : DB.STANDARD); }
  function canDo(id, k) { const ex = D.EX[id]; if (!ex) return false; k = k || kit(); return ex.eq.every((t) => k.has(t)); }
  function missing(id, k) { const ex = D.EX[id]; k = k || kit(); return ex ? ex.eq.filter((t) => !k.has(t)) : []; }
  function gymName() { const g = gym(); return g ? g.name : 'your gym'; }
  function gymShort() { const g = gym(); return g ? g.short || g.name : 'Your gym'; }

  // Finding a gym: by name or suburb, or nearest to a point.
  function km(a, b) {
    const r = Math.PI / 180; const dLat = (b[0] - a[0]) * r; const dLng = (b[1] - a[1]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }
  function gymsNear(pt, n) { return DB.GYMS.map((g) => Object.assign({ km: km(pt, [g.lat, g.lng]) }, g)).sort((a, b) => a.km - b.km).slice(0, n || 12); }
  function suburbPoint(q) {
    q = norm(q); if (q.length < 3) return null;
    const names = Object.keys(DB.SUBURBS);
    const k = names.find((s) => norm(s) === q) || names.find((s) => norm(s).indexOf(q) === 0);
    return k ? { name: k, pt: DB.SUBURBS[k] } : null;
  }
  function findGyms(q) {
    const words = norm(q).split(' ').filter(Boolean); if (!words.length) return [];
    return DB.GYMS.filter((g) => { const hay = norm(g.name + ' ' + g.suburb + ' ' + ((DB.CHAINS[g.chain] || {}).name || '') + ' ' + (g.address || '')); return words.every((w) => hay.indexOf(w) >= 0); });
  }

  // ── Plan generation ───────────────────────────────────────────────────────
  const LEVEL = { never: 1, little: 1, regular: 2, lifter: 3 };
  function levelOf(p) { return LEVEL[p && p.experience] || 1; }
  function styleOf(p) { return p && p.equipment === 'free' ? 'f' : p && p.equipment === 'mixed' ? 'x' : 'm'; }
  // What each level can choose, so a beginner isn't offered six days and a lifter isn't capped at three.
  const DAY_OPTIONS = { never: [2, 3], little: [2, 3, 4], regular: [2, 3, 4, 5], lifter: [2, 3, 4, 5, 6] };
  const MIN_OPTIONS = { never: [30, 45, 60], little: [30, 45, 60], regular: [30, 45, 60, 75], lifter: [30, 45, 60, 75, 90] };
  function dayOptions(p) { return DAY_OPTIONS[p && p.experience] || DAY_OPTIONS.never; }
  function minOptions(p) { return MIN_OPTIONS[p && p.experience] || MIN_OPTIONS.never; }

  // Session templates: [pattern, role, prefer]. Main lifts come first, then accessories and
  // core. "prefer" favours a variation (incline, Romanian); the builder spreads exercises
  // across sessions so the same move rarely repeats.
  const TPL = {
    fbA: { name: 'Session A', tag: 'A', area: 'full', slots: [['squat', 'main'], ['h_push', 'main'], ['h_pull', 'main'], ['knee_flex', 'acc'], ['core', 'core'], ['glute', 'acc'], ['lateral', 'acc'], ['triceps', 'acc']] },
    fbB: { name: 'Session B', tag: 'B', area: 'full', slots: [['hinge', 'main'], ['v_pull', 'main'], ['v_push', 'main'], ['knee_ext', 'acc'], ['core', 'core'], ['fly', 'acc'], ['biceps', 'acc'], ['calf', 'acc']] },
    fbC: { name: 'Session C', tag: 'C', area: 'full', slots: [['lunge', 'main'], ['h_push', 'main', 'incline'], ['h_pull', 'main'], ['glute', 'acc'], ['rear', 'acc'], ['core', 'core'], ['biceps', 'acc'], ['triceps', 'acc']] },
    up1: { name: 'Upper', tag: 'U', area: 'upper', title: 'Chest, back and shoulders', slots: [['h_push', 'main'], ['h_pull', 'main'], ['v_push', 'acc'], ['v_pull', 'acc'], ['lateral', 'acc'], ['triceps', 'acc'], ['biceps', 'acc'], ['rear', 'acc']] },
    lo1: { name: 'Lower', tag: 'L', area: 'lower', title: 'Legs and glutes', slots: [['squat', 'main'], ['hinge', 'main', 'romanian'], ['lunge', 'acc'], ['knee_flex', 'acc'], ['calf', 'acc'], ['core', 'core'], ['glute', 'acc']] },
    up2: { name: 'Upper', tag: 'U', area: 'upper', title: 'Back, chest and arms', slots: [['v_pull', 'main'], ['h_push', 'main', 'incline'], ['h_pull', 'acc'], ['v_push', 'acc'], ['fly', 'acc'], ['biceps', 'acc'], ['triceps', 'acc'], ['lateral', 'acc']] },
    lo2: { name: 'Lower', tag: 'L', area: 'lower', title: 'Glutes and hamstrings', slots: [['hinge', 'main', 'thrust|^deadlift|trap_bar|sumo'], ['squat', 'main'], ['knee_ext', 'acc'], ['glute', 'acc'], ['knee_flex', 'acc'], ['adduct', 'acc'], ['core', 'core']] },
    push: { name: 'Push', tag: 'Pu', area: 'push', title: 'Chest, shoulders and triceps', slots: [['h_push', 'main'], ['v_push', 'main'], ['h_push', 'acc', 'incline'], ['lateral', 'acc'], ['triceps', 'acc'], ['fly', 'acc'], ['triceps', 'acc']] },
    pull: { name: 'Pull', tag: 'Pl', area: 'pull', title: 'Back and biceps', slots: [['v_pull', 'main'], ['h_pull', 'main'], ['v_pull', 'acc'], ['rear', 'acc'], ['biceps', 'acc'], ['h_pull', 'acc'], ['biceps', 'acc'], ['traps', 'acc']] },
    legs: { name: 'Legs', tag: 'Lg', area: 'lower', title: 'Legs and glutes', slots: [['squat', 'main'], ['hinge', 'main'], ['lunge', 'acc'], ['knee_ext', 'acc'], ['knee_flex', 'acc'], ['calf', 'acc'], ['core', 'core']] },
  };
  const SPLITS = {
    fb2: { name: 'Full body', sessions: ['fbA', 'fbB'] },
    fb3: { name: 'Full body A, B and C', sessions: ['fbA', 'fbB', 'fbC'] },
    ul: { name: 'Upper and lower', sessions: ['up1', 'lo1', 'up2', 'lo2'] },
    ulppl: { name: 'Upper, lower, push, pull, legs', sessions: ['up1', 'lo1', 'push', 'pull', 'legs'] },
    ppl: { name: 'Push, pull, legs', sessions: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] },
  };
  function splitFor(n, lvl) { return n <= 2 ? 'fb2' : n === 3 ? (lvl >= 2 ? 'fb3' : 'fb2') : n === 4 ? 'ul' : n === 5 ? 'ulppl' : 'ppl'; }
  // When a pattern isn't possible at your gym, the closest thing that is.
  const FALLBACK = { knee_ext: ['lunge', 'squat'], knee_flex: ['hinge'], glute: ['hinge'], adduct: ['lunge'], fly: ['h_push'], lateral: ['v_push'], rear: ['h_pull'], v_pull: ['h_pull'], h_pull: ['v_pull'], v_push: ['h_push'], triceps: ['h_push'], squat: ['lunge'], lunge: ['squat'], hinge: ['glute'] };
  // Focus areas an experienced lifter picks: their moves are the last cut when time is short and
  // get an extra set, and a session that trains the area without a move for it gets one.
  const FOCUS_PATS = { glutes: ['hinge', 'glute'], legs: ['squat', 'lunge', 'knee_ext', 'knee_flex'], chest: ['h_push', 'fly'], back: ['h_pull', 'v_pull'], shoulders: ['v_push', 'lateral', 'rear'], arms: ['biceps', 'triceps'], core: ['core'] };
  const FOCUS_ADD = { glutes: ['glute', 'hinge'], legs: ['knee_ext', 'lunge'], chest: ['fly', 'h_push'], back: ['h_pull', 'v_pull'], shoulders: ['lateral', 'rear'], arms: ['biceps', 'triceps'], core: ['core'] };
  const AREA_HAS = { full: ['glutes', 'legs', 'chest', 'back', 'shoulders', 'arms', 'core'], upper: ['chest', 'back', 'shoulders', 'arms'], lower: ['glutes', 'legs', 'core'], push: ['chest', 'shoulders', 'arms'], pull: ['back', 'arms'] };
  const AREA_PATS = { full: Object.keys(D.PATTERNS), upper: ['h_push', 'v_push', 'fly', 'lateral', 'rear', 'traps', 'h_pull', 'v_pull', 'biceps', 'triceps', 'core'], lower: ['squat', 'hinge', 'lunge', 'knee_ext', 'knee_flex', 'glute', 'adduct', 'calf', 'core'], push: ['h_push', 'v_push', 'fly', 'lateral', 'triceps', 'core'], pull: ['h_pull', 'v_pull', 'rear', 'traps', 'biceps', 'core'] };
  const PER_SESSION = { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 };
  const REGION = { quads: 'Legs', hams: 'Legs', calves: 'Legs', adductors: 'Legs', glutes: 'Glutes', hips: 'Glutes', chest: 'Chest', back: 'Back', lats: 'Back', lower_back: 'Back', traps: 'Back', shoulders: 'Shoulders', rear: 'Shoulders', biceps: 'Arms', triceps: 'Arms', forearms: 'Arms', core: 'Core', obliques: 'Core' };
  function regionOf(id) { const m = (D.EX[id] && D.EX[id].muscles) || []; return REGION[m[0]] || 'Core'; }

  // Slots in priority order (time cuts from the end): main lifts, then focus areas, then the rest.
  function slotsFor(tpl, focus) {
    const areas = (focus || []).filter((f) => AREA_HAS[tpl.area].includes(f));
    const isFocus = (s) => areas.some((f) => FOCUS_PATS[f].includes(s[0]));
    const mains = tpl.slots.filter((s) => s[1] === 'main');
    const rest = tpl.slots.filter((s) => s[1] !== 'main');
    const extra = [];
    areas.forEach((f) => {
      const pat = FOCUS_ADD[f].find((x) => AREA_PATS[tpl.area].includes(x) && !tpl.slots.some((s) => s[0] === x));
      if (pat) extra.push([pat, f === 'core' ? 'core' : 'acc', null]);
    });
    return mains.concat(extra, rest.filter(isFocus), rest.filter((s) => !isFocus(s)));
  }
  // The order you do them in: main lifts, other big moves, smaller moves, core last.
  const COMPOUND = ['squat', 'hinge', 'lunge', 'h_push', 'v_push', 'h_pull', 'v_pull'];
  function flowOrder(items) {
    const big = (it) => COMPOUND.includes(it.pat);
    return items.filter((it) => it.role === 'main').concat(items.filter((it) => it.role === 'acc' && big(it)), items.filter((it) => it.role === 'acc' && !big(it)), items.filter((it) => it.role === 'core'));
  }
  function candidates(pat, ctx) {
    const key = pat === 'core' ? ['m', 'x', 'f'][ctx.lvl - 1] : ctx.style;
    const pref = (D.PREF[pat] && D.PREF[pat][key]) || [];
    const rank = (id) => { const r = D.KIND_RANK[ctx.style][D.EX[id].kind]; return r == null ? 5 : r; };
    return pref.concat(Object.keys(D.EX).filter((id) => D.EX[id].pat === pat && !pref.includes(id)).sort((a, b) => rank(a) - rank(b)));
  }
  function choose(pat, role, like, ctx, used) {
    let best = null; let bestScore = Infinity;
    candidates(pat, ctx).forEach((id, i) => {
      const ex = D.EX[id];
      if (!ex || used.has(id) || ex.unit === 'min' || ex.lvl > ctx.lvl || !canDo(id, ctx.kit)) return;
      let score = i + 2.5 * (ctx.count[id] || 0);
      if (like && new RegExp(like).test(id)) score -= 4;
      if (ctx.prev.has(id)) score -= 1.5;
      if (score < bestScore) { best = id; bestScore = score; }
    });
    return best;
  }
  // Sets, reps and rest for a move in a role.
  function dose(role, id, ctx) {
    const ex = D.EX[id];
    if (ex.unit !== 'kg') return { sets: role === 'main' && ctx.lvl >= 3 ? 4 : role === 'core' && ctx.lvl < 2 ? 2 : 3, reps: ex.reps.slice(), rest: Math.min(ex.rest || 60, role === 'main' ? 120 : 75) };
    if (ctx.lvl <= 1) return { sets: 3, reps: ex.reps.slice(), rest: ex.rest || 75 };
    if (role === 'main') {
      if (ctx.lvl >= 3) return ctx.strong && !ctx.muscle ? { sets: 4, reps: [4, 6], rest: 180 } : ctx.strong ? { sets: 4, reps: [6, 8], rest: 150 } : { sets: 4, reps: [6, 10], rest: 120 };
      return ctx.strong ? { sets: 3, reps: [6, 8], rest: 150 } : { sets: 3, reps: [8, 12], rest: 90 };
    }
    return { sets: 3, reps: ex.reps.slice(), rest: Math.min(ex.rest || 60, 75) };
  }
  // Supersets: two moves back to back, then rest. Never two that need the same big station,
  // never two for the same body part, and a strength lifter's main lifts stay on their own.
  const BIG = ['barbell', 'squat_rack', 'smith_machine', 'hack_squat', 'leg_press', 'pendulum_squat', 'belt_squat', 'trap_bar', 't_bar_row', 'plate_loaded_chest', 'plate_loaded_row'];
  const big = (id) => D.EX[id].eq.some((t) => BIG.includes(t));
  function pairUp(items, ctx) {
    const pool = items.filter((it) => !(ctx.lvl >= 3 && ctx.strong && it.role === 'main'));
    let n = 0;
    pool.forEach((a, i) => {
      if (a.pair) return;
      const b = pool.slice(i + 1).find((x) => !x.pair && !(big(a.id) && big(x.id)) && D.EX[a.id].muscles[0] !== D.EX[x.id].muscles[0]);
      if (!b) return;
      n++; a.pair = b.pair = 'S' + n; a.pairRole = 'a'; b.pairRole = 'b';
      a.rest = 15; b.rest = Math.max(60, Math.min(b.rest, 90));
    });
    const out = [];
    items.forEach((it) => { if (out.includes(it)) return; out.push(it); if (it.pairRole === 'a') out.push(items.find((x) => x.pair === it.pair && x !== it)); });
    return out;
  }
  function titleFor(items) {
    const words = []; items.forEach((it) => { const r = regionOf(it.id); if (!words.includes(r)) words.push(r); });
    const t = listWords(words.slice(0, 3).map((w, i) => (i ? w.toLowerCase() : w)));
    return t || 'Full body';
  }
  function warmupFor(p, k, lvl) {
    const id = ['bike', 'cross_trainer', 'treadmill', 'rower', 'stair_climber', 'assault_bike', 'skipping'].find((x) => canDo(x, k)) || 'treadmill';
    return { id, min: p.health && p.health.asthma ? 10 : lvl >= 2 ? 5 : 8 };
  }
  function finisherFor(p, k) {
    if (!(p.goals || []).some((g) => g === 'fat' || g === 'energy') || p.mins < 45 || (p.worries || []).includes('time')) return null;
    const id = ['treadmill', 'stair_climber', 'bike', 'cross_trainer', 'rower'].find((x) => canDo(x, k));
    return id ? { id, min: 8 } : null;
  }
  function cardioOptions(except) { return ['bike', 'cross_trainer', 'treadmill', 'rower', 'stair_climber', 'assault_bike', 'ski_erg', 'skipping'].filter((x) => x !== except && canDo(x)); }

  function buildPlan(p) {
    const t = today();
    const left = [0, 1, 2, 3, 4, 5, 6].filter((i) => addDays(weekStart(t), i) >= t).some((i) => p.days.includes(i));
    const start = p.start === 'next' || !left ? addDays(weekStart(t), 7) : t;
    const ev = p.event && p.event.date && diffDays(start, p.event.date) >= 14 ? p.event : null;
    let end = ev ? addDays(ev.date, -1) : addDays(weekStart(start), 8 * 7 - 1);
    if (diffDays(start, end) > 20 * 7) end = addDays(start, 20 * 7 - 1);
    const lvl = levelOf(p); const style = styleOf(p);
    const g = p.gym || legacyGym(p.gymId); const k = kitSet(g.kit);
    const goals = p.goals || []; const worries = p.worries || [];
    const days = p.days.slice().sort((a, b) => a - b);
    const splitId = splitFor(days.length, lvl);
    const superset = lvl >= 2 && (worries.includes('time') || worries.includes('efficient') || p.mins <= 30);
    const per = Math.min(lvl <= 1 ? 6 : 9, (PER_SESSION[p.mins] || 5) + (superset ? 1 : 0));
    const prev = new Set(); const old = S().plan;
    if (old && old.sessions) Object.keys(old.sessions).forEach((key) => (old.sessions[key].ex || []).forEach((id) => prev.add(S().swaps[id] || id)));
    const ctx = { lvl, style, kit: k, count: {}, prev, strong: goals.includes('strong'), muscle: goals.includes('muscle'), rotate: lvl >= 2 && worries.includes('bored') };
    const names = SPLITS[splitId].sessions.map((tk) => TPL[tk].name);
    const focusPats = new Set(lvl >= 2 ? (p.focus || []).reduce((a, f) => a.concat(FOCUS_PATS[f] || []), []) : []);
    const sessions = {}; const order = []; const tags = {}; const seenName = {};
    SPLITS[splitId].sessions.forEach((tk) => {
      const tpl = TPL[tk];
      tags[tpl.tag] = (tags[tpl.tag] || 0) + 1;
      const key = tpl.area === 'full' ? tpl.tag : tpl.tag + tags[tpl.tag];
      seenName[tpl.name] = (seenName[tpl.name] || 0) + 1;
      const name = names.filter((x) => x === tpl.name).length > 1 ? tpl.name + ' ' + 'ABC'.charAt(seenName[tpl.name] - 1) : tpl.name;
      const used = new Set(); let items = [];
      slotsFor(tpl, p.focus).forEach(([pat, role, like]) => {
        if (items.length >= per) return;
        let id = choose(pat, role, like, ctx, used);
        if (!id) (FALLBACK[pat] || []).some((fp) => (id = choose(fp, role, like, ctx, used)));
        if (!id) return;
        used.add(id); ctx.count[id] = (ctx.count[id] || 0) + 1;
        items.push(Object.assign({ id, pat: D.EX[id].pat, role }, dose(role, id, ctx)));
      });
      if (ctx.rotate) items.forEach((it) => { if (it.role !== 'main') { const alt = choose(it.pat, it.role, null, ctx, new Set(items.map((x) => x.id))); if (alt) it.alt = alt; } });
      // an extra set on focus moves (not the main lifts, which already get four)
      items.forEach((it) => { if (it.role !== 'main' && focusPats.has(it.pat)) { it.sets = Math.min(4, it.sets + 1); it.focus = true; } });
      items = flowOrder(items);
      if (superset) items = pairUp(items, ctx);
      sessions[key] = { key, name, tag: tpl.tag, area: tpl.area, title: tpl.title || titleFor(items), ex: items.map((x) => x.id), items };
      order.push(key);
    });
    const slots = []; let n = 0;
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (days.includes(dow(d))) { const key = order[n % order.length]; n++; slots.push({ id: d + key, date: d, key, week: Math.floor(diffDays(weekStart(start), d) / 7) + 1 }); }
    }
    const weeks = Math.max(1, Math.ceil((diffDays(weekStart(start), end) + 1) / 7));
    const plan = {
      v: 3, created: t, start, end, weeks, days, mins: p.mins, time: p.time, gymId: g.id, sessions, order, slots,
      split: splitId, level: lvl, style, superset, rotate: ctx.rotate, newbie: lvl <= 1,
      deload: lvl >= 3 || (lvl >= 2 && (worries.includes('plateau') || worries.includes('recovery'))),
      warmup: warmupFor(p, k, lvl), finisher: finisherFor(p, k),
      event: ev || (p.event && p.event.date ? p.event : null),
    };
    plan.why = reasons(p, plan, g, k);
    return plan;
  }

  // How your answers shaped the plan, shown when it's revealed.
  const SPLIT_LINE = {
    fb2: (n) => [n === 3 ? 'Sessions A and B, alternating' : 'Two full-body sessions', n === 3 ? 'Three days a week, each muscle worked every session.' : 'Every muscle twice a week: the best start there is.'],
    fb3: () => ['Full body: A, B and C', 'Different moves each day, every muscle three times a week.'],
    ul: () => ['Upper and lower body, four days', 'Each muscle twice a week, with time to recover in between.'],
    ulppl: () => ['Upper, lower, push, pull and legs', 'Five days: every muscle twice a week, with more volume.'],
    ppl: () => ['Push, pull and legs, twice through', 'Six days: the most volume, for lifters who recover well.'],
  };
  const STYLE_LINE = {
    m: ['Machines first', 'Quick to set up, steady to learn, easy to progress.'],
    x: ['Free weights and machines', 'Free-weight basics lead, machines and cables for the extra work.'],
    f: ['Free weights first', 'Barbell and dumbbell lifts lead each session.'],
  };
  function reasons(p, plan, g, k) {
    const R = []; const w = p.worries || []; const lvl = plan.level;
    const sl = SPLIT_LINE[plan.split](plan.days.length);
    R.push(['calendar', 'bg-accent', sl[0], sl[1] + (lvl >= 2 && plan.days.length >= 4 ? ' Picked because you know your way around.' : '')]);
    const possible = Object.keys(D.EX).filter((id) => canDo(id, k)).length;
    R.push(['pin', 'bg-purple', 'Built for ' + g.name, 'Only equipment ' + (g.custom ? 'you told me is there' : 'this gym has') + '. ' + possible + ' exercises are possible here, so there’s always a swap.']);
    R.push(['dumbbell', 'bg-blue'].concat(STYLE_LINE[plan.style]));
    if (plan.superset) R.push(['bolt', 'bg-gold', 'Supersets to save time', 'Pairs of exercises back to back, then rest, so ' + plan.mins + ' minutes covers a full session.']);
    if (plan.deload) R.push(['trend', 'bg-green', 'A lighter week every fourth week', w.includes('plateau') ? 'You said progress has stalled. Planned lighter weeks let you recover, then push past it.' : 'You recover, then come back stronger. It keeps the weights moving.']);
    if (plan.rotate) R.push(['shuffle', 'bg-teal', 'New exercises every four weeks', 'Same muscles, fresh moves, so it never gets stale.']);
    const focus = (p.focus || []).map((f) => (D.FOCUS.find((x) => x.id === f) || {}).label).filter(Boolean);
    if (focus.length) R.push(['target', 'bg-red', 'Extra ' + listWords(focus.map((x) => x.toLowerCase())) + ' work', 'An extra set on every move for ' + (focus.length > 1 ? 'them' : 'it') + ', and ' + (focus.length > 1 ? 'they’re' : 'it’s') + ' the last thing cut when time is short.']);
    if (p.health && p.health.asthma) R.push(['puffer', 'bg-blue', 'A longer, gentler warm-up', plan.warmup.min + ' easy minutes first, and a puffer check before every session.']);
    if (lvl <= 1 && (w.includes('what') || w.includes('machines'))) R.push(['info', 'bg-blue', 'Step-by-step on every machine', 'Each one opens with how to set it up, the move and where you should feel it.']);
    if (w.includes('form')) R.push(['info', 'bg-blue', 'Form cues on every move', 'Set-up, the move, where you should feel it and what to avoid.']);
    if (w.includes('watched')) R.push(['shield', 'bg-purple', 'Machines and mat work first', 'Less time in the busy free-weights area while you settle in.']);
    if (w.includes('busy')) R.push(['swap', 'bg-accent', 'A swap for every exercise', 'Something taken? One tap gives you another move for the same muscles.']);
    if (w.includes('program')) R.push(['list', 'bg-ink', 'A real program', 'Every session tells you the weight and reps to beat, and it adjusts from how each set felt.']);
    if (w.includes('motivation') || w.includes('consistency')) R.push(['flame', 'bg-red', 'Weekly targets, not daily ones', 'Rest days never break your streak, and rewards unlock as you show up.']);
    if (w.includes('time') && !plan.superset) R.push(['clock', 'bg-teal', 'Short, focused sessions', 'If a day gets tight, tell me and I’ll cut it to 20 minutes.']);
    if (w.includes('food')) R.push(['fork', 'bg-green', 'Food sorted too', 'Easy dinners from food you like, and your order picked when you eat out.']);
    return R.slice(0, 8);
  }

  function phaseFor(week, plan) {
    const lvl = plan.level || (plan.newbie ? 1 : 2);
    if (lvl <= 1) {
      if (week <= 2) return { name: 'Learn the machines', sets: 2, note: 'Light weights. All about set-up and how each move feels.' };
      if (week <= 6) return { name: 'Build the habit', sets: 3, note: 'Three sets. Weights go up when you hit the top of the range.' };
      return { name: 'Get stronger', sets: 3, note: 'Steady increases, clean reps.' };
    }
    const blk = Math.floor((week - 1) / 4) + 1; const wib = ((week - 1) % 4) + 1;
    if (plan.deload && wib === 4 && week < plan.weeks) return { name: 'Lighter week', deload: true, note: 'One set less and about 10% lighter, so you recover and come back stronger.' };
    if (blk === 1 && wib === 1) return { name: 'Block 1', note: 'Find your working weights: finish each set with a rep or two left.' };
    if (wib === 1) return { name: 'Block ' + blk, note: plan.rotate && blk % 2 === 0 ? 'Fresh moves for a new block. Same muscles, new start.' : 'New block: build on last block’s weights.' };
    return { name: 'Block ' + blk, note: 'Beat last week by a rep or a little weight.' };
  }
  function timeOf(id) { return D.TIMES.find((x) => x.id === id) || D.TIMES[3]; }

  // ── Slots ─────────────────────────────────────────────────────────────────
  function slotDate(slot) { return S().moves[slot.id] || slot.date; }
  function isDone(slot) { return S().log.some((l) => l.slot === slot.id); }
  function isSkipped(slot) { return !!S().skips[slot.id]; }
  function allSlots() { const plan = S().plan; return plan ? plan.slots.filter((s) => !isSkipped(s)).sort((a, b) => (slotDate(a) < slotDate(b) ? -1 : slotDate(a) > slotDate(b) ? 1 : 0)) : []; }
  function openSlots() { return allSlots().filter((s) => !isDone(s)); }
  function slotsOn(d) { return allSlots().filter((s) => slotDate(s) === d); }
  function nextOpen(from) { const t = from || today(); return openSlots().find((s) => slotDate(s) >= t) || null; }
  function missed() {
    const t = today(); const log = S().log; const lastLog = log.length ? log[log.length - 1].date : '';
    return openSlots().filter((s) => slotDate(s) < t && diffDays(slotDate(s), t) <= 4 && slotDate(s) > lastLog).pop() || null;
  }
  function slotById(id) { const plan = S().plan; return plan ? plan.slots.find((s) => s.id === id) : null; }
  function freeDayAfter(d, n) { let x = d; for (let i = 0; i < 10; i++) { x = addDays(x, 1); if (!slotsOn(x).length) { if (!n) return x; n--; } } return addDays(d, 1); }
  function sessionName(slot) { const s = S().plan.sessions[slot.key]; return s ? s.name : 'Session'; }
  function sessionKeys() { const plan = S().plan; return plan ? plan.order || Object.keys(plan.sessions) : []; }
  function sessionTag(key) { const s = S().plan.sessions[key]; return (s && s.tag) || key; }

  // A session's exercises for a given week: swaps you've made, the block's rotation, lighter
  // weeks, and "short on time" trims all applied.
  function exercisesFor(key, week, slotId) {
    const plan = S().plan; const sess = plan.sessions[key]; if (!sess) return [];
    week = week || 1;
    const phase = phaseFor(week, plan); const trim = slotId ? S().trims[slotId] : 0;
    const rot = plan.rotate && Math.floor((week - 1) / 4) % 2 === 1;
    const items = sess.items || sess.ex.map((id) => ({ id }));
    let list = items.map((it) => {
      const base = rot && it.alt ? it.alt : it.id;
      const id = S().swaps[base] || base;
      let sets = phase.sets || it.sets || 3;
      if (phase.deload) sets = Math.max(2, (it.sets || 3) - 1);
      return { id, base, sets: trim ? 2 : sets, reps: it.reps || null, rest: trim ? null : it.rest || null, role: it.role || 'acc', pair: trim ? null : it.pair || null, pairRole: trim ? null : it.pairRole || null, deload: !!phase.deload };
    });
    if (trim) list = list.slice(0, trim);
    return list;
  }
  // Other moves for the same job that this gym has, best first.
  function swapsFor(id, base, exclude) {
    const ex = D.EX[id] || D.EX[base]; if (!ex) return [];
    const p = S().profile; const lvl = levelOf(p); const style = styleOf(p);
    const ctx = { lvl, style };
    let ids = base && base !== id ? [base] : [];
    [ex.pat].concat(FALLBACK[ex.pat] || []).forEach((pt) => { ids = ids.concat(candidates(pt, ctx)); });
    const cap = Math.max(lvl, ex.lvl);
    return uniq(ids).filter((x) => x !== id && D.EX[x] && !(exclude || []).includes(x) && D.EX[x].unit !== 'min' && D.EX[x].lvl <= cap && canDo(x)).slice(0, 6);
  }

  // ── Weight suggestions ────────────────────────────────────────────────────
  function lastPerf(id) {
    const log = S().log;
    for (let i = log.length - 1; i >= 0; i--) { const e = log[i].ex.find((x) => x.id === id && x.sets.length); if (e) return Object.assign({ date: log[i].date }, e); }
    return null;
  }
  function stepOf(id) { const s = S().exSettings[id]; return (s && Number(s.step)) || D.EX[id].step || 2.5; }
  const r2 = (n) => Math.round(n * 100) / 100;
  function roundTo(x, step) { return Math.max(step, r2(Math.round(x / step) * step)); }
  function effortWord(e) { return e === 'easy' ? 'easy' : e === 'hard' ? 'hard' : 'just right'; }
  const LEGS = ['quads', 'hams', 'glutes', 'calves', 'hips', 'adductors'];
  function eased(id, slotId) {
    const e = slotId && S().eases[slotId]; if (!e) return false;
    if (e === 'all') return true;
    const legs = (D.EX[id].muscles || []).some((m) => LEGS.includes(m));
    return e === 'legs' ? legs : !legs;
  }
  // What to lift today, and the reason in one sentence. o: {reps, deload} from the plan.
  function suggest(id, slotId, o) {
    const ex = D.EX[id]; const [lo, hi] = (o && o.reps) || ex.reps || [10, 12];
    const last = lastPerf(id); const step = stepOf(id);
    if (ex.unit === 'reps' || ex.unit === 'sec') {
      const u = ex.unit === 'sec' ? 'seconds' : ex.perSide ? 'each side' : 'reps';
      if (!last) return { mode: 'find', w: 0, r: ex.start || lo, title: (ex.start || lo) + ' ' + u, why: 'First time. Take it steady and keep it tidy.' };
      const best = Math.max.apply(null, last.sets.map((s) => s.r));
      const next = last.effort === 'hard' ? best : Math.min(hi, best + (ex.unit === 'sec' ? 5 : 1));
      return { mode: next > best ? 'up' : 'same', w: 0, r: next, title: next + ' ' + u, why: next > best ? 'Last time you did ' + best + '. A little more today.' : 'Same as last time, a bit cleaner.' };
    }
    if (!last) {
      const exp = levelOf(S().profile) >= 2;
      const start = roundTo(ex.start * [1, 1, 1.5, 2.2][levelOf(S().profile)], step);
      return { mode: 'find', w: start, r: lo, title: 'Find your weight', why: exp ? 'First time logging this one. Warm up, then pick a weight you can lift ' + lo + '–' + hi + ' times with a rep or two to spare.' : 'First time on this one. Start around ' + App.fmtKg(start) + ' kg, or one of the lighter settings, and I’ll adjust after set 1.' };
    }
    const top = Math.max.apply(null, last.sets.map((s) => s.w));
    const topSets = last.sets.filter((s) => s.w === top);
    const allTop = topSets.every((s) => s.r >= hi); const anyLow = topSets.some((s) => s.r < lo);
    const lastTxt = 'Last time ' + App.fmtKg(top) + ' kg × ' + topSets.map((s) => s.r).join(', ') + (last.effort ? ', ' + effortWord(last.effort) : '') + '.';
    if (o && o.deload && !ex.assist) { const w = roundTo(top * 0.9, step); return { mode: 'down', w, r: lo, title: App.fmtKg(w) + ' kg', why: 'Lighter week: about 90% of last time. Every rep smooth.' }; }
    if (eased(id, slotId)) { const w = Math.max(step, r2(top - step)); return { mode: 'down', w, r: lo, title: App.fmtKg(w) + ' kg', why: 'One step lighter today, since you’re sore.' }; }
    if (ex.assist) {
      if (last.effort === 'easy' || (allTop && last.effort !== 'hard')) { const w = Math.max(0, r2(top - step)); return { mode: 'up', w, r: lo, title: App.fmtKg(w) + ' kg help', why: lastTxt + ' Less help today.' }; }
      return { mode: 'same', w: top, r: Math.min(hi, Math.max.apply(null, topSets.map((s) => s.r)) + 1), title: App.fmtKg(top) + ' kg help', why: lastTxt + ' Same help, one more rep.' };
    }
    if (last.effort === 'easy' || (allTop && last.effort !== 'hard')) { const w = r2(top + step); return { mode: 'up', w, r: lo, title: App.fmtKg(w) + ' kg', why: lastTxt + ' Up one step.' }; }
    if (last.effort === 'hard' && anyLow) { const w = Math.max(step, r2(top - step)); return { mode: 'down', w, r: lo, title: App.fmtKg(w) + ' kg', why: lastTxt + ' One step lighter, every rep solid.' }; }
    const best = Math.max.apply(null, topSets.map((s) => s.r));
    return { mode: 'same', w: top, r: Math.min(hi, best + 1), title: App.fmtKg(top) + ' kg', why: lastTxt + ' Same weight, aim for ' + Math.min(hi, best + 1) + '.' };
  }
  function predictNext(id, sets, effort, reps) {
    const ex = D.EX[id]; const [lo, hi] = reps || ex.reps || [10, 12]; const step = stepOf(id);
    const done = sets.filter((s) => s.done !== false); if (!done.length) return null;
    if (ex.unit === 'reps' || ex.unit === 'sec') {
      const best = Math.max.apply(null, done.map((s) => s.r));
      const next = effort === 'hard' ? best : Math.min(hi, best + (ex.unit === 'sec' ? 5 : 1));
      return { text: next + (ex.unit === 'sec' ? ' s' : ' reps'), up: next > best };
    }
    const top = Math.max.apply(null, done.map((s) => s.w));
    const allTop = done.filter((s) => s.w === top).every((s) => s.r >= hi);
    if (ex.assist) return (effort === 'easy' || (allTop && effort !== 'hard')) ? { text: App.fmtKg(Math.max(0, r2(top - step))) + ' kg help', up: true } : { text: App.fmtKg(top) + ' kg help', up: false };
    if (effort === 'easy' || (allTop && effort !== 'hard')) return { text: App.fmtKg(r2(top + step)) + ' kg', up: true };
    if (effort === 'hard' && done.some((s) => s.r < lo)) return { text: App.fmtKg(Math.max(step, r2(top - step))) + ' kg', up: false, down: true };
    return { text: App.fmtKg(top) + ' kg', up: false };
  }

  // ── Personal records ──────────────────────────────────────────────────────
  // A record beats everything logged before (and earlier sets today). The first time on an
  // exercise is the baseline, not a record. Every 0.25 kg counts.
  function history(id) { const out = []; S().log.forEach((l) => l.ex.forEach((e) => { if (e.id === id) e.sets.forEach((x) => out.push({ w: x.w || 0, r: x.r || 0, date: l.date })); })); return out; }
  const e1rm = (w, r) => w * (1 + r / 30);
  function prFor(id, set, earlier) {
    const ex = D.EX[id]; if (!ex || ex.unit === 'min' || !set || !set.r) return null;
    const hist = history(id).concat((earlier || []).map((x) => ({ w: x.w || 0, r: x.r || 0 })));
    if (!hist.length) return null;
    if (ex.unit === 'reps' || ex.unit === 'sec') {
      const best = Math.max.apply(null, hist.map((h) => h.r));
      return set.r > best ? { kind: ex.unit === 'sec' ? 'time' : 'reps', prev: best, gain: set.r - best } : null;
    }
    if (ex.assist) {
      const at = hist.filter((h) => h.r >= set.r); if (!at.length) return null;
      const least = Math.min.apply(null, at.map((h) => h.w));
      return set.w < least ? { kind: 'help', prev: least, gain: r2(least - set.w) } : null;
    }
    if (!(set.w > 0)) return null;
    const maxW = Math.max.apply(null, hist.map((h) => h.w));
    if (set.w > maxW) return { kind: 'weight', prev: maxW, gain: r2(set.w - maxW) };
    const heavier = hist.filter((h) => h.w >= set.w);
    const bestR = heavier.length ? Math.max.apply(null, heavier.map((h) => h.r)) : 0;
    if (set.r > bestR) return { kind: 'reps', prev: bestR, gain: set.r - bestR, at: set.w };
    const bestE = Math.max.apply(null, hist.map((h) => e1rm(h.w, h.r)));
    if (e1rm(set.w, set.r) > bestE + 0.01) return { kind: 'e1rm', prev: r2(bestE), gain: r2(e1rm(set.w, set.r) - bestE) };
    return null;
  }
  function prText(id, pr) {
    const ex = D.EX[id];
    if (pr.kind === 'weight') return { title: 'Heaviest ever', gain: '+' + App.fmtKg(pr.gain) + ' kg on your best' };
    if (pr.kind === 'reps') return { title: ex.unit === 'kg' ? 'Most reps at ' + App.fmtKg(pr.at) + ' kg' : 'Most reps yet', gain: '+' + pr.gain + ' ' + App.plural(pr.gain, 'rep') };
    if (pr.kind === 'time') return { title: 'Longest hold yet', gain: '+' + pr.gain + ' seconds' };
    if (pr.kind === 'help') return { title: 'Least help yet', gain: App.fmtKg(pr.gain) + ' kg less help' };
    return { title: 'Strongest set yet', gain: 'Your best set on this one' };
  }
  // Best performance per exercise, for progress and the exercise page.
  function bestOf(id) {
    const ex = D.EX[id]; const h = history(id); if (!ex || !h.length) return null;
    if (ex.unit !== 'kg') { const b = h.reduce((a, x) => (x.r > a.r ? x : a)); return { text: b.r + (ex.unit === 'sec' ? ' s' : ' reps'), date: b.date }; }
    if (ex.assist) { const b = h.reduce((a, x) => (x.w < a.w || (x.w === a.w && x.r > a.r) ? x : a)); return { text: App.fmtKg(b.w) + ' kg help × ' + b.r, date: b.date }; }
    const b = h.reduce((a, x) => (x.w > a.w || (x.w === a.w && x.r > a.r) ? x : a));
    return { text: App.fmtKg(b.w) + ' kg × ' + b.r, date: b.date };
  }
  function prCount() { return App.sum(S().log.map((l) => (l.prs || []).length)); }

  // ── Weekly goals ──────────────────────────────────────────────────────────
  function sessionsInWeek(wk) { const end = addDays(wk, 6); return S().log.filter((l) => l.date >= wk && l.date <= end).length; }
  function plannedInWeek(wk) { const end = addDays(wk, 6); return allSlots().filter((s) => { const d = slotDate(s); return d >= wk && d <= end; }).length; }
  function targetInWeek(wk) { const plan = S().plan; if (!plan) return 0; const n = plannedInWeek(wk); return n || (wk >= weekStart(plan.start) && wk <= plan.end ? plan.days.length : 0); }
  const FOOD_VAL = { on: 1, part: 0.5, off: 0 };
  function foodScore(wk) { let s = 0; for (let i = 0; i < 7; i++) { const f = S().food[addDays(wk, i)]; if (f) s += FOOD_VAL[f.s] || 0; } return s; }
  const FOOD_TARGET = 5;
  function week(wk) {
    wk = wk || weekStart(today());
    const tgt = targetInWeek(wk) || (S().plan ? S().plan.days.length : 2);
    const train = sessionsInWeek(wk); const eat = foodScore(wk);
    return { wk, train, trainMax: tgt, eat, eatMax: FOOD_TARGET, perfect: train >= tgt && eat >= FOOD_TARGET };
  }
  function streakWeeks() {
    const plan = S().plan; if (!plan) return 0;
    let wk = weekStart(today()); let n = 0;
    if (sessionsInWeek(wk) >= Math.max(1, targetInWeek(wk))) n++;
    wk = addDays(wk, -7);
    while (wk >= weekStart(plan.start)) { const tgt = targetInWeek(wk); if (tgt && sessionsInWeek(wk) >= tgt) { n++; wk = addDays(wk, -7); } else break; }
    return n;
  }
  function totals() { const plan = S().plan; return { total: plan ? plan.slots.length : 0, done: S().log.filter((l) => l.slot).length }; }
  function partnerRewards() {
    const plan = S().plan; if (!plan) return [];
    const rw = S().rewards || D.DEFAULT_REWARDS; const per = plan.days.length;
    return Object.keys(rw).map(Number).filter((w) => w <= plan.weeks && rw[w]).map((w) => ({ week: w, text: rw[w], need: per * w, open: !!S().opened[w] }));
  }
  function liftHistory() {
    const by = {};
    S().log.forEach((l) => l.ex.forEach((e) => {
      const ex = D.EX[e.id]; if (!ex || !e.sets.length || ex.unit === 'min') return;
      const v = ex.unit === 'kg' ? Math.max.apply(null, e.sets.map((s) => s.w)) : Math.max.apply(null, e.sets.map((s) => s.r));
      (by[e.id] = by[e.id] || []).push({ v, date: l.date });
    }));
    return by;
  }

  // ── Up next (the one training card on Today) ──────────────────────────────
  function upNext() {
    const s = S(); const plan = s.plan; const t = today(); const h = hour();
    const tm = timeOf(plan.time);
    if (s.active) {
      const ex = s.active.steps.filter((x) => x.t === 'ex'); const n = ex.filter((x) => x.sets.some((y) => y.done)).length;
      return { kind: 'active', eyebrow: 'In progress', title: plan.sessions[s.active.key].name, sub: n + ' of ' + ex.length + ' exercises done', primary: { label: 'Resume', act: 'resumeSession' } };
    }
    const todays = slotsOn(t).filter((x) => !isDone(x))[0];
    if (todays) {
      const exs = exercisesFor(todays.key, todays.week, todays.id);
      return { kind: 'today', slot: todays, eyebrow: (h < tm.hour ? 'Today · ' + tm.at : 'Today'), title: plan.sessions[todays.key].name, sub: plan.sessions[todays.key].title + ' · ' + exs.length + ' exercises · ' + (s.trims[todays.id] ? '20' : plan.mins) + ' min', primary: { label: 'Start', act: 'startSession', data: todays.id } };
    }
    const miss = missed();
    if (miss) return { kind: 'missed', slot: miss, eyebrow: 'Missed ' + App.relLow(slotDate(miss)), title: plan.sessions[miss.key].name, sub: 'Do it today, or move it to another day.', primary: { label: 'Do it today', act: 'catchUp', data: miss.id } };
    const nxt = nextOpen(addDays(t, 1));
    const first = !s.log.length;
    if (nxt) {
      const d = slotDate(nxt);
      return { kind: first ? 'first' : 'next', slot: nxt, eyebrow: (first ? 'First session · ' : 'Next · ') + rel(d) + ' ' + tm.at, title: plan.sessions[nxt.key].name, sub: first ? 'Preview it now so day one feels familiar.' : plan.sessions[nxt.key].title + ' · ' + plan.mins + ' min', primary: { label: 'Preview', act: 'previewSession', data: nxt.id }, rest: diffDays(t, d) >= 1 && !first };
    }
    return { kind: 'done', eyebrow: 'Plan complete', title: 'You did it', sub: 'Every session is behind you.', primary: { label: 'See your progress', act: 'go', data: 'train' } };
  }

  // ── When the coach checks in (one message per topic per day) ─────────────
  function coachTriggers() {
    const s = S(); const plan = s.plan; const t = today(); const h = hour(); const d = dow(t); const wk = weekStart(t);
    const out = [];
    if (!s.chat.length) out.push('welcome');
    if (s.active) return out;
    const todays = slotsOn(t).filter((x) => !isDone(x))[0];
    const tm = timeOf(plan.time);
    if (todays && h < tm.hour + 2) out.push('morning_session');
    const miss = missed(); if (miss && !todays) out.push('missed');
    const yLog = s.log.find((l) => l.date === addDays(t, -1)); if (yLog && !todays) out.push('post_session');
    const ateOut = s.events.some((e) => e.type === 'eatout' && e.date === t); // asked later on a night out
    if (h >= (ateOut ? 21 : 19) && !s.food[t]) out.push('evening_food');
    if ((d === 4 || d === 5) && h >= 12 && !s.seen['weekend:' + wk]) out.push('friday');
    if (d === 6 && !s.checkins[wk] && plan.start <= t) out.push('sunday');
    if (!s.log.length && !todays) { const nxt = nextOpen(addDays(t, 1)); if (nxt && diffDays(t, slotDate(nxt)) <= 2) out.push('pre_first'); }
    return out.filter((id) => !s.chatPosted[id + ':' + (id === 'welcome' ? 'once' : t)]);
  }

  // ── Food helpers ──────────────────────────────────────────────────────────
  function cuisines() { const p = S().profile; return p && p.cuisines && p.cuisines.length ? p.cuisines : ['aussie', 'italian', 'chinese']; }
  // Five weeknight dinners from the cuisines this person eats; "Shuffle" moves the seed.
  function dinners(wk) {
    wk = wk || weekStart(today());
    const pool = D.MEALS.filter((m) => cuisines().includes(m.c));
    const list = pool.length ? pool : D.MEALS;
    const seed = (Math.floor(App.parse(wk).getTime() / 604800000) + S().dinnerSeed * 3) % list.length;
    const out = []; for (let i = 0; out.length < 5 && i < list.length * 2; i++) { const m = list[(seed + i * 7) % list.length]; if (!out.includes(m)) out.push(m); }
    return out.map((m, i) => ({ day: addDays(wk, i), meal: m }));
  }
  // Whole words only ("inn" is a pub, "dinner" isn't), plurals and possessives allowed.
  const keyRes = D.CUISINE_KEYS.map(([id, keys]) => [id, keys.map((k) => new RegExp('(^|[^a-z])' + k.replace(/[’]/g, "'").replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "(s|'s)?(?![a-z])"))]);
  function detectCuisine(text) {
    const q = String(text || '').toLowerCase().replace(/[‘’]/g, "'");
    for (const [id, res] of keyRes) if (res.some((re) => re.test(q))) return id;
    return null;
  }
  // "I'm going to Italian Bowl in Newtown for dinner" → "Italian Bowl in Newtown". Words that
  // just start a sentence ("Is", "Can", "I’m") are never a place.
  const STARTERS = /^(i|i'm|i’m|im|we|we're|we’re|going|heading|dinner|lunch|brunch|tonight|tomorrow|today|is|are|can|could|should|would|will|what|how|where|when|why|which|who|do|does|did|my|our|the|a|an|it|its|it's|it’s|this|that|hi|hey|ok|okay|thanks|yes|no|just|so|any|please|maybe)$/i;
  function extractPlace(text) {
    const s = String(text || '').trim();
    const m = s.match(/\b(?:to|at|from)\s+([A-Z0-9][^,.!?]*?)(?:\s+(?:for|tonight|tomorrow|today|this|on|with|later)\b|[,.!?]|$)/);
    if (m && !STARTERS.test(m[1].split(/\s+/)[0])) return m[1].trim();
    const caps = s.match(/([A-Z0-9][\w'’&]*(?:\s+(?:[A-Z0-9][\w'’&]*|in|on|at|de|la|&))*)/g) || [];
    const best = caps.map((c) => c.trim().split(/\s+/)).map((w) => { while (w.length && STARTERS.test(w[0])) w.shift(); return w; })
      .filter((w) => w.length > 1 || (w.length === 1 && s.indexOf(w[0]) > 0 && w[0].length > 2))
      .map((w) => w.join(' ')).sort((a, b) => b.length - a.length)[0];
    return best || '';
  }

  // ── Search ────────────────────────────────────────────────────────────────
  function searchIndex() {
    const s = S(); const plan = s.plan; const out = [];
    const add = (o) => out.push(o);
    if (plan) {
      const n = nextOpen(today()) || nextOpen();
      sessionKeys().forEach((k) => add({ id: 'sess:' + k, type: 'Training', icon: 'dumbbell', title: plan.sessions[k].name, sub: plan.sessions[k].title, act: 'previewSession', data: (openSlots().find((x) => x.key === k) || plan.slots.find((x) => x.key === k) || {}).id, keys: 'workout session ' + plan.sessions[k].title }));
      if (n) add({ id: 'next', type: 'Training', icon: 'calendar', title: 'Next session', sub: plan.sessions[n.key].name + ' · ' + rel(slotDate(n)), act: 'previewSession', data: n.id, keys: 'next workout today schedule' });
      add({ id: 'plan', type: 'Training', icon: 'list', title: 'Your plan', sub: plan.weeks + ' weeks', act: 'go', data: 'train', keys: 'program schedule weeks plan' });
      add({ id: 'progress', type: 'Training', icon: 'trend', title: 'Progress', sub: 'Your lifts over time', act: 'openProgress', keys: 'progress strength lifts stronger history' });
    }
    const k = kit(); const inPlan = planIds();
    Object.keys(D.EX).forEach((id) => {
      const e = D.EX[id]; const here = canDo(id, k);
      add({ id: 'ex:' + id, type: 'Exercises', icon: e.unit === 'min' ? 'heart' : 'dumbbell', title: e.name, sub: e.focus + (inPlan.has(id) ? ' · in your plan' : here ? '' : ' · not at your gym'), act: 'openExercise', data: id, boost: (inPlan.has(id) ? 0.6 : 0) + (here ? 0.4 : 0),
        keys: e.focus + ' ' + (e.aka || []).join(' ') + ' ' + (e.muscles || []).concat(e.muscles2 || []).map((m) => D.MUSCLES[m]).join(' ') + ' ' + e.eq.map((t) => D.EQUIP_NAME[t]).join(' ') + ' exercise' });
    });
    add({ id: 'eatout', type: 'Food', icon: 'fork', title: 'Eating out', sub: 'Get your order picked', act: 'openEatOut', keys: 'restaurant dinner lunch menu order eating out cafe' });
    add({ id: 'dinners', type: 'Food', icon: 'list', title: 'This week’s dinners', sub: 'Five easy weeknight meals', act: 'openDinners', keys: 'meals recipes dinner cook week ideas' });
    add({ id: 'logfood', type: 'Food', icon: 'leaf', title: 'Log today’s food', sub: 'One tap', act: 'go', data: 'eat', keys: 'food check in log eating today' });
    Object.keys(D.MOMENTS).forEach((k) => add({ id: 'moment:' + k, type: 'Food', icon: D.MOMENTS[k].icon, title: D.MOMENTS[k].title, sub: 'A simple plan', act: 'openMoment', data: k, keys: 'big meal plan ' + k }));
    Object.keys(D.MENUS).forEach((k) => add({ id: 'menu:' + k, type: 'Restaurants', icon: 'fork', title: D.MENUS[k].name + ' restaurant', sub: 'What to order', act: 'openMenu', data: '|' + k, keys: 'restaurant menu order ' + D.MENUS[k].name }));
    s.places.forEach((pl) => add({ id: 'place:' + pl.name, type: 'Restaurants', icon: 'pin', title: pl.name, sub: (D.MENUS[pl.cuisine] ? D.MENUS[pl.cuisine].name + ' · your picks' : 'Your picks'), act: 'openMenu', data: pl.name + '|' + pl.cuisine, keys: 'restaurant ' + pl.cuisine }));
    [['sore', 'I’m sore'], ['short', 'Short on time'], ['move', 'Move a session'], ['taken', 'Machine taken'], ['motivation', 'Not feeling it'], ['pain', 'Something hurts']].forEach(([k, t]) => add({ id: 'coach:' + k, type: 'Ask your coach', icon: 'coach', title: t, sub: 'Message your coach', act: 'coachTopic', data: k, keys: 'coach help ' + t }));
    if (s.profile && s.profile.health && s.profile.health.asthma) add({ id: 'coach:asthma', type: 'Ask your coach', icon: 'puffer', title: 'Asthma during a session', sub: 'What to do', act: 'coachTopic', data: 'asthma', keys: 'asthma breathing wheeze puffer inhaler' });
    [['goal', 'Your goal', 'flag', 'openGoal', 'countdown goal holiday event why'], ['rewards', 'Rewards', 'gift', 'openProfile', 'partner rewards treats'], ['awards', 'Awards', 'star', 'openAwards', 'awards medals badges'], ['settings', 'Settings', 'gear', 'openProfile', 'sound theme dark mode appearance backup reset']].forEach(([id, t, ic, act, keys]) => add({ id, type: 'You', icon: ic, title: t, act, keys }));
    return out;
  }
  function search(q) {
    q = String(q || '').toLowerCase().trim(); if (!q) return [];
    const words = q.split(/\s+/);
    return searchIndex().map((it) => {
      const title = it.title.toLowerCase(); const hay = (title + ' ' + (it.sub || '') + ' ' + (it.keys || '')).toLowerCase();
      if (!words.every((w) => hay.includes(w))) return null;
      let score = (title.startsWith(q) ? 3 : title.includes(q) ? 2 : 1) + (it.boost || 0);
      const u = S().usage[it.id]; if (u) score += Math.min(2, u.n * 0.3);
      return Object.assign({ score }, it);
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 14);
  }
  // Empty-state suggestions: what this person is likely after right now.
  function suggestions() {
    const s = S(); const t = today(); const h = hour(); const d = dow(t);
    const idx = searchIndex(); const byId = (id) => idx.find((x) => x.id === id);
    const out = [];
    const todays = slotsOn(t).filter((x) => !isDone(x))[0];
    if (todays) out.push(Object.assign({}, byId('sess:' + todays.key), { sub: 'Today' }));
    if (h >= 16 && (d >= 4 || h >= 17)) out.push(byId('eatout'));
    if (h >= 19 && !s.food[t]) out.push(byId('logfood'));
    if (d === 4 || d === 5) out.push(byId('moment:weekend'));
    const freq = Object.keys(s.usage).sort((a, b) => s.usage[b].n - s.usage[a].n).slice(0, 4).map(byId);
    freq.forEach((x) => out.push(x));
    if (out.length < 4) ['next', 'dinners', 'coach:sore', 'progress'].forEach((id) => out.push(byId(id)));
    const seen = new Set();
    return out.filter((x) => x && !seen.has(x.id) && seen.add(x.id)).slice(0, 5);
  }
  function recents() { const idx = searchIndex(); return S().recent.map((id) => idx.find((x) => x.id === id)).filter(Boolean).slice(0, 5); }
  function track(id) {
    if (!id) return; const s = S();
    const u = s.usage[id] || { n: 0, last: 0 }; u.n++; u.last = Date.now(); s.usage[id] = u;
    s.recent = [id].concat(s.recent.filter((x) => x !== id)).slice(0, 8); App.save();
  }

  // After the equipment changes: anything in the plan that's no longer possible is swapped for
  // the best move that is. Returns what changed, for the coach to mention.
  function fixPlanForKit() {
    const plan = S().plan; const out = []; if (!plan) return out;
    const k = kit(); const done = new Set();
    sessionKeys().forEach((key) => exercisesFor(key, 1).concat(plan.rotate ? exercisesFor(key, 5) : []).forEach((e) => {
      if (done.has(e.base) || canDo(e.id, k)) return; done.add(e.base);
      const alt = swapsFor(e.id, e.base)[0];
      if (alt) { if (alt === e.base) delete S().swaps[e.base]; else S().swaps[e.base] = alt; out.push([e.id, alt]); }
    }));
    ['warmup', 'finisher'].forEach((w) => { const c = plan[w]; if (c && !canDo(c.id, k)) { const alt = cardioOptions(c.id)[0]; if (alt) c.id = alt; } });
    App.save();
    return out;
  }
  // Every exercise id in the plan right now (after swaps).
  function planIds() {
    const plan = S().plan; const out = new Set(); if (!plan) return out;
    sessionKeys().forEach((key) => exercisesFor(key, 1).forEach((e) => out.add(e.id)));
    return out;
  }

  App.E = {
    gym, kit, kitSet, canDo, missing, kitLayers, gymFromDirectory, customGym, legacyGym, gymName, gymShort, gymsNear, suburbPoint, findGyms, km, levelOf, styleOf, dayOptions, minOptions,
    buildPlan, splitFor, SPLITS, phaseFor, timeOf, cardioOptions, swapsFor, planIds, regionOf, fixPlanForKit,
    slotDate, isDone, isSkipped, allSlots, openSlots, slotsOn, nextOpen, missed, slotById, freeDayAfter, sessionName, sessionKeys, sessionTag, exercisesFor,
    lastPerf, stepOf, effortWord, suggest, predictNext, prFor, prText, bestOf, prCount,
    sessionsInWeek, plannedInWeek, targetInWeek, foodScore, week, streakWeeks, totals, partnerRewards, liftHistory, FOOD_TARGET,
    upNext, coachTriggers, cuisines, dinners, detectCuisine, extractPlace,
    searchIndex, search, suggestions, recents, track,
  };
})();
