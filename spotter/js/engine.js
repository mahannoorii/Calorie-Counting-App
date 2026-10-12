/* Spotter — engine: plan generation, scheduling, weight predictions, next-step prediction and rewards. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const { today, addDays, dow, weekStart, diffDays, rel, fmtDate, hour, DOW, DOW_LONG } = App;

  // ── Plan generation ───────────────────────────────────────────────────────
  // Turns onboarding answers into a schedule up to the goal date (or six weeks).
  function buildPlan(p) {
    const gym = gymOf(p.gymId);
    const t = today();
    const start = p.start === 'next' ? addDays(weekStart(t), 7) : t;
    let end;
    const ev = p.event && p.event.date && diffDays(start, p.event.date) >= 14 ? p.event : null;
    if (ev) end = addDays(ev.date, -1);
    else end = addDays(weekStart(start), 6 * 7 - 1);
    if (diffDays(start, end) > 20 * 7) end = addDays(start, 20 * 7 - 1);

    const count = { 30: 4, 45: 5, 60: 6 }[p.mins] || 5;
    const sessions = {};
    ['A', 'B'].forEach((key) => {
      const base = D.PROGRAM[key];
      const ex = base.ex.slice(0, count).map((id) => availableAt(gym, id, p));
      sessions[key] = { key, name: base.name, title: base.title, ex };
    });

    const days = p.days.slice().sort((a, b) => a - b);
    const slots = [];
    let k = 0;
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (days.includes(dow(d))) {
        const key = k % 2 === 0 ? 'A' : 'B';
        k++;
        slots.push({ id: d + key, date: d, key, week: Math.floor(diffDays(weekStart(start), d) / 7) + 1 });
      }
    }
    const weeks = Math.max(1, Math.ceil((diffDays(weekStart(start), end) + 1) / 7));
    const asthma = !!(p.health && p.health.asthma);
    const wantsCardio = (p.goals || []).some((g) => g === 'fat' || g === 'energy');
    return {
      created: t, start, end, weeks, days, mins: p.mins, time: p.time, gymId: p.gymId,
      sessions, slots,
      warmup: { id: 'bike', min: asthma ? 10 : 8 },
      cooldown: { min: 5 },
      finisher: wantsCardio && p.mins >= 45 ? { id: 'treadmill', min: 8 } : null,
      event: ev || (p.event && p.event.date ? p.event : null),
      newbie: p.experience !== 'regular',
    };
  }
  function availableAt(gym, id, p) {
    const kit = gym ? gym.kit : null;
    const ok = (x) => !kit || kit.includes(x);
    if (p.equipment !== 'mixed' && D.EX[id].kind === 'free') {
      const alt = (D.EX[id].alts || []).find((a) => D.EX[a].kind !== 'free' && ok(a));
      if (alt) return alt;
    }
    if (ok(id)) return id;
    return (D.EX[id].alts || []).find(ok) || id;
  }
  function gymOf(id) { return D.GYMS.find((g) => g.id === id) || D.GYMS[D.GYMS.length - 1]; }
  function gymName(id) { const g = gymOf(id); return g.generic ? 'your gym' : g.brand + ' ' + g.branch; }

  function phaseFor(week, plan) {
    if (plan.newbie && week <= 2) return { name: 'Learn the machines', sets: 2, note: 'Light weights. Focus on set-up and how each move feels.' };
    if (week <= 6) return { name: 'Build the habit', sets: 3, note: 'Three sets. Add weight when you hit the top of the range.' };
    return { name: 'Get stronger', sets: 3, note: 'Steady increases. Keep every rep clean.' };
  }

  // ── Slots ─────────────────────────────────────────────────────────────────
  const S = () => App.S;
  function slotDate(slot) { return S().moves[slot.id] || slot.date; }
  function isDone(slot) { return S().log.some((l) => l.slot === slot.id); }
  function isSkipped(slot) { return !!S().skips[slot.id]; }
  function openSlots() { const plan = S().plan; return plan ? plan.slots.filter((s) => !isDone(s) && !isSkipped(s)) : []; }
  function slotsOn(d) { const plan = S().plan; return plan ? plan.slots.filter((s) => slotDate(s) === d && !isSkipped(s)) : []; }
  function nextOpen(after) {
    const t = after || today();
    return openSlots().filter((s) => slotDate(s) >= t).sort((a, b) => (slotDate(a) < slotDate(b) ? -1 : 1))[0] || null;
  }
  function missed() {
    const t = today();
    const lastLog = S().log.length ? S().log[S().log.length - 1].date : '';
    return openSlots().filter((s) => slotDate(s) < t && diffDays(slotDate(s), t) <= 4 && slotDate(s) > lastLog)
      .sort((a, b) => (slotDate(a) < slotDate(b) ? 1 : -1))[0] || null;
  }
  function slotById(id) { const plan = S().plan; return plan ? plan.slots.find((s) => s.id === id) : null; }

  function exercisesFor(key, week) {
    const plan = S().plan;
    const phase = phaseFor(week || 1, plan);
    return plan.sessions[key].ex.map((base) => {
      const id = S().swaps[base] || base;
      const ex = D.EX[id];
      const sets = ex.unit === 'min' ? 1 : phase.sets;
      return { id, base, sets };
    });
  }
  function sessionMinutes(key) { const plan = S().plan; return plan.mins; }

  // ── Weight predictions ────────────────────────────────────────────────────
  function lastPerf(id) {
    const log = S().log;
    for (let i = log.length - 1; i >= 0; i--) {
      const e = log[i].ex.find((x) => x.id === id && x.sets.length);
      if (e) return Object.assign({ date: log[i].date }, e);
    }
    return null;
  }
  function stepOf(id) { const s = S().exSettings[id]; return (s && Number(s.step)) || D.EX[id].step || 2.5; }
  // Returns what to do today and why, in plain words.
  function suggest(id) {
    const ex = D.EX[id];
    const [lo, hi] = ex.reps || [10, 12];
    const last = lastPerf(id);
    const step = stepOf(id);
    if (ex.unit === 'reps' || ex.unit === 'sec') {
      const u = ex.unit === 'sec' ? 'seconds' : (ex.perSide ? 'reps each side' : 'reps');
      if (!last) return { mode: 'find', w: 0, r: ex.start || lo, title: (ex.start || lo) + ' ' + u, why: 'First time: take it steady and keep the form tidy.' };
      const best = Math.max.apply(null, last.sets.map((s) => s.r));
      const next = last.effort === 'hard' ? best : Math.min(hi, best + (ex.unit === 'sec' ? 5 : 1));
      return { mode: next > best ? 'up' : 'same', w: 0, r: next, title: next + ' ' + u, why: next > best ? 'Last time you managed ' + best + '. Add a little today.' : 'Match last time (' + best + ') and keep it clean.' };
    }
    if (!last) {
      return { mode: 'find', w: ex.start, r: lo, title: 'Find your weight', why: 'First time on this machine. Start light, around ' + App.fmtKg(ex.start) + ' kg or one of the lighter pins. After set 1 I’ll help you adjust.' };
    }
    const top = Math.max.apply(null, last.sets.map((s) => s.w));
    const topSets = last.sets.filter((s) => s.w === top);
    const allTop = topSets.every((s) => s.r >= hi);
    const anyLow = topSets.some((s) => s.r < lo);
    const reps = topSets.map((s) => s.r).join(', ');
    const lastTxt = 'Last time: ' + reps + ' reps at ' + App.fmtKg(top) + ' kg' + (last.effort ? ', felt ' + effortWord(last.effort) : '') + '.';
    if (ex.assist) { // assisted machines: less help means harder
      if (last.effort === 'easy' || (allTop && last.effort !== 'hard')) return { mode: 'up', w: Math.max(0, top - step), r: lo, title: App.fmtKg(Math.max(0, top - step)) + ' kg of help', why: lastTxt + ' Take one step less help today.' };
      return { mode: 'same', w: top, r: Math.min(hi, Math.max.apply(null, topSets.map((s) => s.r)) + 1), title: App.fmtKg(top) + ' kg of help', why: lastTxt + ' Same help, one more rep.' };
    }
    if (last.effort === 'easy' || (allTop && last.effort !== 'hard')) {
      const w = top + step;
      return { mode: 'up', w, r: lo, title: App.fmtKg(w) + ' kg', why: lastTxt + ' Time to go up one step.' };
    }
    if (last.effort === 'hard' && anyLow) {
      const w = Math.max(step, top - step);
      return { mode: 'down', w, r: lo, title: App.fmtKg(w) + ' kg', why: lastTxt + ' Drop one step and own every rep.' };
    }
    const best = Math.max.apply(null, topSets.map((s) => s.r));
    return { mode: 'same', w: top, r: Math.min(hi, best + 1), title: App.fmtKg(top) + ' kg', why: lastTxt + ' Same weight, aim for ' + Math.min(hi, best + 1) + ' reps.' };
  }
  function effortWord(e) { return e === 'easy' ? 'easy' : e === 'hard' ? 'hard' : 'just right'; }
  // What the next session will ask for, shown straight after rating an exercise.
  function predictNext(id, sets, effort) {
    const ex = D.EX[id];
    const [lo, hi] = ex.reps || [10, 12];
    const step = stepOf(id);
    const done = sets.filter((s) => s.done);
    if (!done.length) return null;
    if (ex.unit === 'reps' || ex.unit === 'sec') {
      const best = Math.max.apply(null, done.map((s) => s.r));
      const next = effort === 'hard' ? best : Math.min(hi, best + (ex.unit === 'sec' ? 5 : 1));
      return { text: next + (ex.unit === 'sec' ? ' s' : ' reps'), why: next > best ? 'A little more next time.' : 'Same again next time, cleaner.' };
    }
    const top = Math.max.apply(null, done.map((s) => s.w));
    const allTop = done.filter((s) => s.w === top).every((s) => s.r >= hi);
    if (ex.assist) {
      if (effort === 'easy' || (allTop && effort !== 'hard')) return { text: App.fmtKg(Math.max(0, top - step)) + ' kg help', why: 'Less help next time. That’s progress.' };
      return { text: App.fmtKg(top) + ' kg help', why: 'Same help, chase one more rep.' };
    }
    if (effort === 'easy' || (allTop && effort !== 'hard')) return { text: App.fmtKg(top + step) + ' kg', why: 'You’re ready to go up one step next time.' };
    if (effort === 'hard' && done.some((s) => s.r < lo)) return { text: App.fmtKg(Math.max(step, top - step)) + ' kg', why: 'One step lighter, so every rep is solid.' };
    return { text: App.fmtKg(top) + ' kg', why: 'Same weight, one more rep per set.' };
  }

  // ── Weekly numbers ────────────────────────────────────────────────────────
  function sessionsInWeek(wk) { const end = addDays(wk, 6); return S().log.filter((l) => l.date >= wk && l.date <= end).length; }
  function plannedInWeek(wk) {
    const plan = S().plan; if (!plan) return 0;
    const end = addDays(wk, 6);
    const n = plan.slots.filter((s) => { const d = slotDate(s); return d >= wk && d <= end && !isSkipped(s); }).length;
    return n || 0;
  }
  function targetInWeek(wk) { const plan = S().plan; if (!plan) return 0; const n = plannedInWeek(wk); return n || (wk >= weekStart(plan.start) && wk <= plan.end ? plan.days.length : 0); }
  const FOOD_VAL = { on: 1, part: 0.5, off: 0 };
  function foodScore(wk) { let s = 0; for (let i = 0; i < 7; i++) { const f = S().food[addDays(wk, i)]; if (f) s += FOOD_VAL[f.s] || 0; } return s; }
  function foodTarget() { return 5; }
  function streakWeeks() {
    const plan = S().plan; if (!plan) return 0;
    let wk = weekStart(today());
    let n = 0;
    // this week counts once its target is met; otherwise start from last week
    if (sessionsInWeek(wk) >= Math.max(1, targetInWeek(wk))) n++;
    wk = addDays(wk, -7);
    while (wk >= weekStart(plan.start)) {
      const tgt = targetInWeek(wk);
      if (tgt && sessionsInWeek(wk) >= tgt) { n++; wk = addDays(wk, -7); } else break;
    }
    return n;
  }
  function totals() {
    const plan = S().plan;
    const total = plan ? plan.slots.length : 0;
    const done = S().log.filter((l) => l.slot).length;
    return { total, done };
  }

  // ── Rewards ───────────────────────────────────────────────────────────────
  function levelFor(xp) { let L = 0; D.LEVELS.forEach((l, i) => { if (xp >= l.xp) L = i; }); return L; }
  function levelProgress(xp) {
    const L = levelFor(xp); const cur = D.LEVELS[L]; const nxt = D.LEVELS[L + 1];
    if (!nxt) return { level: L, pct: 100, toNext: 0 };
    return { level: L, pct: Math.round(((xp - cur.xp) / (nxt.xp - cur.xp)) * 100), toNext: nxt.xp - xp };
  }
  function partnerRewards() {
    const plan = S().plan; if (!plan) return [];
    const rw = S().rewards || D.DEFAULT_REWARDS;
    const perWeek = plan.days.length;
    return Object.keys(rw).map(Number).filter((w) => w <= plan.weeks && rw[w]).map((w) => ({
      week: w, text: rw[w], need: perWeek * w, open: !!S().opened[w],
    }));
  }

  // ── Next-step prediction ─────────────────────────────────────────────────
  // One primary card plus a short "coming up" list, from the plan, logs, time and day.
  function predict() {
    const s = S(); const plan = s.plan; const p = s.profile; const t = today(); const h = hour(); const d = dow(t);
    const name = gymName(plan.gymId);
    const ups = [];
    let primary = null;
    const asthma = p.health && p.health.asthma;
    const flagged = p.health && p.health.flag && !p.health.cleared;
    const todays = slotsOn(t).filter((x) => !isDone(x));
    const miss = missed();
    const nxt = nextOpen(addDays(t, 1));
    const firstSlot = plan.slots.find((x) => !isSkipped(x));
    const wk = weekStart(t);
    const sessionLine = (key) => exercisesFor(key, 1).length + ' exercises · about ' + plan.mins + ' min';
    const daysTxt = plan.days.map((x) => DOW_LONG[x]).join(' and ');
    const evToday = s.events.filter((e) => e.date === t || e.date === addDays(t, 1)).find((e) => !e.planned);

    if (s.active) {
      const steps = s.active.steps; const exSteps = steps.filter((x) => x.t === 'ex');
      const doneEx = exSteps.filter((x) => x.sets.some((y) => y.done)).length;
      primary = { tone: 'blue', icon: 'play', kicker: 'In progress', title: 'Pick up ' + plan.sessions[s.active.key].name, sub: doneEx + ' of ' + exSteps.length + ' exercises done. Your sets are saved.', why: 'You left mid-session. Everything you logged is still here.', actions: [{ label: 'Resume session', act: 'resumeSession', icon: 'play' }] };
    } else if (flagged) {
      primary = { tone: 'yellow', icon: 'shield', kicker: 'Before your first session', title: 'Quick check with your GP', sub: 'You answered yes to a health question. A short chat with your GP is the standard next step for anyone who does.', why: 'This is the same screening Australian gyms use.', actions: [{ label: 'I’ve been cleared', act: 'healthCleared', icon: 'check' }, { label: 'Why?', act: 'coachAsk', data: 'why', ghost: true }] };
    } else if (todays.length) {
      const sl = todays[0];
      const later = h < (timeHour(plan.time) - 1);
      primary = { tone: sl.key === 'A' ? 'blue' : 'red', icon: 'dumbbell', kicker: later ? 'Today · ' + timeLabel(plan.time) : 'Today', title: plan.sessions[sl.key].name + ' today', sub: sessionLine(sl.key) + ' at ' + name + '.', why: 'You train on ' + daysTxt + ', and today’s ' + DOW_LONG[d] + '.', actions: [{ label: 'Start session', act: 'startSession', data: sl.id, icon: 'play' }, { label: 'Not today', act: 'notToday', data: sl.id, ghost: true }] };
    } else if (miss) {
      primary = { tone: 'red', icon: 'refresh', kicker: 'Missed · ' + rel(slotDate(miss)), title: 'Catch up on ' + plan.sessions[miss.key].name, sub: 'It didn’t happen. No stress. It happens to everyone.', why: 'Doing it today keeps your week on track' + (nxt && diffDays(t, slotDate(nxt)) <= 1 ? ', or skip it and carry on tomorrow.' : '.'), actions: [{ label: 'Do it today', act: 'catchUp', data: miss.id, icon: 'play' }, { label: 'Skip it', act: 'skipSlot', data: miss.id, ghost: true }] };
    } else if (evToday) {
      const gp = D.GAMEPLANS[evToday.type] || D.GAMEPLANS.gathering;
      primary = { tone: 'red', icon: gp.icon, kicker: rel(evToday.date), title: evToday.title, sub: 'Make a one-minute game plan so you can enjoy it and still have a good week.', why: 'You added this to your week.', actions: [{ label: 'Open game plan', act: 'openGameplan', data: evToday.type + '|' + evToday.id, icon: 'arrow' }] };
    } else if (h >= 18 && !s.food[t]) {
      primary = { tone: 'green', icon: 'leaf', kicker: 'Tonight', title: 'How did eating go today?', sub: 'One tap. Honest beats perfect.', why: 'Your weekly food target is ' + foodTarget() + ' on-track days.', inline: 'checkin', date: t };
    } else if (h < 11 && !s.food[addDays(t, -1)] && plan.start <= addDays(t, -1)) {
      primary = { tone: 'green', icon: 'leaf', kicker: 'Yesterday', title: 'How did eating go yesterday?', sub: 'Quick one before the day gets going.', why: 'Your weekly food target is ' + foodTarget() + ' on-track days.', inline: 'checkin', date: addDays(t, -1) };
    } else if ((d === 4 || d === 3 && h >= 17) && !s.weekends[wk]) {
      primary = { tone: 'green', icon: 'calendar', kicker: 'Before the weekend', title: 'Plan your weekend', sub: 'Two minutes now. Weekends are where most weeks slip.', why: 'Most of your off-track days come from weekends.', actions: [{ label: 'Plan my weekend', act: 'openWeekend', icon: 'arrow' }] };
    } else if (d === 6 && !s.checkins[wk] && plan.start <= t) {
      primary = { tone: 'yellow', icon: 'clipboard', kicker: 'Sunday', title: 'Your weekly check-in', sub: 'Three quick questions, then I’ll set up next week.', why: 'This is the part a coach would do with you.', actions: [{ label: 'Start check-in', act: 'openCheckin', icon: 'arrow' }] };
    } else if (firstSlot && t < slotDate(firstSlot) && !s.log.length) {
      primary = { tone: 'blue', icon: 'map', kicker: 'Day one is ' + rel(slotDate(firstSlot)).toLowerCase(), title: 'Get to know Session A', sub: 'Walk through the machines now so day one feels familiar.', why: 'Seeing it first takes most of the nerves out.', actions: [{ label: 'Preview Session A', act: 'previewSession', data: firstSlot.id, icon: 'arrow' }, { label: 'Pack my bag', act: 'openPack', ghost: true }] };
    } else if (nxt && diffDays(t, slotDate(nxt)) === 1) {
      primary = { tone: 'ink', icon: 'bag', kicker: 'Tomorrow', title: plan.sessions[nxt.key].name + ' tomorrow', sub: 'Pack your bag tonight: water, towel' + (asthma ? ', puffer' : '') + ' and shoes.', why: 'Packing the night before is the easiest way to show up.', actions: [{ label: 'Pack my bag', act: 'openPack', icon: 'check' }, { label: 'Preview', act: 'previewSession', data: nxt.id, ghost: true }] };
    } else if (nxt) {
      primary = { tone: 'green', icon: 'sun', kicker: 'Rest day', title: 'Recover and refuel', sub: 'Next session: ' + rel(slotDate(nxt)) + '. A 20-minute walk counts today.', why: 'Muscles get stronger on rest days, not during the session.', actions: [{ label: 'Preview next session', act: 'previewSession', data: nxt.id, ghost: true }] };
    } else {
      primary = { tone: 'yellow', icon: 'trophy', kicker: 'Plan complete', title: 'You did it', sub: 'Every week of your plan is behind you.', why: 'Next comes your new plan. Talk to Spotter about what you want next.', actions: [{ label: 'Talk to Spotter', act: 'openCoach', icon: 'chat' }] };
    }

    // Coming up
    const upcoming = openSlots().filter((x) => slotDate(x) > t && (!primary || primary.actions == null || !primary.actions.some((a) => a.data === x.id))).sort((a, b) => (slotDate(a) < slotDate(b) ? -1 : 1)).slice(0, 2);
    upcoming.forEach((x) => ups.push({ when: rel(slotDate(x)), title: plan.sessions[x.key].name + ' · ' + plan.sessions[x.key].title, icon: 'dumbbell', tone: x.key === 'A' ? 'blue' : 'red', act: 'previewSession', data: x.id }));
    s.events.filter((e) => e.date > t && diffDays(t, e.date) <= 7).slice(0, 2).forEach((e) => {
      const gp = D.GAMEPLANS[e.type] || D.GAMEPLANS.gathering;
      ups.push({ when: rel(e.date), title: e.title + (e.planned ? '' : ' · make a plan'), icon: gp.icon, tone: gp.color, act: 'openGameplan', data: e.type + '|' + e.id });
    });
    if (d <= 5 && d >= 3 && !s.weekends[wk] && !(primary && primary.title === 'Plan your weekend')) ups.push({ when: d === 5 ? 'Today' : 'This weekend', title: 'Plan your weekend', icon: 'calendar', tone: 'green', act: 'openWeekend' });
    if (d === 6 && !s.checkins[wk] && !(primary && primary.title === 'Your weekly check-in') && plan.start <= t) ups.push({ when: 'Today', title: 'Weekly check-in', icon: 'clipboard', tone: 'yellow', act: 'openCheckin' });
    const pr = partnerRewards().find((r) => !r.open);
    if (pr) { const left = Math.max(0, pr.need - totals().done); if (left > 0) ups.push({ when: 'Reward · week ' + pr.week, title: left + ' ' + App.plural(left, 'session') + ' to: ' + pr.text, icon: 'gift', tone: 'yellow', act: 'go', data: 'journey' }); }
    return { primary, ups: ups.slice(0, 4) };
  }
  function timeHour(id) { const t = D.TIMES.find((x) => x.id === id); return t ? t.hour : 18; }
  function timeLabel(id) { const t = D.TIMES.find((x) => x.id === id); return t ? t.label.toLowerCase() : ''; }

  // Short contextual tip for the Today screen.
  function dailyTip() {
    const p = S().profile; const t = today();
    const tips = [];
    if (p.worries && p.worries.includes('watched')) tips.push({ text: 'Feeling watched is normal at first. Headphones in, plan open, and you look like a regular.', ask: 'watched' });
    if (p.health && p.health.asthma) tips.push({ text: 'Asthma tip: keep your warm-up gradual and your reliever in your bag every session.', ask: 'asthma' });
    if (p.derailers && p.derailers.includes('gatherings')) tips.push({ text: 'Family gathering coming up? A one-minute game plan lets you enjoy it without a guilty Monday.', ask: 'gathering' });
    if (p.worries && p.worries.includes('busy')) tips.push({ text: 'Machine taken? Ask "mind if I work in?" or tap Swap during your session.', ask: 'taken' });
    tips.push({ text: 'Soreness 1 to 3 days after training is normal in the first weeks. A walk helps.', ask: 'sore' });
    tips.push({ text: 'Two sessions a week you actually do beats four you skip.', ask: 'enough' });
    return tips[(App.parse(t).getDate()) % tips.length];
  }

  App.E = {
    buildPlan, availableAt, gymOf, gymName, phaseFor,
    slotDate, isDone, isSkipped, openSlots, slotsOn, nextOpen, missed, slotById, exercisesFor, sessionMinutes,
    lastPerf, suggest, predictNext, effortWord, stepOf,
    sessionsInWeek, plannedInWeek, targetInWeek, foodScore, foodTarget, streakWeeks, totals,
    levelFor, levelProgress, partnerRewards, predict, dailyTip, timeLabel, timeHour,
  };
})();
