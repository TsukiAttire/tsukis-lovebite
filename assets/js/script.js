/* script.js — UPDATED | Gifts, Themes, Fortune Teller */
(() => {
  'use strict';

  /* -------------------------
     Config & Resources
  ------------------------- */
  const FORM_ENDPOINT = 'https://formspree.io/f/mjkdzyqk';
  const TYPE_SPEED_MS = 24;
  const TALK_INTERVAL_MS = 140;
  const SPRITE_TRANSITION_CLASS = 'sprite-transition';

  // Sprites configuration
  const spriteFiles = {
    happy: ['Thanks.png', 'Thanks 2.png'], // Used for Neutral/Thanks
    neutral: ['Sad Talking.png', 'Sad Talking 2.png'],
    frown: ['Frown reaction.png'],
    wineSmile: ['Holding Wine Smile.png', 'Holding Wine Smile 2.png'],
    wineScoff: ['Holding Wine Scoff.png', 'Holding Wine Scoff 2.png'],
    rose: ['Holding Rose Talk 1.png', 'Holding Rose Talk 2.png'],
    hangup: ['Hanging Up the phone.png', 'Hanging Up the phone 2.png'],
    
    // NEW SPRITES
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

  const suggestModal = document.getElementById('suggestModal');
  const suggestForm = document.getElementById('suggestForm');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  const toast = document.getElementById('toast');
  const toggleSfx = document.getElementById('toggle-sfx');

  /* -------------------------
     Pet-related DOM 
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

  /* -------------------------
     Utility helpers & storage keys
  ------------------------- */
  const KEY_PREFIX = 'tsuki::';
  const getLoveKey = petName => `${KEY_PREFIX}petLove::${petName}`;
  const getHatKey = petName => `${KEY_PREFIX}petHat::${petName}`;

  /* --- STAR SYSTEM --- */
  let starCount = Number(localStorage.getItem(`${KEY_PREFIX}stars`) || 0);
  
  function updateStarDisp() { 
    if (starCountDisp) starCountDisp.innerText = starCount; 
    // Also update any other star counters in settings if we add them
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
   VN Scenes (Updated with Gifts & Fortune)
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
    { label: "🎁 Give Gift...", onClick: scene_giftSelection }, // NEW
    { label: "🔮 Ask Fortune (10★)", onClick: scene_fortuneTeller }, // NEW
    { label: "Hang up", onClick: scene_userHangup }
  ]);
}

/* --- NEW: FORTUNE TELLER --- */
async function scene_fortuneTeller() {
  optionsBox.innerHTML = '';
  
  if (!spendStars(10)) {
    // Not enough stars
    startTalking(sprites.neutral);
    await typeText("Tsuki: Bestie, the spirits require payment.. (You need 10 stars)");
    stopTalking(sprites.neutral[0]);
    setTimeout(() => showOptions([{label: "Back", onClick: scene_whatsUp}]), 500);
    return;
  }

  // Determine fortune
  const fortunes = [
    "The stars say... girl, no.",
    "My dad Cupid says YES! Go for it!",
    "It's giving... chaotic energy.",
    "Outlook is sparkly! ✨",
    "Don't bet your soulmate on it.",
    "The spirits are ghosting me rn...",
    "Absolutely! Manifest it! ♡"
  ];
  const result = fortunes[Math.floor(Math.random() * fortunes.length)];

  startTalking(sprites.rose); // Mystical vibes?
  await typeText("Tsuki: *Close eyes* Hmmm... tapping into the vibes...");
  await new Promise(r => setTimeout(r, 1000));
  
  await typeText(`Tsuki: ${result}`);
  stopTalking(sprites.rose[0]);
  
  showOptions([
    { label: "Ask another? (10★)", onClick: scene_fortuneTeller },
    { label: "Back to Chat", onClick: scene_whatsUp }
  ]);
}

/* --- NEW: GIFT SELECTION MENU --- */
async function scene_giftSelection() {
  optionsBox.innerHTML = '';
  startTalking(sprites.happy);
  await typeText("Tsuki: Omg, for me? You shouldn't have! What is it?");
  stopTalking(sprites.happy[0]);

  // Create custom buttons for gifts
  const gifts = [
    { id: 'rose', name: 'Red Rose 🌹', cost: 20, func: scene_giftRose },
    { id: 'teddy', name: 'Teddy Bear 🧸', cost: 40, func: scene_giftTeddy },
    { id: 'purse', name: 'Designer Purse 👜', cost: 50, func: scene_giftPurse },
    { id: 'choco', name: 'Dark Chocolate 🍫', cost: 15, func: scene_giftChoco },
    { id: 'boba',  name: 'Bubble Tea 🧋', cost: 15, func: scene_giftBoba },
  ];

  gifts.forEach(g => {
    const btn = document.createElement('div');
    btn.className = 'gift-btn';
    btn.innerHTML = `<span>${g.name}</span> <span class="gift-cost">${g.cost}★</span>`;
    btn.onclick = () => {
      if (spendStars(g.cost)) {
        g.func();
      }
    };
    optionsBox.appendChild(btn);
  });
  
  const backBtn = document.createElement('button');
  backBtn.className = 'optionButton';
  backBtn.textContent = 'Nevermind';
  backBtn.onclick = scene_whatsUp;
  optionsBox.appendChild(backBtn);
}

/* --- GIFT REACTIONS --- */

// 1. ROSE
async function scene_giftRose() {
  optionsBox.innerHTML = '';
  startTalking(sprites.giftedRose);
  await typeText("Tsuki: Oh my gosh! I love roses, is that basic of me? Thank you so much! My dad would lose his head if he saw this! Don’t tell anyone, okay?");
  stopTalking(sprites.giftedRose[0]);
  setTimeout(() => showOptions([{ label: "You're welcome!", onClick: scene_whatsUp }]), 1000);
}

// 2. TEDDY BEAR (Requires Naming)
async function scene_giftTeddy() {
  optionsBox.innerHTML = '';
  startTalking(sprites.flirty);
  await typeText("Tsuki: Awwww! Oh my fang! Thank you, Thank you, Thank you! Hmm..I don’t know what to name it…Got any ideas?");
  stopTalking(sprites.flirty[0]);

  // Input for naming
  const container = document.createElement('div');
  container.style.marginTop = '14px';
  container.style.pointerEvents = 'auto';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Name the bear...';
  input.style.width = '100%';
  input.style.padding = '10px';
  input.style.marginBottom = '8px';
  input.style.borderRadius = '10px';
  input.style.border = '3px solid var(--accent-dark)';
  input.style.fontFamily = 'VT323, monospace';
  input.style.fontSize = '18px';
  input.style.background = '#fff0f4';

  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'Name it!';
  submitBtn.className = 'optionButton';
  submitBtn.style.marginTop = '6px';

  container.appendChild(input);
  container.appendChild(submitBtn);
  optionsBox.appendChild(container);

  submitBtn.onclick = async () => {
    const bearName = input.value.trim() || 'Mr. Cuddles';
    optionsBox.innerHTML = '';
    startTalking(sprites.flirty);
    await typeText(`Tsuki: ${bearName}? Omg that is PERFECT! We are going to sleep together every night!`);
    stopTalking(sprites.flirty[0]);
    setTimeout(() => showOptions([{ label: "<3", onClick: scene_whatsUp }]), 1500);
  };
}

// 3. PURSE
async function scene_giftPurse() {
  optionsBox.innerHTML = '';
  startTalking(sprites.flirty);
  await typeText("Tsuki: Ooohh~ I always need a new purse! Thank you so much, bestie! We should get matching ones some time~");
  stopTalking(sprites.flirty[0]);
  setTimeout(() => showOptions([{ label: "Yess matching!", onClick: scene_whatsUp }]), 1000);
}

// 4. CHOCOLATE (Neutral/Happy)
async function scene_giftChoco() {
  optionsBox.innerHTML = '';
  startTalking(sprites.happy);
  await typeText("Tsuki: Oh my goth! I haven’t had chocolate in..fang-ever! Thank you so much, bestie <3");
  stopTalking(sprites.happy[0]);
  setTimeout(() => showOptions([{ label: "Enjoy!", onClick: scene_whatsUp }]), 1000);
}

// 5. BUBBLE TEA (Neutral/Happy)
async function scene_giftBoba() {
  optionsBox.innerHTML = '';
  startTalking(sprites.happy);
  await typeText("Tsuki: Oooooh~ I love bubble tea! It sucks when the boba’s get stuck on my fangs though..such a pain.");
  stopTalking(sprites.happy[0]);
  setTimeout(() => showOptions([{ label: "Haha same", onClick: scene_whatsUp }]), 1000);
}

/* --- EXISTING SCENES --- */
async function scene_identity() {
  optionsBox.innerHTML = '';
  startTalking(sprites.neutral);
  await typeText("Tsuki: Girl..Did you hit your head or something? Its me! Your Bestie? Maybe you just need a refresher..what do ya wanna know?");
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
  await typeText("Tsuki: Dad? Dads fun! Way out of his league now with all the new technology though. It’s alot harder to do the whole arrows and the first person you see is your soulmate thing when everyones online now, y’know?");
  stopTalking(sprites.rose[0]);
  showOptions([
    { label: "More about your job?", onClick: scene_jobLore },
    { label: "Back to questions", onClick: scene_identity },
    { label: "Hang up", onClick: scene_userHangup }
  ]);
}

async function scene_vampireLore() {
  optionsBox.innerHTML = '';
  startTalking(sprites.wineScoff);
  await typeText("Tsuki: Believe it or not I wasn’t born a vampire, that’s not how it works. I was turned on my sweet 1600..something about destiny and true love..I dont wanna talk about it..");
  stopTalking(sprites.wineScoff[0]);
  showOptions([
    { label: "Do you drink blood?", onClick: scene_bloodQuestion },
    { label: "Back to questions", onClick: scene_identity },
    { label: "Hang up", onClick: scene_userHangup }
  ]);
}

async function scene_bloodQuestion() {
  optionsBox.innerHTML = '';
  startTalking(sprites.frown);
  await typeText("Tsuki: Blood? Girl no! We don’t do that anymore..are you racist?");
  await new Promise(r => setTimeout(r, 900));
  startTalking(sprites.wineSmile);
  await typeText("Tsuki: Im kidding! We don’t need to drink blood anymore, my father would kill me if i did..");
  stopTalking(sprites.wineSmile[0]);
  showOptions([
    { label: "Back to questions", onClick: scene_identity },
    { label: "Hang up", onClick: scene_userHangup }
  ]);
}

async function scene_monsterHigh() {
  optionsBox.innerHTML = '';
  startTalking(sprites.happy);
  await typeText("Tsuki: Monster High? I’m Obsessed! Draculaura and Abby are my spirit ghouls! I could watch just them, forever! Who's your fave?");
  stopTalking(sprites.happy[0]);

  const container = document.createElement('div');
  container.style.marginTop = '14px';
  container.style.pointerEvents = 'auto';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type your fave ghoul…';
  input.style.width = '100%';
  input.style.padding = '10px';
  input.style.marginBottom = '8px';
  input.style.borderRadius = '10px';
  input.style.border = '3px solid var(--accent-dark)';
  input.style.fontFamily = 'VT323, monospace';
  input.style.fontSize = '18px';
  input.style.background = '#fff0f4';

  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'Tell Tsuki!';
  submitBtn.className = 'optionButton';
  submitBtn.style.marginTop = '6px';

  container.appendChild(input);
  container.appendChild(submitBtn);
  optionsBox.appendChild(container);

  submitBtn.onclick = async () => {
    const fave = input.value.trim() || 'someone super cool';
    optionsBox.innerHTML = '';
    startTalking(sprites.happy);
    await typeText(`Tsuki: Girrrrl! I love ${fave} too! We should watch it together some time~`);
    stopTalking(sprites.happy[0]);
    setTimeout(() => showOptions([
      { label: "Back to questions", onClick: scene_identity },
      { label: "Hang up", onClick: scene_userHangup }
    ]), 800);
  };
}

async function scene_jobLore() {
  optionsBox.innerHTML = '';
  startTalking(sprites.neutral);
  await typeText("Tsuki: You’re seeing it, babe! I do this..I spill tea with you and then tell everyone else about it, you always have the BEST gossip, bestie!");
  stopTalking(sprites.neutral[0]);
  showOptions([
    { label: "Back to questions", onClick: scene_identity },
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
  startTalking([...(sprites.frown || []), ...(sprites.neutral || [])]);
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
  const navTabs = document.querySelectorAll('.nav-tab');
  const pagePanels = document.querySelectorAll('.page-panel');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      pagePanels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetId = tab.dataset.tab;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
      if (canPlaySound()) playTypeBlip();
    });
  });

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
     STARS
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


