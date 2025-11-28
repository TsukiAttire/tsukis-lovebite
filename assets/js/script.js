/* script.js — Cleaned (B2) | Important logs only | subtle reaction timing improvements */
(() => {
  'use strict';

  /* -------------------------
     Config & Resources
  ------------------------- */
  const FORM_ENDPOINT = 'https://formspree.io/f/mjkdzyqk';
  const TYPE_SPEED_MS = 24;
  const TALK_INTERVAL_MS = 140;
  const SPRITE_TRANSITION_CLASS = 'sprite-transition';

  const spriteFiles = {
    happy: ['Thanks.png', 'Thanks 2.png'],
    neutral: ['Sad Talking.png', 'Sad Talking 2.png'],
    frown: ['Frown reaction.png'],
    wineSmile: ['Holding Wine Smile.png', 'Holding Wine Smile 2.png'],
    wineScoff: ['Holding Wine Scoff.png', 'Holding Wine Scoff 2.png'],
    rose: ['Holding Rose Talk 1.png', 'Holding Rose Talk 2.png'],
    hangup: ['Hanging Up the phone.png', 'Hanging Up the phone 2.png']
  };
  const sprites = {};
  Object.keys(spriteFiles).forEach(k => {
    sprites[k] = spriteFiles[k].map(fn => `assets/sprites/${fn}`);
  });

  /* -------------------------
     DOM references
  ------------------------- */
  const phoneBtn = document.getElementById('phoneButton');
  const openVNbtn = document.getElementById('openVNbtn');
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

  /* -------------------------
     Pet-related DOM (some might be null until HTML present)
  ------------------------- */
  const petPopup = document.getElementById('petPopup');
  const petClose = document.getElementById('petClose');
  const petSpriteEl = document.getElementById('petSprite');
  const petHatImg = document.getElementById('petHat'); // hidden fallback element
  const petVariantSel = document.getElementById('petVariant');
  const starCountDisp = document.getElementById('starCountDisp');
  const loveFill = document.getElementById('loveFill');
  const shopScroll = document.getElementById('shopScroll');
  const feedBtn = document.getElementById('feedBtn');
  const batheBtn = document.getElementById('batheBtn');
  const petNameTitle = document.getElementById('petNameTitle');
  const petVisualWrap = document.getElementById('petVisualWrap');

  const firstPetUnlockBox = document.getElementById('firstPetUnlock');
  const petUnlockBtn = document.getElementById('petUnlockBtn');

  /* -------------------------
     Utility helpers & storage keys
  ------------------------- */
  const KEY_PREFIX = 'tsuki::';
  const getLoveKey = petName => `${KEY_PREFIX}petLove::${petName}`;
  const getHatKey = petName => `${KEY_PREFIX}petHat::${petName}`;

  function showToast(msg = '', duration = 1400) {
    if (!toast) {
      // fallback simple toast
      const t = document.createElement('div');
      t.textContent = msg;
      Object.assign(t.style, {
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: '120px',
        padding: '10px 14px', borderRadius: '8px', background: '#5c3d3d', color: '#ffe6e9', zIndex: 999999,
        fontFamily: 'VT323, monospace'
      });
      document.body.appendChild(t);
      setTimeout(() => t.remove(), duration);
      return;
    }
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  }

  /* -------------------------
     Audio: minimal, graceful
  ------------------------- */
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;
  let ringIntervalId = null;
  function canPlaySound() { return !!audioCtx && (toggleSfx ? toggleSfx.checked : true); }

  function startRing() {
    if (!canPlaySound()) return;
    stopRing();
    const tone = freq => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(g); g.connect(audioCtx.destination);
      g.gain.value = 0.0001;
      osc.start();
      // ramp
      g.gain.linearRampToValueAtTime(0.008, audioCtx.currentTime + 0.05);
      setTimeout(() => {
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
        try { osc.stop(audioCtx.currentTime + 0.2); } catch (e) {}
      }, 150);
    };
    tone(520); tone(660); tone(780);
    // repeat subtle
    ringIntervalId = setInterval(() => { tone(620); }, 900);
  }

  function stopRing() {
    if (ringIntervalId) clearInterval(ringIntervalId);
    ringIntervalId = null;
  }

  function playTypeBlip() {
    if (!canPlaySound()) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.value = 1200;
    o.connect(g); g.connect(audioCtx.destination);
    g.gain.value = 0.0001;
    g.gain.linearRampToValueAtTime(0.009, audioCtx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.07);
    o.start(); o.stop(audioCtx.currentTime + 0.07);
  }

  /* -------------------------
     VN: sprite & typing helpers
  ------------------------- */
  function safeSetSprite(path, el = tsukiSprite) {
    if (!el) return;
    el.classList.add(SPRITE_TRANSITION_CLASS);
    el.src = path;
  }

  function typeText(text = '', speed = TYPE_SPEED_MS) {
    return new Promise(resolve => {
      if (!textBox) return resolve();
      textBox.innerHTML = '';
      let i = 0;
      function step() {
        if (i < text.length) {
          textBox.innerHTML += text.charAt(i);
          if (i % 2 === 0) playTypeBlip();
          i++;
          setTimeout(step, speed);
        } else resolve();
      }
      step();
    });
  }

  let talkInterval = null;
  function startTalking(frames = [], intervalMs = TALK_INTERVAL_MS) {
    stopTalking();
    if (!frames || frames.length === 0) return;
    let idx = 0;
    talkInterval = setInterval(() => {
      tsukiSprite.src = frames[idx % frames.length];
      idx++;
    }, intervalMs);
  }
  function stopTalking(finalPath) {
    if (talkInterval) clearInterval(talkInterval);
    talkInterval = null;
    if (finalPath) safeSetSprite(finalPath);
  }

  function showOptions(list = []) {
    if (!optionsBox) return;
    optionsBox.innerHTML = '';
    list.forEach(item => {
      const b = document.createElement('button');
      b.className = 'optionButton';
      b.textContent = item.label;
      b.addEventListener('click', item.onClick);
      optionsBox.appendChild(b);
    });
  }

  /* -------------------------
     VN Scenes (trimmed & organized)
  ------------------------- */
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

  async function scene_identity() {
    optionsBox.innerHTML = '';
    startTalking(sprites.neutral);
    await typeText("Tsuki: Girl..Did you hit your head or something? Its me! Your Bestie?");
    stopTalking(sprites.neutral[0]);
    showOptions([
      { label: "Tell me about Cupid's daughter", onClick: scene_cupidLore },
      { label: "Back", onClick: scene_whatsUp },
      { label: "Hang up", onClick: scene_userHangup }
    ]);
  }

  async function scene_cupidLore() {
    startTalking(sprites.rose);
    await typeText("Tsuki: Dad? Dads fun! Way out of his league now with all the new technology though.");
    stopTalking(sprites.rose[0]);
    showOptions([{ label: "Back to questions", onClick: scene_identity },{ label: "Hang up", onClick: scene_userHangup }]);
  }

  async function scene_tea() {
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
    startTalking(sprites.frown);
    await typeText("Tsuki: Girl..don’t piss me off.");
    stopTalking(sprites.hangup[1] || sprites.hangup[0]);
    setTimeout(closeVN, 900);
  }

  async function scene_userHangup() {
    optionsBox.innerHTML = '';
    safeSetSprite(sprites.hangup[1] || sprites.hangup[0]);
    await typeText("—call ended—");
    setTimeout(closeVN, 600);
  }

  /* -------------------------
     VN open/close & suggest modal
  ------------------------- */
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

  function openSuggestModal(kind = '') {
    if (!suggestForm) return;
    if (!suggestForm.querySelector('input[name="type"]')) {
      const hidden = document.createElement('input');
      hidden.type = 'hidden'; hidden.name = 'type'; hidden.value = kind;
      suggestForm.appendChild(hidden);
    } else {
      const tf = suggestForm.querySelector('input[name="type"]');
      if (tf) tf.value = kind;
    }
    suggestModal.classList.remove('hidden');
    suggestModal.setAttribute('aria-hidden', 'false');
  }

  function closeSuggestModal() {
    suggestModal.classList.add('hidden');
    suggestModal.setAttribute('aria-hidden', 'true');
  }

  if (suggestForm) {
    suggestForm.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(suggestForm);
      try {
        const res = await fetch(FORM_ENDPOINT, { method: 'POST', body: fd, headers: { Accept: 'application/json' }});
        if (res.ok) {
          showToast('Submitted — thanks babe ♡');
          closeSuggestModal();
          textBox.innerText = "Tsuki: Mmm thanks! I'll check it out.";
          optionsBox.innerHTML = '';
          setTimeout(closeVN, 900);
        } else showToast('Submission failed — try again');
      } catch (err) {
        showToast('Submission failed — check network');
      }
    });
  }

  /* -------------------------
     UI event wiring
  ------------------------- */
  if (phoneBtn) {
    startRing();
    phoneBtn.addEventListener('click', () => {
      if (audioCtx?.state === 'suspended') audioCtx.resume();
      stopRing();
      openVN();
    });
  }
  if (openVNbtn) openVNbtn.addEventListener('click', () => { if (audioCtx?.state === 'suspended') audioCtx.resume(); stopRing(); openVN(); });
  if (vnClose) vnClose.addEventListener('click', closeVN);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeSuggestModal);
  if (toggleSfx) toggleSfx.addEventListener('change', () => toggleSfx.checked ? startRing() : stopRing());

  /* -------------------------
     STARS: background + falling clickable stars
  ------------------------- */
  let starCount = Number(localStorage.getItem(`${KEY_PREFIX}stars`) || 0);
  function updateStarDisp() { if (starCountDisp) starCountDisp.innerText = starCount; }
  updateStarDisp();

  let starLayer = document.getElementById('starLayerGlobal');
  if (!starLayer) {
    starLayer = document.createElement('div');
    starLayer.id = 'starLayerGlobal';
    document.body.appendChild(starLayer);
  }

  function createBackgroundStar(x, y, opts = {}) {
    const s = document.createElement('div');
    s.className = 'bg-star';
    const size = opts.size || (Math.random() * 4 + 2);
    s.style.width = `${size}px`;
    s.style.height = `${size}px`;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.opacity = opts.opacity || 0.35;
    s.style.animation = 'bgStarTwinkle 2.4s infinite ease-in-out';
    starLayer.appendChild(s);
    return s;
  }

  function collectStar(el) {
    if (el && el.remove) el.remove();
    starCount++;
    localStorage.setItem(`${KEY_PREFIX}stars`, starCount);
    updateStarDisp();
    if (!localStorage.getItem(`${KEY_PREFIX}firstStarSeen`)) {
      localStorage.setItem(`${KEY_PREFIX}firstStarSeen`, 'true');
      showFirstStarDialogue();
    } else showToast('+1 star!');
  }

  function spawnFallingStar() {
    const star = document.createElement('div');
    star.className = 'falling-star-collection';
    star.style.position = 'fixed';
    star.style.top = '-20px';
    star.style.left = `${Math.random() * (window.innerWidth - 40)}px`;
    star.style.fontSize = '22px';
    star.style.color = '#ffb3c6';
    star.style.textShadow = '0 0 8px rgba(255,200,220,1)';
    star.textContent = '★';
    document.body.appendChild(star);

    const duration = 3500 + Math.random() * 2000;
    star.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(110vh)' }], { duration, easing: 'linear' });

    star.addEventListener('click', () => collectStar(star));
    setTimeout(() => star.parentNode && star.remove(), duration + 50);
  }

  function populateBackgroundStars() {
    const MAX = Math.max(20, Math.floor((window.innerWidth * window.innerHeight) / 90000));
    for (let i = 0; i < MAX; i++) {
      createBackgroundStar(Math.random() * window.innerWidth, Math.random() * window.innerHeight, { opacity: 0.25 + Math.random() * 0.3 });
    }
  }
  populateBackgroundStars();
  setInterval(spawnFallingStar, 3500);

  /* -------------------------
     First-star special: dialogue + reveal pet unlock
  ------------------------- */
  function showFirstStarDialogue() {
    if (audioCtx?.state === 'suspended') audioCtx.resume();
    stopRing();
    vnContainer.classList.remove('hidden');
    vnContainer.setAttribute('aria-hidden', 'false');
    optionsBox.innerHTML = '';
    safeSetSprite(sprites.happy[0]);
    (async () => {
      startTalking(sprites.happy);
      await typeText("Tsuki: Oooh a star! I wonder what it does…");
      stopTalking(sprites.happy[0]);
      revealPetUnlockButton();
      showOptions([{ label: 'Cute!!', onClick: closeVN }]);
    })();
  }

  function revealPetUnlockButton() {
    if (!firstPetUnlockBox || !petUnlockBtn) return;
    firstPetUnlockBox.style.display = 'block';
    petUnlockBtn.onclick = () => {
      localStorage.setItem(`${KEY_PREFIX}petUnlocked`, 'true');
      openPetPopup();
      petUnlockBtn.innerText = 'Pet';
      console.info('Pet system unlocked');
    };
  }

  if (localStorage.getItem(`${KEY_PREFIX}petUnlocked`) === 'true' && firstPetUnlockBox) {
    firstPetUnlockBox.style.display = 'block';
    if (petUnlockBtn) petUnlockBtn.innerText = 'Pet';
    if (petUnlockBtn) petUnlockBtn.onclick = () => openPetPopup();
  }

  // End of Part 1 — pet system begins in Part 2
