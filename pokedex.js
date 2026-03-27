// ── Generation ranges ──
const GEN_RANGES = {
  1:[1,151], 2:[152,251], 3:[252,386], 4:[387,493],
  5:[494,649], 6:[650,721], 7:[722,809], 8:[810,905], 9:[906,1025],
};

const STAT_COLORS = {
  hp:'#ff5959', attack:'#f5ac78', defense:'#fae078',
  'special-attack':'#9db7f5', 'special-defense':'#a7db8d', speed:'#fa92b2',
};
const STAT_NAMES = {
  hp:'HP', attack:'ATK', defense:'DEF',
  'special-attack':'Sp.ATK', 'special-defense':'Sp.DEF', speed:'SPD',
};

// ── State ──
let currentOffset = 0;
const PAGE = 24;
let activeGen = 'all';
let activeType = 'all';
let searchQuery = '';
let currentPokemonId = null;
let isShiny = false;
let allNames = [];

// ── Particles canvas ──
(function initParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
  resize(); window.addEventListener('resize', resize);
  const particles = Array.from({length: 40}, () => ({
    x: Math.random(), y: Math.random(),
    r: Math.random() * 2 + 1,
    vx: (Math.random() - 0.5) * 0.0003,
    vy: (Math.random() - 0.5) * 0.0003,
    opacity: Math.random() * 0.4 + 0.1,
  }));
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x = (p.x + p.vx + 1) % 1;
      p.y = (p.y + p.vy + 1) % 1;
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,215,0,${p.opacity})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── Type filter buttons ──
(function buildTypeFilters() {
  const wrap = document.getElementById('type-filters');
  Object.keys(TYPE_COLORS).forEach(type => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.type = type;
    btn.textContent = type;
    btn.style.setProperty('--type-color', TYPE_COLORS[type]);
    wrap.appendChild(btn);
  });
})();

// ── Render cards ──
function renderCard(p) {
  const id = p.id;
  const types = p.types.map(t => t.type.name);
  const mainColor = TYPE_COLORS[types[0]] || '#888';

  const card = document.createElement('div');
  card.className = 'poke-card';
  card.style.borderTop = `3px solid ${mainColor}`;
  card.style.background = `linear-gradient(160deg, ${mainColor}18 0%, var(--surface) 60%)`;

  card.innerHTML = `
    <div class="poke-num">#${String(id).padStart(4,'0')}</div>
    <img src="${API.getSpriteUrl(id)}" alt="${p.name}" loading="lazy"
         onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png'">
    <div class="poke-name">${capitalize(p.name)}</div>
    <div class="poke-types">
      ${types.map(t => `<span class="type-badge" style="background:${TYPE_COLORS[t]||'#888'}">${t}</span>`).join('')}
    </div>
  `;
  card.addEventListener('click', () => openModal(id));
  return card;
}

// ── Load Pokemon ──
async function loadPokemon(reset = false) {
  if (reset) {
    currentOffset = 0;
    document.getElementById('poke-grid').innerHTML = '';
  }

  const btn = document.getElementById('load-more-btn');
  btn.disabled = true;

  const { start, end } = getRange();
  const ids = [];

  for (let i = start + currentOffset; i < Math.min(start + currentOffset + PAGE, end + 1); i++) {
    ids.push(i);
  }
  if (!ids.length) { btn.style.display = 'none'; return; }

  document.getElementById('initial-loader')?.remove();

  const grid = document.getElementById('poke-grid');

  // Skeleton cards
  const skeletons = ids.map(() => {
    const sk = document.createElement('div');
    sk.className = 'poke-card';
    sk.style.minHeight = '180px';
    sk.style.background = 'linear-gradient(90deg, var(--surface) 25%, var(--surface2) 50%, var(--surface) 75%)';
    sk.style.backgroundSize = '200% 100%';
    sk.style.animation = 'shimmer 1.2s infinite';
    return sk;
  });
  skeletons.forEach(s => grid.appendChild(s));

  if (!document.getElementById('shimmer-style')) {
    const st = document.createElement('style');
    st.id = 'shimmer-style';
    st.textContent = '@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }';
    document.head.appendChild(st);
  }

  const results = await Promise.allSettled(ids.map(id => API.getPokemon(id)));

  results.forEach((res, i) => {
    const sk = skeletons[i];
    if (res.status === 'fulfilled') {
      const card = renderCard(res.value);
      // Type filter check
      if (activeType !== 'all') {
        const types = res.value.types.map(t => t.type.name);
        if (!types.includes(activeType)) { sk.remove(); return; }
      }
      sk.replaceWith(card);
    } else {
      sk.remove();
    }
  });

  currentOffset += PAGE;
  const { start: s, end: e } = getRange();
  if (s + currentOffset <= e) {
    btn.style.display = 'inline-block';
    btn.disabled = false;
  } else {
    btn.style.display = 'none';
  }
}

