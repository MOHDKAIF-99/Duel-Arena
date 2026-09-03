// =========================================================
// ROCK PAPER SCISSORS — DUEL ARENA
// Profiles, avatars, online multiplayer, 7s timer, tournaments, commentary
// =========================================================

const CHOICES = ['rock', 'paper', 'scissors'];
const EMOJI = { rock: '✊', paper: '✋', scissors: '✌️', timeout: '⌛' };
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const SHAKE_TIME = 550;
const TIMER_SECONDS = 7;
const PEER_PREFIX = 'rps-duel-';

// ---------- DOM ----------
const screens = document.querySelectorAll('.screen');
const avatarPreview = document.getElementById('avatarPreview');
const avatarUpload = document.getElementById('avatarUpload');
const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
const emojiButtons = document.querySelectorAll('.emoji-option');
const nameInput = document.getElementById('nameInput');
const profileContinueBtn = document.getElementById('profileContinueBtn');
const vsComputerBtn = document.getElementById('vsComputerBtn');
const vsOnlineBtn = document.getElementById('vsOnlineBtn');
const editProfileFromModeBtn = document.getElementById('editProfileFromModeBtn');
const lengthButtons = document.querySelectorAll('.length-btn');
const customLengthInput = document.getElementById('customLengthInput');
const customLengthBtn = document.getElementById('customLengthBtn');
const backToModeFromTournamentBtn = document.getElementById('backToModeFromTournamentBtn');
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
const commentaryText = document.getElementById('commentaryText');
const timerWrap = document.getElementById('timerWrap');
const timerFill = document.getElementById('timerFill');
const timerText = document.getElementById('timerText');
const arenaEl = document.getElementById('arena');
const choiceButtons = document.querySelectorAll('.choice-btn');
const resetBtn = document.getElementById('resetBtn');
const confettiLayer = document.getElementById('confettiLayer');
const summaryWinner = document.getElementById('summaryWinner');
const summaryScore = document.getElementById('summaryScore');
const summaryRounds = document.getElementById('summaryRounds');
const summaryWinStreak = document.getElementById('summaryWinStreak');
const summaryLoseStreak = document.getElementById('summaryLoseStreak');
const summaryAvgTime = document.getElementById('summaryAvgTime');
const playAgainBtn = document.getElementById('playAgainBtn');
const summaryBackBtn = document.getElementById('summaryBackBtn');

// ---------- State ----------
let currentMode = 'cpu';
let cameFrom = 'screen-mode';
let pendingAvatar = '😀';
let pendingMode = null;
let isHost = false;

let peer = null;
let conn = null;
let isOnline = false;
let opponentProfile = null;

let scores = { player: 0, cpu: 0, round: 0 };
let isPlaying = false;
let myChoice = null;
let opponentChoice = null;
let resolving = false;

let tournamentLength = null;
let currentStreakType = null;
let currentStreakCount = 0;
let longestWinStreak = 0;
let longestLoseStreak = 0;
let decisionTimes = [];

let timerInterval = null;
let timerTicks = 0;
let roundStartTime = null;

// ---------- Screen nav ----------
function showScreen(id) {
  screens.forEach((s) => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ---------- Profile ----------
function loadProfile() {
  const saved = localStorage.getItem('rps-profile');
  return saved ? JSON.parse(saved) : { name: 'Player', avatar: '😀' };
}
function saveProfile(profile) { localStorage.setItem('rps-profile', JSON.stringify(profile)); }
let myProfile = loadProfile();

function renderAvatar(el, value) {
  if (value && value.startsWith('data:')) el.innerHTML = `<img src="${value}" alt="avatar">`;
  else el.textContent = value || '🙂';
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

uploadAvatarBtn.addEventListener('click', () => avatarUpload.click());
avatarUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const size = 120;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      pendingAvatar = canvas.toDataURL('image/jpeg', 0.85);
      renderAvatar(avatarPreview, pendingAvatar);
      markSelectedEmoji(null);
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

// ---------- Mode + tournament length ----------
vsComputerBtn.addEventListener('click', () => { pendingMode = 'cpu'; showScreen('screen-tournament'); });
vsOnlineBtn.addEventListener('click', () => { pendingMode = 'online'; showScreen('screen-tournament'); });

lengthButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const len = parseInt(btn.dataset.length, 10);
    tournamentLength = len > 0 ? len : null;
    beginMatchFlow();
  });
});
customLengthBtn.addEventListener('click', () => {
  const val = parseInt(customLengthInput.value, 10);
  tournamentLength = (val && val > 0) ? val : null;
  beginMatchFlow();
});
backToModeFromTournamentBtn.addEventListener('click', () => showScreen('screen-mode'));