/* Part 2/3 — Pet system, tools, feed/bathe, hats, reactions (improved timing) */

/* -------------------------
   Pet config & storage helpers
------------------------- */
const PET_ASSETS = {
  'Bunny': 'Bunnie.png',
  'Bear Cub': 'Cubbie.png',
  'Dog': 'Doggie.png',
  'Frog': 'Froggie.png',
  'Pony': 'Horsie.png',
  'Cat': 'Kittie.png'
};

const FOOD_EMOJI = [
  { id: 'apple', emoji: '🍎' },
  { id: 'carrot', emoji: '🥕' },
  { id: 'fish', emoji: '🐟' },
  { id: 'steak', emoji: '🥩' },
  { id: 'fly', emoji: '🪰' }
];

const FOOD_PREF = {
  'Bunny':    { apple: 1, carrot: 3, fish: -1, steak: -1, fly:-2 },
  'Bear Cub': { apple: 3, carrot: 1, fish: -1, steak: 2, fly:-2 },
  'Dog':      { apple: 1, carrot: 1, fish: 2, steak: 3, fly:-2 },
  'Frog':     { apple: -1, carrot: 0, fish: 1, steak: -1, fly: 4 },
  'Pony':     { apple: 3, carrot: 2, fish: -1, steak: 0, fly:-2 },
  'Cat':      { apple: -1, carrot: -1, fish: 4, steak: 2, fly:-1 }
};

