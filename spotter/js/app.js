/* Spotter — app shell: boot, rendering, navigation, rewards and the general actions. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const E = App.E;
  const { esc, icon, today, addDays, weekStart, rel, fmtDate } = App;

  App.S = App.load();
  App.tab = 'today';
  App.Q = [];
  const S = () => App.S;

  // ── Render ────────────────────────────────────────────────────────────────
  App.render = function () {
    const app = document.getElementById('app');
    if (!S().profile || App.ob.active) {
      if (!S().profile && !App.ob.active) { App.ob.active = true; App.ob.phase = 'welcome'; }
      app.innerHTML = App.OB.render();
    } else {
      if (!S().plan) S().plan = E.buildPlan(S().profile);
      app.innerHTML = App.Views.shell();
    }
    afterRender();
  };
  function afterRender() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      App.$$('[data-ring]').forEach((c) => { c.style.strokeDashoffset = c.dataset.ring; });
      App.$$('[data-w]').forEach((b) => { b.style.width = b.dataset.w + '%'; });
    }));
  }

  // ── Rewards ───────────────────────────────────────────────────────────────
  App.award = function (n, el) {
    const before = E.levelFor(S().xp);
    S().xp += n; App.save();
    if (el) App.floatText(el, '+' + n + ' XP');
    const after = E.levelFor(S().xp);
    if (after > before) { S().level = after; App.Q.push({ t: 'level', level: after }); }
  };
  App.unlock = function (id) {
    if (S().badges[id]) return false;
    S().badges[id] = today(); App.Q.push({ t: 'badge', id }); App.save();
    return true;
  };

  // ── Event delegation ──────────────────────────────────────────────────────
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const fn = App.ACT[el.dataset.act];
    if (!fn) return;
    if (el.tagName === 'BUTTON' || el.tagName === 'A') ev.preventDefault();
    fn(el, ev);
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target.closest && ev.target.closest('[data-in]');
    if (el && App.IN[el.dataset.in]) App.IN[el.dataset.in](el, ev);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target && ev.target.id === 'obName') { ev.preventDefault(); App.ACT.obNext(); }
    if (ev.key === 'Escape') App.closeLayer();
  });

  // ── Navigation and general actions ────────────────────────────────────────
  Object.assign(App.ACT, {
    closeLayer() { App.closeLayer(); },
    go(el) { const v = el.dataset.v || 'today'; App.closeLayer(true); if (App.tab !== v) { App.tab = v; App.render(); window.scrollTo(0, 0); App.sound('tap'); } else window.scrollTo({ top: 0, behavior: 'smooth' }); },
    openMe() { App.Views.meSheet(); App.Coach.setContext({ key: 'me', label: 'Your profile' }); },
    openCoach() { App.Coach.open(); },
    coachAsk(el) { const id = el.dataset.v; App.Coach.open(); setTimeout(() => App.Coach.askSuggested(id), 250); },
    coachSuggest(el) { App.Coach.askSuggested(el.dataset.id); },
    humanCoach() { App.Coach.humanCoach(); },

    startSession(el) { App.Session.start(el.dataset.v); },
    resumeSession() { App.closeLayer(true); App.Session.open(); },
    notToday(el) { App.Views.notTodaySheet(el.dataset.v); },
    moveSlot(el) { const [id, d] = el.dataset.v.split('|'); S().moves[id] = d; App.save(); App.closeLayer(true); App.render(); App.toast('Moved to ' + rel(d).toLowerCase(), 'calendar'); },
    skipSlot(el) { S().skips[el.dataset.v] = true; App.save(); App.closeLayer(true); App.render(); App.toast('Skipped. Your next session stays on track.', 'check'); },
    catchUp(el) { App.Session.start(el.dataset.v); },
    previewSession(el) { App.Views.previewSheet(el.dataset.v); },
    openPack() { App.Views.packSheet(); },
    packToggle(el) {
      const key = 'pack:' + today(); S().seen[key] = S().seen[key] || {};
      S().seen[key][el.dataset.v] = !S().seen[key][el.dataset.v];
      el.classList.toggle('is-on'); App.haptic(6); App.save();
      if (S().seen[key][el.dataset.v]) App.burstAt(el.querySelector('.check__box'), { n: 10 });
      const all = App.$$('.sheet .check'); if (all.length && all.every((c) => c.classList.contains('is-on'))) { App.toast('Bag packed. Tomorrow you just show up.', 'check'); App.sound('success'); }
    },
    healthCleared() { S().profile.health.cleared = true; App.save(); App.render(); App.toast('Great. You’re cleared to start.', 'shield'); App.confetti('stars'); },

    foodCheck(el) {
      const [date, v] = el.dataset.v.split('|');
      const had = S().food[date];
      S().food[date] = { s: v, why: had && had.s === v ? had.why : [] };
      App.save();
      if (!had) { App.award(v === 'on' ? D.XP.foodOn : D.XP.food, el); App.unlock('honest'); }
      if (E.foodScore(weekStart(date)) >= 5) App.unlock('five');
      App.haptic(10);
      App.burstAt(el, { n: v === 'on' ? 26 : 12, colors: v === 'on' ? ['#11a564', '#5fe3a6', '#ffbe1a'] : v === 'part' ? ['#ffbe1a', '#fff1c9'] : ['#8fa3ff', '#ffffff'] });
      App.sound(v === 'off' ? 'soft' : 'set');
      const msg = v === 'on' ? 'Nice. That’s the stuff results are made of.' : v === 'part' ? 'Honest and normal. Partly still counts.' : 'Thanks for being honest. Tomorrow’s a fresh start.';
      setTimeout(() => { App.render(); App.toast(msg, v === 'on' ? 'leaf' : 'heart'); if (v !== 'on' && !had) whySheet(date, v); else App.Views.celebrate(); }, 380);
    },
    foodWhy(el) {
      const [date, why] = el.dataset.v.split('|');
      const f = S().food[date]; if (!f) return;
      f.why = [why]; App.save(); App.closeLayer();
      const map = { 'Family gathering': 'gathering', 'Eating out': 'eatingout', 'Takeaway': 'takeaway' };
      const gp = map[why];
      const tip = gp ? 'Next time, make a one-minute game plan for it. It’s in Food.' : why === 'Sweets' ? 'Next time: pick the one sweet you love most and enjoy it slowly.' : why === 'Late snacking' ? 'Tip: have a planned evening snack, like yoghurt or fruit, so it’s a choice not a raid.' : 'Busy and tired days happen. Keep a couple of go-to meals ready to go.';
      App.openLayer('<div class="modal"><div class="option__icon tone-green" style="width:64px;height:64px;border-radius:20px">' + icon('leaf', 'ic-lg') + '</div><h2 class="modal__title display">Noted</h2><p class="modal__text">' + esc(tip) + '</p>' + (gp ? '<button class="btn btn--green" data-act="openGameplanFromModal" data-v="' + gp + '">See the game plan</button>' : '') + '<button class="btn ' + (gp ? 'btn--ghost' : '') + '" data-act="closeLayer">Got it</button></div>', { modal: true, onClose: () => setTimeout(() => App.Views.celebrate(), 300) });
    },
    openGameplanFromModal(el) { App.closeLayer(true); App.Views.gameplanSheet(el.dataset.v); },
    openGameplan(el) { const [type, id] = String(el.dataset.v).split('|'); App.Views.gameplanSheet(type, id); },
    gpAdd(el) {
      const [type, date] = el.dataset.v.split('|');
      const gp = D.GAMEPLANS[type];
      S().events.push({ id: App.uid(), type, date, title: gp.title, planned: true });
      App.save(); App.closeLayer(true);
      App.award(type === 'gathering' ? D.XP.gathering : D.XP.weekend);
      if (type === 'gathering') App.unlock('feast');
      App.render(); App.toast(gp.title + ' planned for ' + rel(date).toLowerCase(), 'check'); App.confetti('stars');
      setTimeout(() => App.Views.celebrate(), 700);
    },
    gpPlanned(el) {
      const ev = S().events.find((e) => e.id === el.dataset.v); if (!ev) return;
      if (!ev.planned) { ev.planned = true; App.award(ev.type === 'gathering' ? D.XP.gathering : D.XP.weekend); if (ev.type === 'gathering') App.unlock('feast'); }
      App.save(); App.closeLayer(true); App.render(); App.toast('Planned. You’ve got this.', 'check'); setTimeout(() => App.Views.celebrate(), 500);
    },
    openWeekend() { App.Views.weekendSheet(); },
    wkOn(el) { const w = App._wk; const v = el.dataset.v; const i = w.on.indexOf(v); if (i >= 0) w.on.splice(i, 1); else w.on.push(v); App.Views.renderWeekend(true); },
    wkFun(el) { App._wk.fun = el.dataset.v; App.Views.renderWeekend(true); },
    wkMove(el) { App._wk.move = el.dataset.v; App.Views.renderWeekend(true); },
    wkSave() {
      const wk = weekStart(today()); const first = !S().weekends[wk];
      S().weekends[wk] = Object.assign({}, App._wk, { at: today() });
      App.save(); App.closeLayer(true);
      if (first) { App.award(D.XP.weekend); App.unlock('weekend'); }
      App.render(); App.toast('Weekend planned: ' + App._wk.fun.toLowerCase() + ' is your fun meal', 'calendar'); App.confetti('rain');
      setTimeout(() => App.Views.celebrate(), 700);
    },
    openCheckin() { App.Views.checkinSheet(); },
    ciNext() { App._ci.step++; App.Views.renderCheckin(true); const b = App.topLayer() && App.topLayer().querySelector('.sheet__body'); if (b) b.scrollTop = 0; },
    ciPick(el) {
      const [k, v] = el.dataset.v.split('|'); const arr = App._ci[k];
      const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else { if (v === 'none') arr.length = 0; else { const n = arr.indexOf('none'); if (n >= 0) arr.splice(n, 1); } arr.push(v); }
      App.Views.renderCheckin(true);
    },
    ciDay(el) { const [k, d] = el.dataset.v.split('|'); App._ci.day[k] = d; App.Views.renderCheckin(true); },
    ciSave() {
      const c = App._ci; const wk = weekStart(today());
      S().checkins[wk] = { well: c.well, hard: c.hard, next: c.next, at: today() };
      Object.keys(c.day).forEach((k) => { if (c.next.includes(k)) S().events.push({ id: App.uid(), type: k, date: c.day[k], title: D.GAMEPLANS[k].title, planned: false }); });
      App.save(); App.closeLayer(true);
      App.award(D.XP.checkin); App.unlock('checkin');
      App.render(); App.confetti('fireworks'); App.sound('success'); App.toast('Next week is set. Rest up.', 'check');
      setTimeout(() => App.Views.celebrate(), 900);
    },
    openMeal(el) { App.Views.mealSheet(el.dataset.v); },
    openInstall() { App.Views.installSheet(); },
    dismissInstall() { S().seen.install = true; App.save(); App.closeLayer(true); App.render(); },
    streakInfo() {
      const n = E.streakWeeks();
      App.openLayer('<div class="modal"><div class="option__icon tone-red" style="width:64px;height:64px;border-radius:20px">' + icon('flame', 'ic-lg') + '</div><h2 class="modal__title display">' + n + ' week' + (n === 1 ? '' : 's') + ' on target</h2><p class="modal__text">Your streak counts weeks where you did every planned session. It’s weekly on purpose: rest days never break it.</p><button class="btn" data-act="closeLayer">Got it</button></div>', { modal: true });
    },
    badgeInfo(el) {
      const b = D.BADGES.find((x) => x.id === el.dataset.v); const got = S().badges[b.id];
      App.openLayer('<div class="modal"><div class="option__icon tone-' + (got ? b.tone : 'blue') + '" style="width:72px;height:72px;border-radius:50%">' + icon(got ? b.icon : 'lock', 'ic-lg') + '</div><div class="eyebrow">' + (got ? 'Earned ' + esc(fmtDate(got, 'dm')) : 'Locked') + '</div><h2 class="modal__title display">' + esc(b.name) + '</h2><p class="modal__text">' + esc(b.desc) + '</p><button class="btn" data-act="closeLayer">' + (got ? 'Nice' : 'I’ll get it') + '</button></div>', { modal: true });
    },
    rewardInfo(el) {
      const w = Number(el.dataset.v); const r = E.partnerRewards().find((x) => x.week === w); if (!r) return;
      const left = Math.max(0, r.need - E.totals().done);
      App.openLayer('<div class="modal"><div class="option__icon tone-yellow" style="width:72px;height:72px;border-radius:50%">' + icon('gift', 'ic-lg') + '</div><div class="eyebrow">Week ' + w + ' reward</div><h2 class="modal__title display">' + esc(r.text) + '</h2><p class="modal__text">' + (r.open ? 'Unlocked. Enjoy it, you earned it.' : left + ' more ' + App.plural(left, 'session') + ' to unlock it.') + '</p><button class="btn" data-act="closeLayer">' + (r.open ? 'Yay' : 'Let’s go') + '</button></div>', { modal: true });
    },
    goalInfo() {
      const p = S().profile; const plan = S().plan; const ev = plan.event;
      const days = ev ? App.diffDays(today(), ev.date) : App.diffDays(today(), plan.end);
      App.openLayer('<div class="modal"><div class="option__icon" style="width:72px;height:72px;border-radius:50%;background:var(--ink);color:var(--bg)">' + icon(ev ? 'plane' : 'trophy', 'ic-lg') + '</div><div class="eyebrow">' + Math.max(0, days) + ' days to go</div><h2 class="modal__title display">' + esc(ev ? ev.name : 'The finish line') + '</h2><p class="modal__text">' + esc(p.why || (p.feel.length ? 'You want to feel ' + p.feel.join(', ').toLowerCase() + '.' : 'Keep showing up.')) + '</p><button class="btn" data-act="closeLayer">Keep going</button></div>', { modal: true });
    },
    startPlan() {
      App.ob.active = false; App.ob.editing = false; App.ob.phase = 'welcome';
      const firstTime = !S().badges.plan;
      if (firstTime) { App.award(50); App.unlock('plan'); }
      App.tab = 'today'; App.saveNow(); App.render(); window.scrollTo(0, 0);
      App.confetti('cannons'); App.sound('success');
      setTimeout(() => App.Views.celebrate(), 900);
    },
    editPlan() {
      App.closeLayer(true);
      App.ob.p = App.OB.fromProfile(S().profile);
      const steps = App.OB.visibleSteps(App.ob.p);
      App.ob.step = Math.max(0, steps.findIndex((s) => s.id === 'gym'));
      App.ob.phase = 'steps'; App.ob.active = true; App.ob.editing = true; App.ob.dir = 1;
      App.render(); window.scrollTo(0, 0);
    },
    setTheme(el) { S().settings.theme = el.dataset.v; App.save(); App.applyTheme(); App.$$('[data-act="setTheme"]').forEach((b) => b.classList.toggle('is-on', b === el)); },
    toggleSound(el) { S().settings.sound = !S().settings.sound; App.save(); el.classList.toggle('is-on', S().settings.sound); el.setAttribute('aria-checked', S().settings.sound); App.sound('set'); },
    copyBackup() {
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(S()))));
      const done = () => App.toast('Backup code copied', 'copy');
      const fallback = () => { const box = App.$('[data-restore]'); if (box) { box.hidden = false; const ta = App.$('#restoreCode'); ta.value = code; ta.select(); } App.toast('Select and copy the code below'); };
      try { navigator.clipboard.writeText(code).then(done, fallback); } catch (e) { fallback(); }
    },
    showRestore() { const box = App.$('[data-restore]'); if (box) box.hidden = !box.hidden; },
    restoreBackup() {
      const v = (App.$('#restoreCode') || {}).value || '';
      try {
        const data = JSON.parse(decodeURIComponent(escape(atob(v.trim()))));
        if (!data || !data.profile) throw new Error('bad');
        App.S = Object.assign(App.fresh(), data);
        App.saveNow(); App.closeLayer(true); App.applyTheme(); App.render(); App.toast('Progress restored', 'check');
      } catch (e) { App.toast('That code didn’t work. Check you copied all of it.', 'alert'); }
    },
    timeTravel(el) {
      S().dev.offset = Number(el.dataset.v); App.save(); App.closeLayer(true); App.render(); window.scrollTo(0, 0);
      App.toast(S().dev.offset ? 'Pretending it’s ' + fmtDate(today(), 'long') : 'Back to the real date', 'clock');
    },
    demoProgress() { App.closeLayer(true); fillDemo(); },
    resetAsk() {
      App.openLayer('<div class="modal"><div class="option__icon tone-red" style="width:64px;height:64px;border-radius:20px">' + icon('refresh', 'ic-lg') + '</div><h2 class="modal__title display">Start over?</h2><p class="modal__text">This clears your plan, sessions and rewards on this phone. It can’t be undone.</p><button class="btn btn--red" data-act="resetAll">Clear everything</button><button class="btn btn--ghost" data-act="closeLayer">Keep my progress</button></div>', { modal: true });
    },
    resetAll() {
      try { localStorage.removeItem(App.KEY); } catch (e) {}
      App.S = App.fresh(); App.ob.active = true; App.ob.phase = 'welcome'; App.ob.p = null; App.ob.step = 0; App.tab = 'today';
      App.closeLayer(true); App.Session.close(); App.applyTheme(); App.render(); window.scrollTo(0, 0);
    },
  });
  Object.assign(App.IN, {
    reward(el) { S().rewards = Object.assign({}, S().rewards || D.DEFAULT_REWARDS); S().rewards[el.dataset.w] = el.value; App.save(); },
  });

  function whySheet(date, v) {
    App.openLayer('<div class="modal"><div class="option__icon tone-' + (v === 'part' ? 'yellow' : 'red') + '" style="width:64px;height:64px;border-radius:20px">' + icon('info', 'ic-lg') + '</div><h2 class="modal__title display">What got in the way?</h2><p class="modal__text">Optional. It helps me plan better next time.</p><div class="chips" style="justify-content:center">' +
      D.CHECKIN_REASONS.map((r) => '<button class="chip" data-act="foodWhy" data-v="' + date + '|' + esc(r) + '">' + esc(r) + '</button>').join('') +
      '</div><button class="btn btn--plain" data-act="closeLayer">Skip</button></div>', { modal: true, onClose: () => setTimeout(() => App.Views.celebrate(), 300) });
  }

  // ── Example progress (prototype tool) ─────────────────────────────────────
  // Rebuilds the plan as if it started two weeks ago and logs realistic sessions and food days.
  function fillDemo() {
    const s = S(); const p = s.profile;
    const real = s.dev.offset;
    s.dev.offset = real - 15;
    s.plan = E.buildPlan(Object.assign({}, p, { start: 'now' }));
    s.dev.offset = real;
    s.log = []; s.moves = {}; s.skips = {}; s.food = {}; s.events = []; s.active = null; s.opened = {};
    const t = today();
    const past = s.plan.slots.filter((x) => x.date < t);
    let xp = 50;
    past.forEach((slot, i) => {
      if (i === past.length - 1 && past.length > 2) return; // leave the latest one missed, to show catch-up
      const exs = E.exercisesFor(slot.key, slot.week).map((e) => {
        const ex = D.EX[e.id]; const sg = E.suggest(e.id);
        const sets = []; for (let k = 0; k < e.sets; k++) sets.push({ w: sg.w, r: ex.unit === 'kg' ? Math.min(ex.reps[1], sg.r + (k === 0 ? 2 : 1)) : sg.r });
        const effort = i % 3 === 2 ? 'right' : 'easy';
        xp += sets.length * D.XP.set + D.XP.exercise;
        return { id: e.id, sets, effort };
      });
      s.log.push({ id: App.uid(), slot: slot.id, key: slot.key, week: slot.week, date: slot.date, mins: s.plan.mins - 3 + (i % 5), gymId: s.plan.gymId, ex: exs, mood: i % 2 ? 'great' : 'good' });
      xp += D.XP.session;
    });
    for (let i = 1; i <= 12; i++) {
      const d = addDays(t, -i); if (d < s.plan.start) break;
      const r = [0, 3, 7].includes(i) ? 'part' : i === 5 ? 'off' : 'on';
      s.food[d] = { s: r, why: r === 'on' ? [] : [i === 5 ? 'Family gathering' : 'Takeaway'] };
      xp += r === 'on' ? D.XP.foodOn : D.XP.food;
    }
    const sat = addDays(weekStart(t), 5);
    s.events.push({ id: App.uid(), type: 'gathering', date: sat >= t ? sat : addDays(sat, 7), title: 'Family gathering', planned: false });
    s.xp = xp; s.level = E.levelFor(xp);
    const b = s.badges; const d0 = t;
    ['plan', 'first', 'honest', 'up', 'week1', 'fullweek'].forEach((id) => { if (!b[id]) b[id] = d0; });
    E.partnerRewards().forEach((r) => { if (E.totals().done >= r.need) s.opened[r.week] = d0; });
    App.saveNow(); App.tab = 'today'; App.render(); window.scrollTo(0, 0);
    App.toast('Example progress added: two weeks in', 'sparkle'); App.confetti('plates');
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    App.applyTheme();
    App.fxInit();
    App.Coach.initAI();
    if (!S().profile) { App.ob.active = true; App.ob.phase = 'welcome'; }
    App.render();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && S().profile && !App.ob.active && !App.topLayer() && !document.getElementById('sx')) App.render();
    });
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.claude) {
      window.addEventListener('load', () => { navigator.serviceWorker.register('service-worker.js').catch(() => {}); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
