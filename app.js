window.localStorage.clear();

let pipeline = null;
let modelReady = false;

// --- KNOWLEDGE BASE ---
const categories = {
  cartoon_character: {
    traits: ["is_animal", "is_blue", "can_fly", "wears_pants", "is_disney"],
    characters: {
      "Daffy Duck": {
        is_animal: true,
        is_blue: false,
        can_fly: true,
        wears_pants: false,
        is_disney: false
      },
      Stitch: {
        is_animal: true,
        is_blue: true,
        can_fly: false,
        wears_pants: false,
        is_disney: true
      },
      "Donald Duck": {
        is_animal: true,
        is_blue: false,
        can_fly: false,
        wears_pants: false,
        is_disney: true
      },
      Sonic: {
        is_animal: true,
        is_blue: true,
        can_fly: false,
        wears_pants: true,
        is_disney: false
      },
      Genie: {
        is_animal: false,
        is_blue: true,
        can_fly: true,
        wears_pants: true,
        is_disney: true
      }
    }
  }
};

let currentCategory = "cartoon_character";
let currentAnswers = {};
let steps = 0;
const MAX_STEPS = 10;

// --- UI ELEMENTS ---
const el = {
  btnStart: document.getElementById("btnStart"),
  btnYes: document.getElementById("btnYes"),
  btnNo: document.getElementById("btnNo"),
  btnUnknown: document.getElementById("btnUnknown"),
  btnCorrect: document.getElementById("btnCorrect"),
  btnWrong: document.getElementById("btnWrong"),
  btnReset: document.getElementById("btnReset"),
  questionText: document.getElementById("questionText"),
  guessArea: document.getElementById("guessArea"),
  guessText: document.getElementById("guessText"),
  resultArea: document.getElementById("resultArea"),
  progress: document.getElementById("progress"),
  stepsLabel: document.getElementById("stepsLabel")
};

// --- UI HELPERS ---
function setQuestion(text) {
  el.questionText.textContent = text;
}

function setButtonsEnabled(enabled) {
  el.btnYes.disabled = !enabled;
  el.btnNo.disabled = !enabled;
  el.btnUnknown.disabled = !enabled;
}

function updateProgress() {
  steps = Math.min(steps, MAX_STEPS);
  el.progress.style.width = Math.round((steps / MAX_STEPS) * 100) + "%";
  el.stepsLabel.textContent = `Step ${steps}`;
}

function hideGuess() {
  el.guessArea.classList.add("hidden");
}

function showGuess(text) {
  el.guessText.textContent = text;
  el.guessArea.classList.remove("hidden");
}

function showResult(text) {
  el.resultArea.textContent = text;
  el.resultArea.classList.remove("hidden");
}

function hideResult() {
  el.resultArea.classList.add("hidden");
}

function resetState() {
  currentAnswers = {};
  steps = 0;
  updateProgress();
  hideGuess();
  hideResult();
  setQuestion(modelReady ? 'Click "Start" to begin.' : "Loading model…");
  el.btnStart.disabled = !modelReady;
  setButtonsEnabled(false);
  el.btnStart.classList.remove("hidden");
}

// --- MODEL LOADING ---
async function loadModel() {
  try {
    console.log("Loading model…");

    pipeline = await window.transformers.pipeline(
      "text-generation",
      "Xenova/distilgpt2"
    );

    modelReady = true;
    document.getElementById("loadingNote")?.remove();
    setQuestion('Click "Start" to begin.');
    el.btnStart.disabled = false;

    console.log("Model loaded!");
  } catch (err) {
    console.error("Model load failed:", err);
    setQuestion("Model failed to load.");
  }
}

// ✅ CodePen requires a delay so the library loads first
setTimeout(loadModel, 500);

// --- GAME LOGIC ---
function filterCharacters() {
  const data = categories[currentCategory];
  return Object.keys(data.characters).filter((name) => {
    const traits = data.characters[name];
    for (const t in currentAnswers) {
      if (
        currentAnswers[t] !== undefined &&
        traits[t] !== currentAnswers[t]
      ) {
        return false;
      }
    }
    return true;
  });
}

function getNextTrait() {
  return categories[currentCategory].traits.find(
    (t) => currentAnswers[t] === undefined
  );
}

function formatTrait(trait) {
  switch (trait) {
    case "is_animal":
      return "Is your character an animal?";
    case "is_blue":
      return "Is your character primarily blue?";
    case "can_fly":
      return "Can your character fly?";
    case "wears_pants":
      return "Does your character wear pants?";
    case "is_disney":
      return "Is your character from Disney?";
    default:
      return `Does your character have the trait "${trait}"?`;
  }
}

async function handleGameStep(answer) {
  if (answer) {
    const trait = getNextTrait();
    if (answer === "yes") currentAnswers[trait] = true;
    else if (answer === "no") currentAnswers[trait] = false;
    else currentAnswers[trait] = undefined;

    steps++;
    updateProgress();
  }

  const remaining = filterCharacters();

  if (remaining.length === 1 || steps >= MAX_STEPS) {
    makeGuess(remaining[0] || "a character I don't know");
    return;
  }

  if (remaining.length === 0) {
    showResult("I'm stumped! I don't know this character.");
    return;
  }

  const next = getNextTrait();
  if (next) {
    setQuestion(formatTrait(next));
    setButtonsEnabled(true);
  }
}

// --- AI GUESS ---
async function makeGuess(name) {
  setButtonsEnabled(false);

  let guess = `Are you thinking of "${name}"?`;

  if (modelReady && pipeline) {
    setQuestion("Thinking…");

    try {
      const prompt = `The character is ${name}. Write a magical Akinator-style guess starting with "I'm thinking of..."`;

      const out = await pipeline(prompt, {
        max_new_tokens: 40,
        temperature: 0.8
      });

      let text = out[0].generated_text.slice(prompt.length).trim();
      if (!text.endsWith("?")) text += "?";
      guess = text;
    } catch (e) {
      console.error(e);
    }
  }

  showGuess(guess);
}

// --- EVENTS ---
el.btnStart.addEventListener("click", () => {
  el.btnStart.classList.add("hidden");
  const first = getNextTrait();
  setQuestion(formatTrait(first));
  setButtonsEnabled(true);
});

el.btnYes.addEventListener("click", () => handleGameStep("yes"));
el.btnNo.addEventListener("click", () => handleGameStep("no"));
el.btnUnknown.addEventListener("click", () => handleGameStep("unknown"));

el.btnCorrect.addEventListener("click", () => {
  showResult("Amazing! I guessed it!");
});

el.btnWrong.addEventListener("click", () => {
  showResult("You win! I couldn't guess it.");
});

el.btnReset.addEventListener("click", resetState);

// INIT
setQuestion("Loading AI model…");