function loadPetLove(name) { return Number(localStorage.getItem(getLoveKey(name)) || 0); }
function savePetLove(name, val) { localStorage.setItem(getLoveKey(name), Math.max(0, Math.min(100, Math.round(val)))); }

function loadHat(petName) {
  try { const s = localStorage.getItem(getHatKey(petName)); return s ? JSON.parse(s) : null; }
  catch (e) { return null; }
}
function saveHat(petName, hatObj) {
  if (!hatObj) localStorage.removeItem(getHatKey(petName));
  else localStorage.setItem(getHatKey(petName), JSON.stringify(hatObj));
}

/* -------------------------
   State
------------------------- */
let currentPet = localStorage.getItem(`${KEY_PREFIX}petChosen`) || 'Bunny';
let toolMode = 'idle'; // 'idle' | 'feed' | 'bathe'
let toolContainer = null;

/* -------------------------
   Preload a few images
------------------------- */
(function preload() {
  Object.values(sprites).flat().forEach(u => { const i = new Image(); i.src = u; });
  Object.values(PET_ASSETS).forEach(fn => { const i = new Image(); i.src = `assets/pets/${fn}`; });
  new Image().src = 'assets/images/Phone.png';
})();

/* -------------------------
   Pet UI rendering & hat management
------------------------- */
function renderPetUI() {
  if (petVariantSel) petVariantSel.value = currentPet;
  if (petNameTitle) petNameTitle.innerText = currentPet;
  if (petSpriteEl) {
    const fn = PET_ASSETS[currentPet] || PET_ASSETS['Bunny'];
    petSpriteEl.src = `assets/pets/${fn}`;
    petSpriteEl.alt = currentPet;
  }
  const love = loadPetLove(currentPet);
  if (loveFill) loveFill.style.width = `${Math.min(100, love)}%`;
  updateStarDisp();
  renderHatForCurrentPet();
}

