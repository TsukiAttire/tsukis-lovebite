/* assets/js/script.js
   Full VN + pet shop + bathing + hats system (Option A pet with 3 variants)
   Drop-in replacement: overwrite your current assets/js/script.js
   Persisted keys:
     - stars
     - petUnlocked
     - petChosen
     - hat_owned (JSON array of hat ids)
     - hat_equipped (string hat id or "")
     - petLove (number)
*/

/* ======== ORIGINAL VN / UI (preserved) ======== */
/* (all original VN logic kept — typing, sprites, formspree integration, top-nav) */

(() => {
  // -------------- CONFIG --------------
  const FORM_ENDPOINT = 'https://formspree.io/f/mjkdzyqk';
  const TYPE_SPEED_MS = 24;
  const TALK_INTERVAL_MS = 140;
  const SPRITE_TRANSITION_CLASS = 'sprite-transition';

  const spriteFiles = {
    happy: ['Thanks.png', 'Thanks 2.png'],
    thanks: ['Thanks.png', 'Thanks 2.png'],
    neutral: ['Sad Talking.png', 'Sad Talking 2.png'],
    frown: ['Frown reaction.png', 'Frown reaction.png'],
    wineSmile: ['Holding Wine Smile.png', 'Holding Wine Smile 2.png'],
    wineScoff: ['Holding Wine Scoff.png', 'Holding Wine Scoff 2.png'],
    rose: ['Holding Rose Talk 1.png', 'Holding Rose Talk 2.png'],
    hangup: ['Hanging Up the phone.png', 'Hanging Up the phone 2.png']
  };

  const sprites = {};
  Object.keys(spriteFiles).forEach(k => sprites[k] = spriteFiles[k].map(fn => encodeURI('assets/sprites/' + fn)));

  // -------------- DOM --------------
  const phoneBtn = document.getElementById('phoneButton');
  const vnContainer = document.getElementById('vnContainer');
  const vnClose = document.getElementById('vnClose');
  const tsukiSprite = document.getElementById('tsukiSprite');
  const textBox = document.getElementById('textBox');
  const optionsBox = document.getElementById('optionsBox');
  const suggestModal = document.getElementById('suggestModal');
  const suggestForm = document.getElementById('suggestForm');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const toast = document.getElementById('toast');
  const toggleSfx = document.getElementById('toggle-sfx');
  const openVNbtn = document.getElementById('openVNbtn');

  // small toast helper
  function showToast(msg, duration = 1600) {
    try {
      if (!toast) {
        const t = document.createElement('div');
        t.textContent = msg;
        t.style.position = 'fixed';
        t.style.left = '50%';
        t.style.transform = 'translateX(-50%)';
        t.style.bottom = '110px';
        t.style.padding = '10px 14px';
        t.style.borderRadius = '8px';
        t.style.background = '#5c3d3d';
        t.style.color = '#ffe6e9';
        t.style.zIndex = 999999;
        t.style.fontFamily = 'VT323, monospace';
        document.body.appendChild(t);
        setTimeout(()=>{ try{ t.remove(); } catch(e){} }, duration);
        return;
      }
      toast.innerText = msg;
      toast.classList.add('show');
      setTimeout(()=> toast.classList.remove('show'), duration);
    } catch(e) {
      console.warn('toast fallback failed', e);
    }
  }

  // -------------- Audio (WebAudio synth) --------------
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;
  let ringOscList = [];
  let ringGain = null;
  let ringIntervalId = null;

  function canPlaySound() {
    return audioCtx && (toggleSfx ? toggleSfx.checked : true);
  }

  function startRing() {
    if (!canPlaySound()) return;
    stopRing();
    ringOscList = [];
    ringGain = audioCtx.createGain();
    ringGain.gain.value = 0;
    ringGain.connect(audioCtx.destination);
    const freqs = [520, 660, 780];
    freqs.forEach((f) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.value = 0.0001;
      osc.connect(g);
      g.connect(ringGain);
      osc.start();
      ringOscList.push({osc,g});
    });
    ringGain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    ringIntervalId = setInterval(() => {
      ringGain.gain.cancelScheduledValues(audioCtx.currentTime);
      ringGain.gain.setValueAtTime(0.01, audioCtx.currentTime);
      ringGain.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime + 0.12);
      ringGain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.28);
    }, 420);
  }

  function stopRing() {
    try {
      if (ringIntervalId) { clearInterval(ringIntervalId); ringIntervalId = null; }
      if (ringGain) ringGain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 0.06);
      ringOscList.forEach(obj => {
        try {
          obj.osc.stop(audioCtx.currentTime + 0.1);
          obj.osc.disconnect();
          obj.g.disconnect();
        } catch (e) { }
      });
      ringOscList = [];
      ringGain = null;
    } catch (e) { console.warn(e); }
  }

  // Typing blip
  function playTypeBlip() {
    if (!canPlaySound()) return;
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.value = 1200;
    g.gain.value = 0;
    o.connect(g);
    g.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.008, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    o.start(now);
    o.stop(now + 0.07);
  }

  // -------------- Sprite helpers & typing --------------
  let talkInterval = null;
  function safeSetSprite(path) {
    if (!tsukiSprite) return;
    tsukiSprite.classList.add(SPRITE_TRANSITION_CLASS);
    tsukiSprite.src = path;
    tsukiSprite.onerror = () => {
      console.warn('Sprite failed to load:', path);
      tsukiSprite.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABhElEQVR4nO2ZQQ6CQBBFz6k9gQdgQdgQdgQdgQdgQdgQdgQd2k1cSaT+3q0v2Y3sWmE1Nn6c4eOBuAnwAegF8AHoBfAHq7Wwq2Lx5WZyQq2y3i8f9y1oSxTuY2Qq2x0i8z8DPXjgq1wq2p2qzQZr3KpB2G1M2wz1m1nNe2xY6l8e4VJ2q8Un6q8N5Xso9V6r+2q3t3Z2L6f4Kq+7X2l9bW6r9bGdV1q7t7q9u7+6vU6r8s7j9w+9+9uA9uAY6gFiwDq4Bq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Bq8F7wG6BzqDxw9w6J3+uX9zR6wQZtYQZsYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwXrxQHz5wz9QuS5V4wAAAABJRU5ErkJggg==';
    };
  }

  function typeText(text, speed = TYPE_SPEED_MS) {
    return new Promise(resolve => {
      if (!textBox) return resolve();
      textBox.innerHTML = '';
      let i = 0;
      function tick() {
        if (i < text.length) {
          textBox.innerHTML += text.charAt(i);
          if (i % 2 === 0) playTypeBlip();
          i++;
          setTimeout(tick, speed);
        } else {
          resolve();
        }
      }
      tick();
    });
  }

  function startTalking(frames = [], intervalMs = TALK_INTERVAL_MS) {
    stopTalking();
    if (!frames || frames.length === 0) return;
    let idx = 0;
    talkInterval = setInterval(() => {
      tsukiSprite.classList.add(SPRITE_TRANSITION_CLASS);
      tsukiSprite.src = frames[idx % frames.length];
      idx++;
    }, intervalMs);
  }

  function stopTalking(finalPath) {
    if (talkInterval) { clearInterval(talkInterval); talkInterval = null; }
    if (finalPath) safeSetSprite(finalPath);
  }

  function showOptions(list = []) {
    optionsBox.innerHTML = '';
    list.forEach(o => {
      const b = document.createElement('button');
      b.className = 'optionButton';
      b.textContent = o.label;
      b.onclick = o.onClick;
      optionsBox.appendChild(b);
    });
  }

  // Scenes (kept)
  async function scene_start() {
    optionsBox.innerHTML = '';
    startTalking(sprites.happy);
    await typeText("Tsuki: Hey Boo! ♡ You finally picked up..");
    stopTalking(sprites.happy[0]);
    setTimeout(scene_whatsUp, 300);
  }

  async function scene_whatsUp() {
    startTalking(sprites.happy);
    await typeText("Tsuki: What's up, girl?");
    stopTalking(sprites.happy[0]);
    showOptions([
      { label: "I've got some tea for a video, girl!", onClick: scene_tea },
      { label: "Who are you…What are you?", onClick: scene_identity },
      { label: "Hang up", onClick: scene_userHangup }
    ]);
  }

  async function scene_tea() {
    optionsBox.innerHTML = '';
    startTalking(sprites.wineSmile);
    await typeText("Tsuki: Oooh…Spill it!");
    stopTalking(sprites.wineSmile[0]);
    showOptions([
      { label: "Suggest Rant", onClick: () => openSuggestModal('Rant') },
      { label: "Suggest Game", onClick: () => openSuggestModal('Game') },
      { label: "Hang up", onClick: scene_hangUpAngry }
    ]);
  }

  async function scene_hangUpAngry() {
    optionsBox.innerHTML = '';
    startTalking([...sprites.frown, ...sprites.neutral]);
    await typeText("Tsuki: Girl..don’t piss me off.");
    stopTalking(sprites.hangup[1] || sprites.hangup[0]);
    setTimeout(() => closeVN(), 1100);
  }

  async function scene_identity() {
    optionsBox.innerHTML = '';
    startTalking(sprites.neutral);
    await typeText("Tsuki: Me?? I'm Tsuki. Cute chaos, and content—duh.");
    stopTalking(sprites.neutral[0]);
    showOptions([
      { label: "Back", onClick: scene_whatsUp },
      { label: "Hang up", onClick: scene_userHangup }
    ]);
  }

  async function scene_userHangup() {
    optionsBox.innerHTML = '';
    safeSetSprite(sprites.hangup[1] || sprites.hangup[0]);
    await typeText("—call ended—");
    setTimeout(() => closeVN(), 700);
  }

  // VN controls
  function openVN() {
    vnContainer.classList.remove('hidden');
    vnContainer.setAttribute('aria-hidden', 'false');
    safeSetSprite(sprites.happy[0]);
    stopRing();
    scene_start();
  }

  function closeVN() {
    vnContainer.classList.add('hidden');
    vnContainer.setAttribute('aria-hidden', 'true');
    optionsBox.innerHTML = '';
    textBox.innerHTML = '';
    stopTalking();
  }

  // modal (suggest)
  function openSuggestModal(kind = '') {
    if (suggestForm && !suggestForm.querySelector('input[name="type"]')) {
      const hidden = document.createElement('input');
      hidden.type = 'hidden'; hidden.name = 'type';
      suggestForm.appendChild(hidden);
    }
    const typeField = suggestForm.querySelector('input[name="type"]');
    if (typeField) typeField.value = kind;
    suggestModal.classList.remove('hidden');
    suggestModal.setAttribute('aria-hidden', 'false');
    const first = suggestForm.querySelector('input[name="name"], textarea, input');
    if (first) first.focus();
  }

  function closeSuggestModal() {
    suggestModal.classList.add('hidden');
    suggestModal.setAttribute('aria-hidden', 'true');
  }

  // Formspree submit
  if (suggestForm) {
    suggestForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(suggestForm);
      try {
        const res = await fetch(FORM_ENDPOINT, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' }});
        if (res.ok) {
          showToast('Submitted — thanks babe ♡');
          closeSuggestModal();
          textBox.innerText = "Tsuki: Mmm thanks! I'll check it out.";
          optionsBox.innerHTML = '';
          setTimeout(() => closeVN(), 900);
        } else {
          showToast('Submission failed — try again');
        }
      } catch (err) {
        console.error('submit err', err);
        showToast('Submission failed — check network');
      }
    });
  }

  // events
  if (phoneBtn) {
    try { startRing(); } catch(e){ console.warn('startRing error', e); }
    phoneBtn.addEventListener('click', () => {
      if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }
      stopRing();
      openVN();
    });
  }
  if (vnClose) vnClose.addEventListener('click', closeVN);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeSuggestModal);
  if (openVNbtn) openVNbtn.addEventListener('click', () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    stopRing(); openVN();
  });

  if (toggleSfx) {
    toggleSfx.addEventListener('change', () => {
      if (!toggleSfx.checked) { stopRing(); }
      else { startRing(); }
    });
  }

  if (suggestModal) suggestModal.addEventListener('click', (e) => { if (e.target === suggestModal) closeSuggestModal(); });

  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.page-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const id = tab.dataset.tab;
      const panel = document.getElementById(id);
      if (panel) panel.classList.add('active');
    });
  });

  (function preloadAll() {
    const missing = [];
    Object.values(sprites).forEach(arr => arr.forEach(path => {
      const img = new Image(); img.src = path; img.onerror = () => missing.push(path);
    }));
    const phoneTest = new Image(); phoneTest.src = 'assets/images/Phone.png'; phoneTest.onerror = () => console.warn('Phone icon missing: assets/images/Phone.png');
    if (missing.length) {
      console.warn('Missing sprites:', missing);
      setTimeout(() => showToast('Some sprites missing — check console'), 700);
    }
  })();

  window.TsukiDebug = { sprites, openVN, closeVN, openSuggestModal, closeSuggestModal, startRing, stopRing };

  /* ======== END ORIGINAL VN ======== */

  /* ======== PET + SHOP + HATS + BATH ======== */

  // storage keys & initial state
  let starCount = parseInt(localStorage.getItem('stars') || '0');
  let petUnlocked = localStorage.getItem('petUnlocked') === 'true';
  let petChosen = localStorage.getItem('petChosen') || 'Oreo'; // default selection
  let hatOwned = (() => { try { return JSON.parse(localStorage.getItem('hat_owned') || '[]'); } catch(e){ return []; }})();
  let hatEquipped = localStorage.getItem('hat_equipped') || '';
  let petLove = parseInt(localStorage.getItem('petLove') || '0');

  // ensure basic keys exist
  localStorage.setItem('stars', String(starCount));
  localStorage.setItem('petChosen', petChosen);
  localStorage.setItem('hat_owned', JSON.stringify(hatOwned));
  localStorage.setItem('hat_equipped', hatEquipped);
  localStorage.setItem('petLove', String(petLove));

  // UI elements (pet button + window) — create if missing
  let petBtnEl = document.getElementById('petButton');
  const PAW_SVG_DATA = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <g fill="#ff99aa" stroke="#5c3d3d" stroke-width="2">
        <circle cx="20" cy="18" r="6"/><circle cx="32" cy="12" r="6"/><circle cx="44" cy="18" r="6"/>
        <ellipse cx="32" cy="36" rx="16" ry="12"/>
      </g></svg>` )}`;

  if (!petBtnEl) {
    petBtnEl = document.createElement('div');
    petBtnEl.id = 'petButton';
    petBtnEl.style.position = 'fixed';
    petBtnEl.style.left = '20px';
    petBtnEl.style.top = '140px';
    petBtnEl.style.zIndex = '9999';
    petBtnEl.style.cursor = 'pointer';
    petBtnEl.style.display = petUnlocked ? '' : 'none';
    const img = document.createElement('img');
    img.alt = 'pet';
    img.style.width = '70px';
    img.style.imageRendering = 'pixelated';
    img.src = PAW_SVG_DATA;
    petBtnEl.appendChild(img);
    document.body.appendChild(petBtnEl);
  } else {
    petBtnEl.style.display = petUnlocked ? '' : 'none';
  }

  // pet modal
  let petWindowEl = document.getElementById('petWindow');
  if (!petWindowEl) {
    petWindowEl = document.createElement('div');
    petWindowEl.id = 'petWindow';
    petWindowEl.className = 'modal hidden';
    petWindowEl.style.zIndex = 99999;
    petWindowEl.innerHTML = `
      <div class="modal-card" style="max-width:520px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong style="font-size:20px;color:#5c3d3d">Pet Menu</strong>
          <button id="closePetWindow" class="close-btn" type="button">Close</button>
        </div>
        <div id="petWindowContent"></div>
      </div>
    `;
    document.body.appendChild(petWindowEl);
  }

  // helper: get bunny sprite path given variant (we'll use user's uploaded sprites)
  function getBunnySpriteForVariant(variant) {
    // user provided three spritesheets; we only need 1 display frame per variant (standing)
    // assume the sheets are uploaded as: assets/pets/rocky.png, assets/pets/oreo.png, assets/pets/vanilla.png
    const map = {
      'Rocky Road': 'assets/pets/rocky.png',
      'Oreo': 'assets/pets/oreo.png',
      'Vanilla': 'assets/pets/vanilla.png'
    };
    return map[variant] || map['Oreo'];
  }

  // hat catalog (each color is a separate item in the shop)
  // hat id format: kind-color (e.g., witch-black)
  const HAT_CATALOG = [
    // Witch hats
    { id: 'witch-black',  name: 'Witch Hat (Black)', price: 4, svg: hatSVG('witch', 'black') },
    { id: 'witch-blue',   name: 'Witch Hat (Blue)', price: 4, svg: hatSVG('witch', 'blue') },
    { id: 'witch-burg',   name: 'Witch Hat (Burgundy)', price: 4, svg: hatSVG('witch', 'burgundy') },

    // Top hats
    { id: 'top-black',    name: 'Top Hat (Black)', price: 6, svg: hatSVG('top', 'black') },
    { id: 'top-brown',    name: 'Top Hat (Brown)', price: 6, svg: hatSVG('top', 'brown') },
    { id: 'top-gray',     name: 'Top Hat (Gray)', price: 6, svg: hatSVG('top', 'gray') },

    // Caps
    { id: 'cap-red',      name: 'Cap (Red)', price: 3, svg: hatSVG('cap', 'red') },
    { id: 'cap-blue',     name: 'Cap (Blue)', price: 3, svg: hatSVG('cap', 'blue') },
    { id: 'cap-pink',     name: 'Cap (Pink)', price: 3, svg: hatSVG('cap', 'pink') },

    // Bows
    { id: 'bow-pink',     name: 'Bow (Pink)', price: 2, svg: hatSVG('bow', 'pink') },
    { id: 'bow-purple',   name: 'Bow (Purple)', price: 2, svg: hatSVG('bow', 'purple') },
    { id: 'bow-teal',     name: 'Bow (Teal)', price: 2, svg: hatSVG('bow', 'teal') },

    // Crowns
    { id: 'crown-gold',   name: 'Crown (Gold)', price: 8, svg: hatSVG('crown', 'gold') },
    { id: 'crown-silver', name: 'Crown (Silver)', price: 8, svg: hatSVG('crown', 'silver') },
    { id: 'crown-rose',   name: 'Crown (Rose)', price: 8, svg: hatSVG('crown', 'rose') },
  ];

  // helper to produce inline SVG data URIs for hats (auto-sized for overlay)
  function hatSVG(kind, color) {
    // simple pixel-ish SVGs that sit on top of bunny head; we tune by kind
    // returns a data:image/svg+xml;utf8,... string
    let svg = '';
    if (kind === 'witch') {
      // small pointy hat
      const fill = colorMap(color);
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='64' viewBox='0 0 96 64'>
        <g>
          <ellipse cx='48' cy='50' rx='40' ry='8' fill='${shade(fill,-10)}' stroke='${shade(fill,-40)}' stroke-width='2'/>
          <path d='M24 46 L48 8 L72 46 Z' fill='${fill}' stroke='${shade(fill,-40)}' stroke-width='2'/>
          <rect x='36' y='40' width='24' height='6' fill='${shade(fill,20)}'/>
        </g>
      </svg>`;
    } else if (kind === 'top') {
      const fill = colorMap(color);
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='64' viewBox='0 0 96 64'>
        <g>
          <rect x='28' y='12' width='40' height='20' rx='6' ry='6' fill='${fill}' stroke='${shade(fill,-40)}' stroke-width='2'/>
          <ellipse cx='48' cy='44' rx='36' ry='8' fill='${shade(fill,-10)}' stroke='${shade(fill,-40)}' stroke-width='2'/>
          <rect x='34' y='30' width='28' height='6' fill='${shade(fill,20)}'/>
        </g>
      </svg>`;
    } else if (kind === 'cap') {
      const fill = colorMap(color);
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='64' viewBox='0 0 96 64'>
        <g>
          <path d='M14 36 Q48 6 82 36 Z' fill='${fill}' stroke='${shade(fill,-40)}' stroke-width='2'/>
          <rect x='40' y='36' width='16' height='6' fill='${shade(fill,20)}' rx='3'/>
          <ellipse cx='48' cy='48' rx='28' ry='6' fill='${shade(fill,-10)}' stroke='${shade(fill,-40)}' stroke-width='2'/>
        </g>
      </svg>`;
    } else if (kind === 'bow') {
      const fill = colorMap(color);
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='64' viewBox='0 0 96 64'>
        <g fill='${fill}' stroke='${shade(fill,-40)}' stroke-width='2'>
          <ellipse cx='34' cy='32' rx='12' ry='8'/>
          <ellipse cx='62' cy='32' rx='12' ry='8'/>
          <circle cx='48' cy='32' r='6' fill='${shade(fill,20)}'/>
        </g>
      </svg>`;
    } else if (kind === 'crown') {
      const fill = colorMap(color);
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='64' viewBox='0 0 96 64'>
        <g stroke='${shade(fill,-40)}' stroke-width='2' fill='${fill}'>
          <path d='M8 44 L20 24 L36 40 L48 20 L60 40 L76 24 L88 44 Z'/>
          <rect x='12' y='44' width='72' height='6' fill='${shade(fill,-10)}' stroke='${shade(fill,-40)}'/>
        </g>
      </svg>`;
    }
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // utility: simple palette mapping
  function colorMap(name) {
    const map = {
      black: '#1b1b1b',
      blue: '#22477a',
      burgundy: '#7a2430',
      brown: '#6b4a3a',
      gray: '#7f7f7f',
      red: '#d93b3b',
      pink: '#ff99aa',
      purple: '#7a4cae',
      teal: '#2aa3a3',
      gold: '#f2c94c',
      silver: '#cfcfcf',
      rose: '#ffccd5'
    };
    return map[name] || '#ff99aa';
  }

  // tiny shade helper (adjust hex brightness)
  function shade(hex, percent) {
    // percent can be negative or positive
    const c = hex.replace('#','');
    const num = parseInt(c,16);
    let r = (num >> 16) + Math.round(percent/100*255);
    let g = ((num >> 8) & 0x00FF) + Math.round(percent/100*255);
    let b = (num & 0x0000FF) + Math.round(percent/100*255);
    r = Math.max(0,Math.min(255,r));
    g = Math.max(0,Math.min(255,g));
    b = Math.max(0,Math.min(255,b));
    return '#'+((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1);
  }

  // MAIN pet window content builder
  function loadPetWindowContent() {
    const content = document.getElementById('petWindowContent');
    if (!content) return;
    // build UI: preview (sprite + hat overlay), love meter, feed, bathe, shop, variant selector
    content.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <div style="width:220px;text-align:center">
          <div id="petPreview" style="position:relative; width:160px; height:160px; margin:0 auto; background:linear-gradient(180deg,#fff6f8,#fff0f3); border-radius:12px; border:3px solid var(--accent-dark);">
            <img id="petSpriteDisplay" src="${getBunnySpriteForVariant(petChosen)}" alt="pet" style="width:100%; height:100%; object-fit:contain; image-rendering:pixelated;"/>
            <img id="petHatOverlay" src="" alt="hat" style="position:absolute; left:50%; top:6%; transform:translateX(-50%); width:72px; pointer-events:none; image-rendering:pixelated"/>
            <div id="petHeart" style="position:absolute; right:6px; top:6px; display:none; font-size:20px">❤</div>
          </div>
          <div style="margin-top:8px">
            <div style="display:flex;gap:8px;justify-content:center;align-items:center">
              <button id="petFeedBtn" class="submit-btn" style="padding:8px 10px;">Feed</button>
              <button id="petBatheBtn" class="submit-btn" style="padding:8px 10px;">Bathe</button>
            </div>
            <div style="margin-top:8px; font-size:13px; color:#5c3d3d">Stars: <strong id="petStarCount">${starCount}</strong></div>
          </div>
        </div>

        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:16px;color:#5c3d3d">Selected Bunny</div>
              <select id="petVariantSelect" style="margin-top:6px;padding:6px;border-radius:8px;border:2px solid var(--accent-dark);font-family:'VT323'">
                <option value="Rocky Road">Rocky Road</option>
                <option value="Oreo">Oreo</option>
                <option value="Vanilla">Vanilla</option>
              </select>
            </div>

            <div style="text-align:right">
              <div style="font-size:14px;color:#5c3d3d">Love</div>
              <div id="loveMeterWrap" style="width:140px;height:18px;border:2px solid var(--accent-dark);background:#fff0f0;border-radius:8px;overflow:hidden">
                <div id="loveMeterFill" style="height:100%; width:0%; background:linear-gradient(90deg,#ffb3c6,#ff99aa)"></div>
              </div>
              <div style="font-size:12px;color:#5c3d3d;margin-top:6px">Pet: <strong id="petNameDisplay">${petChosen}</strong></div>
            </div>
          </div>

          <hr style="margin:12px 0; border-color: #ffd6df"/>

          <div>
            <div style="font-size:16px;color:#5c3d3d;margin-bottom:8px">Shop - Hats (each color is a separate item)</div>
            <div id="hatShopList" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          </div>

        </div>
      </div>

      <!-- bathing overlay area (hidden by default) -->
      <div id="bathArea" style="display:none; margin-top:10px;">
        <div style="display:flex;gap:8px;align-items:center">
          <div id="soapPile" style="padding:8px;border-radius:10px;background:linear-gradient(180deg,#fff0f0,#ffdce6);border:2px solid var(--accent-dark);cursor:grab">🧼 Drag soap onto pet</div>
          <button id="rinseBtn" class="submit-btn" style="display:none">Rinse</button>
          <div id="bathStatus" style="font-size:13px;color:#5c3d3d;margin-left:6px"></div>
        </div>
      </div>
    `;

    // set initial selection
    document.getElementById('petVariantSelect').value = petChosen;
    updatePetDisplay();

    // list shop hats
    const hatShopList = document.getElementById('hatShopList');
    HAT_CATALOG.forEach(h => {
      const owned = hatOwned.includes(h.id);
      const card = document.createElement('div');
      card.style.width = '120px';
      card.style.border = '2px solid var(--accent-dark)';
      card.style.background = '#fff0f4';
      card.style.padding = '8px';
      card.style.borderRadius = '8px';
      card.style.textAlign = 'center';
      card.style.fontSize = '13px';
      card.style.color = '#5c3d3d';
      card.innerHTML = `
        <div style="height:54px; display:flex;align-items:center;justify-content:center">
          <img src="${h.svg}" style="width:58px; height:auto; image-rendering:pixelated"/>
        </div>
        <div style="font-weight:800;margin-top:4px">${h.name}</div>
        <div style="margin-top:6px">${h.price} ✦</div>
      `;
      const action = document.createElement('button');
      action.className = 'submit-btn';
      action.style.marginTop = '6px';
      if (owned) {
        action.textContent = hatEquipped === h.id ? 'Equipped' : 'Equip';
        action.addEventListener('click', () => {
          hatEquipped = h.id;
          localStorage.setItem('hat_equipped', hatEquipped);
          showToast('Hat equipped!');
          updatePetDisplay();
          loadPetWindowContent(); // refresh shop buttons
        });
      } else {
        action.textContent = 'Buy';
        action.addEventListener('click', () => {
          if (starCount >= h.price) {
            starCount -= h.price;
            localStorage.setItem('stars', String(starCount));
            hatOwned.push(h.id);
            localStorage.setItem('hat_owned', JSON.stringify(hatOwned));
            showToast('Purchased ' + h.name);
            loadPetWindowContent(); // re-render
          } else {
            showToast('Not enough stars!');
          }
        });
      }
      card.appendChild(action);
      hatShopList.appendChild(card);
    });

    // events: variant change
    const variantSelect = document.getElementById('petVariantSelect');
    variantSelect.addEventListener('change', (e) => {
      petChosen = e.target.value;
      localStorage.setItem('petChosen', petChosen);
      document.getElementById('petNameDisplay').innerText = petChosen;
      updatePetDisplay();
    });

    // feed button
    document.getElementById('petFeedBtn').addEventListener('click', () => {
      // feeding: small star cost? make it free for now but increases love
      petLove = Math.min(100, petLove + 6);
      localStorage.setItem('petLove', String(petLove));
      showPetHeart();
      updateLoveMeter();
      showToast('Yum! +6 love');
    });

    // bathe button toggles bath area
    document.getElementById('petBatheBtn').addEventListener('click', () => {
      const bathArea = document.getElementById('bathArea');
      if (bathArea.style.display === 'none' || bathArea.style.display === '') {
        bathArea.style.display = '';
      } else {
        bathArea.style.display = 'none';
      }
    });

    // soap drag functionality
    const soapPile = document.getElementById('soapPile');
    const petPreview = document.getElementById('petPreview');
    const rinseBtn = document.getElementById('rinseBtn');
    let draggingSoap = null;
    let soapEl = null;
    let cleanProgress = 0;
    let bubbleEls = [];

    soapPile.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      soapEl = document.createElement('div');
      soapEl.textContent = '🧼';
      soapEl.style.position = 'fixed';
      soapEl.style.left = ev.clientX + 'px';
      soapEl.style.top = ev.clientY + 'px';
      soapEl.style.zIndex = 100000;
      soapEl.style.fontSize = '22px';
      soapEl.style.pointerEvents = 'none';
      document.body.appendChild(soapEl);
      draggingSoap = true;
    });

    window.addEventListener('pointermove', (ev) => {
      if (!draggingSoap || !soapEl) return;
      soapEl.style.left = (ev.clientX - 10) + 'px';
      soapEl.style.top = (ev.clientY - 10) + 'px';
    });

    window.addEventListener('pointerup', (ev) => {
      if (!draggingSoap) return;
      draggingSoap = false;
      if (!soapEl) return;
      // check overlap with petPreview
      const rect = petPreview.getBoundingClientRect();
      if (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
        // successful soap contact -> spawn bubble and increment progress
        const bubble = document.createElement('div');
        bubble.className = 'pet-bubble';
        bubble.style.position = 'absolute';
        const localX = ev.clientX - rect.left;
        const localY = ev.clientY - rect.top;
        bubble.style.left = (localX) + 'px';
        bubble.style.top = (localY) + 'px';
        bubble.style.width = '14px';
        bubble.style.height = '14px';
        bubble.style.borderRadius = '50%';
        bubble.style.background = 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95), rgba(255,255,255,0.2))';
        bubble.style.boxShadow = '0 0 8px rgba(255,200,220,0.9)';
        bubble.style.opacity = '0.0';
        bubble.style.transform = 'translate(-50%,-50%) scale(0.2)';
        petPreview.appendChild(bubble);
        bubbleEls.push(bubble);
        // animate bubble
        requestAnimationFrame(()=> {
          bubble.style.transition = 'transform 260ms ease, opacity 260ms ease';
          bubble.style.transform = 'translate(-50%,-50%) scale(1)';
          bubble.style.opacity = '0.95';
        });
        cleanProgress++;
        document.getElementById('bathStatus').innerText = `Cleanse: ${cleanProgress}/3`;
        if (cleanProgress >= 1) rinseBtn.style.display = ''; // allow rinse once any bubble added
        showToast('+1 clean');
      }
      try { soapEl.remove(); } catch(e) {}
      soapEl = null;
    });

    rinseBtn.addEventListener('click', () => {
      if (bubbleEls.length === 0) {
        showToast('Drag soap onto the pet first!');
        return;
      }
      // rinse: fade bubbles then remove; increase love based on count
      bubbleEls.forEach((b, i) => {
        b.style.transition = 'opacity 400ms ease, transform 400ms ease';
        b.style.opacity = '0';
        b.style.transform = 'translate(-50%,-50%) scale(1.3)';
        setTimeout(()=> { try{ b.remove(); } catch(e){} }, 420);
      });
      const gained = Math.min(12, bubbleEls.length * 4);
      petLove = Math.min(100, petLove + gained);
      localStorage.setItem('petLove', String(petLove));
      bubbleEls = [];
      cleanProgress = 0;
      document.getElementById('bathStatus').innerText = '';
      rinseBtn.style.display = 'none';
      showPetHeart();
      updateLoveMeter();
      showToast(`Bathe complete! +${gained} love`);
    });

    // allow clicking pet sprite to show quick heart
    document.getElementById('petSpriteDisplay').addEventListener('click', () => {
      petLove = Math.min(100, petLove + 2);
      localStorage.setItem('petLove', String(petLove));
      updateLoveMeter();
      showPetHeart();
      showToast('+2 love');
    });

    updateLoveMeter();
  }

  // show small heart animation
  function showPetHeart() {
    const heart = document.getElementById('petHeart');
    if (!heart) return;
    heart.style.display = '';
    heart.style.opacity = '0';
    heart.style.transition = 'transform 420ms ease, opacity 420ms ease';
    heart.style.transform = 'translateY(-6px) scale(1.2)';
    heart.style.opacity = '1';
    setTimeout(()=> {
      heart.style.transform = 'translateY(-28px) scale(1.6)';
      heart.style.opacity = '0';
    }, 300);
    setTimeout(()=> { try{ heart.style.display = 'none'; } catch(e){} }, 780);
  }

  // update love meter UI
  function updateLoveMeter() {
    const pct = Math.round((petLove / 100) * 100);
    const fill = document.getElementById('loveMeterFill');
    if (fill) fill.style.width = pct + '%';
  }

  // update pet sprite + hat overlay
  function updatePetDisplay() {
    const sprite = document.getElementById('petSpriteDisplay');
    if (sprite) {
      sprite.src = getBunnySpriteForVariant(petChosen);
    }
    const hatOverlay = document.getElementById('petHatOverlay');
    if (hatOverlay) {
      if (hatEquipped) {
        // find hat in catalog
        const hat = HAT_CATALOG.find(h => h.id === hatEquipped);
        if (hat) {
          hatOverlay.src = hat.svg;
          hatOverlay.style.display = '';
        } else {
          hatOverlay.src = '';
          hatOverlay.style.display = 'none';
        }
      } else {
        hatOverlay.src = '';
        hatOverlay.style.display = 'none';
      }
    }
    // update star display
    const starEl = document.getElementById('petStarCount');
    if (starEl) starEl.innerText = String(starCount);
    const nameDisplay = document.getElementById('petNameDisplay');
    if (nameDisplay) nameDisplay.innerText = petChosen;
  }

  // star intro UI created earlier in main script in other version; keep existing showStarIntro behavior.
  let starIntroEl = document.getElementById('starIntroBubble');
  if (!starIntroEl) {
    starIntroEl = document.createElement('div');
    starIntroEl.id = 'starIntroBubble';
    starIntroEl.className = 'modal hidden';
    starIntroEl.style.zIndex = 99998;
    starIntroEl.innerHTML = `
      <div class="modal-card" style="max-width:420px;text-align:center">
        <p style="font-size:20px;color:#5c3d3d"><strong>Tsuki:</strong> Ooooh… you caught a star! ✦</p>
        <p style="color:#5c3d3d">Stars are our little currency — collect more to adopt pets and buy cuteness.</p>
        <div style="margin-top:12px">
          <button id="starIntroContinue" class="submit-btn">Continue</button>
        </div>
      </div>
    `;
    document.body.appendChild(starIntroEl);
  }

  function showStarIntro() {
    if (!starIntroEl) return;
    starIntroEl.classList.remove('hidden');
    starIntroEl.setAttribute('aria-hidden','false');
  }

  // star intro Continue unlocks pet if not unlocked
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'starIntroContinue') {
      starIntroEl.classList.add('hidden');
      starIntroEl.setAttribute('aria-hidden','true');
      petUnlocked = true;
      localStorage.setItem('petUnlocked', 'true');
      if (petBtnEl) petBtnEl.style.display = '';
      showToast('Pet system unlocked! Click the paw to adopt.');
    }
  });

  // pet button click opens modal
  if (petBtnEl) {
    petBtnEl.addEventListener('click', () => {
      petWindowEl.classList.remove('hidden');
      petWindowEl.setAttribute('aria-hidden','false');
      loadPetWindowContent();
    });
  }

  // close pet window
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'closePetWindow') {
      petWindowEl.classList.add('hidden');
      petWindowEl.setAttribute('aria-hidden','true');
    }
  });

  // init visuals on load
  (function initPetAndStars() {
    try {
      if (localStorage.getItem('petUnlocked') === 'true') {
        petUnlocked = true;
        if (petBtnEl) petBtnEl.style.display = '';
      } else if (petBtnEl) {
        petBtnEl.style.display = 'none';
      }
      // sync variables
      starCount = parseInt(localStorage.getItem('stars') || '0');
      petChosen = localStorage.getItem('petChosen') || petChosen;
      hatOwned = (() => { try { return JSON.parse(localStorage.getItem('hat_owned') || '[]'); } catch(e){ return []; }})();
      hatEquipped = localStorage.getItem('hat_equipped') || '';
      petLove = parseInt(localStorage.getItem('petLove') || '0');
      // show a small toast of stars
      if (starCount > 0) showToast(`Stars: ${starCount}`, 1200);
    } catch(e){ console.warn(e); }
  })();

  // expose debug helpers
  window.TsukiDebug = Object.assign(window.TsukiDebug || {}, {
    spawnFallingStar: window.TsukiDebug?.spawnFallingStar || function(){},
    createBackgroundStar: window.TsukiDebug?.createBackgroundStar || function(){},
    startRing,
    stopRing,
    getState: () => ({ starCount, petUnlocked, petChosen, hatOwned, hatEquipped, petLove })
  });

  // keyboard escapes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (petWindowEl && !petWindowEl.classList.contains('hidden')) petWindowEl.classList.add('hidden');
      if (suggestModal && !suggestModal.classList.contains('hidden')) closeSuggestModal();
      if (vnContainer && !vnContainer.classList.contains('hidden')) closeVN();
      if (starIntroEl && !starIntroEl.classList.contains('hidden')) starIntroEl.classList.add('hidden');
    }
  });

})(); // end IIFE

