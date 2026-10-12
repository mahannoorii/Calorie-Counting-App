/* Spotter — onboarding: one question per screen with the reason underneath, then the plan
   is built and revealed. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const { esc, icon, art } = App;

  const ob = (App.ob = { step: 0, dir: 1, p: null, phase: 'welcome', active: false, editing: false });

  function blank() {
    return {
      name: '', goals: [], event: { name: '', date: '' }, feel: [], why: '',
      experience: '', worries: [], screening: [null, null, null, null, null, null],
      asthma: null, reliever: null, actionPlan: null,
      gymId: '', perWeek: 2, days: [], time: '', mins: 45, equipment: 'machines',
      cuisines: [], derailers: [], start: 'now',
    };
  }
  // Mirrors the first tester's situation so the prototype can be shown end to end.
  function demo() {
    const t = App.today();
    const ev = t < '2026-12-17' ? '2026-12-17' : App.addDays(t, 63);
    return Object.assign(blank(), {
      name: 'Ava', goals: ['event', 'confidence', 'energy'], event: { name: 'Holiday in Turkey', date: ev },
      feel: ['Confident', 'Energetic', 'Strong'], why: 'Walk on that beach feeling great, and keep going after.',
      experience: 'never', worries: ['what', 'machines', 'food'], screening: [false, false, false, false, false, false],
      asthma: true, reliever: true, actionPlan: 'yes', gymId: 'af-rhn', perWeek: 2, days: [1, 4], time: 'evening', mins: 45,
      cuisines: ['middleeast', 'italian', 'aussie', 'thai', 'chinese'],
      derailers: ['gatherings', 'eatingout', 'takeaway', 'sweets'], start: 'now',
    });
  }

  const GOAL_TILE = { event: 'bg-blue', strong: 'bg-accent', energy: 'bg-gold', fat: 'bg-red', confidence: 'bg-purple', health: 'bg-green' };
  const TIME_TILE = { morning: ['sun', 'bg-gold'], lunch: ['clock', 'bg-teal'], afternoon: ['clock', 'bg-blue'], evening: ['moon', 'bg-purple'] };

  // ── Steps ─────────────────────────────────────────────────────────────────
  const STEPS = [
    { id: 'name', q: 'What should I call you?', why: 'I’m Spotter, your trainer. A few quick questions and I’ll build a plan around your week. About three minutes.',
      valid: (p) => p.name.trim().length > 0,
      body: (p) => '<label class="vh" for="obName">Your first name</label><input id="obName" class="input input--big" data-in="obName" data-enter="obNext" value="' + esc(p.name) + '" placeholder="First name" autocomplete="given-name" enterkeyhint="next">' },
    { id: 'goals', q: 'What are you working towards?', why: 'Pick as many as you like. It shapes your plan and how I keep you going.',
      valid: (p) => p.goals.length > 0,
      body: (p) => list(D.GOALS.map((g) => opt('goal', g.id, g.label, '', [g.icon, GOAL_TILE[g.id]], p.goals.includes(g.id))), true) },
    { id: 'event', when: (p) => p.goals.includes('event'), q: 'What’s the big day?', why: 'A date gives us a finish line. I’ll count down with you and plan backwards from it.',
      valid: (p) => p.event.name.trim() && p.event.date && p.event.date > App.today(),
      body: (p) =>
        '<div class="field"><label class="field__label" for="obEvName">What is it?</label><input id="obEvName" class="input" data-in="obEvName" value="' + esc(p.event.name) + '" placeholder="e.g. Holiday in Bali"></div>' +
        '<div class="field"><label class="field__label" for="obEvDate">When?</label><input id="obEvDate" type="date" class="input" data-in="obEvDate" min="' + App.addDays(App.today(), 1) + '" value="' + esc(p.event.date) + '"></div>' +
        (p.event.date && p.event.date > App.today() ? '<div class="callout callout--blue">' + icon('calendar') + '<div><b>' + App.diffDays(App.today(), p.event.date) + ' days</b> from today. Plenty of time to make a real difference.</div></div>' : '') },
    { id: 'feel', q: 'How do you want to feel when you get there?', why: 'This is your why. I’ll bring it back when motivation dips. Choose up to three.',
      valid: (p) => p.feel.length > 0 || p.why.trim(),
      body: (p) => '<div class="chips">' + D.FEELS.map((f) => chip('obFeel', f, f, p.feel.includes(f))).join('') + '</div>' +
        '<div class="field"><label class="field__label" for="obWhy">In your own words (optional)</label><textarea id="obWhy" class="input" data-in="obWhy" placeholder="e.g. Feel confident on the beach, and keep it going after">' + esc(p.why) + '</textarea></div>' },
    { id: 'experience', q: 'Have you trained in a gym before?', why: 'No wrong answers. Beginners get extra guidance on every machine.',
      valid: (p) => !!p.experience,
      body: (p) => list(D.EXPERIENCE.map((e) => opt('exp', e.id, e.label, e.sub, null, p.experience === e.id))) },
    { id: 'worries', q: 'What feels hardest about the gym right now?', why: 'Pick any that apply, or skip. Knowing yours means I can help with it.', optional: (p) => !p.worries.length,
      valid: () => true,
      body: (p) => list(D.WORRIES.map((w) => opt('worry', w.id, w.label, '', null, p.worries.includes(w.id)))) },
    { id: 'health', q: 'A quick health check', why: 'The standard pre-exercise questions Australian gyms use. They keep you safe.',
      valid: (p) => p.screening.every((v) => v !== null),
      body: (p) => '<div class="group">' + D.SCREENING.map((q, i) =>
        '<div class="yn"><span>' + esc(q) + '</span><div class="seg" role="group" aria-label="Question ' + (i + 1) + '">' +
          seg('obScreen', i + '|no', 'No', p.screening[i] === false) + seg('obScreen', i + '|yes', 'Yes', p.screening[i] === true) + '</div></div>').join('') + '</div>' +
        (p.screening.some((v) => v === true) ? '<div class="callout">' + icon('shield') + '<div>Thanks for telling me. Before your first session, check in with your GP or an allied health professional. It’s the standard step for anyone who answers yes. You can still build your plan now.</div></div>' : '') },
    { id: 'asthma', q: 'Do you have asthma?', why: 'Asthma and the gym go together fine. It just changes how we warm up.',
      valid: (p) => p.asthma === false || (p.asthma === true && p.reliever !== null && p.actionPlan !== null),
      body: (p) => '<div class="seg seg--lg">' + seg('obAsthma', 'no', 'No', p.asthma === false) + seg('obAsthma', 'yes', 'Yes', p.asthma === true) + '</div>' +
        (p.asthma ? '<div class="field"><div class="field__label">Do you carry a reliever puffer?</div><div class="seg seg--lg">' + seg('obReliever', 'yes', 'Yes', p.reliever === true) + seg('obReliever', 'no', 'No', p.reliever === false) + '</div></div>' +
          '<div class="field"><div class="field__label">Do you have an asthma action plan?</div><div class="seg seg--lg">' + seg('obAction', 'yes', 'Yes', p.actionPlan === 'yes') + seg('obAction', 'no', 'No', p.actionPlan === 'no') + seg('obAction', 'unsure', 'Not sure', p.actionPlan === 'unsure') + '</div></div>' +
          '<div class="callout callout--blue">' + icon('puffer') + '<div>I’ll give you a longer, gentler warm-up, check your puffer’s in your bag before each session, and tell you exactly what to do if your chest tightens.' + (p.reliever === false || p.actionPlan === 'no' || p.actionPlan === 'unsure' ? ' It’s worth asking your GP for a reliever and an action plan before you start.' : '') + '</div></div>' : '') },
    { id: 'gym', q: 'Where will you train?', why: 'Your plan only uses machines your gym has. Photos and the spot of each machine arrive once we’ve mapped it.',
      valid: (p) => !!p.gymId,
      body: (p) => list(D.GYMS.map((g) => opt('gym', g.id, g.generic ? 'My gym isn’t listed' : g.brand + ' ' + g.branch, g.generic ? 'I’ll use a standard set of machines' : g.area, g.generic ? ['pin', 'bg-ink'] : ['AF', 'bg-purple'], p.gymId === g.id)), true) },
    { id: 'schedule', q: 'Which days can you train?', why: 'Two days a week meets Australia’s guideline for strength training. Start there and add a day later if you like.',
      valid: (p) => p.days.length === p.perWeek,
      body: (p) => '<div class="field"><div class="field__label">Days per week</div><div class="seg seg--lg">' + seg('obPerWeek', '2', '2 days', p.perWeek === 2) + seg('obPerWeek', '3', '3 days', p.perWeek === 3) + '</div></div>' +
        '<div class="field"><div class="field__label">Pick ' + p.perWeek + ' days</div><div class="weekdays">' + App.DOW.map((d, i) => '<button class="wd' + (p.days.includes(i) ? ' is-on' : '') + '" data-act="obDay" data-v="' + i + '" aria-pressed="' + p.days.includes(i) + '" aria-label="' + App.DOW_LONG[i] + '">' + d.charAt(0) + '</button>').join('') + '</div></div>' +
        (p.days.length ? '<p class="daysline">' + esc(daysWords(p)) + '</p>' : '') + spacingNote(p) },
    { id: 'time', q: 'When do you usually go?', why: 'I’ll fit each session to the time you’ve got. Shorter sessions just use fewer machines.',
      valid: (p) => !!p.time,
      body: (p) => list(D.TIMES.map((t) => opt('time', t.id, t.label, 'Around ' + t.at, TIME_TILE[t.id], p.time === t.id)), true) +
        '<div class="field"><div class="field__label">Time for each session</div><div class="seg seg--lg">' + [30, 45, 60].map((m) => seg('obMins', String(m), m + ' min', p.mins === m)).join('') + '</div></div>' },
    { id: 'equipment', when: (p) => p.experience === 'regular', q: 'What would you like to use?', why: 'Machines are the quickest to learn. Add dumbbells if you’re comfortable with them.',
      valid: () => true,
      body: (p) => list([opt('equip', 'machines', 'Machines only', 'Guided, simple, quick to set up', ['sliders', 'bg-accent'], p.equipment === 'machines'), opt('equip', 'mixed', 'Machines and some dumbbells', 'A bit more variety', ['dumbbell', 'bg-blue'], p.equipment === 'mixed')], true) },
    { id: 'cuisines', q: 'What do you usually eat?', why: 'Pick all that apply. I’ll plan easy dinners from these and pick your order when you eat out.',
      valid: (p) => p.cuisines.length > 0,
      body: (p) => '<div class="chips">' + D.CUISINES.map((c) => chip('obCuisine', c.id, c.name, p.cuisines.includes(c.id))).join('') + '</div>' },
    { id: 'derail', q: 'What usually knocks your eating off track?', why: 'Optional. These are the moments I’ll help you plan for.', optional: (p) => !p.derailers.length,
      valid: () => true,
      body: (p) => '<div class="chips">' + D.DERAILERS.map((d) => chip('obDerail', d.id, d.label, p.derailers.includes(d.id))).join('') + '</div>' },
    { id: 'start', q: 'When do you want to start?', why: 'That’s everything I need. You can change any of it later.',
      valid: (p) => !!p.start,
      body: (p) => {
        const nextMon = App.addDays(App.weekStart(App.today()), 7);
        return list([opt('start', 'now', 'This week', 'Your first session is the next ' + daysWords(p, ' or ') + ' that comes up', ['bolt', 'bg-accent'], p.start === 'now'),
          opt('start', 'next', 'Next week', 'Starting ' + App.fmtDate(nextMon, 'long'), ['calendar', 'bg-blue'], p.start === 'next')], true);
      } },
  ];

  function list(items, tiles) { return '<div class="group' + (tiles ? ' group--tiles' : '') + '">' + items.join('') + '</div>'; }
  function opt(kind, v, title, sub, tile, on) {
    const t = tile ? '<span class="cell__tile ' + tile[1] + '">' + (tile[0].length <= 2 ? '<b style="font-size:12px;letter-spacing:.02em">' + tile[0] + '</b>' : icon(tile[0])) + '</span>' : '';
    return '<button class="cell' + (on ? ' is-on' : '') + '" data-act="obOpt" data-k="' + kind + '" data-v="' + esc(v) + '" aria-pressed="' + !!on + '">' + t +
      '<span class="cell__main"><span class="cell__title">' + esc(title) + '</span>' + (sub ? '<span class="cell__sub">' + esc(sub) + '</span>' : '') + '</span>' +
      icon('check', 'cell__check') + '</button>';
  }
  function seg(act, v, label, on) { return '<button class="seg__btn' + (on ? ' is-on' : '') + '" data-act="' + act + '" data-v="' + v + '" aria-pressed="' + !!on + '">' + label + '</button>'; }
  function chip(act, v, label, on) { return '<button class="chip' + (on ? ' is-on' : '') + '" data-act="' + act + '" data-v="' + esc(v) + '" aria-pressed="' + !!on + '">' + esc(label) + '</button>'; }
  function daysWords(p, joiner) {
    const d = p.days.slice().sort((a, b) => a - b).map((x) => App.DOW_LONG[x] + (joiner ? '' : 's'));
    if (!d.length) return 'training day';
    if (joiner) return d.join(joiner);
    return d.length === 1 ? d[0] : d.slice(0, -1).join(', ') + ' and ' + d[d.length - 1];
  }
  function spacingNote(p) {
    if (p.days.length < 2) return '';
    const s = p.days.slice().sort((a, b) => a - b);
    const back2back = s.some((d, i) => i > 0 && d - s[i - 1] === 1) || (s[0] === 0 && s[s.length - 1] === 6);
    return back2back
      ? '<div class="callout">' + icon('info') + '<div>Two days in a row works, but a rest day in between helps you recover. Spread them out if you can.</div></div>'
      : '<div class="callout callout--green">' + icon('check') + '<div>Good spacing. Rest days in between help you come back stronger.</div></div>';
  }
  function visibleSteps(p) { return STEPS.filter((s) => !s.when || s.when(p)); }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    if (ob.phase === 'welcome') return welcome();
    if (ob.phase === 'build') return build();
    if (ob.phase === 'reveal') return reveal();
    const p = ob.p; const steps = visibleSteps(p);
    ob.step = App.clamp(ob.step, 0, steps.length - 1);
    const st = steps[ob.step];
    const pct = Math.round(((ob.step + 1) / (steps.length + 1)) * 100);
    const last = ob.step === steps.length - 1;
    const label = last ? 'Build my plan' : st.optional && st.optional(p) ? 'Skip' : 'Continue';
    return '<div class="ob">' +
      '<div class="ob__nav"><button class="icon-btn icon-btn--plain" data-act="obBack" aria-label="Back">' + icon('left') + '</button>' +
        '<div class="ob__bar" role="progressbar" aria-label="Progress" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>' +
        '</div>' +
      '<div class="ob__body' + (ob.dir < 0 ? ' is-back' : '') + '">' +
        '<h1 class="ob__q">' + esc(st.q) + '</h1>' +
        '<p class="ob__why">' + esc(st.why) + '</p>' +
        st.body(p) +
      '</div>' +
      '<div class="ob__foot"><div class="ob__foot-inner"><button class="btn btn--block" data-act="obNext"' + (st.valid(p) ? '' : ' disabled') + '>' + label + '</button></div></div>' +
    '</div>';
  }

  function mark() {
    return '<svg viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="10.5" fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="52 66" transform="rotate(-90 13 13)"/><circle cx="13" cy="13" r="5.5" fill="none" stroke="var(--green)" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="25 35" transform="rotate(-90 13 13)"/></svg>';
  }
  function welcome() {
    return '<div class="welcome">' +
      '<div class="welcome__mark">' + mark() + 'Spotter</div>' +
      '<div class="welcome__art" aria-hidden="true">' + App.rings([{ pct: 0.78, cls: 'r-train' }, { pct: 0.62, cls: 'r-eat' }], 240, 26).replace('class="rings"', 'class="rings hero-rings"') + '</div>' +
      '<div><h1 class="welcome__title">A personal trainer in your pocket.</h1>' +
        '<p class="welcome__sub">Built for beginners. Spotter knows your gym’s machines, plans every session and sorts out what to eat, even when you eat out.</p></div>' +
      '<div class="welcome__actions"><button class="btn btn--block" data-act="obStart">Get started</button>' +
        '<button class="btn btn--plain" data-act="obDemo">Try it with example answers</button></div>' +
    '</div>';
  }

  // ── Building the plan ─────────────────────────────────────────────────────
  function build() {
    const p = ob.p; const gym = App.E.gymOf(p.gymId);
    const lines = [
      'Reading your answers',
      'Matching machines at ' + (gym.generic ? 'your gym' : gym.branch),
      'Building Session A and Session B',
      'Picking dinners you’ll actually eat',
      p.goals.includes('event') && p.event.date ? 'Counting down to ' + (p.event.name || 'your big day') : 'Lining up your rewards',
    ];
    return '<div class="build"><div class="build__inner">' +
      '<div class="spin">' + App.rings([{ pct: 0.7, cls: 'r-train' }, { pct: 0.5, cls: 'r-eat' }], 84, 10) + '</div>' +
      '<h1 class="build__title">Building your plan</h1>' +
      '<div class="build__steps">' + lines.map((l, i) => '<div class="build__step" data-bstep="' + i + '"><i>' + icon('check') + '</i>' + esc(l) + '</div>').join('') + '</div>' +
    '</div></div>';
  }
  function runBuild() {
    const steps = App.$$('[data-bstep]');
    const gap = App.reduceMotion() ? 120 : 480;
    steps.forEach((el, i) => setTimeout(() => { el.classList.add('is-done'); App.sound('tick'); App.haptic(); }, 400 + i * gap));
    setTimeout(() => { ob.phase = 'reveal'; App.render(); window.scrollTo(0, 0); App.sound('done'); App.haptic('success'); }, 400 + steps.length * gap + 450);
  }

  // ── The reveal: the plan at a glance, then into the app ───────────────────
  function reveal() {
    const s = App.S; const p = s.profile; const plan = s.plan; const E = App.E;
    const first = E.nextOpen(App.today()) || plan.slots[0];
    const tm = E.timeOf(plan.time);
    const exs = E.exercisesFor(first.key, first.week, first.id);
    const days = plan.days.map((d) => App.DOW_LONG[d] + 's');
    const firstName = p.name.split(' ')[0];
    const rw = E.partnerRewards();
    return '<div class="reveal">' +
      '<div><div class="eyebrow t-accent">Your plan is ready</div><h1 class="reveal__title">' + esc(firstName) + ', here’s how we’ll do it.</h1></div>' +
      '<div class="group">' +
        row('calendar', 'bg-accent', plan.weeks + ' weeks, ' + plan.days.length + ' sessions a week', days.slice(0, -1).join(', ') + ' and ' + days[days.length - 1] + ', ' + tm.label.toLowerCase()) +
        row('pin', 'bg-purple', E.gymName(plan.gymId), 'Machines only, ' + plan.mins + ' minutes a session') +
        (plan.event ? row('plane', 'bg-blue', plan.event.name, App.fmtDate(plan.event.date, 'long') + ' · ' + App.diffDays(App.today(), plan.event.date) + ' days') : row('flag', 'bg-blue', 'Finish line', App.fmtDate(plan.end, 'long'))) +
      '</div>' +
      '<div class="sec"><div class="sec__h"><h2 class="sec__title">First session</h2><span class="sec__aside">' + esc(App.rel(E.slotDate(first))) + ' · ' + esc(tm.at) + '</span></div>' +
        '<div class="group group--tiles">' + exs.map((e) => { const ex = D.EX[e.id]; return '<div class="cell"><span class="cell__tile cell__tile--art">' + art(ex.art) + '</span><span class="cell__main"><span class="cell__title">' + esc(ex.name) + '</span><span class="cell__sub">' + esc(ex.focus) + '</span></span></div>'; }).join('') + '</div>' +
        '<p class="fn">' + esc(E.phaseFor(1, plan).note) + '</p></div>' +
      '<div class="callout">' + coachMark() + '<div><b>I’ll check in each day.</b> Tap a reply or message me any time: if you’re sore, short on time or eating out, I’ll sort it.</div></div>' +
      (rw.length ? '<div class="sec"><div class="sec__h"><h2 class="sec__title">Rewards on the way</h2></div><div class="group group--tiles">' + rw.map((r) => row('gift', 'bg-gold', r.text, 'Week ' + r.week + ' · after ' + r.need + ' sessions')).join('') + '</div></div>' : '') +
      '<div class="ob__foot"><div class="ob__foot-inner"><button class="btn btn--block btn--accent" data-act="startPlan">Let’s go</button></div></div>' +
    '</div>';
  }
  function row(ic, tile, title, sub) {
    return '<div class="cell"><span class="cell__tile ' + tile + '">' + icon(ic) + '</span><span class="cell__main"><span class="cell__title">' + esc(title) + '</span><span class="cell__sub">' + esc(sub) + '</span></span></div>';
  }
  function coachMark() { return '<span class="coach-avatar">' + App.Views.coachGlyph() + '</span>'; }

  // ── Answers to profile and back ───────────────────────────────────────────
  function toProfile(p) {
    return {
      name: p.name.trim(), goals: p.goals.slice(),
      event: p.goals.includes('event') && p.event.date ? { name: p.event.name.trim(), date: p.event.date } : null,
      feel: p.feel.slice(), why: p.why.trim(), experience: p.experience, worries: p.worries.slice(),
      health: { screening: p.screening.slice(), flag: p.screening.some((v) => v === true), cleared: false, asthma: !!p.asthma, reliever: p.reliever, actionPlan: p.actionPlan },
      gymId: p.gymId, days: p.days.slice().sort((a, b) => a - b), time: p.time, mins: p.mins, equipment: p.equipment,
      cuisines: p.cuisines.slice(), derailers: p.derailers.slice(), start: p.start, created: App.today(),
    };
  }
  function fromProfile(pr) {
    return Object.assign(blank(), {
      name: pr.name, goals: pr.goals || [], event: pr.event ? Object.assign({}, pr.event) : { name: '', date: '' },
      feel: pr.feel || [], why: pr.why || '', experience: pr.experience, worries: pr.worries || [],
      screening: (pr.health && pr.health.screening) || [false, false, false, false, false, false],
      asthma: pr.health ? pr.health.asthma : null, reliever: pr.health ? pr.health.reliever : null, actionPlan: pr.health ? pr.health.actionPlan : null,
      gymId: pr.gymId, perWeek: (pr.days || []).length || 2, days: pr.days || [], time: pr.time, mins: pr.mins || 45, equipment: pr.equipment || 'machines',
      cuisines: pr.cuisines || [], derailers: pr.derailers || [], start: 'now',
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggle = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); };
  function rerender() { const y = window.scrollY; App.render(); window.scrollTo(0, y); }
  function refreshFoot() {
    const st = visibleSteps(ob.p)[ob.step];
    const btn = App.$('[data-act="obNext"]'); if (btn) btn.disabled = !st.valid(ob.p);
  }
  function pickTick() { App.haptic(); App.sound('tick'); }
  Object.assign(App.ACT, {
    obStart() { ob.p = ob.p || blank(); ob.phase = 'steps'; ob.step = 0; ob.dir = 1; App.render(); window.scrollTo(0, 0); },
    obDemo() { ob.p = demo(); App.toast('Example answers filled in', 'sparkle'); App.ACT.obFinish(); },
    obBack() {
      if (ob.phase !== 'steps') return;
      if (ob.step === 0) {
        if (App.S.profile) { ob.editing = false; ob.active = false; App.render(); return; }
        ob.phase = 'welcome'; App.render(); return;
      }
      ob.step--; ob.dir = -1; App.render(); window.scrollTo(0, 0);
    },
    obNext() {
      const steps = visibleSteps(ob.p); const st = steps[ob.step];
      if (!st.valid(ob.p)) return;
      App.haptic();
      if (ob.step >= steps.length - 1) return App.ACT.obFinish();
      ob.step++; ob.dir = 1; App.render(); window.scrollTo(0, 0);
    },
    obFinish() {
      const prev = App.S.profile;
      App.S.profile = toProfile(ob.p);
      if (prev && prev.health && prev.health.cleared && !App.S.profile.health.flag) App.S.profile.health.cleared = true;
      App.S.plan = App.E.buildPlan(App.S.profile);
      App.S.rewards = App.S.rewards || Object.assign({}, D.DEFAULT_REWARDS);
      App.saveNow();
      ob.active = true; ob.phase = 'build'; App.render(); window.scrollTo(0, 0);
      runBuild();
    },
    obOpt(el) {
      const k = el.dataset.k, v = el.dataset.v, p = ob.p;
      if (k === 'goal') toggle(p.goals, v);
      else if (k === 'exp') p.experience = v;
      else if (k === 'worry') toggle(p.worries, v);
      else if (k === 'gym') p.gymId = v;
      else if (k === 'time') p.time = v;
      else if (k === 'equip') p.equipment = v;
      else if (k === 'start') p.start = v;
      pickTick(); rerender();
    },
    obFeel(el) { const p = ob.p; const v = el.dataset.v; if (!p.feel.includes(v) && p.feel.length >= 3) { App.toast('Up to three. Untick one first.'); return; } toggle(p.feel, v); pickTick(); rerender(); },
    obScreen(el) { const [i, v] = el.dataset.v.split('|'); ob.p.screening[Number(i)] = v === 'yes'; pickTick(); rerender(); },
    obAsthma(el) { ob.p.asthma = el.dataset.v === 'yes'; if (!ob.p.asthma) { ob.p.reliever = null; ob.p.actionPlan = null; } pickTick(); rerender(); },
    obReliever(el) { ob.p.reliever = el.dataset.v === 'yes'; pickTick(); rerender(); },
    obAction(el) { ob.p.actionPlan = el.dataset.v; pickTick(); rerender(); },
    obPerWeek(el) { ob.p.perWeek = Number(el.dataset.v); ob.p.days = ob.p.days.slice(0, ob.p.perWeek); pickTick(); rerender(); },
    obDay(el) {
      const p = ob.p; const v = Number(el.dataset.v);
      if (p.days.includes(v)) p.days = p.days.filter((d) => d !== v);
      else { p.days.push(v); if (p.days.length > p.perWeek) p.days.shift(); }
      pickTick(); rerender();
    },
    obMins(el) { ob.p.mins = Number(el.dataset.v); pickTick(); rerender(); },
    obCuisine(el) { toggle(ob.p.cuisines, el.dataset.v); pickTick(); rerender(); },
    obDerail(el) { toggle(ob.p.derailers, el.dataset.v); pickTick(); rerender(); },
  });
  Object.assign(App.IN, {
    obName(el) { ob.p.name = el.value; refreshFoot(); },
    obEvName(el) { ob.p.event.name = el.value; refreshFoot(); },
    obEvDate(el) { ob.p.event.date = el.value; refreshFoot(); rerender(); },
    obWhy(el) { ob.p.why = el.value; refreshFoot(); },
  });

  App.OB = { render, blank, demo, fromProfile, toProfile, visibleSteps };
})();