/* Hat rendering (emoji element inside petVisualWrap) */
function renderHatForCurrentPet() {
  if (!petVisualWrap) return;
  let existing = petVisualWrap.querySelector('.pet-hat-emoji');
  if (existing) existing.remove();
  const hat = loadHat(currentPet);
  if (!hat || !hat.emoji) return;
  const el = document.createElement('div');
  el.className = 'pet-hat-emoji';
  el.innerText = hat.emoji;
  el.style.position = 'absolute';
  el.style.left = (hat.xPct || 50) + '%';
  el.style.top = (hat.yPct || 12) + '%';
  el.style.transform = `translate(-50%,-50%) scale(${hat.scale || 1.2})`;
  el.style.fontSize = '34px';
  el.style.cursor = 'grab';
  el.style.zIndex = 40;
  petVisualWrap.appendChild(el);
  makeHatDraggable(el);
}

/* Make an existing hat element draggable to reposition and save */
function makeHatDraggable(hatEl) {
  if (!petVisualWrap) return;
  let active = false;
  function onDown(e) {
    e.preventDefault();
    active = true;
    hatEl.style.cursor = 'grabbing';
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }
  function onMove(e) {
    if (!active) return;
    const p = getPointerPos(e);
    const wrap = petVisualWrap.getBoundingClientRect();
    const xPct = ((p.x - wrap.left) / wrap.width) * 100;
    const yPct = ((p.y - wrap.top) / wrap.height) * 100;
    hatEl.style.left = Math.max(2, Math.min(98, xPct)) + '%';
    hatEl.style.top = Math.max(2, Math.min(98, yPct)) + '%';
  }
  function onUp(e) {
    if (!active) return;
    active = false;
    hatEl.style.cursor = 'grab';
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    // save new position
    const wrap = petVisualWrap.getBoundingClientRect();
    const rect = hatEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const xPct = ((cx - wrap.left) / wrap.width) * 100;
    const yPct = ((cy - wrap.top) / wrap.height) * 100;
    const hat = loadHat(currentPet) || { emoji: hatEl.innerText, scale: 1.2 };
    hat.xPct = Math.max(1, Math.min(99, xPct));
    hat.yPct = Math.max(1, Math.min(99, yPct));
    saveHat(currentPet, hat);
  }
  hatEl.addEventListener('pointerdown', onDown, { passive: false });
}

/* -------------------------
   Tools UI: ensure container and show/hide tools
------------------------- */
function ensureToolContainer() {
  if (toolContainer) return toolContainer;
  const rightBox = petPopup?.querySelector('.vn-right .vn-box');
  const cont = document.createElement('div');
  cont.id = 'petToolContainer';
  cont.style.display = 'none';
  cont.style.marginTop = '12px';
  cont.style.flexWrap = 'wrap';
  cont.style.justifyContent = 'center';
  cont.style.gap = '8px';
  if (rightBox) rightBox.appendChild(cont);
  else petPopup?.appendChild(cont);
  toolContainer = cont;
  return cont;
}

