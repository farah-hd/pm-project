/**
 * PM QUEST - Real-Time Server
 * Built with native Node.js (Zero external dependencies).
 * Features Server-Sent Events (SSE) for sub-millisecond multiplayer sync.
 * Fully compatible with Render, cloud HTTPS reverse proxies, and local offline Wi-Fi.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');
const { KNOWLEDGE_AREAS, FINAL_CHALLENGE } = require('./data/knowledgeData');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

// Helper to detect LAN IPv4 address dynamically on every call
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

// Helper to determine the public base URL (Render HTTPS vs Local IP)
function getBaseUrl(req) {
  // 1. Explicit environment variable set on Render (e.g., PUBLIC_URL=https://pm-quest.onrender.com)
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.replace(/\/$/, '');
  }

  // 2. Inspect reverse proxy headers from Render (x-forwarded-proto, x-forwarded-host)
  if (req && req.headers) {
    const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
    const forwardedProto = req.headers['x-forwarded-proto'];

    if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.startsWith('127.0.0.1')) {
      const proto = forwardedProto || 'https';
      return `${proto}://${forwardedHost}`;
    }
  }

  // 3. Fallback to detected local LAN IP for offline Wi-Fi / hotspot
  const localIp = getLocalNetworkIp();
  return `http://${localIp}:${PORT}`;
}

// Global Game State
const gameState = {
  roomCode: 'PMQUEST',
  status: 'lobby', // 'lobby' | 'playing' | 'ended'
  currentView: 'lobby', // 'lobby' | 'roadmap' | 'knowledge' | 'quiz' | 'leaderboard' | 'final_challenge' | 'podium'
  currentAreaId: 1,
  unlockedAreas: [1],
  completedAreas: [],
  teams: {}, // { [teamId]: { id, name, avatar, score, correctCount, connected: true, lastPoints: 0 } }
  currentQuiz: {
    areaId: 1,
    active: false,
    closed: false,
    revealed: false,
    startTime: null,
    endTime: null,
    durationSeconds: 20,
    remainingSeconds: 20,
    submissions: {} // { [teamId]: { choiceIndex, timestamp, timeTaken, isCorrect, pointsEarned, speedRank } }
  },
  finalChallenge: {
    active: false,
    closed: false,
    revealed: false,
    submissions: {} // { [teamId]: { selectedIds, pointsEarned } }
  }
};

let quizTimerInterval = null;
const sseClients = new Set(); // Set of { res, role, teamId }

// SSE Keep-Alive Ping every 20 seconds (prevents Render reverse proxy timeout)
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.res.write(': keep-alive\n\n');
    } catch (err) {
      // client dropped, will be removed on close
    }
  }
}, 20000);

// Broadcast SSE event to all connected clients
function broadcastEvent(eventName, payload) {
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(data);
    } catch (err) {
      console.error('Error writing to client SSE:', err);
    }
  }
}

// Send SSE event to a specific client
function sendEventToClient(clientRes, eventName, payload) {
  try {
    clientRes.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
  } catch (err) {
    console.error('Error sending targeted SSE:', err);
  }
}

// Calculate team rankings
function calculateLeaderboard() {
  const list = Object.values(gameState.teams).map(t => ({
    id: t.id,
    name: t.name,
    avatar: t.avatar,
    score: t.score,
    correctCount: t.correctCount,
    lastPoints: t.lastPoints || 0
  }));

  list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.correctCount - a.correctCount;
  });

  return list.map((team, index) => ({
    ...team,
    rank: index + 1
  }));
}

// Stop any running quiz timer
function clearQuizTimer() {
  if (quizTimerInterval) {
    clearInterval(quizTimerInterval);
    quizTimerInterval = null;
  }
}

// Compute question statistics and score submissions
function scoreAndAnalyzeSubmissions(areaId) {
  const area = KNOWLEDGE_AREAS.find(a => a.id === areaId);
  if (!area) return { stats: {}, leaderboard: [] };

  const correctIndex = area.quiz.correctIndex;
  const submissions = Object.entries(gameState.currentQuiz.submissions);

  // Filter correct answers and sort by timestamp ascending
  const correctSubmissions = submissions
    .filter(([_, sub]) => sub.choiceIndex === correctIndex)
    .sort((a, b) => a[1].timestamp - b[1].timestamp);

  const speedPoints = [100, 80, 60, 40];

  correctSubmissions.forEach(([teamId, sub], idx) => {
    const points = idx < speedPoints.length ? speedPoints[idx] : 20;
    sub.isCorrect = true;
    sub.speedRank = idx + 1;
    sub.pointsEarned = points;

    if (gameState.teams[teamId]) {
      gameState.teams[teamId].score += points;
      gameState.teams[teamId].correctCount += 1;
      gameState.teams[teamId].lastPoints = points;
    }
  });

  // Handle incorrect submissions
  submissions.forEach(([teamId, sub]) => {
    if (sub.choiceIndex !== correctIndex) {
      sub.isCorrect = false;
      sub.speedRank = null;
      sub.pointsEarned = 0;
      if (gameState.teams[teamId]) {
        gameState.teams[teamId].lastPoints = 0;
      }
    }
  });

  // Check for any registered teams that did not submit
  Object.keys(gameState.teams).forEach(teamId => {
    if (!gameState.currentQuiz.submissions[teamId]) {
      gameState.teams[teamId].lastPoints = 0;
    }
  });

  // Statistics
  const choiceCounts = [0, 0, 0, 0];
  submissions.forEach(([_, sub]) => {
    if (sub.choiceIndex >= 0 && sub.choiceIndex < 4) {
      choiceCounts[sub.choiceIndex]++;
    }
  });

  const fastest = correctSubmissions.length > 0 ? {
    teamName: gameState.teams[correctSubmissions[0][0]]?.name || 'Unknown',
    timeTaken: correctSubmissions[0][1].timeTaken
  } : null;

  const stats = {
    totalSubmissions: submissions.length,
    totalTeams: Object.keys(gameState.teams).length,
    correctCount: correctSubmissions.length,
    incorrectCount: submissions.length - correctSubmissions.length,
    unansweredCount: Math.max(0, Object.keys(gameState.teams).length - submissions.length),
    choiceCounts,
    fastest
  };

  const leaderboard = calculateLeaderboard();
  return { stats, leaderboard };
}

// Automatically close quiz and broadcast results
function finishAndRevealQuiz() {
  clearQuizTimer();
  gameState.currentQuiz.active = false;
  gameState.currentQuiz.closed = true;
  gameState.currentQuiz.revealed = true;
  gameState.currentQuiz.remainingSeconds = 0;

  const area = KNOWLEDGE_AREAS.find(a => a.id === gameState.currentAreaId);
  const { stats, leaderboard } = scoreAndAnalyzeSubmissions(gameState.currentAreaId);

  // Broadcast results automatically to all players and host
  broadcastEvent('quiz_results', {
    areaId: gameState.currentAreaId,
    correctIndex: area.quiz.correctIndex,
    correctLetter: area.quiz.correctLetter,
    explanation: area.quiz.explanation,
    submissions: gameState.currentQuiz.submissions,
    stats,
    leaderboard
  });
}

// Start synchronized 20s quiz countdown on server
function startQuizTimer(duration = 20) {
  clearQuizTimer();

  const startTime = Date.now();
  const endTime = startTime + duration * 1000;

  gameState.currentQuiz.areaId = gameState.currentAreaId;
  gameState.currentQuiz.active = true;
  gameState.currentQuiz.closed = false;
  gameState.currentQuiz.revealed = false;
  gameState.currentQuiz.durationSeconds = duration;
  gameState.currentQuiz.remainingSeconds = duration;
  gameState.currentQuiz.startTime = startTime;
  gameState.currentQuiz.endTime = endTime;
  gameState.currentQuiz.submissions = {};

  const currentArea = KNOWLEDGE_AREAS.find(a => a.id === gameState.currentAreaId);

  broadcastEvent('quiz_started', {
    areaId: gameState.currentAreaId,
    durationSeconds: duration,
    startTime,
    endTime,
    question: currentArea.quiz
  });

  // Server countdown interval
  quizTimerInterval = setInterval(() => {
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
    gameState.currentQuiz.remainingSeconds = remaining;

    broadcastEvent('quiz_tick', {
      remainingSeconds: remaining,
      endTime
    });

    if (remaining <= 0) {
      finishAndRevealQuiz();
    }
  }, 1000);
}

// Helper to parse JSON request body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) req.connection.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint for Render monitoring
  if (pathname === '/healthz' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  // --- SSE STREAM ENDPOINT ---
  if (pathname === '/api/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Instructs Render / Nginx reverse proxy NOT to buffer chunks
    });
    res.write(': connected\n\n');

    const client = {
      res,
      role: parsedUrl.query.role || 'player',
      teamId: parsedUrl.query.teamId || null
    };

    sseClients.add(client);

    // If a team connected, mark as connected
    if (client.teamId && gameState.teams[client.teamId]) {
      gameState.teams[client.teamId].connected = true;
      broadcastEvent('team_updated', { teams: gameState.teams });
    }

    // Send initial snapshot to this client
    sendEventToClient(res, 'init_state', {
      ...gameState,
      serverTime: Date.now(),
      leaderboard: calculateLeaderboard(),
      knowledgeAreas: KNOWLEDGE_AREAS,
      finalChallenge: FINAL_CHALLENGE
    });

    req.on('close', () => {
      sseClients.delete(client);
    });
    return;
  }

  // --- API ROUTES ---

  // Dynamic Network Info (Returns Render public URL or local LAN IP)
  if (pathname === '/api/network-info' && req.method === 'GET') {
    const baseUrl = getBaseUrl(req);
    const localIp = getLocalNetworkIp();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      baseUrl,
      localIp,
      port: PORT,
      roomCode: gameState.roomCode,
      playerUrl: `${baseUrl}/player`,
      hostUrl: `${baseUrl}/host`
    }));
    return;
  }

  // Full Game State
  if (pathname === '/api/game-state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ...gameState,
      serverTime: Date.now(),
      leaderboard: calculateLeaderboard(),
      knowledgeAreas: KNOWLEDGE_AREAS,
      finalChallenge: FINAL_CHALLENGE
    }));
    return;
  }

  // Host: Reset/Create Game
  if (pathname === '/api/host/reset-game' && req.method === 'POST') {
    clearQuizTimer();
    gameState.status = 'lobby';
    gameState.currentView = 'lobby';
    gameState.currentAreaId = 1;
    gameState.unlockedAreas = [1];
    gameState.completedAreas = [];
    gameState.teams = {};
    gameState.currentQuiz = {
      areaId: 1,
      active: false,
      closed: false,
      revealed: false,
      startTime: null,
      endTime: null,
      durationSeconds: 20,
      remainingSeconds: 20,
      submissions: {}
    };
    gameState.finalChallenge = {
      active: false,
      closed: false,
      revealed: false,
      submissions: {}
    };

    broadcastEvent('game_reset', { ...gameState, leaderboard: [] });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Host: Start Game (leave waiting room)
  if (pathname === '/api/host/start-game' && req.method === 'POST') {
    gameState.status = 'playing';
    gameState.currentView = 'roadmap';
    broadcastEvent('game_started', {
      status: gameState.status,
      currentView: gameState.currentView,
      unlockedAreas: gameState.unlockedAreas
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Host: Navigate View
  if (pathname === '/api/host/navigate' && req.method === 'POST') {
    try {
      const data = await parseRequestBody(req);
      if (data.view) gameState.currentView = data.view;
      if (data.areaId) gameState.currentAreaId = Number(data.areaId);

      broadcastEvent('view_changed', {
        currentView: gameState.currentView,
        currentAreaId: gameState.currentAreaId,
        unlockedAreas: gameState.unlockedAreas,
        completedAreas: gameState.completedAreas
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Host: Start Quiz (Launches quiz & returns full question payload directly)
  if (pathname === '/api/host/start-quiz' && req.method === 'POST') {
    gameState.currentView = 'quiz';
    startQuizTimer(20);
    const currentArea = KNOWLEDGE_AREAS.find(a => a.id === gameState.currentAreaId);

    broadcastEvent('view_changed', {
      currentView: gameState.currentView,
      currentAreaId: gameState.currentAreaId,
      unlockedAreas: gameState.unlockedAreas,
      completedAreas: gameState.completedAreas
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      areaId: gameState.currentAreaId,
      durationSeconds: 20,
      startTime: gameState.currentQuiz.startTime,
      endTime: gameState.currentQuiz.endTime,
      question: currentArea ? currentArea.quiz : null
    }));
    return;
  }

  // Host: Manual Reveal Answer
  if (pathname === '/api/host/reveal-answer' && req.method === 'POST') {
    finishAndRevealQuiz();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, leaderboard: calculateLeaderboard() }));
    return;
  }

  // Host: Unlock Next Checkpoint
  if (pathname === '/api/host/unlock-next' && req.method === 'POST') {
    const cur = gameState.currentAreaId;
    if (!gameState.completedAreas.includes(cur)) {
      gameState.completedAreas.push(cur);
    }
    const nextArea = cur + 1;
    if (nextArea <= 9 && !gameState.unlockedAreas.includes(nextArea)) {
      gameState.unlockedAreas.push(nextArea);
      gameState.currentAreaId = nextArea;
    }
    gameState.currentView = 'roadmap';

    broadcastEvent('checkpoint_unlocked', {
      completedAreas: gameState.completedAreas,
      unlockedAreas: gameState.unlockedAreas,
      currentAreaId: gameState.currentAreaId,
      currentView: gameState.currentView
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Host: Start Final Challenge
  if (pathname === '/api/host/start-final-challenge' && req.method === 'POST') {
    gameState.currentView = 'final_challenge';
    gameState.finalChallenge.active = true;
    gameState.finalChallenge.closed = false;
    gameState.finalChallenge.revealed = false;
    gameState.finalChallenge.submissions = {};

    broadcastEvent('final_challenge_started', {
      finalChallenge: FINAL_CHALLENGE
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Host: Reveal Final Challenge
  if (pathname === '/api/host/reveal-final' && req.method === 'POST') {
    gameState.finalChallenge.active = false;
    gameState.finalChallenge.closed = true;
    gameState.finalChallenge.revealed = true;

    const bonus = FINAL_CHALLENGE.bonusPoints || 150;
    Object.entries(gameState.finalChallenge.submissions).forEach(([teamId, sub]) => {
      const selected = sub.selectedIds || [];
      const correctSelected = selected.filter(id => [1, 2, 3, 4, 7, 8, 9].includes(id));
      const points = Math.min(bonus, correctSelected.length * 25);
      sub.pointsEarned = points;
      if (gameState.teams[teamId]) {
        gameState.teams[teamId].score += points;
        gameState.teams[teamId].lastPoints = points;
      }
    });

    const leaderboard = calculateLeaderboard();
    broadcastEvent('final_challenge_revealed', {
      explanation: FINAL_CHALLENGE.explanation,
      submissions: gameState.finalChallenge.submissions,
      leaderboard
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, leaderboard }));
    return;
  }

  // Host: Finish Game & Show Podium
  if (pathname === '/api/host/show-podium' && req.method === 'POST') {
    gameState.status = 'ended';
    gameState.currentView = 'podium';
    const leaderboard = calculateLeaderboard();

    broadcastEvent('game_ended', {
      leaderboard,
      currentView: 'podium'
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, leaderboard }));
    return;
  }

  // Player: Join Waiting Room
  if (pathname === '/api/player/join' && req.method === 'POST') {
    try {
      const data = await parseRequestBody(req);
      const teamName = (data.teamName || '').trim();
      const avatar = data.avatar || 'adventurer';

      if (!teamName) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Team name is required.' }));
        return;
      }

      let teamId = data.teamId;
      if (!teamId) {
        teamId = 'team_' + Math.random().toString(36).substring(2, 9);
      }

      if (!gameState.teams[teamId]) {
        const duplicate = Object.values(gameState.teams).find(
          t => t.name.toLowerCase() === teamName.toLowerCase() && t.id !== teamId
        );
        if (duplicate) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'That team name is already taken! Please choose another.' }));
          return;
        }

        gameState.teams[teamId] = {
          id: teamId,
          name: teamName,
          avatar: avatar,
          score: 0,
          correctCount: 0,
          lastPoints: 0,
          connected: true
        };
      } else {
        gameState.teams[teamId].name = teamName;
        gameState.teams[teamId].avatar = avatar;
        gameState.teams[teamId].connected = true;
      }

      broadcastEvent('team_joined', {
        team: gameState.teams[teamId],
        teams: gameState.teams,
        leaderboard: calculateLeaderboard()
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        teamId,
        team: gameState.teams[teamId],
        gameState: {
          status: gameState.status,
          currentView: gameState.currentView,
          currentAreaId: gameState.currentAreaId,
          unlockedAreas: gameState.unlockedAreas,
          completedAreas: gameState.completedAreas
        }
      }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Player: Submit Quiz Answer
  if (pathname === '/api/player/submit-answer' && req.method === 'POST') {
    try {
      const data = await parseRequestBody(req);
      const { teamId, areaId, choiceIndex } = data;

      if (!teamId || !gameState.teams[teamId]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid or unregistered team.' }));
        return;
      }

      if (!gameState.currentQuiz.active || gameState.currentQuiz.closed) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Quiz is currently closed or time has expired.' }));
        return;
      }

      if (Number(areaId) !== gameState.currentAreaId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Question mismatch.' }));
        return;
      }

      if (gameState.currentQuiz.submissions[teamId]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Your team has already submitted an answer!' }));
        return;
      }

      const timestamp = Date.now();
      const timeTaken = ((timestamp - gameState.currentQuiz.startTime) / 1000).toFixed(1);

      gameState.currentQuiz.submissions[teamId] = {
        choiceIndex: Number(choiceIndex),
        timestamp,
        timeTaken,
        isCorrect: null,
        speedRank: null,
        pointsEarned: 0
      };

      const submittedCount = Object.keys(gameState.currentQuiz.submissions).length;
      const totalTeams = Object.keys(gameState.teams).length;

      broadcastEvent('answer_submitted', {
        teamId,
        teamName: gameState.teams[teamId].name,
        submittedCount,
        totalTeams,
        timeTaken
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        submittedCount,
        totalTeams,
        timeTaken
      }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Player: Submit Final Challenge
  if (pathname === '/api/player/submit-final' && req.method === 'POST') {
    try {
      const data = await parseRequestBody(req);
      const { teamId, selectedIds } = data;

      if (!teamId || !gameState.teams[teamId]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid team.' }));
        return;
      }

      gameState.finalChallenge.submissions[teamId] = {
        selectedIds: Array.isArray(selectedIds) ? selectedIds : [],
        timestamp: Date.now()
      };

      const submittedCount = Object.keys(gameState.finalChallenge.submissions).length;
      const totalTeams = Object.keys(gameState.teams).length;

      broadcastEvent('final_submitted', {
        teamId,
        submittedCount,
        totalTeams
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, submittedCount, totalTeams }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // --- STATIC ASSET SERVING ---
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  if (pathname === '/host') {
    filePath = path.join(PUBLIC_DIR, 'host.html');
  } else if (pathname === '/player') {
    filePath = path.join(PUBLIC_DIR, 'player.html');
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1><p>PM QUEST asset not found.</p>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Handle uncaught errors gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`);
  } else {
    console.error('Server error:', err);
  }
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalNetworkIp();
  console.log(`\n======================================================`);
  console.log(`⚔️  PM QUEST – The Project Management Challenge`);
  console.log(`======================================================`);
  console.log(`🎮 Server running on Port ${PORT}`);
  console.log(`\n📺 HOST (Presenter Screen):`);
  console.log(`   http://localhost:${PORT}/host`);
  console.log(`   http://${localIp}:${PORT}/host`);
  console.log(`\n📱 PLAYERS (Classmates scan / join here):`);
  console.log(`   http://${localIp}:${PORT}/player`);
  if (process.env.PUBLIC_URL) {
    console.log(`\n🌐 PUBLIC CLOUD URL (Render):`);
    console.log(`   ${process.env.PUBLIC_URL}/host`);
    console.log(`   ${process.env.PUBLIC_URL}/player`);
  }
  console.log(`======================================================\n`);
});
