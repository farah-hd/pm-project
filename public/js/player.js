/**
 * PM QUEST - Player Mobile Controller
 * Real-time student interface with independent timer and synchronized question buzzer.
 */

let myTeam = {
  id: null,
  name: '',
  avatar: 'adventurer',
  score: 0,
  rank: 1
};

let currentGameState = {
  currentView: 'lobby',
  currentAreaId: 1,
  unlockedAreas: [1],
  completedAreas: [],
  currentQuiz: null
};

let myAnswerSubmitted = false;
let mySelectedChoice = null;
let playerTimerInterval = null;
let playerHeartbeatInterval = null;
let currentQuizStartTime = null;
let currentQuizEndTime = null;
let eventSource = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  setupSoundToggle();
  checkExistingTeamSession();
  startPlayerHeartbeat();
});

// Sound Toggle
function setupSoundToggle() {
  const btn = document.getElementById('playerSoundBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const isMuted = soundFx.toggleMute();
      btn.textContent = isMuted ? '🔇' : '🔊';
    });
  }
}

// Stop player's local countdown timer
function stopPlayerTimer() {
  if (playerTimerInterval) {
    clearInterval(playerTimerInterval);
    playerTimerInterval = null;
  }
}

// Avatar Selector
function selectAvatar(avatar, element) {
  myTeam.avatar = avatar;
  document.querySelectorAll('.avatar-choice-btn').forEach(b => b.classList.remove('selected'));
  element.classList.add('selected');
  soundFx.click();
}

// Check if team already joined in this browser session
function checkExistingTeamSession() {
  const savedId = sessionStorage.getItem('pm_quest_team_id');
  const savedName = sessionStorage.getItem('pm_quest_team_name');
  const savedAvatar = sessionStorage.getItem('pm_quest_team_avatar');

  if (savedId && savedName) {
    myTeam.id = savedId;
    myTeam.name = savedName;
    myTeam.avatar = savedAvatar || 'adventurer';
    onTeamJoinedSuccess();
  }
}

// Handle Team Registration / Join
async function handlePlayerJoin(e) {
  e.preventDefault();
  const nameInput = document.getElementById('inputTeamName');
  const teamName = nameInput.value.trim();

  if (!teamName) return;

  soundFx.click();

  try {
    const res = await fetch('/api/player/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamName,
        avatar: myTeam.avatar,
        teamId: myTeam.id
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      myTeam.id = data.teamId;
      myTeam.name = data.team.name;
      myTeam.avatar = data.team.avatar;
      myTeam.score = data.team.score || 0;

      sessionStorage.setItem('pm_quest_team_id', myTeam.id);
      sessionStorage.setItem('pm_quest_team_name', myTeam.name);
      sessionStorage.setItem('pm_quest_team_avatar', myTeam.avatar);

      onTeamJoinedSuccess(data.gameState);
    } else {
      alert(data.error || 'Failed to join quest room.');
    }
  } catch (err) {
    console.error('Error joining game:', err);
    alert('⚠️ Server Connection Error!\n\nCould not connect to host. Make sure "node server.js" is running on the host PC and both devices are on the same network.');
  }
}

// After joining successfully
function onTeamJoinedSuccess(initialState = null) {
  document.getElementById('playerStatusBar').style.display = 'flex';
  document.getElementById('playerAvatarBadge').textContent = getAvatarEmoji(myTeam.avatar);
  document.getElementById('playerTeamNameBadge').textContent = myTeam.name;
  document.getElementById('playerScoreBadge').textContent = `${myTeam.score} PTS`;

  document.getElementById('waitingCardAvatar').textContent = getAvatarEmoji(myTeam.avatar);
  document.getElementById('waitingCardTeamName').textContent = myTeam.name;

  connectPlayerSSE();

  if (initialState && initialState.status === 'playing') {
    handleViewSync(initialState.currentView, initialState.currentAreaId);
  } else {
    switchPlayerView('playerViewWaiting');
  }

  soundFx.questStart();
}

