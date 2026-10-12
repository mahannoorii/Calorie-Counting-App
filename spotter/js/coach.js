/* Spotter — the coach. Context-aware pre-written answers everywhere; real AI where the host
   provides it (the claude.ai preview's `sample` capability). A live human coach is a placeholder. */
(function () {
  'use strict';
  const App = window.App;
  const D = window.SpotterData;
  const { esc, icon } = App;

  const SUGGEST = {
    onboarding: ['why', 'machines', 'enough', 'data'],
    today: ['motivation', 'sore', 'results', 'wear', 'etiquette'],
    ready: ['wear', 'weight', 'taken', 'watched', 'etiquette'],
    warmup: ['warmup', 'breathe', 'asthma', 'pain'],
    exercise: ['__setup', 'weight', '__feel', 'taken', '__avoid', 'pain'],
    rest: ['rest', 'breathe', 'asthma', 'dizzy'],
    cooldown: ['cooldown', 'sore', 'after'],
    complete: ['sore', 'after', 'increase', 'rewards'],
    food: ['gathering', 'takeaway', 'sweets', 'offtrack', 'tahdig', 'protein'],
    journey: ['rewards', 'results', 'enough'],
    me: ['data', 'rewards'],
  };

  const norm = (s) => String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
  const kb = (id) => D.KB.find((k) => k.id === id);
  let ctx = { key: 'today', label: 'Today' };
  let aiSample = null;      // the host's sample() function, when available
  let aiOff = false;        // switched off after a refusal or missing grant
  let busy = false;
  let ctl = null;

  function setContext(c) { ctx = Object.assign({ key: 'today', label: 'Today' }, c || {}); }
  function getContext() { return ctx; }

  function initAI() {
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      window.claude.use('sample').then((fn) => { if (fn) { aiSample = fn; refreshStatus(); } }).catch(() => {});
    } catch (e) { /* not in a Claude viewer */ }
  }
  function aiReady() { return !!aiSample && !aiOff; }

  // ── Suggested questions ───────────────────────────────────────────────────
  function suggestions() {
    const ids = SUGGEST[ctx.key] || SUGGEST.today;
    return ids.map((id) => {
      if (id[0] === '_') {
        if (!ctx.exId) return null;
        const ex = D.EX[ctx.exId];
        const label = id === '__setup' ? 'How do I set this up?' : id === '__feel' ? 'Where should I feel it?' : 'What should I avoid?';
        return { id: id + ':' + ctx.exId, q: label, ex: ex.name };
      }
      const k = kb(id); return k ? { id, q: k.q } : null;
    }).filter(Boolean);
  }

  // ── Pre-written answers ───────────────────────────────────────────────────
  function numbered(arr) { return arr.map((s, i) => (i + 1) + '. ' + s).join('\n'); }
  function bullets(arr) { return arr.map((s) => '- ' + s).join('\n'); }
  function exAnswer(kind, id) {
    const ex = D.EX[id]; if (!ex) return null;
    const saved = App.S.exSettings[id];
    if (kind === 'setup') return 'Setting up the ' + ex.name.toLowerCase() + ':\n\n' + numbered(ex.setup) + (saved && saved.seat ? '\n\nYour saved settings: ' + saved.seat + '.' : '\n\nOnce it feels right, tap "Save my settings" so next time is quicker.');
    if (kind === 'feel') return 'You should feel it in: ' + ex.feel.replace(/\.$/, '').toLowerCase() + '.\n\nIf you feel it in your joints or lower back instead, lighten the weight and slow down.';
    if (kind === 'avoid') return 'Watch out for:\n\n' + bullets(ex.avoid || []);
    if (kind === 'move') return 'How to do it:\n\n' + numbered(ex.move);
    if (kind === 'weight') { const sg = App.E.suggest(id); return sg.title + '.\n\n' + sg.why; }
    return null;
  }
  function scripted(text) {
    const q = norm(text);
    if (ctx.exId) {
      if (/set ?up|adjust|seat|start position|get (it|this) ready/.test(q)) return { text: exAnswer('setup', ctx.exId) };
      if (/feel|which muscle|where should|working\b/.test(q) && !/don'?t feel like/.test(q)) return { text: exAnswer('feel', ctx.exId) };
      if (/mistake|avoid|careful|wrong/.test(q)) return { text: exAnswer('avoid', ctx.exId) };
      if (/how (do i|to) (do|move|perform)|technique|movement/.test(q)) return { text: exAnswer('move', ctx.exId) };
      if (/(what|which|how much) weight|how heavy|kg\b|what should i lift/.test(q)) return { text: exAnswer('weight', ctx.exId) };
    }
    let best = null; let score = 0;
    D.KB.forEach((k) => {
      let s = 0;
      k.keys.forEach((key) => { const nk = norm(key); if (nk && q.includes(nk)) s += nk.includes(' ') ? 3 : 2; });
      if (s && k.ctx.includes(ctx.key)) s += 1;
      if (k.urgent && s) s += 3;
      if (s > score) { score = s; best = k; }
    });
    if (best && score >= 2) return { text: best.a, urgent: best.urgent, id: best.id };
    return { text: 'Good question. I don’t have a ready answer for that one yet. In the full app, a live coach will pick up anything I can’t answer.\n\nFor now, try one of the questions below, or ask about your exercises, rest, food or motivation.', fallback: true };
  }

  // ── AI prompt (memoryless: every call carries its own context) ────────────
  function profileText() {
    const s = App.S; const p = s.profile || {}; const plan = s.plan;
    const lines = [];
    if (p.name) lines.push('Name: ' + p.name);
    if (p.goals && p.goals.length) lines.push('Goals: ' + p.goals.map((g) => (D.GOALS.find((x) => x.id === g) || {}).label).join(', '));
    if (p.event && p.event.date) lines.push('Working towards: ' + (p.event.name || 'an event') + ' on ' + App.fmtDate(p.event.date));
    if (p.feel && p.feel.length) lines.push('Wants to feel: ' + p.feel.join(', '));
    if (p.experience) lines.push('Gym experience: ' + (D.EXPERIENCE.find((x) => x.id === p.experience) || {}).label);
    if (p.worries && p.worries.length) lines.push('Worries: ' + p.worries.map((w) => (D.WORRIES.find((x) => x.id === w) || {}).label).join(', '));
    if (p.health) lines.push('Asthma: ' + (p.health.asthma ? 'yes (carries reliever)' : 'no') + (p.health.flag ? '; answered yes on pre-exercise screening' + (p.health.cleared ? ' and has been cleared by a GP' : ' and has NOT yet been cleared by a GP') : ''));
    if (plan) {
      lines.push('Gym: ' + App.E.gymName(plan.gymId));
      lines.push('Schedule: ' + plan.days.map((d) => App.DOW_LONG[d]).join(' and ') + ', ' + plan.mins + ' min, machines only');
      ['A', 'B'].forEach((k) => lines.push(plan.sessions[k].name + ': ' + App.E.exercisesFor(k, 1).map((e) => D.EX[e.id].name).join(', ')));
      const t = App.E.totals(); lines.push('Sessions done: ' + t.done + ' of ' + t.total);
    }
    if (p.derailers && p.derailers.length) lines.push('Food derailers: ' + p.derailers.map((d) => (D.DERAILERS.find((x) => x.id === d) || {}).label).join(', '));
    if (p.dishes && p.dishes.length) lines.push('Loves cooking: ' + p.dishes.map((d) => (D.DISHES.find((x) => x.id === d) || {}).name).join(', '));
    const last = s.log[s.log.length - 1];
    if (last) lines.push('Last session (' + last.date + '): ' + last.ex.map((e) => D.EX[e.id].name + ' ' + e.sets.map((x) => (x.w ? App.fmtKg(x.w) + 'kg×' : '') + x.r).join('/') + (e.effort ? ' (' + App.E.effortWord(e.effort) + ')' : '')).join('; '));
    return lines.join('\n');
  }
  function contextText() {
    let t = 'Screen: ' + (ctx.label || ctx.key);
    if (ctx.exId) {
      const ex = D.EX[ctx.exId]; const sg = App.E.suggest(ctx.exId);
      t += '\nCurrent exercise: ' + ex.name + ' (' + (ex.reps || []).join('-') + ' reps). Set-up: ' + ex.setup.join(' ') + ' Feel it in: ' + ex.feel + ' App suggestion today: ' + sg.title + ' (' + sg.why + ')';
    }
    return t;
  }
  function rules() {
    return [
      'You are Spotter, a warm, practical personal trainer inside a gym app for beginners in Sydney, Australia.',
      'Reply in plain Australian English, briefly: 2 to 5 short sentences, or a short numbered list when steps help. Use kilograms. No markdown headings.',
      'Give general fitness and healthy-eating guidance only. Never diagnose, never prescribe diets, calorie targets or supplements.',
      'Safety first: for pain, injury, dizziness, chest pain or asthma symptoms, tell them to stop, use their reliever as their asthma action plan says, see their GP, and call 000 in an emergency.',
      'Food advice follows the Australian Dietary Guidelines in everyday words (hand portions, protein at meals, lighter versions of dishes they love). Respect their Persian home cooking and family gatherings; never shame food.',
      'Machine photos and exact locations in their gym are not mapped yet, so describe machines by type and suggest asking gym staff.',
      'This app is a prototype. If asked about features that do not exist yet, say they are coming.',
      '',
      'About the member:',
      profileText(),
      '',
      'Where they are in the app right now:',
      contextText(),
    ].join('\n');
  }

  // ── Chat UI ───────────────────────────────────────────────────────────────
  function statusText() { return aiReady() ? 'AI coach · general guidance only' : 'Pre-written answers for now'; }
  function refreshStatus() { const el = document.querySelector('[data-coach-status]'); if (el) el.textContent = statusText(); }
  function msgHtml(m) {
    const cls = m.role === 'me' ? 'msg msg--me' : 'msg msg--coach' + (m.urgent ? ' msg--urgent' : '');
    return '<div class="' + cls + '">' + esc(m.text) + (m.note ? '<span class="msg__note">' + esc(m.note) + '</span>' : '') + '</div>';
  }
  function greeting() {
    const p = App.S.profile; const name = p && p.name ? p.name.split(' ')[0] : '';
    if (ctx.exId) return 'Hey' + (name ? ' ' + name : '') + ', I’m right here. Ask me anything about the ' + D.EX[ctx.exId].name.toLowerCase() + '.';
    if (ctx.key === 'food') return 'Food questions are my favourite. Family gatherings, takeaway, sweets: ask away.';
    if (ctx.key === 'onboarding') return 'Hi! I’m Spotter, your coach. Ask me anything while we set up your plan.';
    return 'Hey' + (name ? ' ' + name : '') + '. I’m your coach, here at every step. What’s on your mind?';
  }
  function open(c) {
    if (c) setContext(c);
    const hist = App.S.coach.slice(-20);
    const sugg = suggestions();
    const html =
      '<div class="sheet coach">' +
        '<div class="sheet__grab"></div>' +
        '<div class="coach__head">' +
          '<div class="coach__face">' + App.plate('', '#ffffff', { ring: 'rgba(36,72,245,.35)', hub: 'rgba(36,72,245,.18)', hole: '#2448f5' }).replace('<svg class=""', '<svg style="width:30px;height:30px"') + '</div>' +
          '<div class="grow"><div class="coach__name">Spotter</div><div class="coach__status" data-coach-status>' + statusText() + '</div></div>' +
          '<button class="icon-btn icon-btn--flat" data-act="closeLayer" aria-label="Close coach">' + icon('x') + '</button>' +
        '</div>' +
        '<div class="coach__ctx">' + icon('pin', 'ic-sm') + 'Talking about: ' + esc(ctx.label || 'Today') + '</div>' +
        '<div class="coach__msgs" data-coach-msgs>' +
          msgHtml({ role: 'coach', text: greeting() }) +
          hist.map(msgHtml).join('') +
        '</div>' +
        '<div class="coach__suggest" data-coach-suggest>' + sugg.map((s) => '<button class="chip" data-act="coachSuggest" data-id="' + esc(s.id) + '">' + esc(s.q) + '</button>').join('') + '</div>' +
        '<form class="coach__composer" data-coach-form>' +
          '<label class="visually-hidden" for="coachInput">Message Spotter</label>' +
          '<input id="coachInput" class="input" autocomplete="off" placeholder="Ask your coach anything" enterkeyhint="send">' +
          '<button class="coach__send" type="submit" aria-label="Send">' + icon('send') + '</button>' +
        '</form>' +
        '<div style="padding:0 var(--gutter) 12px"><button class="btn btn--plain btn--sm" data-act="humanCoach">' + icon('people', 'ic-sm') + 'Talk to a real coach</button></div>' +
      '</div>';
    const el = App.openLayer(html, { cls: 'coach' });
    const form = el.querySelector('[data-coach-form]');
    form.addEventListener('submit', (ev) => { ev.preventDefault(); const inp = form.querySelector('input'); const v = inp.value.trim(); if (!v) return; inp.value = ''; ask(v); });
    scrollDown();
    return el;
  }
  function scrollDown() { const m = document.querySelector('[data-coach-msgs]'); if (m) m.scrollTop = m.scrollHeight; }
  function append(m) {
    const box = document.querySelector('[data-coach-msgs]'); if (!box) return null;
    box.insertAdjacentHTML('beforeend', msgHtml(m)); scrollDown();
    return box.lastElementChild;
  }
  function typing() {
    const box = document.querySelector('[data-coach-msgs]'); if (!box) return null;
    box.insertAdjacentHTML('beforeend', '<div class="msg msg--coach typing" data-typing><i></i><i></i><i></i></div>'); scrollDown();
    return box.lastElementChild;
  }
  function remember(m) { App.S.coach.push(m); if (App.S.coach.length > 40) App.S.coach.splice(0, App.S.coach.length - 40); App.save(); }

  function firstQuestionReward() {
    if (!App.S.badges.coach) { App.award(D.XP.coach); App.unlock('coach'); }
  }

  async function ask(text, preset) {
    if (busy) return;
    busy = true;
    const me = { role: 'me', text };
    append(me); remember(me);
    App.sound('tap');
    const dots = typing();
    if (aiReady() && !preset) {
      ctl = new AbortController();
      let bubble = null;
      try {
        const turns = [{ role: 'user', content: rules() }].concat(
          App.S.coach.slice(-12).map((m) => ({ role: m.role === 'me' ? 'user' : 'assistant', content: m.text }))
        );
        if (turns[turns.length - 1].role !== 'user') turns.push({ role: 'user', content: text });
        const res = await aiSample(turns, {
          cache: false, modelTier: 'quick', signal: ctl.signal,
          onText: ({ text: t }) => { if (dots && dots.isConnected) dots.remove(); if (!bubble) bubble = append({ role: 'coach', text: '' }); bubble.textContent = t; scrollDown(); },
        });
        if (dots && dots.isConnected) dots.remove();
        const out = { role: 'coach', text: res.text };
        if (!bubble) append(out); else bubble.textContent = res.text;
        remember(out);
        firstQuestionReward();
        busy = false;
        return;
      } catch (e) {
        if (dots && dots.isConnected) dots.remove();
        if (bubble) bubble.remove();
        const code = e && e.code;
        if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'refused'].includes(code)) { aiOff = true; refreshStatus(); }
        if (code === 'cancelled') { busy = false; return; }
        // fall through to pre-written answer
      }
    }
    const ans = preset || scripted(text);
    const delay = App.reduceMotion() ? 200 : 650 + Math.min(900, ans.text.length * 3);
    setTimeout(() => {
      const d = document.querySelector('[data-typing]'); if (d) d.remove();
      const out = { role: 'coach', text: ans.text, urgent: !!ans.urgent };
      append(out); remember(out);
      if (ans.urgent) App.sound('soft'); else App.sound('tap');
      firstQuestionReward();
      busy = false;
    }, delay);
  }
  function askSuggested(id) {
    if (id.indexOf('__') === 0) {
      const [kind, exId] = id.split(':');
      const k = kind.replace(/_/g, '');
      const q = k === 'setup' ? 'How do I set this up?' : k === 'feel' ? 'Where should I feel it?' : 'What should I avoid?';
      return ask(q, { text: exAnswer(k, exId) });
    }
    const k = kb(id); if (!k) return;
    return ask(k.q, { text: k.a, urgent: k.urgent });
  }
  function humanCoach() {
    App.openLayer(
      '<div class="modal">' +
        '<div class="option__icon tone-blue" style="width:64px;height:64px;border-radius:20px">' + icon('people', 'ic-lg') + '</div>' +
        '<h2 class="modal__title display">Real coaches are coming</h2>' +
        '<p class="modal__text">In the full app, a qualified coach can review your plan and reply to your messages. In this prototype, Spotter answers with ready-made guidance from a coach’s playbook.</p>' +
        '<button class="btn" data-act="closeLayer">Got it</button>' +
      '</div>', { modal: true });
  }

  App.Coach = { open, ask, askSuggested, setContext, getContext, initAI, aiReady, humanCoach, scripted };
})();
