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
    return '- ' + fmtDate(d, 'short') + ': ' + E.sessionName(sl) + ' [session_id ' + sl.id + ', session_key ' + sl.key + '] ' + st + (extra ? ' (' + extra + ')' : '');
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
    sec('Your notes about them (kept between chats; numbered for forget_note)');
    const notes = s.coachNotes || [];
    if (notes.length) notes.forEach((n, i) => L.push((i + 1) + '. ' + n.text + ' (noted ' + App.iso(new Date(n.at)) + ')')); else L.push('None yet.');
    if (plan) {
      sec('Gym');
      const g = E.gym();
      L.push((g ? g.name : 'Unknown gym') + '. Equipment: ' + (g && g.kit ? g.kit.map((k) => D.EQUIP_NAME[k] || k).join(', ') : 'unknown') + '.');
      sec('Program');
      L.push((plan.own ? 'Their own program' + (p.program && p.program.source ? ', carried over from ' + p.program.source : '') : (E.SPLITS[plan.split] || {}).name || plan.split) + '. Trains ' + plan.days.map((d) => DOW_LONG[d]).join(', ') + ', about ' + plan.mins + ' min. Plan runs ' + plan.start + ' to ' + plan.end + ' (' + plan.weeks + ' weeks).' + (plan.deload ? ' Every 4th week is lighter.' : '') + (plan.event ? ' Working towards ' + plan.event.name + ' on ' + plan.event.date + '.' : ''));
      const ph = E.phaseFor(curWeek(plan), plan); L.push('This week\'s phase: ' + ph.name + '. ' + ph.note);
      L.push('Rotation: ' + plan.order.map((k) => (plan.sessions[k] ? plan.sessions[k].name : k) + ' [' + k + ']').join(' → '));
      sec('Sessions (session_key, name, then each exercise as it stands)');
      const used = new Set(plan.order); plan.slots.forEach((sl) => { if (E.slotDate(sl) >= addDays(t, -14)) used.add(sl.key); });
      Object.keys(plan.sessions).filter((k) => used.has(k)).forEach((k) => {
        const ss = plan.sessions[k];
        L.push('- [' + k + '] ' + ss.name + (ss.title ? ' (' + ss.title + ')' : '') + (plan.order.includes(k) ? '' : ', a one-off, not in the rotation') + ':');
        (ss.items || (ss.ex || []).map((id) => ({ id }))).forEach((it) => {
          const id = s.swaps[it.id] || it.id; const ex = D.EX[id] || {};
          L.push('    ' + exName(id) + ' [' + id + '] ' + (it.sets || 3) + ' sets × ' + (it.reps || ex.reps || []).join('–') + (ex.unit === 'sec' ? ' s' : '') + (it.rest ? ', rest ' + it.rest + ' s' : '') + (it.cap ? ', max ' + kg(it.cap) + ' kg' : '') + (it.note ? ', note: ' + it.note : '') + (it.pair ? ', superset ' + it.pair + it.pairRole : ''));
        });
      });
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
  function curWeek(plan) { return Math.max(1, Math.floor(App.diffDays(App.weekStart(plan.start), today()) / 7) + 1); }
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
    '- You can reshape their whole program with your tools: rename sessions; change a session\'s exercises, order, sets, reps and rest; put a weight cap or a note on an exercise; add or remove sessions; change training days, the rotation and how long the plan runs; add custom exercises; update the gym\'s equipment. You can also move, skip, ease or shorten single days, set next-time targets and log food.',
    '- When they ask for a change, or tell you about their situation (an injury, a physio\'s advice, a new schedule, different equipment, a goal) and want the plan to suit it, make every change needed in one go, then summarise what changed in a few short lines. An Undo button appears under your message automatically, so don\'t ask permission for something they asked for.',
    '- If something is only mentioned in passing, suggest the change and wait for a yes.',
    '- update_session changes a session for every week it appears; add only_session_id to change just that one day. Its exercises list replaces the old list completely, so include every exercise to keep, in order.',
    '- set_schedule changes days, rotation and plan length from a date on. Sessions already done are never touched.',
    '- Keep notes with remember_note about anything that should shape future coaching (injuries, physio or GP advice, limits, preferences). Your notes are in the data below; when something changes, forget the old note and save a new one.',
    '- Use the session ids and session keys from the data. Dates are YYYY-MM-DD. For deeper history on one lift, call get_exercise_history.',
    '- With an injury, be conservative: follow any physio or GP advice they mention, leave out what aggravates it, cap weights with max_kg where it helps, and keep their physio in the loop. You are not a physio and never diagnose.',
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
    { name: 'update_session', description: 'Change a session: its name, its subtitle, and/or its full list of exercises (each with sets, reps, rest, optional weight cap and note). Applies to every week it appears unless only_session_id is given, in which case only that one day changes.', input_schema: { type: 'object', properties: {
      session_key: str('Session key from the data, e.g. L1 or push'),
      only_session_id: str('Optional: a session id from the schedule to change just that day'),
      name: str('New name, e.g. "Upper C"'),
      title: str('New subtitle, e.g. "Chest, arms and shoulders"'),
      exercises: { type: 'array', description: 'The complete new list, in order. Replaces the old list.', items: { type: 'object', properties: {
        exercise_id: str('From the data or search_exercises'), sets: { type: 'integer' }, reps_min: { type: 'integer' }, reps_max: { type: 'integer' },
        rest_seconds: { type: 'integer' }, max_kg: { type: 'number', description: 'Optional weight cap the app will never suggest above' }, note: str('Optional short note shown during the session, e.g. "Physio: slow and controlled"'),
      }, required: ['exercise_id', 'sets', 'reps_min', 'reps_max'] } },
    }, required: ['session_key'] } },
    { name: 'update_all_sessions', description: 'Apply one change to every exercise in every session: number of sets and/or rest time.', input_schema: { type: 'object', properties: { sets: { type: 'integer' }, rest_seconds: { type: 'integer' } } } },
    { name: 'add_session', description: 'Create a new session. Add it to the rotation (and choose where) or keep it for set_schedule or a one-off day.', input_schema: { type: 'object', properties: {
      name: str('e.g. "Legs (physio-approved)"'), title: str('Subtitle, e.g. "Hamstrings and quads"'),
      exercises: { type: 'array', items: { type: 'object', properties: { exercise_id: str('id'), sets: { type: 'integer' }, reps_min: { type: 'integer' }, reps_max: { type: 'integer' }, rest_seconds: { type: 'integer' }, max_kg: { type: 'number' }, note: str('note') }, required: ['exercise_id', 'sets', 'reps_min', 'reps_max'] } },
      add_to_rotation: { type: 'boolean', description: 'Default true' }, rotation_position: { type: 'integer', description: '0-based position in the rotation; default the end' },
    }, required: ['name', 'exercises'] } },
    { name: 'remove_session', description: 'Take a session out of the rotation. Upcoming days are re-planned with the remaining sessions; history is kept.', input_schema: { type: 'object', properties: { session_key: str('Session key') }, required: ['session_key'] } },
    { name: 'set_schedule', description: 'Re-plan upcoming days from a date: which weekdays they train, the order sessions rotate in, which session comes first, and when the plan ends (to extend or shorten it). Done sessions are never touched.', input_schema: { type: 'object', properties: {
      training_days: { type: 'array', items: { type: 'string', enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] } },
      rotation: { type: 'array', items: { type: 'string' }, description: 'Session keys in order' },
      start_with: str('Session key for the first upcoming day; default: the one after the last session they did'),
      from_date: str('YYYY-MM-DD, default today'), end_date: str('YYYY-MM-DD, when the plan ends'),
    } } },
    { name: 'add_custom_exercise', description: 'Add an exercise the library doesn\'t have, based on the closest library exercise (it borrows its equipment, cues and drawing). Returns the new exercise id.', input_schema: { type: 'object', properties: { name: str('e.g. "Single-arm cable row"'), based_on_exercise_id: str('Closest library exercise') }, required: ['name', 'based_on_exercise_id'] } },
    { name: 'update_gym_equipment', description: 'Add or remove equipment at their gym, using equipment keys from list_equipment.', input_schema: { type: 'object', properties: { add: { type: 'array', items: { type: 'string' } }, remove: { type: 'array', items: { type: 'string' } } } } },
    { name: 'list_equipment', description: 'All equipment keys the app knows, with names, and whether their gym has each.', input_schema: { type: 'object', properties: {} } },
    { name: 'remember_note', description: 'Save a note that shapes future coaching: an injury, physio or GP advice, a limit, a preference. Kept between chats.', input_schema: { type: 'object', properties: { note: str('One clear sentence, e.g. "Sciatica (Nov 2026): physio says no deadlifts or heavy squats; leg curl max 45 kg."') }, required: ['note'] } },
    { name: 'forget_note', description: 'Remove one of your notes by its number.', input_schema: { type: 'object', properties: { number: { type: 'integer' } }, required: ['number'] } },
  ].map((t) => Object.assign(t, { eager_input_streaming: true }));
  // Tools that change things, so their effects can be undone together.
  const MUTATES = new Set(['move_session', 'skip_session', 'adjust_session', 'swap_exercise', 'set_next_target', 'log_food', 'update_session', 'update_all_sessions', 'add_session', 'remove_session', 'set_schedule', 'add_custom_exercise', 'update_gym_equipment', 'remember_note', 'forget_note']);
  const UNDO_KEYS = ['plan', 'swaps', 'moves', 'skips', 'trims', 'eases', 'targets', 'customEx', 'coachNotes', 'food'];
  function takeUndo() {
    const s = S(); const p = s.profile || {}; const snap = {};
    UNDO_KEYS.forEach((k) => { snap[k] = s[k] === undefined ? null : s[k]; });
    snap.profile = { days: p.days, perWeek: p.perWeek, kit: p.gym ? p.gym.kit : null };
    s.aiUndo = { at: App.nowMs(), data: JSON.stringify(snap) };
  }
  function undo() {
    const s = S(); if (!s.aiUndo) return false;
    const snap = JSON.parse(s.aiUndo.data);
    UNDO_KEYS.forEach((k) => { if (snap[k] === null) delete s[k]; else s[k] = snap[k]; });
    if (s.profile) { s.profile.days = snap.profile.days; s.profile.perWeek = snap.profile.perWeek; if (s.profile.gym && snap.profile.kit) s.profile.gym.kit = snap.profile.kit; }
    if (App.Import) App.Import.register(s.customEx || {});
    delete s.aiUndo; App.saveNow();
    return true;
  }

  const isStr = (x) => typeof x === 'string' && x.trim().length > 0;
  const isDate = (x) => isStr(x) && /^\d{4}-\d{2}-\d{2}$/.test(x);
  function slotOrErr(id) { const sl = App.E.slotById(id); if (!sl) throw new Error('No session with id ' + id + '. Use an id from the schedule.'); return sl; }
  function exOrErr(id) { if (!isStr(id) || !D.EX[id]) throw new Error('Unknown exercise id ' + id + '. Use search_exercises.'); return D.EX[id]; }
  const changed = []; // what the tools did this message, for the screen to refresh
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  function sessOrErr(key) { const ss = isStr(key) && S().plan.sessions[key]; if (!ss) throw new Error('No session with key ' + key + '. Use a session_key from the data.'); return ss; }
  // A session's exercise list from the tool's input, checked against the library and the gym.
  function itemsFrom(list) {
    if (!Array.isArray(list) || !list.length) throw new Error('exercises must be a non-empty list');
    if (list.length > 14) throw new Error('At most 14 exercises in a session');
    return list.map((x, i) => {
      if (!x || typeof x !== 'object') throw new Error('Each exercise must be an object');
      const ex = exOrErr(x.exercise_id);
      if (!App.E.canDo(x.exercise_id)) throw new Error(ex.name + ' needs ' + App.E.missing(x.exercise_id).map((k) => D.EQUIP_NAME[k] || k).join(', ') + ', which their gym doesn\'t have on record. Pick another, or update_gym_equipment if they have it.');
      const sets = Math.round(Number(x.sets)); let lo = Math.round(Number(x.reps_min)); let hi = Math.round(Number(x.reps_max));
      if (!(sets >= 1 && sets <= 10)) throw new Error('sets must be 1 to 10 (' + ex.name + ')');
      if (!(lo >= 1 && hi >= 1 && lo <= 300 && hi <= 300)) throw new Error('reps must be 1 to 300 (' + ex.name + ')');
      if (lo > hi) { const t = lo; lo = hi; hi = t; }
      const it = { id: x.exercise_id, pat: ex.pat, role: i === 0 ? 'main' : 'acc', sets, reps: [lo, hi], coach: true };
      const rest = Math.round(Number(x.rest_seconds)); if (rest) { if (!(rest >= 15 && rest <= 600)) throw new Error('rest_seconds must be 15 to 600'); it.rest = rest; } else it.rest = ex.rest || 90;
      if (x.max_kg != null && x.max_kg !== '') { const c = Number(x.max_kg); if (!(c > 0 && c < 1000)) throw new Error('max_kg must be a positive number'); it.cap = Math.round(c * 4) / 4; }
      if (isStr(x.note)) it.note = String(x.note).trim().slice(0, 140);
      return it;
    });
  }
  function useItems(ss, items) {
    // explicit choices win over older swaps of the same exercises
    items.forEach((it) => { delete S().swaps[it.id]; });
    ss.items = items; ss.ex = items.map((it) => it.id);
  }
  function tagFor(name) { const w = String(name).replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || 'S')[0]).toUpperCase(); }
  const short = (t, n) => { t = String(t).trim(); if (t.length <= n) return t; const cut = t.slice(0, n); return cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 12)).replace(/[,;:.\s]+$/, '') + '…'; };
  function reshaped() { S().plan.customised = true; }

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
    update_session(i) {
      const plan = S().plan; let ss = sessOrErr(i.session_key); let key = i.session_key; let one = null;
      // check everything before changing anything
      if (!isStr(i.name) && !isStr(i.title) && i.exercises == null) throw new Error('Nothing to change: give a name, title or exercises');
      const items = i.exercises != null ? itemsFrom(i.exercises) : null;
      if (i.only_session_id) {
        one = slotOrErr(i.only_session_id); if (App.E.isDone(one)) throw new Error('That day is already done.');
        key = 'x' + App.uid().slice(0, 6);
        ss = Object.assign(JSON.parse(JSON.stringify(plan.sessions[one.key])), { key });
        plan.sessions[key] = ss;
      }
      if (isStr(i.name)) { ss.name = String(i.name).trim().slice(0, 40); ss.tag = tagFor(ss.name); }
      if (isStr(i.title)) ss.title = String(i.title).trim().slice(0, 60);
      if (items) useItems(ss, items);
      if (one) { one.key = key; delete S().trims[one.id]; }
      reshaped();
      changed.push((one ? fmtDate(App.E.slotDate(one), 'short') + ': ' : '') + 'Updated ' + ss.name + (i.exercises ? ' (' + ss.items.length + ' exercises)' : ''));
      return 'Updated session ' + key + ': ' + ss.name + (ss.title ? ' (' + ss.title + ')' : '') + (one ? ', for ' + App.E.slotDate(one) + ' only' : ', every week') + '.';
    },
    update_all_sessions(i) {
      const plan = S().plan; const sets = i.sets != null ? Math.round(Number(i.sets)) : null; const rest = i.rest_seconds != null ? Math.round(Number(i.rest_seconds)) : null;
      if (sets == null && rest == null) throw new Error('Give sets and/or rest_seconds');
      if (sets != null && !(sets >= 1 && sets <= 10)) throw new Error('sets must be 1 to 10');
      if (rest != null && !(rest >= 15 && rest <= 600)) throw new Error('rest_seconds must be 15 to 600');
      Object.keys(plan.sessions).forEach((k) => { const ss = plan.sessions[k]; (ss.items = ss.items || ss.ex.map((id) => ({ id, pat: (D.EX[id] || {}).pat, role: 'acc' }))).forEach((it) => { if (sets != null) { it.sets = sets; it.coach = true; } if (rest != null) it.rest = rest; }); });
      reshaped(); changed.push('Every exercise: ' + [sets != null ? sets + ' sets' : '', rest != null ? rest + ' s rest' : ''].filter(Boolean).join(', '));
      return 'Done for every session.';
    },
    add_session(i) {
      const plan = S().plan; if (!isStr(i.name)) throw new Error('name is required');
      const key = 'c' + App.uid().slice(0, 6); const items = itemsFrom(i.exercises);
      const name = String(i.name).trim().slice(0, 40);
      plan.sessions[key] = { key, name, tag: tagFor(name), area: 'own', title: isStr(i.title) ? String(i.title).trim().slice(0, 60) : '', ex: [], items: [] };
      useItems(plan.sessions[key], items);
      if (i.add_to_rotation !== false) { const pos = Number.isInteger(i.rotation_position) ? Math.max(0, Math.min(plan.order.length, i.rotation_position)) : plan.order.length; plan.order.splice(pos, 0, key); App.E.reschedule({}); }
      reshaped(); changed.push('Added ' + name);
      return 'Created session ' + key + ' (' + name + ')' + (i.add_to_rotation !== false ? ', added to the rotation and upcoming days re-planned.' : '. Not in the rotation yet.');
    },
    remove_session(i) {
      const plan = S().plan; const ss = sessOrErr(i.session_key);
      if (!plan.order.includes(i.session_key)) throw new Error('That session isn\'t in the rotation.');
      if (plan.order.length < 2) throw new Error('It\'s the only session in the rotation. Add another first.');
      plan.order = plan.order.filter((k) => k !== i.session_key); App.E.reschedule({});
      reshaped(); changed.push('Took ' + ss.name + ' out of the rotation');
      return 'Removed from the rotation; upcoming days re-planned with: ' + plan.order.map((k) => plan.sessions[k].name).join(', ') + '.';
    },
    set_schedule(i) {
      const plan = S().plan; const o = {};
      if (i.training_days != null) { if (!Array.isArray(i.training_days) || !i.training_days.length || i.training_days.some((d) => !DAYS.includes(d))) throw new Error('training_days must be weekdays like ["Mon","Wed","Fri"]'); o.days = [...new Set(i.training_days.map((d) => DAYS.indexOf(d)))]; }
      if (i.rotation != null) { if (!Array.isArray(i.rotation) || !i.rotation.length) throw new Error('rotation must list session keys'); i.rotation.forEach(sessOrErr); o.order = i.rotation.slice(); }
      if (i.start_with != null) { sessOrErr(i.start_with); o.startWith = i.start_with; }
      if (i.from_date != null) { if (!isDate(i.from_date)) throw new Error('from_date must be YYYY-MM-DD'); o.from = i.from_date; }
      if (i.end_date != null) { if (!isDate(i.end_date) || i.end_date < today()) throw new Error('end_date must be a future date, YYYY-MM-DD'); if (App.diffDays(today(), i.end_date) > 7 * 26) throw new Error('Plans run at most 26 weeks ahead'); o.end = i.end_date; }
      if (!Object.keys(o).length) throw new Error('Nothing to change');
      App.E.reschedule(o); reshaped();
      const next = App.E.openSlots().filter((sl) => App.E.slotDate(sl) >= today()).slice(0, 6);
      changed.push('Re-planned upcoming days' + (o.days ? ' (' + o.days.slice().sort((a, b) => a - b).map((d) => DAYS[d]).join(', ') + ')' : ''));
      return 'Re-planned. Next up: ' + next.map((sl) => App.E.slotDate(sl) + ' ' + App.E.sessionName(sl)).join('; ') + '. Plan ends ' + plan.end + '.';
    },
    add_custom_exercise(i) {
      if (!isStr(i.name)) throw new Error('name is required'); exOrErr(i.based_on_exercise_id);
      const s = S(); s.customEx = s.customEx || {};
      const id = 'c_' + String(i.name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
      if (D.EX[id] && !s.customEx[id]) throw new Error('The library already has ' + D.EX[id].name + ' [' + id + ']; use that.');
      s.customEx[id] = { base: i.based_on_exercise_id, name: String(i.name).trim().slice(0, 60) };
      App.Import.register(s.customEx);
      changed.push('New exercise: ' + s.customEx[id].name);
      return 'Created ' + id + ' (' + s.customEx[id].name + '), using the equipment of ' + exName(i.based_on_exercise_id) + '.';
    },
    list_equipment() {
      const k = App.E.kit();
      return Object.keys(D.EQUIP).map((g) => D.EQUIP[g].name + ': ' + Object.keys(D.EQUIP[g].items).map((key) => key + ' (' + D.EQUIP[g].items[key] + (k.has(key) ? ', has it' : '') + ')').join('; ')).join('\n');
    },
    update_gym_equipment(i) {
      const g = App.E.gym(); if (!g) throw new Error('No gym set');
      const add = Array.isArray(i.add) ? i.add : []; const rem = Array.isArray(i.remove) ? i.remove : [];
      add.concat(rem).forEach((key) => { if (!D.EQUIP_NAME[key]) throw new Error('Unknown equipment key ' + key + '. Use list_equipment.'); });
      add.forEach((key) => { if (!g.kit.includes(key)) g.kit.push(key); });
      g.kit = g.kit.filter((key) => !rem.includes(key));
      changed.push('Gym equipment updated');
      return 'Gym now has: ' + g.kit.map((key) => D.EQUIP_NAME[key] || key).join(', ') + '.';
    },
    remember_note(i) {
      if (!isStr(i.note)) throw new Error('note is required');
      const s = S(); s.coachNotes = s.coachNotes || [];
      if (s.coachNotes.length >= 40) throw new Error('Too many notes; forget an old one first');
      s.coachNotes.push({ text: String(i.note).trim().slice(0, 300), at: App.nowMs() });
      changed.push('Noted: ' + short(i.note, 80));
      return 'Saved as note ' + s.coachNotes.length + '.';
    },
    forget_note(i) {
      const s = S(); const n = Math.round(Number(i.number)); const list = s.coachNotes || [];
      if (!(n >= 1 && n <= list.length)) throw new Error('No note number ' + i.number);
      const gone = list.splice(n - 1, 1)[0];
      changed.push('Forgot a note');
      return 'Forgot: ' + gone.text;
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
    const model = settings().model; changed.length = 0; pendingCard = null; pendingReplies = null; let undoTaken = false;
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
            if (MUTATES.has(u.name) && !undoTaken) { takeUndo(); undoTaken = true; }
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
    return { text: out.text, replies: pendingReplies || out.replies, card: pendingCard, error, changed: changed.slice(), undo: undoTaken && changed.length > 0 };
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

  function notes() { return S().coachNotes || []; }
  function forgetNote(i) { const l = S().coachNotes || []; if (i >= 0 && i < l.length) { l.splice(i, 1); App.save(); } }
  App.AI = { undo, notes, forgetNote, ready, getKey, setKey, settings, MODELS, modelName, monthUsage, reply, readMenu, test, snapshot, loadSDK };
})();