// Connect to Server-Sent Events (SSE)
function connectPlayerSSE() {
  if (eventSource) eventSource.close();

  eventSource = new EventSource(`/api/stream?role=player&teamId=${encodeURIComponent(myTeam.id || '')}`);

  eventSource.addEventListener('init_state', (e) => {
    const state = JSON.parse(e.data);
    currentGameState = state;
    syncPlayerWithState(state);
  });

  eventSource.addEventListener('team_joined', (e) => {
    const data = JSON.parse(e.data);
    updatePlayerWaitingTeams(data.teams);
    updatePlayerRankFromLeaderboard(data.leaderboard);
  });

  eventSource.addEventListener('team_updated', (e) => {
    const data = JSON.parse(e.data);
    updatePlayerWaitingTeams(data.teams);
  });

  eventSource.addEventListener('game_started', (e) => {
    const data = JSON.parse(e.data);
    renderPlayerRoadmap();
    switchPlayerView('playerViewRoadmap');
    soundFx.questStart();
  });

  eventSource.addEventListener('view_changed', (e) => {
    const data = JSON.parse(e.data);
    currentGameState.currentView = data.currentView;
    currentGameState.currentAreaId = data.currentAreaId;
    currentGameState.unlockedAreas = data.unlockedAreas;
    currentGameState.completedAreas = data.completedAreas;
    handleViewSync(data.currentView, data.currentAreaId);
  });

  // Quiz Started - Individual timer starts automatically
  eventSource.addEventListener('quiz_started', (e) => {
    const data = JSON.parse(e.data);
    handlePlayerQuizStarted(data);
  });

  // Server clock tick
  eventSource.addEventListener('quiz_tick', (e) => {
    const data = JSON.parse(e.data);
    handlePlayerQuizTick(data.remainingSeconds);
  });

  // Question Results - Triggered automatically when timer reaches zero
  eventSource.addEventListener('quiz_results', (e) => {
    const data = JSON.parse(e.data);
    handlePlayerQuizResults(data);
  });

  // Other player submitted answer - DOES NOT AFFECT THIS PLAYER'S TIMER
  eventSource.addEventListener('answer_submitted', (e) => {
    // Other teams submitted
  });

  eventSource.addEventListener('checkpoint_unlocked', (e) => {
    const data = JSON.parse(e.data);
    stopPlayerTimer();
    currentGameState.completedAreas = data.completedAreas;
    currentGameState.unlockedAreas = data.unlockedAreas;
    currentGameState.currentAreaId = data.currentAreaId;
    renderPlayerRoadmap();
    switchPlayerView('playerViewRoadmap');
    soundFx.unlock();
  });

  eventSource.addEventListener('final_challenge_started', (e) => {
    const data = JSON.parse(e.data);
    renderPlayerFinalChallenge(data.finalChallenge || window.FINAL_CHALLENGE);
    switchPlayerView('playerViewFinal');
    soundFx.questStart();
  });

  eventSource.addEventListener('final_challenge_revealed', (e) => {
    const data = JSON.parse(e.data);
    handlePlayerFinalRevealed(data);
  });

  eventSource.addEventListener('game_ended', (e) => {
    const data = JSON.parse(e.data);
    handlePlayerGameEnded(data.leaderboard);
  });

  eventSource.addEventListener('game_reset', () => {
    stopPlayerTimer();
    sessionStorage.clear();
    location.reload();
  });
}

// Fallback Heartbeat for Mobile Phones (guards against background tab suspension)
function startPlayerHeartbeat() {
  if (playerHeartbeatInterval) clearInterval(playerHeartbeatInterval);
  playerHeartbeatInterval = setInterval(async () => {
    if (!myTeam.id) return; // Only if joined
    try {
      const res = await fetch('/api/game-state');
      if (res.ok) {
        const state = await res.json();
        // If server is on quiz and phone is not showing quiz view:
        if (state.currentView === 'quiz' && document.getElementById('playerViewQuiz').style.display === 'none') {
          if (state.currentQuiz && state.currentQuiz.active && !state.currentQuiz.closed) {
            handlePlayerQuizStarted({
              areaId: state.currentAreaId,
              durationSeconds: state.currentQuiz.remainingSeconds,
              startTime: state.currentQuiz.startTime,
              endTime: state.currentQuiz.endTime
            });
          }
        }
      }
    } catch (e) {
      // Offline or network switch
    }
  }, 2000);
}

