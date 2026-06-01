/* global React, ReactDOM, window */
// Top-level UI. All emojis removed; uses window.SFIcons.Icon for every glyph.

(function () {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  const D = window.GameData;
  const G = window.StickFightGame;
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
  function LaunchScreen({ settings, onChange, onPlay, onCreateSet, onDeleteSet, onOpenSettings, onOpenCrates, onOpenCodes, onOpenFriends, onOpenTrade, onOpenProfile, onPreviewSet, coins }) {
    const title = D.eduTitle(settings.edu);
    const sub = D.eduSub(settings.edu);
    const allSets = Q.allSets();
    const activeSet = allSets.find(s => s.id === settings.questionSetId) || allSets[0];

    const readyModes = D.MODES.filter(m => m.ready);
    const soonModes  = D.MODES.filter(m => !m.ready);
    const selectedMode = D.MODES.find(m => m.id === settings.mode) || readyModes[0];
    return (
      <div style={{ position:'absolute', inset:0, overflow:'auto', zIndex:2, padding:'16px 16px 32px' }}>
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
          onOpenTrade={onOpenTrade} onPreviewSet={onPreviewSet} />
      </div>
    );
  }

  // ============== NEW launch UI (refresh) ==============
  function NewLaunchUI({ settings, onChange, coins, title, sub, selectedMode,
    readyModes, soonModes, allSets, activeSet,
    onPlay, onCreateSet, onDeleteSet, onOpenSettings, onOpenCrates, onOpenCodes,
    onOpenFriends, onOpenTrade, onOpenProfile, onPreviewSet }) {
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
              label={D.getUser()} onClick={onOpenProfile} color="#a07bff"/>
            <Chip icon="gift"     label="Crates"   onClick={onOpenCrates}    color="#ff9a3c" glow/>
            <Chip icon="users"    label="Friends"  onClick={onOpenFriends}   color="#7bff8a"/>
            <Chip icon="trade"    label="Trade"    onClick={onOpenTrade}     color="#ffd84a"/>
            <Chip icon="sparkle"  label="Codes"    onClick={onOpenCodes}     color="#5bf0e8"/>
            <Chip icon="settings" label="Settings" onClick={onOpenSettings}/>
          </div>
        </div>

        {/* HERO STRIP: selected mode big banner */}
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
                    {(G.TD_PATH_IDS || []).map(id => (
                      <button key={id}
                        onClick={() => onChange({ ...settings, tdMapId: id })}
                        className={`pill ${settings.tdMapId === id ? 'on' : ''}`}
                        style={{ border:'none', cursor:'pointer', gap:6, textTransform:'uppercase' }}>
                        {id}
                      </button>
                    ))}
                  </div>
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
              <div className="sc-h">Education Mode</div>
              <button className={`pill ${settings.edu ? 'on' : ''}`}
                style={{ border:'none', cursor:'pointer', gap:6 }}
                onClick={() => onChange({ ...settings, edu: !settings.edu })}>
                <Icon id={settings.edu ? 'check' : 'x'} size={14} />
                {settings.edu ? 'ON · Questions between rounds' : 'OFF'}
              </button>
              {settings.edu && (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:10, letterSpacing:'.14em', color:'var(--ink-3)', textTransform:'uppercase', marginBottom:6 }}>
                    Question Set
                  </div>
                  <div className="row" style={{ gap:6, flexWrap:'wrap' }}>
                    {allSets.map(s => (
                      <span key={s.id} style={{ display:'inline-flex', alignItems:'stretch', borderRadius:999, overflow:'hidden' }}>
                        <button onClick={() => onChange({ ...settings, questionSetId: s.id })}
                          className={`pill ${activeSet.id === s.id ? 'on' : ''}`}
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
                    ))}
                  </div>
                  <div className="row" style={{ gap:6, marginTop:8 }}>
                    <button className="btn sm ghost" onClick={onCreateSet}>
                      <Icon id="plus" size={12} style={{verticalAlign:'middle', marginRight:4}}/>
                      New set
                    </button>
                    {activeSet && (activeSet.source === 'custom' || activeSet.source === 'ai') && (
                      <button className="btn sm ghost" onClick={() => onDeleteSet && onDeleteSet(activeSet)}
                        style={{ borderColor:'rgba(255,91,110,.5)', color:'#ff8a9a' }}>
                        <Icon id="x" size={12} style={{verticalAlign:'middle', marginRight:4}}/>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
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

  // ============== lobby ==============
  function Lobby({ profiles, onChange, onStart, onBack }) {
    const cols = Math.min(profiles.length, 4);
    return (
      <div className="center" style={{ padding:18, gap:12, zIndex:2, alignItems:'stretch', justifyContent:'flex-start', paddingTop:30 }}>
        <div style={{ textAlign:'center' }}>
          <div className="title-art" style={{ fontSize:'clamp(40px,7vw,80px)' }}>READY UP</div>
          <div className="title-sub">name · color · hat · outfit · face · trail</div>
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
  function MatchResults({ profiles, winner, mode, onPlayAgain, onMenu }) {
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
      try { sessionStorage.setItem('sf_logged_in_v1', '1'); } catch(e){}
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
              <div style={{ width:30, height:30, borderRadius:'50%',
                background:'linear-gradient(135deg, #a07bff, #5b3ed8)',
                display:'grid', placeItems:'center', color:'#fff',
                fontFamily:"'Bebas Neue'", fontSize:16 }}>
                {D.getAvatar(u) || u.slice(0,1).toUpperCase()}
              </div>
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
      try { sessionStorage.setItem('sf_logged_in_v1', '1'); } catch(e){}
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
    // First-run login gate: any session where the user hasn't explicitly logged
    // in shows the LoginScreen first. Cleared once they pick LOG IN or SIGN UP.
    const [needLogin, setNeedLogin] = useState(() => {
      try {
        // Returning users (have a saved list) must explicitly Log In this session.
        return !sessionStorage.getItem('sf_logged_in_v1');
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
      let count = 2;
      let lockedBots = [];
      switch (settings.players) {
        case '1v1bot': count = 2; lockedBots = [1]; break;
        case '2': count = 2; break;
        case '3': count = 3; break;
        case '4': count = 4; break;
      }
      const built = [];
      for (let i = 0; i < count; i++) {
        const c = D.PLAYER_COLORS[i];
        const isBot = lockedBots.includes(i);
        built.push({
          _slot: i, _score: 0, _target: settings.target,
          isBot, lockedBot: isBot,
          name: isBot ? `CPU ${i+1}` : `Player ${i+1}`,
          colorId: c.id, color: c.color, darkColor: c.dark,
          hatId: 'none',    hat:    D.HATS[0],
          outfitId: 'none', outfit: D.OUTFITS[0],
          faceId: 'default',face:   D.FACES[0],
          trailId: 'none',  trail:  D.TRAILS[0],
          buffs: [],
        });
      }
      setProfiles(built);
      setStage('lobby');
    }

    function startMatch() {
      setProfiles(profiles.map(p => ({ ...p, _score: 0, buffs: [] })));
      setStage('arena');
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
            onPlayAgain={() => { setMatchWinner(null); startMatch(); }}
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
              try { sessionStorage.removeItem('sf_logged_in_v1'); } catch(e){}
              setShowProfile(false);
              setNeedLogin(true);
              setStage('launch');
            }} />
        )}
        {showFriends && (
          <FriendsModal onClose={() => setShowFriends(false)}
            onOpenTrade={(f) => { setShowFriends(false); setTradeFriend(f); setShowTrade(true); }} />
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
  function FriendsModal({ onClose, onOpenTrade }) {
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

  function ProfileAvatar({ name, size = 40 }) {
    const avatar = D.getAvatar(name);
    const initial = (name || '?').slice(0, 1).toUpperCase();
    return (
      <div style={{ width:size, height:size, borderRadius:'50%',
        background:'linear-gradient(135deg, #a07bff, #5b3ed8)',
        display:'grid', placeItems:'center', color:'#fff',
        fontFamily:"'Bebas Neue'", fontSize:size * 0.55,
        flexShrink:0 }}>
        {avatar || initial}
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
