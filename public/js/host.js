/**
 * PM QUEST - Host Presenter Controller
 * Manages game progression, live QR joining, timed quizzes, and leaderboard.
 */

let currentGameState = {
  roomCode: 'PMQUEST',
  status: 'lobby',
  currentView: 'lobby',
  currentAreaId: 1,
  unlockedAreas: [1],
  completedAreas: [],
  teams: {},
  currentQuiz: {
    active: false,
    closed: false,
    revealed: false,
    remainingSeconds: 20
  }
};

let eventSource = null;
let currentNetworkInfo = null;
let hostTimerInterval = null;
let heartbeatInterval = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initNetworkAndQR();
  initEventStream();
  renderRoadmapGrid();
  setupSoundToggle();
  startFallbackHeartbeat();
});

// Sound toggle setup
function setupSoundToggle() {
  const btn = document.getElementById('soundToggleBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const isMuted = soundFx.toggleMute();
      btn.textContent = isMuted ? '🔇' : '🔊';
    });
  }
}

// Clear any active host countdown timer
function stopHostTimer() {
  if (hostTimerInterval) {
    clearInterval(hostTimerInterval);
    hostTimerInterval = null;
  }
}

// Update server connection status banner
function updateConnectionStatus(online) {
  const titleText = document.querySelector('.titlebar-left span:last-child');
  if (titleText) {
    if (online) {
      titleText.innerHTML = `PM_QUEST.EXE [HOST_CONSOLE] <span style="color: #68d391; font-size: 9px; margin-left: 6px;">● ONLINE</span>`;
    } else {
      titleText.innerHTML = `PM_QUEST.EXE [HOST_CONSOLE] <span style="color: #fc8181; font-size: 9px; margin-left: 6px;">● DISCONNECTED</span>`;
    }
  }
}

// Fetch network IP and generate QR Code (auto-detects Render HTTPS origin)
async function initNetworkAndQR() {
  try {
    const res = await fetch('/api/network-info');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    currentNetworkInfo = data;
    updateConnectionStatus(true);

    // If host is running on a public domain (e.g. Render HTTPS), use window.location.origin
    let playerUrl = data.playerUrl;
    if (window.location.hostname && !window.location.hostname.includes('localhost') && !window.location.hostname.startsWith('127.0.0.1')) {
      playerUrl = `${window.location.origin}/player`;
    }

    document.getElementById('roomCodeDisplay').textContent = data.roomCode;
    document.getElementById('qrUrlDisplay').textContent = playerUrl;

    const qrContainer = document.getElementById('qrContainer');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
      text: playerUrl,
      width: 190,
      height: 190,
      colorDark: '#2b1a12',
      colorLight: '#f4ece4',
      correctLevel: 'M'
    });
  } catch (err) {
    console.warn('Server offline or network info unreachable:', err);
    updateConnectionStatus(false);
    const fallbackUrl = `${window.location.origin}/player`;
    document.getElementById('qrUrlDisplay').textContent = fallbackUrl;
    new QRCode(document.getElementById('qrContainer'), {
      text: fallbackUrl,
      width: 190,
      height: 190
    });
  }
}

// Copy join link to clipboard
function copyJoinLink() {
  const url = document.getElementById('qrUrlDisplay').textContent;
  navigator.clipboard.writeText(url).then(() => {
    soundFx.click();
    alert('Player join link copied to clipboard: ' + url);
  });
}

// Open player tab for quick testing
function openPlayerTab() {
  soundFx.click();
  window.open('/player', '_blank');
}