// Synchronize state for existing/reconnecting players
function syncPlayerWithState(state) {
  if (state.teams && state.teams[myTeam.id]) {
    myTeam.score = state.teams[myTeam.id].score || 0;
    document.getElementById('playerScoreBadge').textContent = `${myTeam.score} PTS`;
  }

  if (state.leaderboard) {
    updatePlayerRankFromLeaderboard(state.leaderboard);
    renderPlayerLeaderboard(state.leaderboard);
  }

  updatePlayerWaitingTeams(state.teams);
  renderPlayerRoadmap();

  if (state.status === 'playing') {
    handleViewSync(state.currentView, state.currentAreaId);
  }
}

// Switch active view section on phone
function switchPlayerView(viewId) {
  const views = [
    'playerViewJoin',
    'playerViewWaiting',
    'playerViewRoadmap',
    'playerViewLearning',
    'playerViewQuiz',
    'playerViewLeaderboard',
    'playerViewFinal',
    'playerViewPodium'
  ];

  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === viewId) ? 'block' : 'none';
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Handle Host View Sync
function handleViewSync(view, areaId) {
  if (view === 'roadmap') {
    stopPlayerTimer();
    renderPlayerRoadmap();
    switchPlayerView('playerViewRoadmap');
  } else if (view === 'knowledge') {
    stopPlayerTimer();
    renderPlayerLearningArea(areaId);
    switchPlayerView('playerViewLearning');
  } else if (view === 'quiz') {
    switchPlayerView('playerViewQuiz');
  } else if (view === 'leaderboard') {
    stopPlayerTimer();
    switchPlayerView('playerViewLeaderboard');
  } else if (view === 'final_challenge') {
    renderPlayerFinalChallenge(window.FINAL_CHALLENGE);
    switchPlayerView('playerViewFinal');
  } else if (view === 'podium') {
    stopPlayerTimer();
    switchPlayerView('playerViewPodium');
  }
}

// Render waiting room co-players
function updatePlayerWaitingTeams(teams) {
  const listEl = document.getElementById('playerWaitingTeamsList');
  if (!listEl) return;

  const teamList = Object.values(teams || {});
  listEl.innerHTML = teamList.map(t => `
    <span class="retro-badge ${t.id === myTeam.id ? 'score-badge' : ''}" style="font-size: 13px;">
      ${getAvatarEmoji(t.avatar)} ${escapeHtml(t.name)}
    </span>
  `).join('');
}

// Render Roadmap on Player Phone
function renderPlayerRoadmap() {
  const grid = document.getElementById('playerRoadmapGrid');
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

    let badge = isCompleted ? '✅' : (isActive ? '🚩' : (isUnlocked ? '⭐' : '🔒'));

    return `
      <div class="${cardClass}">
        <div class="checkpoint-top-meta">
          <span class="checkpoint-number">AREA 0${area.id}</span>
          <span>${badge}</span>
        </div>
        <div class="checkpoint-role-badge">
          <span>${area.avatarIcon || '⚔️'}</span>
          <span>${escapeHtml(area.roleTitle)}</span>
        </div>
        <div class="checkpoint-title-text" style="font-size: 14px;">
          ${escapeHtml(area.title)}
        </div>
      </div>
    `;
  }).join('');
}

// Render Learning Content on Player Phone (EXACT SAME AS HOST)
function renderPlayerLearningArea(areaId) {
  const area = window.KNOWLEDGE_AREAS.find(a => a.id === areaId);
  if (!area) return;

  document.getElementById('playerLearnAvatar').textContent = area.avatarIcon || '🧩';
  document.getElementById('playerLearnAreaTitle').textContent = `${area.id}. ${area.title}`;
  document.getElementById('playerLearnRoleTitle').textContent = area.roleTitle;
  document.getElementById('playerLearnDefText').textContent = area.definition;

  const procGrid = document.getElementById('playerLearnProcessesGrid');
  procGrid.innerHTML = (area.processes || []).map(p => `
    <div class="process-card">
      <div class="process-header">
        <span class="process-number">${p.number}</span>
        <span class="process-name">${escapeHtml(p.name)}</span>
      </div>
      <div class="process-desc">${escapeHtml(p.description)}</div>
    </div>
  `).join('');

  document.getElementById('playerLearnReminderText').textContent = area.keyReminder;
}

