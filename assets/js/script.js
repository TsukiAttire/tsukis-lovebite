/* =========================================================
   AUDIO SETUP
========================================================= */

const phoneRing = new Audio("assets/sfx/phone-ring.mp3");
const typeSound = new Audio("assets/sfx/type.mp3"); // optional if added
typeSound.volume = 0.25;

/* =========================================================
   PHONE → OPEN VN
========================================================= */

const phone = document.getElementById("phoneImg");
let ringing = false;

phone.addEventListener("click", () => {
    if (!ringing) {
        ringing = true;
        phoneRing.play();
        phone.classList.add("shake");

        setTimeout(() => {
            phone.classList.remove("shake");
            openVN();
            ringing = false;
        }, 1200);
    }
});

/* =========================================================
   VN SYSTEM (Tsuki’s Calling)
========================================================= */

const vn = document.getElementById("vnWindow");
const vnSprite = document.getElementById("vnSprite");
const vnText = document.getElementById("vnText");
const vnChoices = document.getElementById("vnChoices");

function openVN() {
    vn.style.display = "block";
    runScene("intro1");
}

function typeText(text) {
    vnText.innerHTML = "";
    let i = 0;
    const interval = setInterval(() => {
        vnText.innerHTML += text[i];
        typeSound.currentTime = 0;
        typeSound.play();
        i++;
        if (i === text.length) clearInterval(interval);
    }, 45);
}

function runScene(scene) {
    vnChoices.innerHTML = "";

    if (scene === "intro1") {
        vnSprite.src = "assets/sprites/Holding Wine Smile.png";
        typeText("Hey boo! ♡ You finally picked up…");
        vnChoices.innerHTML = `
            <button onclick="runScene('o1')">I’ve got some tea for a video!</button>
            <button onclick="runScene('o2')">Who even are you…?</button>
            <button onclick="closeVN()">Hang up</button>
        `;
    }

    if (scene === "o1") {
        vnSprite.src = "assets/sprites/Holding Wine Smile 2.png";
        typeText("Oooh… spill it.");
        vnChoices.innerHTML = `
            <button onclick="openForm()">Suggest a Rant or Game</button>
            <button onclick="runScene('hangupMad')">Hang up</button>
        `;
    }

    if (scene === "hangupMad") {
        vnSprite.src = "assets/sprites/Hanging Up the phone.png";
        typeText("Girl… don’t piss me off.");
        setTimeout(() => closeVN(), 2000);
    }
}

function closeVN() {
    vn.style.display = "none";
}

/* =========================================================
   FORM PAGE
========================================================= */

function openForm() {
    document.getElementById("formContainer").classList.remove("hidden");
    closeVN();
}

/* =========================================================
   STAR SYSTEM
========================================================= */

let stars = parseInt(localStorage.getItem("stars") || "0");
let petUnlocked = localStorage.getItem("petUnlocked") === "true";

function spawnStar() {
    const star = document.createElement("div");
    star.classList.add("falling-star");
    star.textContent = "✦";
    star.style.left = Math.random() * 90 + "vw";

    document.body.appendChild(star);

    star.onclick = () => {
        star.remove();
        stars++;
        localStorage.setItem("stars", stars);

        if (stars === 1 && !petUnlocked) {
            document.getElementById("starIntro").style.display = "flex";
        }
    };

    setTimeout(() => star.remove(), 5000);
}

setInterval(spawnStar, 3000);

document.getElementById("starIntroContinue").onclick = () => {
    petUnlocked = true;
    localStorage.setItem("petUnlocked", "true");
    document.getElementById("starIntro").style.display = "none";
    document.getElementById("petButton").classList.remove("hidden");
};

/* =========================================================
   PET SYSTEM
========================================================= */

let petChosen = localStorage.getItem("petChosen");

const petWindow = document.getElementById("petWindow");
const petContent = document.getElementById("petWindowContent");

document.getElementById("petButton").onclick = () => {
    petWindow.style.display = "block";
    loadPetMenu();
};

document.getElementById("closePetWindow").onclick = () => {
    petWindow.style.display = "none";
};

function loadPetMenu() {
    if (!petChosen) {
        petContent.innerHTML = `
            <p><strong>Choose your starter pet:</strong></p>
            <button onclick="choosePet('Puppy')">🐶 Puppy</button>
            <button onclick="choosePet('Kitten')">🐱 Kitten</button>
        `;
    } else {
        petContent.innerHTML = `
            <p>Your pet: <strong>${petChosen}</strong></p>
            <p>More features coming soon…</p>
        `;
    }
}

function choosePet(pet) {
    petChosen = pet;
    localStorage.setItem("petChosen", pet);
    loadPetMenu();
}
