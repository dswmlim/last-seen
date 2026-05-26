/* =====================================================================
   LAST SEEN — a tiny offline texting-sim dating game.
   You're back on the apps. Eight dates. One evening. Who clicks?
   Vanilla JS. No deps. No network. PG-13, consent-forward, inclusive.
   ===================================================================== */
(() => {
  'use strict';

  // ---------------------------------------------------------------
  // 1. SEEDED RANDOMNESS  (mulberry32 — same seed => same run)
  // ---------------------------------------------------------------
  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h ^= h >>> 16) >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let rng = mulberry32(0);
  const rand = () => rng();
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const chance = (p) => rand() < p;

  // ---------------------------------------------------------------
  // 2. STORAGE
  // ---------------------------------------------------------------
  const KEY = 'lastseen.v1';
  const defaults = {
    muted: false, reduced: false, contrast: false,
    lastSeed: '', bestVibe: 0, runs: 0,
    endings: {}, achievements: {},
    // player identity drives the "spark fit" mechanic (see applyChoice)
    you: { gender: 'nonbinary' }
  };
  // Safe storage: some browsers throw on localStorage access for file:// (opaque
  // origin) or when cookies/storage are blocked. Fall back to an in-memory store
  // so the game still runs (saves just won't persist between sessions).
  const mem = {};
  let storageOK = false;
  try {
    const k = '__ls_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    storageOK = true;
  } catch (e) { storageOK = false; }
  const store = {
    get(key) { try { return storageOK ? window.localStorage.getItem(key) : (key in mem ? mem[key] : null); } catch (e) { return (key in mem) ? mem[key] : null; } },
    set(key, val) { try { if (storageOK) window.localStorage.setItem(key, val); else mem[key] = val; } catch (e) { mem[key] = val; } }
  };
  function load() { try { return { ...defaults, ...JSON.parse(store.get(KEY) || '{}') }; } catch (e) { return { ...defaults }; } }
  function save() { try { store.set(KEY, JSON.stringify(P)); } catch (e) {} }
  const P = load();

  // ---------------------------------------------------------------
  // 3. AUDIO (synth, no files)
  // ---------------------------------------------------------------
  let actx = null;
  function blip(f, d, type, g) {
    if (P.muted) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    actx = actx || new AC(); if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), gn = actx.createGain(), t = actx.currentTime;
    o.type = type || 'sine'; o.frequency.value = f; o.connect(gn); gn.connect(actx.destination);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g || 0.05, t + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.start(t); o.stop(t + d + 0.02);
  }
  const sfx = {
    send: () => blip(620, 0.06, 'sine', 0.04),
    recv: () => blip(440, 0.07, 'triangle', 0.04),
    good: () => { blip(660, 0.08, 'sine', 0.05); setTimeout(() => blip(990, 0.09, 'sine', 0.05), 70); },
    bad: () => blip(180, 0.16, 'sawtooth', 0.05),
    match: () => { blip(523, 0.1, 'triangle', 0.05); setTimeout(() => blip(659, 0.1, 'triangle', 0.05), 90); setTimeout(() => blip(784, 0.14, 'triangle', 0.05), 180); }
  };

  // ---------------------------------------------------------------
  // 4. BANTER GENERATOR  (templates + tags => variety, low word count)
  // ---------------------------------------------------------------
  const BANK = {
    greetWarm: ['ok so {opener} 😄', 'not me getting nervous typing this lol — {opener}', '{opener} (yes I rehearsed this)'],
    opener: ['hi hi', 'hello you', 'heyyy', 'okay hi, this is happening'],
    laugh: ['that genuinely made me laugh', 'STOP that\u2019s so funny', 'ok you\u2019re funny, noted', 'lmao okay you win this round'],
    warm: ['this is nice', 'I like how your brain works', 'ok I\u2019m into this energy', 'you\u2019re easy to talk to'],
    flat: ['oh. cool.', 'mm, gotcha', 'haha yeah', 'totally'],
    cringe: ['oof', 'that\u2019s\u2026 a choice', 'we\u2019ll circle back to that one', 'bold. wrong, but bold'],
    curious: ['wait tell me more', 'ok now I need the full story', 'go on\u2026', 'and THEN what'],
    nudge: ['your turn — {q}', 'random q: {q}', 'ok be honest: {q}', 'serious question: {q}'],
    q: ['pineapple on pizza, defend yourself', 'window or aisle?', 'what\u2019s your comfort movie', 'tabs or spaces (no wrong answer except one)', 'beach person or mountain person', 'what song is stuck in your head right now']
  };
  function fill(tmpl) {
    return tmpl.replace(/\{(\w+)\}/g, (_, tag) => BANK[tag] ? pick(BANK[tag]) : ('{' + tag + '}'));
  }
  function banter(tag) { return fill(pick(BANK[tag] || ['…'])); }

  // ---------------------------------------------------------------
  // 5. CHARACTERS  (inclusive roster; pronouns respected in text)
  //    `into` = genders this person is romantically drawn to. Drives the
  //    "spark fit" mechanic: a match makes Chemistry come easier; a non-match
  //    isn't a fail — the date leans warm/friendly instead (never punished).
  // ---------------------------------------------------------------
  const GENDERS = {
    guy:        { label: 'a guy',        pron: 'he/him',   emoji: '🧑' },
    girl:       { label: 'a girl',       pron: 'she/her',  emoji: '👩' },
    nonbinary:  { label: 'nonbinary',    pron: 'they/them', emoji: '🧑\u200d🦱' }
  };
  function youGender() { return (P.you && GENDERS[P.you.gender]) ? P.you.gender : 'nonbinary'; }

  const CAST = [
    { id: 'remy', name: 'Remy', pron: 'they/them', emoji: '🧃', tag: 'plant-store poet', likes: 'curious', dislikes: 'flat',
      into: ['guy', 'girl', 'nonbinary'], bio: 'reads tarot ironically, means it sincerely' },
    { id: 'sol', name: 'Sol', pron: 'she/her', emoji: '🎧', tag: 'night-shift DJ', likes: 'laugh', dislikes: 'cringe',
      into: ['girl', 'nonbinary'], bio: 'will make you a playlist before a second date' },
    { id: 'theo', name: 'Theo', pron: 'he/him', emoji: '🛹', tag: 'recovering startup guy', likes: 'warm', dislikes: 'flat',
      into: ['girl', 'nonbinary'], bio: 'quit the grind, learning to bake sourdough badly' },
    { id: 'juno', name: 'Juno', pron: 'she/they', emoji: '📷', tag: 'film-camera archivist', likes: 'curious', dislikes: 'cringe',
      into: ['guy', 'girl', 'nonbinary'], bio: 'has opinions about light and none about brunch' },
    { id: 'kit', name: 'Kit', pron: 'he/him', emoji: '🎸', tag: 'open-mic regular', likes: 'laugh', dislikes: 'flat',
      into: ['guy', 'nonbinary'], bio: 'writes songs about people he met once' },
    { id: 'mara', name: 'Mara', pron: 'she/her', emoji: '🧗', tag: 'weekend climber', likes: 'warm', dislikes: 'cringe',
      into: ['guy', 'girl', 'nonbinary'], bio: 'will absolutely out-plan your whole weekend' }
  ];

  // ---------------------------------------------------------------
  // 6. SCENES  (8 dates; each choice nudges stats + may set flags)
  //    stats: chem (chemistry), trust, vibe.  delayed = fires later.
  // ---------------------------------------------------------------
  const SCENES = [
    { id: 'open', prompt: (m) => `${m.name} ${m.emoji}: ${banter('greetWarm')}`, choices: [
      { t: 'Match the energy: "hi hi, I was just thinking about texting you"', chem: 2, trust: 1, vibe: 1, react: 'warm', flag: 'forward' },
      { t: 'Play it cool: "oh hey. what\u2019s up"', chem: 0, trust: 0, vibe: -1, react: 'flat' },
      { t: 'Open with a bit: "warning, I\u2019m 80% bad puns by volume"', chem: 1, trust: 0, vibe: 2, react: 'laugh', flag: 'funny' }
    ]},
    { id: 'icebreak', prompt: (m) => `${m.name}: ${banter('nudge')}`, choices: [
      { t: 'Answer honestly + lob it back', chem: 1, trust: 2, vibe: 1, react: 'curious' },
      { t: 'Deflect with a joke', chem: 1, trust: -1, vibe: 2, react: 'laugh', flag: 'funny' },
      { t: 'One-word answer', chem: -1, trust: -1, vibe: -2, react: 'flat' }
    ]},
    { id: 'overshare', prompt: () => `they send a wall of text about their week. it\u2019s a lot. it\u2019s kind of endearing.`, choices: [
      { t: 'Meet them there — share something real too', chem: 1, trust: 3, vibe: 0, react: 'warm', flag: 'vulnerable' },
      { t: 'Validate + keep it light', chem: 1, trust: 1, vibe: 1, react: 'warm' },
      { t: '"tl;dr?"', chem: -2, trust: -2, vibe: 0, react: 'cringe' }
    ]},
    { id: 'plan', prompt: (m) => `${m.name}: should we get out of the group chat of our own making and actually meet?`, choices: [
      { t: 'Suggest a specific low-key plan (coffee, walk)', chem: 2, trust: 2, vibe: 1, react: 'warm', flag: 'planner' },
      { t: '"yes!! you pick though"', chem: 1, trust: 0, vibe: 1, react: 'curious' },
      { t: 'Get cold feet, stall', chem: -1, trust: -2, vibe: -1, react: 'flat', flag: 'skittish' }
    ]},
    { id: 'date', prompt: () => `the date is happening. there\u2019s a lull. the good kind. they catch you smiling.`, choices: [
      { t: 'Own it: "what? I\u2019m having a nice time"', chem: 3, trust: 1, vibe: 1, react: 'warm', flag: 'brave' },
      { t: 'Make a joke to break the tension', chem: 0, trust: 0, vibe: 2, react: 'laugh', flag: 'funny' },
      { t: 'Check your phone', chem: -2, trust: -2, vibe: -2, react: 'flat', flag: 'distracted' }
    ]},
    { id: 'values', prompt: (m) => `${m.name} mentions something they really care about. they\u2019re watching how you respond.`, choices: [
      { t: 'Ask a genuine follow-up question', chem: 1, trust: 3, vibe: 1, react: 'curious', flag: 'listener' },
      { t: 'Relate it to your own thing', chem: 1, trust: 0, vibe: 1, react: 'warm' },
      { t: 'Change the subject', chem: -1, trust: -2, vibe: -1, react: 'flat' }
    ]},
    { id: 'wobble', prompt: () => `you accidentally say something that lands wrong. tiny silence. recoverable.`, choices: [
      { t: 'Name it kindly + apologize', chem: 1, trust: 2, vibe: 0, react: 'warm', flag: 'grown' },
      { t: 'Lighten it with self-deprecation', chem: 1, trust: 1, vibe: 1, react: 'laugh' },
      { t: 'Double down', chem: -2, trust: -3, vibe: -1, react: 'cringe', flag: 'stubborn' }
    ]},
    { id: 'close', prompt: (m) => `end of the night. ${m.name} lingers. "so\u2026 this was good, right?"`, choices: [
      { t: 'Be clear about wanting a next time', chem: 2, trust: 2, vibe: 1, react: 'warm', flag: 'clear' },
      { t: 'Suggest, gently, no pressure either way', chem: 1, trust: 2, vibe: 1, react: 'curious', flag: 'consentforward' },
      { t: 'Go vague and mysterious', chem: -1, trust: -1, vibe: 0, react: 'flat' }
    ]}
  ];

  // ---------------------------------------------------------------
  // 7. ENDINGS  (>=5; chosen from final stats + flags)
  // ---------------------------------------------------------------
  const ENDINGS = [
    { id: 'soulmate', name: 'Genuine Connection', emoji: '💞', test: (s, f) => s.chem >= 10 && s.trust >= 10,
      text: 'Not a fairy tale — better. You both put the phones down and meant it. Second date already on the calendar.' },
    { id: 'slowburn', name: 'Slow Burn', emoji: '🔥', test: (s, f) => s.trust >= 9 && s.chem >= 4,
      text: 'No fireworks. Just a steady warmth and a text the next morning that says "hey, that was really nice."' },
    { id: 'besties', name: 'Incredible Friends', emoji: '🤝', test: (s, f) => s.trust >= 8 && s.chem < 5,
      text: 'The romance fizzled but something rarer showed up: a real friend. You\u2019ll be at each other\u2019s weddings. Not to each other.' },
    { id: 'comedians', name: 'The Bit Never Ended', emoji: '🤡', test: (s, f) => f.funny && s.vibe >= 7,
      text: 'You made each other laugh for four straight hours and learned almost nothing real. Honestly? Worth it.' },
    { id: 'ghosted', name: 'Left on Read', emoji: '👻', test: (s, f) => s.trust <= 2 || f.distracted,
      text: 'The three dots appeared. Then vanished. Then never came back. The apps are a harsh teacher.' },
    { id: 'mismatch', name: 'Wrong Person, Right Time', emoji: '🪞', test: () => true, // fallback
      text: 'Lovely, just not a fit. You both knew it by the end and were kind about it. That\u2019s its own small win.' }
  ];

  // ---------------------------------------------------------------
  // 8. ACHIEVEMENTS  (>=10; offline, fun, shareable)
  // ---------------------------------------------------------------
  const ACHIEVEMENTS = [
    { id: 'first', name: 'New Phone Who Dis', emoji: '📱', desc: 'Finish your first date.' },
    { id: 'funnybone', name: 'Class Clown', emoji: '🤣', desc: 'Use 3+ jokes in one run.' },
    { id: 'openheart', name: 'Open Heart', emoji: '❤️\u200d🩹', desc: 'Be vulnerable when it counted.' },
    { id: 'planner', name: 'Logistics Hero', emoji: '🗓️', desc: 'Make an actual plan.' },
    { id: 'listener', name: 'Actually Listening', emoji: '👂', desc: 'Ask a genuine follow-up.' },
    { id: 'consent', name: 'Green Flag', emoji: '🟢', desc: 'Leave room for a no.' },
    { id: 'grown', name: 'Repair Specialist', emoji: '🩹', desc: 'Recover gracefully from a misstep.' },
    { id: 'maxchem', name: 'Sparks Flew', emoji: '✨', desc: 'Reach 10+ Chemistry.' },
    { id: 'maxtrust', name: 'Vault', emoji: '🔐', desc: 'Reach 10+ Trust.' },
    { id: 'soul', name: 'The Good Ending', emoji: '💞', desc: 'Unlock Genuine Connection.' },
    { id: 'collector', name: 'Heartbreak Kid', emoji: '🃏', desc: 'Unlock 4+ different endings.' },
    { id: 'sampler', name: 'Around the World', emoji: '🌍', desc: 'Meet all 6 characters (across runs).' },
    { id: 'allids', name: 'Both Sides Now', emoji: '🔄', desc: 'Play as more than one identity.' },
    { id: 'friendzen', name: 'Friend Energy', emoji: '🫶', desc: 'Befriend a non-match (Incredible Friends).' }
  ];

  // ---------------------------------------------------------------
  // 9. RUNTIME STATE + DOM
  // ---------------------------------------------------------------
  const el = (id) => document.getElementById(id);
  const view = el('view');
  let R = null; // current run

  function newRun(seed) {
    seed = (seed || '').trim() || autoSeed();
    P.lastSeed = seed; save();
    rng = mulberry32(hashSeed(seed));
    const m = CAST[Math.floor(rand() * CAST.length)];
    // "spark fit": does this person date someone of the player's gender?
    const g = youGender();
    const fit = !m.into || m.into.indexOf(g) !== -1;
    R = { seed, m, fit, g, i: 0, s: { chem: 0, trust: 0, vibe: 0 }, flags: {}, jokes: 0, log: [], delayed: [] };
    markCharSeen(m.id);
    P._ids = P._ids || {}; P._ids[g] = true; save();
    sfx.recv();
    renderScene();
  }
  function autoSeed() {
    const a = ['velvet', 'neon', 'midnight', 'honey', 'static', 'lilac', 'ember', 'cosmic'];
    const b = ['fox', 'comet', 'diner', 'cassette', 'orbit', 'pigeon', 'sundae', 'echo'];
    return pick(a) + '-' + pick(b) + '-' + Math.floor(rand() * 90 + 10);
  }

  function applyChoice(c) {
    // Spark fit (gender match) shapes how Chemistry lands:
    //  - match: positive Chemistry gets a small boost (the spark comes easy)
    //  - no match: romantic Chemistry is dampened, but that warmth isn't lost —
    //    it flows into Vibe, steering toward the friendly/"Incredible Friends"
    //    ending instead. A non-match is never a penalty, just a different path.
    let dChem = c.chem, dVibe = c.vibe;
    if (c.chem > 0) {
      if (R.fit) dChem = c.chem + 1;
      else { dChem = Math.max(0, c.chem - 1); dVibe = c.vibe + 1; }
    }
    R.s.chem += dChem; R.s.trust += c.trust; R.s.vibe += dVibe;
    R.s.chem = Math.max(0, R.s.chem); R.s.trust = Math.max(0, R.s.trust); R.s.vibe = Math.max(0, R.s.vibe);
    if (c.flag) R.flags[c.flag] = true;
    if (c.flag === 'funny' || c.react === 'laugh') R.jokes++;
    // delayed consequence: skittish/stubborn costs trust next scene
    if (c.flag === 'skittish' || c.flag === 'stubborn') R.delayed.push({ when: R.i + 1, trust: -1 });
    if (c.react === 'good' || dChem + c.trust + dVibe >= 3) sfx.good();
    else if (dChem + c.trust + dVibe <= -3) sfx.bad();
    else sfx.send();
  }

  function renderScene() {
    // resolve delayed effects scheduled for this index
    R.delayed = R.delayed.filter(d => {
      if (d.when === R.i) { R.s.trust = Math.max(0, R.s.trust + (d.trust || 0)); return false; }
      return true;
    });

    if (R.i >= SCENES.length) return renderResult();
    const sc = SCENES[R.i];
    const m = R.m;
    setMeters();

    const promptText = typeof sc.prompt === 'function' ? sc.prompt(m) : sc.prompt;
    view.innerHTML = '';
    const fitTag = R.fit
      ? `<span class="fit spark" title="potential spark">✨ spark potential</span>`
      : `<span class="fit friend" title="not their type romantically, but a great hang">🤝 friend energy</span>`;
    const head = document.createElement('div');
    head.className = 'thread-head';
    head.innerHTML = `<span class="who">${m.emoji} ${esc(m.name)}</span>
      <span class="pron">${esc(m.pron)}</span>
      ${fitTag}
      <span class="tagline">${esc(m.tag)}</span>`;
    view.appendChild(head);

    const bubble = document.createElement('div');
    bubble.className = 'bubble them reveal';
    bubble.textContent = promptText;
    bubble.setAttribute('role', 'status');
    view.appendChild(bubble);

    const opts = document.createElement('div');
    opts.className = 'choices';
    opts.setAttribute('role', 'group');
    opts.setAttribute('aria-label', 'Your reply options');
    sc.choices.forEach((c, idx) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.type = 'button';
      b.innerHTML = `<span class="num">${idx + 1}</span>${esc(c.t)}`;
      b.setAttribute('aria-keyshortcuts', String(idx + 1));
      b.addEventListener('click', () => choose(c, m));
      opts.appendChild(b);
    });
    view.appendChild(opts);

    const prog = document.createElement('div');
    prog.className = 'progress';
    prog.textContent = `date ${R.i + 1} of ${SCENES.length} · seed ${R.seed}`;
    view.appendChild(prog);

    // focus first choice for keyboard users
    const first = opts.querySelector('button');
    if (first) first.focus();
  }

  function choose(c, m) {
    applyChoice(c);
    // show the player's bubble + a reaction, then advance
    const opts = view.querySelector('.choices');
    if (opts) opts.remove();

    const mine = document.createElement('div');
    mine.className = 'bubble me reveal';
    mine.textContent = c.t.replace(/^[^:]*:\s*/, '').replace(/^"|"$/g, '');
    view.appendChild(mine);

    const react = document.createElement('div');
    react.className = 'bubble them reveal delay';
    react.textContent = `${m.name}: ${banter(c.react || 'warm')}`;
    view.appendChild(react);
    sfx.recv();

    setMeters();
    R.i++;
    const wait = P.reduced ? 250 : 850;
    setTimeout(renderScene, wait);
    view.scrollTop = view.scrollHeight;
  }

  function setMeters() {
    el('mChem').style.width = clampPct(R.s.chem) + '%';
    el('mTrust').style.width = clampPct(R.s.trust) + '%';
    el('mVibe').style.width = clampPct(R.s.vibe) + '%';
    el('mChemV').textContent = R.s.chem;
    el('mTrustV').textContent = R.s.trust;
    el('mVibeV').textContent = R.s.vibe;
    el('meters').hidden = false;
  }
  const clampPct = (v) => Math.max(4, Math.min(100, v * 8));

  // ---------------------------------------------------------------
  // 10. RESULT + UNLOCKS
  // ---------------------------------------------------------------
  function renderResult() {
    const s = R.s, f = R.flags;
    const ending = ENDINGS.find(e => e.test(s, f)) || ENDINGS[ENDINGS.length - 1];
    sfx.match();

    // unlocks
    P.runs++;
    P.endings[ending.id] = (P.endings[ending.id] || 0) + 1;
    const vibeScore = s.chem + s.trust + s.vibe;
    if (vibeScore > P.bestVibe) P.bestVibe = vibeScore;

    const newAch = [];
    const grant = (id) => { if (!P.achievements[id]) { P.achievements[id] = true; newAch.push(id); } };
    grant('first');
    if (R.jokes >= 3) grant('funnybone');
    if (f.vulnerable) grant('openheart');
    if (f.planner) grant('planner');
    if (f.listener) grant('listener');
    if (f.consentforward) grant('consent');
    if (f.grown) grant('grown');
    if (s.chem >= 10) grant('maxchem');
    if (s.trust >= 10) grant('maxtrust');
    if (ending.id === 'soulmate') grant('soul');
    if (ending.id === 'besties' && !R.fit) grant('friendzen');
    if (P._ids && Object.keys(P._ids).length >= 2) grant('allids');
    if (Object.keys(P.endings).length >= 4) grant('collector');
    if (seenAllChars()) grant('sampler');
    save();

    view.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'result reveal';
    card.innerHTML = `
      <div class="result-emoji">${ending.emoji}</div>
      <h2>${esc(ending.name)}</h2>
      <p class="result-text">${esc(ending.text)}</p>
      <div class="result-stats">
        <span>✨ Chemistry ${s.chem}</span>
        <span>🔐 Trust ${s.trust}</span>
        <span>🎭 Vibe ${s.vibe}</span>
      </div>
      <p class="result-sub">you played as ${GENDERS[R.g].emoji} ${esc(GENDERS[R.g].label)} · with ${R.m.emoji} ${esc(R.m.name)} (${R.fit ? 'spark' : 'friend-fit'}) · seed <code>${esc(R.seed)}</code></p>
    `;
    view.appendChild(card);

    if (newAch.length) {
      const box = document.createElement('div');
      box.className = 'newach reveal delay';
      box.innerHTML = '<h3>🏅 New badges</h3>' + newAch.map(id => {
        const a = ACHIEVEMENTS.find(x => x.id === id);
        return `<div class="ach"><span>${a.emoji}</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div>`;
      }).join('');
      view.appendChild(box);
    }

    const actions = document.createElement('div');
    actions.className = 'result-actions';
    actions.innerHTML = `
      <button id="again" class="primary" type="button">↻ New evening</button>
      <button id="sameSeed" type="button">Replay seed</button>
      <button id="brag" type="button">🔗 Brag</button>`;
    view.appendChild(actions);

    el('again').addEventListener('click', () => newRun(''));
    el('sameSeed').addEventListener('click', () => newRun(R.seed));
    el('brag').addEventListener('click', () => brag(ending));
    el('meters').hidden = true;
    el('again').focus();
    refreshTrophies();
  }

  async function brag(ending) {
    const txt = `I got "${ending.name}" ${ending.emoji} in LAST SEEN (seed ${R.seed}). Endings unlocked: ${Object.keys(P.endings).length}/6. Try to beat my run: `;
    const full = txt + location.href;
    try {
      if (navigator.share) { await navigator.share({ title: 'LAST SEEN', text: txt, url: location.href }); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(full);
        toast('Copied your brag 📋');
        return;
      }
      throw new Error('no clipboard');
    } catch (e) {
      // file:// or blocked clipboard: never leave the button dead — show the text to copy
      toast('Copy your brag: ' + ending.name + ' ' + ending.emoji);
    }
  }

  // ---------------------------------------------------------------
  // 11. CHARACTER-SEEN TRACKING (for the sampler achievement)
  // ---------------------------------------------------------------
  function markCharSeen(id) { P._seen = P._seen || {}; P._seen[id] = true; save(); }
  function seenAllChars() { return CAST.every(c => P._seen && P._seen[c.id]); }

  // ---------------------------------------------------------------
  // 12. TROPHY / ENDING DRAWERS
  // ---------------------------------------------------------------
  function refreshTrophies() {
    const ee = el('endingList');
    ee.innerHTML = ENDINGS.map(e => {
      const got = P.endings[e.id];
      return `<li class="${got ? 'got' : 'locked'}"><span>${got ? e.emoji : '🔒'}</span>
        <b>${got ? esc(e.name) : '???'}</b>${got ? `<small>×${got}</small>` : ''}</li>`;
    }).join('');
    const al = el('achList');
    al.innerHTML = ACHIEVEMENTS.map(a => {
      const got = P.achievements[a.id];
      return `<li class="${got ? 'got' : 'locked'}"><span>${got ? a.emoji : '🔒'}</span>
        <div><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div></li>`;
    }).join('');
    el('statRuns').textContent = P.runs;
    el('statEndings').textContent = Object.keys(P.endings).length + '/' + ENDINGS.length;
    el('statAch').textContent = Object.values(P.achievements).filter(Boolean).length + '/' + ACHIEVEMENTS.length;
  }

  // ---------------------------------------------------------------
  // 13. TITLE SCREEN
  // ---------------------------------------------------------------
  function renderTitle() {
    el('meters').hidden = true;
    const g = youGender();
    const genderBtns = Object.keys(GENDERS).map(key => {
      const G = GENDERS[key];
      const on = key === g;
      return `<button type="button" class="genopt${on ? ' on' : ''}" data-gender="${key}"
        role="radio" aria-checked="${on}">${G.emoji} ${esc(G.label)}</button>`;
    }).join('');
    view.innerHTML = `
      <div class="title reveal">
        <h1>LAST&nbsp;SEEN</h1>
        <p class="subtitle">You're back on the apps. Eight dates, one evening. Who actually clicks?</p>
        <div class="genrow" role="radiogroup" aria-label="Play as">
          <span class="genlabel">I'm playing as…</span>
          <div class="genopts">${genderBtns}</div>
        </div>
        <div class="seedrow">
          <label for="seedInput">Seed <small>(same seed = same evening)</small></label>
          <input id="seedInput" type="text" placeholder="leave blank for random" autocomplete="off"
            aria-label="Optional run seed" value="${esc(P.lastSeed || '')}" />
        </div>
        <button id="start" class="primary big" type="button">Start the evening →</button>
        <p class="hint">Reply with <kbd>1</kbd>–<kbd>3</kbd> or tap. Your match's vibe depends on who they\u2019re into \u2014 a non-match just leans toward friendship. It\u2019s warm, a little funny, and on your side.</p>
      </div>`;
    view.querySelectorAll('.genopt').forEach(b => {
      b.addEventListener('click', () => {
        P.you = P.you || {};
        P.you.gender = b.getAttribute('data-gender');
        save();
        view.querySelectorAll('.genopt').forEach(x => {
          const on = x === b;
          x.classList.toggle('on', on);
          x.setAttribute('aria-checked', String(on));
        });
      });
    });
    el('start').addEventListener('click', () => newRun(el('seedInput').value));
    el('seedInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') newRun(el('seedInput').value); });
    refreshTrophies();
  }

  // ---------------------------------------------------------------
  // 14. UI CHROME: toggles, drawer, keyboard, toast
  // ---------------------------------------------------------------
  function applyBodyFlags() {
    document.body.classList.toggle('reduced', !!P.reduced);
    document.body.classList.toggle('contrast', !!P.contrast);
    el('muteBtn').textContent = P.muted ? '🔇' : '🔊';
    el('motionBtn').textContent = P.reduced ? '🎞️ reduced' : '🎞️ motion';
    el('contrastBtn').textContent = P.contrast ? '◐ high-contrast' : '◑ contrast';
    [['muteBtn', P.muted], ['motionBtn', P.reduced], ['contrastBtn', P.contrast]]
      .forEach(([id, on]) => el(id).setAttribute('aria-pressed', String(!!on)));
  }
  function bindChrome() {
    el('muteBtn').addEventListener('click', () => { P.muted = !P.muted; save(); applyBodyFlags(); });
    el('motionBtn').addEventListener('click', () => { P.reduced = !P.reduced; save(); applyBodyFlags(); });
    el('contrastBtn').addEventListener('click', () => { P.contrast = !P.contrast; save(); applyBodyFlags(); });
    el('trophyBtn').addEventListener('click', () => toggleDrawer(true));
    el('drawerClose').addEventListener('click', () => toggleDrawer(false));
    el('drawer').addEventListener('click', (e) => { if (e.target.id === 'drawer') toggleDrawer(false); });
    el('homeBtn').addEventListener('click', renderTitle);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') toggleDrawer(false);
      if (/^[1-3]$/.test(e.key)) {
        const btns = view.querySelectorAll('.choice');
        const b = btns[Number(e.key) - 1];
        if (b) { e.preventDefault(); b.click(); }
      }
    });
  }
  function toggleDrawer(open) {
    const d = el('drawer');
    d.hidden = !open;
    d.setAttribute('aria-hidden', String(!open));
    if (open) { refreshTrophies(); el('drawerClose').focus(); }
    else el('trophyBtn').focus();
  }
  let tT;
  function toast(m) {
    const t = el('toast'); t.textContent = m; t.classList.add('show');
    clearTimeout(tT); tT = setTimeout(() => t.classList.remove('show'), 1700);
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // ---------------------------------------------------------------
  // 15. BOOT
  // ---------------------------------------------------------------
  function boot() {
    if (!store.get(KEY) && window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) { P.reduced = true; save(); }
    applyBodyFlags();
    bindChrome();
    renderTitle();
  }
  boot();
})();
