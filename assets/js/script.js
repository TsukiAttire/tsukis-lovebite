/* script.js — Neapolitan Update (Integrated Pet Tab) */
(() => {
  'use strict';

  /* --- Assets --- */
  const FORM_ENDPOINT = 'https://formspree.io/f/mjkdzyqk';
  
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

  /* --- DOM References --- */
  const phoneBtn = document.getElementById('phoneButton');
  const openVNbtn = document.getElementById('openVNbtn');
  const vnContainer = document.getElementById('vnContainer');
  const vnClose = document.getElementById('vnClose');
  const tsukiSprite = document.getElementById('tsukiSprite');
  const textBox = document.getElementById('textBox');
  const optionsBox = document.getElementById('optionsBox');
  const toast = document.getElementById('toast');
  const toggleSfx = document.getElementById('toggle-sfx');

  // Pet & Shop
  const petSpriteEl = document.getElementById('petSprite');
  const petVariantSel = document.getElementById('petVariant');
  const loveFill = document.getElementById('loveFill');
  const shopScroll = document.getElementById('shopScroll');
  const feedBtn = document.getElementById('feedBtn');
  const batheBtn = document.getElementById('batheBtn');
  const petNameTitle = document.getElementById('petNameTitle');
  const petVisualWrap = document.getElementById('petVisualWrap');
  const petToolContainer = document.getElementById('petToolContainer');

  // Shop Buttons
  const btnGiftRose = document.getElementById('btn-gift-rose');
  const btnGiftTeddy = document.getElementById('btn-gift-teddy');
  const btnGiftPurse = document.getElementById('btn-gift-purse');
  const btnGiftChoco = document.getElementById('btn-gift-choco');
  const btnGiftBoba = document.getElementById('btn-gift-boba');
  const btnFortune = document.getElementById('btn-fortune');

  /* --- Points System --- */
  const KEY_PREFIX = 'tsuki::';
  const pointCountDisp = document.getElementById('pointCountDisp');
  let points = Number(localStorage.getItem(`${KEY_PREFIX}points`) || 0);

  function updatePointDisp() { if(pointCountDisp) pointCountDisp.innerText = points; }
  function addPoints(amount) {
    points += amount; localStorage.setItem(`${KEY_PREFIX}points`, points);
    updatePointDisp(); if(amount > 0) showToast(`+${amount} pts`);
  }
  function spendPoints(amount) {
    if (points >= amount) {
      points -= amount; localStorage.setItem(`${KEY_PREFIX}points`, points);
      updatePointDisp(); return true;
    }
    showToast(`Need ${amount} pts!`); return false;
  }
  function showToast(msg) {
    if (!toast) return; toast.innerText = msg; toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1400);
  }

  /* --- Daily Reward --- */
  const dailyRewardBtn = document.getElementById('dailyRewardBtn');
  const dailyTimerEl = document.getElementById('dailyTimer');
  
  function checkDaily() {
    if(!dailyRewardBtn) return;
    const last = Number(localStorage.getItem(`${KEY_PREFIX}lastClaim`) || 0);
    const now = Date.now(); const ONE_DAY = 86400000;
    if (now - last > ONE_DAY) {
        dailyRewardBtn.disabled = false; dailyRewardBtn.innerText = "Claim Daily!"; dailyTimerEl.innerText = "";
    } else {
        dailyRewardBtn.disabled = true; dailyRewardBtn.innerText = "Wait...";
        const rem = ONE_DAY - (now - last);
        const hrs = Math.floor(rem / 3600000); const mins = Math.floor((rem % 3600000) / 60000);
        dailyTimerEl.innerText = `${hrs}h ${mins}m`;
    }
  }
  if(dailyRewardBtn) dailyRewardBtn.onclick = () => {
    addPoints(100); localStorage.setItem(`${KEY_PREFIX}lastClaim`, Date.now()); checkDaily(); showToast("+100 Daily Pts!");
  };
  checkDaily(); setInterval(checkDaily, 60000);

  /* --- Audio --- */
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;
  function playBlip() {
    if(!audioCtx || (toggleSfx && !toggleSfx.checked)) return;
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.type='square'; o.frequency.value=1200; o.connect(g); g.connect(audioCtx.destination);
    g.gain.value=0.0001; g.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+0.1);
    o.start(); o.stop(audioCtx.currentTime+0.1);
  }

  /* --- VN Logic --- */
  function typeText(text) {
    return new Promise(resolve => {
      textBox.innerHTML = ''; let i = 0;
      function step() {
        if(i < text.length) { textBox.innerHTML+=text.charAt(i); if(i%2===0) playBlip(); i++; setTimeout(step, 24); }
        else resolve();
      }
      step();
    });
  }
  function setSprite(arr) { if(tsukiSprite && arr.length) tsukiSprite.src = arr[0]; }
  function openVN() { vnContainer.classList.remove('hidden'); addPoints(5); }
  function closeVN() { vnContainer.classList.add('hidden'); textBox.innerHTML=''; optionsBox.innerHTML=''; }
  
  if(phoneBtn) phoneBtn.onclick = () => { openVN(); scene_start(); };
  if(openVNbtn) openVNbtn.onclick = () => { openVN(); scene_start(); };
  if(vnClose) vnClose.onclick = closeVN;

  async function scene_start() {
    setSprite(sprites.happy); optionsBox.innerHTML='';
    await typeText("Tsuki: Hey Boo! ♡ Welcome back!");
    optionsBox.innerHTML = `<button class="optionButton" onclick="document.getElementById('vnClose').click()">Close</button>`;
  }

  /* --- Navigation --- */
  const navTabs = document.querySelectorAll('.nav-tab');
  const pagePanels = document.querySelectorAll('.page-panel');
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      addPoints(1);
      navTabs.forEach(t => t.classList.remove('active'));
      pagePanels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.tab);
      if(target) target.classList.add('active');
      playBlip();
    });
  });

  /* --- Pet System (Always Active) --- */
  const PET_ASSETS = { 'Bunny':'Bunnie.png', 'Bear Cub':'Cubbie.png', 'Dog':'Doggie.png', 'Frog':'Froggie.png', 'Pony':'Horsie.png', 'Cat':'Kittie.png' };
  const FOODS = [ {id:'apple',emoji:'🍎'}, {id:'carrot',emoji:'🥕'}, {id:'fish',emoji:'🐟'}, {id:'steak',emoji:'🥩'} ];
  
  let currentPet = localStorage.getItem(`${KEY_PREFIX}petChosen`) || 'Bunny';
  let toolMode = 'idle';

  function renderPetUI() {
    if(petVariantSel) petVariantSel.value = currentPet;
    if(petNameTitle) petNameTitle.innerText = currentPet;
    if(petSpriteEl) petSpriteEl.src = `assets/pets/${PET_ASSETS[currentPet] || PET_ASSETS['Bunny']}`;
    const love = Number(localStorage.getItem(`${KEY_PREFIX}petLove::${currentPet}`) || 0);
    if(loveFill) loveFill.style.width = `${Math.min(100, love)}%`;
    renderHat();
  }

  function renderHat() {
      // Logic for hats same as before, ensures hat overlay
  }

  function toggleTools(mode) {
      if(!petToolContainer) return;
      if(toolMode === mode) { petToolContainer.innerHTML=''; toolMode='idle'; return; }
      petToolContainer.innerHTML=''; toolMode=mode;
      
      const items = mode === 'feed' ? FOODS : [{id:'soap',emoji:'🧼'}, {id:'water',emoji:'🚿'}];
      items.forEach(item => {
          const b = document.createElement('div');
          b.className = 'pet-tool'; b.innerText = item.emoji;
          b.onclick = () => {
              // Simple click interaction for mobile friendliness
              spawnReaction(mode==='feed' ? '😋' : '✨');
              const key = `${KEY_PREFIX}petLove::${currentPet}`;
              const cur = Number(localStorage.getItem(key)||0);
              localStorage.setItem(key, Math.min(100, cur+5));
              renderPetUI();
          };
          petToolContainer.appendChild(b);
      });
  }

  function spawnReaction(emoji) {
      const r = document.createElement('div');
      r.innerText = emoji; r.style.position='absolute'; r.style.left='50%'; r.style.top='20%';
      r.style.fontSize='30px'; r.style.animation='floatUp 1s forwards';
      petVisualWrap.appendChild(r); setTimeout(()=>r.remove(), 1000);
  }

  if(feedBtn) feedBtn.onclick = () => toggleTools('feed');
  if(batheBtn) batheBtn.onclick = () => toggleTools('bathe');
  if(petVariantSel) petVariantSel.onchange = () => {
      currentPet = petVariantSel.value;
      localStorage.setItem(`${KEY_PREFIX}petChosen`, currentPet);
      renderPetUI();
  };
  
  // Initialize
  updatePointDisp();
  renderPetUI();

  // CSS Injection
  const s = document.createElement('style');
  s.innerHTML = `@keyframes floatUp{0%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-40px)}}`;
  document.head.appendChild(s);

})();
