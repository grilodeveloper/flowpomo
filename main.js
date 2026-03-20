// ── Quotes ──────────────────────────────────────────────
const QUOTES = [
  "A disciplina é a ponte entre metas e realizações.",
  "Foco no processo, não no resultado.",
  "Cada sessão concluída é uma vitória.",
  "A concentração é a raiz de toda habilidade.",
  "Pequenos passos, grandes conquistas.",
  "O sucesso é a soma de pequenos esforços repetidos.",
  "Feito é melhor que perfeito.",
  "A persistência realiza o impossível.",
  "Um passo de cada vez — mas nunca pare.",
  "Você já chegou mais longe do que imagina.",
  "Disciplina é escolher entre o que você quer agora e o que você mais quer.",
  "O segredo é começar. Depois, é só continuar.",
  "Dificuldades fortalecem a mente, assim como o trabalho fortalece o corpo.",
  "Não é sobre ter tempo, é sobre fazer tempo.",
  "O foco de hoje é a conquista de amanhã.",
];

// ── Config (persisted) ───────────────────────────────────
let config = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  dailyGoal: 6,
  sound: "beep",
  ambient: "off",
};

// ── State ───────────────────────────────────────────────
let phase           = "focus";
let sessionsDone    = 0;
let cycle           = 1;
let timeLeft        = config.focusMin * 60;
let currentPhaseDur = config.focusMin * 60;
let focusSeconds    = 0;
let todaySessions   = 0;
let streak          = 0;
let running         = false;
let ticker          = null;

// YouTube
let ytPlayer     = null;
let ytReady      = false;
let audioPlaying = false;

// Ambient
let ambCtx    = null;
let ambSource = null;

// ── Persist helpers ──────────────────────────────────────
function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function loadConfig() {
  const s = localStorage.getItem("fp_config");
  if (s) Object.assign(config, JSON.parse(s));
  document.getElementById("cfg-focus").value   = config.focusMin;
  document.getElementById("cfg-short").value   = config.shortMin;
  document.getElementById("cfg-long").value    = config.longMin;
  document.getElementById("cfg-goal").value    = config.dailyGoal;
  document.getElementById("cfg-sound").value   = config.sound;
  document.getElementById("cfg-ambient").value = config.ambient;
  timeLeft = currentPhaseDur = config.focusMin * 60;
}

function applyConfig() {
  config.focusMin  = parseInt(document.getElementById("cfg-focus").value)   || 25;
  config.shortMin  = parseInt(document.getElementById("cfg-short").value)   || 5;
  config.longMin   = parseInt(document.getElementById("cfg-long").value)    || 15;
  config.dailyGoal = parseInt(document.getElementById("cfg-goal").value)    || 6;
  config.sound     = document.getElementById("cfg-sound").value;
  config.ambient   = document.getElementById("cfg-ambient").value;
  localStorage.setItem("fp_config", JSON.stringify(config));
  if (!running) {
    timeLeft = currentPhaseDur = phaseDuration();
    renderTimer();
    renderProgress();
  }
  renderGoal();
}

function phaseDuration(p = phase) {
  if (p === "focus") return config.focusMin * 60;
  if (p === "short") return config.shortMin * 60;
  return config.longMin * 60;
}

function loadHistory() {
  const h = JSON.parse(localStorage.getItem("fp_history") || "{}");
  todaySessions = h[getToday()] || 0;
  streak = computeStreak(h);
}

function saveSession() {
  const h = JSON.parse(localStorage.getItem("fp_history") || "{}");
  const today = getToday();
  h[today] = (h[today] || 0) + 1;
  const keys = Object.keys(h).sort();
  while (keys.length > 90) delete h[keys.shift()];
  localStorage.setItem("fp_history", JSON.stringify(h));
  todaySessions++;
  streak = computeStreak(h);
  renderStreak();
  renderGoal();
}

