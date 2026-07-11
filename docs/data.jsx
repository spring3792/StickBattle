/* global window */
// Static game data. No emojis. Icons referenced by id, rendered via window.SFIcons.Icon.

window.GameData = (function () {
  const COS = window.SFCosmetics;

  const PLAYER_COLORS = [
    { id:'blue',   name:'Azure',   color:'#4ecdff', dark:'#1e6c92' },
    { id:'red',    name:'Crimson', color:'#ff5b5b', dark:'#8b2424' },
    { id:'green',  name:'Verdant', color:'#7bff8a', dark:'#2e7a36' },
    { id:'yellow', name:'Solar',   color:'#ffd84a', dark:'#8a6c12' },
    { id:'pink',   name:'Bloom',   color:'#ff7bc6', dark:'#8a2e6a' },
    { id:'cyan',   name:'Frost',   color:'#5bf0e8', dark:'#1e6e6a' },
    { id:'purple', name:'Royal',   color:'#b78bff', dark:'#5a2e8a' },
    { id:'orange', name:'Ember',   color:'#ff9a3c', dark:'#8a4a12' },
    { id:'lime',   name:'Acid',    color:'#c8ff3a', dark:'#5a7a12' },
    { id:'teal',   name:'Deep',    color:'#3aa890', dark:'#1a4a3a' },
    { id:'gold',   name:'Bullion', color:'#e0b840', dark:'#7a5a18' },
    { id:'white',  name:'Bone',    color:'#f0eedf', dark:'#5a584a' },
  ];

  // ---------- COSMETIC RARITIES ----------
  // Assign rarity + initial ownership to every cosmetic. 'none' items are
  // free starter slots. The rest are spread across common/rare/epic/legendary
  // by a deterministic pattern so crate drops have a varied pool.
  const RARITY_LIST = ['common', 'rare', 'epic', 'legendary'];
  // Curated starter sets — players begin with these unlocked.
  const STARTER_IDS = {
    hat:    ['none', 'top', 'cap', 'beanie'],
    outfit: ['none', 'tee', 'hoodie'],
    face:   ['default', 'none', 'smile', 'glasses'],
    trail:  ['none', 'dust'],
    // AURAS and HALOS are all starters — they're brand new, so give
    // every player the full picker instead of hiding them behind crates.
    aura:   ['none', 'fire', 'ice', 'shadow', 'rainbow', 'electric', 'gold'],
    halo:   ['none', 'angel', 'devil', 'neon', 'flame', 'crown_halo', 'ghost'],
  };
  function tagRarity(list, kind) {
    const starters = STARTER_IDS[kind] || ['none'];
    return list.map((item, i) => {
      const isStarter = starters.includes(item.id);
      // Spread by index: ~50% common, 30% rare, 15% epic, 5% legendary
      const r = (i * 17 + 7) % 100;
      let rarity = 'common';
      if (r >= 50 && r < 80) rarity = 'rare';
      else if (r >= 80 && r < 95) rarity = 'epic';
      else if (r >= 95) rarity = 'legendary';
      // Starters are always common
      return { ...item, rarity: isStarter ? 'common' : rarity, starter: isStarter };
    });
  }
  const HATS    = tagRarity(COS.HATS,    'hat');
  const OUTFITS = tagRarity(COS.OUTFITS, 'outfit');
  const FACES   = tagRarity(COS.FACES,   'face');
  const TRAILS  = tagRarity(COS.TRAILS,  'trail');
  const AURAS   = tagRarity(COS.AURAS   || [], 'aura');
  const HALOS   = tagRarity(COS.HALOS   || [], 'halo');

  const COSMETIC_KINDS = [
    { id:'hat',    list:HATS    },
    { id:'outfit', list:OUTFITS },
    { id:'face',   list:FACES   },
    { id:'trail',  list:TRAILS  },
    { id:'aura',   list:AURAS   },
    { id:'halo',   list:HALOS   },
  ];

  // Coin colors per rarity (for borders/glows in shop)
  const RARITY_COLOR = {
    common:    '#b6bedc',
    rare:      '#4ad7ff',
    epic:      '#b39bff',
    legendary: '#ffb547',
  };

  // ---------- ACCOUNTS / LOCAL PROFILES ----------
  // Lightweight "account" system. Each profile is just a username; we namespace
  // the per-profile localStorage keys with it. The legacy default (no profile
  // picked / "Player1") uses the bare keys so existing progress isn't wiped.
  const LS_USER       = 'sf_user_v1';
  const LS_USER_LIST  = 'sf_user_list_v1';
  const DEFAULT_USER  = 'Player1';
  function getUser() {
    try { return (localStorage.getItem(LS_USER) || DEFAULT_USER).slice(0, 20); }
    catch (e) { return DEFAULT_USER; }
  }
  function setUser(name) {
    const clean = (name || DEFAULT_USER).trim().slice(0, 20) || DEFAULT_USER;
    localStorage.setItem(LS_USER, clean);
    // Track in user list for the switcher UI.
    try {
      const list = JSON.parse(localStorage.getItem(LS_USER_LIST) || '[]');
      if (!list.includes(clean)) {
        list.push(clean);
        localStorage.setItem(LS_USER_LIST, JSON.stringify(list));
      }
    } catch(e){}
    return clean;
  }
  function listUsers() {
    try {
      const list = JSON.parse(localStorage.getItem(LS_USER_LIST) || '[]');
      // Include the active user IF it was explicitly set. Don't inject the
      // fallback DEFAULT_USER ("Player1") — otherwise deleting the last
      // profile silently re-adds it and the login screen can't be emptied.
      const explicit = localStorage.getItem(LS_USER);
      if (explicit && !list.includes(explicit)) list.push(explicit);
      return list;
    } catch (e) {
      const explicit = (() => { try { return localStorage.getItem(LS_USER); } catch(e){ return null; } })();
      return explicit ? [explicit] : [];
    }
  }
  // Case-insensitive existence check — used by sign-up to block dup usernames.
  function userExists(name) {
    const clean = (name || '').trim().toLowerCase();
    if (!clean) return false;
    return listUsers().some(n => n.toLowerCase() === clean);
  }
  function deleteUser(name) {
    try {
      const list = (JSON.parse(localStorage.getItem(LS_USER_LIST) || '[]') || []).filter(n => n !== name);
      localStorage.setItem(LS_USER_LIST, JSON.stringify(list));
      // Wipe namespaced keys for that user.
      ['sf_coins_v1','sf_owned_v1','sf_friends_v1','sf_trades_v1','sf_redeemed_v1']
        .forEach(k => localStorage.removeItem(k + '__' + name));
      // Wipe profile meta for that user.
      localStorage.removeItem('sf_profile_meta_v1__' + name);
    } catch(e){}
  }

  // ----- Profile meta: password (hashed) + avatar (preset id) -----
  // Avatars are picked from a curated emoji-ish list — small, no images needed.
  const AVATARS = ['🥷','🧙','🦊','🐉','🐈','🐼','🦄','👻','🤖','🦸','🧛','🧚','🐯','🐧','🐸','🐵','🐶','🐙','🍄','🍕','⚡','🔥','💎','⭐'];
  function getProfileMeta(name) {
    name = name || getUser();
    try {
      const raw = localStorage.getItem('sf_profile_meta_v1__' + name);
      return raw ? JSON.parse(raw) : {};
    } catch(e){ return {}; }
  }
  function setProfileMeta(name, meta) {
    name = name || getUser();
    try { localStorage.setItem('sf_profile_meta_v1__' + name, JSON.stringify(meta || {})); } catch(e){}
  }
  // Pad-and-mix string hash — not cryptographic, just to avoid storing
  // passwords in clear text. localStorage is anyone-with-devtools accessible
  // anyway; this is for casual sibling/classmate protection only.
  function hashPw(s) {
    if (!s) return '';
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    let h2 = 5381 >>> 0;
    for (let i = s.length - 1; i >= 0; i--) {
      h2 = ((h2 << 5) + h2 + s.charCodeAt(i)) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8) + ('00000000' + h2.toString(16)).slice(-8);
  }
  function setPassword(name, password) {
    const meta = getProfileMeta(name);
    if (password) meta.pw = hashPw(password);
    else delete meta.pw;
    setProfileMeta(name, meta);
  }
  function hasPassword(name) {
    const m = getProfileMeta(name);
    return !!m.pw;
  }
  function verifyPassword(name, password) {
    const m = getProfileMeta(name);
    if (!m.pw) return true;  // no password set
    return m.pw === hashPw(password || '');
  }
  function setAvatar(name, avatar) {
    const meta = getProfileMeta(name);
    if (avatar && AVATARS.includes(avatar)) meta.avatar = avatar;
    else delete meta.avatar;
    setProfileMeta(name, meta);
  }
  function getAvatar(name) {
    const m = getProfileMeta(name);
    return m.avatar || null;
  }
  // Custom profile picture — stored as a data URL (image/png typically). Takes
  // priority over the avatar emoji + initial when rendering the profile disc.
  // Size capped to a few hundred KB by the upload/draw paths to keep
  // localStorage healthy.
  function setCustomAvatar(name, dataUrl) {
    const meta = getProfileMeta(name);
    if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image')) {
      meta.pic = dataUrl;
    } else {
      delete meta.pic;
    }
    setProfileMeta(name, meta);
  }
  function getCustomAvatar(name) {
    const m = getProfileMeta(name);
    return m.pic || null;
  }
  // Equipped cosmetic id per kind (hat/outfit/face/trail). Persisted on the
  // profile meta so the lobby and arena can default slot 0 to the user's
  // chosen look.
  function setEquipped(name, kind, id) {
    const meta = getProfileMeta(name);
    meta.eq = meta.eq || {};
    if (id) meta.eq[kind] = id;
    else delete meta.eq[kind];
    setProfileMeta(name, meta);
  }
  function getEquipped(name, kind) {
    const m = getProfileMeta(name);
    return (m.eq && m.eq[kind]) || null;
  }

  // Stickman color — applied as the default player color when starting matches.
  // Hex string (e.g. "#5cf6ff"). Falls back to a per-slot default if unset.
  function setPlayerColor(name, color) {
    const meta = getProfileMeta(name);
    if (color && /^#[0-9a-f]{6}$/i.test(color)) meta.color = color;
    else delete meta.color;
    setProfileMeta(name, meta);
  }
  function getPlayerColor(name) {
    const m = getProfileMeta(name);
    return m.color || null;
  }

  // Display name — purely cosmetic alias for the username. Shown in the chip,
  // friends/trade panels, results screens. Username remains the login identity.
  function setDisplayName(name, displayName) {
    const meta = getProfileMeta(name);
    const clean = (displayName || '').trim().slice(0, 24);
    if (clean) meta.displayName = clean;
    else delete meta.displayName;
    setProfileMeta(name, meta);
  }
  function getDisplayName(name) {
    const m = getProfileMeta(name);
    return m.displayName || name || '';
  }
  // Namespace helper: default user uses bare keys (so existing progress
  // is preserved), other users get a per-user suffix.
  function ns(key) {
    const u = getUser();
    return u === DEFAULT_USER ? key : `${key}__${u}`;
  }

  // ---------- WALLET / OWNERSHIP (localStorage-backed) ----------
  const LS_COINS = 'sf_coins_v1';
  const LS_OWNED = 'sf_owned_v1';
  function getCoins() {
    if (localStorage.getItem('sf_admin_v1') === '1') return 999999999;
    const v = parseInt(localStorage.getItem(ns(LS_COINS)) || '', 10);
    return Number.isFinite(v) ? v : 250; // starter balance
  }
  function setCoins(v) { localStorage.setItem(ns(LS_COINS), String(Math.max(0, v|0))); }
  function addCoins(delta) {
    if (localStorage.getItem('sf_admin_v1') === '1') return getCoins();
    const v = parseInt(localStorage.getItem(ns(LS_COINS)) || '', 10);
    const cur = Number.isFinite(v) ? v : 250;
    const next = cur + (delta|0);
    setCoins(next);
    return next;
  }
  function getOwned() {
    try { return new Set(JSON.parse(localStorage.getItem(ns(LS_OWNED)) || '[]')); }
    catch (e) { return new Set(); }
  }
  function setOwned(set) { localStorage.setItem(ns(LS_OWNED), JSON.stringify([...set])); }
  function ownItem(kind, id) {
    const o = getOwned();
    o.add(`${kind}:${id}`);
    setOwned(o);
  }
  function isOwned(kind, id, item) {
    if (item && item.starter) return true;
    return getOwned().has(`${kind}:${id}`);
  }

  // ---------- CODES ----------
  // Built-in codes. ADMIN unlocks infinite-coin mode (sets a flag that the
  // wallet checks). Others are one-time-use coin grants. Codes are
  // case-insensitive.
  const CODES = {
    'WELCOME':   { kind:'coins',  amount: 250,  desc:'Welcome bonus' },
    'GAMEON':    { kind:'coins',  amount: 100,  desc:'Hello there!' },
    'EDUWIN':    { kind:'coins',  amount: 500,  desc:'For the scholars' },
    'CRATEBOY':  { kind:'coins',  amount: 1000, desc:'Treasure chest!' },
    // ADMIN redemption code removed — anyone who already has admin (their
    // sf_admin_v1 flag is set) keeps it because isAdmin() reads that
    // flag directly. RESETADMIN still exists so an admin can voluntarily
    // step down; without it, admin can also be turned off from the
    // admin panel's Danger Zone.
    'RESETADMIN':{ kind:'admin_off', desc:'Turn off admin mode' },
  };
  const LS_REDEEMED = 'sf_redeemed_v1';
  const LS_ADMIN    = 'sf_admin_v1';
  const LS_BANNED   = 'sf_banned_v1';
  function isAdmin() { return localStorage.getItem(LS_ADMIN) === '1'; }
  function setAdmin(on) {
    if (on) localStorage.setItem(LS_ADMIN, '1');
    else localStorage.removeItem(LS_ADMIN);
  }
  // Ban list — case-insensitive name strings. Blocks signup and forces logout
  // if a banned user is already active.
  function getBanned() {
    try { return JSON.parse(localStorage.getItem(LS_BANNED) || '[]'); }
    catch (e) { return []; }
  }
  function isBanned(name) {
    const n = (name || '').trim().toLowerCase();
    return !!n && getBanned().some(b => b.toLowerCase() === n);
  }
  function addBan(name) {
    const clean = (name || '').trim().slice(0, 24);
    if (!clean || isBanned(clean)) return false;
    const list = getBanned();
    list.push(clean);
    localStorage.setItem(LS_BANNED, JSON.stringify(list));
    return true;
  }
  function removeBan(name) {
    const n = (name || '').trim().toLowerCase();
    const list = getBanned().filter(b => b.toLowerCase() !== n);
    localStorage.setItem(LS_BANNED, JSON.stringify(list));
  }
  function getRedeemed() {
    try { return new Set(JSON.parse(localStorage.getItem(ns(LS_REDEEMED)) || '[]')); }
    catch (e) { return new Set(); }
  }
  function markRedeemed(code) {
    const r = getRedeemed(); r.add(code);
    localStorage.setItem(ns(LS_REDEEMED), JSON.stringify([...r]));
  }
  // Returns { ok, msg } describing the redemption.
  function redeemCode(rawInput) {
    const code = (rawInput || '').trim().toUpperCase();
    if (!code) return { ok:false, msg:'Enter a code' };
    const def = CODES[code];
    if (!def) return { ok:false, msg:'Unknown code' };
    if (def.kind === 'admin')     { setAdmin(true);  return { ok:true, msg:'ADMIN MODE ON — infinite coins' }; }
    if (def.kind === 'admin_off') { setAdmin(false); return { ok:true, msg:'Admin mode off' }; }
    // Coin code: one-time use
    if (getRedeemed().has(code)) return { ok:false, msg:`"${code}" already used` };
    if (def.kind === 'coins') {
      addCoins(def.amount);
      markRedeemed(code);
      return { ok:true, msg:`+${def.amount} coins · ${def.desc}` };
    }
    return { ok:false, msg:'Unknown reward type' };
  }

  // ---------- FRIENDS + TRADING (local-only mock) ----------
  // Friends are persisted in localStorage. There's no real online play, so
  // online status is faked deterministically from the name. Trades are
  // recorded as completed deals (one side gives, other side gives back).
  const LS_FRIENDS = 'sf_friends_v1';
  const LS_TRADES  = 'sf_trades_v1';

  function getFriends() {
    try { return JSON.parse(localStorage.getItem(ns(LS_FRIENDS)) || '[]'); }
    catch (e) { return []; }
  }
  function saveFriends(arr) { localStorage.setItem(ns(LS_FRIENDS), JSON.stringify(arr)); }
  function addFriend(name) {
    name = (name || '').trim().slice(0, 18);
    if (!name) return { ok:false, msg:'Enter a name' };
    const list = getFriends();
    if (list.find(f => f.name.toLowerCase() === name.toLowerCase())) {
      return { ok:false, msg:`Already added "${name}"` };
    }
    const colorIdx = (name.charCodeAt(0) + name.length) % PLAYER_COLORS.length;
    const c = PLAYER_COLORS[colorIdx];
    list.push({
      id: 'fr_' + Date.now() + '_' + Math.floor(Math.random()*1000),
      name, colorId: c.id, color: c.color,
      addedAt: Date.now(),
    });
    saveFriends(list);
    return { ok:true, msg:`Added "${name}"` };
  }
  function removeFriend(id) {
    saveFriends(getFriends().filter(f => f.id !== id));
  }
  // Fake online status: hash of name → bool; about 60% online.
  function friendIsOnline(name) {
    let h = 0; for (const ch of (name||'')) h = ((h<<5) - h + ch.charCodeAt(0)) | 0;
    return Math.abs(h % 10) < 6;
  }

  function getTrades() {
    try { return JSON.parse(localStorage.getItem(ns(LS_TRADES)) || '[]'); }
    catch (e) { return []; }
  }
  function recordTrade(trade) {
    const list = getTrades();
    list.unshift({ ...trade, at: Date.now() });
    localStorage.setItem(ns(LS_TRADES), JSON.stringify(list.slice(0, 50)));
  }
  // Trade: give one owned item, receive a random matching-rarity item from
  // friend's "pool". For the mock implementation, the friend's pool is the
  // entire unowned set. Player loses the given item (removed from owned) and
  // gains the received item.
  function executeTrade({ friendId, giveKind, giveId, wantRarity }) {
    const owned = getOwned();
    if (!owned.has(`${giveKind}:${giveId}`)) return { ok:false, msg:"You don't own that item" };
    // Pool of opposite items
    const KINDS = COSMETIC_KINDS;
    const candidates = [];
    for (const { id:kind, list } of KINDS) {
      for (const it of list) {
        if (it.starter) continue;
        if (owned.has(`${kind}:${it.id}`)) continue;
        if (wantRarity && it.rarity !== wantRarity) continue;
        candidates.push({ kind, item: it });
      }
    }
    if (candidates.length === 0) return { ok:false, msg:"Nothing available to trade for" };
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    owned.delete(`${giveKind}:${giveId}`);
    owned.add(`${pick.kind}:${pick.item.id}`);
    setOwned(owned);
    const friend = getFriends().find(f => f.id === friendId);
    recordTrade({
      friendName: friend ? friend.name : 'Unknown',
      gave: { kind: giveKind, id: giveId },
      got:  { kind: pick.kind, id: pick.item.id, name: pick.item.name, rarity: pick.item.rarity },
    });
    return { ok:true, got: pick };
  }

  // ---------- CRATES ----------
  // Each crate has a price and a per-rarity drop weight.
  const CRATES = [
    { id:'standard', name:'Standard Crate', price:100, accent:'#b6bedc',
      desc:'Mostly common gear with a chance at something rare.',
      weights:{ common:75, rare:20, epic:4, legendary:1 } },
    { id:'premium',  name:'Premium Crate',  price:500, accent:'#4ad7ff',
      desc:'Better odds for rare and epic items.',
      weights:{ common:40, rare:40, epic:15, legendary:5 } },
    { id:'mythic',   name:'Mythic Crate',   price:2000, accent:'#ffb547',
      desc:'High chance of legendary cosmetics.',
      weights:{ common:0,  rare:25, epic:50, legendary:25 } },
  ];

  // Roll a crate: returns { kind, item } or null if everything is already owned.
  function rollCrate(crate) {
    const owned = getOwned();
    // Pool all unowned items grouped by rarity
    const byRarity = { common:[], rare:[], epic:[], legendary:[] };
    for (const { id:kind, list } of COSMETIC_KINDS) {
      for (const it of list) {
        if (it.starter) continue;
        if (owned.has(`${kind}:${it.id}`)) continue;
        if (byRarity[it.rarity]) byRarity[it.rarity].push({ kind, item:it });
      }
    }
    // Build weighted picks for rarities that still have items
    const w = { ...crate.weights };
    for (const r of RARITY_LIST) if (!byRarity[r] || !byRarity[r].length) w[r] = 0;
    const total = w.common + w.rare + w.epic + w.legendary;
    if (total === 0) return null;
    let roll = Math.random() * total;
    let pickedR = 'common';
    for (const r of RARITY_LIST) {
      if (roll < w[r]) { pickedR = r; break; }
      roll -= w[r];
    }
    const pool = byRarity[pickedR];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Power-ups: iconId references icons.jsx. Tier 'common' = base draft pool. 'rare' = question-reward pool.
  // Categories: move | def | off | util | fun
  const POWERUPS = [
    // ---------- COMMON ----------
    { id:'speedy',  cat:'move', tier:'common', iconId:'pu_speedy',  name:'Speedy Boots',   desc:'+35% run speed',                            apply:b => { b.speedMul = (b.speedMul||1) * 1.35; } },
    { id:'djump',   cat:'move', tier:'common', iconId:'pu_djump',   name:'Double Jump',    desc:'Jump twice in midair',                      apply:b => { b.maxJumps = Math.max(b.maxJumps||1, 2); } },
    { id:'dash',    cat:'move', tier:'common', iconId:'pu_dash',    name:'Air Dash',       desc:'Tap punch in air to dash forward',          apply:b => { b.airDash = true; } },
    { id:'feather', cat:'move', tier:'common', iconId:'pu_feather', name:'Feather Fall',   desc:'Falls 45% slower. Stops fall damage.',      apply:b => { b.gravMul = (b.gravMul||1) * 0.55; } },
    { id:'bunny',   cat:'move', tier:'common', iconId:'pu_bunny',   name:'Bunny Hop',      desc:'Jumps 50% higher',                          apply:b => { b.jumpMul = (b.jumpMul||1) * 1.5; } },

    { id:'iron',    cat:'def',  tier:'common', iconId:'pu_iron',    name:'Iron Skin',      desc:'+50 HP this round',                         apply:b => { b.maxHp = (b.maxHp||100)+50; b.hp = b.maxHp; } },
    { id:'reflect', cat:'def',  tier:'common', iconId:'pu_reflect', name:'Reflect Shield', desc:'Next 2 hits bounce back',                   apply:b => { b.reflectCharges = (b.reflectCharges||0)+2; } },
    { id:'heavy',   cat:'def',  tier:'common', iconId:'pu_heavy',   name:'Heavy Stance',   desc:'Knockback resist x4',                       apply:b => { b.kbResist = (b.kbResist||1)*4; } },
    { id:'regen',   cat:'def',  tier:'common', iconId:'pu_regen',   name:'Quick Regen',    desc:'Heal 1 HP per second',                      apply:b => { b.regen = (b.regen||0)+1; } },

    { id:'strong',  cat:'off',  tier:'common', iconId:'pu_strong',  name:'Strong Arms',    desc:'+60% punch damage',                         apply:b => { b.punchMul = (b.punchMul||1)*1.6; } },
    { id:'reach',   cat:'off',  tier:'common', iconId:'pu_reach',   name:'Long Reach',     desc:'+40% melee range',                          apply:b => { b.reachMul = (b.reachMul||1)*1.4; } },
    { id:'kick',    cat:'off',  tier:'common', iconId:'pu_kick',    name:'Lightning Kick', desc:'+80% kick knockback',                       apply:b => { b.kickKbMul = (b.kickKbMul||1)*1.8; } },
    { id:'combo',   cat:'off',  tier:'common', iconId:'pu_combo',   name:'Combo Master',   desc:'+50% attack speed',                         apply:b => { b.atkSpdMul = (b.atkSpdMul||1)*1.5; } },

    { id:'thief',   cat:'util', tier:'common', iconId:'pu_thief',   name:'Point Thief',    desc:'Next kill steals 1 point',                  apply:b => { b.pointThief = true; } },
    { id:'gravity', cat:'util', tier:'common', iconId:'pu_gravity', name:'Gravity Flip',   desc:'Press DOWN in air to flip gravity',         apply:b => { b.gravFlip = true; } },
    { id:'magnet',  cat:'util', tier:'common', iconId:'pu_magnet',  name:'Magnet',         desc:'Pulls opponents in slowly',                 apply:b => { b.magnet = true; } },
    { id:'sticky',  cat:'util', tier:'common', iconId:'pu_sticky',  name:'Sticky Hands',   desc:'Punches stun for 0.5s',                     apply:b => { b.stunOnHit = (b.stunOnHit||0)+30; } },
    { id:'ghost',   cat:'util', tier:'common', iconId:'pu_ghost',   name:'Phase Step',     desc:'Briefly intangible after hurt',             apply:b => { b.phaseOnHurt = true; } },

    { id:'tiny',    cat:'fun',  tier:'common', iconId:'pu_tiny',    name:'Tiny Mode',      desc:'Half size. Half damage. Harder to hit.',    apply:b => { b.sizeMul = (b.sizeMul||1)*0.6; b.punchMul = (b.punchMul||1)*0.6; } },
    { id:'banana',  cat:'fun',  tier:'common', iconId:'pu_banana',  name:'Banana Peels',   desc:'Drops slippery peels behind you',           apply:b => { b.bananas = true; } },
    { id:'flame',   cat:'fun',  tier:'common', iconId:'pu_flame',   name:'Flame Trail',    desc:'Leaves fire that burns enemies',            apply:b => { b.flameTrail = true; } },
    { id:'drunk',   cat:'fun',  tier:'common', iconId:'pu_drunk',   name:'Caffeinated',    desc:'Inputs jitter randomly. Faster attacks.',   apply:b => { b.jitter = true; b.atkSpdMul = (b.atkSpdMul||1)*1.3; } },
    { id:'rocket',  cat:'fun',  tier:'common', iconId:'pu_rocket',  name:'Rocket Boost',   desc:'Holding jump rockets you upward',           apply:b => { b.rocket = true; } },
    { id:'slow',    cat:'fun',  tier:'common', iconId:'pu_slow',    name:'Sticky Aura',    desc:'Opponents move 30% slower near you',        apply:b => { b.slowAura = true; } },

    // ---------- RARE (question-reward pool) ----------
    { id:'tjump',   cat:'move', tier:'rare',   iconId:'pu_tjump',   name:'Triple Jump',    desc:'Three jumps. Defy gravity.',                apply:b => { b.maxJumps = Math.max(b.maxJumps||1, 3); } },
    { id:'second',  cat:'def',  tier:'rare',   iconId:'pu_second',  name:'Second Wind',    desc:'Revive once at 30 HP',                      apply:b => { b.revives = (b.revives||0)+1; } },
    { id:'crit',    cat:'off',  tier:'rare',   iconId:'pu_crit',    name:'Critical Hits',  desc:'25% chance to triple-damage',               apply:b => { b.critChance = (b.critChance||0)+0.25; } },
    { id:'giant',   cat:'fun',  tier:'rare',   iconId:'pu_giant',   name:'Giant Mode',     desc:'+50% size. +50 HP. Easier to hit.',         apply:b => { b.sizeMul = (b.sizeMul||1)*1.5; b.maxHp = (b.maxHp||100)+50; b.hp = b.maxHp; } },
    { id:'rainbow', cat:'fun',  tier:'rare',   iconId:'pu_rainbow', name:'Rainbow Trail',  desc:'+10% to everything. Pure style.',           apply:b => { b.speedMul=(b.speedMul||1)*1.1; b.punchMul=(b.punchMul||1)*1.1; b.maxHp=(b.maxHp||100)+10; b.hp=b.maxHp; b.rainbow=true; } },
  ];

  const MODES = [
    { id:'fight',   name:'Stick Fight',      iconId:'mode_fight',  ready:true, desc:'Melee brawl. Last one standing scores.' },
    { id:'sumo',    name:'Sumo Push',        iconId:'mode_sumo',   ready:true, desc:'No damage. Knock opponents off the stage to score.' },
    { id:'koth',    name:'King of the Hill', iconId:'crown',       ready:true, desc:'Hold the top platform to earn points.' },
    { id:'bomb',    name:'Bomb Tag',         iconId:'pu_flame',    ready:true, desc:'Pass the bomb before it explodes. Carrier loses HP.' },
    { id:'last',    name:'Last Stand',       iconId:'pu_iron',     ready:true, desc:'Endless waves. Survive and rack up KOs.' },
    { id:'parkour', name:'Parkour Race',     iconId:'mode_parkour',ready:true, desc:'No damage. Race across the course to the finish flag.' },
    { id:'golf',    name:'Mini Golf',        iconId:'mode_golf',   ready:true, desc:'Top-down golf. Click and drag to swing. Fewest strokes wins.' },
    { id:'td',      name:'Tower Defense',    iconId:'pu_iron',     ready:true, desc:'Top-down tower defense. Place towers, stop the enemy waves.' },
    { id:'coins',   name:'Coin Rush',        iconId:'coin',        ready:true, desc:'Gold coins rain from the sky. Grab them. First to the target wins.' },
  ];

  // ---------- STAGES ----------
  // Each stage now ships its own platform layout AND its own hazards.
  // Hazards: { x, y, w, h, type:'spike'|'lava'|'sawblade'|'instakill', dmg?, cooldown? }
  // Coords are inside a 1280x720 canvas. GROUND_Y baseline ≈ 560.
  const GY = 560;
  const STAGES = [
    {
      id:'cavern', name:'Lava Cavern',
      sky:['#3a0f29','#0a0512'], lava:'#ff4d2e', plat:'#1a0f22', accent:'#ffb547',
      props:['lanterns','embers'],
      platforms: [
        { x:0,   y:GY, w:1280, h:100, solid:true },
        { x:180, y:430, w:220, h:18, solid:false },
        { x:880, y:430, w:220, h:18, solid:false },
        { x:530, y:320, w:220, h:18, solid:false },
      ],
      hazards: [],   // full floor — no spike strip
      spawns: [ {x:300,y:GY}, {x:980,y:GY}, {x:640,y:320}, {x:200,y:430} ],
    },
    {
      id:'temple', name:'Ancient Temple',
      sky:['#22103a','#0a0512'], lava:'#ff8a3d', plat:'#241a3a', accent:'#ffd76a',
      props:['pillars','torches','embers'],
      platforms: [
        { x:0,    y:GY, w:520,  h:100, solid:true },
        { x:760,  y:GY, w:520,  h:100, solid:true },
        { x:430, y:480, w:90, h:18, solid:false },
        { x:760, y:480, w:90, h:18, solid:false },
        { x:560, y:380, w:160, h:18, solid:false },
        { x:600, y:260, w:80,  h:18, solid:false },
      ],
      // lava pit only damages players who actually fell INTO the pit (y >= 580)
      hazards: [
        { x:520, y:580, w:240, h:160, type:'lava', dmg:6, cooldown:10 },
      ],
      spawns: [ {x:260,y:GY}, {x:1020,y:GY}, {x:640,y:260}, {x:640,y:380} ],
    },
    {
      id:'dusk', name:'Dusk Cliffs',
      sky:['#5a173d','#13060f'], lava:'#ff5b6e', plat:'#1a0a18', accent:'#ff8aa6',
      props:['cliffs','moons','sparkles'],
      platforms: [
        { x:60,   y:GY-40, w:280, h:140, solid:true },
        { x:500,  y:GY-80, w:280, h:180, solid:true },
        { x:940,  y:GY-40, w:280, h:140, solid:true },
        { x:340,  y:410,   w:120, h:16, solid:false },
        { x:820,  y:410,   w:120, h:16, solid:false },
      ],
      hazards: [],
      spawns: [ {x:200,y:GY-40}, {x:1080,y:GY-40}, {x:640,y:GY-80}, {x:400,y:410} ],
    },
    {
      id:'forge', name:'Iron Forge',
      sky:['#2a1408','#0a0a14'], lava:'#ff7a18', plat:'#1a1a22', accent:'#ffaa3a',
      props:['chains','embers'],
      platforms: [
        { x:0,   y:GY, w:1280, h:100, solid:true },
        { x:140, y:460, w:200, h:18, solid:false },
        { x:940, y:460, w:200, h:18, solid:false },
        { x:560, y:340, w:160, h:18, solid:false },
      ],
      // sawblades are floating mid-air hazards (well above the ground)
      hazards: [
        { x:380, y:480, w:60, h:60, type:'sawblade', dmg:8, cooldown:16 },
        { x:840, y:480, w:60, h:60, type:'sawblade', dmg:8, cooldown:16 },
      ],
      spawns: [ {x:240,y:GY}, {x:1040,y:GY}, {x:640,y:340}, {x:240,y:460} ],
    },
    {
      id:'tower', name:'Tower of Trials',
      sky:['#06122a','#020410'], lava:'#5bf0e8', plat:'#0a1a36', accent:'#5bf0e8',
      props:['sparkles'],
      platforms: [
        { x:480, y:GY, w:320, h:100, solid:true },
        { x:140, y:500, w:160, h:16, solid:false },
        { x:980, y:500, w:160, h:16, solid:false },
        { x:280, y:380, w:160, h:16, solid:false },
        { x:840, y:380, w:160, h:16, solid:false },
        { x:560, y:260, w:160, h:16, solid:false },
        { x:380, y:140, w:520, h:16, solid:false },
      ],
      // spike strip only in side gaps (well outside the tower base)
      hazards: [
        { x:0,   y:GY+50, w:480, h:8, type:'spike', dmg:5, cooldown:14 },
        { x:800, y:GY+50, w:480, h:8, type:'spike', dmg:5, cooldown:14 },
      ],
      spawns: [ {x:640,y:GY}, {x:640,y:140}, {x:640,y:260}, {x:360,y:380} ],
    },
    {
      id:'islands', name:'Sky Islands',
      sky:['#1a4a7a','#0a1a3a'], lava:'#ff5b6e', plat:'#3a5a7a', accent:'#a5e0ff',
      props:['sparkles'],
      platforms: [
        { x:80,    y:GY-30, w:260, h:120, solid:true },
        { x:480,   y:480,   w:280, h:80,  solid:true },
        { x:920,   y:GY-30, w:280, h:120, solid:true },
        { x:540,   y:240,   w:200, h:18,  solid:false },
      ],
      hazards: [],
      spawns: [ {x:200,y:GY-30}, {x:1060,y:GY-30}, {x:620,y:480}, {x:640,y:240} ],
    },
    {
      id:'spikepit', name:'Spike Pit',
      sky:['#1a0a18','#06030a'], lava:'#cc3a4a', plat:'#22162a', accent:'#ff5b5b',
      props:['lanterns'],
      platforms: [
        { x:60,    y:GY-30, w:160, h:120, solid:true },
        { x:300,   y:GY-30, w:160, h:120, solid:true },
        { x:540,   y:GY-30, w:200, h:120, solid:true },
        { x:820,   y:GY-30, w:160, h:120, solid:true },
        { x:1060,  y:GY-30, w:160, h:120, solid:true },
        { x:380,   y:380,   w:120, h:16, solid:false },
        { x:780,   y:380,   w:120, h:16, solid:false },
        { x:560,   y:240,   w:160, h:16, solid:false },
      ],
      // spikes ONLY in gaps between pillars (not under them)
      hazards: [
        { x:220, y:GY+20, w:80,  h:14, type:'spike', dmg:6, cooldown:12 },
        { x:460, y:GY+20, w:80,  h:14, type:'spike', dmg:6, cooldown:12 },
        { x:740, y:GY+20, w:80,  h:14, type:'spike', dmg:6, cooldown:12 },
        { x:980, y:GY+20, w:80,  h:14, type:'spike', dmg:6, cooldown:12 },
      ],
      spawns: [ {x:140,y:GY-30}, {x:1140,y:GY-30}, {x:640,y:GY-30}, {x:640,y:240} ],
    },
    {
      id:'frozen', name:'Frozen Caverns',
      sky:['#0a2a3a','#020a14'], lava:'#5be0ff', plat:'#3a6a8a', accent:'#b5f0ff',
      props:['sparkles'],
      platforms: [
        { x:0,   y:GY, w:1280, h:100, solid:true },
        { x:200, y:420, w:240, h:18, solid:false },
        { x:840, y:420, w:240, h:18, solid:false },
        { x:520, y:290, w:240, h:18, solid:false },
        { x:60,  y:250, w:140, h:18, solid:false },
        { x:1080,y:250, w:140, h:18, solid:false },
      ],
      hazards: [],   // no ground spike — full floor
      spawns: [ {x:260,y:GY}, {x:1020,y:GY}, {x:640,y:290}, {x:130,y:250} ],
    },
  ];

  function pickRandom(arr, n) {
    const copy = arr.slice();
    const out = [];
    while (out.length < n && copy.length) {
      out.push(copy.splice(Math.floor(Math.random()*copy.length), 1)[0]);
    }
    return out;
  }
  function pickRandomTier(tier, n) {
    return pickRandom(POWERUPS.filter(p => p.tier === tier), n);
  }

  function eduTitle(on) { return on ? 'STICK SCHOLAR' : 'STICK FIGHT'; }
  function eduSub(on)   { return on ? 'the friendly bonk game' : 'the game'; }

  function catLabel(c) { return ({ move:'Movement', def:'Defense', off:'Offense', util:'Utility', fun:'Wacky' })[c] || c; }
  function catIconId(c) { return ({ move:'cat_move', def:'cat_def', off:'cat_off', util:'cat_util', fun:'cat_fun' })[c] || 'star'; }

  return {
    PLAYER_COLORS, HATS, OUTFITS, FACES, TRAILS, AURAS, HALOS,
    POWERUPS, MODES, STAGES,
    pickRandom, pickRandomTier, eduTitle, eduSub, catLabel, catIconId,
    // currency + crates
    COSMETIC_KINDS, RARITY_LIST, RARITY_COLOR, CRATES,
    getCoins, setCoins, addCoins,
    getOwned, ownItem, isOwned,
    rollCrate,
    // codes
    CODES, redeemCode, isAdmin, setAdmin,
    getBanned, isBanned, addBan, removeBan,
    // friends + trading
    getFriends, addFriend, removeFriend, friendIsOnline,
    getTrades, executeTrade,
    // accounts
    getUser, setUser, listUsers, userExists, deleteUser, DEFAULT_USER,
    AVATARS, getAvatar, setAvatar,
    getDisplayName, setDisplayName,
    getCustomAvatar, setCustomAvatar,
    getPlayerColor, setPlayerColor,
    getEquipped, setEquipped,
    setPassword, hasPassword, verifyPassword,
  };
})();
