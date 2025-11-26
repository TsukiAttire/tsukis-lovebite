/* assets/js/script.js
   Hyper-Y2K VN + UI (original logic preserved)
   + robust asset fallbacks (phone, paw, ko-fi) + audio fallback
   - Uses your original VN script (no logic changes)
   - Adds "checkAssets()" to handle missing image/audio gracefully
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

  // -------------- Audio (WebAudio synth) --------------
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;
  let ringOscList = [];
  let ringGain = null;
  let ringIntervalId = null;
  let typingEnabled = true;

  function canPlaySound() {
    return audioCtx && (toggleSfx ? toggleSfx.checked : true);
  }

  // Ring synth (fallback if mp3 missing)
  function startRingSynth() {
    if (!audioCtx) return;
    stopRingSynth();
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
  function stopRingSynth() {
    try {
      if (ringIntervalId) { clearInterval(ringIntervalId); ringIntervalId = null; }
      if (ringGain) ringGain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 0.06);
      ringOscList.forEach(obj => {
        try { obj.osc.stop(audioCtx.currentTime + 0.1); obj.osc.disconnect(); obj.g.disconnect(); } catch(e){}
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

  // -------------- Scenes --------------
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

  // -------------- VN controls --------------
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

  // -------------- modal --------------
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

  // -------------- Formspree submit --------------
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

  // -------------- events --------------
  if (phoneBtn) {
    // start soft ring
    startRing();
    phoneBtn.addEventListener('click', () => {
      // resume audio context if needed (some browsers require a user gesture)
      if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }
      // stop ring and open VN
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

  // -------------- preload sprites --------------
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
     NEW: Asset & background fallback / fixes
     (auto-runs after preload)
     ============================ */

  // small SVG placeholders (pixel style) in data URLs
  const PAW_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 64 64'>
      <rect width="100%" height="100%" fill="transparent"/>
      <g fill="#ff99aa" stroke="#5c3d3d" stroke-width="2">
        <circle cx="20" cy="18" r="6"/>
        <circle cx="32" cy="12" r="6"/>
        <circle cx="44" cy="18" r="6"/>
        <ellipse cx="32" cy="36" rx="16" ry="12"/>
      </g>
    </svg>` )}`;

  const KOFI_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 64 64'>
      <g fill="#ff99aa" stroke="#5c3d3d" stroke-width="2">
        <rect x="6" y="10" width="52" height="36" rx="6" fill="#fff0f0"/>
        <text x="32" y="34" font-size="14" font-family="VT323" text-anchor="middle" fill="#5c3d3d">Ko-Fi</text>
      </g>
    </svg>` )}`;

  // Attempt to repair missing image srcs by trying multiple paths
  function tryImagePaths(imgEl, possiblePaths, fallbackDataUrl, label) {
    if (!imgEl) return Promise.resolve(null);
    return new Promise(resolve => {
      let i = 0;
      function tryNext() {
        if (i >= possiblePaths.length) {
          // all failed -> set fallback
          imgEl.src = fallbackDataUrl;
          console.warn(`All paths failed for ${label}, using fallback.`);
          showToast(`${label} icon auto-fixed`);
          return resolve(false);
        }
        const p = possiblePaths[i++];
        const tester = new Image();
        tester.onload = () => {
          imgEl.src = p;
          console.log(`${label} loaded from: ${p}`);
          return resolve(true);
        };
        tester.onerror = () => {
          tryNext();
        };
        tester.src = p;
      }
      tryNext();
    });
  }

  // check phone audio file and if missing, use synth ring instead
  async function ensurePhoneAudio() {
    const mp3Paths = [
      'assets/sfx/phone-ring.mp3',
      'assets/sfx/phone-ring.wav',
      'assets/phone-ring.mp3'
    ];
    let found = false;
    for (const p of mp3Paths) {
      try {
        const req = await fetch(p, { method: 'HEAD' }).catch(()=>null);
        if (req && req.ok) {
          // create an <audio> element if not already present and point to this file
          if (!window._tsuki_phone_audio) {
            const a = new Audio(p);
            a.loop = true; a.volume = 0.45;
            window._tsuki_phone_audio = a;
          } else {
            window._tsuki_phone_audio.src = p;
          }
          console.log('Phone audio found at', p);
          found = true; break;
        }
      } catch(e){}
    }
    if (!found) {
      console.warn('Phone audio not found - falling back to synth ring.');
      // start synth ring instead when needed
      // expose helper to start/stop synth ring
      window._tsuki_ring_synth = { start: startRingSynth, stop: stopRingSynth };
      // ensure any code calling startRing() uses synth fallback:
      window._tsuki_use_synth_ring = true;
    } else {
      window._tsuki_use_synth_ring = false;
    }
  }

  // Small wrapper to start ring that prefers audio file, otherwise synth
  function startRing() {
    if (window._tsuki_use_synth_ring) {
      startRingSynth();
    } else {
      if (window._tsuki_phone_audio) {
        window._tsuki_phone_audio.play().catch(()=>{});
      } else {
        // last resort synth
        startRingSynth();
      }
    }
  }
  function stopRing() {
    if (window._tsuki_use_synth_ring) {
      stopRingSynth();
    } else {
      if (window._tsuki_phone_audio) {
        try { window._tsuki_phone_audio.pause(); window._tsuki_phone_audio.currentTime = 0; } catch(e){}
      } else {
        stopRingSynth();
      }
    }
  }

  // replace previous startRing/stopRing defs if needed (for compatibility)
  window._tsuki_startRing = startRing;
  window._tsuki_stopRing = stopRing;

  // background fix: enforce vandyke-like chocolate if CSS not loaded fully
  function ensureBackground() {
    // We prefer the CSS variable, but if not applied, set a fallback
    const body = document.body;
    const computed = getComputedStyle(body).backgroundImage || '';
    // if CSS didn't apply (very light bg), force the vandyke brown
    if (!computed || computed === 'none' || computed.includes('linear-gradient') === false) {
      body.style.background = 'radial-gradient(circle at 10% 10%, #3b1f1f 0%, #2a1717 40%, #1f1212 100%)';
    }
  }

  // top-level asset check that runs after preload
  async function checkAssetsAndFix() {
    // ensure background
    ensureBackground();

    // phone icon element (in your HTML it's id="phoneButton")
    const phoneImg = document.getElementById('phoneButton');
    // sometimes the phone element is an <img id="phoneButton"> or an <img id="phoneImg"> - try both
    let phoneEl = phoneImg;
    if (!phoneEl) {
      phoneEl = document.getElementById('phoneImg') || document.querySelector('#phoneIcon img') || document.querySelector('img.phone-icon') || null;
    }
    if (phoneEl) {
      // possible paths to try
      const phonePaths = [
        'assets/images/Phone.png',
        'assets/image/Phone.png',
        'assets/images/phone.png',
        'assets/Phone.png',
        'assets/image/phone.png'
      ];
      await tryImagePaths(phoneEl, phonePaths, PAW_SVG, 'Phone');
    }

    // paw icon (pet button) - might be inside assets/ui/ or assets/images/
    const pawEl = document.querySelector('#petButton img') || document.querySelector('#petBtn img') || null;
    if (pawEl) {
      const pawPaths = [
        'assets/ui/paw-icon.png',
        'assets/ui/paw.png',
        'assets/images/paw.png',
        'assets/sprites/paw.png'
      ];
      await tryImagePaths(pawEl, pawPaths, PAW_SVG, 'Paw');
    } else {
      // If the pet button uses a background, ensure the button is visible if unlocked
      const pb = document.getElementById('petButton');
      if (pb) pb.style.display = 'none'; // will be turned on by pet unlocked logic
    }

    // ko-fi icon
    const kofiEl = document.querySelector('.kofi-btn img') || document.querySelector('#supportButton img') || null;
    if (kofiEl) {
      const kofiPaths = [
        'assets/ui/ko-fi.png',
        'assets/images/ko-fi.png',
        'assets/ui/kofi.png',
        'assets/images/kofi.png'
      ];
      await tryImagePaths(kofiEl, kofiPaths, KOFI_SVG, 'Ko-Fi');
    }

    // ensure audio file or fallback synth is ready
    await ensurePhoneAudio();

    // start the ring using chosen method
    try { startRing(); } catch(e){ console.warn(e); }

    // check for sprite load errors: if a key sprite fails, notify in console/toast
    const checkSprites = Object.values(sprites).flat();
    const missing = [];
    await Promise.all(checkSprites.map(p => {
      return new Promise(res => {
        const img = new Image();
        img.onload = () => res(true);
        img.onerror = () => { missing.push(p); res(false); };
        img.src = p;
      });
    }));
    if (missing.length) {
      console.warn('Some sprites not found:', missing);
      showToast('Some sprites missing — check console', 2500);
    }
  }

  // run asset fixer after a short delay (allow preload to start)
  setTimeout(() => {
    checkAssetsAndFix().catch(e => console.warn('asset-fix failed', e));
  }, 420);

  // -------------- small helper: showToast (reused from your code) --------------
  function showToast(msg, duration=1600) {
    if (!toast) {
      // fallback simple toast
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
      setTimeout(()=>{ try { t.remove(); } catch(e){} }, duration);
      return;
    }
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(()=> toast.classList.remove('show'), duration);
  }

  // expose debug
  window.TsukiDebug = { sprites, openVN, closeVN, openSuggestModal, closeSuggestModal, startRing, stopRing, checkAssetsAndFix };

})();
