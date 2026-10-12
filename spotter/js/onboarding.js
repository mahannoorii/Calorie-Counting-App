/* Spotter — onboarding: one question per screen, the coach explains why, then the plan is built. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const { esc, icon, art } = App;

  const ob = (App.ob = { step: 0, dir: 1, p: null, phase: 'welcome' });

  function blank() {
    return {
      name: '', goals: [], event: { name: '', date: '' }, feel: [], why: '',
      experience: '', worries: [], screening: [null, null, null, null, null, null],
      asthma: null, reliever: null, actionPlan: null,
      gymId: '', perWeek: 2, days: [], time: '', mins: 45, equipment: 'machines',
      cook: '', dishes: [], derailers: [], start: 'now',
    };
  }
  function demo() {
    // Mirrors the first tester's situation so the prototype can be shown end to end.
    const t = App.today();
    const ev = t < '2026-12-17' ? '2026-12-17' : App.addDays(t, 63);
    return Object.assign(blank(), {
      name: 'Ava', goals: ['event', 'confidence', 'energy'], event: { name: 'Holiday in Turkey', date: ev },
      feel: ['Confident', 'Energetic', 'Strong'], why: 'Walk on that beach feeling great, and keep going after.',
      experience: 'never', worries: ['what', 'machines', 'food'], screening: [false, false, false, false, false, false],
      asthma: true, reliever: true, actionPlan: 'yes', gymId: 'af-rhn', perWeek: 2, days: [1, 5], time: 'evening', mins: 45,
      cook: 'both', dishes: ['ghormeh', 'joojeh', 'koobideh', 'zereshk', 'stirfry', 'bolognese'],
      derailers: ['gatherings', 'eatingout', 'takeaway', 'sweets'], start: 'now',
    });
  }

  // ── Step definitions ──────────────────────────────────────────────────────
  const STEPS = [
    { id: 'name', coach: 'I’m <b>Spotter</b>, your personal trainer. A few quick questions and I’ll build a plan around your life. About three minutes.',
      q: 'What should I call you?', valid: (p) => p.name.trim().length > 0,
      body: (p) => '<div class="field"><label class="visually-hidden" for="obName">Your name</label><input id="obName" class="input input--big" data-in="obName" value="' + esc(p.name) + '" placeholder="Your first name" autocomplete="given-name" enterkeyhint="next"></div>' },
    { id: 'goals', coach: 'Pick as many as you like. It shapes your plan and how I keep you going.',
      q: 'What are you working towards?', valid: (p) => p.goals.length > 0,
      body: (p) => '<div class="options">' + D.GOALS.map((g) => option('goal', g.id, g.label, '', g.icon, p.goals.includes(g.id))).join('') + '</div>' },
    { id: 'event', when: (p) => p.goals.includes('event'), coach: 'A date gives us a finish line. I’ll count down with you and plan backwards from it.',
      q: 'What’s the big day?', valid: (p) => p.event.name.trim() && p.event.date && p.event.date > App.today(),
      body: (p) =>
        '<div class="field"><label class="field__label" for="obEvName">What is it?</label><input id="obEvName" class="input" data-in="obEvName" value="' + esc(p.event.name) + '" placeholder="e.g. Holiday in Turkey"></div>' +
        '<div class="field"><label class="field__label" for="obEvDate">When?</label><input id="obEvDate" type="date" class="input" data-in="obEvDate" min="' + App.addDays(App.today(), 1) + '" value="' + esc(p.event.date) + '"></div>' +
        (p.event.date && p.event.date > App.today() ? '<div class="banner">' + icon('calendar') + '<div><b>' + App.diffDays(App.today(), p.event.date) + ' days</b> from today. Plenty of time to make a real difference.</div></div>' : '') },
    { id: 'feel', coach: 'This is your <b>why</b>. I’ll bring it back when motivation dips.',
      q: 'How do you want to feel when you get there?', hint: 'Choose up to three.', valid: (p) => p.feel.length > 0 || p.why.trim(),
      body: (p) => '<div class="chips">' + D.FEELS.map((f) => '<button class="chip' + (p.feel.includes(f) ? ' is-on' : '') + '" data-act="obFeel" data-v="' + esc(f) + '">' + esc(f) + '</button>').join('') + '</div>' +
        '<div class="field"><label class="field__label" for="obWhy">In your own words (optional)</label><textarea id="obWhy" class="input" data-in="obWhy" placeholder="e.g. Feel confident on the beach, and keep it going after">' + esc(p.why) + '</textarea></div>' },
    { id: 'experience', coach: 'No wrong answers. Beginners get extra guidance on every single machine.',
      q: 'Have you trained in a gym before?', valid: (p) => !!p.experience,
      body: (p) => '<div class="options">' + D.EXPERIENCE.map((e) => option('exp', e.id, e.label, e.sub, e.id === 'never' ? 'sparkle' : e.id === 'little' ? 'refresh' : 'dumbbell', p.experience === e.id)).join('') + '</div>' },
    { id: 'worries', coach: 'Everyone has something. Knowing yours means I can help with it.',
      q: 'What feels hardest about the gym right now?', hint: 'Pick any that apply, or skip.', valid: () => true,
      body: (p) => '<div class="options">' + D.WORRIES.map((w) => option('worry', w.id, w.label, '', null, p.worries.includes(w.id))).join('') + '</div>' },
    { id: 'health', coach: 'These are the standard pre-exercise questions Australian gyms use. They keep you safe.',
      q: 'A quick health check', valid: (p) => p.screening.every((v) => v !== null),
      body: (p) => '<div class="yesno">' + D.SCREENING.map((q, i) =>
        '<div class="yn"><div class="yn__q">' + esc(q) + '</div><div class="yn__btns">' +
          ['no', 'yes'].map((v) => '<button class="yn__btn' + (p.screening[i] === (v === 'yes') ? ' is-on' : '') + '" data-act="obScreen" data-i="' + i + '" data-v="' + v + '" aria-pressed="' + (p.screening[i] === (v === 'yes')) + '">' + (v === 'yes' ? 'Yes' : 'No') + '</button>').join('') +
        '</div></div>').join('') + '</div>' +
        (p.screening.some((v) => v === true) ? '<div class="banner">' + icon('shield') + '<div>Thanks for telling me. Before your first session, have a quick chat with your GP or an allied health professional. It’s the standard step for anyone who answers yes. You can still build your plan now.</div></div>' : '') },
    { id: 'asthma', coach: 'Asthma and the gym go together fine. It just changes how we warm up.',
      q: 'Do you have asthma?', valid: (p) => p.asthma === false || (p.asthma === true && p.reliever !== null),
      body: (p) => '<div class="seg" role="group" aria-label="Asthma">' + seg('obAsthma', 'no', 'No', p.asthma === false) + seg('obAsthma', 'yes', 'Yes', p.asthma === true) + '</div>' +
        (p.asthma ? '<div class="field"><div class="field__label">Do you have a reliever puffer?</div><div class="seg">' + seg('obReliever', 'yes', 'Yes', p.reliever === true) + seg('obReliever', 'no', 'No', p.reliever === false) + '</div></div>' +
          '<div class="field"><div class="field__label">Do you have an asthma action plan from your GP?</div><div class="seg">' + seg('obAction', 'yes', 'Yes', p.actionPlan === 'yes') + seg('obAction', 'no', 'No', p.actionPlan === 'no') + seg('obAction', 'unsure', 'Not sure', p.actionPlan === 'unsure') + '</div></div>' +
          '<div class="card card--flat"><div class="row" style="align-items:flex-start">' + icon('puffer') + '<div class="grow t-sm"><b>What I’ll do:</b> a longer, gradual warm-up, a "puffer in your bag?" check before each session, and the right steps if your chest tightens.' + (p.reliever === false || p.actionPlan === 'no' || p.actionPlan === 'unsure' ? ' It’s worth asking your GP for a reliever and an action plan before you start.' : '') + '</div></div></div>' : '') },
    { id: 'gym', coach: 'Your plan only uses machines this gym has. Photos and the exact spot of each machine arrive once we’ve mapped it.',
      q: 'Where will you train?', valid: (p) => !!p.gymId,
      body: (p) => '<div class="options">' + D.GYMS.map((g) =>
        '<button class="gym' + (p.gymId === g.id ? ' is-on' : '') + '" data-act="obGym" data-v="' + g.id + '"><span class="gym__logo">' + (g.generic ? icon('pin') : 'AF') + '</span><span class="grow"><span class="gym__name">' + esc(g.generic ? 'My gym isn’t listed' : g.brand + ' ' + g.branch) + '</span><br><span class="gym__sub">' + esc(g.generic ? 'I’ll use a standard set of machines' : g.area + ' · machine list to be confirmed') + '</span></span><span class="option__tick">' + icon('check', 'ic-sm') + '</span></button>').join('') + '</div>' },
    { id: 'schedule', coach: 'Two days a week meets Australia’s guideline for strength training. Start there and add more later if you want.',
      q: 'Which days can you train?', valid: (p) => p.days.length === p.perWeek,
      body: (p) => '<div class="field"><div class="field__label">Days per week</div><div class="seg">' + seg('obPerWeek', '2', '2 days', p.perWeek === 2, true) + seg('obPerWeek', '3', '3 days', p.perWeek === 3) + '</div></div>' +
        '<div class="field"><div class="field__label">Pick ' + p.perWeek + ' days</div><div class="weekdays">' + App.DOW.map((d, i) => '<button class="wd' + (p.days.includes(i) ? ' is-on' : '') + '" data-act="obDay" data-v="' + i + '" aria-pressed="' + p.days.includes(i) + '" aria-label="' + App.DOW_LONG[i] + '">' + d.slice(0, 2) + '</button>').join('') + '</div></div>' +
        spacingNote(p) },
    { id: 'time', coach: 'I’ll fit the session to the time you’ve got. Shorter sessions just use fewer machines.',
      q: 'When do you usually go?', valid: (p) => !!p.time,
      body: (p) => '<div class="options">' + D.TIMES.map((t) => option('time', t.id, t.label, '', t.id === 'morning' ? 'sun' : t.id === 'evening' ? 'moon' : 'clock', p.time === t.id)).join('') + '</div>' +
        '<div class="field"><div class="field__label">Time for each session</div><div class="seg">' + [30, 45, 60].map((m) => seg('obMins', String(m), m + ' min', p.mins === m)).join('') + '</div></div>' },
    { id: 'equipment', when: (p) => p.experience === 'regular', coach: 'Machines are quickest to set up. Add dumbbells if you’re comfortable with them.',
      q: 'What would you like to use?', valid: () => true,
      body: (p) => '<div class="options">' + option('equip', 'machines', 'Machines only', 'Guided, simple, quick to learn', 'sliders', p.equipment === 'machines') + option('equip', 'mixed', 'Machines and some dumbbells', 'A bit more variety', 'dumbbell', p.equipment === 'mixed') + '</div>' },
    { id: 'cook', coach: 'We’ll make lighter weekday versions of food you already love. No sad diet food.',
      q: 'Let’s talk food. Who does the cooking?', valid: (p) => !!p.cook,
      body: (p) => '<div class="chips">' + D.COOKS.map((c) => '<button class="chip' + (p.cook === c.id ? ' is-on' : '') + '" data-act="obCook" data-v="' + c.id + '">' + esc(c.label) + '</button>').join('') + '</div>' +
        '<div class="field"><div class="field__label">What do you love to cook or eat?</div>' +
        '<div class="eyebrow" style="margin-top:4px">Persian</div><div class="chips">' + D.DISHES.filter((d) => d.cuisine === 'Persian').map(dishChip(p)).join('') + '</div>' +
        '<div class="eyebrow" style="margin-top:8px">Everyday</div><div class="chips">' + D.DISHES.filter((d) => d.cuisine !== 'Persian').map(dishChip(p)).join('') + '</div></div>' },
    { id: 'derail', coach: 'Being honest here means better game plans. These are the moments we’ll plan for.',
      q: 'What usually knocks your eating off track?', hint: 'Pick any that apply.', valid: () => true,
      body: (p) => '<div class="chips">' + D.DERAILERS.map((d) => '<button class="chip' + (p.derailers.includes(d.id) ? ' is-on' : '') + '" data-act="obDerail" data-v="' + d.id + '">' + esc(d.label) + '</button>').join('') + '</div>' },
    { id: 'start', coach: 'That’s everything I need. You can change any of it later.',
      q: 'When do you want to start?', valid: (p) => !!p.start,
      body: (p) => {
        const nextMon = App.addDays(App.weekStart(App.today()), 7);
        return '<div class="options">' + option('start', 'now', 'This week', 'Your first session is the next ' + daysWords(p) + ' that comes up', 'bolt', p.start === 'now') +
          option('start', 'next', 'Next week', 'Starting ' + App.fmtDate(nextMon, 'long'), 'calendar', p.start === 'next') + '</div>';
      } },
  ];

  function option(kind, v, title, sub, ic, on) {
    return '<button class="option' + (on ? ' is-on' : '') + '" data-act="obOpt" data-k="' + kind + '" data-v="' + esc(v) + '" aria-pressed="' + !!on + '">' +
      (ic ? '<span class="option__icon">' + icon(ic) + '</span>' : '') +
      '<span class="option__main"><span class="option__title">' + esc(title) + '</span>' + (sub ? '<span class="option__sub" style="display:block">' + esc(sub) + '</span>' : '') + '</span>' +
      '<span class="option__tick">' + icon('check', 'ic-sm') + '</span></button>';
  }
  function seg(act, v, label, on, rec) {
    return '<button class="seg__btn' + (on ? ' is-on' : '') + '" data-act="' + act + '" data-v="' + v + '" aria-pressed="' + !!on + '">' + label + (rec ? ' <span class="badge-rec">Best start</span>' : '') + '</button>';
  }
  const dishChip = (p) => (d) => '<button class="chip' + (p.dishes.includes(d.id) ? ' is-on' : '') + '" data-act="obDish" data-v="' + d.id + '">' + esc(d.name) + '</button>';
  function daysWords(p) { return p.days.length ? p.days.map((d) => App.DOW_LONG[d]).join(' or ') : 'training day'; }
  function spacingNote(p) {
    if (p.days.length < 2) return '';
    const sorted = p.days.slice().sort((a, b) => a - b);
    const back2back = sorted.some((d, i) => i > 0 && d - sorted[i - 1] === 1) || (sorted[0] === 0 && sorted[sorted.length - 1] === 6);
    return back2back
      ? '<div class="banner">' + icon('info') + '<div>Two days in a row works, but a rest day between sessions helps you recover. Consider spreading them out.</div></div>'
      : '<div class="banner banner--green">' + icon('check') + '<div>Nice spacing. Rest days in between help you recover and come back stronger.</div></div>';
  }

  function visibleSteps(p) { return STEPS.filter((s) => !s.when || s.when(p)); }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    App.Coach.setContext({ key: 'onboarding', label: 'Setting up' });
    if (ob.phase === 'welcome') return welcome();
    if (ob.phase === 'build') return build();
    if (ob.phase === 'reveal') return App.Views.reveal();
    const p = ob.p;
    const steps = visibleSteps(p);
    ob.step = App.clamp(ob.step, 0, steps.length - 1);
    const st = steps[ob.step];
    const pct = Math.round(((ob.step + 1) / (steps.length + 1)) * 100);
    const ok = !!st.valid(p);
    const optional = ['worries', 'derail', 'equipment'].includes(st.id);
    const isLast = ob.step === steps.length - 1;
    const label = isLast ? 'Build my plan' : (optional && !(st.id === 'worries' ? p.worries.length : st.id === 'derail' ? p.derailers.length : 1) ? 'Skip' : 'Continue');
    return '<div class="ob">' +
      '<div class="ob__top">' +
        '<button class="icon-btn icon-btn--flat" data-act="obBack" aria-label="Back">' + icon('back') + '</button>' +
        '<div class="ob__progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>' +
        '<div class="ob__step">' + (ob.step + 1) + '/' + steps.length + '</div>' +
      '</div>' +
      '<div class="ob__body' + (ob.dir < 0 ? ' is-back' : '') + '">' +
        '<div class="coachline"><div class="coachline__face">' + App.plate('', '#ffffff', { ring: 'rgba(36,72,245,.35)', hub: 'rgba(36,72,245,.18)', hole: '#2448f5' }).replace('<svg class=""', '<svg style="width:26px;height:26px"') + '</div><div class="coachline__bubble">' + st.coach + '</div></div>' +
        '<h1 class="ob__q display">' + esc(st.q) + '</h1>' +
        (st.hint ? '<p class="ob__hint">' + esc(st.hint) + '</p>' : '') +
        st.body(p) +
      '</div>' +
      '<div class="ob__foot"><div class="ob__foot-inner">' +
        '<button class="btn btn--block" data-act="obNext" ' + (ok ? '' : 'disabled') + '>' + label + (isLast ? icon('sparkle') : icon('arrow')) + '</button>' +
      '</div></div>' +
    '</div>';
  }

  function welcome() {
    return '<div class="welcome">' +
      '<div class="welcome__art" aria-hidden="true">' + welcomeArt() + '</div>' +
      '<div class="welcome__main">' +
        '<div class="welcome__logo">' + App.plate('', 'var(--blue)', { hole: 'var(--bg)' }).replace('<svg class=""', '<svg style="width:40px;height:40px"') + 'Spotter</div>' +
        '<h1 class="welcome__title display">A personal trainer for <em>your</em> gym.</h1>' +
        '<p class="welcome__sub">Built for beginners. Knows the machines, plans your week, and keeps you going.</p>' +
        '<div class="welcome__points">' +
          '<div class="welcome__point"><i class="tone-blue">' + icon('map', 'ic-sm') + '</i>A step-by-step plan for every session</div>' +
          '<div class="welcome__point"><i class="tone-green">' + icon('leaf', 'ic-sm') + '</i>Simple food that fits your life</div>' +
          '<div class="welcome__point"><i class="tone-yellow">' + icon('trophy', 'ic-sm') + '</i>Rewards for every step you take</div>' +
        '</div>' +
      '</div>' +
      '<div class="welcome__actions">' +
        '<button class="btn btn--block" data-act="obStart">Let’s build my plan' + icon('arrow') + '</button>' +
        '<button class="btn btn--plain" data-act="obDemo">Preview with example answers</button>' +
      '</div>' +
    '</div>';
  }
  function welcomeArt() {
    // A band of bumper plates, slowly turning.
    const plates = [
      { c: 'var(--blue)', r: 150, x: 300, y: 120, s: 46 },
      { c: 'var(--red)', r: 78, x: 98, y: 92, s: 70 },
      { c: 'var(--yellow)', r: 52, x: 180, y: 248, s: 36 },
      { c: 'var(--green)', r: 40, x: 34, y: 224, s: 54 },
    ];
    return '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">' + plates.map((p, i) =>
      '<g style="transform-origin:' + p.x + 'px ' + p.y + 'px;animation:plateSpin ' + p.s + 's linear infinite' + (i % 2 ? ' reverse' : '') + '">' +
      '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + p.r + '" fill="' + p.c + '"/>' +
      '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + p.r * 0.77 + '" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="' + Math.max(1.5, p.r * 0.025) + '"/>' +
      '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + p.r * 0.34 + '" fill="rgba(255,255,255,.2)"/>' +
      '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + p.r * 0.13 + '" fill="var(--bg)"/>' +
      '<rect x="' + (p.x - 3) + '" y="' + (p.y - p.r * 0.95) + '" width="6" height="' + p.r * 0.14 + '" rx="3" fill="rgba(255,255,255,.5)"/></g>').join('') + '</svg>';
  }

  // ── Plan build animation ──────────────────────────────────────────────────
  function build() {
    const p = ob.p; const gym = App.E.gymOf(p.gymId);
    const lines = [
      'Reading your answers',
      'Matching machines at ' + (gym.generic ? 'your gym' : gym.branch),
      'Building Session A and Session B',
      'Setting up food game plans',
      p.event && p.event.date && p.goals.includes('event') ? 'Counting down to ' + (p.event.name || 'your big day') : 'Lining up your rewards',
    ];
    return '<div class="build"><div class="build__inner">' +
      '<div class="build__plate">' + App.plate('', 'var(--blue)', { hole: 'var(--bg)' }).replace('<svg class=""', '<svg style="width:100%;height:100%"') + '</div>' +
      '<h1 class="display" style="font-size:30px">Building your plan</h1>' +
      '<div class="build__steps">' + lines.map((l, i) => '<div class="build__step" data-bstep="' + i + '"><i>' + icon('check', 'ic-sm') + '</i>' + esc(l) + '</div>').join('') + '</div>' +
    '</div></div>';
  }
  function runBuild() {
    const steps = App.$$('[data-bstep]');
    steps.forEach((el, i) => setTimeout(() => { el.classList.add('is-done'); App.sound('tap'); App.haptic(8); }, 450 + i * 520));
    setTimeout(() => { ob.phase = 'reveal'; App.render(); App.confetti('stars'); App.sound('success'); }, 450 + steps.length * 520 + 500);
  }

  // ── Profile from answers ──────────────────────────────────────────────────
  function toProfile(p) {
    return {
      name: p.name.trim(), goals: p.goals.slice(),
      event: p.goals.includes('event') && p.event.date ? { name: p.event.name.trim(), date: p.event.date } : null,
      feel: p.feel.slice(), why: p.why.trim(), experience: p.experience, worries: p.worries.slice(),
      health: { screening: p.screening.slice(), flag: p.screening.some((v) => v === true), cleared: false, asthma: !!p.asthma, reliever: p.reliever, actionPlan: p.actionPlan },
      gymId: p.gymId, days: p.days.slice().sort((a, b) => a - b), time: p.time, mins: p.mins, equipment: p.equipment,
      cook: p.cook, dishes: p.dishes.slice(), derailers: p.derailers.slice(), start: p.start, created: App.today(),
    };
  }
  function fromProfile(pr) {
    return Object.assign(blank(), {
      name: pr.name, goals: pr.goals || [], event: pr.event ? Object.assign({}, pr.event) : { name: '', date: '' },
      feel: pr.feel || [], why: pr.why || '', experience: pr.experience, worries: pr.worries || [],
      screening: (pr.health && pr.health.screening) || [false, false, false, false, false, false],
      asthma: pr.health ? pr.health.asthma : null, reliever: pr.health ? pr.health.reliever : null, actionPlan: pr.health ? pr.health.actionPlan : null,
      gymId: pr.gymId, perWeek: (pr.days || []).length || 2, days: pr.days || [], time: pr.time, mins: pr.mins || 45, equipment: pr.equipment || 'machines',
      cook: pr.cook, dishes: pr.dishes || [], derailers: pr.derailers || [], start: 'now',
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggle = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); };
  function rerender(keepScroll) { const y = window.scrollY; App.render(); if (keepScroll) window.scrollTo(0, y); }
  function refreshFoot() {
    const steps = visibleSteps(ob.p); const st = steps[ob.step];
    const btn = App.$('[data-act="obNext"]'); if (btn) btn.disabled = !st.valid(ob.p);
  }
  Object.assign(App.ACT, {
    obStart() { ob.p = ob.p || blank(); ob.phase = 'steps'; ob.step = 0; ob.dir = 1; App.render(); App.sound('tap'); },
    obDemo() { ob.p = demo(); App.toast('Example answers filled in', 'sparkle'); App.ACT.obFinish(); },
    obBack() {
      if (ob.step === 0) {
        if (App.S.profile) { ob.editing = false; ob.active = false; ob.phase = 'welcome'; App.render(); return; }
        ob.phase = 'welcome'; App.render(); return;
      }
      ob.step--; ob.dir = -1; App.render(); window.scrollTo(0, 0);
    },
    obNext() {
      const steps = visibleSteps(ob.p); const st = steps[ob.step];
      if (!st.valid(ob.p)) return;
      App.sound('tap'); App.haptic(8);
      if (ob.step >= steps.length - 1) return App.ACT.obFinish();
      ob.step++; ob.dir = 1; App.render(); window.scrollTo(0, 0);
      const first = App.$('.ob__body input'); if (first && first.id === 'obEvName' && !first.value) setTimeout(() => first.focus(), 350);
    },
    obFinish() {
      const prev = App.S.profile;
      App.S.profile = toProfile(ob.p);
      if (prev && prev.health && prev.health.cleared && !App.S.profile.health.flag) App.S.profile.health.cleared = true;
      App.S.plan = App.E.buildPlan(App.S.profile);
      App.S.rewards = App.S.rewards || Object.assign({}, D.DEFAULT_REWARDS);
      App.saveNow();
      ob.phase = 'build'; App.render(); window.scrollTo(0, 0);
      runBuild();
    },
    obOpt(el) {
      const k = el.dataset.k, v = el.dataset.v, p = ob.p;
      if (k === 'goal') toggle(p.goals, v);
      else if (k === 'exp') p.experience = v;
      else if (k === 'worry') toggle(p.worries, v);
      else if (k === 'time') p.time = v;
      else if (k === 'equip') p.equipment = v;
      else if (k === 'start') p.start = v;
      App.haptic(6);
      rerender(true);
    },
    obFeel(el) { const p = ob.p; const v = el.dataset.v; if (!p.feel.includes(v) && p.feel.length >= 3) { App.toast('Up to three. Untick one first.'); return; } toggle(p.feel, v); rerender(true); },
    obScreen(el) { ob.p.screening[Number(el.dataset.i)] = el.dataset.v === 'yes'; rerender(true); },
    obAsthma(el) { ob.p.asthma = el.dataset.v === 'yes'; if (!ob.p.asthma) { ob.p.reliever = null; ob.p.actionPlan = null; } rerender(true); },
    obReliever(el) { ob.p.reliever = el.dataset.v === 'yes'; rerender(true); },
    obAction(el) { ob.p.actionPlan = el.dataset.v; rerender(true); },
    obGym(el) { ob.p.gymId = el.dataset.v; App.haptic(6); rerender(true); },
    obPerWeek(el) { ob.p.perWeek = Number(el.dataset.v); ob.p.days = ob.p.days.slice(0, ob.p.perWeek); rerender(true); },
    obDay(el) {
      const p = ob.p; const v = Number(el.dataset.v);
      if (p.days.includes(v)) p.days = p.days.filter((d) => d !== v);
      else { p.days.push(v); if (p.days.length > p.perWeek) p.days.shift(); }
      App.haptic(6); rerender(true);
    },
    obMins(el) { ob.p.mins = Number(el.dataset.v); rerender(true); },
    obCook(el) { ob.p.cook = el.dataset.v; rerender(true); },
    obDish(el) { toggle(ob.p.dishes, el.dataset.v); rerender(true); },
    obDerail(el) { toggle(ob.p.derailers, el.dataset.v); rerender(true); },
  });
  Object.assign(App.IN, {
    obName(el) { ob.p.name = el.value; refreshFoot(); },
    obEvName(el) { ob.p.event.name = el.value; refreshFoot(); },
    obEvDate(el) { ob.p.event.date = el.value; refreshFoot(); const y = window.scrollY; App.render(); window.scrollTo(0, y); },
    obWhy(el) { ob.p.why = el.value; refreshFoot(); },
  });

  App.OB = { render, blank, demo, fromProfile, toProfile, visibleSteps };
})();
