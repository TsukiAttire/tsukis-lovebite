/* assets/js/script.js
   Restored soft-pixel Y2K JS (VN, stars, pet system, audio)
   - Assumes the HTML/CSS we applied earlier (IDs & classes)
   - phone ring file: assets/sfx/phone-ring.mp3
   - Thanks pair used for "happy" talking (no Happy Talking usage)
   - Saves star count and pet state to localStorage
*/

/* -------------------------
   Helper: DOM shortcuts
   ------------------------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* -------------------------
   Elements
   ------------------------- */
const phoneImg = $('#phoneImg');             // phone icon bottom-right
const vnWindow = $('#vnWindow');             // VN container
const vnSprite = $('#vnSprite');             // VN sprite image
const vnTextEl = $('#vnText');               // VN text area
const vnChoices = $('#vnChoices');           // VN options holder

const starIntro = $('#starIntro');           // first star dialog
const starIntroContinue = $('#starIntroContinue');

const petButton = $('#petButton');           // left pet button (show when unlocked)
const petWindow = $('#petWindow');           // pet window container
const petWindowContent = $('#petWindowContent');
const closePetWindow = $('#closePetWindow');

const formContainer = $('#formContainer');   // suggestion form container

/* -------------------------
   State (persistent)
   ------------------------- */
let starCount = parseInt(localStorage.getItem('stars') || '0');
let petUnlocked = localStorage.getItem('petUnlocked') === 'true';
let petChosen = localStorage.getItem('petChosen') || null;
let sfxEnabled = localStorage.getItem('sfxEnabled') !== 'false'; // default true

/* -------------------------
   Sprite pairs (filenames in assets/sprites/)
   THANKS pair used for happy (no Happy Talking)
   ------------------------- */
const spritePairs = {
  happy: ['Thanks.png', 'Thanks 2.png'],              // used for happy/talking
  thanks: ['Thanks.png', 'Thanks 2.png'],
  neutral: ['Sad Talking.png', 'Sad Talking 2.png'],
  frown: ['Frown reaction.png', 'Frown reaction.png'],
  wineSmile: ['Holding Wine Smile.png', 'Holding Wine Smile 2.png'],
  wineScoff: ['Holding Wine Scoff.png', 'Holding Wine Scoff 2.png'],
  rose: ['Holding Rose Talk 1.png', 'Holding Rose Talk 2.png'],
  hangup: ['Hanging Up the phone.png', 'Hanging Up the phone 2.png']
};

// build absolute-ish paths
Object.keys(spritePairs).forEach(k => {
  spritePairs[k] = spritePairs[k].map(fn => `assets/sprites/${fn}`);
});

/* -------------------------
   Audio
   - phone ring: assets/sfx/phone-ring.mp3
   - typing blip: WebAudio (synth) so no typing file required
   ------------------------- */
let phoneAudio = null;
try {
  phoneAudio = new Audio('assets/sfx/phone-ring.mp3');
  phoneAudio.loop = true;
  phoneAudio.volume = 0.45;
} catch(e) {
  phoneAudio = null;
}

let audioCtx = null;
try {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  audioCtx = AudioCtor ? new AudioCtor() : null;
} catch(e) {
  audioCtx = null;
}

function playTypeBlip() {
  if (!sfxEnabled || !audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square';
  o.frequency.value = 1200;
  g.gain.value = 0.0001;
  o.connect(g);
  g.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(0.0065, now + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  o.start(now);
  o.stop(now + 0.07);
}

/* for autoplay policies: resume audio context on first gesture */
function ensureAudioUnlocked() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(()=>{});
  }
  if (phoneAudio && phoneAudio.paused && sfxEnabled) {
    // attempt to play the phone ring silently (some browsers block)
    phoneAudio.play().catch(()=>{});
  }
}
document.addEventListener('pointerdown', ensureAudioUnlocked, { once: true });

/* -------------------------
   Phone ring control
   ------------------------- */