function getRange() {
  if (activeGen === 'all') return { start: 1, end: 1025 };
  const [s, e] = GEN_RANGES[parseInt(activeGen)];
  return { start: s, end: e };
}

// ── Filters ──
document.getElementById('gen-filters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('#gen-filters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeGen = btn.dataset.gen;
  loadPokemon(true);
});

document.getElementById('type-filters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('#type-filters .filter-btn').forEach(b => {
    b.classList.remove('active');
    b.style.background = 'transparent';
    b.style.color = '';
    b.style.borderColor = '';
  });
  btn.classList.add('active');
  if (btn.dataset.type !== 'all') {
    const c = TYPE_COLORS[btn.dataset.type];
    btn.style.background = c + '33';
    btn.style.color = c;
    btn.style.borderColor = c;
  }
  activeType = btn.dataset.type;
  loadPokemon(true);
});

document.getElementById('load-more-btn').addEventListener('click', () => loadPokemon(false));

// ── Search ──
let searchTimeout;
document.getElementById('search-input').addEventListener('input', async e => {
  clearTimeout(searchTimeout);
  const q = e.target.value.trim().toLowerCase();
  searchQuery = q;
  if (!q) { loadPokemon(true); return; }
  searchTimeout = setTimeout(() => doSearch(q), 300);
});

async function doSearch(q) {
  const grid = document.getElementById('poke-grid');
  grid.innerHTML = '<div class="loader" style="grid-column:1/-1"><svg class="pokeball-spin" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#e53935" stroke="#fff" stroke-width="4"/><path d="M2 50 Q50 50 98 50" stroke="#fff" stroke-width="6"/><circle cx="50" cy="50" r="10" fill="#fff"/></svg>Searching...</div>';
  document.getElementById('load-more-btn').style.display = 'none';
  try {
    // Try direct lookup first
    if (!isNaN(q)) {
      const p = await API.getPokemon(parseInt(q));
      grid.innerHTML = '';
      grid.appendChild(renderCard(p));
    } else {
      const p = await API.getPokemon(q);
      grid.innerHTML = '';
      grid.appendChild(renderCard(p));
    }
  } catch (_) {
    // Fuzzy search from allNames
    if (!allNames.length) {
      const data = await API.getAllNames();
      allNames = data.results;
    }
    const matches = allNames.filter(p => p.name.includes(q)).slice(0, 20);
    grid.innerHTML = '';
    if (!matches.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">No Pokémon found for "' + q + '"</div>';
      return;
    }
    const results = await Promise.allSettled(matches.map(m => API.getPokemon(getIdFromUrl(m.url))));
    results.forEach(r => { if (r.status === 'fulfilled') grid.appendChild(renderCard(r.value)); });
  }
}

