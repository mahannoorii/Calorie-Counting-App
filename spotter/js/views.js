/* Spotter — screens. Four tabs (Today, Train, Eat, Coach), search, and the sheets that hold
   the detail. Today shows only what matters now; everything else is one tap away. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const E = App.E;
  const { esc, icon, art, today, addDays, weekStart, rel, fmtDate, diffDays, DOW, DOW_LONG } = App;
  const S = () => App.S;

  // ── Building blocks ───────────────────────────────────────────────────────
  const chev = () => icon('right', 'cell__chev');
  function tile(ic, bg) { return '<span class="cell__tile ' + bg + '">' + icon(ic) + '</span>'; }
  function cell(o) {
    const tag = o.act ? 'button' : 'div';
    const lead = o.tile ? tile(o.tile[0], o.tile[1]) : o.art ? '<span class="cell__tile cell__tile--art">' + art(o.art) + '</span>' : (o.lead || '');
    return '<' + tag + ' class="cell' + (o.cls ? ' ' + o.cls : '') + '"' + (o.act ? ' data-act="' + o.act + '"' + (o.v != null ? ' data-v="' + esc(o.v) + '"' : '') : '') + (o.attrs || '') + '>' + lead +
      '<span class="cell__main"><span class="cell__title">' + o.title + '</span>' + (o.sub ? '<span class="cell__sub">' + o.sub + '</span>' : '') + '</span>' +
      (o.value != null && o.value !== '' ? '<span class="cell__value">' + o.value + '</span>' : '') + (o.trail || '') + (o.act && o.chev !== false ? chev() : '') + '</' + tag + '>';
  }
  function group(cells, tiles) { const c = cells.filter(Boolean); return c.length ? '<div class="group' + (tiles ? ' group--tiles' : '') + '">' + c.join('') + '</div>' : ''; }
  function sec(title, aside, inner) { return '<section class="sec"><div class="sec__h"><h2 class="sec__title">' + title + '</h2>' + (aside || '') + '</div>' + inner + '</section>'; }
  // Disclosure rows: the app's dropdowns. Open state lives for the session.
  App.discOpen = App.discOpen || {};
  function disc(id, head, panel, openByDefault) {
    const open = App.discOpen[id] != null ? App.discOpen[id] : !!openByDefault;
    return '<div class="disc' + (open ? ' is-open' : '') + '" data-disc="' + esc(id) + '">' + head.replace('<button class="cell', '<button aria-expanded="' + open + '" class="cell disc__btn') + '<div class="disc__panel">' + panel + '</div></div>';
  }
  function discHtml(id, title, panel, open, tileSpec) { return disc(id, cell({ act: 'toggleDisc', v: id, tile: tileSpec, title: esc(title) }), panel, open); }
  function btn(label, act, v, cls) { return '<button class="btn ' + (cls || '') + '" data-act="' + act + '"' + (v != null ? ' data-v="' + esc(v) + '"' : '') + '>' + label + '</button>'; }
  function clock(ms) { return new Date(ms).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, ' ').toLowerCase(); }
  function firstName() { const p = S().profile; return p && p.name ? p.name.split(' ')[0] : ''; }
  function coachGlyph() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="37 50.3" transform="rotate(-90 12 12)"/><circle cx="12" cy="12" r="3.3" fill="#fff"/></svg>'; }
  const avatarCoach = (lg) => '<span class="coach-avatar' + (lg ? ' coach-avatar--lg' : '') + '">' + coachGlyph() + '</span>';
  function curWeekNo() { const plan = S().plan; return App.clamp(Math.floor(diffDays(weekStart(plan.start), today()) / 7) + 1, 1, plan.weeks); }
  function cuisineName(id) { return ((D.MENUS[id] || D.CUISINES.find((c) => c.id === id)) || {}).name || ''; }
  function spark(vals) {
    if (vals.length < 2) return '';
    const w = 76, h = 28; const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals); const span = max - min || 1;
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * (w - 8) + 4, h - 5 - ((v - min) / span) * (h - 10)]);
    const last = pts[pts.length - 1];
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><polyline class="line" points="' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + '"/><circle class="end" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3"/></svg>';
  }

  // ── Shell ─────────────────────────────────────────────────────────────────
  const TABS = [['today', 'Today', 'today'], ['train', 'Train', 'train'], ['eat', 'Eat', 'eat'], ['coach', 'Coach', 'coach']];
  function shell() {
    const t = App.tab;
    const body = t === 'train' ? trainView() : t === 'eat' ? eatView() : t === 'coach' ? coachView() : todayView();
    return '<div class="tabview' + (App.entering ? ' is-entering' : '') + '" data-tab="' + t + '">' + body + '</div>' + tabbar();
  }
  function tabbar() {
    return '<nav class="tabbar" aria-label="Main"><div class="tabbar__inner">' + TABS.map(([id, label, ic]) =>
      '<button class="tab' + (App.tab === id ? ' is-on' : '') + '" data-act="go" data-v="' + id + '"' + (App.tab === id ? ' aria-current="page"' : '') + '>' + icon(ic) + '<span>' + label + '</span>' + (id === 'coach' ? badge() : '') + '</button>').join('') + '</div></nav>';
  }
  function badge() { const n = App.tab === 'coach' ? 0 : App.Coach.unread(); return n ? '<span class="tab__badge" data-coach-badge>' + n + '</span>' : ''; }
  function refreshBadge() {
    const b = App.$('.tab[data-v="coach"]'); if (!b) return;
    const old = b.querySelector('.tab__badge'); const html = badge();
    if (old && html && old.textContent === String(App.Coach.unread())) return;
    if (old) old.remove();
    if (html) b.insertAdjacentHTML('beforeend', html);
  }
  function header(title, eyebrow) {
    const p = S().profile;
    return '<div class="compact" aria-hidden="true">' + esc(title) + '</div>' +
      '<header class="head"><div class="head__text">' + (eyebrow ? '<div class="head__eyebrow">' + esc(eyebrow) + '</div>' : '') + '<h1 class="head__title">' + esc(title) + '</h1></div>' +
      '<button class="avatar" data-act="openProfile" aria-label="Profile and settings">' + esc((p.name || '?').charAt(0).toUpperCase()) + '</button></header>' +
      '<button class="searchbar" data-act="openSearch">' + icon('search') + '<span>Search</span></button>';
  }

  // ── Today ─────────────────────────────────────────────────────────────────
  function todayView() {
    const p = S().profile;
    let h = header('Today', fmtDate(today(), 'long')) + '<div class="page">';
    if (p.health.flag && !p.health.cleared) h += '<div class="callout">' + icon('shield') + '<div><b>Check in with your GP first.</b> You answered yes to a health question. Once they’ve given you the all-clear, you’re ready to start.<div><button class="btn btn--sm btn--tinted" data-act="healthCleared">I’ve been cleared</button></div></div></div>';
    h += '<section class="sec">' + upNextCard() + '</section>';
    h += '<section class="sec" data-coach-slot>' + coachCard() + '</section>';
    h += sec('This week', '<span class="sec__aside">Week ' + curWeekNo() + ' of ' + S().plan.weeks + '</span>', weekCard());
    h += '<section class="sec">' + group([goalCell(), rewardCell(), installCell()], true) + '</section>';
    return h + '</div>';
  }
  function upNextCard() {
    const u = E.upNext();
    let a = '';
    const more = (id) => '<button class="btn btn--tinted btn--icon" data-act="sessionOptions" data-v="' + id + '" aria-label="Session options">' + icon('more') + '</button>';
    if (u.kind === 'active') a = btn('Resume session', 'resumeSession', null, 'btn--accent');
    else if (u.kind === 'today') a = btn('Start', 'startSession', u.slot.id, 'btn--accent') + more(u.slot.id);
    else if (u.kind === 'missed') a = btn('Do it today', 'catchUp', u.slot.id, 'btn--accent') + more(u.slot.id);
    else if (u.kind === 'first' || u.kind === 'next') a = btn('Preview', 'previewSession', u.slot.id, 'btn--tinted') + more(u.slot.id);
    else a = btn('See your progress', 'openProgress', null, 'btn--tinted');
    const first = u.slot ? E.exercisesFor(u.slot.key, u.slot.week, u.slot.id)[0] : null;
    return '<div class="card upnext' + (u.kind === 'done' ? ' upnext--done' : '') + '">' +
      (first ? '<div class="upnext__art" aria-hidden="true">' + art(D.EX[first.id].art) + '</div>' : '') +
      '<div class="upnext__eyebrow">' + esc(u.eyebrow) + '</div>' +
      '<h2 class="upnext__title">' + esc(u.title) + '</h2>' +
      '<p class="upnext__sub">' + esc(u.sub) + '</p>' +
      '<div class="upnext__actions">' + a + '</div></div>';
  }

  // The latest message from the coach, answerable right here.
  let coachTyping = false;
  function coachCard() {
    const chat = S().chat; const m = App.Coach.latest();
    if (!m && !coachTyping) return '';
    const fresh = m && ((m.replies && m.replies.length) || App.iso(new Date(m.at)) === today());
    if (!fresh && !coachTyping) {
      return group([cell({ act: 'go', v: 'coach', lead: avatarCoach(), title: 'Your coach', sub: esc(m.text.split('\n')[0].slice(0, 70)) + (m.text.length > 70 ? '…' : '') })], true);
    }
    // context since the coach's previous message: your reply and anything that changed
    const li = m ? chat.lastIndexOf(m) : -1;
    let prev = -1; for (let i = li - 1; i >= 0; i--) if (chat[i].from === 'coach') { prev = i; break; }
    const ctx = li >= 0 ? chat.slice(prev + 1, li).concat(coachTyping ? chat.slice(li + 1) : []) : [];
    const notes = ctx.filter((x) => x.from === 'note').slice(-2).map((x) => '<div class="note is-instant" style="align-self:flex-start;margin:8px 0 0">' + icon('check') + esc(x.text) + '</div>').join('');
    const mine = ctx.filter((x) => x.from === 'me').slice(-1).map((x) => '<div style="display:flex;justify-content:flex-end;margin-top:10px"><span class="bubble bubble--me is-instant" style="font-size:15px;padding:7px 12px">' + esc(x.text) + '</span></div>').join('');
    const body = coachTyping
      ? (m ? '<p class="coachcard__text muted">' + esc(m.text) + '</p>' : '') + mine + '<div class="typing" aria-label="Coach is typing"><i></i><i></i><i></i></div>'
      : mine + notes + '<p class="coachcard__text">' + esc(m.text) + '</p>' + cardInline(m) + placeBox(m) + repliesHtml(m);
    return '<div class="card coachcard" data-coach-card>' +
      '<div class="coachcard__head">' + avatarCoach() + '<div class="coachcard__who"><span class="coachcard__name">Coach</span>' + (m ? '<span class="coachcard__time">' + esc(clock(m.at)) + '</span>' : '') + '</div>' +
        '<button class="btn btn--plain btn--sm" data-act="go" data-v="coach">Open chat</button></div>' + body + '</div>';
  }
  function cardInline(m) {
    if (!m.card || (m.card.type !== 'menu' && m.card.type !== 'dinners')) return '';
    return msgCard(m.card, ' is-instant').replace('<div class="msgcard is-instant">', '<div class="msgcard is-instant" style="width:100%;box-shadow:none;background:var(--fill-2);margin-top:12px">');
  }
  function placeBox(m) {
    if (App.Coach.expecting() !== 'place' || m !== App.Coach.latest()) return '';
    return '<div class="eatout" data-composer style="margin-top:14px"><div class="eatout__wrap">' + icon('search') + '<label class="vh" for="coachPlace">Restaurant name</label><input id="coachPlace" class="input" placeholder="Restaurant name" autocomplete="off" autocapitalize="words" enterkeyhint="send" data-enter="coachSend"></div><button class="btn btn--accent btn--icon" data-act="coachSend" aria-label="Send">' + icon('arrow') + '</button></div>';
  }
  function repliesHtml(m) {
    if (!m || !m.replies || !m.replies.length || App.Coach.isBusy()) return '';
    return '<div class="replies">' + m.replies.map((r, i) => '<button class="reply" data-act="coachReply" data-v="' + m.id + '|' + i + '">' + esc(r.label) + '</button>').join('') + '</div>';
  }
  function weekCard() {
    const w = E.week();
    return '<button class="card card--tap weekcard" data-act="openWeek" aria-label="This week: ' + w.train + ' of ' + w.trainMax + ' sessions, ' + App.fmtKg(w.eat) + ' of ' + w.eatMax + ' good food days">' +
      App.rings([{ pct: w.trainMax ? w.train / w.trainMax : 0, cls: 'r-train' }, { pct: w.eat / w.eatMax, cls: 'r-eat' }], 104, 14) +
      '<div class="legend"><div><div class="legend__label l-train">Train</div><div class="legend__val">' + w.train + '<small>/' + w.trainMax + ' sessions</small></div></div>' +
      '<div><div class="legend__label l-eat">Eat well</div><div class="legend__val">' + App.fmtKg(w.eat) + '<small>/' + w.eatMax + ' days</small></div></div></div>' +
      icon('right', 'cell__chev weekcard__chev') + '</button>';
  }
  function goalCell() {
    const plan = S().plan; const ev = plan.event;
    const days = Math.max(0, diffDays(today(), ev ? ev.date : plan.end));
    return cell({ act: 'openGoal', tile: [ev ? 'plane' : 'flag', 'bg-blue'], title: esc(ev ? ev.name : 'Finish line'), sub: days + ' ' + App.plural(days, 'day') + ' to go · ' + esc(fmtDate(ev ? ev.date : plan.end, 'dm')) });
  }
  function rewardCell() {
    const r = E.partnerRewards().find((x) => !x.open); if (!r) return '';
    const left = Math.max(0, r.need - E.totals().done);
    return cell({ act: 'openRewards', tile: ['gift', 'bg-gold'], title: esc(r.text), sub: left + ' more ' + App.plural(left, 'session') + ' to unlock' });
  }
  function isIOS() { const ua = navigator.userAgent || ''; return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function standalone() { return window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); }
  function installCell() {
    if (!isIOS() || standalone() || window.claude || S().seen.install) return '';
    return cell({ act: 'openInstall', tile: ['plus', 'bg-ink'], title: 'Add Spotter to your Home Screen', sub: 'Opens full screen and keeps your progress safe' });
  }

  // ── Train ─────────────────────────────────────────────────────────────────
  function slotState(sl) {
    const d = E.slotDate(sl); const t = today();
    if (E.isSkipped(sl)) return 'skip';
    if (E.isDone(sl)) return 'done';
    if (d === t) return 'today';
    if (d < t) return 'missed';
    return 'later';
  }
  function slotDot(sl, st) {
    st = st || slotState(sl);
    return '<span class="slotdot' + (st === 'done' ? ' is-done' : st === 'today' ? ' is-next' : st === 'skip' ? ' is-skip' : '') + '">' + (st === 'done' ? icon('check') : sl.key) + '</span>';
  }
  const STATE_WORD = { done: 'Done', today: 'Today', missed: 'Missed', skip: 'Skipped', later: '' };
  function trainView() {
    const s = S(); const plan = s.plan; const t = today(); const wk = weekStart(t);
    let h = header('Train', E.gymName(plan.gymId)) + '<div class="page">';
    const week = plan.slots.filter((sl) => { const d = E.slotDate(sl); return d >= wk && d <= addDays(wk, 6); }).sort((a, b) => (E.slotDate(a) < E.slotDate(b) ? -1 : 1));
    const inner = week.length
      ? group(week.map((sl) => { const st = slotState(sl); return cell({ act: 'previewSession', v: sl.id, lead: slotDot(sl, st), title: esc(E.sessionName(sl)), sub: esc(DOW_LONG[App.dow(E.slotDate(sl))] + ' · ' + plan.sessions[sl.key].title), value: STATE_WORD[st] }); }), true)
      : '<div class="callout callout--blue">' + icon('calendar') + '<div>' + (plan.start > t ? 'Your plan starts ' + esc(fmtDate(plan.start, 'long')) + '.' : 'No sessions this week.') + '</div></div>';
    h += sec('This week', '<span class="sec__aside">Week ' + curWeekNo() + ' of ' + plan.weeks + '</span>', inner);
    // The whole plan, a week per dropdown.
    const weeks = [];
    for (let w = 1; w <= plan.weeks; w++) {
      const ws = addDays(weekStart(plan.start), (w - 1) * 7);
      const slots = plan.slots.filter((sl) => sl.week === w);
      const done = slots.filter((sl) => E.isDone(sl)).length;
      const ph = E.phaseFor(w, plan);
      const head = cell({ act: 'toggleDisc', v: 'week' + w, title: 'Week ' + w + (w === curWeekNo() && plan.start <= t ? ' <span class="tag tag--pick" style="margin-left:6px;vertical-align:2px">Now</span>' : ''), sub: esc(ph.name + ' · ' + fmtDate(ws, 'dm') + ' – ' + fmtDate(addDays(ws, 6), 'dm')), value: slots.length ? done + '/' + slots.length : '' });
      const panel = slots.length ? slots.map((sl) => { const st = slotState(sl); return '<button class="slotline" data-act="previewSession" data-v="' + sl.id + '">' + slotDot(sl, st) + '<span class="cell__main"><span class="cell__title">' + esc(E.sessionName(sl)) + '</span><span class="cell__sub">' + esc(fmtDate(E.slotDate(sl), 'short')) + '</span></span><span class="cell__value" style="font-size:15px">' + STATE_WORD[st] + '</span>' + chev() + '</button>'; }).join('') : '<p class="muted" style="font-size:15px">Rest week.</p>';
      weeks.push(disc('week' + w, head, panel));
    }
    h += sec('Your plan', '<span class="sec__aside">' + esc(E.phaseFor(curWeekNo(), plan).name) + '</span>', '<div class="group">' + weeks.join('') + '</div>');
    // Progress, summarised; the detail is a tap away.
    const tot = E.totals(); const streak = E.streakWeeks(); const best = bestLift();
    const earned = Object.keys(s.awards).length;
    h += sec('Progress', '<button class="sec__link" data-act="openProgress">See all</button>', group([
      cell({ act: 'openProgress', tile: ['check', 'bg-accent'], title: 'Sessions', value: tot.done + ' of ' + tot.total }),
      cell({ act: 'streakInfo', tile: ['flame', 'bg-red'], title: 'Weeks on target', value: streak + ' in a row' }),
      best ? cell({ act: 'openExercise', v: best.id, tile: ['trend', 'bg-green'], title: esc(D.EX[best.id].name), sub: 'Your biggest jump so far', value: '<span class="delta">+' + App.fmtKg(best.d) + ' kg</span>' }) : '',
      cell({ act: 'openAwards', tile: ['star', 'bg-gold'], title: 'Awards', value: earned + ' of ' + D.AWARDS.length }),
    ], true));
    h += sec('More', '', group([
      cell({ act: 'openLibrary', tile: ['list', 'bg-blue'], title: 'Exercise guide', sub: 'How to set up and do every move' }),
      cell({ act: 'openGym', tile: ['pin', 'bg-purple'], title: 'Your gym', sub: esc(E.gymName(plan.gymId)) }),
      cell({ act: 'openPack', tile: ['bag', 'bg-teal'], title: 'Pack your bag', sub: 'What to bring each session' }),
    ], true));
    return h + '</div>';
  }
  function bestLift() {
    const h = E.liftHistory();
    return Object.keys(h).filter((id) => D.EX[id].unit === 'kg' && !D.EX[id].assist && h[id].length > 1).map((id) => ({ id, d: h[id][h[id].length - 1].v - h[id][0].v })).filter((x) => x.d > 0).sort((a, b) => b.d - a.d)[0] || null;
  }

  // ── Eat ───────────────────────────────────────────────────────────────────
  const FOOD_WORD = { on: 'On track', part: 'Partly', off: 'Off track' };
  function eatView() {
    const w = E.week();
    let h = header('Eat', App.fmtKg(w.eat) + ' of ' + w.eatMax + ' good days this week') + '<div class="page">';
    h += '<section class="sec">' + foodCard() + '</section>';
    h += sec('Eating out', '', eatOutBox() + placesList());
    h += sec('This week’s dinners', '<button class="sec__link" data-act="shuffleDinners">Shuffle</button>', dinnersList());
    h += sec('Big meal coming up?', '', momentsList());
    return h + '</div>';
  }
  function foodCard() {
    const t = today(); const f = S().food[t]; const wk = weekStart(t);
    const dots = [0, 1, 2, 3, 4, 5, 6].map((i) => { const d = addDays(wk, i); const x = S().food[d]; return '<div class="daydot' + (x ? ' is-' + x.s : '') + (d === t ? ' is-today' : '') + '"><i></i>' + DOW[i].charAt(0) + '</div>'; }).join('');
    return '<div class="card foodcard"><div><div class="foodcard__title">' + (f ? 'Today: ' + FOOD_WORD[f.s].toLowerCase() : 'How’s eating going today?') + '</div><div class="muted" style="font-size:15px;margin-top:2px">' + (f ? 'Tap again to change it.' : 'One tap. Honest beats perfect.') + '</div></div>' +
      '<div class="seg seg--lg" role="group" aria-label="Today’s eating">' + ['on', 'part', 'off'].map((v) => '<button class="seg__btn' + (f && f.s === v ? ' is-on' : '') + '" data-act="foodLog" data-v="' + v + '">' + FOOD_WORD[v] + '</button>').join('') + '</div>' +
      '<div class="daydots" aria-hidden="true">' + dots + '</div></div>';
  }
  function eatOutBox() {
    return '<div class="eatout"><div class="eatout__wrap">' + icon('search') + '<label class="vh" for="eatOutIn">Restaurant name</label><input id="eatOutIn" class="input" placeholder="Where are you eating?" autocomplete="off" autocapitalize="words" enterkeyhint="go" data-enter="eatOutGo"></div>' +
      '<button class="btn btn--accent btn--icon" data-act="eatOutGo" aria-label="Get my order">' + icon('arrow') + '</button></div>' +
      '<p class="fn">Type the place. I’ll put the menu in front of you with your order already picked.</p>';
  }
  function lockedToday(name) { return S().events.some((e) => e.type === 'eatout' && e.date === today() && e.title.toLowerCase() === String(name).toLowerCase()); }
  function placesList() {
    const pl = S().places.slice(0, 4);
    if (!pl.length) return '';
    return '<div class="sec__label">Recent</div>' + group(pl.map((x) => cell({ act: 'openMenu', v: x.name + '|' + x.cuisine, tile: ['pin', 'bg-red'], title: esc(x.name), sub: esc(cuisineName(x.cuisine)) + (lockedToday(x.name) ? ' · locked in today' : '') })), true);
  }
  function dinnersList() {
    const t = today();
    return group(E.dinners().map((x) => cell({ act: 'openMeal', v: x.meal.id, lead: '<span class="daytag' + (x.day === t ? ' is-today' : '') + '">' + DOW[App.dow(x.day)] + '</span>', title: esc(x.meal.name), sub: esc(cuisineName(x.meal.c)) })));
  }
  function momentsList() {
    const t = today();
    const up = S().events.filter((e) => e.date >= t && e.type !== 'eatout').sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 3);
    const plans = group(Object.keys(D.MOMENTS).map((k) => cell({ act: 'openMoment', v: k, tile: [D.MOMENTS[k].icon, 'bg-ink'], title: esc(D.MOMENTS[k].title), sub: 'A simple plan for it' })), true);
    if (!up.length) return plans;
    return '<div class="sec__label">Coming up</div>' + group(up.map((e) => cell({ act: 'openMoment', v: e.type, tile: [(D.MOMENTS[e.type] || {}).icon || 'calendar', 'bg-green'], title: esc(e.title), sub: esc(rel(e.date)) + ' · planned' })), true) +
      '<div class="sec__label" style="margin-top:8px">Plan for</div>' + plans;
  }

  // ── Coach ─────────────────────────────────────────────────────────────────
  function coachView() {
    return '<div class="coachview"><header class="coachhead">' + avatarCoach(true) + '<div class="coachhead__main"><div class="coachhead__name">Coach</div><div class="coachhead__sub">Your trainer</div></div>' +
      '<button class="avatar" data-act="openProfile" aria-label="Profile and settings">' + esc((firstName() || '?').charAt(0).toUpperCase()) + '</button></header>' +
      '<div class="thread" data-coach-thread aria-live="polite">' + threadHtml() + '</div></div>' +
      '<div class="dock"><div class="dock__inner">' + dockHtml('tab') + '</div></div>';
  }
  const shownMsgs = new Set();
  function threadHtml() {
    const chat = S().chat; let h = ''; let lastDay = '';
    const nowMs = App.nowMs();
    chat.forEach((m) => {
      const d = App.iso(new Date(m.at));
      if (d !== lastDay) { h += '<div class="dayline">' + esc(rel(d)) + ' <span>' + esc(clock(m.at)) + '</span></div>'; lastDay = d; }
      const inst = shownMsgs.has(m.id) || nowMs - m.at > 5000 ? ' is-instant' : '';
      shownMsgs.add(m.id);
      if (m.from === 'note') h += '<div class="note' + inst + '">' + icon('check') + esc(m.text) + '</div>';
      else if (m.from === 'me') h += '<div class="bubble bubble--me' + inst + '">' + esc(m.text) + '</div>';
      else { h += '<div class="bubble bubble--coach' + (m.urgent ? ' bubble--urgent' : '') + inst + '">' + esc(m.text) + '</div>'; if (m.card) h += msgCard(m.card, inst); }
    });
    if (coachTyping) h += '<div class="typing" aria-label="Coach is typing"><i></i><i></i><i></i></div>';
    return h;
  }
  function msgCard(c, inst) {
    if (c.type === 'session') {
      const sl = E.slotById(c.slot); if (!sl) return '';
      const exs = E.exercisesFor(sl.key, sl.week, sl.id);
      return '<div class="msgcard' + inst + '"><div><div class="msgcard__eyebrow">' + esc(rel(E.slotDate(sl))) + ' · ' + esc(E.timeOf(S().plan.time).at) + '</div><div class="msgcard__title">' + esc(E.sessionName(sl) + ' · ' + S().plan.sessions[sl.key].title) + '</div></div>' +
        '<ul class="msgcard__list">' + exs.map((e, i) => '<li><span class="n">' + (i + 1) + '</span>' + esc(D.EX[e.id].name) + '</li>').join('') + '</ul>' + btn('Preview', 'previewSession', sl.id, 'btn--sm btn--tinted') + '</div>';
    }
    if (c.type === 'menu') {
      const M = D.MENUS[c.cuisine]; if (!M) return '';
      const scanned = placeMenu(c.place);
      const picks = scanned ? scanned.picks : M.items.filter((it) => it.t === 'pick').slice(0, 3);
      return '<div class="msgcard' + inst + '"><div><div class="msgcard__eyebrow">' + esc(M.name) + (scanned ? ' · from their menu' : ' · your order') + '</div><div class="msgcard__title">' + esc(c.place || M.name) + '</div></div>' +
        '<ul class="msgcard__list">' + picks.map((it, i) => '<li><span class="n">' + (i + 1) + '</span>' + esc(it.n) + '</li>').join('') + '</ul>' + btn('Full menu', 'openMenu', c.place + '|' + c.cuisine, 'btn--sm btn--tinted') + '</div>';
    }
    if (c.type === 'dinners') {
      return '<div class="msgcard' + inst + '"><div><div class="msgcard__eyebrow">This week</div><div class="msgcard__title">Your dinners</div></div><ul class="msgcard__list">' +
        E.dinners().map((x) => '<li><span class="d">' + DOW[App.dow(x.day)] + '</span>' + esc(x.meal.name) + '</li>').join('') + '</ul></div>';
    }
    return '';
  }
  const TOPICS = [['eatout', 'I’m eating out'], ['sore', 'I’m sore'], ['short', 'Short on time'], ['move', 'Move a session'], ['motivation', 'Not feeling it'], ['progress', 'How am I going?']];
  function topics(where) {
    if (where !== 'session') return TOPICS;
    const t = [['taken', 'Machine’s taken'], ['weight', 'What weight?'], ['pain', 'Something hurts'], ['sore', 'I’m sore']];
    if (S().profile.health.asthma) t.splice(3, 0, ['asthma', 'My chest is tight']);
    return t;
  }
  function dockRepliesHtml(where) {
    if (App.Coach.isBusy() || coachTyping) return '';
    const m = App.Coach.latest();
    if (m && m.replies && m.replies.length) return '<div class="replies">' + m.replies.map((r, i) => '<button class="reply" data-act="coachReply" data-v="' + m.id + '|' + i + '">' + esc(r.label) + '</button>').join('') + '</div>';
    return '<div class="replies replies--topics">' + topics(where).map(([k, label]) => '<button class="reply" data-act="coachTopic" data-v="' + k + '" data-label="' + esc(label) + '">' + esc(label) + '</button>').join('') + '</div>';
  }
  function dockHtml(where) {
    return '<div data-coach-replies="' + where + '">' + dockRepliesHtml(where) + '</div>' +
      '<div class="composer" data-composer><label class="vh" for="coachIn-' + where + '">Message your coach</label><input id="coachIn-' + where + '" data-coach-input placeholder="Message your coach" autocomplete="off" enterkeyhint="send" data-enter="coachSend"><button class="send" data-act="coachSend" aria-label="Send">' + icon('send') + '</button></div>';
  }
  // Coach updates land in place: the thread, the reply chips, Today's card and the badge.
  function refreshCoach() {
    App.$$('[data-coach-thread]').forEach((el) => { el.innerHTML = threadHtml(); });
    App.$$('[data-coach-replies]').forEach((el) => { el.innerHTML = dockRepliesHtml(el.dataset.coachReplies); });
    const slot = App.$('[data-coach-slot]'); if (slot) slot.innerHTML = coachCard();
    const sheetThread = App.$('.sheet [data-coach-thread]');
    if (sheetThread) { const b = sheetThread.closest('.sheet__body'); if (b) b.scrollTo({ top: b.scrollHeight, behavior: App.reduceMotion() ? 'auto' : 'smooth' }); }
    if (App.tab === 'coach' && App.$('.tabview[data-tab="coach"]') && !App.ob.active) window.scrollTo({ top: document.documentElement.scrollHeight, behavior: App.reduceMotion() ? 'auto' : 'smooth' });
    if ((App.tab === 'coach' && !App.Session.isOpen()) || sheetThread) App.Coach.markRead();
    refreshBadge();
    const dot = App.$('.sx__coach'); if (dot) dot.innerHTML = icon('coach') + (App.Coach.unread() && !sheetThread ? '<span class="dot-new"></span>' : '');
  }
  function setTyping(on) { coachTyping = on; refreshCoach(); }
  function coachSheet() {
    const L = App.sheet('Coach', '<div class="thread thread--sheet" data-coach-thread aria-live="polite">' + threadHtml() + '</div>', { tall: true, foot: dockHtml('session') });
    const f = L.querySelector('.sheet__foot'); if (f) f.classList.add('sheet__foot--dock');
    const b = App.$('.sheet__body', App.topLayer()); if (b) b.scrollTop = b.scrollHeight;
    App.Coach.markRead(); refreshBadge();
  }

  // ── Search ────────────────────────────────────────────────────────────────
  const TYPE_BG = { Training: 'bg-accent', Exercises: 'bg-blue', Food: 'bg-green', Restaurants: 'bg-red', 'Ask your coach': 'bg-purple', You: 'bg-ink' };
  let searchEl = null;
  function openSearch() {
    if (searchEl) return;
    searchEl = document.createElement('div');
    searchEl.className = 'search'; searchEl.setAttribute('role', 'dialog'); searchEl.setAttribute('aria-label', 'Search');
    searchEl.innerHTML = '<div class="search__bar"><label class="search__field">' + icon('search') + '<span class="vh">Search</span><input id="searchIn" type="search" placeholder="Search" autocomplete="off" enterkeyhint="search" data-in="search" data-enter="searchEnter"></label><button class="search__cancel" data-act="closeSearch">Cancel</button></div>' +
      '<div class="search__body" data-search-body>' + searchBody('') + '</div>';
    document.body.appendChild(searchEl);
    document.body.style.overflow = 'hidden';
    setTimeout(() => { const i = App.$('#searchIn'); if (i) i.focus(); }, 30);
  }
  function closeSearch() { if (!searchEl) return; searchEl.remove(); searchEl = null; document.body.style.overflow = ''; }
  function resultCell(it) { return cell({ act: 'searchGo', v: it.id, tile: [it.icon, TYPE_BG[it.type] || 'bg-ink'], title: esc(it.title), sub: it.sub ? esc(it.sub) : '' }); }
  function searchBody(q) {
    q = String(q || '').trim();
    if (!q) {
      const sug = E.suggestions(); const rec = E.recents().filter((x) => !sug.some((y) => y.id === x.id));
      return '<div class="sec"><div class="sec__label">Suggested</div>' + group(sug.map(resultCell), true) + '</div>' +
        (rec.length ? '<div class="sec"><div class="sec__label">Recent</div>' + group(rec.map(resultCell), true) + '</div>' : '');
    }
    const res = E.search(q); const types = [];
    res.forEach((r) => { if (!types.includes(r.type)) types.push(r.type); });
    const extra = [];
    const cu = E.detectCuisine(q); const place = q === q.toLowerCase() ? q.replace(/\b([a-z])/g, (m) => m.toUpperCase()) : q;
    if (q.length >= 3 && (cu || !res.length)) extra.push(cell({ act: 'searchPlace', tile: ['fork', 'bg-red'], title: 'Order at ' + esc(place), sub: (cu ? esc(cuisineName(cu)) + ' · ' : '') + 'menu with your picks' }));
    extra.push(cell({ act: 'searchAsk', tile: ['coach', 'bg-purple'], title: 'Ask your coach', sub: '“' + esc(q) + '”' }));
    const restFirst = cu && !res.some((r) => r.type === 'Restaurants' && r.title.toLowerCase() === q.toLowerCase());
    let h = restFirst ? '<div class="sec">' + group(extra, true) + '</div>' : '';
    h += types.map((t) => '<div class="sec"><div class="sec__label">' + esc(t) + '</div>' + group(res.filter((r) => r.type === t).map(resultCell), true) + '</div>').join('');
    if (!res.length && !restFirst) h += '<p class="search__empty">Nothing in your plan matches. Try one of these:</p>';
    if (!restFirst) h += '<div class="sec">' + group(extra, true) + '</div>';
    return h;
  }
  function renderSearch(q) { const b = App.$('[data-search-body]'); if (b) b.innerHTML = searchBody(q); }

  // ── Sessions ──────────────────────────────────────────────────────────────
  function exRow(e, slotId) {
    const ex = D.EX[e.id]; const sg = E.suggest(e.id, slotId);
    const rng = ex.reps ? ex.reps[0] + '–' + ex.reps[1] + (ex.unit === 'sec' ? ' sec' : ex.perSide ? ' each side' : ' reps') : '';
    return cell({ act: 'openExercise', v: e.id, art: ex.art, title: esc(ex.name), sub: e.sets + ' sets · ' + rng, value: esc(sg.mode === 'find' ? 'Find it' : sg.title) });
  }
  function previewSheet(id) {
    const sl = E.slotById(id); if (!sl) return;
    const plan = S().plan; const d = E.slotDate(sl); const done = E.isDone(sl);
    const exs = E.exercisesFor(sl.key, sl.week, sl.id); const phase = E.phaseFor(sl.week, plan);
    const log = S().log.find((l) => l.slot === id);
    const cardio = (x, role) => cell({ act: 'openExercise', v: x.id, art: D.EX[x.id].art, title: role, sub: esc(D.EX[x.id].name) + ' · ' + x.min + ' min', value: '' });
    let body = '<div class="sheet__lead"><div class="eyebrow">' + esc(fmtDate(d, 'long')) + ' · Week ' + sl.week + '</div><h1 class="sheet__h1">' + esc(plan.sessions[sl.key].title) + '</h1></div>';
    if (done && log) body += '<div class="callout callout--green">' + icon('check') + '<div><b>Done ' + esc(App.relLow(log.date)) + '.</b> ' + log.mins + ' min · ' + App.sum(log.ex.map((e) => e.sets.length)) + ' sets · ' + Math.round(App.sum(log.ex.map((e) => App.sum(e.sets.map((x) => (x.w || 0) * x.r))))).toLocaleString('en-AU') + ' kg lifted</div></div>';
    if (S().trims[id] || S().eases[id]) body += '<div class="callout">' + icon('sliders') + '<div>' + (S().trims[id] ? 'Cut to ' + S().trims[id] + ' exercises, two sets each. ' : '') + (S().eases[id] ? 'Weights eased one step.' : '') + '</div></div>';
    body += '<div class="group group--tiles">' + cardio(plan.warmup, 'Warm-up') + exs.map((e) => exRow(e, id)).join('') + (plan.finisher ? cardio(plan.finisher, 'Finisher') : '') + '</div>';
    body += '<p class="fn"><b>' + esc(phase.name) + '.</b> ' + esc(phase.note) + ' Tap any exercise to see how it’s done.</p>';
    const canStart = !done && !S().active && !E.isSkipped(sl);
    const label = d === today() ? 'Start session' : d < today() ? 'Do it now' : 'Start it now instead';
    App.sheet(esc(E.sessionName(sl)), body, {
      foot: canStart ? btn(label, 'startSession', id, 'btn--block ' + (d <= today() ? 'btn--accent' : 'btn--tinted')) : S().active ? btn('Resume your session', 'resumeSession', null, 'btn--block btn--accent') : '',
    });
  }
  // Move, shorten, ease or skip a session. Each goes through the coach so the thread keeps the story.
  function sessionOptions(id) {
    const sl = E.slotById(id); if (!sl) return;
    const base = E.slotDate(sl) < today() ? today() : E.slotDate(sl);
    const d1 = E.freeDayAfter(base, 0); const d2 = E.freeDayAfter(d1, 0); const d3 = E.freeDayAfter(d2, 0);
    const chips = (items) => '<div class="chips">' + items.map((x) => '<button class="chip" data-act="coachAct" data-v="' + esc(x[0]) + '" data-label="' + esc(x[2]) + '">' + esc(x[1]) + '</button>').join('') + '</div>';
    const day = (d) => rel(d) === 'Tomorrow' ? 'Tomorrow' : fmtDate(d, 'short');
    const body = '<div class="sheet__lead"><div class="eyebrow">' + esc(rel(E.slotDate(sl))) + '</div><h1 class="sheet__h1">' + esc(E.sessionName(sl) + ' · ' + S().plan.sessions[sl.key].title) + '</h1></div>' +
      '<div class="group group--tiles">' +
        cell({ act: 'previewSession', v: id, tile: ['list', 'bg-blue'], title: 'See the session' }) +
        disc('opt-move', cell({ act: 'toggleDisc', v: 'opt-move', tile: ['calendar', 'bg-accent'], title: 'Move it to another day' }), chips([d1, d2, d3].map((d) => ['move|' + id + '|' + d, day(d), 'Can we move it to ' + DOW_LONG[App.dow(d)] + '?']))) +
        disc('opt-short', cell({ act: 'toggleDisc', v: 'opt-short', tile: ['clock', 'bg-teal'], title: 'Short on time' }), chips([['trim|' + id + '|3', '20 minutes', 'I’ve only got 20 minutes'], ['trim|' + id + '|4', '30 minutes', 'I’ve only got 30 minutes']])) +
        disc('opt-sore', cell({ act: 'toggleDisc', v: 'opt-sore', tile: ['heart', 'bg-red'], title: 'Feeling sore' }), chips([['ease|' + id + '|legs', 'Legs', 'My legs are sore'], ['ease|' + id + '|upper', 'Upper body', 'My upper body is sore'], ['ease|' + id + '|all', 'All over', 'I’m sore all over']])) +
        cell({ act: 'coachAct', v: 'skip|' + id, tile: ['skip', 'bg-ink'], title: 'Skip this one', attrs: ' data-label="I need to skip this one"', chev: false }) +
      '</div><p class="fn">Your coach adjusts the plan and lets you know what changed.</p>';
    App.sheet('Options', body);
  }

  // ── Week, goal, rewards, progress, awards ─────────────────────────────────
  function weekSheet() {
    const t = today(); const wk = weekStart(t); const w = E.week(wk);
    const rows = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = addDays(wk, i); const sl = E.slotsOn(d)[0] || null; const f = S().food[d];
      const st = sl ? slotState(sl) : null;
      const trainTxt = sl ? E.sessionName(sl) + (st === 'done' ? ' done' : st === 'missed' ? ' missed' : '') : 'Rest';
      const foodTag = f ? '<span class="tag ' + (f.s === 'on' ? 'tag--ok' : 'tag--treat') + '">' + FOOD_WORD[f.s] + '</span>' : '';
      return cell({ lead: '<span class="daytag' + (d === t ? ' is-today' : '') + '">' + DOW[i] + '</span>', title: esc(trainTxt), sub: sl ? esc(S().plan.sessions[sl.key].title) : '', trail: foodTag });
    });
    const body = '<div class="weekcard" style="padding:0">' + App.rings([{ pct: w.trainMax ? w.train / w.trainMax : 0, cls: 'r-train' }, { pct: w.eat / w.eatMax, cls: 'r-eat' }], 92, 12) +
      '<div class="legend"><div><div class="legend__label l-train">Train</div><div class="legend__val">' + w.train + '<small>/' + w.trainMax + '</small></div></div><div><div class="legend__label l-eat">Eat well</div><div class="legend__val">' + App.fmtKg(w.eat) + '<small>/' + w.eatMax + '</small></div></div></div></div>' +
      group(rows) + '<p class="fn">Close both rings for a perfect week: every planned session, and five good food days. “Partly” counts as half.</p>';
    App.sheet('This week', body); animateRings();
  }
  function goalSheet() {
    const p = S().profile; const plan = S().plan; const ev = plan.event;
    const days = Math.max(0, diffDays(today(), ev ? ev.date : plan.end));
    const tot = E.totals();
    const body = '<div class="sheet__lead" style="justify-items:center;text-align:center;padding-top:6px"><div class="bignum num" data-count="' + days + '">' + days + '</div><div class="muted">' + App.plural(days, 'day') + ' to ' + esc(ev ? ev.name : 'the finish line') + ' · ' + esc(fmtDate(ev ? ev.date : plan.end, 'long')) + '</div></div>' +
      '<div class="card"><div style="display:flex;justify-content:space-between;font-size:15px"><span class="muted">Sessions</span><span><b>' + tot.done + '</b> of ' + tot.total + '</span></div><div class="progressline"><i data-w="' + Math.round((tot.done / Math.max(1, tot.total)) * 100) + '"></i></div></div>' +
      (p.why || (p.feel && p.feel.length) ? '<div class="sec"><div class="sec__label">Your why</div><div class="card" style="display:grid;gap:12px">' + (p.why ? '<p class="quote">' + esc(p.why) + '</p>' : '') + (p.feel && p.feel.length ? '<p class="muted" style="font-size:15px">You want to feel ' + esc(p.feel.join(', ').toLowerCase()) + '.</p>' : '') + '</div></div>' : '') +
      rewardsGroup();
    App.sheet(ev ? 'Your goal' : 'Finish line', body, { left: '<button class="btn btn--plain" style="padding:0" data-act="editGoal">Edit</button>' });
    App.countUp(App.$('[data-count]', App.topLayer()), days, 900);
    animateBars();
  }
  function rewardsGroup() {
    const rw = E.partnerRewards(); if (!rw.length) return '';
    const done = E.totals().done;
    return '<div class="sec"><div class="sec__label">Rewards</div>' + group(rw.map((r) => cell({ tile: [r.open ? 'gift' : 'lock', r.open ? 'bg-gold' : 'bg-ink'], title: esc(r.text), sub: r.open ? 'Unlocked. Enjoy it.' : 'Week ' + r.week + ' · ' + Math.max(0, r.need - done) + ' more ' + App.plural(Math.max(0, r.need - done), 'session') }) ), true) + '</div>';
  }
  function rewardsSheet() {
    const plan = S().plan; const rw = S().rewards || D.DEFAULT_REWARDS;
    const body = '<p class="lead">Little things to look forward to, unlocked by showing up. Ask someone close to you to set them.</p>' + rewardsGroup() +
      '<div class="sec"><div class="sec__label">Change them</div><div class="card" style="display:grid;gap:14px">' +
      Object.keys(rw).map(Number).filter((w) => w <= plan.weeks).map((w) => '<div class="field"><label class="field__label" for="rw' + w + '">Week ' + w + ' · after ' + plan.days.length * w + ' sessions</label><input id="rw' + w + '" class="input" data-in="reward" data-w="' + w + '" value="' + esc(rw[w] || '') + '" placeholder="e.g. A massage"></div>').join('') + '</div></div>';
    App.sheet('Rewards', body);
  }
  function progressSheet() {
    const s = S(); const tot = E.totals();
    const mins = App.sum(s.log.map((l) => l.mins || 0));
    const kg = Math.round(App.sum(s.log.map((l) => App.sum(l.ex.map((e) => (D.EX[e.id] && D.EX[e.id].unit === 'kg' && !D.EX[e.id].assist) ? App.sum(e.sets.map((x) => x.w * x.r)) : 0)))));
    const hist = E.liftHistory();
    const lifts = Object.keys(hist).filter((id) => D.EX[id].unit !== 'min').map((id) => {
      const v = hist[id].map((x) => x.v); const ex = D.EX[id]; const d = v[v.length - 1] - v[0];
      const unit = ex.unit === 'kg' ? ' kg' : ex.unit === 'sec' ? ' s' : '';
      return cell({ act: 'openExercise', v: id, art: ex.art, title: esc(ex.name), sub: App.fmtKg(v[v.length - 1]) + unit + (d > 0 && !ex.assist ? ' · <span class="delta">+' + App.fmtKg(d) + unit + '</span>' : ''), trail: spark(v) });
    });
    const body = '<div class="stats"><div class="stat"><div class="stat__v" data-count="' + tot.done + '">0</div><div class="stat__l">Sessions</div></div><div class="stat"><div class="stat__v" data-count="' + mins + '">0</div><div class="stat__l">Minutes</div></div><div class="stat"><div class="stat__v" data-count="' + kg + '">0</div><div class="stat__l">kg lifted</div></div></div>' +
      group([cell({ act: 'streakInfo', tile: ['flame', 'bg-red'], title: 'Weeks on target', value: E.streakWeeks() + ' in a row' }), cell({ act: 'openAwards', tile: ['star', 'bg-gold'], title: 'Awards', value: Object.keys(s.awards).length + ' of ' + D.AWARDS.length })], true) +
      '<div class="sec"><div class="sec__label">Your lifts</div>' + (lifts.length ? group(lifts, true) : '<div class="callout">' + icon('trend') + '<div>Your lifts show up here after your first session, with a line for each one as it climbs.</div></div>') + '</div>';
    App.sheet('Progress', body);
    App.$$('[data-count]', App.topLayer()).forEach((el) => App.countUp(el, Number(el.dataset.count), 900));
  }
  function awardsSheet() {
    const got = S().awards;
    const body = '<div class="awards">' + D.AWARDS.map((a) => '<button class="award' + (got[a.id] ? '' : ' is-locked') + '" data-act="awardInfo" data-v="' + a.id + '">' + App.medal(got[a.id] ? a.icon : 'lock', got[a.id] ? a.metal : 'locked', 76) + '<span class="award__name">' + esc(a.name) + '</span>' + (got[a.id] ? '<span class="award__date">' + esc(fmtDate(got[a.id], 'dm')) + '</span>' : '') + '</button>').join('') + '</div>';
    App.sheet('Awards', body);
  }
  function awardInfo(id) {
    const a = D.AWARDS.find((x) => x.id === id); if (!a) return; const got = S().awards[id];
    App.openLayer('<div class="dialog"><div class="medal-wrap">' + App.medal(got ? a.icon : 'lock', got ? a.metal : 'locked', 120) + '</div><div class="eyebrow">' + (got ? 'Earned ' + esc(fmtDate(got, 'dm')) : 'Not yet') + '</div><h2 class="dialog__title">' + esc(a.name) + '</h2><p class="dialog__text">' + esc(a.desc) + '</p>' + btn(got ? 'Nice' : 'I’ll get it', 'closeLayer') + '</div>', { dialog: true });
  }

  // ── Exercises and the gym ─────────────────────────────────────────────────
  function librarySheet() {
    const plan = S().plan; const gym = E.gymOf(plan.gymId);
    const inPlan = []; ['A', 'B'].forEach((k) => plan.sessions[k].ex.forEach((base) => { const id = S().swaps[base] || base; if (!inPlan.includes(id)) inPlan.push(id); }));
    const alts = []; inPlan.forEach((id) => (D.EX[id].alts || []).concat(D.EX[S().swaps[id] ? id : id].alts || []).forEach((a) => { if (D.EX[a] && !inPlan.includes(a) && !alts.includes(a) && gym.kit.includes(a) && D.EX[a].unit !== 'min') alts.push(a); }));
    const row = (id) => cell({ act: 'openExercise', v: id, art: D.EX[id].art, title: esc(D.EX[id].name), sub: esc(D.EX[id].focus) });
    const body = '<div class="sec"><div class="sec__label">In your plan</div>' + group(inPlan.map(row), true) + '</div>' +
      '<div class="sec"><div class="sec__label">Swaps if a machine’s taken</div>' + group(alts.map(row), true) + '</div>' +
      '<div class="sec"><div class="sec__label">Warm-up</div>' + group(['bike', 'cross_trainer', 'treadmill'].map((id) => cell({ act: 'openExercise', v: id, art: D.EX[id].art, title: esc(D.EX[id].name), sub: 'Any of these works' })), true) + '</div>';
    App.sheet('Exercise guide', body);
  }
  function exerciseSheet(id) {
    const ex = D.EX[id]; if (!ex) return;
    const set = S().exSettings[id] || {};
    const mus = (ex.muscles || []).map((m) => D.MUSCLES[m]).concat((ex.muscles2 || []).map((m) => D.MUSCLES[m].toLowerCase()));
    const past = []; S().log.slice().reverse().forEach((l) => l.ex.forEach((e) => { if (e.id === id && e.sets.length && past.length < 4) past.push({ date: l.date, e }); }));
    const perf = (e) => ex.unit === 'kg' ? e.sets.map((x) => App.fmtKg(x.w) + '×' + x.r).join(', ') + ' kg' : e.sets.map((x) => x.r).join(', ') + (ex.unit === 'sec' ? ' s' : ' reps');
    const body = '<div class="photo">' + (set.photo ? '<img src="' + set.photo + '" alt="Your photo of the ' + esc(ex.name) + '">' : art(ex.art)) + '</div>' +
      '<div class="sheet__lead"><div class="eyebrow">' + esc(ex.focus || '') + '</div><h1 class="sheet__h1">' + esc(ex.name) + '</h1>' + (mus.length ? '<p class="muted" style="font-size:15px">Works your ' + esc(mus.slice(0, 1).join('').toLowerCase()) + (mus.length > 1 ? ', with help from ' + esc(mus.slice(1).join(', ').toLowerCase()) : '') + '.</p>' : '') + '</div>' +
      (set.seat ? '<div class="callout callout--blue">' + icon('sliders') + '<div><b>Your settings:</b> ' + esc(set.seat) + '</div></div>' : '') +
      '<div class="group">' +
        (ex.setup ? disc('ex-setup', cell({ act: 'toggleDisc', v: 'ex-setup', title: 'Set up' }), '<ol class="steps">' + ex.setup.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>', true) : '') +
        (ex.move ? disc('ex-move', cell({ act: 'toggleDisc', v: 'ex-move', title: 'The move' }), '<ol class="steps">' + ex.move.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>', true) : '') +
        (ex.feel ? disc('ex-feel', cell({ act: 'toggleDisc', v: 'ex-feel', title: 'Where you’ll feel it' }), '<p style="font-size:16px">' + esc(ex.feel) + '</p>') : '') +
        (ex.avoid && ex.avoid.length ? disc('ex-avoid', cell({ act: 'toggleDisc', v: 'ex-avoid', title: 'Avoid' }), '<ul class="dots-list">' + ex.avoid.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>') : '') +
      '</div>' +
      (past.length ? '<div class="sec"><div class="sec__label">Your history</div>' + group(past.map((x) => cell({ title: esc(perf(x.e)), sub: esc(fmtDate(x.date, 'short')) + (x.e.effort ? ' · ' + E.effortWord(x.e.effort) : '') }))) + '</div>' : '');
    App.sheet(esc(ex.name), body);
  }
  function gymSheet() {
    const plan = S().plan; const g = E.gymOf(plan.gymId);
    const body = '<div class="sheet__lead"><div class="eyebrow">' + esc(g.generic ? 'Any gym' : g.area) + '</div><h1 class="sheet__h1">' + esc(g.generic ? 'Your gym' : g.brand + ' ' + g.branch) + '</h1></div>' +
      '<div class="callout callout--blue">' + icon('pin') + '<div><b>Mapping coming.</b> Once this gym is mapped in person you’ll see a photo of each machine, where it is on the floor and its exact settings. For now every exercise shows the machine type and how to set it up.</div></div>' +
      group([cell({ title: 'Machines in your plan', value: String(E.allSlots().length ? new Set(['A', 'B'].flatMap((k) => plan.sessions[k].ex)).size : 0) }), cell({ title: 'Swaps available', value: 'Yes' })]) +
      group([cell({ act: 'editPlan', title: 'Change gym', cls: 'cell--link', chev: false })]);
    App.sheet('Your gym', body);
  }
  function packSheet() {
    const p = S().profile; const key = 'pack:' + today(); const st = S().seen[key] || {};
    const items = [['water', 'Water bottle', 'water'], ['towel', 'Small towel', 'towel'], ['shoes', 'Closed shoes', 'shoe'], ['phones', 'Headphones', 'headphones']];
    if (p.health.asthma) items.unshift(['puffer', 'Reliever puffer', 'puffer', 'Every session']);
    const body = '<p class="lead">Packing the night before makes tomorrow easy.</p><div class="group checklist">' + items.map((it) => '<button class="cell' + (st[it[0]] ? ' is-on' : '') + '" data-act="packToggle" data-v="' + it[0] + '"><span class="checkbox">' + icon('check') + '</span><span class="cell__main"><span class="cell__title">' + esc(it[1]) + '</span>' + (it[3] ? '<span class="cell__sub">' + esc(it[3]) + '</span>' : '') + '</span>' + icon(it[2], 'ic muted') + '</button>').join('') + '</div>';
    App.sheet('Pack your bag', body);
  }

  // ── Food sheets ───────────────────────────────────────────────────────────
  function placeMenu(name) { const p = name && S().places.find((x) => x.name.toLowerCase() === String(name).toLowerCase()); return p && p.menu && p.menu.picks && p.menu.picks.length ? p.menu : null; }
  function menuSheet(name, cu, replace) {
    const M = D.MENUS[cu]; if (!M) return;
    const place = name || M.name + ' restaurant';
    const scanned = placeMenu(name);
    const picks = scanned ? scanned.picks : M.items.filter((i) => i.t === 'pick').slice(0, 3);
    const ok = scanned ? [] : M.items.filter((i) => i.t === 'ok'); const treat = scanned ? scanned.treats || [] : M.items.filter((i) => i.t === 'treat');
    const rows = (items, tag) => items.map((it) => '<div class="menurow"><span class="menurow__name">' + esc(it.n) + (it.tip ? '<span class="menurow__tip">' + esc(it.tip) + '</span>' : '') + '</span>' + (tag ? '<span class="tag ' + tag[0] + '">' + tag[1] + '</span>' : '') + '</div>').join('');
    const locked = lockedToday(place);
    const body = '<div class="sheet__lead"><div class="eyebrow">' + esc(M.name) + ' · your order' + (locked ? ' · <span class="t-green">locked in</span>' : '') + '</div><h1 class="sheet__h1">' + esc(place) + '</h1></div>' +
      '<div class="group"><ol class="picks">' + picks.map((it, i) => '<li class="pick"><span class="pick__n">' + (i + 1) + '</span><div><div class="pick__name">' + esc(it.n) + '</div>' + (it.why ? '<div class="pick__why">' + esc(it.why) + '</div>' : '') + (it.tip ? '<div class="pick__tip">' + icon('sparkle') + '<span>' + esc(it.tip) + '</span></div>' : '') + '</div></li>').join('') + '</ol></div>' +
      (scanned ? '<p class="fn">Scanned from their menu ' + esc(App.relLow(App.iso(new Date(scanned.at)))) + '. Any one of these is a great order.</p>' : '<p class="fn">Any one of these is a great order. I picked them from a typical ' + esc(M.name.toLowerCase()) + ' menu, so if one isn’t on theirs, go for the closest thing.</p>') +
      '<div data-scan-slot></div>' +
      '<div class="group">' +
        (ok.length ? disc('menu-ok', cell({ act: 'toggleDisc', v: 'menu-ok', title: 'Also a good choice', value: String(ok.length) }), rows(ok, ['tag--ok', 'Good'])) : '') +
        (treat.length ? disc('menu-treat', cell({ act: 'toggleDisc', v: 'menu-treat', title: 'Save for a treat', value: String(treat.length) }), rows(treat, ['tag--treat', 'Treat'])) : '') +
      '</div>';
    const foot = locked ? '<button class="btn btn--block btn--tinted" disabled>' + icon('check') + 'Locked in</button>' : btn('Lock it in', 'lockMenu', (name || '') + '|' + cu, 'btn--block btn--accent') + '<p class="fn" style="text-align:center">I’ll check in tonight to see how it went.</p>';
    const L = replace && App.topLayer() && App.topLayer().querySelector('[data-scan-slot]') ? (App.replaceSheet(body, foot), App.topLayer()) : App.sheet('Your order', body, { foot });
    // In the claude.ai preview Claude can read a photo of the real menu.
    if (name) App.Coach.canReadMenus().then((yes) => {
      const slot = yes && L.isConnected && L.querySelector('[data-scan-slot]'); if (!slot) return;
      slot.innerHTML = '<div class="group group--tiles"><label class="cell" style="cursor:pointer"><span class="cell__tile bg-blue">' + icon('camera') + '</span><span class="cell__main"><span class="cell__title">' + (scanned ? 'Scan their menu again' : 'Scan their menu') + '</span><span class="cell__sub">Snap a photo and I’ll pick from what they actually serve</span></span>' + chev() +
        '<input class="vh" type="file" accept="image/*" capture="environment" data-change="menuPhoto" data-v="' + esc(name + '|' + cu) + '"></label></div>';
    });
  }
  function menuScanning(on) {
    const slot = App.$('[data-scan-slot]', App.topLayer() || document); if (!slot) return;
    if (on) slot.innerHTML = '<div class="callout callout--blue"><span class="spinner" aria-hidden="true"></span><div><b>Reading the menu…</b> Picking the three best orders.</div></div>';
  }
  function cuisinePickSheet(name) {
    const opts = ['italian', 'pizza', 'japanese', 'ramen', 'thai', 'chinese', 'vietnamese', 'korean', 'indian', 'middleeast', 'greek', 'mexican', 'pub', 'burgers', 'chicken', 'cafe'];
    App.sheet('Eating out', '<div class="sheet__lead"><h1 class="sheet__h1">What kind of food is ' + esc(name) + '?</h1><p class="lead">One tap and I’ll pick your order.</p></div><div class="chips">' + opts.map((k) => '<button class="chip" data-act="pickCuisine" data-v="' + esc(name + '|' + k) + '">' + esc(D.MENUS[k].name) + '</button>').join('') + '</div>');
  }
  function dinnersSheet(replace) {
    const t = today(); const cus = E.cuisines().map(cuisineName).filter(Boolean);
    const body = '<p class="lead">Lighter takes on food you already eat' + (cus.length ? ': ' + esc(cus.slice(0, 4).join(', ')) : '') + '. Nothing to count.</p>' +
      '<div class="group">' + E.dinners().map((x, i) => disc('din' + i, cell({ act: 'toggleDisc', v: 'din' + i, lead: '<span class="daytag' + (x.day === t ? ' is-today' : '') + '">' + DOW[App.dow(x.day)] + '</span>', title: esc(x.meal.name), sub: esc(cuisineName(x.meal.c)) }), '<ul class="dots-list">' + x.meal.tips.map((tp) => '<li>' + esc(tp) + '</li>').join('') + '</ul>', x.day === t)).join('') + '</div>' +
      '<p class="fn">A good plate: half vegetables, a palm of protein and a fist of carbs.</p>';
    if (replace && App.topLayer() && App.topLayer().querySelector('[data-dinners]')) { App.replaceSheet('<div data-dinners hidden></div>' + body); return; }
    App.sheet('This week’s dinners', '<div data-dinners hidden></div>' + body, { foot: btn(icon('shuffle', 'ic-sm') + 'Shuffle', 'shuffleDinners', 'sheet', 'btn--block btn--tinted') });
  }
  function mealSheet(id) {
    const m = D.MEALS.find((x) => x.id === id); if (!m) return;
    const body = '<div class="sheet__lead"><div class="eyebrow">' + esc(cuisineName(m.c)) + '</div><h1 class="sheet__h1">' + esc(m.name) + '</h1></div>' +
      '<div class="card"><div class="mini-h" style="margin-bottom:10px">Make it lighter</div><ul class="dots-list">' + m.tips.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' +
      '<p class="fn">A good plate: half vegetables, a palm of protein and a fist of carbs.</p>';
    App.sheet('Dinner', body);
  }
  function momentSheet(k) {
    const m = D.MOMENTS[k]; if (!m) return;
    const t = today(); const wk = weekStart(t);
    let sat = addDays(wk, 5); if (sat < t) sat = addDays(sat, 7);
    let sun = addDays(wk, 6); if (sun < t) sun = addDays(sun, 7);
    const days = [t, addDays(t, 1), sat, sun].filter((d, i, a) => a.indexOf(d) === i).slice(0, 4);
    const planned = S().events.filter((e) => e.type === k && e.date >= t);
    const body = '<div class="sheet__lead"><div class="dialog__icon" style="background:var(--green-soft);color:var(--green-text)">' + icon(m.icon) + '</div><h1 class="sheet__h1">' + esc(m.title) + '</h1></div>' +
      '<div class="card"><ol class="steps">' + m.lines.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol></div>' +
      (planned.length ? '<div class="callout callout--green">' + icon('check') + '<div>Planned for ' + esc(planned.map((e) => App.relLow(e.date)).join(' and ')) + '.</div></div>' : '') +
      '<div class="sec"><div class="sec__label">Add it to your week</div><div class="chips">' + days.map((d) => '<button class="chip" data-act="momentAdd" data-v="' + k + '|' + d + '">' + esc(rel(d)) + '</button>').join('') + '</div></div>';
    App.sheet('Plan ahead', body);
  }

  // ── Profile ───────────────────────────────────────────────────────────────
  function profileSheet() {
    const s = S(); const p = s.profile; const plan = s.plan; const theme = s.settings.theme;
    const tm = E.timeOf(plan.time);
    const body = '<div class="sheet__lead" style="justify-items:center;text-align:center"><span class="avatar" style="width:76px;height:76px;font-size:32px;margin:0">' + esc((p.name || '?').charAt(0).toUpperCase()) + '</span><h1 class="sheet__h1">' + esc(p.name) + '</h1><p class="muted" style="font-size:15px">' + E.totals().done + ' ' + App.plural(E.totals().done, 'session') + ' · since ' + esc(fmtDate(p.created || plan.created, 'dm')) + '</p></div>' +
      '<div class="sec"><div class="sec__label">Your plan</div>' + group([
        cell({ title: 'Gym', value: esc(E.gymShort(plan.gymId)) }),
        cell({ title: 'Days', value: esc(plan.days.map((d) => DOW[d]).join(', ')) }),
        cell({ title: 'Time', value: esc(tm.label + ' · ' + plan.mins + ' min') }),
        cell({ title: 'Dates', value: esc(fmtDate(plan.start, 'dm') + ' – ' + fmtDate(plan.end, 'dm')) }),
        cell({ act: 'editPlan', title: 'Change my plan', cls: 'cell--link', chev: false }),
      ]) + '</div>' +
      '<div class="sec"><div class="sec__label">Goal and rewards</div>' + group([goalCell(), cell({ act: 'openRewards', tile: ['gift', 'bg-gold'], title: 'Rewards' }), cell({ act: 'openAwards', tile: ['star', 'bg-gold'], title: 'Awards', value: Object.keys(s.awards).length + ' of ' + D.AWARDS.length })], true) + '</div>' +
      '<div class="sec"><div class="sec__label">Health</div>' + group([cell({ title: 'Asthma', value: p.health.asthma ? 'Yes' : 'No' }), cell({ title: 'Health check', value: p.health.flag ? (p.health.cleared ? 'Cleared by GP' : 'See your GP first') : 'All clear' })]) +
        (p.health.asthma ? '<p class="fn">If your chest tightens: stop and use your reliever as your asthma action plan says. If it comes back a second time, stop for the day. In an emergency, call 000.</p>' : '') + '</div>' +
      '<div class="sec"><div class="sec__label">Settings</div>' + group([
        '<div class="cell"><span class="cell__main"><span class="cell__title">Sounds</span></span><button class="switch' + (s.settings.sound ? ' is-on' : '') + '" data-act="toggleSound" role="switch" aria-checked="' + s.settings.sound + '" aria-label="Sounds"></button></div>',
        '<div class="cell" style="display:grid;gap:10px"><span class="cell__title">Appearance</span><div class="seg">' + [['system', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']].map((o) => '<button class="seg__btn' + (theme === o[0] ? ' is-on' : '') + '" data-act="setTheme" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div></div>',
        isIOS() && !standalone() && !window.claude ? cell({ act: 'openInstall', title: 'Add to Home Screen' }) : '',
      ]) + '</div>' +
      '<div class="sec"><div class="sec__label">Your data</div><div class="group">' + disc('backup', cell({ act: 'toggleDisc', v: 'backup', title: 'Back up or restore' }),
        '<p class="muted" style="font-size:15px">Everything stays on this phone. Copy a backup code and keep it somewhere safe.</p><div class="inrow"><button class="btn btn--sm btn--tinted" data-act="copyBackup">' + icon('copy', 'ic-sm') + 'Copy backup code</button></div>' +
        '<label class="vh" for="restoreCode">Backup code</label><textarea id="restoreCode" class="input" placeholder="Paste a backup code to restore" style="min-height:76px;font-size:15px"></textarea><div><button class="btn btn--sm btn--tinted" data-act="restoreBackup">Restore</button></div>') + '</div></div>' +
      '<div class="sec"><div class="sec__label">Prototype tools</div><div class="group">' + disc('tools', cell({ act: 'toggleDisc', v: 'tools', title: 'Try it out faster' }),
        '<div class="field"><div class="field__label">Pretend today is</div><div class="seg">' + [[0, 'Today'], [1, '+1 day'], [3, '+3 days'], [7, '+1 week']].map((o) => '<button class="seg__btn' + (s.dev.offset === o[0] ? ' is-on' : '') + '" data-act="timeTravel" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div></div>' +
        '<div class="inrow" style="flex-wrap:wrap"><button class="btn btn--sm btn--tinted" data-act="demoProgress">' + icon('sparkle', 'ic-sm') + 'Fill in two weeks</button><button class="btn btn--sm btn--danger" data-act="resetAsk">Start over</button></div>') + '</div></div>' +
      '<p class="fn">Spotter prototype. General fitness and healthy-eating guidance only; it doesn’t replace advice from your GP. Machine photos, notifications and a real coach on call come with the full app.</p>';
    App.sheet('Profile', body);
  }
  function installSheet() {
    App.sheet('Add to Home Screen', '<p class="lead">Spotter works best as an app on your iPhone: full screen, offline, and your iPhone keeps your progress safe.</p>' +
      '<div class="card"><ol class="steps"><li>Open this page in Safari</li><li>Tap the Share button, the square with the arrow</li><li>Tap “Add to Home Screen”</li><li>Tap Add</li></ol></div>' +
      '<p class="fn">Safari can clear data for sites you haven’t opened in a while. Once Spotter is on your Home Screen, that doesn’t happen.</p>', { foot: btn('Done, hide this', 'dismissInstall', null, 'btn--block btn--tinted') });
  }

  // ── Celebrations, one at a time ───────────────────────────────────────────
  function celebrate() {
    if (!App.Q.length || App.topLayer() || App.$('.restbar') || App.$('.search')) return;
    const it = App.Q.shift(); let html = '';
    if (it.t === 'award') {
      const a = D.AWARDS.find((x) => x.id === it.id); if (!a) return celebrate();
      html = '<div class="dialog"><div class="medal-wrap">' + App.medal(a.icon, a.metal, 124) + '</div><div class="eyebrow">New award</div><h2 class="dialog__title">' + esc(a.name) + '</h2><p class="dialog__text">' + esc(a.desc) + '</p>' + btn('Nice', 'closeLayer') + '</div>';
    } else if (it.t === 'reward') {
      html = '<div class="dialog"><div class="medal-wrap">' + App.medal('gift', 'gold', 124) + '</div><div class="eyebrow">Week ' + it.week + ' reward</div><h2 class="dialog__title">' + esc(it.text) + '</h2><p class="dialog__text">You earned it. Show this to whoever set it, and claim it.</p>' + btn('Claim it', 'closeLayer') + '</div>';
    } else return celebrate();
    const layer = App.openLayer(html, { dialog: true });
    App.sound('award'); App.haptic('success');
    setTimeout(() => { const m = layer.querySelector('.medal-wrap'); if (m && layer.isConnected) { const r = m.getBoundingClientRect(); App.shimmer(r.left + r.width / 2, r.top + r.height / 2, 38); } }, 650);
  }

  // ── After-render touches: rings and bars animate from where they were ────
  const ringMem = {};
  function animateRings() {
    requestAnimationFrame(() => {
      App.$$('.rings__bar[data-to]').forEach((c) => {
        const key = c.getAttribute('class') + c.getAttribute('r');
        if (ringMem[key] != null && !c.closest('.layer')) { c.style.transition = 'none'; c.style.strokeDashoffset = ringMem[key]; c.getBoundingClientRect(); c.style.transition = ''; }
        requestAnimationFrame(() => { c.style.strokeDashoffset = c.dataset.to; if (!c.closest('.layer') && !c.closest('.hero-rings')) ringMem[key] = c.dataset.to; });
      });
    });
  }
  function animateBars() { requestAnimationFrame(() => requestAnimationFrame(() => App.$$('[data-w]').forEach((b) => { b.style.width = b.dataset.w + '%'; }))); }

  App.Views = {
    shell, coachGlyph, discHtml, refreshCoach, setTyping, refreshBadge, animateRings, animateBars,
    previewSheet, sessionOptions, menuScanning, placeMenu, weekSheet, goalSheet, rewardsSheet, progressSheet, awardsSheet, awardInfo,
    librarySheet, exerciseSheet, gymSheet, packSheet, menuSheet, cuisinePickSheet, dinnersSheet, mealSheet, momentSheet,
    profileSheet, installSheet, coachSheet, celebrate, openSearch, closeSearch, renderSearch, isSearchOpen: () => !!searchEl,
  };
})();
