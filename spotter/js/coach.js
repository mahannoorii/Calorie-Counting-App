/* Spotter — the coach. A message thread with your trainer: it checks in first, every answer
   leads to a sensible follow-up, and replies can change the plan (move, trim or ease a
   session, log food, pick a restaurant order). Free text is matched to the same
   conversations; in the claude.ai preview anything unmatched goes to Claude. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const E = App.E;
  const { esc, icon, today, addDays, rel, fmtDate, weekStart, dow, DOW_LONG } = App;
  const S = () => App.S;

  let aiSample = null; let aiOff = false; let busy = false;
  let session = null; // {exId} while a gym session is open

  function initAI() {
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      window.claude.use('sample').then((fn) => { if (fn) { aiSample = fn; if (App.Views && App.Views.refreshCam) App.Views.refreshCam(); } }).catch(() => {});
    } catch (e) {}
  }
  function aiReady() { return !!aiSample && !aiOff; }
  function setSession(ctx) { session = ctx; }

  // ── Context the conversations read from ───────────────────────────────────
  function C() {
    const s = S(); const plan = s.plan; const p = s.profile || {}; const t = today();
    return {
      s, plan, p, t, h: App.hour(), first: (p.name || '').split(' ')[0],
      todays: E.slotsOn(t).filter((x) => !E.isDone(x))[0] || null,
      next: E.nextOpen(addDays(t, 1)), miss: E.missed(), tm: E.timeOf(plan.time), wk: E.week(),
      asthma: !!(p.health && p.health.asthma),
    };
  }
  const lower = (x) => App.lc(x);
  function listJoin(a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function exNames(slot) { return E.exercisesFor(slot.key, slot.week, slot.id).map((e) => lower(D.EX[e.id].name)); }
  function dayWord(d) { const r = rel(d); return r === 'Today' || r === 'Tomorrow' ? r.toLowerCase() : DOW_LONG[dow(d)]; }
  function whenWord(sl) { const d = E.slotDate(sl); if (d < today()) return 'for the catch-up'; const w = dayWord(d); return w === 'today' || w === 'tomorrow' ? w : 'on ' + w; }

  // ── Conversations ─────────────────────────────────────────────────────────
  // Each node returns {text, replies, card?, urgent?, expect?}. A reply either goes to
  // another node, runs an action (which may name the node to go to next), or both.
  const N = {
    welcome: (c) => ({ text: 'Hi ' + c.first + ', I’m your coach. I’ll set your sessions, check in each day and sort out the tricky bits, like what to order when you eat out.\n\nMessage me any time.', replies: [r('What happens first?', 'first_steps'), r('How does this work?', 'how')] }),
    first_steps: (c) => {
      const n = c.todays || c.next; if (!n) return { text: 'Your plan’s all set.', replies: [] };
      const names = exNames(n);
      return { text: cap(dayWord(E.slotDate(n))) + ' is ' + E.sessionName(n) + ': ' + listJoin(names.slice(0, 3)) + (names.length > 3 ? ' and ' + (names.length - 3) + ' more' : '') + '. The first two weeks are light. It’s about learning the machines.', replies: [a('Show me the session', 'preview', n.id), r('What should I bring?', 'bring')] };
    },
    how: (c) => ({ text: 'You train ' + c.plan.days.map((d) => DOW_LONG[d]).join(' and ') + '. Each time, I set your weights from how the last session felt. In the evening you tell me how eating went with one tap. If something changes, message me and I’ll adjust the plan.', replies: [r('Got it', 'ok')] }),
    bring: (c) => ({ text: 'Water, a small towel and closed shoes' + (c.asthma ? ', and your puffer, every time' : '') + '. Headphones help if you feel self-conscious.', replies: [r('Thanks', 'ok')] }),
    ok: () => ({ text: pick(['Anytime.', 'Any time.', 'You got it.']), replies: [] }),

    // Training day
    morning_session: (c) => {
      const sl = c.todays; if (!sl) return N.ok(c);
      const when = c.h < c.tm.hour ? 'at ' + c.tm.at : 'today';
      return { text: E.sessionName(sl) + ' ' + when + ': ' + lower(c.plan.sessions[sl.key].title) + '. How are you feeling?', card: { type: 'session', slot: sl.id }, replies: [r('Ready to go', 'ready'), r('A bit sore', 'sore_where'), r('Short on time', 'short_time'), r('Can’t make it', 'cant_make')] };
    },
    ready: (c) => {
      const sl = c.todays || c.next; if (!sl) return N.ok(c);
      const f = E.exercisesFor(sl.key, sl.week, sl.id)[0]; const sg = E.suggest(f.id, sl.id);
      return { text: sg.mode === 'find' ? 'Love it. First up is the ' + lower(D.EX[f.id].name) + '. Start light and I’ll help you find your weights as you go.' : 'Love it. First up is the ' + lower(D.EX[f.id].name) + ' at ' + sg.title + '. ' + sg.why, replies: [a('Start session', 'start', sl.id), a('Preview first', 'preview', sl.id)] };
    },
    sore_where: () => ({ text: 'Where are you sore?', replies: [a('Legs', 'ease', 'legs'), a('Upper body', 'ease', 'upper'), a('All over', 'ease', 'all')] }),
    eased: (c, x) => {
      const v = Array.isArray(x) ? x[0] : x; const sl = (Array.isArray(x) && x[1] && E.slotById(x[1])) || c.todays || c.next;
      const when = sl ? whenWord(sl) : 'today';
      return { text: (v === 'legs' ? 'Normal a day or two after legs.' : v === 'upper' ? 'That’s your muscles adapting.' : 'Sounds like a big week.') + ' Training still helps: a warm muscle recovers faster. I’ve taken one step off ' + (v === 'all' ? 'everything' : v === 'legs' ? 'the leg machines' : 'the upper-body machines') + ' ' + when + '.', replies: [r('Thanks', 'ok'), r('It’s sharp, not sore', 'pain')] };
    },
    short_time: () => ({ text: 'How long have you got?', replies: [a('20 minutes', 'trim', 3), a('30 minutes', 'trim', 4)] }),
    trimmed: (c, v) => { const sl = (v && v[0] && E.slotById(v[0])) || c.todays || c.next; const n = v ? v[1] : 3; const names = sl ? exNames(sl) : []; const d = sl ? E.slotDate(sl) : c.t; return { text: 'Done. ' + (d === c.t ? 'Today' : cap(dayWord(d))) + ' it’s the ' + n + ' that matter most: ' + listJoin(names) + '. Two sets each, short rests.', replies: sl && d <= c.t ? [a('Start session', 'start', sl.id)] : [] }; },
    cant_make: (c) => {
      const sl = c.todays || c.next || c.miss; if (!sl) return { text: 'There’s nothing booked to move right now.', replies: [] };
      const base = E.slotDate(sl) < c.t ? c.t : E.slotDate(sl);
      const d1 = E.freeDayAfter(base, 0); const d2 = E.freeDayAfter(d1, 0);
      return { text: 'No problem. When can you do it instead?', replies: [a(cap(dayWord(d1)), 'move', sl.id + '|' + d1), a(cap(dayWord(d2)), 'move', sl.id + '|' + d2), a('Skip this one', 'skip', sl.id)] };
    },
    moved: (c, d) => ({ text: 'Moved to ' + dayWord(d) + '. I’ll check in that morning.', replies: [] }),
    skipped: (c) => { const n = E.nextOpen(addDays(c.t, 1)); return { text: 'Skipped, no guilt.' + (n ? ' Next up is ' + E.sessionName(n) + ' ' + dayWord(E.slotDate(n)) + '.' : ''), replies: [] }; },

    // Day after training
    post_session: () => ({ text: 'How’s the body after yesterday’s session?', replies: [r('All good', 'post_good'), r('A bit sore', 'post_sore'), a('Really sore', 'easeNext', 'all')] }),
    post_good: () => ({ text: 'Good sign. The weights are about right, so we keep building.', replies: [] }),
    post_sore: () => ({ text: 'Normal in the first few weeks. A 20-minute walk today helps it settle.', replies: [r('Will do', 'ok')] }),
    post_very: () => ({ text: 'Then I pushed you a bit hard. I’ve taken a step off everything next session. Go for a gentle walk today, and tell me if anything feels sharp rather than achy.', replies: [r('Okay', 'ok')] }),

    // Missed session
    missed: (c) => { const m = c.miss; if (!m) return N.ok(c); return { text: cap(dayWord(E.slotDate(m))) + '’s session didn’t happen. All good, it happens to everyone. Want to fit it in?', replies: [a('Today', 'catchup', m.id), a('Tomorrow', 'move', m.id + '|' + addDays(c.t, 1)), a('Skip it', 'skip', m.id)] }; },
    on_today: (c, id) => ({ text: 'It’s on for today. Ready when you are.', replies: [a('Start now', 'start', id)] }),

    // Food
    evening_food: () => ({ text: 'How did eating go today?', replies: [a('On track', 'food', 'on'), a('Partly', 'food', 'part'), a('Off track', 'food', 'off')] }),
    food_on: (c) => ({ text: 'Nice. That’s ' + App.fmtKg(E.week().eat) + ' of 5 good days this week.', replies: [] }),
    food_why: () => ({ text: 'Thanks for being honest. What got in the way?', replies: [r('Ate out', 'why_out'), r('Takeaway', 'why_takeaway'), r('Sweets', 'why_sweets'), r('Busy day', 'why_busy')] }),
    why_out: () => ({ text: 'Next time, message me where you’re going before you leave. I’ll have your order picked before you sit down.', replies: [r('Got it', 'ok')] }),
    why_takeaway: () => ({ text: 'Takeaway’s fine when it’s planned. Next time, tell me the place and I’ll pick the order.', replies: [r('Got it', 'ok')] }),
    why_sweets: () => ({ text: 'Keep the ones you love and skip the ones that are just there. A planned treat on the weekend beats a surprise one on Tuesday.', replies: [r('Makes sense', 'ok')] }),
    why_busy: () => ({ text: 'Busy days need a backup. Your five dinners for the week are already picked, so there’s always a plan.', replies: [a('Show me', 'dinners'), r('Later', 'ok')] }),

    // Weekend
    friday: () => ({ text: 'Anything on this weekend I should plan around?', replies: [r('Eating out', 'eat_where'), r('Family event', 'event_day'), r('Takeaway night', 'eat_where'), r('A quiet one', 'quiet')], mark: 'weekend' }),
    eat_where: () => ({ text: aiReady() ? 'Where are you going? Type the name, or send me a photo of the menu and I’ll pick from what they actually serve.' : 'Where are you going? Just type the name.', replies: aiReady() ? [photo('Send a photo of the menu')] : [], expect: 'place' }),
    photo_wait: () => ({ text: 'Reading the menu…', replies: [] }),
    photo_none: () => ({ text: 'I couldn’t read a menu in that photo. Try again closer up, in good light, or just tell me the restaurant’s name.', replies: [photo('Try another photo')], expect: 'place' }),
    photo_off: () => ({ text: 'I can’t read photos in this version yet. Tell me the restaurant’s name and I’ll put their menu in front of you with your picks.', replies: [], expect: 'place' }),
    event_day: (c) => { const wk = weekStart(c.t); const sat = addDays(wk, 5); const sun = addDays(wk, 6); return { text: 'Which day?', replies: [a('Saturday', 'event', 'gathering|' + (sat >= c.t ? sat : addDays(sat, 7))), a('Sunday', 'event', 'gathering|' + (sun >= c.t ? sun : addDays(sun, 7)))] }; },
    event_plan: (c, d) => ({ text: 'Done, it’s in for ' + dayWord(d) + '. On the day: eat normally earlier, start with protein and salad, then one serve of everything else. Pick the dessert you love most and enjoy it.', replies: [] }),
    quiet: () => ({ text: 'Perfect. One fun meal, keep the rest normal, and get a long walk in if you can.', replies: [] }),

    // Sunday check-in
    sunday: (c) => ({ text: 'Sunday check-in. ' + c.wk.train + ' of ' + c.wk.trainMax + ' sessions and ' + App.fmtKg(c.wk.eat) + ' good food days this week. How did it feel?', replies: [r('Great', 'sun_great'), r('Okay', 'sun_hard'), r('Tough', 'sun_hard')] }),
    sun_great: () => ({ text: 'That’s what we want. Anything I should know about next week?', replies: [r('Eating out', 'sun_eatout'), r('Busy week', 'sun_busy'), a('Nothing special', 'checkin', 'great')] }),
    sun_hard: () => ({ text: 'What made it hard?', replies: [r('Time', 'sun_time'), r('Motivation', 'sun_motivation'), r('Food', 'sun_food'), a('Soreness', 'easeNext', 'sun')] }),
    sun_sore: () => ({ text: 'Normal early on. I\u2019ve taken a step off next session so you can recover and still train.', replies: [a('Thanks', 'checkin', 'sore')] }),
    sun_time: () => ({ text: 'Then we keep sessions short rather than skip them. If a day gets tight, tell me and I’ll cut it to 20 minutes.', replies: [a('Sounds good', 'checkin', 'time')] }),
    sun_motivation: (c) => { const ev = c.plan.event; const days = ev ? App.diffDays(c.t, ev.date) : 0; return { text: 'You told me why you started: ' + (c.p.why ? '“' + c.p.why + '”' : 'to feel ' + (c.p.feel || []).join(', ').toLowerCase()) + '.' + (ev && days > 0 ? ' ' + days + ' days to ' + ev.name + '.' : '') + ' One session at a time.', replies: [a('Thanks, I needed that', 'checkin', 'motivation')] }; },
    sun_food: () => ({ text: 'Let’s take the deciding out of it. Your dinners for next week are picked from the food you like.', replies: [a('Show me', 'dinners'), a('Thanks', 'checkin', 'food')] }),
    sun_busy: () => ({ text: 'Got it. If time runs out on a training day, tell me and I’ll trim the session.', replies: [a('Thanks', 'checkin', 'busy')] }),
    sun_eatout: () => ({ text: 'Message me the place on the day and I’ll pick your order.', replies: [a('Will do', 'checkin', 'eatout')] }),
    sun_done: (c) => {
      const nwk = addDays(weekStart(c.t), 7);
      const list = E.allSlots().filter((x) => { const d = E.slotDate(x); return d >= nwk && d <= addDays(nwk, 6); }).map((x) => E.sessionName(x) + ' ' + DOW_LONG[dow(E.slotDate(x))]);
      return { text: (list.length ? 'Next week: ' + listJoin(list) + '.' : 'That’s the plan done.') + ' Enjoy the rest of your Sunday.', replies: [] };
    },
    pre_first: (c) => { const n = c.next; if (!n) return N.ok(c); return { text: 'Your first session is ' + dayWord(E.slotDate(n)) + '. Want to walk through the machines now, so nothing’s a surprise?', replies: [a('Show me', 'preview', n.id), r('I’ll wait', 'ok')] }; },

    // In the gym and safety
    pain: () => ({ text: 'Stop that exercise for now. Is it a sharp pain, or more of an ache?', replies: [r('Sharp', 'pain_sharp'), r('An ache', 'pain_ache')] }),
    pain_sharp: () => ({ text: 'Then skip it today. If it doesn’t settle in a day or two, see a GP or physio. Want me to swap it for something that doesn’t load that area?', replies: session ? [a('Swap it', 'swap'), a('Skip it', 'skipEx')] : [r('Okay', 'ok')] }),
    pain_ache: () => ({ text: 'Probably the muscle working hard. Drop one step, slow the reps down, and stop if it turns sharp.', replies: session ? [a('Lower it', 'lower'), r('Okay', 'ok')] : [r('Okay', 'ok')] }),
    asthma: () => ({ text: 'Stop and use your reliever the way your action plan says. Sit down and rest. Has your breathing settled?', replies: [r('Yes, it’s settled', 'asthma_ok'), r('It’s getting worse', 'asthma_worse')] }),
    asthma_ok: () => ({ text: 'Good. Keep the rest of the session easy. If it comes back a second time, call it a day.', replies: [] }),
    asthma_worse: () => ({ text: 'Follow your asthma action plan now. If your reliever isn’t helping, call 000.', replies: [], urgent: true }),
    dizzy: () => ({ text: 'Stop and sit down. Sip some water. If there’s chest pain or the dizziness doesn’t pass, call 000. Either way, tell your GP before your next session.', replies: [], urgent: true }),
    taken: () => ({ text: 'Ask “mind if I work in?” People swap sets all the time. Or I can switch you to something that works the same muscles.', replies: session ? [a('Switch it', 'swap'), r('I’ll wait', 'ok')] : [r('Good to know', 'ok')] }),
    swapped: (c, name) => ({ text: 'Switched to the ' + lower(name) + '. Same muscles, so the plan still holds.', replies: [] }),
    lowered: (c, w) => ({ text: 'Done, ' + w + ' for the rest of your sets.', replies: [] }),
    weight_q: () => {
      if (session && session.exId) { const sg = E.suggest(session.exId, session.slot); return { text: (sg.mode === 'find' ? 'Start around ' + App.fmtKg(D.EX[session.exId].start) + ' kg. ' : sg.title + '. ') + sg.why, replies: [r('Got it', 'ok')] }; }
      return { text: 'Every exercise shows my weight for you before the first set. It’s based on last time and how it felt.', replies: [r('Got it', 'ok')] };
    },
    motivation: () => ({ text: 'Make a deal with me: go, do the warm-up and the first exercise. If you still want to leave after that, leave. Deal?', replies: [r('Deal', 'deal'), r('Not today', 'cant_make')] }),
    deal: () => ({ text: 'Good. That’s usually all it takes.', replies: [] }),
    progress: () => {
      const t = E.totals(); const h = E.liftHistory();
      const best = Object.keys(h).filter((id) => D.EX[id].unit === 'kg' && h[id].length > 1).map((id) => ({ id, d: h[id][h[id].length - 1].v - h[id][0].v })).sort((x, y) => y.d - x.d)[0];
      return { text: t.done + ' ' + App.plural(t.done, 'session') + ' in.' + (best && best.d > 0 ? ' Your ' + lower(D.EX[best.id].name) + ' is up ' + App.fmtKg(best.d) + ' kg since your first go.' : ' Give it two weeks and the numbers start moving.'), replies: [a('See my progress', 'progress')] };
    },
    dinners_q: () => ({ text: 'Your five dinners for this week are picked from the food you like.', card: { type: 'dinners' }, replies: [a('See them all', 'dinners'), a('Shuffle them', 'shuffle')] }),
    menu_why: () => ({ text: 'They’re the most protein with the lightest sauces, so you leave full without feeling heavy. The “ask for” tweaks make them lighter still, and there’s nothing to count.', replies: [] }),
    locked: () => ({ text: 'Locked in. Enjoy it. I’ll ask how it went tonight.', replies: [] }),
    fallback: () => ({ text: 'I’m not sure I can help with that one yet. Here’s what I can sort out right now:', replies: [r('Plan a meal out', 'eat_where'), r('Move a session', 'cant_make'), r('I’m sore', 'sore_where')] }),
  };
  function target(v) {
    const parts = String(v).split('|'); const c = C();
    if (parts.length > 1) return [E.slotById(parts[0]) || c.todays || c.next, parts[1]];
    return [c.todays || c.next, parts[0]];
  }
  function r(label, go) { return { label, go }; }
  function photo(label, data) { return { label, photo: true, data: data || '' }; }
  function a(label, act, data) { return { label, act, data }; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ── Actions a reply can take ──────────────────────────────────────────────
  // Each returns the node to continue with (and an argument), or nothing.
  const ACTIONS = {
    preview: (id) => { App.Views.previewSheet(id); },
    start: (id) => { App.Session.start(id); },
    move: (v) => { const [id, d] = String(v).split('|'); S().moves[id] = d; App.save(); note('Moved to ' + fmtDate(d, 'long')); return ['moved', d]; },
    skip: (id) => { S().skips[id] = true; App.save(); note('Session skipped'); return ['skipped']; },
    catchup: (id) => { S().moves[id] = today(); App.save(); note('Moved to today'); return ['on_today', id]; },
    // trim and ease take "n" or "slotId|n" (from the session options sheet)
    trim: (v) => { const [sl, n] = target(v); if (sl) { S().trims[sl.id] = Number(n); App.save(); note('Session cut to ' + n + ' exercises'); } return ['trimmed', [sl && sl.id, Number(n)]]; },
    ease: (v) => { const [sl, how] = target(v); if (sl) { S().eases[sl.id] = how; App.save(); note('Weights eased ' + whenWord(sl).replace(/^on /, 'for ')); } return ['eased', [how, sl && sl.id]]; },
    easeNext: (v) => { const c = C(); const sl = c.todays || c.next; if (sl) { S().eases[sl.id] = 'all'; App.save(); note('Next session eased one step'); } return [v === 'sun' ? 'sun_sore' : 'post_very']; },
    food: (v) => { App.logFood(today(), v, true); return [v === 'on' ? 'food_on' : 'food_why']; },
    dinners: () => { App.Views.dinnersSheet(); },
    shuffle: () => { S().dinnerSeed++; App.save(); App.Views.dinnersSheet(); note('New dinners picked'); },
    event: (v) => { const [type, d] = String(v).split('|'); S().events.push({ id: App.uid(), type, date: d, title: D.MOMENTS[type] ? D.MOMENTS[type].title : 'Family event', planned: true }); App.save(); note('Added to ' + fmtDate(d, 'long')); return ['event_plan', d]; },
    checkin: (v) => { const wk = weekStart(today()); S().checkins[wk] = { feel: v, at: Date.now() }; App.save(); App.checkAwards(); return ['sun_done']; },
    progress: () => { App.ACT.openProgress(); },
    swap: () => { const name = App.Session.swapCurrent(); return name ? ['swapped', name] : ['ok']; },
    lower: () => { const w = App.Session.lowerCurrent(); return w ? ['lowered', w] : ['ok']; },
    skipEx: () => { App.Session.skipCurrent(); note('Exercise skipped'); return ['ok']; },
    openMenu: (v) => { const [name, cu] = String(v).split('|'); App.Views.menuSheet(name, cu); },
    cuisine: (v) => { const [name, cu] = String(v).split('|'); later(() => restaurantPicks(name, cu)); return null; },
    lock: (v) => { const [name, cu] = String(v).split('|'); App.lockMeal(name, cu, true); return ['locked']; },
  };

  // ── Restaurant flow ───────────────────────────────────────────────────────
  function restaurant(text) {
    const t = String(text || '').trim();
    let name = E.extractPlace(t);
    // a short reply is the name itself ("sushi train"); a sentence without one stays unnamed
    if (!name && t.split(/\s+/).length <= 5 && !/[?]/.test(t)) name = t === t.toLowerCase() ? t.replace(/\b([a-z])/g, (x) => x.toUpperCase()) : t;
    name = name.replace(/\|/g, '/');
    const cu = E.detectCuisine(name) || E.detectCuisine(t);
    if (!cu) {
      const opts = ['italian', 'japanese', 'thai', 'chinese', 'indian', 'mexican', 'middleeast', 'vietnamese', 'korean', 'greek', 'pub', 'cafe', 'burgers', 'pizza'];
      return postRaw({ text: name ? 'What kind of food is ' + name + '?' : 'What kind of food is it?', replies: opts.map((k) => a(D.MENUS[k].name, 'cuisine', name + '|' + k)) });
    }
    restaurantPicks(name, cu);
  }
  function restaurantPicks(name, cu) {
    if (name) App.rememberPlace(name, cu);
    const scanned = App.Views.placeMenu(name);
    const replies = [a('Lock it in', 'lock', name + '|' + cu), a('See the full menu', 'openMenu', name + '|' + cu)];
    if (aiReady() && name && !scanned) replies.push(photo('Send their menu', name + '|' + cu)); else replies.push(r('Why these?', 'menu_why'));
    postRaw({ text: (name ? name + '. ' : '') + (scanned ? 'From their menu, here’s what I’d order:' : 'Here’s what I’d order' + (aiReady() && name ? '. Send me their menu and I’ll pick from what they actually serve:' : ':')), card: { type: 'menu', place: name, cuisine: cu }, replies });
  }

  // ── Thread mechanics ──────────────────────────────────────────────────────
  function push(m) { m.id = m.id || App.uid(); m.at = m.at || App.nowMs(); S().chat.push(m); if (S().chat.length > 120) S().chat.splice(0, S().chat.length - 120); App.save(); return m; }
  function clearReplies() { S().chat.forEach((m) => { if (m.replies && m.replies.length) m.replies = []; }); }
  function note(text) { push({ from: 'note', text }); }
  function resolve(id, arg) { const fn = N[id] || N.fallback; return fn(C(), arg); }
  function postRaw(msg) {
    clearReplies();
    if (msg.expect) S().chatExpect = msg.expect; else delete S().chatExpect;
    if (msg.mark === 'weekend') S().seen['weekend:' + weekStart(today())] = true;
    const m = push({ from: 'coach', text: msg.text, replies: msg.replies || [], card: msg.card || null, urgent: !!msg.urgent });
    App.onCoachMessage && App.onCoachMessage(m);
    return m;
  }
  function post(id, arg) { return postRaw(resolve(id, arg)); }
  // Typing, then the coach's message.
  function respond(id, arg, raw) {
    busy = true; App.onCoachTyping && App.onCoachTyping(true);
    const msg = raw || resolve(id, arg);
    const delay = App.reduceMotion() ? 150 : 520 + Math.min(900, (msg.text || '').length * 6);
    setTimeout(() => { busy = false; App.onCoachTyping && App.onCoachTyping(false); postRaw(msg); App.sound('message'); App.haptic(); }, delay);
  }

  // Proactive check-ins: one at a time, most important first, and never on top of a
  // question you haven't answered yet (unless it's gone stale).
  const PRIORITY = ['welcome', 'missed', 'morning_session', 'post_session', 'pre_first', 'evening_food', 'friday', 'sunday'];
  function due() {
    if (!S().plan || busy) return null;
    const m = latest();
    if (m && ((m.replies && m.replies.length) || S().chatExpect) && App.nowMs() - m.at < 30 * 60000) return null;
    return E.coachTriggers().sort((x, y) => PRIORITY.indexOf(x) - PRIORITY.indexOf(y))[0] || null;
  }
  function checkIns() {
    const id = due(); if (!id) return 0;
    S().chatPosted[id + ':' + (id === 'welcome' ? 'once' : today())] = true;
    post(id); App.save();
    return 1;
  }

  function tapReply(msgId, i) {
    if (busy) return;
    const m = S().chat.find((x) => x.id === msgId); if (!m || !m.replies || !m.replies[i]) return;
    const rep = m.replies[i];
    clearReplies();
    push({ from: 'me', text: rep.label });
    App.haptic(); App.sound('tick');
    App.onCoachMessage && App.onCoachMessage(null);
    let next = rep.go ? [rep.go] : null;
    if (rep.act && ACTIONS[rep.act]) { const res = ACTIONS[rep.act](rep.data); if (res) next = res; else if (res === null) return; }
    if (next) respond(next[0], next[1]);
  }

  // ── Free text ─────────────────────────────────────────────────────────────
  const INTENTS = [
    ['dizzy', /chest pain|faint|dizz|light.?headed|blacking out/],
    ['asthma', /asthma|wheez|can'?t breathe|breathless|short of breath|puffer|inhaler|tight chest|chest (is|feels) tight/],
    ['pain', /hurt|pain|injur|sharp|pinch|tweak|strain/],
    ['__food', /\b(going|heading|eating|dinner|lunch|brunch|breakfast|takeaway|order|restaurant|cafe|café|menu)\b/],
    ['sore_where', /\bsore|aching|achy|doms|stiff/],
    ['short_time', /short on time|no time|only (have|got)|quick (one|session)|in a rush|\d+\s*min/],
    ['cant_make', /can'?t make|cancel|move (it|my|the)|reschedul|another day|skip (it|today|this)|not today/],
    ['taken', /taken|occupied|someone('s| is) (on|using)|queue/],
    ['weight_q', /what weight|how heavy|how much (weight|should)|\bkg\b/],
    ['motivation', /tired|motivat|don'?t feel like|can'?t be bothered|lazy|not feeling it|no energy/],
    ['dinners_q', /\b(meal|cook|recipe|what (should|to) (i )?eat|hungry|dinners?)\b/],
    ['progress', /progress|stronger|results|improv|how am i (doing|going)/],
    ['ok', /^(thanks|thank you|cheers|ok|okay|got it|great|nice|perfect|cool)\b/],
  ];
  function send(text) {
    text = String(text || '').trim(); if (!text || busy) return;
    clearReplies();
    push({ from: 'me', text });
    App.onCoachMessage && App.onCoachMessage(null);
    const q = text.toLowerCase().replace(/[‘’]/g, "'");
    // safety first, whatever we were talking about
    const urgent = INTENTS.slice(0, 3).find(([, re]) => re.test(q));
    if (urgent) { delete S().chatExpect; return respond(urgent[0]); }
    if (S().chatExpect === 'place') {
      delete S().chatExpect;
      if (/^(never ?mind|cancel|forget it|no+|nah|not anymore)\b/.test(q)) return respond('ok');
      return later(() => restaurant(text));
    }
    for (const [id, re] of INTENTS.slice(3)) {
      if (!re.test(q)) continue;
      if (id === '__food') { if (E.detectCuisine(text) || E.extractPlace(text)) return later(() => restaurant(text)); if (/dinner|meal|cook/.test(q)) return respond('dinners_q'); continue; }
      return respond(id);
    }
    // a place name on its own ("Sushi Train", "Chat Thai") or a sentence naming one
    if (E.detectCuisine(text) && (E.extractPlace(text) || (text.split(/\s+/).length <= 5 && !/\?/.test(text)))) return later(() => restaurant(text));
    if (aiReady()) return askAI();
    respond('fallback');
  }
  function later(fn) { busy = true; App.onCoachTyping && App.onCoachTyping(true); setTimeout(() => { busy = false; App.onCoachTyping && App.onCoachTyping(false); fn(); App.sound('message'); App.haptic(); }, App.reduceMotion() ? 150 : 900); }

  // ── Claude, in the preview: same voice, replies with follow-up options ────
  function profileText() {
    const s = S(); const p = s.profile || {}; const plan = s.plan; const L = [];
    L.push('Name: ' + (p.name || ''));
    if (p.goals) L.push('Goals: ' + p.goals.map((g) => (D.GOALS.find((x) => x.id === g) || {}).label).join(', '));
    if (plan && plan.event) L.push('Working towards: ' + plan.event.name + ' on ' + fmtDate(plan.event.date));
    if (p.why) L.push('Their why: ' + p.why);
    if (p.health) L.push('Asthma: ' + (p.health.asthma ? 'yes' : 'no'));
    if (plan) {
      L.push('Experience: ' + ((D.EXPERIENCE.find((x) => x.id === p.experience) || {}).label || 'new') + '. Program: ' + ((E.SPLITS[plan.split] || {}).name || 'full body') + (plan.superset ? ', with supersets' : '') + '. Prefers ' + ({ m: 'machines', x: 'a mix of machines and free weights', f: 'free weights' }[plan.style] || 'machines') + '.');
      L.push('Gym: ' + E.gymName() + '; trains ' + plan.days.map((d) => DOW_LONG[d]).join(', ') + ', ' + plan.mins + ' min');
      if (p.worries && p.worries.length) L.push('What gets in the way: ' + p.worries.join(', '));
      if (p.focus && p.focus.length) L.push('Wants to bring up: ' + p.focus.join(', '));
      const prs = E.prCount(); if (prs) L.push('Personal records so far: ' + prs);
      const n = E.nextOpen(); if (n) L.push('Next session: ' + E.sessionName(n) + ' on ' + fmtDate(E.slotDate(n)) + ' (' + exNames(n).join(', ') + ')');
      const t = E.totals(); L.push('Sessions done: ' + t.done + ' of ' + t.total);
      const w = E.week(); L.push('This week: ' + w.train + '/' + w.trainMax + ' sessions, ' + w.eat + '/5 good food days');
    }
    if (p.cuisines) L.push('Eats: ' + p.cuisines.map((c) => (D.CUISINES.find((x) => x.id === c) || {}).name).join(', '));
    if (session && session.exId) L.push('Right now: in the gym, on the ' + D.EX[session.exId].name + '. App suggests ' + E.suggest(session.exId, session.slot).title + '.');
    return L.join('\n');
  }
  async function askAI() {
    busy = true; App.onCoachTyping && App.onCoachTyping(true);
    const rules = [
      'You are this member’s personal trainer, texting them inside the Spotter app.',
      'Write like a real coach texting a client: at most three short sentences, warm and direct, specific to their plan below. No lists, no headings, no filler, no generic tips. Ask at most one question.',
      'Australian English, kilograms. General fitness and healthy-eating guidance only: never diagnose, never give calorie targets or supplements. For pain, dizziness, chest pain or asthma symptoms: stop, use the reliever as their action plan says, see a GP, call 000 in an emergency.',
      'If asked whether you are a person, say you are their Spotter coach.',
      'Reply with ONLY a JSON object: {"reply": string, "options": [2 or 3 short replies the member might tap next, in their own voice, max 5 words each]}.',
      '', 'About the member:', profileText(),
    ].join('\n');
    const turns = [{ role: 'user', content: rules }].concat(S().chat.filter((m) => m.from !== 'note').slice(-12).map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text })));
    if (turns[turns.length - 1].role !== 'user') turns.push({ role: 'user', content: S().chat[S().chat.length - 1].text });
    try {
      const out = await aiSample.json(turns, { modelTier: 'quick', cache: false });
      busy = false; App.onCoachTyping && App.onCoachTyping(false);
      const reply = out && typeof out.reply === 'string' ? out.reply.slice(0, 700) : '';
      if (!reply) return respond('fallback');
      const opts = Array.isArray(out.options) ? out.options.filter((o) => typeof o === 'string' && o.trim()).slice(0, 3).map((o) => ({ label: o.slice(0, 40), say: true })) : [];
      postRaw({ text: reply, replies: opts }); App.sound('message'); App.haptic();
    } catch (e) {
      busy = false; App.onCoachTyping && App.onCoachTyping(false);
      if (e && ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e.code)) aiOff = true;
      respond('fallback');
    }
  }
  // A reply chip that came from Claude sends its text back as a message.
  function tap(msgId, i) {
    const m = S().chat.find((x) => x.id === msgId); if (!m || !m.replies || !m.replies[i]) return;
    if (m.replies[i].say) return send(m.replies[i].label);
    tapReply(msgId, i);
  }

  // Start a topic from elsewhere in the app (topic chips, search). Your words go in first.
  function topic(k, label) {
    if (busy) return;
    const map = { sore: 'sore_where', short: 'short_time', move: 'cant_make', taken: 'taken', motivation: 'motivation', pain: 'pain', asthma: 'asthma', eatout: 'eat_where', weight: 'weight_q', progress: 'progress' };
    clearReplies();
    if (label) push({ from: 'me', text: label });
    App.onCoachMessage && App.onCoachMessage(null);
    respond(map[k] || 'fallback');
  }
  // Run a plan change from a button elsewhere (session options), told as a message.
  function act(name, data, label) {
    if (busy || !ACTIONS[name]) return;
    clearReplies();
    if (label) push({ from: 'me', text: label });
    App.onCoachMessage && App.onCoachMessage(null);
    const res = ACTIONS[name](data);
    if (res) respond(res[0], res[1]);
  }
  // A plain message from the coach (after a session, after locking in an order).
  function say(text, replies) { return postRaw({ text, replies: replies || [] }); }
  function expecting() { return S().chatExpect || null; }
  function unread() { const r = S().chatRead || 0; return S().chat.filter((m) => m.from === 'coach' && m.at > r).length; }
  function markRead() { S().chatRead = App.nowMs(); App.save(); }
  function latest() { for (let i = S().chat.length - 1; i >= 0; i--) if (S().chat[i].from === 'coach') return S().chat[i]; return null; }
  function isBusy() { return busy; }

  // ── Menu photos (claude.ai preview): picks from what they actually serve ──
  let imgOk = null;
  function canReadMenus() {
    if (!aiReady()) return Promise.resolve(false);
    if (imgOk != null) return Promise.resolve(imgOk);
    return Promise.resolve().then(() => aiSample.limits()).then((l) => (imgOk = !!(l && l.images))).catch(() => (imgOk = false));
  }
  // What eating well means for this person today, for Claude reading a menu.
  function goalText() {
    const p = S().profile || {}; const g = p.goals || []; const L = [];
    if (g.includes('fat')) L.push('losing some body fat, so lighter dishes that still fill you up');
    if (g.includes('muscle') || g.includes('strong')) L.push((g.includes('muscle') ? 'building muscle' : 'getting stronger') + ', so plenty of protein');
    if (g.includes('event') && p.event) L.push('getting ready for ' + p.event.name);
    if (g.includes('energy') || g.includes('health')) L.push('more energy and better health');
    const t = today(); const trained = S().log.some((l) => l.date === t) || E.slotsOn(t).length;
    return (L.length ? 'Their goals: ' + L.join('; ') + '.' : 'Their goal: eating well without counting.') + (trained ? ' They train today, so a decent serve of carbs is fine.' : '');
  }
  function readMenu(file, name, cu) {
    const M = D.MENUS[cu];
    const prompt = [
      'You are a personal trainer helping a client order well at a restaurant. The image is a photo of the menu' + (name ? ' at ' + name : '') + (M ? ' (' + M.name + ' food)' : '') + '.',
      goalText(),
      'Pick the 3 best dishes on THIS menu for them: lean protein, vegetables, lighter sauces, still satisfying. Use dish names exactly as printed. No calorie numbers. Australian English.',
      'For each pick add 1 to 3 short requests they can make when ordering to make it healthier without losing what makes it good, e.g. "Dressing on the side", "Grilled, not fried", "Salad instead of chips". Each under 6 words.',
      'Reply with only JSON: {"place":"restaurant name if printed, else empty","cuisine":"one of: ' + Object.keys(D.MENUS).join(', ') + '","picks":[{"n":"dish name as printed","why":"why it suits their goals, under 10 words","mods":["request"]}],"treats":["up to 3 dish names best saved for a treat"]}',
      'If the image is not a readable menu, reply {"picks":[]}.',
    ].join('\n');
    const str = (x, n) => (typeof x === 'string' ? x.trim().slice(0, n) : '');
    return aiSample.json(prompt, { images: [file], modelTier: 'quick' }).then((out) => ({
      place: str(out && out.place, 60), cuisine: out && D.MENUS[out.cuisine] ? out.cuisine : '',
      picks: (out && Array.isArray(out.picks) ? out.picks : []).filter((x) => x && str(x.n, 80)).slice(0, 3).map((x) => ({ n: str(x.n, 80), t: 'pick', why: str(x.why, 120), mods: (Array.isArray(x.mods) ? x.mods : []).map((m) => str(m, 40)).filter(Boolean).slice(0, 3) })),
      treats: (out && Array.isArray(out.treats) ? out.treats : []).map((x) => str(x, 80)).filter(Boolean).slice(0, 3).map((n) => ({ n, t: 'treat' })),
    }));
  }
  // A menu photo sent in the chat: it goes in the thread, Claude reads it, and the picks come
  // back as an order card. ctx is "name|cuisine" when we already know the place.
  function photoIn(file, ctx) {
    if (!file || busy) return;
    let [name, cu] = String(ctx || '').split('|');
    if (!name) { const ev = S().events.filter((e) => e.type === 'eatout' && e.date === today()).pop(); const pl = S().places[0]; if (ev) { name = ev.title; cu = ev.cuisine; } else if (pl && App.nowMs() - pl.at < 3 * 3600000) { name = pl.name; cu = pl.cuisine; } }
    clearReplies(); delete S().chatExpect;
    App.thumb(file, 420, 0.6).then((img) => {
      push({ from: 'me', text: 'Menu photo', img });
      // only the latest few photos stay on the phone
      S().chat.filter((m) => m.img).slice(0, -4).forEach((m) => { delete m.img; m.text = 'Menu photo'; });
      App.save(); App.onCoachMessage && App.onCoachMessage(null);
    }).catch(() => {});
    busy = true; App.onCoachTyping && App.onCoachTyping(true);
    const finish = (msg) => { busy = false; App.onCoachTyping && App.onCoachTyping(false); if (msg) postRaw(msg); App.sound('message'); App.haptic(); };
    canReadMenus().then((yes) => {
      if (!yes) return finish(resolve('photo_off'));
      return readMenu(file, name, cu).then((res) => {
        if (!res.picks.length) return finish(resolve('photo_none'));
        const place = name || res.place || 'This restaurant';
        const cuisine = cu || res.cuisine || E.detectCuisine(place) || '';
        App.rememberPlace(place, cuisine, { picks: res.picks, treats: res.treats, at: App.nowMs() });
        E.track('eatout');
        finish({ text: 'From ' + (place === 'This restaurant' ? 'their' : place + '’s') + ' menu, here’s what I’d order:', card: { type: 'menu', place, cuisine }, replies: [a('Lock it in', 'lock', place + '|' + cuisine), a('See all three', 'openMenu', place + '|' + cuisine), r('Why these?', 'menu_why')] });
      });
    }).catch((e) => {
      if (e && ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e.code)) aiOff = true;
      finish(resolve(e && e.code === 'image_rejected' ? 'photo_none' : 'photo_off'));
    });
  }

  // A session starting moves the conversation on: old reply chips go.
  function clear() { clearReplies(); delete S().chatExpect; App.save(); }
  App.Coach = { initAI, aiReady, setSession, checkIns, due, post, say, note, clear, tap, send, topic, act, expecting, unread, markRead, latest, isBusy, restaurant, canReadMenus, readMenu, photoIn };
})();
