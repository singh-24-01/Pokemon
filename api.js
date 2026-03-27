// PokeAPI wrapper with localStorage cache (24h TTL)
const MEM = {};

async function apiFetch(url) {
  if (MEM[url]) return MEM[url];
  const key = 'pk_' + url;
  try {
    const s = localStorage.getItem(key);
    if (s) {
      const { d, t } = JSON.parse(s);
      if (Date.now() - t < 86400000) return (MEM[url] = d);
    }
  } catch (_) {}
  const r = await fetch(url);
  if (!r.ok) throw new Error(`API error ${r.status}`);
  const d = await r.json();
  MEM[url] = d;
  try { localStorage.setItem(key, JSON.stringify({ d, t: Date.now() })); } catch (_) {}
  return d;
}

const BASE = 'https://pokeapi.co/api/v2';

const API = {
  async getPokemon(idOrName) {
    return apiFetch(`${BASE}/pokemon/${idOrName}`);
  },
  async getSpecies(idOrName) {
    return apiFetch(`${BASE}/pokemon-species/${idOrName}`);
  },
  async getEvolutionChain(url) {
    return apiFetch(url);
  },
  async getList(limit = 20, offset = 0) {
    return apiFetch(`${BASE}/pokemon?limit=${limit}&offset=${offset}`);
  },
  async getAllNames() {
    return apiFetch(`${BASE}/pokemon?limit=1025&offset=0`);
  },
  getSpriteUrl(id, shiny = false) {
    const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
    return shiny
      ? `${base}/other/official-artwork/shiny/${id}.png`
      : `${base}/other/official-artwork/${id}.png`;
  },
  getAnimatedSprite(id, back = false) {
    const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated';
    return back ? `${base}/back/${id}.gif` : `${base}/${id}.gif`;
  },
};

const TYPE_COLORS = {
  normal:'#9099a1',fire:'#fd7d24',water:'#4592c4',electric:'#eed535',
  grass:'#9bcc50',ice:'#51c4e7',fighting:'#d56723',poison:'#b97fc9',
  ground:'#f7de3f',flying:'#3dc7ef',psychic:'#f366b9',bug:'#729f3f',
  rock:'#a38c21',ghost:'#7b62a3',dragon:'#53a4cf',dark:'#707070',
  steel:'#9eb7b8',fairy:'#fdb9e9',
};

const TYPE_CHART = {
  fire:   { grass:2, ice:2, bug:2, steel:2, water:0.5, fire:0.5, rock:0.5, dragon:0.5 },
  water:  { fire:2, ground:2, rock:2, water:0.5, grass:0.5, dragon:0.5 },
  grass:  { water:2, ground:2, rock:2, fire:0.5, grass:0.5, poison:0.5, flying:0.5, bug:0.5, dragon:0.5, steel:0.5 },
  electric:{ water:2, flying:2, grass:0.5, electric:0.5, dragon:0.5, ground:0 },
  normal: { rock:0.5, ghost:0, steel:0.5 },
  ice:    { grass:2, ground:2, flying:2, dragon:2, fire:0.5, water:0.5, ice:0.5, steel:0.5 },
  fighting:{ normal:2, ice:2, rock:2, dark:2, steel:2, poison:0.5, bug:0.5, psychic:0.5, flying:0.5, fairy:0.5, ghost:0 },
  poison: { grass:2, fairy:2, poison:0.5, ground:0.5, rock:0.5, ghost:0.5, steel:0 },
  ground: { fire:2, electric:2, poison:2, rock:2, steel:2, grass:0.5, bug:0.5, flying:0 },
  flying: { grass:2, fighting:2, bug:2, electric:0.5, rock:0.5, steel:0.5 },
  psychic:{ fighting:2, poison:2, psychic:0.5, steel:0.5, dark:0 },
  bug:    { grass:2, psychic:2, dark:2, fire:0.5, fighting:0.5, flying:0.5, ghost:0.5, steel:0.5, fairy:0.5 },
  rock:   { fire:2, ice:2, flying:2, bug:2, fighting:0.5, ground:0.5, steel:0.5 },
  ghost:  { psychic:2, ghost:2, dark:0.5, normal:0 },
  dragon: { dragon:2, steel:0.5, fairy:0 },
  dark:   { psychic:2, ghost:2, fighting:0.5, dark:0.5, fairy:0.5 },
  steel:  { ice:2, rock:2, fairy:2, fire:0.5, water:0.5, electric:0.5, steel:0.5 },
  fairy:  { fighting:2, dragon:2, dark:2, fire:0.5, poison:0.5, steel:0.5 },
};

function getTypeEffectiveness(moveType, defenderTypes) {
  let mult = 1;
  const chart = TYPE_CHART[moveType] || {};
  for (const dt of defenderTypes) {
    if (chart[dt] !== undefined) mult *= chart[dt];
  }
  return mult;
}

function getIdFromUrl(url) {
  return parseInt(url.split('/').filter(Boolean).pop());
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}
