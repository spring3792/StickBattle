# 🥷 Stick Battle Arena

> An educational + casual stickman game built as a single HTML file. Play 11 game modes, customize your character with hundreds of cosmetics, learn while you play, and battle friends locally or online.

![Stick Battle](https://img.shields.io/badge/HTML5-Canvas-orange) ![No Build](https://img.shields.io/badge/build-none-brightgreen) ![Single File](https://img.shields.io/badge/single--file-yes-blue)

## 🎮 Play

Just open `stickbattle.html` in any modern browser. No install, no server (except for online multiplayer, which uses the public PeerJS broker).

## ✨ Features

### 11 Game Modes
- **📚 Educational** — Win a round, answer a question (math, science, history, English, or your own custom questions) for a power-up
- **🎉 Just For Fun** — Pick a power-up after every win; difficulty escalates each round
- **👥 2-Player Local** — Same keyboard, P1 uses WASD+F, P2 uses Arrows+Enter
- **🌐 Online** — Real-time peer-to-peer matches with a friend via room code (PeerJS / WebRTC)
- **💀 Survival** — Endless waves of enemies that scale with your wins
- **🎯 Target Practice** — Score-attack: shoot moving targets in 60 seconds
- **👹 Boss Fight** — 6 unique bosses (Crimson King, Frost Giant, Shadow Lord, Plasma Wizard, Astro Hunter, Pirate Lord), each with custom stats + abilities
- **🏃 Parkour** — 5 progressive levels with moving / crumbling platforms, spike traps, deadly floor (on Hard), and a time limit
- **🌧️ Dodge** — Survive 60 seconds of falling rocks
- **💪 Sumo** — Pure physics: dash and bump your opponent off a narrow platform
- **⛳ Mini Golf** — 18 holes with bouncing physics and drag-to-aim controls

### 👕 Massive Customization
- **10 hats** (incl. Cap, Crown, Wizard, Knight, Astronaut, Viking, Pirate)
- **9 weapons** with detailed sprites and per-weapon bullet types (pistol, rifle, shotgun, bow, laser, rocket, plasma + sword/katana melee)
- **8 colors** + custom RGB picker + animated rainbow
- **5 trails** (fire, sparkle, hearts, rainbow + cosmic/lightning BP exclusives)
- **5 shirts** with sleeves, lapels, drawstrings (T-shirt, Hoodie, Suit, Armor, Tank)
- **4 pants** with seam stitching, knee creases, cuffs (Jeans, Shorts, Cargo, Skirt)
- **3 shoe styles** (Sneakers, Boots, Sandals)
- **5 auras** (Rage, Wealth, Mystic, Prismatic + 2 BP exclusives)
- **5 mini-golf balls** (Classic, Red, Golden, Fireball, Galaxy)
- **8 face styles** (Happy, Cool, Angry, Surprised, Heart, Wink, Star, Robot)
- **4 body styles** (Normal, Buff, Thin, Tall)
- **🎨 Pixel-art draw pad** — paint your own 16×16 stickers for the chest, shirt, pants, or shoes
- **💾 6 outfit presets** — save and instantly load full outfits
- **🌄 6 game backgrounds** (Grass, Desert, Snow, Lava, Space, Sunset)

### 📈 Progression Systems
- **⭐ Player Level** — Earn XP from every game, level up for coin and gem rewards (every 5 levels gives a gem)
- **🎟️ Battle Pass** — 20 tiers with exclusive cosmetics that can ONLY be obtained from the BP (Cyber Visor, Phoenix Crest, Galactic Halo, Cosmic & Lightning trails, Thunder & Phoenix auras)
- **📦 Crates (5 tiers)** — Common, Rare, Epic, Legendary, Super Power Crate (random rewards by tier)
- **⚡ 17 Power-Ups** — stack up to 5 each (Damage, HP, Speed, Jump, Fire Rate, Shield, Multishot, Heal, Regen, Vampire, Crit, Piercing, Thorns, Knockback, Big/Fast Bullets, Dash)
- **🛒 Shop + 🎒 Inventory** — buy items with coins/gems; inventory groups everything you own by category with one-click equip

### 💰 Currency
- **🪙 Coins** — earned per game, spent on cosmetics + crates
- **💎 Gems** — rare currency from boss wins, online wins, gem-tier crates, leveling up
- **🛠️ Promo codes** — `STICK100`, `WELCOME`, `KINGME`, `PEWPEW`, `RAINBOW`, `JACKPOT`, `ADMIN` (gives infinite coins/gems/level/BP — reusable)
- **📝 Create your own questions** — add a question bank that appears in Educational mode
- **👥 Friends list** — add usernames you've met online
- **🔐 Google Sign-In** — set `GOOGLE_CLIENT_ID` to a real OAuth Client ID; otherwise falls back to a name prompt

### ♿ Accessibility
- **📱 Mobile / touch friendly** — on-screen movement and shoot buttons appear on touch devices
- **⏸️ Pause anywhere** with `Q` or `Esc` (Resume / Settings / Quit)
- **🔊 Sound + screen-shake toggles**
- **📚 Educational overlay** can be toggled to add questions to *any* game mode
- **🎚️ 4 difficulty levels** for combat (Easy / Normal / Hard / Insane) and a per-mode Easy / Medium / Hard for parkour

## 🎮 Controls

| Action | Key |
|---|---|
| Move | `A` / `D` or `←` / `→` |
| Jump | `W` / `↑` / `Space` |
| Shoot | `F` or click |
| Dash (Sumo) | `F` |
| Pause / Settings | `Q` or `Esc` |
| Online chat | `T` |
| 2P P1 | `WASD` + `F` |
| 2P P2 | `Arrows` + `Enter` |

Mobile / tablet: on-screen touch buttons appear automatically.

## 🌐 Online Multiplayer

1. Click `🌐 Online` from the home screen
2. One player clicks `Create Room` — they get a long room code
3. The other player pastes the code into `Join Room`
4. Both load into a 1v1 match — host is authoritative, guest sends inputs and renders state
5. Press `T` in-game to chat
6. Use `/trade category:id` in chat to send a trade offer (e.g. `/trade hats:crown`)

Connection is direct peer-to-peer through WebRTC (with the public PeerJS broker for signaling). No accounts or servers needed.

## 🛠️ Architecture

It's all in one file (`stickbattle.html`, ~6,400 lines) — pure HTML / CSS / JS, no build, no dependencies except two CDN scripts:
- `peerjs@1.5.4` for WebRTC signaling
- Google Identity Services (optional, only if you set a Client ID)

State and saves live in `localStorage`. The game state object covers user accounts, owned items, equipped powers, friend list, custom questions, drawings, outfit sets, battle pass progress, level/XP, and stats — all per username.

Single global game loop (`requestAnimationFrame`) drives a canvas render with:
- Stickman with proportional limb animation, joint-driven walk cycle, gradient head, face styles
- Layered cosmetics (clothing → accessories → drawings → aura)
- Per-weapon bullet rendering (tracers, missiles, plasma orbs, lightning bolts, etc.)
- Particle system for trails, hits, explosions, and crate confetti
- Background system (sky gradient + scenery layer)

## 🎁 Promo Codes

Hidden so you have to find them — but here are a few to start:
- `STICK100` — 100 coins
- `WELCOME` — 250 coins (one-time)
- `KINGME` — Free Crown 👑 (one-time)
- `PEWPEW` — Free Laser ⚡ (one-time)
- `RAINBOW` — Unlock all colors (one-time)
- `JACKPOT` — 1000 coins (one-time)
- `ADMIN` — Infinite everything (reusable, every redeem)

## 📝 Custom Questions

Open `📝 Create Questions` from home, fill in your own question + 4 answers + the correct one, save. Set the subject in Settings to "My Custom Questions" and only your bank will appear in Educational mode.

## 🤖 Configuring Google Sign-In

Open `stickbattle.html` and search for `GOOGLE_CLIENT_ID = ''`. Replace the empty string with your OAuth 2.0 Client ID from [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Add your origin (e.g. `http://localhost:8765`) to the authorized origins list. Save the file and the Google sign-in button will work properly.

## 📜 License

This is a personal project — feel free to fork, learn from, and modify.

---

Built one feature at a time over many iterations. Have fun! 🥷
