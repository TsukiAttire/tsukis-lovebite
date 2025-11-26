/* assets/js/script.js
   Your original VN + UI logic (preserved)
   PLUS: full-screen background stars (clickable) + pet system
   - Drop-in replacement: overwrite your current assets/js/script.js
   - Uses localStorage keys: 'stars', 'petUnlocked', 'petChosen'
*/

/* ==== START ORIGINAL SCRIPT (preserved) ==== */
/* assets/js/script.js
   Hyper-Y2K VN + UI
   - Thanks pair used for happy (no Happy Talking)
   - WebAudio synthesized ring + typing sounds (no external audio files required)
   - Formspree integration
   - Tab navigation (top row)
   - Typing + talking frames + sprite transitions
*/

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

  /* ==== END ORIGINAL SCRIPT (preserved) ==== */

  /* ========== NEW ADDITIONS: GLOBAL STARS + PET SYSTEM ========== */
  // persistent state
  let starCount = parseInt(localStorage.getItem('stars') || '0');
  let petUnlocked = localStorage.getItem('petUnlocked') === 'true';
  let petChosen = localStorage.getItem('petChosen') || null;

  // star layer container (full screen, sits behind content)
  let starLayer = document.getElementById('starLayerGlobal');
  if (!starLayer) {
    starLayer = document.createElement('div');
    starLayer.id = 'starLayerGlobal';
    // sits under UI but above background — very low z so it feels like background
    starLayer.style.position = 'fixed';
    starLayer.style.inset = '0';
    starLayer.style.pointerEvents = 'none'; // let stars be individually clickable
    starLayer.style.zIndex = '2'; // lower than nav/topbars but above background
    document.body.appendChild(starLayer);
  }

  // create a pool of decorative background stars that are part of the background.
  // They will slowly twinkle or drift; a subset are clickable (pointer-events: auto)
  const STAR_POOL = []; // keep references so we can remove if needed
  const MAX_STARS = Math.max(20, Math.floor((window.innerWidth * window.innerHeight) / 90000)); // scale with screen

  function createBackgroundStar(xPct, yPct, opts = {}) {
    // opts: {clickable:boolean, size:number, twinkle:boolean}
    const s = document.createElement('div');
    s.className = 'bg-star';
    s.style.position = 'absolute';
    s.style.left = (xPct * 100) + 'vw';
    s.style.top = (yPct * 100) + 'vh';
    s.style.transform = 'translate(-50%,-50%)';
    s.style.pointerEvents = opts.clickable ? 'auto' : 'none';
    s.dataset.clickable = opts.clickable ? '1' : '0';
    const size = opts.size || (6 + Math.random() * 8);
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    s.style.borderRadius = '50%';
    s.style.background = 'linear-gradient(180deg,#fff5f8,#ffdff0)';
    s.style.boxShadow = '0 0 6px rgba(255,200,220,0.9)';
    s.style.opacity = (opts.clickable ? 1 : (0.6 + Math.random()*0.6)).toString();
    // twinkle animation
    if (opts.twinkle !== false) {
      const dur = 3 + Math.random()*5;
      s.style.animation = `bgStarTwinkle ${dur}s infinite ease-in-out`;
      s.style.animationDelay = (Math.random()*dur) + 's';
    }
    // clickable behavior
    if (opts.clickable) {
      s.style.cursor = 'pointer';
      s.addEventListener('click', (ev) => {
        ev.stopPropagation();
        collectStarAtElement(s);
      });
    }
    starLayer.appendChild(s);
    STAR_POOL.push(s);
    return s;
  }

  // clickable star effect: on click create a little burst and increment starCount
  function collectStarAtElement(el) {
    try {
      // visual feedback
      el.style.transform = 'translate(-50%,-50%) scale(0.8)';
      el.style.transition = 'transform 160ms ease, opacity 260ms ease';
      el.style.opacity = '0';
      setTimeout(()=> { try{ el.remove(); } catch(e){} }, 260);
    } catch(e){}
    starCount++;
    localStorage.setItem('stars', String(starCount));
    if (starCount === 1 && !petUnlocked) {
      // show intro modal (we'll create one below if missing)
      showStarIntro();
    } else {
      showToast(`Stars: ${starCount}`);
    }
  }

  // spawn a single "falling" star that moves across the screen and is clickable
  function spawnFallingStar() {
    const el = document.createElement('div');
    el.className = 'falling-star-collection';
    el.textContent = '✦';
    el.style.position = 'fixed';
    el.style.zIndex = '6';
    el.style.left = (Math.random() * 100) + 'vw';
    el.style.top = (-6 - Math.random()*10) + 'vh';
    el.style.fontSize = (18 + Math.random()*16) + 'px';
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';
    el.style.userSelect = 'none';
    el.style.color = '#fff9ff';
    el.style.textShadow = '0 0 8px #ffdff0';
    document.body.appendChild(el);

    // animate down+drift
    const duration = 4800 + Math.random()*3000;
    const endLeftPx = Math.random() * window.innerWidth;
    const endTopPx = window.innerHeight + 80;
    el.animate([
      { transform: `translate(0,0)`, opacity: 1 },
      { transform: `translate(${(Math.random()-0.5)*160}px, ${endTopPx}px)`, opacity: 0.02 }
    ], { duration: duration, easing: 'linear' });

    // click to collect
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      try { el.remove(); } catch(e){}
      starCount++;
      localStorage.setItem('stars', String(starCount));
      if (starCount === 1 && !petUnlocked) {
        showStarIntro();
      } else showToast(`Stars: ${starCount}`);
    });

    // cleanup
    setTimeout(() => { try{ el.remove(); } catch(e){} }, duration + 200);
  }

  // create a pleasant spread of background stars that feel "part of the background"
  function populateBackgroundStars() {
    // clear old
    STAR_POOL.forEach(s => { try{s.remove();}catch(e){} });
    STAR_POOL.length = 0;
    // generate stars across viewport
    for (let i = 0; i < MAX_STARS; i++) {
      const x = Math.random();
      const y = Math.random();
      // small probability to be clickable (rare in background)
      const clickable = Math.random() < 0.06; // 6% of background stars clickable
      const twinkle = true;
      createBackgroundStar(x, y, { clickable, size: (4 + Math.random()*10), twinkle });
    }
  }

  // responsive: re-populate on resize (throttle)
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      populateBackgroundStars();
    }, 220);
  });

  // start a gentle stream of falling stars (clickable) across screen
  let fallingStarInterval = setInterval(spawnFallingStar, 3500);

  // begin with populating
  populateBackgroundStars();

  // star intro modal (first star)
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

  // create pet button on left (if missing) - only show if unlocked
  let petBtnEl = document.getElementById('petButton');
  const PAW_SVG_DATA = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <g fill="#ff99aa" stroke="#5c3d3d" stroke-width="2">
        <circle cx="20" cy="18" r="6"/><circle cx="32" cy="12" r="6"/><circle cx="44" cy="18" r="6"/>
        <ellipse cx="32" cy="36" rx="16" ry="12"/>
      </g></svg>`
  )}`;

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
    // try to find real paw path; fall back to dataURI
    (async function setPawImg() {
      const tries = [
        'assets/ui/paw-icon.png',
        'assets/ui/paw.png',
        'assets/images/paw.png',
        'assets/sprites/paw.png'
      ];
      for (const p of tries) {
        try {
          const r = await fetch(p, { method: 'HEAD' }).catch(()=>null);
          if (r && r.ok) { img.src = p; petBtnEl.appendChild(img); document.body.appendChild(petBtnEl); return; }
        } catch(e){}
      }
      img.src = PAW_SVG_DATA;
      petBtnEl.appendChild(img);
      document.body.appendChild(petBtnEl);
    })();
  } else {
    petBtnEl.style.display = petUnlocked ? '' : 'none';
  }

  // create pet window (modal) if missing
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

  // star intro continue -> unlock pet and show paw
  document.addEventListener('click', (e) => {
    // starIntroContinue may not exist in DOM at load, so delegate
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

  // close pet window handler
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'closePetWindow') {
      petWindowEl.classList.add('hidden');
      petWindowEl.setAttribute('aria-hidden','true');
    }
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

  // init state on load
  (function initPetAndStars() {
    try {
      if (localStorage.getItem('petUnlocked') === 'true') {
        petUnlocked = true;
        if (petBtnEl) petBtnEl.style.display = '';
      } else if (petBtnEl) {
        petBtnEl.style.display = 'none';
      }
      if (starCount > 0) showToast(`Stars: ${starCount}`, 1200);
    } catch(e){}
  })();

  // expose debug helpers
  window.TsukiDebug = Object.assign(window.TsukiDebug || {}, {
    spawnFallingStar,
    createBackgroundStar,
    startRing,
    stopRing,
    getState: () => ({ starCount, petUnlocked, petChosen })
  });

  // keyboard escape helpers
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (petWindowEl && !petWindowEl.classList.contains('hidden')) petWindowEl.classList.add('hidden');
      if (suggestModal && !suggestModal.classList.contains('hidden')) closeSuggestModal();
      if (vnContainer && !vnContainer.classList.contains('hidden')) closeVN();
      if (starIntroEl && !starIntroEl.classList.contains('hidden')) starIntroEl.classList.add('hidden');
    }
  });

})();

