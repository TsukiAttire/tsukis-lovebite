/* =========================================
   script.js
   ========================================= */

(() => {
    'use strict';

    /* --- TAB SYSTEM LOGIC --- */
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // 1. Remove active class from all buttons
            navButtons.forEach(b => b.classList.remove('active-btn'));
            // 2. Add active class to clicked button
            btn.classList.add('active-btn');
            
            // 3. Hide all tabs
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            // 4. Show target tab
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    /* --- VN & PHONE LOGIC --- */
    const TYPE_SPEED_MS = 24; 
    const TALK_INTERVAL_MS = 140; 
    const SPRITE_TRANSITION_CLASS = 'sprite-transition';
    
    // Resource Mapping
    const spriteFiles = { 
        happy: ['Thanks.png', 'Thanks 2.png'], 
        neutral: ['Sad Talking.png', 'Sad Talking 2.png'], 
        frown: ['Sad Talking.png'], 
        wineSmile: ['Holding Wine Smile.png', 'Holding Wine Smile 2.png'], 
        wineScoff: ['Holding Wine Scoff 2.png'], 
        rose: ['Holding Rose Talk 1.png', 'Holding Rose Talk 2.png'], 
        hangup: ['Hanging Up the phone.png'] 
    };
    
    const sprites = {}; 
    Object.keys(spriteFiles).forEach(k => { 
        sprites[k] = spriteFiles[k].map(fn => `assets/sprites/${fn}`); 
    });

    const phoneBtn = document.getElementById('phoneButton'); 
    const vnContainer = document.getElementById('vnContainer'); 
    const vnClose = document.getElementById('vnClose'); 
    const tsukiSprite = document.getElementById('tsukiSprite'); 
    const textBox = document.getElementById('textBox'); 
    const optionsBox = document.getElementById('optionsBox');

    function stopRing() { phoneBtn.classList.remove('phone-ringing'); } 
    function startRing() { phoneBtn.classList.add('phone-ringing'); }
    
    function safeSetSprite(path) { 
        if (!tsukiSprite) return; 
        tsukiSprite.classList.remove(SPRITE_TRANSITION_CLASS); 
        void tsukiSprite.offsetWidth; 
        tsukiSprite.classList.add(SPRITE_TRANSITION_CLASS); 
        tsukiSprite.src = path; 
    }
    
    function typeText(text) { 
        return new Promise(resolve => { 
            textBox.innerHTML = ''; 
            let i = 0; 
            function step() { 
                if (i < text.length) { 
                    textBox.innerHTML += text.charAt(i); 
                    i++; 
                    setTimeout(step, TYPE_SPEED_MS); 
                } else resolve(); 
            } 
            step(); 
        }); 
    }
    
    let talkInterval = null; 
    function startTalking(frames) { 
        stopTalking(); 
        if (!frames || !frames.length) return; 
        let idx = 0; 
        tsukiSprite.src = frames[0]; 
        if (frames.length > 1) { 
            talkInterval = setInterval(() => { 
                idx++; 
                tsukiSprite.src = frames[idx % frames.length]; 
            }, TALK_INTERVAL_MS); 
        } 
    }
    
    function stopTalking(finalPath) { 
        if (talkInterval) clearInterval(talkInterval); 
        talkInterval = null; 
        if (finalPath) safeSetSprite(finalPath); 
    }
    
    function showOptions(list) { 
        optionsBox.innerHTML = ''; 
        list.forEach(item => { 
            const b = document.createElement('button'); 
            b.className = 'optionButton'; 
            b.textContent = item.label; 
            b.addEventListener('click', item.onClick); 
            optionsBox.appendChild(b); 
        }); 
    }
    
    function openVN() { vnContainer.classList.add('active'); stopRing(); }
    function closeVN() { vnContainer.classList.remove('active'); optionsBox.innerHTML = ''; textBox.innerHTML = ''; stopTalking(); setTimeout(startRing, 5000); }
    
    /* --- SCENES --- */
    async function scene_start() { openVN(); optionsBox.innerHTML = ''; startTalking(sprites.happy); await typeText("Tsuki: Hey Boo! ♡ You finally picked up.."); stopTalking(sprites.happy[0]); setTimeout(scene_whatsUp, 300); }
    async function scene_whatsUp() { startTalking(sprites.happy); await typeText("Tsuki: What's up, girl?"); stopTalking(sprites.happy[0]); showOptions([{ label: "Who are you…What are you?", onClick: scene_identity }, { label: "Hang up", onClick: scene_userHangup }]); }
    async function scene_identity() { optionsBox.innerHTML = ''; startTalking(sprites.neutral); await typeText("Tsuki: Girl..Did you hit your head? Its me! Your Bestie? Maybe you just need a refresher..what do ya wanna know?"); stopTalking(sprites.neutral[0]); showOptions([{ label: "Tell me about being Cupid's daughter?", onClick: scene_cupidLore }, { label: "What's the vampire side like?", onClick: scene_vampireLore }, { label: "Favorite Monster High character?", onClick: scene_monsterHigh }, { label: "Hang up", onClick: scene_userHangup }]); }
    async function scene_cupidLore() { optionsBox.innerHTML = ''; startTalking(sprites.rose); await typeText("Tsuki: Dad? Dads fun! Way out of his league now with technology though. It’s hard to do the arrows thing when everyone is online now, y’know?"); stopTalking(sprites.rose[0]); showOptions([{ label: "More about your job?", onClick: scene_jobLore }, { label: "Back", onClick: scene_identity }]); }
    async function scene_vampireLore() { optionsBox.innerHTML = ''; startTalking(sprites.wineScoff); await typeText("Tsuki: Believe it or not I wasn’t born a vampire. I was turned on my sweet 1600..something about destiny..I dont wanna talk about it.."); stopTalking(sprites.wineScoff[0]); showOptions([{ label: "Do you drink blood?", onClick: scene_bloodQuestion }, { label: "Back", onClick: scene_identity }]); }
    async function scene_monsterHigh() { optionsBox.innerHTML = ''; startTalking(sprites.happy); await typeText("Tsuki: Monster High? I’m Obsessed! Draculaura and Abby are my spirit ghouls! Who's your fave?"); stopTalking(sprites.happy[0]); const container = document.createElement('div'); container.style.marginTop = '14px'; const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'Type your fave ghoul…'; input.style.width = '100%'; input.style.padding = '10px'; input.style.fontFamily = 'VT323'; input.style.fontSize='1.2rem'; const submitBtn = document.createElement('button'); submitBtn.textContent = 'Tell Tsuki!'; submitBtn.className = 'optionButton'; submitBtn.style.marginTop = '6px'; container.appendChild(input); container.appendChild(submitBtn); optionsBox.appendChild(container); submitBtn.onclick = async () => { const fave = input.value.trim() || 'them'; optionsBox.innerHTML = ''; startTalking(sprites.happy); await typeText(`Tsuki: Girrrrl! I love ${fave} too! We should watch it together some time~`); stopTalking(sprites.happy[0]); setTimeout(() => showOptions([{ label: "Back to questions", onClick: scene_identity }, { label: "Hang up", onClick: scene_userHangup }]), 1500); }; }
    async function scene_jobLore() { optionsBox.innerHTML = ''; startTalking(sprites.neutral); await typeText("Tsuki: You’re seeing it, babe! I do this..I spill tea with you and then tell everyone else about it!"); stopTalking(sprites.neutral[0]); showOptions([{ label: "Back", onClick: scene_identity }]); }
    async function scene_bloodQuestion() { optionsBox.innerHTML = ''; startTalking(sprites.neutral); await typeText("Tsuki: Blood? Girl no! We don’t do that anymore..are you racist?"); await new Promise(r => setTimeout(r, 1500)); startTalking(sprites.wineSmile); await typeText("Tsuki: Im kidding! We don’t need to drink blood anymore, my father would kill me if i did.."); stopTalking(sprites.wineSmile[0]); showOptions([{ label: "Back", onClick: scene_identity }]); }
    async function scene_userHangup() { optionsBox.innerHTML = ''; safeSetSprite(sprites.hangup[0]); await typeText("—call ended—"); setTimeout(closeVN, 1000); }

    // Init
    if (phoneBtn) phoneBtn.onclick = scene_start; 
    if (vnClose) vnClose.onclick = closeVN;
})();
