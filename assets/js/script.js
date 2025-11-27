/* assets/js/script.js – COMPLETE: VN + STARS + PET SYSTEM w/ BATH */
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

  // pet elements
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
  const petNameTitle = document.getElementById('petNameTitle');
  const petVisualWrap = document.getElementById('petVisualWrap');

  const firstPetUnlockBox = document.getElementById('firstPetUnlock');
  const petUnlockBtn = document.getElementById('petUnlockBtn');

  // toast helper
  function showToast(msg, duration = 1400) {
    if (!toast) {
      const t = document.createElement('div');
      t.textContent = msg;
      t.className = 'toast show';
      Object.assign(t.style, {
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: '110px',
        padding: '10px 14px', borderRadius: '8px', background: '#5c3d3d', color: '#ffe6e9',
        zIndex: 999999, fontFamily: 'VT323, monospace'
      });
      document.body.appendChild(t);
      setTimeout(() => t.remove(), duration);
      return;
    }
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  }

  // -------------- Audio --------------
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;
  let ringOscList = [], ringGain = null, ringIntervalId = null;

  function canPlaySound() { return audioCtx && (toggleSfx ? toggleSfx.checked : true); }

  function startRing() {
    if (!canPlaySound()) return;
    stopRing();
    ringGain = audioCtx.createGain();
    ringGain.gain.value = 0;
    ringGain.connect(audioCtx.destination);
    const freqs = [520, 660, 780];
    freqs.forEach(f => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine'; osc.frequency.value = f; g.gain.value = 0.0001;
      osc.connect(g); g.connect(ringGain); osc.start();
      ringOscList.push({osc, g});
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
    if (ringIntervalId) clearInterval(ringIntervalId);
    if (ringGain && audioCtx) ringGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.06);
    ringOscList.forEach(o => { try { o.osc.stop(audioCtx.currentTime + 0.1); } catch(e) {} });
    ringOscList = []; ringGain = null;
  }

  function playTypeBlip() {
    if (!canPlaySound() || !audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square'; o.frequency.value = 1200;
    g.gain.value = 0; o.connect(g); g.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.008, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    o.start(now); o.stop(now + 0.07);
  }

  // ---------- VN logic ----------
  let talkInterval = null;

  function safeSetSprite(path, el = tsukiSprite) {
    if (!el) return;
    el.classList.add(SPRITE_TRANSITION_CLASS);
    el.src = path;
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
          i++; setTimeout(tick, speed);
        } else resolve();
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
    if (talkInterval) clearInterval(talkInterval);
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

  // ==================== VOICELINES (unchanged) ====================
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

  // ... (other VOICELINES unchanged; omitted for brevity in this display but present in original file)
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
      const fave = input.value.trim() || "someone super cool";
      optionsBox.innerHTML = '';
      startTalking(sprites.happy);
      await typeText(`Tsuki: Girrrrl! I love ${fave} too! We should watch it together some time~`);
      stopTalking(sprites.happy[0]);
      setTimeout(() =>
        showOptions([
          { label: "Back to questions", onClick: scene_identity },
          { label: "Hang up", onClick: scene_userHangup }
        ]), 800
      );
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

  async function scene_bloodQuestion() {
    optionsBox.innerHTML = '';
    startTalking(sprites.frown);
    await typeText("Tsuki: Blood? Girl no! We don’t do that anymore..are you racist?");
    await new Promise(r => setTimeout(r, 1300));
    startTalking(sprites.wineSmile);
    await typeText("Tsuki: Im kidding! We don’t need to drink blood anymore, my father would kill me if i did..");
    stopTalking(sprites.wineSmile[0]);
    showOptions([
      { label: "Back to questions", onClick: scene_identity },
      { label: "Hang up", onClick: scene_userHangup }
    ]);
  }

  async function scene_userHangup() {
    optionsBox.innerHTML = '';
    safeSetSprite(sprites.hangup[1] || sprites.hangup[0]);
    await typeText("—call ended—");
    setTimeout(() => closeVN(), 700);
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
    if (suggestForm && !suggestForm.querySelector('input[name="type"]')) {
      const hidden = document.createElement('input');
      hidden.type = 'hidden'; hidden.name = 'type';
      suggestForm.appendChild(hidden);
    }
    const typeField = suggestForm.querySelector('input[name="type"]');
    if (typeField) typeField.value = kind;
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
        const res = await fetch(FORM_ENDPOINT, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' }});
        if (res.ok) {
          showToast('Submitted — thanks babe ♡');
          closeSuggestModal();
          textBox.innerText = "Tsuki: Mmm thanks! I'll check it out.";
          optionsBox.innerHTML = '';
          setTimeout(() => closeVN(), 900);
        } else showToast('Submission failed — try again');
      } catch (err) { showToast('Submission failed — check network'); }
    });
  }

  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.page-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });

  // ---------- PRELOAD & BUTTONS ----------
  (function preloadAll() {
    Object.values(sprites).forEach(arr => arr.forEach(p => new Image().src = p));
    // Preload pet sprites
    ['Bunnie.png','Cubbie.png','Doggie.png','Froggie.png','Horsie.png','Kittie.png']
      .forEach(fn => new Image().src = 'assets/pets/' + fn);
    new Image().src = 'assets/images/Phone.png';
  })();

  if (phoneBtn) { startRing(); phoneBtn.addEventListener('click', () => { if (audioCtx?.state === 'suspended') audioCtx.resume(); stopRing(); openVN(); }); }
  if (vnClose) vnClose.addEventListener('click', closeVN);
  if (openVNbtn) openVNbtn.addEventListener('click', () => { if (audioCtx?.state === 'suspended') audioCtx.resume(); stopRing(); openVN(); });
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeSuggestModal);
  if (toggleSfx) toggleSfx.addEventListener('change', () => toggleSfx.checked ? startRing() : stopRing());

  /* ---------------------------------------------------------
     ⭐ REPAIRED STAR SYSTEM
  --------------------------------------------------------- */
  let starCount = Number(localStorage.getItem("stars") || 0);

  let starLayer = document.getElementById("starLayerGlobal");
  if (!starLayer) {
    starLayer = document.createElement("div");
    starLayer.id = "starLayerGlobal";
    document.body.appendChild(starLayer);
  }

  function updateStarDisplay() {
    if (starCountDisp) starCountDisp.innerText = starCount;
  }
  updateStarDisplay();

  function createBackgroundStar(x, y, opts = {}) {
    const s = document.createElement("div");
    s.className = "bg-star";
    const size = opts.size || (Math.random() * 4 + 2);
    s.style.width = size + "px";
    s.style.height = size + "px";
    s.style.left = x + "px";
    s.style.top = y + "px";
    s.style.opacity = opts.opacity || 0.35;
    s.style.animation = "bgStarTwinkle 2.4s infinite ease-in-out";
    starLayer.appendChild(s);
    return s;
  }

  function collectStar(el) {
    if (el && el.remove) el.remove();
    starCount++;
    localStorage.setItem("stars", starCount);
    updateStarDisplay();

    if (!localStorage.getItem("firstStarSeen")) {
      localStorage.setItem("firstStarSeen", "true");
      showFirstStarDialogue();
    } else {
      showToast("+1 star!");
    }
  }

  function spawnFallingStar() {
    const star = document.createElement("div");
    star.className = "falling-star-collection";
    star.style.position = "fixed";
    star.style.top = "-20px";
    star.style.left = Math.random() * (window.innerWidth - 40) + "px";
    star.style.fontSize = "22px";
    star.style.color = "#ffb3c6";
    star.style.textShadow = "0 0 8px rgba(255,200,220,1)";
    star.textContent = "★";

    document.body.appendChild(star);

    const duration = 3500 + Math.random() * 2000;
    star.animate(
      [{ transform: "translateY(0)" }, { transform: "translateY(110vh)" }],
      { duration, easing: "linear" }
    );

    star.addEventListener("click", () => collectStar(star));
    setTimeout(() => (star.parentNode && star.remove()), duration + 50);
  }

  function populateBackgroundStars() {
    const MAX = Math.max(20, Math.floor((window.innerWidth * window.innerHeight) / 90000));
    for (let i = 0; i < MAX; i++) {
      createBackgroundStar(
        Math.random() * window.innerWidth,
        Math.random() * window.innerHeight,
        { opacity: 0.25 + Math.random() * 0.3 }
      );
    }
  }
  populateBackgroundStars();
  setInterval(spawnFallingStar, 3500);

  /* ---------------------------------------------------------
     ⭐ FIRST STAR SPECIAL EVENT (opens VN + reveals pet unlock)
  --------------------------------------------------------- */
  function showFirstStarDialogue() {
    if (audioCtx?.state === "suspended") audioCtx.resume();
    stopRing();
    vnContainer.classList.remove("hidden");
    vnContainer.setAttribute("aria-hidden", "false");
    optionsBox.innerHTML = "";
    safeSetSprite(sprites.happy[0]);

    (async () => {
      startTalking(sprites.happy);
      await typeText("Tsuki: Oooh a star! I wonder what it does…");
      stopTalking(sprites.happy[0]);
      revealPetUnlockButton();
      showOptions([{ label: "Cute!!", onClick: () => closeVN() }]);
    })();
  }

  function revealPetUnlockButton() {
    if (!firstPetUnlockBox) return;
    firstPetUnlockBox.style.display = 'block';
    // keep text as "Your Pet Awaits…" until clicked once, then change to "Pet"
    petUnlockBtn.onclick = () => {
      localStorage.setItem('petUnlocked','true');
      openPetPopup();
      petUnlockBtn.innerText = 'Pet';
      // once opened, keep button as "Pet" (persist)
      firstPetUnlockBox.style.display = 'block';
    };
  }

  // If pet is already unlocked (debug or prior), show Pet button
  if (localStorage.getItem('petUnlocked') === 'true') {
    if (firstPetUnlockBox) {
      firstPetUnlockBox.style.display = 'block';
      if (petUnlockBtn) petUnlockBtn.innerText = 'Pet';
      petUnlockBtn.onclick = () => openPetPopup();
    }
  }

  /* ---------------------------------------------------------
     ⭐ PET SYSTEM
  --------------------------------------------------------- */

  // pet asset map (user-provided)
  const PET_ASSETS = {
    'Bunny': 'Bunnie.png',
    'Bear Cub': 'Cubbie.png',
    'Dog': 'Doggie.png',
    'Frog': 'Froggie.png',
    'Pony': 'Horsie.png',
    'Cat': 'Kittie.png'
  };

  // defaults
  const DEFAULT_PET = localStorage.getItem('petChosen') || 'Bunny';
  let currentPet = DEFAULT_PET;
  // love stored per-pet key
  function getLoveKey(petName){ return `petLove::${petName}`; }
  function loadPetLove(petName){ return Number(localStorage.getItem(getLoveKey(petName)) || 0); }
  function savePetLove(petName, val){ localStorage.setItem(getLoveKey(petName), Math.max(0, Math.min(100, Math.round(val)))); }

  // load UI state
  function renderPetUI() {
    // ensure variant selection matches current
    if (petVariantSel) petVariantSel.value = currentPet;
    petNameTitle && (petNameTitle.innerText = currentPet);
    // set sprite
    if (petSpriteEl) {
      const fn = PET_ASSETS[currentPet] || PET_ASSETS['Bunny'];
      petSpriteEl.src = 'assets/pets/' + fn;
      petSpriteEl.alt = currentPet;
    }
    // love bar
    const love = loadPetLove(currentPet);
    if (loveFill) loveFill.style.width = Math.min(100, love) + '%';
    // update star display
    updateStarDisplay();
  }

  // open/close
  function openPetPopup() {
    if (!petPopup) return;
    petPopup.classList.remove('hidden');
    petPopup.setAttribute('aria-hidden','false');
    // ensure the unlock button is labeled "Pet"
    if (petUnlockBtn) petUnlockBtn.innerText = 'Pet';
    renderPetUI();
  }
  function closePetPopup() {
    if (!petPopup) return;
    petPopup.classList.add('hidden');
    petPopup.setAttribute('aria-hidden','true');
    // remove any bubble elements leftover
    cleanupBubbles();
  }
  if (petClose) petClose.addEventListener('click', closePetPopup);

  // variant change
  if (petVariantSel) {
    petVariantSel.addEventListener('change', () => {
      const val = petVariantSel.value;
      if (!val) return;
      currentPet = val;
      localStorage.setItem('petChosen', currentPet);
      // initialize love if missing
      if (!localStorage.getItem(getLoveKey(currentPet))) savePetLove(currentPet, 0);
      renderPetUI();
      showToast(`${currentPet} selected`);
    });
  }

  // Feed button - small love gain
  if (feedBtn) feedBtn.addEventListener('click', () => {
    const prev = loadPetLove(currentPet);
    const gain = 6 + Math.floor(Math.random()*6); // 6-11
    savePetLove(currentPet, prev + gain);
    renderPetUI();
    showToast(`+${gain} love!`);
  });

  // Bath flow: press Bathe -> creates soap & bubbles -> batheBtn becomes "Rinse" -> rinse removes bubbles and awards love
  let bathingState = false;
  function createBubbles() {
    cleanupBubbles();
    if (!petVisualWrap) return;
    const bubbleCount = 6 + Math.floor(Math.random()*6);
    for (let i=0;i<bubbleCount;i++){
      const b = document.createElement('div');
      b.className = 'pet-bubble';
      // random size and position over the pet
      const size = 14 + Math.random()*28;
      b.style.width = size + 'px';
      b.style.height = size + 'px';
      b.style.left = (20 + Math.random()*140) + 'px';
      b.style.top = (10 + Math.random()*100) + 'px';
      b.style.background = `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(255,200,220,0.45))`;
      b.style.opacity = 0.95;
      b.style.borderRadius = '50%';
      b.style.pointerEvents = 'none';
      b.style.transition = 'transform .6s ease, opacity .6s ease';
      b.style.transform = 'translateY(0) scale(1)';
      petVisualWrap.appendChild(b);
      // small float animation
      setTimeout(()=> {
        b.style.transform = `translateY(-8px) scale(${1 + Math.random()*0.35})`;
        b.style.opacity = 0.9 - Math.random()*0.4;
      }, 40 + i*40);
    }
  }
  function cleanupBubbles() {
    if (!petVisualWrap) return;
    const existing = petVisualWrap.querySelectorAll('.pet-bubble');
    existing.forEach(n => n.remove());
  }

  if (batheBtn) {
    batheBtn.addEventListener('click', () => {
      if (!bathingState) {
        // start bathing: create soap/bubbles and switch to Rinse
        createBubbles();
        bathingState = true;
        batheBtn.innerText = 'Rinse';
        showToast('Use the soap — then rinse!');
      } else {
        // rinse: remove bubbles and reward love
        const prev = loadPetLove(currentPet);
        const gain = 8 + Math.floor(Math.random()*10); // 8-17
        savePetLove(currentPet, prev + gain);
        cleanupBubbles();
        bathingState = false;
        batheBtn.innerText = 'Bathe';
        renderPetUI();
        showToast(`Bath complete! +${gain} love`);
      }
    });
  }

  function renderShop() {
    if (!shopScroll) return;
    shopScroll.innerHTML = '';
    // placeholder hats/shop items (keeps UI consistent)
    const items = [
      { id: 'hat1', name: 'Pixel Bow', price: 10 },
      { id: 'hat2', name: 'Tiny Crown', price: 18 },
      { id: 'hat3', name: 'Party Hat', price: 12 },
    ];
    items.forEach(it => {
      const el = document.createElement('div');
      el.className = 'pet-shop-item';
      el.innerHTML = `<img src="data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='#fff0f4'/><text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-size='10' fill='#5c3d3d'>${it.name}</text></svg>`) }" alt="${it.name}"><div style="margin-top:6px">${it.name}</div><div style="font-size:12px;color:#5c3d3d">⭐${it.price}</div>`;
      el.addEventListener('click', () => {
        showToast(`${it.name} coming soon!`);
      });
      shopScroll.appendChild(el);
    });
  }
  renderShop();

  // Make sure the star counter displays properly
  updateStarDisplay();

  // On initial load, set chosen pet from storage and render
  currentPet = localStorage.getItem('petChosen') || currentPet;
  if (!localStorage.getItem(getLoveKey(currentPet))) savePetLove(currentPet, 0);
  renderPetUI();

  /* ---------------------------------------------------------
     ⭐ DEBUG BUTTONS / CHEATS (preserve style + functions)
  --------------------------------------------------------- */
  const debugResetBtn = document.getElementById('debug-reset');
  const debugAddStarsBtn = document.getElementById('debug-add-stars');
  const debugUnlockPetsBtn = document.getElementById('debug-unlock-pets');
  const debugFullResetBtn = document.getElementById('debug-full-reset');

  if (debugResetBtn) {
    debugResetBtn.addEventListener('click', () => {
      // reset pet love & selection to defaults
      localStorage.removeItem('petChosen');
      Object.keys(PET_ASSETS).forEach(k => localStorage.removeItem(getLoveKey(k)));
      currentPet = 'Bunny';
      localStorage.setItem('petChosen', currentPet);
      savePetLove(currentPet, 0);
      renderPetUI();
      showToast('Pet system reset');
    });
  }

  if (debugAddStarsBtn) {
    debugAddStarsBtn.addEventListener('click', () => {
      starCount += 5;
      localStorage.setItem('stars', starCount);
      updateStarDisplay();
      showToast('+5 stars');
    });
  }

  if (debugUnlockPetsBtn) {
    debugUnlockPetsBtn.addEventListener('click', () => {
      localStorage.setItem('petUnlocked','true');
      if (firstPetUnlockBox) {
        firstPetUnlockBox.style.display = 'block';
        petUnlockBtn.innerText = 'Pet';
        petUnlockBtn.onclick = () => openPetPopup();
      }
      showToast('Pet system unlocked (debug)');
    });
  }

  if (debugFullResetBtn) {
    debugFullResetBtn.addEventListener('click', () => {
      // clear all relevant keys (stars, pet data, firstStarSeen)
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('petLove::') || k === 'stars' || k === 'firstStarSeen' || k === 'petUnlocked' || k === 'petChosen') {
          localStorage.removeItem(k);
        }
      });
      starCount = 0;
      updateStarDisplay();
      // hide unlock box until next first-star event
      if (firstPetUnlockBox) firstPetUnlockBox.style.display = 'none';
      currentPet = 'Bunny';
      savePetLove(currentPet, 0);
      renderPetUI();
      showToast('All data cleared');
    });
  }

  /* ---------------------------------------------------------
     FINAL keyframes & small helpers
  --------------------------------------------------------- */
  const styleSheet = document.createElement('style');
  styleSheet.innerHTML = `@keyframes bgStarTwinkle { 0%,100% { opacity:.35 } 50% { opacity:1 } } .pet-bubble{box-shadow:0 0 8px rgba(255,200,220,0.9); transform-origin:center; }`;
  document.head.appendChild(styleSheet);

})();