function startPhoneRing() {
  if (!phoneAudio || !sfxEnabled) return;
  phoneAudio.play().catch(()=>{}); // browsers may block until user gesture
}
function stopPhoneRing() {
  if (!phoneAudio) return;
  try { phoneAudio.pause(); phoneAudio.currentTime = 0; } catch(e){}
}

/* start ringing on load (will obey browser autoplay rules) */
startPhoneRing();

/* -------------------------
   Helper: sprite transition (fade/bounce)
   ------------------------- */
function applySpriteTransition(el) {
  el.style.transition = 'transform 0.28s ease, opacity 0.28s ease';
  el.style.transform = 'scale(0.98)';
  el.style.opacity = '0';
  // small delay then restore to allow animation
  requestAnimationFrame(() => {
    setTimeout(() => {
      el.style.transform = 'scale(1.02)';
      el.style.opacity = '1';
      setTimeout(() => { el.style.transform = ''; el.style.transition = ''; }, 280);
    }, 10);
  });
}

/* -------------------------
   Talking animation while typing
   startTalking(framesArray), stopTalking(finalFrame)
   ------------------------- */
let talkInterval = null;
function startTalking(frames = [], intervalMs = 140) {
  stopTalking();
  if (!frames || frames.length === 0) return;
  let i = 0;
  talkInterval = setInterval(() => {
    vnSprite.src = frames[i % frames.length];
    applySpriteTransition(vnSprite);
    i++;
  }, intervalMs);
}

function stopTalking(finalFrame) {
  if (talkInterval) {
    clearInterval(talkInterval);
    talkInterval = null;
  }
  if (finalFrame) {
    vnSprite.src = finalFrame;
    applySpriteTransition(vnSprite);
  }
}

/* -------------------------
   Typewriter effect that alternates speaking frames
   - `frames` is an array of 1-2 frame URLs for talking
   - `final` is final resting frame URL
   ------------------------- */
function typeWithTalking(text, frames = [], final = null, speed = 28) {
  return new Promise((resolve) => {
    vnTextEl.textContent = '';
    // start talking animation while typing
    if (frames && frames.length > 0) startTalking(frames);

    let i = 0;
    function tick() {
      if (i < text.length) {
        vnTextEl.textContent += text.charAt(i);
        // play small blip occasionally
        if (i % 2 === 0) playTypeBlip();
        i++;
        setTimeout(tick, speed);
      } else {
        stopTalking(final || (frames && frames[0]) || '');
        resolve();
      }
    }
    tick();
  });
}

/* -------------------------
   VN Scenes (simple branching)
   ------------------------- */
function clearChoices() { vnChoices.innerHTML = ''; }

function addChoice(label, fn) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.className = 'vn-choice';
  btn.onclick = fn;
  vnChoices.appendChild(btn);
}

async function scene_intro() {
  clearChoices();
  // thanks pair for happy
  const happyFrames = spritePairs.happy;
  await typeWithTalking("Tsuki: Hey Boo! ♡ You finally picked up..", happyFrames, spritePairs.happy[0]);
  // present options
  addChoice("I've got some tea for a video, girl!", () => scene_tea());
  addChoice("Who are you…What are you?", () => scene_who());
  addChoice("Hang up", () => scene_hangup());
}

async function scene_tea() {
  clearChoices();
  startTalking(spritePairs.wineSmile);
  await typeWithTalking("Tsuki: Oooh…Spill it!", spritePairs.wineSmile, spritePairs.wineSmile[0]);
  addChoice("Suggest Rant or Game", () => openSuggestForm());
  addChoice("Hang up", () => scene_hangupMad());
}

async function scene_who() {
  clearChoices();
  await typeWithTalking("Tsuki: I'm Tsuki — chaotic content queen, duh.", spritePairs.neutral, spritePairs.neutral[0]);
  addChoice("Sorry", () => { vnWindow.style.display='none'; });
  addChoice("Back", () => scene_intro());
}

async function scene_hangup() {
  clearChoices();
  vnSprite.src = spritePairs.hangup[0];
  await typeWithTalking("…click", [], spritePairs.hangup[0], 20);
  setTimeout(()=>vnWindow.style.display='none', 700);
}