function computeStreak(h) {
  const today = getToday();
  let count = 0;
  const d = new Date();
  if ((h[today] || 0) > 0) { count = 1; d.setDate(d.getDate() - 1); }
  else d.setDate(d.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().slice(0, 10);
    if ((h[ds] || 0) > 0) { count++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return count;
}

// ── Notifications ────────────────────────────────────────
function requestNotify() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function notify(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

// ── YouTube API ─────────────────────────────────────────
window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player("yt-player", {
    width: 0,
    height: 0,
    videoId: "t8OZPJfpcTM",
    playerVars: { start: 9728, autoplay: 0, rel: 0, modestbranding: 1 },
    events: {
      onReady: () => {
        ytReady = true;
        ytPlayer.setVolume(50);
        document.getElementById("player-bar").classList.add("visible");
      },
      onStateChange: (e) => {
        audioPlaying = e.data === YT.PlayerState.PLAYING;
        document.getElementById("play-btn").textContent = audioPlaying ? "⏸ pause" : "▶ play";
      },
    },
  });
};

function toggleAudio() {
  if (!ytReady) return;
  audioPlaying ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
}

function setVolume(val) {
  if (ytReady) ytPlayer.setVolume(Number(val));
}

// ── Ambient sound ────────────────────────────────────────
function startAmbient() {
  if (config.ambient === "off") return;
  stopAmbient();
  try {
    ambCtx = new (window.AudioContext || window.webkitAudioContext)();
    const rate = ambCtx.sampleRate;
    const buf  = ambCtx.createBuffer(1, rate * 3, rate);
    const data = buf.getChannelData(0);
    if (config.ambient === "noise") {
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    } else {
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (last + 0.02 * w) / 1.02;
        last = data[i];
        data[i] *= 3.5;
      }
    }
    ambSource = ambCtx.createBufferSource();
    ambSource.buffer = buf;
    ambSource.loop = true;
    const gain = ambCtx.createGain();
    gain.gain.value = 0.04;
    ambSource.connect(gain);
    gain.connect(ambCtx.destination);
    ambSource.start();
  } catch (_) {}
}

function stopAmbient() {
  try { if (ambSource) { ambSource.stop(); ambSource = null; } } catch (_) {}
  try { if (ambCtx)    { ambCtx.close();   ambCtx    = null; } } catch (_) {}
}

// ── Beep / sound alerts ──────────────────────────────────
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (config.sound === "chime") {
      [[0, 523, 0.3], [0.25, 659, 0.25], [0.5, 784, 0.35]].forEach(([d, f, v]) => tone(ctx, f, d, 0.4, v));
    } else if (config.sound === "bell") {
      tone(ctx, 320, 0, 1.8, 0.25);
      tone(ctx, 480, 0, 1.8, 0.12);
    } else {
      [0, 0.35, 0.7].forEach((d) => tone(ctx, 528, d, 0.25, 0.3));
    }
  } catch (_) {}
}

function tone(ctx, freq, delay, dur, vol) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + dur);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + dur);
}

// ── Timer logic ─────────────────────────────────────────
function toggleTimer() { running ? pause() : start(); }

function start() {
  requestNotify();
  hideQuote();
  running = true;
  document.getElementById("start-btn").textContent = "pausar";
  ticker = setInterval(tick, 1000);
  if (phase === "focus") startAmbient();
  if (ytReady) ytPlayer.playVideo();
}

function pause() {
  running = false;
  clearInterval(ticker);
  ticker = null;
  document.getElementById("start-btn").textContent = "iniciar";
  stopAmbient();
  if (ytReady) ytPlayer.pauseVideo();
}

function resetTimer() {
  pause();
  phase           = "focus";
  sessionsDone    = 0;
  cycle           = 1;
  timeLeft        = currentPhaseDur = config.focusMin * 60;
  focusSeconds    = 0;
  document.getElementById("task-input").value = "";
  renderAll();
}

function skipPhase() {
  clearInterval(ticker);
  running = false;
  stopAmbient();
  advance();
  start();
}

function tick() {
  if (phase === "focus") {
    focusSeconds++;
    renderFocusTime();
  }
  timeLeft--;
  if (timeLeft <= 0) {
    const wasPhase = phase;
    pause();
    beep();
    if (wasPhase === "focus") {
      saveSession();
      notify("Sessão concluída!", "Hora de uma pausa. Você merece.");
    } else {
      notify("Pausa encerrada.", "Pronto para focar?");
    }
    advance();
    if (wasPhase === "focus") showQuote();
  } else {
    renderTimer();
    renderProgress();
  }
}