function showToolsForMode(mode) {
  const cont = ensureToolContainer();
  cont.innerHTML = '';
  cont.style.display = 'flex';
  cont.dataset.mode = mode;
  toolMode = mode;

  if (mode === 'feed') {
    FOOD_EMOJI.forEach(f => {
      const b = document.createElement('button');
      b.className = 'pet-tool tool-food';
      b.dataset.tool = 'food';
      b.dataset.foodId = f.id;
      b.innerText = f.emoji;
      b.title = f.id;
      cont.appendChild(b);
    });
  } else if (mode === 'bathe') {
    const soap = document.createElement('button'); soap.className = 'pet-tool tool-soap'; soap.dataset.tool = 'soap'; soap.innerText = '🧼';
    const shower = document.createElement('button'); shower.className = 'pet-tool tool-shower'; shower.dataset.tool = 'shower'; shower.innerText = '🚿';
    const towel = document.createElement('button'); towel.className = 'pet-tool tool-towel'; towel.dataset.tool = 'towel'; towel.innerText = '🧻';
    cont.appendChild(soap); cont.appendChild(shower); cont.appendChild(towel);
  }
  attachToolDragHandlers();
}

function hideTools() {
  if (!toolContainer) return;
  toolContainer.style.display = 'none';
  toolMode = 'idle';
  if (batheBtn) batheBtn.innerText = 'Bathe';
}

/* Wire feed & bathe buttons */
if (feedBtn) feedBtn.addEventListener('click', () => toggleToolMode('feed'));
if (batheBtn) batheBtn.addEventListener('click', () => toggleToolMode('bathe'));

function toggleToolMode(mode) {
  if (toolMode === mode) { hideTools(); return; }
  showToolsForMode(mode);
  if (mode === 'bathe') batheBtn && (batheBtn.innerText = 'Exit Bath');
  if (mode !== 'bathe') cleanupBubbles();
}

/* -------------------------
   Bathing & bubbles
------------------------- */
function createBubblesAt(xPct = 50, yPct = 60) {
  cleanupBubbles();
  if (!petVisualWrap) return;
  const wrapRect = petVisualWrap.getBoundingClientRect();
  const bubbleCount = 6 + Math.floor(Math.random() * 8);
  for (let i = 0; i < bubbleCount; i++) {
    const b = document.createElement('div');
    b.className = 'pet-bubble';
    const size = 10 + Math.random() * 34;
    b.style.width = `${size}px`;
    b.style.height = `${size}px`;
    b.style.position = 'absolute';
    const left = (xPct / 100) * wrapRect.width + (Math.random() * 30 - 15);
    const top = (yPct / 100) * wrapRect.height + (Math.random() * 30 - 15);
    b.style.left = Math.max(4, Math.min(wrapRect.width - 8, left)) + 'px';
    b.style.top = Math.max(4, Math.min(wrapRect.height - 8, top)) + 'px';
    petVisualWrap.appendChild(b);
    setTimeout(() => { b.style.transform = `translateY(-12px) scale(${1 + Math.random() * 0.35})`; b.style.opacity = 0.9 - Math.random() * 0.4; }, 40 + i * 30);
  }
}

function cleanupBubbles() {
  if (!petVisualWrap) return;
  petVisualWrap.querySelectorAll('.pet-bubble').forEach(n => n.remove());
}

/* -------------------------
   Reactions (speech-bubble style) and pet bounce
   Slightly smoother timing for bounce & reaction
------------------------- */
function spawnReaction(emoji, kind = 'happy') {
  if (!petVisualWrap) return;
  const r = document.createElement('div');
  r.className = 'reaction-bubble';
  r.innerText = emoji;
  r.dataset.kind = kind;
  r.style.left = (30 + Math.random() * 100) + 'px';
  r.style.top = (10 + Math.random() * 30) + 'px';
  petVisualWrap.appendChild(r);
  requestAnimationFrame(() => {
    r.style.transform = 'translateY(-60px) scale(1.06)';
    r.style.opacity = '0';
  });
  setTimeout(() => r.remove(), 1400);
}

function petBounce() {
  if (!petVisualWrap) return;
  petVisualWrap.classList.remove('pet-bounce');
  void petVisualWrap.offsetWidth; // reflow to restart
  petVisualWrap.classList.add('pet-bounce');
  setTimeout(() => petVisualWrap.classList.remove('pet-bounce'), 520);
}

