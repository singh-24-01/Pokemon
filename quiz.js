// ── Difficulty pools ──
const DIFF_POOLS = {
  easy:   [1, 151],
  medium: [1, 386],
  hard:   [1, 1025],
};

// ── State ──
let score = 0, streak = 0, best = parseInt(localStorage.getItem('quiz_best') || '0');
let currentAnswer = null;
let timerInterval = null;
let timeLeft = 15;
let answered = false;
let currentDiff = 'easy';
let allQuizNames = [];
let pendingNext = false;

// ── Init ──
document.getElementById('best').textContent = best;

document.querySelectorAll('[data-diff]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-diff]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDiff = btn.dataset.diff;
    resetRound();
  });
});

document.getElementById('next-btn').addEventListener('click', () => {
  if (pendingNext) nextRound();
});

// ── Round logic ──
async function startRound() {
  answered = false;
  pendingNext = false;
  clearInterval(timerInterval);
  timeLeft = 15;

  document.getElementById('quiz-result').className = 'quiz-result waiting';
  document.getElementById('quiz-result').textContent = 'Choose wisely! ⚡';
  document.getElementById('next-btn').disabled = true;
  document.getElementById('quiz-question').textContent = "WHO'S THAT POKÉMON? ❓";

  const img = document.getElementById('quiz-img');
  img.className = 'quiz-img hidden';
  img.src = '';

  // Pick correct Pokemon
  const [min, max] = DIFF_POOLS[currentDiff];
  const correctId = Math.floor(Math.random() * (max - min + 1)) + min;

  // Get 3 wrong answers from same pool
  const wrongIds = new Set();
  while (wrongIds.size < 3) {
    const id = Math.floor(Math.random() * (max - min + 1)) + min;
    if (id !== correctId) wrongIds.add(id);
  }

  // Fetch all 4
  const allIds = [correctId, ...wrongIds];
  const results = await Promise.allSettled(allIds.map(id => API.getPokemon(id)));
  const mons = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  if (mons.length < 4) { startRound(); return; }

  const correctMon = mons[0];
  currentAnswer = correctMon;

  // Shuffle choices
  const shuffled = mons.sort(() => Math.random() - 0.5);
  const choices = document.querySelectorAll('.choice-btn');
  shuffled.forEach((mon, i) => {
    choices[i].textContent = capitalize(mon.name);
    choices[i].disabled = false;
    choices[i].className = 'choice-btn';
    choices[i].dataset.name = mon.name;
    choices[i].onclick = () => handleAnswer(choices[i], mon.name === correctMon.name);
  });

  // Load sprite (silhouette)
  img.src = API.getSpriteUrl(correctId);
  img.onerror = () => {
    img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${correctId}.png`;
  };
  img.onload = () => {};
  img.className = 'quiz-img hidden';

  startTimer();
}

function startTimer() {
  const bar = document.getElementById('timer-bar');
  bar.style.transition = 'none';
  bar.style.width = '100%';
  void bar.offsetWidth;
  bar.style.transition = `width ${timeLeft}s linear`;
  bar.style.width = '0%';

  timerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (!answered) timeOut();
    }
  }, 1000);
}

function handleAnswer(btn, isCorrect) {
  if (answered) return;
  answered = true;
  clearInterval(timerInterval);

  // Reveal
  revealPokemon();

  // Highlight
  document.querySelectorAll('.choice-btn').forEach(b => {
    b.disabled = true;
    if (b.dataset.name === currentAnswer.name) b.classList.add('correct');
    else if (b === btn && !isCorrect) b.classList.add('wrong');
  });

  if (isCorrect) {
    score++;
    streak++;
    if (streak > best) {
      best = streak;
      localStorage.setItem('quiz_best', best);
      document.getElementById('best').textContent = best;
    }
    const pts = streak >= 5 ? '🔥 +2' : '+1';
    if (streak >= 5) score++;
    showResult(true, `✅ Correct! It's ${capitalize(currentAnswer.name)}! ${streak >= 3 ? '🔥 x' + streak + ' streak!' : ''}`);
    playSound('correct');
  } else {
    streak = 0;
    showResult(false, `❌ Wrong! It was ${capitalize(currentAnswer.name)}...`);
    playSound('wrong');
  }

  document.getElementById('score').textContent = score;
  document.getElementById('streak').textContent = streak;
  pendingNext = true;
  document.getElementById('next-btn').disabled = false;
}

function timeOut() {
  if (answered) return;
  answered = true;
  revealPokemon();
  document.querySelectorAll('.choice-btn').forEach(b => {
    b.disabled = true;
    if (b.dataset.name === currentAnswer.name) b.classList.add('correct');
  });
  streak = 0;
  document.getElementById('streak').textContent = 0;
  showResult(false, `⏰ Time's up! It was ${capitalize(currentAnswer.name)}.`);
  pendingNext = true;
  document.getElementById('next-btn').disabled = false;
}

function revealPokemon() {
  const img = document.getElementById('quiz-img');
  img.className = 'quiz-img revealed';
  document.getElementById('quiz-question').textContent =
    `It's ${capitalize(currentAnswer.name)}! #${String(currentAnswer.id).padStart(4,'0')}`;
}

function showResult(correct, msg) {
  const el = document.getElementById('quiz-result');
  el.className = `quiz-result ${correct ? 'correct' : 'wrong'}`;
  el.textContent = msg;
}

function nextRound() {
  if (!pendingNext) return;
  startRound();
}

function resetRound() {
  score = 0; streak = 0;
  document.getElementById('score').textContent = 0;
  document.getElementById('streak').textContent = 0;
  startRound();
}

// ── Simple audio feedback (Web Audio API — no files needed) ──
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);

    if (type === 'correct') {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    } else {
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
    }
  } catch (_) {}
}

// ── Start ──
startRound();