// ==========================================================================
// INDEPENDENT QUIZ TIMER ENGINE FOR PLAYER
// ==========================================================================

function handlePlayerQuizStarted(data) {
  stopPlayerTimer();

  myAnswerSubmitted = false;
  mySelectedChoice = null;
  currentQuizStartTime = data.startTime || Date.now();
  currentQuizEndTime = data.endTime || (currentQuizStartTime + (data.durationSeconds || 20) * 1000);

  switchPlayerView('playerViewQuiz');

  const area = window.KNOWLEDGE_AREAS.find(a => a.id === data.areaId);
  if (!area) return;

  document.getElementById('playerQuizAreaTitle').textContent = `${area.id}. ${area.title}`;
  document.getElementById('playerQuizQuestionText').textContent = area.quiz.question;

  const timerBox = document.getElementById('playerTimerBox');
  const timerCount = document.getElementById('playerTimerCount');
  timerBox.classList.remove('hurry');
  timerCount.textContent = `${data.durationSeconds || 20}s`;

  const statusEl = document.getElementById('playerSubmitStatus');
  statusEl.textContent = 'Tap an option above to submit! Be fast for top points!';
  statusEl.style.background = '#fff';
  document.getElementById('playerResultCard').style.display = 'none';

  // Render clickable options
  const optGrid = document.getElementById('playerQuizOptions');
  const letters = ['A', 'B', 'C', 'D'];
  optGrid.innerHTML = area.quiz.options.map((opt, i) => `
    <button class="quiz-option-btn" id="playerOptBtn_${i}" onclick="submitAnswerChoice(${area.id}, ${i})">
      <span class="option-letter-badge">${letters[i]}</span>
      <span style="flex: 1; text-align: left;">${escapeHtml(opt)}</span>
    </button>
  `).join('');

  soundFx.questStart();

  // Start player's independent timer
  playerTimerInterval = setInterval(() => {
    if (myAnswerSubmitted) {
      return;
    }

    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((currentQuizEndTime - now) / 1000));

    if (timerCount) timerCount.textContent = `${remaining}s`;

    if (remaining <= 5 && remaining > 0) {
      timerBox.classList.add('hurry');
      soundFx.timerAlert();
    } else if (remaining > 5) {
      soundFx.tick();
    }

    if (remaining <= 0) {
      stopPlayerTimer();
      if (timerCount) timerCount.textContent = `0s [CLOSED]`;
      timerBox.classList.remove('hurry');
      lockAllPlayerOptions();

      if (!myAnswerSubmitted) {
        statusEl.textContent = "⌛ TIME'S UP! Question closed. Calculating results...";
        statusEl.style.background = '#fde8e8';
      }
    }
  }, 1000);
}

// Server tick sync: Only update if player hasn't submitted yet
function handlePlayerQuizTick(remaining) {
  if (myAnswerSubmitted) return;
  const countEl = document.getElementById('playerTimerCount');
  if (countEl && remaining > 0 && playerTimerInterval) {
    countEl.textContent = `${remaining}s`;
  }
}

function lockAllPlayerOptions() {
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`playerOptBtn_${i}`);
    if (btn) btn.disabled = true;
  }
}