function advance() {
  if (phase === "focus") {
    sessionsDone++;
    if (sessionsDone % 4 === 0) {
      phase    = "long";
      timeLeft = config.longMin * 60;
    } else {
      phase    = "short";
      timeLeft = config.shortMin * 60;
    }
  } else {
    if (phase === "long") cycle++;
    phase    = "focus";
    timeLeft = config.focusMin * 60;
  }
  currentPhaseDur = timeLeft;
  renderAll();
}

// ── Settings panel ───────────────────────────────────────
function toggleSettings() {
  document.getElementById("settings-panel").classList.toggle("open");
}

document.addEventListener("click", (e) => {
  const panel  = document.getElementById("settings-panel");
  const toggle = document.getElementById("settings-toggle");
  if (panel.classList.contains("open") && !panel.contains(e.target) && e.target !== toggle) {
    panel.classList.remove("open");
  }
});

// ── Keyboard shortcuts ───────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  if (e.code === "Space") { e.preventDefault(); toggleTimer(); }
  if (e.code === "KeyR") resetTimer();
  if (e.code === "KeyS") skipPhase();
});

// ── Render ───────────────────────────────────────────────
function renderAll() {
  renderTimer();
  renderProgress();
  renderPhase();
  renderDots();
  renderCycle();
  renderFocusTime();
  renderGoal();
  renderStreak();
  updateStartBtn();
}

function renderTimer() {
  const m = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const s = String(timeLeft % 60).padStart(2, "0");
  const display = `${m}:${s}`;
  document.getElementById("timer").textContent = display;
  document.title = `${display} — FlowPomo`;
}

function renderProgress() {
  const pct  = currentPhaseDur > 0 ? (timeLeft / currentPhaseDur) * 100 : 0;
  const fill = document.getElementById("progress-fill");
  fill.style.width      = `${pct}%`;
  fill.style.background = phase === "focus" ? "var(--accent)" : "var(--green)";
}

function renderPhase() {
  const labels = { focus: "foco", short: "pausa curta", long: "pausa longa" };
  const colors = { focus: "var(--accent)", short: "var(--green)", long: "var(--green)" };
  const el = document.getElementById("phase-label");
  el.textContent = labels[phase];
  el.style.color = colors[phase];
  document.getElementById("timer").style.color = phase === "focus" ? "var(--text)" : "var(--green)";
}

function renderDots() {
  const pos = sessionsDone % 4;
  document.querySelectorAll(".dot").forEach((dot, i) => {
    dot.classList.remove("done", "current");
    if (i < pos)   dot.classList.add("done");
    if (i === pos) dot.classList.add("current");
  });
}

function renderCycle() {
  document.getElementById("cycle-info").textContent = `ciclo ${cycle}`;
}

function renderFocusTime() {
  const h = Math.floor(focusSeconds / 3600);
  const m = Math.floor((focusSeconds % 3600) / 60);
  const s = focusSeconds % 60;
  const display = h > 0
    ? `${h}h ${String(m).padStart(2, "0")}m foco`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} foco`;
  document.getElementById("focus-time").textContent = display;
}

function renderGoal() {
  const pct = Math.min(todaySessions / config.dailyGoal, 1) * 100;
  document.getElementById("goal-info").textContent = `${todaySessions} / ${config.dailyGoal} sessões`;
  document.getElementById("goal-fill").style.width      = `${pct}%`;
  document.getElementById("goal-fill").style.background = todaySessions >= config.dailyGoal ? "var(--green)" : "var(--accent)";
}

function renderStreak() {
  const el = document.getElementById("streak-badge");
  if (streak > 0) {
    el.textContent = `↑ ${streak} ${streak === 1 ? "dia" : "dias"}`;
    el.classList.add("active");
  } else {
    el.textContent = "";
    el.classList.remove("active");
  }
}

function updateStartBtn() {
  const btn = document.getElementById("start-btn");
  btn.classList.toggle("break-mode", phase !== "focus");
  btn.textContent = running ? "pausar" : "iniciar";
}

// ── Quote ────────────────────────────────────────────────
function showQuote() {
  const el = document.getElementById("quote");
  el.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  el.classList.add("visible");
}

function hideQuote() {
  document.getElementById("quote").classList.remove("visible");
}

// ── Init ─────────────────────────────────────────────────
loadConfig();
loadHistory();
renderAll();
