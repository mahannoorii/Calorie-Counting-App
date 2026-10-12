/* Spotter — main screens (Today, Journey, Food), the plan reveal, sheets and celebrations. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const E = App.E;
  const { esc, icon, art, today, addDays, weekStart, dow, rel, fmtDate, diffDays, DOW } = App;
  const S = () => App.S;

  // ── Shared bits ───────────────────────────────────────────────────────────
  const TONE_HERO = { blue: '', red: ' hero--red', green: ' hero--green', yellow: ' hero--yellow', ink: ' hero--ink' };
  function ring(pct, color, label, small) {
    const C = 2 * Math.PI * 34;
    const off = C * (1 - App.clamp(pct, 0, 1));
    return '<div class="ring"><svg viewBox="0 0 84 84"><circle class="ring__track" cx="42" cy="42" r="34" stroke-width="9"/>' +
      '<circle class="ring__bar" cx="42" cy="42" r="34" stroke-width="9" stroke="' + color + '" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '" data-ring="' + off.toFixed(1) + '"/></svg>' +
      '<div class="ring__label"><span>' + label + (small ? '<small>' + small + '</small>' : '') + '</span></div></div>';
  }
  function miniPlate(color, done) {
    return '<svg class="day__mark" viewBox="0 0 20 20" aria-hidden="true">' + (done
      ? '<circle cx="10" cy="10" r="9" fill="' + color + '"/><circle cx="10" cy="10" r="2.6" fill="var(--card)"/>'
      : '<circle cx="10" cy="10" r="8" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-dasharray="3 2.5"/><circle cx="10" cy="10" r="2.4" fill="' + color + '"/>') + '</svg>';
  }
  function exLine(e) {
    const ex = D.EX[e.id];
    const meta = ex.unit === 'kg' ? e.sets + ' sets × ' + ex.reps.join('–') + ' reps' : ex.unit === 'sec' ? e.sets + ' × ' + ex.reps.join('–') + ' s hold' : ex.unit === 'reps' ? e.sets + ' sets × ' + ex.reps.join('–') + (ex.perSide ? ' each side' : ' reps') : e.min + ' min';
    return '<div class="ex-line"><span class="ex-line__art">' + art(ex.art) + '</span><span class="grow"><span class="ex-line__name">' + esc(ex.name) + '</span><br><span class="ex-line__meta">' + esc(ex.focus || '') + ' · ' + meta + '</span></span></div>';
  }
  function firstName() { const p = S().profile; return p && p.name ? p.name.split(' ')[0] : 'there'; }
  function checkinButtons(date, inHero) {
    const cur = S().food[date] && S().food[date].s;
    const opts = [['on', 'On track', 'smile'], ['part', 'Partly', 'meh'], ['off', 'Off track', 'frown']];
    return '<div class="checkin' + (inHero ? ' hero__inline' : '') + '">' + opts.map((o) =>
      '<button class="checkin__btn' + (cur === o[0] ? ' is-on' : '') + '" data-act="foodCheck" data-v="' + date + '|' + o[0] + '" data-vv="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '"><span class="checkin__face">' + icon(o[2]) + '</span>' + o[1] + '</button>').join('') + '</div>';
  }
  function eventCountdown() {
    const p = S().profile; const plan = S().plan;
    if (p.event && p.event.date >= today()) return { days: diffDays(today(), p.event.date), label: p.event.name || 'your big day', date: p.event.date };
    if (plan) return { days: Math.max(0, diffDays(today(), plan.end)), label: 'the end of your plan', date: plan.end };
    return null;
  }

  // ── Shell ─────────────────────────────────────────────────────────────────
  function shell() {
    const v = App.tab;
    const body = v === 'journey' ? journey() : v === 'food' ? food() : todayView();
    App.Coach.setContext(v === 'food' ? { key: 'food', label: 'Food' } : v === 'journey' ? { key: 'journey', label: 'Your journey' } : { key: 'today', label: 'Today' });
    return body +
      '<button class="coach-fab" data-act="openCoach" aria-label="Ask your coach"><span class="coach-fab__face">' + App.plate('', '#ffffff', { ring: 'rgba(36,72,245,.35)', hub: 'rgba(36,72,245,.18)', hole: '#2448f5' }).replace('<svg class=""', '<svg style="width:26px;height:26px"') + '</span>Ask Spotter</button>' +
      '<nav class="tabbar" aria-label="Main"><div class="tabbar__inner">' +
        tab('today', 'Today', 'today') + tab('journey', 'Journey', 'journey') + tab('food', 'Food', 'food') +
      '</div></nav>';
  }
  function tab(id, label, ic) {
    return '<button class="tab' + (App.tab === id ? ' is-on' : '') + '" data-act="go" data-v="' + id + '" aria-current="' + (App.tab === id ? 'page' : 'false') + '">' + icon(ic) + label + '<span class="tab__dot"></span></button>';
  }

  // ── Today ─────────────────────────────────────────────────────────────────
  function todayView() {
    const { primary, ups } = E.predict();
    const t = today(); const wk = weekStart(t);
    const streak = E.streakWeeks();
    const cd = eventCountdown();
    const target = E.targetInWeek(wk) || S().plan.days.length;
    const done = E.sessionsInWeek(wk);
    const food = E.foodScore(wk);
    const lp = E.levelProgress(S().xp);
    const tip = E.dailyTip();
    const showFoodCard = primary.inline !== 'checkin' && !S().food[t] && App.hour() >= 12;
    const ios = isIOS() && !standalone() && !window.claude && !S().seen.install;
    return '<main class="screen" id="main">' +
      '<header class="topbar">' +
        '<div class="topbar__hi"><div class="topbar__date">' + esc(fmtDate(t, 'long')) + '</div><h1 class="topbar__name">' + esc(App.greeting()) + ', ' + esc(firstName()) + '</h1></div>' +
        '<button class="streak" data-act="streakInfo" aria-label="' + streak + ' week streak">' + icon('flame') + streak + '</button>' +
        '<button class="avatar" data-act="openMe" aria-label="Your profile and settings">' + esc(firstName().charAt(0).toUpperCase()) + '</button>' +
      '</header>' +
      (cd && S().profile.event ? '<button class="goal-strip" data-act="go" data-v="journey"><span class="goal-strip__icon">' + icon('plane') + '</span><span class="grow"><span class="goal-strip__days num">' + cd.days + ' ' + App.plural(cd.days, 'day') + '</span><br><span class="goal-strip__label">to ' + esc(cd.label) + ' · ' + esc(fmtDate(cd.date, 'dm')) + '</span></span>' + icon('right', 'ic-sm') + '</button>' : '') +
      heroHtml(primary) +
      (ios ? '<div class="banner">' + icon('info') + '<div class="grow t-sm"><b>Add Spotter to your Home Screen</b> so it opens like an app and your iPhone keeps your progress safe.</div><button class="btn btn--sm btn--soft" data-act="openInstall">How</button></div>' : '') +
      '<section class="section" aria-label="This week">' +
        '<div class="section__head"><h2 class="section__title">This week</h2><button class="btn btn--plain btn--sm" data-act="go" data-v="journey">Journey' + icon('right', 'ic-sm') + '</button></div>' +
        '<div class="card">' + weekStrip(wk) +
          '<div class="rings" style="margin-top:16px">' +
            '<div class="ring-stat">' + ring(target ? done / target : 0, 'var(--blue)', done, '/' + target) + '<div class="ring-stat__name">Sessions</div></div>' +
            '<div class="ring-stat">' + ring(food / E.foodTarget(), 'var(--green)', App.fmtKg(food), '/' + E.foodTarget()) + '<div class="ring-stat__name">Food days</div></div>' +
            '<div class="ring-stat">' + ring(lp.pct / 100, 'var(--yellow)', lp.pct, '%') + '<div class="ring-stat__name">To next plate</div></div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      (showFoodCard ? '<section class="card" aria-label="Food check-in"><div class="row" style="margin-bottom:12px"><span class="list-item__icon tone-green">' + icon('leaf') + '</span><div class="grow"><div class="list-item__title">How’s eating going today?</div><div class="list-item__sub">You can change it tonight.</div></div></div>' + checkinButtons(t) + '</section>' : '') +
      (ups.length ? '<section class="section" aria-label="Coming up"><div class="section__head"><h2 class="section__title">Coming up</h2></div><div class="upnext">' + ups.map((u) =>
        '<button class="up" data-act="' + u.act + '" data-v="' + esc(u.data || '') + '"><span class="up__icon tone-' + u.tone + '">' + icon(u.icon) + '</span><span class="grow"><span class="up__when">' + esc(u.when) + '</span><br><span class="up__title">' + esc(u.title) + '</span></span>' + icon('right', 'ic-sm') + '</button>').join('') + '</div></section>' : '') +
      '<section class="tip" aria-label="Coach tip"><span class="tip__icon">' + icon('sparkle', 'ic-sm') + '</span><div class="grow"><div class="tip__text">' + esc(tip.text) + '</div><button class="tip__ask" data-act="coachAsk" data-v="' + tip.ask + '">Ask Spotter about this' + icon('right', 'ic-sm') + '</button></div></section>' +
    '</main>';
  }
  function heroHtml(c) {
    return '<section class="hero' + (TONE_HERO[c.tone] || '') + '" aria-label="Your next step">' +
      App.decoPlate('hero__plate') +
      '<div class="hero__kicker">' + icon(c.icon, 'ic-sm') + esc(c.kicker) + '</div>' +
      '<h2 class="hero__title display">' + esc(c.title) + '</h2>' +
      '<p class="hero__sub">' + esc(c.sub) + '</p>' +
      (c.inline === 'checkin' ? checkinButtons(c.date, true) : '') +
      (c.actions ? '<div class="hero__actions">' + c.actions.map((a) => '<button class="btn ' + (a.ghost ? 'btn--ghost-on' : 'btn--white') + '" data-act="' + a.act + '" data-v="' + esc(a.data || '') + '">' + (a.icon ? icon(a.icon) : '') + esc(a.label) + '</button>').join('') + '</div>' : '') +
      '<div class="hero__why">' + icon('sparkle', 'ic-sm') + '<span>' + esc(c.why) + '</span></div>' +
    '</section>';
  }
  function weekStrip(wk) {
    const t = today();
    let h = '<div class="week" role="list">';
    for (let i = 0; i < 7; i++) {
      const d = addDays(wk, i);
      const logged = S().log.filter((l) => l.date === d);
      const planned = E.slotsOn(d);
      let mark = '<span class="day__mark--empty"></span>';
      if (logged.length) mark = miniPlate(logged[0].key === 'B' ? 'var(--red)' : 'var(--blue)', true);
      else if (planned.length) mark = miniPlate(d < t ? 'var(--ink-3)' : planned[0].key === 'B' ? 'var(--red)' : 'var(--blue)', false);
      h += '<div class="day' + (d === t ? ' is-today' : '') + '" role="listitem" aria-label="' + esc(fmtDate(d, 'long')) + (logged.length ? ', session done' : planned.length ? ', session planned' : '') + '">' + DOW[i].charAt(0) + '<span class="day__num">' + App.parse(d).getDate() + '</span>' + mark + '</div>';
    }
    return h + '</div>';
  }

  // ── Plan reveal (end of onboarding) ───────────────────────────────────────
  function reveal() {
    const p = S().profile; const plan = S().plan; const gym = E.gymOf(plan.gymId);
    const days = plan.days.map((d) => DOW[d]).join(' & ');
    const timeL = (D.TIMES.find((x) => x.id === plan.time) || {}).label || '';
    const title = plan.event ? plan.weeks + ' weeks to ' + (plan.event.name || 'your big day') : 'Your ' + plan.weeks + '-week plan';
    const derails = (p.derailers || []).map((d) => (D.DERAILERS.find((x) => x.id === d) || {}).label.toLowerCase()).filter(Boolean);
    const rw = E.partnerRewards();
    return '<div class="reveal">' +
      '<div><div class="eyebrow">Your plan, ' + esc(firstName()) + '</div><h1 class="reveal__title display" style="margin-top:6px">' + esc(title) + '</h1></div>' +
      '<div class="facts">' +
        '<span class="fact">' + icon('calendar', 'ic-sm') + esc(days) + '</span>' +
        '<span class="fact">' + icon('clock', 'ic-sm') + plan.mins + ' min · ' + esc(timeL) + '</span>' +
        '<span class="fact">' + icon('pin', 'ic-sm') + esc(gym.generic ? 'Your gym' : gym.branch) + '</span>' +
        '<span class="fact">' + icon('sliders', 'ic-sm') + (p.equipment === 'mixed' ? 'Machines + dumbbells' : 'Machines only') + '</span>' +
        (p.health.asthma ? '<span class="fact">' + icon('puffer', 'ic-sm') + 'Asthma-aware warm-ups</span>' : '') +
      '</div>' +
      ['A', 'B'].map((k) => '<div class="sess-card"><div class="sess-card__head sess-card__head--' + k + '"><span class="sess-card__letter">' + k + '</span><div><div style="font-weight:800">' + esc(plan.sessions[k].name) + '</div><div class="t-sm" style="opacity:.9">' + esc(plan.sessions[k].title) + '</div></div></div>' +
        '<div class="sess-card__list">' + exLine({ id: plan.warmup.id, min: plan.warmup.min }) + E.exercisesFor(k, 1).map(exLine).join('') + '</div></div>').join('') +
      '<div class="card"><div class="section__title" style="font-size:18px">How it builds</div>' +
        '<div class="list" style="margin-top:6px">' +
          (plan.newbie ? phaseRow('1–2', 'Learn the machines', '2 sets, light weights, all about set-up and feel.', 'tone-blue') : '') +
          phaseRow(plan.newbie ? '3–6' : '1–6', 'Build the habit', '3 sets. I tell you when to add weight.', 'tone-red') +
          (plan.weeks > 6 ? phaseRow('7–' + plan.weeks, 'Get stronger', 'Steady increases all the way to ' + esc(plan.event ? plan.event.name : 'the finish') + '.', 'tone-yellow') : '') +
        '</div></div>' +
      '<div class="card"><div class="row"><span class="list-item__icon tone-green">' + icon('leaf') + '</span><div class="grow"><div class="list-item__title">Food: simple and steady</div><div class="list-item__sub">5 on-track days a week, a one-tap check-in each night, and lighter versions of the dishes you love.</div></div></div>' +
        (derails.length ? '<p class="t-sm muted" style="margin-top:12px">Game plans ready for: <b style="color:var(--ink)">' + esc(derails.join(', ')) + '</b>.</p>' : '') + '</div>' +
      (rw.length ? '<div class="card"><div class="row"><span class="list-item__icon tone-yellow">' + icon('gift') + '</span><div class="grow"><div class="list-item__title">Real rewards along the way</div><div class="list-item__sub">' + rw.map((r) => 'Week ' + r.week + ': ' + esc(r.text)).join(' · ') + '</div></div></div><p class="t-sm faint" style="margin-top:10px">Your partner can change these in your profile.</p></div>' : '') +
      (p.feel.length || p.why ? '<div class="countdown">' + App.decoPlate('countdown__plate') + '<div class="eyebrow" style="color:inherit;opacity:.7">Your why</div><p style="font-size:20px;font-weight:700;margin-top:8px">' + esc(p.why || ('Feel ' + p.feel.join(', ').toLowerCase())) + '</p>' + (p.feel.length ? '<div class="countdown__feel">' + p.feel.map((f) => '<span>' + esc(f) + '</span>').join('') + '</div>' : '') + '</div>' : '') +
      '<div class="ob__foot"><div class="ob__foot-inner"><button class="btn btn--block" data-act="startPlan">Start my plan' + icon('arrow') + '</button></div></div>' +
    '</div>';
  }
  function phaseRow(weeks, name, sub, tone) {
    return '<div class="list-item"><span class="list-item__icon ' + tone + '" style="font-weight:900;font-size:13px">W' + weeks.split(/[–-]/)[0] + '</span><div class="grow"><div class="list-item__title">Weeks ' + weeks + ' · ' + name + '</div><div class="list-item__sub">' + sub + '</div></div></div>';
  }

  // ── Journey ───────────────────────────────────────────────────────────────
  function journey() {
    const p = S().profile; const plan = S().plan;
    const cd = eventCountdown();
    const lp = E.levelProgress(S().xp);
    const L = D.LEVELS[lp.level]; const nextL = D.LEVELS[lp.level + 1];
    const tot = E.totals();
    return '<main class="screen" id="main">' +
      '<header class="topbar"><div class="topbar__hi"><div class="topbar__date">' + tot.done + ' of ' + tot.total + ' sessions done</div><h1 class="topbar__name">Your journey</h1></div>' +
        '<button class="avatar" data-act="openMe" aria-label="Your profile and settings">' + esc(firstName().charAt(0).toUpperCase()) + '</button></header>' +
      (cd ? '<section class="countdown" aria-label="Countdown">' + App.decoPlate('countdown__plate') +
        '<div class="countdown__num" data-count="' + cd.days + '">' + cd.days + '</div>' +
        '<div class="countdown__lbl">' + App.plural(cd.days, 'day') + ' to ' + esc(cd.label) + ' · ' + esc(fmtDate(cd.date, 'short')) + '</div>' +
        (p.why ? '<p style="margin-top:12px;font-weight:600">“' + esc(p.why) + '”</p>' : '') +
        (p.feel.length ? '<div class="countdown__feel">' + p.feel.map((f) => '<span>' + esc(f) + '</span>').join('') + '</div>' : '') +
      '</section>' : '') +
      '<section class="card" aria-label="Your level"><div class="level">' + App.levelPlate(lp.level, 'level__plate') +
        '<div class="grow"><div class="eyebrow">Level ' + (lp.level + 1) + '</div><div style="font-size:20px;font-weight:800">' + esc(L.name) + (L.kg ? ' · ' + L.kg + ' kg' : '') + '</div>' +
        '<div class="level__bar"><i data-w="' + lp.pct + '" style="width:0"></i></div>' +
        '<div class="t-sm muted" style="margin-top:6px">' + (nextL ? '<b class="num" style="color:var(--ink)">' + lp.toNext + ' XP</b> to the ' + esc(nextL.name.toLowerCase()) : 'Top plate. Legend.') + ' · ' + S().xp.toLocaleString('en-AU') + ' XP total</div></div></div>' +
      '</section>' +
      '<section class="section" aria-label="The road ahead"><div class="section__head"><h2 class="section__title">The road ahead</h2><span class="faint t-sm">Tap any step</span></div>' + pathHtml() + '</section>' +
      '<section class="section" aria-label="Badges"><div class="section__head"><h2 class="section__title">Badges</h2><span class="faint t-sm num">' + Object.keys(S().badges).length + '/' + D.BADGES.length + '</span></div><div class="badges">' + D.BADGES.map(badgeTile).join('') + '</div></section>' +
      liftsHtml() +
      '<section class="soon"><span class="list-item__icon tone-blue">' + icon('swap') + '</span><div class="grow"><span class="soon__tag">Coming soon</span><div class="list-item__title">Progress that travels</div><div class="list-item__sub">Training at a different gym? Spotter will match its machines to yours and carry your progress over, so 20 kg here means the right weight there.</div></div></section>' +
    '</main>';
  }
  function badgeTile(b) {
    const got = S().badges[b.id];
    return '<button class="bdg' + (got ? '' : ' is-locked') + '" data-act="badgeInfo" data-v="' + b.id + '"><span class="bdg__icon tone-' + (got ? b.tone : 'blue') + '">' + icon(got ? b.icon : 'lock') + '</span><span class="bdg__name">' + esc(b.name) + '</span></button>';
  }
  function pathHtml() {
    const plan = S().plan; const t = today();
    const slots = plan.slots.filter((s) => !E.isSkipped(s)).slice().sort((a, b) => (E.slotDate(a) < E.slotDate(b) ? -1 : 1));
    const rewards = E.partnerRewards();
    const nodes = [];
    let nextMarked = false;
    let lastWeek = 0;
    slots.forEach((s, i) => {
      const done = E.isDone(s);
      const isNext = !done && !nextMarked;
      if (isNext) nextMarked = true;
      nodes.push({ type: 'session', slot: s, done, next: isNext, week: s.week, firstOfWeek: s.week !== lastWeek });
      lastWeek = s.week;
      const nextSlot = slots[i + 1];
      rewards.forEach((r) => { if (s.week === r.week && (!nextSlot || nextSlot.week !== r.week)) nodes.push({ type: 'gift', reward: r }); });
    });
    nodes.push({ type: 'goal' });
    const ROW = 96; const WEEK_GAP = 54;
    let y = 30; const pts = nodes.map((n, i) => { if (n.firstOfWeek) y += WEEK_GAP; const pt = { x: 50 + Math.sin(i * 0.85) * 24, y }; y += ROW; return pt; });
    const H = y + 10;
    let doneIdx = -1; nodes.forEach((n, i) => { if (n.type === 'session' && n.done) doneIdx = i; if (n.type === 'gift' && n.reward.open) doneIdx = i; });
    const seg = (a, b) => { let d = 'M' + pts[a].x + ' ' + pts[a].y; for (let i = a + 1; i <= b; i++) { const p0 = pts[i - 1], p1 = pts[i]; const my = (p0.y + p1.y) / 2; d += ' C' + p0.x + ' ' + my + ' ' + p1.x + ' ' + my + ' ' + p1.x + ' ' + p1.y; } return d; };
    let h = '<div class="path" style="height:' + H + 'px"><svg class="path__line" viewBox="0 0 100 ' + H + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + seg(0, nodes.length - 1) + '"/>' + (doneIdx > 0 ? '<path class="is-done" d="' + seg(0, doneIdx) + '"/>' : '') + '</svg>';
    nodes.forEach((n, i) => {
      const style = 'left:' + pts[i].x + '%;top:' + pts[i].y + 'px';
      if (n.type === 'session') {
        const d = E.slotDate(n.slot);
        if (n.firstOfWeek) h += '<div class="path__week" style="top:' + (pts[i].y - 82) + 'px"><span>Week ' + n.week + ' · ' + esc(E.phaseFor(n.week, plan).name) + '</span></div>';
        h += '<button class="node node--' + n.slot.key + (n.done ? ' is-done' : '') + (n.next ? ' is-next' : '') + '" style="' + style + '" data-act="previewSession" data-v="' + n.slot.id + '" aria-label="' + esc(plan.sessions[n.slot.key].name + ', ' + fmtDate(d, 'long') + (n.done ? ', done' : '')) + '">' +
          (n.done ? icon('check', 'ic-lg') : '<span class="node__letter">' + n.slot.key + '</span>') +
          (n.next ? '<span class="node__here">' + (d === t ? 'Today' : d < t ? 'Catch up' : 'Up next') + '</span>' : '') +
          '<span class="node__label">' + esc(fmtDate(d, 'short')) + '</span></button>';
      } else if (n.type === 'gift') {
        h += '<button class="node node--gift' + (n.reward.open ? ' is-open' : '') + '" style="' + style + '" data-act="rewardInfo" data-v="' + n.reward.week + '" aria-label="Reward for week ' + n.reward.week + '">' + icon('gift', 'ic-lg') + '<span class="node__label">' + esc(n.reward.open ? 'Unlocked' : 'Week ' + n.reward.week + ' reward') + '</span></button>';
      } else {
        const ev = plan.event;
        h += '<button class="node node--goal" style="' + style + '" data-act="goalInfo" aria-label="Your goal">' + icon(ev ? 'plane' : 'trophy', 'ic-lg') + '<span class="node__label">' + esc(ev ? (ev.name || 'Big day') + ' · ' + fmtDate(ev.date, 'dm') : 'Plan complete') + '</span></button>';
      }
    });
    return h + '</div>';
  }
  function liftsHtml() {
    const byEx = {};
    S().log.forEach((l) => l.ex.forEach((e) => {
      if (!e.sets.length) return;
      const ex = D.EX[e.id]; if (!ex || ex.unit === 'min') return;
      const v = ex.unit === 'kg' ? Math.max.apply(null, e.sets.map((s) => s.w)) : Math.max.apply(null, e.sets.map((s) => s.r));
      (byEx[e.id] = byEx[e.id] || []).push(v);
    }));
    const ids = Object.keys(byEx);
    if (!ids.length) return '<section class="section"><div class="section__head"><h2 class="section__title">Your lifts</h2></div><div class="card card--flat t-sm muted">After your first session, every machine gets its own progress line here.</div></section>';
    return '<section class="section"><div class="section__head"><h2 class="section__title">Your lifts</h2></div><div class="card" style="padding-block:4px">' + ids.map((id) => {
      const ex = D.EX[id]; const vals = byEx[id]; const last = vals[vals.length - 1]; const first = vals[0];
      const unit = ex.unit === 'kg' ? ' kg' : ex.unit === 'sec' ? ' s' : ' reps';
      const delta = last - first;
      return '<div class="lift"><div><div class="lift__name">' + esc(ex.name) + '</div><div class="lift__val">' + App.fmtKg(last) + unit + (vals.length > 1 ? (delta > 0 ? ' · <b style="color:var(--green-text)">+' + App.fmtKg(delta) + unit + '</b>' : ' · steady') : ' · first log') + '</div></div>' + spark(vals) + '</div>';
    }).join('') + '</div></section>';
  }
  function spark(vals) {
    const w = 110, h = 46, pad = 5;
    if (vals.length < 2) return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '"><circle cx="' + (w - pad) + '" cy="' + h / 2 + '" r="4"/></svg>';
    const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals); const span = max - min || 1;
    const pts = vals.map((v, i) => [pad + (i / (vals.length - 1)) * (w - pad * 2), h - pad - ((v - min) / span) * (h - pad * 2)]);
    const line = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    const area = line + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (h - 1) + ' L' + pts[0][0].toFixed(1) + ' ' + (h - 1) + ' Z';
    const lp = pts[pts.length - 1];
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><path class="area" d="' + area + '"/><path class="line" d="' + line + '"/><circle cx="' + lp[0].toFixed(1) + '" cy="' + lp[1].toFixed(1) + '" r="4"/></svg>';
  }

  // ── Food ──────────────────────────────────────────────────────────────────
  function food() {
    const t = today(); const wk = weekStart(t); const p = S().profile;
    const score = E.foodScore(wk);
    const cur = S().food[t];
    const dishes = (p.dishes && p.dishes.length ? p.dishes : ['joojeh', 'stirfry', 'bolognese']).map((id) => D.DISHES.find((d) => d.id === id)).filter(Boolean);
    const upcoming = S().events.filter((e) => e.date >= t).sort((a, b) => (a.date < b.date ? -1 : 1));
    const wkPlan = S().weekends[wk];
    const order = ['gathering', 'eatingout', 'takeaway', 'weekend'];
    return '<main class="screen" id="main">' +
      '<header class="topbar"><div class="topbar__hi"><div class="topbar__date">Simple, steady, no counting</div><h1 class="topbar__name">Food</h1></div>' +
        '<button class="avatar" data-act="openMe" aria-label="Your profile and settings">' + esc(firstName().charAt(0).toUpperCase()) + '</button></header>' +
      '<section class="card" aria-label="This week"><div class="food-week">' + ring(score / E.foodTarget(), 'var(--green)', App.fmtKg(score), '/' + E.foodTarget()) +
        '<div class="grow"><div class="list-item__title">On-track days this week</div><div class="dots" style="margin-top:10px">' +
        DOW.map((d, i) => { const dd = addDays(wk, i); const f = S().food[dd]; return '<div class="dot' + (dd === t ? ' is-today' : '') + '"><i class="' + (f ? f.s : '') + '"></i>' + d.charAt(0) + '</div>'; }).join('') +
        '</div></div></div>' +
        '<p class="t-sm muted" style="margin-top:14px">' + (score >= E.foodTarget() ? 'Target hit for the week. That’s how results happen.' : 'Partly counts as half. One off day never ruins a week.') + '</p>' +
      '</section>' +
      '<section class="card" aria-label="Today’s check-in"><div class="row" style="margin-bottom:12px"><span class="list-item__icon tone-green">' + icon('leaf') + '</span><div class="grow"><div class="list-item__title">' + (cur ? 'Today: ' + (cur.s === 'on' ? 'on track' : cur.s === 'part' ? 'partly on track' : 'off track') : 'How did eating go today?') + '</div><div class="list-item__sub">' + (cur ? 'Tap to change it.' : 'One tap. Honest beats perfect.') + '</div></div></div>' + checkinButtons(t) + '</section>' +
      (upcoming.length ? '<section class="section"><div class="section__head"><h2 class="section__title">Planned moments</h2></div><div class="upnext">' + upcoming.slice(0, 4).map((e) => { const gp = D.GAMEPLANS[e.type]; return '<button class="up" data-act="openGameplan" data-v="' + e.type + '|' + e.id + '"><span class="up__icon tone-' + gp.color + '">' + icon(gp.icon) + '</span><span class="grow"><span class="up__when">' + esc(rel(e.date)) + '</span><br><span class="up__title">' + esc(e.title) + '</span></span>' + (e.planned ? '<span class="pill tone-green">' + icon('check', 'ic-sm') + 'Planned</span>' : icon('right', 'ic-sm')) + '</button>'; }).join('') + '</div></section>' : '') +
      '<section class="section"><div class="section__head"><h2 class="section__title">Game plans</h2><span class="faint t-sm">For the tricky moments</span></div><div class="plans">' + order.map((k) => {
        const gp = D.GAMEPLANS[k];
        const sub = k === 'weekend' ? (wkPlan ? 'Planned for this weekend' : 'Two minutes, every Friday') : k === 'gathering' ? 'Enjoy it, still have a good week' : k === 'eatingout' ? 'Decide before you’re hungry' : 'Better orders, no guilt';
        return '<button class="plan-tile" data-act="' + (k === 'weekend' ? 'openWeekend' : 'openGameplan') + '" data-v="' + k + '"><span class="plan-tile__icon tone-' + gp.color + '">' + icon(gp.icon) + '</span><span class="plan-tile__name">' + esc(gp.title) + '</span><span class="plan-tile__sub">' + esc(sub) + '</span></button>';
      }).join('') + '</div></section>' +
      '<section class="section"><div class="section__head"><h2 class="section__title">Your go-to meals</h2><span class="faint t-sm">Lighter weekday versions</span></div><div class="meals">' + dishes.map((d, i) => {
        const tones = ['var(--blue)', 'var(--red)', 'var(--yellow)', 'var(--green)'];
        return '<button class="meal" data-act="openMeal" data-v="' + d.id + '"><div class="meal__top" style="background:' + tones[i % 4] + ';color:' + (i % 4 === 2 ? 'var(--on-yellow)' : '#fff') + '">' + App.decoPlate('hero__plate') + icon('food', 'ic-lg') + '</div><div class="meal__body"><span class="meal__name">' + esc(d.name) + '</span><span class="meal__sub">' + esc(d.lighter[0]) + '</span></div></button>';
      }).join('') + '</div></section>' +
      '<section class="section"><div class="section__head"><h2 class="section__title">Portion guide</h2><span class="faint t-sm">Your hand is the measure</span></div><div class="hands">' + D.HAND_PORTIONS.map((h) => '<div class="hand"><span class="hand__part">' + esc(h.part) + '</span><span class="hand__food">' + esc(h.food) + ' · ' + esc(h.per) + '</span><span class="hand__eg">' + esc(h.eg) + '</span></div>').join('') + '</div></section>' +
      '<section class="soon"><span class="list-item__icon tone-green">' + icon('clipboard') + '</span><div class="grow"><span class="soon__tag">Coming soon</span><div class="list-item__title">Shopping list and your own recipes</div><div class="list-item__sub">Save family recipes, get a lighter version and a shopping list for the week.</div></div></section>' +
    '</main>';
  }

  // ── Sheets ────────────────────────────────────────────────────────────────
  function previewSheet(slotId) {
    const s = E.slotById(slotId); if (!s) return;
    const plan = S().plan; const d = E.slotDate(s); const done = E.isDone(s);
    const exs = E.exercisesFor(s.key, s.week);
    const log = S().log.find((l) => l.slot === slotId);
    const phase = E.phaseFor(s.week, plan);
    const body =
      '<div class="row"><span class="pill tone-' + (s.key === 'A' ? 'blue' : 'red') + '">' + icon('calendar', 'ic-sm') + esc(fmtDate(d, 'long')) + '</span><span class="pill tone-yellow">Week ' + s.week + ' · ' + esc(phase.name) + '</span></div>' +
      (done && log ? '<div class="card card--flat"><div class="list-item__title">Done ' + esc(rel(log.date).toLowerCase()) + '</div><div class="list-item__sub">' + log.mins + ' min · ' + App.sum(log.ex.map((e) => e.sets.length)) + ' sets · ' + Math.round(App.sum(log.ex.map((e) => App.sum(e.sets.map((x) => (x.w || 0) * x.r))))).toLocaleString('en-AU') + ' kg lifted</div></div>' : '') +
      '<p class="muted">' + esc(phase.note) + '</p>' +
      '<div class="card" style="padding-block:6px">' + exLine({ id: plan.warmup.id, min: plan.warmup.min }) + exs.map(exLine).join('') + (plan.finisher ? exLine({ id: plan.finisher.id, min: plan.finisher.min }) : '') + '</div>' +
      '<div class="tip"><span class="tip__icon">' + icon('pin', 'ic-sm') + '</span><div class="tip__text">Machine photos and their exact spots at ' + esc(E.gymName(plan.gymId)) + ' arrive once the gym is mapped. Until then, each step shows the machine type and how to set it up.</div></div>';
    const canStart = !done && !S().active;
    App.sheet(esc(plan.sessions[s.key].name + ' · ' + plan.sessions[s.key].title), body, {
      foot: canStart ? '<button class="btn btn--block" data-act="startSession" data-v="' + slotId + '">' + icon('play') + (d === today() ? 'Start session' : d < today() ? 'Do it now' : 'Start it today instead') + '</button>' : (S().active ? '<button class="btn btn--block btn--soft" data-act="resumeSession">Resume your session in progress</button>' : ''),
    });
  }
  function notTodaySheet(slotId) {
    const s = E.slotById(slotId); const t = today();
    const busy = (d) => E.slotsOn(d).length > 0;
    const opts = [];
    for (let i = 1; i <= 4; i++) { const d = addDays(t, i); if (!busy(d)) opts.push(d); if (opts.length >= 2) break; }
    App.sheet('Move this session?', '<p class="muted">Life happens. Pick a new day and I’ll shuffle things around, or skip it and carry on.</p>' +
      '<div class="options">' + opts.map((d) => '<button class="option" data-act="moveSlot" data-v="' + slotId + '|' + d + '"><span class="option__icon">' + icon('calendar') + '</span><span class="option__main"><span class="option__title">' + esc(rel(d)) + '</span><span class="option__sub" style="display:block">' + esc(fmtDate(d, 'long')) + (dow(d) === 6 || dow(d) === 5 ? ' · weekend' : '') + '</span></span></button>').join('') +
      '<button class="option" data-act="skipSlot" data-v="' + slotId + '"><span class="option__icon">' + icon('skip') + '</span><span class="option__main"><span class="option__title">Skip this one</span><span class="option__sub" style="display:block">No guilt. Your next session stays as planned.</span></span></button></div>');
  }
  function packSheet() {
    const p = S().profile; const key = 'pack:' + today();
    const st = S().seen[key] || {};
    const items = [['water', 'Water bottle', 'water'], ['towel', 'Small towel', 'towel'], ['shoes', 'Closed shoes', 'shoe'], ['phones', 'Headphones', 'headphones']];
    if (p.health.asthma) items.splice(0, 0, ['puffer', 'Reliever puffer', 'puffer', 'Every session, no exceptions']);
    App.sheet('Pack your bag', '<p class="muted">Tick them off as they go in. Packing the night before makes tomorrow easy.</p><div class="checklist">' + items.map((it) => '<button class="check' + (st[it[0]] ? ' is-on' : '') + '" data-act="packToggle" data-v="' + it[0] + '"><span class="check__box">' + icon('check', 'ic-sm') + '</span>' + icon(it[2]) + '<span class="grow">' + esc(it[1]) + (it[3] ? '<span class="check__sub">' + esc(it[3]) + '</span>' : '') + '</span></button>').join('') + '</div>');
  }
  function gameplanSheet(type, eventId) {
    const gp = D.GAMEPLANS[type]; if (!gp) return;
    const p = S().profile;
    const persian = (p.dishes || []).some((id) => (D.DISHES.find((d) => d.id === id) || {}).cuisine === 'Persian');
    const sweets = (p.derailers || []).includes('sweets');
    const ev = eventId ? S().events.find((e) => e.id === eventId) : null;
    const parts = gp.parts.filter((x) => !x.sweets || sweets || type === 'gathering').map((x) => {
      const items = persian && x.persian ? x.persian.concat(x.items.slice(x.persian.length >= 2 ? 2 : 0)) : x.items;
      return '<div class="gp-section"><h4>' + esc(x.h) + '</h4><ul class="bullets bullets--green">' + items.map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul></div>';
    }).join('');
    const t = today();
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(t, i));
    const foot = ev
      ? '<button class="btn btn--block' + (ev.planned ? ' btn--soft' : ' btn--green') + '" data-act="gpPlanned" data-v="' + ev.id + '">' + icon('check') + (ev.planned ? 'Planned. Good luck!' : 'I’ve got my plan') + '</button>'
      : '<div class="field"><div class="field__label">Add it to your week</div><div class="chips">' + days.map((d) => '<button class="chip chip--sm" data-act="gpAdd" data-v="' + type + '|' + d + '">' + esc(rel(d)) + '</button>').join('') + '</div></div>';
    App.sheet(esc(ev ? ev.title : gp.title), '<div class="banner banner--' + gp.color + '">' + icon(gp.icon) + '<div>' + esc(gp.intro) + '</div></div>' + parts +
      '<button class="tip" data-act="coachAsk" data-v="' + (type === 'gathering' ? 'gathering' : type === 'takeaway' ? 'takeaway' : 'eatingout') + '" style="text-align:left"><span class="tip__icon">' + icon('chat', 'ic-sm') + '</span><span class="grow"><span class="tip__text">Questions about it? Ask Spotter.</span></span></button>', { foot });
  }
  function weekendSheet() {
    const wk = weekStart(today());
    const cur = S().weekends[wk] || { on: [], fun: '', move: '' };
    App._wk = JSON.parse(JSON.stringify(cur));
    renderWeekend();
  }
  function renderWeekend(replace) {
    const w = App._wk;
    const on = [['gathering', 'Family gathering'], ['eatingout', 'Eating out'], ['takeaway', 'Takeaway night'], ['home', 'Quiet one at home']];
    const fun = ['Friday dinner', 'Saturday lunch', 'Saturday dinner', 'Sunday lunch', 'Sunday dinner'];
    const move = ['A long walk', 'A swim', 'A bike ride', 'A hike', 'An extra gym session'];
    const body =
      '<p class="muted">Pick your fun meal, keep everything else normal, and plan one active thing. That’s the whole trick.</p>' +
      '<div class="field"><div class="field__label">What’s on this weekend?</div><div class="chips">' + on.map((o) => '<button class="chip' + (w.on.includes(o[0]) ? ' is-on' : '') + '" data-act="wkOn" data-v="' + o[0] + '">' + esc(o[1]) + '</button>').join('') + '</div></div>' +
      '<div class="field"><div class="field__label">Your one fun meal</div><div class="chips">' + fun.map((f) => '<button class="chip' + (w.fun === f ? ' is-on' : '') + '" data-act="wkFun" data-v="' + esc(f) + '">' + esc(f) + '</button>').join('') + '</div></div>' +
      '<div class="field"><div class="field__label">One active thing</div><div class="chips">' + move.map((f) => '<button class="chip' + (w.move === f ? ' is-on' : '') + '" data-act="wkMove" data-v="' + esc(f) + '">' + esc(f) + '</button>').join('') + '</div></div>';
    const foot = '<button class="btn btn--block btn--green" data-act="wkSave"' + (w.fun ? '' : ' disabled') + '>' + icon('check') + 'Save my weekend plan</button>';
    if (replace) { App.replaceSheetBody(body); const f = App.topLayer().querySelector('.sheet__foot'); if (f) f.innerHTML = foot; }
    else App.sheet('Weekend game plan', body, { foot });
  }
  function mealSheet(id) {
    const d = D.DISHES.find((x) => x.id === id); if (!d) return;
    App.sheet(esc(d.name), '<div class="banner banner--green">' + icon('leaf') + '<div>Keep the flavour, lighten the load. These are general healthy-eating ideas, not a diet.</div></div>' +
      '<div class="gp-section"><h4>Make it lighter</h4><ul class="bullets bullets--green">' + d.lighter.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' +
      '<div class="gp-section"><h4>On your plate</h4><div class="card card--flat">' + esc(d.plate) + '</div></div>' +
      '<div class="hands">' + D.HAND_PORTIONS.map((h) => '<div class="hand"><span class="hand__part">' + esc(h.part) + '</span><span class="hand__food">' + esc(h.food) + '</span></div>').join('') + '</div>');
  }
  function installSheet() {
    App.sheet('Add to your Home Screen', '<p class="muted">Spotter works best as an app on your iPhone. It opens full screen, works offline, and your iPhone keeps your progress safe.</p>' +
      '<ol class="ios-steps"><li>Open this page in Safari</li><li>Tap the Share button (the square with an arrow)</li><li>Scroll down and tap “Add to Home Screen”</li><li>Tap Add. Spotter is now on your Home Screen</li></ol>' +
      '<div class="tip"><span class="tip__icon">' + icon('info', 'ic-sm') + '</span><div class="tip__text">Safari can clear data for websites you haven’t opened in a while. Once Spotter is on your Home Screen, that doesn’t happen.</div></div>',
      { foot: '<button class="btn btn--block btn--soft" data-act="dismissInstall">Done, hide this tip</button>' });
  }

  // Weekly check-in: three short steps, then next week's plan.
  function checkinSheet() { App._ci = { step: 0, well: [], hard: [], next: [], day: {} }; renderCheckin(); }
  function renderCheckin(replace) {
    const c = App._ci; const t = today(); const wk = weekStart(t);
    const plan = S().plan;
    let body = ''; let foot = '';
    if (c.step === 0) {
      const done = E.sessionsInWeek(wk); const tgt = E.targetInWeek(wk) || plan.days.length; const fs = E.foodScore(wk);
      body = '<p class="muted">Here’s your week at a glance.</p><div class="rings">' +
        '<div class="ring-stat">' + ring(tgt ? done / tgt : 0, 'var(--blue)', done, '/' + tgt) + '<div class="ring-stat__name">Sessions</div></div>' +
        '<div class="ring-stat">' + ring(fs / 5, 'var(--green)', App.fmtKg(fs), '/5') + '<div class="ring-stat__name">Food days</div></div>' +
        '<div class="ring-stat">' + ring(1, 'var(--yellow)', E.streakWeeks(), 'wk') + '<div class="ring-stat__name">Streak</div></div></div>' +
        '<p style="font-weight:700;text-align:center">' + (done >= tgt ? 'Every session done. Proper work.' : done ? 'You showed up. Let’s make next week even smoother.' : 'A quiet week. That’s okay, next week is a fresh start.') + '</p>';
      foot = '<button class="btn btn--block" data-act="ciNext">Continue' + icon('arrow') + '</button>';
    } else if (c.step === 1) {
      const well = ['Showed up', 'Food on track', 'Lifted more', 'Felt good', 'Planned ahead', 'Slept well'];
      const hard = ['Finding time', 'Motivation', 'Food', 'The weekend', 'Feeling sore', 'Busy gym'];
      body = '<div class="field"><div class="field__label">What went well?</div><div class="chips">' + well.map((x) => '<button class="chip' + (c.well.includes(x) ? ' is-on' : '') + '" data-act="ciPick" data-v="well|' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div></div>' +
        '<div class="field"><div class="field__label">What was hard?</div><div class="chips">' + hard.map((x) => '<button class="chip' + (c.hard.includes(x) ? ' is-on' : '') + '" data-act="ciPick" data-v="hard|' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div></div>';
      foot = '<button class="btn btn--block" data-act="ciNext">Continue' + icon('arrow') + '</button>';
    } else if (c.step === 2) {
      const next = [['gathering', 'Family gathering'], ['eatingout', 'Eating out'], ['takeaway', 'Takeaway night'], ['busy', 'Busy week'], ['none', 'Nothing special']];
      const nextWk = addDays(wk, 7);
      body = '<div class="field"><div class="field__label">Anything coming up next week?</div><div class="chips">' + next.map((x) => '<button class="chip' + (c.next.includes(x[0]) ? ' is-on' : '') + '" data-act="ciPick" data-v="next|' + x[0] + '">' + esc(x[1]) + '</button>').join('') + '</div></div>' +
        c.next.filter((x) => ['gathering', 'eatingout', 'takeaway'].includes(x)).map((x) => '<div class="field"><div class="field__label">Which day is the ' + esc(D.GAMEPLANS[x].title.toLowerCase()) + '?</div><div class="chips">' + [0, 1, 2, 3, 4, 5, 6].map((i) => { const d = addDays(nextWk, i); return '<button class="chip chip--sm' + (c.day[x] === d ? ' is-on' : '') + '" data-act="ciDay" data-v="' + x + '|' + d + '">' + DOW[i] + '</button>'; }).join('') + '</div></div>').join('');
      foot = '<button class="btn btn--block" data-act="ciNext">See next week' + icon('arrow') + '</button>';
    } else {
      const adj = nextWeekAdjustments(c);
      body = '<p class="muted">Here’s next week, set up from what you told me and what you logged.</p><div class="list">' + adj.map((a) => '<div class="list-item"><span class="list-item__icon tone-' + a.tone + '">' + icon(a.icon) + '</span><div class="grow"><div class="list-item__title">' + esc(a.title) + '</div><div class="list-item__sub">' + esc(a.sub) + '</div></div></div>').join('') + '</div>';
      foot = '<button class="btn btn--block btn--green" data-act="ciSave">' + icon('check') + 'Lock it in</button>';
    }
    if (replace) { App.replaceSheetBody(body); const f = App.topLayer().querySelector('.sheet__foot'); if (f) f.innerHTML = foot; }
    else App.sheet('Sunday check-in', body, { foot });
  }
  function nextWeekAdjustments(c) {
    const plan = S().plan; const wk = weekStart(today()); const nextWk = addDays(wk, 7);
    const out = [];
    const slots = plan.slots.filter((s) => { const d = E.slotDate(s); return d >= nextWk && d <= addDays(nextWk, 6) && !E.isSkipped(s); });
    out.push({ icon: 'calendar', tone: 'blue', title: slots.length ? slots.map((s) => plan.sessions[s.key].name + ' ' + DOW[dow(E.slotDate(s))]).join(' · ') : 'No sessions planned', sub: c.hard.includes('Finding time') ? 'Time was tight. Pack your bag the night before and treat it like a meeting.' : 'Same rhythm as this week.' });
    const ups = [];
    S().log.slice(-plan.days.length).forEach((l) => l.ex.forEach((e) => { const sg = E.suggest(e.id); if (sg.mode === 'up' && D.EX[e.id].unit === 'kg') ups.push(D.EX[e.id].name + ' → ' + sg.title); }));
    if (ups.length) out.push({ icon: 'up', tone: 'yellow', title: 'Going up', sub: ups.slice(0, 3).join(' · ') });
    ['gathering', 'eatingout', 'takeaway'].forEach((x) => { if (c.next.includes(x)) out.push({ icon: D.GAMEPLANS[x].icon, tone: D.GAMEPLANS[x].color, title: D.GAMEPLANS[x].title + (c.day[x] ? ' · ' + DOW[dow(c.day[x])] : ''), sub: 'Game plan ready. I’ll remind you the day before.' }); });
    if (c.hard.includes('The weekend') || c.hard.includes('Food')) out.push({ icon: 'leaf', tone: 'green', title: 'Friday weekend plan', sub: 'I’ll nudge you on Friday to pick your fun meal.' });
    if (c.hard.includes('Feeling sore')) out.push({ icon: 'info', tone: 'blue', title: 'Soreness', sub: 'Normal early on. A 20-minute walk on rest days helps it settle.' });
    if (c.hard.includes('Motivation')) out.push({ icon: 'flame', tone: 'red', title: 'Your why', sub: S().profile.why || 'Remember what you’re working towards.' });
    if (c.next.includes('busy')) out.push({ icon: 'clock', tone: 'blue', title: 'Busy week plan', sub: 'If time runs short, do the first three exercises. A short session still counts.' });
    return out;
  }

  function meSheet() {
    const p = S().profile; const plan = S().plan; const lp = E.levelProgress(S().xp);
    const rw = S().rewards || D.DEFAULT_REWARDS;
    const timeL = (D.TIMES.find((x) => x.id === plan.time) || {}).label || '';
    const theme = S().settings.theme;
    const body =
      '<div class="me-head"><span class="avatar">' + esc(firstName().charAt(0).toUpperCase()) + '</span><div class="grow"><div style="font-size:22px;font-weight:800">' + esc(p.name) + '</div><div class="muted t-sm">' + esc(D.LEVELS[lp.level].name) + ' · ' + S().xp.toLocaleString('en-AU') + ' XP</div></div></div>' +
      '<div class="card"><div class="row row--between" style="margin-bottom:12px"><div class="list-item__title">Your plan</div><button class="btn btn--plain btn--sm" data-act="editPlan">Change' + icon('right', 'ic-sm') + '</button></div><dl class="kv">' +
        '<dt>Gym</dt><dd>' + esc(E.gymName(plan.gymId)) + '</dd>' +
        '<dt>Days</dt><dd>' + esc(plan.days.map((d) => App.DOW_LONG[d]).join(', ')) + '</dd>' +
        '<dt>Time</dt><dd>' + esc(timeL) + ' · ' + plan.mins + ' min</dd>' +
        '<dt>Plan</dt><dd>' + esc(fmtDate(plan.start, 'dm')) + ' – ' + esc(fmtDate(plan.end, 'dm')) + ' (' + plan.weeks + ' wks)</dd>' +
        (p.event ? '<dt>Goal</dt><dd>' + esc(p.event.name) + ' · ' + esc(fmtDate(p.event.date, 'dm')) + '</dd>' : '') +
      '</dl></div>' +
      '<div class="card"><div class="list-item__title">Rewards from your partner</div><p class="t-sm muted" style="margin:4px 0 12px">Unlocked by finishing sessions. Make them something to look forward to.</p>' +
        [2, 4, 6].filter((w) => w <= plan.weeks).map((w) => '<div class="field" style="margin-bottom:10px"><label class="field__label" for="rw' + w + '">Week ' + w + ' · after ' + plan.days.length * w + ' sessions</label><input id="rw' + w + '" class="input" style="font-size:16px" data-in="reward" data-w="' + w + '" value="' + esc(rw[w] || '') + '" placeholder="e.g. A massage"></div>').join('') + '</div>' +
      '<div class="card"><div class="list-item__title" style="margin-bottom:8px">Health</div><dl class="kv"><dt>Asthma</dt><dd>' + (p.health.asthma ? 'Yes · puffer reminders on' : 'No') + '</dd><dt>Screening</dt><dd>' + (p.health.flag ? (p.health.cleared ? 'Cleared by GP' : 'See your GP first') : 'All clear') + '</dd></dl>' +
        (p.health.asthma ? '<p class="t-sm muted" style="margin-top:12px">If your chest tightens: stop, use your reliever as your asthma action plan says. If symptoms come back a second time, stop for the day. In an emergency call 000.</p>' : '') + '</div>' +
      '<div class="card"><div class="list-item__title" style="margin-bottom:6px">Settings</div>' +
        '<div class="list-item"><span class="grow"><span class="list-item__title">Sounds</span><br><span class="list-item__sub">Little chimes for sets and rewards</span></span><button class="switch' + (S().settings.sound ? ' is-on' : '') + '" data-act="toggleSound" role="switch" aria-checked="' + S().settings.sound + '" aria-label="Sounds"></button></div>' +
        '<div class="list-item" style="display:grid;gap:10px"><span class="list-item__title">Appearance</span><div class="seg">' + [['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map((o) => '<button class="seg__btn' + (theme === o[0] ? ' is-on' : '') + '" data-act="setTheme" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div></div>' +
        '<div class="list-item"><span class="grow"><span class="list-item__title">Reminders</span><br><span class="list-item__sub">Notifications arrive with the App Store version</span></span><span class="pill tone-blue">Soon</span></div>' +
        '<button class="list-item" data-act="openInstall"><span class="grow"><span class="list-item__title">Add to Home Screen</span><br><span class="list-item__sub">Use Spotter like an app on your iPhone</span></span>' + icon('right', 'ic-sm') + '</button>' +
      '</div>' +
      '<div class="card"><div class="list-item__title">Back up your progress</div><p class="t-sm muted" style="margin:4px 0 12px">Everything stays on this phone. Copy a backup code to keep it somewhere safe, or paste one to restore.</p>' +
        '<div class="row"><button class="btn btn--sm btn--soft" data-act="copyBackup">' + icon('copy', 'ic-sm') + 'Copy backup code</button><button class="btn btn--sm btn--ghost" data-act="showRestore">Restore</button></div>' +
        '<div data-restore hidden style="margin-top:12px;display:grid;gap:8px"><label class="visually-hidden" for="restoreCode">Backup code</label><textarea id="restoreCode" class="input code" placeholder="Paste your backup code"></textarea><button class="btn btn--sm" data-act="restoreBackup">Restore from code</button></div>' +
      '</div>' +
      '<div class="card"><div class="list-item__title">Prototype tools</div><p class="t-sm muted" style="margin:4px 0 12px">For trying Spotter out. Jump ahead a few days to see how the plan reacts, or fill in example progress.</p>' +
        '<div class="field"><div class="field__label">Pretend today is</div><div class="seg">' + [[0, 'Real'], [1, '+1 day'], [3, '+3'], [7, '+1 wk']].map((o) => '<button class="seg__btn' + (S().dev.offset === o[0] ? ' is-on' : '') + '" data-act="timeTravel" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div></div>' +
        '<div class="row" style="margin-top:12px;flex-wrap:wrap"><button class="btn btn--sm btn--soft" data-act="demoProgress">' + icon('sparkle', 'ic-sm') + 'Fill example progress</button><button class="btn btn--sm btn--ghost" data-act="resetAsk" style="color:var(--red-text)">Start over</button></div>' +
      '</div>' +
      '<div class="card card--flat"><div class="list-item__title">About this prototype</div><ul class="bullets" style="margin-top:10px">' +
        '<li>Plans, sessions, weight suggestions, food check-ins, rewards and the coach all work.</li>' +
        '<li>Machine photos and locations arrive after each gym is mapped in person.</li>' +
        '<li>A live human coach, notifications and syncing between phones come with the full app.</li>' +
        '<li>General guidance only. It doesn’t replace advice from your GP.</li></ul></div>';
    App.sheet('You', body);
  }

  // ── Celebrations (queued so they never overlap) ───────────────────────────
  function celebrate() {
    if (!App.Q.length || App.topLayer() || document.querySelector('.rest')) return;
    const it = App.Q.shift();
    let html = '';
    if (it.t === 'badge') {
      const b = D.BADGES.find((x) => x.id === it.id);
      const col = { blue: 'var(--blue)', red: 'var(--red)', yellow: 'var(--yellow)', green: 'var(--green)', gold: 'var(--gold)' }[b.tone];
      html = '<div class="modal"><div class="medal"><div class="rays"></div><div class="medal__spin">' + medal(col, b.icon, b.tone === 'yellow' || b.tone === 'gold') + '</div><div class="medal__shine"></div></div>' +
        '<div class="eyebrow">Badge unlocked</div><h2 class="modal__title display">' + esc(b.name) + '</h2><p class="modal__text">' + esc(b.desc) + '</p><button class="btn" data-act="closeLayer">Nice!</button></div>';
      App.sound('badge'); App.haptic([20, 40, 20]); setTimeout(() => App.confetti('stars'), 350);
    } else if (it.t === 'level') {
      const L = D.LEVELS[it.level];
      html = '<div class="modal"><div class="medal"><div class="rays"></div><div class="medal__spin">' + App.levelPlate(it.level, '') + '</div><div class="medal__shine"></div></div>' +
        '<div class="eyebrow">Level ' + (it.level + 1) + '</div><h2 class="modal__title display">You earned the ' + esc(L.name.toLowerCase()) + '</h2><p class="modal__text">' + (D.LEVELS[it.level + 1] ? 'Next up: the ' + esc(D.LEVELS[it.level + 1].name.toLowerCase()) + ' at ' + D.LEVELS[it.level + 1].xp.toLocaleString('en-AU') + ' XP.' : 'The top plate. You’re a regular now.') + '</p><button class="btn" data-act="closeLayer">Let’s go</button></div>';
      App.sound('level'); App.haptic([30, 50, 30, 50, 60]); setTimeout(() => App.confetti('plates'), 300);
    } else if (it.t === 'reward') {
      html = '<div class="modal"><div class="medal"><div class="rays"></div><div class="medal__spin">' + medal('var(--yellow)', 'gift', true) + '</div><div class="medal__shine"></div></div>' +
        '<div class="eyebrow">Week ' + it.week + ' reward unlocked</div><h2 class="modal__title display">' + esc(it.text) + '</h2><p class="modal__text">You earned it. Show this to your partner and claim it.</p><button class="btn" data-act="closeLayer">Claim it</button></div>';
      App.sound('success'); App.haptic([30, 60, 30]); setTimeout(() => App.confetti('fireworks'), 300);
    }
    App.openLayer(html, { modal: true });
  }
  function medal(col, ic, dark) {
    return '<svg viewBox="0 0 100 100" style="width:100%;height:100%"><circle cx="50" cy="50" r="47" fill="' + col + '"/><circle cx="50" cy="50" r="38" fill="none" stroke="' + (dark ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.55)') + '" stroke-width="3"/>' +
      '<g transform="translate(26 26) scale(2)" fill="none" stroke="' + (dark ? '#231800' : '#fff') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (icon(ic).match(/<svg[^>]*>([\s\S]*)<\/svg>/) || [])[1] + '</g></svg>';
  }

  // ── Helpers for iOS install hint ──────────────────────────────────────────
  function isIOS() { const ua = navigator.userAgent || ''; return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function standalone() { return window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); }

  App.Views = { shell, reveal, heroHtml, previewSheet, notTodaySheet, packSheet, gameplanSheet, weekendSheet, renderWeekend, mealSheet, installSheet, checkinSheet, renderCheckin, meSheet, celebrate, checkinButtons, exLine, ring, spark, miniPlate };
})();