// Connect to Server-Sent Events (SSE)
function initEventStream() {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource('/api/stream?role=host');

  eventSource.onopen = () => {
    updateConnectionStatus(true);
  };

  eventSource.onerror = () => {
    updateConnectionStatus(false);
  };

  eventSource.addEventListener('init_state', (e) => {
    const data = JSON.parse(e.data);
    currentGameState = data;
    syncFullState(data);
  });

  eventSource.addEventListener('team_joined', (e) => {
    const data = JSON.parse(e.data);
    currentGameState.teams = data.teams;
    updateTeamsList(data.teams);
    updateStatusBar();
    soundFx.click();
  });

  eventSource.addEventListener('team_updated', (e) => {
    const data = JSON.parse(e.data);
    currentGameState.teams = data.teams;
    updateTeamsList(data.teams);
    updateStatusBar();
  });

  eventSource.addEventListener('game_started', (e) => {
    const data = JSON.parse(e.data);
    currentGameState.status = data.status;
    currentGameState.currentView = data.currentView;
    switchView('viewRoadmap');
    updateStatusBar();
    soundFx.questStart();
  });

  eventSource.addEventListener('view_changed', (e) => {
    const data = JSON.parse(e.data);
    currentGameState.currentView = data.currentView;
    currentGameState.currentAreaId = data.currentAreaId;
    currentGameState.unlockedAreas = data.unlockedAreas;
    currentGameState.completedAreas = data.completedAreas;
    handleViewChange(data.currentView, data.currentAreaId);
  });

  // Quiz Started - Timer starts automatically
  eventSource.addEventListener('quiz_started', (e) => {
    const data = JSON.parse(e.data);
    currentGameState.currentQuiz.active = true;
    currentGameState.currentQuiz.closed = false;
    currentGameState.currentQuiz.revealed = false;
    currentGameState.currentQuiz.remainingSeconds = data.durationSeconds;
    handleQuizStarted(data);
  });

  // Quiz tick from server
  eventSource.addEventListener('quiz_tick', (e) => {
    const data = JSON.parse(e.data);
    handleQuizTick(data.remainingSeconds);
  });

  // Quiz results - Automatically triggered when timer reaches zero
  eventSource.addEventListener('quiz_results', (e) => {
    const data = JSON.parse(e.data);
    handleQuizResults(data);
  });

  // Answer submitted by a player - DOES NOT STOP THE TIMER
  eventSource.addEventListener('answer_submitted', (e) => {
    const data = JSON.parse(e.data);
    handleAnswerSubmitted(data);
  });

  eventSource.addEventListener('checkpoint_unlocked', (e) => {
    const data = JSON.parse(e.data);
    currentGameState.completedAreas = data.completedAreas;
    currentGameState.unlockedAreas = data.unlockedAreas;
    currentGameState.currentAreaId = data.currentAreaId;
    renderRoadmapGrid();
    switchView('viewRoadmap');
    soundFx.unlock();
  });

  eventSource.addEventListener('final_challenge_started', (e) => {
    const data = JSON.parse(e.data);
    renderFinalChallenge(data.finalChallenge || window.FINAL_CHALLENGE);
    switchView('viewFinalChallenge');
    soundFx.questStart();
  });

  eventSource.addEventListener('final_challenge_revealed', (e) => {
    const data = JSON.parse(e.data);
    handleFinalRevealed(data);
  });

  eventSource.addEventListener('game_ended', (e) => {
    const data = JSON.parse(e.data);
    handleGameEnded(data.leaderboard);
  });

  eventSource.addEventListener('game_reset', (e) => {
    stopHostTimer();
    confettiManager.stop();
    location.reload();
  });
}

// Fallback Heartbeat Sync (guarantees state sync even if network/SSE drops)
function startFallbackHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/game-state');
      if (res.ok) {
        updateConnectionStatus(true);
        const state = await res.json();
        // If state moved to quiz or changed and host hasn't updated:
        if (state.currentView !== currentGameState.currentView) {
          currentGameState.currentView = state.currentView;
          currentGameState.currentAreaId = state.currentAreaId;
          handleViewChange(state.currentView, state.currentAreaId);
        }
      } else {
        updateConnectionStatus(false);
      }
    } catch (err) {
      updateConnectionStatus(false);
    }
  }, 2500);
}

