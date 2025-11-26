/* assets/js/script.js
   Fully configured with your Formspree endpoint.
*/

document.addEventListener('DOMContentLoaded', () => {
  /**************** CONFIG ****************/
  // ✔ Your Formspree endpoint (works on GitHub Pages)
  const FORM_ENDPOINT = 'https://formspree.io/f/mjkdzyqk';

  // Do NOT turn this on for GitHub Pages (PHP doesn't work there)
  const USE_PHP_ENDPOINT = false;

  const PHP_ENDPOINT = 'assets/forms/submit.php';
  /****************************************/

  // UI elements
  const phone = document.getElementById('phoneIcon');
  const vnWindow = document.getElementById('vnWindow');
  const vnSprite = document.getElementById('vnSprite');
  const vnText = document.getElementById('vnText');
  const vnChoices = document.getElementById('vnChoices');
  const vnClose = document.getElementById('vnClose');
  const toast = document.getElementById('toast');

  // EXACT filenames you supplied (must exist in assets/sprites/)
  const spriteFiles = {
    happy: 'Happy Talking.png',
    neutral: 'Sad Talking.png',
    annoyed: 'Frown reaction.png',
    wineSmile: 'Holding Wine Smile.png',
    wineScoff: 'Holding Wine Scoff.png',
    hangup: 'Hanging Up the phone.png',
    rose1: 'Holding Rose Talk 1.png',
    rose2: 'Holding Rose Talk 2.png',
    thanks: 'Thanks.png'
  };

  const sprites = {};
  Object.keys(spriteFiles).forEach(k => {
    sprites[k] = encodeURI('assets/sprites/' + spriteFiles[k]);
  });

  const phonePath = encodeURI('assets/images/Phone.png');

  const placeholder =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAYAAAD62FJkAAAACXBIWXMAAAsTAAALEwEAmpwYAAABfElEQVR4nO3U0Q2AMAwF0d7/0r1xEo7sSSwqW9/H2D0YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADA9u7k3Z11r7d0o3r3u3j5z8+O7fq7W7w0mH/7o6P1zJ/bz7n0d3uT3c/v/Jv7v3s7n3r3c+9v8z9r/36d3v7n9v7t0f2b7n1v1f7y7q3u9yv9+q+zv9n4P7n9v3N8j6jv7Gf6Q3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgA/4AJQ7kG7pXoSgAAAAASUVORK5CYII=';

  function preloadAll() {
    const promises = Object.keys(sprites).map(k => {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({key: k, ok: true});
        img.onerror = () => resolve({key: k, ok: false});
        img.src = sprites[k];
      });
    });

    return Promise.all(promises);
  }

  const scenes = {
    start: { sprite: sprites.happy, text: 'Tsuki: Hey Boo! ♥ You finally picked up..', next: 'whatUp' },
    whatUp: { sprite: sprites.neutral, text: "Tsuki: What's up, girl?", choices: [
      { id:'opt1', text:"I've got some tea for a video, girl!", next:'opt1Response' },
      { id:'opt2', text:"Who are you…What are you?", next:'opt2Response' },
      { id:'opt3', text:"Hang up", next:'userHangup' }
    ]},
    opt1Response: { sprite: sprites.wineSmile, text: "Tsuki: Oooh…Spill it!", choices: [
      { id:'opt1a', text:"Insert the tea (open form)", next:'openForm' },
      { id:'opt1b', text:"Hang up", next:'opt1Hangup' }
    ]},
    opt1Hangup: { sprite: sprites.annoyed, text: "Tsuki: Girl..don’t piss me off.", next: 'endHangup' },
    opt2Response: { sprite: sprites.neutral, text: "Tsuki: Me?? I'm Tsuki. Cute chaos, and content—duh.", choices: [
      { id:'opt2a', text:'Back', next:'whatUp' },
      { id:'opt2b', text:'Hang up', next:'userHangup' }
    ]},
    userHangup: { sprite: sprites.hangup, text: "—call ended—", next: null },
    endHangup: { sprite: sprites.hangup, text: "Tsuki hung up.", next: null }
  };

  preloadAll().then(results => {
    const missing = results.filter(r => !r.ok);
    if (missing.length) {
      showToast('Missing sprites: ' + missing.map(m => spriteFiles[m.key]).join(', '));
    }

    const testPhone = new Image();
    testPhone.onerror = () => showToast("Phone.png missing");
    testPhone.src = phonePath;

    phone.src = phonePath;
    attachUI();
  });

  function attachUI() {
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
      });
    });

    phone.addEventListener('click', openVN);
    vnClose.addEventListener('click', closeVN);
  }

  function openVN() {
    vnWindow.style.display = 'block';
    playScene('start');
  }

  function closeVN() {
    vnWindow.style.display = 'none';
    vnChoices.innerHTML = '';
  }

  function playScene(key) {
    const s = scenes[key];
    if (!s) return;

    setSpriteSafe(s.sprite);
    vnText.innerText = s.text;
    vnChoices.innerHTML = '';

    if (s.choices) {
      s.choices.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = ch.text;
        btn.addEventListener('click', () => handleChoice(ch.next));
        vnChoices.appendChild(btn);
      });
    } else if (s.next) {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerText = 'Continue';
      btn.addEventListener('click', () => handleChoice(s.next));
      vnChoices.appendChild(btn);
    } else {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerText = 'Close';
      btn.addEventListener('click', closeVN);
      vnChoices.appendChild(btn);
    }
  }

  function setSpriteSafe(path) {
    vnSprite.src = path;
    vnSprite.onerror = () => {
      vnSprite.src = placeholder;
      showToast("Missing sprite: " + decodeURI(path).split('/').pop());
    };
  }

  function handleChoice(next) {
    if (next === 'openForm') {
      openSubmissionForm();
      return;
    }
    playScene(next);
  }

  function openSubmissionForm() {
    setSpriteSafe(sprites.neutral);
    vnText.innerText = "Leave your tea/idea below — only I can see submissions.";
    vnChoices.innerHTML = '';

    const form = document.createElement('form');
    form.id = 'tsukiForm';

    const name = document.createElement('input');
    name.type = 'text';
    name.name = 'name';
    name.placeholder = 'Your name';
    name.required = true;

    const msg = document.createElement('textarea');
    msg.name = 'message';
    msg.placeholder = 'Write your tea / idea here';
    msg.required = true;
    msg.rows = 4;

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'choice-btn';
    submit.innerText = 'Submit';

    form.appendChild(name);
    form.appendChild(msg);
    form.appendChild(submit);

    vnChoices.appendChild(form);

    form.addEventListener('submit', async e => {
      e.preventDefault();
      submit.innerText = 'Sending…';
      submit.disabled = true;

      try {
        const fd = new FormData(form);
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          body: fd,
          headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) throw new Error('Formspree error');

        showToast('Submitted — thanks babe ♡');

        vnText.innerText = "Tsuki: Mmm thanks! I'll check it out.";
        vnChoices.innerHTML = '';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'choice-btn';
        closeBtn.innerText = 'Close';
        closeBtn.addEventListener('click', closeVN);
        vnChoices.appendChild(closeBtn);

      } catch (err) {
        showToast('Submission failed — check your Formspree setup');
        submit.disabled = false;
        submit.innerText = 'Submit';
      }
    });
  }

  function showToast(msg) {
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3200);
  }
});