function beginMatchFlow() {
  if (pendingMode === 'cpu') startCpuMatch();
  else { showScreen('screen-online-lobby'); switchLobbyTab('host'); }
}

function loadCpuScores() {
  const saved = localStorage.getItem('rps-scores');
  return saved ? JSON.parse(saved) : { player: 0, cpu: 0, round: 0 };
}
function saveCpuScores() { localStorage.setItem('rps-scores', JSON.stringify(scores)); }

function startCpuMatch() {
  cleanupConnection();
  currentMode = 'cpu';

  if (tournamentLength) {
    scores = { player: 0, cpu: 0, round: 0 };
    saveCpuScores();
  } else {
    scores = loadCpuScores();
    if (scores.round > 0) {
      const cont = window.confirm(`You have a game in progress (Round ${scores.round}, ${scores.player}-${scores.cpu}).\n\nPress OK to continue it, or Cancel to start a New Game.`);
      if (!cont) { scores = { player: 0, cpu: 0, round: 0 }; saveCpuScores(); }
    }
  }
  resetMatchStats();
  renderScores();
  opponentProfile = null;
  opponentNameLabel.textContent = 'CPU';
  opponentFighterLabel.textContent = 'CPU';
  renderAvatar(opponentAvatarBox, '🤖');
  updateConnectionPill('vs Computer', 'neutral');
  updateOwnDisplay();
  resetRoundState();
  showScreen('screen-game');
}

// ---------- Online lobby ----------
function switchLobbyTab(tab) {
  if (tab === 'host') {
    hostTabBtn.classList.add('active'); joinTabBtn.classList.remove('active');
    hostPanel.classList.remove('hidden'); joinPanel.classList.add('hidden');
    if (!peer) hostGame();
  } else {
    joinTabBtn.classList.add('active'); hostTabBtn.classList.remove('active');
    joinPanel.classList.remove('hidden'); hostPanel.classList.add('hidden');
    if (peer && !conn) { peer.destroy(); peer = null; }
  }
}
hostTabBtn.addEventListener('click', () => switchLobbyTab('host'));
joinTabBtn.addEventListener('click', () => switchLobbyTab('join'));
backToModeBtn.addEventListener('click', () => { cleanupConnection(); showScreen('screen-mode'); });

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function hostGame() {
  isHost = true;
  const code = generateRoomCode();
  roomCodeDisplay.textContent = code;
  hostStatusText.textContent = 'Setting up your room...';
  peer = new Peer(PEER_PREFIX + code);
  peer.on('open', () => { hostStatusText.textContent = 'Waiting for your friend to join...'; });
  peer.on('connection', (connection) => {
    conn = connection;
    hostStatusText.textContent = 'Opponent found — connecting...';
    conn.on('data', handleIncomingMessage);
    conn.on('close', handleDisconnect);
    conn.on('open', startOnlineMatch);
  });
  peer.on('error', (err) => {
    if (err.type === 'unavailable-id') hostGame();
    else hostStatusText.textContent = 'Connection error — try again.';
  });
}