// Player taps an option
async function submitAnswerChoice(areaId, choiceIndex) {
  if (myAnswerSubmitted) return;

  const now = Date.now();
  if (currentQuizEndTime && now >= currentQuizEndTime) {
    return;
  }

  myAnswerSubmitted = true;
  mySelectedChoice = choiceIndex;

  const remainingAtSubmit = Math.max(0, Math.ceil((currentQuizEndTime - now) / 1000));
  const timeTaken = ((now - currentQuizStartTime) / 1000).toFixed(1);

  // STOP timer for THIS player only!
  stopPlayerTimer();

  const timerCount = document.getElementById('playerTimerCount');
  const timerBox = document.getElementById('playerTimerBox');
  if (timerCount) timerCount.textContent = `${remainingAtSubmit}s [LOCKED]`;
  if (timerBox) timerBox.classList.remove('hurry');

  // Lock buttons on this phone and highlight chosen option
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`playerOptBtn_${i}`);
    if (btn) {
      btn.disabled = true;
      if (i === choiceIndex) {
        btn.classList.add('selected');
      }
    }
  }

  // Display waiting state until question timer reaches zero
  const statusEl = document.getElementById('playerSubmitStatus');
  statusEl.innerHTML = `✓ Answer locked in (${timeTaken}s)!<br><span style="color: var(--c-wood); font-size: 13px;">⏳ Waiting for other players and timer to finish...</span>`;
  statusEl.style.background = 'var(--c-latte)';
  soundFx.click();

  try {
    const res = await fetch('/api/player/submit-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId: myTeam.id,
        areaId,
        choiceIndex
      })
    });

    const data = await res.json();
    if (!res.ok) {
      statusEl.textContent = data.error || 'Submission error.';
    }
  } catch (err) {
    console.error('Error submitting answer:', err);
    statusEl.textContent = 'Network error while recording answer.';
  }
}

// Handle Question Results on Player Phone (Triggered automatically when timer hits zero)
function handlePlayerQuizResults(data) {
  stopPlayerTimer();
  lockAllPlayerOptions();

  const timerCount = document.getElementById('playerTimerCount');
  const timerBox = document.getElementById('playerTimerBox');
  if (timerCount) timerCount.textContent = '0s [LOCKED]';
  if (timerBox) timerBox.classList.remove('hurry');

  const statusEl = document.getElementById('playerSubmitStatus');
  statusEl.textContent = "Question complete! Here are the results:";
  statusEl.style.background = '#fff';

  // Highlight correct and incorrect options
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`playerOptBtn_${i}`);
    if (btn) {
      if (i === data.correctIndex) {
        btn.classList.add('correct');
      } else if (i === mySelectedChoice) {
        btn.classList.add('incorrect');
      }
    }
  }

  // Display result card
  const resultCard = document.getElementById('playerResultCard');
  const resultTitle = document.getElementById('playerResultTitle');
  const resultBody = document.getElementById('playerResultBody');
  const resultExp = document.getElementById('playerResultExplanation');

  resultCard.style.display = 'block';
  resultExp.textContent = data.explanation;

  const mySub = data.submissions ? data.submissions[myTeam.id] : null;

  if (mySub && mySub.isCorrect) {
    const points = mySub.pointsEarned || 0;
    const rankSuffix = mySub.speedRank === 1 ? '🥇 1st' : (mySub.speedRank === 2 ? '🥈 2nd' : (mySub.speedRank === 3 ? '🥉 3rd' : `#${mySub.speedRank}`));
    resultTitle.textContent = '🎉 CORRECT!';
    resultTitle.style.color = 'var(--c-green)';
    resultBody.textContent = `+${points} POINTS! (${rankSuffix} to answer in ${mySub.timeTaken || 0}s!)`;
    resultBody.style.color = 'var(--c-green)';
    soundFx.correct();
  } else if (mySub && !mySub.isCorrect) {
    resultTitle.textContent = '❌ INCORRECT!';
    resultTitle.style.color = 'var(--c-crimson)';
    resultBody.textContent = `+0 POINTS (Correct answer was Option ${data.correctLetter})`;
    resultBody.style.color = 'var(--c-crimson)';
    soundFx.wrong();
  } else {
    resultTitle.textContent = '⌛ TIME EXPIRED!';
    resultTitle.style.color = 'var(--c-crimson)';
    resultBody.textContent = `+0 POINTS (No answer submitted in time. Correct was Option ${data.correctLetter})`;
    resultBody.style.color = 'var(--c-crimson)';
    soundFx.wrong();
  }

  if (data.leaderboard) {
    updatePlayerRankFromLeaderboard(data.leaderboard);
    renderPlayerLeaderboard(data.leaderboard);
  }
}

// Update player rank & score
function updatePlayerRankFromLeaderboard(leaderboard) {
  if (!leaderboard) return;
  const me = leaderboard.find(t => t.id === myTeam.id);
  if (me) {
    myTeam.score = me.score;
    myTeam.rank = me.rank;
    document.getElementById('playerScoreBadge').textContent = `${me.score} PTS`;
    document.getElementById('playerRankNumber').textContent = `#${me.rank}`;
  }
}

