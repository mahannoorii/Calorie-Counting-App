/* Spotter — the coach's brain: Claude, called straight from the phone with the member's own
   Anthropic API key. It reads the member's whole training picture (program, every recent
   set, records, food, what's coming up), answers like a trainer who knows them, and can
   change the plan with tools: move, skip, ease or shorten a session, swap an exercise, set
   the next target, log food, put a restaurant's picks on screen. Replies stream in.
   The key is kept in its own storage slot on this phone, never in backups. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const S = () => App.S;
  const { today, addDays, fmtDate, dow, DOW_LONG } = App;

  const KEY_SLOT = 'spotter.claudeKey';
  const SDK_URL = 'vendor/anthropic-sdk-1.4.0.js';
  // $ per million tokens: input, output, cache read; cache writes cost 1.25 × input
  const MODELS = {
    'claude-opus-5-5': { name: 'Claude Opus 5.5', note: 'Smartest. About 1–5¢ a message.', p: [4, 20, 0.2], fb: true },
    'claude-sonnet-5-5': { name: 'Claude Sonnet 5.5', note: 'Faster, about half the price.', p: [2, 10, 0.1], fb: true },
    'claude-haiku-5-5': { name: 'Claude Haiku 5.5', note: 'Quickest and cheapest. Less depth.', p: [0.1, 0.5, 0.01] },
  };
  const DEFAULT_MODEL = 'claude-opus-5-5';
  const MAX_STEPS = 6; // tool rounds per message

  // ── Key and settings ──────────────────────────────────────────────────────
  function getKey() { try { return localStorage.getItem(KEY_SLOT) || ''; } catch (e) { return ''; } }
  function setKey(k) { try { if (k) localStorage.setItem(KEY_SLOT, k); else localStorage.removeItem(KEY_SLOT); } catch (e) {} client = null; }
  function settings() { const s = S(); if (!s.ai) s.ai = { model: DEFAULT_MODEL, usage: {} }; if (!MODELS[s.ai.model]) s.ai.model = DEFAULT_MODEL; return s.ai; }
  function ready() { return !!getKey(); }
  function modelName() { return MODELS[settings().model].name; }
  // Server-side fallback if a safety check declines a message (Opus and Sonnet have it).
  function fallback(model) { return MODELS[model].fb ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}; }

  let sdk = null; let client = null;
  function loadSDK() { if (!sdk) sdk = import(new URL(SDK_URL, document.baseURI).href).then((m) => m.default).catch((e) => { sdk = null; throw e; }); return sdk; }
  function getClient() {
    return loadSDK().then((Anthropic) => {
      if (!client) client = new Anthropic({ apiKey: getKey(), dangerouslyAllowBrowser: true, maxRetries: 2, timeout: 90000 });
      return { Anthropic, client };
    });
  }

  // What this month's messages have cost, worked out from the usage on each reply.
  function addUsage(model, u) {
    if (!u) return;
    const m = MODELS[model] || MODELS[DEFAULT_MODEL]; const [pi, po, pc] = m.p;
    const cost = ((u.input_tokens || 0) * pi + (u.cache_creation_input_tokens || 0) * pi * 1.25 + (u.cache_read_input_tokens || 0) * pc + (u.output_tokens || 0) * po) / 1e6;
    const mo = today().slice(0, 7); const us = settings().usage;
    Object.keys(us).forEach((k) => { if (k < mo.slice(0, 4) + '-00' && k !== mo) delete us[k]; });
    const cur = us[mo] || (us[mo] = { msgs: 0, usd: 0 });
    cur.usd = Math.round((cur.usd + cost) * 10000) / 10000;
  }
  function countMessage() { const mo = today().slice(0, 7); const us = settings().usage; const cur = us[mo] || (us[mo] = { msgs: 0, usd: 0 }); cur.msgs++; }
  function monthUsage() { return settings().usage[today().slice(0, 7)] || { msgs: 0, usd: 0 }; }

  // ── What the coach knows ──────────────────────────────────────────────────
  const kg = (w) => App.fmtKg(w);
  const e1rm = (w, r) => (r > 0 ? w * (1 + r / 30) : 0);
  function exName(id) { return (D.EX[id] && D.EX[id].name) || id; }
  function setsText(id, sets) {
    const ex = D.EX[id] || {};
    if (ex.unit === 'sec') return sets.map((s) => s.r + 's').join(', ');
    if (ex.unit === 'reps' || ex.unit === 'min') return sets.map((s) => s.r).join(', ') + (ex.unit === 'min' ? ' min' : ' reps');
    // group equal weights: 60×8,8,7 · 62.5×6
    const out = []; sets.forEach((s) => { const last = out[out.length - 1]; if (last && last.w === s.w) last.r.push(s.r); else out.push({ w: s.w, r: [s.r] }); });
    return out.map((g) => kg(g.w) + (ex.assist ? 'kg help' : '') + '×' + g.r.join(',')).join(' · ');
  }
  function slotLine(sl) {
    const E = App.E; const d = E.slotDate(sl); const st = E.isDone(sl) ? 'done' : E.isSkipped(sl) ? 'skipped' : d < today() ? 'missed' : 'planned';
    const extra = [S().trims[sl.id] ? 'cut to ' + S().trims[sl.id] + ' exercises' : '', S().eases[sl.id] ? 'eased (' + S().eases[sl.id] + ')' : '', S().moves[sl.id] ? 'moved from ' + fmtDate(sl.date, 'short') : ''].filter(Boolean).join(', ');
    return '- ' + fmtDate(d, 'short') + ': ' + E.sessionName(sl) + ' [session_id ' + sl.id + '] ' + st + (extra ? ' (' + extra + ')' : '');
  }
  // A plain-text snapshot of everything the coach needs. Deterministic for the same data, so
  // the prompt cache holds between messages.
  function snapshot() {
    const s = S(); const p = s.profile || {}; const plan = s.plan; const E = App.E; const t = today(); const L = [];
    const sec = (title) => L.push('', '## ' + title);
    L.push('Today is ' + DOW_LONG[dow(t)] + ' ' + fmtDate(t, 'dm') + ' ' + t.slice(0, 4) + ' (' + t + ').');
    sec('Member');
    L.push('Name: ' + (p.name || 'not given'));
    if (p.experience) L.push('Experience: ' + ((D.EXPERIENCE.find((x) => x.id === p.experience) || {}).label || p.experience));
    if (p.goals && p.goals.length) L.push('Goals: ' + p.goals.map((g) => (D.GOALS.find((x) => x.id === g) || {}).label || g).join(', '));
    if (p.why) L.push('Their why: ' + p.why);
    if (p.worries && p.worries.length) L.push('What gets in the way: ' + p.worries.join(', '));
    if (p.focus && p.focus.length) L.push('Wants to bring up: ' + p.focus.join(', '));
    if (p.health) L.push('Asthma: ' + (p.health.asthma ? 'yes (reliever puffer)' : 'no') + (p.health.flag ? '. Flagged a health question' + (p.health.cleared ? ', cleared by GP' : ', not yet cleared by a GP') : ''));
    if (p.cuisines && p.cuisines.length) L.push('Food they eat: ' + p.cuisines.map((c) => (D.CUISINES.find((x) => x.id === c) || {}).name || c).join(', '));
    if (plan) {
      sec('Gym');
      const g = E.gym();
      L.push((g ? g.name : 'Unknown gym') + '. Equipment: ' + (g && g.kit ? g.kit.map((k) => D.EQUIP_NAME[k] || k).join(', ') : 'unknown') + '.');
      sec('Program');
      L.push((plan.own ? 'Their own program' + (p.program && p.program.source ? ', carried over from ' + p.program.source : '') : (E.SPLITS[plan.split] || {}).name || plan.split) + '. Trains ' + plan.days.map((d) => DOW_LONG[d]).join(', ') + ', about ' + plan.mins + ' min. Plan runs ' + plan.start + ' to ' + plan.end + ' (' + plan.weeks + ' weeks).' + (plan.deload ? ' Every 4th week is lighter.' : '') + (plan.event ? ' Working towards ' + plan.event.name + ' on ' + plan.event.date + '.' : ''));
      (plan.order || Object.keys(plan.sessions)).forEach((k) => {
        const ss = plan.sessions[k];
        L.push('- ' + ss.name + ' (' + (ss.title || '') + '): ' + E.exercisesFor(k, 1).map((x) => exName(x.id) + ' [' + x.id + '] ' + x.sets + '×' + (x.reps ? x.reps.join('–') : (D.EX[x.id].reps || []).join('–'))).join('; '));
      });
      const swaps = Object.keys(s.swaps || {}); if (swaps.length) L.push('Swaps they made: ' + swaps.map((b) => exName(b) + ' → ' + exName(s.swaps[b])).join('; '));
      sec('Schedule (session ids for tools)');
      E.allSlots().concat(plan.slots.filter((x) => E.isSkipped(x))).filter((sl) => { const d = E.slotDate(sl); return d >= addDays(t, -10) && d <= addDays(t, 14); })
        .sort((a, b) => (E.slotDate(a) < E.slotDate(b) ? -1 : 1)).forEach((sl) => L.push(slotLine(sl)));
      const w = E.week(); L.push('This week so far: ' + w.train + ' of ' + w.trainMax + ' sessions, ' + kg(w.eat) + ' of 5 good food days. Weeks on target in a row: ' + E.streakWeeks() + '.');
      if (s.active) L.push('A session is in progress right now: ' + E.sessionName({ key: s.active.key }) + '.');
    }
    // Recent sessions in full
    sec('Last sessions (newest first)');
    const log = s.log.slice(-10).reverse();
    if (!log.length) L.push('None logged yet.');
    log.forEach((l) => {
      const name = plan && plan.sessions[l.key] ? plan.sessions[l.key].name : l.key || 'Session';
      L.push('- ' + fmtDate(l.date, 'short') + ' ' + l.date.slice(0, 4) + ', ' + name + (l.imported ? ' (logged in Iron Log)' : '') + (l.mins ? ', ' + l.mins + ' min' : '') + (l.mood ? ', felt ' + l.mood : '') + ':');
      l.ex.forEach((e) => L.push('    ' + exName(e.id) + ': ' + setsText(e.id, e.sets) + (e.effort ? ' (' + E.effortWord(e.effort) + ')' : '')));
      (l.prs || []).forEach((pr) => L.push('    PR: ' + exName(pr.id) + ' ' + E.prText(pr.id, pr).title));
    });
    // Every lift, summarised
    sec('Every exercise they have logged');
    const by = {};
    s.log.forEach((l) => l.ex.forEach((e) => { if (e.sets.length) (by[e.id] = by[e.id] || []).push({ date: l.date, sets: e.sets }); }));
    const cutoff = addDays(t, -56);
    Object.keys(by).sort((a, b) => (by[b][by[b].length - 1].date < by[a][by[a].length - 1].date ? -1 : 1)).forEach((id) => {
      const h = by[id]; const ex = D.EX[id] || {}; const last = h[h.length - 1]; const best = App.E.bestOf(id);
      let trend = '';
      if (ex.unit === 'kg' && !ex.assist) {
        const top = (x) => Math.max.apply(null, x.sets.map((s2) => e1rm(s2.w, s2.r)));
        const old = h.filter((x) => x.date <= cutoff).pop();
        if (old) { const d = top(last) - top(old); trend = '; est. 1RM ' + kg(Math.round(top(last))) + ' kg, ' + (d >= 0 ? '+' : '') + kg(Math.round(d * 10) / 10) + ' kg vs 8 weeks ago'; }
      }
      const tg = s.targets && s.targets[id];
      L.push('- ' + exName(id) + ' [' + id + ']: ' + h.length + ' sessions; last ' + last.date + ' ' + setsText(id, last.sets) + (best ? '; best ' + best.text : '') + trend + (tg ? '; coach target set: ' + (tg.w ? kg(tg.w) + ' kg × ' : '') + tg.r : ''));
    });
    if (!Object.keys(by).length) L.push('Nothing yet.');
    // Food
    sec('Eating, last 14 days');
    const fd = []; for (let i = 13; i >= 0; i--) { const d = addDays(t, -i); const f = s.food[d]; if (f) fd.push(fmtDate(d, 'short') + ' ' + ({ on: 'on track', part: 'partly', off: 'off track' }[f.s] || f.s) + (f.why ? ' (' + f.why + ')' : '')); }
    L.push(fd.length ? fd.join('; ') : 'Nothing logged.');
    const evs = (s.events || []).filter((e) => e.date >= t).slice(0, 5);
    if (evs.length) L.push('Coming up: ' + evs.map((e) => e.title + ' ' + fmtDate(e.date, 'short')).join('; '));
    if (s.places && s.places.length) L.push('Recent restaurants: ' + s.places.slice(0, 5).map((x) => x.name).join(', '));
    L.push('Restaurant cuisines the app has menus for: ' + Object.keys(D.MENUS).join(', ') + '.');
    return L.join('\n');
  }
  function nowLine() {
    const d = new Date(App.nowMs()); const h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
    const ss = App.Coach.sessionContext && App.Coach.sessionContext();
    let where = '';
    if (ss && ss.exId) { const sg = App.E.suggest(ss.exId, ss.slot); where = ' They are in the gym mid-session, on the ' + exName(ss.exId) + ' [' + ss.exId + ']. The app is suggesting ' + sg.title + ' (' + sg.why + ').'; }
    return 'Now: ' + DOW_LONG[dow(today())] + ' ' + fmtDate(today(), 'dm') + ', ' + ((h % 12) || 12) + ':' + m + (h < 12 ? ' am' : ' pm') + '.' + where;
  }

  const RULES = [
    'You are the personal trainer inside Spotter, a training and eating app. You text with one member, the person in the data below. You know their program, every session they have logged, their records, their gym\'s equipment and how they have been eating, so answer about them, with their numbers, never generically.',
    '',
    'How to write:',
    '- Like a good coach texting a client: warm, direct, specific. Usually 1 to 4 short sentences. Go longer only when they ask for a breakdown or a plan, and then use short lines, not essays.',
    '- Plain text only. The app does not render markdown: no asterisks, no #, no tables. Simple "- " lines are fine for a short list.',
    '- Australian English, kilograms. Use the member\'s first name sparingly.',
    '- Quote real numbers from their history (dates, weights, reps, trends) when it helps. If the data does not show something, say so instead of guessing.',
    '- Ask at most one question at a time.',
    '- When a couple of quick replies would help, end with one final line in exactly this form, max 3 options of up to 5 words each, written in the member\'s voice: [[Option one|Option two]]',
    '',
    'Training advice:',
    '- Progressive overload in small steps that match their equipment (their gym\'s dumbbells go up in fixed jumps; machines usually 2.5 to 5 kg). Respect the reps ranges in their program.',
    '- Stalled lifts: look at the actual trend before advising (rep targets, a lighter week, a variation, rest, sleep, food).',
    '- Only suggest exercises their gym can do. Use search_exercises to find them and use the ids it returns.',
    '',
    'Doing things:',
    '- You can change their plan with your tools. When they ask for a change, or clearly agree to one you offered, do it, then say in one line what you changed. Don\'t ask permission for something they just asked for.',
    '- Never change the plan just because it seems like a good idea. Offer it and wait for a yes.',
    '- Use the session ids from the schedule. Dates are YYYY-MM-DD.',
    '- For deeper history on one lift, call get_exercise_history.',
    '',
    'Safety:',
    '- General fitness and healthy-eating guidance only. Never diagnose, never prescribe medication or supplements, and don\'t set calorie targets.',
    '- Sharp pain, a joint that feels wrong, dizziness, chest pain or breathing trouble: tell them to stop. Asthma: use the reliever as their action plan says. If it does not settle, see a GP or physio; chest pain or a reliever that is not helping means calling 000.',
    '- If asked whether you are a person, say you are their Spotter coach, powered by Claude.',
  ].join('\n');

  // ── Tools ─────────────────────────────────────────────────────────────────
  const str = (d) => ({ type: 'string', description: d });
  const TOOLS = [
    { name: 'get_exercise_history', description: 'Every logged session of one exercise, oldest first, with all sets. Use for detailed questions about a lift.', input_schema: { type: 'object', properties: { exercise_id: str('Exercise id, e.g. lat_pulldown') }, required: ['exercise_id'] } },
    { name: 'search_exercises', description: 'Find exercises in the app\'s library by name, muscle or movement. Says whether their gym has the equipment and whether it is in their plan. Use before suggesting or swapping in an exercise.', input_schema: { type: 'object', properties: { query: str('Words to match, e.g. "rear delt", "hamstrings", "row"'), gym_only: { type: 'boolean', description: 'Only exercises their gym can do (default true)' } }, required: ['query'] } },
    { name: 'move_session', description: 'Move a planned session to another day.', input_schema: { type: 'object', properties: { session_id: str('From the schedule'), new_date: str('YYYY-MM-DD') }, required: ['session_id', 'new_date'] } },
    { name: 'skip_session', description: 'Skip a planned session. The plan carries on with the next one.', input_schema: { type: 'object', properties: { session_id: str('From the schedule') }, required: ['session_id'] } },
    { name: 'adjust_session', description: 'Make one planned session easier: "ease" takes one weight step off (for soreness), "short" cuts it to the 3 or 4 exercises that matter most (for little time).', input_schema: { type: 'object', properties: { session_id: str('From the schedule'), change: { type: 'string', enum: ['ease', 'short'] }, area: { type: 'string', enum: ['legs', 'upper', 'all'], description: 'For ease: which exercises (default all)' }, exercises: { type: 'integer', enum: [3, 4], description: 'For short: how many exercises to keep (default 3)' } }, required: ['session_id', 'change'] } },
    { name: 'swap_exercise', description: 'Replace an exercise everywhere in their plan from now on. The new one must be possible at their gym.', input_schema: { type: 'object', properties: { from_exercise_id: str('Exercise in their plan'), to_exercise_id: str('Replacement, from search_exercises') }, required: ['from_exercise_id', 'to_exercise_id'] } },
    { name: 'set_next_target', description: 'Set the weight and reps the app will suggest next time they do an exercise (replaces the automatic suggestion once).', input_schema: { type: 'object', properties: { exercise_id: str('Exercise id'), weight_kg: { type: 'number', description: 'Weight in kg (0 for bodyweight; kg of help for assisted machines)' }, reps: { type: 'integer', description: 'Target reps (or seconds for holds)' }, why: str('Short reason shown to them, under 12 words') }, required: ['exercise_id', 'weight_kg', 'reps', 'why'] } },
    { name: 'log_food', description: 'Log how eating went on a day.', input_schema: { type: 'object', properties: { date: str('YYYY-MM-DD, usually today'), rating: { type: 'string', enum: ['on', 'part', 'off'] } }, required: ['date', 'rating'] } },
    { name: 'show_restaurant_picks', description: 'Put the app\'s menu card for a restaurant on screen: three picks with what to ask for, which they can lock in. Use when they say where they are eating.', input_schema: { type: 'object', properties: { restaurant: str('Restaurant name as they said it'), cuisine: { type: 'string', enum: Object.keys(D.MENUS) } }, required: ['restaurant', 'cuisine'] } },
  ].map((t) => Object.assign(t, { eager_input_streaming: true }));

  const isStr = (x) => typeof x === 'string' && x.trim().length > 0;
  const isDate = (x) => isStr(x) && /^\d{4}-\d{2}-\d{2}$/.test(x);
  function slotOrErr(id) { const sl = App.E.slotById(id); if (!sl) throw new Error('No session with id ' + id + '. Use an id from the schedule.'); return sl; }
  function exOrErr(id) { if (!isStr(id) || !D.EX[id]) throw new Error('Unknown exercise id ' + id + '. Use search_exercises.'); return D.EX[id]; }
  const changed = []; // what the tools did this message, for the screen to refresh

  const RUN = {
    get_exercise_history(i) {
      exOrErr(i.exercise_id);
      const rows = S().log.filter((l) => l.ex.some((e) => e.id === i.exercise_id && e.sets.length)).map((l) => { const e = l.ex.find((x) => x.id === i.exercise_id); return l.date + ': ' + setsText(e.id, e.sets) + (e.effort ? ' (' + App.E.effortWord(e.effort) + ')' : ''); });
      return rows.length ? exName(i.exercise_id) + ', ' + rows.length + ' sessions:\n' + rows.join('\n') : 'No sessions of ' + exName(i.exercise_id) + ' logged yet.';
    },
    search_exercises(i) {
      if (!isStr(i.query)) throw new Error('query is required');
      const words = i.query.toLowerCase().split(/\s+/).filter(Boolean); const gymOnly = i.gym_only !== false;
      const inPlan = new Set(App.E.planIds ? App.E.planIds() : []);
      const hits = Object.keys(D.EX).map((id) => {
        const ex = D.EX[id]; const hay = [id, ex.name, ex.focus, ex.pat, (ex.aka || []).join(' '), (ex.muscles || []).join(' '), (ex.muscles2 || []).join(' ')].join(' ').toLowerCase();
        return { id, ex, score: words.filter((w) => hay.includes(w)).length };
      }).filter((x) => x.score > 0 && (!gymOnly || App.E.canDo(x.id))).sort((a, b) => b.score - a.score || a.ex.lvl - b.ex.lvl).slice(0, 15);
      if (!hits.length) return 'No matches' + (gymOnly ? ' their gym can do' : '') + '.';
      return hits.map((x) => x.id + ': ' + x.ex.name + ' (' + (x.ex.focus || x.ex.pat) + '; equipment: ' + (x.ex.eq.map((k) => D.EQUIP_NAME[k] || k).join(', ') || 'none') + (App.E.canDo(x.id) ? '' : '; NOT at their gym') + (inPlan.has(x.id) ? '; in their plan' : '') + ')').join('\n');
    },
    move_session(i) {
      const sl = slotOrErr(i.session_id); if (!isDate(i.new_date)) throw new Error('new_date must be YYYY-MM-DD');
      if (App.E.isDone(sl)) throw new Error('That session is already done.');
      if (i.new_date < today()) throw new Error('Can\'t move a session into the past.');
      S().moves[sl.id] = i.new_date; changed.push('Moved ' + App.E.sessionName(sl) + ' to ' + fmtDate(i.new_date, 'long'));
      return 'Moved ' + App.E.sessionName(sl) + ' to ' + i.new_date + '.';
    },
    skip_session(i) {
      const sl = slotOrErr(i.session_id); if (App.E.isDone(sl)) throw new Error('That session is already done.');
      S().skips[sl.id] = true; changed.push('Skipped ' + App.E.sessionName(sl) + ' on ' + fmtDate(App.E.slotDate(sl), 'long'));
      return 'Skipped.';
    },
    adjust_session(i) {
      const sl = slotOrErr(i.session_id);
      if (i.change === 'ease') { const a = ['legs', 'upper', 'all'].includes(i.area) ? i.area : 'all'; S().eases[sl.id] = a; changed.push('Eased ' + App.E.sessionName(sl) + (a === 'all' ? '' : ' (' + a + ')') + ' one step'); return 'Eased ' + a + ' one weight step.'; }
      if (i.change === 'short') { const n = i.exercises === 4 ? 4 : 3; S().trims[sl.id] = n; changed.push('Cut ' + App.E.sessionName(sl) + ' to ' + n + ' exercises'); return 'Cut to the ' + n + ' main exercises: ' + App.E.exercisesFor(sl.key, sl.week, sl.id).map((x) => exName(x.id)).join(', ') + '.'; }
      throw new Error('change must be ease or short');
    },
    swap_exercise(i) {
      exOrErr(i.from_exercise_id); exOrErr(i.to_exercise_id);
      if (!App.E.canDo(i.to_exercise_id)) throw new Error(exName(i.to_exercise_id) + ' needs equipment their gym doesn\'t have.');
      const plan = S().plan; let base = null;
      Object.keys(plan.sessions).forEach((k) => (plan.sessions[k].items || []).forEach((it) => { const cur = S().swaps[it.id] || it.id; if (it.id === i.from_exercise_id || cur === i.from_exercise_id) base = it.id; }));
      if (!base) throw new Error(exName(i.from_exercise_id) + ' isn\'t in their plan.');
      if (base === i.to_exercise_id) delete S().swaps[base]; else S().swaps[base] = i.to_exercise_id;
      changed.push('Swapped ' + exName(i.from_exercise_id) + ' for ' + exName(i.to_exercise_id));
      return 'Swapped in the plan from now on.';
    },
    set_next_target(i) {
      const ex = exOrErr(i.exercise_id);
      const w = Number(i.weight_kg); const r = Math.round(Number(i.reps));
      if (!(w >= 0 && w < 1000) || !(r > 0 && r < 1000)) throw new Error('weight_kg and reps must be sensible numbers');
      S().targets = S().targets || {};
      S().targets[i.exercise_id] = { w: Math.round(w * 4) / 4, r, why: String(i.why || '').slice(0, 90), n: S().log.length };
      changed.push('Next ' + ex.name + ': ' + (ex.unit === 'kg' ? kg(w) + ' kg × ' + r : r + (ex.unit === 'sec' ? ' s' : ' reps')));
      return 'Set. The app will suggest this next time.';
    },
    log_food(i) {
      if (!isDate(i.date) || i.date > today()) throw new Error('date must be today or earlier, YYYY-MM-DD');
      if (!['on', 'part', 'off'].includes(i.rating)) throw new Error('rating must be on, part or off');
      App.logFood(i.date, i.rating, true); changed.push('Logged eating ' + ({ on: 'on track', part: 'partly on track', off: 'off track' }[i.rating]) + ' for ' + fmtDate(i.date, 'short'));
      return 'Logged.';
    },
    show_restaurant_picks(i) {
      if (!isStr(i.restaurant) || !D.MENUS[i.cuisine]) throw new Error('restaurant and a listed cuisine are required');
      const name = i.restaurant.replace(/\|/g, '/').slice(0, 60);
      App.rememberPlace(name, i.cuisine); App.E.track('eatout');
      pendingCard = { type: 'menu', place: name, cuisine: i.cuisine };
      pendingReplies = [{ label: 'Lock it in', act: 'lock', data: name + '|' + i.cuisine }, { label: 'See the full menu', act: 'openMenu', data: name + '|' + i.cuisine }];
      const M = D.MENUS[i.cuisine]; const picks = (App.Views.placeMenu(name) || {}).picks || (M.items || []).filter((x) => x.t === 'pick').slice(0, 3);
      return 'Card shown with these picks: ' + picks.map((x) => x.n + (x.mods && x.mods.length ? ' (ask for: ' + x.mods.join(', ') + ')' : x.tip ? ' (' + x.tip + ')' : '')).join('; ') + '. Don\'t repeat them in full; add your own short take.';
    },
  };
  let pendingCard = null; let pendingReplies = null;

  // ── The conversation ──────────────────────────────────────────────────────
  function history() {
    const out = [];
    S().chat.slice(-40).forEach((m) => {
      let role; let text;
      if (m.from === 'me') { role = 'user'; text = m.img ? '[sent a photo of a menu]' : m.text; }
      else if (m.from === 'note') { role = 'assistant'; text = '(Done in the app: ' + m.text + ')'; }
      else { role = 'assistant'; text = m.text + (m.card && m.card.type === 'menu' ? '\n(Showed the menu card for ' + (m.card.place || 'a restaurant') + ')' : ''); }
      if (!text) return;
      const last = out[out.length - 1];
      if (last && last.role === role) last.content += '\n\n' + text; else out.push({ role, content: text });
    });
    if (out.length && out[0].role === 'assistant') out.unshift({ role: 'user', content: '(Opened the coach chat.)' });
    return out;
  }
  // Pull "[[a|b]]" quick replies off the end of the text.
  function splitReplies(text) {
    const m = text.match(/\n?\s*\[\[([^\]]*)\]\]\s*$/);
    if (!m) return { text: text.trim(), replies: [] };
    return { text: text.slice(0, m.index).trim(), replies: m[1].split('|').map((x) => x.trim()).filter(Boolean).slice(0, 3).map((x) => ({ label: x.slice(0, 40), say: true })) };
  }
  const visible = (t) => t.replace(/\n?\s*\[\[[^\]]*$/, '').replace(/\n?\s*\[\[[^\]]*\]\]\s*$/, '');

  function errorText(Anthropic, e) {
    if (Anthropic && e instanceof Anthropic.AuthenticationError) return 'Your Claude key didn’t work. Check it in Profile → Coach.';
    if (Anthropic && e instanceof Anthropic.PermissionDeniedError) return 'Your Claude key doesn’t have access to that model. Try another in Profile → Coach.';
    if (Anthropic && e instanceof Anthropic.RateLimitError) return 'I’m getting too many messages at once. Give it a minute and try again.';
    if (Anthropic && e instanceof Anthropic.BadRequestError && /credit|balance|billing/i.test(e.message || '')) return 'Your Anthropic account is out of credit. Top it up at console.anthropic.com, then try again.';
    if (Anthropic && e instanceof Anthropic.APIConnectionError) return 'I can’t reach Claude right now. Check you’re online and try again.';
    if (Anthropic && e instanceof Anthropic.APIError) return 'Claude had a problem (' + (e.status || 'error') + '). Try again in a moment.';
    if (!navigator.onLine) return 'You’re offline. I’ll be here when you’re back.';
    return 'Something went wrong reaching Claude. Try again in a moment.';
  }

  // Send the conversation to Claude and stream the answer into a coach bubble.
  // hooks: { start(), text(visibleSoFar), done({text, replies, card, error}) }
  async function reply(hooks) {
    const model = settings().model; changed.length = 0; pendingCard = null; pendingReplies = null;
    countMessage();
    let Anthropic = null; let full = ''; let error = null;
    try {
      const c = await getClient(); Anthropic = c.Anthropic;
      const system = [{ type: 'text', text: RULES }, { type: 'text', text: '# Everything about this member (from the app)\n\n' + snapshot() }];
      const messages = history();
      messages.push({ role: 'system', content: nowLine() });
      hooks.start && hooks.start();
      for (let step = 0; step < MAX_STEPS; step++) {
        const stream = c.client.beta.messages.stream(Object.assign({
          model, max_tokens: 64000, thinking: { type: 'adaptive' }, output_config: { effort: 'medium' },
          cache_control: { type: 'ephemeral' }, system, tools: TOOLS, messages,
        }, fallback(model)));
        // a short "let me check" before a tool call shows while the tool runs, then the answer replaces it
        const before = full; let first = true;
        stream.on('text', (delta) => { if (first) { full = step > 0 ? '' : full; first = false; } full += delta; hooks.text && hooks.text(visible(full)); });
        let msg;
        try { msg = await stream.finalMessage(); } catch (e) {
          if (e instanceof Anthropic.APIError || step >= MAX_STEPS - 1) throw e;
          full = before; hooks.text && hooks.text(visible(full));
          continue; // tool input that didn't parse, or a dropped connection: ask again
        }
        addUsage(model, msg.usage);
        // declined even after the fallback: drop the partial answer
        if (msg.stop_reason === 'refusal') { full = (before ? before + '\n\n' : '') + 'That’s not something I can help with. Ask me anything about your training or food.'; break; }
        const uses = msg.content.filter((b) => b.type === 'tool_use');
        if (!uses.length || msg.stop_reason === 'end_turn') break;
        if (msg.stop_reason === 'max_tokens') break;
        messages.push({ role: 'assistant', content: msg.content });
        const results = uses.map((u) => {
          const fn = RUN[u.name];
          try {
            if (!fn) throw new Error('Unknown tool ' + u.name);
            if (!u.input || typeof u.input !== 'object') throw new Error('Input was not an object');
            return { type: 'tool_result', tool_use_id: u.id, content: String(fn(u.input)) };
          } catch (e) { return { type: 'tool_result', tool_use_id: u.id, is_error: true, content: e.message || 'Failed' }; }
        });
        messages.push({ role: 'user', content: results });
        if (changed.length) { App.save(); hooks.changed && hooks.changed(changed.slice()); }
      }
    } catch (e) {
      error = errorText(Anthropic, e);
      if (window.console) console.warn('Coach AI', e);
    }
    App.save();
    const out = splitReplies(full);
    return { text: out.text, replies: pendingReplies || out.replies, card: pendingCard, error, changed: changed.slice() };
  }

  // ── Menu photos ───────────────────────────────────────────────────────────
  function fileToJpeg(file, max) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); resolve(cv.toDataURL('image/jpeg', 0.85).split(',')[1]); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }
  const MENU_SCHEMA = {
    type: 'object', additionalProperties: false, required: ['place', 'cuisine', 'picks', 'treats'],
    properties: {
      place: { type: 'string' }, cuisine: { type: 'string' },
      picks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['n', 'why', 'mods'], properties: { n: { type: 'string' }, why: { type: 'string' }, mods: { type: 'array', items: { type: 'string' } } } } },
      treats: { type: 'array', items: { type: 'string' } },
    },
  };
  // Same contract as the preview's menu reader: {place, cuisine, picks:[{n, why, mods}], treats}
  async function readMenu(file, prompt) {
    const c = await getClient(); const model = settings().model;
    const data = await fileToJpeg(file, 1568);
    countMessage();
    const msg = await c.client.beta.messages.create(Object.assign({
      model, max_tokens: 16000,
      thinking: { type: 'adaptive' }, output_config: { effort: 'medium', format: { type: 'json_schema', schema: MENU_SCHEMA } },
      system: [{ type: 'text', text: RULES }, { type: 'text', text: '# Everything about this member (from the app)\n\n' + snapshot() }],
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } }, { type: 'text', text: prompt }] }],
    }, fallback(model)));
    addUsage(model, msg.usage); App.save();
    if (msg.stop_reason === 'refusal') return { picks: [] };
    const tb = msg.content.find((b) => b.type === 'text');
    try { return JSON.parse(tb ? tb.text : '{}'); } catch (e) { return { picks: [] }; }
  }

  // Check a key works with one tiny request.
  async function test() {
    const c = await getClient();
    try {
      const msg = await c.client.messages.create({ model: settings().model, max_tokens: 64, output_config: { effort: 'low' }, messages: [{ role: 'user', content: 'Reply with the single word: ready' }] });
      addUsage(settings().model, msg.usage); App.save();
      return { ok: true };
    } catch (e) { return { ok: false, text: errorText(c.Anthropic, e) }; }
  }

  App.AI = { ready, getKey, setKey, settings, MODELS, modelName, monthUsage, reply, readMenu, test, snapshot, loadSDK };
})();
