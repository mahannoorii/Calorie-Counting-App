/* Spotter — onboarding: one question per screen with the reason underneath. Experience comes
   early because everything after it adapts: the goals on offer, what feels hardest, how many
   days you can pick, the equipment you'd like to use. Then your gym (search, nearby or added
   by hand) and what it has, and the plan is built and revealed with how your answers shaped it. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const DB = D.GYMDB;
  const { esc, icon, art } = App;
  const E = () => App.E;

  const ob = (App.ob = { step: 0, dir: 1, p: null, phase: 'welcome', active: false, editing: false });

  function blank() {
    return {
      name: '', experience: '', goals: [], event: { name: '', date: '' }, feel: [], why: '',
      worries: [], focus: [], screening: [null, null, null, null, null, null],
      asthma: null, reliever: null, actionPlan: null,
      gym: null, gymId: '', gymQ: '', here: null, adding: false, newGym: { name: '', chain: '' },
      equipment: '', perWeek: 2, days: [], time: '', mins: 45,
      cuisines: [], derailers: [], start: 'now',
    };
  }
  function dirGym(id) { const e = DB.GYMS.find((g) => g.id === id || g.legacy === id); return e ? E().gymFromDirectory(e) : null; }
  // Example answers: someone brand new (mirrors the first tester), or an experienced lifter.
  function demo(kind) {
    const t = App.today();
    if (kind === 'lifter') {
      return Object.assign(blank(), {
        name: 'Sam', experience: 'lifter', goals: ['muscle', 'strong'], feel: ['Strong', 'Confident'], why: 'Get properly strong without living at the gym.',
        worries: ['time', 'efficient', 'plateau'], focus: ['back', 'shoulders'], screening: [false, false, false, false, false, false], asthma: false,
        gym: dirGym('af-rhn'), gymId: 'anytime-fitness-rouse-hill-north', equipment: 'free', perWeek: 4, days: [0, 1, 3, 4], time: 'morning', mins: 60,
        cuisines: ['middleeast', 'japanese', 'aussie', 'italian'], derailers: ['eatingout', 'weekends'], start: 'now',
      });
    }
    const ev = t < '2026-12-17' ? '2026-12-17' : App.addDays(t, 63);
    return Object.assign(blank(), {
      name: 'Ava', experience: 'never', goals: ['event', 'confidence', 'energy'], event: { name: 'Holiday in Turkey', date: ev },
      feel: ['Confident', 'Energetic', 'Strong'], why: 'Walk on that beach feeling great, and keep going after.',
      worries: ['what', 'machines', 'food'], screening: [false, false, false, false, false, false],
      asthma: true, reliever: true, actionPlan: 'yes', gym: dirGym('af-rhn'), gymId: 'anytime-fitness-rouse-hill-north', equipment: 'machines',
      perWeek: 2, days: [0, 3], time: 'evening', mins: 45,
      cuisines: ['middleeast', 'italian', 'aussie', 'thai', 'chinese'],
      derailers: ['gatherings', 'eatingout', 'takeaway', 'sweets'], start: 'now',
    });
  }

  const lvl = (p) => E().levelOf(p);
  const GOAL_TILE = { event: 'bg-blue', strong: 'bg-accent', energy: 'bg-gold', fat: 'bg-red', confidence: 'bg-purple', health: 'bg-green', muscle: 'bg-teal' };
  const TIME_TILE = { morning: ['sun', 'bg-gold'], lunch: ['clock', 'bg-teal'], afternoon: ['clock', 'bg-blue'], evening: ['moon', 'bg-purple'] };
  const CHAIN_TILE = { anytime: 'bg-purple', snap: 'bg-red', plus: 'bg-ink', fitnessfirst: 'bg-red', virgin: 'bg-red', crunch: 'bg-blue', worldgym: 'bg-ink', revo: 'bg-accent', genesis: 'bg-teal', pcyc: 'bg-blue', f45: 'bg-accent', orangetheory: 'bg-accent', jetts: 'bg-gold', goodlife: 'bg-green', evo: 'bg-teal', independent: 'bg-teal', home: 'bg-green' };
  const CHAIN_INITIALS = { anytime: 'AF', snap: 'SF', plus: 'PF', fitnessfirst: 'FF', virgin: 'VA', crunch: 'CF', worldgym: 'WG', revo: 'RF', genesis: 'GH', pcyc: 'PC', f45: 'F45', orangetheory: 'OT', jetts: 'JF', goodlife: 'GL', evo: 'EF' };
  // What each answer changes, shown under the option so the plan never feels random.
  const WORRY_EFFECT = {
    what: 'Every session planned, one step at a time', machines: 'Set-up steps for every machine', watched: 'Machines and quieter spots first',
    busy: 'A swap ready for every exercise', motivation: 'Weekly targets, streaks and rewards', consistency: 'Weekly targets, streaks and rewards',
    food: 'Dinners and restaurant orders picked for you', program: 'A structured program that tells you what to beat',
    plateau: 'A lighter week every fourth week, then push past it', bored: 'Fresh exercises every four weeks', form: 'Form cues on every move',
    efficient: 'Supersets built around the big lifts', recovery: 'Planned lighter weeks',
  };
  function timeEffect(p) { return lvl(p) >= 2 ? 'Supersets and shorter rests' : 'Short sessions, and 20-minute versions when you need them'; }
  const DEFAULT_DAYS = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] };
  const STYLE_DEFAULT = { never: 'machines', little: 'machines', regular: 'mixed', lifter: 'free' };

  // ── Steps ─────────────────────────────────────────────────────────────────
  const STEPS = [
    { id: 'name', q: () => 'What should I call you?', why: () => 'I’m Spotter, your trainer. A few quick questions and I’ll build a plan around your week and your gym. About three minutes.',
      valid: (p) => p.name.trim().length > 0,
      body: (p) => '<label class="vh" for="obName">Your first name</label><input id="obName" class="input input--big" data-in="obName" data-enter="obNext" value="' + esc(p.name) + '" placeholder="First name" autocomplete="given-name" enterkeyhint="next">' },
    { id: 'experience', q: (p) => 'Have you trained in a gym before, ' + esc(firstName(p)) + '?', why: () => 'No wrong answers. It decides how much I explain, how hard we start and how many days you can pick.',
      valid: (p) => !!p.experience,
      body: (p) => list(D.EXPERIENCE.map((e) => opt('exp', e.id, e.label, e.sub, null, p.experience === e.id))) },
    { id: 'goals', q: (p) => lvl(p) >= 2 ? 'What are you training for?' : 'What are you working towards?',
      why: (p) => lvl(p) >= 2 ? 'This sets the program: how heavy, how many reps and how many days. Pick as many as you like.' : 'Pick as many as you like. It shapes your plan and how I keep you going.',
      valid: (p) => p.goals.length > 0,
      body: (p) => list(goalsFor(p).map((g) => opt('goal', g.id, g.label, '', [g.icon, GOAL_TILE[g.id]], p.goals.includes(g.id))), true) },
    { id: 'event', when: (p) => p.goals.includes('event'), q: () => 'What’s the big day?', why: () => 'A date gives us a finish line. I’ll count down with you and plan backwards from it.',
      valid: (p) => p.event.name.trim() && p.event.date && p.event.date > App.today(),
      body: (p) =>
        '<div class="field"><label class="field__label" for="obEvName">What is it?</label><input id="obEvName" class="input" data-in="obEvName" value="' + esc(p.event.name) + '" placeholder="e.g. Holiday in Bali"></div>' +
        '<div class="field"><label class="field__label" for="obEvDate">When?</label><input id="obEvDate" type="date" class="input" data-in="obEvDate" min="' + App.addDays(App.today(), 1) + '" value="' + esc(p.event.date) + '"></div>' +
        (p.event.date && p.event.date > App.today() ? '<div class="callout callout--blue">' + icon('calendar') + '<div><b>' + App.diffDays(App.today(), p.event.date) + ' days</b> from today. Plenty of time to make a real difference.</div></div>' : '') },
    { id: 'feel', q: (p) => p.goals.includes('event') ? 'How do you want to feel when you get there?' : 'How do you want to feel?', why: () => 'This is your why. I’ll bring it back when motivation dips. Choose up to three.',
      valid: (p) => p.feel.length > 0 || p.why.trim(),
      body: (p) => '<div class="chips">' + D.FEELS.map((f) => chip('obFeel', f, f, p.feel.includes(f))).join('') + '</div>' +
        '<div class="field"><label class="field__label" for="obWhy">In your own words (optional)</label><textarea id="obWhy" class="input" data-in="obWhy" placeholder="e.g. Feel confident on the beach, and keep it going after">' + esc(p.why) + '</textarea></div>' },
    { id: 'worries', q: (p) => ['What feels hardest about the gym right now?', 'What gets in the way of your training?', 'What would make the biggest difference?'][lvl(p) - 1],
      why: (p) => lvl(p) >= 2 ? 'Pick any that apply. Each one changes how I build your program.' : 'Pick any that apply, or skip. Each one changes how I help.', optional: (p) => !p.worries.length,
      valid: () => true,
      body: (p) => list(D.WORRIES[lvl(p)].map((w) => opt('worry', w.id, w.label, w.id === 'time' ? timeEffect(p) : WORRY_EFFECT[w.id], null, p.worries.includes(w.id)))) },
    { id: 'focus', when: (p) => lvl(p) >= 2, q: () => 'Anything you want to bring up?', why: () => 'Optional. Each one gets extra sets in the sessions that train it.', optional: (p) => !p.focus.length,
      valid: () => true,
      body: (p) => '<div class="chips">' + D.FOCUS.map((f) => chip('obFocus', f.id, f.label, p.focus.includes(f.id))).join('') + '</div>' +
        (p.focus.length > 3 ? '<div class="callout">' + icon('info') + '<div>Bringing everything up at once means nothing gets much extra. Two or three works best.</div></div>' : '') },
    { id: 'health', q: () => 'A quick health check', why: () => 'The standard pre-exercise questions Australian gyms use. They keep you safe.',
      valid: (p) => p.screening.every((v) => v !== null),
      body: (p) => '<div class="group">' + D.SCREENING.map((q, i) =>
        '<div class="yn"><span>' + esc(q) + '</span><div class="seg" role="group" aria-label="Question ' + (i + 1) + '">' +
          seg('obScreen', i + '|no', 'No', p.screening[i] === false) + seg('obScreen', i + '|yes', 'Yes', p.screening[i] === true) + '</div></div>').join('') + '</div>' +
        (p.screening.some((v) => v === true) ? '<div class="callout">' + icon('shield') + '<div>Thanks for telling me. Before your first session, check in with your GP or an allied health professional. It’s the standard step for anyone who answers yes. You can still build your plan now.</div></div>' : '') },
    { id: 'asthma', q: () => 'Do you have asthma?', why: () => 'Asthma and the gym go together fine. It just changes how we warm up.',
      valid: (p) => p.asthma === false || (p.asthma === true && p.reliever !== null && p.actionPlan !== null),
      body: (p) => '<div class="seg seg--lg">' + seg('obAsthma', 'no', 'No', p.asthma === false) + seg('obAsthma', 'yes', 'Yes', p.asthma === true) + '</div>' +
        (p.asthma ? '<div class="field"><div class="field__label">Do you carry a reliever puffer?</div><div class="seg seg--lg">' + seg('obReliever', 'yes', 'Yes', p.reliever === true) + seg('obReliever', 'no', 'No', p.reliever === false) + '</div></div>' +
          '<div class="field"><div class="field__label">Do you have an asthma action plan?</div><div class="seg seg--lg">' + seg('obAction', 'yes', 'Yes', p.actionPlan === 'yes') + seg('obAction', 'no', 'No', p.actionPlan === 'no') + seg('obAction', 'unsure', 'Not sure', p.actionPlan === 'unsure') + '</div></div>' +
          '<div class="callout callout--blue">' + icon('puffer') + '<div>I’ll give you a longer, gentler warm-up, check your puffer’s in your bag before each session, and tell you exactly what to do if your chest tightens.' + (p.reliever === false || p.actionPlan === 'no' || p.actionPlan === 'unsure' ? ' It’s worth asking your GP for a reliever and an action plan before you start.' : '') + '</div></div>' : '') },
    { id: 'gym', q: () => 'Where do you train?', why: () => 'Pick the gym you go to most. Every session is built around the equipment it has.',
      valid: (p) => !!p.gym,
      body: (p) => gymStep(p) },
    { id: 'kit', when: (p) => !!p.gym, q: (p) => p.gym.chain === 'home' ? 'What have you got at home?' : 'What’s at ' + esc(p.gym.short || p.gym.name) + '?',
      why: (p) => kitWhy(p),
      valid: (p) => !!p.gym && p.gym.kit.length > 0,
      body: (p) => kitStep(p) },
    { id: 'style', when: (p) => p.experience !== 'never', q: (p) => lvl(p) >= 2 ? 'How do you like to train?' : 'What would you like to use?',
      why: (p) => lvl(p) >= 2 ? 'Your main lifts and the order of everything else follow this. Swaps are always one tap away.' : 'Machines are the quickest to learn. Add dumbbells if you’re comfortable with them.',
      valid: (p) => !!p.equipment,
      body: (p) => {
        if (lvl(p) <= 1) return list([opt('equip', 'machines', 'Machines only', 'Guided, simple, quick to set up', ['sliders', 'bg-accent'], p.equipment === 'machines'), opt('equip', 'mixed', 'Machines and some dumbbells', 'A bit more variety', ['dumbbell', 'bg-blue'], p.equipment === 'mixed')], true);
        return list([opt('equip', 'machines', 'Mostly machines', 'Steady, quick to set up, easy to push hard safely', ['sliders', 'bg-accent'], p.equipment === 'machines'),
          opt('equip', 'mixed', 'A mix of both', 'Free-weight basics first, machines for the extra work', ['dumbbell', 'bg-blue'], p.equipment === 'mixed'),
          opt('equip', 'free', 'Mostly free weights', 'Barbell and dumbbell lifts lead every session', ['bolt', 'bg-ink'], p.equipment === 'free')], true);
      } },
    { id: 'schedule', q: () => 'How many days a week?', why: (p) => scheduleWhy(p),
      valid: (p) => p.days.length === p.perWeek,
      body: (p) => '<div class="field"><div class="seg seg--lg">' + E().dayOptions(p).map((n) => seg('obPerWeek', String(n), String(n), p.perWeek === n)).join('') + '</div></div>' +
        '<div class="field"><div class="field__label">Pick ' + p.perWeek + ' days</div><div class="weekdays">' + App.DOW.map((d, i) => '<button class="wd' + (p.days.includes(i) ? ' is-on' : '') + '" data-act="obDay" data-v="' + i + '" aria-pressed="' + p.days.includes(i) + '" aria-label="' + App.DOW_LONG[i] + '">' + d.charAt(0) + '</button>').join('') + '</div></div>' +
        (p.days.length ? '<p class="daysline">' + esc(daysWords(p)) + '</p>' : '') + splitNote(p) + spacingNote(p) },
    { id: 'time', q: () => 'When do you usually go?', why: () => 'I’ll fit each session to the time you’ve got.',
      valid: (p) => !!p.time,
      body: (p) => list(D.TIMES.map((t) => opt('time', t.id, t.label, 'Around ' + t.at, TIME_TILE[t.id], p.time === t.id)), true) +
        '<div class="field"><div class="field__label">Time for each session</div><div class="seg seg--lg">' + E().minOptions(p).map((m) => seg('obMins', String(m), String(m), p.mins === m)).join('') + '</div><p class="fn" style="margin-top:6px">Minutes, including a short warm-up.</p></div>' +
        (p.worries.includes('time') || p.worries.includes('efficient') ? '<div class="callout callout--blue">' + icon('bolt') + '<div>' + (lvl(p) >= 2 ? 'You said time matters, so I’ll pair exercises into supersets. ' + p.mins + ' minutes will go a long way.' : 'You said time is tight. Shorter sessions just use fewer machines, and I can cut any day to 20 minutes.') + '</div></div>' : '') },
    { id: 'cuisines', q: () => 'What do you usually eat?', why: () => 'Pick all that apply. I’ll plan easy dinners from these and pick your order when you eat out.',
      valid: (p) => p.cuisines.length > 0,
      body: (p) => '<div class="chips">' + D.CUISINES.map((c) => chip('obCuisine', c.id, c.name, p.cuisines.includes(c.id))).join('') + '</div>' },
    { id: 'derail', q: () => 'What usually knocks your eating off track?', why: () => 'Optional. These are the moments I’ll help you plan for.', optional: (p) => !p.derailers.length,
      valid: () => true,
      body: (p) => '<div class="chips">' + D.DERAILERS.map((d) => chip('obDerail', d.id, d.label, p.derailers.includes(d.id))).join('') + '</div>' },
    { id: 'start', q: () => 'When do you want to start?', why: () => 'That’s everything I need. You can change any of it later.',
      valid: (p) => !!p.start,
      body: (p) => {
        const nextMon = App.addDays(App.weekStart(App.today()), 7);
        return list([opt('start', 'now', 'This week', 'Your first session is the next ' + daysWords(p, ' or ') + ' that comes up', ['bolt', 'bg-accent'], p.start === 'now'),
          opt('start', 'next', 'Next week', 'Starting ' + App.fmtDate(nextMon, 'long'), ['calendar', 'bg-blue'], p.start === 'next')], true);
      } },
  ];

  function firstName(p) { return (p.name || '').trim().split(' ')[0]; }
  function goalsFor(p) { return D.GOALS.filter((g) => !g.upTo || lvl(p) <= g.upTo); }
  function scheduleWhy(p) {
    if (p.experience === 'lifter') return 'Up to six. Four days of upper and lower is the best balance of results and recovery for most lifters.';
    if (p.experience === 'regular') return 'With your experience, three to five days works. More days means each session can focus on fewer muscles.';
    if (p.experience === 'little') return 'Two or three is plenty to build the habit. You can go up to four.';
    return 'Two days a week meets Australia’s guideline for strength training. Start there and add a day later if you like.';
  }
  function splitNote(p) {
    const id = E().splitFor(p.perWeek, lvl(p));
    const words = { fb2: p.perWeek === 3 ? ['Full body, A and B alternating', 'every muscle, every session'] : ['Two full-body sessions', 'every muscle twice a week'], fb3: ['Full body: A, B and C', 'every muscle three times a week'], ul: ['Upper and lower body', 'each muscle twice a week'], ulppl: ['Upper, lower, push, pull and legs', 'everything twice a week'], ppl: ['Push, pull and legs, twice', 'the most volume'] }[id];
    return '<div class="callout callout--blue">' + icon('dumbbell') + '<div><b>' + words[0] + '.</b> ' + App.cap(words[1]) + '.</div></div>';
  }

  // ── Your gym: search, nearby, a map, or add it ────────────────────────────
  function gymStep(p) {
    return '<div class="gymfind">' +
      '<div class="eatout"><div class="eatout__wrap">' + icon('search') + '<label class="vh" for="obGymQ">Gym name or suburb</label><input id="obGymQ" class="input" placeholder="Gym name or suburb" autocomplete="off" autocapitalize="words" enterkeyhint="search" data-in="obGymQ" value="' + esc(p.gymQ) + '"></div></div>' +
      '<button class="btn btn--tinted btn--sm gymfind__locate" data-act="obLocate">' + icon('pin', 'ic-sm') + (p.here ? 'Near you' : 'Use my location') + '</button>' +
      '<div data-gymres>' + gymResults(p) + '</div></div>';
  }
  function refPoint(p) {
    if (p.here) return { pt: p.here, label: 'You', you: true };
    const sp = E().suburbPoint(p.gymQ); if (sp) return { pt: sp.pt, label: sp.name };
    if (p.gym && p.gym.lat) return { pt: [p.gym.lat, p.gym.lng], label: p.gym.suburb };
    return null;
  }
  function distWord(km) { return km < 1 ? Math.max(50, Math.round(km * 20) * 50) + ' m' : (km < 10 ? km.toFixed(1) : Math.round(km)) + ' km'; }
  function gymTile(chain) {
    const ini = CHAIN_INITIALS[chain];
    return '<span class="cell__tile ' + (CHAIN_TILE[chain] || 'bg-teal') + '">' + (ini ? '<b class="tile-ini' + (ini.length > 2 ? ' tile-ini--sm' : '') + '">' + ini + '</b>' : icon(chain === 'home' ? 'home' : 'pin')) + '</span>';
  }
  function gymCell(g, on, km, n) {
    const ch = DB.CHAINS[g.chain];
    const sub = [g.suburb, km != null ? distWord(km) : '', g.listed ? 'equipment checked online' : '', g.classOnly ? 'classes only' : ''].filter(Boolean).join(' · ');
    return '<button class="cell' + (on ? ' is-on' : '') + '" data-act="obGymPick" data-v="' + esc(g.id) + '" aria-pressed="' + !!on + '">' + gymTile(g.chain) +
      '<span class="cell__main"><span class="cell__title">' + (n ? '<span class="pinno">' + n + '</span>' : '') + esc(g.name) + '</span><span class="cell__sub">' + esc(sub || (ch ? ch.name : '')) + '</span></span>' + icon('check', 'cell__check') + '</button>';
  }
  function gymResults(p) {
    const ref = refPoint(p); const q = (p.gymQ || '').trim();
    let list = []; let head = '';
    const sp = E().suburbPoint(q);
    if (q && !sp) {
      list = E().findGyms(q).map((g) => Object.assign({ km: ref ? E().km(ref.pt, [g.lat, g.lng]) : null }, g));
      if (ref) list.sort((a, b) => a.km - b.km);
      head = list.length ? 'Matches' : '';
    } else if (ref) {
      list = E().gymsNear(ref.pt, 8); head = ref.you ? 'Near you' : 'Near ' + ref.label;
    }
    let h = '';
    if (ref && list.length && (!q || sp)) h += gymMap(ref, list, p);
    if (head) h += '<div class="sec__label">' + esc(head) + '</div>';
    if (list.length) h += '<div class="group group--tiles">' + list.slice(0, 8).map((g, i) => gymCell(g, p.gym && p.gym.id === g.id, g.km, ref && (!q || sp) ? i + 1 : 0)).join('') + '</div>';
    else if (q) h += '<p class="search__empty" style="padding:6px 2px">No gym called that in my list yet. Add it below and I’ll set it up.</p>';
    else h += '<p class="fn">Type your gym or your suburb, like Rouse Hill or Newtown, or use your location.</p>';
    // the chosen gym stays visible even when it isn't in the list
    if (p.gym && !list.some((g) => g.id === p.gym.id)) h += '<div class="sec__label">Your gym</div><div class="group group--tiles">' + gymCell(p.gym, true, null, 0) + '</div>';
    h += addGymBox(p);
    if (p.gym && p.gym.classOnly) h += '<div class="callout">' + icon('info') + '<div>' + esc((DB.CHAINS[p.gym.chain] || {}).name || 'This studio') + ' runs set classes, so there’s no open floor for your own program. If you also train somewhere else, pick that gym.</div></div>';
    return h;
  }
  // A map without map tiles: gyms placed by real distance and direction around you or your suburb.
  function gymMap(ref, list, p) {
    const W = 340, H = 220, cx = W / 2, cy = H / 2 + 6;
    const pts = list.slice(0, 8).map((g) => { const dx = (g.lng - ref.pt[1]) * 111.32 * Math.cos(ref.pt[0] * Math.PI / 180); const dy = (g.lat - ref.pt[0]) * 110.57; return { g, dx, dy }; });
    // distances on a square-root scale: close gyms spread out, far ones still fit
    const far = Math.max(0.6, ...pts.map((x) => Math.hypot(x.dx, x.dy)));
    const R = H / 2 - 18; const rad = (d) => Math.sqrt(d / far) * R;
    const rings = [0.25, 0.5, 1, 2, 3, 5, 10, 20].filter((r) => r < far * 0.95).slice(-3);
    let s = '<svg class="gymmap" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Map of gyms ' + esc(ref.you ? 'near you' : 'near ' + ref.label) + '">';
    s += '<rect class="gymmap__bg" x="0" y="0" width="' + W + '" height="' + H + '" rx="14"/>';
    for (let x = 20; x < W; x += 40) s += '<line class="gymmap__grid" x1="' + x + '" y1="0" x2="' + x + '" y2="' + H + '"/>';
    for (let y = 25; y < H; y += 40) s += '<line class="gymmap__grid" x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '"/>';
    rings.forEach((r) => { const rr = rad(r); s += '<circle class="gymmap__ring" cx="' + cx + '" cy="' + cy + '" r="' + rr.toFixed(1) + '"/><text class="gymmap__km" x="' + (cx + rr * 0.71 + 3).toFixed(1) + '" y="' + (cy - rr * 0.71 - 3).toFixed(1) + '">' + (r < 1 ? r * 1000 + ' m' : r + ' km') + '</text>'; });
    s += ref.you ? '<circle class="gymmap__you-halo" cx="' + cx + '" cy="' + cy + '" r="14"/><circle class="gymmap__you" cx="' + cx + '" cy="' + cy + '" r="6"/>' : '<circle class="gymmap__centre" cx="' + cx + '" cy="' + cy + '" r="4"/>';
    s += '<text class="gymmap__label" x="12" y="20">' + esc(ref.you ? 'Around you' : 'Around ' + ref.label) + '</text>';
    const placed = [];
    pts.forEach((x, i) => {
      const d = Math.hypot(x.dx, x.dy); const k = d ? rad(d) / d : 0;
      let px = App.clamp(cx + x.dx * k * 1.25, 14, W - 14); let py = App.clamp(cy - x.dy * k, 24, H - 6);
      for (let t = 0; t < 6 && placed.some((q) => Math.hypot(q[0] - px, q[1] - py) < 17); t++) { px = App.clamp(px + (t % 2 ? -15 : 15), 14, W - 14); py = App.clamp(py - 6, 24, H - 6); }
      placed.push([px, py]);
      const on = p.gym && p.gym.id === x.g.id;
      s += '<g class="gymmap__pin' + (on ? ' is-on' : '') + '" data-act="obGymPick" data-v="' + esc(x.g.id) + '" role="button" aria-label="' + esc(x.g.name) + '"><path d="M' + px + ' ' + py + 'c-7-8-9-11-9-15a9 9 0 0 1 18 0c0 4-2 7-9 15z"/><text x="' + px + '" y="' + (py - 12.5) + '" text-anchor="middle">' + (i + 1) + '</text></g>';
    });
    return s + '</svg>';
  }
  function addGymBox(p) {
    const chains = ['anytime', 'snap', 'plus', 'fitnessfirst', 'jetts', 'worldgym', 'crunch', 'goodlife', 'virgin', 'revo', 'independent'];
    if (!p.adding) return '<div class="group group--tiles" style="margin-top:12px"><button class="cell" data-act="obAddGym"><span class="cell__tile bg-ink">' + icon('plus') + '</span><span class="cell__main"><span class="cell__title">My gym isn’t here</span><span class="cell__sub">Add it, and tell me what’s there</span></span>' + icon('right', 'cell__chev') + '</button>' +
      '<button class="cell" data-act="obGymPick" data-v="home"><span class="cell__tile bg-green">' + icon('home') + '</span><span class="cell__main"><span class="cell__title">I train at home</span><span class="cell__sub">Dumbbells, bands, whatever you’ve got</span></span>' + icon('right', 'cell__chev') + '</button></div>';
    return '<div class="card" style="display:grid;gap:12px;margin-top:12px"><div class="field"><label class="field__label" for="obNewGym">Gym name</label><input id="obNewGym" class="input" data-in="obNewGym" placeholder="e.g. Snap Fitness Schofields" value="' + esc(p.newGym.name) + '" autocapitalize="words"></div>' +
      '<div class="field"><div class="field__label">Which chain is it?</div><div class="chips">' + chains.map((c) => chip('obNewChain', c, c === 'independent' ? 'Independent' : DB.CHAINS[c].name, p.newGym.chain === c)).join('') + '</div></div>' +
      '<button class="btn btn--block" data-act="obAddGymSave"' + (p.newGym.name.trim() ? '' : ' disabled') + '>Use this gym</button></div>';
  }

  // ── What's at your gym ────────────────────────────────────────────────────
  function kitWhy(p) {
    const g = p.gym; const ch = DB.CHAINS[g.chain];
    if (g.chain === 'home') return 'Tick what you have. Your plan only uses these, and you can change them any time.';
    if (g.custom) return 'I’ve started with what ' + (ch && g.chain !== 'independent' ? ch.name + ' clubs' : 'most gyms') + ' usually have. Untick anything that isn’t there and add what is.';
    const e = DB.GYMS.find((x) => x.id === g.id);
    if (e && e.listed) return 'From the club’s own page and what members say online. Untick anything that isn’t there and add what is.';
    return 'From what ' + (ch ? ch.name : 'this gym') + ' lists online. Untick anything that isn’t there and add what is.';
  }
  function kitStep(p) {
    const g = p.gym; const e = DB.GYMS.find((x) => x.id === g.id) || g;
    const L = E().kitLayers(e.chain ? e : g); const on = new Set(g.kit); const k = E().kitSet(g.kit);
    const possible = Object.keys(D.EX).filter((id) => E().canDo(id, k)).length;
    let h = '<div class="kitsum"><div><div class="kitsum__n">' + g.kit.length + '</div><div class="kitsum__l">types of equipment</div></div><div><div class="kitsum__n">' + possible + '</div><div class="kitsum__l">exercises possible</div></div></div>';
    if (!g.custom && g.chain !== 'home') {
      const ch = DB.CHAINS[g.chain];
      const rows = [];
      if (L.listed.length) rows.push('<li><b>Listed on the club’s page:</b> ' + esc(names(L.listed)) + '.</li>');
      (e.extra || []).forEach((x) => rows.push('<li><b>Mentioned online:</b> ' + esc(x[0]) + ' (' + esc(x[1]) + ').</li>'));
      if (L.typical.length && !L.listed.length) rows.push('<li><b>Listed for most ' + esc(ch.name) + ' clubs:</b> ' + esc(names(L.typical)) + '.</li>');
      if (!ch || !ch.classOnly) rows.push('<li><b>Assumed:</b> the machines nearly every gym has, like a leg press, lat pulldown and cables. ' + esc(ch && ch.name ? ch.name + '’s pages' : 'Their pages') + ' don’t list machines one by one.</li>');
      h += '<div class="callout callout--blue kitsrc">' + icon('search') + '<div><div style="margin-bottom:6px"><b>What I found</b> · checked ' + esc(App.fmtDate(DB.checked, 'dm')) + (g.url ? ' · <a href="' + esc(g.url) + '" target="_blank" rel="noopener">club page</a>' : '') + '</div><ul class="dots-list">' + rows.join('') + '</ul></div></div>';
    }
    h += '<div class="group">' + Object.keys(D.EQUIP).map((gk) => {
      const grp = D.EQUIP[gk]; const items = Object.keys(grp.items);
      const n = items.filter((t) => on.has(t)).length;
      const maybe = items.filter((t) => !on.has(t) && L.maybe.includes(t));
      const rest = items.filter((t) => !on.has(t) && !L.maybe.includes(t));
      const chipT = (t) => '<button class="chip' + (on.has(t) ? ' is-on' : '') + '" data-act="obKit" data-v="' + t + '" aria-pressed="' + on.has(t) + '">' + esc(grp.items[t]) + '</button>';
      const panel = '<div class="chips">' + items.filter((t) => on.has(t)).map(chipT).join('') + '</div>' +
        (maybe.length ? '<div class="mini-h" style="margin-top:12px">Often at ' + esc((DB.CHAINS[g.chain] || {}).name || 'gyms like this') + '</div><div class="chips">' + maybe.map(chipT).join('') + '</div>' : '') +
        (rest.length ? '<div class="mini-h" style="margin-top:12px">Less common</div><div class="chips">' + rest.map(chipT).join('') + '</div>' : '');
      return '<div class="disc' + (App.discOpen['kit-' + gk] ? ' is-open' : '') + '" data-disc="kit-' + gk + '"><button aria-expanded="' + !!App.discOpen['kit-' + gk] + '" class="cell disc__btn" data-act="toggleDisc" data-v="kit-' + gk + '"><span class="cell__main"><span class="cell__title">' + esc(grp.name) + '</span></span><span class="cell__value">' + n + ' of ' + items.length + '</span>' + icon('right', 'cell__chev') + '</button><div class="disc__panel">' + panel + '</div></div>';
    }).join('') + '</div>' +
      '<p class="fn">Not sure? Leave it. In the gym, “Machine taken?” has a “Not at this gym” button, and your plan adjusts.</p>';
    return h;
  }
  function names(tags) { const n = tags.map((t) => D.EQUIP_NAME[t]).filter(Boolean).map((x) => x.toLowerCase()); return n.length > 8 ? n.slice(0, 8).join(', ') + ' and ' + (n.length - 8) + ' more' : n.join(', '); }

  function list(items, tiles) { return '<div class="group' + (tiles ? ' group--tiles' : '') + '">' + items.join('') + '</div>'; }
  function opt(kind, v, title, sub, tile, on) {
    const t = tile ? '<span class="cell__tile ' + tile[1] + '">' + (tile[0].length <= 2 ? '<b class="tile-ini">' + tile[0] + '</b>' : icon(tile[0])) + '</span>' : '';
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
    if (p.days.length < 2 || p.days.length !== p.perWeek) return '';
    const s = p.days.slice().sort((a, b) => a - b);
    const back2back = s.some((d, i) => i > 0 && d - s[i - 1] === 1) || (s[0] === 0 && s[s.length - 1] === 6);
    if (p.perWeek >= 4) return '';
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
    const label = last ? (ob.editing ? 'Update my plan' : 'Build my plan') : st.optional && st.optional(p) ? 'Skip' : 'Continue';
    return '<div class="ob">' +
      '<div class="ob__nav"><button class="icon-btn icon-btn--plain" data-act="obBack" aria-label="Back">' + icon('left') + '</button>' +
        '<div class="ob__bar" role="progressbar" aria-label="Progress" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>' +
        '</div>' +
      '<div class="ob__body' + (ob.dir < 0 ? ' is-back' : '') + '">' +
        '<h1 class="ob__q">' + st.q(p) + '</h1>' +
        '<p class="ob__why">' + esc(st.why(p)) + '</p>' +
        st.body(p) +
      '</div>' +
      '<div class="ob__foot"><div class="ob__foot-inner"><button class="btn btn--block" data-act="obNext"' + (st.valid(p) ? '' : ' disabled') + '>' + label + '</button></div></div>' +
    '</div>';
  }

  function welcome() {
    return '<div class="welcome">' +
      '<div class="welcome__mark">' + App.mark() + 'Spotter</div>' +
      '<div class="welcome__art" aria-hidden="true">' + App.bar({ train: 3, trainMax: 3, eat: 5, eatMax: 5, cls: 'bar--hero' }) + '</div>' +
      '<div><h1 class="welcome__title">A personal trainer in your pocket.</h1>' +
        '<p class="welcome__sub">Whether it’s your first week or your fifth year, Spotter builds your program around the gym you go to, walks you through every session and sorts out what to eat, even when you eat out.</p></div>' +
      '<div class="welcome__actions"><button class="btn btn--block" data-act="obStart">Get started</button>' +
        '<button class="btn btn--plain" data-act="obDemoAsk">Try it with example answers</button></div>' +
    '</div>';
  }

  // ── Building the plan ─────────────────────────────────────────────────────
  function build() {
    const p = ob.p; const plan = App.S.plan;
    const lines = [
      'Reading your answers',
      'Checking the equipment at ' + (p.gym ? p.gym.short || p.gym.name : 'your gym'),
      'Building ' + (plan ? listWords(plan.order.map((k) => plan.sessions[k].name).filter((x, i, a) => a.indexOf(x) === i)) : 'your sessions'),
      'Picking dinners you’ll actually eat',
      p.goals.includes('event') && p.event.date ? 'Counting down to ' + (p.event.name || 'your big day') : 'Lining up your rewards',
    ];
    return '<div class="build"><div class="build__inner">' +
      '<div class="spin spin--bar">' + App.bar({ train: 3, trainMax: 3, eat: 5, eatMax: 5, cls: 'bar--loading' }) + '</div>' +
      '<h1 class="build__title">Building your plan</h1>' +
      '<div class="build__steps">' + lines.map((l, i) => '<div class="build__step" data-bstep="' + i + '"><i>' + icon('check') + '</i>' + esc(l) + '</div>').join('') + '</div>' +
    '</div></div>';
  }
  function listWords(a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function runBuild() {
    const steps = App.$$('[data-bstep]');
    const gap = App.reduceMotion() ? 120 : 480;
    steps.forEach((el, i) => setTimeout(() => { el.classList.add('is-done'); App.sound('tick'); App.haptic(); }, 400 + i * gap));
    setTimeout(() => { ob.phase = 'reveal'; App.render(); window.scrollTo(0, 0); App.sound('done'); App.haptic('success'); }, 400 + steps.length * gap + 450);
  }

  // ── The reveal: the plan at a glance, how your answers shaped it, then into the app ─
  function reveal() {
    const s = App.S; const p = s.profile; const plan = s.plan; const Ex = App.E;
    const first = Ex.nextOpen(App.today()) || plan.slots[0];
    const tm = Ex.timeOf(plan.time);
    const exs = Ex.exercisesFor(first.key, first.week, first.id);
    const days = plan.days.map((d) => App.DOW[d]);
    const rw = Ex.partnerRewards();
    const why = plan.why || [];
    return '<div class="reveal">' +
      '<div><div class="eyebrow t-accent">Your plan is ready</div><h1 class="reveal__title">' + esc(firstName(p)) + ', here’s how we’ll do it.</h1></div>' +
      '<div class="group">' +
        row('calendar', 'bg-accent', plan.weeks + ' weeks, ' + plan.days.length + ' sessions a week', days.join(', ') + ' · ' + tm.label.toLowerCase() + ' · ' + plan.mins + ' min') +
        row('pin', 'bg-purple', Ex.gymName(), (p.gym && p.gym.suburb ? p.gym.suburb + ' · ' : '') + (D.EXPERIENCE.find((x) => x.id === p.experience) || {}).label) +
        (plan.event ? row('plane', 'bg-blue', plan.event.name, App.fmtDate(plan.event.date, 'long') + ' · ' + App.diffDays(App.today(), plan.event.date) + ' days') : row('flag', 'bg-blue', 'Finish line', App.fmtDate(plan.end, 'long'))) +
      '</div>' +
      (why.length ? '<div class="sec"><div class="sec__h"><h2 class="sec__title">How your answers shaped it</h2></div><div class="group group--tiles">' + why.map((r) => row(r[0], r[1], r[2], r[3])).join('') + '</div></div>' : '') +
      '<div class="sec"><div class="sec__h"><h2 class="sec__title">' + esc(Ex.sessionName(first)) + ' first</h2><span class="sec__aside">' + esc(App.rel(Ex.slotDate(first))) + ' · ' + esc(tm.at) + '</span></div>' +
        '<div class="group group--tiles">' + exs.map((e) => { const ex = D.EX[e.id]; return '<div class="cell"><span class="cell__tile cell__tile--art">' + art(ex.art) + '</span><span class="cell__main"><span class="cell__title">' + esc(ex.name) + '</span><span class="cell__sub">' + esc((e.pair ? 'Superset · ' : '') + e.sets + ' sets · ' + ex.focus) + '</span></span></div>'; }).join('') + '</div>' +
        '<p class="fn">' + esc(Ex.phaseFor(1, plan).note) + '</p></div>' +
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
      name: p.name.trim(), experience: p.experience, goals: p.goals.slice(),
      event: p.goals.includes('event') && p.event.date ? { name: p.event.name.trim(), date: p.event.date } : null,
      feel: p.feel.slice(), why: p.why.trim(), worries: p.worries.slice(), focus: lvl(p) >= 2 ? p.focus.slice() : [],
      health: { screening: p.screening.slice(), flag: p.screening.some((v) => v === true), cleared: false, asthma: !!p.asthma, reliever: p.reliever, actionPlan: p.actionPlan },
      gym: Object.assign({}, p.gym, { kit: p.gym.kit.slice() }), gymId: p.gym.id,
      days: p.days.slice().sort((a, b) => a - b), time: p.time, mins: p.mins, equipment: p.equipment || STYLE_DEFAULT[p.experience] || 'machines',
      cuisines: p.cuisines.slice(), derailers: p.derailers.slice(), start: p.start, created: App.today(),
    };
  }
  function fromProfile(pr) {
    const g = pr.gym || (App.E.legacyGym(pr.gymId));
    return Object.assign(blank(), {
      name: pr.name, experience: pr.experience || 'never', goals: pr.goals || [], event: pr.event ? Object.assign({}, pr.event) : { name: '', date: '' },
      feel: pr.feel || [], why: pr.why || '', worries: pr.worries || [], focus: pr.focus || [],
      screening: (pr.health && pr.health.screening) || [false, false, false, false, false, false],
      asthma: pr.health ? pr.health.asthma : null, reliever: pr.health ? pr.health.reliever : null, actionPlan: pr.health ? pr.health.actionPlan : null,
      gym: Object.assign({}, g, { kit: g.kit.slice() }), gymId: g.id, perWeek: (pr.days || []).length || 2, days: pr.days || [], time: pr.time, mins: pr.mins || 45, equipment: pr.equipment || 'machines',
      cuisines: pr.cuisines || [], derailers: pr.derailers || [], start: 'now',
    });
  }
  // A new experience level changes what's on offer: keep answers that still fit.
  function fitToLevel(p) {
    const L = lvl(p);
    p.goals = p.goals.filter((g) => goalsFor(p).some((x) => x.id === g));
    p.worries = p.worries.filter((w) => D.WORRIES[L].some((x) => x.id === w));
    if (L < 2) p.focus = [];
    const dayOpts = E().dayOptions(p);
    if (!dayOpts.includes(p.perWeek)) { p.perWeek = dayOpts[dayOpts.length - 1] < p.perWeek ? dayOpts[dayOpts.length - 1] : dayOpts[0]; p.days = DEFAULT_DAYS[p.perWeek].slice(); }
    const minOpts = E().minOptions(p); if (!minOpts.includes(p.mins)) p.mins = 60;
    if (!p.equipment || (L < 2 && p.equipment === 'free') || p.experience === 'never') p.equipment = STYLE_DEFAULT[p.experience];
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggle = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); };
  function rerender() { const y = window.scrollY; App.render(); window.scrollTo(0, y); }
  function refreshFoot() {
    const st = visibleSteps(ob.p)[ob.step];
    const btn = App.$('[data-act="obNext"]'); if (btn) { btn.disabled = !st.valid(ob.p); btn.textContent = ob.step === visibleSteps(ob.p).length - 1 ? (ob.editing ? 'Update my plan' : 'Build my plan') : st.optional && st.optional(ob.p) ? 'Skip' : 'Continue'; }
  }
  function refreshGyms() { const box = App.$('[data-gymres]'); if (box) box.innerHTML = gymResults(ob.p); refreshFoot(); }
  function pickTick() { App.haptic(); App.sound('tick'); }
  function pickGym(id) {
    const p = ob.p;
    if (id === 'home') p.gym = E().customGym('Home gym', 'home');
    else { const e = DB.GYMS.find((g) => g.id === id); if (!e) return; p.gym = E().gymFromDirectory(e); }
    p.gymId = p.gym.id; p.adding = false;
  }
  Object.assign(App.ACT, {
    obStart() { ob.p = ob.p || blank(); ob.phase = 'steps'; ob.step = 0; ob.dir = 1; App.render(); window.scrollTo(0, 0); },
    obDemoAsk() {
      App.openLayer('<div class="dialog"><div class="dialog__icon">' + icon('sparkle') + '</div><h2 class="dialog__title">Try it as…</h2><p class="dialog__text">Example answers fill everything in, so you can see the plan straight away.</p>' +
        '<button class="btn" data-act="obDemo" data-v="new">Someone new to the gym</button><button class="btn btn--tinted" data-act="obDemo" data-v="lifter">An experienced lifter</button><button class="btn btn--plain" data-act="closeLayer">Cancel</button></div>', { dialog: true });
    },
    obDemo(el) { App.closeLayer(true); ob.p = demo(el && el.dataset && el.dataset.v); App.toast('Example answers filled in', 'sparkle'); App.ACT.obFinish(); },
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
      if (st.id === 'experience') fitToLevel(ob.p);
      if (ob.step >= steps.length - 1) return App.ACT.obFinish();
      ob.step++; ob.dir = 1; App.render(); window.scrollTo(0, 0);
    },
    obFinish() {
      const prev = App.S.profile; const p = ob.p;
      if (!p.equipment) p.equipment = STYLE_DEFAULT[p.experience] || 'machines';
      App.S.profile = toProfile(p);
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
      else if (k === 'exp') { p.experience = v; fitToLevel(p); }
      else if (k === 'worry') toggle(p.worries, v);
      else if (k === 'time') p.time = v;
      else if (k === 'equip') p.equipment = v;
      else if (k === 'start') p.start = v;
      pickTick(); rerender();
    },
    obFocus(el) { toggle(ob.p.focus, el.dataset.v); pickTick(); rerender(); },
    obFeel(el) { const p = ob.p; const v = el.dataset.v; if (!p.feel.includes(v) && p.feel.length >= 3) { App.toast('Up to three. Untick one first.'); return; } toggle(p.feel, v); pickTick(); rerender(); },
    obScreen(el) { const [i, v] = el.dataset.v.split('|'); ob.p.screening[Number(i)] = v === 'yes'; pickTick(); rerender(); },
    obAsthma(el) { ob.p.asthma = el.dataset.v === 'yes'; if (!ob.p.asthma) { ob.p.reliever = null; ob.p.actionPlan = null; } pickTick(); rerender(); },
    obReliever(el) { ob.p.reliever = el.dataset.v === 'yes'; pickTick(); rerender(); },
    obAction(el) { ob.p.actionPlan = el.dataset.v; pickTick(); rerender(); },
    obPerWeek(el) {
      const p = ob.p; const n = Number(el.dataset.v); p.perWeek = n;
      const keep = p.days.slice(0, n); p.days = keep.length === n ? keep : DEFAULT_DAYS[n].slice();
      pickTick(); rerender();
    },
    obDay(el) {
      const p = ob.p; const v = Number(el.dataset.v);
      if (p.days.includes(v)) p.days = p.days.filter((d) => d !== v);
      else { p.days.push(v); if (p.days.length > p.perWeek) p.days.shift(); }
      pickTick(); rerender();
    },
    obMins(el) { ob.p.mins = Number(el.dataset.v); pickTick(); rerender(); },
    obCuisine(el) { toggle(ob.p.cuisines, el.dataset.v); pickTick(); rerender(); },
    obDerail(el) { toggle(ob.p.derailers, el.dataset.v); pickTick(); rerender(); },
    obGymPick(el) { pickGym(el.dataset.v || el.getAttribute('data-v')); pickTick(); refreshGyms(); },
    obLocate() {
      if (!navigator.geolocation) { App.toast('Location isn’t available here. Type your suburb instead.', 'pin'); return; }
      const b = App.$('[data-act="obLocate"]'); if (b) { b.disabled = true; b.innerHTML = '<span class="spinner spinner--sm" aria-hidden="true"></span>Finding you…'; }
      const done = () => { if (b && b.isConnected) { b.disabled = false; b.innerHTML = icon('pin', 'ic-sm') + (ob.p.here ? 'Near you' : 'Use my location'); } };
      try {
        navigator.geolocation.getCurrentPosition((pos) => {
          ob.p.here = [pos.coords.latitude, pos.coords.longitude]; ob.p.gymQ = '';
          const i = App.$('#obGymQ'); if (i) i.value = '';
          done(); refreshGyms(); App.haptic('success');
        }, () => { done(); App.toast('Couldn’t get your location. Type your suburb instead.', 'pin'); }, { timeout: 9000, maximumAge: 600000 });
      } catch (e) { done(); App.toast('Location isn’t available here. Type your suburb instead.', 'pin'); }
    },
    obAddGym() { ob.p.adding = true; ob.p.newGym = { name: (ob.p.gymQ || '').trim(), chain: '' }; pickTick(); refreshGyms(); const i = App.$('#obNewGym'); if (i) i.focus(); },
    obNewChain(el) { ob.p.newGym.chain = el.dataset.v; pickTick(); App.$$('[data-act="obNewChain"]').forEach((b) => { const on = b === el; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); }); },
    obAddGymSave() {
      const p = ob.p; const name = p.newGym.name.trim(); if (!name) return;
      let chain = p.newGym.chain;
      if (!chain) chain = Object.keys(DB.CHAINS).find((c) => c !== 'independent' && name.toLowerCase().indexOf(DB.CHAINS[c].name.toLowerCase()) === 0) || 'independent';
      p.gym = E().customGym(name, chain); p.gymId = p.gym.id; p.adding = false;
      App.haptic('success'); refreshGyms();
    },
    obKit(el) {
      const g = ob.p.gym; const t = el.dataset.v; const i = g.kit.indexOf(t);
      if (i >= 0) g.kit.splice(i, 1); else g.kit.push(t);
      g.edited = true; pickTick(); rerender();
    },
  });
  Object.assign(App.IN, {
    obName(el) { ob.p.name = el.value; refreshFoot(); },
    obEvName(el) { ob.p.event.name = el.value; refreshFoot(); },
    obEvDate(el) { ob.p.event.date = el.value; refreshFoot(); rerender(); },
    obWhy(el) { ob.p.why = el.value; refreshFoot(); },
    obGymQ(el) { ob.p.gymQ = el.value; if (el.value.trim()) ob.p.here = null; refreshGyms(); },
    obNewGym(el) { ob.p.newGym.name = el.value; const b = App.$('[data-act="obAddGymSave"]'); if (b) b.disabled = !el.value.trim(); },
  });

  App.OB = { render, blank, demo, fromProfile, toProfile, visibleSteps };
})();
