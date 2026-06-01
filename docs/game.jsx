/* global React, window */
// Detailed canvas-based stick-fight engine.
// Stickman now has: joints, hands, feet, shaded body, outfit/cape layer, face overlay, trail samples.
// Stage has: animated lava waves, embers, parallax silhouettes, stage-specific props.

window.StickFightGame = (function () {
  const { useEffect, useRef } = React;

  // ---------- Audio (synthesized SFX) ----------
  // Tiny WebAudio synth — no asset loading, generates short blips/noise on the
  // fly. Respects the `sf_muted` localStorage flag toggled in the Settings panel.
  let _audioCtx = null;
  // Track recent calls per sound name so rapid-fire events (machine-gun towers,
  // chain hits) don't pile up into a buzzy roar.
  const _sfxLast = {};
  function getAudioCtx() {
    if (typeof window === 'undefined') return null;
    if (!_audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { _audioCtx = new AC(); } catch(e) { return null; }
    }
    if (_audioCtx.state === 'suspended') _audioCtx.resume().catch(()=>{});
    return _audioCtx;
  }
  function sfxMuted() {
    try { return localStorage.getItem('sf_muted') === '1'; } catch(e) { return false; }
  }
  // Throttle by name — skip if same sound played within `minGapMs` ago.
  function sfxThrottle(name, minGapMs) {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const last = _sfxLast[name] || 0;
    if (now - last < minGapMs) return true;
    _sfxLast[name] = now;
    return false;
  }
  // Schedule a single oscillator tone with an attack/decay envelope. `slide` is
  // an additive change in Hz applied over the duration (negative = pitch down).
  function sfxTone({ freq=440, dur=0.1, type='sine', vol=0.18, slide=0, attack=0.005, decay=0.7 }) {
    if (sfxMuted()) return;
    const ctx = getAudioCtx(); if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    const t0 = ctx.currentTime;
    o.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slide) {
      const end = Math.max(20, freq + slide);
      o.frequency.exponentialRampToValueAtTime(end, t0 + dur);
    }
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * decay + attack);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  // Short filtered-noise burst — gives thuds & impacts their crunchy texture.
  function sfxNoise({ dur=0.1, vol=0.18, freq=600, q=4 }) {
    if (sfxMuted()) return;
    const ctx = getAudioCtx(); if (!ctx) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start();
  }
  // Named SFX presets. Each is throttled so spammy events don't grate.
  const SFX = {
    punch() {
      if (sfxThrottle('punch', 50)) return;
      sfxNoise({ dur:0.07, vol:0.22, freq:280, q:2 });
      sfxTone({ freq:220, dur:0.08, type:'square', vol:0.07, slide:-60 });
    },
    kick() {
      if (sfxThrottle('kick', 50)) return;
      sfxNoise({ dur:0.11, vol:0.28, freq:200, q:1.5 });
      sfxTone({ freq:160, dur:0.12, type:'sawtooth', vol:0.09, slide:-80 });
    },
    jump() {
      if (sfxThrottle('jump', 80)) return;
      sfxTone({ freq:340, dur:0.16, type:'triangle', vol:0.12, slide:280 });
    },
    hurt() {
      if (sfxThrottle('hurt', 60)) return;
      sfxTone({ freq:520, dur:0.13, type:'sawtooth', vol:0.14, slide:-260 });
    },
    die() {
      sfxTone({ freq:440, dur:0.35, type:'square', vol:0.16, slide:-320 });
      setTimeout(() => sfxNoise({ dur:0.12, vol:0.14, freq:160, q:1 }), 60);
    },
    towerFire(kind) {
      if (sfxThrottle('tf_' + (kind||'b'), 40)) return;
      if (kind === 'cannon') {
        sfxNoise({ dur:0.16, vol:0.26, freq:120, q:1 });
      } else if (kind === 'laser') {
        sfxTone({ freq:1200, dur:0.06, type:'sawtooth', vol:0.07 });
      } else if (kind === 'sniper') {
        sfxNoise({ dur:0.05, vol:0.15, freq:1400, q:6 });
        sfxTone({ freq:880, dur:0.08, type:'square', vol:0.07, slide:-300 });
      } else if (kind === 'tesla') {
        sfxNoise({ dur:0.08, vol:0.18, freq:2200, q:8 });
      } else if (kind === 'poison') {
        sfxTone({ freq:380, dur:0.18, type:'sine', vol:0.09, slide:-160 });
      } else if (kind === 'frost') {
        sfxTone({ freq:720, dur:0.12, type:'triangle', vol:0.09, slide:-180 });
      } else {
        sfxTone({ freq:560, dur:0.07, type:'square', vol:0.09, slide:-180 });
      }
    },
    enemyHit() {
      if (sfxThrottle('eh', 35)) return;
      sfxTone({ freq:700, dur:0.05, type:'triangle', vol:0.07, slide:-300 });
    },
    enemyDie() {
      if (sfxThrottle('ed', 35)) return;
      sfxNoise({ dur:0.14, vol:0.18, freq:300 });
      sfxTone({ freq:240, dur:0.16, type:'sawtooth', vol:0.09, slide:-120 });
    },
    place() {
      sfxTone({ freq:520, dur:0.1, type:'triangle', vol:0.14, slide:120 });
    },
    upgrade() {
      sfxTone({ freq:520, dur:0.09, type:'triangle', vol:0.14, slide:200 });
      setTimeout(() => sfxTone({ freq:780, dur:0.12, type:'triangle', vol:0.14, slide:200 }), 80);
    },
    sell() {
      sfxTone({ freq:420, dur:0.16, type:'sine', vol:0.14, slide:-160 });
    },
    win() {
      sfxTone({ freq:520, dur:0.12, type:'triangle', vol:0.18 });
      setTimeout(() => sfxTone({ freq:660, dur:0.12, type:'triangle', vol:0.18 }), 110);
      setTimeout(() => sfxTone({ freq:880, dur:0.22, type:'triangle', vol:0.20 }), 230);
    },
    lose() {
      sfxTone({ freq:440, dur:0.18, type:'sawtooth', vol:0.16, slide:-220 });
      setTimeout(() => sfxTone({ freq:260, dur:0.28, type:'sawtooth', vol:0.16, slide:-160 }), 180);
    },
    coin() {
      if (sfxThrottle('coin', 60)) return;
      sfxTone({ freq:880, dur:0.06, type:'triangle', vol:0.12 });
      setTimeout(() => sfxTone({ freq:1320, dur:0.10, type:'triangle', vol:0.12 }), 50);
    },
  };

  // ---------- world ----------
  const W = 1280, H = 720;
  const GROUND_Y = 560;
  const LAVA_Y = 660;
  const GRAV = 0.55;
  const JUMP_V = -13;
  const WALK = 4.2;
  const FRICTION = 0.82;
  const AIR_FRICTION = 0.96;
  const PUNCH_COOLDOWN = 22;
  const KICK_COOLDOWN  = 34;
  const PUNCH_DMG = 8;
  const KICK_DMG  = 12;
  const PUNCH_KB  = 6;
  const KICK_KB   = 11;
  const PUNCH_RANGE = 42;
  const KICK_RANGE  = 50;

  // Fallback platforms used only if a stage doesn't supply its own.
  const DEFAULT_PLATFORMS = [
    { x:0,    y:GROUND_Y, w:W,   h:100, solid:true  },
    { x:180,  y:430,      w:220, h:18,  solid:false },
    { x:880,  y:430,      w:220, h:18,  solid:false },
    { x:530,  y:320,      w:220, h:18,  solid:false },
  ];

  const KEYMAPS = [
    { left:'KeyA',     right:'KeyD',      jump:'KeyW',     down:'KeyS',     punch:'KeyF',     kick:'KeyG'      },
    { left:'ArrowLeft',right:'ArrowRight',jump:'ArrowUp',  down:'ArrowDown',punch:'Slash',    kick:'Period'    },
    { left:'KeyJ',     right:'KeyL',      jump:'KeyI',     down:'KeyK',     punch:'KeyH',     kick:'KeyN'      },
    { left:'Numpad4',  right:'Numpad6',   jump:'Numpad8',  down:'Numpad5',  punch:'Numpad1',  kick:'Numpad2'   },
  ];

  const KEY_LABEL = {
    KeyA:'A', KeyD:'D', KeyW:'W', KeyS:'S', KeyF:'F', KeyG:'G',
    KeyJ:'J', KeyL:'L', KeyI:'I', KeyK:'K', KeyH:'H', KeyN:'N',
    ArrowLeft:'←', ArrowRight:'→', ArrowUp:'↑', ArrowDown:'↓',
    Slash:'/', Period:'.',
    Numpad4:'N4', Numpad6:'N6', Numpad8:'N8', Numpad5:'N5', Numpad1:'N1', Numpad2:'N2',
  };

  function controlsFor(idx) {
    const km = KEYMAPS[idx]; if (!km) return null;
    return {
      left: KEY_LABEL[km.left], right: KEY_LABEL[km.right],
      jump: KEY_LABEL[km.jump], punch: KEY_LABEL[km.punch], kick: KEY_LABEL[km.kick],
    };
  }

  // ---------- player factory ----------
  function makePlayer(slotIdx, profile) {
    const buffs = { maxHp:100, hp:100, maxJumps:1 };
    (profile.buffs || []).forEach(p => { try { p.apply(buffs); } catch(e){} });
    // Use stage-supplied spawn if provided
    let x, y;
    const spawn = profile.spawns && profile.spawns[slotIdx % profile.spawns.length];
    if (spawn) { x = spawn.x; y = spawn.y - 1; }
    else {
      x = 200 + slotIdx * (W - 400) / Math.max(1, profile.totalSlots - 1);
      y = 200;
    }
    return {
      slot: slotIdx,
      isBot: profile.isBot,
      keys: KEYMAPS[slotIdx] || KEYMAPS[0],
      name: profile.name,
      color: profile.color,
      darkColor: profile.darkColor,
      hat: profile.hat,
      outfit: profile.outfit,
      face: profile.face,
      trail: profile.trail,
      buffs,
      maxHp: buffs.maxHp,
      hp: buffs.hp,
      x, y, vx:0, vy:0,
      facing: slotIdx % 2 === 0 ? 1 : -1,
      onGround:false, jumpsLeft:buffs.maxJumps||1,
      cd:0, kickCd:0, dashCd:0,
      stun:0,
      reflectLeft:(buffs.reflectCharges||0),
      revivesLeft:(buffs.revives||0),
      phaseLeft:0,
      regenTick:0,
      animPhase: Math.random()*100,
      trailSamples:[],
      banana:0,
      animPunch:0, animKick:0, animHurt:0,
      alive:true, dead:false, deadTimer:0,
      ragdoll:null,
      score: profile.score || 0,
    };
  }

  // ---------- main React component ----------
  function StickFightCanvas({ players, stage, edu, mode, botDifficulty, tdEndless, tdMapId, paused, onRoundEnd }) {
    const canvasRef = useRef(null);
    const stateRef = useRef(null);
    const rafRef = useRef(0);
    const keysRef = useRef({});
    const pausedRef = useRef(false);
    pausedRef.current = !!paused;

    useEffect(() => {
      const totalSlots = players.length;
      const built = players.map((p, i) => makePlayer(i, { ...p, totalSlots, spawns: stage.spawns }));
      const state = {
        players: built,
        proj: [], particles: [], embers: [], popups: [], toasts: [],
        // Killstreak counter for the human player — reset on death.
        killStreak: 0,
        firstKill: false,
        // Last wave-reached milestone we toasted for (avoids re-toasting).
        lastWaveToast: 0,
        frame: 0, winner: null, endTimer: 0, shake: 0,
        edu, stage,
        mode: mode || 'fight',
        botDifficulty: botDifficulty || 'normal',
        platforms: stage.platforms && stage.platforms.length ? stage.platforms : DEFAULT_PLATFORMS,
        hazards: stage.hazards || [],
        hitstop: 0,
        // per-mode auxiliary state
        bomb: null,       // bomb tag
        ball: null,       // mini golf
        td: null,         // tower defense
        finish: null,     // parkour race
        wave: null,       // last stand / TD
      };

      // ----- BOSS RUSH: huge CPU with triple HP + phase enrages -----
      if (state.mode === 'boss') {
        for (const p of state.players) {
          if (p.isBot) {
            p.maxHp = 360; p.hp = 360;
            p.buffs.sizeMul = (p.buffs.sizeMul || 1) * 1.9;
            p.buffs.kbResist = (p.buffs.kbResist || 1) * 6;
            p.buffs.punchMul = (p.buffs.punchMul || 1) * 1.4;
            p.bossPhase = 1;
          }
        }
      }

      // ----- BOMB TAG: spawn bomb mid-stage on a random player -----
      if (state.mode === 'bomb') {
        const first = state.players[Math.floor(Math.random() * state.players.length)];
        state.bomb = { carrierSlot: first.slot, timer: 60 * 6 /* 6 seconds */ , flashIntense:false };
      }

      // ----- PARKOUR RACE: real course with gaps + floating platforms -----
      if (state.mode === 'parkour') {
        // Course fits within W = 1280 canvas. Start ground on left,
        // finish ground + flag on right.
        state.platforms = [
          // Starting platform (LEFT)
          { x: 0,    y: GROUND_Y, w: 180, h: 100, solid:true },
          // Stepping platforms across lava gaps (left → right, varied height)
          { x: 240,  y: GROUND_Y - 60,  w: 90,  h: 18, solid:false },
          { x: 370,  y: GROUND_Y - 130, w: 90,  h: 18, solid:false },
          { x: 500,  y: GROUND_Y - 80,  w: 90,  h: 18, solid:false },
          { x: 620,  y: GROUND_Y - 160, w: 80,  h: 18, solid:false },
          { x: 740,  y: GROUND_Y - 100, w: 80,  h: 18, solid:false },
          { x: 860,  y: GROUND_Y - 60,  w: 90,  h: 18, solid:false },
          { x: 990,  y: GROUND_Y - 130, w: 80,  h: 18, solid:false },
          // Finish ground platform (RIGHT)
          { x: 1100, y: GROUND_Y, w: 180, h: 100, solid:true },
        ];
        state.hazards = [];
        // Spawn everyone on the left starting platform
        for (let i = 0; i < state.players.length; i++) {
          state.players[i].x = 60 + i * 24;
          state.players[i].y = GROUND_Y - 4;
          state.players[i].vx = 0; state.players[i].vy = 0;
        }
        // Finish flag — well inside the canvas on the right ground
        state.finish = { x: 1190, y: GROUND_Y - 90, w: 60, h: 90 };
      }

      // ----- LAST STAND: bots respawn endlessly, count kills -----
      if (state.mode === 'last') {
        state.wave = { killCount: 0 };
      }

      // ----- MINI GOLF (TRUE TOP-DOWN) -----
      // Replaces side-scroller. Course is the entire canvas. Click+drag from
      // the ball to set direction and power; release to swing. Walls bounce
      // the ball. Drag distance up to 220 px = max power.
      if (state.mode === 'golf') {
        // Course list — each course has tee, hole, walls.
        const COURSES = [
          { // simple straight shot with one wall
            tee:{x:160, y:H-180}, hole:{x:W-180, y:180},
            walls:[ { x:W*0.45, y:200, w:18, h:320 } ],
            par: 2,
          },
          { // L-shape
            tee:{x:170, y:H-160}, hole:{x:W-180, y:H-160},
            walls:[
              { x:W*0.5 - 9, y:200, w:18, h:H - 320 },
              { x:300, y:200, w:W*0.5 - 290, h:18 },
            ],
            par: 3,
          },
          { // U-shape
            tee:{x:160, y:200}, hole:{x:W-160, y:200},
            walls:[
              { x:W*0.32, y:160, w:18, h:H - 240 },
              { x:W*0.68, y:160, w:18, h:H - 240 },
            ],
            par: 4,
          },
        ];
        state.golf = {
          courses: COURSES, courseIdx: 0,
          activeSlot: 0,
          strokes: state.players.map(() => 0),
          totalStrokes: state.players.map(() => 0),
          holed: state.players.map(() => false),
          aim: null,            // { from:{x,y}, to:{x,y} } while dragging
          turnTimer: 60 * 20,
        };
        const c0 = COURSES[0];
        state.ball  = { x:c0.tee.x, y:c0.tee.y, vx:0, vy:0, r:10 };
        state.finish = { x:c0.hole.x - 14, y:c0.hole.y - 14, w:28, h:28 };
      }

      // ----- TOWER DEFENSE (TOP-DOWN, path-based) -----
      if (state.mode === 'td') {
        const path = tdGenPath(tdMapId);
        state.td = {
          path,
          pathId: path._id || 'zigzag',
          pathLen: pathTotalLen(path),
          baseHp: 30,
          gold: 250,
          waveNum: 1, waveTimer: 60 * 4,
          enemies: [], towers: [], proj: [],
          spawnLeft: 5,
          maxWaves: 7,
          baseLost: false,
          endless: !!tdEndless,
          maxWaves: tdEndless ? 9999 : 7,
          // Wave control: player must press "Start Wave" between waves so they
          // can place/upgrade at their own pace. `waveReady` = waiting for start.
          waveReady: true,
          // Game speed (1 or 2) — toggleable via UI button.
          speed: 1,
          // Tower catalog
          towerKinds: TD_TOWER_KINDS,
          selectedKind: 'basic',
          // Selected placed tower (for upgrade UI)
          selectedTower: null,
        };
      }
      // spawn ambient embers based on stage
      for (let i = 0; i < 80; i++) {
        state.embers.push({
          x: Math.random()*W, y: 200 + Math.random()*(LAVA_Y-200),
          vy: -0.2 - Math.random()*0.3,
          vx: (Math.random()-.5)*0.2,
          r: 0.5 + Math.random()*1.5,
          life: 100 + Math.random()*200,
          maxLife: 0, c: stage.lava,
        });
      }
      for (const e of state.embers) e.maxLife = e.life;
      stateRef.current = state;

      const onKey = (e, down) => { keysRef.current[e.code] = down; };
      const onDown = e => onKey(e, true);
      const onUp = e => onKey(e, false);
      window.addEventListener('keydown', onDown);
      window.addEventListener('keyup', onUp);

      // Mouse capture for top-down modes (golf aim, TD tower placement)
      const cv = canvasRef.current;
      const cssToGame = (e) => {
        const r = cv.getBoundingClientRect();
        return {
          x: (e.clientX - r.left) * (W / r.width),
          y: (e.clientY - r.top)  * (H / r.height),
        };
      };
      const onMouseDown = e => {
        const pt = cssToGame(e);
        const st = stateRef.current; if (!st) return;
        if (st.mode === 'golf' && st.ball && !st.winner) {
          // Start aim if click is near the ball
          const dx = pt.x - st.ball.x, dy = pt.y - st.ball.y;
          if (Math.hypot(dx, dy) < 40 && Math.abs(st.ball.vx) < 0.3 && Math.abs(st.ball.vy) < 0.3) {
            st.golf.aim = { from:{ x:st.ball.x, y:st.ball.y }, to:pt };
          }
        } else if (st.mode === 'td' && st.td && !st.winner) {
          // Order of checks:
          // 1. Upgrade panel buttons (if a tower is selected)
          // 2. Click on existing tower → select it
          // 3. Tower-kind picker
          // 4. Place a new tower
          if (tdControlsClick(st, pt.x, pt.y)) return;
          if (tdUpgradePanelClick(st, pt.x, pt.y)) return;
          const existing = tdTowerAt(st, pt.x, pt.y);
          if (existing) {
            // Click the SAME tower again → deselect (toggle off).
            if (st.td.selectedTower === existing) st.td.selectedTower = null;
            else st.td.selectedTower = existing;
            return;
          }
          if (tdSelectTowerAt(st, pt.x, pt.y)) { st.td.selectedTower = null; return; }
          // Clicking empty grass: deselect or place
          if (st.td.selectedTower) { st.td.selectedTower = null; return; }
          tdTryPlaceTower(st, pt.x, pt.y);
        }
      };
      const onMouseMove = e => {
        const pt = cssToGame(e);
        const st = stateRef.current; if (!st) return;
        if (st.mode === 'golf' && st.golf && st.golf.aim) {
          st.golf.aim.to = pt;
        }
        if (st) st.mousePos = pt;
      };
      const onMouseUp = e => {
        const st = stateRef.current; if (!st) return;
        if (st.mode === 'golf' && st.golf && st.golf.aim) {
          golfRelease(st);
        }
      };
      cv.addEventListener('mousedown', onMouseDown);
      cv.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      const ctx = canvasRef.current.getContext('2d');
      const loop = () => {
        if (pausedRef.current) {
          // Paused — keep painting the last frame, skip simulation.
          draw(ctx, state);
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        // TD 2× speed runs the sim step twice per RAF.
        const tdSpeed = (state.mode === 'td' && state.td && state.td.speed) || 1;
        const iterations = Math.max(1, Math.min(4, tdSpeed));
        for (let i = 0; i < iterations; i++) {
          if (state.hitstop > 0) { state.hitstop--; }
          else { step(state, keysRef.current); }
          if (state.winner !== null) break;
        }
        draw(ctx, state);
        if (state.winner !== null) {
          // Fire win/lose sting once at the moment the winner is decided.
          if (!state._winSfxPlayed) {
            state._winSfxPlayed = true;
            const human = state.players.find(p => !p.isBot);
            if (human && state.winner === human.slot) SFX.win();
            else SFX.lose();
          }
          state.endTimer--;
          if (state.endTimer <= 0) {
            const w = state.players.find(p => p.slot === state.winner);
            // KOTH transfers full kothScore so the match-won check fires.
            const pts = (state.mode === 'koth' && w) ? (w.kothScore || 1) : 1;
            onRoundEnd(state.winner, pts);
            return;
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(rafRef.current);
        window.removeEventListener('keydown', onDown);
        window.removeEventListener('keyup', onUp);
        cv.removeEventListener('mousedown', onMouseDown);
        cv.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    // eslint-disable-next-line
    }, []);

    return (
      <div style={{ position:'relative', width:'100%', maxWidth:W, margin:'0 auto' }}>
        <canvas id="game" ref={canvasRef} width={W} height={H}
                style={{ width:'100%', height:'auto', borderRadius:14, border:'1px solid var(--line-2)',
                         boxShadow:'0 18px 60px rgba(0,0,0,.6)', background:'#0a0512' }} />
      </div>
    );
  }

  // ===================== SIM =====================
  function step(state, keys) {
    state.frame++;
    if (state.shake > 0) state.shake--;

    // embers
    for (const e of state.embers) {
      e.x += e.vx; e.y += e.vy; e.life--;
      if (e.life <= 0) { e.x = Math.random()*W; e.y = LAVA_Y-20; e.life = e.maxLife; }
    }

    // particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += (p.g || 0.2); p.life--;
      if (p.life <= 0) state.particles.splice(i,1);
    }
    // damage popups (drift up, slow down, fade)
    if (state.popups) {
      for (let i = state.popups.length - 1; i >= 0; i--) {
        const u = state.popups[i];
        u.x += u.vx; u.y += u.vy;
        u.vy *= 0.94; u.vx *= 0.96;
        u.life++;
        if (u.life >= u.maxLife) state.popups.splice(i, 1);
      }
    }
    // achievement toasts (banner timer)
    if (state.toasts) {
      for (let i = state.toasts.length - 1; i >= 0; i--) {
        state.toasts[i].life++;
        if (state.toasts[i].life >= state.toasts[i].maxLife) state.toasts.splice(i, 1);
      }
    }

    // projectiles
    for (let i = state.proj.length - 1; i >= 0; i--) {
      const pr = state.proj[i]; pr.life--;
      if (pr.type === 'banana') {
        for (const pl of state.players) {
          if (!pl.alive || pl.slot === pr.owner) continue;
          if (Math.abs(pl.x - pr.x) < 20 && Math.abs(pl.y - pr.y) < 20 && pl.onGround) {
            pl.vx = (pl.x - pr.x > 0 ? 1 : -1) * 7;
            pl.vy = -6; pl.stun = 24;
            spawnParticles(state, pr.x, pr.y, '#ffd84a', 8);
            state.proj.splice(i,1); break;
          }
        }
      } else if (pr.type === 'fire') {
        for (const pl of state.players) {
          if (!pl.alive || pl.slot === pr.owner) continue;
          if (Math.abs(pl.x - pr.x) < 18 && Math.abs(pl.y - pr.y) < 18) {
            if (state.frame % 6 === 0) damagePlayer(state, pl, 1, 0, 0, pr.owner);
          }
        }
      }
      if (pr.life <= 0) state.proj.splice(i,1);
    }

    // simulate players
    for (const p of state.players) {
      if (!p.alive) {
        p.deadTimer++;
        if (p.ragdoll) {
          p.ragdoll.vy += 0.6;
          p.ragdoll.y += p.ragdoll.vy;
          p.ragdoll.x += p.ragdoll.vx;
          p.ragdoll.rot += p.ragdoll.spin;
          if (p.ragdoll.y > H+80) p.ragdoll.gone = true;
        }
        continue;
      }
      simulatePlayer(state, p, keys);
    }

    // ---- BOMB TAG ----
    if (state.mode === 'bomb' && state.winner === null && state.bomb) {
      const b = state.bomb;
      const carrier = state.players.find(p => p.slot === b.carrierSlot && p.alive);
      // Transfer bomb on contact
      if (carrier) {
        for (const other of state.players) {
          if (other === carrier || !other.alive) continue;
          const dx = other.x - carrier.x, dy = other.y - carrier.y;
          if (Math.hypot(dx, dy) < 36 && b.timer > 8) {
            // Need contact + a moment after pickup to prevent instant pingpong
            if (b.cooldown == null || b.cooldown <= 0) {
              b.carrierSlot = other.slot;
              b.cooldown = 24; // 0.4s before next transfer
              spawnParticles(state, other.x, other.y - 25, '#ff8a3d', 14, 1.2);
              break;
            }
          }
        }
        if (b.cooldown > 0) b.cooldown--;
        b.timer--;
        if (b.timer <= 0) {
          // EXPLOSION: heavily damage the carrier
          const c2 = state.players.find(p => p.slot === b.carrierSlot && p.alive);
          if (c2) {
            damagePlayer(state, c2, 60, 0, -8, null);
            state.shake = Math.max(state.shake, 24);
            spawnStarBurst(state, c2.x, c2.y - 25, '#ff4d2e');
            spawnParticles(state, c2.x, c2.y - 25, '#ff8a3d', 40, 2.2);
          }
          // Reset bomb on a random survivor
          const survivors = state.players.filter(p => p.alive);
          if (survivors.length >= 2) {
            state.bomb = {
              carrierSlot: survivors[Math.floor(Math.random()*survivors.length)].slot,
              timer: 60 * 6, cooldown: 30,
            };
          } else {
            state.bomb = null;
          }
        }
      }
    }

    // ---- LAST STAND ----
    if (state.mode === 'last' && state.winner === null && state.wave) {
      // When a bot dies, give the human a kill credit and respawn the bot
      for (const p of state.players) {
        if (p.isBot && !p.alive && !p._respawnTimer) {
          p._respawnTimer = 90;
        }
        if (p._respawnTimer > 0) {
          p._respawnTimer--;
          if (p._respawnTimer === 0) {
            // Respawn at a stage spawn point
            const spawns = (state.stage && state.stage.spawns) || [{ x: 200, y: 200 }];
            const sp = spawns[(state.wave.killCount + 1) % spawns.length];
            p.x = sp.x; p.y = sp.y; p.vx = 0; p.vy = 0;
            p.hp = p.maxHp; p.alive = true; p.ragdoll = null;
            p.phaseLeft = 40;
            // Credit the most-recent human attacker (just first human)
            const human = state.players.find(x => !x.isBot && x.alive);
            if (human) {
              state.wave.killCount++;
              human.score++;
              spawnStarBurst(state, human.x, human.y - 30, '#ffd76a');
              const target = human._target || 5;
              if (human.score >= target) {
                state.winner = human.slot;
                state.endTimer = 120;
              }
            }
          }
        }
      }
    }

    // ---- PARKOUR RACE ----
    if (state.mode === 'parkour' && state.winner === null && state.finish) {
      const f = state.finish;
      // Respawn anyone who fell into lava back at the start
      for (const p of state.players) {
        if (!p.alive) {
          p.alive = true; p.hp = p.maxHp; p.ragdoll = null;
          p.x = 80; p.y = GROUND_Y - 4;
          p.vx = 0; p.vy = 0; p.phaseLeft = 20;
        }
        if (p.x > f.x && p.x < f.x + f.w && p.y > f.y && p.y < f.y + f.h) {
          p.score++;
          spawnStarBurst(state, p.x, p.y - 30, '#ffd76a');
          const target = p._target || 5;
          if (p.score >= target) {
            state.winner = p.slot;
            state.endTimer = 130;
          } else {
            // Reset everyone to the start platform for next leg
            for (let i = 0; i < state.players.length; i++) {
              const q = state.players[i];
              q.x = 80 + i * 28; q.y = GROUND_Y - 4;
              q.vx = 0; q.vy = 0;
              q.alive = true; q.hp = q.maxHp; q.ragdoll = null;
              q.phaseLeft = 30;
            }
          }
        }
      }
    }

    // ---- MINI GOLF (TOP-DOWN) ----
    if (state.mode === 'golf' && state.winner === null && state.ball && state.golf) {
      const ball = state.ball;
      const g = state.golf;
      const course = g.courses[g.courseIdx];
      // Ball physics — pure top-down, no gravity
      ball.x += ball.vx;
      ball.y += ball.vy;
      // Friction
      ball.vx *= 0.985;
      ball.vy *= 0.985;
      // Bounce off outer walls
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = -ball.vx * 0.6; }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -ball.vx * 0.6; }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = -ball.vy * 0.6; }
      if (ball.y > H - ball.r) { ball.y = H - ball.r; ball.vy = -ball.vy * 0.6; }
      // Bounce off course walls (AABB)
      for (const w of (course.walls || [])) {
        if (ball.x + ball.r > w.x && ball.x - ball.r < w.x + w.w &&
            ball.y + ball.r > w.y && ball.y - ball.r < w.y + w.h) {
          // Determine the smaller overlap dimension and bounce
          const ovL = ball.x + ball.r - w.x;
          const ovR = (w.x + w.w) - (ball.x - ball.r);
          const ovT = ball.y + ball.r - w.y;
          const ovB = (w.y + w.h) - (ball.y - ball.r);
          const m = Math.min(ovL, ovR, ovT, ovB);
          if (m === ovL)      { ball.x = w.x - ball.r;          ball.vx = -Math.abs(ball.vx) * 0.5; }
          else if (m === ovR) { ball.x = w.x + w.w + ball.r;    ball.vx =  Math.abs(ball.vx) * 0.5; }
          else if (m === ovT) { ball.y = w.y - ball.r;          ball.vy = -Math.abs(ball.vy) * 0.5; }
          else                { ball.y = w.y + w.h + ball.r;    ball.vy =  Math.abs(ball.vy) * 0.5; }
        }
      }
      // Settle
      if (Math.abs(ball.vx) < 0.06) ball.vx = 0;
      if (Math.abs(ball.vy) < 0.06) ball.vy = 0;
      const settled = ball.vx === 0 && ball.vy === 0;

      // Hole detection
      const dxh = ball.x - course.hole.x, dyh = ball.y - course.hole.y;
      if (Math.hypot(dxh, dyh) < 14 && Math.hypot(ball.vx, ball.vy) < 5) {
        g.holed[g.activeSlot] = true;
        spawnStarBurst(state, course.hole.x, course.hole.y, '#ffd76a');
        // sink: park ball at hole
        ball.x = course.hole.x; ball.y = course.hole.y;
        ball.vx = 0; ball.vy = 0;
        advanceGolfTurn(state);
      }

      // Turn timer (only while settled and not holed)
      if (settled && !g.holed[g.activeSlot] && !g.aim) g.turnTimer--;
      if (g.turnTimer <= 0 && !g.holed[g.activeSlot]) {
        g.strokes[g.activeSlot]++;
        g.totalStrokes[g.activeSlot]++;
        advanceGolfTurn(state);
      }
    }

    // ---- TOWER DEFENSE (TOP-DOWN) ----
    if (state.mode === 'td' && state.winner === null && state.td) {
      const td = state.td;
      const human = state.players.find(p => !p.isBot);

      // Game speed — at 2x we run the entire step block again at the end.
      // (Implementation detail: handled by outer caller using td.speed.)

      // Wave / enemy spawning — varied types per wave. The wave only ticks
      // when the player has pressed "Start Wave" (waveReady === false). Until
      // then enemies pause and the player can build/upgrade freely.
      if (td.spawnLeft > 0 && !td.waveReady) {
        td.waveTimer--;
        if (td.waveTimer <= 0) {
          td.waveTimer = Math.max(18, 55 - td.waveNum * 2);
          td.spawnLeft--;
          // Random enemy type, weighted by wave
          const roll = Math.random();
          let type = 'basic';
          if (td.waveNum >= 5 && roll < 0.1) type = 'boss';
          else if (td.waveNum >= 3 && roll < 0.25) type = 'armor';
          else if (td.waveNum >= 2 && roll < 0.35) type = 'fast';
          const wave = td.waveNum;
          let stats;
          if (type === 'fast') {
            stats = { hp:18 + wave*6,  speed:1.6 + wave*0.06, r:11, color:'#ffd76a' };
          } else if (type === 'armor') {
            stats = { hp:50 + wave*16, speed:0.6 + wave*0.04, r:18, color:'#b6bedc' };
          } else if (type === 'boss') {
            stats = { hp:160 + wave*40, speed:0.5 + wave*0.03, r:24, color:'#b03a8a' };
          } else {
            stats = { hp:22 + wave*9, speed:1.0 + wave*0.07, r:14, color:'#ff5b5b' };
          }
          td.enemies.push({
            type, t: 0,
            speed: stats.speed,
            hp: stats.hp, maxHp: stats.hp,
            color: stats.color, r: stats.r,
            wig: Math.random() * Math.PI * 2, // animation phase
          });
        }
      } else if (td.enemies.length === 0) {
        if (!td.endless && td.waveNum >= td.maxWaves) {
          state.winner = human ? human.slot : 0;
          state.endTimer = 140;
        } else if (!td.waveReady) {
          // Wave finished — move to next and idle until player clicks Start.
          td.waveNum++;
          td.spawnLeft = 5 + Math.min(td.waveNum, 12);
          td.waveTimer = 60 * 4;
          td.gold += 60;
          if (human) human.score = td.waveNum - 1;
          td.waveReady = true;          // pause for the player to prepare
          // Toast every 5 waves; always toast the first cleared.
          if (td.waveNum === 2 || td.waveNum % 5 === 1) {
            spawnToast(state, `WAVE ${td.waveNum - 1} CLEARED`, '#5bff8a');
          }
        }
      }

      // Enemy movement (with frost slow factor)
      for (let i = td.enemies.length - 1; i >= 0; i--) {
        const e = td.enemies[i];
        if (e.slowFor > 0) { e.slowFor--; }
        const speedFactor = e.slowFor > 0 ? (e.slowFactor || 0.6) : 1;
        // Store previous position so we can derive a facing direction for the
        // walking animation (positive vx = facing right).
        const prevX = e.x, prevY = e.y;
        e.t += e.speed * speedFactor;
        const pt = pointOnPath(td.path, e.t);
        e.x = pt.x; e.y = pt.y;
        if (prevX !== undefined) { e.vx = e.x - prevX; e.vy = e.y - prevY; }
        if (pt.done) {
          td.enemies.splice(i, 1);
          td.baseHp--;
          state.shake = Math.max(state.shake, 14);
          if (td.baseHp <= 0) {
            state.winner = state.players.find(p => p.isBot)?.slot ?? 0;
            state.endTimer = 110;
          }
          continue;
        }
        if (e.hp <= 0) {
          spawnStarBurst(state, e.x, e.y, '#ffd76a');
          // Plague: poisoned enemy dying spreads poison to others within 80 px.
          if (e.poisonPlague) {
            for (const o of td.enemies) {
              if (o === e) continue;
              if (Math.hypot(o.x - e.x, o.y - e.y) < 80) {
                o.poisonFor = Math.max(o.poisonFor || 0, 60 * 2);
                o.poisonDps = Math.max(o.poisonDps || 0, 4);
                o.poisonPlague = true;            // chains
              }
            }
            spawnParticles(state, e.x, e.y, '#7bff5a', 18, 1.2);
          }
          td.enemies.splice(i, 1);
          td.gold += 12;
          SFX.enemyDie();
          if (human) human.score++;
        }
      }

      // Tower shooting
      for (const t of td.towers) {
        // SUN: produces gold passively, no targeting
        if (t.kindId === 'sun') {
          t.atkCd = (t.atkCd || 0) - 1;
          if (t.atkCd <= 0) {
            const payout = t.payout || 30;
            td.gold += payout;
            t.atkCd = t.atkRate || 300;
            spawnStarBurst(state, t.x, t.y, '#ffd76a');
            spawnPopup(state, t.x, t.y - 24, `+${payout}g`, '#ffd76a');
          }
          continue;
        }
        // LASER: continuous beam to nearest enemy in range, applies dmg every frame.
        // L3 Prism Split: also damages a second nearby enemy.
        if (t.kindId === 'laser') {
          let target = null, bestD = Infinity;
          for (const e of td.enemies) {
            const d = Math.hypot(e.x - t.x, e.y - t.y);
            if (d <= t.range && d < bestD) { bestD = d; target = e; }
          }
          t._beamTarget = target;
          t._beamTarget2 = null;
          if (target) {
            target.hp -= t.dmg;
            if (state.frame % 4 === 0) {
              spawnParticles(state, target.x, target.y, t.turret, 1, 0.6);
            }
            // Prism split — find a second nearby enemy
            if ((t.chainCount || 0) >= 2) {
              let next = null, bd = Infinity;
              for (const e of td.enemies) {
                if (e === target) continue;
                const d = Math.hypot(e.x - target.x, e.y - target.y);
                if (d <= 90 && d < bd) { bd = d; next = e; }
              }
              if (next) {
                next.hp -= t.dmg * 0.7;
                t._beamTarget2 = next;
                if (state.frame % 4 === 0) {
                  spawnParticles(state, next.x, next.y, t.turret, 1, 0.5);
                }
              }
            }
          }
          continue;
        }
        if (t.atkCd > 0) t.atkCd--;
        if (t.atkCd > 0) continue;
        // Standard targeting: enemy with most progress along the path
        let target = null, best = -1;
        for (const e of td.enemies) {
          const d = Math.hypot(e.x - t.x, e.y - t.y);
          if (d <= t.range && e.t > best) { best = e.t; target = e; }
        }
        if (target) {
          t.atkCd = t.atkRate || 24;
          SFX.towerFire(t.kindId);
          if (t.kindId === 'tesla') {
            // Instant chain lightning. Upgraded Tesla (Overload) hits 5 enemies.
            let cur = target;
            const hit = new Set();
            const maxChain = t.chainCount || 3;
            for (let chain = 0; chain < maxChain && cur; chain++) {
              cur.hp -= t.dmg;
              if (t.stunFrames) cur.slowFor = Math.max(cur.slowFor||0, t.stunFrames * 6); // soft stun via heavy slow
              hit.add(cur);
              spawnParticles(state, cur.x, cur.y, t.turret, 5, 1);
              // Find next nearest enemy not already hit within 100 px
              let next = null, bestD = Infinity;
              for (const e of td.enemies) {
                if (hit.has(e)) continue;
                const d = Math.hypot(e.x - cur.x, e.y - cur.y);
                if (d <= 100 && d < bestD) { bestD = d; next = e; }
              }
              // Draw chain segment as a quick "projectile" for visual.
              // Tesla projectiles render as a zigzag of lightning (see draw).
              if (next) {
                td.proj.push({
                  x: cur.x, y: cur.y, target: next, dmg: 0,
                  speed: 999, color: t.turret, life: 4, splash: 0, slow: null,
                  kindId: 'tesla',
                  srcX: cur.x, srcY: cur.y,
                  dstX: next.x, dstY: next.y,
                });
              }
              cur = next;
            }
            continue;
          }
          if (t.kindId === 'poison') {
            // Apply DoT
            target.hp -= t.dmg;
            target.poisonFor = 60 * (t.level >= 2 ? 4 : 3);
            target.poisonDps = t.level >= 3 ? 8 : 4;
            target.poisonPlague = !!t.plague;     // marks for plague-spread on death
            spawnParticles(state, target.x, target.y, t.turret, 6, 0.8);
            continue;
          }
          // Standard projectile fire. Archer multishot fires N arrows at the
          // same target with a small angular spread.
          const shots = (t.kindId === 'basic' ? (t.multishot || 1) : 1);
          for (let s = 0; s < shots; s++) {
            const offsetAng = shots > 1 ? ((s - (shots - 1) / 2) * 0.25) : 0;
            td.proj.push({
              x: t.x, y: t.y,
              target, dmg: t.dmg,
              splash: t.splash || 0,
              slow: t.slow || null,
              pierce: !!t.pierce,
              crit: !!t.crit,
              freezeChance: t.freezeChance || 0,
              speed: t.kindId === 'sniper' ? 22 : t.kindId === 'cannon' ? 9 : 14,
              color: t.turret,
              kindId: t.kindId,
              ang: offsetAng,
              spreadOffset: offsetAng,
              life: 90,
            });
          }
        }
      }

      // Poison DoT tick (per-frame, accumulated)
      for (const e of td.enemies) {
        if (e.poisonFor > 0) {
          e.poisonFor--;
          if (state.frame % 6 === 0) {
            e.hp -= e.poisonDps / 10;
            spawnParticles(state, e.x, e.y, '#7bff5a', 1, 0.4);
          }
        }
      }

      // Projectile movement + hit
      for (let i = td.proj.length - 1; i >= 0; i--) {
        const p = td.proj[i]; p.life--;
        if (p.life <= 0 || !p.target || p.target.hp === undefined) { td.proj.splice(i, 1); continue; }
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        p.ang = Math.atan2(dy, dx);
        p.x += (dx / d) * p.speed;
        p.y += (dy / d) * p.speed;
        if (d < 12) {
          // direct hit. Sniper L3 (crit) does ×1.5 on every shot.
          const finalDmg = p.crit ? p.dmg * 1.5 : p.dmg;
          p.target.hp -= finalDmg;
          spawnPopup(state, p.target.x, p.target.y - 18, Math.round(finalDmg),
            p.crit ? '#ffd84a' : (p.color || '#ffd76a'), p.crit);
          SFX.enemyHit();
          if (p.slow) {
            p.target.slowFor = p.slow.durSec * 60;
            p.target.slowFactor = p.slow.factor;
            spawnParticles(state, p.target.x, p.target.y, '#a5f3ff', 5, 0.8);
          }
          // Frost Deep Freeze: chance to fully freeze on hit (factor ~ 0)
          if (p.kindId === 'frost' && Math.random() < (p.freezeChance || 0)) {
            p.target.slowFor = 90;
            p.target.slowFactor = 0.05;
            spawnPopup(state, p.target.x, p.target.y - 30, 'FROZEN', '#a5f3ff', true);
          }
          // splash
          if (p.splash > 0) {
            for (const e of td.enemies) {
              if (e === p.target) continue;
              const sd = Math.hypot(e.x - p.x, e.y - p.y);
              if (sd < p.splash) {
                const sd2 = p.dmg * 0.6;
                e.hp -= sd2;
                spawnPopup(state, e.x, e.y - 18, Math.round(sd2), '#ff9a3c');
              }
            }
            // splash visual
            spawnStarBurst(state, p.x, p.y, '#ff9a3c');
            spawnParticles(state, p.x, p.y, '#ff9a3c', 12, 1.4);
          } else {
            spawnParticles(state, p.x, p.y, p.color || '#ffd76a', 5, 0.8);
          }
          td.proj.splice(i, 1);
        }
      }
    }

    // ---- BOSS RUSH PHASES ----
    if (state.mode === 'boss' && state.winner === null) {
      for (const p of state.players) {
        if (!p.isBot) continue;
        const ratio = p.hp / p.maxHp;
        if (ratio < 0.5 && p.bossPhase === 1) {
          p.bossPhase = 2;
          p.buffs.atkSpdMul = (p.buffs.atkSpdMul || 1) * 1.4;
          p.buffs.speedMul  = (p.buffs.speedMul  || 1) * 1.25;
          spawnStarBurst(state, p.x, p.y - 30, '#ff4d2e');
          state.shake = Math.max(state.shake, 18);
        } else if (ratio < 0.25 && p.bossPhase === 2) {
          p.bossPhase = 3;
          p.buffs.punchMul  = (p.buffs.punchMul  || 1) * 1.5;
          p.buffs.atkSpdMul = (p.buffs.atkSpdMul || 1) * 1.3;
          spawnStarBurst(state, p.x, p.y - 30, '#ffd76a');
          state.shake = Math.max(state.shake, 24);
        }
      }
    }

    // ---- LAST STAND SCALING ----
    if (state.mode === 'last' && state.winner === null) {
      const human = state.players.find(p => !p.isBot);
      const score = (human && human.score) || 0;
      const tier = Math.floor(score / 3); // every 3 kills = +1 tier
      for (const p of state.players) {
        if (!p.isBot) continue;
        p._lastTier = p._lastTier || 0;
        if (tier > p._lastTier) {
          // Apply scaling
          p.maxHp = Math.min(350, 100 + tier * 25);
          p.hp = Math.min(p.maxHp, p.hp + 25);
          p.buffs.speedMul = 1 + tier * 0.05;
          p._lastTier = tier;
        }
      }
    }

    // ---- KING OF THE HILL ----
    if (state.mode === 'koth' && state.winner === null) {
      // Find the highest non-floor platform = the hill
      let hill = null;
      for (const plat of state.platforms) {
        if (plat.h > 30) continue; // skip the ground/floor
        if (!hill || plat.y < hill.y) hill = plat;
      }
      if (hill && state.frame % 6 === 0) {
        const onHill = state.players.filter(p =>
          p.alive && p.x > hill.x && p.x < hill.x + hill.w &&
          Math.abs(p.y - hill.y) < 10
        );
        if (onHill.length === 1) {
          const k = onHill[0];
          k.kothFrames = (k.kothFrames || 0) + 6;
          // 1 second = 1 score
          if (k.kothFrames >= 60) {
            k.kothFrames = 0;
            k.kothScore = (k.kothScore || 0) + 1;
            spawnStarBurst(state, k.x, k.y - 30, '#ffd76a');
            const target = k._target || 5;
            if (k.kothScore >= target) {
              state.winner = k.slot;
              state.endTimer = 130;
            }
          }
        }
      }
    } else if (state.winner === null) {
      // Modes that govern their own end conditions skip last-man-standing
      const skip = ['koth','bomb','last','parkour','golf','td'].includes(state.mode);
      if (!skip) {
        const alive = state.players.filter(p => p.alive);
        if (alive.length <= 1 && state.players.length > 1) {
          state.winner = alive[0] ? alive[0].slot : null;
          state.endTimer = 110;
        } else if (state.players.length === 1 && !state.players[0].alive) {
          state.winner = null;
          state.endTimer = 60;
        }
      } else if (state.mode === 'bomb') {
        // For bomb tag, last alive wins
        const alive = state.players.filter(p => p.alive);
        if (alive.length === 1 && state.players.length > 1) {
          state.winner = alive[0].slot; state.endTimer = 110;
        }
      }
    }
  }

  function simulatePlayer(state, p, keys) {
    const b = p.buffs;
    const km = p.keys;

    let input = { left:false, right:false, jump:false, down:false, punch:false, kick:false };
    if (p.isBot) {
      // ----- Difficulty tuning -----
      // reactEvery: only re-evaluate inputs every N frames (slower => stale moves)
      // attackProb: chance per evaluated frame to throw a punch/kick in range
      // jumpProb:   chance per frame to jump when target is above
      // wanderProb: chance per evaluated frame to randomly move "wrong way"
      const diff = state.botDifficulty || 'normal';
      const cfg = diff === 'easy'   ? { reactEvery: 12, attackProb: 0.18, jumpProb: 0.02, wanderProb: 0.18, reachBonus: -8 }
                : diff === 'hard'   ? { reactEvery: 1,  attackProb: 0.85, jumpProb: 0.10, wanderProb: 0.00, reachBonus: 14 }
                                    : { reactEvery: 4,  attackProb: 0.50, jumpProb: 0.05, wanderProb: 0.05, reachBonus: 6 };
      // Re-use last decided inputs between react ticks
      p._botCache = p._botCache || { left:false, right:false, jump:false, punch:false, kick:false, tick:0 };
      const cache = p._botCache;
      cache.tick++;
      const shouldReact = (cache.tick % cfg.reactEvery) === 0;

      const target = nearestEnemy(state, p);
      if (target) {
        if (shouldReact) {
          // Reset cached attack flags every reaction
          cache.punch = false; cache.kick = false; cache.jump = false;
          const dx = target.x - p.x;
          p.facing = dx > 0 ? 1 : -1;
          // Wander: on Easy, occasionally move the wrong way
          const moveDx = (Math.random() < cfg.wanderProb) ? -dx : dx;
          cache.left  = moveDx < -30;
          cache.right = moveDx >  30;
          if (target.y < p.y - 40 && p.onGround && Math.random() < cfg.jumpProb) cache.jump = true;
          const range = PUNCH_RANGE * (b.reachMul||1) + cfg.reachBonus;
          if (Math.abs(dx) < range && Math.abs(target.y - p.y) < 40 && Math.random() < cfg.attackProb) {
            if (Math.random() < 0.5) cache.punch = true; else cache.kick = true;
          }
          // Edge avoidance
          if ((p.x < 80 && dx < 0) || (p.x > W-80 && dx > 0)) {
            cache.left = !cache.left; cache.right = !cache.right;
          }

          // ---- MODE OVERRIDES ----
          if (state.mode === 'koth') {
            // Find the hill (highest non-floor platform)
            let hill = null;
            for (const plat of state.platforms) {
              if (plat.h > 30) continue;
              if (!hill || plat.y < hill.y) hill = plat;
            }
            if (hill) {
              const hillCx = hill.x + hill.w/2;
              const onHill     = p.x > hill.x && p.x < hill.x + hill.w &&
                                 Math.abs(p.y - hill.y) < 14;
              const targetOnHill = target.x > hill.x && target.x < hill.x + hill.w &&
                                   Math.abs(target.y - hill.y) < 14;
              if (!onHill) {
                // Path to hill instead of toward player
                const hdx = hillCx - p.x;
                cache.left  = hdx < -10;
                cache.right = hdx >  10;
                // Jump if hill is higher than us
                if (hill.y < p.y - 30 && p.onGround) cache.jump = true;
                // Skip melee while traveling
                cache.punch = false; cache.kick = false;
              } else if (!targetOnHill) {
                // I own the hill — hold it. Don't chase off.
                cache.left = false; cache.right = false;
                cache.punch = false; cache.kick = false;
                // If the target is approaching from a side, face them and punch
                if (Math.abs(dx) < 70 && Math.abs(target.y - p.y) < 30 &&
                    Math.random() < cfg.attackProb * 0.6) {
                  if (Math.random() < 0.5) cache.punch = true; else cache.kick = true;
                }
              }
              // else: both on hill → use existing combat logic
            }
          } else if (state.mode === 'parkour' && state.finish) {
            // Race to the finish flag — ignore the player target entirely.
            const fx = state.finish.x + state.finish.w / 2;
            const dx = fx - p.x;
            cache.left  = dx < -20;
            cache.right = dx >  20;
            cache.punch = false; cache.kick = false;
            // Aggressively jump to clear gaps + reach higher platforms
            if (p.onGround) {
              // Look 60 px ahead — if no platform, jump
              let groundAhead = false;
              for (const plat of (state.platforms || [])) {
                if (p.x + 60 > plat.x && p.x + 60 < plat.x + plat.w &&
                    plat.y >= p.y - 4 && plat.y < LAVA_Y - 40) { groundAhead = true; break; }
              }
              // Also jump if there's a higher platform within reach
              let needsClimb = false;
              for (const plat of (state.platforms || [])) {
                if (plat.x < p.x + 80 && plat.x + plat.w > p.x - 20 &&
                    plat.y < p.y - 20 && plat.y > p.y - 130) { needsClimb = true; break; }
              }
              if (!groundAhead || needsClimb) cache.jump = true;
            }
          } else if (state.mode === 'sumo') {
            // Sumo: emphasize knockoff. Stand closer to push off, and avoid
            // walking off the stage ourselves (current edge avoidance already
            // helps; tighten it).
            if ((p.x < 110 && dx < 0) || (p.x > W-110 && dx > 0)) {
              cache.left = false; cache.right = false;
            }
            // Use kick more often in sumo (better knockback)
            if (cache.punch && Math.random() < 0.6) {
              cache.punch = false; cache.kick = true;
            }
          }

          // ---- HAZARD AWARENESS ----
          // Two probes: NEAR (jump-trigger distance) and FAR (panic stop).
          // Bot keeps moving forward through the jump so it actually clears
          // the hazard instead of jumping in place.
          const dir = cache.right ? 1 : cache.left ? -1 : 0;
          if (dir !== 0) {
            const feetY = p.y + 2;
            // Helper: is there a deadly hazard whose x-range overlaps [x-tol, x+tol]?
            const hazardAt = (x, tol) => {
              for (const hz of (state.hazards || [])) {
                if (hz.type !== 'sawblade' && hz.type !== 'instakill' && hz.type !== 'spike') continue;
                const horizOverlap = x + tol > hz.x && x - tol < hz.x + hz.w;
                const vertOverlap  = feetY < hz.y + hz.h + 60 && feetY > hz.y - 80;
                if (horizOverlap && vertOverlap) return hz;
              }
              return null;
            };
            const groundAt = (x) => {
              for (const plat of (state.platforms || [])) {
                if (x > plat.x && x < plat.x + plat.w &&
                    plat.y >= feetY - 4 && plat.y < LAVA_Y - 40) return plat;
              }
              return null;
            };
            // Near probe — would the next step be inside a hazard?
            const nearX = p.x + dir * 28;
            // Mid probe — used to time the jump so we sail OVER
            const midX  = p.x + dir * 60;
            // Far probe — used for big lava gaps and chained hazards
            const farX  = p.x + dir * 110;

            const hzNear = hazardAt(nearX, 12);
            const hzMid  = hazardAt(midX,  18);
            const groundNear = groundAt(nearX);
            const groundMid  = groundAt(midX);
            const groundFar  = groundAt(farX);

            // If a deadly hazard is right in front (mid-range), JUMP NOW but
            // keep walking so we carry forward over it. Time the jump while
            // we still have a couple steps of run-up.
            if ((hzMid || hzNear) && p.onGround) {
              cache.jump = true;
              // keep direction unchanged so we sail forward
            }
            // No ground at next step (about to walk off into lava) — only
            // commit if we can see ground on the far side; otherwise back up.
            if (!groundNear && p.onGround) {
              if (groundMid || groundFar) {
                cache.jump = true;       // hop the gap
              } else {
                cache.left = false; cache.right = false; // dead-end, stop
              }
            }
            // If a hazard is directly under near-probe with no safe far-side
            // ground either, refuse and back up.
            if (hzNear && !groundFar && !groundMid && p.onGround) {
              cache.left = !cache.left; cache.right = !cache.right;
              cache.jump = false;
            }
          }
          // Self-check: bot is currently overlapping a hazard column → jump out
          for (const hz of (state.hazards || [])) {
            if (hz.type !== 'sawblade' && hz.type !== 'instakill' && hz.type !== 'spike') continue;
            const overlap = p.x + 8 > hz.x && p.x - 8 < hz.x + hz.w &&
                            p.y > hz.y - 40 && p.y < hz.y + hz.h + 20;
            if (overlap && p.onGround) { cache.jump = true; break; }
          }
          // Pre-jump if we're near a lava edge while walking (cliff sense)
          if (p.onGround && cache.right) {
            let safe = false;
            for (const plat of (state.platforms || [])) {
              if (p.x + 60 > plat.x && p.x + 60 < plat.x + plat.w &&
                  plat.y >= p.y - 4 && plat.y < LAVA_Y - 40) { safe = true; break; }
            }
            if (!safe) cache.right = false;
          }
          if (p.onGround && cache.left) {
            let safe = false;
            for (const plat of (state.platforms || [])) {
              if (p.x - 60 > plat.x && p.x - 60 < plat.x + plat.w &&
                  plat.y >= p.y - 4 && plat.y < LAVA_Y - 40) { safe = true; break; }
            }
            if (!safe) cache.left = false;
          }
        }
        input.left = cache.left; input.right = cache.right;
        input.jump = cache.jump; input.punch = cache.punch; input.kick = cache.kick;
      }
    } else {
      input.left  = !!keys[km.left];
      input.right = !!keys[km.right];
      input.jump  = !!keys[km.jump];
      input.down  = !!keys[km.down];
      input.punch = !!keys[km.punch];
      input.kick  = !!keys[km.kick];
      if (b.jitter && Math.random() < 0.08) {
        ['left','right','jump'].forEach(k => { if (Math.random()<0.3) input[k] = !input[k]; });
      }
    }
    if (p.stun > 0) { p.stun--; input = { left:false, right:false, jump:false, down:false, punch:false, kick:false }; }
    if (p.phaseLeft > 0) p.phaseLeft--;

    const speed = WALK * (b.speedMul || 1);
    if (input.left)  { p.vx -= speed * 0.45; p.facing = -1; }
    if (input.right) { p.vx += speed * 0.45; p.facing = 1; }
    if (p.onGround) p.vx *= FRICTION; else p.vx *= AIR_FRICTION;
    if (p.vx > speed) p.vx = speed;
    if (p.vx < -speed) p.vx = -speed;

    if (input.jump && !p.jumpHeld) {
      p.jumpHeld = true;
      if (p.jumpsLeft > 0) {
        p.vy = JUMP_V * (b.jumpMul || 1);
        p.jumpsLeft--; p.onGround = false;
        spawnParticles(state, p.x, p.y+20, '#ffffff66', 6, 1);
        if (!p.isBot) SFX.jump();
      }
    }
    if (!input.jump) p.jumpHeld = false;

    if (b.rocket && input.jump && !p.onGround) {
      p.vy -= 0.4;
      spawnParticles(state, p.x, p.y+20, '#ff8a3d', 1, 1);
    }

    if (b.airDash && !p.onGround && input.punch && p.dashCd <= 0 && p.cd <= 0) {
      p.vx = p.facing * 14; p.vy = -2;
      p.dashCd = 36;
      spawnParticles(state, p.x, p.y, '#ffffffaa', 10, 1);
    }
    if (p.dashCd > 0) p.dashCd--;

    let g = GRAV * (b.gravMul || 1);
    if (b.gravFlip && input.down && !p.onGround) p.flipped = !p.flipped;
    if (p.flipped) g = -g * 0.8;
    p.vy += g;
    if (p.vy > 18) p.vy = 18;
    if (p.vy < -18) p.vy = -18;

    p.x += p.vx; p.y += p.vy;

    p.onGround = false;
    for (const plat of state.platforms) {
      const wasAbove = (p.y - p.vy) <= plat.y + 2;
      if (p.x > plat.x && p.x < plat.x + plat.w &&
          p.y >= plat.y && p.y <= plat.y + 16 &&
          p.vy >= 0 && (plat.solid || wasAbove) && !input.down) {
        p.y = plat.y; p.vy = 0; p.onGround = true;
        p.jumpsLeft = b.maxJumps || 1;
      }
    }

    if (p.x < 20) { p.x = 20; p.vx = Math.max(p.vx, 0); }
    if (p.x > W-20) { p.x = W-20; p.vx = Math.min(p.vx, 0); }

    // ---- HAZARDS (spike strips, lava pools, etc.) ----
    // Player hitbox: small AABB around p.x±10, p.y-30 .. p.y
    if (state.hazards && state.hazards.length) {
      for (const hz of state.hazards) {
        const overlap = !(p.x + 10 < hz.x || p.x - 10 > hz.x + hz.w ||
                          p.y < hz.y      || p.y - 30 > hz.y + hz.h);
        if (!overlap) continue;
        // Sawblades and explicit instakill hazards one-shot the player.
        if (hz.type === 'instakill' || hz.type === 'sawblade') {
          spawnParticles(state, p.x, p.y - 8, '#ff5b5b', 18, 2);
          killPlayer(state, p, null);
          return;
        }
        // periodic damage (frame-based)
        const cooldown = hz.cooldown || 12; // frames between ticks
        if (state.frame % cooldown === 0) {
          const dmg = hz.dmg || 4;
          damagePlayer(state, p, dmg, 0, hz.type === 'spike' ? -6 : -2, null);
          spawnParticles(state, p.x, p.y - 8, hz.type === 'spike' ? '#ff5b5b' : '#ff8a3d', 5, 1);
        }
      }
    }

    // lava death (any stage with a lava floor below y=LAVA_Y)
    if (p.y > LAVA_Y) { killPlayer(state, p, null); return; }

    if (b.regen) {
      p.regenTick++;
      if (p.regenTick >= 60) { p.regenTick = 0; p.hp = Math.min(p.maxHp, p.hp + (b.regen||0)); }
    }

    if (p.cd > 0) p.cd--;
    if (p.kickCd > 0) p.kickCd--;
    if (p.animPunch > 0) p.animPunch--;
    if (p.animKick > 0) p.animKick--;
    if (p.animHurt > 0) p.animHurt--;
    p.animPhase += Math.abs(p.vx) > 1 ? 0.32 : 0.08;

    const atkScale = 1 / (b.atkSpdMul || 1);
    if (input.punch && p.cd <= 0 && p.kickCd <= 0 && !(b.airDash && !p.onGround)) {
      p.cd = PUNCH_COOLDOWN * atkScale;
      p.animPunch = 10;
      doMelee(state, p, PUNCH_RANGE * (b.reachMul||1), PUNCH_DMG * (b.punchMul||1), PUNCH_KB, false);
    }
    if (input.kick && p.kickCd <= 0 && p.cd <= 0) {
      p.kickCd = KICK_COOLDOWN * atkScale;
      p.animKick = 14;
      doMelee(state, p, KICK_RANGE * (b.reachMul||1), KICK_DMG * (b.punchMul||1), KICK_KB * (b.kickKbMul||1), true);
    }

    if (b.bananas && p.banana <= 0 && state.frame % 4 === 0 && Math.abs(p.vx) > 1) {
      state.proj.push({ type:'banana', owner:p.slot, x:p.x, y:p.y, life:360 });
      p.banana = 80;
    }
    if (p.banana > 0) p.banana--;

    if (b.flameTrail && state.frame % 8 === 0 && Math.abs(p.vx) + Math.abs(p.vy) > 1) {
      state.proj.push({ type:'fire', owner:p.slot, x:p.x, y:p.y+8, life:120 });
    }

    // Push a trail sample every couple frames
    if (p.trail && p.trail.id !== 'none' && state.frame % 2 === 0) {
      p.trailSamples.push({ x:p.x, y:p.y-12, age:0, max:22 });
      if (p.trailSamples.length > 32) p.trailSamples.shift();
    }
    for (const s of p.trailSamples) s.age++;
    p.trailSamples = p.trailSamples.filter(s => s.age < s.max);

    if (b.magnet) {
      for (const e of state.players) {
        if (e === p || !e.alive) continue;
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d < 180 && d > 30) { e.vx += (dx/d) * 0.18; e.vy += (dy/d) * 0.08; }
      }
    }
    if (b.slowAura) {
      for (const e of state.players) {
        if (e === p || !e.alive) continue;
        const d = Math.hypot(p.x-e.x, p.y-e.y);
        if (d < 120) e.vx *= 0.92;
      }
    }
  }

  function nearestEnemy(state, p) {
    let best = null, bestD = 1e9;
    for (const e of state.players) {
      if (e === p || !e.alive) continue;
      const d = Math.hypot(p.x-e.x, p.y-e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  function doMelee(state, attacker, range, dmg, kb, isKick) {
    const ax = attacker.x + attacker.facing * 18;
    const ay = attacker.y - 18;
    for (const t of state.players) {
      if (t === attacker || !t.alive) continue;
      if (t.phaseLeft > 0) continue;
      const dx = t.x - attacker.x;
      if (Math.sign(dx) !== attacker.facing && Math.abs(dx) > 8) continue;
      if (Math.abs(dx) > range) continue;
      if (Math.abs(t.y - attacker.y) > 50) continue;

      let finalDmg = dmg;
      let isCrit = false;
      if ((attacker.buffs.critChance||0) > 0 && Math.random() < attacker.buffs.critChance) {
        finalDmg *= 3;
        isCrit = true;
        spawnParticles(state, t.x, t.y-30, '#ffd84a', 14, 1.2);
        spawnStarBurst(state, t.x, t.y-30, '#ffd84a');
      }

      if (t.reflectLeft > 0) {
        t.reflectLeft--;
        damagePlayer(state, attacker, finalDmg, attacker.facing * kb * -1, isKick ? -6 : -3, t.slot);
        spawnParticles(state, t.x, t.y-30, '#5bf0e8', 16, 1.2);
        continue;
      }

      const kbForce = kb / (t.buffs.kbResist || 1);
      damagePlayer(state, t, finalDmg, attacker.facing * kbForce, isKick ? -8 : -4, attacker.slot);

      if (attacker.buffs.stunOnHit) t.stun = Math.max(t.stun, attacker.buffs.stunOnHit);
      if (t.buffs.phaseOnHurt) t.phaseLeft = 18;

      state.shake = Math.max(state.shake, isKick ? 12 : 7);
      state.hitstop = isKick ? 3 : 2;
      spawnStarBurst(state, (t.x+attacker.x)/2, (t.y+attacker.y)/2 - 18, '#fff');
      // Don't show damage numbers in modes that don't track damage (sumo / no-damage).
      if (state.mode !== 'sumo' && state.mode !== 'parkour' && state.mode !== 'golf' && state.mode !== 'td') {
        spawnPopup(state, t.x, t.y - 40, Math.round(finalDmg), isCrit ? '#ffd84a' : '#ff8a3d', isCrit);
      }
      if (isKick) SFX.kick(); else SFX.punch();
    }
  }

  function damagePlayer(state, p, dmg, kbx, kby, byIdx) {
    // No-damage modes: parkour/golf/td silently ignore damage from other players
    if (state.mode === 'parkour' || state.mode === 'golf' || state.mode === 'td') {
      // Allow lava/saw hazards via byIdx === null still (handled elsewhere).
      // Player-to-player damage: ignore.
      if (byIdx !== null && byIdx !== undefined) return;
    }
    // SUMO MODE: no damage kills — only knockoff. Knockback is amplified 2.2×.
    if (state.mode === 'sumo') {
      p.vx += kbx * 2.2;
      p.vy = Math.min(p.vy, kby * 1.8);
      p.animHurt = 12;
      spawnParticles(state, p.x, p.y-25, state.edu ? '#ffffff' : '#ff8a3d', 5, 1.2);
      return;
    }
    p.hp -= dmg;
    p.vx += kbx;
    p.vy = Math.min(p.vy, kby);
    p.animHurt = 12;
    spawnParticles(state, p.x, p.y-25, state.edu ? '#ffffff' : '#ff4d2e', 6, 1.2);
    SFX.hurt();
    if (p.hp <= 0) {
      if ((p.revivesLeft || 0) > 0) {
        p.revivesLeft--;
        p.hp = 30;
        spawnParticles(state, p.x, p.y-25, '#5bff8a', 32, 1.5);
        return;
      }
      SFX.die();
      killPlayer(state, p, byIdx);
    }
  }

  function killPlayer(state, p, byIdx) {
    if (!p.alive) return;
    // KOTH: respawn instead of permanent death (no last-man-standing)
    if (state.mode === 'koth') {
      const spawns = (state.stage && state.stage.spawns) || [{ x: W/2, y: 200 }];
      const sp = spawns[p.slot % spawns.length];
      p.x = sp.x; p.y = sp.y;
      p.vx = 0; p.vy = 0;
      p.hp = p.maxHp; p.flipped = false;
      p.phaseLeft = 40; // brief invincibility on respawn
      spawnParticles(state, p.x, p.y-20, state.edu ? '#ffffff' : '#ff4d2e', 16, 1.2);
      return;
    }
    p.alive = false;
    p.ragdoll = { x:p.x, y:p.y-20, vx:p.vx*1.5, vy:-6, rot:0, spin:(Math.random()-0.5)*0.4, gone:false };
    spawnParticles(state, p.x, p.y-20, state.edu ? '#ffffff' : '#ff4d2e', 28, 1.5);
    if (byIdx !== null && byIdx !== undefined) {
      const killer = state.players.find(x => x.slot === byIdx);
      if (killer && killer.buffs.pointThief && p.score > 0) {
        killer.buffs.pointThief = false;
        p.score--;
      }
      // Achievement toasts for the human player only.
      if (killer && !killer.isBot && state.mode !== 'last' && state.mode !== 'td') {
        if (!state.firstKill) {
          state.firstKill = true;
          spawnToast(state, 'FIRST KO', '#ffd76a');
        }
        state.killStreak = (state.killStreak || 0) + 1;
        const ks = state.killStreak;
        if (ks === 2) spawnToast(state, 'DOUBLE KO', '#ff9a3c');
        else if (ks === 3) spawnToast(state, 'TRIPLE KO', '#ff5b6e');
        else if (ks === 4) spawnToast(state, 'RAMPAGE', '#ff4d2e');
        else if (ks >= 5) spawnToast(state, 'UNSTOPPABLE', '#ff2e8a');
      }
    }
    // The human dying resets their killstreak.
    if (!p.isBot) state.killStreak = 0;
    state.shake = Math.max(state.shake, 20);
    state.hitstop = 6;
  }

  // Big banner-style notification (top-center). Limit to 3 active so they don't
  // pile up; new toasts push old ones down.
  function spawnToast(state, text, color) {
    if (!state.toasts) state.toasts = [];
    if (state.toasts.length >= 3) state.toasts.shift();
    state.toasts.push({
      text: String(text || ''),
      color: color || '#ffd76a',
      life: 0,
      maxLife: 120, // 2 seconds at 60fps
    });
  }

  function spawnParticles(state, x, y, color, n, scale=1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (1 + Math.random()*3) * scale;
      state.particles.push({
        x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s - 1, g:0.25, life:24+Math.random()*16, color
      });
    }
  }
  // Floating combat-text popup: drifts upward and fades. `crit` makes it big & yellow.
  function spawnPopup(state, x, y, text, color, crit=false) {
    if (!state.popups) state.popups = [];
    state.popups.push({
      x: x + (Math.random() - 0.5) * 14,
      y,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -1.6 - Math.random() * 0.6,
      text: String(text),
      color: color || '#fff',
      life: 0,
      maxLife: crit ? 60 : 44,
      size: crit ? 22 : 14,
    });
  }
  // ===== TOP-DOWN GOLF HELPERS =====
  function golfRelease(state) {
    const g = state.golf;
    if (!g || !g.aim) return;
    const ball = state.ball;
    const dx = g.aim.from.x - g.aim.to.x;
    const dy = g.aim.from.y - g.aim.to.y;
    const mag = Math.hypot(dx, dy);
    const power = Math.min(220, mag) / 220 * 18;  // up to 18 px/frame
    if (power > 0.5) {
      const ang = Math.atan2(dy, dx);
      ball.vx = Math.cos(ang) * power;
      ball.vy = Math.sin(ang) * power;
      g.strokes[g.activeSlot]++;
      g.totalStrokes[g.activeSlot]++;
    }
    g.aim = null;
  }
  function advanceGolfTurn(state) {
    const g = state.golf;
    if (!g) return;
    const n = state.players.length;
    g.aim = null;
    let next = (g.activeSlot + 1) % n;
    let steps = 0;
    while (g.holed[next] && steps < n) { next = (next + 1) % n; steps++; }
    if (g.holed.every(h => h)) {
      g.courseIdx++;
      if (g.courseIdx >= g.courses.length) {
        let bestSlot = 0, bestTotal = Infinity;
        for (let i = 0; i < n; i++) {
          if (g.totalStrokes[i] < bestTotal) { bestTotal = g.totalStrokes[i]; bestSlot = i; }
        }
        state.winner = state.players[bestSlot].slot;
        state.players[bestSlot].score = state.players[bestSlot]._target || 5;
        state.endTimer = 140;
        return;
      }
      const c = g.courses[g.courseIdx];
      state.ball = { x:c.tee.x, y:c.tee.y, vx:0, vy:0, r:10 };
      state.finish = { x:c.hole.x - 14, y:c.hole.y - 14, w:28, h:28 };
      g.strokes = state.players.map(() => 0);
      g.holed = state.players.map(() => false);
      g.activeSlot = 0;
    } else {
      g.activeSlot = next;
      const c = g.courses[g.courseIdx];
      // Move ball to tee for the new player
      state.ball.x = c.tee.x; state.ball.y = c.tee.y;
      state.ball.vx = 0; state.ball.vy = 0;
    }
    g.turnTimer = 60 * 20;
  }

  // ===== TOWER DEFENSE HELPERS =====
  // Tower types with distinct visuals + stats
  const TD_TOWER_KINDS = [
    { id:'basic',  name:'Archer',  cost:60,  range:140, atkCd:18, dmg:10, color:'#3a4a78', turret:'#5bf0e8',
      desc:'Cheap fast single-shot. Reliable starter tower.',
      upgrades:[
        '+60% damage, +15% range, +15% fire rate',
        'Twin Bows: fires TWO arrows per shot',
      ]
    },
    { id:'sniper', name:'Sniper',  cost:140, range:280, atkCd:50, dmg:30, color:'#1a3a2a', turret:'#5bff8a',
      desc:'Massive range, big single damage.',
      upgrades:[
        '+60% damage, +15% range, +15% fire rate',
        'Armor Piercing: shots ignore armor + crit on every hit',
      ]
    },
    { id:'cannon', name:'Cannon',  cost:180, range:120, atkCd:60, dmg:24, color:'#5a3a1a', turret:'#ff9a3c',
      desc:'Lobs cannonballs with area splash damage.',
      upgrades:[
        '+60% damage, +20% splash radius',
        'Heavy Shell: splash also briefly knocks back/slows enemies',
      ]
    },
    { id:'frost',  name:'Frost',   cost:100, range:130, atkCd:30, dmg:6,  color:'#1a4a78', turret:'#a5f3ff',
      desc:'Slows every enemy it hits for 2 seconds.',
      upgrades:[
        '+0.5s slow, +60% damage, stronger slow factor',
        'Deep Freeze: 20% chance to fully FREEZE on hit',
      ]
    },
    { id:'laser',  name:'Laser',   cost:200, range:170, atkCd:0,  dmg:0.25, color:'#3a1a3a', turret:'#ff3df6',
      desc:'Continuous beam — locks on and melts.',
      upgrades:[
        '+60% damage per tick, +15% range',
        'Prism Split: beam chains to a SECOND nearby enemy',
      ]
    },
    { id:'tesla',  name:'Tesla',   cost:220, range:140, atkCd:50, dmg:14, color:'#1a1a4a', turret:'#7c5cff',
      desc:'Chain lightning bounces between 3 enemies.',
      upgrades:[
        '+60% damage per arc, +15% range',
        'Overload: jumps to 5 enemies + each hit briefly stuns',
      ]
    },
    { id:'poison', name:'Poison',  cost:120, range:130, atkCd:42, dmg:5,  color:'#2a3a1a', turret:'#7bff5a',
      desc:'Coats targets in poison. Damage over 3 seconds.',
      upgrades:[
        '+60% damage, longer DoT, faster fire rate',
        'Plague: poison spreads to nearby enemies on death',
      ]
    },
    { id:'sun',    name:'Gold Mine', cost:260, range:0, atkCd:300, dmg:0, color:'#7a5a14', turret:'#ffd76a',
      desc:'Passive — generates +30 gold every 5 seconds.',
      upgrades:[
        'Output doubles: +60 gold every 5s',
        'Bonanza: 2x payout every cycle ( +120 gold every 5s )',
      ]
    },
  ];
  // ---------- TD path layouts ----------
  // Each layout returns a list of waypoints from the left edge (entry) to
  // the right edge (base). Designed so towers can be placed in the gaps.
  const TD_PATHS = {
    'zigzag': [
      { x: 0,    y: 220 }, { x: 220,  y: 220 },
      { x: 220,  y: 460 }, { x: 480,  y: 460 },
      { x: 480,  y: 220 }, { x: 760,  y: 220 },
      { x: 760,  y: 500 }, { x: 1020, y: 500 },
      { x: 1020, y: 280 }, { x: 1280, y: 280 },
    ],
    'scurve': [
      { x: 0,    y: 140 }, { x: 260,  y: 140 },
      { x: 260,  y: 380 }, { x: 560,  y: 380 },
      { x: 560,  y: 140 }, { x: 860,  y: 140 },
      { x: 860,  y: 500 }, { x: 1280, y: 500 },
    ],
    'spiral': [
      { x: 0,    y: 360 }, { x: 220,  y: 360 },
      { x: 220,  y: 540 }, { x: 1080, y: 540 },
      { x: 1080, y: 180 }, { x: 360,  y: 180 },
      { x: 360,  y: 360 }, { x: 940,  y: 360 },
      { x: 940,  y: 420 }, { x: 1280, y: 420 },
    ],
    'maze': [
      { x: 0,    y: 200 }, { x: 200,  y: 200 },
      { x: 200,  y: 100 }, { x: 460,  y: 100 },
      { x: 460,  y: 320 }, { x: 660,  y: 320 },
      { x: 660,  y: 100 }, { x: 920,  y: 100 },
      { x: 920,  y: 540 }, { x: 1120, y: 540 },
      { x: 1120, y: 300 }, { x: 1280, y: 300 },
    ],
    'highway': [
      { x: 0,    y: 540 }, { x: 1080, y: 540 },
      { x: 1080, y: 180 }, { x: 1280, y: 180 },
    ],
  };
  const TD_PATH_IDS = Object.keys(TD_PATHS);
  function tdGenPath(forceId) {
    // Use the picked map if specified, otherwise random.
    const id = (forceId && TD_PATHS[forceId])
      ? forceId
      : TD_PATH_IDS[Math.floor(Math.random() * TD_PATH_IDS.length)];
    const wp = TD_PATHS[id].map(p => ({ ...p }));
    wp._id = id;
    return wp;
  }
  function pointOnPath(path, t) {
    // t = total px along the path → returns {x,y,segIdx}
    let acc = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i-1], b = path[i];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      if (acc + segLen >= t) {
        const u = (t - acc) / segLen;
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, done: false };
      }
      acc += segLen;
    }
    return { x: path[path.length-1].x, y: path[path.length-1].y, done: true };
  }
  function pathTotalLen(path) {
    let acc = 0;
    for (let i = 1; i < path.length; i++) acc += Math.hypot(path[i].x - path[i-1].x, path[i].y - path[i-1].y);
    return acc;
  }
  function pointNearPath(path, x, y, dist) {
    // Returns true if (x,y) is within `dist` of any path segment.
    for (let i = 1; i < path.length; i++) {
      const a = path[i-1], b = path[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx*dx + dy*dy;
      const t = Math.max(0, Math.min(1, ((x-a.x)*dx + (y-a.y)*dy) / len2));
      const px = a.x + dx*t, py = a.y + dy*t;
      if (Math.hypot(x - px, y - py) < dist) return true;
    }
    return false;
  }
  function tdTryPlaceTower(state, x, y) {
    const td = state.td;
    if (!td) return;
    const kind = td.towerKinds.find(k => k.id === td.selectedKind) || td.towerKinds[0];
    if (td.gold < kind.cost) return;
    if (pointNearPath(td.path, x, y, 36)) return;       // can't place on path
    if (x < 30 || x > W - 30 || y < 30 || y > H - 30) return; // bounds
    for (const t of td.towers) {
      if (Math.hypot(t.x - x, t.y - y) < 44) return;
    }
    td.gold -= kind.cost;
    td.towers.push({
      x, y,
      kindId: kind.id,
      level: 1,
      range: kind.range,
      atkCd: 0, atkRate: kind.atkCd,
      dmg: kind.dmg,
      color: kind.color, turret: kind.turret,
      // for cannon (splash radius)
      splash: kind.id === 'cannon' ? 50 : 0,
      // for frost (slow strength + duration)
      slow:   kind.id === 'frost'  ? { factor:0.55, durSec:2 } : null,
      baseCost: kind.cost,
    });
    SFX.place();
  }
  // Tower-upgrade panel is FIXED to the top-right corner of the canvas so the
  // buttons never move, never overlap towers, and are always reachable.
  // Click hit-test and draw use this SAME rect.
  // Top-center area: Start Wave button + Speed toggle. Shared by draw + click.
  function tdControlsRect() {
    const sw = 250, sh = 40;                       // start-wave button
    const sx = (W - sw) / 2 - 30, sy = 14;
    const ssw = 50, ssh = 40;                      // speed toggle
    const ssx = sx + sw + 8, ssy = 14;
    return { sx, sy, sw, sh, ssx, ssy, ssw, ssh };
  }
  function tdControlsClick(state, x, y) {
    const td = state.td; if (!td) return false;
    const { sx, sy, sw, sh, ssx, ssy, ssw, ssh } = tdControlsRect();
    // Speed toggle
    if (x >= ssx && x < ssx + ssw && y >= ssy && y < ssy + ssh) {
      td.speed = (td.speed || 1) === 1 ? 2 : 1;
      return true;
    }
    // Start Wave (only active when waveReady)
    if (td.waveReady && x >= sx && x < sx + sw && y >= sy && y < sy + sh) {
      td.waveReady = false;
      td.waveTimer = 30; // small lead-in delay
      return true;
    }
    // Click inside the controls strip but not on a button → consume
    if (x >= sx && x < ssx + ssw && y >= sy && y < sy + sh) return true;
    return false;
  }

  function tdUpgradePanelRect(/* t */) {
    const PW = 320, PH = 310;
    const px = W - PW - 14;
    const py = 90;
    return { px, py, PW, PH };
  }
  // Sub-rects for the two big buttons + close button. Shared by click & draw.
  function tdUpgradePanelBtns() {
    const { px, py, PW, PH } = tdUpgradePanelRect();
    // Header (46) + desc section (~50) + perk section (~70) = ~166 px before buttons
    const upX = px + 14, upY = py + 170, upW = PW - 28, upH = 52;
    const slX = px + 14, slY = py + 232, slW = PW - 28, slH = 46;
    const cxX = px + PW - 34, cxY = py + 8, cxW = 26, cxH = 26;
    return { px, py, PW, PH, upX, upY, upW, upH, slX, slY, slW, slH, cxX, cxY, cxW, cxH };
  }
  function tdUpgradePanelClick(state, x, y) {
    const td = state.td;
    if (!td || !td.selectedTower) return false;
    const t = td.selectedTower;
    const { px, py, PW, PH, upX, upY, upW, upH, slX, slY, slW, slH, cxX, cxY, cxW, cxH } = tdUpgradePanelBtns();
    // Close (X) button — deselect
    if (x >= cxX && x < cxX + cxW && y >= cxY && y < cxY + cxH) {
      td.selectedTower = null;
      return true;
    }
    // UPGRADE button
    if (x >= upX && x < upX + upW && y >= upY && y < upY + upH) {
      if (t.level < 3) tdUpgrade(state, t);
      return true;
    }
    // SELL button
    if (x >= slX && x < slX + slW && y >= slY && y < slY + slH) {
      tdSellTower(state, t);
      return true;
    }
    // Click anywhere else inside the panel area = consume click (don't place a tower)
    if (x >= px && x < px + PW && y >= py && y < py + PH) return true;
    return false;
  }
  function tdTowerAt(state, x, y) {
    const td = state.td;
    if (!td) return null;
    // Generous hit radius — towers are ~22 px wide visually, but we want
    // sloppy clicks to still register as "I clicked the tower" rather than
    // accidentally placing a new tower next to it.
    let best = null, bestD = 36;
    for (const t of td.towers) {
      const d = Math.hypot(t.x - x, t.y - y);
      if (d < bestD) { best = t; bestD = d; }
    }
    return best;
  }
  function tdUpgradeCost(t) {
    if (!t || t.level >= 3) return Infinity;
    return Math.round((t.baseCost || 60) * (t.level === 1 ? 1.0 : 1.6));
  }
  function tdUpgrade(state, t) {
    const td = state.td;
    if (!td || !t || t.level >= 3) return;
    const cost = tdUpgradeCost(t);
    if (td.gold < cost) return;
    td.gold -= cost;
    t.level++;
    // Level 2: scaling upgrade — bigger numbers, no new ability.
    // Level 3: tower-specific PERK that meaningfully changes behavior.
    if (t.level === 2) {
      t.dmg     = Math.round(t.dmg * 1.6);
      t.range   = Math.round(t.range * 1.15);
      t.atkRate = Math.max(8, Math.round(t.atkRate * 0.85));
      if (t.splash > 0) t.splash = Math.round(t.splash * 1.2);
      if (t.slow) { t.slow.durSec += 0.5; t.slow.factor = Math.max(0.35, t.slow.factor - 0.1); }
      if (t.kindId === 'sun') t.payout = 60; // doubles base output
    } else if (t.level === 3) {
      // L3 perks per tower kind.
      switch (t.kindId) {
        case 'basic':
          t.multishot = 2;                         // Twin Bows: 2 arrows
          t.dmg = Math.round(t.dmg * 1.2);
          break;
        case 'sniper':
          t.pierce = true;                         // ignores armor
          t.crit = true;                           // every shot crits (×1.5)
          t.dmg = Math.round(t.dmg * 1.5);
          break;
        case 'cannon':
          t.splash = Math.round(t.splash * 1.4);   // bigger splash
          t.slow = { factor: 0.55, durSec: 0.8 };  // brief slow on hit
          t.dmg = Math.round(t.dmg * 1.3);
          break;
        case 'frost':
          t.freezeChance = 0.20;                   // 20% to fully freeze
          t.slow = t.slow || { factor:0.5, durSec:2.5 };
          t.slow.factor = Math.max(0.30, t.slow.factor - 0.15);
          t.dmg = Math.round(t.dmg * 1.4);
          break;
        case 'laser':
          t.chainCount = 2;                        // beam jumps to 1 extra
          t.dmg = +(t.dmg * 1.4).toFixed(2);
          t.range = Math.round(t.range * 1.15);
          break;
        case 'tesla':
          t.chainCount = 5;                        // jumps to 5 enemies
          t.stunFrames = 8;                        // brief stun on each arc
          t.dmg = Math.round(t.dmg * 1.3);
          break;
        case 'poison':
          t.plague = true;                         // spreads on enemy death
          t.dmg = Math.round(t.dmg * 1.5);
          break;
        case 'sun':
          t.payout = 120;                          // 2× payout = 120 gold
          break;
        default:
          t.dmg = Math.round(t.dmg * 1.4);
          t.range = Math.round(t.range * 1.10);
          t.atkRate = Math.max(6, Math.round(t.atkRate * 0.85));
      }
    }
    SFX.upgrade();
  }
  function tdSellTower(state, t) {
    const td = state.td;
    if (!td || !t) return;
    const totalSpent = (t.baseCost || 60) + (t.level >= 2 ? tdUpgradeCost({ ...t, level:1 }) : 0)
      + (t.level >= 3 ? tdUpgradeCost({ ...t, level:2 }) : 0);
    td.gold += Math.round(totalSpent * 0.6);
    td.towers.splice(td.towers.indexOf(t), 1);
    td.selectedTower = null;
    SFX.sell();
  }
  function tdSelectTowerAt(state, x, y) {
    // Click in panel area also dispatches kind selection. Returns true if hit.
    const td = state.td;
    if (!td) return false;
    const slots = td.towerKinds.length;
    const slotW = 95, slotH = 64, baseX = 14, baseY = H - 90;
    for (let i = 0; i < slots; i++) {
      const sx = baseX + i * (slotW + 6);
      if (x >= sx && x < sx + slotW && y >= baseY && y < baseY + slotH) {
        td.selectedKind = td.towerKinds[i].id;
        return true;
      }
    }
    return false;
  }

  function spawnStarBurst(state, x, y, color) {
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI*2;
      state.particles.push({
        x, y, vx:Math.cos(a)*4, vy:Math.sin(a)*4 - 1, g:0.18, life:18, color, star:true
      });
    }
  }

  // ===================== DRAW =====================
  function draw(ctx, state) {
    // Top-down modes own the whole canvas
    if (state.mode === 'golf') { drawGolfTopDown(ctx, state); return; }
    if (state.mode === 'td')   { drawTowerDefenseTopDown(ctx, state); return; }

    const stage = state.stage;
    ctx.save();
    if (state.shake > 0) {
      const s = state.shake * 0.6;
      ctx.translate((Math.random()-0.5)*s, (Math.random()-0.5)*s);
    }

    // sky gradient
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, stage.sky[0]); grad.addColorStop(1, stage.sky[1]);
    ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

    // far parallax silhouettes
    drawStageProps(ctx, state);

    // Determine the "hill" platform for KOTH highlight
    let hillPlat = null;
    if (state.mode === 'koth') {
      for (const plat of state.platforms) {
        if (plat.h > 30) continue;
        if (!hillPlat || plat.y < hillPlat.y) hillPlat = plat;
      }
    }
    // platforms
    for (const plat of state.platforms) {
      // platform shadow
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.fillRect(plat.x+3, plat.y+3, plat.w, plat.h);
      // platform body
      const pg = ctx.createLinearGradient(0, plat.y, 0, plat.y+plat.h);
      pg.addColorStop(0, plat.solid ? stage.plat : '#2a2038');
      pg.addColorStop(1, '#0a0612');
      ctx.fillStyle = pg;
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      // top highlight
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.fillRect(plat.x, plat.y, plat.w, 2);
      ctx.fillStyle = 'rgba(255,255,255,.04)';
      ctx.fillRect(plat.x, plat.y+2, plat.w, 1);
      // KOTH: gold border + pulsing crown above the hill
      if (plat === hillPlat) {
        const pulse = (Math.sin(state.frame * 0.08) + 1) * 0.5;
        ctx.strokeStyle = `rgba(255,215,106,${0.6 + pulse*0.4})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(plat.x - 1, plat.y - 1, plat.w + 2, plat.h + 2);
        // crown above the hill
        const cx = plat.x + plat.w/2;
        const cy = plat.y - 18 - pulse*4;
        ctx.fillStyle = '#ffd76a';
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy + 6);
        ctx.lineTo(cx - 12, cy - 4);
        ctx.lineTo(cx - 6, cy + 2);
        ctx.lineTo(cx,     cy - 8);
        ctx.lineTo(cx + 6, cy + 2);
        ctx.lineTo(cx + 12,cy - 4);
        ctx.lineTo(cx + 12,cy + 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#7a5a14';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }

    // hazards (draw on top of platforms, beneath everything else)
    drawHazards(ctx, state);

    // Mode-specific overlays (parkour flag, golf ball + goal, td enemies + base)
    if (state.mode === 'parkour' && state.finish) {
      const f = state.finish;
      // Flag pole
      ctx.fillStyle = '#cfd6e8';
      ctx.fillRect(f.x + f.w/2 - 2, f.y, 4, f.h);
      // Checkered flag
      const wave = (Math.sin(state.frame * 0.12) + 1) * 0.5;
      const fx = f.x + f.w/2 + 2;
      const fy = f.y;
      const fw = 36 + wave * 4, fh = 26;
      for (let yy = 0; yy < 4; yy++) {
        for (let xx = 0; xx < 6; xx++) {
          ctx.fillStyle = ((xx + yy) & 1) ? '#fff' : '#1a1a22';
          ctx.fillRect(fx + xx * fw/6, fy + yy * fh/4, fw/6, fh/4);
        }
      }
      ctx.strokeStyle = '#0a0e18'; ctx.lineWidth = 1;
      ctx.strokeRect(fx, fy, fw, fh);
      // FINISH label
      ctx.fillStyle = '#5bff8a';
      ctx.font = "700 11px 'Bebas Neue'"; ctx.textAlign = 'center';
      ctx.fillText('FINISH', f.x + f.w/2 + 14, fy - 4);
    }
    if (state.mode === 'golf' && state.finish) {
      const f = state.finish;
      // Cup
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(f.x, f.y + f.h - 8, f.w, 8);
      ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2;
      ctx.strokeRect(f.x, f.y + f.h - 8, f.w, 8);
      // Flag
      ctx.strokeStyle = '#cfd6e8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(f.x + f.w/2, f.y); ctx.lineTo(f.x + f.w/2, f.y + f.h); ctx.stroke();
      ctx.fillStyle = '#ff5b5b';
      ctx.beginPath();
      ctx.moveTo(f.x + f.w/2, f.y);
      ctx.lineTo(f.x + f.w/2 + 18, f.y + 6);
      ctx.lineTo(f.x + f.w/2, f.y + 14);
      ctx.closePath(); ctx.fill();
      // GOAL label
      ctx.fillStyle = '#ffd76a';
      ctx.font = "700 11px 'Bebas Neue'"; ctx.textAlign = 'center';
      ctx.fillText('GOAL', f.x + f.w/2, f.y - 6);
    }
    if (state.mode === 'golf' && state.ball) {
      const b = state.ball;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.stroke();
      // Golf HUD: hole + whose turn + strokes
      if (state.golf) {
        const g = state.golf;
        const active = state.players[g.activeSlot];
        ctx.fillStyle = 'rgba(8,4,18,.85)';
        ctx.fillRect(W/2 - 180, 90, 360, 60);
        ctx.fillStyle = '#ffd76a';
        ctx.font = "700 14px 'Bebas Neue'"; ctx.textAlign = 'center';
        ctx.fillText(`HOLE ${g.holeIdx + 1}/${g.holes.length}  ·  ${active ? active.name : ''}'s turn`, W/2, 110);
        ctx.fillStyle = '#fff';
        ctx.font = "600 12px 'Rajdhani'";
        const strokeText = state.players
          .map((p, i) => `${p.name}: ${g.totalStrokes[i]}${g.holed[i] ? ' ✓' : ''}`)
          .join('   ·   ');
        ctx.fillText(strokeText, W/2, 132);
      }
    }
    if (state.mode === 'td' && state.td) {
      const td = state.td;
      // Path indicator on the ground
      ctx.fillStyle = 'rgba(255,255,255,.04)';
      ctx.fillRect(0, GROUND_Y - 8, W, 8);
      // Base on the right
      ctx.fillStyle = '#3a4a78';
      ctx.fillRect(td.baseX, GROUND_Y - 100, 50, 100);
      ctx.fillStyle = '#5bf0e8';
      ctx.fillRect(td.baseX + 4, GROUND_Y - 96, 42, 6);
      ctx.strokeStyle = '#0a0e18'; ctx.lineWidth = 2;
      ctx.strokeRect(td.baseX, GROUND_Y - 100, 50, 100);
      // Base HP bar
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(td.baseX - 20, GROUND_Y - 120, 90, 12);
      ctx.fillStyle = '#ff5b5b';
      ctx.fillRect(td.baseX - 18, GROUND_Y - 118, 86 * Math.max(0, td.baseHp) / 200, 8);
      ctx.fillStyle = '#fff';
      ctx.font = "700 11px 'Bebas Neue'"; ctx.textAlign = 'center';
      ctx.fillText(`BASE ${Math.max(0, td.baseHp)}`, td.baseX + 25, GROUND_Y - 110);
      ctx.fillText(`WAVE ${td.waveNum}/${td.maxWaves}`, td.baseX + 25, GROUND_Y - 124);

      // Allies — drawn as small green stickmen
      for (const a of td.allies) {
        ctx.strokeStyle = a.dark || '#1e6c92';
        ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y - 30); ctx.lineTo(a.x, a.y);
        ctx.moveTo(a.x - 6, a.y - 22); ctx.lineTo(a.x + 6, a.y - 22);
        ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - 5, a.y + 6);
        ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + 5, a.y + 6);
        ctx.stroke();
        ctx.fillStyle = a.color || '#5bff8a';
        ctx.beginPath(); ctx.arc(a.x, a.y - 38, 8, 0, Math.PI*2); ctx.fill();
        // HP bar
        const hr = Math.max(0, a.hp / a.maxHp);
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(a.x - 10, a.y - 50, 20, 3);
        ctx.fillStyle = '#5bff8a';
        ctx.fillRect(a.x - 10, a.y - 50, 20 * hr, 3);
      }

      // Enemies
      for (const e of td.enemies) {
        ctx.fillStyle = e.color;
        ctx.beginPath(); ctx.arc(e.x, e.y - 10, 14, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(e.x, e.y - 10, 14, 0, Math.PI*2); ctx.stroke();
        // X eyes
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(e.x - 6, e.y - 14); ctx.lineTo(e.x - 2, e.y - 10);
        ctx.moveTo(e.x - 2, e.y - 14); ctx.lineTo(e.x - 6, e.y - 10);
        ctx.moveTo(e.x + 2, e.y - 14); ctx.lineTo(e.x + 6, e.y - 10);
        ctx.moveTo(e.x + 6, e.y - 14); ctx.lineTo(e.x + 2, e.y - 10);
        ctx.stroke();
        // HP pip
        const hpRatio = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(e.x - 16, e.y - 34, 32, 4);
        ctx.fillStyle = '#5bff8a';
        ctx.fillRect(e.x - 15, e.y - 33, 30 * hpRatio, 2);
      }

      // Gold + summon hint
      ctx.fillStyle = 'rgba(8,4,18,.85)';
      ctx.fillRect(14, 90, 280, 50);
      ctx.fillStyle = '#ffd76a';
      ctx.font = "700 18px 'Bebas Neue'"; ctx.textAlign = 'left';
      ctx.fillText(`GOLD ${td.gold}`, 24, 113);
      ctx.fillStyle = '#fff';
      ctx.font = "600 11px 'Rajdhani'";
      ctx.fillText(`Press Q to summon ally · 20 gold`, 24, 132);
    }

    // lava floor
    const lavaGrad = ctx.createLinearGradient(0, LAVA_Y, 0, H);
    lavaGrad.addColorStop(0, stage.lava);
    lavaGrad.addColorStop(.4, '#a02818');
    lavaGrad.addColorStop(1, '#2a0a04');
    ctx.fillStyle = lavaGrad; ctx.fillRect(0, LAVA_Y, W, H-LAVA_Y);
    // lava wavelets
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 6) {
      const y = LAVA_Y + 2 + Math.sin(state.frame*0.06 + x*0.04) * 2;
      ctx.fillStyle = 'rgba(255,220,140,.5)';
      ctx.fillRect(x, y, 4, 1.5);
    }
    // bubbles
    if (state.frame % 30 === 0) {
      for (let i = 0; i < 3; i++) {
        state.particles.push({
          x: Math.random()*W, y: LAVA_Y+5,
          vx: 0, vy: -1 - Math.random(), g:-0.05, life: 30, color:'#ffd76a'
        });
      }
    }

    // embers
    ctx.fillStyle = stage.accent;
    for (const e of state.embers) {
      ctx.globalAlpha = Math.min(1, e.life / e.maxLife) * 0.85;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // projectiles (banana, fire)
    for (const pr of state.proj) {
      if (pr.type === 'banana') {
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 11, 4, 0.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#cc9020';
        ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 4, 1.5, 0.5, 0, Math.PI*2); ctx.fill();
      } else if (pr.type === 'fire') {
        const alpha = Math.min(1, pr.life/120);
        ctx.fillStyle = `rgba(255,138,61,${alpha*0.7})`;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 12 + Math.sin(state.frame*0.3+pr.x)*2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = `rgba(255,220,80,${alpha})`;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 6, 0, Math.PI*2); ctx.fill();
      }
    }

    // particles
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 40);
      ctx.fillStyle = p.color;
      if (p.star) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life*0.4);
        ctx.fillRect(-1, -5, 2, 10); ctx.fillRect(-5, -1, 10, 2);
        ctx.restore();
      } else {
        ctx.fillRect(p.x, p.y, 3, 3);
      }
    }
    ctx.globalAlpha = 1;
    drawDamagePopups(ctx, state);
    drawToasts(ctx, state);

    // players (trails first, then bodies)
    for (const p of state.players) {
      drawTrailSamples(ctx, p);
    }
    for (const p of state.players) {
      if (!p.alive) {
        if (p.ragdoll && !p.ragdoll.gone) drawRagdoll(ctx, p);
        continue;
      }
      drawStickman(ctx, p, state.edu);
    }

    // HUD
    // Boss HP bar across the top
    if (state.mode === 'boss') {
      const boss = state.players.find(p => p.isBot);
      if (boss) {
        const ratio = Math.max(0, boss.hp / boss.maxHp);
        ctx.fillStyle = 'rgba(8,4,18,.85)';
        ctx.fillRect(W/2 - 280, 90, 560, 40);
        ctx.fillStyle = '#1a0e22';
        ctx.fillRect(W/2 - 270, 96, 540, 26);
        const grad = ctx.createLinearGradient(0, 96, 0, 122);
        grad.addColorStop(0, ratio > 0.5 ? '#ff7a5a' : ratio > 0.25 ? '#ff4d2e' : '#ffd76a');
        grad.addColorStop(1, ratio > 0.5 ? '#a02418' : ratio > 0.25 ? '#7a1c10' : '#7a5a14');
        ctx.fillStyle = grad;
        ctx.fillRect(W/2 - 270, 96, 540 * ratio, 26);
        ctx.fillStyle = '#fff';
        ctx.font = "700 14px 'Bebas Neue'"; ctx.textAlign = 'center';
        ctx.fillText(`${boss.name}  ·  PHASE ${boss.bossPhase || 1}  ·  ${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`,
          W/2, 114);
      }
    }
    // Bomb-tag indicator over the carrier
    if (state.mode === 'bomb' && state.bomb) {
      const c = state.players.find(p => p.slot === state.bomb.carrierSlot && p.alive);
      if (c) {
        const secsLeft = Math.max(0, state.bomb.timer / 60);
        const pulse = (Math.sin(state.frame * 0.4) + 1) * 0.5;
        // bomb sphere
        ctx.fillStyle = '#1a1a22';
        ctx.beginPath(); ctx.arc(c.x, c.y - 70, 11, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = `rgba(255,${77 + pulse*120},46,${0.5 + pulse*0.5})`;
        ctx.beginPath(); ctx.arc(c.x, c.y - 70, 6 + pulse*2, 0, Math.PI*2); ctx.fill();
        // fuse
        ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(c.x, c.y - 81); ctx.lineTo(c.x + 5, c.y - 89); ctx.stroke();
        // timer
        ctx.fillStyle = '#fff';
        ctx.font = "700 14px 'Bebas Neue'"; ctx.textAlign = 'center';
        ctx.fillText(secsLeft.toFixed(1), c.x, c.y - 92);
      }
    }
    drawHUD(ctx, state);

    // banner
    if (state.winner !== null) {
      const w = state.players.find(p => p.slot === state.winner);
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(0, H/2-80, W, 160);
      ctx.font = "bold 72px 'Bebas Neue', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillStyle = w ? w.color : '#fff';
      ctx.fillText(w ? `${w.name.toUpperCase()} SCORES` : 'DRAW', W/2, H/2);
      ctx.font = "600 22px 'Rajdhani', sans-serif";
      ctx.fillStyle = '#fff';
      ctx.fillText('Next round...', W/2, H/2 + 40);
    }

    // vignette
    const vg = ctx.createRadialGradient(W/2, H/2, W/3, W/2, H/2, W*0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);

    ctx.restore();
  }

  function drawStageProps(ctx, state) {
    const stage = state.stage;
    // far cliffs
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    for (let i = 0; i < 7; i++) {
      const x = (i * 220) - 60;
      ctx.beginPath();
      ctx.moveTo(x, 540);
      ctx.lineTo(x + 90, 320 + (i%2)*40);
      ctx.lineTo(x + 180, 540);
      ctx.closePath(); ctx.fill();
    }
    // mid cliffs
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    for (let i = 0; i < 9; i++) {
      const x = (i * 170) - 30;
      ctx.beginPath();
      ctx.moveTo(x, 555);
      ctx.lineTo(x + 70, 440 + (i%2)*20);
      ctx.lineTo(x + 140, 555);
      ctx.closePath(); ctx.fill();
    }

    if (stage.props && stage.props.includes('lanterns')) {
      const lx = [80, 320, 960, 1200];
      for (const x of lx) drawLantern(ctx, x, 250 + Math.sin(state.frame*0.04+x)*4, stage.lava);
    }
    if (stage.props && stage.props.includes('torches')) {
      for (const x of [120, 1160]) drawTorch(ctx, x, 250, state.frame, stage.lava);
    }
    if (stage.props && stage.props.includes('pillars')) {
      for (const x of [50, 1180]) drawPillar(ctx, x, GROUND_Y);
    }
    if (stage.props && stage.props.includes('moons')) {
      ctx.fillStyle = '#fff7c2';
      ctx.beginPath(); ctx.arc(1100, 140, 36, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = stage.sky[1];
      ctx.beginPath(); ctx.arc(1115, 132, 30, 0, Math.PI*2); ctx.fill();
    }
    if (stage.props && stage.props.includes('chains')) {
      ctx.strokeStyle = '#3a3a4a'; ctx.lineWidth = 2;
      for (const x of [220, 640, 1060]) {
        ctx.beginPath();
        for (let y = 0; y < 200; y += 12) {
          ctx.moveTo(x, y); ctx.lineTo(x+2, y+10);
          ctx.moveTo(x+2, y+10); ctx.lineTo(x, y+20);
        }
        ctx.stroke();
      }
    }
    if (stage.props && stage.props.includes('sparkles')) {
      for (let i = 0; i < 40; i++) {
        const x = (i*73) % W, y = (i*113) % 300 + 40;
        const t = (Math.sin(state.frame*0.05 + i*1.7)+1)/2;
        ctx.fillStyle = `rgba(255,255,255,${t*0.4})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  function drawHazards(ctx, state) {
    for (const hz of state.hazards) {
      if (hz.type === 'spike') {
        // jagged spike strip from (hz.x, hz.y) spanning hz.w
        const baseY = hz.y + hz.h;
        const tipY = hz.y;
        const grad = ctx.createLinearGradient(0, tipY, 0, baseY);
        grad.addColorStop(0, '#fff'); grad.addColorStop(.4, '#cbd2da'); grad.addColorStop(1, '#5a6478');
        ctx.fillStyle = grad;
        const step = 14;
        ctx.beginPath();
        for (let x = hz.x; x < hz.x + hz.w; x += step) {
          ctx.moveTo(x, baseY);
          ctx.lineTo(x + step/2, tipY);
          ctx.lineTo(x + step, baseY);
        }
        ctx.fill();
        ctx.strokeStyle = '#1a1e28'; ctx.lineWidth = 1;
        for (let x = hz.x; x < hz.x + hz.w; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, baseY);
          ctx.lineTo(x + step/2, tipY);
          ctx.lineTo(x + step, baseY);
          ctx.stroke();
        }
        // dark base block
        ctx.fillStyle = '#1a1e28';
        ctx.fillRect(hz.x, baseY-2, hz.w, 4);
        // blood drips for flavor
        ctx.fillStyle = 'rgba(220,60,60,.55)';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(hz.x + ((i*97 + (state.frame*0.1)) % hz.w), tipY + 4, 1, 6 + Math.sin(state.frame*0.2+i)*2);
        }
      } else if (hz.type === 'lava' || hz.type === 'lavapool') {
        const g = ctx.createLinearGradient(0, hz.y, 0, hz.y + hz.h);
        g.addColorStop(0, '#ffd76a'); g.addColorStop(.4, '#ff4d2e'); g.addColorStop(1, '#3a0a04');
        ctx.fillStyle = g;
        ctx.fillRect(hz.x, hz.y, hz.w, hz.h);
        // bubbles
        ctx.fillStyle = 'rgba(255,220,140,.7)';
        for (let i = 0; i < hz.w; i += 12) {
          const y = hz.y + 3 + Math.sin(state.frame*0.08 + i*0.05)*2;
          ctx.fillRect(hz.x + i + 2, y, 5, 1.5);
        }
      } else if (hz.type === 'sawblade') {
        const cx = hz.x + hz.w/2, cy = hz.y + hz.h/2, r = Math.min(hz.w, hz.h)/2;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(state.frame * 0.4);
        const sg = ctx.createRadialGradient(0,0,2,0,0,r);
        sg.addColorStop(0,'#fff'); sg.addColorStop(.6,'#aab4c8'); sg.addColorStop(1,'#3a4458');
        ctx.fillStyle = sg;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI*2;
          const a2 = a + Math.PI / 12;
          ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
          ctx.lineTo(Math.cos(a2)*r*0.78, Math.sin(a2)*r*0.78);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#0a0e18'; ctx.lineWidth = 1; ctx.stroke();
        // center bolt
        ctx.fillStyle = '#0a0e18';
        ctx.beginPath(); ctx.arc(0,0,r*0.25,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ff3d6e';
        ctx.beginPath(); ctx.arc(0,0,r*0.12,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawLantern(ctx, x, y, c) {
    ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y-30); ctx.lineTo(x, y-12); ctx.stroke();
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(x-5, y-12, 10, 3);
    const g = ctx.createRadialGradient(x, y, 2, x, y, 14);
    g.addColorStop(0, '#fff'); g.addColorStop(.4, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill();
  }
  function drawTorch(ctx, x, y, frame, c) {
    ctx.fillStyle = '#2a1a14';
    ctx.fillRect(x-2, y-30, 4, 24);
    // flame
    const flick = Math.sin(frame*0.4)*2;
    const g = ctx.createLinearGradient(x, y-30, x, y-50);
    g.addColorStop(0, c); g.addColorStop(1, '#ffd76a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x-6, y-30); ctx.quadraticCurveTo(x-2, y-44+flick, x, y-50);
    ctx.quadraticCurveTo(x+2, y-44+flick, x+6, y-30);
    ctx.closePath(); ctx.fill();
  }
  function drawPillar(ctx, x, by) {
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(x-12, 240, 24, by-240);
    ctx.fillRect(x-18, 240, 36, 8);
    ctx.fillRect(x-18, by-12, 36, 8);
  }

  function drawTrailSamples(ctx, p) {
    if (!p.trail || !p.trail.draw) return;
    for (const s of p.trailSamples) {
      ctx.save();
      ctx.translate(s.x, s.y);
      p.trail.draw(ctx, s.age, s.max, p.color);
      ctx.restore();
    }
  }

  // Draw a single TD tower as a stickman holding a weapon distinctive to the
  // tower kind. The little fellow stands on a stone tile, gets a level pip on
  // his head, and faces toward the nearest enemy when one is in range.
  function drawTowerStickman(ctx, t, state) {
    // -- helpers --
    // Stickman dimensions (small fighter)
    const cx = t.x, gy = t.y + 12; // ground level under the figure
    const kind = (t.kindId || 'basic');
    // Find facing direction (track nearest enemy in range)
    let face = 1;
    if (state.td) {
      let best = Infinity, bx = null;
      for (const e of state.td.enemies) {
        const d = Math.hypot(e.x - cx, e.y - (gy - 20));
        if (d <= t.range && d < best) { best = d; bx = e.x; }
      }
      if (bx !== null) face = bx >= cx ? 1 : -1;
    }
    // Idle bob — head/body sway gently per tower (different phase per tower).
    const bob = Math.sin(state.frame * 0.06 + (t.x + t.y) * 0.01) * 1.2;

    // -- drop shadow + ground tile --
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(cx + 1, gy + 6, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cda36a';
    ctx.beginPath(); ctx.arc(cx, gy + 4, 20, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#8a6634'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, gy + 4, 20, 0, Math.PI*2); ctx.stroke();
    // tile detail (3 small grass tufts)
    ctx.fillStyle = '#6a8a3a';
    ctx.beginPath(); ctx.arc(cx - 12, gy + 8, 1.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 11, gy + 9, 1.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 4, gy + 11, 1.4, 0, Math.PI*2); ctx.fill();

    // -- skin/outfit color depends on tower kind --
    const tinted = t.color || '#c9a25f';
    const dark = '#1a1622';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // -- body --
    const headR = 5;
    const headY = gy - 26 + bob;
    const torsoTop = headY + headR;
    const torsoBot = gy - 4;
    ctx.strokeStyle = tinted; ctx.lineWidth = 2.8;
    // torso
    ctx.beginPath();
    ctx.moveTo(cx, torsoTop);
    ctx.lineTo(cx, torsoBot);
    ctx.stroke();
    // legs (slight stance)
    ctx.beginPath();
    ctx.moveTo(cx, torsoBot);
    ctx.lineTo(cx - 4, gy + 3);
    ctx.moveTo(cx, torsoBot);
    ctx.lineTo(cx + 4, gy + 3);
    ctx.stroke();
    // head
    ctx.fillStyle = tinted;
    ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI*2); ctx.stroke();
    // eyes (face direction)
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx + face * 1.4, headY - 0.6, 1.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + face * 1.4 + 1.4, headY - 0.6, 1.1, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(cx + face * 1.6, headY - 0.6, 0.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + face * 1.6 + 1.4, headY - 0.6, 0.5, 0, Math.PI*2); ctx.fill();

    // -- arms + weapon (varies by kind) --
    const shoulderY = torsoTop + 4;
    ctx.strokeStyle = tinted; ctx.lineWidth = 2.4;

    if (kind === 'basic') {
      // ARCHER: arms raised holding a bow horizontally facing forward.
      const hx = cx + face * 9;
      const hy = shoulderY + 2;
      // arms
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(hx - face * 2, hy + 1);
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(hx, hy - 3);
      ctx.stroke();
      // bow (vertical arc)
      ctx.strokeStyle = '#8a5028'; ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(hx + face * 1, hy, 9, Math.PI * 0.65 * face, Math.PI * 1.35 * face, face < 0);
      ctx.stroke();
      // bowstring
      ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx + face * 1, hy - 8.2);
      ctx.lineTo(hx + face * 1, hy + 8.2);
      ctx.stroke();
      // arrow nocked, pointing forward
      ctx.strokeStyle = '#a06030'; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(hx + face * 1, hy);
      ctx.lineTo(hx + face * 9, hy);
      ctx.stroke();
      // arrowhead
      ctx.fillStyle = '#cfd6e8';
      ctx.beginPath();
      ctx.moveTo(hx + face * 9, hy - 2);
      ctx.lineTo(hx + face * 12, hy);
      ctx.lineTo(hx + face * 9, hy + 2);
      ctx.closePath(); ctx.fill();

    } else if (kind === 'sniper') {
      // SNIPER: prone stance with long rifle pointing forward.
      // Replace legs with prone body
      ctx.strokeStyle = tinted; ctx.lineWidth = 2.4;
      // arms hugging rifle
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx + face * 6, shoulderY + 4);
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx + face * 9, shoulderY + 1);
      ctx.stroke();
      // rifle (long barrel)
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(cx - face * 2, shoulderY + 2);
      ctx.lineTo(cx + face * 16, shoulderY + 2);
      ctx.stroke();
      // scope dot
      ctx.fillStyle = '#5bff8a';
      ctx.beginPath(); ctx.arc(cx + face * 4, shoulderY - 1, 1.6, 0, Math.PI*2); ctx.fill();
      // muzzle flash hint
      ctx.fillStyle = '#ffdd55';
      ctx.beginPath(); ctx.arc(cx + face * 16, shoulderY + 2, 1.2, 0, Math.PI*2); ctx.fill();

    } else if (kind === 'cannon') {
      // CANNON: stickman standing next to a small cannon on wheels.
      // Arms holding lit fuse
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx - face * 7, shoulderY + 4);
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx + face * 6, shoulderY + 6);
      ctx.stroke();
      // cannon to the side
      const cx2 = cx + face * 11;
      ctx.fillStyle = '#1a1a22';
      ctx.beginPath(); ctx.arc(cx2 - 3, gy + 2, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx2 + 3, gy + 2, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#3a2a18';
      ctx.fillRect(cx2 - 5, gy - 4, 10, 6);
      // barrel
      ctx.fillStyle = '#2a2a32';
      ctx.fillRect(cx2 + (face < 0 ? -10 : 0), gy - 8, 10, 6);
      ctx.fillStyle = '#1a1a22';
      ctx.beginPath(); ctx.arc(cx2 + face * 10, gy - 5, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#ff9a3c'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx2 + face * 10, gy - 5, 2.5, 0, Math.PI*2); ctx.stroke();

    } else if (kind === 'frost') {
      // FROST: wizard stickman with staff topped by a snowflake.
      // arms holding staff
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx + face * 5, shoulderY + 8);
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx + face * 6, shoulderY - 2);
      ctx.stroke();
      // staff
      ctx.strokeStyle = '#5a3a14'; ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx + face * 6, gy + 2);
      ctx.lineTo(cx + face * 6, headY - 6);
      ctx.stroke();
      // snowflake atop
      const sx = cx + face * 6, sy = headY - 10;
      ctx.strokeStyle = '#a5f3ff'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.shadowColor = '#a5f3ff'; ctx.shadowBlur = 6;
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(a) * 5, sy + Math.sin(a) * 5);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, Math.PI*2); ctx.fill();
      // wizard hat
      ctx.fillStyle = '#1a2a5a';
      ctx.beginPath();
      ctx.moveTo(cx - 6, headY - headR + 1);
      ctx.lineTo(cx, headY - 16);
      ctx.lineTo(cx + 6, headY - headR + 1);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd84a';
      ctx.beginPath(); ctx.arc(cx, headY - 11, 1, 0, Math.PI*2); ctx.fill();

    } else if (kind === 'laser') {
      // LASER: stickman aiming a futuristic ray gun forward (beam handled elsewhere).
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx + face * 7, shoulderY + 3);
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx + face * 8, shoulderY - 1);
      ctx.stroke();
      // gun body
      ctx.fillStyle = '#2a2a32';
      ctx.fillRect(cx + (face < 0 ? -12 : 4), shoulderY - 1, 8, 4);
      // emitter dot
      ctx.fillStyle = t.turret || '#a5f3ff';
      ctx.beginPath(); ctx.arc(cx + face * 13, shoulderY + 1, 2, 0, Math.PI*2); ctx.fill();
      ctx.shadowColor = t.turret || '#a5f3ff'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(cx + face * 13, shoulderY + 1, 1.4, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      // beam to target (and a second beam if Prism Split upgrade is active)
      if (t._beamTarget) {
        ctx.shadowColor = t.turret; ctx.shadowBlur = 12;
        ctx.strokeStyle = t.turret; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx + face * 13, shoulderY + 1); ctx.lineTo(t._beamTarget.x, t._beamTarget.y); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(cx + face * 13, shoulderY + 1); ctx.lineTo(t._beamTarget.x, t._beamTarget.y); ctx.stroke();
        if (t._beamTarget2) {
          // Split beam from the first target to the second.
          ctx.shadowColor = t.turret; ctx.shadowBlur = 10;
          ctx.strokeStyle = t.turret; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(t._beamTarget.x, t._beamTarget.y); ctx.lineTo(t._beamTarget2.x, t._beamTarget2.y); ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(t._beamTarget.x, t._beamTarget.y); ctx.lineTo(t._beamTarget2.x, t._beamTarget2.y); ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

    } else if (kind === 'tesla') {
      // TESLA: stickman holding an electric coil above his head.
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx - 5, headY - 8);
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx + 5, headY - 8);
      ctx.stroke();
      // coil disk
      const dx = cx, dy = headY - 12;
      ctx.fillStyle = '#5a3a14';
      ctx.beginPath(); ctx.ellipse(dx, dy + 2, 7, 2, 0, 0, Math.PI*2); ctx.fill();
      // arcing electricity
      const arc = state.frame * 0.5;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = t.turret || '#7bbbff'; ctx.shadowBlur = 8;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(dx - 6, dy);
      for (let s = 1; s <= 5; s++) {
        const k = s / 5;
        const mx = dx - 6 + 12 * k + (Math.random() - 0.5) * 4;
        const my = dy - 6 - Math.sin(arc + s) * 4;
        ctx.lineTo(mx, my);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

    } else if (kind === 'poison') {
      // POISON: stickman holding a green vial high.
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx + face * 4, headY - 4);
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx - face * 5, shoulderY + 5);
      ctx.stroke();
      // vial
      const vx = cx + face * 6, vy = headY - 6;
      ctx.fillStyle = '#1a3a1a';
      ctx.fillRect(vx - 2, vy - 4, 4, 2);
      ctx.fillStyle = t.turret || '#7bff5a';
      ctx.beginPath();
      ctx.moveTo(vx - 3, vy - 2);
      ctx.lineTo(vx + 3, vy - 2);
      ctx.lineTo(vx + 4, vy + 6);
      ctx.lineTo(vx - 4, vy + 6);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2a5a1a'; ctx.lineWidth = 0.8; ctx.stroke();
      // bubble pop
      const bub = (state.frame * 0.1) % 1;
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      ctx.beginPath(); ctx.arc(vx, vy + 4 - bub * 3, 0.8, 0, Math.PI*2); ctx.fill();

    } else if (kind === 'sun') {
      // GOLD MINE: stickman with a pickaxe over his shoulder, beside coin pile.
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx - face * 4, shoulderY + 6);
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx + face * 3, headY - 4);
      ctx.stroke();
      // pickaxe handle
      ctx.strokeStyle = '#7a4e1f'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + face * 3, headY - 4);
      ctx.lineTo(cx + face * 10, headY - 12);
      ctx.stroke();
      // pickaxe head
      ctx.strokeStyle = '#cfd6e8'; ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx + face * 7, headY - 16);
      ctx.lineTo(cx + face * 13, headY - 10);
      ctx.stroke();
      // coin pile at feet
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath(); ctx.arc(cx - face * 9, gy + 3, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - face * 5, gy + 4, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - face * 7, gy + 1, 3, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#7a5a14'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(cx - face * 9, gy + 3, 3, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - face * 5, gy + 4, 3, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - face * 7, gy + 1, 3, 0, Math.PI*2); ctx.stroke();
      // sparkle
      const p = (Math.sin(state.frame * 0.18) + 1) * 0.5;
      ctx.fillStyle = `rgba(255,255,255,${0.5 + p * 0.5})`;
      ctx.fillRect(cx - face * 7, gy - 2, 1, 1);
    }

    // -- level pips above head --
    const lvl = t.level || 1;
    for (let i = 0; i < lvl; i++) {
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath(); ctx.arc(cx - 6 + i * 6, headY - headR - 6, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Achievement toast banner at top-center — fades in/out + slides.
  function drawToasts(ctx, state) {
    if (!state.toasts || state.toasts.length === 0) return;
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = 0; i < state.toasts.length; i++) {
      const t = state.toasts[i];
      const k = t.life / t.maxLife; // 0..1
      // Slide in for first 10% of life, slide out at last 20%.
      const slide = k < 0.1 ? (0.1 - k) * 80 : (k > 0.8 ? (k - 0.8) * 60 : 0);
      const alpha = k < 0.1 ? k * 10 : (k > 0.8 ? (1 - k) * 5 : 1);
      const y = 90 + i * 50 - slide;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      // Pill background
      ctx.font = `700 30px 'Bebas Neue'`;
      const tw = ctx.measureText(t.text).width;
      const pw = tw + 50, ph = 42;
      const px = W / 2 - pw / 2;
      ctx.fillStyle = 'rgba(8,4,18,.85)';
      ctx.fillRect(px, y - 28, pw, ph);
      ctx.strokeStyle = t.color; ctx.lineWidth = 2;
      ctx.strokeRect(px, y - 28, pw, ph);
      // Text
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, W / 2, y);
    }
    ctx.restore();
  }

  // Floating combat-text popups — drift up + fade. Big & bouncy for crits.
  function drawDamagePopups(ctx, state) {
    if (!state.popups || state.popups.length === 0) return;
    ctx.textAlign = 'center';
    for (const u of state.popups) {
      const t = u.life / u.maxLife;             // 0..1 progress
      ctx.globalAlpha = Math.max(0, 1 - t);
      // Crits "pop" with a quick scale bounce at spawn.
      const scale = u.size >= 22 ? (1 + Math.max(0, 0.4 - t * 1.6)) : 1;
      const px = u.x, py = u.y;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(scale, scale);
      ctx.font = `700 ${u.size}px 'Bebas Neue'`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.7)';
      ctx.strokeText(u.text, 0, 0);
      ctx.fillStyle = u.color;
      ctx.fillText(u.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawStickman(ctx, p, edu) {
    const size = p.buffs.sizeMul || 1;
    // Walk cycle. `stride` drives leg & arm motion. Positive half: front leg
    // swings forward (in p.facing direction) and back arm follows it
    // (natural opposite-arm-opposite-leg coordination). Negative half: swap.
    const moving = Math.abs(p.vx) > 1;
    const stride = Math.sin(p.animPhase) * (moving ? 4 : 1);
    const armSwing = Math.sin(p.animPhase) * (moving ? 6 : 2);
    // Tiny up/down hip bob — peaks at the apex of each step, makes weight
    // transfer feel like a real walk instead of a slide.
    const hipBob = moving ? Math.abs(Math.sin(p.animPhase * 2)) * 1.2 : 0;
    // Foot lift heights (only the swinging foot lifts off the ground).
    const flLift = moving ? Math.max(0, stride) * 0.9 : 0;   // front foot lift
    const blLift = moving ? Math.max(0, -stride) * 0.9 : 0;  // back foot lift

    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.phaseLeft > 0) ctx.globalAlpha = 0.5;
    if (p.flipped) ctx.scale(1, -1);
    ctx.scale(size, size);

    // outfit BEHIND body if marked behind:true (capes etc)
    if (p.outfit && p.outfit.draw && p.outfit.behind) {
      ctx.save(); ctx.translate(0, -22);
      try { p.outfit.draw(ctx); } catch(e){}
      ctx.restore();
    }

    // SKINNY TALL stickman — origin (0,0) is the FEET (= p.y).
    // Everything else is drawn upward (negative y).
    const headR = 11;
    const legBot  = 0;     // foot level — at player.y
    const bodyBot = -30;   // hip (above feet)
    const bodyTop = -60;   // top of torso (just below head)

    // SHADOW under feet
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(0, legBot+3, 10, 3, 0, 0, Math.PI*2); ctx.fill();

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // LEGS — alternating step. Each leg has a base offset from the hip
    // (one slightly forward, one slightly back in the facing direction) and
    // swings along the facing axis as `stride` cycles. The swinging foot
    // lifts off the ground for the step.
    ctx.strokeStyle = p.darkColor || '#222';
    ctx.lineWidth = 4;
    // Back leg — base ~3 px behind, swings -stride (opposite phase to front).
    const blKneeX = -p.facing * 3 + p.facing * (-stride) * 0.5;
    const blKneeY = -16 - blLift * 1.4 - hipBob;
    const blFootX = -p.facing * 5 + p.facing * (-stride) * 1.2;
    const blFootY = legBot - blLift * 3;
    ctx.beginPath();
    ctx.moveTo(0, bodyBot - hipBob); ctx.lineTo(blKneeX, blKneeY); ctx.lineTo(blFootX, blFootY);
    ctx.stroke();
    // Front leg — base ~3 px ahead, swings +stride. Kick overrides the swing.
    const kickLift = p.animKick > 0 ? 20 : 0;
    const flKneeX = p.facing * 3 + p.facing * stride * 0.5 + (p.animKick > 0 ? p.facing*10 : 0);
    const flKneeY = -16 - flLift * 1.4 - hipBob - (p.animKick > 0 ? 8 : 0);
    const flFootX = p.facing * 5 + p.facing * stride * 1.2 + (p.animKick > 0 ? p.facing*18 : 0);
    const flFootY = legBot - flLift * 3 - kickLift;
    ctx.beginPath();
    ctx.moveTo(0, bodyBot - hipBob); ctx.lineTo(flKneeX, flKneeY); ctx.lineTo(flFootX, flFootY);
    ctx.stroke();

    // FEET (small dots/wedges)
    ctx.fillStyle = p.darkColor || '#222';
    drawFoot(ctx, blFootX, blFootY, -1);
    drawFoot(ctx, flFootX, flFootY, p.animKick > 0 ? p.facing : 1);

    // TORSO (skinny line, slight curve, bobs with the hip)
    const torsoG = ctx.createLinearGradient(-3, bodyTop - hipBob, 3, bodyBot - hipBob);
    torsoG.addColorStop(0, p.darkColor || '#222');
    torsoG.addColorStop(1, '#000');
    ctx.strokeStyle = torsoG;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(0, bodyTop + 2 - hipBob);
    ctx.quadraticCurveTo(stride*0.25, (bodyTop+bodyBot)/2 - hipBob, 0, bodyBot - hipBob);
    ctx.stroke();

    // ARMS — counter-swing the legs (front leg forward → back arm forward).
    // armSwing carries the same sign as stride; subtract on front arm so it
    // moves OPPOSITE to the front leg; add on back arm so it moves WITH it.
    ctx.strokeStyle = p.darkColor || '#222';
    ctx.lineWidth = 3.8;
    const punchT = p.animPunch / 10;
    // back arm — swings forward when front leg swings back (i.e. with armSwing)
    const baElbowX = -p.facing * 5 + p.facing * armSwing * 0.5;
    const baElbowY = bodyTop + 13 - hipBob;
    const baHandX = -p.facing * 9 + p.facing * armSwing * 0.9;
    const baHandY = bodyTop + 21 - hipBob;
    ctx.beginPath();
    ctx.moveTo(0, bodyTop + 5 - hipBob); ctx.lineTo(baElbowX, baElbowY); ctx.lineTo(baHandX, baHandY);
    ctx.stroke();
    // front arm (punching) — swings opposite to front leg.
    const faExtend = p.animPunch > 0 ? 15 : 0;
    const faElbowX = p.facing * (7 + faExtend*0.4) - p.facing * armSwing * 0.5;
    const faElbowY = bodyTop + 12 - hipBob - (p.animPunch > 0 ? 4 : 0);
    const faHandX = p.facing * (13 + faExtend) - p.facing * armSwing * 0.9;
    const faHandY = bodyTop + 16 - hipBob - (p.animPunch > 0 ? 8 : 0);
    ctx.beginPath();
    ctx.moveTo(0, bodyTop + 5 - hipBob); ctx.lineTo(faElbowX, faElbowY); ctx.lineTo(faHandX, faHandY);
    ctx.stroke();

    // OUTFIT (front layer, e.g. shirts/jackets/armor) — drawn AFTER arms so
    // chest plates and shirts visually sit in front of the body and arms.
    if (p.outfit && p.outfit.draw && !p.outfit.behind) {
      ctx.save(); ctx.translate(0, bodyTop+2);
      try { p.outfit.draw(ctx); } catch(e){}
      ctx.restore();
    }

    // HANDS (small filled circles)
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(baHandX, baHandY, 2.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(faHandX, faHandY, 2.4 + (punchT*1), 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = p.darkColor || '#222';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(baHandX, baHandY, 2.4, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(faHandX, faHandY, 2.4 + (punchT*1), 0, Math.PI*2); ctx.stroke();

    // PUNCH IMPACT MARK (small star at fist on swing)
    if (p.animPunch > 6) {
      ctx.fillStyle = '#fff';
      ctx.save();
      ctx.translate(faHandX, faHandY);
      ctx.fillRect(-1, -5, 2, 10);
      ctx.fillRect(-5, -1, 10, 2);
      ctx.restore();
    }

    // HEAD (colored, with cheek shading) — sits just above bodyTop
    const cx = stride*0.1, cy = bodyTop - headR + 3 - hipBob;
    const headG = ctx.createRadialGradient(cx - p.facing*5, cy - 4, 2, cx, cy, headR);
    headG.addColorStop(0, lighten(p.color, 0.25));
    headG.addColorStop(.7, p.color);
    headG.addColorStop(1, p.darkColor || '#222');
    ctx.fillStyle = headG;
    ctx.beginPath(); ctx.arc(cx, cy, headR, 0, Math.PI*2); ctx.fill();
    // head outline
    ctx.strokeStyle = p.darkColor || '#222';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, headR, 0, Math.PI*2); ctx.stroke();
    // tiny chin shadow
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(cx, cy+headR-3, headR*0.7, 2, 0, 0, Math.PI*2); ctx.fill();

    // FACE overlay
    if (p.face && p.face.draw) {
      ctx.save(); ctx.translate(cx, cy);
      try { p.face.draw(ctx, p.facing); } catch(e){}
      ctx.restore();
    }

    // HAT
    if (p.hat && p.hat.draw) {
      ctx.save(); ctx.translate(cx, cy - headR + 3);
      try { p.hat.draw(ctx); } catch(e){}
      ctx.restore();
    }

    // hurt flash
    if (p.animHurt > 0) {
      ctx.globalAlpha = (p.animHurt / 12) * 0.55;
      ctx.fillStyle = edu ? '#ffffff' : '#ff5b5b';
      ctx.beginPath(); ctx.arc(cx, cy, headR+2, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // status icons (above head): reflect / phase / revive
    let badgeX = 14;
    if (p.reflectLeft > 0) {
      ctx.fillStyle = '#5bf0e8';
      ctx.beginPath(); ctx.arc(badgeX, bodyTop - headR*2, 3.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = "bold 6px sans-serif"; ctx.textAlign='center';
      ctx.fillText(p.reflectLeft, badgeX, bodyTop - headR*2 + 2);
      badgeX += 9;
    }
    if (p.revivesLeft > 0) {
      ctx.fillStyle = '#7bff8a';
      ctx.beginPath(); ctx.arc(badgeX, bodyTop - headR*2, 3.5, 0, Math.PI*2); ctx.fill();
      badgeX += 9;
    }

    ctx.restore();
  }

  function drawFoot(ctx, x, y, dir) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dir*5, 0);
    ctx.lineTo(dir*5, 2);
    ctx.lineTo(0, 2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Greedy word-wrap helper for canvas text. Renders at most 3 lines of `text`
  // starting at (x,y), wrapping at width w, line height lh. Returns the next y.
  function wrapText(ctx, text, x, y, w, lh) {
    if (!text) return y;
    const words = String(text).split(/\s+/);
    let line = '';
    let lines = 0;
    for (const word of words) {
      const trial = line ? line + ' ' + word : word;
      if (ctx.measureText(trial).width > w && line) {
        ctx.fillText(line, x, y);
        y += lh; lines++;
        if (lines >= 2) {
          // Truncate remaining into the third line.
          let rest = word;
          for (let i = words.indexOf(word) + 1; i < words.length; i++) rest += ' ' + words[i];
          if (ctx.measureText(rest).width > w) {
            while (rest.length > 4 && ctx.measureText(rest + '…').width > w) rest = rest.slice(0, -1);
            rest += '…';
          }
          ctx.fillText(rest, x, y);
          return y + lh;
        }
        line = word;
      } else {
        line = trial;
      }
    }
    if (line) { ctx.fillText(line, x, y); y += lh; }
    return y;
  }

  function lighten(hex, amt) {
    // simple lighten
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    let r = (n>>16)&0xff, g = (n>>8)&0xff, b = n&0xff;
    r = Math.min(255, r + (255-r)*amt) | 0;
    g = Math.min(255, g + (255-g)*amt) | 0;
    b = Math.min(255, b + (255-b)*amt) | 0;
    return `rgb(${r},${g},${b})`;
  }

  function drawRagdoll(ctx, p) {
    const r = p.ragdoll;
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.rot);
    ctx.strokeStyle = p.darkColor || '#222';
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0,-20); ctx.lineTo(0,18);
    ctx.moveTo(0,0); ctx.lineTo(-14,-4);
    ctx.moveTo(0,0); ctx.lineTo(14,-4);
    ctx.moveTo(0,18); ctx.lineTo(-10,30);
    ctx.moveTo(0,18); ctx.lineTo(10,30);
    ctx.stroke();
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(0,-30,13,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = p.darkColor; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,-30,13,0,Math.PI*2); ctx.stroke();
    // X eyes
    ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5,-32); ctx.lineTo(-2,-29); ctx.moveTo(-2,-32); ctx.lineTo(-5,-29);
    ctx.moveTo(2,-32); ctx.lineTo(5,-29); ctx.moveTo(5,-32); ctx.lineTo(2,-29);
    ctx.stroke();
    ctx.restore();
  }

  // ============== TOP-DOWN GOLF DRAW ==============
  function drawGolfTopDown(ctx, state) {
    const g = state.golf;
    if (!g) return;
    const course = g.courses[g.courseIdx];

    // Fairway tiles (checker green)
    const tile = 36;
    for (let y = 0; y < H; y += tile) {
      for (let x = 0; x < W; x += tile) {
        ctx.fillStyle = ((x/tile + y/tile) & 1) ? '#2e7a36' : '#367a3e';
        ctx.fillRect(x, y, tile, tile);
      }
    }
    // Outer rough
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(0, 0, W, 60);
    ctx.fillRect(0, H - 60, W, 60);
    ctx.fillRect(0, 60, 40, H - 120);
    ctx.fillRect(W - 40, 60, 40, H - 120);
    // Walls
    for (const w of (course.walls || [])) {
      ctx.fillStyle = '#6a4a28';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = '#3a2a18';
      ctx.fillRect(w.x, w.y + w.h - 4, w.w, 4);
      ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 1.5;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    }
    // Hole (dark circle + flag)
    ctx.fillStyle = '#0a0612';
    ctx.beginPath(); ctx.arc(course.hole.x, course.hole.y, 14, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(course.hole.x, course.hole.y, 14, 0, Math.PI*2); ctx.stroke();
    // Flag pole
    ctx.strokeStyle = '#cfd6e8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(course.hole.x, course.hole.y); ctx.lineTo(course.hole.x, course.hole.y - 50); ctx.stroke();
    // Flag
    ctx.fillStyle = '#ff5b5b';
    ctx.beginPath();
    ctx.moveTo(course.hole.x, course.hole.y - 50);
    ctx.lineTo(course.hole.x + 22, course.hole.y - 45);
    ctx.lineTo(course.hole.x, course.hole.y - 36);
    ctx.closePath(); ctx.fill();

    // Tee marker
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.arc(course.tee.x, course.tee.y, 4, 0, Math.PI*2); ctx.fill();

    // Aim guide
    if (g.aim) {
      const dx = g.aim.from.x - g.aim.to.x;
      const dy = g.aim.from.y - g.aim.to.y;
      const mag = Math.min(220, Math.hypot(dx, dy));
      const t = mag / 220;
      ctx.strokeStyle = `rgba(255,${255 - t*120},0,0.9)`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(g.aim.from.x, g.aim.from.y);
      const ang = Math.atan2(dy, dx);
      ctx.lineTo(g.aim.from.x + Math.cos(ang) * mag, g.aim.from.y + Math.sin(ang) * mag);
      ctx.stroke();
      // power meter
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(20, H - 30, 220, 14);
      ctx.fillStyle = `rgba(255,${255 - t*120},0,1)`;
      ctx.fillRect(22, H - 28, 216 * t, 10);
    }

    // Ball
    const b = state.ball;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.arc(b.x + 2, b.y + 3, b.r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.stroke();

    // HUD bar across top
    const active = state.players[g.activeSlot];
    ctx.fillStyle = 'rgba(8,4,18,.85)';
    ctx.fillRect(W/2 - 250, 14, 500, 56);
    ctx.fillStyle = '#fff';
    ctx.font = "700 18px 'Bebas Neue'"; ctx.textAlign = 'center';
    ctx.fillText(`HOLE ${g.courseIdx+1} OF ${g.courses.length}  ·  PAR ${course.par}`, W/2, 38);
    ctx.fillStyle = active ? active.color : '#fff';
    ctx.font = "700 16px 'Rajdhani'";
    ctx.fillText(`${active ? active.name : ''}'s turn  ·  stroke ${(g.strokes[g.activeSlot]||0)+1}`, W/2, 60);
    // Totals on the left
    ctx.fillStyle = 'rgba(8,4,18,.85)';
    ctx.fillRect(14, 14, 220, 44 + state.players.length * 18);
    ctx.fillStyle = '#ffd76a'; ctx.font = "700 12px 'Bebas Neue'"; ctx.textAlign = 'left';
    ctx.fillText('TOTAL STROKES', 24, 34);
    ctx.font = "600 13px 'Rajdhani'";
    for (let i = 0; i < state.players.length; i++) {
      ctx.fillStyle = state.players[i].color;
      ctx.beginPath(); ctx.arc(28, 50 + i*18 - 3, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(`${state.players[i].name}: ${g.totalStrokes[i]}${g.holed[i] ? ' ✓' : ''}`, 40, 53 + i*18);
    }
    // Instructions
    if (!g.aim) {
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      ctx.font = "600 12px 'Rajdhani'"; ctx.textAlign = 'center';
      ctx.fillText('Click and drag from the ball to aim · release to swing', W/2, H - 40);
    }
  }

  // ============== TOP-DOWN TOWER DEFENSE DRAW ==============
  function drawTowerDefenseTopDown(ctx, state) {
    const td = state.td;
    if (!td) return;
    // Grass background
    const tile = 36;
    for (let y = 0; y < H; y += tile) {
      for (let x = 0; x < W; x += tile) {
        ctx.fillStyle = ((x/tile + y/tile) & 1) ? '#2e7a36' : '#367a3e';
        ctx.fillRect(x, y, tile, tile);
      }
    }
    // Path
    ctx.strokeStyle = '#a87a3c'; ctx.lineWidth = 48; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(td.path[0].x, td.path[0].y);
    for (let i = 1; i < td.path.length; i++) ctx.lineTo(td.path[i].x, td.path[i].y);
    ctx.stroke();
    // Path inner
    ctx.strokeStyle = '#c89a5c'; ctx.lineWidth = 42;
    ctx.beginPath();
    ctx.moveTo(td.path[0].x, td.path[0].y);
    for (let i = 1; i < td.path.length; i++) ctx.lineTo(td.path[i].x, td.path[i].y);
    ctx.stroke();

    // Spawn marker
    ctx.fillStyle = '#5bff8a';
    ctx.beginPath(); ctx.arc(td.path[0].x + 30, td.path[0].y, 8, 0, Math.PI*2); ctx.fill();
    // Base marker (end)
    // ============ BASE — proper little castle ============
    // All path layouts end at the right edge (end.x = W). The castle is 80 px
    // wide, so we pull it back to fit entirely inside the canvas (right wall
    // sits just inside the edge). The "gate" reads as the enemies' destination.
    const end = td.path[td.path.length-1];
    const bx = Math.min(end.x - 44, W - 44), by = end.y;
    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(bx, by + 38, 38, 6, 0, 0, Math.PI*2); ctx.fill();
    // Bedrock plinth
    ctx.fillStyle = '#5a4632';
    ctx.fillRect(bx - 44, by + 28, 88, 10);
    ctx.fillStyle = '#3a2e22';
    ctx.fillRect(bx - 44, by + 36, 88, 4);
    // Castle wall (stone gradient)
    const wallG = ctx.createLinearGradient(0, by - 30, 0, by + 30);
    wallG.addColorStop(0, '#bfb39e');
    wallG.addColorStop(1, '#7a6f5a');
    ctx.fillStyle = wallG;
    ctx.fillRect(bx - 40, by - 12, 80, 42);
    // Stone block detailing — horizontal mortar lines
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1;
    for (let row = 0; row < 4; row++) {
      const yy = by - 12 + row * 11;
      ctx.beginPath(); ctx.moveTo(bx - 40, yy); ctx.lineTo(bx + 40, yy); ctx.stroke();
      // Stagger vertical seams
      for (let col = 0; col < 5; col++) {
        const xx = bx - 40 + col * 16 + ((row % 2) ? 8 : 0);
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 11); ctx.stroke();
      }
    }
    // Crenellations along the top
    ctx.fillStyle = '#9a8e76';
    for (let i = 0; i < 7; i++) {
      const cxx = bx - 38 + i * 12;
      ctx.fillRect(cxx, by - 22, 8, 10);
    }
    // Inner shadow under crenellations
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(bx - 40, by - 12, 80, 3);
    // Wooden gate
    const gateG = ctx.createLinearGradient(0, by, 0, by + 28);
    gateG.addColorStop(0, '#7a4a1f');
    gateG.addColorStop(1, '#3a2410');
    ctx.fillStyle = gateG;
    ctx.beginPath();
    ctx.moveTo(bx - 14, by + 30);
    ctx.lineTo(bx - 14, by + 8);
    ctx.quadraticCurveTo(bx, by - 6, bx + 14, by + 8);
    ctx.lineTo(bx + 14, by + 30);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 1.4; ctx.stroke();
    // Gate planks
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const px = bx - 9 + i * 9;
      ctx.beginPath(); ctx.moveTo(px, by + 4); ctx.lineTo(px, by + 30); ctx.stroke();
    }
    // Gate iron studs
    ctx.fillStyle = '#cfd6e8';
    ctx.beginPath(); ctx.arc(bx - 10, by + 12, 1.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + 10, by + 12, 1.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx - 10, by + 22, 1.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + 10, by + 22, 1.3, 0, Math.PI*2); ctx.fill();
    // Flag pole + flag
    ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(bx, by - 22); ctx.lineTo(bx, by - 40); ctx.stroke();
    ctx.fillStyle = '#ff4d2e';
    ctx.beginPath();
    ctx.moveTo(bx, by - 40);
    ctx.lineTo(bx + 14, by - 36);
    ctx.lineTo(bx, by - 30);
    ctx.closePath(); ctx.fill();

    // Base HP bar (above castle)
    const hpRatio = Math.max(0, td.baseHp / 30);
    const bw = 80, bh = 7;
    const bX = bx - bw/2, bY = by - 56;
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(bX - 1, bY - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(bX, bY, bw, bh);
    ctx.fillStyle = hpRatio > 0.5 ? '#5bff8a' : (hpRatio > 0.25 ? '#ffd76a' : '#ff5b5b');
    ctx.fillRect(bX, bY, bw * hpRatio, bh);
    ctx.fillStyle = '#fff';
    ctx.font = "700 10px 'Bebas Neue'"; ctx.textAlign = 'center';
    ctx.fillText(`HP ${Math.max(0, td.baseHp)} / 30`, bx, bY - 3);

    // Towers (per-kind visuals) with shadow and depth
    for (const t of td.towers) {
      drawTowerStickman(ctx, t, state);
    }

    // (level pips are drawn inside drawTowerStickman above)

    // Selected tower: range circle + selection ring on the tower, plus a
    // fixed-position upgrade/sell panel pinned to the top-right of the canvas.
    if (td.selectedTower) {
      const t = td.selectedTower;
      // Range circle on the map
      ctx.fillStyle = 'rgba(91,255,138,.05)';
      ctx.beginPath(); ctx.arc(t.x, t.y, t.range, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#5bff8a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.range, 0, Math.PI*2); ctx.stroke();
      // Pulsing selection ring around the tower itself
      const pulse = (Math.sin(state.frame * 0.18) + 1) * 0.5;
      ctx.strokeStyle = `rgba(91,255,138,${0.6 + pulse * 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(t.x, t.y, 24 + pulse * 2, 0, Math.PI*2); ctx.stroke();

      // ============ FIXED PANEL (top-right of canvas) ============
      const { px, py, PW, PH, upX, upY, upW, upH, slX, slY, slW, slH, cxX, cxY, cxW, cxH } = tdUpgradePanelBtns();
      const upgCost = tdUpgradeCost(t);
      const canUpg = t.level < 3 && td.gold >= upgCost;
      const isMaxed = t.level >= 3;
      const kind = td.towerKinds.find(k => k.id === t.kindId) || {};

      // Drop shadow + background
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(px + 4, py + 6, PW, PH);
      ctx.fillStyle = 'rgba(12,6,28,.97)';
      ctx.fillRect(px, py, PW, PH);
      ctx.strokeStyle = '#ff9a3c'; ctx.lineWidth = 3;
      ctx.strokeRect(px, py, PW, PH);

      // Header bar
      ctx.fillStyle = 'rgba(255,154,60,.18)';
      ctx.fillRect(px, py, PW, 46);
      // Header text — tower name + level
      ctx.fillStyle = '#fff';
      ctx.font = "700 22px 'Bebas Neue'"; ctx.textAlign = 'left';
      ctx.fillText(`${(kind.name||'TOWER').toUpperCase()}`, px + 14, py + 24);
      ctx.fillStyle = '#ffd76a';
      ctx.font = "700 14px 'Rajdhani'";
      ctx.fillText(`LEVEL ${t.level || 1} / 3`, px + 14, py + 41);

      // Close (X) button
      ctx.fillStyle = 'rgba(255,91,91,.85)';
      ctx.fillRect(cxX, cxY, cxW, cxH);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.strokeRect(cxX, cxY, cxW, cxH);
      ctx.fillStyle = '#fff';
      ctx.font = "700 16px 'Rajdhani'"; ctx.textAlign = 'center';
      ctx.fillText('×', cxX + cxW/2, cxY + cxH - 7);

      // ====== Tower description block ======
      ctx.textAlign = 'left';
      ctx.fillStyle = 'var(--ink-3)';
      ctx.fillStyle = '#c9b4dc';
      ctx.font = "600 11px 'Rajdhani'";
      ctx.fillText('DESCRIPTION', px + 14, py + 60);
      ctx.fillStyle = '#fbeacc';
      ctx.font = "500 12.5px 'Rajdhani'";
      wrapText(ctx, kind.desc || '', px + 14, py + 76, PW - 28, 15);

      // ====== Next-upgrade preview ======
      const upgIdx = (t.level || 1) - 1; // upgrades[0] = L1→L2, upgrades[1] = L2→L3
      const nextDesc = (kind.upgrades && kind.upgrades[upgIdx]) || null;
      ctx.fillStyle = isMaxed ? '#5bff8a' : '#ffd76a';
      ctx.font = "600 11px 'Rajdhani'";
      ctx.fillText(isMaxed ? 'MAXED OUT' : `NEXT UPGRADE (LV ${t.level + 1})`, px + 14, py + 122);
      ctx.fillStyle = isMaxed ? '#aaffc4' : '#fff';
      ctx.font = "500 12.5px 'Rajdhani'";
      wrapText(ctx, isMaxed ? 'Already at the highest level.' : (nextDesc || 'Improved stats'),
        px + 14, py + 138, PW - 28, 15);

      // UPGRADE button (big)
      ctx.fillStyle = canUpg ? '#ff9a3c' : (isMaxed ? 'rgba(91,255,138,.18)' : 'rgba(120,120,140,.25)');
      ctx.fillRect(upX, upY, upW, upH);
      ctx.strokeStyle = canUpg ? '#ffd76a' : (isMaxed ? '#5bff8a' : 'rgba(255,255,255,.22)');
      ctx.lineWidth = 2;
      ctx.strokeRect(upX, upY, upW, upH);
      ctx.fillStyle = canUpg ? '#1a1a22' : (isMaxed ? '#5bff8a' : 'rgba(255,255,255,.55)');
      ctx.font = "700 24px 'Bebas Neue'"; ctx.textAlign = 'center';
      ctx.fillText(isMaxed ? 'MAX LEVEL' : 'UPGRADE', upX + upW/2, upY + 26);
      if (!isMaxed) {
        ctx.font = "700 14px 'Rajdhani'";
        ctx.fillStyle = canUpg ? '#1a1a22' : 'rgba(255,255,255,.55)';
        ctx.fillText(`${upgCost} GOLD`, upX + upW/2, upY + 44);
      }

      // SELL button (big)
      ctx.fillStyle = 'rgba(255,91,91,.35)';
      ctx.fillRect(slX, slY, slW, slH);
      ctx.strokeStyle = '#ff5b5b'; ctx.lineWidth = 2;
      ctx.strokeRect(slX, slY, slW, slH);
      const totalSpent = (t.baseCost || 60)
        + (t.level >= 2 ? tdUpgradeCost({ ...t, level:1 }) : 0)
        + (t.level >= 3 ? tdUpgradeCost({ ...t, level:2 }) : 0);
      const refund = Math.round(totalSpent * 0.6);
      ctx.fillStyle = '#fff';
      ctx.font = "700 20px 'Bebas Neue'"; ctx.textAlign = 'center';
      ctx.fillText('SELL', slX + slW/2, slY + 22);
      ctx.font = "700 13px 'Rajdhani'";
      ctx.fillStyle = '#ffd76a';
      ctx.fillText(`REFUND ${refund} GOLD`, slX + slW/2, slY + 39);
    }

    // Placement preview at cursor / hover-range on existing tower.
    const selKind = td.towerKinds.find(k => k.id === td.selectedKind) || td.towerKinds[0];
    if (state.mousePos && state.mousePos.y < H - 100) {
      const m = state.mousePos;
      // Check if hovering an existing tower — if so, show ITS range (planning
      // before clicking). Skip if the tower is already selected (its panel
      // already paints the range).
      let hoverT = null;
      for (const t of td.towers) {
        if (t === td.selectedTower) continue;
        if (Math.hypot(t.x - m.x, t.y - m.y) < 22) { hoverT = t; break; }
      }
      if (hoverT) {
        ctx.fillStyle = 'rgba(255,215,106,.06)';
        ctx.beginPath(); ctx.arc(hoverT.x, hoverT.y, hoverT.range, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,106,.8)'; ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.arc(hoverT.x, hoverT.y, hoverT.range, 0, Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const ok = td.gold >= selKind.cost &&
          !pointNearPath(td.path, m.x, m.y, 36) &&
          td.towers.every(t => Math.hypot(t.x - m.x, t.y - m.y) >= 44);
        ctx.fillStyle = ok ? 'rgba(91,255,138,.12)' : 'rgba(255,91,91,.12)';
        ctx.beginPath(); ctx.arc(m.x, m.y, selKind.range, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = ok ? '#5bff8a' : '#ff5b5b'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(m.x, m.y, 18, 0, Math.PI*2); ctx.stroke();
      }
    }

    // Enemies drawn as side-profile stickmen that face their direction of
    // travel and stride properly along the path.
    for (const e of td.enemies) {
      const tinted = e.slowFor > 0 ? '#a5f3ff' : (e.poisonFor > 0 ? '#7bff5a' : e.color);
      const dark = '#0a0a14';
      const s = e.type === 'fast' ? 0.9 : e.type === 'armor' ? 1.15 : e.type === 'boss' ? 1.6 : 1.0;
      // Facing direction from movement vector. Default to +x if not moving.
      const face = (e.vx !== undefined && Math.abs(e.vx) > 0.01) ? (e.vx >= 0 ? 1 : -1) : 1;
      // Walk cycle phase. Scales with both type-speed and slow status.
      const speedFactor = Math.min(1.7, Math.max(0.5, (e.speed || 1) * 0.9));
      const phase = state.frame * 0.32 * speedFactor + (e.wig || 0);
      const stride = Math.sin(phase) * 6 * s;        // forward/back along facing
      const liftFront = Math.max(0, stride) * 0.5;   // front foot lifts when swinging forward
      const liftBack  = Math.max(0, -stride) * 0.5;
      const bob = Math.abs(Math.sin(phase * 2)) * 1.4 * s;
      const headY  = e.y - 24 * s - bob;
      const torsoY = e.y - 4  * s - bob;
      const hipY   = torsoY + 14 * s;
      const feetY  = e.y + 16 * s;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(e.x, feetY + 4, 10 * s, 3, 0, 0, Math.PI * 2); ctx.fill();

      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = tinted; ctx.lineWidth = 3.4 * s;
      // Torso
      ctx.beginPath();
      ctx.moveTo(e.x, headY + 8 * s);
      ctx.lineTo(e.x, hipY);
      ctx.stroke();
      // Arms — counter-swing the legs along the facing axis. In side view
      // arms swing forward (+face) when their opposite leg swings forward.
      const armSwing = Math.sin(phase) * 5 * s;
      const shoulderY = headY + 10 * s;
      ctx.beginPath();
      // Back arm forward when front leg goes back (i.e. -stride direction)
      ctx.moveTo(e.x, shoulderY);
      ctx.lineTo(e.x + face * armSwing, shoulderY + 11 * s);
      // Front arm opposite
      ctx.moveTo(e.x, shoulderY);
      ctx.lineTo(e.x - face * armSwing, shoulderY + 11 * s);
      ctx.stroke();
      // Legs — one strides forward (+face*stride) while the other plants back.
      ctx.beginPath();
      // Front leg
      ctx.moveTo(e.x, hipY);
      ctx.lineTo(e.x + face * stride, feetY - liftFront);
      // Back leg
      ctx.moveTo(e.x, hipY);
      ctx.lineTo(e.x - face * stride, feetY - liftBack);
      ctx.stroke();
      // Head
      ctx.fillStyle = tinted;
      ctx.beginPath(); ctx.arc(e.x, headY, 8 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(e.x, headY, 8 * s, 0, Math.PI * 2); ctx.stroke();
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(e.x - 2.4 * s, headY - 0.8, 1.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + 2.4 * s, headY - 0.8, 1.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(e.x - 2.4 * s, headY - 0.8, 0.7 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + 2.4 * s, headY - 0.8, 0.7 * s, 0, Math.PI * 2); ctx.fill();
      // Type-specific accessories
      if (e.type === 'fast') {
        // Motion streaks behind
        ctx.strokeStyle = `rgba(255,215,106,${0.55 + Math.sin(phase) * 0.2})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(e.x - 16 - i * 6, headY + 2 + i * 4);
          ctx.lineTo(e.x - 10 - i * 6, headY + 2 + i * 4);
          ctx.stroke();
        }
      } else if (e.type === 'armor') {
        // Helmet
        ctx.fillStyle = '#7a8090';
        ctx.beginPath();
        ctx.moveTo(e.x - 9 * s, headY - 1);
        ctx.arc(e.x, headY - 1, 9 * s, Math.PI, 0);
        ctx.lineTo(e.x + 9 * s, headY + 1);
        ctx.lineTo(e.x - 9 * s, headY + 1);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = dark; ctx.lineWidth = 1.4;
        ctx.stroke();
        // Visor slit
        ctx.fillStyle = dark;
        ctx.fillRect(e.x - 4 * s, headY - 1, 8 * s, 2);
        // Chest plate
        ctx.fillStyle = '#7a8090';
        ctx.fillRect(e.x - 6 * s, headY + 9 * s, 12 * s, 12 * s);
        ctx.strokeStyle = dark; ctx.strokeRect(e.x - 6 * s, headY + 9 * s, 12 * s, 12 * s);
      } else if (e.type === 'boss') {
        // Horns
        ctx.fillStyle = '#5a1a1a';
        ctx.beginPath();
        ctx.moveTo(e.x - 5 * s, headY - 7 * s);
        ctx.lineTo(e.x - 10 * s, headY - 14 * s);
        ctx.lineTo(e.x - 3 * s, headY - 5 * s);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(e.x + 5 * s, headY - 7 * s);
        ctx.lineTo(e.x + 10 * s, headY - 14 * s);
        ctx.lineTo(e.x + 3 * s, headY - 5 * s);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = dark; ctx.lineWidth = 1.4; ctx.stroke();
        // Glowing red eyes override
        ctx.fillStyle = '#ff4d2e';
        ctx.beginPath(); ctx.arc(e.x - 2.4 * s, headY - 0.8, 1.8 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.x + 2.4 * s, headY - 0.8, 1.8 * s, 0, Math.PI * 2); ctx.fill();
      }
      // HP pip above head
      const hpRatio = Math.max(0, e.hp / e.maxHp);
      const barW = 24 * s;
      ctx.fillStyle = dark;
      ctx.fillRect(e.x - barW/2, headY - 16, barW, 5);
      ctx.fillStyle = '#5bff8a';
      ctx.fillRect(e.x - barW/2 + 1, headY - 15, (barW - 2) * hpRatio, 3);
    }

    // Projectiles — distinctive visual per tower type
    for (const p of td.proj) {
      const ang = p.ang || 0;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      if (p.kindId === 'sniper') {
        // Long bright streak (high-velocity round)
        ctx.strokeStyle = '#ffd76a';
        ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.shadowColor = '#fff8b8'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(2, 0); ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (p.kindId === 'cannon') {
        // Heavy cannonball with shadow ring
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.beginPath(); ctx.arc(1, 1, 6.5, 0, Math.PI*2); ctx.fill();
        const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, 7);
        g.addColorStop(0, '#777'); g.addColorStop(1, '#222');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
      } else if (p.kindId === 'frost') {
        // 6-spoke snowflake
        ctx.strokeStyle = '#a5f3ff';
        ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.shadowColor = '#a5f3ff'; ctx.shadowBlur = 5;
        for (let a = 0; a < 6; a++) {
          ctx.rotate(Math.PI / 3);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(5, 0); ctx.stroke();
        }
        ctx.fillStyle = '#e6fbff';
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.kindId === 'poison') {
        // Sickly green bubble with a darker outline
        ctx.fillStyle = '#7bff5a';
        ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#2e7a1e'; ctx.lineWidth = 1.2; ctx.stroke();
        // Highlight bubble
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.arc(-1.5, -1.5, 1.4, 0, Math.PI*2); ctx.fill();
      } else if (p.kindId === 'tesla') {
        // Lightning zigzag from src to dst, drawn each of the 4 visual frames.
        // Reset rotation: lightning is a world-space line, not arrow-oriented.
        ctx.rotate(-ang);
        ctx.translate(-p.x, -p.y);
        const ax = p.srcX, ay = p.srcY, bx = p.dstX, by = p.dstY;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = p.color || '#7bbbff';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        const seg = 6;
        for (let s = 1; s <= seg; s++) {
          const k = s / seg;
          const mx = ax + (bx - ax) * k + (Math.random() - 0.5) * 14;
          const my = ay + (by - ay) * k + (Math.random() - 0.5) * 14;
          ctx.lineTo(mx, my);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Default Archer arrow — pointed forward
        ctx.fillStyle = p.color || '#ffd76a';
        ctx.beginPath();
        ctx.moveTo(6, 0); ctx.lineTo(-4, -2.6); ctx.lineTo(-2, 0); ctx.lineTo(-4, 2.6);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#5a3818'; ctx.lineWidth = 0.9; ctx.stroke();
      }
      ctx.restore();
    }

    // Floating damage numbers (above enemies)
    drawDamagePopups(ctx, state);
    // Toasts go on top of HUD
    drawToasts(ctx, state);

    // HUD top
    ctx.fillStyle = 'rgba(8,4,18,.85)';
    ctx.fillRect(14, 14, 360, 50);
    ctx.fillStyle = '#ffd76a';
    ctx.font = "700 18px 'Bebas Neue'"; ctx.textAlign = 'left';
    ctx.fillText(`GOLD ${td.gold}`, 24, 38);
    ctx.fillStyle = '#fff';
    ctx.font = "700 14px 'Bebas Neue'";
    ctx.fillText(`WAVE ${td.waveNum} / ${td.maxWaves}`, 24, 58);
    // Show the random map name in the HUD so each match feels distinct.
    if (td.pathId) {
      ctx.fillStyle = '#c9b4dc';
      ctx.font = "600 12px 'Rajdhani'";
      ctx.fillText(`MAP · ${td.pathId.toUpperCase()}`, 200, 38);
      ctx.fillStyle = '#7a6a92';
      ctx.fillText(td.endless ? 'ENDLESS' : 'CAMPAIGN', 200, 58);
    }

    // ============ START WAVE + SPEED CONTROLS (top-center) ============
    const { sx:swX, sy:swY, sw:swW, sh:swH, ssx:spX, ssy:spY, ssw:spW, ssh:spH } = tdControlsRect();
    // Start Wave button — only shown while waiting to start the next wave.
    if (td.waveReady) {
      const pulse = (Math.sin(state.frame * 0.18) + 1) * 0.5;
      ctx.fillStyle = `rgba(91,255,138,${0.85 + pulse * 0.15})`;
      ctx.fillRect(swX, swY, swW, swH);
      ctx.strokeStyle = '#5bff8a'; ctx.lineWidth = 2;
      ctx.strokeRect(swX, swY, swW, swH);
      ctx.fillStyle = '#0a2614';
      ctx.font = "700 18px 'Bebas Neue'"; ctx.textAlign = 'center';
      ctx.fillText(`▶ START WAVE ${td.waveNum}`, swX + swW/2, swY + 26);
    } else {
      // Subtle status panel — wave is running.
      ctx.fillStyle = 'rgba(8,4,18,.5)';
      ctx.fillRect(swX, swY, swW, swH);
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(swX, swY, swW, swH);
      ctx.fillStyle = '#c9b4dc';
      ctx.font = "700 14px 'Bebas Neue'"; ctx.textAlign = 'center';
      ctx.fillText(`WAVE IN PROGRESS · ${td.enemies.length + td.spawnLeft} LEFT`, swX + swW/2, swY + 24);
    }
    // Speed toggle (1x / 2x)
    const fast = (td.speed || 1) >= 2;
    ctx.fillStyle = fast ? '#ff9a3c' : 'rgba(8,4,18,.7)';
    ctx.fillRect(spX, spY, spW, spH);
    ctx.strokeStyle = fast ? '#ffd76a' : 'rgba(255,255,255,.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(spX, spY, spW, spH);
    ctx.fillStyle = fast ? '#1a1a22' : '#fff';
    ctx.font = "700 18px 'Bebas Neue'"; ctx.textAlign = 'center';
    ctx.fillText(fast ? '2×' : '1×', spX + spW/2, spY + 27);

    // Help banner — only shown when no tower is selected (otherwise the
    // upgrade/sell panel takes this top-right slot).
    if (!td.selectedTower) {
      ctx.fillStyle = 'rgba(8,4,18,.85)';
      ctx.fillRect(W - 280, 14, 264, 70);
      ctx.fillStyle = '#fff';
      ctx.font = "600 12px 'Rajdhani'"; ctx.textAlign = 'left';
      ctx.fillText(`1. Pick a tower below`, W - 268, 34);
      ctx.fillText(`2. Click an off-path tile to build`, W - 268, 52);
      ctx.fillStyle = '#ffd76a';
      ctx.fillText(`3. Click a placed tower to upgrade / sell`, W - 268, 70);
    }

    // Tower picker panel (bottom)
    const slotW = 95, slotH = 64, baseX = 14, baseY = H - 90;
    ctx.fillStyle = 'rgba(8,4,18,.92)';
    ctx.fillRect(0, baseY - 8, W, slotH + 30);
    for (let i = 0; i < td.towerKinds.length; i++) {
      const k = td.towerKinds[i];
      const sx = baseX + i * (slotW + 6);
      const selected = td.selectedKind === k.id;
      const afford = td.gold >= k.cost;
      ctx.fillStyle = selected ? 'rgba(255,154,60,.35)' : 'rgba(255,255,255,.06)';
      ctx.fillRect(sx, baseY, slotW, slotH);
      ctx.strokeStyle = selected ? '#ff9a3c' : (afford ? 'rgba(255,255,255,.18)' : 'rgba(255,91,91,.5)');
      ctx.lineWidth = selected ? 2.5 : 1.5;
      ctx.strokeRect(sx, baseY, slotW, slotH);
      // tower icon mini
      ctx.fillStyle = k.color;
      ctx.beginPath(); ctx.arc(sx + 20, baseY + 28, 12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = k.turret;
      ctx.beginPath(); ctx.arc(sx + 20, baseY + 28, 5, 0, Math.PI*2); ctx.fill();
      // name + cost
      ctx.fillStyle = afford ? '#fff' : '#ff8a9a';
      ctx.font = "700 13px 'Bebas Neue'"; ctx.textAlign = 'left';
      ctx.fillText(k.name.toUpperCase(), sx + 38, baseY + 22);
      ctx.fillStyle = afford ? '#ffd76a' : '#ff8a9a';
      ctx.font = "600 12px 'Rajdhani'";
      ctx.fillText(`${k.cost}g`, sx + 38, baseY + 38);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.font = "500 9px 'Rajdhani'";
      ctx.fillText(k.desc.slice(0, 18), sx + 6, baseY + 56);
    }
  }

  function drawHUD(ctx, gameState) {
    const n = gameState.players.length;
    const slotW = 230;
    const totalW = slotW * n + 14 * (n-1);
    let x = (W - totalW) / 2;
    const y = 18;
    for (const p of gameState.players) {
      // panel
      ctx.fillStyle = 'rgba(8,4,18,.85)';
      ctx.fillRect(x, y, slotW, 60);
      ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
      ctx.strokeRect(x+.5, y+.5, slotW-1, 59);
      // color bar
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, 6, 60);
      // name
      ctx.font = "700 16px 'Rajdhani', sans-serif";
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      const dispName = p.name + (p.isBot ? '  CPU' : '');
      ctx.fillText(dispName, x+14, y+22);

      // HP bar background
      const ratio = Math.max(0, p.hp / p.maxHp);
      ctx.fillStyle = '#1a0e22';
      ctx.fillRect(x+14, y+30, slotW-28, 12);
      // HP fill
      const hpG = ctx.createLinearGradient(0, y+30, 0, y+42);
      hpG.addColorStop(0, p.color);
      hpG.addColorStop(1, p.darkColor);
      ctx.fillStyle = hpG;
      ctx.fillRect(x+14, y+30, (slotW-28)*ratio, 12);
      // HP segments
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      const segs = Math.floor(p.maxHp / 25);
      for (let s = 1; s < segs; s++) ctx.fillRect(x+14 + (slotW-28)*s/segs, y+30, 1, 12);
      // score (big) — in KOTH show hill score; otherwise round wins
      const scoreNum = (gameState.mode === 'koth') ? (p.kothScore || 0) : p.score;
      ctx.font = "700 26px 'Bebas Neue', sans-serif";
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffd76a';
      ctx.fillText(`${scoreNum}`, x + slotW - 12, y + 26);
      // bot indicator dot
      if (p.isBot) {
        ctx.fillStyle = '#5bf0e8';
        ctx.beginPath(); ctx.arc(x+slotW-26, y+44, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(91,240,232,.7)';
        ctx.font = "600 10px 'Rajdhani'";
        ctx.fillText('CPU', x+slotW-12, y+47);
      }
      // buff indicators (count)
      const buffCt = (p.buffs ? Object.keys(p.buffs).filter(k => !['hp','maxHp','maxJumps'].includes(k)).length : 0);
      if (buffCt > 0) {
        ctx.fillStyle = '#ffd76a';
        ctx.font = "600 10px 'Rajdhani'";
        ctx.textAlign = 'left';
        ctx.fillText(`+${buffCt} buff${buffCt>1?'s':''}`, x+14, y+53);
      }

      x += slotW + 14;
    }
  }

  return { Component: StickFightCanvas, DEFAULT_PLATFORMS, W, H, controlsFor, SFX,
           TD_PATH_IDS };
})();
