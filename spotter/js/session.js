/* Spotter — the guided session: ready → warm-up → one machine at a time → cool-down → celebration. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const E = App.E;
  const { esc, icon, art, today } = App;
  const S = () => App.S;

  let host = null;     // overlay container
  let tick = null;     // warm-up timer interval
  let restState = null;

  function ensureHost() {
    if (!host) { host = document.createElement('div'); host.id = 'sx'; document.body.appendChild(host); }
    return host;
  }
  function close() {
    clearInterval(tick); tick = null;
    closeRest(true);
    if (host) { host.remove(); host = null; }
    App.keepAwake(false);
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
    E.exercisesFor(slot.key, slot.week).forEach((e) => steps.push(exStep(e.id, e.base, e.sets)));
    if (plan.finisher) steps.push({ t: 'cardio', role: 'finisher', id: plan.finisher.id, min: plan.finisher.min, elapsed: 0, runFrom: null });
    steps.push({ t: 'cooldown', ticks: {} });
    s.active = { id: App.uid(), slot: slot.id, key: slot.key, week: slot.week, date: t, startedAt: Date.now(), gymId: plan.gymId, step: 0, steps };
    App.saveNow();
    App.closeLayer(true);
    open();
  }
  function exStep(id, base, n) {
    const sg = E.suggest(id);
    const sets = [];
    for (let i = 0; i < n; i++) sets.push({ w: sg.w, r: sg.r, done: false });
    return { t: 'ex', id, base, sets, effort: null, firstFeel: null, mode: sg.mode, sgTitle: sg.title, sgWhy: sg.why, xp: false, howOpen: !E.lastPerf(id) };
  }
  function open() {
    ensureHost();
    document.body.style.overflow = 'hidden';
    App.keepAwake(true);
    render();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render(dir) {
    const a = S().active; if (!a) return close();
    ensureHost();
    const st = a.steps[a.step];
    const plan = S().plan;
    const segs = a.steps.map((x, i) => '<div class="sx__seg' + (i < a.step ? ' is-done' : i === a.step ? ' is-now' : '') + '"><i></i></div>').join('');
    let body = ''; let foot = '';
    if (st.t === 'ready') ({ body, foot } = readyStep(a, st, plan));
    else if (st.t === 'cardio') ({ body, foot } = cardioStep(a, st));
    else if (st.t === 'ex') ({ body, foot } = exerciseStep(a, st));
    else ({ body, foot } = cooldownStep(a, st));
    host.innerHTML = '<div class="sx" role="dialog" aria-label="Session in progress">' +
      '<div class="sx__top"><button class="icon-btn" data-act="sxLeave" aria-label="Leave session">' + icon('x') + '</button><div class="sx__segs" aria-hidden="true">' + segs + '</div><div class="sx__count">' + (a.step + 1) + '/' + a.steps.length + '</div>' +
        '<button class="sx__ask" data-act="openCoach" aria-label="Ask your coach"><span class="sx__ask-face">' + App.plate('', '#ffffff', { ring: 'rgba(36,72,245,.35)', hub: 'rgba(36,72,245,.18)', hole: '#2448f5' }).replace('<svg class=""', '<svg style="width:22px;height:22px"') + '</span>Ask</button></div>' +
      '<div class="sx__scroll"><div class="sx__body' + (dir < 0 ? ' is-back' : '') + '" style="' + (dir < 0 ? 'animation-name:obInBack' : '') + '">' + body + '</div></div>' +
      '<div class="sx__foot"><div class="sx__foot-inner">' + foot + '</div></div>' +
    '</div>';
    const sc = host.querySelector('.sx__scroll'); if (sc) sc.scrollTop = 0;
    clearInterval(tick); tick = null;
    if (st.t === 'cardio') { tick = setInterval(updateCardio, 500); updateCardio(); }
    setCoachContext(st);
  }
  function setCoachContext(st) {
    if (st.t === 'ex') App.Coach.setContext({ key: 'exercise', label: D.EX[st.id].name, exId: st.id });
    else if (st.t === 'cardio') App.Coach.setContext({ key: 'warmup', label: st.role === 'warmup' ? 'Warm-up' : 'Finisher' });
    else if (st.t === 'cooldown') App.Coach.setContext({ key: 'cooldown', label: 'Cool-down' });
    else App.Coach.setContext({ key: 'ready', label: 'Getting ready' });
  }

  function readyStep(a, st, plan) {
    const p = S().profile; const sess = plan.sessions[a.key]; const phase = E.phaseFor(a.week, plan);
    const items = [['water', 'Water bottle', 'water'], ['towel', 'Towel', 'towel'], ['phone', 'Headphones in, if you like', 'headphones']];
    if (p.health.asthma) items.unshift(['puffer', 'Reliever puffer in your bag', 'puffer', 'Use it before the warm-up only if your asthma action plan says to']);
    const exs = a.steps.filter((x) => x.t !== 'ready' && x.t !== 'cooldown');
    const first = !S().log.length;
    return {
      body: '<div><div class="eyebrow">' + esc(sess.name) + ' · week ' + a.week + ' · ' + esc(phase.name) + '</div><h1 class="ex-title display" style="margin-top:6px">' + esc(sess.title) + '</h1></div>' +
        '<div class="ex-meta"><span class="pill tone-' + (a.key === 'A' ? 'blue' : 'red') + '">' + icon('pin', 'ic-sm') + esc(E.gymName(a.gymId)) + '</span><span class="pill tone-yellow">' + icon('clock', 'ic-sm') + 'About ' + plan.mins + ' min</span></div>' +
        (first ? '<div class="tip"><span class="tip__icon">' + icon('sparkle', 'ic-sm') + '</span><div class="tip__text"><b>Day one.</b> Light weights, no rush. Today is about learning the set-up of each machine. I’ll walk you through every step.</div></div>' : '') +
        '<section class="section"><h2 class="section__title">Before you start</h2><div class="checklist">' + items.map((it) => '<button class="check' + (st.checks[it[0]] ? ' is-on' : '') + '" data-act="sxCheck" data-v="' + it[0] + '"><span class="check__box">' + icon('check', 'ic-sm') + '</span>' + icon(it[2]) + '<span class="grow">' + esc(it[1]) + (it[3] ? '<span class="check__sub">' + esc(it[3]) + '</span>' : '') + '</span></button>').join('') + '</div></section>' +
        '<section class="section"><h2 class="section__title">Today’s plan</h2><div class="card" style="padding-block:6px">' + exs.map((x) => x.t === 'cardio' ? App.Views.exLine({ id: x.id, min: x.min }) : App.Views.exLine({ id: x.id, sets: x.sets.length })).join('') + '</div></section>',
      foot: '<button class="btn" data-act="sxNext">' + icon('play') + 'I’m at the gym · warm up</button>',
    };
  }

  function cardioStep(a, st) {
    const ex = D.EX[st.id]; const p = S().profile;
    const warm = st.role === 'warmup';
    const alts = (ex.alts || []).concat(st.id === 'bike' ? [] : ['bike']).filter((x, i, arr) => x !== st.id && arr.indexOf(x) === i);
    return {
      body: '<div class="media media--warm">' + App.decoPlate('media__plate') + '<div class="media__art">' + art(ex.art) + '</div><div class="media__tag" style="color:#fff">' + icon('swap', 'ic-sm') + '<span class="grow">Any bike, cross trainer or treadmill works</span></div></div>' +
        '<div><div class="eyebrow">' + (warm ? 'Warm-up' : 'Finisher') + '</div><h1 class="ex-title display" style="margin-top:6px">' + esc(ex.name) + '</h1><p class="muted" style="margin-top:6px">' + st.min + ' minutes, ' + (warm ? 'easy to steady' : 'brisk, slight incline') + '.</p></div>' +
        '<div class="timer"><div class="timer__ring"><svg viewBox="0 0 220 220"><circle class="timer__track" cx="110" cy="110" r="96"/><circle class="timer__bar" data-cbar cx="110" cy="110" r="96" stroke-dasharray="603.2" stroke-dashoffset="603.2"/></svg>' +
          '<div class="timer__time"><div class="timer__num" data-ctime>' + mmss(st.min * 60 - st.elapsed) + '</div><div class="timer__lbl" data-cphase>Ready</div></div></div>' +
          '<div class="timer__btns"><button class="btn btn--sm' + (st.runFrom ? ' btn--ghost' : '') + '" data-act="sxCardio" data-cbtn>' + (st.runFrom ? icon('pause', 'ic-sm') + 'Pause' : icon('play', 'ic-sm') + (st.elapsed ? 'Resume' : 'Start timer')) + '</button></div></div>' +
        '<div class="card"><ul class="steps">' + ex.setup.concat(ex.move).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' +
        (warm && p.health.asthma ? '<div class="banner">' + icon('puffer') + '<div class="t-sm"><b>Asthma:</b> keep the build-up gradual. If your chest tightens, stop and use your reliever. If symptoms come back a second time, stop for today.</div></div>' : '') +
        (alts.length ? '<div class="field"><div class="field__label">Bike taken?</div><div class="chips">' + alts.map((x) => '<button class="chip chip--sm" data-act="sxCardioSwap" data-v="' + x + '">' + icon('swap', 'ic-sm') + esc(D.EX[x].name) + '</button>').join('') + '</div></div>' : ''),
      foot: '<button class="btn" data-act="sxNext" data-cnext>' + (warm ? 'Warm-up done' : 'Finisher done') + icon('arrow') + '</button>',
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
    if (ph) ph.textContent = !st.runFrom && !st.elapsed ? 'Ready' : left <= 0 ? 'Done' : el < total * 0.35 ? 'Easy pace' : el < total * 0.75 ? 'Build up a little' : 'Steady, still chatty';
    if (left <= 0 && st.runFrom) {
      st.elapsed = total; st.runFrom = null; App.save();
      App.sound('timer'); App.haptic([60, 60, 60]);
      const b = host.querySelector('[data-cbtn]'); if (b) b.outerHTML = '<span class="pill tone-green">' + icon('check', 'ic-sm') + 'Time’s up. Nice work.</span>';
      App.burstAt(host.querySelector('.timer__ring'), { n: 30 });
    }
  }
  function mmss(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }

  function exerciseStep(a, st) {
    const ex = D.EX[st.id];
    const exSteps = a.steps.filter((x) => x.t === 'ex');
    const idx = exSteps.indexOf(st) + 1;
    const saved = S().exSettings[st.id] || {};
    const gym = E.gymOf(a.gymId);
    const allDone = st.sets.length && st.sets.every((x) => x.done);
    const anyDone = st.sets.some((x) => x.done);
    const sgIcon = st.mode === 'up' ? 'up' : st.mode === 'down' ? 'down' : st.mode === 'find' ? 'target' : 'check';
    const sgTone = st.mode === 'up' ? 'yellow' : st.mode === 'find' ? 'blue' : st.mode === 'down' ? 'red' : 'green';
    const mus = (ex.muscles || []).map((m) => '<span class="pill tone-blue">' + esc(D.MUSCLES[m]) + '</span>').join('') + (ex.muscles2 || []).map((m) => '<span class="pill" style="background:var(--bg-2);color:var(--ink-2)">' + esc(D.MUSCLES[m]) + '</span>').join('');
    const pred = st.effort ? E.predictNext(st.id, st.sets, st.effort) : null;
    const body =
      '<div class="media' + (a.key === 'B' ? ' media--B' : '') + '">' +
        (saved.photo ? '<img class="media__photo" src="' + saved.photo + '" alt="Your photo of the ' + esc(ex.name) + '">' : App.decoPlate('media__plate') + '<div class="media__art">' + art(ex.art) + '</div>') +
        '<div class="media__tag">' + icon('pin', 'ic-sm') + '<span class="grow">' + (saved.photo ? 'Your photo' : 'Photo and spot at ' + esc(gym.generic ? 'your gym' : gym.branch) + ': coming after mapping') + '</span><button class="media__add" data-act="sxPhoto">' + (saved.photo ? 'Change' : 'Add photo') + '</button></div>' +
      '</div>' +
      '<input type="file" accept="image/*" capture="environment" data-photo-input hidden>' +
      '<div><div class="eyebrow">Exercise ' + idx + ' of ' + exSteps.length + ' · ' + esc(ex.focus || '') + '</div><h1 class="ex-title display" style="margin-top:6px">' + esc(ex.name) + '</h1></div>' +
      '<div class="muscle-tags">' + mus + '</div>' +
      (saved.seat ? '<button class="banner" data-act="sxSettings" style="background:var(--blue-soft);text-align:left">' + icon('sliders') + '<div class="grow"><b>Your settings:</b> ' + esc(saved.seat) + '</div>' + icon('right', 'ic-sm') + '</button>' : '') +
      '<div class="card howto' + (st.howOpen ? ' is-open' : '') + '">' +
        '<button class="howto__toggle" data-act="sxHow" aria-expanded="' + !!st.howOpen + '">' + icon('info') + 'How to set up and do it' + icon('down') + '</button>' +
        (st.howOpen ? '<div class="howto__panel"><div class="eyebrow">Set up</div><ol class="steps">' + ex.setup.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>' +
          '<div class="eyebrow">The move</div><ol class="steps">' + ex.move.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>' +
          '<div class="eyebrow">You should feel it</div><p>' + esc(ex.feel) + '</p>' +
          (ex.avoid && ex.avoid.length ? '<div class="eyebrow">Avoid</div><ul class="bullets">' + ex.avoid.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
          '<button class="btn btn--sm btn--soft" data-act="sxSettings" style="justify-self:start">' + icon('sliders', 'ic-sm') + (saved.seat ? 'Edit my settings' : 'Save my settings') + '</button></div>' : '') +
      '</div>' +
      '<div class="suggest"><span class="suggest__icon tone-' + sgTone + '">' + icon(sgIcon) + '</span><div class="grow"><div class="suggest__title">' + esc(st.mode === 'find' ? 'Find your weight' : 'Today: ' + st.sgTitle) + '</div><div class="suggest__why">' + esc(st.sgWhy) + '</div></div></div>' +
      '<div class="sets" data-sets>' + st.sets.map((x, i) => setRow(st, ex, x, i)).join('') + '</div>' +
      '<div data-firstfeel>' + firstFeelHtml(st, ex) + '</div>' +
      '<div class="row row--between"><button class="btn btn--plain btn--sm add-set" data-act="sxAddSet">' + icon('plus', 'ic-sm') + 'Add a set</button><button class="btn btn--plain btn--sm" data-act="sxSwap">' + icon('swap', 'ic-sm') + 'Machine taken? Swap</button></div>' +
      '<div data-effort>' + (anyDone ? effortHtml(st, pred) : '') + '</div>';
    const last = a.step === a.steps.length - 2;
    const foot = allDone || st.effort
      ? '<button class="btn' + (st.effort ? '' : ' btn--soft') + '" data-act="sxNext">' + (last ? 'On to the cool-down' : 'Next exercise') + icon('arrow') + '</button>'
      : '<button class="btn btn--ghost" data-act="sxNext" style="flex:0 0 auto">Skip</button><button class="btn" data-act="sxDoneNext">' + icon('check') + 'Log set ' + (st.sets.findIndex((x) => !x.done) + 1) + '</button>';
    return { body, foot };
  }
  function setRow(st, ex, x, i) {
    const nextIdx = st.sets.findIndex((y) => !y.done);
    const cls = 'set' + (ex.unit !== 'kg' ? ' set--one' : '') + (x.done ? ' is-done' : '') + (i === nextIdx ? ' is-next' : '');
    const rUnit = ex.unit === 'sec' ? 'seconds' : ex.perSide ? 'each side' : 'reps';
    return '<div class="' + cls + '" data-set="' + i + '">' +
      '<div class="set__n">' + (i + 1) + '</div>' +
      (ex.unit === 'kg' ? stepper(i, 'w', App.fmtKg(x.w), ex.assist ? 'kg help' : 'kg') : '') +
      stepper(i, 'r', x.r, rUnit) +
      '<button class="done-btn" data-act="sxDone" data-v="' + i + '" aria-label="' + (x.done ? 'Undo set ' : 'Log set ') + (i + 1) + '">' + icon('check') + '</button>' +
    '</div>';
  }
  function stepper(i, f, val, unit) {
    return '<div class="stepper"><button class="stepper__btn" data-act="sxStep" data-v="' + i + '|' + f + '|-1" aria-label="Less">' + icon('minus', 'ic-sm') + '</button>' +
      '<div class="stepper__val"><span class="stepper__num" data-num="' + i + f + '">' + val + '</span><span class="stepper__unit">' + unit + '</span></div>' +
      '<button class="stepper__btn" data-act="sxStep" data-v="' + i + '|' + f + '|1" aria-label="More">' + icon('plus', 'ic-sm') + '</button></div>';
  }
  function firstFeelHtml(st, ex) {
    if (st.mode !== 'find' || ex.unit !== 'kg' || st.firstFeel || !st.sets[0].done || st.sets.every((x) => x.done)) return '';
    return '<div class="card"><div class="list-item__title">How did set 1 feel?</div><p class="t-sm muted" style="margin:2px 0 12px">I’ll adjust the weight for your next set.</p><div class="feel">' +
      [['light', 'Too light', 'feather'], ['right', 'About right', 'target'], ['heavy', 'Too heavy', 'strain']].map((o) => '<button class="feel__btn" data-act="sxFirstFeel" data-v="' + o[0] + '"><span class="feel__face">' + icon(o[2]) + '</span>' + o[1] + '</button>').join('') + '</div></div>';
  }
  function effortHtml(st, pred) {
    const opts = [['easy', 'Easy', 'smile', 'Could do more'], ['right', 'Just right', 'target', 'Last reps hard'], ['hard', 'Hard', 'strain', 'Struggled']];
    return '<div class="card"><div class="list-item__title">How did that feel?</div><p class="t-sm muted" style="margin:2px 0 12px">This is how I work out your next weights.</p><div class="feel">' +
      opts.map((o) => '<button class="feel__btn' + (st.effort === o[0] ? ' is-on' : '') + '" data-act="sxEffort" data-v="' + o[0] + '"><span class="feel__face">' + icon(o[2]) + '</span>' + o[1] + '<small>' + o[3] + '</small></button>').join('') + '</div>' +
      (pred ? '<div class="prediction" style="margin-top:12px">' + icon('up') + '<div class="grow"><div class="t-xs" style="opacity:.75;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Next time</div><div class="prediction__val">' + esc(pred.text) + '</div><div class="t-sm" style="opacity:.85">' + esc(pred.why) + '</div></div></div>' : '') +
    '</div>';
  }

  function cooldownStep(a, st) {
    return {
      body: '<div class="media media--cool">' + App.decoPlate('media__plate') + '<div class="media__art">' + art('mat') + '</div></div>' +
        '<div><div class="eyebrow">Last step</div><h1 class="ex-title display" style="margin-top:6px">Cool down</h1><p class="muted" style="margin-top:6px">Five easy minutes on the bike or a slow walk, then these stretches. About 30 seconds each, no bouncing.</p></div>' +
        '<div class="checklist">' + D.COOLDOWN.map((c, i) => '<button class="check' + (st.ticks[i] ? ' is-on' : '') + '" data-act="sxTick" data-v="' + i + '"><span class="check__box">' + icon('check', 'ic-sm') + '</span><span class="grow">' + esc(c.name) + '<span class="check__sub">' + esc(c.how) + '</span></span><span class="pill" style="background:var(--bg-2)">' + c.secs + ' s</span></button>').join('') + '</div>',
      foot: '<button class="btn btn--green" data-act="sxFinish">' + icon('trophy') + 'Finish session</button>',
    };
  }

  // ── Set logging ───────────────────────────────────────────────────────────
  function curEx() { const a = S().active; const st = a && a.steps[a.step]; return st && st.t === 'ex' ? st : null; }
  function refreshSets(popIdx) {
    const st = curEx(); if (!st || !host) return;
    const ex = D.EX[st.id];
    const box = host.querySelector('[data-sets]'); if (box) box.innerHTML = st.sets.map((x, i) => setRow(st, ex, x, i)).join('');
    if (popIdx != null) { const r = host.querySelector('[data-set="' + popIdx + '"]'); if (r) r.classList.add('is-pop'); }
    const ff = host.querySelector('[data-firstfeel]'); if (ff) ff.innerHTML = firstFeelHtml(st, ex);
    const ef = host.querySelector('[data-effort]');
    if (ef) ef.innerHTML = st.sets.some((x) => x.done) ? effortHtml(st, st.effort ? E.predictNext(st.id, st.sets, st.effort) : null) : '';
    const footInner = host.querySelector('.sx__foot-inner');
    const a = S().active;
    if (footInner) footInner.innerHTML = exerciseStep(a, st).foot;
  }
  function logSet(i) {
    const st = curEx(); if (!st) return;
    const set = st.sets[i]; const ex = D.EX[st.id];
    if (set.done) { set.done = false; App.save(); refreshSets(); return; }
    set.done = true;
    App.save();
    const btn = host.querySelector('[data-set="' + i + '"] .done-btn');
    App.award(D.XP.set, btn);
    App.sound('set'); App.haptic(15);
    App.burstAt(btn, { n: 16 });
    refreshSets(i);
    const remaining = st.sets.filter((x) => !x.done).length;
    if (remaining === 0) {
      setTimeout(() => { const ef = host && host.querySelector('[data-effort]'); if (ef) ef.scrollIntoView({ behavior: App.reduceMotion() ? 'auto' : 'smooth', block: 'center' }); }, 120);
      App.toast('All sets done. How did it feel?', 'check');
    } else if (!(st.mode === 'find' && i === 0 && ex.unit === 'kg' && !st.firstFeel)) {
      openRest(st, ex);
    }
  }
  function step(i, f, dir) {
    const st = curEx(); if (!st) return;
    const ex = D.EX[st.id]; const set = st.sets[i];
    if (f === 'w') { const stp = E.stepOf(st.id); set.w = Math.max(0, Math.round((set.w + dir * stp) * 10) / 10); }
    else { const stp = ex.unit === 'sec' ? 5 : 1; set.r = Math.max(1, set.r + dir * stp); }
    // changing an undone set updates the sets after it that haven't been touched yet
    if (!set.done) st.sets.forEach((x, j) => { if (j > i && !x.done) x[f] = set[f]; });
    App.save();
    const num = host.querySelector('[data-num="' + i + f + '"]');
    refreshSets();
    const n2 = host.querySelector('[data-num="' + i + f + '"]'); if (n2) { n2.classList.remove('is-bump'); void n2.offsetWidth; n2.classList.add('is-bump'); }
    App.haptic(5);
    return num;
  }

  // ── Rest timer ────────────────────────────────────────────────────────────
  function openRest(st, ex) {
    closeRest(true);
    const secs = ex.rest || 60;
    const nextIdx = st.sets.findIndex((x) => !x.done);
    const ns = st.sets[nextIdx];
    const tips = (ex.move || []).concat(['Breathe out on the hard part.', 'Sip some water.', 'Shake out your arms and legs.']);
    const tipTxt = tips[Math.floor(Math.random() * tips.length)];
    restState = { end: Date.now() + secs * 1000, total: secs, timer: null };
    const el = document.createElement('div');
    el.className = 'rest'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Rest timer');
    el.innerHTML = '<div class="rest__inner"><div class="eyebrow">Rest</div>' +
      '<div class="timer"><div class="timer__ring"><svg viewBox="0 0 220 220"><circle class="timer__track" cx="110" cy="110" r="96"/><circle class="timer__bar" data-rbar cx="110" cy="110" r="96" stroke-dasharray="603.2" stroke-dashoffset="0"/></svg><div class="timer__time"><div class="timer__num" data-rtime>' + mmss(secs) + '</div><div class="timer__lbl" data-rlbl>Breathe</div></div></div></div>' +
      '<div class="rest__next">Up next: <b>set ' + (nextIdx + 1) + '</b>' + (ex.unit === 'kg' ? ' · ' + App.fmtKg(ns.w) + ' kg × ' + ns.r : ' · ' + ns.r + (ex.unit === 'sec' ? ' s' : ' reps')) + '</div>' +
      '<div class="rest__tip">' + icon('sparkle', 'ic-sm') + ' ' + esc(tipTxt) + '</div>' +
      '<div class="timer__btns"><button class="btn btn--sm btn--ghost" data-act="restAdd">+15 s</button><button class="btn btn--sm" data-act="restSkip">Skip rest' + icon('skip', 'ic-sm') + '</button></div></div>';
    document.body.appendChild(el);
    restState.el = el;
    App.Coach.setContext({ key: 'rest', label: 'Resting' });
    restState.timer = setInterval(updateRest, 250); updateRest();
  }
  function updateRest() {
    if (!restState) return;
    const left = Math.max(0, (restState.end - Date.now()) / 1000);
    const el = restState.el;
    const bar = el.querySelector('[data-rbar]'); if (bar) bar.setAttribute('stroke-dashoffset', (603.2 * (1 - left / restState.total)).toFixed(1));
    const t = el.querySelector('[data-rtime]'); if (t) t.textContent = left > 0 ? mmss(left) : 'Go!';
    const l = el.querySelector('[data-rlbl]'); if (l) l.textContent = left > 10 ? 'Breathe' : left > 0 ? 'Get ready' : 'Next set';
    if (left <= 0 && !restState.over) {
      restState.over = true; el.classList.add('is-over');
      App.sound('timer'); App.haptic([80, 60, 80]);
      setTimeout(() => closeRest(), 1300);
    }
  }
  function closeRest(silent) {
    if (!restState) return;
    clearInterval(restState.timer);
    const el = restState.el; restState = null;
    if (silent) { el.remove(); return; }
    el.classList.add('is-closing'); setTimeout(() => el.remove(), 260);
    const st = curEx(); if (st) setCoachContext(st);
  }

  // ── Finish ────────────────────────────────────────────────────────────────
  function finish() {
    const s = S(); const a = s.active; if (!a) return;
    closeRest(true); clearInterval(tick);
    const plan = s.plan;
    const exs = a.steps.filter((x) => x.t === 'ex').map((x) => ({ id: x.id, sets: x.sets.filter((y) => y.done).map((y) => ({ w: y.w, r: y.r })), effort: x.effort }));
    const prevTops = {}; exs.forEach((e) => { const lp = E.lastPerf(e.id); if (lp && D.EX[e.id].unit === 'kg' && !D.EX[e.id].assist) prevTops[e.id] = Math.max.apply(null, lp.sets.map((x) => x.w)); });
    const mins = Math.max(1, Math.round((Date.now() - a.startedAt) / 60000));
    const entry = { id: a.id, slot: a.slot, key: a.key, week: a.week, date: today(), mins, gymId: a.gymId, ex: exs, mood: null };
    s.log.push(entry);
    s.active = null;
    App.saveNow();
    // rewards
    const xpBefore = s.xp;
    App.award(D.XP.session);
    if (s.log.length === 1) App.unlock('first');
    if (exs.some((e) => prevTops[e.id] != null && e.sets.length && Math.max.apply(null, e.sets.map((x) => x.w)) > prevTops[e.id])) App.unlock('up');
    const wk = App.weekStart(entry.date);
    const tgt = E.targetInWeek(wk);
    if (tgt && E.sessionsInWeek(wk) >= tgt) { if (entry.week === 1) App.unlock('week1'); App.unlock('fullweek'); }
    if (E.streakWeeks() >= 2) App.unlock('streak2');
    const tot = E.totals();
    if (tot.total && tot.done >= Math.ceil(tot.total / 2)) App.unlock('halfway');
    if (tot.total && tot.done >= tot.total) App.unlock('all');
    E.partnerRewards().forEach((r) => { if (!r.open && tot.done >= r.need) { s.opened[r.week] = today(); App.Q.push({ t: 'reward', week: r.week, text: r.text }); } });
    App.saveNow();
    doneScreen(entry, s.xp - xpBefore + sessionXpDuring(a));
  }
  function sessionXpDuring(a) {
    let n = 0; a.steps.forEach((x) => { if (x.t === 'ex') { n += x.sets.filter((y) => y.done).length * D.XP.set; if (x.xp) n += D.XP.exercise; } }); return n;
  }
  const COMPARE = [[2000, 'a hippo'], [1200, 'a small car'], [650, 'a dairy cow'], [400, 'a grand piano'], [250, 'a vending machine'], [80, 'a big dog'], [1, 'a stack of books']];
  const TITLES = ['Session done!', 'Look at you go!', 'Another one banked!', 'That’s how it’s done!', 'Stronger than yesterday!'];
  function doneScreen(entry, xpGained) {
    ensureHost();
    const plan = S().plan;
    const sets = App.sum(entry.ex.map((e) => e.sets.length));
    const kg = Math.round(App.sum(entry.ex.map((e) => D.EX[e.id].unit === 'kg' && !D.EX[e.id].assist ? App.sum(e.sets.map((x) => x.w * x.r)) : 0)));
    const cmp = COMPARE.find((c) => kg >= c[0]);
    const tot = E.totals();
    const nxt = E.nextOpen(App.addDays(today(), 1));
    const pr = E.partnerRewards().find((r) => !r.open);
    const left = pr ? Math.max(0, pr.need - tot.done) : 0;
    const lp = E.levelProgress(S().xp);
    const ups = entry.ex.map((e) => { const p = e.effort ? E.predictNext(e.id, e.sets.map((x) => Object.assign({ done: true }, x)), e.effort) : null; return p && /kg/.test(p.text) && !/help/.test(p.text) ? D.EX[e.id].name + ' ' + p.text : null; }).filter(Boolean);
    const title = TITLES[S().log.length % TITLES.length];
    host.innerHTML = '<div class="done-screen" role="dialog" aria-label="Session complete"><div class="done-screen__inner">' +
      '<div class="done-screen__trophy">' + App.plate('', '#ffffff', { ring: 'rgba(36,72,245,.4)', hub: 'rgba(36,72,245,.15)', hole: '#ffbe1a' }).replace('<svg class=""', '<svg style="width:100%;height:100%"') + '</div>' +
      '<div class="eyebrow" style="color:rgba(255,255,255,.8)">' + esc(plan.sessions[entry.key].name) + ' · ' + tot.done + ' of ' + tot.total + '</div>' +
      '<h1 class="done-screen__title display">' + esc(title) + '</h1>' +
      (pr ? '<p style="opacity:.9">' + (left ? left + ' more ' + App.plural(left, 'session') + ' to your reward: <b>' + esc(pr.text) + '</b>' : 'Reward unlocked!') + '</p>' : '') +
      '<div class="stats"><div class="stat"><div class="stat__num" data-cu="' + entry.mins + '">0</div><div class="stat__lbl">Minutes</div></div><div class="stat"><div class="stat__num" data-cu="' + sets + '">0</div><div class="stat__lbl">Sets</div></div><div class="stat"><div class="stat__num" data-cu="' + kg + '">0</div><div class="stat__lbl">kg lifted</div></div></div>' +
      (cmp && kg ? '<p style="font-weight:700">That’s about the weight of ' + cmp[1] + '.</p>' : '') +
      '<div class="done-card"><div class="row row--between"><b>+<span data-cu="' + xpGained + '">0</span> XP</b><span class="t-sm" style="opacity:.85">' + esc(D.LEVELS[lp.level].name) + '</span></div><div class="xpbar"><i data-xpw="' + lp.pct + '"></i></div></div>' +
      '<div class="done-card"><b>How do you feel now?</b><div class="feel">' + [['great', 'Great', 'smile'], ['good', 'Good', 'target'], ['tired', 'Tired', 'meh']].map((o) => '<button class="feel__btn" data-act="sxMood" data-v="' + o[0] + '"><span class="feel__face">' + icon(o[2]) + '</span>' + o[1] + '</button>').join('') + '</div></div>' +
      (nxt ? '<div class="done-card"><div class="row">' + icon('calendar') + '<div class="grow"><div class="t-xs" style="opacity:.75;font-weight:800;text-transform:uppercase;letter-spacing:.06em">Next up</div><b>' + esc(plan.sessions[nxt.key].name + ' · ' + App.rel(E.slotDate(nxt))) + '</b></div></div>' + (ups.length ? '<div class="t-sm" style="opacity:.9">Going up next time: ' + esc(ups.slice(0, 3).join(' · ')) + '</div>' : '') + '</div>' : '') +
      '<button class="btn btn--white btn--block" data-act="sxDoneClose">Back to today' + icon('arrow') + '</button>' +
    '</div></div>';
    App.Coach.setContext({ key: 'complete', label: 'Session complete' });
    App.sound('success'); App.haptic([40, 60, 40, 60, 120]);
    setTimeout(() => App.confetti(), 250);
    requestAnimationFrame(() => {
      host.querySelectorAll('[data-cu]').forEach((el) => App.countUp(el, Number(el.dataset.cu), 1200));
      setTimeout(() => { const b = host && host.querySelector('[data-xpw]'); if (b) b.style.width = b.dataset.xpw + '%'; }, 200);
    });
    setTimeout(() => App.Views.celebrate(), 2600);
  }

  // ── Photos (kept on the phone, downscaled) ────────────────────────────────
  function pickPhoto() {
    const inp = host && host.querySelector('[data-photo-input]'); if (!inp) return;
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const st = curEx(); if (!st) return;
      const img = new Image(); const url = URL.createObjectURL(f);
      img.onload = () => {
        const max = 900; const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const data = c.toDataURL('image/jpeg', 0.72);
        URL.revokeObjectURL(url);
        S().exSettings[st.id] = Object.assign({}, S().exSettings[st.id], { photo: data });
        App.saveNow(); render();
        App.toast('Photo saved for next time', 'camera');
      };
      img.onerror = () => App.toast('That photo couldn’t be opened');
      img.src = url;
    };
    inp.click();
  }
  function settingsSheet() {
    const st = curEx(); if (!st) return;
    const ex = D.EX[st.id]; const cur = S().exSettings[st.id] || {};
    const steps = [1, 2.5, 5, 7];
    App.sheet('My settings', '<p class="muted">Save how you set up the ' + esc(ex.name.toLowerCase()) + ' so next time takes seconds.</p>' +
      '<div class="field"><label class="field__label" for="seatIn">Seat, pads and start position</label><input id="seatIn" class="input" style="font-size:16px" placeholder="e.g. Seat 4, back pad 2" value="' + esc(cur.seat || '') + '"></div>' +
      (ex.unit === 'kg' ? '<div class="field"><div class="field__label">This machine goes up in</div><div class="seg">' + steps.map((v) => '<button class="seg__btn' + (E.stepOf(st.id) === v ? ' is-on' : '') + '" data-act="sxStepSize" data-v="' + v + '">' + v + ' kg</button>').join('') + '</div></div>' : ''),
      { foot: '<button class="btn btn--block" data-act="sxSaveSettings">' + icon('check') + 'Save settings</button>' });
  }
  function swapSheet() {
    const st = curEx(); if (!st) return;
    const a = S().active; const gym = E.gymOf(a.gymId);
    const inSession = a.steps.filter((x) => x.t === 'ex').map((x) => x.id);
    const base = D.EX[st.base];
    const pool = [st.base].concat(base.alts || []).concat(D.EX[st.id].alts || []).filter((x, i, arr) => arr.indexOf(x) === i && x !== st.id && !inSession.includes(x) && D.EX[x] && gym.kit.includes(x));
    App.sheet('Swap the ' + esc(D.EX[st.id].name.toLowerCase()), '<p class="muted">These work the same muscles, so your plan still holds together.</p>' +
      '<div class="options">' + pool.map((x) => { const e = D.EX[x]; return '<button class="option" data-act="sxSwapTo" data-v="' + x + '"><span class="option__icon">' + art(e.art).replace('<svg class=""', '<svg style="width:32px;height:32px"') + '</span><span class="option__main"><span class="option__title">' + esc(e.name) + '</span><span class="option__sub" style="display:block">' + esc(e.focus) + (e.kind === 'free' ? ' · uses dumbbells' : e.kind === 'mat' ? ' · on a mat' : '') + '</span></span>' + icon('right', 'ic-sm') + '</button>'; }).join('') + '</div>' +
      '<button class="check" data-act="sxSwapAlways"><span class="check__box">' + icon('check', 'ic-sm') + '</span><span class="grow">Use my choice from now on<span class="check__sub">Otherwise it’s just for today</span></span></button>');
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  let swapAlways = false;
  Object.assign(App.ACT, {
    sxNext() {
      const a = S().active; if (!a) return;
      const st = a.steps[a.step];
      if (st.t === 'cardio') { st.elapsed = cardioElapsed(st); st.runFrom = null; }
      if (a.step >= a.steps.length - 1) return finish();
      a.step++; App.save(); App.sound('tap'); render(1);
    },
    sxDoneNext() { const st = curEx(); if (!st) return; const i = st.sets.findIndex((x) => !x.done); if (i >= 0) logSet(i); },
    sxLeave() {
      App.openLayer('<div class="modal"><div class="option__icon tone-blue" style="width:64px;height:64px;border-radius:20px">' + icon('pause', 'ic-lg') + '</div><h2 class="modal__title display">Take a break?</h2><p class="modal__text">Everything you’ve logged is saved. Pick up from Today whenever you’re ready.</p>' +
        '<button class="btn" data-act="closeLayer">Keep going</button><button class="btn btn--ghost" data-act="sxPause">Leave for now</button>' +
        (S().active && S().active.steps.some((x) => x.t === 'ex' && x.sets.some((y) => y.done)) ? '<button class="btn btn--plain" data-act="sxEndNow">Finish the session here</button>' : '') + '</div>', { modal: true });
    },
    sxPause() { App.closeLayer(true); close(); App.render(); App.toast('Session saved. Resume from Today.', 'pause'); },
    sxEndNow() { App.closeLayer(true); finish(); },
    sxCheck(el) { const st = S().active.steps[S().active.step]; st.checks[el.dataset.v] = !st.checks[el.dataset.v]; el.classList.toggle('is-on'); App.haptic(6); if (st.checks[el.dataset.v]) App.burstAt(el.querySelector('.check__box'), { n: 10 }); App.save(); },
    sxTick(el) { const st = S().active.steps[S().active.step]; const i = el.dataset.v; st.ticks[i] = !st.ticks[i]; el.classList.toggle('is-on'); App.haptic(6); if (st.ticks[i]) App.burstAt(el.querySelector('.check__box'), { n: 10 }); App.save(); },
    sxCardio() {
      const st = S().active.steps[S().active.step];
      if (st.runFrom) { st.elapsed = cardioElapsed(st); st.runFrom = null; } else { if (st.elapsed >= st.min * 60) st.elapsed = 0; st.runFrom = Date.now(); }
      App.save(); App.sound('tap');
      const b = host.querySelector('[data-cbtn]'); if (b) { b.className = 'btn btn--sm' + (st.runFrom ? ' btn--ghost' : ''); b.innerHTML = st.runFrom ? icon('pause', 'ic-sm') + 'Pause' : icon('play', 'ic-sm') + 'Resume'; }
      updateCardio();
    },
    sxCardioSwap(el) { const st = S().active.steps[S().active.step]; st.id = el.dataset.v; App.save(); render(); },
    sxHow() { const st = curEx(); st.howOpen = !st.howOpen; App.save(); const y = host.querySelector('.sx__scroll').scrollTop; render(); host.querySelector('.sx__scroll').scrollTop = y; },
    sxStep(el) { const [i, f, d] = el.dataset.v.split('|'); step(Number(i), f, Number(d)); },
    sxDone(el) { logSet(Number(el.dataset.v)); },
    sxAddSet() { const st = curEx(); const last = st.sets[st.sets.length - 1]; st.sets.push({ w: last.w, r: last.r, done: false }); App.save(); refreshSets(st.sets.length - 1); },
    sxFirstFeel(el) {
      const st = curEx(); const v = el.dataset.v; st.firstFeel = v;
      const stp = E.stepOf(st.id);
      const delta = v === 'light' ? 2 * stp : v === 'heavy' ? -stp : 0;
      const nw = Math.max(stp, Math.round((st.sets[0].w + delta) * 10) / 10);
      st.sets.forEach((x) => { if (!x.done) x.w = nw; });
      App.save(); refreshSets();
      App.toast(v === 'right' ? 'Perfect. Stay at ' + App.fmtKg(nw) + ' kg.' : 'Let’s try ' + App.fmtKg(nw) + ' kg for the next set.', 'target');
      openRest(st, D.EX[st.id]);
    },
    sxEffort(el) {
      const st = curEx(); const first = !st.effort; st.effort = el.dataset.v;
      if (!st.xp) { st.xp = true; App.award(D.XP.exercise, el); }
      App.save(); refreshSets();
      if (first) { App.sound('success'); const p = host.querySelector('.prediction'); if (p) App.burstAt(p, { n: 20, colors: ['#ffbe1a', '#ffffff', '#2448f5'] }); }
    },
    sxSwap() { swapAlways = false; swapSheet(); },
    sxSwapAlways(el) { swapAlways = !swapAlways; el.classList.toggle('is-on', swapAlways); },
    sxSwapTo(el) {
      const st = curEx(); const to = el.dataset.v;
      const fresh = exStep(to, st.base, st.sets.length);
      Object.assign(st, fresh);
      if (swapAlways) { if (to === st.base) delete S().swaps[st.base]; else S().swaps[st.base] = to; }
      App.save(); App.closeLayer(); render();
      App.toast('Swapped to ' + D.EX[to].name + (swapAlways ? ' from now on' : ' for today'), 'swap');
    },
    sxSettings() { settingsSheet(); },
    sxStepSize(el) { const st = curEx(); S().exSettings[st.id] = Object.assign({}, S().exSettings[st.id], { step: Number(el.dataset.v) }); App.$$('.sheet .seg__btn').forEach((b) => b.classList.toggle('is-on', b === el)); App.save(); },
    sxSaveSettings() {
      const st = curEx(); const v = (App.$('#seatIn') || {}).value || '';
      S().exSettings[st.id] = Object.assign({}, S().exSettings[st.id], { seat: v.trim() });
      App.save(); App.closeLayer();
      if (v.trim() && !S().badges.settings) { App.award(D.XP.settings); App.unlock('settings'); setTimeout(() => App.Views.celebrate(), 400); }
      render(); App.toast('Settings saved for next time', 'sliders');
    },
    sxPhoto() { pickPhoto(); },
    sxFinish() { finish(); },
    sxMood(el) { const l = S().log[S().log.length - 1]; if (l) l.mood = el.dataset.v; App.save(); App.$$('[data-act="sxMood"]').forEach((b) => b.classList.toggle('is-on', b === el)); App.haptic(8); App.burstAt(el, { n: 14 }); },
    sxDoneClose() { close(); App.tab = 'today'; App.render(); window.scrollTo(0, 0); },
    restAdd() { if (restState) { restState.end += 15000; restState.total += 15; } },
    restSkip() { closeRest(); },
  });

  App.Session = { start, open, close, render, finish };
})();
