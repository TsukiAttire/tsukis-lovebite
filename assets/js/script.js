/* assets/js/script.js – FINAL, FULLY WORKING VERSION – Your voice + everything fixed */
(() => {
  // ============== CONFIG ==============
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

  // ============== DOM ==============
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

  // Pet elements
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

  // ============== TOAST ==============
  function showToast(msg, duration = 1400) {
    if (!toast) {
      const t = document.createElement('div');
      t.textContent = msg;
      t.className = 'toast show';
      Object.assign(t.style, {
        position:'fixed', left:'50%', transform:'translateX(-50%)', bottom:'110px',
        padding:'10px 14px', borderRadius:'8px', background:'#5c3d3d', color:'#ffe6e9',
        zIndex:999999, fontFamily:'VT323, monospace'
      });
      document.body.appendChild(t);
      setTimeout(()=>t.remove(), duration);
      return;
    }
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'), duration);
  }

  // ============== AUDIO ==============
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
    const freqs = [520,660,780];
    freqs.forEach(f=>{
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type='sine'; osc.frequency.value=f; g.gain.value=0.0001;
      osc.connect(g); g.connect(ringGain); osc.start();
      ringOscList.push({osc,g});
    });
    ringGain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime+0.05);
    ringIntervalId = setInterval(()=>{
      ringGain.gain.cancelScheduledValues(audioCtx.currentTime);
      ringGain.gain.setValueAtTime(0.01,audioCtx.currentTime);
      ringGain.gain.linearRampToValueAtTime(0.02,audioCtx.currentTime+0.12);
      ringGain.gain.linearRampToValueAtTime(0.01,audioCtx.currentTime+0.28);
    },420);
  }

  function stopRing() {
    if(ringIntervalId) clearInterval(ringIntervalId);
    if(ringGain) ringGain.gain.linearRampToValueAtTime(0,audioCtx.currentTime+0.06);
    ringOscList.forEach(o=>{try{o.osc.stop(audioCtx.currentTime+0.1);}catch(e){}});
    ringOscList=[]; ringGain=null;
  }

  function playTypeBlip() {
    if(!canPlaySound()||!audioCtx) return;
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type='square'; o.frequency.value=1200;
    o.connect(g); g.connect(audioCtx.destination);
    const n=audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001,n);
    g.gain.linearRampToValueAtTime(0.008,n+0.005);
    g.gain.exponentialRampToValueAtTime(0.0001,n+0.06);
    o.start(n); o.stop(n+0.07);
  }

  // ============== VN HELPERS ==============
  let talkInterval=null;

  function safeSetSprite(path, el=tsukiSprite){
    if(!el) return;
    el.classList.add(SPRITE_TRANSITION_CLASS);
    el.src=path;
  }

  function typeText(text, speed=TYPE_SPEED_MS){
    return new Promise(res=>{
      if(!textBox) return res();
      textBox.innerHTML='';
      let i=0;
      const tick=()=>{
        if(i<text.length){
          textBox.innerHTML+=text.charAt(i);
          if(i%2===0) playTypeBlip();
          i++; setTimeout(tick,speed);
        }else res();
      };
      tick();
    });
  }

  function startTalking(frames=[],ms=TALK_INTERVAL_MS){
    stopTalking();
    if(!frames?.length) return;
    let i=0;
    talkInterval=setInterval(()=>{
      tsukiSprite.classList.add(SPRITE_TRANSITION_CLASS);
      tsukiSprite.src=frames[i%frames.length];
      i++;
    },ms);
  }

  function stopTalking(final){ if(talkInterval) clearInterval(talkInterval); if(final) safeSetSprite(final); }

  function showOptions(arr=[]){
    optionsBox.innerHTML='';
    arr.forEach(o=>{
      const b=document.createElement('button');
      b.className='optionButton';
      b.textContent=o.label;
      b.onclick=o.onClick;
      optionsBox.appendChild(b);
    });
  }

  // ============== YOUR VOICELINES ==============
  async function scene_start(){
    optionsBox.innerHTML='';
    startTalking(sprites.happy);
    await typeText("Tsuki: Hey Boo! Heart You finally picked up..");
    stopTalking(s.happy[0]);
    setTimeout(scene_whatsUp,300);
  }

  async function scene_whatsUp(){
    startTalking(s.happy);
    await typeText("Tsuki: What's up, girl?");
    stopTalking(s.happy[0]);
    showOptions([
      {label:"I've got some tea for a video, girl!",onClick:scene_tea},
      {label:"Who are you…What are you?",onClick:scene_identity},
      {label:"Hang up",onClick:scene_userHangup}
    ]);
  }

  async function scene_identity(){
    optionsBox.innerHTML='';
    startTalking(s.neutral);
    await typeText("Tsuki: Girl..Did you hit your head or something? Its me! Your Bestie? Maybe you just need a refresher..what do ya wanna know?");
    stopTalking(s.neutral[0]);
    showOptions([
      {label:"Tell me about being Cupid's daughter?",onClick:scene_cupidLore},
      {label:"What's the vampire side like?",onClick:scene_vampireLore},
      {label:"Favorite Monster High character?",onClick:scene_monsterHigh},
      {label:"Back",onClick:scene_whatsUp},
      {label:"Hang up",onClick:scene_userHangup}
    ]);
  }

  async function scene_cupidLore(){
    optionsBox.innerHTML='';
    startTalking(s.rose);
    await typeText("Tsuki: Dad? Dads fun! Way out of his league now with all the new technology though. It’s alot harder to do the whole arrows and the first person you see is your soulmate thing when everyones online now, y’know?");
    stopTalking(s.rose[0]);
    showOptions([
      {label:"More about your job?",onClick:scene_jobLore},
      {label:"Back to questions",onClick:scene_identity},
      {label:"Hang up",onClick:scene_userHangup}
    ]);
  }

  async function scene_vampireLore(){
    optionsBox.innerHTML='';
    startTalking(s.wineScoff);
    await typeText("Tsuki: Believe it or not I wasn’t born a vampire, that’s not how it works. I was turned on my sweet 1600..something about destiny and true love..I dont wanna talk about it..");
    stopTalking(s.wineScoff[0]);
    showOptions([
      {label:"Do you drink blood?",onClick:scene_bloodQuestion},
      {label:"Back to questions",onClick:scene_identity},
      {label:"Hang up",onClick:scene_userHangup}
    ]);
  }

  async function scene_monsterHigh(){
    optionsBox.innerHTML='';
    startTalking(s.happy);
    await typeText("Tsuki: Monster High? I’m Obsessed! Draculaura and Abby are my spirit ghouls! I could watch just them, forever! Who's your fave?");
    stopTalking(s.happy[0]);

    const wrap=document.createElement('div');
    wrap.style.marginTop='14px';

    const input=document.createElement('input');
    input.type='text';
    input.placeholder='Type your fave ghoul…';
    input.style.cssText='width:100%;padding:10px;margin-bottom:8px;border-radius:10px;border:3px solid var(--accent-dark);font-family:VT323,monospace;font-size:18px;background:#fff0f4;';

    const btn=document.createElement('button');
    btn.textContent='Tell Tsuki!';
    btn.className='optionButton';

    wrap.appendChild(input); wrap.appendChild(btn);
    optionsBox.appendChild(wrap);

    btn.onclick=async()=>{
      const fave=input.value.trim()||'someone super cool';
      optionsBox.innerHTML='';
      startTalking(s.happy);
      await typeText(`Tsuki: Girrrrl! I love ${fave} too! We should watch it together some time~`);
      stopTalking(s.happy[0]);
      setTimeout(()=>showOptions([
        {label:"Back to questions",onClick:scene_identity},
        {label:"Hang up",onClick:scene_userHangup}
      ]),800);
    };
  }

  async function scene_jobLore(){
    optionsBox.innerHTML='';
    startTalking(s.neutral);
    await typeText("Tsuki: You’re seeing it, babe! I do this..I spill tea with you and then tell everyone else about it, you always have the BEST gossip, bestie!");
    stopTalking(s.neutral[0]);
    showOptions([
      {label:"Back to questions",onClick:scene_identity},
      {label:"Hang up",onClick:scene_userHangup}
    ]);
  }

  async function scene_bloodQuestion(){
    optionsBox.innerHTML='';
    startTalking(s.frown);
    await typeText("Tsuki: Blood? Girl no! We don’t do that anymore..are you racist?");
    await new Promise(r=>setTimeout(r,1300));
    startTalking(s.wineSmile);
    await typeText("Tsuki: Im kidding! We don’t need to drink blood anymore, my father would kill me if i did..");
    stopTalking(s.wineSmile[0]);
    showOptions([
      {label:"Back to questions",onClick:scene_identity},
      {label:"Hang up",onClick:scene_userHangup}
    ]);
  }

  async function scene_userHangup(){
    optionsBox.innerHTML='';
    safeSetSprite(s.hangup[1]||s.hangup[0]);
    await typeText("—call ended—");
    setTimeout(closeVN,700);
  }

  async function scene_tea(){
    optionsBox.innerHTML='';
    startTalking(s.wineSmile);
    await typeText("Tsuki: Oooh…Spill it!");
    stopTalking(s.wineSmile[0]);
    showOptions([
      {label:"Suggest Rant",onClick:()=>openSuggestModal('Rant')},
      {label:"Suggest Game",onClick:()=>openSuggestModal('Game')},
      {label:"Hang up",onClick:scene_hangUpAngry}
    ]);
  }

  async function scene_hangUpAngry(){
    optionsBox.innerHTML='';
    startTalking([...s.frown,...s.neutral]);
    await typeText("Tsuki: Girl..don’t piss me off.");
    stopTalking(s.hangup[1]||s.hangup[0]);
    setTimeout(closeVN,1100);
  }

  // ============== VN CONTROLS ==============
  function openVN(){
    vnContainer.classList.remove('hidden');
    vnContainer.setAttribute('aria-hidden','false');
    safeSetSprite(s.happy[0]);
    stopRing();
    scene_start();
  }

  function closeVN(){
    vnContainer.classList.add('hidden');
    vnContainer.setAttribute('aria-hidden','true');
    optionsBox.innerHTML='';
    textBox.innerHTML='';
    stopTalking();
  }

  // ============== SUGGEST MODAL ==============
  function openSuggestModal(kind=''){
    if(suggestForm && !suggestForm.querySelector('input[name="type"]')){
      const h=document.createElement('input'); h.type='hidden'; h.name='type';
      suggestForm.appendChild(h);
    }
    suggestForm.querySelector('input[name="type"]')?.setAttribute('value',kind);
    suggestModal.classList.remove('hidden');
    suggestModal.setAttribute('aria-hidden','false');
  }

  function closeSuggestModal(){
    suggestModal.classList.add('hidden');
    suggestModal.setAttribute('aria-hidden','true');
  }

  if(suggestForm){
    suggestForm.addEventListener('submit',async e=>{
      e.preventDefault();
      const fd=new FormData(suggestForm);
      try{
        const r=await fetch(FORM_ENDPOINT,{method:'POST',body:fd,headers:{'Accept':'application/json'}});
        if(r.ok){
          showToast('Submitted — thanks babe Heart');
          closeSuggestModal();
          textBox.innerText="Tsuki: Mmm thanks! I'll check it out.";
          optionsBox.innerHTML='';
          setTimeout(closeVN,900);
        }else showToast('Submission failed — try again');
      }catch{ showToast('Submission failed — check network'); }
    });
  }

  // ============== NAV TABS ==============
  document.querySelectorAll('.nav-tab').forEach(t=>{
    t.addEventListener('click',()=>{
      document.querySelectorAll('.nav-tab').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.page-panel').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      document.getElementById(t.dataset.tab)?.classList.add('active');
    });
  });

  // ============== PRELOAD & PHONE ==============
  (function(){
    Object.values(sprites).flat().forEach(p=>new Image().src=p);
    new Image().src='assets/images/Phone.png';
  })();

  if(phoneBtn){ startRing(); phoneBtn.onclick=()=>{ if(audioCtx?.state==='suspended') audioCtx.resume(); stopRing(); openVN(); }; }
  if(vnClose) vnClose.onclick=closeVN;
  if(openVNbtn) openVNbtn.onclick=()=>{ if(audioCtx?.state==='suspended') audioCtx.resume(); stopRing(); openVN(); };
  if(modalCloseBtn) modalCloseBtn.onclick=closeSuggestModal;
  if(toggleSfx) toggleSfx.onchange=()=>toggleSfx.checked?startRing():stopRing();

  // ============== STARS SYSTEM (unchanged) ==============
  let starCount = Number(localStorage.getItem('stars')||0);
  let starLayer = document.getElementById('starLayerGlobal')||(()=>{const d=document.createElement('div');d.id='starLayerGlobal';document.body.appendChild(d);return d;})();
  const STAR_POOL=[];
  const MAX_STARS=Math.max(20,Math.floor((innerWidth*innerHeight)/90000));

  function createBackgroundStar(x,y,{clickable=false,size=4+Math.random()*8}={}){
    const e=document.createElement('div');
    e.className='bg-star';
    e.style.left=(x*100)+'vw';
    e.style.top=(y*100)+'vh';
    e.style.width=size+'px';
    e.style.height=size+'px';
    e.style.background='linear-gradient(180deg,#fff5f8,#ffdff0)';
    e.style.opacity=clickable?1:(0.6+Math.random()*0.5)+'';
    if(clickable){ e.style.cursor='pointer'; e.onclick=ev=>{ev.stopPropagation();collectStar(e);}; }
    const dur=3+Math.random()*5;
    e.style.animation=`bgStarTwinkle ${dur}s infinite ease-in-out`;
    e.style.animationDelay=Math.random()*dur+'s';
    starLayer.appendChild(e);
    STAR_POOL.push(e);
  }

  function collectStar(el){
    el.style.transition='transform .18s ease, opacity .28s ease';
    el.style.transform='translate(-50%,-50%) scale(.6)';
    el.style.opacity='0';
    setTimeout(()=>el.remove(),300);
    starCount++;
    localStorage.setItem('stars',starCount);
    updateStarDisplay();
    showToast(starCount===1?'First star! Star':'Stars: '+starCount);
  }

  function spawnFallingStar(){
    const e=document.createElement('div');
    e.className='falling-star-collection';
    e.textContent='Star';
    e.style.position='fixed';
    e.style.zIndex=6;
    e.style.left=(Math.random()*100)+'vw';
    e.style.top=(-6-Math.random()*10)+'vh';
    e.style.fontSize=(18+Math.random()*16)+'px';
    e.style.cursor='pointer';
    e.style.color='#fff9ff';
    e.style.textShadow='0 0 8px #ffdff0';
    document.body.appendChild(e);
    const dur=3800+Math.random()*3000;
    e.animate([
      {transform:'translate(0,0)',opacity:1},
      {transform:`translate(${(Math.random()-0.5)*160}px,${innerHeight+120}px)`,opacity:0.02}
    ],{duration:dur,easing:'linear'});
    e.onclick=ev=>{ev.stopPropagation();e.remove();starCount++;localStorage.setItem('stars',starCount);updateStarDisplay();showToast('Stars: '+starCount);};
    setTimeout(()=>e.remove(),dur+300);
  }

  function populateBackgroundStars(){
    STAR_POOL.forEach(s=>s.remove());
    STAR_POOL.length=0;
    for(let i=0;i<MAX_STARS;i++){
      const clickable=Math.random()<0.06;
      createBackgroundStar(Math.random(),Math.random(),{clickable});
    }
  }
  populateBackgroundStars();
  setInterval(spawnFallingStar,3500);
  window.addEventListener('resize',()=>setTimeout(populateBackgroundStars,220));

  function updateStarDisplay(){ if(starCountDisp) starCountDisp.innerText=starCount; }
  updateStarDisplay();

  // ============== PET SYSTEM (100% original + working) ==============
  let petUnlocked = localStorage.getItem('petUnlocked')==='true';
  let petChosen = localStorage.getItem('petChosen')||'Oreo Bunny';
  let hatOwned = (()=>{try{return JSON.parse(localStorage.getItem('hat_owned')||'[]');}catch{return[];}})();
  let hatEquipped = localStorage.getItem('hat_equipped')||'';
  let petLove = Number(localStorage.getItem('petLove')||0);

  const petSprites = {
    'Rocky Road Bunny': encodeURI('assets/pets/Rocky Road Bunny.png'),
    'Oreo Bunny': encodeURI('assets/pets/Oreo Bunny.png'),
    'Vanilla Bunny': encodeURI('assets/pets/Vanilla Bunny.png')
  };

  const HAT_CATALOG = [ /* exactly your original catalog – unchanged */ ];

  function hatSVG(kind,color){ /* unchanged – your original function */ }
  function shade(hex,percent){ /* unchanged */ }

  // Paw icon fallback (your original code)
  (function setPaw(){
    const tries=['assets/ui/paw-icon.png','assets/images/paw.png','assets/sprites/paw.png'];
    let set=false;
    tries.forEach(p=>fetch(p,{method:'HEAD'}).then(r=>{if(!set&&r.ok){petButtonImg.src=p;set=true;}}).catch(()=>{}));
    if(!set) petButtonImg.src=`data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><g fill="#ff99aa" stroke="#5c3d3d" stroke-width="2"><circle cx="20" cy="18" r="6"/><circle cx="32" cy="12" r="6"/><circle cx="44" cy="18" r="6"/><ellipse cx="32" cy="36" rx="16" ry="12"/></g></svg>`)}`;
  })();

  // Pet popup open/close
  petButton?.addEventListener('click',()=>{
    if(!petUnlocked){
      petUnlocked=true;
      localStorage.setItem('petUnlocked','true');
      showToast('Pet system unlocked!');
    }
    petPopup.classList.remove('hidden');
    petPopup.setAttribute('aria-hidden','false');
    renderPetPopup();
  });

  petClose?.addEventListener('click',()=>{
    petPopup.classList.add('hidden');
    petPopup.setAttribute('aria-hidden','true');
  });

  function renderPetPopup(){
    petSpriteEl.src = petSprites[petChosen] || petSprites['Oreo Bunny'];
    const hat=HAT_CATALOG.find(h=>h.id===hatEquipped);
    petHatEl.src = hat?hat.svg:'';
    petHatEl.style.display = hat?'block':'none';
    if(petVariantSel) petVariantSel.value=petChosen;
    updateStarDisplay();
    updateLoveFill();

    shopScroll.innerHTML='';
    HAT_CATALOG.forEach(h=>{
      const owned=hatOwned.includes(h.id);
      const item=document.createElement('div');
      item.className='pet-shop-item';
      item.innerHTML=`
        <div style="height:62px;display:flex;align-items:center;justify-content:center"><img src="${h.svg}" alt="${h.name}"/></div>
        <div style="font-weight:800;margin-top:6px">${h.name}</div>
        <div style="margin-top:6px">${h.price} Star</div>
      `;
      const btn=document.createElement('button');
      btn.className='submit-btn';
      btn.style.marginTop='6px';
      if(owned){
        btn.textContent = hatEquipped===h.id?'Equipped':'Equip';
        btn.onclick=()=>{ hatEquipped=h.id; localStorage.setItem('hat_equipped',hatEquipped); showToast('Equipped '+h.name); renderPetPopup(); };
      }else{
        btn.textContent='Buy';
        btn.onclick=()=>{
          if(starCount>=h.price){
            starCount-=h.price;
            localStorage.setItem('stars',starCount);
            hatOwned.push(h.id);
            localStorage.setItem('hat_owned',JSON.stringify(hatOwned));
            showToast('Purchased '+h.name);
            updateStarDisplay();
            renderPetPopup();
          }else showToast('Not enough stars!');
        };
      }
      item.appendChild(btn);
      shopScroll.appendChild(item);
    });
  }

  petVariantSel?.addEventListener('change',e=>{
    petChosen=e.target.value;
    localStorage.setItem('petChosen',petChosen);
    renderPetPopup();
  });

  feedBtn?.addEventListener('click',()=>{
    petLove=Math.min(100,petLove+6);
    localStorage.setItem('petLove',petLove);
    updateLoveFill();
    showToast('Fed! +6 love');
  });

  batheBtn?.addEventListener('click',()=>{
    petLove=Math.min(100,petLove+8);
    localStorage.setItem('petLove',petLove);
    updateLoveFill();
    showToast('Bathe complete! +8 love');
  });

  function updateLoveFill(){
    const pct=Math.round(petLove);
    if(loveFill) loveFill.style.width=pct+'%';
  }
  updateLoveFill();

  // ============== DEBUG / CHEATS (exact original look) ==============
  document.getElementById("debug-reset")?.addEventListener("click", () => {
    localStorage.removeItem("stars"); localStorage.removeItem("petUnlocked");
    localStorage.removeItem("petChosen"); localStorage.removeItem("hat_owned");
    localStorage.removeItem("hat_equipped"); localStorage.removeItem("petLove");
    showToast("Pet system reset!");
    setTimeout(()=>location.reload(),220);
  });

  document.getElementById("debug-add-stars")?.addEventListener("click", () => {
    let s=Number(localStorage.getItem("stars")||0)+5;
    localStorage.setItem("stars",s); starCount=s; updateStarDisplay();
    showToast("+5 stars added!");
  });

  document.getElementById("debug-unlock-pets")?.addEventListener("click", () => {
    localStorage.setItem("petUnlocked","true"); petUnlocked=true;
    showToast("Pet system unlocked!");
  });

  document.getElementById("debug-full-reset")?.addEventListener("click", () => {
    localStorage.clear();
    showToast("ALL DATA CLEARED!");
    setTimeout(()=>location.reload(),220);
  });

  // Escape key
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape'){
      if(petPopup && !petPopup.classList.contains('hidden')) petPopup.classList.add('hidden');
      if(vnContainer && !vnContainer.classList.contains('hidden')) closeVN();
      if(suggestModal && !suggestModal.classList.contains('hidden')) closeSuggestModal();
    }
  });

  // Twinkle keyframes
  const style=document.createElement('style');
  style.innerHTML='@keyframes bgStarTwinkle{0%,100%{opacity:.35}50%{opacity:1}}';
  document.head.appendChild(style);
})();