/* -------------------------
   Pet system, tools, feed/bathe, hats
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

let currentPet = localStorage.getItem(`${KEY_PREFIX}petChosen`) || 'Bunny';
let toolMode = 'idle';
let toolContainer = null;

(function preload() {
  Object.values(sprites).flat().forEach(u => { const i = new Image(); i.src = u; });
  Object.values(PET_ASSETS).forEach(fn => { const i = new Image(); i.src = `assets/pets/${fn}`; });
  new Image().src = 'assets/images/Phone.png';
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
  el.style.cursor = 'grab';
  el.style.zIndex = 40;
  petVisualWrap.appendChild(el);
  makeHatDraggable(el);
}

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

if (feedBtn) feedBtn.addEventListener('click', () => toggleToolMode('feed'));
if (batheBtn) batheBtn.addEventListener('click', () => toggleToolMode('bathe'));

function toggleToolMode(mode) {
  if (toolMode === mode) { hideTools(); return; }
  showToolsForMode(mode);
  if (mode === 'bathe') batheBtn && (batheBtn.innerText = 'Exit Bath');
  if (mode !== 'bathe') cleanupBubbles();
}

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
  void petVisualWrap.offsetWidth;
  petVisualWrap.classList.add('pet-bounce');
  setTimeout(() => petVisualWrap.classList.remove('pet-bounce'), 520);
}

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

  spawnReaction(reactionEmoji, kind);
  setTimeout(() => petBounce(), 80);
  showToast((delta > 0 ? `+${delta} love` : `${delta} love`));
}

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

const HAT_EMOJIS = [
  { id: 'crown', emoji: '👑', label: 'Crown', scale: 1.4 },
  { id: 'bow', emoji: '🎀', label: 'Bow', scale: 1.2 },
  { id: 'cap', emoji: '🧢', label: 'Cap', scale: 1.25 },
  { id: 'tophat', emoji: '🎩', label: 'Top Hat', scale: 1.45 }
];

function getPointerPos(e) {
  if (!e) return { x: 0, y: 0 };
  return {
    x: (e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX)),
    y: (e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY))
  };
}

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
        const hat = loadHat(currentPet);
        if (hat) {
          saveHat(currentPet, null);
          renderHatForCurrentPet();
          showToast('Hat removed');
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
    } else showToast('Missed!');
    if (avatar && avatar.remove) avatar.remove(); avatar = null; active = false;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  }
  node.addEventListener('pointerdown', onDown, { passive: false });
}

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

function attachToolDragHandlers() {
  if (!toolContainer) return;
  const tools = toolContainer.querySelectorAll('.pet-tool');
  tools.forEach(tool => {
    const newTool = tool.cloneNode(true);
    tool.replaceWith(newTool);
    makeDraggableTool(newTool);
  });
}

renderShop();
renderPetUI();

/* -------------------------
   NEW: THEME SYSTEM IN SETTINGS
------------------------- */
const settingsPanel = document.getElementById('settings');
if (settingsPanel) {
  // Add Theme Header
  const themeHeader = document.createElement('h3');
  themeHeader.innerText = 'System Themes';
  themeHeader.style.marginTop = '16px';
  // Insert before debug section
  const debugSection = settingsPanel.querySelector('.settings-section');
  if (debugSection) {
    settingsPanel.insertBefore(themeHeader, debugSection);
    
    // Theme Config
    const themes = [
      { id: 'default', label: 'Default (Lovebite)', cost: 0, class: '' },
      { id: 'vampire', label: 'Vampire Mode', cost: 50, class: 'theme-vampire' },
      { id: 'midnight', label: 'Midnight System', cost: 30, class: 'theme-midnight' }
    ];

    const currentTheme = localStorage.getItem(`${KEY_PREFIX}theme`) || 'default';
    if (currentTheme !== 'default') {
      const t = themes.find(x => x.id === currentTheme);
      if (t) document.body.classList.add(t.class);
    }

    // Render Buttons
    const themeContainer = document.createElement('div');
    themeContainer.style.marginBottom = '20px';

    themes.forEach(theme => {
      const btn = document.createElement('button');
      const isUnlocked = theme.cost === 0 || localStorage.getItem(`${KEY_PREFIX}themeUnlock::${theme.id}`);
      
      btn.className = 'theme-btn';
      if (currentTheme === theme.id) btn.classList.add('active-theme');
      
      if (isUnlocked) {
        btn.innerText = `● ${theme.label}`;
        btn.onclick = () => {
           // Clear all themes
           themes.forEach(t => t.class && document.body.classList.remove(t.class));
           // Set new
           if (theme.class) document.body.classList.add(theme.class);
           localStorage.setItem(`${KEY_PREFIX}theme`, theme.id);
           
           // Update UI
           themeContainer.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active-theme'));
           btn.classList.add('active-theme');
           showToast(`Theme loaded: ${theme.label}`);
        };
      } else {
        btn.innerHTML = `🔒 ${theme.label} <span style="float:right;color:var(--accent-strong)">${theme.cost}★</span>`;
        btn.onclick = () => {
          if (spendStars(theme.cost)) {
            localStorage.setItem(`${KEY_PREFIX}themeUnlock::${theme.id}`, 'true');
            showToast('Theme Unlocked!');
            // Re-render (lazy way: reload or just update text)
            btn.innerText = `● ${theme.label}`;
            btn.onclick = () => {
               themes.forEach(t => t.class && document.body.classList.remove(t.class));
               if (theme.class) document.body.classList.add(theme.class);
               localStorage.setItem(`${KEY_PREFIX}theme`, theme.id);
               themeContainer.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active-theme'));
               btn.classList.add('active-theme');
            };
            btn.click(); // Auto apply
          }
        };
      }
      themeContainer.appendChild(btn);
    });
    settingsPanel.insertBefore(themeContainer, debugSection);
  }
}

