/* assets/js/script.js
   Updated: supports 2-frame talking pairs (e.g. "Thanks.png" + "Thanks 2.png")
   - Typing effect
   - Sprite fade + bounce transition
   - Talking animation (alternates frames while typing)
   - Formspree integration (https://formspree.io/f/mjkdzyqk)
   - Modal + VN flow
   Make sure this file overwrites the old script.js in assets/js/
*/

(() => {
  // -------- CONFIG --------
  const FORM_ENDPOINT = 'https://formspree.io/f/mjkdzyqk';
  const TALK_INTERVAL_MS = 140;   // frame switch speed while "talking"
  const TYPE_SPEED_MS = 24;       // typing speed per char
  const SPRITE_TRANSITION_CLASS = 'sprite-transition';

  // exact sprite filenames in assets/sprites/ (spaces & caps preserved)
  const spriteFiles = {
    // pairs (talking frames)
    happy: ['Happy Talking.png', 'Thanks.png'],
    thanks: ['Thanks.png', 'Thanks 2.png'],
    neutral: ['Sad Talking.png', 'Sad Talking 2.png'],
    frown: ['Frown reaction.png', 'Frown reaction.png'], // single (repeats)
    wineSmile: ['Holding Wine Smile.png', 'Holding Wine Smile 2.png'],
    wineScoff: ['Holding Wine Scoff.png', 'Holding Wine Scoff 2.png'],
    rose: ['Holding Rose Talk 1.png', 'Holding Rose Talk 2.png'],
    hangup: ['Hanging Up the phone.png', 'Hanging Up the phone 2.png']
  };

  // Build encoded full paths for each frame pair
  const sprites = {};
  Object.keys(spriteFiles).forEach(key => {
    sprites[key] = spriteFiles[key].map(filename => encodeURI(`assets/sprites/${filename}`));
  });

  // ---------- DOM elements ----------
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

  // talking interval handle
  let talkInterval = null;

  // ---------- Utility / UI Helpers ----------
  function showToast(msg, ms = 3000) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    toast.style.display = 'block';
    setTimeout(() => {
      toast.classList.remove('show');
      toast.style.display = 'none';
    }, ms);
  }

  function safeSetSprite(path) {
    if (!tsukiSprite) return;
    tsukiSprite.classList.add(SPRITE_TRANSITION_CLASS);
    tsukiSprite.src = path;
    tsukiSprite.onerror = () => {
      console.warn('Sprite failed to load:', path);
      // tiny inline placeholder so layout doesn't collapse
      tsukiSprite.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABhElEQVR4nO2ZQQ6CQBBFz6k9gQdgQdgQdgQdgQdgQdgQdgQd2k1cSaT+3q0v2Y3sWmE1Nn6c4eOBuAnwAegF8AHoBfAHq7Wwq2Lx5WZyQq2y3i8f9y1oSxTuY2Qq2x0i8z8DPXjgq1wq2p2qzQZr3KpB2G1M2wz1m1nNe2xY6l8e4VJ2q8Un6q8N5Xso9V6r+2q3t3Z2L6f4Kq+7X2l9bW6r9bGdV1q7t7q9u7+6vU6r8s7j9w+9+9uA9uAY6gFiwDq4Bq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Bq8F7wG6BzqDxw9w6J3+uX9zR6wQZtYQZsYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwXrxQHz5wz9QuS5V4wAAAABJRU5ErkJggg==';
    };
  }

  // typing effect returns a promise resolved when typing completes
  function typeText(text, speed = TYPE_SPEED_MS) {
    return new Promise(resolve => {
      if (!textBox) return resolve();
      textBox.innerHTML = '';
      let i = 0;
      function tick() {
        if (i < text.length) {
          textBox.innerHTML += text.charAt(i);
          i++;
          setTimeout(tick, speed);
        } else {
          resolve();
        }
      }
      tick();
    });
  }

  // start talking animation through an array of frames (strings of paths)
  function startTalking(frames = [], intervalMs = TALK_INTERVAL_MS) {
    stopTalking();
    if (!frames || !frames.length) return;
    let idx = 0;
    talkInterval = setInterval(() => {
      const path = frames[idx % frames.length];
      tsukiSprite.classList.add(SPRITE_TRANSITION_CLASS);
      tsukiSprite.src = path;
      idx++;
    }, intervalMs);
  }

  function stopTalking(finalPath) {
    if (talkInterval) {
      clearInterval(talkInterval);
      talkInterval = null;
    }
    if (finalPath) safeSetSprite(finalPath);
  }

  function showOptions(list = []) {
    optionsBox.innerHTML = '';
    list.forEach(opt => {
      const b = document.createElement('button');
      b.className = 'optionButton';
      b.textContent = opt.label;
      b.onclick = opt.onClick;
      optionsBox.appendChild(b);
    });
  }

  // ---------- Scenes (each Tsuki line = sprite change) ----------
  async function scene_start() {
    optionsBox.innerHTML = '';
    startTalking(sprites.happy);
    await typeText('Tsuki: Hey Boo! ♡ You finally picked up..');
    stopTalking(sprites.happy[0]); // show main happy sprite
    setTimeout(scene_whatsUp, 320);
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
    startTalking(sprites.frown.concat(sprites.neutral)); // fallback alt
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
    setTimeout(() => closeVN(), 800);
  }

  // ---------- VN controls ----------
  function openVN() {
    vnContainer.classList.remove('hidden');
    vnContainer.setAttribute('aria-hidden', 'false');
    safeSetSprite(sprites.happy[0]);
    scene_start();
  }

  function closeVN() {
    vnContainer.classList.add('hidden');
    vnContainer.setAttribute('aria-hidden', 'true');
    optionsBox.innerHTML = '';
    textBox.innerHTML = '';
    stopTalking();
  }

  // ---------- Modal (Formspree) ----------
  function openSuggestModal(kind = '') {
    // ensure a hidden field 'type' exists to indicate Rant/Game if you want
    if (suggestForm && !suggestForm.querySelector('input[name="type"]')) {
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'type';
      suggestForm.appendChild(hidden);
    }
    const typeField = suggestForm.querySelector('input[name="type"]');
    if (typeField) typeField.value = kind;

    suggestModal.classList.remove('hidden');
    suggestModal.setAttribute('aria-hidden', 'false');
    // focus first field
    const first = suggestForm.querySelector('input[name="name"], textarea, input');
    if (first) first.focus();
  }

  function closeSuggestModal() {
    suggestModal.classList.add('hidden');
    suggestModal.setAttribute('aria-hidden', 'true');
  }

  // ---------- Form submission (AJAX to Formspree, plus regular form fallback) ----------
  if (suggestForm) {
    suggestForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(suggestForm);
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          showToast('Submitted — thanks babe ♡');
          closeSuggestModal();
          // short VN confirmation
          textBox.innerText = "Tsuki: Mmm thanks! I'll check it out.";
          optionsBox.innerHTML = '';
          setTimeout(() => closeVN(), 1100);
        } else {
          showToast('Submission failed — try again');
          console.warn('Formspree status:', res.status, res.statusText);
        }
      } catch (err) {
        console.error('Form submit error', err);
        showToast('Submission failed — check your network');
      }
    });
  }

  // ---------- Events ----------
  if (phoneBtn) {
    phoneBtn.addEventListener('click', () => {
      openVN();
      phoneBtn.style.animation = 'none'; // stop ring while VN open
    });
  }
  if (vnClose) vnClose.addEventListener('click', closeVN);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeSuggestModal);

  // close modal on overlay click
  if (suggestModal) {
    suggestModal.addEventListener('click', (e) => {
      if (e.target === suggestModal) closeSuggestModal();
    });
  }

  // ---------- Preload sprites & report missing ----------
  (function preloadAll() {
    const missing = [];
    Object.values(sprites).forEach(arr => {
      arr.forEach(path => {
        const img = new Image();
        img.src = path;
        img.onerror = () => missing.push(path);
      });
    });
    // also check phone icon path
    const phone = new Image();
    phone.src = 'assets/images/Phone.png';
    phone.onerror = () => console.warn('Phone icon missing: assets/images/Phone.png');

    if (missing.length) {
      console.warn('Missing sprite files:', missing);
      setTimeout(() => showToast('Some sprites missing — check console for names'), 700);
    }
  })();

  // debug helper
  window.TsukiDebug = {
    sprites,
    openVN, closeVN, openSuggestModal, closeSuggestModal
  };
})();
