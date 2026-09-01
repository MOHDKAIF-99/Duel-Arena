// =========================================================
// ROCK PAPER SCISSORS — DUEL ARENA
// Now with: profiles, avatars, and online multiplayer (PeerJS)
// =========================================================

const CHOICES = ['rock', 'paper', 'scissors'];
const EMOJI = { rock: '✊', paper: '✋', scissors: '✌️' };
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' }; // key beats value
const SHAKE_TIME = 550; // ms hands "think" before revealing
const PEER_PREFIX = 'rps-duel-'; // namespaces our room codes on the shared PeerJS broker

// ---------- DOM references ----------
const screens = document.querySelectorAll('.screen');

// Profile screen
const avatarPreview = document.getElementById('avatarPreview');
const avatarUpload = document.getElementById('avatarUpload');
const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
const emojiButtons = document.querySelectorAll('.emoji-option');
const nameInput = document.getElementById('nameInput');
const profileContinueBtn = document.getElementById('profileContinueBtn');

// Mode screen
const vsComputerBtn = document.getElementById('vsComputerBtn');
const vsOnlineBtn = document.getElementById('vsOnlineBtn');
const editProfileFromModeBtn = document.getElementById('editProfileFromModeBtn');

// Online lobby screen
const hostTabBtn = document.getElementById('hostTabBtn');
const joinTabBtn = document.getElementById('joinTabBtn');
const hostPanel = document.getElementById('hostPanel');
const joinPanel = document.getElementById('joinPanel');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const hostStatusText = document.getElementById('hostStatusText');
const joinCodeInput = document.getElementById('joinCodeInput');
const joinBtn = document.getElementById('joinBtn');
const joinStatusText = document.getElementById('joinStatusText');
const backToModeBtn = document.getElementById('backToModeBtn');

// Game screen
const leaveGameBtn = document.getElementById('leaveGameBtn');
const editProfileFromGameBtn = document.getElementById('editProfileFromGameBtn');
const connectionPill = document.getElementById('connectionPill');
const youAvatarBox = document.getElementById('youAvatarBox');
const youNameLabel = document.getElementById('youNameLabel');
const opponentAvatarBox = document.getElementById('opponentAvatarBox');
const opponentNameLabel = document.getElementById('opponentNameLabel');
const playerScoreEl = document.getElementById('playerScore');
const cpuScoreEl = document.getElementById('cpuScore');
const roundCountEl = document.getElementById('roundCount');
const playerEmojiEl = document.getElementById('playerEmoji');
const cpuEmojiEl = document.getElementById('cpuEmoji');
const playerHandEl = document.getElementById('playerHand');
const cpuHandEl = document.getElementById('cpuHand');
const playerFighterLabel = document.getElementById('playerFighterLabel');
const opponentFighterLabel = document.getElementById('opponentFighterLabel');
const resultBannerEl = document.getElementById('resultBanner');
const arenaEl = document.getElementById('arena');
const choiceButtons = document.querySelectorAll('.choice-btn');
const resetBtn = document.getElementById('resetBtn');
const confettiLayer = document.getElementById('confettiLayer');

// ---------- App state ----------
let currentMode = 'cpu';       // 'cpu' | 'online'
let cameFrom = 'screen-mode';  // where to return after editing the profile
let pendingAvatar = '😀';      // avatar being chosen on the profile screen

let peer = null;               // our PeerJS Peer instance
let conn = null;               // the active DataConnection to the other player
let isOnline = false;
let opponentProfile = null;

let scores = { player: 0, cpu: 0, round: 0 };
let isPlaying = false;
let myChoice = null;
let opponentChoice = null;
let resolving = false;

// =========================================================
// Screen navigation
// =========================================================
function showScreen(id) {
  screens.forEach((s) => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// =========================================================
// Profile: load / save / render
// =========================================================
function loadProfile() {
  const saved = localStorage.getItem('rps-profile');
  return saved ? JSON.parse(saved) : { name: 'Player', avatar: '😀' };
}

function saveProfile(profile) {
  localStorage.setItem('rps-profile', JSON.stringify(profile));
}

let myProfile = loadProfile();

// Renders either an emoji string or a data:image base64 avatar into an element
function renderAvatar(el, value) {
  if (value && value.startsWith('data:')) {
    el.innerHTML = `<img src="${value}" alt="avatar">`;
  } else {
    el.textContent = value || '🙂';
  }
}

function markSelectedEmoji(value) {
  emojiButtons.forEach((b) => b.classList.toggle('selected', b.dataset.emoji === value));
}

function openProfileEditor(from) {
  cameFrom = from;
  nameInput.value = myProfile.name;
  pendingAvatar = myProfile.avatar;
  renderAvatar(avatarPreview, pendingAvatar);
  markSelectedEmoji(pendingAvatar);
  showScreen('screen-profile');
}

function updateOwnDisplay() {
  youNameLabel.textContent = myProfile.name;
  playerFighterLabel.textContent = myProfile.name;
  renderAvatar(youAvatarBox, myProfile.avatar);
}

// ---------- Profile screen events ----------
uploadAvatarBtn.addEventListener('click', () => avatarUpload.click());

avatarUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      // Crop to a square and shrink it so it's cheap to send over the network
      const size = 120;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

      pendingAvatar = canvas.toDataURL('image/jpeg', 0.85);
      renderAvatar(avatarPreview, pendingAvatar);
      markSelectedEmoji(null); // clear emoji selection, a photo is now chosen
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

emojiButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    pendingAvatar = btn.dataset.emoji;
    renderAvatar(avatarPreview, pendingAvatar);
    markSelectedEmoji(pendingAvatar);
  });
});