/* -------------------------
   DEBUG BUTTONS
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
    showToast('Pet system reset');
  });
}

if (debugAddStarsBtn) {
  debugAddStarsBtn.addEventListener('click', () => {
    starCount += 50; // increased for testing
    localStorage.setItem(`${KEY_PREFIX}stars`, starCount);
    updateStarDisp();
    showToast('+50 stars');
  });
}

if (debugUnlockPetsBtn) {
  debugUnlockPetsBtn.addEventListener('click', () => {
    localStorage.setItem(`${KEY_PREFIX}petUnlocked`, 'true');
    if (firstPetUnlockBox) firstPetUnlockBox.style.display = 'block';
    if (petUnlockBtn) { petUnlockBtn.innerText = 'Pet'; petUnlockBtn.onclick = () => openPetPopup(); }
    showToast('Pet system unlocked (debug)');
  });
}

if (debugFullResetBtn) {
  debugFullResetBtn.addEventListener('click', () => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(KEY_PREFIX)) localStorage.removeItem(k);
    });
    starCount = 0;
    updateStarDisp();
    if (firstPetUnlockBox) firstPetUnlockBox.style.display = 'none';
    currentPet = 'Bunny';
    savePetLove(currentPet, 0);
    renderPetUI();
    // remove themes
    document.body.className = ''; 
    showToast('All data cleared');
  });
}

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

window.__tsukiDebug = {
  openPetPopup, closePetPopup, renderPetUI, saveHat, loadHat, createBubblesAt
};

function openPetPopup() {
  if (!petPopup) return;
  petPopup.classList.remove('hidden');
  petPopup.setAttribute('aria-hidden', 'false');
  if (petUnlockBtn) petUnlockBtn.innerText = 'Pet';
  renderPetUI();
}

function closePetPopup() {
  if (!petPopup) return;
  petPopup.classList.add('hidden');
  petPopup.setAttribute('aria-hidden', 'true');
  cleanupBubbles();
  hideTools();
}

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

renderShop();
renderPetUI();

})();