/* ========== DEBUG BUTTONS (settings tab) ==========
   Note: these buttons reflect the same localStorage keys used above
*/
(function(){
  function devLog(msg){ console.log("%cDEBUG: "+msg, "color:#ff99aa"); }
  // reset pet + stars only
  document.getElementById("debug-reset")?.addEventListener("click", () => {
    localStorage.removeItem("stars");
    localStorage.removeItem("petUnlocked");
    localStorage.removeItem("petChosen");
    localStorage.removeItem("hat_owned");
    localStorage.removeItem("hat_equipped");
    localStorage.removeItem("petLove");
    devLog("Pet + star system reset.");
    showToast("Pet system reset!");
    setTimeout(()=> location.reload(), 220);
  });

  // +5 stars cheat
  document.getElementById("debug-add-stars")?.addEventListener("click", () => {
    let s = Number(localStorage.getItem("stars") || 0);
    s += 5;
    localStorage.setItem("stars", s);
    devLog("+5 stars.");
    showToast("+5 stars added!");
    setTimeout(()=> location.reload(), 220);
  });

  // unlock entire pet system
  document.getElementById("debug-unlock-pets")?.addEventListener("click", () => {
    localStorage.setItem("petUnlocked", "true");
    devLog("Unlocked entire pet system.");
    showToast("Pet system unlocked!");
    setTimeout(()=> location.reload(), 220);
  });

  // FULL WIPE
  document.getElementById("debug-full-reset")?.addEventListener("click", () => {
    localStorage.removeItem("stars");
    localStorage.removeItem("petUnlocked");
    localStorage.removeItem("petChosen");
    localStorage.removeItem("hat_owned");
    localStorage.removeItem("hat_equipped");
    localStorage.removeItem("petLove");
    devLog("All Tsuki data cleared.");
    showToast("ALL DATA CLEARED!");
    setTimeout(()=> location.reload(), 220);
  });
})();