async function scene_hangupMad() {
  clearChoices();
  await typeWithTalking("Tsuki: Girl.. don't piss me off.", spritePairs.frown.concat(spritePairs.neutral), spritePairs.hangup[0]);
  setTimeout(()=>vnWindow.style.display='none', 900);
}

/* -------------------------
   Open VN (called when clicking phone)
   ------------------------- */
function openVN() {
  // show VN window and start scene
  vnWindow.style.display = 'block';
  // ensure audio unlocked
  ensureAudioUnlocked();
  // stop phone ring while inside VN
  stopPhoneRing();
  // set default sprite quickly
  vnSprite.src = spritePairs.happy[0];
  // small delay then start intro
  setTimeout(() => scene_intro(), 220);
}

/* close VN */
function closeVN() {
  vnWindow.style.display = 'none';
  stopTalking();
}

/* phone click behavior: ring -> open */
if (phoneImg) {
  // make it shake visually while ringing (brief)
  phoneImg.addEventListener('click', () => {
    ensureAudioUnlocked();
    // stop phone ring and open VN
    stopPhoneRing();
    openVN();
  });
}

/* -------------------------
   Suggestion Form (modal)
   ------------------------- */
function openSuggestForm(kind='') {
  // prefill hidden 'type' if exists or create
  if (!formContainer) return;
  formContainer.classList.remove('hidden');
  // scroll to top so visible
  window.scrollTo({top:0,behavior:'smooth'});
}

function closeSuggestForm() {
  if (!formContainer) return;
  formContainer.classList.add('hidden');
}

/* close if user clicks outside (optional) */
document.addEventListener('click', (e) => {
  if (!formContainer) return;
  const inside = formContainer.contains(e.target);
  // if form is visible and click outside, don't auto-close (user might want to keep)
});

/* -------------------------
   STAR SYSTEM — falling clickable stars
   - uses simple DOM + CSS animation by modifying top
   ------------------------- */
function spawnStar() {
  const el = document.createElement('div');
  el.className = 'star';
  el.textContent = '✦';
  // random horizontal within viewport
  const x = Math.max(10, Math.random() * (window.innerWidth - 40));
  el.style.left = `${x}px`;
  el.style.top = `-30px`;
  el.style.opacity = '1';
  el.style.transition = `top ${4 + Math.random()*2}s linear, opacity 0.6s linear`;
  document.body.appendChild(el);

  // collect click
  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    // tiny collect effect
    el.style.transform = 'scale(0.9)';
    el.style.opacity = '0';
    setTimeout(() => {
      try { el.remove(); } catch(e){}
    }, 140);
    // increment
    starCount++;
    localStorage.setItem('stars', String(starCount));
    // if this is the very first star ever collected, show intro and unlock
    if (starCount === 1 && !petUnlocked) {
      // show star intro bubble
      showStarIntro();
    } else {
      // small feedback toast
      showSmallToast(`Stars: ${starCount}`);
    }
  });

  // animate down
  requestAnimationFrame(() => {
    el.style.top = `${window.innerHeight + 50}px`;
    // remove after animation
    setTimeout(() => {
      try { el.remove(); } catch(e){}
    }, (4 + Math.random()*2)*1000 + 200);
  });
}

/* spawn stars every few seconds */
let starSpawner = setInterval(spawnStar, 2800);

/* show star intro intro bubble */
function showStarIntro() {
  if (!starIntro) return;
  starIntro.classList.remove('hidden');
}

/* hide star intro and unlock pets when continue clicked */
if (starIntroContinue) {
  starIntroContinue.addEventListener('click', () => {
    starIntro.classList.add('hidden');
    petUnlocked = true;
    localStorage.setItem('petUnlocked', 'true');
    // show pet button (left)
    if (petButton) petButton.style.display = '';
    showSmallToast("Pet unlocked! Click the paw to adopt.");
  });
}