function joinGame() {
  isHost = false;
  const code = joinCodeInput.value.trim().toUpperCase();
  if (code.length !== 6) { joinStatusText.textContent = 'Enter the 6-character code your friend shared.'; return; }
  joinStatusText.textContent = 'Connecting...';
  peer = new Peer();
  peer.on('open', () => {
    conn = peer.connect(PEER_PREFIX + code, { reliable: true });
    conn.on('data', handleIncomingMessage);
    conn.on('close', handleDisconnect);
    conn.on('open', startOnlineMatch);
    conn.on('error', () => { joinStatusText.textContent = "Couldn't reach that code. Check it and try again."; });
  });
  peer.on('error', (err) => {
    joinStatusText.textContent = err.type === 'peer-unavailable' ? 'No game found with that code. Check it and try again.' : 'Connection error — try again.';
  });
}
joinBtn.addEventListener('click', joinGame);
joinCodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinGame(); });
copyCodeBtn.addEventListener('click', () => {
  navigator.clipboard?.writeText(roomCodeDisplay.textContent).then(() => {
    copyCodeBtn.textContent = 'Copied!';
    setTimeout(() => { copyCodeBtn.textContent = 'Copy Code'; }, 1500);
  });
});

function sendMessage(obj) { if (conn && conn.open) conn.send(obj); }

function handleIncomingMessage(data) {
  if (data.type === 'profile') {
    opponentProfile = { name: data.name, avatar: data.avatar };
    opponentNameLabel.textContent = opponentProfile.name;
    opponentFighterLabel.textContent = opponentProfile.name;
    renderAvatar(opponentAvatarBox, opponentProfile.avatar);
  } else if (data.type === 'tournament-config') {
    tournamentLength = data.length || null;
    renderScores();
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
  stopTimer();
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
  resetMatchStats();
  renderScores();
  resetRoundState();
  sendMessage({ type: 'profile', name: myProfile.name, avatar: myProfile.avatar });
  if (isHost) sendMessage({ type: 'tournament-config', length: tournamentLength });
  showScreen('screen-game');
}
leaveGameBtn.addEventListener('click', () => { stopTimer(); cleanupConnection(); showScreen('screen-mode'); });
function updateConnectionPill(text, tone) {
  connectionPill.textContent = text;
  connectionPill.className = 'connection-pill ' + (tone || 'neutral');
}

// ---------- Core rules ----------
function getCpuChoice() { return CHOICES[Math.floor(Math.random() * CHOICES.length)]; }
function getResult(mine, theirs) {
  if (mine === 'timeout' && theirs === 'timeout') return 'tie';
  if (mine === 'timeout') return 'lose';
  if (theirs === 'timeout') return 'win';
  if (mine === theirs) return 'tie';
  return BEATS[mine] === theirs ? 'win' : 'lose';
}
function renderScores() {
  playerScoreEl.textContent = scores.player;
  cpuScoreEl.textContent = scores.cpu;
  roundCountEl.textContent = tournamentLength ? `${scores.round}/${tournamentLength}` : scores.round;
}
function updateScores(result) {
  if (result === 'win') scores.player += 1;
  if (result === 'lose') scores.cpu += 1;
  if (currentMode === 'cpu') saveCpuScores();
  renderScores();
}
function setButtonsEnabled(enabled) { choiceButtons.forEach((btn) => { btn.disabled = !enabled; }); }
function clearEffects() {
  playerHandEl.classList.remove('impact-win', 'impact-tie');
  cpuHandEl.classList.remove('impact-win', 'impact-tie');
  arenaEl.classList.remove('shake-fail');
}
function resetRoundState() {
  myChoice = null; opponentChoice = null; resolving = false; isPlaying = false;
  resultBannerEl.textContent = 'Choose your move';
  resultBannerEl.className = 'result-banner';
  commentaryText.textContent = '';
  commentaryText.className = 'commentary';
  playerEmojiEl.textContent = '✊'; cpuEmojiEl.textContent = '✊';
  clearEffects();
  setButtonsEnabled(true);
  startTimer();
}

// ---------- 7-second timer ----------
function startTimer() {
  stopTimer();
  roundStartTime = Date.now();
  timerTicks = TIMER_SECONDS * 10;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerTicks -= 1;
    updateTimerDisplay();
    if (timerTicks <= 0) { stopTimer(); handleChoiceClick('timeout'); }
  }, 100);
}
function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}
function updateTimerDisplay() {
  const secondsLeft = Math.max(0, Math.ceil(timerTicks / 10));
  timerText.textContent = secondsLeft + 's';
  timerFill.style.width = Math.max(0, (timerTicks / (TIMER_SECONDS * 10)) * 100) + '%';
  timerWrap.classList.toggle('urgent', secondsLeft <= 2);
}

