// VN engine + UI glue
document.addEventListener('DOMContentLoaded', () => {
  // Tabs
  document.querySelectorAll('.tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  const phone = document.getElementById('phoneIcon');
  const vnWindow = document.getElementById('vnWindow');
  const vnSprite = document.getElementById('vnSprite');
  const vnText = document.getElementById('vnText');
  const vnChoices = document.getElementById('vnChoices');
  const vnClose = document.getElementById('vnClose');
  const toast = document.getElementById('toast');

  // Sprite filenames (must match your uploaded files)
  const sprites = {
    neutral: 'assets/sprites/tsuki-neutral.png',
    happy:    'assets/sprites/tsuki-happy.png',
    annoyed:  'assets/sprites/tsuki-annoyed.png',
    wine:     'assets/sprites/tsuki-wine.png',
    hangup:   'assets/sprites/tsuki-hangup.png'
  };

  // Scenes (each new tsuki line = new scene with sprite change)
  const scenes = {
    start: {
      sprite: sprites.happy,
      text: 'Tsuki: Hey Boo! ♥ You finally picked up..',
      next: 'whatUp'
    },
    whatUp: {
      sprite: sprites.neutral,
      text: "Tsuki: What's up, girl?",
      choices: [
        { id:'opt1', text:"I've got some tea for a video, girl!", next:'opt1Response' },
        { id:'opt2', text:"Who are you…What are you?", next:'opt2Response' },
        { id:'opt3', text:"Hang up", next:'userHangup' }
      ]
    },
    opt1Response: {
      sprite: sprites.wine,
      text: "Tsuki: Oooh…Spill it!",
      choices: [
        { id:'opt1a', text:"Insert the tea (open form)", next:'openForm' },
        { id:'opt1b', text:"Hang up", next:'opt1Hangup' }
      ]
    },
    opt1Hangup: {
      sprite: sprites.annoyed,
      text: "Tsuki: Girl..don’t piss me off.",
      next: 'endHangup'
    },
    opt2Response: {
      sprite: sprites.neutral,
      text: "Tsuki: Me?? I'm Tsuki. Cute chaos, and content—duh.",
      choices: [
        { id:'opt2a', text:'Back', next:'whatUp' },
        { id:'opt2b', text:'Hang up', next:'userHangup' }
      ]
    },
    userHangup: {
      sprite: sprites.hangup,
      text: "—call ended—",
      next: null
    },
    endHangup: {
      sprite: sprites.hangup,
      text: "Tsuki hung up.",
      next: null
    }
  };

  // Open VN window and start at scene.start
  function openVN(){
    vnWindow.style.display='block';
    vnWindow.setAttribute('aria-hidden','false');
    playScene('start');
  }

  function closeVN(){
    vnWindow.style.display='none';
    vnWindow.setAttribute('aria-hidden','true');
    vnChoices.innerHTML='';
  }

  vnClose.addEventListener('click', closeVN);

  phone.addEventListener('click', () => {
    // stop ring animation while open
    phone.style.animation = 'none';
    openVN();
  });

  // play a scene by key
  function playScene(key){
    if(!key){ closeVN(); return; }
    const s = scenes[key];
    if(!s){ console.warn('missing scene',key); return; }

    // sprite change
    if(s.sprite) vnSprite.src = s.sprite;

    // text
    vnText.innerText = s.text;

    // choices
    vnChoices.innerHTML = '';

    // if choices exist render them
    if(s.choices && s.choices.length){
      s.choices.forEach(ch=>{
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = ch.text;
        btn.addEventListener('click', ()=> {
          handleChoice(ch.next);
        });
        vnChoices.appendChild(btn);
      });
    } else if(s.next){
      // auto-advance button when there is a next scene but no choices
      const cont = document.createElement('button');
      cont.className = 'choice-btn';
      cont.innerText = 'Continue';
      cont.addEventListener('click', ()=> handleChoice(s.next));
      vnChoices.appendChild(cont);
    } else {
      // end scene (show close)
      const done = document.createElement('button');
      done.className = 'choice-btn';
      done.innerText = 'Close';
      done.addEventListener('click', closeVN);
      vnChoices.appendChild(done);
    }
  }

  function handleChoice(nextKey){
    if(nextKey === 'openForm') {
      openSubmissionForm();
      return;
    }
    // small delay for dramatic effect and then play next scene
    playScene(nextKey);
  }

  // Submission form (modal inside the VN)
  function openSubmissionForm(){
    vnSprite.src = sprites.neutral;
    vnText.innerText = "Leave your tea/idea below — only I can see submissions.";
    vnChoices.innerHTML = '';

    // build form
    const form = document.createElement('form');
    form.id = 'tsukiForm';

    const name = document.createElement('input');
    name.type='text';
    name.name='name';
    name.placeholder='Your name';
    name.required=true;

    const message = document.createElement('textarea');
    message.name='message';
    message.placeholder='Write your tea / suggestion here';
    message.required=true;
    message.rows=4;
    message.style.resize='vertical';

    const submit = document.createElement('button');
    submit.type='submit';
    submit.className='choice-btn';
    submit.innerText='Submit';

    form.appendChild(name);
    form.appendChild(message);
    form.appendChild(submit);

    vnChoices.appendChild(form);

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      submit.disabled = true;
      submit.innerText = 'Sending…';

      // POST to server-side handler (requires PHP/server)
      try {
        const data = new FormData(form);
        const resp = await fetch('assets/forms/submit.php', {
          method:'POST',
          body: data
        });
        const json = await resp.json();
        if(json.success){
          showToast('Submitted — thanks babe ♡');
          vnText.innerText = 'Tsuki: Mmm thanks! I\'ll check it out.';
          vnChoices.innerHTML = '';
          const ok = document.createElement('button');
          ok.className='choice-btn';
          ok.innerText='Close';
          ok.addEventListener('click', closeVN);
          vnChoices.appendChild(ok);
        } else {
          throw new Error(json.error || 'Server rejected');
        }
      } catch(err){
        console.error(err);
        showToast('Submission failed — try again later');
        submit.disabled = false;
        submit.innerText = 'Submit';
      }
    });
  }

  // small helper
  function showToast(msg){
    toast.innerText = msg;
    toast.style.display='block';
    setTimeout(()=>toast.style.display='none', 2600);
  }

  // initial scene hidden; VN will be opened when phone clicked
});
