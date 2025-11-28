/* script.js — FIXED (Shop Buttons, Click Fixes, Clean Menu) */
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
    hangup: ['Hanging Up the phone.png', 'Hanging Up the phone 2.png'],
    flirty: ['Flirty 1.png', 'Flirty 2.png'],
    giftedRose: ['Gifted Rose 1.png', 'Gifted Rose 2.png']
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

  const toast = document.getElementById('toast');
  const toggleSfx = document.getElementById('toggle-sfx');

  /* -------------------------
     Pet & Shop DOM 
  ------------------------- */
  const petPopup = document.getElementById('petPopup');
  const petClose = document.getElementById('petClose');
  const petSpriteEl = document.getElementById('petSprite');
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

  // New Shop Buttons
  const btnGiftRose = document.getElementById('btn-gift-rose');
  const btnGiftTeddy = document.getElementById('btn-gift-teddy');
  const btnGiftPurse = document.getElementById('btn-gift-purse');
  const btnGiftChoco = document.getElementById('btn-gift-choco');
  const btnGiftBoba = document.getElementById('btn-gift-boba');
  const btnFortune = document.getElementById('btn-fortune');

  /* -------------------------
     Helpers
  ------------------------- */
  const KEY_PREFIX = 'tsuki::';
  const getLoveKey = petName => `${KEY_PREFIX}petLove::${petName}`;
  const getHatKey = petName => `${KEY_PREFIX}petHat::${petName}`;

  let starCount = Number(localStorage.getItem(`${KEY_PREFIX}stars`) || 0);
  
  function updateStarDisp() { 
    if (starCountDisp) starCountDisp.innerText = starCount; 
    const shopCosts = document.querySelectorAll('.shop-btn .cost');
    // Optional: dim items you can't afford (advanced polish)
  }
  
  function spendStars(amount) {
    if (starCount >= amount) {
      starCount -= amount;
      localStorage.setItem(`${KEY_PREFIX}stars`, starCount);
      updateStarDisp();
      return true;
    }
    showToast(`Need ${amount} stars!`);
    return false;
  }

  function showToast(msg = '', duration = 1400) {
    if (!toast) {
      const t = document.createElement('div');
      t.textContent = msg;
      Object.assign(t.style, {
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: '120px',
        padding: '10px 14px', borderRadius: '8px', background: '#5c3d3d', color: '#ffe6e9', zIndex: 999999,
        fontFamily: 'VT323, monospace', pointerEvents: 'none'
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
     Audio
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
      g.gain.linearRampToValueAtTime(0.008, audioCtx.currentTime + 0.05);
      setTimeout(() => {
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
        try { osc.stop(audioCtx.currentTime + 0.2); } catch (e) {}
      }, 150);
    };
    tone(520); tone(660); tone(780);
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
     VN Logic
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

  function openVN() {
    vnContainer.classList.remove('hidden');
    vnContainer.setAttribute('aria-hidden', 'false');
    stopRing();
  }
  function closeVN() {
    vnContainer.classList.add('hidden');
    vnContainer.setAttribute('aria-hidden', 'true');
    optionsBox.innerHTML = '';
    textBox.innerHTML = '';
    stopTalking();
  }

  /* -------------------------
     SCENES (Standard)
  ------------------------- */
  async function scene_start() {
    openVN();
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
      { label: "I've got some tea for a video...", onClick: scene_tea },
      { label: "Who are you…What are you?", onClick: scene_identity },
      // Gifts & Fortune removed from here (moved to Shop)
      { label: "Hang up", onClick: scene_userHangup }
    ]);
  }

  /* -------------------------
     SCENES (Shop Items)
  ------------------------- */
  // 1. FORTUNE
  async function scene_fortuneTeller() {
    if (!spendStars(10)) return;
    openVN();
    optionsBox.innerHTML = '';
    
    const fortunes = [
      "The stars say... girl, no.", "My dad Cupid says YES! Go for it!", "It's giving... chaotic energy.",
      "Outlook is sparkly! ✨", "Don't bet your soulmate on it.", "The spirits are ghosting me rn...", "Absolutely! Manifest it! ♡"
    ];
    const result = fortunes[Math.floor(Math.random() * fortunes.length)];

    startTalking(sprites.rose);
    await typeText("Tsuki: *Close eyes* Hmmm... tapping into the vibes...");
    await new Promise(r => setTimeout(r, 1000));
    await typeText(`Tsuki: ${result}`);
    stopTalking(sprites.rose[0]);
    showOptions([{ label: "Close", onClick: closeVN }]);
  }

  // 2. GIFTS
  async function triggerGift(cost, sceneFunc) {
    if (!spendStars(cost)) return;
    openVN();
    await sceneFunc();
  }

  async function scene_giftRose() {
    startTalking(sprites.giftedRose);
    await typeText("Tsuki: Oh my gosh! I love roses! My dad would lose his head if he saw this! Don’t tell anyone, okay?");
    stopTalking(sprites.giftedRose[0]);
    showOptions([{ label: "You're welcome!", onClick: closeVN }]);
  }

  async function scene_giftTeddy() {
    startTalking(sprites.flirty);
    await typeText("Tsuki: Awwww! Thank you! Hmm..I don’t know what to name it…Got any ideas?");
    stopTalking(sprites.flirty[0]);

    // Name input
    const container = document.createElement('div');
    container.style.marginTop = '14px';
    const input = document.createElement('input');
    input.type = 'text'; input.placeholder = 'Name the bear...';
    input.style.width = '100%'; input.style.padding = '10px'; input.style.marginBottom='8px';
    const subBtn = document.createElement('button');
    subBtn.textContent = 'Name it!'; subBtn.className = 'optionButton';

    container.appendChild(input); container.appendChild(subBtn);
    optionsBox.appendChild(container);

    subBtn.onclick = async () => {
      const bearName = input.value.trim() || 'Mr. Cuddles';
      optionsBox.innerHTML = '';
      startTalking(sprites.flirty);
      await typeText(`Tsuki: ${bearName}? Omg that is PERFECT! We are going to sleep together every night!`);
      stopTalking(sprites.flirty[0]);
      setTimeout(() => showOptions([{ label: "<3", onClick: closeVN }]), 1000);
    };
  }

  async function scene_giftPurse() {
    startTalking(sprites.flirty);
    await typeText("Tsuki: Ooohh~ I always need a new purse! Thank you so much, bestie! We should get matching ones~");
    stopTalking(sprites.flirty[0]);
    showOptions([{ label: "Yess matching!", onClick: closeVN }]);
  }

  async function scene_giftChoco() {
    startTalking(sprites.happy);
    await typeText("Tsuki: Oh my goth! I haven’t had chocolate in..fang-ever! Thank you so much, bestie <3");
    stopTalking(sprites.happy[0]);
    showOptions([{ label: "Enjoy!", onClick: closeVN }]);
  }

  async function scene_giftBoba() {
    startTalking(sprites.happy);
    await typeText("Tsuki: Oooooh~ I love bubble tea! It sucks when the boba’s get stuck on my fangs though..");
    stopTalking(sprites.happy[0]);
    showOptions([{ label: "Haha same", onClick: closeVN }]);
  }

  /* -------------------------
     UI Wiring (Shop Buttons)
  ------------------------- */
  if(btnGiftRose) btnGiftRose.onclick = () => triggerGift(20, scene_giftRose);
  if(btnGiftTeddy) btnGiftTeddy.onclick = () => triggerGift(40, scene_giftTeddy);
  if(btnGiftPurse) btnGiftPurse.onclick = () => triggerGift(50, scene_giftPurse);
  if(btnGiftChoco) btnGiftChoco.onclick = () => triggerGift(15, scene_giftChoco);
  if(btnGiftBoba) btnGiftBoba.onclick = () => triggerGift(15, scene_giftBoba);
  if(btnFortune) btnFortune.onclick = scene_fortuneTeller;

  // General UI
  if (phoneBtn) {
    startRing();
    phoneBtn.addEventListener('click', () => {
      if (audioCtx?.state === 'suspended') audioCtx.resume();
      scene_start();
    });
  }
  if (openVNbtn) openVNbtn.addEventListener('click', () => { 
    if (audioCtx?.state === 'suspended') audioCtx.resume(); 
    scene_start(); 
  });
  if (vnClose) vnClose.addEventListener('click', closeVN);
  if (toggleSfx) toggleSfx.addEventListener('change', () => toggleSfx.checked ? startRing() : stopRing());

  // Tab Logic
  const navTabs = document.querySelectorAll('.nav-tab');
  const pagePanels = document.querySelectorAll('.page-panel');
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      pagePanels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetPanel = document.getElementById(tab.dataset.tab);
      if (targetPanel) targetPanel.classList.add('active');
      if (canPlaySound()) playTypeBlip();
    });
  });

  /* -------------------------
     Standard Scenes (Lore)
  ------------------------- */
  async function scene_identity() {
    optionsBox.innerHTML = '';
    startTalking(sprites.neutral);
    await typeText("Tsuki: Girl..Did you hit your head? It's me! Your Bestie?");
    stopTalking(sprites.neutral[0]);
    showOptions([
      { label: "Tell me about being Cupid's daughter?", onClick: scene_cupidLore },
      { label: "What's the vampire side like?", onClick: scene_vampireLore },
      { label: "Favorite Monster High character?", onClick: scene_monsterHigh },
      { label: "Back", onClick: scene_whatsUp },
      { label: "Hang up", onClick: scene_userHangup }
    ]);
  }
  async function scene_cupidLore() {
    optionsBox.innerHTML = '';
    startTalking(sprites.rose);
    await typeText("Tsuki: Dad? Dads fun! Way out of his league with technology though.");
    stopTalking(sprites.rose[0]);
    showOptions([{ label: "Back", onClick: scene_identity }]);
  }
  async function scene_vampireLore() {
    optionsBox.innerHTML = '';
    startTalking(sprites.wineScoff);
    await typeText("Tsuki: I wasn’t born a vampire, I was turned on my sweet 1600.. destiny stuff.");
    stopTalking(sprites.wineScoff[0]);
    showOptions([{ label: "Do you drink blood?", onClick: scene_bloodQuestion }, { label: "Back", onClick: scene_identity }]);
  }
  async function scene_bloodQuestion() {
    optionsBox.innerHTML = '';
    startTalking(sprites.frown);
    await typeText("Tsuki: Blood? Girl no! We don’t do that anymore..are you racist?");
    await new Promise(r => setTimeout(r, 900));
    startTalking(sprites.wineSmile);
    await typeText("Tsuki: Kidding! We don’t need to drink blood anymore.");
    stopTalking(sprites.wineSmile[0]);
    showOptions([{ label: "Back", onClick: scene_identity }]);
  }
  async function scene_monsterHigh() {
    optionsBox.innerHTML = '';
    startTalking(sprites.happy);
    await typeText("Tsuki: Monster High? I’m Obsessed! Draculaura is my spirit ghoul!");
    stopTalking(sprites.happy[0]);
    showOptions([{ label: "Back", onClick: scene_identity }]);
  }
  async function scene_tea() {
    optionsBox.innerHTML = '';
    startTalking(sprites.wineSmile);
    await typeText("Tsuki: Oooh…Spill it!");
    stopTalking(sprites.wineSmile[0]);
    showOptions([{ label: "Hang up", onClick: scene_userHangup }]);
  }
  async function scene_userHangup() {
    optionsBox.innerHTML = '';
    safeSetSprite(sprites.hangup[1] || sprites.hangup[0]);
    await typeText("—call ended—");
    setTimeout(closeVN, 600);
  }

  /* -------------------------
     PET SYSTEM (Fixed)
  ------------------------- */
  const PET_ASSETS = {
    'Bunny': 'Bunnie.png', 'Bear Cub': 'Cubbie.png', 'Dog': 'Doggie.png',
    'Frog': 'Froggie.png', 'Pony': 'Horsie.png', 'Cat': 'Kittie.png'
  };
  const FOOD_PREF = {
    'Bunny':    { apple: 1, carrot: 3, fish: -1, steak: -1, fly:-2 },
    'Bear Cub': { apple: 3, carrot: 1, fish: -1, steak: 2, fly:-2 },
    'Dog':      { apple: 1, carrot: 1, fish: 2, steak: 3, fly:-2 },
    'Frog':     { apple: -1, carrot: 0, fish: 1, steak: -1, fly: 4 },
    'Pony':     { apple: 3, carrot: 2, fish: -1, steak: 0, fly:-2 },
    'Cat':      { apple: -1, carrot: -1, fish: 4, steak: 2, fly:-1 }
  };
  
  let currentPet = localStorage.getItem(`${KEY_PREFIX}petChosen`) || 'Bunny';
  function loadPetLove(name) { return Number(localStorage.getItem(getLoveKey(name)) || 0); }
  function savePetLove(name, val) { localStorage.setItem(getLoveKey(name), Math.max(0, Math.min(100, Math.round(val)))); }
  function loadHat(petName) { try { const s = localStorage.getItem(getHatKey(petName)); return s ? JSON.parse(s) : null; } catch(e){return null;} }
  function saveHat(petName, hatObj) { if(!hatObj) localStorage.removeItem(getHatKey(petName)); else localStorage.setItem(getHatKey(petName), JSON.stringify(hatObj)); }

  // Initial Preload
  (function preload() {
    Object.values(sprites).flat().forEach(u => { const i = new Image(); i.src = u; });
    Object.values(PET_ASSETS).forEach(fn => { const i = new Image(); i.src = `assets/pets/${fn}`; });
  })();

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
    el.style.zIndex = 40;
    petVisualWrap.appendChild(el);
  }

  function openPetPopup() {
    if (!petPopup) return;
    petPopup.classList.remove('hidden');
    petPopup.setAttribute('aria-hidden', 'false');
    renderPetUI();
  }

  function closePetPopup() {
    if (!petPopup) return;
    petPopup.classList.add('hidden');
    petPopup.setAttribute('aria-hidden', 'true');
  }

  // Pet Event Listeners (FIXED)
  if (petClose) {
    petClose.onclick = closePetPopup; // Force overwrite
  }
  if (petUnlockBtn) petUnlockBtn.addEventListener('click', openPetPopup);
  if (petVariantSel) {
    petVariantSel.addEventListener('change', () => {
      currentPet = petVariantSel.value;
      localStorage.setItem(`${KEY_PREFIX}petChosen`, currentPet);
      if (!localStorage.getItem(getLoveKey(currentPet))) savePetLove(currentPet, 0);
      renderPetUI();
    });
  }

  // Shop Init
  const HAT_EMOJIS = [
    { id: 'crown', emoji: '👑', label: 'Crown', scale: 1.4 },
    { id: 'bow', emoji: '🎀', label: 'Bow', scale: 1.2 },
    { id: 'cap', emoji: '🧢', label: 'Cap', scale: 1.25 },
    { id: 'tophat', emoji: '🎩', label: 'Top Hat', scale: 1.45 }
  ];

  function renderShopHat() {
    if (!shopScroll) return;
    shopScroll.innerHTML = '';
    HAT_EMOJIS.forEach(h => {
      const div = document.createElement('div');
      div.className = 'pet-shop-item shop-hat';
      div.style.cursor = 'pointer';
      div.innerHTML = `<div style="font-size:28px">${h.emoji}</div><div style="font-size:12px">${h.label}</div>`;
      div.onclick = () => {
        // Simple click-to-equip for better UX than drag
        saveHat(currentPet, { emoji: h.emoji, xPct: 50, yPct: 15, scale: h.scale });
        renderPetUI();
        showToast(`Equipped ${h.label}`);
      };
      shopScroll.appendChild(div);
    });
  }
  renderShopHat();
  renderPetUI();

  // DEBUG BUTTONS
  const debugAddStarsBtn = document.getElementById('debug-add-stars');
  const debugUnlockPetsBtn = document.getElementById('debug-unlock-pets');
  const debugResetBtn = document.getElementById('debug-reset');
  const debugFullResetBtn = document.getElementById('debug-full-reset');

  if(debugAddStarsBtn) debugAddStarsBtn.onclick = () => { starCount += 50; updateStarDisp(); showToast('+50 stars'); };
  if(debugUnlockPetsBtn) debugUnlockPetsBtn.onclick = () => { 
    localStorage.setItem(`${KEY_PREFIX}petUnlocked`, 'true'); 
    if(firstPetUnlockBox) firstPetUnlockBox.style.display = 'block';
    showToast('Pet unlocked'); 
  };
  if(debugResetBtn) debugResetBtn.onclick = () => { savePetLove(currentPet, 0); renderPetUI(); showToast('Pet Reset'); };
  if(debugFullResetBtn) debugFullResetBtn.onclick = () => { localStorage.clear(); location.reload(); };

  /* -------------------------
     Stars (Background)
  ------------------------- */
  let starLayer = document.getElementById('starLayerGlobal');
  if (!starLayer) {
    starLayer = document.createElement('div');
    starLayer.id = 'starLayerGlobal';
    document.body.appendChild(starLayer);
  }
  function createBackgroundStar(x, y, opts = {}) {
    const s = document.createElement('div');
    s.className = 'bg-star';
    s.style.width = `${opts.size||(Math.random()*4+2)}px`; s.style.height = s.style.width;
    s.style.left = `${x}px`; s.style.top = `${y}px`; s.style.opacity = 0.35;
    s.style.animation = 'bgStarTwinkle 2.4s infinite ease-in-out';
    starLayer.appendChild(s);
  }
  function spawnFallingStar() {
    const star = document.createElement('div');
    star.className = 'falling-star-collection';
    star.style.position = 'fixed'; star.style.top = '-20px';
    star.style.left = `${Math.random()*(window.innerWidth-40)}px`;
    star.style.fontSize = '22px'; star.style.color = '#ffb3c6';
    star.textContent = '★';
    document.body.appendChild(star);
    const duration = 3500 + Math.random() * 2000;
    star.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(110vh)' }], { duration, easing: 'linear' });
    star.onclick = () => { star.remove(); starCount++; localStorage.setItem(`${KEY_PREFIX}stars`, starCount); updateStarDisp(); showToast('+1 star!'); };
    setTimeout(() => star.remove(), duration+50);
  }
  function populateBackgroundStars() {
    const MAX = Math.max(20, Math.floor((window.innerWidth * window.innerHeight) / 90000));
    for (let i=0; i<MAX; i++) createBackgroundStar(Math.random()*window.innerWidth, Math.random()*window.innerHeight);
  }
  populateBackgroundStars();
  setInterval(spawnFallingStar, 3500);

  // First Star Logic
  if (localStorage.getItem(`${KEY_PREFIX}petUnlocked`) === 'true' && firstPetUnlockBox) {
    firstPetUnlockBox.style.display = 'block';
  }

  // Runtime CSS Injection
  const s = document.createElement('style');
  s.innerHTML = `@keyframes bgStarTwinkle{0%,100%{opacity:.35}50%{opacity:1}} .toast.show{opacity:1}`;
  document.head.appendChild(s);

})();
