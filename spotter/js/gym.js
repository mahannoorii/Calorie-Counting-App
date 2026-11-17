/* Spotter — your gyms. Switch where you're training in one tap (each gym keeps its own
   equipment, and the day's session adjusts to it), find gyms near you (Claude searches the
   web, Anytime Fitness first), and check what a gym has before you go: Claude reads the
   club's page, posts and reviews and maps what it finds onto your equipment list. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const E = App.E;
  const { esc, icon, fmtDate } = App;
  const S = () => App.S;
  const U = () => App.Views.ui;
  const DB = D.GYMDB;
  const uniq = (a) => Array.from(new Set(a));

  const tile = (chain) => App.OB.gymTile(chain);
  const dist = (km) => (km == null ? '' : App.OB.distWord(km));
  const keyed = () => App.AI.ready();
  function checkedText(g) {
    if (g.chain === 'home') return 'Your home setup';
    const r = g.research; if (!r) return g.edited ? 'Equipment ticked by you' : 'Equipment not checked yet';
    return 'Checked online ' + App.relLow(App.iso(new Date(r.at))) + (r.confidence === 'low' ? ', not much to go on' : '');
  }
  function subLine(g, extra) { return [g.suburb, extra, checkedText(g)].filter(Boolean).join(' · '); }

  // ── Where are you training? ───────────────────────────────────────────────
  let query = '';
  function gymsBody() {
    const cur = E.gym(); const others = E.gyms().filter((g) => !cur || g.id !== cur.id);
    let h = '<div class="sheet__lead"><h1 class="sheet__h1">Where are you training?</h1><p class="lead">Each gym keeps its own equipment. Your session adjusts to the gym you pick, just for that day.</p></div>';
    if (cur) h += '<div class="sec__label">Training here</div><div class="group group--tiles">' + row(cur, true) + '</div>';
    if (others.length) h += '<div class="sec__label">Your other gyms</div><div class="group group--tiles">' + others.map((g) => row(g, false)).join('') + '</div>';
    h += '<div class="sec__label">Somewhere new</div>' +
      (keyed() ? '<div class="group group--tiles">' + U().cell({ act: 'gymFindNear', tile: ['search', 'bg-purple'], title: 'Find gyms near me', sub: 'Claude searches the web, Anytime Fitness first' }) + '</div>' : '') +
      '<div class="eatout" style="margin-top:10px"><div class="eatout__wrap">' + icon('search') + '<label class="vh" for="gymQ">Gym name or suburb</label><input id="gymQ" class="input" placeholder="Gym name or suburb" autocomplete="off" autocapitalize="words" enterkeyhint="search" data-in="gymQ" data-enter="gymSearch" value="' + esc(query) + '"></div>' +
      '<button class="btn btn--accent btn--icon" data-act="gymSearch" aria-label="Search">' + icon('arrow') + '</button></div>' +
      '<div data-gymres>' + dirResults() + '</div>' +
      '<div class="group group--tiles" style="margin-top:12px">' + (keyed() ? '' : U().cell({ act: 'gymNearDir', tile: ['pin', 'bg-blue'], title: 'Gyms near me', sub: 'From Spotter’s list of Sydney gyms' })) +
        U().cell({ act: 'gymAdd', tile: ['plus', 'bg-ink'], title: 'Add a gym by hand', sub: 'Then tick what it has' }) + '</div>';
    return h;
  }
  function row(g, here) {
    return '<div class="cell gymrow' + (here ? ' is-on' : '') + '"><button class="gymrow__main" data-act="' + (here ? 'gymOpen' : 'gymUse') + '" data-v="' + esc(g.id) + '">' + tile(g.chain) +
      '<span class="cell__main"><span class="cell__title">' + esc(g.name) + '</span><span class="cell__sub">' + esc(subLine(g, g.used && !here ? 'last ' + App.relLow(g.used) : '')) + '</span></span>' +
      (here ? '<span class="cell__value">Here</span>' : '<span class="gymrow__use">Train here</span>') + '</button>' +
      '<button class="gymrow__info" data-act="gymOpen" data-v="' + esc(g.id) + '" aria-label="About ' + esc(g.name) + '">' + icon('info') + '</button></div>';
  }
  // Gyms from Spotter's own list that match what's typed (instant, no Claude needed).
  function dirResults() {
    const q = query.trim(); if (q.length < 2) return '';
    const have = E.gyms();
    const list = E.findGyms(q).filter((g) => !have.some((x) => x.id === g.id)).slice(0, 5);
    let h = list.length ? '<div class="group group--tiles" style="margin-top:10px">' + list.map((g) => U().cell({ act: 'gymDir', v: g.id, lead: tile(g.chain), title: esc(g.name), sub: esc(g.suburb + (g.listed ? ' · equipment listed online' : '')) })).join('') + '</div>' : '';
    if (keyed()) h += '<div class="group group--tiles" style="margin-top:10px">' + U().cell({ act: 'gymSearch', tile: ['sparkle', 'bg-purple'], title: 'Search the web for “' + esc(q) + '”', sub: 'Claude finds it, wherever it is' }) + '</div>';
    else if (!list.length) h += '<p class="fn">Not in Spotter’s list. Add it by hand below, or switch on Claude to search the web for any gym.</p>';
    return h;
  }
  function gymsSheet() {
    if (App.topLayer() && App.topLayer().querySelector('[data-gyms]')) { App.replaceSheet('<div data-gyms hidden></div>' + gymsBody()); return; }
    App.sheet('Your gyms', '<div data-gyms hidden></div>' + gymsBody());
  }

  // ── Finding gyms with Claude ──────────────────────────────────────────────
  let found = null; let finding = 0;
  function findingBody(label) {
    return '<div data-gymfind></div><div class="sheet__lead"><div class="eyebrow">Finding gyms' + (label ? ' · ' + esc(label) : '') + '</div><h1 class="sheet__h1">Gyms near you</h1></div>' +
      '<div class="lookup"><div class="lookup__now"><span class="spinner" aria-hidden="true"></span><span data-lookup-now>Searching the web…</span></div><ul class="lookup__steps" data-lookup-steps aria-live="polite"></ul></div>' +
      '<p class="fn">Claude looks for Anytime Fitness clubs first, then other gyms with a proper weights floor. Usually 20 to 40 seconds.</p>';
  }
  function foundBody(r) {
    const any = r.gyms.filter((g) => g.chain === 'anytime'); const rest = r.gyms.filter((g) => g.chain !== 'anytime');
    const cellFor = (g) => U().cell({ act: 'gymPick', v: r.gyms.indexOf(g), lead: tile(g.chain), title: esc(g.name), sub: esc([g.suburb, dist(g.km), g.hours].filter(Boolean).join(' · ')) + (g.note ? '<span class="cell__note">' + esc(g.note) + '</span>' : '') });
    return '<div data-gymfind></div><div class="sheet__lead"><div class="eyebrow">' + esc(r.area ? 'Near ' + r.area : 'Near you') + '</div><h1 class="sheet__h1">Pick a gym</h1><p class="lead">Tap one to train there today. Claude then checks its equipment for your sessions.</p></div>' +
      (any.length ? '<div class="sec__label">Anytime Fitness</div><div class="group group--tiles">' + any.map(cellFor).join('') + '</div>' : '') +
      (rest.length ? '<div class="sec__label">' + (any.length ? 'Other gyms' : 'Gyms') + '</div><div class="group group--tiles">' + rest.map(cellFor).join('') + '</div>' : '') +
      sources(r.sources);
  }
  function sources(list) {
    if (!list || !list.length) return '';
    const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
    return '<div class="sec__label">Sources</div><div class="group">' + list.slice(0, 6).map((x) => '<a class="cell" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer"><span class="cell__main"><span class="cell__title" style="font-size:15px">' + esc(x.title || host(x.url)) + '</span><span class="cell__sub">' + esc(host(x.url)) + '</span></span>' + icon('right', 'cell__chev') + '</a>').join('') + '</div>';
  }
  function progress(p) {
    const L = App.topLayer(); if (!L || !L.querySelector('[data-gymfind], [data-gymcheck]')) return;
    const ul = L.querySelector('[data-lookup-steps]'); const now = L.querySelector('[data-lookup-now]');
    let host = ''; try { host = p.url ? new URL(p.url).hostname.replace(/^www\./, '') : ''; } catch (e) {}
    if (ul) ul.insertAdjacentHTML('beforeend', '<li>' + icon('check', 'ic-sm') + '<span>' + esc(p.t === 'search' ? 'Searched “' + p.q + '”' : 'Read ' + (host || 'a page')) + '</span></li>');
    if (now) now.textContent = p.t === 'search' ? 'Reading what it found…' : 'Putting it together…';
  }
  function find(q) {
    const n = ++finding; const w = App.AI.where(); query = q || query;
    const label = q || (w.kind === 'gps' ? 'near you' : w.label);
    const body = findingBody(label);
    if (App.topLayer()) App.replaceSheet(body, U().btn('Stop', 'gymStop', null, 'btn--block btn--tinted')); else App.sheet('Your gyms', body, { foot: U().btn('Stop', 'gymStop', null, 'btn--block btn--tinted') });
    App.AI.findGyms(q, { progress }).then((r) => {
      if (n !== finding) return;
      const L = App.topLayer(); const open = !!(L && L.querySelector('[data-gymfind]'));
      if (r.error === 'cancelled') return;
      if (r.error || r.text) {
        const msg = r.error === 'noweb' ? 'Web search is switched off for your Anthropic account. Turn it on in the Claude Console under Settings, then Capabilities.' : r.error || r.text;
        if (open) App.replaceSheet('<div data-gymfind></div><div class="callout">' + icon('alert') + '<div>' + esc(msg) + '</div></div>', U().btn('Try again', q ? 'gymSearch' : 'gymFindNear', null, 'btn--block btn--accent') + U().btn('Back to your gyms', 'gymBack', null, 'btn--block btn--plain'));
        else App.toast(msg, 'alert');
        return;
      }
      found = r; App.sound('set'); App.haptic('success');
      if (open) App.replaceSheet(foundBody(r), ''); else App.toast(r.gyms.length + ' gyms found. Open Your gyms to pick one', 'pin');
    });
  }
  function locate(then) {
    if (!navigator.geolocation) { then(false); return; }
    App.toast('Finding where you are…', 'pin');
    navigator.geolocation.getCurrentPosition((pos) => {
      App.AI.setWhere({ lat: Math.round(pos.coords.latitude * 1000) / 1000, lon: Math.round(pos.coords.longitude * 1000) / 1000 });
      then(true, [pos.coords.latitude, pos.coords.longitude]);
    }, () => then(false), { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  }

  // ── One gym: what it has, checked online ──────────────────────────────────
  const running = {};
  function detailBody(g) {
    const cur = E.gym(); const here = cur && cur.id === g.id; const r = g.research; const job = running[g.id];
    let h = '<div data-gymdetail="' + esc(g.id) + '"></div><div class="sheet__lead"><div class="eyebrow">' + esc([g.suburb, here ? 'Training here' : ''].filter(Boolean).join(' · ') || ((DB.CHAINS[g.chain] || {}).name || 'Gym')) + '</div><h1 class="sheet__h1">' + esc(g.name) + '</h1>' +
      ((g.address || g.hours) ? '<p class="muted" style="font-size:15px">' + esc([g.address, g.hours].filter(Boolean).join(' · ')) + '</p>' : '') + '</div>';
    if (job) {
      h += '<div data-gymcheck></div><div class="lookup"><div class="lookup__now"><span class="spinner" aria-hidden="true"></span><span data-lookup-now>Checking the equipment…</span></div><ul class="lookup__steps" data-lookup-steps aria-live="polite">' +
        job.steps.map((p) => '<li>' + icon('check', 'ic-sm') + '<span>' + esc(p.t === 'search' ? 'Searched “' + p.q + '”' : 'Read a page') + '</span></li>').join('') + '</ul></div><p class="fn">Claude is reading the club’s page, posts and reviews. Usually 30 to 60 seconds. You can close this.</p>';
    } else if (r) {
      h += (r.summary ? '<p class="lead" style="margin:0 0 12px">' + esc(r.summary) + '</p>' : '') +
        '<div class="gymconf gymconf--' + r.confidence + '">' + icon(r.confidence === 'high' ? 'check' : 'info', 'ic-sm') + '<span>' + esc({ high: 'Equipment well documented online', medium: 'Equipment partly confirmed online', low: 'Not much online: mostly the chain’s usual fit-out' }[r.confidence]) + ' · checked ' + esc(App.relLow(App.iso(new Date(r.at)))) + (r.found ? '' : ' · couldn’t find this exact club') + '</span></div>';
    } else if (g.chain !== 'home') {
      h += '<div class="callout callout--blue">' + icon('info') + '<div><b>Not checked yet.</b> ' + (keyed() ? 'Claude can look this gym up online and tell you which of your exercises it can do.' : 'The equipment is the chain’s usual fit-out. Tick what it really has, or switch on Claude to check online.') + '</div></div>';
    }
    if (here) h += sessionCheck();
    if (r && !job) h += equipmentLists(r) + machineList(r) + (r.notes ? '<div class="sec__label">Good to know</div><div class="card"><p style="margin:0;font-size:15px">' + esc(r.notes) + '</p></div>' : '') + sources(r.sources);
    const acts = [];
    if (keyed() && !job && g.chain !== 'home') acts.push(U().cell({ act: 'gymCheck', v: g.id, tile: ['refresh', 'bg-purple'], title: r ? 'Check again' : 'Check what this gym has', sub: 'Claude searches the web, about 10 to 30¢' }));
    if (here) acts.push(U().cell({ act: 'openKit', tile: ['sliders', 'bg-blue'], title: 'Equipment', sub: g.kit.length + ' types ticked. Change anything that’s wrong' }));
    if (g.url) acts.push('<a class="cell" href="' + esc(g.url) + '" target="_blank" rel="noopener noreferrer"><span class="cell__tile bg-ink">' + icon('pin') + '</span><span class="cell__main"><span class="cell__title">Club page</span><span class="cell__sub">Hours, address and contact</span></span>' + icon('right', 'cell__chev') + '</a>');
    if (!here) acts.push(U().cell({ act: 'gymRemove', v: g.id, tile: ['x', 'bg-red'], title: 'Remove this gym' }));
    h += '<div class="group group--tiles" style="margin-top:14px">' + acts.join('') + '</div>';
    return h;
  }
  // Today's (or the next) session at the gym you're at: what's here, and what stands in.
  function sessionCheck() {
    const nx = E.upNext(); const sl = nx && nx.slot; if (!sl) return '';
    const chk = E.gymCheck(sl); const g = E.gym(); const r = g.research;
    const line = (c) => {
      const ex = D.EX[c.id]; let st; let cls;
      if (c.unavailable) { st = 'Not possible here'; cls = 'bad'; } else if (!((D.EX[c.id] || {}).eq || []).length) { st = 'No equipment needed'; cls = 'ok'; } else if (c.planned) { st = 'Instead of ' + App.lc(D.EX[c.planned].name); cls = 'swap'; } else if (!r) { st = 'Equipment ticked'; cls = 'ok'; } else if (c.sure === 'yes') { st = 'Seen at this club'; cls = 'ok'; } else if (c.sure === 'likely') { st = 'Probably here'; cls = 'maybe'; } else { st = 'Not confirmed'; cls = 'maybe'; }
      return '<div class="cell gymex gymex--' + cls + '"><span class="gymex__dot">' + icon(cls === 'ok' ? 'check' : cls === 'bad' ? 'x' : cls === 'swap' ? 'swap' : 'info', 'ic-sm') + '</span><span class="cell__main"><span class="cell__title">' + esc(ex.name) + '</span><span class="cell__sub">' + esc(st) + '</span></span></div>';
    };
    return '<div class="sec__label">' + esc(E.sessionName(sl) + ' · ' + App.rel(E.slotDate(sl)).toLowerCase()) + '</div><div class="group">' + chk.map(line).join('') + '</div>';
  }
  function equipmentLists(r) {
    const by = (st) => r.equipment.filter((x) => x.status === st);
    const chips = (list) => '<div class="chips">' + list.map((x) => '<span class="chip chip--static" title="' + esc(x.evidence || '') + '">' + esc(D.EQUIP_NAME[x.key]) + '</span>').join('') + '</div>';
    const yes = by('yes'); const likely = by('likely'); const no = by('no');
    return (yes.length ? '<div class="sec__label">Seen at this club</div>' + chips(yes) : '') +
      (likely.length ? '<div class="sec__label">Probably there</div>' + chips(likely) : '') +
      (no.length ? '<div class="sec__label">Not there</div>' + chips(no) : '');
  }
  function machineList(r) {
    if (!r.machines || !r.machines.length) return '';
    return '<div class="sec__label">Machines spotted</div><div class="group">' + r.machines.map((m) => '<div class="cell"><span class="cell__main"><span class="cell__title" style="font-size:15px">' + esc(m.name) + '</span>' + (m.note || m.key ? '<span class="cell__sub">' + esc([m.key && D.EQUIP_NAME[m.key], m.note].filter(Boolean).join(' · ')) + '</span>' : '') + '</span></div>').join('') + '</div>';
  }
  function detailSheet(id) {
    const g = E.gymById(id); if (!g) return;
    const here = (E.gym() || {}).id === id;
    const foot = here ? '' : U().btn('Train here today', 'gymUse', id, 'btn--block btn--accent');
    const L = App.topLayer();
    if (L && L.querySelector('[data-gymdetail="' + CSS.escape(id) + '"], [data-gymfind], [data-gyms]')) App.replaceSheet(detailBody(g), foot);
    else App.sheet('Your gyms', detailBody(g), { foot });
  }
  function refreshDetail(id) {
    const L = App.topLayer(); if (!L || !L.querySelector('[data-gymdetail="' + CSS.escape(id) + '"]')) return false;
    const g = E.gymById(id); if (!g) return false;
    const b = L.querySelector('.sheet__body'); const keep = b ? b.scrollTop : 0;
    App.replaceSheet(detailBody(g)); if (b) b.scrollTop = keep;
    return true;
  }
  // Claude reads up on a gym; what it finds becomes the gym's equipment (your own changes stay).
  function research(id) {
    const g = E.gymById(id); if (!g || running[id]) return;
    running[id] = { steps: [] }; refreshDetail(id);
    App.AI.researchGym(g, { progress: (p) => { if (!running[id]) return; running[id].steps.push(p); progress(p); } }).then((r) => {
      delete running[id];
      const gg = E.gymById(id);
      if (r.error === 'cancelled') { refreshDetail(id); return; }
      if (r.error || r.text || !gg) {
        const msg = r.error === 'noweb' ? 'Web search is switched off for your Anthropic account. Turn it on in the Claude Console under Settings, then Capabilities.' : r.error || r.text || 'Couldn’t check that gym.';
        if (!refreshDetail(id)) App.toast(msg, 'alert'); else { const L = App.topLayer(); const b = L.querySelector('.sheet__lead'); if (b) b.insertAdjacentHTML('afterend', '<div class="callout">' + App.icon('alert') + '<div>' + esc(msg) + '</div></div>'); }
        return;
      }
      apply(gg, r);
      App.sound('set'); App.haptic('success');
      const yes = r.equipment.filter((x) => x.status === 'yes').length;
      if (!refreshDetail(id)) App.toast(gg.name + ' checked: ' + yes + ' pieces of equipment confirmed', 'check');
      if ((E.gym() || {}).id === id) App.render();
      if (App.Coach && App.Coach.note) App.Coach.note('Checked ' + gg.name + ' online: ' + yes + ' confirmed, ' + r.equipment.filter((x) => x.status === 'likely').length + ' likely');
    });
  }
  function apply(g, r) {
    const removed = g.removed || [];
    const has = r.equipment.filter((x) => x.status !== 'no').map((x) => x.key).filter((k) => !removed.includes(k));
    const no = r.equipment.filter((x) => x.status === 'no').map((x) => x.key);
    g.kit = uniq(g.kit.filter((t) => !no.includes(t)).concat(has));
    if (r.address && !g.address) g.address = r.address;
    if (r.url && !g.url) g.url = r.url;
    if (r.hours) g.hours = r.hours;
    g.research = { at: App.nowMs(), found: r.found, summary: r.summary, confidence: r.confidence, equipment: r.equipment, machines: r.machines, notes: r.notes, sources: (r.sources || []).slice(0, 6) };
    App.save();
  }
  // Switch, and say how today's session fits the new gym.
  function use(id, quiet) {
    const g = E.switchGym(id); if (!g) return;
    App.closeLayer(true); App.render(); App.sound('set'); App.haptic('success');
    const nx = E.upNext(); const chk = nx && nx.slot ? E.gymCheck(nx.slot) : [];
    const subs = chk.filter((c) => c.planned).length; const miss = chk.filter((c) => c.unavailable).length;
    if (!quiet) App.toast('Training at ' + (g.short || g.name) + (subs || miss ? ' · ' + (subs ? subs + ' ' + App.plural(subs, 'exercise') + ' swapped' : '') + (subs && miss ? ', ' : '') + (miss ? miss + ' not possible' : '') : ''), 'pin');
    return g;
  }

  App.ACT = App.ACT || {};
  Object.assign(App.ACT, {
    openGyms() { App.closeLayer(true); query = ''; setTimeout(gymsSheet, App.topLayer() ? 300 : 0); },
    gymOpen(el) { detailSheet(el.dataset.v); },
    gymUse(el) { use(el.dataset.v); },
    gymDir(el) {
      const e = DB.GYMS.find((g) => g.id === el.dataset.v); if (!e) return;
      const g = E.addGym(E.gymFromDirectory(e), false); use(g.id);
    },
    gymSearch() {
      const i = App.$('#gymQ'); const q = ((i && i.value) || query || '').trim();
      if (!q) { if (i) i.focus(); return; }
      query = q; if (i) i.blur();
      if (!keyed()) { const L = App.topLayer(); const res = L && L.querySelector('[data-gymres]'); if (res) res.innerHTML = dirResults(); return; }
      find(q);
    },
    gymFindNear() {
      if (!keyed()) return App.ACT.gymNearDir();
      locate((ok) => {
        if (!ok && !App.AI.where().label) { App.toast('Couldn’t get your location. Type your suburb instead.', 'alert'); const i = App.$('#gymQ'); if (i) i.focus(); return; }
        find('');
      });
    },
    gymNearDir() {
      locate((ok, pt) => {
        if (!ok) { App.toast('Couldn’t get your location. Type your suburb instead.', 'alert'); return; }
        const list = E.gymsNear(pt, 6); const L = App.topLayer(); const res = L && L.querySelector('[data-gymres]'); if (!res) return;
        res.innerHTML = '<div class="sec__label">Near you</div><div class="group group--tiles">' + list.map((g) => U().cell({ act: 'gymDir', v: g.id, lead: tile(g.chain), title: esc(g.name), sub: esc(g.suburb + ' · ' + dist(g.km)) })).join('') + '</div>';
      });
    },
    gymPick(el) {
      const r = found && found.gyms[Number(el.dataset.v)]; if (!r) return;
      const g = E.addGym(E.webGym(r), false); use(g.id, true);
      App.toast('Training at ' + (g.short || g.name), 'pin');
      setTimeout(() => { detailSheet(g.id); if (keyed() && !g.research) research(g.id); }, 320);
    },
    gymStop() { App.AI.cancelGymJobs(); finding++; gymsSheet(); },
    gymBack() { gymsSheet(); },
    gymCheck(el) { const id = el.dataset.v; detailSheet(id); research(id); },
    gymRemove(el) {
      const g = E.gymById(el.dataset.v); if (!g) return;
      if (E.removeGym(g.id)) { App.toast(g.name + ' removed', 'check'); gymsSheet(); }
    },
    gymAdd() {
      const body = '<div class="sheet__lead"><h1 class="sheet__h1">Add a gym</h1><p class="lead">Its name, like “Anytime Fitness Kellyville”. You can tick what it has next.</p></div>' +
        '<label class="vh" for="gymNew">Gym name</label><input id="gymNew" class="input" placeholder="Gym name" autocomplete="off" autocapitalize="words" enterkeyhint="done" data-enter="gymAddSave">' +
        '<label class="vh" for="gymNewSub">Suburb</label><input id="gymNewSub" class="input" placeholder="Suburb (optional)" autocomplete="off" autocapitalize="words" style="margin-top:10px" data-enter="gymAddSave">';
      App.replaceSheet(body, U().btn('Add and train here', 'gymAddSave', null, 'btn--block btn--accent'));
      const i = App.$('#gymNew'); if (i) i.focus();
    },
    gymAddSave() {
      const name = ((App.$('#gymNew') || {}).value || '').trim().slice(0, 70); const sub = ((App.$('#gymNewSub') || {}).value || '').trim().slice(0, 50);
      if (!name) { App.toast('Type the gym’s name', 'alert'); return; }
      const g = E.addGym(E.customGym(name, E.chainFromName(name), sub), false); use(g.id, true);
      App.toast('Training at ' + (g.short || g.name), 'pin');
      setTimeout(() => { detailSheet(g.id); if (keyed()) research(g.id); else App.Views.kitSheet(); }, 320);
    },
  });
  Object.assign(App.IN, {
    gymQ(el) { query = el.value; const L = App.topLayer(); const res = L && L.querySelector('[data-gymres]'); if (res) res.innerHTML = dirResults(); },
  });

  App.Gym = { gymsSheet, detailSheet, research, apply, use, running: () => Object.keys(running) };
})();
