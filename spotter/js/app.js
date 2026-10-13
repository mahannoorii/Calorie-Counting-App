/* Spotter — app shell: boot, rendering, navigation, awards and the general actions. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const E = App.E;
  const { today, addDays, weekStart, rel, fmtDate } = App;

  App.S = migrate(App.load());
  backfillRecords();
  App.tab = 'today';
  App.Q = [];
  App.entering = true;
  const S = () => App.S;

  // Carry a first-prototype profile and history over, so testers keep their progress.
  function migrate(st) {
    if (st.profile) {
      const p = st.profile;
      if (p.experience === 'regular' && (p.worries || []).includes('motivation')) p.worries = p.worries.map((w) => (w === 'motivation' ? 'consistency' : w));
      if (!p.focus) p.focus = [];
      if (!p.gym) {
        // the gym's record from the research, plus anything they've already used or been planned
        // there: if they've logged hip thrusts, the gym has the machine
        p.gym = E.legacyGym(p.gymId);
        const used = new Set();
        (st.log || []).forEach((l) => l.ex.forEach((e) => used.add(e.id)));
        if (st.plan && st.plan.sessions) Object.keys(st.plan.sessions).forEach((k) => (st.plan.sessions[k].ex || []).forEach((id) => used.add(st.swaps && st.swaps[id] || id)));
        used.forEach((id) => (D.EX[id] ? D.EX[id].eq : []).forEach((t) => { if (!p.gym.kit.includes(t)) p.gym.kit.push(t); }));
      }
      return st;
    }
    try {
      const old = JSON.parse(localStorage.getItem('spotter.v1') || 'null');
      if (!old || !old.profile) return st;
      const map = { ghormeh: 'middleeast', koobideh: 'middleeast', joojeh: 'middleeast', zereshk: 'middleeast', adas: 'middleeast', lubia: 'middleeast', ash: 'middleeast', kuku: 'middleeast', mirza: 'middleeast', fesenjan: 'middleeast', bolognese: 'italian', pizza: 'italian', stirfry: 'chinese', curry: 'indian', wraps: 'mexican', burgers: 'aussie' };
      const p = Object.assign({}, old.profile);
      p.cuisines = Array.from(new Set((p.dishes || []).map((d) => map[d]).filter(Boolean)));
      if (!p.cuisines.length) p.cuisines = ['aussie', 'italian', 'chinese'];
      delete p.dishes; delete p.cook;
      ['plan', 'log', 'food', 'events', 'checkins', 'moves', 'skips', 'exSettings', 'swaps', 'rewards', 'opened', 'settings', 'dev'].forEach((k) => { if (old[k] != null) st[k] = old[k]; });
      Object.keys(st.food).forEach((d) => { st.food[d] = { s: st.food[d].s }; });
      st.profile = p;
      return st;
    } catch (e) { return st; }
  }

  // Sessions logged before records existed: work out which sets were records at the time.
  function backfillRecords() {
    const s = App.S; if (!s.log.length || s.seen.prBackfill) return;
    const all = s.log;
    all.forEach((entry, i) => {
      if (entry.prs) return;
      s.log = all.slice(0, i); entry.prs = [];
      entry.ex.forEach((e) => {
        for (let k = e.sets.length - 1; k >= 0; k--) { const r = E.prFor(e.id, e.sets[k], e.sets.slice(0, k)); if (r) { entry.prs.push(Object.assign({ id: e.id, w: e.sets[k].w, r: e.sets[k].r }, r)); break; } }
      });
    });
    s.log = all; s.seen.prBackfill = true; App.save();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  App.render = function () {
    const app = document.getElementById('app');
    if (!S().profile || App.ob.active) {
      if (!S().profile && !App.ob.active) { App.ob.active = true; App.ob.phase = 'welcome'; }
      app.innerHTML = App.OB.render();
    } else {
      if (!S().plan) S().plan = E.buildPlan(S().profile);
      app.innerHTML = App.Views.shell();
      App.entering = false;
    }
    App.Views.animateBars();
    onScroll();
  };
  function onScroll() { document.body.classList.toggle('is-scrolled', window.scrollY > 46 && !App.ob.active && App.tab !== 'coach'); }
  function goTab(v) {
    App.closeLayer(true); App.Views.closeSearch();
    if (App.tab !== v) {
      App.tab = v; App.entering = true; App.render();
      window.scrollTo(0, v === 'coach' ? document.documentElement.scrollHeight : 0);
      if (v === 'coach') { App.Coach.markRead(); App.Views.refreshBadge(); }
      if (v === 'today' || v === 'coach') runCheckIns();
    } else window.scrollTo({ top: v === 'coach' ? document.documentElement.scrollHeight : 0, behavior: App.reduceMotion() ? 'auto' : 'smooth' });
  }
  App.goTab = goTab;

  // The coach checks in when you open the app: typing first, then the message.
  function runCheckIns() {
    if (!S().profile || !S().plan || App.ob.active || App.Session.isOpen() || App.Coach.isBusy()) return;
    if (!App.Coach.due()) return;
    App.Views.setTyping(true);
    setTimeout(() => {
      App.Views.setTyping(false);
      if (App.Coach.checkIns()) { App.sound('message'); App.haptic(); }
    }, App.reduceMotion() ? 120 : 1100);
  }
  App.runCheckIns = runCheckIns;
  let nextCheck = null;
  App.onCoachMessage = function (m) {
    if (App.tab === 'today' && App.$('[data-coach-slot]') && !App.Session.isOpen() && !App.topLayer()) App.Coach.markRead();
    App.Views.refreshCoach();
    // when a conversation wraps up, the coach brings up the next thing on its list
    if (m && m.from === 'coach' && !(m.replies && m.replies.length) && !App.Coach.expecting()) { clearTimeout(nextCheck); nextCheck = setTimeout(runCheckIns, 3000); }
  };
  App.onCoachTyping = function (on) { App.Views.setTyping(on); };

  // ── Food, places and awards ───────────────────────────────────────────────
  const FOOD_TOAST = { on: 'Nice. On track today.', part: 'Logged. Partly still counts.', off: 'Logged. Tomorrow’s a fresh start.' };
  App.logFood = function (date, v, fromCoach) {
    const had = S().food[date];
    S().food[date] = { s: v };
    if (date === today()) S().chatPosted['evening_food:' + today()] = true;
    App.save(); E.track('logfood');
    App.sound(v === 'on' ? 'set' : 'soft'); App.haptic(v === 'on' ? 'success' : null);
    if (!fromCoach) {
      App.render();
      App.toast(FOOD_TOAST[v], v === 'on' ? 'leaf' : 'check');
      if (v !== 'on' && date === today() && (!had || had.s === 'on') && !App.Coach.isBusy()) setTimeout(() => { App.Coach.note('Today logged as ' + (v === 'part' ? 'partly on track' : 'off track')); App.Coach.post('food_why'); }, 900);
    } else if (App.tab !== 'coach') App.render();
    App.checkAwards(); setTimeout(() => App.Views.celebrate(), 700);
  };
  App.rememberPlace = function (name, cu, menu) {
    if (!name) return;
    const s = S(); const key = name.toLowerCase();
    const old = s.places.find((x) => x.name.toLowerCase() === key);
    const entry = { name, cuisine: cu, at: Date.now() };
    if (menu) entry.menu = menu; else if (old && old.menu && old.cuisine === cu) entry.menu = old.menu;
    s.places = [entry].concat(s.places.filter((x) => x.name.toLowerCase() !== key)).slice(0, 8);
    App.save();
  };
  App.lockMeal = function (name, cu, fromCoach) {
    const place = name || D.MENUS[cu].name + ' restaurant'; const s = S();
    if (!s.events.some((e) => e.type === 'eatout' && e.date === today() && e.title.toLowerCase() === place.toLowerCase())) s.events.push({ id: App.uid(), type: 'eatout', date: today(), title: place, cuisine: cu, planned: true });
    if (name) App.rememberPlace(name, cu);
    App.save(); App.sound('set'); App.haptic('success');
    if (!fromCoach) { App.toast('Locked in. Enjoy it.', 'check'); App.Coach.note('Order locked in for ' + place); App.Coach.say('Good choice. Enjoy it, and I’ll ask how it went tonight.'); }
    if (App.tab === 'eat') App.render();
    App.checkAwards(); setTimeout(() => App.Views.celebrate(), 600);
  };
  App.checkAwards = function (silent) {
    const s = S(); const plan = s.plan; if (!plan) return;
    const got = s.awards; const t = today(); const tot = E.totals();
    const give = (id) => { if (got[id]) return; got[id] = t; if (!silent) App.Q.push({ t: 'award', id }); };
    if (s.log.length >= 1) give('first');
    const w1 = plan.slots.filter((x) => x.week === 1 && !E.isSkipped(x)); if (w1.length && w1.every((x) => E.isDone(x))) give('week1');
    [weekStart(t), addDays(weekStart(t), -7)].forEach((wk) => { if (wk >= weekStart(plan.start) && E.targetInWeek(wk) && E.week(wk).perfect) give('perfect'); });
    if (s.seen.stronger || E.prCount() >= 1) give('stronger');
    if (E.prCount() >= 10) give('pr10');
    if (Object.keys(s.exSettings).some((k) => s.exSettings[k] && s.exSettings[k].seat)) give('dialled');
    if (s.events.some((e) => e.type === 'eatout')) give('smartorder');
    if (E.streakWeeks() >= 3) give('streak3');
    if (s.log.length >= 10) give('ten');
    if (tot.total && tot.done >= Math.ceil(tot.total / 2)) give('halfway');
    if (tot.total && tot.done >= tot.total) give('finish');
    E.partnerRewards().forEach((r) => { if (!r.open && tot.done >= r.need) { s.opened[r.week] = t; if (!silent) App.Q.push({ t: 'reward', week: r.week, text: r.text }); } });
    App.save();
  };

  // Restaurants: name in, menu out with the order already picked.
  function placeFlow(text) {
    let name = String(text || '').replace(/\|/g, '/').trim(); if (!name) return;
    if (name === name.toLowerCase()) name = name.replace(/\b([a-z])/g, (m) => m.toUpperCase());
    const cu = E.detectCuisine(name);
    E.track('eatout');
    if (cu) { App.rememberPlace(name, cu); if (App.tab === 'eat') App.render(); App.Views.menuSheet(name, cu); }
    else App.Views.cuisinePickSheet(name);
  }

  // ── Event delegation ──────────────────────────────────────────────────────
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]'); if (!el) return;
    const fn = App.ACT[el.dataset.act]; if (!fn) return;
    if (el.tagName === 'BUTTON' || el.tagName === 'A') ev.preventDefault();
    fn(el, ev);
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target.closest && ev.target.closest('[data-in]');
    if (el && App.IN[el.dataset.in]) App.IN[el.dataset.in](el, ev);
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target; if (!el || !el.dataset || !el.dataset.change) return;
    const fn = App.ACT[el.dataset.change]; if (fn) fn(el, ev);
  });
  // Typing an exact weight: the number is selected on tap, and Return confirms it.
  document.addEventListener('focusin', (ev) => { const t = ev.target; if (t && t.classList && t.classList.contains('val__in')) setTimeout(() => { try { t.select(); } catch (e) {} }, 0); });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target && ev.target.classList && ev.target.classList.contains('val__in')) { ev.preventDefault(); ev.target.blur(); return; }
    if (ev.key === 'Enter' && ev.target && ev.target.dataset && ev.target.dataset.enter && !ev.isComposing) {
      const fn = App.ACT[ev.target.dataset.enter]; if (fn) { ev.preventDefault(); fn(ev.target, ev); }
    }
    if (ev.key === 'Escape') { if (App.Views.isSearchOpen()) App.Views.closeSearch(); else App.closeLayer(); }
  });
  window.addEventListener('scroll', onScroll, { passive: true });

  const fake = (v, label) => ({ dataset: { v: v == null ? '' : String(v), label: label || '' } });
  function after(fn) { setTimeout(fn, App.topLayer() ? 300 : 0); }

  // ── Actions ───────────────────────────────────────────────────────────────
  Object.assign(App.ACT, {
    closeLayer() { App.closeLayer(); },
    go(el) { goTab(el.dataset.v || 'today'); App.haptic(); },
    toggleDisc(el) {
      const d = el.closest('.disc'); if (!d) return;
      const open = !d.classList.contains('is-open');
      d.classList.toggle('is-open', open); el.setAttribute('aria-expanded', open);
      App.discOpen[d.dataset.disc] = open; App.haptic();
    },

    // Search
    openSearch() { App.Views.openSearch(); },
    closeSearch() { App.Views.closeSearch(); },
    searchGo(el) {
      const it = E.searchIndex().find((x) => x.id === el.dataset.v); if (!it) return;
      E.track(it.id); App.Views.closeSearch();
      const fn = App.ACT[it.act]; if (fn) fn(fake(it.data, it.title));
    },
    searchPlace() { const q = ((App.$('#searchIn') || {}).value || '').trim(); App.Views.closeSearch(); placeFlow(q); },
    searchAsk() { const q = ((App.$('#searchIn') || {}).value || '').trim(); App.Views.closeSearch(); goTab('coach'); setTimeout(() => App.Coach.send(q), 300); },
    searchEnter() { const first = App.$('.search__body [data-act]'); if (first) first.click(); },

    // Coach
    coachReply(el) { const [id, i] = el.dataset.v.split('|'); App.Coach.tap(id, Number(i)); },
    coachTopic(el) {
      if (!App.$('[data-coach-thread]')) { goTab('coach'); setTimeout(() => App.Coach.topic(el.dataset.v, el.dataset.label), 250); return; }
      App.Coach.topic(el.dataset.v, el.dataset.label); E.track('coach:' + el.dataset.v);
    },
    coachSend(el) {
      const box = el.closest && el.closest('[data-composer]'); const inp = box ? box.querySelector('input:not([type="file"])') : el;
      const v = (inp && inp.value || '').trim(); if (!v) { if (inp && inp.focus) inp.focus(); return; }
      inp.value = ''; App.Coach.send(v);
    },
    coachAct(el) { const [name, ...rest] = el.dataset.v.split('|'); App.closeLayer(true); App.Coach.act(name, rest.join('|'), el.dataset.label); App.render(); },
    openCoachSheet() { App.Views.coachSheet(); },

    // Sessions
    startSession(el) { App.Session.start(el.dataset.v); },
    resumeSession() { App.closeLayer(true); App.Session.open(); },
    catchUp(el) { App.Session.start(el.dataset.v); },
    previewSession(el) { const sl = E.slotById(el.dataset.v); if (sl) E.track('sess:' + sl.key); after(() => App.Views.previewSheet(el.dataset.v)); },
    sessionOptions(el) { App.Views.sessionOptions(el.dataset.v); },
    healthCleared() { S().profile.health.cleared = true; App.save(); App.render(); App.toast('Great. You’re cleared to start.', 'shield'); },

    // Progress and goals
    openWeek() { App.Views.weekSheet(); },
    openGoal() { E.track('goal'); App.closeLayer(true); App.Views.goalSheet(); },
    editGoal() { App.ACT.editPlan(fake('goals')); },
    openRewards() { E.track('rewards'); App.Views.rewardsSheet(); },
    openProgress() { E.track('progress'); App.closeLayer(true); App.Views.progressSheet(); },
    openAwards() { E.track('awards'); App.Views.awardsSheet(); },
    awardInfo(el) { App.Views.awardInfo(el.dataset.v); },
    streakInfo() {
      const n = E.streakWeeks();
      App.openLayer('<div class="dialog"><div class="dialog__icon" style="background:var(--red-soft);color:var(--red-text)">' + App.icon('flame') + '</div><h2 class="dialog__title">' + n + ' ' + App.plural(n, 'week') + ' on target</h2><p class="dialog__text">Your streak counts weeks where you did every planned session. It’s weekly on purpose: rest days never break it.</p><button class="btn" data-act="closeLayer">Got it</button></div>', { dialog: true });
    },
    openLibrary() { E.track('library'); App.Views.librarySheet(); },
    libArea(el) { App.Views.lib.area = el.dataset.v; App.haptic(); App.Views.renderLib(true); },
    libHere() { App.Views.lib.here = !App.Views.lib.here; App.haptic(); App.Views.renderLib(true); },
    swapInAsk(el) { App.Views.swapInSheet(el.dataset.v); },
    swapIn(el) {
      const [base, id] = el.dataset.v.split('|'); const was = S().swaps[base] || base;
      if (id === base) delete S().swaps[base]; else S().swaps[base] = id;
      App.save(); App.closeLayer(true); App.render(); App.sound('set'); App.haptic('success');
      App.toast(D.EX[id].name + ' is in, instead of the ' + App.lc(D.EX[was].name), 'swap');
    },
    openKit() { App.Views.kitSheet(); },
    kitToggle(el) {
      const g = E.gym(); const t = el.dataset.v; const i = g.kit.indexOf(t);
      if (i >= 0) g.kit.splice(i, 1); else g.kit.push(t);
      g.edited = true; App.haptic(); App.sound('tick');
      const changed = E.fixPlanForKit();
      App.save(); App.Views.kitSheet(true);
      if (changed.length) { App.toast('Plan updated: ' + App.lc(D.EX[changed[0][1]].name) + (changed.length > 1 ? ' and ' + (changed.length - 1) + ' more' : '') + ' swapped in', 'swap'); changed.forEach((c) => App.Coach.note(D.EX[c[0]].name + ' swapped for ' + App.lc(D.EX[c[1]].name))); }
    },
    kitHas(el) {
      const [tags, id] = el.dataset.v.split('|'); const g = E.gym();
      tags.split(',').forEach((t) => { if (t && !g.kit.includes(t)) g.kit.push(t); });
      g.edited = true; App.save(); App.sound('set'); App.haptic('success');
      App.closeLayer(true); App.Views.exerciseSheet(id); App.toast('Added to ' + E.gymShort(), 'check');
    },
    chatPhoto(el) {
      const f = el.files && el.files[0]; if (!f) return;
      if (App.tab !== 'coach' && !App.$('.sheet [data-coach-thread]')) goTab('coach');
      App.Coach.photoIn(f, el.dataset.v || ''); el.value = '';
    },
    openExercise(el) { E.track('ex:' + el.dataset.v); App.Views.exerciseSheet(el.dataset.v); },
    openGym() { App.Views.gymSheet(); },
    openPack() { App.Views.packSheet(); },
    packToggle(el) {
      const key = 'pack:' + today(); S().seen[key] = S().seen[key] || {};
      const on = !S().seen[key][el.dataset.v]; S().seen[key][el.dataset.v] = on;
      el.classList.toggle('is-on', on); App.haptic(); if (on) App.sound('tick'); App.save();
      const all = App.$$('.sheet .checklist .cell'); if (on && all.length && all.every((c) => c.classList.contains('is-on'))) App.toast('Bag packed. Tomorrow you just show up.', 'check');
    },

    // Food
    foodLog(el) { App.logFood(today(), el.dataset.v); },
    openEatOut() { goTab('eat'); const i = App.$('#eatOutIn'); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); } },
    eatOutGo() { const inp = App.$('#eatOutIn'); const v = (inp && inp.value || '').trim(); if (!v) { if (inp) inp.focus(); return; } inp.value = ''; inp.blur(); placeFlow(v); },
    pickCuisine(el) { const [name, cu] = el.dataset.v.split('|'); App.closeLayer(); App.rememberPlace(name, cu); if (App.tab === 'eat') App.render(); setTimeout(() => App.Views.menuSheet(name, cu), 300); },
    openMenu(el) {
      const [name, cu] = String(el.dataset.v).split('|');
      E.track(name ? 'place:' + name : 'menu:' + cu);
      if (name) App.rememberPlace(name, cu);
      after(() => App.Views.menuSheet(name, cu));
    },
    lockMenu(el) { const [name, cu] = el.dataset.v.split('|'); App.closeLayer(); App.lockMeal(name, cu); },
    menuPhoto(el) {
      const f = el.files && el.files[0]; if (!f) return;
      const [name, cu] = el.dataset.v.split('|');
      App.Views.menuScanning(true); App.haptic();
      App.Coach.readMenu(f, name, cu).then((res) => {
        if (!res.picks.length) { App.toast('I couldn’t read a menu in that photo. Try closer up.', 'camera'); App.Views.menuSheet(name, cu, true); return; }
        App.rememberPlace(name, cu, { picks: res.picks, treats: res.treats, at: App.nowMs() });
        App.sound('set'); App.haptic('success');
        App.Views.menuSheet(name, cu, true);
        App.toast('Picked from their menu', 'check');
      }).catch((e) => {
        const code = e && e.code;
        App.toast(code === 'not_granted' ? 'Allow Spotter to use Claude to read menus' : code === 'image_rejected' ? 'That photo couldn’t be read. Try another.' : code === 'rate_limited' ? 'Too many tries. Give it a minute.' : code === 'cancelled' ? 'Stopped' : 'I couldn’t read that menu. Try a clearer photo.', 'camera');
        App.Views.menuSheet(name, cu, true);
      });
    },
    openDinners() { E.track('dinners'); App.Views.dinnersSheet(); },
    shuffleDinners(el) {
      S().dinnerSeed++; App.save(); App.haptic(); App.sound('tick');
      if (el.dataset.v === 'sheet') App.Views.dinnersSheet(true); else { App.render(); App.toast('New dinners picked', 'shuffle'); }
    },
    openMeal(el) { App.Views.mealSheet(el.dataset.v); },
    openMoment(el) { E.track('moment:' + el.dataset.v); App.Views.momentSheet(el.dataset.v); },
    momentAdd(el) {
      const [type, d] = el.dataset.v.split('|'); const m = D.MOMENTS[type];
      S().events.push({ id: App.uid(), type, date: d, title: m.title, planned: true });
      App.save(); App.closeLayer(); App.render(); App.sound('set'); App.haptic('success');
      App.toast(m.title + ' planned for ' + App.relLow(d), 'check');
    },

    // Profile and settings
    openProfile() { E.track('settings'); App.Views.profileSheet(); },
    editPlan(el) {
      App.closeLayer(true);
      App.ob.p = App.OB.fromProfile(S().profile);
      const steps = App.OB.visibleSteps(App.ob.p);
      const want = (el && el.dataset && el.dataset.v) || 'gym';
      App.ob.step = Math.max(0, steps.findIndex((s) => s.id === want));
      App.ob.phase = 'steps'; App.ob.active = true; App.ob.editing = true; App.ob.dir = 1;
      App.render(); window.scrollTo(0, 0);
    },
    startPlan() {
      App.ob.active = false; App.ob.editing = false; App.ob.phase = 'welcome';
      App.tab = 'today'; App.entering = true; App.saveNow(); App.render(); window.scrollTo(0, 0);
      App.celebrateFx(); App.haptic('success');
      setTimeout(runCheckIns, 700);
    },
    setTheme(el) { S().settings.theme = el.dataset.v; App.save(); App.applyTheme(); App.$$('[data-act="setTheme"]').forEach((b) => b.classList.toggle('is-on', b === el)); App.haptic(); },
    toggleSound(el) { S().settings.sound = !S().settings.sound; App.save(); el.classList.toggle('is-on', S().settings.sound); el.setAttribute('aria-checked', S().settings.sound); App.haptic(); App.sound('set'); },
    copyBackup() {
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(S()))));
      const ta = App.$('#restoreCode');
      const fallback = () => { if (ta) { ta.value = code; ta.focus(); ta.select(); } App.toast('Select and copy the code below'); };
      try { navigator.clipboard.writeText(code).then(() => App.toast('Backup code copied', 'copy'), fallback); } catch (e) { fallback(); }
    },
    restoreBackup() {
      const v = ((App.$('#restoreCode') || {}).value || '').trim();
      try {
        const data = JSON.parse(decodeURIComponent(escape(atob(v))));
        if (!data || !data.profile) throw new Error('bad');
        App.S = Object.assign(App.fresh(), data);
        App.saveNow(); App.closeLayer(true); App.applyTheme(); App.render(); App.toast('Progress restored', 'check');
      } catch (e) { App.toast('That code didn’t work. Check you copied all of it.', 'alert'); }
    },
    timeTravel(el) {
      S().dev.offset = Number(el.dataset.v); App.save(); App.closeLayer(true); App.render(); window.scrollTo(0, 0);
      App.toast(S().dev.offset ? 'Pretending it’s ' + fmtDate(today(), 'long') : 'Back to the real date', 'clock');
      setTimeout(runCheckIns, 500);
    },
    demoProgress() { App.closeLayer(true); fillDemo(); },
    resetAsk() {
      App.openLayer('<div class="dialog"><div class="dialog__icon" style="background:var(--red-soft);color:var(--red-text)">' + App.icon('refresh') + '</div><h2 class="dialog__title">Start over?</h2><p class="dialog__text">This clears your plan, sessions and awards on this phone. It can’t be undone.</p><button class="btn btn--danger" data-act="resetAll">Clear everything</button><button class="btn btn--tinted" data-act="closeLayer">Keep my progress</button></div>', { dialog: true });
    },
    resetAll() {
      try { localStorage.removeItem(App.KEY); localStorage.removeItem('spotter.v1'); } catch (e) {}
      App.S = App.fresh(); App.ob.active = true; App.ob.phase = 'welcome'; App.ob.p = null; App.ob.step = 0; App.tab = 'today'; App.Q = [];
      App.closeLayer(true); App.Session.close(); App.applyTheme(); App.render(); window.scrollTo(0, 0);
    },
    openInstall() { App.Views.installSheet(); },
    dismissInstall() { S().seen.install = true; App.save(); App.closeLayer(true); App.render(); },
  });
  Object.assign(App.IN, {
    search(el) { App.Views.renderSearch(el.value); },
    libQ(el) { App.Views.lib.q = el.value; App.Views.renderLib(); },
    reward(el) { S().rewards = Object.assign({}, S().rewards || D.DEFAULT_REWARDS); S().rewards[el.dataset.w] = el.value; App.save(); },
  });

  // ── Example progress (prototype tool) ─────────────────────────────────────
  // Rebuilds the plan as if it started about two weeks ago, with realistic sessions and food days.
  function fillDemo() {
    const s = S(); const p = s.profile; const real = s.dev.offset;
    s.dev.offset = real - 15;
    s.plan = E.buildPlan(Object.assign({}, p, { start: 'now' }));
    s.dev.offset = real;
    Object.assign(s, { log: [], moves: {}, skips: {}, trims: {}, eases: {}, food: {}, events: [], active: null, opened: {}, awards: {}, chat: [], chatPosted: {}, chatRead: 0 });
    delete s.chatExpect; s.seen = {};
    const t = today();
    const past = s.plan.slots.filter((x) => x.date < t);
    past.forEach((slot, i) => {
      if (i === past.length - 1 && past.length > 2) return; // leave the latest one missed, to show catching up
      const prs = [];
      const exs = E.exercisesFor(slot.key, slot.week).map((e) => {
        const ex = D.EX[e.id]; const sg = E.suggest(e.id, null, e); const reps = e.reps || ex.reps;
        const sets = []; for (let k = 0; k < e.sets; k++) sets.push({ w: sg.w, r: ex.unit === 'kg' ? Math.min(reps[1], sg.r + (k === 0 ? 2 : 1)) : sg.r });
        const pr = sets.map((x, k) => E.prFor(e.id, x, sets.slice(0, k))).find(Boolean);
        if (pr) { const x = sets.find((y, k) => E.prFor(e.id, y, sets.slice(0, k))); prs.push(Object.assign({ id: e.id, w: x.w, r: x.r }, pr)); }
        return { id: e.id, sets, effort: i % 3 === 2 ? 'right' : 'easy', reps };
      });
      s.log.push({ id: App.uid(), slot: slot.id, key: slot.key, week: slot.week, date: slot.date, mins: s.plan.mins - 3 + (i % 5), gymId: s.plan.gymId, ex: exs, prs, mood: i % 2 ? 'great' : 'good' });
    });
    for (let i = 1; i <= 13; i++) {
      const d = addDays(t, -i); if (d < s.plan.start) break;
      s.food[d] = { s: [3, 7].includes(i) ? 'part' : i === 5 ? 'off' : 'on' };
    }
    s.places = [{ name: 'Italian Bowl Newtown', cuisine: 'italian', at: Date.now() - 3 * 864e5 }, { name: 'Chat Thai', cuisine: 'thai', at: Date.now() - 6 * 864e5 }];
    s.events.push({ id: App.uid(), type: 'eatout', date: addDays(t, -3), title: 'Italian Bowl Newtown', cuisine: 'italian', planned: true });
    const sat = addDays(weekStart(t), 5);
    s.events.push({ id: App.uid(), type: 'gathering', date: sat >= t ? sat : addDays(sat, 7), title: 'Family event', planned: true });
    if (s.log.length > 1) s.seen.stronger = true;
    App.checkAwards(true);
    App.saveNow(); App.tab = 'today'; App.entering = true; App.render(); window.scrollTo(0, 0);
    App.toast('Two weeks of example progress added', 'sparkle');
    setTimeout(runCheckIns, 600);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    App.applyTheme(); App.fxInit(); App.Coach.initAI();
    if (!S().profile) { App.ob.active = true; App.ob.phase = 'welcome'; }
    App.render();
    setTimeout(runCheckIns, 600);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !S().profile || App.ob.active || App.topLayer() || App.Session.isOpen() || App.Views.isSearchOpen()) return;
      App.render(); runCheckIns();
    });
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.claude) {
      window.addEventListener('load', () => { navigator.serviceWorker.register('service-worker.js').catch(() => {}); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
