/* script.js — Vampire Coquette Theme Updated */
(() => {
  'use strict';

  /* --- Config & Assets --- */
  const FORM_ENDPOINT = 'https://formspree.io/f/mjkdzyqk';
  const TYPE_SPEED_MS = 24;
  const TALK_INTERVAL_MS = 140;

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

  /* --- DOM Elements --- */
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

  /* Pet & Shop Elements */
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

  // Shop Buttons
  const btnGiftRose = document.getElementById('btn-gift-rose');
  const btnGiftTeddy = document.getElementById('btn-gift-teddy');
  const btnGiftPurse = document.getElementById('btn-gift-purse');
  const btnGiftChoco = document.getElementById('btn-gift-choco');
  const btnGiftBoba = document.getElementById('btn-gift-boba');
  const btnFortune = document.getElementById('btn-fortune');

  /* --- Data Helpers --- */
  const KEY_PREFIX = 'tsuki::';
  const getLoveKey = petName => `${KEY_PREFIX}petLove::${petName}`;
  const getHatKey = petName => `${KEY_PREFIX}petHat::${petName}`;

  let starCount = Number(localStorage.getItem(`${KEY_PREFIX}stars`) || 0);
  
  function updateStarDisp() { 
    if (starCountDisp) starCountDisp.innerText = starCount; 
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
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  }

  /* --- Audio --- */
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
      osc.type = 'sine'; osc.frequency.value = freq;
      osc.connect(g); g.connect(audioCtx.destination);
      g.gain.value = 0.0001; osc.start();
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
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.type = 'square'; o.frequency.value = 1200;
    o.connect(g); g.connect(audioCtx.destination);
    g.gain.value = 0.0001;
    g.gain.linearRampToValueAtTime(0.009, audioCtx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.07);
    o.start(); o.stop(audioCtx.currentTime + 0.07);
  }

  /* --- VN Logic --- */
  function safeSetSprite(path, el = tsukiSprite) {
    if (!el) return;
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
          i++; setTimeout(step, speed);
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
    vnContainer.classList.remove('hidden'); vnContainer.setAttribute('aria-hidden', 'false'); stopRing();
  }
  function closeVN() {
    vnContainer.classList.add('hidden'); vnContainer.setAttribute('aria-hidden', 'true');
    optionsBox.innerHTML = ''; textBox.innerHTML = ''; stopTalking();
  }

  /* --- Scenes --- */
  async function scene_start() {
    openVN(); optionsBox.innerHTML = '';
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
      { label: "I've got an idea for a video!", onClick: scene_tea },
      { label: "Who are you…What are you?", onClick: scene_identity },
      { label: "Hang up", onClick: scene_userHangup }
    ]);
  }

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

  async function scene_monsterHigh() {
    optionsBox.innerHTML = '';
    startTalking(sprites.happy);
    await typeText("Tsuki: Monster High? I’m Obsessed! Draculaura and Abby are my spirit ghouls! I could watch just them, forever! Who's your fave?");
    stopTalking(sprites.happy[0]);

    // THEME UPDATE: Vampire Red Border
    const container = document.createElement('div');
    container.style.marginTop = '14px'; container.style.pointerEvents = 'auto';

    const input = document.createElement('input');
    input.type = 'text'; input.placeholder = 'Type your fave ghoul…';
    input.style.width = '100%'; input.style.padding = '10px'; input.style.marginBottom = '8px';
    input.style.borderRadius = '10px';
    input.style.border = '2px solid var(--accent-red)'; 
    input.style.fontFamily = 'VT323, monospace'; input.style.fontSize = '18px';
    input.style.background = '#fff';

    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Tell Tsuki!'; submitBtn.className = 'optionButton';
    submitBtn.style.marginTop = '6px';

    container.appendChild(input); container.appendChild(submitBtn);
    optionsBox.appendChild(container);

    submitBtn.onclick = async () => {
        const fave = input.value.trim() || 'them';
        optionsBox.innerHTML = '';
        startTalking(sprites.happy);
        await typeText(`Tsuki: Girrrrl! I love ${fave} too! We should watch it together some time~`);
        stopTalking(sprites.happy[0]);
        setTimeout(() => showOptions([
          { label: "Back to questions", onClick: scene_identity },
          { label: "Hang up", onClick: scene_userHangup }
        ]), 1500);
    };
  }

  async function scene_cupidLore() {
    optionsBox.innerHTML = ''; startTalking(sprites.rose);
    await typeText("Tsuki: Dad? Dads fun! Way out of his league now with all the new technology though. It’s alot harder to do the whole arrows and the first person you see is your soulmate thing when everyones online now, y’know?");
    stopTalking(sprites.rose[0]);
    showOptions([{ label: "More about your job?", onClick: scene_jobLore }, { label: "Back", onClick: scene_identity }]);
  }

  async function scene_vampireLore() {
    optionsBox.innerHTML = ''; startTalking(sprites.wineScoff);
    await typeText("Tsuki: Believe it or not I wasn’t born a vampire, that’s not how it works. I was turned on my sweet 1600..something about destiny and true love..I dont wanna talk about it..");
    stopTalking(sprites.wineScoff[0]);
    showOptions([{ label: "Do you drink blood?", onClick: scene_bloodQuestion }, { label: "Back", onClick: scene_identity }]);
  }

  async function scene_jobLore() {
    optionsBox.innerHTML = ''; startTalking(sprites.neutral);
    await typeText("Tsuki: You’re seeing it, babe! I do this..I spill tea with you and then tell everyone else about it, you always have the BEST gossip, bestie!");
    stopTalking(sprites.neutral[0]);
    showOptions([{ label: "Back", onClick: scene_identity }]);
  }

  async function scene_bloodQuestion() {
    optionsBox.innerHTML = ''; startTalking(sprites.frown);
    await typeText("Tsuki: Blood? Girl no! We don’t do that anymore..are you racist?");
    await new Promise(r => setTimeout(r, 1500));
    startTalking(sprites.wineSmile);
    await typeText("Tsuki: Im kidding! We don’t need to drink blood anymore, my father would kill me if i did..");
    stopTalking(sprites.wineSmile[0]);
    showOptions([{ label: "Back", onClick: scene_identity }]);
  }

  async function scene_tea() {
    optionsBox.innerHTML = ''; startTalking(sprites.wineSmile);
    await typeText("Tsuki: Oooh…Spill it!");
    stopTalking(sprites.wineSmile[0]);
    showOptions([
      { label: "Suggest Rant (Form)", onClick: () => openSuggestModal('Rant') },
      { label: "Suggest Game (Form)", onClick: () => openSuggestModal('Game') },
      { label: "Hang up", onClick: scene_userHangup }
    ]);
  }

  async function scene_userHangup() {
    optionsBox.innerHTML = ''; safeSetSprite(sprites.hangup[1] || sprites.hangup[0]);
    await typeText("—call ended—"); setTimeout(closeVN, 600);
  }

  /* --- Shop Scenes --- */
  async function scene_fortuneTeller() {
    if (!spendStars(10)) return;
    openVN(); optionsBox.innerHTML = '';
    const fortunes = ["The stars say... girl, no.", "Cupid says YES! Go for it!", "It's giving... chaotic energy.", "Outlook is sparkly! ✨", "Don't bet your soulmate on it.", "The spirits are ghosting me rn...", "Absolutely! Manifest it! ♡"];
    const result = fortunes[Math.floor(Math.random() * fortunes.length)];
    startTalking(sprites.rose);
    await typeText("Tsuki: *Close eyes* Hmmm... tapping into the vibes...");
    await new Promise(r => setTimeout(r, 1000));
    await typeText(`Tsuki: ${result}`);
    stopTalking(sprites.rose[0]);
    showOptions([{ label: "Close", onClick: closeVN }]);
  }

  async function triggerGift(cost, sceneFunc) {
    if (!spendStars(cost)) return;
    openVN(); await sceneFunc();
  }
  async function scene_giftRose() {
    startTalking(sprites.giftedRose); await typeText("Tsuki: Oh my gosh! I love roses! My dad would lose his head if he saw this! Don’t tell anyone, okay?");
    stopTalking(sprites.giftedRose[0]); showOptions([{ label: "You're welcome!", onClick: closeVN }]);
  }
  async function scene_giftTeddy() {
    startTalking(sprites.flirty); await typeText("Tsuki: Awwww! Thank you! Hmm..I don’t know what to name it…Got any ideas?");
    stopTalking(sprites.flirty[0]);
    const container = document.createElement('div');
    container.style.marginTop = '14px';
    const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'Name the bear...';
    input.style.width = '100%'; input.style.padding = '10px'; input.style.marginBottom='8px';
    // Style this input to match theme too if you like
    input.style.border = '2px solid var(--accent-red)'; input.style.borderRadius='10px';
    const subBtn = document.createElement('button'); subBtn.textContent = 'Name it!'; subBtn.className = 'optionButton';
    container.appendChild(input); container.appendChild(subBtn); optionsBox.appendChild(container);
    subBtn.onclick = async () => {
      const bearName = input.value.trim() || 'Mr. Cuddles';
      optionsBox.innerHTML = ''; startTalking(sprites.flirty);
      await typeText(`Tsuki: ${bearName}? Omg that is PERFECT! We are going to sleep together every night!`);
      stopTalking(sprites.flirty[0]); setTimeout(() => showOptions([{ label: "<3", onClick: closeVN }]), 1000);
    };
  }
  async function scene_giftPurse() {
    startTalking(sprites.flirty); await typeText("Tsuki: Ooohh~ I always need a new purse! Thank you so much, bestie! We should get matching ones~");
    stopTalking(sprites.flirty[0]); showOptions([{ label: "Yess matching!", onClick: closeVN }]);
  }
  async function scene_giftChoco() {
    startTalking(sprites.happy); await typeText("Tsuki: Oh my goth! I haven’t had chocolate in..fang-ever! Thank you so much, bestie <3");
    stopTalking(sprites.happy[0]); showOptions([{ label: "Enjoy!", onClick: closeVN }]);
  }
  async function scene_giftBoba() {
    startTalking(sprites.happy); await typeText("Tsuki: Oooooh~ I love bubble tea! It sucks when the boba’s get stuck on my fangs though..");
    stopTalking(sprites.happy[0]); showOptions([{ label: "Haha same", onClick: closeVN }]);
  }

  /* --- Event Listeners --- */
  if(btnGiftRose) btnGiftRose.onclick = () => triggerGift(20, scene_giftRose);
  if(btnGiftTeddy) btnGiftTeddy.onclick = () => triggerGift(40, scene_giftTeddy);
  if(btnGiftPurse) btnGiftPurse.onclick = () => triggerGift(50, scene_giftPurse);
  if(btnGiftChoco) btnGiftChoco.onclick = () => triggerGift(15, scene_giftChoco);
  if(btnGiftBoba) btnGiftBoba.onclick = () => triggerGift(15, scene_giftBoba);
  if(btnFortune) btnFortune.onclick = scene_fortuneTeller;

  if (phoneBtn) { startRing(); phoneBtn.onclick = () => { if (audioCtx?.state === 'suspended') audioCtx.resume(); scene_start(); }; }
  if (openVNbtn) openVNbtn.onclick = () => { if (audioCtx?.state === 'suspended') audioCtx.resume(); scene_start(); };
  if (vnClose) vnClose.onclick = closeVN;
  if (toggleSfx) toggleSfx.addEventListener('change', () => toggleSfx.checked ? startRing() : stopRing());

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

  /* --- Pet System --- */
  const PET_ASSETS = {
    'Bunny': 'Bunnie.png', 'Bear Cub': 'Cubbie.png', 'Dog': 'Doggie.png',
    'Frog': 'Froggie.png', 'Pony': 'Horsie.png', 'Cat': 'Kittie.png'
  };
  const FOOD_EMOJI = [
    { id: 'apple', emoji: '🍎' }, { id: 'carrot', emoji: '🥕' }, { id: 'fish', emoji: '🐟' }, { id: 'steak', emoji: '🥩' }, { id: 'fly', emoji: '🪰' }
  ];
  const FOOD_PREF = {
    'Bunny':    { apple: 1, carrot: 3, fish: -1, steak: -1, fly:-2 },
    'Bear Cub': { apple: 3, carrot: 1, fish: -1, steak: 2, fly:-2 },
    'Dog':      { apple: 1, carrot: 1, fish: 2, steak: 3, fly:-2 },
    'Frog':     { apple: -1, carrot: 0, fish: 1, steak: -1, fly: 4 },
    'Pony':     { apple: 3, carrot: 2, fish: -1, steak: 0, fly:-2 },
    'Cat':      { apple: -1, carrot: -1, fish: 4, steak: 2, fly:-1 }
  };
  
  let currentPet = localStorage.getItem(`${KEY_PREFIX}petChosen`) || 'Bunny';
  let toolMode = 'idle';
  let toolContainer = null;

  function loadPetLove(name) { return Number(localStorage.getItem(getLoveKey(name)) || 0); }
  function savePetLove(name, val) { localStorage.setItem(getLoveKey(name), Math.max(0, Math.min(100, Math.round(val)))); }
  function loadHat(petName) { try { const s = localStorage.getItem(getHatKey(petName)); return s ? JSON.parse(s) : null; } catch(e){return null;} }
  function saveHat(petName, hatObj) { if(!hatObj) localStorage.removeItem(getHatKey(petName)); else localStorage.setItem(getHatKey(petName), JSON.stringify(hatObj)); }

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
    el.style.cursor = 'grab';
    el.style.zIndex = 40;
    petVisualWrap.appendChild(el);
    makeHatDraggable(el);
  }

  function makeHatDraggable(hatEl) {
    if (!petVisualWrap) return;
    let active = false;
    function onDown(e) {
      e.preventDefault(); active = true; hatEl.style.cursor = 'grabbing';
      document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
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
      if (!active) return; active = false; hatEl.style.cursor = 'grab';
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp);
      const wrap = petVisualWrap.getBoundingClientRect();
      const rect = hatEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const xPct = ((cx - wrap.left) / wrap.width) * 100;
      const yPct = ((cy - wrap.top) / wrap.height) * 100;
      const hat = loadHat(currentPet) || { emoji: hatEl.innerText, scale: 1.2 };
      hat.xPct = Math.max(1, Math.min(99, xPct)); hat.yPct = Math.max(1, Math.min(99, yPct));
      saveHat(currentPet, hat);
    }
    hatEl.addEventListener('pointerdown', onDown, { passive: false });
  }

  function ensureToolContainer() {
    if (toolContainer) return toolContainer;
    const rightBox = petPopup?.querySelector('.pet-controls');
    const cont = document.createElement('div');
    cont.id = 'petToolContainer';
    cont.style.display = 'none'; cont.style.marginTop = '8px';
    cont.style.flexWrap = 'wrap'; cont.style.justifyContent = 'center'; cont.style.gap = '8px';
    if (rightBox) rightBox.insertBefore(cont, rightBox.firstChild); // Insert at top of controls
    toolContainer = cont;
    return cont;
  }
  function showToolsForMode(mode) {
    const cont = ensureToolContainer();
    cont.innerHTML = ''; cont.style.display = 'flex';
    cont.dataset.mode = mode; toolMode = mode;
    if (mode === 'feed') {
      FOOD_EMOJI.forEach(f => {
        const b = document.createElement('button');
        b.className = 'pet-tool tool-food'; b.dataset.tool = 'food'; b.dataset.foodId = f.id; b.innerText = f.emoji;
        b.style.fontSize='24px'; b.style.cursor='grab'; b.style.background='white'; b.style.border='1px solid #ccc'; b.style.borderRadius='5px';
        cont.appendChild(b);
      });
    } else if (mode === 'bathe') {
      const soap = document.createElement('button'); soap.dataset.tool='soap'; soap.innerText='🧼';
      const shower = document.createElement('button'); shower.dataset.tool='shower'; shower.innerText='🚿';
      const towel = document.createElement('button'); towel.dataset.tool='towel'; towel.innerText='🧻';
      [soap, shower, towel].forEach(t => { 
          t.className='pet-tool'; t.style.fontSize='24px'; t.style.cursor='grab'; t.style.background='white'; t.style.border='1px solid #ccc'; t.style.borderRadius='5px';
          cont.appendChild(t); 
      });
    }
    attachToolDragHandlers();
  }
  function hideTools() {
    if (!toolContainer) return;
    toolContainer.style.display = 'none'; toolMode = 'idle';
    if (batheBtn) batheBtn.innerText = 'Bathe';
  }
  function toggleToolMode(mode) {
    if (toolMode === mode) { hideTools(); return; }
    showToolsForMode(mode);
    if (mode === 'bathe') batheBtn && (batheBtn.innerText = 'Exit Bath');
    if (mode !== 'bathe') cleanupBubbles();
  }
  if (feedBtn) feedBtn.onclick = () => toggleToolMode('feed');
  if (batheBtn) batheBtn.onclick = () => toggleToolMode('bathe');

  function getPointerPos(e) {
    if (!e) return { x: 0, y: 0 };
    return { x: (e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX)),
             y: (e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY)) };
  }
  function makeDraggableTool(el) {
    let avatar = null; let active = false;
    function createAvatar(x, y) {
      avatar = document.createElement('div');
      avatar.className = 'tool-avatar';
      avatar.style.position = 'fixed'; avatar.style.left = (x-18)+'px'; avatar.style.top = (y-18)+'px';
      avatar.style.zIndex = 20000; avatar.style.pointerEvents = 'none'; avatar.innerText = el.innerText;
      avatar.style.fontSize='28px';
      document.body.appendChild(avatar);
    }
    function onDown(e) {
      e.preventDefault(); active = true;
      const p = getPointerPos(e); createAvatar(p.x, p.y);
      document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
    }
    function onMove(e) {
      if (!active || !avatar) return;
      const p = getPointerPos(e);
      avatar.style.left = (p.x-18)+'px'; avatar.style.top = (p.y-18)+'px';
    }
    function onUp(e) {
      if (!active) return;
      const p = getPointerPos(e);
      const wrap = petVisualWrap && petVisualWrap.getBoundingClientRect();
      const toolType = el.dataset.tool;
      if (wrap && p.x >= wrap.left && p.x <= wrap.right && p.y >= wrap.top && p.y <= wrap.bottom) {
        const xPct = ((p.x-wrap.left)/wrap.width)*100;
        const yPct = ((p.y-wrap.top)/wrap.height)*100;
        if (toolType === 'food') handleFoodDrop(el.dataset.foodId);
        else if (toolType === 'soap') handleSoapAt(xPct, yPct);
        else if (toolType === 'shower') handleShowerAt();
        else if (toolType === 'towel') handleTowelAt();
      }
      if (avatar) avatar.remove(); avatar = null; active = false;
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp);
    }
    el.addEventListener('pointerdown', onDown, { passive: false });
  }
  function attachToolDragHandlers() {
    if (!toolContainer) return;
    toolContainer.querySelectorAll('.pet-tool').forEach(tool => {
      const newTool = tool.cloneNode(true);
      tool.replaceWith(newTool);
      makeDraggableTool(newTool);
    });
  }

  function createBubblesAt(xPct, yPct) {
    if (!petVisualWrap) return;
    const wrapRect = petVisualWrap.getBoundingClientRect();
    const b = document.createElement('div'); b.className = 'pet-bubble';
    const size = 10 + Math.random() * 20;
    b.style.width=size+'px'; b.style.height=size+'px';
    b.style.position='absolute'; b.style.borderRadius='50%'; b.style.background='rgba(255,255,255,0.8)';
    b.style.left = ((xPct/100)*wrapRect.width)+'px'; b.style.top = ((yPct/100)*wrapRect.height)+'px';
    petVisualWrap.appendChild(b);
    setTimeout(()=>b.style.transform='translateY(-20px)', 100);
  }
  function cleanupBubbles() { petVisualWrap?.querySelectorAll('.pet-bubble').forEach(n => n.remove()); }
  function spawnReaction(emoji) {
    if (!petVisualWrap) return;
    const r = document.createElement('div'); r.innerText=emoji;
    r.style.position='absolute'; r.style.left='50%'; r.style.top='10%'; r.style.fontSize='24px';
    r.style.animation='floatUp 1s ease-out forwards';
    petVisualWrap.appendChild(r);
    setTimeout(()=>r.remove(), 1000);
  }
  function handleFoodDrop(foodId) {
    const pref = (FOOD_PREF[currentPet] && FOOD_PREF[currentPet][foodId]) || 0;
    savePetLove(currentPet, loadPetLove(currentPet) + (pref >= 0 ? 5 : -2));
    spawnReaction(pref >= 2 ? '😍' : (pref < 0 ? '😖' : '😋'));
    renderPetUI();
  }
  function handleSoapAt(x, y) { createBubblesAt(x, y); }
  function handleShowerAt() { cleanupBubbles(); spawnReaction('✨'); savePetLove(currentPet, loadPetLove(currentPet)+5); renderPetUI(); }
  function handleTowelAt() { spawnReaction('🥰'); savePetLove(currentPet, loadPetLove(currentPet)+5); renderPetUI(); }

  function openPetPopup() {
    if (!petPopup) return;
    petPopup.classList.remove('hidden'); petPopup.setAttribute('aria-hidden', 'false');
    renderPetUI();
  }
  function closePetPopup() {
    if (!petPopup) return;
    petPopup.classList.add('hidden'); petPopup.setAttribute('aria-hidden', 'true');
    hideTools();
  }

  if (petClose) petClose.onclick = closePetPopup;
  if (petUnlockBtn) petUnlockBtn.addEventListener('click', openPetPopup);
  if (petVariantSel) {
    petVariantSel.addEventListener('change', () => {
      currentPet = petVariantSel.value;
      localStorage.setItem(`${KEY_PREFIX}petChosen`, currentPet);
      renderPetUI();
    });
  }

  /* --- Shop Hats --- */
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
      div.style.cursor = 'pointer'; div.style.padding='5px'; div.style.border='1px solid #ccc'; div.style.borderRadius='5px'; div.style.minWidth='60px';
      div.innerHTML = `<div style="font-size:24px">${h.emoji}</div><div style="font-size:10px">${h.label}</div>`;
      div.onclick = () => {
        saveHat(currentPet, { emoji: h.emoji, xPct: 50, yPct: 15, scale: h.scale });
        renderPetUI();
        showToast(`Equipped ${h.label}`);
      };
      shopScroll.appendChild(div);
    });
  }
  renderShopHat();
  renderPetUI();

  // Debug
  const debugAddStarsBtn = document.getElementById('debug-add-stars');
  const debugResetBtn = document.getElementById('debug-reset');

  if(debugAddStarsBtn) debugAddStarsBtn.onclick = () => { starCount += 50; updateStarDisp(); showToast('+50 stars'); };
  
  if(firstPetUnlockBox && localStorage.getItem(`${KEY_PREFIX}petUnlocked`) === 'true') {
      firstPetUnlockBox.style.display = 'block';
  } else if (document.getElementById('debug-unlock-pets')) {
      // If we ever add a debug button for unlock
  }
  
  if(debugResetBtn) debugResetBtn.onclick = () => { savePetLove(currentPet, 0); renderPetUI(); showToast('Pet Reset'); };

  // Modals
  function openSuggestModal(kind = '') {
    if (!suggestForm) return;
    if (!suggestForm.querySelector('input[name="type"]')) {
      const hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = 'type'; hidden.value = kind;
      suggestForm.appendChild(hidden);
    } else { const tf = suggestForm.querySelector('input[name="type"]'); if (tf) tf.value = kind; }
    suggestModal.classList.remove('hidden');
  }
  function closeSuggestModal() { suggestModal.classList.add('hidden'); }
  
  if(suggestForm) {
      suggestForm.addEventListener('submit', async e => {
          e.preventDefault(); const fd = new FormData(suggestForm);
          try {
              const res = await fetch(FORM_ENDPOINT, { method: 'POST', body: fd, headers: { Accept: 'application/json' }});
              if (res.ok) { showToast('Sent! ♡'); closeSuggestModal(); textBox.innerText = "Tsuki: Thanks babe!"; setTimeout(closeVN, 900); }
          } catch(e) { showToast('Error'); }
      });
  }
  if(modalCloseBtn) modalCloseBtn.onclick = closeSuggestModal;

  // Add CSS for reaction
  const s = document.createElement('style');
  s.innerHTML = `@keyframes floatUp{0%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-30px)}}`;
  document.head.appendChild(s);

})();