/* -------------------------
   Food handling (improved reaction flow)
------------------------- */
function handleFoodDrop(foodId, xPct = 50, yPct = 60) {
  const pref = (FOOD_PREF[currentPet] && FOOD_PREF[currentPet][foodId]) || 0;
  let delta = 0;
  if (pref >= 3) delta = 12 + Math.floor(Math.random() * 6);
  else if (pref === 2) delta = 8 + Math.floor(Math.random() * 6);
  else if (pref === 1) delta = 5 + Math.floor(Math.random() * 4);
  else if (pref === 0) delta = 1 + Math.floor(Math.random() * 2);
  else if (pref < 0) delta = - (4 + Math.floor(Math.random() * 6));

  const prev = loadPetLove(currentPet);
  savePetLove(currentPet, prev + delta);
  renderPetUI();

  let reactionEmoji = '🙂', kind = 'neutral';
  if (pref >= 3) { reactionEmoji = '😍'; kind = 'love'; }
  else if (pref === 2) { reactionEmoji = '😋'; kind = 'happy'; }
  else if (pref === 1) { reactionEmoji = '🙂'; kind = 'ok'; }
  else if (pref === 0) { reactionEmoji = '😐'; kind = 'meh'; }
  else { reactionEmoji = '😖'; kind = 'sad'; }

  // stagger reaction and bounce slightly for nicer feel
  spawnReaction(reactionEmoji, kind);
  setTimeout(() => petBounce(), 80);
  showToast((delta > 0 ? `+${delta} love` : `${delta} love`));
}

/* -------------------------
   Bath handlers
------------------------- */
function handleSoapAt(xPct = 50, yPct = 60) {
  createBubblesAt(xPct, yPct);
  spawnReaction('🫧', 'soap');
  showToast('Bubbles!');
  setTimeout(() => petBounce(), 90);
}
function handleShowerAt() {
  const prev = loadPetLove(currentPet);
  const gain = 8 + Math.floor(Math.random() * 8);
  savePetLove(currentPet, prev + gain);
  cleanupBubbles();
  spawnReaction('💦', 'rinse');
  renderPetUI();
  showToast(`Rinsed! +${gain} love`);
  setTimeout(() => petBounce(), 90);
}
function handleTowelAt() {
  const prev = loadPetLove(currentPet);
  const gain = 4 + Math.floor(Math.random() * 4);
  savePetLove(currentPet, prev + gain);
  spawnReaction('✨', 'towel');
  renderPetUI();
  showToast(`Dry & cozy! +${gain} love`);
  setTimeout(() => petBounce(), 90);
}

// End of Part 2 — shop + drag helpers in Part 3
/* Part 3/3 — Shop rendering, drag helpers, debug, injected CSS, expose debug API */

/* -------------------------
   Hat shop config
------------------------- */
const HAT_EMOJIS = [
  { id: 'crown', emoji: '👑', label: 'Crown', scale: 1.4 },
  { id: 'bow', emoji: '🎀', label: 'Bow', scale: 1.2 },
  { id: 'cap', emoji: '🧢', label: 'Cap', scale: 1.25 },
  { id: 'tophat', emoji: '🎩', label: 'Top Hat', scale: 1.45 }
];

/* -------------------------
   Pointer helper
------------------------- */
function getPointerPos(e) {
  if (!e) return { x: 0, y: 0 };
  return {
    x: (e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX)),
    y: (e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY))
  };
}

/* -------------------------
   Drag helpers for tools
------------------------- */
function makeDraggableTool(el) {
  let avatar = null;
  let active = false;
  function createAvatar(x, y) {
    avatar = document.createElement('div');
    avatar.className = 'tool-avatar';
    avatar.style.position = 'fixed';
    avatar.style.left = (x - 18) + 'px';
    avatar.style.top = (y - 18) + 'px';
    avatar.style.zIndex = 20000;
    avatar.style.pointerEvents = 'none';
    avatar.innerText = el.innerText;
    document.body.appendChild(avatar);
    return avatar;
  }
  function onDown(e) {
    e.preventDefault();
    active = true;
    const p = getPointerPos(e);
    createAvatar(p.x, p.y);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }
  function onMove(e) {
    if (!active || !avatar) return;
    const p = getPointerPos(e);
    avatar.style.left = (p.x - 18) + 'px';
    avatar.style.top = (p.y - 18) + 'px';
  }
  function onUp(e) {
    if (!active) return;
    const p = getPointerPos(e);
    const wrap = petVisualWrap && petVisualWrap.getBoundingClientRect();
    const toolType = el.dataset.tool;
    if (wrap && p.x >= wrap.left && p.x <= wrap.right && p.y >= wrap.top && p.y <= wrap.bottom) {
      const xPct = ((p.x - wrap.left) / wrap.width) * 100;
      const yPct = ((p.y - wrap.top) / wrap.height) * 100;
      if (toolType === 'food') handleFoodDrop(el.dataset.foodId, xPct, yPct);
      else if (toolType === 'soap') handleSoapAt(xPct, yPct);
      else if (toolType === 'shower') handleShowerAt();
      else if (toolType === 'towel') {
        // remove hat if exists
        const hat = loadHat(currentPet);
        if (hat) {
          saveHat(currentPet, null);
          renderHatForCurrentPet();
          showToast('Hat removed');
          console.info('Hat removed for', currentPet);
        }
        handleTowelAt();
      }
    } else showToast('Missed!');
    if (avatar && avatar.remove) avatar.remove(); avatar = null; active = false;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  }
  el.addEventListener('pointerdown', onDown, { passive: false });
}

