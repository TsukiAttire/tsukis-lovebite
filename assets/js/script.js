// ===========================
// GLOBAL ELEMENTS
// ===========================
const sprite = document.getElementById("tsukiSprite");
const dialogueBox = document.getElementById("textBox");
const optionsBox = document.getElementById("optionsBox");
const phoneBtn = document.getElementById("phoneButton");
const vnContainer = document.getElementById("vnContainer");

let talkInterval = null;

// ===========================
// SPRITE TALKING ANIMATION
// ===========================

function startTalkingAnimation(s1, s2) {
    let toggle = false;

    talkInterval = setInterval(() => {
        sprite.src = toggle ? s1 : s2;
        sprite.classList.add("sprite-transition");
        toggle = !toggle;
    }, 140);
}

function stopTalkingAnimation(finalSprite) {
    clearInterval(talkInterval);
    talkInterval = null;

    if (finalSprite) {
        sprite.src = finalSprite;
        sprite.classList.add("sprite-transition");
    }
}

// ===========================
// TYPEWRITER EFFECT
// ===========================
function typeText(text, callback) {
    dialogueBox.innerHTML = "";
    let i = 0;

    function typing() {
        if (i < text.length) {
            dialogueBox.innerHTML += text.charAt(i);
            i++;
            setTimeout(typing, 25);
        } else {
            if (callback) callback();
        }
    }

    typing();
}

// ===========================
// MAIN SPEAK FUNCTION
// ===========================
function tsukiSpeak(line, spriteTalk1, spriteTalk2, finalSprite, callback) {
    startTalkingAnimation(
        `assets/sprites/${spriteTalk1}`,
        `assets/sprites/${spriteTalk2}`
    );

    typeText(line, () => {
        stopTalkingAnimation(`assets/sprites/${finalSprite}`);

        if (callback) callback();
    });
}

// ===========================
// GAME START
// ===========================
phoneBtn.addEventListener("click", () => {
    vnContainer.style.display = "block";
    firstScene();
});

// ===========================
// SCENE 1 — INTRO
// ===========================
function firstScene() {
    optionsBox.innerHTML = "";

    tsukiSpeak(
        "Hey Boo! ♡ You finally picked up..",
        "Happy Talking.png",
        "Thanks.png",
        "Happy Talking.png",
        () => {
            setTimeout(() => {
                secondScene();
            }, 400);
        }
    );
}

// ===========================
// SCENE 2 — WHAT'S UP?
// ===========================
function secondScene() {
    tsukiSpeak(
        "What's up, girl?",
        "Happy Talking.png",
        "Thanks.png",
        "Happy Talking.png",
        () => {
            showOptions([
                { text: "I've got some tea for a video, girl!", action: teaRoute },
                { text: "Who are you… what ARE you?", action: identityRoute },
                { text: "Hang up", action: hangUpRoute }
            ]);
        }
    );
}

// ===========================
// OPTION BUTTON MAKER
// ===========================
function showOptions(optionList) {
    optionsBox.innerHTML = "";
    optionList.forEach(opt => {
        let b = document.createElement("button");
        b.textContent = opt.text;
        b.className = "optionButton";
        b.onclick = opt.action;
        optionsBox.appendChild(b);
    });
}

// ===========================
// ROUTE 1 — TEA FOR VIDEO
// ===========================
function teaRoute() {
    optionsBox.innerHTML = "";

    tsukiSpeak(
        "Oooh… Spill it!",
        "Holding Wine Smile.png",
        "Holding Wine Scoff.png",
        "Holding Wine Smile.png",
        () => {
            showOptions([
                { text: "Suggest Rant", action: suggestRant },
                { text: "Suggest Game", action: suggestGame },
                { text: "Hang up", action: hangUpAngry }
            ]);
        }
    );
}

// ===========================
// RANT FORM
// ===========================
function suggestRant() {
    window.location.href = "https://formspree.io/f/mjkdzyqk";
}

// ===========================
// GAME FORM
// ===========================
function suggestGame() {
    window.location.href = "https://formspree.io/f/mjkdzyqk";
}

// ===========================
// ROUTE 1 BAD END
// ===========================
function hangUpAngry() {
    optionsBox.innerHTML = "";

    tsukiSpeak(
        "Girl… don’t piss me off.",
        "Frown reaction.png",
        "Sad Talking.png",
        "Hanging Up the phone.png",
        () => {
            setTimeout(() => {
                vnContainer.style.display = "none";
            }, 1200);
        }
    );
}

// ===========================
// ROUTE 2 — WHO ARE YOU?
// ===========================
function identityRoute() {
    optionsBox.innerHTML = "";

    tsukiSpeak(
        "…Seriously?",
        "Sad Talking.png",
        "Frown reaction.png",
        "Frown reaction.png",
        () => {
            showOptions([
                { text: "Sorry…", action: apologyScene },
                { text: "No really, what ARE you?", action: pushFurther },
                { text: "Hang up", action: hangUpRoute }
            ]);
        }
    );
}

function apologyScene() {
    optionsBox.innerHTML = "";

    tsukiSpeak(
        "Mmm… fine. You're forgiven.",
        "Happy Talking.png",
        "Thanks.png",
        "Thanks.png"
    );
}

function pushFurther() {
    optionsBox.innerHTML = "";

    tsukiSpeak(
        "You're bold asking that.",
        "Holding Rose Talk 1.png",
        "Holding Rose Talk 2.png",
        "Holding Rose Talk 1.png"
    );
}

// ===========================
// ROUTE 3 — HANG UP
// ===========================
function hangUpRoute() {
    optionsBox.innerHTML = "";

    tsukiSpeak(
        "…Wow.",
        "Sad Talking.png",
        "Frown reaction.png",
        "Hanging Up the phone.png",
        () => {
            setTimeout(() => {
                vnContainer.style.display = "none";
            }, 1200);
        }
    );
}
