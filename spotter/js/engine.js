/* Spotter — engine: plan generation, scheduling, weight suggestions, weekly goals, search,
   restaurant matching and when the coach checks in. No rendering here. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const { today, addDays, dow, weekStart, diffDays, rel, fmtDate, hour, DOW_LONG } = App;
  const S = () => App.S;

  // ── Plan generation ───────────────────────────────────────────────────────
  function buildPlan(p) {
    const gym = gymOf(p.gymId);
    const t = today();
    const left = [0, 1, 2, 3, 4, 5, 6].filter((i) => addDays(weekStart(t), i) >= t).some((i) => p.days.includes(i));
    const start = p.start === 'next' || !left ? addDays(weekStart(t), 7) : t;
    const ev = p.event && p.event.date && diffDays(start, p.event.date) >= 14 ? p.event : null;
    let end = ev ? addDays(ev.date, -1) : addDays(weekStart(start), 6 * 7 - 1);
    if (diffDays(start, end) > 20 * 7) end = addDays(start, 20 * 7 - 1);
    const count = { 30: 4, 45: 5, 60: 6 }[p.mins] || 5;
    const sessions = {};
    ['A', 'B'].forEach((key) => {
      const base = D.PROGRAM[key];
      sessions[key] = { key, name: base.name, title: base.title, ex: base.ex.slice(0, count).map((id) => availableAt(gym, id, p)) };
    });
    const days = p.days.slice().sort((a, b) => a - b);
    const slots = []; let k = 0;
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (days.includes(dow(d))) {
        const key = k % 2 === 0 ? 'A' : 'B'; k++;
        slots.push({ id: d + key, date: d, key, week: Math.floor(diffDays(weekStart(start), d) / 7) + 1 });
      }
    }
    const weeks = Math.max(1, Math.ceil((diffDays(weekStart(start), end) + 1) / 7));
    return {
      created: t, start, end, weeks, days, mins: p.mins, time: p.time, gymId: p.gymId, sessions, slots,
      warmup: { id: 'bike', min: p.health && p.health.asthma ? 10 : 8 },
      finisher: (p.goals || []).some((g) => g === 'fat' || g === 'energy') && p.mins >= 45 ? { id: 'treadmill', min: 8 } : null,
      event: ev || (p.event && p.event.date ? p.event : null),
      newbie: p.experience !== 'regular',
    };
  }
  function availableAt(gym, id, p) {
    const kit = gym ? gym.kit : null; const ok = (x) => !kit || kit.includes(x);
    if (p.equipment !== 'mixed' && D.EX[id].kind === 'free') { const alt = (D.EX[id].alts || []).find((a) => D.EX[a].kind !== 'free' && ok(a)); if (alt) return alt; }
    if (ok(id)) return id;
    return (D.EX[id].alts || []).find(ok) || id;
  }
  function gymOf(id) { return D.GYMS.find((g) => g.id === id) || D.GYMS[D.GYMS.length - 1]; }
  function gymName(id) { const g = gymOf(id); return g.generic ? 'your gym' : g.brand + ' ' + g.branch; }
  function gymShort(id) { const g = gymOf(id); return g.generic ? 'Your gym' : g.branch; }
  function phaseFor(week, plan) {
    if (plan.newbie && week <= 2) return { name: 'Learn the machines', sets: 2, note: 'Light weights. All about set-up and how each move feels.' };
    if (week <= 6) return { name: 'Build the habit', sets: 3, note: 'Three sets. Weights go up when you hit the top of the range.' };
    return { name: 'Get stronger', sets: 3, note: 'Steady increases, clean reps.' };
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
  function sessionName(slot) { return S().plan.sessions[slot.key].name; }

  function exercisesFor(key, week, slotId) {
    const plan = S().plan; const phase = phaseFor(week || 1, plan);
    const trim = slotId ? S().trims[slotId] : 0;
    let list = plan.sessions[key].ex.map((base) => { const id = S().swaps[base] || base; return { id, base, sets: trim ? 2 : phase.sets }; });
    if (trim) list = list.slice(0, trim);
    return list;
  }

  // ── Weight suggestions ────────────────────────────────────────────────────
  function lastPerf(id) {
    const log = S().log;
    for (let i = log.length - 1; i >= 0; i--) { const e = log[i].ex.find((x) => x.id === id && x.sets.length); if (e) return Object.assign({ date: log[i].date }, e); }
    return null;
  }
  function stepOf(id) { const s = S().exSettings[id]; return (s && Number(s.step)) || D.EX[id].step || 2.5; }
  function effortWord(e) { return e === 'easy' ? 'easy' : e === 'hard' ? 'hard' : 'just right'; }
  const LEGS = ['quads', 'hams', 'glutes', 'calves', 'hips'];
  function eased(id, slotId) {
    const e = slotId && S().eases[slotId]; if (!e) return false;
    if (e === 'all') return true;
    const legs = (D.EX[id].muscles || []).some((m) => LEGS.includes(m));
    return e === 'legs' ? legs : !legs;
  }
  // What to lift today, and the reason in one sentence.
  function suggest(id, slotId) {
    const ex = D.EX[id]; const [lo, hi] = ex.reps || [10, 12];
    const last = lastPerf(id); const step = stepOf(id);
    if (ex.unit === 'reps' || ex.unit === 'sec') {
      const u = ex.unit === 'sec' ? 'seconds' : ex.perSide ? 'each side' : 'reps';
      if (!last) return { mode: 'find', w: 0, r: ex.start || lo, title: (ex.start || lo) + ' ' + u, why: 'First time. Take it steady and keep it tidy.' };
      const best = Math.max.apply(null, last.sets.map((s) => s.r));
      const next = last.effort === 'hard' ? best : Math.min(hi, best + (ex.unit === 'sec' ? 5 : 1));
      return { mode: next > best ? 'up' : 'same', w: 0, r: next, title: next + ' ' + u, why: next > best ? 'Last time you did ' + best + '. A little more today.' : 'Same as last time, a bit cleaner.' };
    }
    if (!last) return { mode: 'find', w: ex.start, r: lo, title: 'Find your weight', why: 'First time on this one. Start around ' + App.fmtKg(ex.start) + ' kg, or one of the lighter settings, and I’ll adjust after set 1.' };
    const top = Math.max.apply(null, last.sets.map((s) => s.w));
    const topSets = last.sets.filter((s) => s.w === top);
    const allTop = topSets.every((s) => s.r >= hi); const anyLow = topSets.some((s) => s.r < lo);
    const lastTxt = 'Last time ' + App.fmtKg(top) + ' kg × ' + topSets.map((s) => s.r).join(', ') + (last.effort ? ', ' + effortWord(last.effort) : '') + '.';
    if (eased(id, slotId)) { const w = Math.max(step, top - step); return { mode: 'down', w, r: lo, title: App.fmtKg(w) + ' kg', why: 'One step lighter today, since you’re sore.' }; }
    if (ex.assist) {
      if (last.effort === 'easy' || (allTop && last.effort !== 'hard')) { const w = Math.max(0, top - step); return { mode: 'up', w, r: lo, title: App.fmtKg(w) + ' kg help', why: lastTxt + ' Less help today.' }; }
      return { mode: 'same', w: top, r: Math.min(hi, Math.max.apply(null, topSets.map((s) => s.r)) + 1), title: App.fmtKg(top) + ' kg help', why: lastTxt + ' Same help, one more rep.' };
    }
    if (last.effort === 'easy' || (allTop && last.effort !== 'hard')) { const w = top + step; return { mode: 'up', w, r: lo, title: App.fmtKg(w) + ' kg', why: lastTxt + ' Up one step.' }; }
    if (last.effort === 'hard' && anyLow) { const w = Math.max(step, top - step); return { mode: 'down', w, r: lo, title: App.fmtKg(w) + ' kg', why: lastTxt + ' One step lighter, every rep solid.' }; }
    const best = Math.max.apply(null, topSets.map((s) => s.r));
    return { mode: 'same', w: top, r: Math.min(hi, best + 1), title: App.fmtKg(top) + ' kg', why: lastTxt + ' Same weight, aim for ' + Math.min(hi, best + 1) + '.' };
  }
  function predictNext(id, sets, effort) {
    const ex = D.EX[id]; const [lo, hi] = ex.reps || [10, 12]; const step = stepOf(id);
    const done = sets.filter((s) => s.done !== false); if (!done.length) return null;
    if (ex.unit === 'reps' || ex.unit === 'sec') {
      const best = Math.max.apply(null, done.map((s) => s.r));
      const next = effort === 'hard' ? best : Math.min(hi, best + (ex.unit === 'sec' ? 5 : 1));
      return { text: next + (ex.unit === 'sec' ? ' s' : ' reps'), up: next > best };
    }
    const top = Math.max.apply(null, done.map((s) => s.w));
    const allTop = done.filter((s) => s.w === top).every((s) => s.r >= hi);
    if (ex.assist) return (effort === 'easy' || (allTop && effort !== 'hard')) ? { text: App.fmtKg(Math.max(0, top - step)) + ' kg help', up: true } : { text: App.fmtKg(top) + ' kg help', up: false };
    if (effort === 'easy' || (allTop && effort !== 'hard')) return { text: App.fmtKg(top + step) + ' kg', up: true };
    if (effort === 'hard' && done.some((s) => s.r < lo)) return { text: App.fmtKg(Math.max(step, top - step)) + ' kg', up: false, down: true };
    return { text: App.fmtKg(top) + ' kg', up: false };
  }

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
      ['A', 'B'].forEach((k) => add({ id: 'sess:' + k, type: 'Training', icon: 'dumbbell', title: plan.sessions[k].name, sub: plan.sessions[k].title, act: 'previewSession', data: (openSlots().find((x) => x.key === k) || plan.slots.find((x) => x.key === k) || {}).id, keys: 'workout session ' + plan.sessions[k].title }));
      if (n) add({ id: 'next', type: 'Training', icon: 'calendar', title: 'Next session', sub: plan.sessions[n.key].name + ' · ' + rel(slotDate(n)), act: 'previewSession', data: n.id, keys: 'next workout today schedule' });
      add({ id: 'plan', type: 'Training', icon: 'list', title: 'Your plan', sub: plan.weeks + ' weeks', act: 'go', data: 'train', keys: 'program schedule weeks plan' });
      add({ id: 'progress', type: 'Training', icon: 'trend', title: 'Progress', sub: 'Your lifts over time', act: 'openProgress', keys: 'progress strength lifts stronger history' });
    }
    Object.keys(D.EX).filter((id) => D.EX[id].unit !== 'min').forEach((id) => { const e = D.EX[id]; add({ id: 'ex:' + id, type: 'Exercises', icon: 'dumbbell', title: e.name, sub: e.focus, act: 'openExercise', data: id, keys: e.focus + ' ' + (e.muscles || []).map((m) => D.MUSCLES[m]).join(' ') + ' machine' }); });
    add({ id: 'eatout', type: 'Food', icon: 'fork', title: 'Eating out', sub: 'Get your order picked', act: 'openEatOut', keys: 'restaurant dinner lunch menu order eating out cafe' });
    add({ id: 'dinners', type: 'Food', icon: 'list', title: 'This week’s dinners', sub: 'Five easy weeknight meals', act: 'openDinners', keys: 'meals recipes dinner cook week ideas' });
    add({ id: 'logfood', type: 'Food', icon: 'leaf', title: 'Log today’s food', sub: 'One tap', act: 'go', data: 'eat', keys: 'food check in log eating today' });
    Object.keys(D.MOMENTS).forEach((k) => add({ id: 'moment:' + k, type: 'Food', icon: D.MOMENTS[k].icon, title: D.MOMENTS[k].title, sub: 'A simple plan', act: 'openMoment', data: k, keys: 'big meal plan ' + k }));
    Object.keys(D.MENUS).forEach((k) => add({ id: 'menu:' + k, type: 'Restaurants', icon: 'fork', title: D.MENUS[k].name + ' restaurant', sub: 'What to order', act: 'openMenu', data: '|' + k, keys: 'restaurant menu order ' + D.MENUS[k].name }));
    s.places.forEach((pl) => add({ id: 'place:' + pl.name, type: 'Restaurants', icon: 'pin', title: pl.name, sub: (D.MENUS[pl.cuisine] || {}).name + ' · your picks', act: 'openMenu', data: pl.name + '|' + pl.cuisine, keys: 'restaurant ' + pl.cuisine }));
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
      let score = title.startsWith(q) ? 3 : title.includes(q) ? 2 : 1;
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

  App.E = {
    buildPlan, availableAt, gymOf, gymName, gymShort, phaseFor, timeOf,
    slotDate, isDone, isSkipped, allSlots, openSlots, slotsOn, nextOpen, missed, slotById, freeDayAfter, sessionName, exercisesFor,
    lastPerf, stepOf, effortWord, suggest, predictNext,
    sessionsInWeek, plannedInWeek, targetInWeek, foodScore, week, streakWeeks, totals, partnerRewards, liftHistory, FOOD_TARGET,
    upNext, coachTriggers, cuisines, dinners, detectCuisine, extractPlace,
    searchIndex, search, suggestions, recents, track,
  };
})();