// Render Leaderboard on Phone
function renderPlayerLeaderboard(leaderboard) {
  const listEl = document.getElementById('playerLeaderboardList');
  if (!listEl || !leaderboard) return;

  listEl.innerHTML = leaderboard.map(team => {
    const isMe = team.id === myTeam.id;
    let rankBadge = `${team.rank}`;
    if (team.rank === 1) rankBadge = '🥇';
    else if (team.rank === 2) rankBadge = '🥈';
    else if (team.rank === 3) rankBadge = '🥉';

    return `
      <div class="leaderboard-row rank-${team.rank}" style="${isMe ? 'border: 3px solid var(--c-crimson);' : ''}">
        <div class="lb-rank-badge">${rankBadge}</div>
        <div class="lb-team-info">
          <span style="font-size: 22px;">${getAvatarEmoji(team.avatar)}</span>
          <span class="lb-team-name">${escapeHtml(team.name)} ${isMe ? '(YOU)' : ''}</span>
        </div>
        <div class="lb-team-points">${team.score} PTS</div>
      </div>
    `;
  }).join('');
}

// Final Challenge on Phone
function renderPlayerFinalChallenge(challenge) {
  document.getElementById('playerFinalScenario').textContent = challenge.scenario;

  const cbContainer = document.getElementById('playerFinalCheckboxes');
  cbContainer.innerHTML = challenge.options.map(opt => `
    <label style="display: flex; align-items: center; gap: 10px; background: #fff; padding: 10px 14px; border: var(--border-dark); cursor: pointer;">
      <input type="checkbox" name="finalAreaOption" value="${opt.id}" style="width: 20px; height: 20px;">
      <span style="font-size: 14px; font-weight: 600;">${escapeHtml(opt.text)}</span>
    </label>
  `).join('');

  document.getElementById('btnSubmitFinal').disabled = false;
  document.getElementById('playerFinalStatus').textContent = '';
}

async function submitFinalChallengeAnswers() {
  const checked = Array.from(document.querySelectorAll('input[name="finalAreaOption"]:checked')).map(cb => Number(cb.value));

  if (checked.length === 0) {
    alert('Please select at least one Knowledge Area!');
    return;
  }

  soundFx.click();
  document.getElementById('btnSubmitFinal').disabled = true;
  document.getElementById('playerFinalStatus').textContent = '✓ Submitting choices...';

  try {
    const res = await fetch('/api/player/submit-final', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId: myTeam.id,
        selectedIds: checked
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      document.getElementById('playerFinalStatus').textContent = '✓ Submitted! Awaiting host reveal...';
    }
  } catch (err) {
    console.error('Failed to submit final answers:', err);
  }
}

function handlePlayerFinalRevealed(data) {
  const mySub = data.submissions ? data.submissions[myTeam.id] : null;
  const points = mySub ? (mySub.pointsEarned || 0) : 0;
  document.getElementById('playerFinalStatus').textContent = `🎉 Mission Complete! Bonus Earned: +${points} PTS!`;
  soundFx.fanfare();

  if (data.leaderboard) {
    updatePlayerRankFromLeaderboard(data.leaderboard);
  }
}

// Final Game Ended / Podium View
function handlePlayerGameEnded(leaderboard) {
  stopPlayerTimer();
  switchPlayerView('playerViewPodium');
  updatePlayerRankFromLeaderboard(leaderboard);

  const listEl = document.getElementById('playerPodiumRankings');
  if (listEl && leaderboard) {
    listEl.innerHTML = leaderboard.map(team => {
      const isMe = team.id === myTeam.id;
      return `
        <div class="leaderboard-row rank-${team.rank}" style="${isMe ? 'border: 3px solid var(--c-gold);' : ''}">
          <div class="lb-rank-badge">#${team.rank}</div>
          <div class="lb-team-info">
            <span style="font-size: 22px;">${getAvatarEmoji(team.avatar)}</span>
            <span class="lb-team-name">${escapeHtml(team.name)} ${isMe ? '(YOU)' : ''}</span>
          </div>
          <div class="lb-team-points">${team.score} PTS</div>
        </div>
      `;
    }).join('');
  }

  soundFx.fanfare();
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