// Synchronize full game state on connection
function syncFullState(state) {
  currentGameState = state;
  updateTeamsList(state.teams);
  updateStatusBar();
  renderRoadmapGrid();

  if (state.leaderboard) {
    renderLeaderboard(state.leaderboard);
  }

  // Route to the appropriate view
  if (state.currentView === 'lobby') {
    switchView('viewLobby');
  } else if (state.currentView === 'roadmap') {
    switchView('viewRoadmap');
  } else if (state.currentView === 'knowledge') {
    loadLearningArea(state.currentAreaId);
    switchView('viewLearning');
  } else if (state.currentView === 'quiz') {
    loadQuizView(state.currentAreaId);
    switchView('viewQuiz');
    if (state.currentQuiz && state.currentQuiz.active && !state.currentQuiz.closed) {
      handleQuizStarted({
        areaId: state.currentAreaId,
        durationSeconds: state.currentQuiz.remainingSeconds,
        endTime: state.currentQuiz.endTime,
        question: window.KNOWLEDGE_AREAS.find(a => a.id === state.currentAreaId)?.quiz
      });
    }
  } else if (state.currentView === 'leaderboard') {
    switchView('viewLeaderboard');
  } else if (state.currentView === 'final_challenge') {
    renderFinalChallenge(window.FINAL_CHALLENGE);
    switchView('viewFinalChallenge');
  } else if (state.currentView === 'podium') {
    renderPodium(state.leaderboard || []);
    switchView('viewPodium');
  }
}

// Update Top Status Bar
function updateStatusBar() {
  const teamCount = Object.keys(currentGameState.teams || {}).length;
  document.getElementById('statusBarTeamsCount').textContent = teamCount;
  document.getElementById('statusBarCheckpoint').textContent = `${currentGameState.currentAreaId || 1} / 9`;
}

