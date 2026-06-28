/* global React, ReactDOM, window */
// Top-level UI. All emojis removed; uses window.SFIcons.Icon for every glyph.

(function () {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  const D = window.GameData;
  const G = window.StickFightGame;
  // Shade a #rrggbb toward black by `amt` (0–1). Used to derive a stroke from
  // a user-picked stickman colour so the player still has a contrasting edge.
  function mixToBlack(hex, amt = 0.5) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#1a0e22';
    const n = parseInt(m[1], 16);
    const k = 1 - amt;
    const r = Math.round(((n >> 16) & 0xff) * k);
    const g = Math.round(((n >> 8) & 0xff) * k);
    const b = Math.round((n & 0xff) * k);
    return `#${[r,g,b].map(v => v.toString(16).padStart(2,'0')).join('')}`;
  }
  const Q = window.SFQuestions;
  const { Icon } = window.SFIcons;

  // ============== shared atoms ==============
  function Row({ label, children }) {
    return (
      <div style={{ display:'flex', alignItems:'flex-start', gap:18, padding:'12px 0', borderBottom:'1px solid var(--line)' }}>
        <div style={{ width:152, color:'var(--ink-2)', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', fontSize:12.5, paddingTop:8 }}>
          {label}
        </div>
        <div style={{ flex:1 }}>{children}</div>
      </div>
    );
  }
  function Pill({ on, disabled, onClick, icon, children, title }) {
    return (
      <button onClick={onClick} disabled={disabled} title={title}
        className={`pill ${on ? 'on' : ''}`}
        style={{ border:'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .45 : 1, gap:8 }}>
        {icon && <Icon id={icon} size={16} />}
        {children}
      </button>
    );
  }

  // ============== animated launch background ==============
  function LaunchBackground() {
    const ref = useRef(null);
    useEffect(() => {
      const c = ref.current; if (!c) return;
      const ctx = c.getContext('2d');
      let raf, t = 0;
      const fight = [
        { x: 80,  vx:  0.6, color:'#4ecdff', dark:'#1e6c92' },
        { x: 320, vx: -0.5, color:'#ff5b5b', dark:'#8b2424' },
        { x: 1080, vx: 0.4, color:'#ffd84a', dark:'#8a6c12' },
        { x: 1180, vx:-0.7, color:'#7bff8a', dark:'#2e7a36' },
      ];
      function loop() {
        const W = c.width, H = c.height;
        ctx.clearRect(0,0,W,H);
        t++;
        // far floor line
        ctx.fillStyle = 'rgba(255,200,120,.04)';
        ctx.fillRect(0, H-120, W, 120);
        // little brawler silhouettes far back
        for (const f of fight) {
          f.x += f.vx;
          if (f.x < 40 || f.x > W-40) f.vx *= -1;
          const phase = t*0.1 + f.x*0.01;
          const sway = Math.sin(phase)*3;
          const yBase = H - 130;
          ctx.globalAlpha = 0.25;
          // body
          ctx.strokeStyle = f.color; ctx.lineWidth = 4; ctx.lineCap='round';
          ctx.beginPath();
          ctx.moveTo(f.x, yBase-20); ctx.lineTo(f.x, yBase);
          ctx.moveTo(f.x, yBase); ctx.lineTo(f.x-6+sway*0.4, yBase+18);
          ctx.moveTo(f.x, yBase); ctx.lineTo(f.x+6-sway*0.4, yBase+18);
          ctx.moveTo(f.x, yBase-14); ctx.lineTo(f.x-9-sway, yBase-6);
          ctx.moveTo(f.x, yBase-14); ctx.lineTo(f.x+9+sway, yBase-6);
          ctx.stroke();
          ctx.fillStyle = f.color;
          ctx.beginPath(); ctx.arc(f.x, yBase-28, 8, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        // embers floating up
        if (t % 4 === 0) {
          ctx.fillStyle = 'rgba(255,180,80,.5)';
          ctx.fillRect(Math.random()*W, H, 2, 2);
        }
        raf = requestAnimationFrame(loop);
      }
      function size() { c.width = window.innerWidth; c.height = window.innerHeight; }
      size(); window.addEventListener('resize', size);
      loop();
      return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
    }, []);
    return <canvas ref={ref} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', opacity:0.85 }} />;
  }

  // ============== drawn title ==============
  function TitleArt({ text, sub }) {
    return (
      <div style={{ textAlign:'center', zIndex:2 }}>
        <div style={{
          fontFamily:"'Bebas Neue', sans-serif",
          fontSize:'clamp(64px,12vw,180px)',
          lineHeight:.85, letterSpacing:'.02em',
          color:'var(--fire-1)',
          textShadow:`0 2px 0 #6c1a0e, 0 4px 0 #4a1208, 0 6px 0 #2e0a04,
                      0 10px 40px rgba(255,77,46,.6)`,
          transform:'rotate(-3deg)',
          WebkitTextStroke:'2px #2a0a06',
        }}>{text}</div>
        <div style={{
          fontFamily:"'Patrick Hand', cursive",
          fontSize:'clamp(20px,3vw,42px)', color:'#fff',
          marginTop:'-.2em', textShadow:'0 2px 8px rgba(0,0,0,.6)',
          transform:'rotate(-1deg)',
        }}>{sub}</div>
      </div>
    );
  }

  // ============== launch screen (revamped) ==============
  // GIMKIT-STYLE HOSTING WAITING ROOM — full-screen dark panel with a HUGE
  // game-code display, a join URL, a live "Players joined" grid (simulated
  // by progressively spawning fake players), and a big START GAME button
  // that pulses once at least 1 player has joined.
  function HostingScreen({ settings, onSettingsChange, onClose, onStart, onOpenProfile }) {
    // Mode + question-set pickers right inside the hosting screen so the host
    // doesn't need to bounce back to the hub to configure the game.
    const allModes = (D.MODES || []).filter(m => m.ready);
    const allSets = Q.allSets();
    const activeSet = allSets.find(s => s.id === settings.questionSetId) || allSets[0];
    function pickMode(id) { onSettingsChange && onSettingsChange({ ...settings, mode: id }); }
    function pickSet(id) { onSettingsChange && onSettingsChange({ ...settings, edu: true, questionSetId: id }); }
    function pickNone() { onSettingsChange && onSettingsChange({ ...settings, edu: false }); }
    const currentMode = allModes.find(m => m.id === settings.mode) || allModes[0];
    const POOL = ['xSt1ckLord','BowKing','FrostQueen','Vexo','PixelPunch','Razer',
      'Krang','MintCake','NeonRaven','BoomGuy','ChessMonk','Yeet','PingPong','Apex22','Lunar'];
    const PALETTE = ['#5cf6ff','#5bff8a','#ffd76a','#ff9a3c','#ff5b6e','#a07bff','#fff'];
    const [joined, setJoined] = useState([]);
    const [muted, setMuted] = useState(false);
    // Host role — 'player' = host plays in slot 0, 'spectator' = host watches
    // and lets the joined players + bots fight it out.
    const [hostRole, setHostRole] = useState('player');
    const hostCode = React.useMemo(() => {
      try {
        let c = localStorage.getItem('sf_host_code_v1');
        if (!c) {
          c = '';
          const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          const u = D.getUser();
          for (let i = 0; i < 6; i++) c += ch[Math.floor((u.charCodeAt(i % u.length) + i * 7) % ch.length)];
          localStorage.setItem('sf_host_code_v1', c);
        }
        return c;
      } catch(e) { return 'HOST01'; }
    }, []);
    // No auto-spawn — lobby starts empty. Host either invites friends or
    // adds bots manually. Match makes it clear who's joining and why.
    function addBot() {
      // No cap — host can fill the lobby with as many bots as they want.
      const taken = new Set(joined.map(p => p.name));
      const pool = POOL.filter(n => !taken.has(n));
      const name = pool.length ? pool[Math.floor(Math.random() * pool.length)] : `Bot${joined.length + 1}`;
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      setJoined(prev => prev.concat([{
        id: `bot-${prev.length}-${name}`, name, color, isBot: true,
      }]));
    }
    function copyCode() {
      try { navigator.clipboard && navigator.clipboard.writeText(hostCode); } catch(e){}
    }
    function kick(id) {
      setJoined(prev => prev.filter(p => p.id !== id));
    }
    // Solo-startable — host can launch alone or with anyone they've added.
    const canStart = true;
    return (
      <div style={{
        position:'fixed', inset:0, zIndex:130,
        background:'radial-gradient(ellipse at 50% 30%, rgba(124,92,255,.18), rgba(8,4,18,.96) 70%), #0a0e22',
        display:'flex', flexDirection:'column', overflowY:'auto', padding:'24px 18px',
      }}>
        {/* Top bar — close button */}
        <div className="row" style={{ justifyContent:'space-between', alignItems:'center', maxWidth:1100, width:'100%', margin:'0 auto 18px' }}>
          <button className="btn sm ghost" onClick={onClose}>
            <Icon id="back" size={14} style={{verticalAlign:'middle', marginRight:6}}/>
            Back to hub
          </button>
          <div className="row" style={{ gap:8 }}>
            <button className="btn sm ghost" onClick={() => setMuted(m => !m)}>
              <Icon id={muted ? 'x' : 'check'} size={12} style={{verticalAlign:'middle', marginRight:4}}/>
              {muted ? 'Lobby muted' : 'Sounds on'}
            </button>
          </div>
        </div>

        {/* HUGE CODE PANEL */}
        <div style={{ maxWidth:1100, width:'100%', margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:12, color:'#5cf6ff', letterSpacing:'.32em', fontWeight:800, marginBottom:8 }}>
            ▸ LIVE HOSTING SESSION
          </div>
          <div style={{ fontSize:11, letterSpacing:'.22em', color:'var(--ink-3)', marginBottom:4 }}>
            JOIN AT
          </div>
          <div style={{
            fontFamily:"'Bebas Neue'", fontSize:'clamp(20px, 3vw, 32px)',
            color:'#fff', letterSpacing:'.05em', marginBottom:16,
          }}>
            spring3792.github.io/StickBattle
          </div>
          <div style={{ fontSize:11, letterSpacing:'.22em', color:'var(--ink-3)', marginBottom:6 }}>
            WITH CODE
          </div>
          <div style={{
            display:'inline-flex', gap:8, padding:'12px 22px', alignItems:'center',
            background:'#fff',
            borderRadius:14,
            boxShadow:'0 12px 60px rgba(255,215,106,.45), inset 0 -6px 0 rgba(0,0,0,.18)',
          }}>
            {hostCode.split('').map((ch, i) => (
              <span key={i} style={{
                fontFamily:"'Bebas Neue'",
                fontSize:'clamp(56px, 11vw, 120px)',
                lineHeight:.9,
                color:'#1a0e22',
                letterSpacing:'.04em',
                fontWeight:900,
              }}>{ch}</span>
            ))}
          </div>
          <div className="row" style={{ justifyContent:'center', gap:10, marginTop:14 }}>
            <button className="btn" onClick={copyCode}
              style={{
                background:'linear-gradient(180deg, #5cf6ff, #2a7bff)', color:'#001428',
                fontFamily:"'Bebas Neue'", letterSpacing:'.1em', padding:'10px 22px', fontSize:16,
              }}>
              <Icon id="check" size={14} style={{verticalAlign:'middle', marginRight:6}}/>
              COPY CODE
            </button>
          </div>
        </div>

        {/* ===== HOST PICKS: GAME MODE + QUESTION SET ===== */}
        <div style={{
          maxWidth:1100, width:'100%', margin:'24px auto 0',
          display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:14,
        }}>
          {/* GAME MODE picker */}
          <div className="panel" style={{
            padding:'14px 16px',
            background:'linear-gradient(120deg, rgba(255,77,46,.10), rgba(8,4,18,.7))',
            border:'1.5px solid rgba(255,154,60,.4)',
          }}>
            <div className="row" style={{ alignItems:'center', marginBottom:8, gap:10 }}>
              <div style={{ fontSize:11, color:'var(--ink-3)', letterSpacing:'.2em' }}>GAME MODE</div>
              <div style={{
                fontFamily:"'Bebas Neue'", fontSize:18, letterSpacing:'.06em', color:'var(--fire-3)',
              }}>· {currentMode.name.toUpperCase()}</div>
            </div>
            <div className="row" style={{ gap:6, flexWrap:'wrap' }}>
              {allModes.map(m => {
                const on = settings.mode === m.id;
                return (
                  <button key={m.id} onClick={() => pickMode(m.id)}
                    className={`pill ${on ? 'on' : ''}`}
                    style={{ border:'none', cursor:'pointer', gap:6 }}>
                    <Icon id={m.iconId} size={12}/> {m.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* QUESTION SET picker (with None) */}
          <div className="panel" style={{
            padding:'14px 16px',
            background:'linear-gradient(120deg, rgba(124,92,255,.10), rgba(8,4,18,.7))',
            border:'1.5px solid rgba(124,92,255,.4)',
          }}>
            <div className="row" style={{ alignItems:'center', marginBottom:8, gap:10 }}>
              <div style={{ fontSize:11, color:'var(--ink-3)', letterSpacing:'.2em' }}>QUESTION SET</div>
              <div style={{
                fontFamily:"'Bebas Neue'", fontSize:18, letterSpacing:'.06em', color:'#a07bff',
              }}>· {settings.edu ? activeSet.name.toUpperCase() : 'NONE'}</div>
            </div>
            <div className="row" style={{ gap:6, flexWrap:'wrap' }}>
              <button onClick={pickNone}
                className={`pill ${!settings.edu ? 'on' : ''}`}
                style={{ border:'none', cursor:'pointer', gap:6, fontWeight:700 }}
                title="No questions between rounds">
                <Icon id="x" size={11}/> None
              </button>
              {allSets.map(s => {
                const isActive = settings.edu && activeSet.id === s.id;
                return (
                  <button key={s.id} onClick={() => pickSet(s.id)}
                    className={`pill ${isActive ? 'on' : ''}`}
                    style={{ border:'none', cursor:'pointer', fontSize:11, gap:4 }}>
                    <Icon id={s.source === 'custom' ? 'pencil' : 'book'} size={11}/>
                    {s.name} <span style={{ opacity:.55 }}>({s.questions.length}q)</span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:6 }}>
              {settings.edu ? 'Questions appear between rounds.' : 'No questions — pure action.'}
            </div>
          </div>
        </div>

        {/* PLAYER COUNT + START BUTTON */}
        <div className="row" style={{
          maxWidth:1100, width:'100%', margin:'30px auto 14px',
          alignItems:'center', gap:14, flexWrap:'wrap',
        }}>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontSize:11, letterSpacing:'.22em', color:'var(--ink-3)' }}>
              PLAYERS IN LOBBY
            </div>
            <div className="row" style={{ alignItems:'baseline', gap:8 }}>
              <div style={{
                fontFamily:"'Bebas Neue'", fontSize:64, lineHeight:1,
                color:'#5bff8a', textShadow:'0 0 16px rgba(91,255,138,.5)',
              }}>{joined.length + (hostRole === 'player' ? 1 : 0)}</div>
              <div style={{
                fontFamily:"'Bebas Neue'", fontSize:24, color:'var(--ink-3)', letterSpacing:'.1em',
              }}>
                {hostRole === 'spectator' ? 'NO LIMIT · YOU WATCH' : 'NO LIMIT · YOU PLAY'}
              </div>
            </div>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>
              Share the code, tap OPEN SLOT to add a bot, then START GAME. No player limit.
            </div>
          </div>
          {/* HOST ROLE TOGGLE — Player or Spectator */}
          <div style={{
            display:'flex', flexDirection:'column', gap:4, alignItems:'center',
            padding:'8px 10px', borderRadius:10,
            background:'rgba(0,0,0,.4)', border:'1.5px solid var(--line-2)',
          }}>
            <div style={{ fontSize:10, color:'var(--ink-3)', letterSpacing:'.18em' }}>I'M…</div>
            <div style={{ display:'flex', borderRadius:8, overflow:'hidden', border:'1.5px solid var(--line-2)' }}>
              <button onClick={() => setHostRole('player')}
                style={{
                  padding:'6px 12px', fontFamily:"'Bebas Neue'", letterSpacing:'.1em',
                  background: hostRole === 'player' ? 'linear-gradient(180deg, #5bff8a, #2a9a4a)' : 'transparent',
                  color: hostRole === 'player' ? '#001428' : 'var(--ink-2)',
                  border:'none', cursor:'pointer', fontSize:13,
                }}>PLAYING</button>
              <button onClick={() => setHostRole('spectator')}
                style={{
                  padding:'6px 12px', fontFamily:"'Bebas Neue'", letterSpacing:'.1em',
                  background: hostRole === 'spectator' ? 'linear-gradient(180deg, #5cf6ff, #2a7bff)' : 'transparent',
                  color: hostRole === 'spectator' ? '#001428' : 'var(--ink-2)',
                  border:'none', cursor:'pointer', fontSize:13,
                }}>SPECTATING</button>
            </div>
          </div>
          <div className="row" style={{ gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
            <button className="btn" onClick={addBot}
              style={{
                padding:'10px 16px', fontSize:14,
                background:'linear-gradient(180deg, #a07bff, #5b3ed8)', color:'#fff',
              }}>
              <Icon id="plus" size={13} style={{verticalAlign:'middle', marginRight:4}}/>
              Add Bot
            </button>
            <button className="btn big" onClick={() => onStart(joined, hostRole)}
              style={{
                padding:'18px 36px', fontSize:24, fontFamily:"'Bebas Neue'", letterSpacing:'.12em',
                background:'linear-gradient(180deg, #5bff8a, #2a9a4a)',
                color:'#001428',
                boxShadow:'0 8px 32px rgba(91,255,138,.5)',
                animation:'startPulse 1.2s ease-in-out infinite',
              }}>
              <Icon id="play" size={22} style={{verticalAlign:'middle', marginRight:8}}/>
              START GAME
            </button>
          </div>
          <style>{`@keyframes startPulse {
            0%,100% { transform: scale(1); }
            50% { transform: scale(1.04); }
          }`}</style>
        </div>

        {/* CHANGE YOUR LOOK — inline color/avatar swap, plus a button into the
            full Profile modal. Players can re-skin while waiting. */}
        {hostRole === 'player' && (
          <div style={{ maxWidth:1100, width:'100%', margin:'14px auto 0' }}>
            <LobbyLookPanel active={D.getUser()} onOpenProfile={onOpenProfile} />
          </div>
        )}
        {/* WARM-UP MINI-GAME — only for the host when they're going to PLAY.
            Spectators skip it (they're not playing the match anyway). */}
        {hostRole === 'player' && (
          <div style={{ maxWidth:1100, width:'100%', margin:'14px auto' }}>
            <LobbyMiniGame profiles={[]} />
          </div>
        )}
        {hostRole === 'spectator' && (
          <div style={{
            maxWidth:1100, width:'100%', margin:'14px auto', padding:'14px 18px',
            borderRadius:12, textAlign:'center',
            background:'linear-gradient(90deg, rgba(92,246,255,.08), transparent 70%)',
            border:'1.5px solid rgba(92,246,255,.3)',
            color:'#5cf6ff', fontSize:13, letterSpacing:'.06em',
          }}>
            ▸ SPECTATOR MODE — you'll watch the match without playing. The mini-game is hidden until you switch to PLAYING.
          </div>
        )}

        {/* JOINED-PLAYER GRID — Gimkit-style avatar tiles */}
        <div style={{
          maxWidth:1100, width:'100%', margin:'0 auto',
          display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))',
          gap:12,
        }}>
          {/* Host always shown first — label reflects PLAYING or SPECTATING role */}
          <div style={{
            padding:'14px 12px', borderRadius:14, textAlign:'center',
            background: hostRole === 'spectator'
              ? 'linear-gradient(180deg, rgba(92,246,255,.18), rgba(42,123,255,.06))'
              : 'linear-gradient(180deg, rgba(255,215,106,.18), rgba(255,154,60,.06))',
            border: hostRole === 'spectator' ? '2px solid #5cf6ff' : '2px solid #ffd76a',
            boxShadow: hostRole === 'spectator'
              ? '0 6px 24px rgba(92,246,255,.25)'
              : '0 6px 24px rgba(255,215,106,.25)',
          }}>
            <div style={{
              width:60, height:60, borderRadius:'50%', margin:'0 auto 8px',
              background:`linear-gradient(135deg, ${D.getPlayerColor(D.getUser()) || '#ffd76a'}, ${mixToBlack(D.getPlayerColor(D.getUser()) || '#ffd76a', .4)})`,
              display:'grid', placeItems:'center', color:'#fff', fontFamily:"'Bebas Neue'", fontSize:32,
              border:'3px solid rgba(255,255,255,.4)',
              boxShadow:'0 4px 14px rgba(0,0,0,.5)',
            }}>{(D.getDisplayName(D.getUser()) || 'H').slice(0,1).toUpperCase()}</div>
            <div style={{ fontWeight:800, fontSize:14, color:'#fff' }}>{D.getDisplayName(D.getUser())}</div>
            <div style={{
              fontSize:10, letterSpacing:'.16em', marginTop:2,
              color: hostRole === 'spectator' ? '#5cf6ff' : '#ffd76a',
            }}>
              {hostRole === 'spectator' ? 'HOST · SPECTATING' : 'HOST · PLAYING'}
            </div>
          </div>
          {joined.map(p => (
            <div key={p.id} style={{
              padding:'14px 12px', borderRadius:14, textAlign:'center',
              background:'linear-gradient(180deg, rgba(91,255,138,.14), rgba(91,255,138,.03))',
              border:'2px solid #5bff8a',
              animation:'joinPop .4s ease-out',
              position:'relative',
            }}>
              <div style={{
                width:60, height:60, borderRadius:'50%', margin:'0 auto 8px',
                background:`linear-gradient(135deg, ${p.color}, ${mixToBlack(p.color, .4)})`,
                display:'grid', placeItems:'center', color:'#fff', fontFamily:"'Bebas Neue'", fontSize:32,
                border:'3px solid rgba(255,255,255,.4)',
                boxShadow:'0 4px 14px rgba(0,0,0,.5)',
              }}>{p.name.slice(0,1).toUpperCase()}</div>
              <div style={{ fontWeight:800, fontSize:14, color:'#fff',
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize:10, letterSpacing:'.16em', color:'#5bff8a', marginTop:2 }}>JOINED</div>
              <button onClick={() => kick(p.id)}
                title="Kick player"
                style={{
                  position:'absolute', top:6, right:6,
                  width:22, height:22, borderRadius:'50%',
                  background:'rgba(255,91,110,.7)', color:'#fff',
                  border:'none', cursor:'pointer', fontSize:12, fontWeight:900,
                  display:'grid', placeItems:'center',
                }}>×</button>
            </div>
          ))}
          {/* One always-on OPEN SLOT — no cap. Click to add bot, lobby keeps growing. */}
          <button onClick={addBot}
            title="Add a bot — lobby has no player limit"
            style={{
              padding:'14px 12px', borderRadius:14, textAlign:'center',
              background:'rgba(255,255,255,.02)',
              border:'2px dashed rgba(255,255,255,.15)',
              color:'var(--ink-3)', cursor:'pointer',
              display:'grid', alignContent:'center', minHeight:130,
              fontFamily:'inherit',
            }}>
            <div style={{
              width:60, height:60, borderRadius:'50%', margin:'0 auto 8px',
              background:'rgba(255,255,255,.04)', display:'grid', placeItems:'center',
              fontSize:30, color:'var(--ink-3)',
            }}>+</div>
            <div style={{ fontSize:11, letterSpacing:'.16em' }}>OPEN SLOT</div>
            <div style={{ fontSize:10, color:'var(--ink-3)', opacity:.7, marginTop:2 }}>tap to add bot</div>
          </button>
          <style>{`
            @keyframes joinPop { from { transform: scale(.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes dotsPulse { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
          `}</style>
        </div>
      </div>
    );
  }

  // Simple Host + Join row. Local mode: shows tiny inline "Lobby code" so
  // friends can still pop in. Online mode: prominent gold-bordered card.
  function HostJoinCard({ playMode, party, onOpenHostingScreen }) {
    const [joinCode, setJoinCode] = useState('');
    const [showJoined, setShowJoined] = useState(null);
    // Hosting toggle — persists across reloads so the host stays "live" until
    // they explicitly stop. When false, the code is hidden and only Join shows.
    const [hosting, setHosting] = useState(() => {
      // Default to TRUE — you "start with a lobby" so the code is immediately
      // shareable without needing to press HOST GAME first. Persists the
      // user's last explicit choice.
      try {
        const v = localStorage.getItem('sf_hosting_v1');
        return v === null ? true : v === '1';
      } catch(e) { return true; }
    });
    function toggleHost() {
      const next = !hosting;
      setHosting(next);
      try { localStorage.setItem('sf_hosting_v1', next ? '1' : '0'); } catch(e){}
      if (next && onOpenHostingScreen) onOpenHostingScreen();
      setShowJoined(next ? 'Hosting started! Share your code.' : 'Stopped hosting');
      setTimeout(() => setShowJoined(null), 1600);
    }
    function openHostingScreen() {
      if (onOpenHostingScreen) onOpenHostingScreen();
    }
    const hostCode = React.useMemo(() => {
      try {
        let c = localStorage.getItem('sf_host_code_v1');
        if (!c) {
          c = '';
          const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          const u = D.getUser();
          for (let i = 0; i < 6; i++) c += ch[Math.floor((u.charCodeAt(i % u.length) + i * 7) % ch.length)];
          localStorage.setItem('sf_host_code_v1', c);
        }
        return c;
      } catch(e) { return 'HOST01'; }
    }, []);
    function copyCode() {
      try { navigator.clipboard && navigator.clipboard.writeText(hostCode); } catch(e){}
      setShowJoined('Code copied');
      setTimeout(() => setShowJoined(null), 1400);
    }
    function tryJoin() {
      const code = joinCode.trim().toUpperCase();
      if (!code) return;
      // Local-only sim: treat any 6-char code as success, blank → fail.
      if (code.length < 4) { setShowJoined('Code too short'); setTimeout(()=>setShowJoined(null), 1400); return; }
      setShowJoined(`Joining ${code}…`);
      setTimeout(() => setShowJoined('Joined lobby!'), 700);
      setTimeout(() => setShowJoined(null), 2200);
      setJoinCode('');
    }
    const isOnline = playMode === 'online';
    return (
      <div className="panel" style={{
        padding:'12px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
        background: isOnline
          ? 'linear-gradient(90deg, rgba(255,215,106,.14), rgba(92,246,255,.10) 70%)'
          : 'linear-gradient(90deg, rgba(255,154,60,.08), transparent 70%)',
        border: isOnline ? '2px solid rgba(255,215,106,.45)' : '1.5px solid var(--line-2)',
      }}>
        {/* LEFT: HOST button OR hosting code */}
        <div className="row" style={{ gap:10, alignItems:'center', flex:'1 1 240px', minWidth:200 }}>
          {hosting ? (
            <>
              <div style={{
                width:36, height:36, borderRadius:8,
                background: 'linear-gradient(140deg, #5bff8a, #2a9a4a)',
                color:'#001428', display:'grid', placeItems:'center', fontFamily:"'Bebas Neue'", fontSize:20,
                boxShadow:'0 4px 12px rgba(91,255,138,.4)',
              }}>
                <span style={{ width:9, height:9, borderRadius:'50%', background:'#001428' }}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:10, color:'#5bff8a', letterSpacing:'.2em' }}>HOSTING · LOBBY CODE</div>
                <div style={{ fontFamily:"'Bebas Neue'", fontSize:22, letterSpacing:'.18em', color:'#ffd76a', lineHeight:1 }}>
                  {hostCode}
                </div>
              </div>
              <button className="btn sm" onClick={openHostingScreen}
                style={{ background:'linear-gradient(180deg, #5bff8a, #2a9a4a)', color:'#001428' }}>
                <Icon id="play" size={12} style={{verticalAlign:'middle', marginRight:4}}/>
                View Lobby
              </button>
              <button className="btn sm" onClick={copyCode}>
                <Icon id="check" size={12} style={{verticalAlign:'middle', marginRight:4}}/>
                Copy
              </button>
              <button className="btn sm ghost" onClick={toggleHost}
                style={{ borderColor:'rgba(255,91,110,.5)', color:'#ff8a9a' }}>
                <Icon id="x" size={11}/> Stop
              </button>
            </>
          ) : (
            <>
              <div style={{
                width:36, height:36, borderRadius:8,
                background: 'rgba(255,255,255,.04)',
                color:'var(--ink-3)', display:'grid', placeItems:'center', fontFamily:"'Bebas Neue'", fontSize:20,
                border:'1.5px dashed var(--line-2)',
              }}>H</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:10, color:'var(--ink-3)', letterSpacing:'.2em' }}>NOT HOSTING</div>
                <div style={{ fontSize:12, color:'var(--ink-3)' }}>Start a lobby so friends can join</div>
              </div>
              <button className="btn" onClick={toggleHost}
                style={{
                  background:'linear-gradient(180deg, #5bff8a, #2a9a4a)',
                  color:'#001428', fontFamily:"'Bebas Neue'", letterSpacing:'.1em',
                  padding:'8px 16px', fontSize:15,
                }}>
                <Icon id="play" size={13} style={{verticalAlign:'middle', marginRight:6}}/>
                HOST GAME
              </button>
            </>
          )}
        </div>
        {/* RIGHT: join input */}
        <div className="row" style={{ gap:6, alignItems:'center', flex:'1 1 240px', minWidth:200 }}>
          <input type="text" maxLength={8}
            placeholder="JOIN BY CODE"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && tryJoin()}
            style={{
              flex:1, padding:'8px 12px', textAlign:'center',
              fontFamily:"'Bebas Neue'", fontSize:18, letterSpacing:'.18em',
              background:'rgba(0,0,0,.45)', color:'#5cf6ff',
              border:'1.5px solid var(--line-2)', borderRadius:6,
            }}/>
          <button className="btn sm" onClick={tryJoin}
            style={{ background:'linear-gradient(180deg, #5cf6ff, #2a7bff)', color:'#001428' }}>
            <Icon id="play" size={12} style={{verticalAlign:'middle', marginRight:4}}/>
            Join
          </button>
        </div>
        {showJoined && (
          <div style={{
            flex:'1 0 100%', textAlign:'center',
            color: /fail|short/i.test(showJoined) ? '#ff8a9a' : '#5bff8a',
            fontSize:13, fontWeight:700,
          }}>{showJoined}</div>
        )}
      </div>
    );
  }

  // ONLINE-mode hero replacement — big social lobby with party slots + FIND
  // MATCH button. The vibe shifts from "configure a match" to "play with
  // friends right now".
  function OnlineLobbyCard({ selectedMode, party, onPlay, onQuickMatch, onOpenFriends }) {
    const slots = 4;
    const partyList = party || [];
    return (
      <div className="panel" style={{
        padding:0, overflow:'hidden',
        background:'linear-gradient(135deg, rgba(92,246,255,.18) 0%, rgba(42,123,255,.10) 50%, rgba(8,4,18,.95) 100%)',
        border:'2.5px solid rgba(92,246,255,.55)',
        boxShadow:'0 8px 32px rgba(92,246,255,.25)',
      }}>
        {/* Header strip */}
        <div className="row" style={{
          padding:'10px 16px', alignItems:'center',
          background:'rgba(0,0,0,.35)', borderBottom:'1px solid rgba(92,246,255,.3)',
        }}>
          <span style={{
            width:9, height:9, borderRadius:'50%', background:'#5bff8a',
            boxShadow:'0 0 8px #5bff8a', marginRight:8,
          }}/>
          <span style={{ fontSize:11, color:'#5cf6ff', letterSpacing:'.22em', fontWeight:800 }}>
            ONLINE LOBBY · PING 42ms · NA-EAST
          </span>
        </div>
        <div style={{ padding:'18px 20px' }}>
          {/* Party slots — Fortnite-style row */}
          <div style={{ fontSize:10, color:'var(--ink-3)', letterSpacing:'.22em', marginBottom:8 }}>
            YOUR SQUAD ({partyList.length + 1}/{slots})
          </div>
          <div className="row" style={{ gap:8, marginBottom:16, flexWrap:'wrap' }}>
            {/* You */}
            <div style={{
              width:80, padding:'10px 8px', borderRadius:10, textAlign:'center',
              background:'linear-gradient(180deg, rgba(92,246,255,.18), rgba(92,246,255,.04))',
              border:'2px solid #5cf6ff',
            }}>
              <div style={{
                width:42, height:42, borderRadius:'50%', margin:'0 auto 6px',
                background:`linear-gradient(135deg, ${D.getPlayerColor(D.getUser()) || '#5cf6ff'}, ${mixToBlack(D.getPlayerColor(D.getUser()) || '#5cf6ff', .4)})`,
                display:'grid', placeItems:'center', color:'#fff', fontFamily:"'Bebas Neue'", fontSize:20,
                border:'2px solid rgba(255,255,255,.4)',
              }}>{(D.getDisplayName(D.getUser()) || '?').slice(0,1).toUpperCase()}</div>
              <div style={{ fontSize:11, fontWeight:700, color:'#fff' }}>YOU</div>
            </div>
            {partyList.map(p => (
              <div key={p.id} style={{
                width:80, padding:'10px 8px', borderRadius:10, textAlign:'center',
                background:'linear-gradient(180deg, rgba(123,255,138,.18), rgba(123,255,138,.04))',
                border:'2px solid #7bff8a',
              }}>
                <div style={{
                  width:42, height:42, borderRadius:'50%', margin:'0 auto 6px',
                  background:`linear-gradient(135deg, ${p.color || '#7bff8a'}, ${mixToBlack(p.color || '#7bff8a', .4)})`,
                  display:'grid', placeItems:'center', color:'#fff', fontFamily:"'Bebas Neue'", fontSize:20,
                  border:'2px solid rgba(255,255,255,.4)',
                }}>{(p.name || '?').slice(0,1).toUpperCase()}</div>
                <div style={{ fontSize:11, fontWeight:700, color:'#aaffc4', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
              </div>
            ))}
            {Array.from({ length: Math.max(0, slots - 1 - partyList.length) }).map((_, i) => (
              <button key={i} onClick={onOpenFriends} style={{
                width:80, padding:'10px 8px', borderRadius:10, textAlign:'center',
                background:'rgba(255,255,255,.02)',
                border:'2px dashed rgba(255,255,255,.18)',
                cursor:'pointer', color:'var(--ink-3)',
              }}>
                <div style={{
                  width:42, height:42, borderRadius:'50%', margin:'0 auto 6px',
                  background:'rgba(255,255,255,.05)', display:'grid', placeItems:'center',
                  fontSize:22, color:'var(--ink-3)',
                }}>+</div>
                <div style={{ fontSize:10, fontWeight:700 }}>INVITE</div>
              </button>
            ))}
          </div>
          {/* Selected mode summary + big actions */}
          <div className="row" style={{ gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ flex:'1 1 220px', minWidth:160 }}>
              <div style={{ fontSize:10, color:'var(--ink-3)', letterSpacing:'.22em' }}>SELECTED MODE</div>
              <div style={{
                fontFamily:"'Bebas Neue'", fontSize:32, lineHeight:1, color:'#5cf6ff',
                textShadow:'0 0 16px rgba(92,246,255,.5)',
              }}>{selectedMode.name.toUpperCase()}</div>
            </div>
            <button className="btn big" onClick={onPlay}
              style={{
                flex:'1 1 200px', minWidth:160, padding:'14px 22px', fontSize:20,
                background:'linear-gradient(180deg, #5cf6ff, #2a7bff)', color:'#001428',
                fontFamily:"'Bebas Neue'", letterSpacing:'.1em',
                boxShadow:'0 6px 24px rgba(92,246,255,.5)',
              }}>
              <Icon id="play" size={22} style={{verticalAlign:'middle', marginRight:8}}/>
              FIND MATCH
            </button>
            <button className="btn" onClick={onQuickMatch}
              style={{ padding:'12px 18px', fontSize:14 }}>
              <Icon id="sparkle" size={14} style={{verticalAlign:'middle', marginRight:6}}/>
              RANDOM
            </button>
          </div>
        </div>
      </div>
    );
  }

  function LaunchScreen({ settings, onChange, onPlay, onCreateSet, onDeleteSet, onOpenSettings, onOpenCrates, onOpenCodes, onOpenFriends, onOpenTrade, onOpenProfile, onOpenQueue, queueCount, onPreviewSet, coins,
    playMode, onChangePlayMode, onQuickMatch, party, onClearParty, challengeFriend, onClearChallenge, onOpenHostingScreen }) {
    const title = D.eduTitle(settings.edu);
    const sub = D.eduSub(settings.edu);
    const allSets = Q.allSets();
    const activeSet = allSets.find(s => s.id === settings.questionSetId) || allSets[0];

    const readyModes = D.MODES.filter(m => m.ready);
    const soonModes  = D.MODES.filter(m => !m.ready);
    const selectedMode = D.MODES.find(m => m.id === settings.mode) || readyModes[0];
    return (
      <div style={{ position:'absolute', inset:0, overflowY:'auto', overflowX:'hidden', zIndex:2, padding:'16px 16px 80px', WebkitOverflowScrolling:'touch' }}>
        <NewLaunchUI
          settings={settings} onChange={onChange}
          coins={coins}
          title={title} sub={sub}
          selectedMode={selectedMode}
          readyModes={readyModes} soonModes={soonModes}
          allSets={allSets} activeSet={activeSet}
          onPlay={onPlay} onCreateSet={onCreateSet} onDeleteSet={onDeleteSet}
          onOpenSettings={onOpenSettings} onOpenCrates={onOpenCrates}
          onOpenCodes={onOpenCodes} onOpenFriends={onOpenFriends}
          onOpenProfile={onOpenProfile}
          onOpenQueue={onOpenQueue} queueCount={queueCount}
          playMode={playMode} onChangePlayMode={onChangePlayMode}
          onQuickMatch={onQuickMatch}
          party={party} onClearParty={onClearParty}
          challengeFriend={challengeFriend} onClearChallenge={onClearChallenge}
          onOpenHostingScreen={onOpenHostingScreen}
          onOpenTrade={onOpenTrade} onPreviewSet={onPreviewSet} />
      </div>
    );
  }

  // ============== NEW launch UI (refresh) ==============
  function NewLaunchUI({ settings, onChange, coins, title, sub, selectedMode,
    readyModes, soonModes, allSets, activeSet,
    onPlay, onCreateSet, onDeleteSet, onOpenSettings, onOpenCrates, onOpenCodes,
    onOpenFriends, onOpenTrade, onOpenProfile, onOpenQueue, queueCount, onPreviewSet,
    playMode, onChangePlayMode, onQuickMatch, party, onClearParty, challengeFriend, onClearChallenge, onOpenHostingScreen }) {
    // Chip helper — icon only on narrow, icon+label otherwise
    const Chip = ({ icon, emoji, label, onClick, color, glow }) => (
      <button onClick={onClick} className="btn sm ghost"
        title={label}
        style={{
          padding:'9px 14px', borderRadius:10,
          background:'rgba(0,0,0,.55)',
          border:`1px solid ${color || 'var(--line-2)'}`,
          color:'var(--ink)', letterSpacing:'.06em', textTransform:'uppercase',
          display:'inline-flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700,
          boxShadow: glow ? `0 0 18px ${color}44` : 'none',
          cursor:'pointer',
        }}>
        {emoji ? <span style={{ fontSize:16, lineHeight:1 }}>{emoji}</span>
               : <Icon id={icon} size={14} color={color || 'var(--ink)'}/>}
        <span>{label}</span>
      </button>
    );
    return (
      <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', flexDirection:'column', gap:14 }}>
        {/* HEADER ROW: title left, chips right */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ transform:'scale(.55)', transformOrigin:'left center', margin:'-22px 0' }}>
              <TitleArt text={title} sub={sub}/>
            </div>
          </div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'9px 14px', borderRadius:10,
              background:'rgba(0,0,0,.55)', border:'1px solid rgba(255,181,71,.55)',
              color:'#ffd76a', fontWeight:800, fontSize:15,
              boxShadow:'0 0 14px rgba(255,181,71,.25)',
            }}>
              <Icon id="coin" size={14} color="#ffd76a"/> {coins.toLocaleString()}
            </span>
            <Chip icon={D.getAvatar(D.getUser()) ? null : 'friend'} emoji={D.getAvatar(D.getUser())}
              label={D.getDisplayName(D.getUser())} onClick={onOpenProfile} color="#a07bff"/>
            <Chip icon="gift"     label="Crates"   onClick={onOpenCrates}    color="#ff9a3c" glow/>
            <Chip icon="users"    label="Friends"  onClick={onOpenFriends}   color="#7bff8a"/>
            <Chip icon="trade"    label="Trade"    onClick={onOpenTrade}     color="#ffd84a"/>
            <Chip icon="play"     label={`Queue${queueCount ? ` (${queueCount})` : ''}`}
                  onClick={onOpenQueue} color={queueCount ? '#5cf6ff' : '#7bff8a'}/>
            <Chip icon="sparkle"  label="Codes"    onClick={onOpenCodes}     color="#5bf0e8"/>
            <Chip icon="settings" label="Settings" onClick={onOpenSettings}/>
          </div>
        </div>

        {/* PLAY MODE + QUICK MATCH bar — pick local/online and one-tap Quick Match */}
        <div className="panel" style={{
          padding:'10px 14px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
          background:'linear-gradient(90deg, rgba(92,246,255,.08), transparent 70%)',
          border:'1.5px solid rgba(92,246,255,.35)',
        }}>
          <div style={{ fontSize:11, color:'var(--ink-3)', letterSpacing:'.18em' }}>PLAY MODE</div>
          <div style={{ display:'flex', gap:0, background:'rgba(0,0,0,.45)',
            borderRadius:8, border:'1.5px solid var(--line-2)', overflow:'hidden' }}>
            <button onClick={() => onChangePlayMode && onChangePlayMode('local')}
              style={{
                padding:'6px 14px', fontFamily:"'Bebas Neue'", letterSpacing:'.1em',
                background: playMode === 'local' ? 'linear-gradient(180deg, var(--fire-2), var(--fire-1))' : 'transparent',
                color: playMode === 'local' ? '#fff' : 'var(--ink-2)',
                border:'none', cursor:'pointer', fontSize:14,
              }}>LOCAL</button>
            <button onClick={() => onChangePlayMode && onChangePlayMode('online')}
              style={{
                padding:'6px 14px', fontFamily:"'Bebas Neue'", letterSpacing:'.1em',
                background: playMode === 'online' ? 'linear-gradient(180deg, #5cf6ff, #2a7bff)' : 'transparent',
                color: playMode === 'online' ? '#001428' : 'var(--ink-2)',
                border:'none', cursor:'pointer', fontSize:14,
              }}>ONLINE</button>
          </div>
          <div style={{ flex:1 }}/>
          <button onClick={onQuickMatch} className="btn"
            style={{
              background:'linear-gradient(180deg, #5cf6ff, #2a7bff)',
              color:'#001428', fontFamily:"'Bebas Neue'", letterSpacing:'.1em',
              padding:'8px 18px', fontSize:16,
            }}>
            <Icon id="sparkle" size={14} style={{verticalAlign:'middle', marginRight:6}}/>
            QUICK MATCH
          </button>
        </div>

        {/* Active PARTY / CHALLENGE banner — only when one or both are set */}
        {((party && party.length > 0) || challengeFriend) && (
          <div className="panel" style={{
            padding:'10px 14px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
            background:'linear-gradient(90deg, rgba(123,255,138,.10), transparent 70%)',
            border:'1.5px solid rgba(123,255,138,.35)',
          }}>
            {party && party.length > 0 && (
              <>
                <div style={{ fontSize:11, color:'var(--ink-3)', letterSpacing:'.18em' }}>PARTY</div>
                <div className="row" style={{ gap:6, flexWrap:'wrap' }}>
                  {party.map(p => (
                    <span key={p.id} className="pill" style={{
                      background:'rgba(123,255,138,.15)', border:'1px solid #7bff8a',
                      color:'#aaffc4', fontWeight:700,
                    }}>
                      <span style={{
                        width:8, height:8, borderRadius:'50%', background:p.color || '#7bff8a',
                        display:'inline-block', marginRight:6,
                      }}/>
                      {p.name}
                    </span>
                  ))}
                </div>
                <button className="btn sm ghost" onClick={onClearParty}
                  style={{ borderColor:'rgba(255,91,110,.5)', color:'#ff8a9a' }}>
                  <Icon id="x" size={11}/> Leave party
                </button>
              </>
            )}
            {challengeFriend && (
              <>
                <div style={{ fontSize:11, color:'#ff8a9a', letterSpacing:'.18em', marginLeft:party && party.length ? 14 : 0 }}>CHALLENGE</div>
                <span className="pill" style={{
                  background:'rgba(255,91,110,.15)', border:'1px solid #ff5b6e',
                  color:'#ff8a9a', fontWeight:700,
                }}>
                  vs <strong>{challengeFriend.name}</strong>
                </span>
                <button className="btn sm ghost" onClick={onClearChallenge}>
                  <Icon id="x" size={11}/> Cancel
                </button>
              </>
            )}
          </div>
        )}

        {/* SIMPLE HOST/JOIN CARD — always visible, more prominent in online mode */}
        <HostJoinCard playMode={playMode} party={party} onOpenHostingScreen={onOpenHostingScreen} />

        {/* ONLINE-MODE BIG LOBBY CARD — replaces the hero strip when in online */}
        {playMode === 'online' ? (
          <OnlineLobbyCard
            selectedMode={selectedMode}
            party={party}
            onPlay={onPlay}
            onQuickMatch={onQuickMatch}
            onOpenFriends={onOpenFriends}
          />
        ) : (
        <div className="panel" style={{
          padding:'18px 22px',
          background:`linear-gradient(135deg, rgba(255,77,46,.15), transparent 60%), var(--card-bg)`,
          border:'2px solid rgba(255,154,60,.45)',
          display:'flex', alignItems:'center', gap:18, position:'relative', overflow:'hidden',
        }}>
          {/* decorative stickman silhouette */}
          <svg viewBox="0 0 80 100" width="60" height="80" style={{ opacity:.85, flexShrink:0 }}>
            <circle cx="40" cy="22" r="11" fill="none" stroke="var(--fire-3)" strokeWidth="3.5"/>
            <line x1="40" y1="33" x2="40" y2="62" stroke="var(--fire-3)" strokeWidth="3.5" strokeLinecap="round"/>
            <line x1="40" y1="42" x2="22" y2="55" stroke="var(--fire-3)" strokeWidth="3.5" strokeLinecap="round"/>
            <line x1="40" y1="42" x2="58" y2="48" stroke="var(--fire-3)" strokeWidth="3.5" strokeLinecap="round"/>
            <line x1="40" y1="62" x2="26" y2="86" stroke="var(--fire-3)" strokeWidth="3.5" strokeLinecap="round"/>
            <line x1="40" y1="62" x2="54" y2="86" stroke="var(--fire-3)" strokeWidth="3.5" strokeLinecap="round"/>
          </svg>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mono" style={{ fontSize:10, letterSpacing:'.22em', color:'var(--ink-3)', textTransform:'uppercase' }}>
              Selected Mode
            </div>
            <div style={{
              fontFamily:"'Bebas Neue', sans-serif",
              fontSize:'clamp(28px,4vw,44px)', lineHeight:1, letterSpacing:'.04em',
              margin:'4px 0 8px',
              color:'var(--fire-3)',
              textShadow:'0 2px 0 #6c1a0e',
            }}>{selectedMode.name.toUpperCase()}</div>
            <div style={{ fontSize:14, color:'var(--ink-2)', lineHeight:1.4 }}>{selectedMode.desc}</div>
          </div>
          <button className="btn big glow" onClick={onPlay} style={{ flexShrink:0 }}>
            <Icon id="play" size={22} style={{verticalAlign:'middle', marginRight:10}}/>
            PLAY
          </button>
        </div>
        )}

        {/* TWO-COLUMN: modes (left) + setup (right) */}
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1.4fr) minmax(0, 1fr)', gap:14 }}>
          {/* LEFT: modes */}
          <div className="section-card" style={{ margin:0 }}>
            <div className="sc-h">Game Mode</div>
            <div className="mode-grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))' }}>
              {readyModes.map(m => (
                <button key={m.id}
                  className={`mode-card ${settings.mode === m.id ? 'on' : ''}`}
                  style={{ minHeight:88 }}
                  onClick={() => onChange({ ...settings, mode: m.id })}>
                  <div className="mc-icon">
                    <Icon id={m.iconId} size={22}
                      color={settings.mode === m.id ? 'var(--fire-2)' : 'var(--ink-2)'} />
                  </div>
                  <div className="mc-name" style={{ fontSize:18 }}>{m.name}</div>
                </button>
              ))}
            </div>
            {soonModes.length > 0 && (
              <div style={{ marginTop:10, display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:11, letterSpacing:'.16em', color:'var(--ink-3)', textTransform:'uppercase' }}>Coming soon:</span>
                {soonModes.map(m => (
                  <span key={m.id} className="pill" style={{ opacity:.55, fontSize:10 }}>
                    <Icon id={m.iconId} size={11} /> {m.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: match setup */}
          <div className="col" style={{ gap:10 }}>
            <div className="section-card" style={{ margin:0 }}>
              <div className="sc-h">Players</div>
              <div className="seg" style={{ flexWrap:'wrap' }}>
                {[
                  { v:'1v1bot', t:'1v CPU' },
                  { v:'2',      t:'2P' },
                  { v:'3',      t:'3P' },
                  { v:'4',      t:'4P' },
                ].map(o => (
                  <button key={o.v}
                    className={settings.players === o.v ? 'on' : ''}
                    onClick={() => onChange({ ...settings, players: o.v })}>{o.t}</button>
                ))}
              </div>
            </div>
            <div className="section-card" style={{ margin:0 }}>
              <div className="sc-h">First To</div>
              <div className="seg">
                {[3,5,7,10].map(n => (
                  <button key={n} className={settings.target === n ? 'on' : ''}
                    onClick={() => onChange({ ...settings, target: n })}>{n}</button>
                ))}
              </div>
            </div>
            {/* Regular stage map picker — hidden in TD mode (TD has its own
                themed map picker below). Avoids two map cards on screen. */}
            {settings.mode !== 'td' && (
              <div className="section-card" style={{ margin:0 }}>
                <div className="sc-h">Map</div>
                <div className="row" style={{ gap:6, flexWrap:'wrap' }}>
                  <button onClick={() => onChange({ ...settings, stageId: 'random' })}
                    className={`pill ${(settings.stageId || 'random') === 'random' ? 'on' : ''}`}
                    style={{ border:'none', cursor:'pointer', gap:6 }}>
                    <Icon id="sparkle" size={12}/> Random
                  </button>
                  {D.STAGES.map(s => (
                    <button key={s.id}
                      onClick={() => onChange({ ...settings, stageId: s.id })}
                      className={`pill ${settings.stageId === s.id ? 'on' : ''}`}
                      style={{ border:'none', cursor:'pointer', gap:6 }}
                      title={s.name}>
                      <span style={{ width:10, height:10, borderRadius:2,
                        background: s.accent || '#fff', display:'inline-block' }}/>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {settings.mode === 'td' && (
              <React.Fragment>
                <div className="section-card" style={{ margin:0 }}>
                  <div className="sc-h">TD Map</div>
                  <div className="row" style={{ gap:6, flexWrap:'wrap' }}>
                    <button onClick={() => onChange({ ...settings, tdMapId: 'random' })}
                      className={`pill ${(settings.tdMapId || 'random') === 'random' ? 'on' : ''}`}
                      style={{ border:'none', cursor:'pointer', gap:6 }}>
                      <Icon id="sparkle" size={12}/> Random
                    </button>
                    {(G.TD_PATH_IDS || []).map(id => {
                      const theme = (G.TD_MAP_THEMES || {})[id] || {};
                      const label = theme.name || id;
                      const selected = settings.tdMapId === id;
                      return (
                        <button key={id}
                          onClick={() => onChange({ ...settings, tdMapId: id })}
                          className={`pill ${selected ? 'on' : ''}`}
                          title={theme.tag || ''}
                          style={{ border:'none', cursor:'pointer', gap:6 }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {/* Theme tag — shows the perk for the currently selected map */}
                  {settings.tdMapId && settings.tdMapId !== 'random'
                    && (G.TD_MAP_THEMES || {})[settings.tdMapId] && (
                    <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:6, lineHeight:1.4 }}>
                      {G.TD_MAP_THEMES[settings.tdMapId].tag}
                    </div>
                  )}
                </div>
                <div className="section-card" style={{ margin:0 }}>
                  <div className="sc-h">Endless TD</div>
                  <button onClick={() => onChange({ ...settings, tdEndless: !settings.tdEndless })}
                    className={`pill ${settings.tdEndless ? 'on' : ''}`}
                    style={{ border:'none', cursor:'pointer', gap:6 }}>
                    <Icon id={settings.tdEndless ? 'check' : 'x'} size={14}/>
                    {settings.tdEndless ? 'ON · Waves never end' : 'OFF · 7-wave campaign'}
                  </button>
                </div>
              </React.Fragment>
            )}
            {settings.players === '1v1bot' && (
              <div className="section-card" style={{ margin:0 }}>
                <div className="sc-h">Bot Difficulty</div>
                <div className="seg">
                  {[
                    { v:'easy',   t:'Easy'   },
                    { v:'normal', t:'Normal' },
                    { v:'hard',   t:'Hard'   },
                  ].map(o => (
                    <button key={o.v} className={settings.botDifficulty === o.v ? 'on' : ''}
                      onClick={() => onChange({ ...settings, botDifficulty: o.v })}>{o.t}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="section-card" style={{ margin:0 }}>
              <div className="sc-h">Question Set</div>
              <div className="row" style={{ gap:6, flexWrap:'wrap' }}>
                {/* "None" pill at the front turns off Education Mode entirely. */}
                <button onClick={() => onChange({ ...settings, edu: false })}
                  className={`pill ${!settings.edu ? 'on' : ''}`}
                  style={{ border:'none', cursor:'pointer', gap:6, fontWeight:700 }}
                  title="No questions between rounds">
                  <Icon id="x" size={12}/> None
                </button>
                {allSets.map(s => {
                  const isActive = settings.edu && activeSet.id === s.id;
                  return (
                    <span key={s.id} style={{ display:'inline-flex', alignItems:'stretch', borderRadius:999, overflow:'hidden' }}>
                      <button onClick={() => onChange({ ...settings, edu: true, questionSetId: s.id })}
                        className={`pill ${isActive ? 'on' : ''}`}
                        style={{ border:'none', cursor:'pointer', fontSize:11, gap:4 }}
                        title={s.description || s.name}>
                        <Icon id={s.source === 'custom' ? 'pencil' : s.source === 'local' ? 'sparkle' : 'book'} size={11}/>
                        {s.name} <span style={{ opacity:.55 }}>({s.questions.length}q)</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onPreviewSet && onPreviewSet(s); }}
                        title={`Preview "${s.name}"`}
                        className="pill" style={{ border:'none', padding:'4px 8px', marginLeft:-2,
                          background:'rgba(255,255,255,.05)', color:'var(--ink-2)' }}>
                        <Icon id="book" size={11}/>
                      </button>
                    </span>
                  );
                })}
              </div>
              <div className="row" style={{ gap:6, marginTop:8 }}>
                <button className="btn sm ghost" onClick={onCreateSet}>
                  <Icon id="plus" size={12} style={{verticalAlign:'middle', marginRight:4}}/>
                  New set
                </button>
                {settings.edu && activeSet && (activeSet.source === 'custom' || activeSet.source === 'ai') && (
                  <button className="btn sm ghost" onClick={() => onDeleteSet && onDeleteSet(activeSet)}
                    style={{ borderColor:'rgba(255,91,110,.5)', color:'#ff8a9a' }}>
                    <Icon id="x" size={12} style={{verticalAlign:'middle', marginRight:4}}/>
                    Delete
                  </button>
                )}
              </div>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:6 }}>
                {settings.edu ? 'Questions appear between rounds.' : 'No questions — pure action.'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ opacity:.45, fontSize:11, letterSpacing:'.18em', textTransform:'uppercase', textAlign:'center', marginTop:6 }}>
          No weapons  ·  Cosmetics only  ·  First to {settings.target}  ·  {D.STAGES.length} stages
        </div>
      </div>
    );
  }

  // ============== custom set creator modal ==============
  // Small numeric input with label — used in slider question editor
  function NumField({ label, value, onChange }) {
    return (
      <div className="col" style={{ gap:2 }}>
        <span style={{ color:'var(--ink-3)', fontSize:10, letterSpacing:'.12em', textTransform:'uppercase' }}>{label}</span>
        <input type="number" value={value == null ? '' : value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          style={{ width:'100%' }} />
      </div>
    );
  }

  function CreatorModal({ onClose, onSave, initial }) {
    const [name, setName] = useState(initial?.name || 'My Set');
    const [description, setDescription] = useState(initial?.description || '');
    const [questions, setQuestions] = useState(initial?.questions || [
      { type:'mc', q:'', choices:['','','',''], answer:0 },
    ]);
    const setQ = (i, patch) => setQuestions(qs => qs.map((q, ix) => ix === i ? { ...q, ...patch } : q));
    const setC = (i, ci, v) => setQ(i, { choices: (questions[i].choices || ['','','','']).map((c, x) => x === ci ? v : c) });

    function save() {
      // Validate per-type
      const cleaned = questions.filter(q => {
        if (!q.q || !q.q.trim()) return false;
        const t = q.type || 'mc';
        if (t === 'mc' || t === 'tf') return q.choices && q.choices.some(c => c.trim());
        if (t === 'text') return q.textAnswer && q.textAnswer.trim();
        if (t === 'slider') return Number.isFinite(Number(q.sliderTarget));
        return false;
      });
      if (!name.trim() || cleaned.length === 0) return;
      const set = {
        id: initial?.id || ('custom_' + Date.now()),
        name: name.trim().slice(0, 40),
        description: (description||'').trim().slice(0, 140) || 'Custom set.',
        category: 'Custom',
        source: 'custom',
        questions: cleaned.map(q => {
          const t = q.type || 'mc';
          const base = {
            type: t,
            q: q.q.trim().slice(0, 200),
            points: Math.max(1, Math.min(10, Number(q.points || 1))),
            ...(q.explanation ? { explanation: q.explanation.trim().slice(0, 240) } : {}),
            ...(q.imageUrl ? { imageUrl: q.imageUrl.trim().slice(0, 500) } : {}),
          };
          if (t === 'mc' || t === 'tf') {
            return {
              ...base,
              choices: q.choices.map(c => (c||'').trim().slice(0, 60)),
              answer: Math.max(0, Math.min(q.choices.length - 1, q.answer | 0)),
            };
          }
          if (t === 'text') {
            return { ...base, textAnswer: (q.textAnswer || '').trim().slice(0, 120) };
          }
          if (t === 'slider') {
            return {
              ...base,
              sliderMin: Number(q.sliderMin || 0),
              sliderMax: Number(q.sliderMax || 100),
              sliderTarget: Number(q.sliderTarget || 0),
              sliderTolerance: Math.max(0, Number(q.sliderTolerance || 5)),
            };
          }
          return base;
        }),
      };
      Q.saveCustomSet(set);
      onSave(set);
    }

    return (
      <ModalShell title="Create question set" onClose={onClose}
        actions={
          <>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn" onClick={save}>
              <Icon id="check" size={14} style={{verticalAlign:'middle', marginRight:6}}/>Save Set
            </button>
          </>
        }>
        <div className="col" style={{ gap:14 }}>
          <div className="row" style={{ gap:10 }}>
            <label style={{ color:'var(--ink-2)', fontSize:12, letterSpacing:'.1em', textTransform:'uppercase', width:90 }}>Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ flex:1 }} />
          </div>
          <div className="row" style={{ gap:10 }}>
            <label style={{ color:'var(--ink-2)', fontSize:12, letterSpacing:'.1em', textTransform:'uppercase', width:90 }}>Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="One short sentence about this set" style={{ flex:1 }} />
          </div>
          {questions.map((q, i) => (
            <div key={i} className="panel" style={{ padding:14 }}>
              <div className="row" style={{ justifyContent:'space-between', gap:6 }}>
                <strong style={{ color:'var(--ink-2)', fontSize:13 }}>Question {i+1}</strong>
                <div className="row" style={{ gap:4 }}>
                  <button className="btn sm ghost" disabled={i === 0}
                    title="Move up"
                    onClick={() => setQuestions(qs => {
                      const n = qs.slice(); [n[i-1], n[i]] = [n[i], n[i-1]]; return n;
                    })}><Icon id="chevron-up" size={12}/></button>
                  <button className="btn sm ghost" disabled={i === questions.length - 1}
                    title="Move down"
                    onClick={() => setQuestions(qs => {
                      const n = qs.slice(); [n[i+1], n[i]] = [n[i], n[i+1]]; return n;
                    })}><Icon id="chevron-down" size={12}/></button>
                  <button className="btn sm ghost" title="Delete question"
                    onClick={() => setQuestions(qs => qs.filter((_,x) => x!==i))}>
                    <Icon id="x" size={12}/>
                  </button>
                </div>
              </div>
              {/* Type picker */}
              <div className="row" style={{ gap:8, marginTop:8, alignItems:'center' }}>
                <span style={{ color:'var(--ink-3)', fontSize:11, letterSpacing:'.12em', textTransform:'uppercase' }}>Type</span>
                <div className="seg">
                  {[
                    { v:'mc',     t:'Multi' },
                    { v:'tf',     t:'T/F'   },
                    { v:'text',   t:'Text'  },
                    { v:'slider', t:'Slider'},
                  ].map(o => {
                    const cur = q.type || 'mc';
                    return (
                      <button key={o.v} className={cur === o.v ? 'on' : ''}
                        onClick={() => {
                          const patch = { type: o.v };
                          // Initialise defaults for the new type
                          if (o.v === 'mc' && (!q.choices || q.choices.length < 4)) {
                            patch.choices = ['','','',''];
                            patch.answer = 0;
                          }
                          if (o.v === 'tf') {
                            patch.choices = ['True', 'False'];
                            patch.answer = q.answer || 0;
                          }
                          if (o.v === 'text' && q.textAnswer === undefined) {
                            patch.textAnswer = '';
                          }
                          if (o.v === 'slider') {
                            if (q.sliderMin === undefined) patch.sliderMin = 0;
                            if (q.sliderMax === undefined) patch.sliderMax = 100;
                            if (q.sliderTarget === undefined) patch.sliderTarget = 50;
                            if (q.sliderTolerance === undefined) patch.sliderTolerance = 5;
                          }
                          setQ(i, patch);
                        }}>{o.t}</button>
                    );
                  })}
                </div>
              </div>

              <input type="text" value={q.q} placeholder="Question text"
                onChange={e => setQ(i, { q: e.target.value })}
                style={{ width:'100%', marginTop:8 }} />

              {/* Optional image URL */}
              <input type="text" value={q.imageUrl || ''}
                placeholder="Optional: image URL (https://…)"
                onChange={e => setQ(i, { imageUrl: e.target.value })}
                style={{ width:'100%', marginTop:6, fontSize:12 }} />
              {q.imageUrl && (
                <img src={q.imageUrl} alt="" style={{ maxHeight:120, marginTop:6, borderRadius:6, border:'1px solid var(--line)' }}
                  onError={(e) => { e.target.style.display = 'none'; }}/>
              )}

              {/* TYPE-SPECIFIC inputs */}
              {(!q.type || q.type === 'mc') && (
                <>
                  <div className="row" style={{ gap:8, marginTop:10, alignItems:'center' }}>
                    <span style={{ color:'var(--ink-3)', fontSize:11, letterSpacing:'.12em', textTransform:'uppercase' }}>Choices</span>
                    <div className="seg">
                      {[2,3,4,5,6].map(n => (
                        <button key={n} className={(q.choices||[]).length === n ? 'on' : ''}
                          onClick={() => {
                            const next = (q.choices || []).slice(0, n);
                            while (next.length < n) next.push('');
                            setQ(i, { choices: next, answer: Math.min(q.answer || 0, n-1) });
                          }}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
                    {(q.choices || ['','','','']).map((c, ci) => (
                      <div key={ci} className="row" style={{ gap:6 }}>
                        <button onClick={() => setQ(i, { answer: ci })}
                          className={`pill ${q.answer === ci ? 'on' : ''}`}
                          style={{ border:'none', padding:'4px 8px', cursor:'pointer', minWidth:30 }}
                          title="Mark correct">
                          <Icon id={q.answer === ci ? 'check' : 'plus'} size={12} />
                        </button>
                        <input type="text" value={c} placeholder={`Choice ${ci+1}`}
                          onChange={e => setC(i, ci, e.target.value)} style={{ flex:1 }} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {q.type === 'tf' && (
                <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
                  {['True','False'].map((label, ci) => (
                    <button key={ci} onClick={() => setQ(i, { answer: ci, choices:['True','False'] })}
                      className={`pill ${q.answer === ci ? 'on' : ''}`}
                      style={{ border:'none', padding:'12px 16px', cursor:'pointer', fontSize:18, fontWeight:700 }}>
                      <Icon id={q.answer === ci ? 'check' : 'plus'} size={14} style={{verticalAlign:'middle', marginRight:6}}/>
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'text' && (
                <div className="row" style={{ gap:8, marginTop:10 }}>
                  <label style={{ color:'var(--ink-3)', fontSize:11, letterSpacing:'.12em', textTransform:'uppercase', width:90 }}>Answer</label>
                  <input type="text" value={q.textAnswer || ''}
                    placeholder="Expected answer (case-insensitive)"
                    onChange={e => setQ(i, { textAnswer: e.target.value })}
                    style={{ flex:1 }} />
                </div>
              )}

              {q.type === 'slider' && (
                <div className="grid" style={{ gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6, marginTop:10 }}>
                  <NumField label="Min"    value={q.sliderMin}    onChange={v => setQ(i, { sliderMin: v })}/>
                  <NumField label="Max"    value={q.sliderMax}    onChange={v => setQ(i, { sliderMax: v })}/>
                  <NumField label="Answer" value={q.sliderTarget} onChange={v => setQ(i, { sliderTarget: v })}/>
                  <NumField label="±Tol"   value={q.sliderTolerance} onChange={v => setQ(i, { sliderTolerance: v })}/>
                </div>
              )}

              {/* Points + explanation */}
              <div className="row" style={{ gap:8, marginTop:8, alignItems:'center' }}>
                <span style={{ color:'var(--ink-3)', fontSize:11, letterSpacing:'.12em', textTransform:'uppercase' }}>Points</span>
                <div className="seg">
                  {[1,2,3,5,10].map(n => (
                    <button key={n}
                      className={(q.points || 1) === n ? 'on' : ''}
                      onClick={() => setQ(i, { points: n })}>{n}</button>
                  ))}
                </div>
                <span style={{ color:'var(--ink-3)', fontSize:11 }}>
                  Worth {q.points || 1}× the normal +10 coin reward
                </span>
              </div>
              <input type="text" value={q.explanation || ''}
                placeholder="Optional: explanation shown after answering"
                onChange={e => setQ(i, { explanation: e.target.value })}
                style={{ width:'100%', marginTop:8, fontSize:13, fontStyle:'italic' }} />
            </div>
          ))}
          <div className="row" style={{ gap:8, justifyContent:'space-between' }}>
            <button className="btn sm ghost"
              onClick={() => setQuestions(qs => [...qs, { type:'mc', q:'', choices:['','','',''], answer:0, explanation:'' }])}>
              <Icon id="plus" size={14} style={{verticalAlign:'middle', marginRight:6}}/>
              Add question
            </button>
            <span style={{ fontSize:12, color:'var(--ink-3)' }}>
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </ModalShell>
    );
  }

  function ModalShell({ title, children, actions, onClose }) {
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', backdropFilter:'blur(6px)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div className="panel" style={{ width:'min(680px, 96vw)', maxHeight:'90vh', overflow:'auto', padding:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid var(--line)' }}>
            <div style={{ fontWeight:700, fontSize:18, letterSpacing:'.04em' }}>{title}</div>
            <button className="btn sm ghost" onClick={onClose}><Icon id="x" size={14}/></button>
          </div>
          <div style={{ padding:'18px 20px' }}>{children}</div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'12px 20px', borderTop:'1px solid var(--line)' }}>
            {actions}
          </div>
        </div>
      </div>
    );
  }

  // STICK DASH — endless runner. Click anywhere (or press SPACE) to jump.
  // Stickman scrolls left-to-right at increasing speed; spikes spawn from the
  // right edge. Hit one → game over. Score = distance survived. Double-jump
  // available. Easy to learn, hard to master.
  function LobbyMiniGame({ profiles }) {
    const canvasRef = useRef(null);
    const [running, setRunning] = useState(false);
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(() => {
      try { return parseInt(localStorage.getItem('sf_dash_best_v1') || '0', 10); } catch(e){ return 0; }
    });
    const [over, setOver] = useState(false);
    const stateRef = useRef(null);
    function start() {
      setScore(0); setOver(false); setRunning(true);
      stateRef.current = {
        y: 0,                  // height above ground (px)
        vy: 0,
        jumpsUsed: 0,
        obstacles: [],         // { x, w, h, type }
        spawnTimer: 0,
        speed: 4.5,
        dist: 0,
      };
    }
    function jump() {
      const s = stateRef.current;
      if (!s) return;
      if (s.jumpsUsed >= 2) return;
      s.vy = -10;
      s.jumpsUsed += 1;
    }
    useEffect(() => {
      if (!running) return;
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      // Match the canvas backing store to its CSS pixel size.
      function resize() {
        const r = cv.getBoundingClientRect();
        cv.width = Math.round(r.width);
        cv.height = Math.round(r.height);
      }
      resize();
      window.addEventListener('resize', resize);
      let raf;
      const GY = 165;           // ground y
      const RUN_X = 80;         // stickman fixed x
      function frame() {
        if (!running) return;
        const s = stateRef.current;
        if (!s) { raf = requestAnimationFrame(frame); return; }
        const W = cv.width, H = cv.height;
        // ---- update ----
        s.dist += s.speed;
        s.speed = Math.min(11, 4.5 + s.dist * 0.0008);
        s.vy += 0.55; // gravity
        s.y += s.vy;
        if (s.y >= 0) { s.y = 0; s.vy = 0; s.jumpsUsed = 0; }
        s.spawnTimer -= 1;
        if (s.spawnTimer <= 0) {
          // Mix of spike triangles and tall boxes.
          const tall = Math.random() < 0.3;
          s.obstacles.push({
            x: W + 30,
            w: tall ? 22 : 26,
            h: tall ? 46 : 28,
            type: tall ? 'box' : 'spike',
          });
          s.spawnTimer = Math.max(36, 90 - Math.floor(s.dist * 0.01));
        }
        for (const o of s.obstacles) o.x -= s.speed;
        s.obstacles = s.obstacles.filter(o => o.x + o.w > -10);
        // ---- collision ----
        const px = RUN_X, py = GY + s.y - 26, pw = 14, ph = 26;
        for (const o of s.obstacles) {
          const ox = o.x, oy = GY - o.h, ow = o.w, oh = o.h;
          if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
            setRunning(false);
            setOver(true);
            const finalScore = Math.floor(s.dist / 6);
            setScore(finalScore);
            if (finalScore > best) {
              setBest(finalScore);
              try { localStorage.setItem('sf_dash_best_v1', String(finalScore)); } catch(e){}
            }
            return;
          }
        }
        // ---- draw ----
        ctx.clearRect(0, 0, W, H);
        // sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, 'rgba(124,92,255,.18)');
        sky.addColorStop(1, 'rgba(8,4,18,.6)');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        // ground line
        ctx.strokeStyle = '#a07bff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, GY); ctx.lineTo(W, GY); ctx.stroke();
        // ground hash marks scrolling
        ctx.strokeStyle = 'rgba(160,123,255,.4)'; ctx.lineWidth = 1;
        const off = (-s.dist) % 30;
        for (let x = off; x < W; x += 30) {
          ctx.beginPath(); ctx.moveTo(x, GY + 4); ctx.lineTo(x + 8, GY + 4); ctx.stroke();
        }
        // obstacles
        for (const o of s.obstacles) {
          if (o.type === 'box') {
            const g = ctx.createLinearGradient(o.x, GY - o.h, o.x, GY);
            g.addColorStop(0, '#5cf6ff');
            g.addColorStop(1, '#2a7bff');
            ctx.fillStyle = g;
            ctx.fillRect(o.x, GY - o.h, o.w, o.h);
            ctx.strokeStyle = '#001428'; ctx.lineWidth = 1.5;
            ctx.strokeRect(o.x, GY - o.h, o.w, o.h);
          } else {
            // spike triangle
            ctx.fillStyle = '#ff5b6e';
            ctx.beginPath();
            ctx.moveTo(o.x, GY);
            ctx.lineTo(o.x + o.w / 2, GY - o.h);
            ctx.lineTo(o.x + o.w, GY);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#5a0a1a'; ctx.lineWidth = 1.5; ctx.stroke();
          }
        }
        // stickman — runs at fixed x, hops with s.y
        const cx = RUN_X + pw/2, gy = GY + s.y;
        ctx.lineCap = 'round';
        // body
        ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(cx, gy - 18); ctx.lineTo(cx, gy - 4); ctx.stroke();
        // legs — animate with distance
        const run = (s.dist * 0.18) % (Math.PI * 2);
        const legSwing = Math.sin(run) * 6;
        ctx.beginPath();
        ctx.moveTo(cx, gy - 4); ctx.lineTo(cx - 4 + legSwing, gy);
        ctx.moveTo(cx, gy - 4); ctx.lineTo(cx + 4 - legSwing, gy);
        ctx.stroke();
        // arms swing opposite
        ctx.beginPath();
        ctx.moveTo(cx, gy - 14); ctx.lineTo(cx - 5 - legSwing*0.6, gy - 8);
        ctx.moveTo(cx, gy - 14); ctx.lineTo(cx + 5 + legSwing*0.6, gy - 8);
        ctx.stroke();
        // head
        ctx.fillStyle = '#ffd76a';
        ctx.beginPath(); ctx.arc(cx, gy - 22, 4.5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 1; ctx.stroke();
        // eyes
        ctx.fillStyle = '#1a1a22';
        ctx.beginPath(); ctx.arc(cx + 1.4, gy - 22.5, 0.7, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 3, gy - 22.5, 0.7, 0, Math.PI*2); ctx.fill();
        // live score
        ctx.fillStyle = '#fff';
        ctx.font = "700 18px 'Bebas Neue'";
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.floor(s.dist / 6)}`, W - 12, 24);
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      // input
      function onKey(ev) { if (ev.code === 'Space') { ev.preventDefault(); jump(); } }
      window.addEventListener('keydown', onKey);
      return () => {
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', resize);
      };
    }, [running, best]);
    return (
      <div className="panel" style={{
        maxWidth: 1280, margin:'0 auto', width:'100%',
        padding:'12px 14px',
        background:'linear-gradient(90deg, rgba(124,92,255,.10), transparent 70%)',
        border:'1.5px solid rgba(124,92,255,.35)',
      }}>
        <div className="row" style={{ alignItems:'center', gap:12, marginBottom:8, flexWrap:'wrap' }}>
          <div style={{ fontFamily:"'Bebas Neue'", fontSize:20, letterSpacing:'.1em', color:'#a07bff' }}>
            ▸ WARM-UP · STICK DASH
          </div>
          <div style={{ flex:1 }}/>
          <div style={{ fontSize:11, color:'var(--ink-3)' }}>
            SCORE <strong style={{ color:'#fff', fontSize:14 }}>{score}</strong>
            {' · '}BEST <strong style={{ color:'#ffd76a', fontSize:14 }}>{best}</strong>
          </div>
          {!running ? (
            <button className="btn sm" onClick={start}
              style={{ background:'linear-gradient(180deg, #7c5cff, #5b3ed8)', color:'#fff' }}>
              <Icon id="play" size={12}/> {over ? 'Retry' : 'Start'}
            </button>
          ) : (
            <button className="btn sm ghost" onClick={() => { setRunning(false); }}>
              <Icon id="x" size={11}/> Stop
            </button>
          )}
        </div>
        <div onClick={jump}
          style={{
            position:'relative', width:'100%', height:200, borderRadius:10, overflow:'hidden',
            border:'1.5px dashed rgba(124,92,255,.4)',
            cursor: running ? 'pointer' : 'default',
          }}>
          <canvas ref={canvasRef}
            style={{ width:'100%', height:'100%', display:'block', background:'#0e0820' }}/>
          {!running && (
            <div style={{
              position:'absolute', inset:0, display:'grid', placeItems:'center',
              color:'#fff', fontSize:14, textAlign:'center', padding:14,
              background:'rgba(8,4,18,.55)',
            }}>
              {over
                ? `Game over! Score ${score}${score >= best ? ' — NEW BEST!' : ''}. Hit Retry.`
                : <span><strong>Click or press SPACE to jump.</strong> Avoid the spikes and walls. You get a double-jump.</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // OLD: REACTION BLITZ — kept in source for reference, no longer wired up.
  function _LegacyReactionBlitz({ profiles }) {
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [lives, setLives] = useState(3);
    const [best, setBest] = useState(() => {
      try { return parseInt(localStorage.getItem('sf_lobby_best_v2') || '0', 10); } catch(e){ return 0; }
    });
    const [orbs, setOrbs] = useState([]); // array of { id, x, y, born, life, kind: 'good'|'bad', r }
    const [running, setRunning] = useState(false);
    const [over, setOver] = useState(false);
    const areaRef = useRef(null);
    const tickRef = useRef(null);
    const seqRef = useRef(0);
    // Spawn cadence speeds up with score; lifetime shrinks.
    function difficulty() {
      const interval = Math.max(280, 950 - score * 22);   // ms between spawns
      const life     = Math.max(380, 1100 - score * 18);  // ms each target lasts
      const startR   = Math.max(16, 30 - score * 0.3);    // start radius shrinks
      const badRate  = Math.min(0.55, 0.20 + score * 0.012); // % decoys
      return { interval, life, startR, badRate };
    }
    useEffect(() => {
      if (!running) return;
      let last = 0;
      let raf;
      function tick(t) {
        if (!running) return;
        // Expire orbs past their lifetime — missed good orbs cost a life.
        setOrbs(prev => {
          const kept = [];
          let livesLost = 0;
          for (const o of prev) {
            if (t - o.born > o.life) {
              if (o.kind === 'good') livesLost += 1;
              continue;
            }
            kept.push(o);
          }
          if (livesLost > 0) {
            setLives(l => Math.max(0, l - livesLost));
            setCombo(0);
          }
          return kept;
        });
        const d = difficulty();
        if (t - last > d.interval) {
          last = t;
          const r = areaRef.current && areaRef.current.getBoundingClientRect();
          if (r) {
            const pad = 36;
            const newOrb = {
              id: ++seqRef.current,
              x: pad + Math.random() * (r.width - pad*2),
              y: pad + Math.random() * (r.height - pad*2),
              born: t, life: d.life,
              kind: Math.random() < d.badRate ? 'bad' : 'good',
              r: d.startR,
            };
            setOrbs(prev => prev.concat([newOrb]).slice(-5));
          }
        }
        raf = requestAnimationFrame(tick);
        tickRef.current = raf;
      }
      raf = requestAnimationFrame(tick);
      return () => { if (raf) cancelAnimationFrame(raf); };
    }, [running, score]);
    // Lives → game over
    useEffect(() => {
      if (!running) return;
      if (lives <= 0) {
        setRunning(false);
        setOver(true);
        setOrbs([]);
        if (score > best) {
          setBest(score);
          try { localStorage.setItem('sf_lobby_best_v2', String(score)); } catch(e){}
        }
      }
    }, [lives, running, score, best]);
    function start() {
      setScore(0); setCombo(0); setLives(3); setOver(false); setOrbs([]);
      setRunning(true);
    }
    function tapOrb(e, orb) {
      e.stopPropagation();
      if (orb.kind === 'bad') {
        // Decoy → lose a life, reset combo.
        setLives(l => Math.max(0, l - 1));
        setCombo(0);
      } else {
        // Good orb — combo bonus + bigger score the smaller (faster) the orb.
        const elapsed = performance.now() - orb.born;
        const speedBonus = elapsed < orb.life * 0.4 ? 2 : 1;
        const newCombo = combo + 1;
        setCombo(newCombo);
        const cm = newCombo >= 20 ? 5 : newCombo >= 10 ? 3 : newCombo >= 5 ? 2 : 1;
        setScore(s => s + speedBonus * cm);
      }
      setOrbs(prev => prev.filter(o => o.id !== orb.id));
    }
    function nowProgress(orb) {
      const t = performance.now();
      return Math.min(1, (t - orb.born) / orb.life);
    }
    return (
      <div className="panel" style={{
        maxWidth: 1280, margin:'0 auto', width:'100%',
        padding:'12px 14px',
        background:'linear-gradient(90deg, rgba(255,77,46,.10), transparent 70%)',
        border:'1.5px solid rgba(255,154,60,.4)',
      }}>
        <div className="row" style={{ alignItems:'center', gap:12, marginBottom:8, flexWrap:'wrap' }}>
          <div style={{ fontFamily:"'Bebas Neue'", fontSize:20, letterSpacing:'.1em', color:'#ff9a3c' }}>
            ▸ WARM-UP · REACTION BLITZ
          </div>
          <div style={{ flex:1 }}/>
          <div style={{ fontSize:11, color:'var(--ink-3)' }}>
            SCORE <strong style={{ color:'#fff', fontSize:14 }}>{score}</strong>
            {' · '}COMBO <strong style={{ color:'#ffd76a', fontSize:14 }}>×{combo >= 20 ? 5 : combo >= 10 ? 3 : combo >= 5 ? 2 : 1}</strong>
            {' · '}BEST <strong style={{ color:'#ffd76a', fontSize:14 }}>{best}</strong>
          </div>
          <div className="row" style={{ gap:3 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                width:14, height:14, borderRadius:'50%',
                background: i < lives ? '#ff5b6e' : 'transparent',
                border:`1.5px solid ${i < lives ? '#ff5b6e' : 'rgba(255,255,255,.18)'}`,
                boxShadow: i < lives ? '0 0 6px #ff5b6e88' : 'none',
              }}/>
            ))}
          </div>
          {!running ? (
            <button className="btn sm" onClick={start}
              style={{ background:'linear-gradient(180deg, #ff9a3c, #ff5b14)', color:'#fff' }}>
              <Icon id="play" size={12}/> {over ? 'Retry' : 'Start'}
            </button>
          ) : (
            <button className="btn sm ghost" onClick={() => { setRunning(false); setOrbs([]); }}>
              <Icon id="x" size={11}/> Stop
            </button>
          )}
        </div>
        <div ref={areaRef}
          style={{
            position:'relative', height:200, width:'100%',
            borderRadius:10, overflow:'hidden',
            background:'radial-gradient(circle at 50% 60%, rgba(255,154,60,.10), rgba(8,4,18,.6))',
            border:'1.5px dashed rgba(255,154,60,.4)',
            cursor: running ? 'crosshair' : 'default',
          }}>
          {!running && (
            <div style={{
              position:'absolute', inset:0, display:'grid', placeItems:'center',
              color:'var(--ink-3)', fontSize:13, textAlign:'center', padding:14,
            }}>
              {over
                ? `Game over! Score: ${score}${score >= best ? ' — NEW BEST!' : ''}. Hit Retry.`
                : 'Click ORANGE orbs to score. Avoid RED decoys. Miss any orb = lose a life. 3 lives. Combo grows the multiplier.'}
            </div>
          )}
          {running && orbs.map(orb => {
            const p = nowProgress(orb);
            const r = orb.r * (1 - p * 0.55); // shrinks over time
            const isBad = orb.kind === 'bad';
            return (
              <button key={orb.id} onClick={(e) => tapOrb(e, orb)}
                style={{
                  position:'absolute',
                  left: orb.x - r, top: orb.y - r,
                  width: r * 2, height: r * 2, borderRadius:'50%',
                  cursor:'crosshair', padding:0,
                  background: isBad
                    ? 'radial-gradient(circle at 30% 25%, #fff 0%, #ff3b6e 50%, #5a0a1a 100%)'
                    : 'radial-gradient(circle at 30% 25%, #fff 0%, #ff9a3c 50%, #7a3a0a 100%)',
                  border:`2px solid ${isBad ? '#ffb0c0' : '#ffe2bd'}`,
                  boxShadow: isBad
                    ? `0 0 ${10 + (1 - p) * 16}px #ff3b6e88, 0 0 0 ${(1 - p) * 8}px rgba(255,59,110,.18)`
                    : `0 0 ${10 + (1 - p) * 16}px #ff9a3c88, 0 0 0 ${(1 - p) * 8}px rgba(255,154,60,.18)`,
                  // Pulse + spin = visual urgency
                  animation: 'orbPulse .35s ease-in-out infinite alternate',
                }}/>
            );
          })}
          <style>{`@keyframes orbPulse { from { transform: scale(.92); } to { transform: scale(1.06); } }`}</style>
        </div>
      </div>
    );
  }

  // Inline cosmetic + color swap so the host can change their look while
  // waiting in the hosting lobby. Avatar disc + color swatches + button that
  // opens the full Profile modal for hat/outfit/face/trail.
  function LobbyLookPanel({ active, onOpenProfile }) {
    const [, force] = useState(0);
    const cur = D.getPlayerColor(active) || '#5cf6ff';
    const palette = ['#5cf6ff','#5bff8a','#ffd76a','#ff9a3c','#ff5b6e','#a07bff','#fff','#1a0e22'];
    function pickColor(c) {
      D.setPlayerColor(active, c);
      force(n => n + 1);
    }
    function pickAvatar(emoji) {
      D.setAvatar(active, emoji);
      force(n => n + 1);
    }
    const emojis = (D.AVATARS || []).slice(0, 10);
    return (
      <div className="panel" style={{
        maxWidth: 1280, margin:'0 auto', width:'100%',
        padding:'12px 16px',
        background:'linear-gradient(90deg, rgba(160,123,255,.10), transparent 70%)',
        border:'1.5px solid rgba(160,123,255,.4)',
      }}>
        <div className="row" style={{ alignItems:'center', gap:14, flexWrap:'wrap' }}>
          <div style={{ fontFamily:"'Bebas Neue'", fontSize:18, letterSpacing:'.1em', color:'#a07bff' }}>
            ▸ CHANGE YOUR LOOK
          </div>
          <ProfileAvatar name={active} size={44} />
          {/* Color swatches */}
          <div className="row" style={{ gap:4, flexWrap:'wrap' }}>
            {palette.map(c => (
              <button key={c} onClick={() => pickColor(c)}
                title="Stickman color"
                style={{
                  width:24, height:24, borderRadius:'50%', background:c,
                  border:`3px solid ${cur.toLowerCase() === c.toLowerCase() ? 'var(--fire-2)' : 'rgba(255,255,255,.15)'}`,
                  cursor:'pointer',
                }}/>
            ))}
          </div>
          {/* Avatar emoji swap */}
          <div className="row" style={{ gap:4, flexWrap:'wrap' }}>
            {emojis.map(e => (
              <button key={e} onClick={() => pickAvatar(e)}
                title="Pick avatar emoji"
                style={{
                  width:30, height:30, fontSize:18, borderRadius:6,
                  background: D.getAvatar(active) === e ? 'rgba(255,154,60,.2)' : 'rgba(255,255,255,.04)',
                  border:`1.5px solid ${D.getAvatar(active) === e ? 'var(--fire-2)' : 'var(--line)'}`,
                  cursor:'pointer',
                }}>{e}</button>
            ))}
          </div>
          <div style={{ flex:1 }}/>
          {onOpenProfile && (
            <button className="btn sm" onClick={onOpenProfile}
              style={{ background:'linear-gradient(180deg, #a07bff, #5b3ed8)', color:'#fff' }}>
              <Icon id="pencil" size={12} style={{verticalAlign:'middle', marginRight:4}}/>
              Full Customize
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============== lobby ==============
  function Lobby({ profiles, onChange, settings, onSettingsChange, onStart, onBack }) {
    const cols = Math.min(profiles.length, 4);
    const total = profiles.length;
    const human = profiles.find(p => !p.isBot);
    const youName = human ? human.name : 'Host';
    // Mode picker right inside the lobby so the host can change without backing out.
    const allModes = (D.MODES || []).filter(m => m.ready);
    const currentMode = allModes.find(m => m.id === (settings && settings.mode)) || allModes[0];
    return (
      <div className="center" style={{ padding:18, gap:12, zIndex:2, alignItems:'stretch', justifyContent:'flex-start', paddingTop:30 }}>
        <div style={{ textAlign:'center' }}>
          <div className="title-art" style={{ fontSize:'clamp(40px,7vw,80px)' }}>READY UP</div>
          <div className="title-sub">name · color · hat · outfit · face · trail</div>
        </div>
        {/* PLAYERS-JOINED BANNER + HOST badge — everyone sees the count */}
        <div className="panel" style={{
          maxWidth: 1280, margin:'0 auto', width:'100%',
          padding:'12px 18px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap',
          background:'linear-gradient(90deg, rgba(91,255,138,.10), rgba(92,246,255,.08) 70%)',
          border:'2px solid rgba(91,255,138,.4)',
        }}>
          <span style={{
            width:11, height:11, borderRadius:'50%', background:'#5bff8a',
            boxShadow:'0 0 10px #5bff8a',
          }}/>
          <div style={{ fontFamily:"'Bebas Neue'", fontSize:24, letterSpacing:'.1em', color:'#5bff8a' }}>
            {total} / 4 PLAYERS JOINED
          </div>
          <div style={{ flex:1 }}/>
          <span className="pill" style={{
            background:'linear-gradient(180deg, #ffd76a, #ff9a3c)', color:'#1a0e22',
            border:'none', fontWeight:800, padding:'4px 10px',
          }}>
            HOST · {youName}
          </span>
        </div>
        {/* HOST-controlled GAME MODE picker inside the lobby */}
        {settings && onSettingsChange && (
          <div className="panel" style={{
            maxWidth: 1280, margin:'0 auto', width:'100%',
            padding:'12px 14px',
            background:'linear-gradient(90deg, rgba(255,154,60,.10), transparent 70%)',
            border:'1.5px solid rgba(255,154,60,.35)',
          }}>
            <div className="row" style={{ alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
              <div style={{ fontSize:11, color:'var(--ink-3)', letterSpacing:'.18em' }}>GAME MODE</div>
              <div style={{
                fontFamily:"'Bebas Neue'", fontSize:18, letterSpacing:'.08em',
                color:'var(--fire-3)',
              }}>· {currentMode.name.toUpperCase()}</div>
              <div style={{ flex:1 }}/>
              <div style={{ fontSize:11, color:'var(--ink-3)' }}>Host picks the mode</div>
            </div>
            <div className="row" style={{ gap:6, flexWrap:'wrap' }}>
              {allModes.map(m => {
                const on = settings.mode === m.id;
                return (
                  <button key={m.id} onClick={() => onSettingsChange({ ...settings, mode: m.id })}
                    className={`pill ${on ? 'on' : ''}`}
                    style={{ border:'none', cursor:'pointer', gap:6 }}>
                    <Icon id={m.iconId} size={12}/> {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* QUICK LOOK SWAP — change color + avatar without opening Profile */}
        <LobbyLookPanel active={D.getUser()} onOpenProfile={null} />
        {/* MINI-GAME while waiting — tap-the-target solo arcade */}
        <LobbyMiniGame profiles={profiles} />
        <div style={{ textAlign:'center', fontSize:11, color:'var(--ink-3)', letterSpacing:'.2em', marginTop:2 }}>
          CUSTOMIZE WHILE WAITING
        </div>
        <div className="grid" style={{ gridTemplateColumns:`repeat(${cols}, minmax(260px, 1fr))`, maxWidth: 1280, margin:'0 auto', gap:14 }}>
          {profiles.map((p, i) => (
            <PlayerCard key={i} idx={i} profile={p}
              onChange={(np) => { const cp = profiles.slice(); cp[i] = np; onChange(cp); }} />
          ))}
        </div>
        <div className="row" style={{ justifyContent:'center', marginTop: 10, gap: 12 }}>
          <button className="btn ghost" onClick={onBack}>
            <Icon id="back" size={14} style={{verticalAlign:'middle', marginRight:6}}/>Back
          </button>
          <button className="btn big" onClick={onStart}>
            <Icon id="play" size={20} style={{verticalAlign:'middle', marginRight:10}}/>FIGHT
          </button>
        </div>
      </div>
    );
  }

  function PlayerCard({ idx, profile, onChange }) {
    const ctrl = G.controlsFor(idx);
    const [tab, setTab] = useState('hat');
    const tabs = [
      { id:'hat',    label:'Hat',    icon:'cos_hat',    items:D.HATS    },
      { id:'outfit', label:'Outfit', icon:'cos_outfit', items:D.OUTFITS },
      { id:'face',   label:'Face',   icon:'cos_face',   items:D.FACES   },
      { id:'trail',  label:'Trail',  icon:'cos_trail',  items:D.TRAILS  },
    ];
    const currentTab = tabs.find(t => t.id === tab);

    return (
      <div className="panel" style={{ padding:14 }}>
        <div className="row" style={{ justifyContent:'space-between' }}>
          <div className="pill" style={{ background:profile.color, color:'#000', border:'none', gap:6 }}>
            P{idx+1}
            {profile.isBot && <span style={{fontSize:11}}>CPU</span>}
          </div>
          {!profile.lockedBot && (
            <button className="btn sm ghost" onClick={() => onChange({ ...profile, isBot: !profile.isBot })}>
              <Icon id={profile.isBot ? 'human' : 'bot'} size={14} style={{verticalAlign:'middle', marginRight:4}}/>
              {profile.isBot ? 'Human' : 'CPU'}
            </button>
          )}
        </div>

        <div style={{ display:'flex', justifyContent:'center', marginTop: 6 }}>
          <MiniStickman color={profile.color} dark={profile.darkColor}
            hat={profile.hat} outfit={profile.outfit} face={profile.face} />
        </div>

        <input type="text" value={profile.name}
          onChange={(e) => onChange({ ...profile, name: e.target.value.slice(0,14) })}
          style={{ width:'100%', marginTop:2 }} />

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize:11, letterSpacing:'.12em', color:'var(--ink-3)', textTransform:'uppercase', marginBottom:6 }}>Color</div>
          <div className="row" style={{ gap:5, flexWrap:'wrap' }}>
            {D.PLAYER_COLORS.map(c => (
              <div key={c.id} className={`color-tile ${profile.colorId === c.id ? 'on' : ''}`}
                style={{ background:c.color, width:28, height:28 }}
                title={c.name}
                onClick={() => onChange({ ...profile, colorId: c.id, color: c.color, darkColor: c.dark })} />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="row" style={{ gap:4, marginBottom:6 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`pill ${tab === t.id ? 'on' : ''}`}
                style={{ border:'none', cursor:'pointer', padding:'4px 10px', fontSize:11, gap:4 }}>
                <Icon id={t.icon} size={12}/>{t.label}
              </button>
            ))}
          </div>
          <div className="scroll-x" style={{ paddingTop:2 }}>
            {currentTab.items.map(item => {
              const slot = tab; // hat/outfit/face/trail
              const idKey = slot + 'Id';
              const objKey = slot;
              const owned = D.isOwned(slot, item.id, item);
              const c = D.RARITY_COLOR[item.rarity] || 'var(--line-2)';
              return (
                <div key={item.id}
                  className={`hat-tile ${profile[idKey] === item.id ? 'on' : ''}`}
                  onClick={() => {
                    if (!owned) return;
                    onChange({ ...profile, [idKey]: item.id, [objKey]: item });
                  }}
                  title={owned ? item.name : `${item.name} — locked (${item.rarity})`}
                  style={{
                    position:'relative',
                    borderColor: profile[idKey] === item.id ? c : undefined,
                    boxShadow: profile[idKey] === item.id ? `0 0 0 2px ${c}55` : undefined,
                    opacity: owned ? 1 : 0.4,
                    cursor: owned ? 'pointer' : 'not-allowed',
                  }}>
                  <CosmeticPreview slot={slot} item={item} color={profile.color} dark={profile.darkColor} />
                  {/* rarity dot bottom-right */}
                  <div style={{
                    position:'absolute', bottom:4, right:4,
                    width:8, height:8, borderRadius:'50%',
                    background: c, boxShadow: '0 0 4px rgba(0,0,0,.6)'
                  }}/>
                  {!owned && (
                    <div style={{
                      position:'absolute', top:4, left:4,
                      padding:'1px 5px', borderRadius:4,
                      background:'rgba(0,0,0,.7)', border:'1px solid var(--line-2)',
                      color:'var(--ink-2)', fontSize:9, fontWeight:700, letterSpacing:'.1em',
                    }}>
                      <Icon id="lock" size={9}/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {ctrl && !profile.isBot && (
          <div style={{ marginTop: 10, fontSize:12, color:'var(--ink-2)', lineHeight:1.7 }}>
            <span className="kbd">{ctrl.left}</span> <span className="kbd">{ctrl.right}</span> move
            {' · '}<span className="kbd">{ctrl.jump}</span> jump
            <br />
            <span className="kbd">{ctrl.punch}</span> punch
            {' · '}<span className="kbd">{ctrl.kick}</span> kick
          </div>
        )}
      </div>
    );
  }

  // Stickman preview with all slots
  function MiniStickman({ color, dark, hat, outfit, face, animated = false }) {
    const ref = useRef(null);
    useEffect(() => {
      const c = ref.current; if (!c) return;
      const ctx = c.getContext('2d');
      let raf = null, t = 0;
      function draw() {
        ctx.clearRect(0,0,c.width,c.height);
        ctx.save();
        ctx.translate(c.width/2, c.height/2 + 32);
        // shadow
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.beginPath(); ctx.ellipse(0, 33, 10, 3, 0, 0, Math.PI*2); ctx.fill();

        if (outfit && outfit.draw && outfit.behind) {
          ctx.save(); ctx.translate(0, -32); outfit.draw(ctx); ctx.restore();
        }

        const sway = animated ? Math.sin(t*0.1)*2 : 0;
        ctx.strokeStyle = dark || '#222'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // legs (slim)
        ctx.beginPath();
        ctx.moveTo(0, -2); ctx.lineTo(-2-sway, 14); ctx.lineTo(-7+sway*0.5, 30);
        ctx.moveTo(0, -2); ctx.lineTo( 2+sway, 14); ctx.lineTo( 7-sway*0.5, 30);
        ctx.stroke();
        // torso (slim)
        ctx.lineWidth = 4.5;
        ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(0, -2); ctx.stroke();
        if (outfit && outfit.draw && !outfit.behind) {
          ctx.save(); ctx.translate(0, -30); outfit.draw(ctx); ctx.restore();
        }
        // arms (slim)
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.moveTo(0, -27); ctx.lineTo(-6, -18); ctx.lineTo(-10, -10);
        ctx.moveTo(0, -27); ctx.lineTo( 6, -18); ctx.lineTo( 10, -10);
        ctx.stroke();
        ctx.fillStyle = color || '#5bf';
        ctx.beginPath(); ctx.arc(-10, -10, 2.4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc( 10, -10, 2.4, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = dark || '#222'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(-10, -10, 2.4, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc( 10, -10, 2.4, 0, Math.PI*2); ctx.stroke();

        // HEAD (smaller)
        const headR = 11;
        const cy = -32 - headR + 2;
        const g = ctx.createRadialGradient(-3, cy-3, 1, 0, cy, headR);
        g.addColorStop(0, lighten(color, .3)); g.addColorStop(.7, color || '#5bf'); g.addColorStop(1, dark || '#222');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, cy, headR, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = dark || '#222'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(0, cy, headR, 0, Math.PI*2); ctx.stroke();

        if (face && face.draw) {
          ctx.save(); ctx.translate(0, cy); face.draw(ctx, 1); ctx.restore();
        } else {
          ctx.fillStyle = '#1a1a22';
          ctx.beginPath(); ctx.arc(3, cy, 1.8, 0, Math.PI*2); ctx.fill();
        }
        if (hat && hat.draw) {
          ctx.save(); ctx.translate(0, cy - headR + 2); hat.draw(ctx); ctx.restore();
        }
        ctx.restore();
        if (animated) { t++; raf = requestAnimationFrame(draw); }
      }
      draw();
      return () => { if (raf) cancelAnimationFrame(raf); };
    }, [color, dark, hat, outfit, face, animated]);
    return <canvas ref={ref} width={160} height={190} style={{ width:160, height:190 }} />;
  }

  function CosmeticPreview({ slot, item, color, dark }) {
    const ref = useRef(null);
    useEffect(() => {
      const c = ref.current; if (!c) return;
      const ctx = c.getContext('2d');
      ctx.clearRect(0,0,c.width,c.height);
      ctx.save(); ctx.translate(c.width/2, c.height-12);
      if (slot === 'hat') {
        // small head behind
        ctx.fillStyle = color || '#3a2a5a';
        ctx.beginPath(); ctx.arc(0, -3, 10, 0, Math.PI*2); ctx.fill();
        ctx.translate(0, -13);
        try { item.draw(ctx); } catch(e){}
      } else if (slot === 'outfit') {
        // torso
        ctx.fillStyle = dark || '#3a2a5a'; ctx.fillRect(-2, -28, 4, 22);
        if (item.behind) { ctx.save(); ctx.translate(0, -28); item.draw(ctx); ctx.restore(); }
        ctx.save(); ctx.translate(0, -28);
        try { if (!item.behind) item.draw(ctx); } catch(e){}
        ctx.restore();
        if (item.behind) { ctx.save(); ctx.translate(0, -28); /* drew behind already */ ctx.restore(); }
      } else if (slot === 'face') {
        const g = ctx.createRadialGradient(-3, -20, 1, 0, -15, 13);
        g.addColorStop(0, lighten(color, .25)); g.addColorStop(.7, color || '#5bf'); g.addColorStop(1, dark || '#222');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, -15, 13, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = dark || '#222'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -15, 13, 0, Math.PI*2); ctx.stroke();
        ctx.save(); ctx.translate(0, -15);
        try { item.draw(ctx, 1); } catch(e){}
        ctx.restore();
      } else if (slot === 'trail') {
        // dotted trail receding to right
        for (let i = 0; i < 6; i++) {
          ctx.save();
          ctx.translate(-18 + i*7, -16);
          try { item.draw(ctx, 5 - i, 20, color || '#fff'); } catch(e){}
          ctx.restore();
        }
      }
      ctx.restore();
    }, [slot, item, color, dark]);
    return <canvas ref={ref} width={64} height={64} style={{ width:64, height:64 }} />;
  }

  function lighten(hex, amt) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return hex || '#888';
    const n = parseInt(m[1], 16);
    let r = (n>>16)&0xff, g = (n>>8)&0xff, b = n&0xff;
    r = Math.min(255, r + (255-r)*amt) | 0;
    g = Math.min(255, g + (255-g)*amt) | 0;
    b = Math.min(255, b + (255-b)*amt) | 0;
    return `rgb(${r},${g},${b})`;
  }

  // ============== arena ==============
  function Arena({ profiles, edu, mode, botDifficulty, stageId, tdEndless, tdMapId, paused, onRoundEnd }) {
    const stage = useMemo(() => {
      if (stageId && stageId !== 'random') {
        const found = D.STAGES.find(s => s.id === stageId);
        if (found) return found;
      }
      return D.STAGES[Math.floor(Math.random()*D.STAGES.length)];
    }, [stageId]);
    const modeLabel = (D.MODES.find(m => m.id === mode) || {}).name || 'Stick Fight';
    const mapPicked = tdMapId && tdMapId !== 'random' ? tdMapId : null;
    return (
      <div className="center" style={{ padding:14 }}>
        <G.Component players={profiles} stage={stage} edu={edu} mode={mode}
          botDifficulty={botDifficulty} tdEndless={tdEndless} tdMapId={mapPicked}
          paused={paused} onRoundEnd={onRoundEnd} />
        <div style={{ marginTop: 10, fontSize:12, color:'var(--ink-3)', letterSpacing:'.1em', textTransform:'uppercase' }}>
          {modeLabel} · {stage.name} · First to {profiles[0]._target || 5}
        </div>
      </div>
    );
  }

  // ============== between-round question (edu mode) ==============
  // Detect a question's type. Older sets default to multiple choice.
  function questionType(q) {
    if (!q) return 'mc';
    if (q.type) return q.type;
    // Auto-detect older formats
    if (q.choices && q.choices.length === 2 &&
        /true|false/i.test((q.choices[0]||'') + (q.choices[1]||''))) return 'tf';
    return 'mc';
  }
  // Evaluate whether a user answer is correct, given the question.
  function isAnswerCorrect(q, userAnswer) {
    const t = questionType(q);
    if (t === 'mc' || t === 'tf') return userAnswer === q.answer;
    if (t === 'text') {
      const exp = (q.textAnswer || '').trim().toLowerCase();
      const got = (userAnswer || '').trim().toLowerCase();
      return exp.length > 0 && exp === got;
    }
    if (t === 'slider') {
      const v = Number(userAnswer);
      const tgt = Number(q.sliderTarget || 0);
      const tol = Number(q.sliderTolerance || 1);
      return Number.isFinite(v) && Math.abs(v - tgt) <= tol;
    }
    return false;
  }

  function QuestionRound({ player, setId, onResult }) {
    const [picked, setPicked] = useState(null);  // mc/tf index, or text/number value
    const [revealed, setRevealed] = useState(false);
    const question = useMemo(() => Q.nextQuestion(setId), [setId, player._slot]);
    if (!question) { onResult(player, false); return null; }
    const t = questionType(question);

    function commit(answer) {
      if (revealed) return;
      setPicked(answer); setRevealed(true);
      const correct = isAnswerCorrect(question, answer);
      setTimeout(() => onResult(player, correct, question.points || 1), 1400);
    }

    const correct = revealed ? isAnswerCorrect(question, picked) : false;
    const correctColor = '#5bff8a';
    const wrongColor   = '#ff5b5b';

    return (
      <div className="center" style={{ padding:24, gap:16, zIndex:2 }}>
        <div style={{ textAlign:'center' }}>
          <div className="title-art" style={{ fontSize:'clamp(38px,5vw,68px)' }}>QUESTION</div>
          <div className="title-sub" style={{ color: player.color }}>
            {player.name}'s turn — correct = rare power-up
          </div>
        </div>
        <div className="panel" style={{ width:'min(720px,94vw)', padding:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <div style={{ fontSize:13, letterSpacing:'.12em', color:'var(--ink-3)', textTransform:'uppercase' }}>
              <Icon id="book" size={14} style={{verticalAlign:'middle', marginRight:6}}/>
              {question.setName}
            </div>
            <div className="row" style={{ gap:6 }}>
              {(question.points || 1) > 1 && (
                <span className="pill" style={{ fontSize:10, padding:'3px 9px', background:'rgba(255,215,106,.15)', color:'#ffd76a', border:'1px solid #ffd76a' }}>
                  ×{question.points} POINTS
                </span>
              )}
              <span className="pill" style={{ fontSize:10, padding:'3px 9px' }}>
                {({ mc:'MULTIPLE CHOICE', tf:'TRUE / FALSE', text:'TEXT', slider:'SLIDER' })[t]}
              </span>
            </div>
          </div>
          {question.setDescription && (
            <div style={{ fontSize:12, color:'var(--ink-3)', marginBottom:14, fontStyle:'italic' }}>
              {question.setDescription}
            </div>
          )}
          {/* Optional image */}
          {question.imageUrl && (
            <div style={{ marginBottom:14, textAlign:'center' }}>
              <img src={question.imageUrl} alt=""
                style={{ maxHeight:220, maxWidth:'100%', borderRadius:8, border:'1px solid var(--line)' }}
                onError={(e) => { e.target.style.display = 'none'; }}/>
            </div>
          )}
          <div style={{ fontSize:28, fontFamily:"'Rajdhani'", fontWeight:600, lineHeight:1.3, marginBottom:18 }}>
            {question.q}
          </div>

          {/* ----- ANSWER UI per type ----- */}
          {(t === 'mc' || t === 'tf') && (
            <div className="grid" style={{ gridTemplateColumns: t === 'tf' ? '1fr 1fr' : (question.choices.length === 2 ? '1fr 1fr' : '1fr 1fr'), gap:10 }}>
              {(t === 'tf' ? (question.choices && question.choices.length === 2 ? question.choices : ['True','False']) : question.choices).map((c, i) => {
                const isPicked = picked === i;
                const isCorrect = revealed && i === question.answer;
                const isWrong = revealed && isPicked && i !== question.answer;
                return (
                  <button key={i} onClick={() => commit(i)} disabled={revealed}
                    style={{
                      appearance:'none', cursor: revealed ? 'default' : 'pointer',
                      background: isCorrect ? `linear-gradient(180deg,${correctColor},#2e9a4a)`
                                : isWrong   ? `linear-gradient(180deg,${wrongColor},#8b2424)`
                                : isPicked  ? 'rgba(255,255,255,.15)' : 'rgba(40,15,70,.85)',
                      border:'2px solid ' + (isCorrect ? correctColor : isWrong ? wrongColor : 'var(--line-2)'),
                      borderRadius:12, padding:'14px 16px',
                      fontFamily:"'Rajdhani'", fontSize:t === 'tf' ? 24 : 18, fontWeight:t === 'tf' ? 700 : 500,
                      color:'#fff', textAlign:'left',
                    }}>
                    <span style={{ opacity:.5, marginRight:10, fontFamily:"'Bebas Neue'" }}>
                      {t === 'tf' ? (i === 0 ? 'T' : 'F') : 'ABCDEF'[i]}
                    </span>
                    {c}
                    {isCorrect && <Icon id="check" size={16} style={{float:'right', marginTop:4}}/>}
                    {isWrong && <Icon id="x" size={16} style={{float:'right', marginTop:4}}/>}
                  </button>
                );
              })}
            </div>
          )}

          {t === 'text' && (
            <TextAnswerInput revealed={revealed} correct={correct}
              expected={question.textAnswer || ''}
              onSubmit={(v) => commit(v)} />
          )}

          {t === 'slider' && (
            <SliderAnswerInput revealed={revealed} correct={correct}
              min={Number(question.sliderMin || 0)}
              max={Number(question.sliderMax || 100)}
              target={Number(question.sliderTarget || 0)}
              tolerance={Number(question.sliderTolerance || 5)}
              onSubmit={(v) => commit(v)} />
          )}

          {/* Reveal explanation after answering */}
          {revealed && question.explanation && (
            <div style={{ marginTop:14, padding:'10px 14px', borderRadius:8,
              background:'rgba(255,255,255,.05)', border:'1px solid var(--line-2)',
              color:'var(--ink-2)', fontSize:13, fontStyle:'italic' }}>
              {question.explanation}
            </div>
          )}
        </div>
        <div style={{ fontSize:12, color:'var(--ink-3)', letterSpacing:'.1em' }}>
          Right answer → rare power-up · Wrong → standard pool
        </div>
      </div>
    );
  }

  function TextAnswerInput({ revealed, correct, expected, onSubmit }) {
    const [v, setV] = useState('');
    return (
      <div className="row" style={{ gap:8 }}>
        <input type="text" value={v}
          onChange={e => setV(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !revealed && v.trim()) onSubmit(v); }}
          disabled={revealed}
          placeholder="Type your answer…"
          style={{ flex:1, padding:'12px 16px', fontSize:18 }}/>
        <button className="btn" disabled={revealed || !v.trim()} onClick={() => onSubmit(v)}>
          Submit
        </button>
        {revealed && (
          <div style={{
            padding:'8px 12px', borderRadius:8,
            background: correct ? 'rgba(91,255,138,.15)' : 'rgba(255,91,91,.15)',
            border: '1px solid ' + (correct ? '#5bff8a' : '#ff5b5b'),
            color: correct ? '#5bff8a' : '#ff8a8a', fontWeight:700,
            display:'inline-flex', alignItems:'center', gap:8,
          }}>
            {correct ? <><Icon id="check" size={14}/>Correct!</> : <><Icon id="x" size={14}/>Was: "{expected}"</>}
          </div>
        )}
      </div>
    );
  }

  function SliderAnswerInput({ revealed, correct, min, max, target, tolerance, onSubmit }) {
    const [v, setV] = useState(Math.round((min + max) / 2));
    return (
      <div className="col" style={{ gap:10 }}>
        <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color:'var(--ink-3)', fontSize:13 }}>{min}</span>
          <span style={{
            fontSize:32, fontWeight:800, fontFamily:"'Bebas Neue'", letterSpacing:'.04em',
            color: revealed ? (correct ? '#5bff8a' : '#ff8a8a') : 'var(--fire-3)',
          }}>{v}</span>
          <span style={{ color:'var(--ink-3)', fontSize:13 }}>{max}</span>
        </div>
        <input type="range" min={min} max={max} value={v}
          disabled={revealed}
          onChange={e => setV(Number(e.target.value))}
          style={{ width:'100%' }}/>
        {!revealed && (
          <button className="btn" onClick={() => onSubmit(v)} style={{ alignSelf:'center' }}>
            Submit · {v}
          </button>
        )}
        {revealed && (
          <div style={{ textAlign:'center', color: correct ? '#5bff8a' : '#ff8a8a', fontSize:14, fontWeight:700 }}>
            {correct
              ? <><Icon id="check" size={14} style={{verticalAlign:'middle', marginRight:6}}/>Within tolerance!</>
              : <><Icon id="x" size={14} style={{verticalAlign:'middle', marginRight:6}}/>Was {target} (±{tolerance})</>}
          </div>
        )}
      </div>
    );
  }

  // ============== power-up draft ==============
  function PowerupDraft({ losers, profiles, draftMap, onDone }) {
    // draftMap: { [slot]: 'common' | 'rare' } — set by question results in edu mode
    const [currentIdx, setCurrentIdx] = useState(0);
    const offers = useMemo(() => {
      return losers.map(slot => {
        const tier = draftMap?.[slot] || 'common';
        return D.pickRandomTier(tier, 3);
      });
    }, [losers, draftMap]);
    const refLive = useRef(profiles);

    if (currentIdx >= losers.length) { onDone(refLive.current); return null; }

    const slot = losers[currentIdx];
    const liveProfile = refLive.current.find(p => p._slot === slot);
    if (!liveProfile) { onDone(refLive.current); return null; }
    const tierLabel = draftMap?.[slot] === 'rare' ? 'RARE POOL' : 'STANDARD POOL';
    const tierColor = draftMap?.[slot] === 'rare' ? 'var(--fire-3)' : 'var(--ink-2)';

    function pick(pu) {
      const np = refLive.current.slice();
      const ix = np.findIndex(p => p._slot === slot);
      np[ix] = { ...np[ix], buffs: [...(np[ix].buffs || []), pu] };
      refLive.current = np;
      if (currentIdx + 1 >= losers.length) onDone(np);
      else setCurrentIdx(currentIdx + 1);
    }

    // CPU bots auto-pick after a short delay so the human still gets to see
    // what the bot grabbed.
    useEffect(() => {
      if (!liveProfile || !liveProfile.isBot) return;
      const choices = offers[currentIdx] || [];
      if (choices.length === 0) return;
      const id = setTimeout(() => {
        // Bot pick: prefer powerups it doesn't already have; tie-break random.
        const owned = new Set((liveProfile.buffs || []).map(b => b.id));
        const fresh = choices.filter(c => !owned.has(c.id));
        const pool  = fresh.length > 0 ? fresh : choices;
        pick(pool[Math.floor(Math.random() * pool.length)]);
      }, 900);
      return () => clearTimeout(id);
    }, [currentIdx, liveProfile, offers]);

    return (
      <div className="center" style={{ padding:24, gap:14, zIndex:2 }}>
        <div style={{ textAlign:'center' }}>
          <div className="title-art" style={{ fontSize:'clamp(38px,6vw,72px)' }}>POWER-UP</div>
          <div className="title-sub">
            <span style={{ color: liveProfile.color }}>{liveProfile.name}</span> picks ({currentIdx+1}/{losers.length})
            <span style={{ marginLeft:14, color:tierColor, fontSize:14, letterSpacing:'.15em' }}>{tierLabel}</span>
          </div>
        </div>
        <div className="row" style={{ gap:14, justifyContent:'center', flexWrap:'wrap' }}>
          {offers[currentIdx].map((pu, i) => (
            <div key={pu.id+i} className="powerup-card" onClick={() => pick(pu)}>
              <div className="cat">
                <Icon id={D.catIconId(pu.cat)} size={12} style={{verticalAlign:'middle', marginRight:5}}/>
                {D.catLabel(pu.cat)}
              </div>
              <div style={{ margin:'10px auto', width:64, height:64, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.04)', borderRadius:50 }}>
                <Icon id={pu.iconId} size={42} color="var(--fire-3)" />
              </div>
              <div className="name">{pu.name}</div>
              <div className="desc">{pu.desc}</div>
            </div>
          ))}
        </div>
        {liveProfile.buffs && liveProfile.buffs.length > 0 && (
          <div className="panel" style={{ marginTop:6, padding:'8px 14px', fontSize:13, color:'var(--ink-2)' }}>
            Active buffs:
            {liveProfile.buffs.map((b, i) => (
              <span key={i} style={{ marginLeft:10 }}>
                <Icon id={b.iconId} size={14} style={{verticalAlign:'middle', marginRight:4}}/>
                {b.name}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============== match results ==============
  function MatchResults({ profiles, winner, mode, onPlayAgain, onMenu, onNext, queueCount = 0 }) {
    // Solo modes that aren't a points race — only show the human player and a
    // mode-appropriate summary instead of "first to N points".
    const SOLO = ['td', 'golf', 'parkour', 'last'];
    const isSolo = SOLO.includes(mode);
    const human = profiles.find(p => !p.isBot) || winner;
    const humanWon = winner && human && winner._slot === human._slot;

    // Map mode -> { headline, sub, statLabel, statValue }
    const summary = (() => {
      if (mode === 'td') {
        const wave = (human && human._score) || 0;
        return {
          headline: humanWon ? 'VICTORY' : 'BASE DESTROYED',
          sub: humanWon ? 'All waves cleared!' : `Held out until wave ${wave + 1}`,
          statLabel: 'Waves cleared',
          statValue: wave,
        };
      }
      if (mode === 'last') {
        const kills = (human && human._score) || 0;
        return {
          headline: 'LAST STAND',
          sub: `${kills} ${kills === 1 ? 'kill' : 'kills'} before going down`,
          statLabel: 'Kills',
          statValue: kills,
        };
      }
      if (mode === 'parkour') {
        return {
          headline: humanWon ? 'YOU WIN' : 'YOU LOST',
          sub: humanWon ? 'First to the finish!' : 'Better luck next run',
          statLabel: null, statValue: null,
        };
      }
      if (mode === 'golf') {
        const strokes = (human && human._score) || 0;
        return {
          headline: 'HOLE COMPLETE',
          sub: `Finished in ${strokes} strokes`,
          statLabel: 'Strokes',
          statValue: strokes,
        };
      }
      return null;
    })();

    if (isSolo && summary) {
      return (
        <div className="center" style={{ padding:24, gap:16, zIndex:2 }}>
          <div style={{ textAlign:'center' }}>
            <Icon id="trophy" size={64} color={humanWon ? winner.color : '#7a6a92'} />
            <div className="title-art" style={{ color: humanWon ? winner.color : '#ff5b6e', marginTop:8 }}>
              {summary.headline}
            </div>
            <div className="title-sub">{summary.sub}</div>
          </div>
          {summary.statLabel !== null && (
            <div className="panel" style={{ width: 'min(420px, 92vw)' }}>
              <div className="row" style={{ alignItems:'center', justifyContent:'space-between', padding:'4px 4px' }}>
                <div className="row" style={{ gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:human.color, border:`2px solid ${human.darkColor}` }} />
                  <div>
                    <div style={{ fontWeight:700, fontSize:16 }}>{human.name}</div>
                    <div style={{ fontSize:11, color:'var(--ink-3)' }}>{summary.statLabel}</div>
                  </div>
                </div>
                <div style={{ fontFamily:"'Bebas Neue'", fontSize:42, color:'var(--fire-3)' }}>
                  {summary.statValue}
                </div>
              </div>
            </div>
          )}
          <div className="row">
            <button className="btn ghost" onClick={onMenu}>
              <Icon id="back" size={14} style={{verticalAlign:'middle', marginRight:6}}/>Menu
            </button>
            {onNext && (
              <button className="btn big" onClick={onNext}
                style={{ background:'linear-gradient(180deg, #5cf6ff, #2a7bff)', color:'#001428' }}>
                <Icon id="play" size={18} style={{verticalAlign:'middle', marginRight:8}}/>
                Next in Queue ({queueCount})
              </button>
            )}
            <button className="btn big" onClick={onPlayAgain}>
              <Icon id="play" size={20} style={{verticalAlign:'middle', marginRight:10}}/>Play Again
            </button>
          </div>
        </div>
      );
    }

    // Default: head-to-head "first to N" scoreboard (Stick Fight, Sumo, KOTH, Bomb).
    const sorted = profiles.slice().sort((a,b) => b._score - a._score);
    return (
      <div className="center" style={{ padding:24, gap:16, zIndex:2 }}>
        <div style={{ textAlign:'center' }}>
          <Icon id="trophy" size={64} color={winner.color} />
          <div className="title-art" style={{ color: winner.color, marginTop:8 }}>{winner.name.toUpperCase()} WINS</div>
          <div className="title-sub">first to {winner._target} points</div>
        </div>
        <div className="panel" style={{ width: 'min(520px, 94vw)' }}>
          {sorted.map((p, i) => (
            <div key={p._slot} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom: i < sorted.length-1 ? '1px solid var(--line)' : 'none' }}>
              <div className="row" style={{ gap:12 }}>
                <div style={{ fontFamily:"'Bebas Neue'", fontSize:24, color:'var(--ink-3)', width:24, textAlign:'right' }}>{i+1}</div>
                <div style={{ width:36, height:36, borderRadius:'50%', background:p.color, border:`2px solid ${p.darkColor}` }} />
                <div>
                  <div style={{ fontWeight:700, fontSize:16 }}>{p.name}</div>
                  <div style={{ fontSize:11, color:'var(--ink-3)' }}>{(p.buffs||[]).length} buffs collected</div>
                </div>
              </div>
              <div style={{ fontFamily:"'Bebas Neue'", fontSize:32, color:'var(--fire-3)' }}>{p._score}</div>
            </div>
          ))}
        </div>
        <div className="row">
          <button className="btn ghost" onClick={onMenu}>
            <Icon id="back" size={14} style={{verticalAlign:'middle', marginRight:6}}/>Menu
          </button>
          {onNext && (
            <button className="btn big" onClick={onNext}
              style={{ background:'linear-gradient(180deg, #5cf6ff, #2a7bff)', color:'#001428' }}>
              <Icon id="play" size={18} style={{verticalAlign:'middle', marginRight:8}}/>
              Next in Queue ({queueCount})
            </button>
          )}
          <button className="btn big" onClick={onPlayAgain}>
            <Icon id="play" size={20} style={{verticalAlign:'middle', marginRight:10}}/>Rematch
          </button>
        </div>
      </div>
    );
  }

  // ============== Login / Sign-up screen ==============
  // Shown at the start of every browser session before the launch hub.
  // Two clear paths: LOG IN (use existing profile) or SIGN UP (create new one).
  function LoginScreen({ onLoggedIn }) {
    const [tab, setTab] = useState(() => {
      try {
        const list = JSON.parse(localStorage.getItem('sf_user_list_v1') || '[]');
        // Default to Sign Up if no profiles exist yet.
        return (Array.isArray(list) && list.length > 0) ? 'login' : 'signup';
      } catch(e) { return 'signup'; }
    });
    return (
      <div style={{
        position:'fixed', inset:0, zIndex:100,
        background: 'radial-gradient(ellipse at 50% 110%, var(--fire-1) 0%, transparent 55%), linear-gradient(180deg, var(--bg-0) 0%, var(--bg-1) 55%, var(--bg-2) 100%)',
        display:'grid', placeItems:'center', padding:24,
      }}>
        <div style={{ width:'min(460px, 94vw)', textAlign:'center' }}>
          <div className="title-art" style={{ fontSize:'clamp(54px, 9vw, 110px)', lineHeight:.85, marginBottom:6 }}>
            STICK<br/>SCHOLAR
          </div>
          <div className="title-sub" style={{ marginBottom:22 }}>welcome back, fighter</div>
          {/* TWO BIG BUTTONS — Log In | Sign Up */}
          <div style={{ display:'flex', gap:10, marginBottom:18, justifyContent:'center' }}>
            <button onClick={() => setTab('login')}
              className="btn"
              style={{
                background: tab === 'login'
                  ? 'linear-gradient(180deg, var(--fire-2), var(--fire-1))'
                  : 'rgba(0,0,0,.55)',
                border: tab === 'login' ? 'none' : '2px solid var(--line-2)',
                color: tab === 'login' ? '#fff' : 'var(--ink)',
                padding:'14px 30px', fontSize:18, letterSpacing:'.1em',
                flex:1, maxWidth:180,
              }}>
              LOG IN
            </button>
            <button onClick={() => setTab('signup')}
              className="btn"
              style={{
                background: tab === 'signup'
                  ? 'linear-gradient(180deg, var(--fire-2), var(--fire-1))'
                  : 'rgba(0,0,0,.55)',
                border: tab === 'signup' ? 'none' : '2px solid var(--line-2)',
                color: tab === 'signup' ? '#fff' : 'var(--ink)',
                padding:'14px 30px', fontSize:18, letterSpacing:'.1em',
                flex:1, maxWidth:180,
              }}>
              SIGN UP
            </button>
          </div>
          <div className="panel" style={{ padding:22 }}>
            {tab === 'login'
              ? <LoginForm onLoggedIn={onLoggedIn} onGoSignUp={() => setTab('signup')}/>
              : <SignUpForm onLoggedIn={onLoggedIn} onGoLogIn={() => setTab('login')}/>}
          </div>
        </div>
      </div>
    );
  }

  function LoginForm({ onLoggedIn, onGoSignUp }) {
    const users = D.listUsers();
    const [pickedName, setPickedName] = useState(users[0] || '');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    function submit() {
      if (!pickedName) { setError('Pick a profile'); return; }
      const ok = D.verifyPassword(pickedName, password);
      if (!ok) { setError('Wrong password'); return; }
      D.setUser(pickedName);
      try { localStorage.setItem('sf_logged_in_v1', '1'); } catch(e){}
      onLoggedIn(pickedName);
    }
    if (users.length === 0) {
      return (
        <div style={{ textAlign:'center', color:'var(--ink-2)', padding:'18px 0' }}>
          No saved profiles yet.{' '}
          {onGoSignUp ? (
            <button onClick={onGoSignUp}
              style={{ background:'none', border:'none', color:'var(--fire-2)',
                       textDecoration:'underline', cursor:'pointer', font:'inherit' }}>
              Create one →
            </button>
          ) : <strong>SIGN UP</strong>}
        </div>
      );
    }
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ fontSize:11, letterSpacing:'.18em', color:'var(--ink-3)', textAlign:'left' }}>USERNAME</div>
        <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:160, overflowY:'auto' }}>
          {users.map(u => (
            <button key={u}
              onClick={() => { setPickedName(u); setPassword(''); setError(''); }}
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'8px 12px', borderRadius:8, cursor:'pointer',
                background: u === pickedName ? 'rgba(255,154,60,.18)' : 'rgba(255,255,255,.04)',
                border: `1.5px solid ${u === pickedName ? 'var(--fire-2)' : 'var(--line)'}`,
                color:'var(--ink)', fontFamily:'inherit',
              }}>
              <ProfileAvatar name={u} size={32} />
              <div style={{ flex:1, textAlign:'left', fontWeight:700 }}>{u}</div>
              {D.hasPassword(u) && <span style={{ fontSize:11, color:'var(--ink-3)' }}>🔒</span>}
            </button>
          ))}
        </div>
        {pickedName && D.hasPassword(pickedName) && (
          <>
            <div style={{ fontSize:11, letterSpacing:'.18em', color:'var(--ink-3)', textAlign:'left', marginTop:6 }}>PASSWORD</div>
            <input type="password" value={password} autoFocus
              placeholder="Password"
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && submit()}
              style={{ padding:'10px 14px', fontSize:14 }}/>
          </>
        )}
        {error && (
          <div style={{ color:'#ff8a9a', fontSize:12, textAlign:'center' }}>{error}</div>
        )}
        <button className="btn big" onClick={submit}
          style={{ marginTop:6, fontSize:20, padding:'14px 0' }}>
          ▶ LOG IN
        </button>
        {/* Always-on "create new account" link so users can spin up another
            profile without hunting for the SIGN UP tab. */}
        {onGoSignUp && (
          <div style={{ textAlign:'center', fontSize:13, color:'var(--ink-2)', marginTop:8 }}>
            Don't have an account?{' '}
            <button onClick={onGoSignUp}
              style={{ background:'none', border:'none', color:'var(--fire-2)',
                       textDecoration:'underline', cursor:'pointer', font:'inherit' }}>
              Create one →
            </button>
          </div>
        )}
      </div>
    );
  }

  function SignUpForm({ onLoggedIn, onGoLogIn }) {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [error, setError] = useState('');
    const taken = name.trim() && D.userExists(name);
    function submit() {
      const clean = name.trim().slice(0, 20);
      if (!clean) { setError('Pick a username'); return; }
      if (D.userExists(clean)) { setError('Username already taken'); return; }
      D.setUser(clean);                     // also writes it into the list
      if (password) D.setPassword(clean, password);
      if (avatar)   D.setAvatar(clean, avatar);
      try { localStorage.setItem('sf_logged_in_v1', '1'); } catch(e){}
      onLoggedIn(clean);
    }
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ fontSize:11, letterSpacing:'.18em', color:'var(--ink-3)', textAlign:'left' }}>USERNAME</div>
        <input type="text" maxLength={20} placeholder="Choose a username"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          style={{ padding:'10px 14px', fontSize:14,
                   borderColor: taken ? '#ff5b6e' : undefined }}/>
        {taken && (
          <div style={{ color:'#ff8a9a', fontSize:12, textAlign:'left' }}>
            Username already taken.
          </div>
        )}
        <div style={{ fontSize:11, letterSpacing:'.18em', color:'var(--ink-3)', textAlign:'left', marginTop:4 }}>
          PASSWORD <span style={{ textTransform:'none', letterSpacing:0, color:'var(--ink-3)' }}>(optional)</span>
        </div>
        <input type="password" placeholder="Optional"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={{ padding:'10px 14px', fontSize:14 }}/>
        <div style={{ fontSize:11, letterSpacing:'.18em', color:'var(--ink-3)', textAlign:'left', marginTop:4 }}>AVATAR</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(8, 1fr)', gap:4 }}>
          {D.AVATARS.slice(0, 16).map(emoji => (
            <button key={emoji} onClick={() => setAvatar(emoji)}
              style={{
                aspectRatio:'1', fontSize:18, borderRadius:6,
                background: avatar === emoji ? 'rgba(255,154,60,.2)' : 'rgba(255,255,255,.04)',
                border: `1.5px solid ${avatar === emoji ? 'var(--fire-2)' : 'var(--line)'}`,
                cursor:'pointer',
              }}>{emoji}</button>
          ))}
        </div>
        {error && !taken && (
          <div style={{ color:'#ff8a9a', fontSize:12, textAlign:'center' }}>{error}</div>
        )}
        <button className="btn big" onClick={submit} disabled={!name.trim() || taken}
          style={{ marginTop:6, fontSize:20, padding:'14px 0' }}>
          ▶ CREATE ACCOUNT
        </button>
        {onGoLogIn && D.listUsers().length > 0 && (
          <div style={{ textAlign:'center', fontSize:13, color:'var(--ink-2)', marginTop:8 }}>
            Already have an account?{' '}
            <button onClick={onGoLogIn}
              style={{ background:'none', border:'none', color:'var(--fire-2)',
                       textDecoration:'underline', cursor:'pointer', font:'inherit' }}>
              Log in →
            </button>
          </div>
        )}
      </div>
    );
  }

  // ============== top-level App ==============
  function App() {
    const [stage, setStage] = useState('launch'); // launch | lobby | arena | question | draft | results
    const [settings, setSettings] = useState({
      mode: 'fight', players: '1v1bot', target: 5, edu: true,
      questionSetId: 'math_easy',
      botDifficulty: 'normal',
      stageId: 'random',
      tdEndless: false,
    });
    const [profiles, setProfiles] = useState([]);
    const [roundWinner, setRoundWinner] = useState(null);
    const [matchWinner, setMatchWinner] = useState(null);

    const [showCreator, setShowCreator] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showCrates, setShowCrates] = useState(false);
    const [showCodes, setShowCodes] = useState(false);
    const [showFriends, setShowFriends] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    // Gimkit-style hosting waiting room — full screen with a big PIN, live
    // joined-players list, and a START GAME button.
    const [showHostingScreen, setShowHostingScreen] = useState(false);
    // Play queue — ordered list of {mode, tdMapId} entries the player wants to
    // play one after another. When a match ends and the queue is non-empty,
    // the next entry auto-starts.
    const [playQueue, setPlayQueue] = useState([]);
    // Local vs Online flavour. Online runs the same engine but shows a
    // matchmaking overlay and labels opponents with friend-style names so it
    // feels like multiplayer (the engine is still local with bots — there is
    // no real net code, just the UX surface).
    const [playMode, setPlayMode] = useState(() => {
      try { return localStorage.getItem('sf_play_mode_v1') || 'local'; } catch(e) { return 'local'; }
    });
    function changePlayMode(m) {
      setPlayMode(m);
      try { localStorage.setItem('sf_play_mode_v1', m); } catch(e){}
    }
    // Party — friends queued up alongside the player for the next match. Each
    // entry is the friend object from D.getFriends(). They take bot slots and
    // are drawn with the friend's name + color (so it reads as a co-op feel).
    const [party, setParty] = useState([]);
    // Challenge — opponent friend slotted into the next match's bot side.
    const [challengeFriend, setChallengeFriend] = useState(null);
    // Matchmaking pulse — true while the "ONLINE" flavour shows a brief
    // matchmaking overlay before dropping the player into a match.
    const [matchmaking, setMatchmaking] = useState(false);
    // First-run login gate: any session where the user hasn't explicitly logged
    // in shows the LoginScreen first. Cleared once they pick LOG IN or SIGN UP.
    const [needLogin, setNeedLogin] = useState(() => {
      try {
        // Stay logged in across refreshes — only force login again after an
        // explicit Log Out from the Profile modal.
        return !localStorage.getItem('sf_logged_in_v1');
      } catch(e) { return true; }
    });
    const [tradeFriend, setTradeFriend] = useState(null); // friend object or null = chooser
    const [showTrade, setShowTrade] = useState(false);
    const [previewSet, setPreviewSet] = useState(null);
    const [coins, setCoinsState] = useState(D.getCoins());
    const [activeUser, setActiveUser] = useState(D.getUser());
    const refreshCoins = () => setCoinsState(D.getCoins());

    // edu-mode question state
    const [questionQueue, setQuestionQueue] = useState([]); // slots remaining to answer
    const [draftMap, setDraftMap] = useState({});           // slot -> tier ('common'|'rare')

    useEffect(() => {
      document.documentElement.setAttribute('data-edu', settings.edu ? 'on' : 'off');
    }, [settings.edu]);

    function startLobby() {
      // ONLINE flavour: brief matchmaking overlay before dropping in.
      if (playMode === 'online') {
        setMatchmaking(true);
        setTimeout(() => { setMatchmaking(false); _buildLobby(); }, 1400);
      } else {
        _buildLobby();
      }
    }
    function _buildLobby() {
      let count = 2;
      let lockedBots = [];
      switch (settings.players) {
        case '1v1bot': count = 2; lockedBots = [1]; break;
        case '2': count = 2; break;
        case '3': count = 3; break;
        case '4': count = 4; break;
      }
      // Spectator hosting — host watches; slot 0 is locked as a bot too.
      let isSpectator = false;
      try { isSpectator = localStorage.getItem('sf_spectator_v1') === '1'; } catch(e){}
      if (isSpectator && !lockedBots.includes(0)) lockedBots = [0, ...lockedBots];
      // One-shot flag — clear so the next non-host session is normal.
      try { localStorage.removeItem('sf_spectator_v1'); } catch(e){}
      // Party + challenge bake into bot slots so it FEELS like multi-player.
      // - Party friends fill the friendly bot slots after slot 0 (the human).
      // - Challenge friend takes the LAST bot slot (the opponent).
      // - Online flavour also gives generic bots cool gamer-tag style names.
      const partyList = party.slice();
      const chall = challengeFriend;
      const built = [];
      // Pull the human player's saved profile colour so it seeds slot 0.
      const savedColor = D.getPlayerColor(D.getUser());
      const savedName = D.getDisplayName(D.getUser());
      // Pool of fun fake opponents shown in ONLINE mode (cycled deterministically).
      const onlineNames = ['xSt1ckLord','BowKing77','FrostQueen','Vexo','PixelPunch','Razer',
                           'Krang_2k','MintCake','NeonRaven','BoomGuy','ChessMonk','Yeet'];
      for (let i = 0; i < count; i++) {
        const c = D.PLAYER_COLORS[i];
        const isBot = lockedBots.includes(i);
        // Slot 0 always belongs to the human unless they locked it as a bot.
        const isHumanSlot = (i === 0 && !isBot);
        let useColor = isHumanSlot && savedColor ? savedColor : c.color;
        let useDark  = isHumanSlot && savedColor ? mixToBlack(savedColor, 0.55) : c.dark;
        let useName  = isBot ? `CPU ${i+1}` : (isHumanSlot ? savedName : `Player ${i+1}`);
        // CHALLENGE: opponent friend (last bot slot)
        if (isBot && chall && i === count - 1) {
          useName = chall.name; useColor = chall.color || useColor; useDark = mixToBlack(useColor, 0.55);
        }
        // PARTY: friend bots fill the middle bot slots
        else if (isBot && partyList.length > 0 && i > 0 && i < count - 1) {
          const p = partyList.shift();
          if (p) { useName = p.name; useColor = p.color || useColor; useDark = mixToBlack(useColor, 0.55); }
        }
        // ONLINE flavour: dress generic CPU names as fake online tags.
        else if (isBot && playMode === 'online' && useName.startsWith('CPU')) {
          useName = onlineNames[(i + Math.floor(Date.now()/1000)) % onlineNames.length];
        }
        built.push({
          _slot: i, _score: 0, _target: settings.target,
          isBot, lockedBot: isBot,
          name: useName,
          colorId: c.id, color: useColor, darkColor: useDark,
          hatId: 'none',    hat:    D.HATS[0],
          outfitId: 'none', outfit: D.OUTFITS[0],
          faceId: 'default',face:   D.FACES[0],
          trailId: 'none',  trail:  D.TRAILS[0],
          buffs: [],
        });
      }
      setProfiles(built);
      setStage('lobby');
      // Challenge is one-shot — consume after wiring into the lobby.
      if (chall) setChallengeFriend(null);
    }

    function startMatch() {
      setProfiles(profiles.map(p => ({ ...p, _score: 0, buffs: [] })));
      setStage('arena');
    }
    // Random mode + map. Used by Quick Match and the "+ Random" queue button.
    function randomMatchItem() {
      const modes = ['fight','sumo','koth','bomb','last','parkour','golf','td'];
      const m = modes[Math.floor(Math.random() * modes.length)];
      const item = { mode: m };
      if (m === 'td') {
        const ids = (G.TD_PATH_IDS || ['zigzag']);
        item.tdMapId = ids[Math.floor(Math.random() * ids.length)];
      }
      return item;
    }
    function quickMatch() {
      const item = randomMatchItem();
      const newSettings = { ...settings, mode: item.mode };
      if (item.tdMapId) newSettings.tdMapId = item.tdMapId;
      setSettings(newSettings);
      setTimeout(() => startLobby(), 50);
    }

    function onRoundEnd(winnerSlot, pointsDelta = 1) {
      const np = profiles.map(p => p._slot === winnerSlot ? { ...p, _score: p._score + pointsDelta } : p);
      setProfiles(np);
      const target = settings.target;
      // TD and Golf are continuous campaigns — when the engine signals a
      // winner, the match is already over. Skip the round/question/draft flow.
      if (settings.mode === 'td' || settings.mode === 'golf') {
        const winner = np.find(p => p._slot === winnerSlot);
        if (winner) {
          if (!winner.isBot) { D.addCoins(50); refreshCoins(); }
          setMatchWinner(winner);
          setStage('results');
        }
        return;
      }
      const matchWon = np.find(p => p._score >= target);
      if (matchWon) {
        // Coins reward: 50 for winning a match (only if the human won)
        if (!matchWon.isBot) { D.addCoins(50); refreshCoins(); }
        setMatchWinner(matchWon);
        setStage('results');
        return;
      }
      const losers = np.filter(p => p._slot !== winnerSlot).map(p => p._slot);
      if (losers.length === 0) { setStage('arena'); return; }
      setRoundWinner(winnerSlot);

      if (settings.edu && settings.mode !== 'td' && settings.mode !== 'golf') {
        // human losers answer questions; bots get random tier
        const humans = losers.filter(slot => !np.find(p => p._slot === slot).isBot);
        const newDraft = {};
        for (const slot of losers) {
          if (!humans.includes(slot)) newDraft[slot] = Math.random() < 0.3 ? 'rare' : 'common';
        }
        setDraftMap(newDraft);
        setQuestionQueue(humans);
        setStage(humans.length > 0 ? 'question' : 'draft');
      } else {
        setDraftMap({});
        setStage('draft');
      }
    }

    function onQuestionResult(player, correct, questionPoints) {
      const newDraft = { ...draftMap, [player._slot]: correct ? 'rare' : 'common' };
      setDraftMap(newDraft);
      if (correct && !player.isBot) {
        const pts = Math.max(1, Number(questionPoints || 1));
        D.addCoins(10 * pts);
        refreshCoins();
        try { window.StickFightGame && window.StickFightGame.SFX && window.StickFightGame.SFX.coin(); } catch(e){}
      }
      const remaining = questionQueue.filter(s => s !== player._slot);
      setQuestionQueue(remaining);
      if (remaining.length === 0) setStage('draft');
    }

    function applyDraftResult(updatedProfiles) {
      setProfiles(updatedProfiles);
      setStage('arena');
    }

    const arenaProfiles = useMemo(() => profiles.map(p => ({
      name: p.name, color: p.color, darkColor: p.darkColor,
      hat: p.hat, outfit: p.outfit, face: p.face, trail: p.trail,
      isBot: p.isBot, buffs: p.buffs, score: p._score, _target: settings.target,
    })), [profiles, settings.target]);

    // current question player object (with color)
    const currentQuestionPlayer = questionQueue.length > 0 ? profiles.find(p => p._slot === questionQueue[0]) : null;

    // Quit the active match → return to launch screen. Clears match state.
    const exitToMenu = useCallback(() => {
      setStage('launch');
      setMatchWinner(null);
      setRoundWinner(null);
      setQuestionQueue([]);
      setDraftMap({});
    }, []);
    const [confirmQuit, setConfirmQuit] = useState(false);

    // Esc key during any in-game stage toggles the pause / quit modal.
    useEffect(() => {
      if (stage === 'launch') return;
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); setConfirmQuit(v => !v); }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [stage]);

    // Pre-launch gate: must Log In or Sign Up before the hub appears.
    if (needLogin) {
      return (
        <LoginScreen onLoggedIn={(name) => {
          setActiveUser(name);
          refreshCoins();
          setNeedLogin(false);
        }} />
      );
    }

    return (
      <>
        {stage === 'launch' && <LaunchBackground />}
        <div className="vignette" style={{ zIndex:1 }} />

        {stage === 'launch' && (
          <LaunchScreen
            key={activeUser}
            settings={settings}
            onChange={setSettings}
            onPlay={startLobby}
            coins={coins}
            onOpenProfile={() => setShowProfile(true)}
            onOpenQueue={() => setShowQueue(true)}
            onOpenHostingScreen={() => setShowHostingScreen(true)}
            queueCount={playQueue.length}
            playMode={playMode}
            onChangePlayMode={changePlayMode}
            onQuickMatch={quickMatch}
            party={party}
            onClearParty={() => setParty([])}
            challengeFriend={challengeFriend}
            onClearChallenge={() => setChallengeFriend(null)}
            onOpenCrates={() => setShowCrates(true)}
            onOpenCodes={() => setShowCodes(true)}
            onOpenFriends={() => setShowFriends(true)}
            onOpenTrade={() => { setTradeFriend(null); setShowTrade(true); }}
            onPreviewSet={(set) => setPreviewSet(set)}
            onCreateSet={() => setShowCreator(true)}
            onDeleteSet={(set) => {
              if (!confirm(`Delete "${set.name}"? This can't be undone.`)) return;
              Q.deleteSet(set.id);
              // If we deleted the active set, snap to the first builtin
              setSettings(s => s.questionSetId === set.id ? { ...s, questionSetId: Q.allSets()[0].id } : { ...s });
            }}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}
        {stage === 'lobby' && (
          <Lobby profiles={profiles} onChange={setProfiles}
                 settings={settings} onSettingsChange={setSettings}
                 onStart={startMatch} onBack={() => setStage('launch')} />
        )}
        {stage === 'arena' && (
          <Arena key={profiles.reduce((s,p)=>s+p._score,0)}
                 profiles={arenaProfiles}
                 edu={(settings.mode === 'td' || settings.mode === 'golf') ? false : settings.edu}
                 mode={settings.mode}
                 stageId={settings.stageId}
                 tdEndless={settings.tdEndless}
                 tdMapId={settings.tdMapId}
                 botDifficulty={settings.botDifficulty}
                 paused={confirmQuit}
                 onRoundEnd={onRoundEnd} />
        )}
        {stage === 'question' && currentQuestionPlayer && (
          <QuestionRound
            player={currentQuestionPlayer}
            setId={settings.questionSetId}
            onResult={onQuestionResult}
          />
        )}
        {stage === 'draft' && (
          <PowerupDraft
            losers={profiles.filter(p => p._slot !== roundWinner).map(p => p._slot)}
            profiles={profiles}
            draftMap={draftMap}
            onDone={applyDraftResult} />
        )}
        {stage === 'results' && matchWinner && (
          <MatchResults profiles={profiles} winner={matchWinner} mode={settings.mode}
            queueCount={playQueue.length}
            onPlayAgain={() => { setMatchWinner(null); startMatch(); }}
            onNext={playQueue.length > 0 ? () => {
              const next = playQueue[0];
              setPlayQueue(playQueue.slice(1));
              setMatchWinner(null);
              // Queued matches read as multiplayer: force ONLINE flavour so any
              // remaining bot slots get gamer-tag names (xSt1ckLord, Vexo…), and
              // size the lobby to party.length+1 so there are no bot fillers
              // beyond what's needed.
              const partyTotal = party.length + 1;
              const playerCount = Math.max(2, Math.min(4, partyTotal));
              const newSettings = {
                ...settings,
                mode: next.mode,
                players: String(playerCount),
              };
              if (next.tdMapId) newSettings.tdMapId = next.tdMapId;
              setSettings(newSettings);
              changePlayMode('online');
              // Build the lobby (which also seeds party + challenge); player
              // hits FIGHT from there to drop in.
              setTimeout(() => startLobby(), 50);
            } : null}
            onMenu={() => { setMatchWinner(null); setStage('launch'); }} />
        )}

        {/* Back-to-menu chip — visible on every non-launch stage */}
        {stage !== 'launch' && (
          <button onClick={() => setConfirmQuit(true)} className="btn sm ghost"
            style={{ position:'fixed', top:14, left:14, zIndex:30,
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'8px 14px', background:'rgba(0,0,0,.55)',
              border:'1px solid var(--line-2)', color:'var(--ink)',
              letterSpacing:'.06em', textTransform:'uppercase' }}>
            <Icon id="x" size={12} /> Menu
            <span style={{ opacity:.5, marginLeft:6, fontSize:11 }}>Esc</span>
          </button>
        )}

        {/* Pause / quit modal — opens on Esc while in-game.
            The match canvas freezes via the `paused` prop on Arena. */}
        {confirmQuit && (
          <div style={{ position:'fixed', inset:0, zIndex:60,
            background:'rgba(0,0,0,.6)', display:'grid', placeItems:'center', backdropFilter:'blur(4px)' }}>
            <div className="panel" style={{ width:'min(440px,90vw)', textAlign:'center' }}>
              <div className="title-art" style={{ fontSize:'clamp(34px,5vw,52px)', marginBottom:4 }}>PAUSED</div>
              <div style={{ color:'var(--ink-2)', fontSize:14, marginBottom:18 }}>
                Take a breather. Press <span className="kbd">Esc</span> or hit Resume to jump back in.
              </div>
              <div className="row" style={{ justifyContent:'center', gap:10 }}>
                <button className="btn big" onClick={() => setConfirmQuit(false)}>
                  <Icon id="play" size={18} style={{verticalAlign:'middle', marginRight:8}}/>Resume
                </button>
                <button className="btn ghost" onClick={() => { setConfirmQuit(false); exitToMenu(); }}>
                  <Icon id="back" size={14} style={{verticalAlign:'middle', marginRight:6}}/>Quit to Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {showCreator && (
          <CreatorModal
            onClose={() => setShowCreator(false)}
            onSave={(set) => {
              setShowCreator(false);
              setSettings(s => ({ ...s, questionSetId: set.id }));
            }} />
        )}
        {showSettings && (
          <SettingsModal
            settings={settings}
            onChange={setSettings}
            onClose={() => setShowSettings(false)}
            onOpenCodes={() => setShowCodes(true)} />
        )}
        {showCodes && (
          <CodesModal onClose={() => setShowCodes(false)} onCoinsChanged={refreshCoins} />
        )}
        {showProfile && (
          <ProfileModal onClose={() => setShowProfile(false)}
            onSwitch={() => {
              setActiveUser(D.getUser());
              refreshCoins();
              // Force friends + owned panels to refresh by closing modal.
            }}
            onLogout={() => {
              try { localStorage.removeItem('sf_logged_in_v1'); } catch(e){}
              setShowProfile(false);
              setNeedLogin(true);
              setStage('launch');
            }} />
        )}
        {showFriends && (
          <FriendsModal onClose={() => setShowFriends(false)}
            onOpenTrade={(f) => { setShowFriends(false); setTradeFriend(f); setShowTrade(true); }}
            party={party}
            onToggleParty={(f) => {
              setParty(prev => prev.find(p => p.id === f.id)
                ? prev.filter(p => p.id !== f.id)
                : [...prev, f]);
            }}
            onChallenge={(f) => {
              setChallengeFriend(f);
              setShowFriends(false);
              // Default to a 1v1 vs bot so the friend is the opponent.
              setSettings({ ...settings, players: '1v1bot' });
              setTimeout(() => startLobby(), 80);
            }}
          />
        )}
        {showTrade && (
          <TradingModal friend={tradeFriend}
            onClose={() => setShowTrade(false)}
            onOpenFriends={() => setShowFriends(true)}
            onCoinsChanged={refreshCoins} />
        )}
        {showCrates && (
          <CrateModal onClose={() => { setShowCrates(false); refreshCoins(); }}
                      onCoinsChanged={refreshCoins} />
        )}
        {showHostingScreen && (
          <HostingScreen
            settings={settings}
            onSettingsChange={setSettings}
            onOpenProfile={() => setShowProfile(true)}
            onClose={() => setShowHostingScreen(false)}
            onStart={(joinedPlayers, role) => {
              // Joined players slot into the party — they appear in friendly slots.
              setParty(joinedPlayers);
              setShowHostingScreen(false);
              // Total = joined + (1 if host plays). Engine caps at 4 so any
              // extra joined players sit out the visible round.
              const total = Math.max(2, Math.min(4, joinedPlayers.length + (role === 'spectator' ? 0 : 1)));
              setSettings({ ...settings, players: String(total) });
              // Spectator mode — flag so _buildLobby can lock slot 0 as a bot.
              try { localStorage.setItem('sf_spectator_v1', role === 'spectator' ? '1' : '0'); } catch(e){}
              setTimeout(() => startLobby(), 60);
            }}
          />
        )}
        {showQueue && (
          <QueueModal
            queue={playQueue}
            settings={settings}
            onClose={() => setShowQueue(false)}
            onAdd={(item) => setPlayQueue([...playQueue, item])}
            onRemove={(idx) => setPlayQueue(playQueue.filter((_, i) => i !== idx))}
            onClear={() => setPlayQueue([])}
            onAddRandom={() => setPlayQueue([...playQueue, randomMatchItem()])}
          />
        )}
        {/* Matchmaking pseudo-overlay — only shown for the ONLINE flavour. */}
        {matchmaking && (
          <div style={{ position:'fixed', inset:0, zIndex:120,
            background:'rgba(2,4,12,.88)', display:'grid', placeItems:'center', backdropFilter:'blur(6px)' }}>
            <div className="panel" style={{ width:'min(380px, 90vw)', textAlign:'center' }}>
              <div style={{ width:60, height:60, borderRadius:'50%', margin:'0 auto 14px',
                border:'4px solid rgba(92,246,255,.3)',
                borderTopColor:'#5cf6ff', animation:'spin 0.9s linear infinite' }}/>
              <div className="title-art" style={{ fontSize:30, color:'#5cf6ff' }}>MATCHMAKING</div>
              <div className="title-sub">finding worthy opponents…</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        )}
        {previewSet && (
          <SetPreviewModal set={previewSet} onClose={() => setPreviewSet(null)} />
        )}
      </>
    );
  }

  // ============== settings modal ==============
  // ============== crate shop ==============
  function CrateModal({ onClose, onCoinsChanged }) {
    const [coins, setCoinsLocal] = useState(D.getCoins());
    const [reveal, setReveal] = useState(null); // {kind,item} after a roll
    const [opening, setOpening] = useState(false);
    const [error, setError] = useState('');
    function buy(crate) {
      setError('');
      if (D.getCoins() < crate.price) { setError("Not enough coins."); return; }
      setOpening(true); setReveal(null);
      setTimeout(() => {
        const drop = D.rollCrate(crate);
        if (!drop) {
          setError("You already own everything in this crate's pool.");
          setOpening(false);
          return;
        }
        D.addCoins(-crate.price);
        D.ownItem(drop.kind, drop.item.id);
        setReveal(drop);
        setOpening(false);
        setCoinsLocal(D.getCoins());
        onCoinsChanged && onCoinsChanged();
      }, 700);
    }
    const ratityColor = D.RARITY_COLOR;
    return (
      <ModalShell title="Crates" onClose={onClose}
        actions={
          <div className="row" style={{ gap:12, alignItems:'center' }}>
            <span style={{ color:'#ffd76a', fontWeight:700, display:'inline-flex', alignItems:'center', gap:6 }}>
              <Icon id="coin" size={14} color="#ffd76a"/> {coins.toLocaleString()}
            </span>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        }>
        <div className="col" style={{ gap:14 }}>
          <p style={{ color:'var(--ink-2)', fontSize:13, margin:0, lineHeight:1.5 }}>
            Spend coins to unlock new cosmetics. Higher-tier crates give better odds of rare items.
            Earn coins by winning matches (+50) and correct answers in Edu Mode (+10).
          </p>
          <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:12 }}>
            {D.CRATES.map(c => (
              <div key={c.id} className="panel" style={{ padding:16, border:`2px solid ${c.accent}55` }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:44, height:44, borderRadius:10,
                    background:`linear-gradient(180deg, ${c.accent}33, transparent)`,
                    border:`1px solid ${c.accent}88`,
                    display:'grid', placeItems:'center' }}>
                    <Icon id="gift" size={22} color={c.accent}/>
                  </div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:16 }}>{c.name}</div>
                    <div style={{ fontSize:11, color:'var(--ink-3)' }}>
                      {Object.entries(c.weights).filter(([_,v]) => v > 0)
                        .map(([k,v]) => `${k} ${v}%`).join(' · ')}
                    </div>
                  </div>
                </div>
                <div style={{ color:'var(--ink-2)', fontSize:13, minHeight:38 }}>{c.desc}</div>
                <button className="btn" disabled={opening || coins < c.price}
                  onClick={() => buy(c)}
                  style={{ marginTop:10, width:'100%', justifyContent:'center',
                    background: coins < c.price ? 'var(--bg-3)' : undefined,
                    cursor: (opening || coins < c.price) ? 'not-allowed' : 'pointer',
                    opacity: (opening || coins < c.price) ? .55 : 1 }}>
                  <Icon id="coin" size={14} color="#ffd76a" style={{verticalAlign:'middle', marginRight:6}}/>
                  {c.price.toLocaleString()} · {coins < c.price ? 'Need more coins' : 'Open'}
                </button>
              </div>
            ))}
          </div>
          {opening && (
            <div style={{ textAlign:'center', color:'var(--ink-2)', fontSize:14 }}>Opening…</div>
          )}
          {reveal && !opening && (
            <div style={{
              padding:16, borderRadius:12,
              background:`linear-gradient(180deg, ${ratityColor[reveal.item.rarity]}33, transparent)`,
              border:`2px solid ${ratityColor[reveal.item.rarity]}`,
              display:'flex', alignItems:'center', gap:14,
              boxShadow:`0 0 24px ${ratityColor[reveal.item.rarity]}44`,
            }}>
              <div style={{ width:56, height:56, borderRadius:10,
                background:'rgba(0,0,0,.4)', display:'grid', placeItems:'center' }}>
                <CratePreview kind={reveal.kind} item={reveal.item}/>
              </div>
              <div>
                <div className="mono" style={{ fontSize:10, letterSpacing:'.18em', color: ratityColor[reveal.item.rarity], textTransform:'uppercase' }}>
                  {reveal.item.rarity} · {reveal.kind}
                </div>
                <div style={{ fontWeight:800, fontSize:18 }}>{reveal.item.name}</div>
                <div style={{ color:'var(--ink-3)', fontSize:12 }}>Unlocked!</div>
              </div>
            </div>
          )}
          {error && (
            <div style={{ color:'#ff8a9a', fontSize:13, padding:'8px 12px', background:'rgba(255,91,110,.1)', borderRadius:8 }}>
              {error}
            </div>
          )}
        </div>
      </ModalShell>
    );
  }

  // Tiny canvas-based cosmetic preview used by the Crate reveal UI.
  function CratePreview({ kind, item }) {
    const ref = useRef(null);
    useEffect(() => {
      const c = ref.current; if (!c || !item.draw) return;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.save();
      ctx.translate(24, kind === 'hat' ? 34 : 16);
      try { item.draw(ctx); } catch(e) {}
      ctx.restore();
    }, [item]);
    return <canvas ref={ref} width={48} height={48} style={{ display:'block' }}/>;
  }

  // ============== question set preview ==============
  function SetPreviewModal({ set, onClose }) {
    if (!set) return null;
    return (
      <ModalShell title={`Preview · ${set.name}`} onClose={onClose}
        actions={<button className="btn" onClick={onClose}>Close</button>}>
        <div className="col" style={{ gap:14 }}>
          {set.description && (
            <div style={{ color:'var(--ink-2)', fontSize:13, fontStyle:'italic' }}>{set.description}</div>
          )}
          <div className="mono" style={{ fontSize:11, color:'var(--ink-3)', letterSpacing:'.12em' }}>
            {set.questions.length} QUESTION{set.questions.length !== 1 ? 'S' : ''} · {(set.source||'builtin').toUpperCase()}
          </div>
          <div className="col" style={{ gap:10 }}>
            {set.questions.map((q, i) => {
              const t = questionType(q);
              return (
                <div key={i} className="panel" style={{ padding:12 }}>
                  <div className="row" style={{ justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <div style={{ fontSize:11, color:'var(--ink-3)', letterSpacing:'.12em' }}>Q{i+1}</div>
                    <div className="pill" style={{ fontSize:9, padding:'2px 7px' }}>
                      {({ mc:'MULTI', tf:'T/F', text:'TEXT', slider:'SLIDER' })[t]}
                    </div>
                  </div>
                  {q.imageUrl && (
                    <img src={q.imageUrl} alt="" style={{ maxHeight:120, marginBottom:6, borderRadius:6, border:'1px solid var(--line)' }}
                      onError={(e) => { e.target.style.display = 'none'; }}/>
                  )}
                  <div style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>{q.q}</div>

                  {(t === 'mc' || t === 'tf') && (
                    <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      {(q.choices || []).map((c, ci) => (
                        <div key={ci} style={{
                          padding:'6px 10px', borderRadius:6,
                          background: ci === q.answer ? 'rgba(91,255,138,.15)' : 'rgba(255,255,255,.03)',
                          border: '1px solid ' + (ci === q.answer ? '#5bff8a' : 'var(--line)'),
                          fontSize:13, color: ci === q.answer ? '#5bff8a' : 'var(--ink)',
                        }}>
                          <span style={{ opacity:.55, marginRight:6, fontFamily:"'Bebas Neue'" }}>
                            {t === 'tf' ? (ci === 0 ? 'T' : 'F') : 'ABCDEF'[ci]}
                          </span>
                          {c}
                          {ci === q.answer && <Icon id="check" size={12} style={{ float:'right', marginTop:2 }}/>}
                        </div>
                      ))}
                    </div>
                  )}

                  {t === 'text' && (
                    <div style={{
                      padding:'8px 12px', borderRadius:6,
                      background:'rgba(91,255,138,.12)', border:'1px solid #5bff8a',
                      color:'#a8ffbf', fontSize:13,
                    }}>
                      <span style={{ color:'var(--ink-3)', marginRight:6 }}>Answer:</span>
                      "{q.textAnswer}"
                    </div>
                  )}

                  {t === 'slider' && (
                    <div className="row" style={{ gap:10, alignItems:'center', fontSize:13 }}>
                      <span style={{ color:'var(--ink-3)' }}>{q.sliderMin}</span>
                      <div style={{ flex:1, height:6, borderRadius:999, background:'rgba(255,255,255,.07)', position:'relative' }}>
                        {(() => {
                          const span = (q.sliderMax || 100) - (q.sliderMin || 0);
                          const pct = span === 0 ? 0 : ((q.sliderTarget - q.sliderMin) / span) * 100;
                          const tolPct = span === 0 ? 0 : (q.sliderTolerance / span) * 100;
                          return (
                            <>
                              <div style={{
                                position:'absolute', top:-3, height:12, width:`${tolPct*2}%`,
                                left:`calc(${pct}% - ${tolPct}%)`,
                                background:'rgba(91,255,138,.25)', borderRadius:999,
                              }}/>
                              <div style={{
                                position:'absolute', top:-3, height:12, width:2,
                                left:`${pct}%`, background:'#5bff8a',
                              }}/>
                            </>
                          );
                        })()}
                      </div>
                      <span style={{ color:'var(--ink-3)' }}>{q.sliderMax}</span>
                      <span style={{ color:'#5bff8a', fontWeight:700, marginLeft:6 }}>
                        ={q.sliderTarget}±{q.sliderTolerance}
                      </span>
                    </div>
                  )}

                  {q.explanation && (
                    <div style={{ marginTop:6, color:'var(--ink-3)', fontSize:12, fontStyle:'italic' }}>{q.explanation}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </ModalShell>
    );
  }

  // ============== friends modal ==============
  function FriendsModal({ onClose, onOpenTrade, party, onToggleParty, onChallenge }) {
    const [friends, setFriends] = useState(D.getFriends());
    const [input, setInput] = useState('');
    const [msg, setMsg] = useState('');
    function add() {
      const r = D.addFriend(input);
      if (r.ok) { setInput(''); setFriends(D.getFriends()); setMsg(''); }
      else setMsg(r.msg);
    }
    function remove(id) {
      if (!confirm("Remove this friend?")) return;
      D.removeFriend(id);
      setFriends(D.getFriends());
    }
    return (
      <ModalShell title="Friends" onClose={onClose}
        actions={<button className="btn" onClick={onClose}>Close</button>}>
        <div className="col" style={{ gap:12 }}>
          <p style={{ color:'var(--ink-2)', fontSize:13, margin:0, lineHeight:1.5 }}>
            Add friends by name. Online status is shown next to each one.
            Use Trading to swap cosmetics.
          </p>
          <div className="row" style={{ gap:8 }}>
            <input type="text" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') add(); }}
              placeholder="Friend's name"
              style={{ flex:1 }} />
            <button className="btn" onClick={add} disabled={!input.trim()}>
              <Icon id="plus" size={14} style={{verticalAlign:'middle', marginRight:6}}/>Add
            </button>
          </div>
          {msg && (
            <div style={{ padding:'8px 12px', borderRadius:8,
              background:'rgba(255,91,110,.12)', border:'1px solid #ff5b6e',
              color:'#ff8a9a', fontSize:13 }}>{msg}</div>
          )}
          {friends.length === 0 ? (
            <div className="panel" style={{ padding:18, textAlign:'center', color:'var(--ink-3)' }}>
              <Icon id="users" size={28} style={{ opacity:.5, marginBottom:6 }}/>
              <div>No friends yet — add one above.</div>
            </div>
          ) : (
            <div className="col" style={{ gap:6 }}>
              {friends.map(f => {
                const online = D.friendIsOnline(f.name);
                return (
                  <div key={f.id} className="panel" style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:34, height:34, borderRadius:'50%',
                      background:f.color, display:'grid', placeItems:'center',
                      fontWeight:800, color:'#000', fontSize:13 }}>
                      {f.name.slice(0,1).toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700 }}>{f.name}</div>
                      <div style={{ fontSize:11, color: online ? '#5bff8a' : 'var(--ink-3)',
                        display:'inline-flex', alignItems:'center', gap:4 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%',
                          background: online ? '#5bff8a' : 'var(--ink-3)' }}/>
                        {online ? 'Online' : 'Offline'}
                      </div>
                    </div>
                    {onChallenge && (
                      <button className="btn sm"
                        onClick={() => onChallenge(f)}
                        title="Start a 1v1 match against this friend"
                        style={{
                          background:'linear-gradient(180deg, #ff8a3d, #ff4d2e)',
                          color:'#fff', border:'none',
                        }}>
                        <Icon id="play" size={12} style={{verticalAlign:'middle', marginRight:4}}/>
                        Challenge
                      </button>
                    )}
                    {onToggleParty && (
                      <button className="btn sm ghost"
                        onClick={() => onToggleParty(f)}
                        title={(party || []).find(p => p.id === f.id) ? 'Leave party' : 'Add to party'}
                        style={{
                          borderColor: (party || []).find(p => p.id === f.id) ? '#7bff8a' : 'var(--line-2)',
                          color: (party || []).find(p => p.id === f.id) ? '#aaffc4' : 'var(--ink-2)',
                        }}>
                        <Icon id="users" size={12} style={{verticalAlign:'middle', marginRight:4}}/>
                        {(party || []).find(p => p.id === f.id) ? 'In Party' : 'Party'}
                      </button>
                    )}
                    <button className="btn sm ghost"
                      disabled={!online}
                      onClick={() => onOpenTrade && onOpenTrade(f)}
                      title={online ? 'Trade with friend' : 'Offline — can\'t trade'}>
                      <Icon id="trade" size={14} style={{verticalAlign:'middle', marginRight:4}}/>
                      Trade
                    </button>
                    <button className="btn sm ghost" onClick={() => remove(f.id)}
                      style={{ borderColor:'rgba(255,91,110,.4)', color:'#ff8a9a' }}
                      title="Remove friend">
                      <Icon id="x" size={12}/>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ModalShell>
    );
  }

  // ============== trading modal ==============
  function TradingModal({ friend, onClose, onOpenFriends, onCoinsChanged }) {
    const [selFriend, setSelFriend] = useState(friend);
    const [friends] = useState(D.getFriends());
    const [give, setGive] = useState(null); // { kind, item }
    const [wantRarity, setWantRarity] = useState('rare');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    // Build list of owned, non-starter items the player can offer
    const offerable = (() => {
      const out = [];
      for (const { id:kind, list } of D.COSMETIC_KINDS) {
        for (const it of list) {
          if (it.starter) continue;
          if (D.isOwned(kind, it.id, it)) out.push({ kind, item: it });
        }
      }
      return out;
    })();

    function send() {
      setError(''); setResult(null);
      if (!selFriend) { setError('Pick a friend first'); return; }
      if (!give)      { setError('Pick something to give'); return; }
      const r = D.executeTrade({
        friendId: selFriend.id, giveKind: give.kind, giveId: give.item.id, wantRarity,
      });
      if (!r.ok) { setError(r.msg); return; }
      setResult(r.got);
      onCoinsChanged && onCoinsChanged();
    }

    return (
      <ModalShell title="Trading" onClose={onClose}
        actions={<>
          <button className="btn ghost" onClick={onClose}>Close</button>
          <button className="btn" onClick={send}
            disabled={!selFriend || !give}>
            <Icon id="trade" size={14} style={{verticalAlign:'middle', marginRight:6}}/>
            Send Offer
          </button>
        </>}>
        <div className="col" style={{ gap:12 }}>
          <p style={{ color:'var(--ink-2)', fontSize:13, margin:0 }}>
            Offer a cosmetic to swap. You'll receive a random item of the chosen rarity.
            This is a local mock — no real multiplayer.
          </p>

          {/* friend select */}
          <Row label="Trade With">
            {friends.length === 0 ? (
              <button className="btn sm" onClick={() => { onClose(); onOpenFriends(); }}>
                Add a friend first
              </button>
            ) : (
              <div className="row" style={{ gap:6, flexWrap:'wrap' }}>
                {friends.map(f => (
                  <button key={f.id}
                    onClick={() => setSelFriend(f)}
                    className={`pill ${selFriend && selFriend.id === f.id ? 'on' : ''}`}
                    style={{ border:'none', cursor:'pointer' }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:f.color, display:'inline-block', marginRight:6 }}/>
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </Row>

          {/* what to give */}
          <Row label="You Give">
            <div className="scroll-x" style={{ paddingTop:2 }}>
              {offerable.length === 0 ? (
                <span style={{ color:'var(--ink-3)', fontSize:13 }}>
                  You have no non-starter cosmetics yet. Open crates first.
                </span>
              ) : offerable.map(({ kind, item }) => {
                const sel = give && give.kind === kind && give.item.id === item.id;
                const c = D.RARITY_COLOR[item.rarity];
                return (
                  <div key={kind + ':' + item.id}
                    onClick={() => setGive({ kind, item })}
                    className={`hat-tile ${sel ? 'on' : ''}`}
                    title={`${item.name} (${item.rarity})`}
                    style={{ borderColor: sel ? c : undefined,
                      boxShadow: sel ? `0 0 0 2px ${c}55` : undefined,
                      cursor:'pointer', position:'relative' }}>
                    <CratePreview kind={kind} item={item}/>
                    <div style={{
                      position:'absolute', bottom:4, right:4,
                      width:8, height:8, borderRadius:'50%',
                      background:c, boxShadow:'0 0 4px rgba(0,0,0,.6)'
                    }}/>
                  </div>
                );
              })}
            </div>
          </Row>

          {/* want rarity */}
          <Row label="Receive Rarity">
            <div className="seg">
              {D.RARITY_LIST.map(r => (
                <button key={r}
                  className={wantRarity === r ? 'on' : ''}
                  style={{ textTransform:'capitalize' }}
                  onClick={() => setWantRarity(r)}>{r}</button>
              ))}
            </div>
          </Row>

          {error && (
            <div style={{ padding:'8px 12px', borderRadius:8,
              background:'rgba(255,91,110,.12)', border:'1px solid #ff5b6e',
              color:'#ff8a9a', fontSize:13 }}>{error}</div>
          )}
          {result && (
            <div style={{ padding:14, borderRadius:12,
              background:`linear-gradient(180deg, ${D.RARITY_COLOR[result.item.rarity]}33, transparent)`,
              border:`2px solid ${D.RARITY_COLOR[result.item.rarity]}`,
              display:'flex', alignItems:'center', gap:14,
              boxShadow:`0 0 20px ${D.RARITY_COLOR[result.item.rarity]}44`,
            }}>
              <div style={{ width:56, height:56, borderRadius:10,
                background:'rgba(0,0,0,.4)', display:'grid', placeItems:'center' }}>
                <CratePreview kind={result.kind} item={result.item}/>
              </div>
              <div>
                <div className="mono" style={{ fontSize:10, letterSpacing:'.18em',
                  color: D.RARITY_COLOR[result.item.rarity], textTransform:'uppercase' }}>
                  {result.item.rarity} · {result.kind}
                </div>
                <div style={{ fontWeight:800, fontSize:18 }}>{result.item.name}</div>
                <div style={{ color:'var(--ink-3)', fontSize:12 }}>Trade complete!</div>
              </div>
            </div>
          )}
        </div>
      </ModalShell>
    );
  }

  // ============== codes modal ==============
  function CodesModal({ onClose, onCoinsChanged }) {
    const [input, setInput] = useState('');
    const [msg, setMsg] = useState({ ok:null, text:'' });
    const [admin, setAdminState] = useState(D.isAdmin());
    function submit() {
      const r = D.redeemCode(input);
      setMsg({ ok:r.ok, text:r.msg });
      if (r.ok) { setInput(''); setAdminState(D.isAdmin()); onCoinsChanged && onCoinsChanged(); }
    }
    return (
      <ModalShell title="Redeem a code" onClose={onClose}
        actions={<>
          <button className="btn ghost" onClick={onClose}>Close</button>
          <button className="btn" onClick={submit} disabled={!input.trim()}>
            <Icon id="check" size={14} style={{verticalAlign:'middle', marginRight:6}}/>Redeem
          </button>
        </>}>
        <div className="col" style={{ gap:12 }}>
          <p style={{ color:'var(--ink-2)', fontSize:13, margin:0, lineHeight:1.5 }}>
            Type a code to claim a bonus. Each coin code is one-time-use per browser.
          </p>
          <div className="row" style={{ gap:8 }}>
            <input type="text" value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              style={{ flex:1, textTransform:'uppercase', letterSpacing:'.18em', fontWeight:700 }} />
          </div>
          {msg.text && (
            <div style={{
              padding:'8px 12px', borderRadius:8,
              background: msg.ok ? 'rgba(91,255,138,.12)' : 'rgba(255,91,110,.12)',
              border: '1px solid ' + (msg.ok ? '#5bff8a' : '#ff5b6e'),
              color: msg.ok ? '#a8ffbf' : '#ff8a9a',
              fontSize:13,
            }}>{msg.text}</div>
          )}
          {admin && (
            <div style={{
              padding:'8px 12px', borderRadius:8,
              background:'rgba(255,181,71,.12)', border:'1px solid #ffb547',
              color:'#ffd76a', fontSize:13, fontWeight:700,
            }}>
              ADMIN MODE: ON · Infinite coins. Type <span className="kbd">RESETADMIN</span> to turn off.
            </div>
          )}
          <div className="panel" style={{ padding:12, fontSize:12, color:'var(--ink-3)' }}>
            <div style={{ marginBottom:6, fontWeight:700, color:'var(--ink-2)', letterSpacing:'.12em', textTransform:'uppercase' }}>Hint</div>
            Try <span className="kbd">WELCOME</span> for a starter bonus.
          </div>
        </div>
      </ModalShell>
    );
  }

  // Detailed profile-avatar disc: glossy gradient with halo, beveled ring,
  // online indicator dot, and a soft inner highlight. Same visual recipe at
  // every size — the chip avatar (small), the login list (medium) and the
  // profile modal hero (large) all look polished.
  function ProfileAvatar({ name, size = 40 }) {
    const avatar = D.getAvatar(name);
    const initial = (name || '?').slice(0, 1).toUpperCase();
    const customPic = D.getCustomAvatar ? D.getCustomAvatar(name) : null;
    const ringW = Math.max(2, size * 0.07);
    return (
      <div style={{
        width:size, height:size, position:'relative', flexShrink:0,
      }}>
        {/* halo glow */}
        <div style={{
          position:'absolute', inset:`-${size*0.12}px`, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(160,123,255,.55) 0%, rgba(160,123,255,0) 70%)',
          pointerEvents:'none',
        }}/>
        {/* outer ring */}
        <div style={{
          position:'absolute', inset:0, borderRadius:'50%',
          background:'conic-gradient(from 220deg, #ffd76a, #ff9a3c, #a07bff, #5cf6ff, #5bff8a, #ffd76a)',
          padding: ringW,
          boxShadow:'0 4px 16px rgba(0,0,0,.45), inset 0 1px 2px rgba(255,255,255,.4)',
        }}>
          <div style={{
            width:'100%', height:'100%', borderRadius:'50%',
            background:'radial-gradient(circle at 30% 25%, #c9aaff 0%, #a07bff 30%, #5b3ed8 70%, #2a1b78 100%)',
            display:'grid', placeItems:'center',
            color:'#fff', fontFamily:"'Bebas Neue'", fontSize:size * 0.5,
            textShadow:'0 2px 4px rgba(0,0,0,.5), 0 0 8px rgba(255,255,255,.2)',
            position:'relative', overflow:'hidden',
          }}>
            {/* inner highlight crescent (gives a glossy 3D look) */}
            <div style={{
              position:'absolute', top: -size*0.4, left: -size*0.4,
              width: size, height: size, borderRadius:'50%',
              background:'radial-gradient(circle, rgba(255,255,255,.45) 0%, rgba(255,255,255,0) 60%)',
              pointerEvents:'none',
            }}/>
            {/* custom uploaded/drawn picture (top priority), else emoji / initial */}
            {customPic ? (
              <img src={customPic} alt=""
                style={{
                  position:'absolute', inset:0, width:'100%', height:'100%',
                  objectFit:'cover', borderRadius:'50%', zIndex:2,
                }}/>
            ) : (
              <span style={{ position:'relative', zIndex:2, lineHeight:1, transform:'translateY(2%)' }}>
                {avatar || initial}
              </span>
            )}
            {/* bottom shine */}
            <div style={{
              position:'absolute', bottom: -size*0.1, left:'10%', right:'10%', height: size*0.25,
              background:'radial-gradient(ellipse at center, rgba(255,255,255,.18) 0%, rgba(255,255,255,0) 70%)',
              borderRadius:'50%', pointerEvents:'none',
            }}/>
          </div>
        </div>
        {/* online-style indicator dot */}
        <div style={{
          position:'absolute', bottom: 0, right: 0,
          width: Math.max(8, size*0.22), height: Math.max(8, size*0.22),
          borderRadius:'50%',
          background:'#5bff8a',
          border: `${Math.max(1.5, size*0.05)}px solid #1a0e22`,
          boxShadow:'0 0 6px rgba(91,255,138,.7)',
        }}/>
      </div>
    );
  }

  // Tiny editor: text input + Save button. The display name is namespaced per
  // user via D.setDisplayName(user, name). onSave is called after persisting.
  function DisplayNameEditor({ active, onSave }) {
    const [value, setValue] = useState(() => D.getDisplayName(active) === active ? '' : D.getDisplayName(active));
    const [saved, setSaved] = useState(false);
    function save() {
      D.setDisplayName(active, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
      if (onSave) onSave();
    }
    return (
      <div>
        <div className="row" style={{ gap:8 }}>
          <input type="text" maxLength={24}
            placeholder={`Default: ${active}`}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            style={{ flex:1 }}/>
          <button className="btn sm" onClick={save}>
            <Icon id="check" size={12}/> {saved ? 'Saved' : 'Save'}
          </button>
        </div>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:4 }}>
          Shown in chat, friends list, and the top bar. Leave blank to use your username.
        </div>
      </div>
    );
  }

  // Upload a file OR draw a freehand picture — both produce a data URL that
  // becomes the active profile's custom avatar.
  function CustomAvatarEditor({ active, onChange }) {
    const fileRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const current = D.getCustomAvatar(active);
    function onFile(ev) {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      if (f.size > 1.5 * 1024 * 1024) { alert('Pick an image under 1.5 MB.'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        // Re-encode through a canvas so the image is normalised + downsized to
        // 256×256 max, keeping localStorage happy.
        const img = new Image();
        img.onload = () => {
          const size = 256;
          const c = document.createElement('canvas');
          c.width = size; c.height = size;
          const ctx = c.getContext('2d');
          // contain — fill bg, scale, center
          ctx.fillStyle = '#1a0e22';
          ctx.fillRect(0, 0, size, size);
          const k = Math.min(size / img.width, size / img.height);
          const w = img.width * k, h = img.height * k;
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          D.setCustomAvatar(active, c.toDataURL('image/png'));
          onChange && onChange();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(f);
    }
    function clearPic() {
      D.setCustomAvatar(active, null);
      onChange && onChange();
    }
    return (
      <div>
        <div className="row" style={{ gap:8, flexWrap:'wrap' }}>
          <button className="btn sm" onClick={() => fileRef.current && fileRef.current.click()}>
            <Icon id="check" size={12}/> Upload Image
          </button>
          <input ref={fileRef} type="file" accept="image/*"
            onChange={onFile} style={{ display:'none' }}/>
          <button className="btn sm" onClick={() => setDrawing(true)}>
            <Icon id="check" size={12}/> Draw…
          </button>
          {current && (
            <button className="btn sm ghost" onClick={clearPic}
              style={{ borderColor:'rgba(255,91,110,.5)', color:'#ff8a9a' }}>
              <Icon id="x" size={12}/> Clear
            </button>
          )}
        </div>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:4 }}>
          Replaces the emoji avatar. Stored locally — 256×256 max.
        </div>
        {drawing && (
          <DrawAvatarModal active={active} onClose={() => setDrawing(false)}
            onSave={() => { setDrawing(false); onChange && onChange(); }} />
        )}
      </div>
    );
  }

  // Modal with a 256×256 drawing canvas + colour swatches + brush sizes.
  // Saves to D.setCustomAvatar(active, dataURL).
  function DrawAvatarModal({ active, onSave, onClose }) {
    const canvasRef = useRef(null);
    const [color, setColor] = useState('#ffd76a');
    const [brush, setBrush] = useState(6);
    useEffect(() => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#1a0e22';
      ctx.fillRect(0, 0, c.width, c.height);
      let drawing = false, lastX = 0, lastY = 0;
      function pos(e) {
        const r = c.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return { x: (t.clientX - r.left) * (c.width / r.width),
                 y: (t.clientY - r.top) * (c.height / r.height) };
      }
      function down(e) { e.preventDefault(); drawing = true; const p = pos(e); lastX = p.x; lastY = p.y; }
      function move(e) {
        if (!drawing) return;
        e.preventDefault();
        const p = pos(e);
        ctx.strokeStyle = color; ctx.lineWidth = brush;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
        lastX = p.x; lastY = p.y;
      }
      function up() { drawing = false; }
      c.addEventListener('mousedown', down);
      c.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      c.addEventListener('touchstart', down, { passive:false });
      c.addEventListener('touchmove', move, { passive:false });
      window.addEventListener('touchend', up);
      return () => {
        c.removeEventListener('mousedown', down);
        c.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        c.removeEventListener('touchstart', down);
        c.removeEventListener('touchmove', move);
        window.removeEventListener('touchend', up);
      };
    }, [color, brush]);
    function clear() {
      const c = canvasRef.current; const ctx = c.getContext('2d');
      ctx.fillStyle = '#1a0e22';
      ctx.fillRect(0, 0, c.width, c.height);
    }
    function save() {
      const c = canvasRef.current;
      D.setCustomAvatar(active, c.toDataURL('image/png'));
      onSave && onSave();
    }
    const palette = ['#ffd76a','#ff9a3c','#ff5b6e','#a07bff','#5cf6ff','#5bff8a','#fff','#1a0e22'];
    return (
      <div style={{ position:'fixed', inset:0, zIndex:120,
        background:'rgba(0,0,0,.7)', display:'grid', placeItems:'center', padding:14 }}>
        <div className="panel" style={{ width:'min(380px,94vw)' }}>
          <div className="row" style={{ justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div className="title-art" style={{ fontSize:24 }}>DRAW</div>
            <button className="btn sm ghost" onClick={onClose}>
              <Icon id="x" size={12}/> Cancel
            </button>
          </div>
          <canvas ref={canvasRef} width={256} height={256}
            style={{ width:'100%', height:'auto', aspectRatio:'1', display:'block',
                     borderRadius:8, border:'2px solid var(--line-2)',
                     touchAction:'none', cursor:'crosshair', background:'#1a0e22' }}/>
          <div className="row" style={{ gap:6, marginTop:10, flexWrap:'wrap', alignItems:'center' }}>
            {palette.map(c => (
              <button key={c} onClick={() => setColor(c)}
                style={{ width:28, height:28, borderRadius:'50%', background:c,
                  border: `3px solid ${color === c ? 'var(--fire-2)' : 'rgba(255,255,255,.15)'}`,
                  cursor:'pointer' }}/>
            ))}
            <div style={{ width:1, height:24, background:'var(--line)' }}/>
            {[3, 6, 10, 16].map(b => (
              <button key={b} onClick={() => setBrush(b)}
                style={{ width:28, height:28, borderRadius:6,
                  background: brush === b ? 'rgba(255,154,60,.2)' : 'rgba(255,255,255,.04)',
                  border: `1.5px solid ${brush === b ? 'var(--fire-2)' : 'var(--line)'}`,
                  cursor:'pointer', display:'grid', placeItems:'center' }}>
                <div style={{ width:b, height:b, borderRadius:'50%', background:'var(--ink)' }}/>
              </button>
            ))}
          </div>
          <div className="row" style={{ gap:8, marginTop:10, justifyContent:'flex-end' }}>
            <button className="btn sm ghost" onClick={clear}>
              <Icon id="x" size={12}/> Clear
            </button>
            <button className="btn" onClick={save}
              style={{ background:'linear-gradient(180deg, var(--fire-2), var(--fire-1))', color:'#fff' }}>
              <Icon id="check" size={14} style={{verticalAlign:'middle', marginRight:6}}/> Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Compact swatch row + "any colour" hex input. Saves into D.setPlayerColor.
  function StickmanColorPicker({ active, onChange }) {
    const cur = D.getPlayerColor(active) || '#5cf6ff';
    const palette = ['#5cf6ff','#5bff8a','#ffd76a','#ff9a3c','#ff5b6e','#a07bff','#ffffff','#1a0e22'];
    function pick(c) {
      D.setPlayerColor(active, c);
      onChange && onChange();
    }
    return (
      <div className="row" style={{ gap:6, alignItems:'center', flexWrap:'wrap' }}>
        {palette.map(c => (
          <button key={c} onClick={() => pick(c)}
            style={{ width:30, height:30, borderRadius:'50%', background:c,
              border:`3px solid ${cur.toLowerCase() === c.toLowerCase() ? 'var(--fire-2)' : 'rgba(255,255,255,.15)'}`,
              cursor:'pointer', boxShadow:'0 2px 6px rgba(0,0,0,.4)' }}/>
        ))}
        <input type="color" value={cur} onChange={e => pick(e.target.value)}
          style={{ width:36, height:30, padding:0, border:'1px solid var(--line)',
                   borderRadius:6, background:'transparent', cursor:'pointer' }}/>
        <div style={{ fontSize:11, color:'var(--ink-3)' }}>Used as your fight color</div>
      </div>
    );
  }

  // PLAY QUEUE — Fortnite-style mode-select panel. Big hero card with the
  // currently-selected match on the left, the queue line-up on the right, and
  // a chunky PLAY button below. Plus mode pills + Random + Host code.
  function QueueModal({ queue, settings, onClose, onAdd, onRemove, onClear, onAddRandom }) {
    const MODES = [
      { id:'fight',   label:'Stick Fight' },
      { id:'sumo',    label:'Sumo Push' },
      { id:'koth',    label:'King of the Hill' },
      { id:'bomb',    label:'Bomb Tag' },
      { id:'last',    label:'Last Stand' },
      { id:'parkour', label:'Parkour Race' },
      { id:'golf',    label:'Mini Golf' },
      { id:'td',      label:'Tower Defense' },
    ];
    const [pickedMode, setPickedMode] = useState(settings.mode || 'fight');
    const [pickedMap, setPickedMap] = useState('random');
    const modeLabel = (id) => (MODES.find(m => m.id === id) || {}).label || id;
    // Mode colors / banners — feels like a Fortnite "play" lobby tile.
    const MODE_COLORS = {
      fight:   { hue: '#ff5b6e', tag: 'BRAWL' },
      sumo:    { hue: '#ffd76a', tag: 'PUSH' },
      koth:    { hue: '#a07bff', tag: 'CONTROL' },
      bomb:    { hue: '#ff9a3c', tag: 'TAG' },
      last:    { hue: '#7c5cff', tag: 'SURVIVE' },
      parkour: { hue: '#5cf6ff', tag: 'RACE' },
      golf:    { hue: '#5bff8a', tag: 'STROKES' },
      td:      { hue: '#ff7a3c', tag: 'DEFEND' },
    };
    const upNext = queue[0] || { mode: pickedMode, tdMapId: pickedMode === 'td' ? pickedMap : undefined };
    const nextColor = MODE_COLORS[upNext.mode] || { hue:'#5cf6ff', tag:'MATCH' };
    const tdNameFor = (id) => id && id !== 'random'
      ? ((G.TD_MAP_THEMES && G.TD_MAP_THEMES[id] && G.TD_MAP_THEMES[id].name) || id) : null;
    // Stable per-session host code so it reads like a real lobby code.
    const hostCode = React.useMemo(() => {
      try {
        let c = localStorage.getItem('sf_host_code_v1');
        if (!c) {
          c = '';
          const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          for (let i = 0; i < 6; i++) c += ch[Math.floor((D.getUser().charCodeAt(i % D.getUser().length) + i * 7) % ch.length)];
          localStorage.setItem('sf_host_code_v1', c);
        }
        return c;
      } catch(e) { return 'HOST01'; }
    }, []);
    function copyCode() {
      try { navigator.clipboard && navigator.clipboard.writeText(hostCode); } catch(e){}
    }
    return (
      <div style={{ position:'fixed', inset:0, zIndex:90,
        background:'rgba(2,4,12,.82)', display:'grid', placeItems:'center',
        padding:14, overflowY:'auto', backdropFilter:'blur(4px)' }}>
        <div className="panel" style={{
          width:'min(820px, 96vw)', maxHeight:'94vh', overflowY:'auto',
          padding:0,
          background:'linear-gradient(160deg, rgba(20,10,40,.95), rgba(8,4,18,.97))',
          border:'2px solid rgba(92,246,255,.25)',
        }}>
          {/* HEADER */}
          <div className="row" style={{
            justifyContent:'space-between', alignItems:'center',
            padding:'14px 20px', borderBottom:'1px solid var(--line)',
            background:'linear-gradient(90deg, rgba(92,246,255,.12), transparent 70%)',
          }}>
            <div>
              <div className="title-art" style={{ fontSize:32, lineHeight:.85 }}>PLAY QUEUE</div>
              <div className="title-sub">Pick. Queue. Crush.</div>
            </div>
            <button className="btn sm ghost" onClick={onClose}>
              <Icon id="x" size={12}/> Close
            </button>
          </div>

          <div style={{ padding:'14px 20px 18px' }}>
            {/* ===== FORTNITE-STYLE HERO CARD ===== */}
            <div style={{
              position:'relative', overflow:'hidden', borderRadius:14,
              border:`3px solid ${nextColor.hue}`,
              background:`linear-gradient(120deg, ${nextColor.hue}33 0%, rgba(8,4,18,.95) 60%)`,
              padding:'22px 22px',
              display:'grid', gridTemplateColumns:'1fr auto', gap:14,
              boxShadow:`0 8px 32px ${nextColor.hue}44`,
              marginBottom:14,
            }}>
              {/* Decorative diagonal stripes (Fortnite vibe) */}
              <div style={{
                position:'absolute', top:0, right:0, bottom:0, width:160,
                background:`repeating-linear-gradient(135deg, ${nextColor.hue}33 0 6px, transparent 6px 16px)`,
                opacity:0.6, pointerEvents:'none',
              }}/>
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{
                  fontSize:11, color:nextColor.hue, letterSpacing:'.25em',
                  fontWeight:800, marginBottom:4,
                }}>
                  {queue.length > 0 ? '▸ UP NEXT' : '▸ NOW PLAYING'} · {nextColor.tag}
                </div>
                <div className="title-art" style={{ fontSize:46, lineHeight:.85, marginBottom:8 }}>
                  {modeLabel(upNext.mode).toUpperCase()}
                </div>
                {tdNameFor(upNext.tdMapId) && (
                  <div style={{ fontSize:14, color:'#fff', opacity:.8 }}>
                    on <strong style={{ color:nextColor.hue }}>{tdNameFor(upNext.tdMapId)}</strong>
                  </div>
                )}
                <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:10 }}>
                  Queue: <strong style={{ color:'#fff' }}>{queue.length}</strong> match{queue.length === 1 ? '' : 'es'} lined up
                </div>
              </div>
              {/* Big mode-color disc */}
              <div style={{
                width:90, height:90, borderRadius:'50%',
                background:`radial-gradient(circle at 30% 25%, #fff 0%, ${nextColor.hue} 50%, ${nextColor.hue}66 100%)`,
                boxShadow:`0 0 32px ${nextColor.hue}88`,
                display:'grid', placeItems:'center',
                position:'relative', zIndex:1,
              }}>
                <Icon id="play" size={42} color="#fff"/>
              </div>
            </div>

            {/* ===== MODE TILE GRID — pick what to add ===== */}
            <div style={{ fontSize:11, color:'var(--ink-3)', letterSpacing:'.2em', marginBottom:8 }}>
              CHANGE GAME MODE
            </div>
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(118px, 1fr))',
              gap:8, marginBottom:14,
            }}>
              {MODES.map(m => {
                const c = MODE_COLORS[m.id] || { hue:'#5cf6ff', tag:'MATCH' };
                const on = pickedMode === m.id;
                return (
                  <button key={m.id} onClick={() => setPickedMode(m.id)}
                    style={{
                      position:'relative', cursor:'pointer',
                      padding:'14px 10px 10px', borderRadius:10,
                      background: on
                        ? `linear-gradient(160deg, ${c.hue}44, ${c.hue}11)`
                        : 'rgba(255,255,255,.03)',
                      border: `2px solid ${on ? c.hue : 'var(--line)'}`,
                      color: on ? '#fff' : 'var(--ink-2)',
                      textAlign:'left',
                      boxShadow: on ? `0 4px 20px ${c.hue}55` : 'none',
                      transition:'transform .12s ease',
                      transform: on ? 'translateY(-2px)' : 'none',
                    }}>
                    <div style={{
                      width:28, height:28, borderRadius:6,
                      background:`linear-gradient(140deg, ${c.hue}, ${c.hue}99)`,
                      display:'grid', placeItems:'center', marginBottom:6,
                    }}>
                      <Icon id="play" size={16} color="#fff"/>
                    </div>
                    <div style={{ fontFamily:"'Bebas Neue'", fontSize:16, letterSpacing:'.05em' }}>
                      {m.label.toUpperCase()}
                    </div>
                    <div style={{ fontSize:10, color:c.hue, letterSpacing:'.18em', marginTop:2 }}>
                      {c.tag}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* TD-specific map subpicker (only when TD is the picked mode) */}
            {pickedMode === 'td' && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:'var(--ink-3)', letterSpacing:'.2em', marginBottom:6 }}>
                  TD MAP
                </div>
                <div className="row" style={{ flexWrap:'wrap', gap:6 }}>
                  <button onClick={() => setPickedMap('random')}
                    className={`pill ${pickedMap === 'random' ? 'on' : ''}`}
                    style={{ border:'none', cursor:'pointer' }}>Random</button>
                  {(G.TD_PATH_IDS || []).map(id => {
                    const theme = (G.TD_MAP_THEMES || {})[id] || {};
                    return (
                      <button key={id} onClick={() => setPickedMap(id)}
                        className={`pill ${pickedMap === id ? 'on' : ''}`}
                        style={{ border:'none', cursor:'pointer' }}>
                        {theme.name || id}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== ADD ROW ===== */}
            <div className="row" style={{ gap:10, marginBottom:14, flexWrap:'wrap' }}>
              <button className="btn"
                style={{ flex:1, minWidth:160, padding:'12px 18px', fontSize:16, fontFamily:"'Bebas Neue'", letterSpacing:'.08em' }}
                onClick={() => {
                  const item = { mode: pickedMode };
                  if (pickedMode === 'td') item.tdMapId = pickedMap;
                  onAdd(item);
                }}>
                <Icon id="check" size={14} style={{verticalAlign:'middle', marginRight:6}}/>
                + ADD TO QUEUE
              </button>
              <button className="btn" onClick={onAddRandom}
                style={{
                  flex:1, minWidth:160, padding:'12px 18px', fontSize:16,
                  background:'linear-gradient(180deg, #5cf6ff, #2a7bff)', color:'#001428',
                  fontFamily:"'Bebas Neue'", letterSpacing:'.08em',
                }}>
                <Icon id="sparkle" size={14} style={{verticalAlign:'middle', marginRight:6}}/>
                + RANDOM
              </button>
            </div>

            {/* ===== HOST / INVITE CODE ===== */}
            <div className="section-card" style={{
              marginBottom:14,
              background:'linear-gradient(90deg, rgba(255,154,60,.10), transparent 70%)',
              border:'1.5px solid rgba(255,154,60,.35)',
            }}>
              <div className="row" style={{ alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{
                  width:42, height:42, borderRadius:8,
                  background:'linear-gradient(140deg, var(--fire-2), var(--fire-1))',
                  display:'grid', placeItems:'center', color:'#fff',
                  fontFamily:"'Bebas Neue'", fontSize:22,
                }}>H</div>
                <div style={{ flex:1, minWidth:120 }}>
                  <div style={{ fontSize:10, color:'var(--ink-3)', letterSpacing:'.2em' }}>HOSTING</div>
                  <div style={{ fontFamily:"'Bebas Neue'", fontSize:24, letterSpacing:'.15em', color:'#ffd76a' }}>
                    {hostCode}
                  </div>
                  <div style={{ fontSize:11, color:'var(--ink-3)' }}>
                    Share with friends so they can join your queue
                  </div>
                </div>
                <button className="btn sm" onClick={copyCode}>
                  <Icon id="check" size={12} style={{verticalAlign:'middle', marginRight:4}}/>
                  Copy code
                </button>
              </div>
            </div>

            {/* ===== UP NEXT LIST ===== */}
            <div className="section-card">
              <div className="row" style={{ justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div className="sc-h" style={{ margin:0 }}>Up next ({queue.length})</div>
                {queue.length > 0 && (
                  <button className="btn sm ghost" onClick={onClear}
                    style={{ borderColor:'rgba(255,91,110,.5)', color:'#ff8a9a' }}>
                    <Icon id="x" size={11}/> Clear all
                  </button>
                )}
              </div>
              {queue.length === 0 ? (
                <div style={{ color:'var(--ink-3)', fontSize:13, padding:'10px 0', textAlign:'center' }}>
                  Empty for now. Add matches above — they auto-play after each result.
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {queue.map((q, i) => {
                    const c = MODE_COLORS[q.mode] || { hue:'#5cf6ff', tag:'MATCH' };
                    return (
                      <div key={i} className="row" style={{
                        gap:10, alignItems:'center', padding:'8px 10px',
                        background:`linear-gradient(90deg, ${c.hue}18, rgba(255,255,255,.02))`,
                        borderRadius:8,
                        border:`1.5px solid ${c.hue}55`,
                      }}>
                        <div style={{
                          width:30, height:30, borderRadius:6,
                          background:`linear-gradient(140deg, ${c.hue}, ${c.hue}99)`,
                          color:'#fff',
                          display:'grid', placeItems:'center', fontWeight:800, fontSize:14,
                        }}>{i+1}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontFamily:"'Bebas Neue'", fontSize:16, letterSpacing:'.05em' }}>
                            {modeLabel(q.mode).toUpperCase()}
                          </div>
                          {tdNameFor(q.tdMapId) && (
                            <div style={{ fontSize:11, color:c.hue }}>
                              {tdNameFor(q.tdMapId)}
                            </div>
                          )}
                        </div>
                        <button className="btn sm ghost" onClick={() => onRemove(i)}
                          style={{ padding:'4px 8px' }}>
                          <Icon id="x" size={11}/>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ProfileModal({ onClose, onSwitch, onLogout }) {
    const [active, setActive] = useState(D.getUser());
    const [newName, setNewName] = useState('');
    const [newPw, setNewPw] = useState('');
    const [newAvatar, setNewAvatar] = useState(null);
    const [pwPrompt, setPwPrompt] = useState(null); // { name, input, error }
    const [editPw, setEditPw] = useState('');       // change password for active
    const users = D.listUsers();
    const [, force] = useState(0);
    const rerender = () => force(n => n + 1);

    function pickUser(name) {
      if (D.hasPassword(name) && name !== active) {
        setPwPrompt({ name, input:'', error:'' });
        return;
      }
      D.setUser(name);
      setActive(name);
      onSwitch && onSwitch();
    }
    function tryPassword() {
      if (!pwPrompt) return;
      if (D.verifyPassword(pwPrompt.name, pwPrompt.input)) {
        D.setUser(pwPrompt.name);
        setActive(pwPrompt.name);
        setPwPrompt(null);
        onSwitch && onSwitch();
      } else {
        setPwPrompt({ ...pwPrompt, error:'Wrong password' });
      }
    }
    function createUser() {
      const clean = (newName || '').trim().slice(0, 20);
      if (!clean) return;
      D.setUser(clean);
      if (newPw) D.setPassword(clean, newPw);
      if (newAvatar) D.setAvatar(clean, newAvatar);
      setActive(clean);
      setNewName(''); setNewPw(''); setNewAvatar(null);
      onSwitch && onSwitch();
    }
    function removeUser(name) {
      if (name === active) return;
      if (!confirm(`Delete profile "${name}" and all of its progress?`)) return;
      D.deleteUser(name);
      setActive(D.getUser());
      rerender();
    }
    function applyEdit() {
      D.setPassword(active, editPw || '');
      setEditPw('');
      rerender();
    }
    function changeAvatar(emoji) {
      D.setAvatar(active, emoji);
      rerender();
    }

    return (
      <div style={{ position:'fixed', inset:0, zIndex:50,
        background:'rgba(0,0,0,.6)', display:'grid', placeItems:'center', backdropFilter:'blur(4px)' }}>
        <div className="panel" style={{ width:'min(560px,94vw)', maxHeight:'90vh', overflowY:'auto' }}>
          <div className="row" style={{ justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div>
              <div className="title-art" style={{ fontSize:'clamp(28px,3.4vw,42px)', lineHeight:1 }}>PROFILES</div>
              <div style={{ color:'var(--ink-2)', fontSize:13, marginTop:4 }}>
                Each profile keeps its own coins, cosmetics, friends, and progress.
              </div>
            </div>
            <button className="btn ghost sm" onClick={onClose}>
              <Icon id="x" size={14}/>
            </button>
          </div>

          {/* Active profile + avatar/password edit */}
          <div className="section-card" style={{ marginBottom:10 }}>
            <div className="sc-h">Active</div>
            <div className="row" style={{ gap:10, alignItems:'center', marginBottom:10 }}>
              <ProfileAvatar name={active} size={44}/>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:18 }}>{active}</div>
                <div style={{ fontSize:11, color:'var(--ink-3)' }}>
                  {D.getCoins().toLocaleString()} coins · {D.getOwned().size} owned · {D.hasPassword(active) ? '🔒 password set' : '🔓 no password'}
                </div>
              </div>
            </div>
            {/* Display name editor — cosmetic alias shown in the chip + everywhere
                the player's name is rendered. Username is the unchangeable login id. */}
            <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.15em', marginBottom:6 }}>
              Display name
            </div>
            <DisplayNameEditor active={active} onSave={() => { setActive(D.getUser()); }}/>
            <div style={{ height:10 }}/>
            {/* Custom profile picture — upload from disk or draw freehand. */}
            <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.15em', marginBottom:6 }}>
              Custom picture
            </div>
            <CustomAvatarEditor active={active} onChange={() => setActive(D.getUser())}/>
            <div style={{ height:10 }}/>
            {/* Stickman color — applied to the player's character in fights. */}
            <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.15em', marginBottom:6 }}>
              Stickman color
            </div>
            <StickmanColorPicker active={active} onChange={() => setActive(D.getUser())}/>
            <div style={{ height:10 }}/>
            {/* Avatar picker */}
            <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.15em', marginBottom:6 }}>Avatar</div>
            <div className="row" style={{ gap:4, flexWrap:'wrap', marginBottom:10 }}>
              {D.AVATARS.map(emoji => (
                <button key={emoji}
                  onClick={() => changeAvatar(emoji)}
                  style={{ width:36, height:36, fontSize:20, borderRadius:8,
                    background: D.getAvatar(active) === emoji ? 'rgba(255,154,60,.2)' : 'rgba(255,255,255,.04)',
                    border: `1.5px solid ${D.getAvatar(active) === emoji ? 'var(--fire-2)' : 'var(--line)'}`,
                    cursor:'pointer' }}>
                  {emoji}
                </button>
              ))}
              <button onClick={() => changeAvatar(null)}
                style={{ width:36, height:36, fontSize:14, borderRadius:8,
                  background: !D.getAvatar(active) ? 'rgba(255,154,60,.2)' : 'rgba(255,255,255,.04)',
                  border: `1.5px solid ${!D.getAvatar(active) ? 'var(--fire-2)' : 'var(--line)'}`,
                  cursor:'pointer', color:'var(--ink)' }}>
                {active.slice(0,1).toUpperCase()}
              </button>
            </div>
            {/* Password edit */}
            <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.15em', marginBottom:6 }}>
              Password {D.hasPassword(active) ? '(change or clear)' : '(optional)'}
            </div>
            <div className="row" style={{ gap:8 }}>
              <input type="password" placeholder={D.hasPassword(active) ? '••••••' : 'No password'}
                value={editPw}
                onChange={e => setEditPw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyEdit()}
                style={{ flex:1 }}/>
              <button className="btn sm" onClick={applyEdit}>
                <Icon id="check" size={12}/> Save
              </button>
            </div>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:4 }}>
              Local-only (not real account security). Leave blank + Save to remove password.
            </div>
          </div>

          {/* Quick Log Out — kicks back to the login screen. */}
          {onLogout && (
            <div style={{ marginBottom:10, textAlign:'right' }}>
              <button className="btn sm ghost" onClick={onLogout}
                style={{ borderColor:'rgba(255,91,110,.5)', color:'#ff8a9a' }}>
                <Icon id="back" size={12} style={{verticalAlign:'middle', marginRight:6}}/>
                Log Out
              </button>
            </div>
          )}

          {/* Switcher */}
          <div className="section-card" style={{ marginBottom:10 }}>
            <div className="sc-h">Switch profile</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {users.map(u => (
                <div key={u} className="row" style={{ gap:8, alignItems:'center',
                  padding:'6px 10px', background: u === active ? 'rgba(255,154,60,.15)' : 'rgba(255,255,255,.04)',
                  border:`1px solid ${u === active ? 'var(--fire-2)' : 'var(--line)'}`,
                  borderRadius:8 }}>
                  <ProfileAvatar name={u} size={32}/>
                  <div style={{ flex:1, fontWeight:600 }}>
                    {u} {D.hasPassword(u) && <span style={{ fontSize:10, color:'var(--ink-3)' }}> 🔒</span>}
                  </div>
                  {u !== active && (
                    <button className="btn sm" onClick={() => pickUser(u)}>Use</button>
                  )}
                  {u !== active && users.length > 1 && (
                    <button className="btn sm ghost" onClick={() => removeUser(u)}
                      style={{ borderColor:'rgba(255,91,110,.5)', color:'#ff8a9a' }}>
                      <Icon id="x" size={12}/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Create new */}
          <div className="section-card" style={{ marginBottom:0 }}>
            <div className="sc-h">Create new profile</div>
            <div className="row" style={{ gap:8, marginBottom:8 }}>
              <input type="text" placeholder="Username (max 20)" value={newName}
                onChange={e => setNewName(e.target.value)}
                maxLength={20}
                style={{ flex:1 }}/>
              <input type="password" placeholder="Password (optional)" value={newPw}
                onChange={e => setNewPw(e.target.value)}
                style={{ flex:1 }}/>
            </div>
            <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.15em', marginBottom:6 }}>Pick an avatar</div>
            <div className="row" style={{ gap:4, flexWrap:'wrap', marginBottom:10 }}>
              {D.AVATARS.slice(0, 12).map(emoji => (
                <button key={emoji}
                  onClick={() => setNewAvatar(emoji)}
                  style={{ width:32, height:32, fontSize:18, borderRadius:6,
                    background: newAvatar === emoji ? 'rgba(255,154,60,.2)' : 'rgba(255,255,255,.04)',
                    border: `1.5px solid ${newAvatar === emoji ? 'var(--fire-2)' : 'var(--line)'}`,
                    cursor:'pointer' }}>
                  {emoji}
                </button>
              ))}
            </div>
            <div className="row">
              <button className="btn sm" disabled={!newName.trim()} onClick={createUser}>
                <Icon id="check" size={12}/> Create + use
              </button>
              <span style={{ fontSize:11, color:'var(--ink-3)', marginLeft:8 }}>
                Starts with 250 coins.
              </span>
            </div>
          </div>
        </div>

        {/* Password prompt overlay */}
        {pwPrompt && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)',
            display:'grid', placeItems:'center', zIndex:60 }}>
            <div className="panel" style={{ width:'min(380px,90vw)', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🔒</div>
              <div className="title-art" style={{ fontSize:28, marginBottom:4 }}>{pwPrompt.name.toUpperCase()}</div>
              <div style={{ color:'var(--ink-2)', fontSize:13, marginBottom:14 }}>Enter password to log in</div>
              <input type="password" autoFocus placeholder="Password"
                value={pwPrompt.input}
                onChange={e => setPwPrompt({ ...pwPrompt, input: e.target.value, error:'' })}
                onKeyDown={e => e.key === 'Enter' && tryPassword()}
                style={{ width:'100%', textAlign:'center', fontSize:16, padding:'10px 14px', marginBottom:8 }}/>
              {pwPrompt.error && (
                <div style={{ color:'#ff8a9a', fontSize:12, marginBottom:8 }}>{pwPrompt.error}</div>
              )}
              <div className="row" style={{ justifyContent:'center', gap:8 }}>
                <button className="btn ghost sm" onClick={() => setPwPrompt(null)}>Cancel</button>
                <button className="btn sm" onClick={tryPassword}>Log in</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function SettingsModal({ settings, onChange, onClose, onOpenCodes }) {
    const [muted, setMuted] = useState(() => localStorage.getItem('sf_muted') === '1');
    const toggleMuted = () => {
      const next = !muted;
      setMuted(next);
      localStorage.setItem('sf_muted', next ? '1' : '0');
    };
    function resetProgress() {
      if (!confirm("Reset everything? Deletes custom question sets, owned cosmetics, coins, codes, and preferences.")) return;
      ['sf_custom_sets', 'sf_ai_sets', 'sf_api_key', 'sf_muted',
       'sf_coins_v1', 'sf_owned_v1', 'sf_redeemed_v1', 'sf_admin_v1'].forEach(k => localStorage.removeItem(k));
      location.reload();
    }
    return (
      <ModalShell title="Settings" onClose={onClose}
        actions={<button className="btn" onClick={onClose}>Done</button>}>
        <div className="col" style={{ gap:12 }}>
          <Row label="Education Mode">
            <button className={`pill ${settings.edu ? 'on' : ''}`}
              style={{ border:'none', cursor:'pointer', gap:6 }}
              onClick={() => onChange({ ...settings, edu: !settings.edu })}>
              <Icon id={settings.edu ? 'check' : 'x'} size={14} />
              {settings.edu ? 'ON' : 'OFF'}
            </button>
            <span style={{ color:'var(--ink-2)', fontSize:13, marginLeft:10 }}>
              Questions between rounds. Correct answers unlock rare power-ups.
            </span>
          </Row>
          <Row label="Bot Difficulty">
            <div className="seg">
              {[
                { v:'easy',   t:'Easy' },
                { v:'normal', t:'Normal' },
                { v:'hard',   t:'Hard' },
              ].map(o => (
                <button key={o.v} className={settings.botDifficulty === o.v ? 'on' : ''}
                  onClick={() => onChange({ ...settings, botDifficulty: o.v })}>{o.t}</button>
              ))}
            </div>
          </Row>
          <Row label="First To Score">
            <div className="seg">
              {[3,5,7,10].map(n => (
                <button key={n} className={settings.target === n ? 'on' : ''}
                  onClick={() => onChange({ ...settings, target: n })}>{n}</button>
              ))}
            </div>
          </Row>
          <Row label="Sound">
            <button className={`pill ${!muted ? 'on' : ''}`}
              style={{ border:'none', cursor:'pointer', gap:6 }}
              onClick={toggleMuted}>
              <Icon id={!muted ? 'check' : 'x'} size={14} />
              {muted ? 'MUTED' : 'ON'}
            </button>
            <span style={{ color:'var(--ink-3)', fontSize:12, marginLeft:10 }}>
              SFX for punches, towers, jumps, wins.
            </span>
          </Row>
          <Row label="Codes">
            <button className="btn sm" onClick={() => { onClose(); onOpenCodes && onOpenCodes(); }}>
              <Icon id="sparkle" size={14} style={{verticalAlign:'middle', marginRight:6}}/>
              Redeem a code
            </button>
            <span style={{ color:'var(--ink-3)', fontSize:12, marginLeft:10 }}>
              Enter promo codes for coin bonuses.
            </span>
          </Row>
          <Row label="Reset">
            <button className="btn sm ghost" onClick={resetProgress}
              style={{ borderColor:'rgba(255,91,110,.5)', color:'#ff8a9a' }}>
              <Icon id="x" size={14} style={{verticalAlign:'middle', marginRight:6}}/>
              Reset all progress
            </button>
            <span style={{ color:'var(--ink-3)', fontSize:12, marginLeft:10 }}>
              Clears custom question sets + preferences.
            </span>
          </Row>
        </div>
      </ModalShell>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
