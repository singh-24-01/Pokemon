# 🎮 PokéDex Fan Site

> A Pokemon fan site built with vanilla HTML/CSS/JS using the free [PokeAPI](https://pokeapi.co/).
> No framework, no build step — just open and play.

![Pokemon](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png)

---

## 🌐 Live Demo

👉 **[singh-24-01.github.io/Pokemon](https://singh-24-01.github.io/Pokemon/)**

---

## ✨ Features

### 📖 Pokédex
- Browse all **1025+ Pokémon** across all 9 generations
- **Search** by name or number
- Filter by **Generation** (I → IX) and **Type** (all 18 types)
- Click any card to open a full detail modal:
  - Official artwork + **Shiny toggle** ✨
  - Base stats with animated bars
  - Abilities (including hidden abilities)
  - Full **evolution chain** (clickable)
  - Pokédex flavor text, habitat, height, weight
- Smart **localStorage cache** — data loads instantly on repeat visits

### ⚔️ Battle
- Choose your starter from **5 generations** (Kanto, Johto, Hoenn, Sinnoh, Unova)
- Fight random wild Pokémon in **turn-based combat**
- Real mechanics: type effectiveness, critical hits, damage formula from the games
- **Catch** Pokémon with a Pokéball (catch rate increases when HP is low)
- Animated battle sprites (Gen V animated GIFs)
- Build your **caught collection** in one session

### ❓ Who's That Pokémon?
- Classic silhouette quiz
- **15-second timer** per question
- 3 difficulty levels:
  - 🟢 Easy — Gen I only (151 Pokémon)
  - 🟡 Medium — Gen I–III (386 Pokémon)
  - 🔴 Hard — All generations (1025 Pokémon)
- Score, **streak counter** 🔥, and personal best (saved in localStorage)
- Sound effects via Web Audio API (no files needed)

---

## 🚀 Run Locally

No installation required — just serve the files:

```bash
# Python
python3 -m http.server 3000

# Node.js
npx serve .
```

Then open **http://localhost:3000**

---

## 📁 Project Structure

```
pokemon-site/
├── index.html       # Pokédex page
├── battle.html      # Battle game
├── quiz.html        # Who's That Pokémon?
├── style.css        # All styles (dark theme, animations, responsive)
├── api.js           # PokeAPI wrapper + localStorage cache + type data
├── pokedex.js       # Pokédex logic (search, filter, modal, evolutions)
├── battle.js        # Battle engine (damage calc, catch, AI)
└── quiz.js          # Quiz logic (timer, scoring, sound effects)
```

---

## 🛠️ Tech Stack

| | |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Data** | [PokeAPI v2](https://pokeapi.co/) — free, no API key |
| **Sprites** | Official artwork + Gen V animated sprites |
| **Fonts** | Press Start 2P (pixel), Nunito (body) via Google Fonts |
| **Hosting** | GitHub Pages |

---

## 🎨 Design

- Dark theme inspired by the Pokémon games
- Glassmorphism cards with type-color gradients
- Particle animation on the hero section
- Fully **responsive** — works on mobile
- CSS animations: card hover, stat bars, battle sprites, silhouette reveal

---

## 📊 Battle Mechanics

Damage formula based on the main games:

```
Damage = ((2×Level/5 + 2) × Power × Atk/Def / 50 + 2)
         × TypeEffectiveness × CriticalHit × RandomFactor
```

- **Type chart** — all 18 types with full effectiveness table
- **Critical hits** — 6.25% chance (1.5× damage)
- **Catch rate** — increases as enemy HP drops

---

## 🙏 Credits

- Pokémon data & sprites — [PokéAPI](https://pokeapi.co/)
- Official artwork — [PokeAPI GitHub](https://github.com/PokeAPI/sprites)
- Pokémon is © Nintendo / Game Freak / Creatures Inc.

---

*Built with ❤️ for Pokémon fans.*
