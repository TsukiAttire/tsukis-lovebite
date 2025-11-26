/* assets/js/script.js
   Hyper-Y2K VN + UI + Star & Pet prototype
   - Preserves all original VN logic & scenes
   - Adds falling stars, star collection, first-star intro
   - Adds left-side Paw button + Pet window (created dynamically)
   - Uses synth for ring & typing (no external audio required)
   - Asset fallbacks for Phone / Paw / Ko-fi (small pixel SVGs)
   - Uses localStorage keys: 'stars', 'petUnlocked', 'petChosen'
*/

/* ========= original VN logic + helpers (preserved & reused) ========= */

(() => {
  // -------------- CONFIG --------------
  const FORM_ENDPOINT = 'https://formspree.io/f/mjkdzyqk';
  const TYPE_SPEED_MS = 24;
  const TALK_INTERVAL_MS = 140;
  const SPRITE_TRANSITION_CLASS = 'sprite-transition';

  // sprite filename mapping (happy uses Thanks pair)
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

  // -------------- DOM (original) --------------
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

  // -------------- small toast helper (defined so original code can use it) --------------
  function showToast(msg, duration = 1600) {
    try {
      if (!toast) {
        // fallback small injected toast
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

  // Ring synth (original behavior)
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

  // Typing blip: quick short high -> low click using oscillator
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

  // -------------- Sprite helpers & typing (preserved) --------------
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
          if (i % 2 === 0) playTypeBlip(); // gentle typing sound every couple chars
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

  // -------------- Scenes (preserved) --------------
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

  // -------------- VN controls (preserved) --------------
  function openVN() {
    vnContainer.classList.remove('hidden');
    vnContainer.setAttribute('aria-hidden', 'false');
    safeSetSprite(sprites.happy[0]);
    // stop ring when opened
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

  // -------------- modal (preserved) --------------
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

  // -------------- Formspree submit (preserved) --------------
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

  // -------------- events (preserved) --------------
  if (phoneBtn) {
    // start soft ring
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

  // Allow toggling SFX
  if (toggleSfx) {
    toggleSfx.addEventListener('change', () => {
      if (!toggleSfx.checked) { stopRing(); }
      else { startRing(); }
    });
  }

  // close modal when clicking outside
  if (suggestModal) suggestModal.addEventListener('click', (e) => { if (e.target === suggestModal) closeSuggestModal(); });

  // Top nav behavior
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

  // -------------- preload sprites (preserved, but non-blocking) --------------
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

  // expose debug
  window.TsukiDebug = { sprites, openVN, closeVN, openSuggestModal, closeSuggestModal, startRing, stopRing };

  /* ============================
     NEW ADDITIONS - Stars & Pet System
     (injects minimal UI elements, non-destructive)
     ============================ */

  // persistent state
  let starCount = parseInt(localStorage.getItem('stars') || '0');
  let petUnlocked = localStorage.getItem('petUnlocked') === 'true';
  let petChosen = localStorage.getItem('petChosen') || null;

  // small pixel SVG placeholders (data URIs)
  const PAW_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <g fill="#ff99aa" stroke="#5c3d3d" stroke-width="2">
        <circle cx="20" cy="18" r="6"/><circle cx="32" cy="12" r="6"/><circle cx="44" cy="18" r="6"/>
        <ellipse cx="32" cy="36" rx="16" ry="12"/>
      </g></svg>` )}`;

  const KOFI_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <rect x="6" y="10" width="52" height="36" rx="6" fill="#fff0f0" stroke="#5c3d3d" stroke-width="2"/>
      <text x="32" y="36" font-size="12" font-family="VT323" text-anchor="middle" fill="#5c3d3d">Ko-Fi</text>
    </svg>` )}`;

  // create pet button on left (hidden until unlocked)
  let petBtnEl = document.getElementById('petButton');
  if (!petBtnEl) {
    petBtnEl = document.createElement('div');
    petBtnEl.id = 'petButton';
    petBtnEl.style.position = 'fixed';
    petBtnEl.style.left = '20px';
    petBtnEl.style.top = '140px';
    petBtnEl.style.zIndex = '9999';
    petBtnEl.style.cursor = 'pointer';
    petBtnEl.style.display = petUnlocked ? '' : 'none';
    // img inside
    const img = document.createElement('img');
    img.alt = 'pet';
    img.style.width = '70px';
    img.style.imageRendering = 'pixelated';
    // try typical paths, fall back to dataURI
    const pawPaths = [
      'assets/ui/paw-icon.png',
      'assets/ui/paw.png',
      'assets/images/paw.png',
      'assets/sprites/paw.png'
    ];
    (async function setPaw() {
      for (const p of pawPaths) {
        try {
          const r = await fetch(p, { method: 'HEAD' }).catch(()=>null);
          if (r && r.ok) { img.src = p; return; }
        } catch(e){}
      }
      img.src = PAW_SVG;
    })();
    petBtnEl.appendChild(img);
    document.body.appendChild(petBtnEl);
  } else {
    // if element existed, ensure display according to unlocked
    petBtnEl.style.display = petUnlocked ? '' : 'none';
  }

  // create pet window (hidden)
  let petWindowEl = document.getElementById('petWindow');
  if (!petWindowEl) {
    petWindowEl = document.createElement('div');
    petWindowEl.id = 'petWindow';
    petWindowEl.className = 'modal hidden';
    petWindowEl.style.zIndex = 99999;
    petWindowEl.innerHTML = `
      <div class="modal-card" style="max-width:420px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong style="font-size:20px;color:#5c3d3d">Pet Menu</strong>
          <button id="closePetWindow" class="close-btn" type="button">Close</button>
        </div>
        <div id="petWindowContent"></div>
      </div>
    `;
    document.body.appendChild(petWindowEl);
  }

  // star intro bubble (shown upon first star collected)
  let starIntroEl = document.getElementById('starIntroBubble');
  if (!starIntroEl) {
    starIntroEl = document.createElement('div');
    starIntroEl.id = 'starIntroBubble';
    starIntroEl.className = 'modal hidden';
    starIntroEl.style.zIndex = 99998;
    starIntroEl.innerHTML = `
      <div class="modal-card" style="max-width:420px;text-align:center">
        <p style="font-size:20px;color:#5c3d3d"><strong>Tsuki:</strong> Ooooh… you caught a star! ✦</p>
        <p style="color:#5c3d3d">Stars are our little currency — spend them to adopt pets and buy cute things later.</p>
        <div style="margin-top:12px">
          <button id="starIntroContinue" class="submit-btn">Continue</button>
        </div>
      </div>
    `;
    document.body.appendChild(starIntroEl);
  }

  // small function to update star counter toast (you can expand later with visible HUD)
  function updateStarToast() {
    showToast(`Stars: ${starCount}`, 1200);
  }

  // spawn falling star element (inline styling so we don't need a CSS change)
  function spawnStar() {
    const el = document.createElement('div');
    el.className = 'falling-star';
    el.textContent = '✦';
    el.setAttribute('aria-hidden', 'true');
    el.style.position = 'fixed';
    el.style.left = Math.max(8, Math.random() * (window.innerWidth - 48)) + 'px';
    el.style.top = '-28px';
    el.style.zIndex = 8000;
    el.style.fontSize = '26px';
    el.style.color = '#fff8ff';
    el.style.textShadow = '0 0 8px rgba(255,255,255,0.9)';
    el.style.cursor = 'pointer';
    el.style.userSelect = 'none';
    el.style.transition = `transform 0.35s ease, opacity 0.4s linear`;
    document.body.appendChild(el);

    // animate down
    const fallDuration = 3800 + Math.random() * 1600;
    requestAnimationFrame(() => {
      el.style.top = (window.innerHeight + 60) + 'px';
      el.style.opacity = '0.95';
    });

    // click handler: collect
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      try {
        el.style.transform = 'scale(0.9) translateY(-6px)';
        el.style.opacity = '0';
      } catch(e){}
      setTimeout(()=> { try{ el.remove(); } catch(e){} }, 160);
      starCount++;
      localStorage.setItem('stars', String(starCount));
      if (starCount === 1 && !petUnlocked) {
        // first star behavior
        starIntroEl.classList.remove('hidden');
        starIntroEl.setAttribute('aria-hidden', 'false');
      } else {
        updateStarToast();
      }
    });

    setTimeout(()=> { try{ el.remove(); } catch(e){} }, fallDuration + 600);
  }

  // start spawner interval
  let starSpawnerId = setInterval(spawnStar, 3000);

  // star intro continue -> unlock pet button
  const starIntroContinueBtn = document.getElementById('starIntroContinue');
  if (starIntroContinueBtn) {
    starIntroContinueBtn.addEventListener('click', () => {
      starIntroEl.classList.add('hidden');
      starIntroEl.setAttribute('aria-hidden', 'true');
      petUnlocked = true;
      localStorage.setItem('petUnlocked', 'true');
      // show paw
      if (petBtnEl) petBtnEl.style.display = '';
      showToast('Pet system unlocked! Click the paw to adopt.');
    });
  }

  // pet button click -> open pet window
  petBtnEl.addEventListener('click', () => {
    petWindowEl.classList.remove('hidden');
    petWindowEl.setAttribute('aria-hidden', 'false');
    loadPetWindowContent();
  });

  // close pet window
  const closePetBtn = document.getElementById('closePetWindow');
  if (closePetBtn) closePetBtn.addEventListener('click', () => {
    petWindowEl.classList.add('hidden');
    petWindowEl.setAttribute('aria-hidden', 'true');
  });

  function loadPetWindowContent() {
    const content = document.getElementById('petWindowContent');
    if (!content) return;
    if (!petChosen) {
      content.innerHTML = `
        <p style="font-size:18px;color:#5c3d3d;margin-bottom:8px">Choose your starter pet:</p>
        <div style="display:flex;gap:12px;justify-content:center;margin-bottom:10px">
          <button id="petChoosePuppy" class="optionButton">🐶 Puppy</button>
          <button id="petChooseKitten" class="optionButton">🐱 Kitten</button>
        </div>
        <p style="font-size:13px;color:#5c3d3d">You can collect more pets using stars in the shop later.</p>
      `;
      const pup = document.getElementById('petChoosePuppy');
      const kit = document.getElementById('petChooseKitten');
      if (pup) pup.addEventListener('click', () => choosePet('Puppy'));
      if (kit) kit.addEventListener('click', () => choosePet('Kitten'));
    } else {
      content.innerHTML = `
        <p style="font-size:18px;color:#5c3d3d">Your pet: <strong>${petChosen}</strong></p>
        <p style="font-size:14px;color:#5c3d3d">More interactions (feed, dress, shop) will appear here.</p>
      `;
    }
  }

  function choosePet(name) {
    petChosen = name;
    localStorage.setItem('petChosen', petChosen);
    showToast(`Adopted ${name} — so cute!`);
    loadPetWindowContent();
  }

  // on load: show pet button only if unlocked (in case page refreshed)
  (function initPetUI() {
    try {
      if (localStorage.getItem('petUnlocked') === 'true') {
        petUnlocked = true;
        if (petBtnEl) petBtnEl.style.display = '';
      } else {
        if (petBtnEl) petBtnEl.style.display = 'none';
      }
      // show star count if > 0
      if (starCount > 0) showToast(`Stars: ${starCount}`, 1200);
    } catch(e){}
  })();

  // ensure items loaded: phone image fallback if missing -> try several paths then dataURI
  (async function tryRepairUIImages() {
    // phone image element id is phoneButton in your HTML; it could be missing or broken
    const phoneEl = document.getElementById('phoneButton');
    if (phoneEl && phoneEl.tagName === 'IMG') {
      const candidates = [
        'assets/images/Phone.png',
        'assets/image/Phone.png',
        'assets/images/phone.png',
        'assets/image/phone.png',
        'assets/Phone.png'
      ];
      let found = false;
      for (const p of candidates) {
        try {
          const r = await fetch(p, { method: 'HEAD' }).catch(()=>null);
          if (r && r.ok) { phoneEl.src = p; found = true; break; }
        } catch(e){}
      }
      if (!found) {
        // fallback tiny phone-looking SVG so UI doesn't break visually
        const PHONE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect rx="10" x="14" y="6" width="36" height="52" fill="#fff0f0" stroke="#5c3d3d" stroke-width="2"/><circle cx="32" cy="46" r="3" fill="#5c3d3d"/></svg>`
        )}`;
        phoneEl.src = PHONE_SVG;
        console.warn('Phone image not found - using inline fallback');
      }
    }

    // kofi button image fallback if used (you have a kofi-btn anchor; if inside there's an img try to repair)
    const kofiImg = document.querySelector('.kofi-btn img');
    if (kofiImg) {
      const kPaths = ['assets/ui/ko-fi.png','assets/images/ko-fi.png','assets/ui/kofi.png'];
      let found = false;
      for (const p of kPaths) {
        try { const r = await fetch(p, { method:'HEAD' }).catch(()=>null); if (r && r.ok) { kofiImg.src = p; found=true; break; } } catch(e){}
      }
      if (!found) kofiImg.src = KOFI_SVG;
    }
  })();

  // expose debug methods to global so you can test easily
  window.TsukiDebug = Object.assign(window.TsukiDebug || {}, {
    spawnStar,
    startRing,
    stopRing,
    getState: () => ({ starCount, petUnlocked, petChosen })
  });

  // keyboard escape to close pet window / modals (non-invasive)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (petWindowEl && !petWindowEl.classList.contains('hidden')) {
        petWindowEl.classList.add('hidden');
      }
      if (suggestModal && !suggestModal.classList.contains('hidden')) {
        closeSuggestModal();
      }
      if (vnContainer && !vnContainer.classList.contains('hidden')) {
        closeVN();
      }
      if (starIntroEl && !starIntroEl.classList.contains('hidden')) {
        starIntroEl.classList.add('hidden');
      }
    }
  });

})();
