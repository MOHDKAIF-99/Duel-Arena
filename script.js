// =========================================================
// ROCK PAPER SCISSORS — DUEL ARENA
// Beginner-friendly, commented JavaScript
// =========================================================

const CHOICES = ['rock', 'paper', 'scissors'];
const EMOJI = { rock: '✊', paper: '✋', scissors: '✌️' };
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' }; // key beats value

// ---------- DOM references ----------
const choiceButtons = document.querySelectorAll('.choice-btn');
const resetBtn = document.getElementById('resetBtn');

const playerScoreEl = document.getElementById('playerScore');
const cpuScoreEl = document.getElementById('cpuScore');
const roundCountEl = document.getElementById('roundCount');

const playerEmojiEl = document.getElementById('playerEmoji');
const cpuEmojiEl = document.getElementById('cpuEmoji');
const playerHandEl = document.getElementById('playerHand');
const cpuHandEl = document.getElementById('cpuHand');

const resultBannerEl = document.getElementById('resultBanner');
const arenaEl = document.getElementById('arena');
const confettiLayer = document.getElementById('confettiLayer');

const SHAKE_TIME = 550; // ms the hands "think" before revealing a choice

// ---------- Score persistence (survives a page refresh) ----------
function loadScores() {
  const saved = localStorage.getItem('rps-scores');
  return saved ? JSON.parse(saved) : { player: 0, cpu: 0, round: 0 };
}

function saveScores(scores) {
  localStorage.setItem('rps-scores', JSON.stringify(scores));
}

let scores = loadScores();
renderScores();

function renderScores() {
  playerScoreEl.textContent = scores.player;
  cpuScoreEl.textContent = scores.cpu;
  roundCountEl.textContent = scores.round;
}

// ---------- Core game rules ----------
function getCpuChoice() {
  return CHOICES[Math.floor(Math.random() * CHOICES.length)];
}

function getResult(player, cpu) {
  if (player === cpu) return 'tie';
  return BEATS[player] === cpu ? 'win' : 'lose';
}

// ---------- Play a round ----------
let isPlaying = false; // guards against double-clicks mid-animation

function play(playerChoice) {
  if (isPlaying) return;
  isPlaying = true;
  setButtonsEnabled(false);

  clearEffects();
  resultBannerEl.textContent = 'Rock... Paper... Scissors...';
  resultBannerEl.className = 'result-banner';

  // "Thinking" shake on both hands before the reveal
  playerHandEl.classList.add('shaking');
  cpuHandEl.classList.add('shaking');
  playerEmojiEl.textContent = '✊';
  cpuEmojiEl.textContent = '✊';

  setTimeout(() => {
    const cpuChoice = getCpuChoice();
    const result = getResult(playerChoice, cpuChoice);

    // Reveal both hands
    playerHandEl.classList.remove('shaking');
    cpuHandEl.classList.remove('shaking');
    playerEmojiEl.textContent = EMOJI[playerChoice];
    cpuEmojiEl.textContent = EMOJI[cpuChoice];

    applyResultEffects(result);
    updateScores(result);

    // Re-enable buttons once the effect has had time to play
    setTimeout(() => {
      setButtonsEnabled(true);
      isPlaying = false;
    }, 700);
  }, SHAKE_TIME);
}

function updateScores(result) {
  scores.round += 1;
  if (result === 'win') scores.player += 1;
  if (result === 'lose') scores.cpu += 1;
  saveScores(scores);
  renderScores();
}

// ---------- Visual effects per outcome ----------
function applyResultEffects(result) {
  if (result === 'win') {
    resultBannerEl.textContent = 'You win the round! 🎉';
    resultBannerEl.classList.add('is-win');
    playerHandEl.classList.add('impact-win');
    spawnConfetti();
  } else if (result === 'lose') {
    resultBannerEl.textContent = 'CPU wins the round.';
    resultBannerEl.classList.add('is-lose');
    cpuHandEl.classList.add('impact-win');
    arenaEl.classList.add('shake-fail');
  } else {
    resultBannerEl.textContent = "It's a tie — go again!";
    resultBannerEl.classList.add('is-tie');
    playerHandEl.classList.add('impact-tie');
    cpuHandEl.classList.add('impact-tie');
  }
}

function clearEffects() {
  playerHandEl.classList.remove('impact-win', 'impact-tie');
  cpuHandEl.classList.remove('impact-win', 'impact-tie');
  arenaEl.classList.remove('shake-fail');
}

function spawnConfetti() {
  const colors = ['#4CE0D2', '#FF4D8D', '#FFC145', '#EDEFF7'];
  const pieceCount = 36;

  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = 1.2 + Math.random() * 1 + 's';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    confettiLayer.appendChild(piece);

    // Remove each piece once its fall animation finishes,
    // so the DOM doesn't keep growing round after round
    piece.addEventListener('animationend', () => piece.remove());
  }
}

function setButtonsEnabled(enabled) {
  choiceButtons.forEach((btn) => {
    btn.disabled = !enabled;
  });
}

// ---------- Event listeners ----------
choiceButtons.forEach((btn) => {
  btn.addEventListener('click', () => play(btn.dataset.choice));
});

resetBtn.addEventListener('click', () => {
  scores = { player: 0, cpu: 0, round: 0 };
  saveScores(scores);
  renderScores();
  resultBannerEl.textContent = 'Choose your move';
  resultBannerEl.className = 'result-banner';
  playerEmojiEl.textContent = '✊';
  cpuEmojiEl.textContent = '✊';
  clearEffects();
});

// Optional keyboard shortcuts: 1 = rock, 2 = paper, 3 = scissors
window.addEventListener('keydown', (e) => {
  const map = { '1': 'rock', '2': 'paper', '3': 'scissors' };
  if (map[e.key]) play(map[e.key]);
  
});