profileContinueBtn.addEventListener('click', () => {
  const name = nameInput.value.trim().slice(0, 16) || 'Player';
  myProfile = { name, avatar: pendingAvatar || '😀' };
  saveProfile(myProfile);

  if (cameFrom === 'screen-game') {
    updateOwnDisplay();
    if (isOnline) sendMessage({ type: 'profile', name: myProfile.name, avatar: myProfile.avatar });
  }
  showScreen(cameFrom);
});

editProfileFromModeBtn.addEventListener('click', () => openProfileEditor('screen-mode'));
editProfileFromGameBtn.addEventListener('click', () => openProfileEditor('screen-game'));

// =========================================================
// Mode select
// =========================================================
function loadCpuScores() {
  const saved = localStorage.getItem('rps-scores');
  return saved ? JSON.parse(saved) : { player: 0, cpu: 0, round: 0 };
}
function saveCpuScores() {
  localStorage.setItem('rps-scores', JSON.stringify(scores));
}

vsComputerBtn.addEventListener('click', () => {
  cleanupConnection();
  currentMode = 'cpu';
  scores = loadCpuScores();

  // If there's a saved match in progress, let the player choose to continue it
  // or start fresh — instead of silently resuming it every time.
  if (scores.round > 0) {
    const continuePrevious = window.confirm(
      `You have a game in progress (Round ${scores.round}, ${scores.player}-${scores.cpu}).\n\nPress OK to continue it, or Cancel to start a New Game.`
    );
    if (!continuePrevious) {
      scores = { player: 0, cpu: 0, round: 0 };
      saveCpuScores();
    }
  }
  renderScores();

  opponentProfile = null;
  opponentNameLabel.textContent = 'CPU';
  opponentFighterLabel.textContent = 'CPU';
  renderAvatar(opponentAvatarBox, '🤖');
  updateConnectionPill('vs Computer', 'neutral');
  updateOwnDisplay();
  resetRoundState();
  showScreen('screen-game');
});

vsOnlineBtn.addEventListener('click', () => {
  showScreen('screen-online-lobby');
  switchLobbyTab('host');
});

// =========================================================
// Online lobby
// =========================================================
function switchLobbyTab(tab) {
  if (tab === 'host') {
    hostTabBtn.classList.add('active');
    joinTabBtn.classList.remove('active');
    hostPanel.classList.remove('hidden');
    joinPanel.classList.add('hidden');
    if (!peer) hostGame();
  } else {
    joinTabBtn.classList.add('active');
    hostTabBtn.classList.remove('active');
    joinPanel.classList.remove('hidden');
    hostPanel.classList.add('hidden');
    // Cancel an unused hosted room if we're switching away from it
    if (peer && !conn) {
      peer.destroy();
      peer = null;
    }
  }
}
hostTabBtn.addEventListener('click', () => switchLobbyTab('host'));
joinTabBtn.addEventListener('click', () => switchLobbyTab('join'));

backToModeBtn.addEventListener('click', () => {
  cleanupConnection();
  showScreen('screen-mode');
});

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0 or I/1, easy to read aloud
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function hostGame() {
  const code = generateRoomCode();
  roomCodeDisplay.textContent = code;
  hostStatusText.textContent = 'Setting up your room...';

  peer = new Peer(PEER_PREFIX + code);

  peer.on('open', () => {
    hostStatusText.textContent = 'Waiting for your friend to join...';
  });

  peer.on('connection', (connection) => {
    conn = connection;
    hostStatusText.textContent = 'Opponent found — connecting...';
    conn.on('data', handleIncomingMessage);
    conn.on('close', handleDisconnect);
    conn.on('open', startOnlineMatch);
  });

  peer.on('error', (err) => {
    if (err.type === 'unavailable-id') {
      hostGame(); // extremely rare code collision — just try a new one
    } else {
      hostStatusText.textContent = 'Connection error — try again.';
    }
  });
}

