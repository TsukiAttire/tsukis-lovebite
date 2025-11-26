/* Full VN engine - typing + talking frames + sprite transitions + Formspree + modal
   Designed to work with the provided HTML & CSS and your sprites in assets/sprites/
   Formspree endpoint: https://formspree.io/f/mjkdzyqk
*/

(() => {
  // ---------- Config ----------
  const FORM_ENDPOINT = 'https://formspree.io/f/mjkdzyqk';

  // exact sprite filenames you uploaded (spaces/caps preserved)
  const spriteFiles = {
    happy: 'Happy Talking.png',
    thanks: 'Thanks.png',
    neutral: 'Sad Talking.png',
    frown: 'Frown reaction.png',
    wineSmile: 'Holding Wine Smile.png',
    wineScoff: 'Holding Wine Scoff.png',
    rose1: 'Holding Rose Talk 1.png',
    rose2: 'Holding Rose Talk 2.png',
    hangup: 'Hanging Up the phone.png'
  };

  // build encoded paths
  const sprites = {};
  Object.keys(spriteFiles).forEach(k => sprites[k] = encodeURI('assets/sprites/' + spriteFiles[k]));

  // ---------- Elements ----------
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

  // talk animation control
  let talkInterval = null;

  // ---------- Helpers ----------
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    toast.style.display = 'block';
    setTimeout(() => { toast.classList.remove('show'); toast.style.display = 'none'; }, 3000);
  }

  function safeSetSprite(path) {
    // set image and fallback to placeholder if missing
    tsukiSprite.src = path;
    tsukiSprite.classList.add('sprite-transition');
    tsukiSprite.onerror = () => {
      console.warn('Sprite failed to load:', path);
      // fallback to a very small inline placeholder (keeps layout)
      tsukiSprite.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABhElEQVR4nO2ZQQ6CQBBFz6k9gQdgQdgQdgQdgQdgQdgQdgQd2k1cSaT+3q0v2Y3sWmE1Nn6c4eOBuAnwAegF8AHoBfAHq7Wwq2Lx5WZyQq2y3i8f9y1oSxTuY2Qq2x0i8z8DPXjgq1wq2p2qzQZr3KpB2G1M2wz1m1nNe2xY6l8e4VJ2q8Un6q8N5Xso9V6r+2q3t3Z2L6f4Kq+7X2l9bW6r9bGdV1q7t7q9u7+6vU6r8s7j9w+9+9uA9uAY6gFiwDq4Bq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Aq4Bq8F7wG6BzqDxw9w6J3+uX9zR6wQZtYQZsYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwVrYwXrxQHz5wz9QuS5V4wAAAABJRU5ErkJggg==';
    };
  }

  // typing effect
  function typeText(text, speed = 24) {
    return new Promise(resolve => {
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

  // talking animation: alternate between two frames while typing
  function startTalking(pathA, pathB, intervalMs = 140) {
    stopTalking();
    let toggle = false;
    talkInterval = setInterval(() => {
      tsukiSprite.src = toggle ? pathA : pathB;
      tsukiSprite.classList.add('sprite-transition');
      toggle = !toggle;
    }, intervalMs);
  }

  function stopTalking(finalPath) {
    if (talkInterval) {
      clearInterval(talkInterval);
      talkInterval = null;
    }
    if (finalPath) {
      safeSetSprite(finalPath);
    }
  }

  // renders options
  function showOptions(opts = []) {
    optionsBox.innerHTML = '';
    opts.forEach(o => {
      const b = document.createElement('button');
      b.className = 'optionButton';
      b.textContent = o.label;
      b.onclick = o.onClick;
      optionsBox.appendChild(b);
    });
  }

  // ---------- Scenes (each tsuki line = sprite change) ----------
  async function scene_start() {
    optionsBox.innerHTML = '';
    // start with happy talking frames (happy <-> thanks)
    startTalking(sprites.happy, sprites.thanks);
    await typeText('Tsuki: Hey Boo! ♡ You finally picked up..', 24);
    stopTalking(sprites.happy);
    // small pause then next
    setTimeout(scene_whatsUp, 350);
  }

  async function scene_whatsUp() {
    startTalking(sprites.happy, sprites.thanks);
    await typeText("Tsuki: What's up, girl?", 24);
    stopTalking(sprites.happy);
    showOptions([
      { label: "I've got some tea for a video, girl!", onClick: scene_tea },
      { label: "Who are you…What are you?", onClick: scene_identity },
      { label: "Hang up", onClick: scene_userHangup }
    ]);
  }

  async function scene_tea() {
    optionsBox.innerHTML = '';
    startTalking(sprites.wineSmile, sprites.wineScoff);
    await typeText("Tsuki: Oooh…Spill it!", 24);
    stopTalking(sprites.wineSmile);
    showOptions([
      { label: "Suggest Rant", onClick: () => openSuggestModal('Rant') },
      { label: "Suggest Game", onClick: () => openSuggestModal('Game') },
      { label: "Hang up", onClick: scene_hangUpAngry }
    ]);
  }

  async function scene_hangUpAngry() {
    optionsBox.innerHTML = '';
    startTalking(sprites.frown, sprites.neutral);
    await typeText("Tsuki: Girl..don’t piss me off.", 24);
    stopTalking(sprites.hangup);
    setTimeout(() => { closeVN(); }, 1200);
  }

  async function scene_identity() {
    optionsBox.innerHTML = '';
    startTalking(sprites.neutral, sprites.frown);
    await typeText("Tsuki: Me?? I'm Tsuki. Cute chaos, and content—duh.", 24);
    stopTalking(sprites.neutral);
    showOptions([
      { label: "Back", onClick: scene_whatsUp },
      { label: "Hang up", onClick: scene_userHangup }
    ]);
  }

  async function scene_userHangup() {
    optionsBox.innerHTML = '';
    safeSetSprite(sprites.hangup);
    await typeText("—call ended—", 20);
    setTimeout(() => { closeVN(); }, 900);
  }

  // ---------- VN open/close ----------
  function openVN() {
    vnContainer.classList.remove('hidden');
    vnContainer.setAttribute('aria-hidden', 'false');
    // preload check: set default sprite quickly
    safeSetSprite(sprites.happy);
    scene_start();
  }

  function closeVN() {
    vnContainer.classList.add('hidden');
    vnContainer.setAttribute('aria-hidden', 'true');
    optionsBox.innerHTML = '';
    textBox.innerHTML = '';
    stopTalking();
  }

  // ---------- Suggest modal ----------
  function openSuggestModal(kind) {
    // kind is "Rant" or "Game" — we can prefill a hidden field if wanted
    suggestModal.classList.remove('hidden');
    suggestModal.setAttribute('aria-hidden', 'false');
    // optionally set focus
    const firstInput = suggestForm.querySelector('input, textarea');
    if (firstInput) firstInput.focus();
  }

  function closeSuggestModal() {
    suggestModal.classList.add('hidden');
    suggestModal.setAttribute('aria-hidden', 'true');
  }

  // ---------- Formspree submit handler (AJAX fallback, but normal form also works) ----------
  suggestForm.addEventListener('submit', async (e) => {
    // allow default form submission as well; but we'll use fetch to give user immediate feedback
    e.preventDefault();
    const formData = new FormData(suggestForm);
    try {
      const resp = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });
      if (resp.ok) {
        showToast('Submitted — thanks babe ♡');
        // close modal and return to VN
        closeSuggestModal();
        // small confirmation line in VN
        textBox.innerText = "Tsuki: Mmm thanks! I'll check it out.";
        optionsBox.innerHTML = '';
        setTimeout(() => closeVN(), 1200);
      } else {
        showToast('Submission failed — try again');
      }
    } catch (err) {
      console.error('Form submit error', err);
      showToast('Submission failed — check your network');
    }
  });

  // ---------- Event bindings ----------
  phoneBtn.addEventListener('click', () => {
    openVN();
    // stop phone ring so it's not distracting while VN is open
    phoneBtn.style.animation = 'none';
  });
  vnClose.addEventListener('click', closeVN);
  modalCloseBtn.addEventListener('click', closeSuggestModal);

  // Close modal on overlay click (nice touch)
  suggestModal.addEventListener('click', (e) => {
    if (e.target === suggestModal) closeSuggestModal();
  });

  // ---------- Preload sprites & debug missing ----------
  (function preload() {
    const missing = [];
    Object.values(sprites).forEach(path => {
      const img = new Image();
      img.src = path;
      img.onerror = () => missing.push(path);
    });
    if (missing.length) {
      console.warn('Missing sprites:', missing);
      // show one-time toast if any missing (helpful)
      setTimeout(() => {
        showToast('Missing sprites detected — check console for filenames');
      }, 700);
    }
  })();

  // expose small debug helper
  window.TsukiDebug = {
    sprites,
    openVN, closeVN, openSuggestModal, closeSuggestModal
  };

})();
