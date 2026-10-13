/* Spotter — bringing your history over from Iron Log. Reads an Iron Log backup (.json),
   turns every logged session into Spotter's log, keeps your own program (its templates
   become your sessions) and picks up the rotation after the last session you did. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;

  // Iron Log exercise → Spotter exercise. Anything Spotter doesn't have becomes a custom
  // exercise based on the closest one, so it keeps cues and a drawing.
  const MAP = {
    incline_db_press: 'incline_db_press', cable_fly: 'cable_fly', tri_pushdown_bar: 'cable_pushdown', tri_overhead_ext: 'overhead_cable_extension',
    seated_leg_curl: 'leg_curl', lying_leg_curl: 'lying_leg_curl', lat_pulldown: 'lat_pulldown', close_grip_pulldown: 'close_grip_pulldown',
    seated_cable_row: 'seated_row', chest_supported_row: 'machine_row', t_bar_row: 't_bar_row', db_curl: 'db_curl', db_hammer_curl: 'hammer_curl',
    ez_bar_curl: 'ez_bar_curl', incline_db_curl: 'incline_db_curl', leg_extension: 'leg_extension', shoulder_press_machine: 'shoulder_press',
    db_lateral_raise: 'lateral_raise', cable_lateral_raise: 'cable_lateral_raise', rear_delt_machine: 'rear_delt_machine', rear_delt_cable: 'cable_rear_delt_fly',
    skull_crusher: 'skull_crusher', incline_smith_press: 'smith_incline_press', cable_crunch: 'cable_crunch', hanging_leg_raise: 'hanging_leg_raise',
    plank: 'plank', calf_raise_machine: 'calf_raise_machine', cable_upright_row: 'cable_upright_row', chest_press_machine: 'chest_press', db_shrug: 'db_shrug',
  };
  const CUSTOM = {
    tri_pushdown_single: { base: 'cable_pushdown', name: 'Single-arm triceps pushdown', perSide: true, start: 5 },
    single_arm_cable_ext: { base: 'overhead_cable_extension', name: 'Single-arm cable triceps extension', perSide: true, start: 5 },
    preacher_curl_machine: { base: 'machine_curl', name: 'Preacher curl machine' },
  };
  const BP_BASE = { chest: 'chest_press', back: 'seated_row', shoulders: 'shoulder_press', legs: 'leg_press', arms: 'db_curl', biceps: 'db_curl', triceps: 'cable_pushdown', core: 'cable_crunch' };
  const TAGS = { push: 'Pu', pull: 'Pl', sh: 'Sh', bk: 'Bk' };

  // Custom exercises live in the saved state and join the library at start-up.
  function register(customEx) {
    Object.keys(customEx || {}).forEach((id) => {
      const c = customEx[id]; const base = D.EX[c.base] || D.EX.chest_press;
      D.EX[id] = Object.assign({}, base, { id, name: c.name, custom: true, aka: [] }, c.perSide != null ? { perSide: c.perSide } : {}, c.start ? { start: c.start } : {});
    });
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
  function nice(s) { s = String(s || '').trim(); return s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s+])([a-z])/g, (m, a, b) => a + b.toUpperCase()) : s; }

  function parseSet(x) {
    const s = String(x || '').trim(); if (!s) return null;
    const m = s.match(/^([\d.]+)\s*[x×]\s*([\d.]+)$/i);
    if (m) return { w: Number(m[1]), r: Math.round(Number(m[2])) };
    const n = Number(s); return isFinite(n) && n > 0 ? { w: 0, r: Math.round(n) } : null;
  }

  // Iron Log backup → { log, program, customEx, days, count, unknown }
  function parseIronLog(data) {
    if (!data || !Array.isArray(data.sessions)) throw new Error('not an Iron Log backup');
    const customEx = {}; const unknown = [];
    const own = {}; (data.custom || []).forEach((c) => { own[c.id] = c; });
    function idFor(iid) {
      if (MAP[iid]) return MAP[iid];
      const cid = 'il_' + slug(iid);
      if (CUSTOM[iid]) { customEx[cid] = CUSTOM[iid]; return cid; }
      const c = own[iid];
      customEx[cid] = { base: (c && BP_BASE[c.bp]) || 'chest_press', name: c ? nice(c.nm) : nice(iid.replace(/_/g, ' ')) };
      if (!c) unknown.push(iid);
      return cid;
    }
    const tmpl = {}; (data.templates || []).forEach((t) => { tmpl[t.id] = t; });
    const log = [];
    data.sessions.slice().sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)).forEach((s) => {
      const ex = (s.ex || []).map((e) => ({ id: idFor(e.id), sets: (e.sets || []).map(parseSet).filter(Boolean) })).filter((e) => e.sets.length);
      if (!ex.length) return; // started but nothing logged
      log.push({ id: 'il_' + s.id, slot: null, key: s.t || '', week: 0, date: s.d, mins: 0, ex, prs: null, mood: null, imported: 'ironlog' });
    });
    register(customEx);
    // Rep ranges from what you've actually been doing on each lift lately.
    const recentReps = (id) => { const r = []; log.slice(-24).forEach((l) => l.ex.forEach((e) => { if (e.id === id) e.sets.forEach((x) => r.push(x.r)); })); return r.sort((a, b) => a - b); };
    function repsFor(id) {
      const ex = D.EX[id]; if (!ex || ex.unit !== 'kg') return ex ? ex.reps.slice() : [8, 12];
      const r = recentReps(id); if (!r.length) return ex.reps.slice();
      const m = r[Math.floor(r.length / 2)];
      return m <= 6 ? [5, 7] : m <= 8 ? [6, 8] : m <= 10 ? [8, 10] : m <= 12 ? [10, 12] : [12, 15];
    }
    const sessions = (data.templates || []).map((t) => {
      const items = (t.ex || []).map((e, i) => {
        const iid = typeof e === 'string' ? e : e.id; const id = idFor(iid);
        const sets = typeof e === 'object' && e.s ? e.s : (data.ovr && data.ovr[iid] && data.ovr[iid].s) || (i === 0 ? 4 : 3);
        return { id, pat: (D.EX[id] || {}).pat, role: i === 0 ? 'main' : 'acc', sets, reps: repsFor(id), rest: (data.settings && data.settings.rest) || 90 };
      });
      const sub = String(t.sub || '').split('·').map((x) => x.trim().toLowerCase()).filter(Boolean);
      const title = sub.length ? App.cap(sub.length > 1 ? sub.slice(0, -1).join(', ') + ' and ' + sub[sub.length - 1] : sub[0]) : '';
      return { key: t.id, name: nice(t.nm), tag: TAGS[t.id] || nice(t.nm).slice(0, 2), area: 'own', title, items };
    });
    // the next session is the one after the last you logged
    const last = log.length ? log[log.length - 1].key : '';
    const li = sessions.findIndex((s) => s.key === last);
    const next = sessions.length ? sessions[(li + 1) % sessions.length].key : '';
    // the days you usually train, from the last eight weeks you trained
    const lastDate = log.length ? log[log.length - 1].date : App.today();
    const from = App.addDays(lastDate, -56); const count = [0, 0, 0, 0, 0, 0, 0];
    log.filter((l) => l.date >= from).forEach((l) => { count[App.dow(l.date)]++; });
    const n = Math.min(6, Math.max(2, sessions.length || 4));
    const days = [0, 1, 2, 3, 4, 5, 6].sort((a, b) => count[b] - count[a] || a - b).slice(0, n).sort((a, b) => a - b);
    return { log, program: { source: 'Iron Log', sessions, next, count: log.length, first: log.length ? log[0].date : '' }, customEx, days, count: log.length, first: log.length ? log[0].date : '', last: lastDate, unknown };
  }

  // Put the history into the saved state: merged with anything already logged, with
  // personal records worked out session by session.
  function apply(imp) {
    const s = App.S;
    s.customEx = Object.assign({}, s.customEx || {}, imp.customEx);
    register(s.customEx);
    const have = new Set(s.log.map((l) => l.id));
    const all = s.log.concat(imp.log.filter((l) => !have.has(l.id)).map((l) => Object.assign({}, l, { ex: l.ex.map((e) => Object.assign({}, e, { sets: e.sets.map((x) => Object.assign({}, x)) })) })));
    all.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    all.forEach((entry, i) => {
      if (entry.prs) return;
      s.log = all.slice(0, i); entry.prs = [];
      entry.ex.forEach((e) => { for (let k = e.sets.length - 1; k >= 0; k--) { const r = App.E.prFor(e.id, e.sets[k], e.sets.slice(0, k)); if (r) { entry.prs.push(Object.assign({ id: e.id, w: e.sets[k].w, r: e.sets[k].r }, r)); break; } } });
    });
    s.log = all; s.seen.prBackfill = true;
    // the gym has what you've been using there
    const g = s.profile && s.profile.gym;
    if (g) imp.log.forEach((l) => l.ex.forEach((e) => (D.EX[e.id] ? D.EX[e.id].eq : []).forEach((t) => { if (!g.kit.includes(t)) g.kit.push(t); })));
    App.checkAwards(true);
    App.saveNow();
  }

  function readFile(file) {
    return (file.text ? file.text() : new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); }))
      .then((txt) => parseIronLog(JSON.parse(txt)));
  }

  App.Import = { MAP, register, parseIronLog, apply, readFile };
})();