// ---------- Streaks + commentary ----------
function resetMatchStats() {
  currentStreakType = null; currentStreakCount = 0;
  longestWinStreak = 0; longestLoseStreak = 0;
  decisionTimes = [];
}
function updateStreak(result) {
  if (result === currentStreakType) currentStreakCount += 1;
  else { currentStreakType = result; currentStreakCount = 1; }
  if (result === 'win') longestWinStreak = Math.max(longestWinStreak, currentStreakCount);
  if (result === 'lose') longestLoseStreak = Math.max(longestLoseStreak, currentStreakCount);
}
const WIN_COMMENTS = {
  2: ['Nice! Two in a row.', "You're finding your rhythm!"],
  3: ["You're on fire! 🔥", 'Incredible reads!'],
  4: ["Unstoppable! You're a genius at this! 🧠", 'Wow, amazing streak!']
};
const LOSE_COMMENTS = {
  2: ['Uh oh, two in a row.', 'Shake it off!'],
  3: ["Stay focused — you've got this.", 'The comeback starts now.'],
  4: ["Tough stretch... don't give up! 💪", 'Regroup and refocus.']
};
function pickComment(pool, streakCount) {
  const tier = Math.min(streakCount, 4);
  const options = pool[tier];
  return options ? options[Math.floor(Math.random() * options.length)] : '';
}
function showCommentary() {
  if (currentStreakType === 'win' && currentStreakCount >= 2) {
    commentaryText.textContent = pickComment(WIN_COMMENTS, currentStreakCount);
    commentaryText.className = 'commentary is-good';
  } else if (currentStreakType === 'lose' && currentStreakCount >= 2) {
    commentaryText.textContent = pickComment(LOSE_COMMENTS, currentStreakCount);
    commentaryText.className = 'commentary is-bad';
  } else {
    commentaryText.textContent = ''; commentaryText.className = 'commentary';
  }
}