/* small toast util (simple) */
function showSmallToast(msg, ms=2000) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.position = 'fixed';
  t.style.left = '50%';
  t.style.transform = 'translateX(-50%)';
  t.style.bottom = '120px';
  t.style.padding = '8px 12px';
  t.style.background = '#5c3d3d';
  t.style.color = '#ffe6e9';
  t.style.borderRadius = '8px';
  t.style.zIndex = '999999';
  t.style.fontFamily = 'VT323, monospace';
  t.style.fontSize = '18px';
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.opacity = '0'; t.style.transition='opacity 0.4s'; }, ms-300);
  setTimeout(()=>{ try{ t.remove(); }catch(e){} }, ms+200);
}

/* -------------------------
   PET SYSTEM (starter selection + saved pet)
   left side pet button appears when petUnlocked
   petWindow shows starter choices if none
   ------------------------- */
function refreshPetUI() {
  if (petUnlocked) {
    if (petButton) petButton.style.display = '';
  } else {
    if (petButton) petButton.style.display = 'none';
  }
}
refreshPetUI();

if (petButton) {
  petButton.addEventListener('click', () => {
    // open pet window centered (we designed a soft window as petWindow)
    if (petWindow) {
      petWindow.classList.remove('hidden');
      // fill content
      loadPetWindow();
    }
  });
}

if (closePetWindow) {
  closePetWindow.addEventListener('click', () => petWindow.classList.add('hidden'));
}

function loadPetWindow() {
  if (!petWindowContent) return;
  if (!petChosen) {
    petWindowContent.innerHTML = `
      <p style="font-size:20px;margin:8px 0">Choose your starter pet:</p>
      <div style="display:flex;gap:12px;justify-content:center">
        <button id="choosePuppy" style="font-size:18px;padding:8px 10px">🐶 Puppy</button>
        <button id="chooseKitten" style="font-size:18px;padding:8px 10px">🐱 Kitten</button>
      </div>
      <p style="margin-top:12px;font-size:16px;color:#5c3d3d">You can collect more pets using stars in the shop later.</p>
    `;
    // attach handlers
    const pup = document.getElementById('choosePuppy');
    const kit = document.getElementById('chooseKitten');
    if (pup) pup.onclick = () => choosePet('Puppy');
    if (kit) kit.onclick = () => choosePet('Kitten');
  } else {
    petWindowContent.innerHTML = `
      <p style="font-size:20px;margin:8px 0">Your pet: <strong>${petChosen}</strong></p>
      <p style="font-size:16px;color:#5c3d3d">More pet features (feed, dress, shop) are coming soon!</p>
    `;
  }
}

function choosePet(name) {
  petChosen = name;
  localStorage.setItem('petChosen', petChosen);
  showSmallToast(`You adopted ${name}!`);
  loadPetWindow();
}

/* -------------------------
   Page init: show/hide pet button, set initial sprite
   ------------------------- */
function init() {
  // hide pet button until unlocked if necessary
  refreshPetUI();

  // set initial VN sprite if element present
  if (vnSprite && spritePairs.happy && spritePairs.happy[0]) {
    vnSprite.src = spritePairs.happy[0];
  }

  // if there are existing stored stars, show a brief toast
  if (starCount > 0) {
    showSmallToast(`Stars: ${starCount}`, 1500);
  }

  // attempt to start phone ring (will obey autoplay)
  try {
    if (sfxEnabled && phoneAudio) phoneAudio.play().catch(()=>{});
  } catch(e){}
}
init();

/* -------------------------
   Utility: Expose debug & helpers
   ------------------------- */
window.Tsuki = {
  spawnStar,
  startPhoneRing,
  stopPhoneRing,
  openVN,
  closeVN,
  spritePairs,
  get state() { return { starCount, petUnlocked, petChosen }; }
};

/* -------------------------
   Extra: accessibility & keyboard shortcuts
   - press Esc to close VN or modals
   ------------------------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // close VN
    if (vnWindow && vnWindow.style.display === 'block') closeVN();
    // close pet
    if (petWindow && !petWindow.classList.contains('hidden')) petWindow.classList.add('hidden');
    // close form
    if (formContainer && !formContainer.classList.contains('hidden')) formContainer.classList.add('hidden');
    // close star intro
    if (starIntro && !starIntro.classList.contains('hidden')) starIntro.classList.add('hidden');
  }
});
