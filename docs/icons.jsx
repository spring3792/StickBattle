/* global React, window */
// Inline SVG icon library. No emojis anywhere in the UI come from this file.
// Every icon is hand-drawn paths inside a 24x24 viewBox unless noted.

window.SFIcons = (function () {
  const { createElement: h } = React;

  // tiny helper for creating an svg element
  function svg(props, ...kids) {
    const { size = 22, color = 'currentColor', stroke = 'currentColor', fill = 'none', strokeWidth = 1.8, ...rest } = props || {};
    return h('svg', {
      width: size, height: size, viewBox: '0 0 24 24',
      fill, stroke, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round',
      ...rest,
    }, ...kids);
  }
  function path(d, extra) { return h('path', { d, ...(extra||{}) }); }
  function circ(cx, cy, r, extra) { return h('circle', { cx, cy, r, ...(extra||{}) }); }
  function rect(x, y, w, h2, extra) { return h('rect', { x, y, width:w, height:h2, ...(extra||{}) }); }
  function ln(x1,y1,x2,y2,extra) { return h('line', { x1, y1, x2, y2, ...(extra||{}) }); }
  function poly(points, extra) { return h('polygon', { points, ...(extra||{}) }); }

  // ---------- glyph definitions ----------
  const ICONS = {
    // UI
    play:    p => svg(p, poly('6,4 20,12 6,20', { fill:'currentColor', stroke:'none' })),
    pause:   p => svg(p, rect(6,5,4,14,{fill:'currentColor',stroke:'none'}), rect(14,5,4,14,{fill:'currentColor',stroke:'none'})),
    back:    p => svg(p, path('M14 6l-6 6 6 6')),
    forward: p => svg(p, path('M10 6l6 6-6 6')),
    check:   p => svg(p, path('M5 12l4 4 10-10')),
    x:       p => svg(p, ln(6,6,18,18), ln(18,6,6,18)),
    plus:    p => svg(p, ln(12,5,12,19), ln(5,12,19,12)),
    minus:   p => svg(p, ln(5,12,19,12)),
    lock:    p => svg(p, rect(5,11,14,9,{rx:1.5}), path('M8 11V8a4 4 0 018 0v3')),
    settings:p => svg(p, circ(12,12,3), path('M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2l-.4-2.6h-4l-.4 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z')),
    bot:     p => svg(p, rect(4,8,16,11,{rx:3}), ln(12,4,12,8), circ(12,3.5,1.4,{fill:'currentColor',stroke:'none'}), circ(8.5,13,1.5,{fill:'currentColor',stroke:'none'}), circ(15.5,13,1.5,{fill:'currentColor',stroke:'none'}), ln(9,17,15,17)),
    human:   p => svg(p, circ(12,7,3), path('M5 21v-1a5 5 0 015-5h4a5 5 0 015 5v1')),
    crown:   p => svg(p, path('M3 9l3 8h12l3-8-5 4-4-7-4 7-5-4z'), circ(6,8,1,{fill:'currentColor',stroke:'none'}), circ(18,8,1,{fill:'currentColor',stroke:'none'}), circ(12,3,1.3,{fill:'currentColor',stroke:'none'})),
    trophy:  p => svg(p, path('M7 4h10v4a5 5 0 01-10 0V4z'), path('M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3'), path('M10 13h4v3h3v2H7v-2h3v-3z')),
    arrow_right: p => svg(p, path('M5 12h13M13 6l6 6-6 6')),
    'chevron-up':   p => svg(p, path('M6 15l6-6 6 6')),
    'chevron-down': p => svg(p, path('M6 9l6 6 6-6')),
    coin:    p => svg(p, circ(12,12,9), circ(12,12,9,{strokeDasharray:'2 2',opacity:.5}), path('M12 7v10M9 9h4.5a1.5 1.5 0 010 3H9.5a1.5 1.5 0 000 3H14')),
    gift:    p => svg(p, rect(3,10,18,10,{rx:1}), rect(2,6,20,4,{rx:1}), ln(12,6,12,20), path('M12 6c-3 0-5-1-5-3 0-1 1-2 2.5-2C11 1 12 4 12 6z'), path('M12 6c3 0 5-1 5-3 0-1-1-2-2.5-2C13 1 12 4 12 6z')),
    star:    p => svg(p, path('M12 3l2.6 5.5 6 .9-4.3 4.3 1 6L12 17l-5.4 2.7 1-6L3.4 9.4l6-.9L12 3z', {fill:'currentColor', stroke:'none'})),
    sparkle: p => svg(p, path('M12 3v5M12 16v5M3 12h5M16 12h5M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3')),

    // modes — single bold subject, easy to read at small sizes
    mode_fight:  p => svg(p,
      // a clenched fist
      path('M7 11V8a2 2 0 014 0v3M11 11V7a2 2 0 014 0v4M15 11V9a2 2 0 014 0v6a5 5 0 01-5 5h-3a4 4 0 01-4-4v-2l-3-3a1.5 1.5 0 012-2l2 2')
    ),
    mode_golf:   p => svg(p,
      // golf club + ball on tee
      ln(8,4,16,18),
      path('M14 16l5 4'),
      circ(6,21,2,{fill:'currentColor',stroke:'none'}),
      ln(3,22.5,9,22.5)
    ),
    mode_parkour:p => svg(p,
      // running stick figure leaning forward
      circ(14,5,2),
      ln(14,7,11,13),                 // torso
      ln(13,10,18,12),                // forward arm
      ln(13,10,8,7),                  // back arm
      ln(11,13,15,19),                // forward leg
      ln(11,13,6,17),                 // back leg
      // motion lines
      ln(2,7,5,7), ln(2,10,4,10), ln(2,13,5,13)
    ),
    mode_sumo:   p => svg(p,
      // two round chubby figures back-to-back ring
      circ(8,10,4),
      circ(16,10,4),
      // little belt
      ln(4,12,12,12), ln(12,12,20,12),
      // ring floor
      ln(2,20,22,20)
    ),

    // power-up categories
    cat_move: p => svg(p, path('M4 12h13l-3-3M17 12l-3 3M19 6v12')),
    cat_def:  p => svg(p, path('M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z')),
    cat_off:  p => svg(p, path('M14 4l6 6-3 1-7 7-2-2 7-7 1-3z'), path('M6 14l-2 6 6-2')),
    cat_util: p => svg(p, circ(12,12,3), path('M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2')),
    cat_fun:  p => svg(p, circ(12,12,9), path('M8 14s1.5 2 4 2 4-2 4-2'), circ(9,10,1,{fill:'currentColor',stroke:'none'}), circ(15,10,1,{fill:'currentColor',stroke:'none'})),

    // individual power-ups (24x24)
    pu_speedy:   p => svg(p, path('M4 18l5-5 3 3 8-8'), path('M14 8h6v6')),
    pu_djump:    p => svg(p, path('M5 18l4-4 4 4M9 14V6'), path('M15 18l4-4'), { fill:'none' }),
    pu_tjump:    p => svg(p, path('M5 20l3-3 3 3M8 17V11M13 18l3-3 3 3M16 15V9')),
    pu_dash:     p => svg(p, path('M3 12h7M14 8l4 4-4 4'), path('M11 8h7M11 16h7')),
    pu_feather:  p => svg(p, path('M6 22c0-8 4-14 12-18 0 8-4 14-12 18z'), path('M6 22l8-8')),
    pu_bunny:    p => svg(p, path('M9 18l3-3 3 3'), path('M12 15V6'), circ(9,5,1.5), circ(15,5,1.5)),
    pu_iron:     p => svg(p, path('M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z'), path('M9 11l2.5 2.5L16 9')),
    pu_reflect:  p => svg(p, path('M12 3v18'), path('M12 8c-3 0-6 1-6 4s3 4 6 4'), path('M12 8c3 0 6 1 6 4s-3 4-6 4')),
    pu_heavy:    p => svg(p, circ(12,7,3), path('M4 20h16l-3-8H7l-3 8z')),
    pu_second:   p => svg(p, path('M12 21s-7-4-7-10a4 4 0 017-2 4 4 0 017 2c0 6-7 10-7 10z'), path('M9 10l2 2 4-4', {stroke:'#fff'})),
    pu_regen:    p => svg(p, path('M4 12a8 8 0 0114-5'), path('M14 7h4V3'), path('M20 12a8 8 0 01-14 5'), path('M10 17H6v4')),
    pu_strong:   p => svg(p, path('M5 13c0-2 1-3 3-3h3l3-3 3 4-3 4v3c0 1-1 2-2 2H8c-2 0-3-1-3-3v-4z')),
    pu_reach:    p => svg(p, path('M3 12h12'), path('M11 8l4 4-4 4'), circ(19,12,2)),
    pu_kick:     p => svg(p, circ(9,5,2), path('M9 7l-1 6 5 2 4-5'), path('M13 15v5h4')),
    pu_combo:    p => svg(p, path('M5 8l4 4-4 4'), path('M11 8l4 4-4 4'), path('M17 8l3 4-3 4')),
    pu_crit:     p => svg(p, path('M12 3l2 6h6l-5 4 2 7-7-4-7 4 2-7-5-4h6l3-6z', {fill:'currentColor',stroke:'none'})),
    pu_thief:    p => svg(p, circ(12,12,6), circ(12,12,2,{fill:'currentColor',stroke:'none'}), path('M12 6V3M12 21v-3M6 12H3M21 12h-3')),
    pu_gravity:  p => svg(p, circ(12,12,8), path('M12 6v6l4 2')),
    pu_magnet:   p => svg(p, path('M6 4v8a6 6 0 0012 0V4'), path('M6 4h4v6M14 4h4v6')),
    pu_sticky:   p => svg(p, circ(12,12,8), path('M8 12l3 3 5-6')),
    pu_ghost:    p => svg(p, path('M5 21V10a7 7 0 0114 0v11l-3-2-3 2-3-2-3 2-2-2z'), circ(10,11,1,{fill:'currentColor',stroke:'none'}), circ(15,11,1,{fill:'currentColor',stroke:'none'})),
    pu_giant:    p => svg(p, circ(12,8,5), rect(8,13,8,8), path('M9 8h.01M15 8h.01')),
    pu_tiny:     p => svg(p, circ(12,14,2), rect(10,16,4,4), path('M5 21h14')),
    pu_banana:   p => svg(p, path('M4 18c8 4 14 0 16-12-2 0-4 2-5 6-3 1-7 0-11 6z')),
    pu_flame:    p => svg(p, path('M12 3c1 5 6 5 6 11a6 6 0 11-12 0c0-3 2-4 3-7 1 2 2 3 3-4z')),
    pu_drunk:    p => svg(p, path('M6 4h12l-1 7-5 9-5-9-1-7z'), path('M9 4l3 5 3-5')),
    pu_rocket:   p => svg(p, path('M12 2c4 4 4 8 4 10v6l-4 4-4-4v-6c0-2 0-6 4-10z'), circ(12,10,2), path('M8 18l-2 4M16 18l2 4')),
    pu_slow:     p => svg(p, circ(12,12,9), path('M12 6v6h5')),
    pu_rainbow:  p => svg(p, path('M3 18a9 9 0 0118 0', {stroke:'#ff5b5b'}), path('M5 18a7 7 0 0114 0', {stroke:'#ffd84a'}), path('M7 18a5 5 0 0110 0', {stroke:'#5bff8a'}), path('M9 18a3 3 0 016 0', {stroke:'#5bf0e8'})),

    // question / education
    book:      p => svg(p, path('M4 5a2 2 0 012-2h14v16H6a2 2 0 00-2 2V5z'), path('M20 17H6a2 2 0 100 4h14')),
    question:  p => svg(p, circ(12,12,9), path('M9 9a3 3 0 016 0c0 2-3 2-3 4'), path('M12 17h.01')),
    brain:     p => svg(p, path('M9 4a3 3 0 013 3v10a3 3 0 11-6 0V7a3 3 0 013-3z'), path('M15 4a3 3 0 00-3 3v10a3 3 0 106 0V7a3 3 0 00-3-3z')),
    pencil:    p => svg(p, path('M4 20l1-4 11-11 3 3-11 11-4 1z'), path('M14 6l3 3')),
    ai:        p => svg(p, path('M9 4a3 3 0 013 3v10a3 3 0 11-6 0V7a3 3 0 013-3z'), path('M15 4a3 3 0 00-3 3v10a3 3 0 106 0V7a3 3 0 00-3-3z'), circ(9,10,1,{fill:'currentColor',stroke:'none'}), circ(15,10,1,{fill:'currentColor',stroke:'none'})),
    users:     p => svg(p, circ(9,8,3), path('M3 20a6 6 0 0112 0'), circ(17,9,2.4), path('M14 19a4 4 0 017-1')),
    trade:     p => svg(p, path('M4 8h12'), path('M13 5l3 3-3 3'), path('M20 16H8'), path('M11 19l-3-3 3-3')),
    friend:    p => svg(p, circ(9,8,3), path('M3 20a6 6 0 0112 0'), path('M17 5l1.5 2.5L21 8l-2 1.5L19.5 12 17 10.5 14.5 12l.5-2.5L13 8l2.5-0.5L17 5z',{fill:'currentColor',stroke:'none'})),
    invite:    p => svg(p, circ(9,8,3), path('M3 20a6 6 0 0112 0'), ln(18,8,18,16), ln(14,12,22,12)),
    list:      p => svg(p, ln(8,6,20,6), ln(8,12,20,12), ln(8,18,20,18), circ(4,6,1,{fill:'currentColor',stroke:'none'}), circ(4,12,1,{fill:'currentColor',stroke:'none'}), circ(4,18,1,{fill:'currentColor',stroke:'none'})),
    timer:     p => svg(p, circ(12,13,8), path('M12 9v4l3 1'), path('M9 3h6')),
    spark:     p => svg(p, path('M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7z', {fill:'currentColor',stroke:'none'})),

    // cosmetics palette categories
    cos_hat:    p => svg(p, path('M5 17h14'), path('M8 17V8a4 4 0 018 0v9')),
    cos_outfit: p => svg(p, path('M6 6l3-3h6l3 3-3 3v11H9V9L6 6z')),
    cos_face:   p => svg(p, circ(12,12,9), circ(9,10,1,{fill:'currentColor',stroke:'none'}), circ(15,10,1,{fill:'currentColor',stroke:'none'}), path('M9 15s1 1 3 1 3-1 3-1')),
    cos_trail:  p => svg(p, path('M3 12c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3')),
  };

  // ---------- React component ----------
  // <Icon id="pu_speedy" size={20} color="#ffd76a" />
  function Icon({ id, size = 22, color, stroke, fill, style, className, title }) {
    const fn = ICONS[id];
    if (!fn) return h('span', { style:{display:'inline-block',width:size,height:size}, title: id });
    const el = fn({ size, color, stroke: stroke || color, fill: fill || 'none', style, className });
    if (title) return h('span', { title, style:{display:'inline-flex',alignItems:'center'} }, el);
    return el;
  }

  return { Icon, ICONS };
})();
