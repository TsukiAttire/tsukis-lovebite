document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

const sprite = document.getElementById('vnSprite');
const vnWindow = document.getElementById('vnWindow');

document.getElementById('phoneIcon').addEventListener('click', () => {
  vnWindow.style.display = 'block';
});

function react(emotion) {
  if (emotion === 'happy') {
    sprite.src = "assets/sprites/happy.png";
    document.getElementById('vnText').innerText = "Yay! I missed you!";
    document.getElementById('vnChoices').style.display = "none";
    document.getElementById('subChoices').style.display = "block";
  }
  if (emotion === 'annoyed') {
    sprite.src = "assets/sprites/annoyed.png";
    document.getElementById('vnText').innerText = "Rude…";
  }
  if (emotion === 'confused') {
    sprite.src = "assets/sprites/confused.png";
    document.getElementById('vnText').innerText = "Uhh… hello??";
  }
}

function openFormMenu() {
  document.getElementById('subChoices').style.display = "none";
  document.getElementById('formMenu').style.display = "block";
}

function openForm(type) {
  document.getElementById('formMenu').style.display = "none";

  if (type === 'rant') {
    document.getElementById('rantForm').style.display = "block";
  } else {
    document.getElementById('gameForm').style.display = "block";
  }
}