// -------------------- DEBUG BUTTONS --------------------
function devLog(msg){ console.log("%cDEBUG: "+msg, "color:#ff99aa"); }

// reset pet + stars only
document.getElementById("debug-reset")?.addEventListener("click", () => {
  localStorage.removeItem("stars");
  localStorage.removeItem("petUnlocked");
  localStorage.removeItem("petChosen");
  devLog("Pet + star system reset.");
  showToast("Pet system reset!");
  location.reload();
});

// +5 stars cheat
document.getElementById("debug-add-stars")?.addEventListener("click", () => {
  let s = Number(localStorage.getItem("stars") || 0);
  s += 5;
  localStorage.setItem("stars", s);
  devLog("+5 stars.");
  showToast("+5 stars added!");
  location.reload();
});

// unlock ALL pets cheat (this just forces petUnlocked + lets user re-choose)
document.getElementById("debug-unlock-pets")?.addEventListener("click", () => {
  localStorage.setItem("petUnlocked", "true");
  devLog("Unlocked entire pet system.");
  showToast("Pet system unlocked!");
  location.reload();
});

// FULL WIPE
document.getElementById("debug-full-reset")?.addEventListener("click", () => {
  localStorage.removeItem("stars");
  localStorage.removeItem("petUnlocked");
  localStorage.removeItem("petChosen");
  devLog("All Tsuki data cleared.");
  showToast("ALL DATA CLEARED!");
  location.reload();
});