// Update Registered Teams List in Lobby
function updateTeamsList(teams) {
  const listEl = document.getElementById('lobbyTeamsList');
  const countBadge = document.getElementById('lobbyTeamCountBadge');
  const teamArray = Object.values(teams || {});

  countBadge.textContent = `${teamArray.length} JOINED`;

  if (teamArray.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; color: var(--c-gray); padding: 40px 10px; font-style: italic;">
        Waiting for teams to join... Scan the QR code to connect!
      </div>
    `;
    return;
  }

  listEl.innerHTML = teamArray.map(team => `
    <div class="team-chip">
      <div class="team-chip-info">
        <span class="team-avatar-icon">${getAvatarEmoji(team.avatar)}</span>
        <span class="team-chip-name">${escapeHtml(team.name)}</span>
      </div>
      <span class="team-chip-status">CONNECTED</span>
    </div>
  `).join('');
}

function getAvatarEmoji(avatar) {
  const emojis = {
    adventurer: '🧙‍♂️',
    knight: '⚔️',
    archer: '🏹',
    mage: '🔮',
    tactician: '📜',
    engineer: '⚙️',
    builder: '🧱',
    captain: '🧭'
  };
  return emojis[avatar] || '⚔️';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Switch Active View Section
function switchView(viewId) {
  const views = ['viewLobby', 'viewRoadmap', 'viewLearning', 'viewQuiz', 'viewLeaderboard', 'viewFinalChallenge', 'viewPodium'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === viewId) ? 'block' : 'none';
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Navigate Host View
async function hostNavigate(view, areaId = null) {
  soundFx.click();
  stopHostTimer();
  const payload = { view };
  if (areaId !== null) payload.areaId = areaId;

  // Immediate local optimistic switch
  if (view === 'roadmap') {
    renderRoadmapGrid();
    switchView('viewRoadmap');
  } else if (view === 'knowledge' && areaId !== null) {
    currentGameState.currentAreaId = Number(areaId);
    loadLearningArea(Number(areaId));
    switchView('viewLearning');
  } else if (view === 'leaderboard') {
    switchView('viewLeaderboard');
  }

  try {
    await fetch('/api/host/navigate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Failed to navigate view:', err);
  }
}

// Start Game from Lobby
async function startGame() {
  soundFx.questStart();
  try {
    const res = await fetch('/api/host/start-game', { method: 'POST' });
    if (res.ok) {
      switchView('viewRoadmap');
    }
  } catch (err) {
    console.error('Failed to start game:', err);
    alert('Server error: Make sure "node server.js" is running in your terminal!');
  }
}

// Render the 9 Checkpoints Roadmap
function renderRoadmapGrid() {
  const grid = document.getElementById('roadmapGrid');
  if (!grid || !window.KNOWLEDGE_AREAS) return;

  const unlocked = currentGameState.unlockedAreas || [1];
  const completed = currentGameState.completedAreas || [];
  const current = currentGameState.currentAreaId || 1;

  grid.innerHTML = window.KNOWLEDGE_AREAS.map(area => {
    const isCompleted = completed.includes(area.id);
    const isUnlocked = unlocked.includes(area.id);
    const isActive = (area.id === current) && isUnlocked;

    let cardClass = 'checkpoint-card ';
    if (isCompleted) cardClass += 'completed';
    else if (isActive) cardClass += 'active';
    else if (isUnlocked) cardClass += 'unlocked';
    else cardClass += 'locked';

    let statusBadge = '🔒';
    if (isCompleted) statusBadge = '✅';
    else if (isActive) statusBadge = '<span class="pulse-flag">🚩</span>';
    else if (isUnlocked) statusBadge = '⭐';

    return `
      <div class="${cardClass}" onclick="onRoadmapNodeClick(${area.id}, ${isUnlocked})">
        <div class="checkpoint-top-meta">
          <span class="checkpoint-number">AREA 0${area.id}</span>
          <span class="checkpoint-status-badge">${statusBadge}</span>
        </div>
        <div class="checkpoint-role-badge">
          <span>${area.avatarIcon || '⚔️'}</span>
          <span>${escapeHtml(area.roleTitle)}</span>
        </div>
        <div class="checkpoint-title-text">
          ${escapeHtml(area.title)}
        </div>
        <div class="checkpoint-btn-action">
          ${isUnlocked ? `
            <button class="btn-retro sm ${isActive ? 'crimson' : 'primary'}" style="width: 100%;">
              ${isCompleted ? '📖 REVIEW CONTENT' : (isActive ? '⚔️ CURRENT MISSION' : '📖 EXPLORE')}
            </button>
          ` : `
            <button class="btn-retro sm" disabled style="width: 100%;">
              🔒 LOCKED
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('roadmapProgressText').textContent = `${completed.length} / 9 Checkpoints Completed`;

  const finalBtn = document.getElementById('btnGoFinalChallenge');
  if (finalBtn) {
    finalBtn.style.display = completed.length >= 9 ? 'inline-flex' : 'none';
  }
}

function onRoadmapNodeClick(areaId, isUnlocked) {
  if (!isUnlocked) {
    soundFx.wrong();
    alert('This checkpoint is locked! Complete the previous knowledge areas first.');
    return;
  }
  soundFx.click();
  hostNavigate('knowledge', areaId);
}

// Load Learning View Content for Area
function loadLearningArea(areaId) {
  const area = window.KNOWLEDGE_AREAS.find(a => a.id === areaId);
  if (!area) return;

  document.getElementById('learnHeroAvatar').textContent = area.avatarIcon || '🧩';
  document.getElementById('learnAreaTitle').textContent = `${area.id}. ${area.title}`;
  document.getElementById('learnRoleTitle').textContent = area.roleTitle;
  document.getElementById('learnDefinitionText').textContent = area.definition;

  const procGrid = document.getElementById('learnProcessesGrid');
  procGrid.innerHTML = (area.processes || []).map(p => `
    <div class="process-card">
      <div class="process-header">
        <span class="process-number">${p.number}</span>
        <span class="process-name">${escapeHtml(p.name)}</span>
      </div>
      <div class="process-desc">${escapeHtml(p.description)}</div>
    </div>
  `).join('');

  document.getElementById('learnReminderText').textContent = area.keyReminder;
}

// Start Quiz for current area (Robust Direct & Broadcast Execution)
async function startCurrentQuiz() {
  soundFx.questStart();
  stopHostTimer(); // Reset any active timer

  try {
    const res = await fetch('/api/host/start-quiz', { method: 'POST' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    if (data && data.success) {
      currentGameState.currentQuiz.active = true;
      currentGameState.currentQuiz.closed = false;
      currentGameState.currentQuiz.revealed = false;
      currentGameState.currentQuiz.remainingSeconds = data.durationSeconds || 20;

      // Immediately switch host UI to the quiz view
      handleQuizStarted(data);
    }
  } catch (err) {
    console.error('Failed to start quiz:', err);
    alert('⚠️ Server Connection Error!\n\nThe PM Quest server is not currently running. Please open your terminal and run:\n\nnode server.js\n\nOr double-click start-game.bat in the project folder.');
  }
}

// Handle Quiz Started Event - Timer starts automatically & counts down accurately
function handleQuizStarted(data) {
  stopHostTimer(); // Prevent duplicate countdowns

  loadQuizView(data.areaId);
  switchView('viewQuiz');

  const timerBox = document.getElementById('quizTimerBox');
  const timerCount = document.getElementById('quizTimerCount');
  timerBox.classList.remove('hurry');
  timerCount.textContent = `${data.durationSeconds || 20}s`;

  // Hide results cards until timer reaches zero
  document.getElementById('quizStatsContainer').style.display = 'none';
  document.getElementById('quizExplanationCard').style.display = 'none';
  document.getElementById('btnNextArea').style.display = 'none';
  document.getElementById('btnQuizLeaderboard').style.display = 'none';

  updateSubmissionTracker(0, Object.keys(currentGameState.teams || {}).length);
  document.getElementById('quizStatusNotice').textContent = 'Timer counting down... players answering on phones!';
  soundFx.questStart();

  // Run accurate local countdown synchronized with server endTime
  const endTime = data.endTime || (Date.now() + (data.durationSeconds || 20) * 1000);

  hostTimerInterval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    timerCount.textContent = `${remaining}s`;

    if (remaining <= 5 && remaining > 0) {
      timerBox.classList.add('hurry');
      soundFx.timerAlert();
    } else if (remaining > 5) {
      soundFx.tick();
    }

    if (remaining <= 0) {
      stopHostTimer();
      timerCount.textContent = '0s [LOCKED]';
      timerBox.classList.remove('hurry');
      document.getElementById('quizStatusNotice').textContent = "Time's up! All answers locked. Calculating results...";
    }
  }, 1000);
}

// Load Quiz View
function loadQuizView(areaId) {
  const area = window.KNOWLEDGE_AREAS.find(a => a.id === areaId);
  if (!area) return;

  document.getElementById('quizAreaTitle').textContent = `${area.id}. ${area.title}`;
  document.getElementById('quizQuestionText').textContent = area.quiz.question;

  const optGrid = document.getElementById('quizOptionsGrid');
  const letters = ['A', 'B', 'C', 'D'];
  optGrid.innerHTML = area.quiz.options.map((opt, i) => `
    <div class="quiz-option-btn" id="hostOptionBtn_${i}">
      <span class="option-letter-badge">${letters[i]}</span>
      <span>${escapeHtml(opt)}</span>
    </div>
  `).join('');
}

// Handle server tick sync
function handleQuizTick(remaining) {
  const countEl = document.getElementById('quizTimerCount');
  if (countEl && remaining > 0 && hostTimerInterval) {
    countEl.textContent = `${remaining}s`;
  }
}

// Handle answer submission event - DOES NOT STOP THE TIMER
function handleAnswerSubmitted(data) {
  updateSubmissionTracker(data.submittedCount, data.totalTeams);
  const statusNotice = document.getElementById('quizStatusNotice');
  statusNotice.textContent = `⚡ ${escapeHtml(data.teamName)} answered in ${data.timeTaken}s (${data.submittedCount}/${data.totalTeams} in)`;
}

function updateSubmissionTracker(submitted, total) {
  document.getElementById('quizSubmissionsCount').textContent = `${submitted} / ${total} TEAMS`;
}

// Handle Question Results - Triggered automatically when timer reaches zero
function handleQuizResults(data) {
  stopHostTimer();

  const countEl = document.getElementById('quizTimerCount');
  const timerBox = document.getElementById('quizTimerBox');
  countEl.textContent = `0s [LOCKED]`;
  timerBox.classList.remove('hurry');

  document.getElementById('quizStatusNotice').textContent = "Time's up! Showing question results & breakdown:";

  // Highlight correct and incorrect options
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`hostOptionBtn_${i}`);
    if (btn) {
      if (i === data.correctIndex) {
        btn.classList.add('correct');
      } else {
        btn.classList.add('incorrect');
      }
    }
  }

  // Show breakdown statistics
  const statsBox = document.getElementById('quizStatsContainer');
  statsBox.style.display = 'block';

  const letters = ['A', 'B', 'C', 'D'];
  const counts = (data.stats && data.stats.choiceCounts) ? data.stats.choiceCounts : [0, 0, 0, 0];
  const breakdownEl = document.getElementById('quizChoiceBreakdown');
  breakdownEl.innerHTML = letters.map((l, i) => `
    <div style="background: ${i === data.correctIndex ? 'var(--c-green-light)' : '#f5f0eb'}; border: 2px solid ${i === data.correctIndex ? 'var(--c-green)' : 'var(--c-espresso)'}; padding: 8px;">
      <div style="font-family: var(--font-pixel); font-size: 11px; font-weight: bold; color: ${i === data.correctIndex ? 'var(--c-green)' : 'var(--c-wood)'};">OPTION ${l}</div>
      <div style="font-size: 18px; font-weight: 700; margin-top: 4px;">${counts[i]} teams</div>
    </div>
  `).join('');

  // Show fastest responder badge
  const fastestBadge = document.getElementById('quizFastestTeamBadge');
  if (data.stats && data.stats.fastest) {
    fastestBadge.textContent = `⚡ Fastest: ${data.stats.fastest.teamName} (${data.stats.fastest.timeTaken}s)`;
  } else {
    fastestBadge.textContent = '';
  }

  // Show explanation
  const expCard = document.getElementById('quizExplanationCard');
  expCard.style.display = 'block';
  document.getElementById('quizExplanationText').textContent = data.explanation;

  // Show Next Checkpoint and Leaderboard buttons for the host
  document.getElementById('btnNextArea').style.display = 'inline-flex';
  document.getElementById('btnQuizLeaderboard').style.display = 'inline-flex';

  if (data.leaderboard) {
    renderLeaderboard(data.leaderboard);
  }

  soundFx.correct();
}

// Unlock Next Area & Return to Roadmap (Controlled by Host)
async function unlockNextArea() {
  soundFx.click();
  stopHostTimer();
  try {
    await fetch('/api/host/unlock-next', { method: 'POST' });
  } catch (err) {
    console.error('Failed to unlock next area:', err);
  }
}

// Render Leaderboard
function renderLeaderboard(leaderboard) {
  const listEl = document.getElementById('leaderboardList');
  if (!listEl) return;

  if (!leaderboard || leaderboard.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; color: var(--c-gray); padding: 40px; font-style: italic;">
        No points awarded yet. Complete quizzes to climb the leaderboard!
      </div>
    `;
    return;
  }

  listEl.innerHTML = leaderboard.map(team => {
    let rankBadge = `${team.rank}`;
    let rankClass = `leaderboard-row rank-${team.rank}`;
    if (team.rank === 1) rankBadge = '🥇';
    else if (team.rank === 2) rankBadge = '🥈';
    else if (team.rank === 3) rankBadge = '🥉';

    return `
      <div class="${rankClass}">
        <div class="lb-rank-badge">${rankBadge}</div>
        <div class="lb-team-info">
          <span style="font-size: 24px;">${getAvatarEmoji(team.avatar)}</span>
          <span class="lb-team-name">${escapeHtml(team.name)}</span>
        </div>
        <div class="lb-team-points">
          <span>${team.score} PTS</span>
          <small style="color: var(--c-green); margin-left: 6px;">(+${team.lastPoints || 0})</small>
        </div>
      </div>
    `;
  }).join('');

  const completed = currentGameState.completedAreas || [];
  const podiumLaunchBtn = document.getElementById('btnPodiumLaunch');
  if (podiumLaunchBtn) {
    podiumLaunchBtn.style.display = completed.length >= 9 ? 'inline-flex' : 'none';
  }
}

// Resume Current Checkpoint from Leaderboard
function resumeCurrentCheckpoint() {
  soundFx.click();
  hostNavigate('knowledge', currentGameState.currentAreaId);
}

// Final Challenge Handlers
async function startFinalChallenge() {
  soundFx.questStart();
  try {
    await fetch('/api/host/start-final-challenge', { method: 'POST' });
  } catch (err) {
    console.error('Failed to start final challenge:', err);
  }
}

function renderFinalChallenge(challenge) {
  document.getElementById('finalTitle').textContent = challenge.title;
  document.getElementById('finalScenarioText').textContent = challenge.scenario;

  const optGrid = document.getElementById('finalOptionsDisplay');
  optGrid.innerHTML = challenge.options.map(opt => `
    <div class="process-card" id="finalOptCard_${opt.id}">
      <div class="process-header">
        <span class="process-number">✓</span>
        <span class="process-name">${escapeHtml(opt.text)}</span>
      </div>
    </div>
  `).join('');
}

async function revealFinalChallenge() {
  soundFx.click();
  try {
    await fetch('/api/host/reveal-final', { method: 'POST' });
  } catch (err) {
    console.error('Failed to reveal final challenge:', err);
  }
}

function handleFinalRevealed(data) {
  const card = document.getElementById('finalExplanationCard');
  card.style.display = 'block';
  document.getElementById('finalExplanationText').textContent = data.explanation;

  document.getElementById('btnRevealFinal').disabled = true;
  document.getElementById('btnFinalToPodium').style.display = 'inline-flex';
  soundFx.fanfare();
}

// Podium & Victory Celebration
async function showPodiumCelebration() {
  soundFx.fanfare();
  try {
    await fetch('/api/host/show-podium', { method: 'POST' });
  } catch (err) {
    console.error('Failed to show podium:', err);
  }
}

function handleGameEnded(leaderboard) {
  renderPodium(leaderboard);
  switchView('viewPodium');
  confettiManager.start(140);
  soundFx.fanfare();
}

function renderPodium(leaderboard) {
  const p1 = leaderboard[0] || { name: '---', score: 0 };
  const p2 = leaderboard[1] || { name: '---', score: 0 };
  const p3 = leaderboard[2] || { name: '---', score: 0 };

  document.getElementById('podium1Name').textContent = p1.name;
  document.getElementById('podium1Score').textContent = `${p1.score} PTS`;

  document.getElementById('podium2Name').textContent = p2.name;
  document.getElementById('podium2Score').textContent = `${p2.score} PTS`;

  document.getElementById('podium3Name').textContent = p3.name;
  document.getElementById('podium3Score').textContent = `${p3.score} PTS`;

  const fullList = document.getElementById('podiumFullList');
  fullList.innerHTML = leaderboard.map(team => `
    <div class="leaderboard-row rank-${team.rank}">
      <div class="lb-rank-badge">#${team.rank}</div>
      <div class="lb-team-info">
        <span style="font-size: 22px;">${getAvatarEmoji(team.avatar)}</span>
        <span class="lb-team-name">${escapeHtml(team.name)}</span>
      </div>
      <div class="lb-team-points">${team.score} PTS</div>
    </div>
  `).join('');
}

// Reset Game
function resetGamePrompt() {
  if (confirm('Are you sure you want to reset the quest and clear all registered teams?')) {
    soundFx.click();
    stopHostTimer();
    fetch('/api/host/reset-game', { method: 'POST' }).then(() => {
      location.reload();
    });
  }
}

// Handle generic view transitions from server SSE
function handleViewChange(view, areaId) {
  if (view === 'roadmap') {
    renderRoadmapGrid();
    switchView('viewRoadmap');
  } else if (view === 'knowledge') {
    loadLearningArea(areaId);
    switchView('viewLearning');
  } else if (view === 'leaderboard') {
    renderLeaderboard(calculateClientLeaderboard());
    switchView('viewLeaderboard');
  } else if (view === 'final_challenge') {
    renderFinalChallenge(window.FINAL_CHALLENGE);
    switchView('viewFinalChallenge');
  } else if (view === 'podium') {
    renderPodium(calculateClientLeaderboard());
    switchView('viewPodium');
  }
}

function calculateClientLeaderboard() {
  return Object.values(currentGameState.teams || {})
    .sort((a, b) => b.score - a.score)
    .map((t, i) => ({ ...t, rank: i + 1 }));
}
