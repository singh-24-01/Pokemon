// ── Starter Pools ──
const STARTER_POOLS = {
  kanto: [1, 4, 7],
  johto: [152, 155, 158],
  hoenn: [252, 255, 258],
  sinnoh: [387, 390, 393],
  unova: [495, 498, 501],
};
const WILD_POOL_BY_GEN = {
  kanto: [1,151], johto:[152,251], hoenn:[252,386], sinnoh:[387,493], unova:[494,649],
};

// ── Game State ──
let playerMon = null, enemyMon = null;
let playerHP = 0, enemyHP = 0;
let playerMaxHP = 0, enemyMaxHP = 0;
let playerMoves = [];
let isBattling = false;
let caughtList = [];
let currentPool = 'kanto';

// ── Level & HP helpers ──
function calcHP(base, level = 50) {
  return Math.floor((2 * base + 31) * level / 100) + level + 10;
}
function calcStat(base, level = 50) {
  return Math.floor((2 * base + 31) * level / 100) + 5;
}

// ── Load starters ──
async function loadStarters(pool = 'kanto') {
  currentPool = pool;
  const ids = STARTER_POOLS[pool];
  const grid = document.getElementById('starter-grid');
  grid.innerHTML = '<div class="loader" style="grid-column:1/-1"><svg class="pokeball-spin" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#e53935" stroke="#fff" stroke-width="4"/><path d="M2 50 Q50 50 98 50" stroke="#fff" stroke-width="6"/><circle cx="50" cy="50" r="10" fill="#fff"/></svg>Loading...</div>';
  const mons = await Promise.all(ids.map(id => API.getPokemon(id)));
  grid.innerHTML = '';
  mons.forEach(p => {
    const types = p.types.map(t => t.type.name);
    const card = document.createElement('div');
    card.className = 'starter-card';
    card.style.borderTop = `3px solid ${TYPE_COLORS[types[0]] || '#888'}`;
    card.innerHTML = `
      <img src="${API.getSpriteUrl(p.id)}" alt="${p.name}"
           onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png'">
      <div class="starter-name">${capitalize(p.name)}</div>
      <div style="display:flex;gap:4px;justify-content:center">
        ${types.map(t => `<span class="type-badge" style="background:${TYPE_COLORS[t]||'#888'}">${t}</span>`).join('')}
      </div>
    `;
    card.addEventListener('click', () => startBattle(p));
    grid.appendChild(card);
  });
}

// ── Pool switcher ──
document.querySelectorAll('[data-pool]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-pool]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadStarters(btn.dataset.pool);
  });
});

// ── Wild Pokémon ──
async function getWildPokemon(pool = 'kanto') {
  const [min, max] = WILD_POOL_BY_GEN[pool];
  const id = Math.floor(Math.random() * (max - min + 1)) + min;
  return API.getPokemon(id);
}

// ── Fetch moves with PP and power ──
async function fetchMoves(pokemon) {
  const movesRaw = pokemon.moves
    .filter(m => m.version_group_details.some(v => v.move_learn_method.name === 'level-up'))
    .slice(0, 4);

  const moveData = await Promise.allSettled(
    movesRaw.map(m => apiFetch(`https://pokeapi.co/api/v2/move/${getIdFromUrl(m.move.url)}`))
  );

  return moveData
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(m => m.power)
    .slice(0, 4);
}