function joinGame() {
  const code = joinCodeInput.value.trim().toUpperCase();
  if (code.length !== 6) {
    joinStatusText.textContent = "Enter the 6-character code your friend shared.";
    return;
  }
  joinStatusText.textContent = 'Connecting...';

  peer = new Peer();
  peer.on('open', () => {
    conn = peer.connect(PEER_PREFIX + code, { reliable: true });
    conn.on('data', handleIncomingMessage);
    conn.on('close', handleDisconnect);
    conn.on('open', startOnlineMatch);
    conn.on('error', () => {
      joinStatusText.textContent = "Couldn't reach that code. Check it and try again.";
    });
  });

  peer.on('error', (err) => {
    joinStatusText.textContent = err.type === 'peer-unavailable'
      ? 'No game found with that code. Check it and try again.'
      : 'Connection error — try again.';
  });
}
joinBtn.addEventListener('click', joinGame);
joinCodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinGame(); });

copyCodeBtn.addEventListener('click', () => {
  const code = roomCodeDisplay.textContent;
  navigator.clipboard?.writeText(code).then(() => {
    copyCodeBtn.textContent = 'Copied!';
    setTimeout(() => { copyCodeBtn.textContent = 'Copy Code'; }, 1500);
  });
});

function sendMessage(obj) {
  if (conn && conn.open) conn.send(obj);
}

function handleIncomingMessage(data) {
  if (data.type === 'profile') {
    opponentProfile = { name: data.name, avatar: data.avatar };
    opponentNameLabel.textContent = opponentProfile.name;
    opponentFighterLabel.textContent = opponentProfile.name;
    renderAvatar(opponentAvatarBox, opponentProfile.avatar);
  } else if (data.type === 'choice') {
    opponentChoice = data.choice;
    maybeResolveRound();
  } else if (data.type === 'reset-request') {
    handleResetRequest();
  } else if (data.type === 'reset-response') {
    handleResetResponse(data.accepted);
  }
}

function handleDisconnect() {
  updateConnectionPill('Disconnected', 'bad');
  resultBannerEl.textContent = 'Your friend disconnected.';
  resultBannerEl.className = 'result-banner';
  setButtonsEnabled(false);
}

function cleanupConnection() {
  if (conn) { try { conn.close(); } catch (e) {} conn = null; }
  if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
  isOnline = false;
}

function startOnlineMatch() {
  currentMode = 'online';
  isOnline = true;

  opponentProfile = null;
  opponentNameLabel.textContent = 'Waiting...';
  opponentFighterLabel.textContent = 'Opponent';
  renderAvatar(opponentAvatarBox, '❓');
  updateConnectionPill('Connected 🟢', 'good');
  updateOwnDisplay();

  scores = { player: 0, cpu: 0, round: 0 };
  renderScores();
  resetRoundState();

  sendMessage({ type: 'profile', name: myProfile.name, avatar: myProfile.avatar });
  showScreen('screen-game');
}

leaveGameBtn.addEventListener('click', () => {
  cleanupConnection();
  showScreen('screen-mode');
});

function updateConnectionPill(text, tone) {
  connectionPill.textContent = text;
  connectionPill.className = 'connection-pill ' + (tone || 'neutral');
}

// =========================================================
// Core game rules (shared by both modes)
// =========================================================
function getCpuChoice() {
  return CHOICES[Math.floor(Math.random() * CHOICES.length)];
}

function getResult(mine, theirs) {
  if (mine === theirs) return 'tie';
  return BEATS[mine] === theirs ? 'win' : 'lose';
}

function renderScores() {
  playerScoreEl.textContent = scores.player;
  cpuScoreEl.textContent = scores.cpu;
  roundCountEl.textContent = scores.round;
}

function updateScores(result) {
  if (result === 'win') scores.player += 1;
  if (result === 'lose') scores.cpu += 1;
  if (currentMode === 'cpu') saveCpuScores();
  renderScores();
}

function setButtonsEnabled(enabled) {
  choiceButtons.forEach((btn) => { btn.disabled = !enabled; });
}

function clearEffects() {
  playerHandEl.classList.remove('impact-win', 'impact-tie');
  cpuHandEl.classList.remove('impact-win', 'impact-tie');
  arenaEl.classList.remove('shake-fail');
}

function resetRoundState() {
  myChoice = null;
  opponentChoice = null;
  resolving = false;
  isPlaying = false;
  resultBannerEl.textContent = 'Choose your move';
  resultBannerEl.className = 'result-banner';
  playerEmojiEl.textContent = '✊';
  cpuEmojiEl.textContent = '✊';
  clearEffects();
  setButtonsEnabled(true);
}