// ── Modal ──
async function openModal(id) {
  currentPokemonId = id;
  isShiny = false;
  document.getElementById('shiny-toggle').classList.remove('active');

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Reset
  document.getElementById('modal-name').textContent = 'Loading...';
  document.getElementById('modal-types').innerHTML = '';
  document.getElementById('modal-stats').innerHTML = '';
  document.getElementById('modal-abilities').innerHTML = '';
  document.getElementById('evo-chain').innerHTML = '';
  document.getElementById('modal-desc').textContent = '';

  try {
    const [p, species] = await Promise.all([
      API.getPokemon(id),
      API.getSpecies(id).catch(() => null),
    ]);

    const types = p.types.map(t => t.type.name);
    const mainColor = TYPE_COLORS[types[0]] || '#888';

    // Header
    document.getElementById('modal-name').textContent = `#${String(id).padStart(4,'0')} ${capitalize(p.name)}`;
    document.getElementById('modal-name').style.color = mainColor;
    document.getElementById('modal-number').textContent = '';
    document.getElementById('modal-types').innerHTML = types.map(t =>
      `<span class="type-badge" style="background:${TYPE_COLORS[t]||'#888'}">${t}</span>`
    ).join('');

    // Sprite
    const sprite = document.getElementById('modal-sprite');
    sprite.src = API.getSpriteUrl(id, false);
    sprite.onerror = () => { sprite.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`; };

    // Species info
    if (species) {
      const engEntry = species.flavor_text_entries?.find(e => e.language.name === 'en');
      document.getElementById('modal-desc').textContent = engEntry
        ? engEntry.flavor_text.replace(/\f/g, ' ')
        : capitalize(p.name);
      document.getElementById('modal-habitat').textContent = species.habitat?.name ? capitalize(species.habitat.name) : '—';
    }

    document.getElementById('modal-height').textContent = (p.height / 10).toFixed(1) + ' m';
    document.getElementById('modal-weight').textContent = (p.weight / 10).toFixed(1) + ' kg';
    document.getElementById('modal-exp').textContent = p.base_experience || '—';

    // Abilities
    document.getElementById('modal-abilities').innerHTML = p.abilities.map(a =>
      `<span class="ability-badge ${a.is_hidden ? 'hidden' : ''}">${capitalize(a.ability.name)}${a.is_hidden ? ' 🌟' : ''}</span>`
    ).join('');

    // Stats
    const statsEl = document.getElementById('modal-stats');
    p.stats.forEach(s => {
      const name = s.stat.name;
      const val = s.base_stat;
      const pct = Math.min((val / 255) * 100, 100);
      const color = STAT_COLORS[name] || '#888';
      const div = document.createElement('div');
      div.className = 'stat-row';
      div.innerHTML = `
        <span class="stat-name">${STAT_NAMES[name] || name}</span>
        <span class="stat-val" style="color:${color}">${val}</span>
        <div class="stat-bar"><div class="stat-fill" style="width:0%;background:${color}" data-pct="${pct}"></div></div>
      `;
      statsEl.appendChild(div);
    });
    // Animate bars
    requestAnimationFrame(() => {
      statsEl.querySelectorAll('.stat-fill').forEach(el => {
        el.style.width = el.dataset.pct + '%';
      });
    });

    // Evolution chain
    if (species?.evolution_chain) {
      API.getEvolutionChain(species.evolution_chain.url).then(chain => {
        renderEvoChain(chain.chain);
      }).catch(() => {});
    }

  } catch (err) {
    document.getElementById('modal-name').textContent = 'Error loading';
  }
}

async function renderEvoChain(chain) {
  const wrap = document.getElementById('evo-chain');
  wrap.innerHTML = '';

  async function addMon(link, arrow = false) {
    const id = getIdFromUrl(link.species.url);
    if (arrow) {
      const arr = document.createElement('span');
      arr.className = 'evo-arrow';
      arr.textContent = '→';
      wrap.appendChild(arr);
    }
    const item = document.createElement('div');
    item.className = 'evo-item';
    item.innerHTML = `
      <img src="${API.getSpriteUrl(id)}" alt="${link.species.name}"
           onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png'">
      <span>${capitalize(link.species.name)}</span>
    `;
    item.addEventListener('click', () => openModal(id));
    wrap.appendChild(item);

    for (const evo of link.evolves_to) await addMon(evo, true);
  }

  await addMon(chain);
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('shiny-toggle').addEventListener('click', () => {
  isShiny = !isShiny;
  document.getElementById('shiny-toggle').classList.toggle('active', isShiny);
  const sprite = document.getElementById('modal-sprite');
  sprite.style.opacity = '0';
  setTimeout(() => {
    sprite.src = API.getSpriteUrl(currentPokemonId, isShiny);
    sprite.onload = () => { sprite.style.opacity = '1'; };
    sprite.onerror = () => {
      sprite.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isShiny ? 'shiny/' : ''}${currentPokemonId}.png`;
      sprite.style.opacity = '1';
    };
  }, 200);
});

// ── Init ──
loadPokemon(true);