/* Attach handlers to tools in tool container */
function attachToolDragHandlers() {
  if (!toolContainer) return;
  const tools = toolContainer.querySelectorAll('.pet-tool');
  tools.forEach(tool => {
    const newTool = tool.cloneNode(true);
    tool.replaceWith(newTool);
    makeDraggableTool(newTool);
  });
}

/* -------------------------
   Make shop hats draggable
------------------------- */
function makeShopHatDraggable(node, hatObj) {
  let avatar = null, active = false;
  function createAvatar(x, y) {
    avatar = document.createElement('div');
    avatar.className = 'tool-avatar';
    avatar.style.position = 'fixed';
    avatar.style.left = (x - 18) + 'px';
    avatar.style.top = (y - 18) + 'px';
    avatar.style.zIndex = 20000;
    avatar.style.pointerEvents = 'none';
    avatar.style.fontSize = '26px';
    avatar.innerText = hatObj.emoji;
    document.body.appendChild(avatar);
    return avatar;
  }
  function onDown(e) {
    e.preventDefault();
    active = true;
    const p = getPointerPos(e);
    createAvatar(p.x, p.y);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }
  function onMove(e) {
    if (!active || !avatar) return;
    const p = getPointerPos(e);
    avatar.style.left = (p.x - 18) + 'px';
    avatar.style.top = (p.y - 18) + 'px';
  }
  function onUp(e) {
    if (!active) return;
    const p = getPointerPos(e);
    const wrap = petVisualWrap && petVisualWrap.getBoundingClientRect();
    if (wrap && p.x >= wrap.left && p.x <= wrap.right && p.y >= wrap.top && p.y <= wrap.bottom) {
      const xPct = ((p.x - wrap.left) / wrap.width) * 100;
      const yPct = ((p.y - wrap.top) / wrap.height) * 100;
      const hat = { emoji: hatObj.emoji, xPct: Math.max(2, Math.min(98, xPct)), yPct: Math.max(2, Math.min(98, yPct)), scale: hatObj.scale || 1.2 };
      saveHat(currentPet, hat);
      renderHatForCurrentPet();
      showToast('Hat equipped ✨');
      console.info('Hat equipped', hatObj.id, 'for', currentPet);
    } else showToast('Missed!');
    if (avatar && avatar.remove) avatar.remove(); avatar = null; active = false;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  }
  node.addEventListener('pointerdown', onDown, { passive: false });
}

/* -------------------------
   Render shop (hats + placeholders)
------------------------- */
function renderShop() {
  if (!shopScroll) return;
  shopScroll.innerHTML = '';
  HAT_EMOJIS.forEach(h => {
    const div = document.createElement('div');
    div.className = 'pet-shop-item shop-hat';
    div.dataset.hatId = h.id;
    div.dataset.tool = 'hat';
    div.dataset.hatEmoji = h.emoji;
    div.dataset.hatScale = h.scale;
    div.style.cursor = 'grab';
    div.innerHTML = `<div style="font-size:28px">${h.emoji}</div><div style="margin-top:6px;font-size:12px;color:#5c3d3d">${h.label}</div>`;
    shopScroll.appendChild(div);
    makeShopHatDraggable(div, h);
  });
  // placeholder shop items (keep visual balance)
  const extras = [
    { name: 'Pixel Bow', price: 10 },
    { name: 'Tiny Crown', price: 18 }
  ];
  extras.forEach(it => {
    const el = document.createElement('div');
    el.className = 'pet-shop-item';
    el.innerHTML = `<img src="data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='#fff0f4'/><text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-size='10' fill='#5c3d3d'>${it.name}</text></svg>`) }" alt="${it.name}"><div style="margin-top:6px">${it.name}</div><div style="font-size:12px;color:#5c3d3d">⭐${it.price}</div>`;
    shopScroll.appendChild(el);
  });
}

/* -------------------------
   Attach drag to tools created in toolContainer (if any)
------------------------- */
function attachToolDragHandlers() {
  if (!toolContainer) return;
  const tools = toolContainer.querySelectorAll('.pet-tool');
  tools.forEach(tool => {
    const newTool = tool.cloneNode(true);
    tool.replaceWith(newTool);
    makeDraggableTool(newTool);
  });
}

/* -------------------------
   Initialize UI, shop, pet
------------------------- */
renderShop();
renderPetUI();

/* -------------------------
   Debug buttons (important logs only)
------------------------- */
const debugResetBtn = document.getElementById('debug-reset');
const debugAddStarsBtn = document.getElementById('debug-add-stars');
const debugUnlockPetsBtn = document.getElementById('debug-unlock-pets');
const debugFullResetBtn = document.getElementById('debug-full-reset');

if (debugResetBtn) {
  debugResetBtn.addEventListener('click', () => {
    localStorage.removeItem(`${KEY_PREFIX}petChosen`);
    Object.keys(PET_ASSETS).forEach(k => localStorage.removeItem(getLoveKey(k)));
    Object.keys(PET_ASSETS).forEach(k => localStorage.removeItem(getHatKey(k)));
    currentPet = 'Bunny';
    localStorage.setItem(`${KEY_PREFIX}petChosen`, currentPet);
    savePetLove(currentPet, 0);
    renderPetUI();
    console.info('Pet system reset (debug)');
    showToast('Pet system reset');
  });
}

