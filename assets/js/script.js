/* assets/js/script.js
   Full site JS: VN (Tsuki), stars, pet popup (VN-style) + shop/hats/feed/bathe
   Drop-in replacement for existing script.js
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

  // pet elements
  const petButton = document.getElementById('petButton');
  const petButtonImg = document.getElementById('petButtonImg');
  const petPopup = document.getElementById('petPopup');
  const petClose = document.getElementById('petClose');
  const petSpriteEl = document.getElementById('petSprite');
  const petHatEl = document.getElementById('petHat');
  const petVariantSel = document.getElementById('petVariant');
  const starCountDisp = document.getElementById('starCountDisp');
  const loveFill = document.getElementById('loveFill');
  const shopScroll = document.getElementById('shopScroll');
  const feedBtn = document.getElementById('feedBtn');
  const batheBtn = document.getElementById('batheBtn');

  // small toast helper
  function showToast(msg, duration = 1400) {
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
    } catch(e) { console.warn('toast err', e); }
  }

  // -------------- Audio (WebAudio) --------------
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

  // typing blip
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

  // ---------- VN (Tsuki) logic (kept) ----------
  let talkInterval = null;
  function safeSetSprite(path, el = tsukiSprite) {
    if (!el) return;
    el.classList.add(SPRITE_TRANSITION_CLASS);
    el.src = path;
    el.onerror = () => {
      console.warn('Sprite failed to load:', path);
      el.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABhElEQVR4nO2ZQQ6CQBBFz6k9gQdgQdgQdgQdgQdgQdgQdgQd2k1cSaT+3q0v2Y3sWmE1Nn6c4eOBuAnwAegF8AHoBfAHq7Wwq2Lx5WZyQq2y3i8f9y1oSxTuY2Qq2x0i8z8DPXjgq1wq2p2qzQZr3KpB2G1M2wz1m1nNe2xY6l8e4VJ2q8Un6q8N5Xso9V6r+2q3t3Z2L6f4Kq+7X2l9bW6r9bGdV1q7t7q9u7+6vU6r8s7j9w+9+9uA9uAY6gFiwDq4Bq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Bq8F7wG6BzqDxw9w6J3+uX9zR6wQZtYQZsYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwXrxQHz5wz9QuS5V4wAAAABJRU5ErkJggg==';
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

  // Scenes
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

  // Suggest modal
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

  // Formspree
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

  // Top nav
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

  // preload sprites
  (function preloadAll() {
    Object.values(sprites).forEach(arr => arr.forEach(path => {
      const img = new Image(); img.src = path;
    }));
    const phoneTest = new Image(); phoneTest.src = 'assets/images/Phone.png';
  })();

  // start ring if phone exists
  if (phoneBtn) {
    try { startRing(); } catch(e){ console.warn('startRing error', e); }
    phoneBtn.addEventListener('click', () => {
      if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }
      stopRing();
      openVN();
    });
  }
  if (vnClose) vnClose.addEventListener('click', closeVN);
  if (openVNbtn) openVNbtn.addEventListener('click', () => { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); stopRing(); openVN(); });
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeSuggestModal);

  if (toggleSfx) {
    toggleSfx.addEventListener('change', () => {
      if (!toggleSfx.checked) stopRing(); else startRing();
    });
  }

  // -------------- STARS SYSTEM (full-screen) --------------
  // persistent star count key: 'stars'
  let starCount = Number(localStorage.getItem('stars') || 0);
  localStorage.setItem('stars', String(starCount));

  // star layer (create if not present)
  let starLayer = document.getElementById('starLayerGlobal');
  if (!starLayer) {
    starLayer = document.createElement('div');
    starLayer.id = 'starLayerGlobal';
    starLayer.style.pointerEvents = 'none';
    document.body.appendChild(starLayer);
  }

  const STAR_POOL = [];
  const MAX_STARS = Math.max(20, Math.floor((window.innerWidth * window.innerHeight) / 90000));

  // helper to create background star
  function createBackgroundStar(x, y, opts = {}) {
    const el = document.createElement('div');
    el.className = 'bg-star';
    el.style.left = (x * 100) + 'vw';
    el.style.top = (y * 100) + 'vh';
    const size = opts.size || (4 + Math.random() * 8);
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.background = 'linear-gradient(180deg,#fff5f8,#ffdff0)';
    el.style.opacity = (opts.clickable ? 1 : (0.6 + Math.random()*0.5)).toString();
    el.style.pointerEvents = opts.clickable ? 'auto' : 'none';
    el.style.transform = 'translate(-50%,-50%)';
    if (opts.clickable) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        collectStar(el);
      });
    }
    // twinkle
    const dur = 3 + Math.random()*5;
    el.style.animation = `bgStarTwinkle ${dur}s infinite ease-in-out`;
    el.style.animationDelay = Math.random() * dur + 's';
    starLayer.appendChild(el);
    STAR_POOL.push(el);
    return el;
  }

  // collect star
  function collectStar(el) {
    try {
      el.style.transition = 'transform .18s ease, opacity .28s ease';
      el.style.transform = 'translate(-50%,-50%) scale(.6)';
      el.style.opacity = '0';
      setTimeout(()=>{ try{ el.remove(); }catch(e){} }, 300);
    } catch(e){}
    starCount++;
    localStorage.setItem('stars', String(starCount));
    updateStarDisplay();
    if (starCount === 1) {
      // when first star collected, no auto-open here; pet intro handled elsewhere
      showToast('First star! ✦');
    } else {
      showToast(`Stars: ${starCount}`);
    }
  }

  // falling stars spawn (clickable)
  function spawnFallingStar() {
    const el = document.createElement('div');
    el.className = 'falling-star-collection';
    el.textContent = '✦';
    el.style.position = 'fixed';
    el.style.zIndex = 6;
    el.style.left = (Math.random() * 100) + 'vw';
    el.style.top = (-6 - Math.random()*10) + 'vh';
    el.style.fontSize = (18 + Math.random()*16) + 'px';
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';
    el.style.userSelect = 'none';
    el.style.color = '#fff9ff';
    el.style.textShadow = '0 0 8px #ffdff0';
    document.body.appendChild(el);

    const duration = 3800 + Math.random()*3000;
    const endLeft = Math.random() * window.innerWidth;
    el.animate([
      { transform: 'translate(0,0)', opacity:1 },
      { transform: `translate(${(Math.random()-0.5)*160}px, ${window.innerHeight + 120}px)`, opacity:0.02 }
    ], { duration: duration, easing: 'linear' });

    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      try{ el.remove(); }catch(e){}
      starCount++;
      localStorage.setItem('stars', String(starCount));
      updateStarDisplay();
      showToast(`Stars: ${starCount}`);
    });

    setTimeout(()=>{ try{ el.remove(); }catch(e){} }, duration + 300);
  }

  function populateBackgroundStars() {
    STAR_POOL.forEach(s => { try{s.remove();}catch(e){} });
    STAR_POOL.length = 0;
    for (let i=0;i<MAX_STARS;i++){
      const x = Math.random();
      const y = Math.random();
      const clickable = Math.random() < 0.06;
      createBackgroundStar(x,y,{clickable, size: 3 + Math.random()*10});
    }
  }

  // start spawning falling stars occasionally
  let fallingInterval = setInterval(spawnFallingStar, 3500);
  window.addEventListener('resize', () => {
    clearTimeout(window._starResizeTimer);
    window._starResizeTimer = setTimeout(()=> {
      populateBackgroundStars();
    }, 220);
  });

  // initial populate
  populateBackgroundStars();

  // expose showStarIntro if needed (kept minimal)
  function showStarIntro(){ /* no-op wrapper (we show pet unlock elsewhere) */ }

  // show star count UI update (pet popup displays)
  function updateStarDisplay() {
    if (starCountDisp) starCountDisp.innerText = String(starCount);
  }
  updateStarDisplay();

  // -------------- PET SYSTEM (popup VN-style) --------------
  // storage keys: stars, petUnlocked, petChosen, hat_owned, hat_equipped, petLove
  let petUnlocked = localStorage.getItem('petUnlocked') === 'true';
  let petChosen = localStorage.getItem('petChosen') || 'Oreo Bunny';
  let hatOwned = (() => { try { return JSON.parse(localStorage.getItem('hat_owned') || '[]'); } catch(e){ return []; }})();
  let hatEquipped = localStorage.getItem('hat_equipped') || '';
  let petLove = Number(localStorage.getItem('petLove') || 0);

  // pet sprite file paths (encode spaces)
  const petSprites = {
    'Rocky Road Bunny': encodeURI('assets/pets/Rocky Road Bunny.png'),
    'Oreo Bunny': encodeURI('assets/pets/Oreo Bunny.png'),
    'Vanilla Bunny': encodeURI('assets/pets/Vanilla Bunny.png')
  };

  // hat catalog (id, name, price, svg dataURI)
  const HAT_CATALOG = [
    { id:'beret-pink', name:'Beret (Pink)', price:3, svg: hatSVG('beret','pink') },
    { id:'beret-black', name:'Beret (Black)', price:3, svg: hatSVG('beret','black') },
    { id:'beret-white', name:'Beret (White)', price:3, svg: hatSVG('beret','white') },

    { id:'crown-gold', name:'Crown (Gold)', price:6, svg: hatSVG('crown','gold') },
    { id:'crown-rose', name:'Crown (Rose)', price:6, svg: hatSVG('crown','rose') },
    { id:'crown-blue', name:'Crown (Blue)', price:6, svg: hatSVG('crown','blue') },

    { id:'jester-red', name:'Jester (Red)', price:4, svg: hatSVG('jester','red') },
    { id:'jester-purple', name:'Jester (Purple)', price:4, svg: hatSVG('jester','purple') },
    { id:'jester-green', name:'Jester (Green)', price:4, svg: hatSVG('jester','green') }
  ];

  // hat SVG generator
  function hatSVG(kind, color) {
    const colorMap = {
      pink:'#ff99aa', black:'#1b1b1b', white:'#fff8f8',
      gold:'#f2c94c', rose:'#ffccd5', blue:'#2f6ea6',
      red:'#d93b3b', purple:'#7a4cae', green:'#2aa36b'
    };
    const fill = colorMap[color] || '#ff99aa';
    let svg = '';
    if (kind === 'beret') {
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='64' viewBox='0 0 96 64'>
        <ellipse cx='48' cy='36' rx='36' ry='16' fill='${fill}' stroke='${shade(fill,-30)}' stroke-width='2'/>
        <rect x='54' y='22' width='10' height='6' rx='3' fill='${shade(fill,10)}'/>
      </svg>`;
    } else if (kind === 'crown') {
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='64' viewBox='0 0 96 64'>
        <path d='M8 44 L20 26 L36 40 L48 18 L60 40 L76 26 L88 44 Z' fill='${fill}' stroke='${shade(fill,-30)}' stroke-width='2'/>
        <rect x='12' y='44' width='72' height='6' fill='${shade(fill,-10)}'/>
      </svg>`;
    } else if (kind === 'jester') {
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='64' viewBox='0 0 96 64'>
        <path d='M48 14 C36 22 40 32 48 32 C56 32 60 22 48 14 Z' fill='${fill}' stroke='${shade(fill,-30)}' stroke-width='2'/>
        <ellipse cx='48' cy='46' rx='36' ry='10' fill='${shade(fill,-10)}' stroke='${shade(fill,-30)}' stroke-width='2'/>
      </svg>`;
    }
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // shade helper
  function shade(hex, percent){
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

  // set paw icon (try repo paths, fallback to inline)
  (function setPaw() {
    const tries = ['assets/ui/paw-icon.png','assets/images/paw.png','assets/sprites/paw.png'];
    let set = false;
    tries.forEach(p => {
      fetch(p, { method:'HEAD' }).then(r => {
        if (!set && r.ok) { petButtonImg.src = p; set = true; }
      }).catch(()=>{});
    });
    if (!set) petButtonImg.src = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><g fill="#ff99aa" stroke="#5c3d3d" stroke-width="2"><circle cx="20" cy="18" r="6"/><circle cx="32" cy="12" r="6"/><circle cx="44" cy="18" r="6"/><ellipse cx="32" cy="36" rx="16" ry="12"/></g></svg>`)}`;
  })();

  // open pet popup
  if (petButton) {
    petButton.addEventListener('click', () => {
      if (!petUnlocked) {
        // unlock if first use? Keep it simple: unlock when clicked
        petUnlocked = true;
        localStorage.setItem('petUnlocked', 'true');
        showToast('Pet system unlocked!');
      }
      openPetPopup();
    });
  }

  if (petClose) petClose.addEventListener('click', closePetPopup);

  function openPetPopup() {
    petPopup.classList.remove('hidden');
    petPopup.setAttribute('aria-hidden','false');
    // populate
    renderPetPopup();
  }

  function closePetPopup() {
    petPopup.classList.add('hidden');
    petPopup.setAttribute('aria-hidden','true');
  }

  function renderPetPopup() {
    // sprite
    petSpriteEl.src = petSprites[petChosen] || petSprites['Oreo Bunny'];
    // hat
    const hat = HAT_CATALOG.find(h=>h.id===hatEquipped);
    petHatEl.src = hat ? hat.svg : '';
    petHatEl.style.display = hat ? 'block' : 'none';
    // variant select
    if (petVariantSel) petVariantSel.value = petChosen;
    // star count
    updateStarDisplay();
    // love fill
    updateLoveFill();

    // build shop items
    shopScroll.innerHTML = '';
    HAT_CATALOG.forEach(h => {
      const owned = hatOwned.includes(h.id);
      const item = document.createElement('div');
      item.className = 'pet-shop-item';
      item.innerHTML = `
        <div style="height:62px;display:flex;align-items:center;justify-content:center">
          <img src="${h.svg}" alt="${h.name}" />
        </div>
        <div style="font-weight:800;margin-top:6px">${h.name}</div>
        <div style="margin-top:6px">${h.price} ✦</div>
      `;
      const btn = document.createElement('button');
      btn.className = 'submit-btn';
      btn.style.marginTop = '6px';
      if (owned) {
        btn.textContent = hatEquipped === h.id ? 'Equipped' : 'Equip';
        btn.addEventListener('click', () => {
          hatEquipped = h.id;
          localStorage.setItem('hat_equipped', hatEquipped);
          showToast('Equipped ' + h.name);
          renderPetPopup();
        });
      } else {
        btn.textContent = 'Buy';
        btn.addEventListener('click', () => {
          if (starCount >= h.price) {
            starCount -= h.price;
            localStorage.setItem('stars', String(starCount));
            hatOwned.push(h.id);
            localStorage.setItem('hat_owned', JSON.stringify(hatOwned));
            showToast('Purchased ' + h.name);
            updateStarDisplay();
            renderPetPopup();
          } else {
            showToast('Not enough stars!');
          }
        });
      }
      item.appendChild(btn);
      shopScroll.appendChild(item);
    });
  }

  // variant change
  petVariantSel?.addEventListener('change', (e) => {
    petChosen = e.target.value;
    localStorage.setItem('petChosen', petChosen);
    renderPetPopup();
  });

  // feed / bathe - simple increases love
  feedBtn?.addEventListener('click', () => {
    petLove = Math.min(100, petLove + 6);
    localStorage.setItem('petLove', String(petLove));
    updateLoveFill();
    showToast('Fed! +6 love');
  });

  // bathing mechanic: simple toggle for now + small love gain
  batheBtn?.addEventListener('click', () => {
    // reveal a quick inline "drag soap" UX could be added; keep simple: instant bubbles -> rinse
    petLove = Math.min(100, petLove + 8);
    localStorage.setItem('petLove', String(petLove));
    updateLoveFill();
    showToast('Bathe complete! +8 love');
  });

  function updateLoveFill() {
    const pct = Math.round((petLove / 100) * 100);
    if (loveFill) loveFill.style.width = pct + '%';
  }

  // init pet state from storage
  (function initPetState(){
    petUnlocked = localStorage.getItem('petUnlocked') === 'true';
    petChosen = localStorage.getItem('petChosen') || petChosen;
    hatOwned = (() => { try { return JSON.parse(localStorage.getItem('hat_owned') || '[]'); } catch(e){ return []; }})();
    hatEquipped = localStorage.getItem('hat_equipped') || '';
    petLove = Number(localStorage.getItem('petLove') || 0);
    updateStarDisplay();
    updateLoveFill();
    // show pet button only if unlocked (but keep it visible to open)
    if (petButton) petButton.style.display = '';
  })();

  // -------------- Debug buttons (settings) --------------
  function devLog(msg){ console.log("%cDEBUG: "+msg, "color:#ff99aa"); }

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

  document.getElementById("debug-add-stars")?.addEventListener("click", () => {
    let s = Number(localStorage.getItem("stars") || 0);
    s += 5;
    localStorage.setItem("stars", s);
    starCount = s;
    updateStarDisplay();
    devLog("+5 stars.");
    showToast("+5 stars added!");
  });

  document.getElementById("debug-unlock-pets")?.addEventListener("click", () => {
    localStorage.setItem("petUnlocked", "true");
    petUnlocked = true;
    devLog("Unlocked pet system.");
    showToast("Pet system unlocked!");
  });

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

  // keyboard escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (petPopup && !petPopup.classList.contains('hidden')) petPopup.classList.add('hidden');
      if (vnContainer && !vnContainer.classList.contains('hidden')) closeVN();
      if (suggestModal && !suggestModal.classList.contains('hidden')) closeSuggestModal();
    }
  });

  // expose debug helpers
  window.TsukiDebug = Object.assign(window.TsukiDebug || {}, {
    spawnFallingStar,
    createBackgroundStar,
    petState: () => ({ starCount, petUnlocked, petChosen, hatOwned, hatEquipped, petLove })
  });

  // small keyframes injected for twinkle
  const styleSheet = document.createElement('style');
  styleSheet.innerHTML = `
  @keyframes bgStarTwinkle { 0% { opacity: .35 } 50% { opacity: 1 } 100% { opacity: .35 } }
  `;
  document.head.appendChild(styleSheet);

})(); // IIFE end
