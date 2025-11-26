const phone = document.getElementById("phoneIcon");
const vn = document.getElementById("vnWindow");
const textBox = document.getElementById("vnText");
const spriteBox = document.getElementById("tsukiSprite");
const choicesBox = document.getElementById("vnChoices");

function setSprite(name) {
    spriteBox.src = `assets/sprites/${name}.png`;
}

function setText(t) {
    textBox.innerHTML = t;
}

function setChoices(arr) {
    choicesBox.innerHTML = "";
    arr.forEach(choice => {
        let btn = document.createElement("button");
        btn.innerText = choice.label;
        btn.onclick = choice.action;
        choicesBox.appendChild(btn);
    });
}

/* OPEN VN ON PHONE CLICK */
phone.onclick = () => {
    vn.classList.remove("hidden");
    startVN();
};

/* VN LOGIC */

function startVN() {
    setSprite("Holding Wine Smile");
    setText("Hey Boo! 🤍 You finally picked up...");
    setChoices([
        { label: "Continue", action: scene2 }
    ]);
}

function scene2() {
    setSprite("Happy Talking");
    setText("What's up, girl?");
    setChoices([
        { label: "I've got tea for a video, girl!", action: optionTea },
        { label: "Who are you…what are you?", action: optionWho },
        { label: "Hang up", action: hangUp }
    ]);
}

function optionTea() {
    setSprite("Holding Wine Scoff");
    setText("Oooh… spill it!");
    setChoices([
        { label: "Suggest Rant topic or Game", action: teaFormStart },
        { label: "Hang up", action: hungUpAngry }
    ]);
}

function teaFormStart() {
    setSprite("Happy Talking");
    setText("Okay boo! What type of tea?");
    setChoices([
        { label: "Rant", action: () => openForm("Rant") },
        { label: "Game", action: () => openForm("Game") }
    ]);
}

/* OPEN FORM */
function openForm(type) {
    document.getElementById("formTypeLabel").innerText = type;
    document.getElementById("suggestForm").classList.remove("hidden");
}
function closeForm() {
    document.getElementById("suggestForm").classList.add("hidden");
}

/* USER HANGS UP */
function hungUpAngry() {
    setSprite("Frown reaction");
    setText("Girl… don't piss me off.");
    setChoices([]);
    setTimeout(() => {
        vn.classList.add("hidden");
    }, 2000);
}

/* OTHER OPTIONS */

function optionWho() {
    setSprite("Sad Talking");
    setText("Girl… that’s rude.");
    setChoices([
        { label: "Sorry", action: () => { vn.classList.add("hidden"); } }
    ]);
}

function hangUp() {
    setSprite("Hanging Up the phone");
    setText("*click*");
    setChoices([]);
    setTimeout(() => {
        vn.classList.add("hidden");
    }, 1500);
}