// ── Start Battle ──
async function startBattle(starterData) {
  document.getElementById('battle-select').style.display = 'none';
  const arena = document.getElementById('battle-arena');
  arena.classList.add('visible');

  log('🔄 Loading battle...');
  setMovesDisabled(true);

  playerMon = starterData;
  const level = 50;

  const hpStat = playerMon.stats.find(s => s.stat.name === 'hp').base_stat;
  playerMaxHP = calcHP(hpStat, level);
  playerHP = playerMaxHP;

  // Set player sprites (back sprite for DS feel)
  const playerSpriteEl = document.getElementById('player-sprite');
  playerSpriteEl.src = API.getAnimatedSprite(playerMon.id, true);
  playerSpriteEl.onerror = () => {
    playerSpriteEl.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${playerMon.id}.png`;
  };

  document.getElementById('player-name').textContent = capitalize(playerMon.name);
  document.getElementById('player-level').textContent = `Lv.${level}`;

  updateHP('player', playerHP, playerMaxHP);

  // Fetch player moves
  playerMoves = await fetchMoves(playerMon);
  if (!playerMoves.length) {
    playerMoves = [{ name: 'tackle', power: 40, type: { name: 'normal' }, pp: 35, meta: { ailment: { name: 'none' } } }];
  }
  renderMoves(playerMoves);

  await spawnWildPokemon();
}

async function spawnWildPokemon() {
  setMovesDisabled(true);
  document.getElementById('catch-btn').disabled = false;

  enemyMon = await getWildPokemon(currentPool);
  const level = Math.floor(Math.random() * 20) + 30; // 30-50
  const hpStat = enemyMon.stats.find(s => s.stat.name === 'hp').base_stat;
  enemyMaxHP = calcHP(hpStat, level);
  enemyHP = enemyMaxHP;

  const enemySpriteEl = document.getElementById('enemy-sprite');
  enemySpriteEl.src = API.getAnimatedSprite(enemyMon.id, false);
  enemySpriteEl.onerror = () => {
    enemySpriteEl.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemyMon.id}.png`;
  };
  enemySpriteEl.className = 'battle-sprite bounce';

  document.getElementById('enemy-name').textContent = `Wild ${capitalize(enemyMon.name)}`;
  document.getElementById('enemy-level').textContent = `Lv.${level}`;
  updateHP('enemy', enemyHP, enemyMaxHP);

  // Fetch enemy moves
  const enemyMovesRaw = await fetchMoves(enemyMon);
  enemyMon._moves = enemyMovesRaw.length ? enemyMovesRaw : [{ name: 'tackle', power: 40, type: { name: 'normal' }, pp: 35 }];

  log(`A wild <b>${capitalize(enemyMon.name)}</b> appeared!`);
  isBattling = true;
  setMovesDisabled(false);
}

// ── Render moves ──
function renderMoves(moves) {
  const grid = document.getElementById('move-grid');
  grid.innerHTML = '';
  moves.forEach((move, i) => {
    const btn = document.createElement('button');
    btn.className = 'move-btn';
    btn.dataset.idx = i;
    const typeColor = TYPE_COLORS[move.type?.name] || '#888';
    btn.innerHTML = `
      <div class="move-name">${capitalize(move.name)}</div>
      <div class="move-meta">
        <span class="type-badge" style="background:${typeColor};font-size:0.55rem">${move.type?.name || '?'}</span>
        PWR: ${move.power || '—'} &nbsp; PP: ${move.pp || '—'}
      </div>
    `;
    btn.addEventListener('click', () => playerAttack(i));
    grid.appendChild(btn);
  });
}

// ── Damage calc ──
function calcDamage(attacker, defender, move, level = 50) {
  const atkStat = attacker.stats.find(s => s.stat.name === 'attack').base_stat;
  const defStat = defender.stats.find(s => s.stat.name === 'defense').base_stat;
  const atk = calcStat(atkStat, level);
  const def = calcStat(defStat, level);
  const power = move.power || 40;
  const defTypes = defender.types.map(t => t.type.name);
  const effectiveness = getTypeEffectiveness(move.type?.name || 'normal', defTypes);
  const crit = Math.random() < 0.0625 ? 1.5 : 1;
  const rand = 0.85 + Math.random() * 0.15;
  const dmg = Math.floor(((2 * level / 5 + 2) * power * atk / def / 50 + 2) * effectiveness * crit * rand);
  return { dmg: Math.max(1, dmg), effectiveness, crit: crit > 1 };
}

// ── Player attacks ──
async function playerAttack(moveIdx) {
  if (!isBattling) return;
  setMovesDisabled(true);
  document.getElementById('catch-btn').disabled = true;
  document.getElementById('flee-btn').disabled = true;

  const move = playerMoves[moveIdx];
  const { dmg, effectiveness, crit } = calcDamage(playerMon, enemyMon, move);
  enemyHP = Math.max(0, enemyHP - dmg);
  updateHP('enemy', enemyHP, enemyMaxHP);

  // Animate
  document.getElementById('enemy-sprite').classList.remove('shake');
  void document.getElementById('enemy-sprite').offsetWidth;
  document.getElementById('enemy-sprite').classList.add('shake');

  let msg = `${capitalize(playerMon.name)} used <b>${capitalize(move.name)}</b>! (${dmg} dmg)`;
  if (crit) msg += ' <span style="color:#FFD700">Critical hit!</span>';
  if (effectiveness > 1) msg += ' <span style="color:#4caf50">Super effective!</span>';
  if (effectiveness < 1 && effectiveness > 0) msg += ' <span style="color:#f44336">Not very effective...</span>';
  if (effectiveness === 0) msg += ' <span style="color:#f44336">No effect!</span>';
  log(msg);

  if (enemyHP <= 0) {
    setTimeout(async () => {
      log(`🎉 Wild <b>${capitalize(enemyMon.name)}</b> fainted! You won!`);
      await delay(1200);
      await spawnWildPokemon();
      document.getElementById('flee-btn').disabled = false;
    }, 600);
    return;
  }

  await delay(900);
  await enemyAttack();
}

