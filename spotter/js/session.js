/* Spotter — the guided session: ready → warm-up → one machine at a time → cool-down → summary.
   The coach rides along: tap the chat button any time, and it knows which machine you're on. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const E = App.E;
  const { esc, icon, art, today } = App;
  const S = () => App.S;

  let host = null;      // overlay container
  let tick = null;      // cardio timer
  let rest = null;      // rest timer state

  function ensureHost() { if (!host) { host = document.createElement('div'); host.id = 'sx'; document.body.appendChild(host); } return host; }
  function isOpen() { return !!host; }
  function close() {
    clearInterval(tick); tick = null; closeRest(true);
    if (host) { host.remove(); host = null; }
    App.keepAwake(false); App.Coach.setSession(null);
    document.body.style.overflow = '';
  }

  // ── Start / resume ────────────────────────────────────────────────────────
  function start(slotId) {
    const s = S();
    if (s.active) return open();
    const slot = E.slotById(slotId); if (!slot) return;
    const plan = s.plan; const t = today();
    if (E.slotDate(slot) !== t) s.moves[slot.id] = t;
    const steps = [{ t: 'ready', checks: {} }, { t: 'cardio', role: 'warmup', id: plan.warmup.id, min: plan.warmup.min, elapsed: 0, runFrom: null }];
    E.exercisesFor(slot.key, slot.week, slot.id).forEach((e) => steps.push(exStep(e.id, e.base, e.sets, slot.id, e)));
    if (plan.finisher && !s.trims[slot.id]) steps.push({ t: 'cardio', role: 'finisher', id: plan.finisher.id, min: plan.finisher.min, elapsed: 0, runFrom: null });
    steps.push({ t: 'cooldown', ticks: {} });
    s.active = { id: App.uid(), slot: slot.id, key: slot.key, week: slot.week, date: t, startedAt: Date.now(), gymId: plan.gymId, step: 0, steps };
    App.saveNow(); App.Coach.clear();
    App.closeLayer(true); App.Views.closeSearch();
    open();
  }
  // o: the plan's reps, rest and superset pairing for this exercise.
  function exStep(id, base, n, slotId, o) {
    o = o || {};
    const sg = E.suggest(id, slotId, o);
    const sets = []; for (let i = 0; i < n; i++) sets.push({ w: sg.w, r: sg.r, done: false });
    return { t: 'ex', id, base, sets, effort: null, firstFeel: null, mode: sg.mode, sgTitle: sg.title, sgWhy: sg.why, howOpen: !E.lastPerf(id), reps: o.reps || null, rest: o.rest || null, pair: o.pair || null, pairRole: o.pairRole || null, deload: !!o.deload };
  }
  function partnerOf(st) { const a = S().active; return st && st.pair && a ? a.steps.find((x) => x !== st && x.t === 'ex' && x.pair === st.pair) || null : null; }
  function ssTag(st) { return 'ABCDEFG'.charAt(Number(st.pair.slice(1)) - 1) + (st.pairRole === 'a' ? '1' : '2'); }
  function open() {
    ensureHost(); document.body.style.overflow = 'hidden';
    App.keepAwake(true); render();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render(dir) {
    const a = S().active; if (!a) return close();
    ensureHost();
    const st = a.steps[a.step]; const plan = S().plan;
    const exSteps = a.steps.filter((x) => x.t === 'ex');
    const bar = a.steps.map((x, i) => '<i class="' + (i < a.step ? 'is-done' : i === a.step ? 'is-now' : '') + '"></i>').join('');
    const where = st.t === 'ready' ? 'Getting ready' : st.t === 'cardio' ? (st.role === 'warmup' ? 'Warm-up' : 'Finisher') : st.t === 'ex' ? 'Exercise ' + (exSteps.indexOf(st) + 1) + ' of ' + exSteps.length + (st.pair ? ' · superset ' + ssTag(st) : '') : 'Cool-down';
    let v;
    if (st.t === 'ready') v = readyStep(a, st, plan);
    else if (st.t === 'cardio') v = cardioStep(a, st);
    else if (st.t === 'ex') v = exerciseStep(a, st);
    else v = cooldownStep(a, st);
    host.innerHTML = '<div class="sx" role="dialog" aria-label="Session in progress">' +
      '<div class="sx__nav"><button class="icon-btn" data-act="sxLeave" aria-label="Pause or finish">' + icon('x') + '</button>' +
        '<div class="sx__title"><div class="sx__name">' + esc(plan.sessions[a.key].name) + '</div><div class="sx__step">' + esc(where) + '</div></div>' +
        '<button class="icon-btn sx__coach" data-act="openCoachSheet" aria-label="Message your coach">' + icon('coach') + (App.Coach.unread() ? '<span class="dot-new"></span>' : '') + '</button></div>' +
      '<div class="sx__bar" aria-hidden="true">' + bar + '</div>' +
      '<div class="sx__scroll"><div class="sx__body' + (dir < 0 ? ' is-back' : '') + '">' + v.body + '</div></div>' +
      '<div class="sx__foot"><div class="sx__foot-inner">' + v.foot + '</div></div>' +
    '</div>';
    const sc = host.querySelector('.sx__scroll'); if (sc) sc.scrollTop = 0;
    clearInterval(tick); tick = null;
    if (st.t === 'cardio') { tick = setInterval(updateCardio, 500); updateCardio(); }
    App.Coach.setSession(st.t === 'ex' ? { exId: st.id, slot: a.slot } : null);
  }
  function coachLine(title, text) {
    return '<div class="coachline"><span class="coach-avatar">' + App.Views.coachGlyph() + '</span><div class="coachline__main">' + (title ? '<div class="coachline__title">' + title + '</div>' : '') + '<div class="coachline__text">' + text + '</div></div></div>';
  }
  function checkCell(act, key, on, title, sub, ic) {
    return '<button class="cell' + (on ? ' is-on' : '') + '" data-act="' + act + '" data-v="' + key + '"><span class="checkbox">' + icon('check') + '</span><span class="cell__main"><span class="cell__title">' + esc(title) + '</span>' + (sub ? '<span class="cell__sub">' + esc(sub) + '</span>' : '') + '</span>' + (ic ? icon(ic, 'ic muted') : '') + '</button>';
  }

  function readyStep(a, st, plan) {
    const p = S().profile; const sess = plan.sessions[a.key]; const phase = E.phaseFor(a.week, plan);
    const items = [['water', 'Water bottle', '', 'water'], ['towel', 'Towel', '', 'towel'], ['phone', 'Headphones, if you like', '', 'headphones']];
    if (p.health.asthma) items.unshift(['puffer', 'Reliever puffer in your bag', 'Use it before the warm-up only if your action plan says to', 'puffer']);
    const first = !S().log.length;
    const rows = a.steps.filter((x) => x.t !== 'ready').map((x) => {
      if (x.t === 'cardio') return '<div class="cell"><span class="cell__tile cell__tile--art">' + art(D.EX[x.id].art) + '</span><span class="cell__main"><span class="cell__title">' + (x.role === 'warmup' ? 'Warm-up' : 'Finisher') + '</span><span class="cell__sub">' + esc(D.EX[x.id].name) + ' · ' + x.min + ' min</span></span></div>';
      if (x.t === 'cooldown') return '<div class="cell"><span class="cell__tile cell__tile--art">' + art('mat') + '</span><span class="cell__main"><span class="cell__title">Cool-down</span><span class="cell__sub">Four easy stretches</span></span></div>';
      return '<div class="cell"><span class="cell__tile cell__tile--art">' + art(D.EX[x.id].art) + '</span><span class="cell__main"><span class="cell__title">' + (x.pair ? '<span class="sstag">' + ssTag(x) + '</span>' : '') + esc(D.EX[x.id].name) + '</span><span class="cell__sub">' + x.sets.length + ' sets' + (x.reps ? ' · ' + x.reps[0] + '–' + x.reps[1] + (D.EX[x.id].unit === 'sec' ? ' sec' : ' reps') : '') + '</span></span><span class="cell__value" style="font-size:15px">' + esc(x.mode === 'find' ? 'Find it' : x.sgTitle) + '</span></div>';
    }).join('');
    return {
      body: '<div class="ex-h"><div class="eyebrow">Week ' + a.week + ' · ' + esc(phase.name) + '</div><h1 class="ex-h__title">' + esc(sess.title) + '</h1><div class="ex-h__sub">' + esc(E.gymName()) + ' · about ' + plan.mins + ' min</div></div>' +
        (first ? coachLine('Day one', (plan.level || 1) >= 2 ? 'First session on the plan. Warm up properly, then find working weights that leave a rep or two in the tank. I’ll set everything from there.' : 'Light weights, no rush. Today is about learning how each machine sets up. I’ll walk you through every step.') : S().eases[a.slot] ? coachLine('Easier today', 'I’ve taken a step off the weights so you can recover and still train.') : phase.deload ? coachLine('Lighter week', esc(phase.note)) : a.steps.some((x) => x.pair) ? coachLine('Supersets today', 'Exercises marked A1 and A2 go back to back: one set of each, then rest. I’ll switch between them for you.') : '') +
        '<div class="sec"><div class="sec__label">Before you start</div><div class="group checklist">' + items.map((it) => checkCell('sxCheck', it[0], st.checks[it[0]], it[1], it[2], it[3])).join('') + '</div></div>' +
        '<div class="sec"><div class="sec__label">Today</div><div class="group group--tiles">' + rows + '</div></div>',
      foot: '<button class="btn btn--block btn--accent" data-act="sxNext">Start the warm-up</button>',
    };
  }

  function cardioStep(a, st) {
    const ex = D.EX[st.id]; const warm = st.role === 'warmup';
    const alts = E.cardioOptions(st.id).slice(0, 4);
    return {
      body: '<div class="ex-h"><div class="eyebrow">' + (warm ? 'Warm-up' : 'Finisher') + '</div><h1 class="ex-h__title">' + esc(ex.name) + '</h1><div class="ex-h__sub">' + st.min + ' minutes, ' + (warm ? 'easy, building to steady' : 'brisk, with a slight incline') + '</div></div>' +
        '<div class="timer"><div class="timer__ring"><svg viewBox="0 0 220 220"><circle class="timer__track" cx="110" cy="110" r="96"/><circle class="timer__bar" data-cbar cx="110" cy="110" r="96" stroke-dasharray="603.2" stroke-dashoffset="603.2"/></svg>' +
          '<div class="timer__inner"><div class="timer__num" data-ctime>' + mmss(st.min * 60 - st.elapsed) + '</div><div class="timer__lbl" data-cphase>Ready</div></div></div>' +
          '<button class="btn btn--sm ' + (st.runFrom ? 'btn--tinted' : 'btn--tinted-accent') + '" data-act="sxCardio" data-cbtn>' + (st.runFrom ? icon('pause', 'ic-sm') + 'Pause' : icon('play', 'ic-sm') + (st.elapsed ? 'Resume' : 'Start timer')) + '</button></div>' +
        (warm && S().profile.health.asthma ? '<div class="callout callout--blue">' + icon('puffer') + '<div>Build up gradually. If your chest tightens, stop and use your reliever. If it comes back a second time, call it a day.</div></div>' : '') +
        '<div class="group">' + App.Views.discHtml('cardio-how', 'How to', '<ol class="steps">' + ex.setup.concat(ex.move).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>') + '</div>' +
        (alts.length ? '<div class="sec"><div class="sec__label">' + esc(ex.name) + ' taken?</div><div class="chips">' + alts.map((x) => '<button class="chip" data-act="sxCardioSwap" data-v="' + x + '">' + esc(D.EX[x].name) + '</button>').join('') + '</div></div>' : ''),
      foot: '<button class="btn btn--block" data-act="sxNext">' + (warm ? 'Warm-up done' : 'Finisher done') + '</button>',
    };
  }
  function cardioElapsed(st) { return st.elapsed + (st.runFrom ? (Date.now() - st.runFrom) / 1000 : 0); }
  function updateCardio() {
    const a = S().active; if (!a || !host) return;
    const st = a.steps[a.step]; if (!st || st.t !== 'cardio') return;
    const total = st.min * 60; const el = Math.min(total, cardioElapsed(st)); const left = total - el;
    const bar = host.querySelector('[data-cbar]'); const time = host.querySelector('[data-ctime]'); const ph = host.querySelector('[data-cphase]');
    if (bar) bar.setAttribute('stroke-dashoffset', (603.2 * (1 - el / total)).toFixed(1));
    if (time) time.textContent = mmss(left);
    if (ph) ph.textContent = !st.runFrom && !st.elapsed ? 'Ready' : left <= 0 ? 'Done' : !st.runFrom ? 'Paused' : el < total * 0.35 ? 'Easy pace' : el < total * 0.75 ? 'Build a little' : 'Steady, still chatty';
    if (left <= 0 && st.runFrom) {
      st.elapsed = total; st.runFrom = null; App.save();
      App.sound('timer'); App.haptic('success');
      const b = host.querySelector('[data-cbtn]'); if (b) b.outerHTML = '<span class="muted" style="font-size:15px">Time’s up. Nice work.</span>';
    }
  }
  function mmss(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }

  function exerciseStep(a, st) {
    const ex = D.EX[st.id];
    const saved = S().exSettings[st.id] || {};
    const gym = E.gym(); const partner = partnerOf(st);
    const exSteps = a.steps.filter((x) => x.t === 'ex');
    const idx = exSteps.indexOf(st) + 1;
    const allDone = st.sets.length && st.sets.every((x) => x.done);
    const title = st.mode === 'find' ? 'Find your weight' : 'Today: ' + esc(st.sgTitle);
    const how = '<div class="mini-h">Set up</div><ol class="steps">' + ex.setup.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>' +
      '<div class="mini-h">The move</div><ol class="steps">' + ex.move.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>' +
      (ex.feel ? '<div class="mini-h">You should feel it</div><p style="font-size:16px">' + esc(ex.feel) + '</p>' : '') +
      (ex.avoid && ex.avoid.length ? '<div class="mini-h">Avoid</div><ul class="dots-list">' + ex.avoid.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '');
    const body =
      '<div class="photo">' + (saved.photo ? '<img src="' + saved.photo + '" alt="Your photo of the ' + esc(ex.name) + '">' : art(ex.art)) +
        (saved.photo ? '' : '<div class="photo__cap">' + icon('pin') + '<span>Add your own photo of it at ' + esc(gym ? gym.short || gym.name : 'your gym') + '</span></div>') +
        '<button class="photo__add" data-act="sxPhoto">' + icon('camera') + (saved.photo ? 'Change' : 'Add photo') + '</button></div>' +
      '<input type="file" accept="image/*" data-photo-input hidden>' +
      '<div class="ex-h"><div class="eyebrow">' + esc(ex.focus || '') + '</div><h1 class="ex-h__title">' + esc(ex.name) + '</h1></div>' +
      (saved.seat ? '<button class="callout callout--blue" data-act="sxSettings" style="width:100%;text-align:left">' + icon('sliders') + '<div style="flex:1"><b>Your settings:</b> ' + esc(saved.seat) + '</div></button>' : '') +
      (partner ? '<button class="ssbar" data-act="sxGoPartner"><span class="sstag">' + ssTag(st) + '</span><span class="ssbar__text"><b>Superset with the ' + esc(App.lc(D.EX[partner.id].name)) + '.</b> ' + (st.pairRole === 'a' ? 'One set here, then straight there. Rest after both.' : 'Rest after this one, then back to the start.') + '</span>' + icon('swap', 'ic-sm') + '</button>' : '') +
      coachLine(title, esc(st.sgWhy)) +
      '<div data-sets>' + setsHtml(st, ex) + '</div>' +
      '<div data-firstfeel>' + firstFeelHtml(st, ex) + '</div>' +
      '<div data-effort>' + effortsHtml(st) + '</div>' +
      '<div class="group group--tiles">' +
        App.Views.discHtml('how-' + st.id, 'How to do it', how, st.howOpen, ['info', 'bg-blue']) +
        '<button class="cell" data-act="sxSettings"><span class="cell__tile bg-ink">' + icon('sliders') + '</span><span class="cell__main"><span class="cell__title">' + (saved.seat ? 'My settings' : 'Save my settings') + '</span><span class="cell__sub">' + esc(saved.seat || 'Seat and pad positions for next time') + '</span></span>' + icon('right', 'cell__chev') + '</button>' +
        '<button class="cell" data-act="sxSwap"><span class="cell__tile bg-accent">' + icon('swap') + '</span><span class="cell__main"><span class="cell__title">Machine taken?</span><span class="cell__sub">Swap for one that works the same muscles</span></span>' + icon('right', 'cell__chev') + '</button>' +
      '</div>';
    const last = a.step === a.steps.length - 2;
    const next = st.sets.findIndex((x) => !x.done);
    const foot = allDone
      ? '<button class="btn btn--block' + (st.effort ? '' : ' btn--tinted') + '" data-act="sxNext">' + (last ? 'On to the cool-down' : partner && st.pairRole === 'a' && partner.sets.some((x) => !x.done) ? 'On to the ' + esc(App.lc(D.EX[partner.id].name)) : 'Next exercise') + '</button>'
      : '<button class="btn btn--tinted" data-act="sxNext">Skip</button><button class="btn btn--accent" data-act="sxDoneNext">' + icon('check') + 'Log set ' + (next + 1) + '</button>';
    return { body, foot };
  }
  function setsHtml(st, ex) {
    const one = ex.unit !== 'kg';
    const rUnit = ex.unit === 'sec' ? 'Seconds' : ex.perSide ? 'Each side' : 'Reps';
    return '<div class="sets' + (one ? ' sets--one' : '') + '"><div class="sets__head"><span>Set</span>' + (one ? '' : '<span>' + (ex.assist ? 'kg help' : 'kg') + '</span>') + '<span>' + rUnit + '</span><span></span></div>' +
      st.sets.map((x, i) => setRow(st, ex, x, i)).join('') +
      '<button class="sets__add" data-act="sxAddSet">' + icon('plus') + 'Add a set</button></div>';
  }
  function setRow(st, ex, x, i) {
    const nextIdx = st.sets.findIndex((y) => !y.done);
    return '<div class="setrow' + (x.done ? ' is-done' : '') + (i === nextIdx ? ' is-next' : '') + (x.pr ? ' is-pr' : '') + '" data-set="' + i + '"><span class="setrow__n">' + (i + 1) + (x.pr ? '<span class="setrow__pr">PR</span>' : '') + '</span>' +
      (ex.unit === 'kg' ? val(i, 'w', App.fmtKg(x.w), ex) : '') + val(i, 'r', x.r, ex) +
      '<button class="tick" data-act="sxDone" data-v="' + i + '" aria-label="' + (x.done ? 'Undo set ' : 'Log set ') + (i + 1) + '">' + icon('check') + '</button></div>';
  }
  // Steppers for quick changes; tap the number to type an exact value, like 42.25.
  function val(i, f, v, ex) {
    const what = f === 'w' ? (ex.assist ? 'kilograms of help' : 'kilograms') : ex.unit === 'sec' ? 'seconds' : 'reps';
    return '<div class="val"><button class="val__btn" data-act="sxStep" data-v="' + i + '|' + f + '|-1" aria-label="Less">' + icon('minus') + '</button>' +
      '<input class="val__num val__in' + (String(v).length >= 5 ? ' is-long' : '') + '" data-num="' + i + f + '" value="' + v + '" inputmode="' + (f === 'w' ? 'decimal' : 'numeric') + '" enterkeyhint="done" autocomplete="off" data-change="sxSetVal" data-v="' + i + '|' + f + '" aria-label="Set ' + (i + 1) + ', ' + what + '">' +
      '<button class="val__btn" data-act="sxStep" data-v="' + i + '|' + f + '|1" aria-label="More">' + icon('plus') + '</button></div>';
  }
  function firstFeelHtml(st, ex) {
    if (st.mode !== 'find' || ex.unit !== 'kg' || st.firstFeel || !st.sets[0].done || st.sets.every((x) => x.done)) return '';
    return '<div class="card" style="display:grid;gap:12px"><div><div style="font-weight:600">How did set 1 feel?</div><div class="muted" style="font-size:15px">I’ll set the weight for the rest.</div></div><div class="seg seg--lg">' +
      [['light', 'Too light'], ['right', 'About right'], ['heavy', 'Too heavy']].map((o) => '<button class="seg__btn" data-act="sxFirstFeel" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div></div>';
  }
  function effortHtml(st, other) {
    const pred = st.effort ? E.predictNext(st.id, st.sets, st.effort, st.reps) : null;
    const idx = other ? ' data-s="' + S().active.steps.indexOf(st) + '"' : '';
    return '<div class="card" style="display:grid;gap:12px"><div><div style="font-weight:600">' + (other ? 'And the ' + esc(App.lc(D.EX[st.id].name)) + '?' : 'How did that feel?') + '</div>' + (other ? '' : '<div class="muted" style="font-size:15px">This is how I set your next weights.</div>') + '</div><div class="seg seg--lg">' +
      [['easy', 'Easy'], ['right', 'Just right'], ['hard', 'Hard']].map((o) => '<button class="seg__btn' + (st.effort === o[0] ? ' is-on' : '') + '" data-act="sxEffort" data-v="' + o[0] + '"' + idx + '>' + o[1] + '</button>').join('') + '</div>' +
      (pred ? '<div class="nexttime" style="box-shadow:none;background:var(--fill-2);padding:12px 14px"><span class="nexttime__l">Next time</span><span class="nexttime__v">' + (pred.up ? icon('up') : '') + esc(pred.text) + '</span></div>' : '') + '</div>';
  }
  // With a superset, the partner's question waits on the second exercise until both are done.
  function effortsHtml(st) {
    if (!(st.sets.length && st.sets.every((x) => x.done))) return '';
    const pt = partnerOf(st);
    const late = pt && st.pairRole === 'b' && pt.sets.length && pt.sets.every((x) => x.done) && !pt.effort && !pt.skipped;
    return effortHtml(st) + (late ? '<div style="margin-top:12px">' + effortHtml(pt, true) + '</div>' : '');
  }

  function cooldownStep(a, st) {
    return {
      body: '<div class="ex-h"><div class="eyebrow">Last step</div><h1 class="ex-h__title">Cool down</h1><div class="ex-h__sub">Five easy minutes on the bike or a slow walk, then these. About 30 seconds each, no bouncing.</div></div>' +
        '<div class="group checklist">' + D.COOLDOWN.map((c, i) => checkCell('sxTick', i, st.ticks[i], c.name, c.how)).join('') + '</div>',
      foot: '<button class="btn btn--block btn--accent" data-act="sxFinish">Finish session</button>',
    };
  }

  // ── Set logging ───────────────────────────────────────────────────────────
  function curEx() { const a = S().active; const st = a && a.steps[a.step]; return st && st.t === 'ex' ? st : null; }
  function refreshSets(popIdx) {
    const st = curEx(); if (!st || !host) return;
    const ex = D.EX[st.id];
    const box = host.querySelector('[data-sets]'); if (box) box.innerHTML = setsHtml(st, ex);
    if (popIdx != null) { const r = host.querySelector('[data-set="' + popIdx + '"]'); if (r) r.classList.add('is-pop'); }
    const ff = host.querySelector('[data-firstfeel]'); if (ff) ff.innerHTML = firstFeelHtml(st, ex);
    const ef = host.querySelector('[data-effort]'); if (ef) ef.innerHTML = effortsHtml(st);
    const foot = host.querySelector('.sx__foot-inner'); if (foot) foot.innerHTML = exerciseStep(S().active, st).foot;
  }
  function logSet(i) {
    const st = curEx(); if (!st) return;
    const set = st.sets[i]; const ex = D.EX[st.id];
    if (set.done) { set.done = false; delete set.pr; App.save(); refreshSets(); return; }
    set.done = true;
    // a personal record against every earlier session and today's earlier sets
    const pr = E.prFor(st.id, set, st.sets.filter((x, j) => j !== i && x.done));
    if (pr) { set.pr = pr.kind; S().active.prs = (S().active.prs || 0) + 1; }
    App.save();
    App.sound('set'); App.haptic();
    refreshSets(i);
    if (pr && !st.prShown) { st.prShown = true; App.save(); setTimeout(() => prPop(st, ex, set, pr), 260); }
    const pt = partnerOf(st); const ptLeft = pt && !pt.skipped && pt.sets.some((x) => !x.done);
    const firstFind = st.mode === 'find' && i === 0 && ex.unit === 'kg' && !st.firstFeel;
    if (st.sets.every((x) => x.done)) {
      closeRest(true);
      if (ptLeft) { goPartner(st.pairRole === 'b'); return; }
      setTimeout(() => { const ef = host && host.querySelector('[data-effort]'); if (ef) ef.scrollIntoView({ behavior: App.reduceMotion() ? 'auto' : 'smooth', block: 'center' }); }, 120);
    } else if (firstFind) {
      // set 1 on a new exercise: ask how it felt before anything else
    } else if (ptLeft) {
      if (st.pairRole === 'a') goPartner(false);
      else { openRest(st, ex); goPartner(true); }
    } else openRest(st, ex);
  }
  // Move between the two exercises of a superset.
  function goPartner(afterRest) {
    const a = S().active; const st = curEx(); const pt = partnerOf(st); if (!pt) return;
    setTimeout(() => {
      if (!S().active || curEx() !== st) return;
      a.step = a.steps.indexOf(pt); App.save(); render(1);
      if (!afterRest) App.toast('Now the ' + App.lc(D.EX[pt.id].name), 'swap');
    }, afterRest ? 350 : 700);
  }
  function step(i, f, dir) {
    const st = curEx(); if (!st) return;
    const ex = D.EX[st.id]; const set = st.sets[i];
    if (f === 'w') set.w = Math.max(0, Math.round((set.w + dir * E.stepOf(st.id)) * 100) / 100);
    else set.r = Math.max(1, set.r + dir * (ex.unit === 'sec' ? 5 : 1));
    if (!set.done) st.sets.forEach((x, j) => { if (j > i && !x.done) x[f] = set[f]; });
    App.save(); refreshSets();
    const n = host.querySelector('[data-num="' + i + f + '"]'); if (n) { n.classList.remove('is-bump'); void n.offsetWidth; n.classList.add('is-bump'); }
    App.sound('tick'); App.haptic();
  }

  // ── Rest: a small capsule above the buttons, so the next set stays in view ─
  function openRest(st, ex) {
    closeRest(true);
    const pt = partnerOf(st); const back = pt && st.pairRole === 'b' && pt.sets.some((x) => !x.done);
    const secs = st.rest && !(st.pair && st.pairRole === 'a') ? st.rest : st.pair ? Math.max(60, Math.min(90, ex.rest || 75)) : ex.rest || 60;
    if (back) { st = pt; ex = D.EX[pt.id]; }
    const ni = st.sets.findIndex((x) => !x.done); const ns = st.sets[ni];
    const el = document.createElement('div');
    el.className = 'restbar'; el.setAttribute('role', 'timer'); el.setAttribute('aria-label', 'Rest');
    el.innerHTML = '<svg class="restbar__ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="bg" cx="22" cy="22" r="18"/><circle class="fg" cx="22" cy="22" r="18" stroke-dasharray="113.1" stroke-dashoffset="0"/></svg>' +
      '<div class="restbar__main"><div class="restbar__time" data-rtime>' + mmss(secs) + '</div><div class="restbar__next">Rest · next: ' + (back ? esc(App.lc(ex.name)) + ' set ' : 'set ') + (ni + 1) + (ex.unit === 'kg' ? ', ' + App.fmtKg(ns.w) + ' kg × ' + ns.r : ', ' + ns.r + (ex.unit === 'sec' ? ' s' : '')) + '</div></div>' +
      '<button data-act="restAdd">+15 s</button><button data-act="restSkip">Skip</button>';
    document.body.appendChild(el);
    rest = { el, end: Date.now() + secs * 1000, total: secs, timer: setInterval(updateRest, 250) };
    updateRest();
  }
  function updateRest() {
    if (!rest) return;
    const left = Math.max(0, (rest.end - Date.now()) / 1000);
    const fg = rest.el.querySelector('.fg'); if (fg) fg.setAttribute('stroke-dashoffset', (113.1 * (1 - left / rest.total)).toFixed(1));
    const t = rest.el.querySelector('[data-rtime]'); if (t) t.textContent = left > 0 ? mmss(left) : 'Go';
    if (left <= 0 && !rest.over) { rest.over = true; rest.el.classList.add('is-over'); App.sound('timer'); App.haptic('success'); setTimeout(() => closeRest(), 1500); }
  }
  function closeRest(silent) {
    if (!rest) return;
    clearInterval(rest.timer); const el = rest.el; rest = null;
    if (silent) { el.remove(); return; }
    el.classList.add('is-out'); setTimeout(() => el.remove(), 300);
    setTimeout(() => App.Views.celebrate(), 350);
  }

  // ── Coach hooks: swap, lower, skip the current exercise ──────────────────
  function swapPool(st) {
    const a = S().active;
    const inSession = a.steps.filter((x) => x.t === 'ex').map((x) => x.id);
    return E.swapsFor(st.id, st.base, inSession);
  }
  function keep(st) { return { reps: st.reps, rest: st.rest, pair: st.pair, pairRole: st.pairRole, deload: st.deload }; }
  function swapCurrent() {
    const st = curEx(); if (!st) return null;
    const to = swapPool(st)[0]; if (!to) return null;
    Object.assign(st, exStep(to, st.base, st.sets.length, S().active.slot, keep(st)));
    App.save(); render(); return D.EX[to].name;
  }
  function lowerCurrent() {
    const st = curEx(); if (!st || D.EX[st.id].unit !== 'kg') return null;
    const stp = E.stepOf(st.id); let w = null;
    st.sets.forEach((x) => { if (!x.done) { x.w = Math.max(0, Math.round((x.w - stp) * 100) / 100); w = x.w; } });
    App.save(); refreshSets(); return w != null ? App.fmtKg(w) + ' kg' : null;
  }
  function skipCurrent() { const st = curEx(); if (!st) return; st.skipped = true; App.ACT.sxNext(); }

  // ── Finish ────────────────────────────────────────────────────────────────
  function finish() {
    const s = S(); const a = s.active; if (!a) return;
    closeRest(true); clearInterval(tick);
    const steps = a.steps.filter((x) => x.t === 'ex');
    const exs = steps.map((x) => ({ id: x.id, sets: x.sets.filter((y) => y.done).map((y) => ({ w: y.w, r: y.r })), effort: x.effort, reps: x.reps || undefined })).filter((e) => e.sets.length);
    // the best record per exercise: the last set that beat the rest
    const prs = [];
    steps.forEach((x) => { const done = x.sets.filter((y) => y.done); for (let i = done.length - 1; i >= 0; i--) { if (!done[i].pr) continue; const r = E.prFor(x.id, done[i], done.slice(0, i)); if (r) { prs.push(Object.assign({ id: x.id, w: done[i].w, r: done[i].r }, r)); break; } } });
    const mins = Math.max(1, Math.round((Date.now() - a.startedAt) / 60000));
    const entry = { id: a.id, slot: a.slot, key: a.key, week: a.week, date: today(), mins, gymId: a.gymId, ex: exs, prs, mood: null };
    s.log.push(entry); s.active = null;
    if (prs.length) s.seen.stronger = true;
    App.saveNow();
    App.Coach.setSession(null);
    App.checkAwards();
    summary(entry);
  }
  function summary(entry) {
    ensureHost(); clearInterval(tick);
    const plan = S().plan; const tot = E.totals();
    const sets = App.sum(entry.ex.map((e) => e.sets.length));
    const kg = Math.round(App.sum(entry.ex.map((e) => D.EX[e.id].unit === 'kg' && !D.EX[e.id].assist ? App.sum(e.sets.map((x) => x.w * x.r)) : 0)));
    const ups = entry.ex.map((e) => { const p = e.effort ? E.predictNext(e.id, e.sets.map((x) => Object.assign({ done: true }, x)), e.effort, e.reps) : null; return p && p.up ? { id: e.id, text: p.text } : null; }).filter(Boolean);
    const prs = entry.prs || [];
    const nxt = E.nextOpen(App.addDays(today(), 1));
    const pr = E.partnerRewards().find((r) => !r.open);
    const left = pr ? Math.max(0, pr.need - tot.done) : 0;
    const titles = ['Session done.', 'That’s another one.', 'Nicely done.', 'Strong work.'];
    host.innerHTML = '<div class="summary" role="dialog" aria-label="Session complete"><div class="summary__inner">' +
      '<div class="summary__check">' + icon('check') + '</div>' +
      '<div><div class="eyebrow">' + esc(plan.sessions[entry.key].name) + ' · ' + tot.done + ' of ' + tot.total + '</div><h1 class="summary__title">' + titles[(S().log.length - 1) % titles.length] + '</h1>' +
        (pr ? '<p class="lead" style="margin-top:6px">' + (left ? left + ' more ' + App.plural(left, 'session') + ' until ' + esc(pr.text.charAt(0).toLowerCase() + pr.text.slice(1)) + '.' : 'You’ve unlocked a reward.') + '</p>' : '') + '</div>' +
      '<div class="stats"><div class="stat"><div class="stat__v" data-count="' + entry.mins + '">0</div><div class="stat__l">Minutes</div></div><div class="stat"><div class="stat__v" data-count="' + sets + '">0</div><div class="stat__l">Sets</div></div><div class="stat"><div class="stat__v" data-count="' + kg + '">0</div><div class="stat__l">kg lifted</div></div></div>' +
      (prs.length ? '<div class="sec"><div class="sec__label">' + prs.length + ' personal ' + App.plural(prs.length, 'record') + '</div><div class="group group--tiles">' + prs.map((r) => { const ex = D.EX[r.id]; const t = E.prText(r.id, r); return '<div class="cell"><span class="cell__tile bg-gold">' + icon('trophy') + '</span><span class="cell__main"><span class="cell__title">' + esc(ex.name) + '</span><span class="cell__sub">' + esc(t.title) + '</span></span><span class="cell__value t-gold" style="font-weight:600">' + esc(ex.unit === 'kg' ? App.fmtKg(r.w) + ' kg × ' + r.r : r.r + (ex.unit === 'sec' ? ' s' : ' reps')) + '</span></div>'; }).join('') + '</div></div>' : '') +
      (ups.length ? '<div class="sec"><div class="sec__label">Going up next time</div><div class="group group--tiles">' + ups.map((u) => '<div class="cell"><span class="cell__tile cell__tile--art">' + art(D.EX[u.id].art) + '</span><span class="cell__main"><span class="cell__title">' + esc(D.EX[u.id].name) + '</span></span><span class="cell__value t-green" style="font-weight:600">' + esc(u.text) + '</span></div>').join('') + '</div></div>' : '') +
      '<div class="sec"><div class="sec__label">How do you feel?</div><div class="seg seg--lg">' + [['great', 'Great'], ['good', 'Good'], ['tired', 'Tired']].map((o) => '<button class="seg__btn" data-act="sxMood" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div></div>' +
      (nxt ? '<div class="group"><div class="cell"><span class="cell__main"><span class="cell__sub">Next up</span><span class="cell__title">' + esc(plan.sessions[nxt.key].name + ' · ' + App.rel(E.slotDate(nxt))) + '</span></span><span class="cell__value">' + esc(E.timeOf(plan.time).at) + '</span></div></div>' : '') +
      '<button class="btn btn--block" data-act="sxDoneClose">Done</button>' +
    '</div></div>';
    App.sound('done'); App.haptic('success');
    setTimeout(() => App.celebrateFx(), 300);
    requestAnimationFrame(() => host.querySelectorAll('[data-count]').forEach((el) => App.countUp(el, Number(el.dataset.count), 1100)));
    setTimeout(() => App.Views.celebrate(), 1900);
  }
  // The coach's word after a session, waiting on Today.
  function debrief(entry) {
    const p = S().profile; const plan = S().plan;
    const ups = entry.ex.map((e) => { const x = e.effort ? E.predictNext(e.id, e.sets.map((y) => Object.assign({ done: true }, y)), e.effort, e.reps) : null; return x && x.up && /kg/.test(x.text) && !/help/.test(x.text) ? App.lc(D.EX[e.id].name) + ' goes up to ' + x.text : null; }).filter(Boolean);
    const prs = entry.prs || [];
    const nxt = E.nextOpen(App.addDays(today(), 1));
    const hard = entry.ex.filter((e) => e.effort === 'hard').length;
    let t = 'Good work today, ' + p.name.split(' ')[0] + '.';
    if (prs.length) { const r = prs[0]; const ex = D.EX[r.id]; t += ' ' + (prs.length > 1 ? prs.length + ' personal records, including your ' : 'A personal record on your ') + App.lc(ex.name) + ': ' + (ex.unit === 'kg' ? App.fmtKg(r.w) + ' kg for ' + r.r : r.r + (ex.unit === 'sec' ? ' seconds' : ' reps')) + '.'; }
    if (ups.length) t += ' Your ' + ups[0] + ' next time.';
    else if (hard) t += ' Some of that felt hard, so I’ll keep the weights where they are.';
    else t += ' Every set is logged.';
    if (entry.mood === 'tired') t += ' Eat well and get an early night.';
    if (nxt) { const d = E.slotDate(nxt); const r = App.rel(d); t += ' Next up: ' + plan.sessions[nxt.key].name + ' ' + (r === 'Tomorrow' ? 'tomorrow' : App.diffDays(today(), d) < 7 ? 'on ' + r : 'on ' + App.fmtDate(d, 'short')) + '.'; }
    App.Coach.say(t);
  }

  // ── A new personal record: a stamp, a burst of light and the number ──────
  function prPop(st, ex, set, pr) {
    const t = E.prText(st.id, pr);
    const old = document.querySelector('.prpop'); if (old) old.remove();
    const rays = Array.from({ length: 12 }, (_, i) => '<i style="--r:' + (i * 30) + 'deg"></i>').join('');
    const el = document.createElement('div');
    el.className = 'prpop'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'assertive');
    el.innerHTML = '<div class="prpop__card"><div class="prpop__rays" aria-hidden="true">' + rays + '</div>' +
      '<div class="prpop__stamp">PR</div><div class="prpop__kicker">New personal record</div>' +
      '<div class="prpop__title">' + esc(t.title) + '</div>' +
      '<div class="prpop__what">' + esc(ex.name) + ' · ' + esc(ex.unit === 'kg' ? App.fmtKg(set.w) + ' kg × ' + set.r : set.r + (ex.unit === 'sec' ? ' s' : ' reps')) + '</div>' +
      '<div class="prpop__gain">' + icon('up', 'ic-sm') + esc(t.gain) + '</div></div>';
    document.body.appendChild(el);
    App.sound('award'); App.haptic('success');
    setTimeout(() => { const sp = el.querySelector('.prpop__stamp'); if (sp && el.isConnected) { const r = sp.getBoundingClientRect(); App.shimmer(r.left + r.width / 2, r.top + r.height / 2, 48); } }, 380);
    let gone = false;
    const done = () => { if (gone) return; gone = true; el.classList.add('is-out'); setTimeout(() => el.remove(), 380); };
    el.addEventListener('click', done);
    setTimeout(done, App.reduceMotion() ? 2200 : 3000);
  }

  // ── Photos (kept on the phone, downscaled) ────────────────────────────────
  function pickPhoto() {
    const inp = host && host.querySelector('[data-photo-input]'); if (!inp) return;
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const st = curEx(); if (!st) return;
      const img = new Image(); const url = URL.createObjectURL(f);
      img.onload = () => {
        const k = Math.min(1, 900 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        S().exSettings[st.id] = Object.assign({}, S().exSettings[st.id], { photo: c.toDataURL('image/jpeg', 0.72) });
        App.saveNow(); render(); App.toast('Photo saved for next time', 'camera');
      };
      img.onerror = () => App.toast('That photo couldn’t be opened', 'alert');
      img.src = url;
    };
    inp.click();
  }
  function settingsSheet() {
    const st = curEx(); if (!st) return;
    const ex = D.EX[st.id]; const cur = S().exSettings[st.id] || {};
    App.sheet('My settings', '<p class="lead">Save how you set up the ' + esc(App.lc(ex.name)) + ' so next time takes seconds.</p>' +
      '<div class="field"><label class="field__label" for="seatIn">Seat, pads and start position</label><input id="seatIn" class="input" placeholder="e.g. Seat 4, back pad 2" value="' + esc(cur.seat || '') + '"></div>' +
      (ex.unit === 'kg' ? '<div class="field"><div class="field__label">The + and − buttons go up in</div><div class="chips">' + [0.25, 0.5, 1, 1.25, 2, 2.5, 5].map((v) => '<button class="chip' + (E.stepOf(st.id) === v ? ' is-on' : '') + '" data-act="sxStepSize" data-v="' + v + '">' + v + ' kg</button>').join('') + '</div><p class="fn" style="margin-top:6px">Small plates or a pin weight? Pick the smallest jump. You can also tap any weight to type it exactly.</p></div>' : ''),
      { foot: '<button class="btn btn--block" data-act="sxSaveSettings">Save</button>' });
  }
  let swapAlways = false;
  function swapSheet() {
    const st = curEx(); if (!st) return;
    swapAlways = false;
    const pool = swapPool(st);
    App.sheet('Swap it', '<div class="sheet__lead"><h1 class="sheet__h1">Instead of the ' + esc(App.lc(D.EX[st.id].name)) + '</h1><p class="lead">These work the same muscles, so your plan still holds together.</p></div>' +
      (pool.length ? '<div class="group group--tiles">' + pool.map((x) => { const e = D.EX[x]; return '<button class="cell" data-act="sxSwapTo" data-v="' + x + '"><span class="cell__tile cell__tile--art">' + art(e.art) + '</span><span class="cell__main"><span class="cell__title">' + esc(e.name) + '</span><span class="cell__sub">' + esc(e.focus + ' · ' + (e.eq.length ? e.eq.slice(0, 2).map((t) => D.EQUIP_NAME[t].toLowerCase()).join(', ') : 'no equipment')) + '</span></span>' + icon('right', 'cell__chev') + '</button>'; }).join('') + '</div>' : '<div class="callout">' + icon('info') + '<div>Nothing else here works quite the same. Ask “mind if I work in?”, or skip it today.</div></div>') +
      '<div class="group"><div class="cell"><span class="cell__main"><span class="cell__title">Use it from now on</span><span class="cell__sub">Otherwise it’s just for today</span></span><button class="switch" data-act="sxSwapAlways" role="switch" aria-checked="false" aria-label="Use it from now on"></button></div></div>' +
      (D.EX[st.id].eq.length ? '<div class="group"><button class="cell" data-act="sxNotHere"><span class="cell__tile bg-ink">' + icon('x') + '</span><span class="cell__main"><span class="cell__title">Not at this gym</span><span class="cell__sub">I’ll take it out of your plan</span></span></button></div>' : ''));
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  Object.assign(App.ACT, {
    sxNext() {
      const a = S().active; if (!a) return;
      const st = a.steps[a.step];
      if (st.t === 'cardio') { st.elapsed = cardioElapsed(st); st.runFrom = null; }
      closeRest(true);
      if (a.step >= a.steps.length - 1) return finish();
      a.step++; App.save(); App.haptic(); render(1);
    },
    sxDoneNext() { const st = curEx(); if (!st) return; const i = st.sets.findIndex((x) => !x.done); if (i >= 0) logSet(i); },
    sxLeave() {
      const any = S().active && S().active.steps.some((x) => x.t === 'ex' && x.sets.some((y) => y.done));
      App.openLayer('<div class="dialog"><div class="dialog__icon">' + icon('pause') + '</div><h2 class="dialog__title">Take a break?</h2><p class="dialog__text">Everything you’ve logged is saved. Pick it up from Today whenever you’re ready.</p>' +
        '<button class="btn" data-act="closeLayer">Keep going</button><button class="btn btn--tinted" data-act="sxPause">Leave for now</button>' +
        (any ? '<button class="btn btn--plain" data-act="sxEndNow">Finish the session here</button>' : '') + '</div>', { dialog: true });
    },
    sxPause() { App.closeLayer(true); close(); App.render(); App.toast('Saved. Resume from Today.', 'pause'); },
    sxEndNow() { App.closeLayer(true); finish(); },
    sxCheck(el) { const st = S().active.steps[S().active.step]; const k = el.dataset.v; st.checks[k] = !st.checks[k]; el.classList.toggle('is-on', st.checks[k]); App.haptic(); if (st.checks[k]) App.sound('tick'); App.save(); },
    sxTick(el) { const st = S().active.steps[S().active.step]; const k = el.dataset.v; st.ticks[k] = !st.ticks[k]; el.classList.toggle('is-on', st.ticks[k]); App.haptic(); if (st.ticks[k]) App.sound('tick'); App.save(); },
    sxCardio() {
      const st = S().active.steps[S().active.step];
      if (st.runFrom) { st.elapsed = cardioElapsed(st); st.runFrom = null; } else { if (st.elapsed >= st.min * 60) st.elapsed = 0; st.runFrom = Date.now(); }
      App.save(); App.haptic();
      const b = host.querySelector('[data-cbtn]'); if (b) { b.className = 'btn btn--sm ' + (st.runFrom ? 'btn--tinted' : 'btn--tinted-accent'); b.innerHTML = st.runFrom ? icon('pause', 'ic-sm') + 'Pause' : icon('play', 'ic-sm') + 'Resume'; }
      updateCardio();
    },
    sxCardioSwap(el) { const st = S().active.steps[S().active.step]; st.id = el.dataset.v; App.save(); render(); },
    sxStep(el) { const [i, f, d] = el.dataset.v.split('|'); step(Number(i), f, Number(d)); },
    // A typed value: any weight to 0.01 kg (so 0.25 kg plates count), whole reps or seconds.
    sxSetVal(el) {
      const st = curEx(); if (!st) return;
      const [si, f] = el.dataset.v.split('|'); const i = Number(si); const set = st.sets[i]; const ex = D.EX[st.id]; if (!set) return;
      let v = parseFloat(String(el.value).replace(',', '.').replace(/[^0-9.]/g, ''));
      if (!isFinite(v)) { refreshSets(); return; }
      v = f === 'w' ? Math.min(1000, Math.max(0, Math.round(v * 100) / 100)) : Math.min(ex.unit === 'sec' ? 3600 : 300, Math.max(1, Math.round(v)));
      set[f] = v;
      if (!set.done) st.sets.forEach((x, j) => { if (j > i && !x.done) x[f] = v; });
      App.save(); refreshSets();
      const n = host.querySelector('[data-num="' + i + f + '"]'); if (n) { n.classList.remove('is-bump'); void n.offsetWidth; n.classList.add('is-bump'); }
      App.haptic();
    },
    sxGoPartner() { const a = S().active; const pt = partnerOf(curEx()); if (!pt) return; closeRest(true); a.step = a.steps.indexOf(pt); App.save(); App.haptic(); render(1); },
    sxNotHere() {
      const st = curEx(); if (!st) return; const ex = D.EX[st.id]; const g = E.gym();
      const tag = ex.eq.find((t) => !['dumbbells', 'flat_bench', 'adjustable_bench', 'mats'].includes(t)) || ex.eq[0];
      g.kit = g.kit.filter((t) => t !== tag); g.edited = true;
      const changed = E.fixPlanForKit();
      const a = S().active; const inSession = a.steps.filter((x) => x.t === 'ex').map((x) => x.id);
      const to = S().swaps[st.base] && E.canDo(S().swaps[st.base]) && !inSession.includes(S().swaps[st.base]) ? S().swaps[st.base] : E.swapsFor(st.id, st.base, inSession)[0];
      App.closeLayer(true);
      if (to) Object.assign(st, exStep(to, st.base, st.sets.length, a.slot, keep(st)));
      App.save(); render();
      App.Coach.note(E.gymShort() + ': no ' + D.EQUIP_NAME[tag].toLowerCase() + '. Plan updated' + (changed.length ? ' (' + changed.length + ' ' + App.plural(changed.length, 'swap') + ')' : ''));
      App.toast('Got it. Your plan won’t use the ' + D.EQUIP_NAME[tag].toLowerCase() + ' again.', 'check');
    },
    sxDone(el) { logSet(Number(el.dataset.v)); },
    sxAddSet() { const st = curEx(); const last = st.sets[st.sets.length - 1]; st.sets.push({ w: last.w, r: last.r, done: false }); App.save(); refreshSets(st.sets.length - 1); App.haptic(); },
    sxFirstFeel(el) {
      const st = curEx(); const v = el.dataset.v; st.firstFeel = v;
      const stp = E.stepOf(st.id);
      const nw = Math.max(stp, Math.round((st.sets[0].w + (v === 'light' ? 2 * stp : v === 'heavy' ? -stp : 0)) * 100) / 100);
      st.sets.forEach((x) => { if (!x.done) x.w = nw; });
      st.sgWhy = v === 'right' ? 'Set 1 felt about right, so stay at ' + App.fmtKg(nw) + ' kg.' : 'Set 1 felt too ' + (v === 'light' ? 'light' : 'heavy') + ', so the next sets are ' + App.fmtKg(nw) + ' kg.';
      App.save(); refreshSets(); App.haptic();
      const cl = host.querySelector('.coachline__text'); if (cl) cl.textContent = st.sgWhy;
      openRest(st, D.EX[st.id]);
    },
    sxEffort(el) {
      const st = el.dataset.s != null ? S().active.steps[Number(el.dataset.s)] : curEx(); if (!st) return;
      const first = !st.effort; st.effort = el.dataset.v;
      App.save(); refreshSets();
      if (first) { App.sound('soft'); App.haptic('success'); }
    },
    sxSwap() { swapSheet(); },
    sxSwapAlways(el) { swapAlways = !swapAlways; el.classList.toggle('is-on', swapAlways); el.setAttribute('aria-checked', swapAlways); App.haptic(); },
    sxSwapTo(el) {
      const st = curEx(); const to = el.dataset.v;
      Object.assign(st, exStep(to, st.base, st.sets.length, S().active.slot, keep(st)));
      if (swapAlways) { if (to === st.base) delete S().swaps[st.base]; else S().swaps[st.base] = to; }
      App.save(); App.closeLayer(); render();
      App.toast('Swapped to ' + App.lc(D.EX[to].name) + (swapAlways ? ' from now on' : ' for today'), 'swap');
    },
    sxSettings() { settingsSheet(); },
    sxStepSize(el) { const st = curEx(); S().exSettings[st.id] = Object.assign({}, S().exSettings[st.id], { step: Number(el.dataset.v) }); App.$$('[data-act="sxStepSize"]').forEach((b) => b.classList.toggle('is-on', b === el)); App.haptic(); App.save(); },
    sxSaveSettings() {
      const st = curEx(); const v = ((App.$('#seatIn') || {}).value || '').trim();
      S().exSettings[st.id] = Object.assign({}, S().exSettings[st.id], { seat: v });
      App.save(); App.closeLayer(); render();
      App.toast('Saved for next time', 'sliders');
      App.checkAwards();
    },
    sxPhoto() { pickPhoto(); },
    sxFinish() { finish(); },
    sxMood(el) { const l = S().log[S().log.length - 1]; if (l) l.mood = el.dataset.v; App.save(); App.$$('[data-act="sxMood"]').forEach((b) => b.classList.toggle('is-on', b === el)); App.haptic(); },
    sxDoneClose() {
      const entry = S().log[S().log.length - 1];
      close(); App.tab = 'today'; App.entering = true; App.render(); window.scrollTo(0, 0);
      if (entry) setTimeout(() => { debrief(entry); }, 700);
    },
    restAdd() { if (rest) { rest.end += 15000; rest.total += 15; App.haptic(); } },
    restSkip() { closeRest(); },
  });

  App.Session = { start, open, close, render, finish, isOpen, swapCurrent, lowerCurrent, skipCurrent };
})();