if (debugAddStarsBtn) {
  debugAddStarsBtn.addEventListener('click', () => {
    starCount += 5;
    localStorage.setItem(`${KEY_PREFIX}stars`, starCount);
    updateStarDisp();
    showToast('+5 stars');
    console.info('+5 stars (debug)');
  });
}

if (debugUnlockPetsBtn) {
  debugUnlockPetsBtn.addEventListener('click', () => {
    localStorage.setItem(`${KEY_PREFIX}petUnlocked`, 'true');
    if (firstPetUnlockBox) firstPetUnlockBox.style.display = 'block';
    if (petUnlockBtn) { petUnlockBtn.innerText = 'Pet'; petUnlockBtn.onclick = () => openPetPopup(); }
    console.info('Pet system unlocked (debug)');
    showToast('Pet system unlocked (debug)');
  });
}

if (debugFullResetBtn) {
  debugFullResetBtn.addEventListener('click', () => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(`${KEY_PREFIX}petLove::`) || k === `${KEY_PREFIX}stars` || k === `${KEY_PREFIX}firstStarSeen` || k === `${KEY_PREFIX}petUnlocked` || k === `${KEY_PREFIX}petChosen` || k.startsWith(`${KEY_PREFIX}petHat::`)) {
        localStorage.removeItem(k);
      }
    });
    starCount = 0;
    updateStarDisp();
    if (firstPetUnlockBox) firstPetUnlockBox.style.display = 'none';
    currentPet = 'Bunny';
    savePetLove(currentPet, 0);
    renderPetUI();
    console.info('All pet data cleared (debug)');
    showToast('All data cleared');
  });
}

/* -------------------------
   Inject small runtime CSS for bubbles/reactions/tools
------------------------- */
(function injectRuntimeCSS() {
  const s = document.createElement('style');
  s.innerHTML = `
@keyframes bgStarTwinkle { 0%,100% { opacity:.35 } 50% { opacity:1 } }
.pet-bubble { transition: transform .6s ease, opacity .6s ease; position:absolute; border-radius:50%; box-shadow:0 0 8px rgba(255,200,220,0.9); background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(255,200,220,0.45)); pointer-events:none; }
.reaction-bubble { position:absolute; pointer-events:none; font-size:18px; padding:6px 8px; border-radius:10px; background: linear-gradient(180deg,#fff,#ffeef3); border:2px solid var(--accent-dark); color:var(--accent-dark); transform-origin:center; transition: transform 1.2s ease, opacity 1.2s ease; box-shadow: 0 10px 30px rgba(0,0,0,0.12); font-family: VT323, monospace; }
.tool-avatar { font-size:20px; padding:6px 8px; border-radius:8px; background: linear-gradient(180deg,#fff7f8,#ffeef3); border:2px solid var(--accent-dark); }
.pet-tool { cursor:pointer; font-size:20px; padding:6px 8px; border-radius:10px; background:linear-gradient(180deg,#fff6f8,#fff0f2); border:2px solid var(--accent-dark); box-shadow:0 8px 20px rgba(255,153,170,0.08); }
.pet-hat-emoji { transition: transform .12s ease; will-change: transform, left, top; text-shadow: 0 6px 10px rgba(0,0,0,0.12); pointer-events:auto; }
.pet-bounce { animation: petBounce 420ms ease; display:inline-block; }
@keyframes petBounce { 0% { transform: translateY(0) } 30% { transform: translateY(-8px) } 100% { transform: translateY(0) } }
.pet-shop-item.shop-hat { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; padding:8px; width:120px; border-radius:8px; background: linear-gradient(180deg,#fff3f6,#ffeef3); border:2px solid rgba(92,61,61,0.08); text-align:center; }
.toast.show { opacity:1; transition: opacity .2s ease; }`;
  document.head.appendChild(s);
})();

/* -------------------------
   Expose small debug utilities
------------------------- */
window.__tsukiDebug = {
  openPetPopup, closePetPopup, renderPetUI, saveHat, loadHat, createBubblesAt
};

/* -------------------------
   Pet popup wiring & initial render
------------------------- */
if (petClose) petClose.addEventListener('click', closePetPopup);
if (petUnlockBtn) petUnlockBtn.addEventListener('click', () => openPetPopup());

if (petVariantSel) {
  petVariantSel.addEventListener('change', () => {
    const v = petVariantSel.value;
    if (!v) return;
    currentPet = v;
    localStorage.setItem(`${KEY_PREFIX}petChosen`, currentPet);
    if (!localStorage.getItem(getLoveKey(currentPet))) savePetLove(currentPet, 0);
    renderPetUI();
    showToast(`${currentPet} selected`);
  });
}

/* Initial render call (safety)
   (already called earlier; calling again to ensure hat & shop present)
*/
renderShop();
renderPetUI();

/* End IIFE wrapper */
})();