// ── Enemy attacks ──
async function enemyAttack() {
  if (!isBattling || !enemyMon._moves) return;
  const move = enemyMon._moves[Math.floor(Math.random() * enemyMon._moves.length)];
  const { dmg, effectiveness } = calcDamage(enemyMon, playerMon, move);
  playerHP = Math.max(0, playerHP - dmg);
  updateHP('player', playerHP, playerMaxHP);

  document.getElementById('player-sprite').classList.remove('shake');
  void document.getElementById('player-sprite').offsetWidth;
  document.getElementById('player-sprite').classList.add('shake');

  let msg = `Wild <b>${capitalize(enemyMon.name)}</b> used <b>${capitalize(move.name)}</b>! (${dmg} dmg)`;
  if (effectiveness > 1) msg += ' <span style="color:#4caf50">Super effective!</span>';
  log(msg);

  if (playerHP <= 0) {
    isBattling = false;
    log(`😵 <b>${capitalize(playerMon.name)}</b> fainted... <button onclick="location.reload()" style="background:var(--red);border:none;color:#fff;padding:4px 12px;border-radius:6px;cursor:pointer;font-family:Nunito,sans-serif;font-weight:800;margin-left:8px">Try Again</button>`);
    return;
  }
  setMovesDisabled(false);
  document.getElementById('catch-btn').disabled = false;
  document.getElementById('flee-btn').disabled = false;
}

// ── Catch ──
document.getElementById('catch-btn').addEventListener('click', async () => {
  if (!isBattling) return;
  setMovesDisabled(true);
  document.getElementById('catch-btn').disabled = true;
  document.getElementById('flee-btn').disabled = true;

  const hpRatio = enemyHP / enemyMaxHP;
  // Catch rate: higher when HP is low
  const catchChance = 0.15 + (1 - hpRatio) * 0.6;

  log('🎾 Threw a Pokéball...');
  await delay(500);

  if (Math.random() < catchChance) {
    document.getElementById('enemy-sprite').style.display = 'none';
    log(`✅ Gotcha! <b>${capitalize(enemyMon.name)}</b> was caught!`);
    caughtList.push(enemyMon);
    document.getElementById('caught-count').textContent = `Caught: ${caughtList.length}`;
    addCaughtBadge(enemyMon);
    await delay(1200);
    document.getElementById('enemy-sprite').style.display = 'block';
    await spawnWildPokemon();
  } else {
    const shakes = Math.floor(Math.random() * 3) + 1;
    log(`❌ ${capitalize(enemyMon.name)} broke free! (${shakes} shake${shakes>1?'s':''}) Try weakening it more.`);
    await delay(800);
    await enemyAttack();
  }
  document.getElementById('flee-btn').disabled = false;
});

// ── Flee ──
document.getElementById('flee-btn').addEventListener('click', async () => {
  if (!isBattling) return;
  isBattling = false;
  log('🏃 Got away safely! A new Pokémon appears...');
  await delay(800);
  isBattling = true;
  await spawnWildPokemon();
});

// ── UI helpers ──
function updateHP(side, hp, max) {
  const pct = Math.max(0, (hp / max) * 100);
  const fill = document.getElementById(`${side}-hp-fill`);
  fill.style.width = pct + '%';
  fill.style.background = pct > 50 ? '#4caf50' : pct > 20 ? '#ff9800' : '#f44336';
  document.getElementById(`${side}-hp-text`).textContent = `HP: ${Math.max(0, hp)}/${max}`;
}

function log(html) {
  const el = document.getElementById('battle-log');
  el.innerHTML = `<span class="log-line">${html}</span>`;
}

function setMovesDisabled(disabled) {
  document.querySelectorAll('.move-btn').forEach(b => b.disabled = disabled);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function addCaughtBadge(mon) {
  const wrap = document.getElementById('caught-collection');
  const badge = document.createElement('div');
  badge.className = 'caught-badge';
  badge.innerHTML = `<img src="${API.getSpriteUrl(mon.id)}" alt="${mon.name}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mon.id}.png'">${capitalize(mon.name)}`;
  wrap.appendChild(badge);
}

// ── Init ──
loadStarters('kanto');