// ---------- Playing a round ----------
function handleChoiceClick(choice) {
  if (isPlaying) return;
  if (currentMode === 'online' && (!conn || !conn.open)) return;

  stopTimer();
  if (roundStartTime != null) {
    decisionTimes.push(Math.min(TIMER_SECONDS, (Date.now() - roundStartTime) / 1000));
    roundStartTime = null;
  }

  isPlaying = true;
  scores.round += 1;
  if (currentMode === 'cpu') saveCpuScores();
  renderScores();

  setButtonsEnabled(false);
  clearEffects();
  resultBannerEl.textContent = choice === 'timeout' ? "Time's up!" : 'Rock... Paper... Scissors...';
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
function maybeResolveRound() {
  if (currentMode === 'online' && myChoice && opponentChoice && !resolving) {
    resolving = true;
    setTimeout(() => {
      finishRound(myChoice, opponentChoice);
      myChoice = null; opponentChoice = null; resolving = false;
    }, SHAKE_TIME);
  }
}
function finishRound(mine, theirs) {
  const result = getResult(mine, theirs);
  playerHandEl.classList.remove('shaking');
  cpuHandEl.classList.remove('shaking');
  playerEmojiEl.textContent = EMOJI[mine];
  cpuEmojiEl.textContent = EMOJI[theirs];

  applyResultEffects(result, mine, theirs);
  updateScores(result);
  updateStreak(result);
  showCommentary();

  setTimeout(() => {
    if (tournamentLength && scores.round >= tournamentLength) {
      endTournament();
    } else {
      setButtonsEnabled(true);
      isPlaying = false;
      startTimer();
    }
  }, 700);
}
function applyResultEffects(result, mine, theirs) {
  const label = currentMode === 'online' ? (opponentProfile?.name || 'Opponent') : 'CPU';
  if (result === 'win') {
    resultBannerEl.textContent = theirs === 'timeout' ? `${label} ran out of time — you win! 🎉` : 'You win the round! 🎉';
    resultBannerEl.classList.add('is-win');
    playerHandEl.classList.add('impact-win');
    spawnConfetti();
  } else if (result === 'lose') {
    resultBannerEl.textContent = mine === 'timeout' ? `Time's up! ${label} wins the round.` : `${label} wins the round.`;
    resultBannerEl.classList.add('is-lose');
    cpuHandEl.classList.add('impact-win');
    arenaEl.classList.add('shake-fail');
  } else {
    resultBannerEl.textContent = (mine === 'timeout' && theirs === 'timeout') ? "Both ran out of time — it's a tie!" : "It's a tie — go again!";
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

// ---------- Tournament summary ----------
function endTournament() {
  stopTimer();
  setButtonsEnabled(false);
  isPlaying = true;
  const opponentName = currentMode === 'online' ? (opponentProfile?.name || 'Opponent') : 'CPU';
  let winnerText;
  if (scores.player > scores.cpu) winnerText = `🏆 ${myProfile.name} Wins the Tournament!`;
  else if (scores.cpu > scores.player) winnerText = `🏆 ${opponentName} Wins the Tournament!`;
  else winnerText = "🤝 It's a Tie Tournament!";
  const avg = decisionTimes.length ? (decisionTimes.reduce((a, b) => a + b, 0) / decisionTimes.length).toFixed(1) : '0.0';
  summaryWinner.textContent = winnerText;
  summaryScore.textContent = `${scores.player} - ${scores.cpu}`;
  summaryRounds.textContent = scores.round;
  summaryWinStreak.textContent = longestWinStreak;
  summaryLoseStreak.textContent = longestLoseStreak;
  summaryAvgTime.textContent = `${avg}s`;
  showScreen('screen-summary');
}

// ---------- New Game / Play Again ----------
function resetMatchNow() {
  scores = { player: 0, cpu: 0, round: 0 };
  if (currentMode === 'cpu') saveCpuScores();
  resetMatchStats();
  renderScores();
  resetRoundState();
}
function requestNewGame() {
  if (currentMode === 'cpu') { resetMatchNow(); showScreen('screen-game'); return; }
  if (!conn || !conn.open) { showScreen('screen-mode'); return; }
  resetBtn.disabled = true;
  sendMessage({ type: 'reset-request' });
  resultBannerEl.textContent = `Waiting for ${opponentProfile?.name || 'your opponent'} to accept...`;
  resultBannerEl.className = 'result-banner';
}
function handleResetRequest() {
  const requesterName = opponentProfile?.name || 'Your opponent';
  const accepted = window.confirm(`${requesterName} wants to start a New Game (this resets the score). Accept?`);
  sendMessage({ type: 'reset-response', accepted });
  if (accepted) { resetMatchNow(); showScreen('screen-game'); }
}
function handleResetResponse(accepted) {
  resetBtn.disabled = false;
  if (accepted) {
    resetMatchNow();
    showScreen('screen-game');
  } else {
    window.alert(`${opponentProfile?.name || 'Your opponent'} declined the New Game request.`);
    if (document.getElementById('screen-game').classList.contains('active')) {
      resultBannerEl.textContent = `${opponentProfile?.name || 'Your opponent'} declined.`;
      resultBannerEl.className = 'result-banner';
    }
  }
}
resetBtn.addEventListener('click', requestNewGame);
playAgainBtn.addEventListener('click', requestNewGame);
summaryBackBtn.addEventListener('click', () => { stopTimer(); cleanupConnection(); showScreen('screen-mode'); });

// ---------- Choices + keyboard ----------
choiceButtons.forEach((btn) => btn.addEventListener('click', () => handleChoiceClick(btn.dataset.choice)));
window.addEventListener('keydown', (e) => {
  if (!document.getElementById('screen-game').classList.contains('active')) return;
  const map = { '1': 'rock', '2': 'paper', '3': 'scissors' };
  if (map[e.key]) handleChoiceClick(map[e.key]);
});

// ---------- Startup ----------
nameInput.value = myProfile.name;
renderAvatar(avatarPreview, myProfile.avatar);
markSelectedEmoji(myProfile.avatar);
showScreen(localStorage.getItem('rps-profile') ? 'screen-mode' : 'screen-profile');