// ---------- Playing a round ----------
function handleChoiceClick(choice) {
  if (isPlaying) return;
  if (currentMode === 'online' && (!conn || !conn.open)) return;

  isPlaying = true;

  // Show the new round number right away, before the hands even start shaking
  scores.round += 1;
  if (currentMode === 'cpu') saveCpuScores();
  renderScores();

  setButtonsEnabled(false);
  clearEffects();
  resultBannerEl.textContent = 'Rock... Paper... Scissors...';
  resultBannerEl.className = 'result-banner';
  playerHandEl.classList.add('shaking');
  cpuHandEl.classList.add('shaking');
  playerEmojiEl.textContent = '✊';
  cpuEmojiEl.textContent = '✊';

  if (currentMode === 'cpu') {
    setTimeout(() => finishRound(choice, getCpuChoice()), SHAKE_TIME);
  } else {
    myChoice = choice;
    sendMessage({ type: 'choice', choice });
    maybeResolveRound();
  }
}

// Called after sending our choice AND after receiving the opponent's —
// only proceeds once both sides of the round are known
function maybeResolveRound() {
  if (currentMode === 'online' && myChoice && opponentChoice && !resolving) {
    resolving = true;
    setTimeout(() => {
      finishRound(myChoice, opponentChoice);
      myChoice = null;
      opponentChoice = null;
      resolving = false;
    }, SHAKE_TIME);
  }
}

function finishRound(mine, theirs) {
  const result = getResult(mine, theirs);

  playerHandEl.classList.remove('shaking');
  cpuHandEl.classList.remove('shaking');
  playerEmojiEl.textContent = EMOJI[mine];
  cpuEmojiEl.textContent = EMOJI[theirs];

  applyResultEffects(result);
  updateScores(result);

  setTimeout(() => {
    setButtonsEnabled(true);
    isPlaying = false;
  }, 700);
}

function applyResultEffects(result) {
  if (result === 'win') {
    resultBannerEl.textContent = 'You win the round! 🎉';
    resultBannerEl.classList.add('is-win');
    playerHandEl.classList.add('impact-win');
    spawnConfetti();
  } else if (result === 'lose') {
    const label = currentMode === 'online' ? (opponentProfile?.name || 'Opponent') : 'CPU';
    resultBannerEl.textContent = `${label} wins the round.`;
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

function spawnConfetti() {
  const colors = ['#4CE0D2', '#FF4D8D', '#FFC145', '#EDEFF7'];
  for (let i = 0; i < 36; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = 1.2 + Math.random() * 1 + 's';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    confettiLayer.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}

// ---------- New Game ----------
// CPU mode resets instantly. Online mode asks the opponent first, so a game
// never resets out from under someone without them knowing.
function resetMatchNow() {
  scores = { player: 0, cpu: 0, round: 0 };
  if (currentMode === 'cpu') saveCpuScores();
  renderScores();
  resetRoundState();
}

resetBtn.addEventListener('click', () => {
  if (currentMode === 'cpu') {
    resetMatchNow();
    return;
  }
  if (!conn || !conn.open) return;

  resetBtn.disabled = true;
  resultBannerEl.textContent = `Waiting for ${opponentProfile?.name || 'your opponent'} to accept...`;
  resultBannerEl.className = 'result-banner';
  sendMessage({ type: 'reset-request' });
});

function handleResetRequest() {
  const requesterName = opponentProfile?.name || 'Your opponent';
  const accepted = window.confirm(`${requesterName} wants to start a New Game (this resets the score). Accept?`);
  sendMessage({ type: 'reset-response', accepted });
  if (accepted) resetMatchNow();
}

function handleResetResponse(accepted) {
  resetBtn.disabled = false;
  if (accepted) {
    resetMatchNow();
  } else {
    resultBannerEl.textContent = `${opponentProfile?.name || 'Your opponent'} declined the New Game request.`;
    resultBannerEl.className = 'result-banner';
  }
}

// ---------- Choice buttons + keyboard shortcuts ----------
choiceButtons.forEach((btn) => {
  btn.addEventListener('click', () => handleChoiceClick(btn.dataset.choice));
});

window.addEventListener('keydown', (e) => {
  if (!document.getElementById('screen-game').classList.contains('active')) return;
  const map = { '1': 'rock', '2': 'paper', '3': 'scissors' };
  if (map[e.key]) handleChoiceClick(map[e.key]);
});

// =========================================================
// Startup
// =========================================================
nameInput.value = myProfile.name;
renderAvatar(avatarPreview, myProfile.avatar);
markSelectedEmoji(myProfile.avatar);

const hasSavedProfile = !!localStorage.getItem('rps-profile');
showScreen(hasSavedProfile ? 'screen-mode' : 'screen-profile');