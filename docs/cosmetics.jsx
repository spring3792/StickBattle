/* global window */
// Cosmetics catalog v2 — sized for taller stickman.
// Head radius ≈ 16. Torso y=0..28. Hat anchor = crown of head (top, x-center). Outfit anchor = chest.
//
// Every drawing uses gradients, outlines, and at least one highlight pass.

window.SFCosmetics = (function () {

  // ---------- helpers ----------
  function shadow(ctx, fn) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1; fn(); ctx.restore(); }
  function outlinePath(ctx, draw, stroke = '#0a0a14', w = 1.4) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    draw('fill');
    ctx.lineWidth = w; ctx.strokeStyle = stroke; draw('stroke');
    ctx.restore();
  }

  // ---------- HATS (anchor = crown of head, draw upward into negative y) ----------
  const HATS = [
    { id:'none', name:'No Hat', draw: () => {} },

    { id:'top', name:'Top Hat', draw: (ctx) => {
        // brim shadow
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        ctx.beginPath(); ctx.ellipse(0, 1, 17, 3.5, 0, 0, Math.PI*2); ctx.fill();
        // brim
        const bg = ctx.createLinearGradient(0,-3,0,3); bg.addColorStop(0,'#22202c'); bg.addColorStop(1,'#0a0810');
        ctx.fillStyle = bg; ctx.fillRect(-16, -3, 32, 5);
        // crown
        const cg = ctx.createLinearGradient(-11, -22, 11, -3);
        cg.addColorStop(0, '#34303f'); cg.addColorStop(.5, '#1a1622'); cg.addColorStop(1, '#0a0810');
        ctx.fillStyle = cg; ctx.fillRect(-11, -22, 22, 19);
        // outline
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2;
        ctx.strokeRect(-11, -22, 22, 19); ctx.strokeRect(-16, -3, 32, 5);
        // velvet band
        const vg = ctx.createLinearGradient(0,-10,0,-4); vg.addColorStop(0,'#ff5176'); vg.addColorStop(1,'#a01b3a');
        ctx.fillStyle = vg; ctx.fillRect(-11, -9, 22, 3);
        // gold buckle
        const gg = ctx.createLinearGradient(0,-9,0,-6); gg.addColorStop(0,'#fff1a0'); gg.addColorStop(1,'#c89014');
        ctx.fillStyle = gg; ctx.fillRect(-3, -9, 6, 3);
        ctx.strokeStyle = '#7a5210'; ctx.lineWidth = .8; ctx.strokeRect(-3, -9, 6, 3);
        ctx.fillStyle = '#5a3408'; ctx.fillRect(-1.5, -8.2, 3, 1.4);
        // highlight stripe
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-8, -21, 1.5, 16);
      }
    },

    { id:'crown', name:'Royal Crown', draw: (ctx) => {
        // base band gradient
        const g = ctx.createLinearGradient(-14, -3, 14, -3);
        g.addColorStop(0, '#9a6a14'); g.addColorStop(.5, '#fff1a0'); g.addColorStop(1, '#9a6a14');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-14, 1); ctx.lineTo(-14, -8);
        ctx.lineTo(-9, -3); ctx.lineTo(-5, -14);
        ctx.lineTo(0, -5); ctx.lineTo(5, -14);
        ctx.lineTo(9, -3); ctx.lineTo(14, -8);
        ctx.lineTo(14, 1); ctx.closePath(); ctx.fill();
        // outline
        ctx.strokeStyle = '#3a2208'; ctx.lineWidth = 1.4; ctx.lineJoin='round'; ctx.stroke();
        // inset shadow band
        ctx.fillStyle = 'rgba(120,80,10,.35)'; ctx.fillRect(-13, -2, 26, 2);
        // jewels (red, blue, green) with white highlights
        const drawJewel = (cx, cy, c1, c2) => {
          const jg = ctx.createRadialGradient(cx-1, cy-1, .3, cx, cy, 2.5);
          jg.addColorStop(0, c1); jg.addColorStop(1, c2);
          ctx.fillStyle = jg;
          ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#000'; ctx.lineWidth = .6; ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(cx-.7, cy-.7, .6, 0, Math.PI*2); ctx.fill();
        };
        drawJewel(-5, -3, '#ff8a98', '#a8102e');
        drawJewel( 0, -3, '#9adfff', '#0a4880');
        drawJewel( 5, -3, '#a0ffac', '#1a6a26');
        // tip pearls
        for (const x of [-5, 5]) {
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(x, -14, 1.5, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#aaa'; ctx.lineWidth = .5; ctx.stroke();
        }
        // highlight stripe
        ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-12, -7, 2, 5);
      }
    },

    { id:'cap', name:'Ball Cap', draw: (ctx) => {
        // crown
        const cg = ctx.createLinearGradient(0, -16, 0, -2);
        cg.addColorStop(0, '#5fa0ff'); cg.addColorStop(1, '#1e4a96');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(0, -2, 13, Math.PI, 0); ctx.fill();
        // panel seam
        ctx.strokeStyle = '#1a3a78'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-11, -7); ctx.quadraticCurveTo(0, -16, 11, -7); ctx.stroke();
        // button
        ctx.fillStyle = '#1a3a78';
        ctx.beginPath(); ctx.arc(0, -15, 1.6, 0, Math.PI*2); ctx.fill();
        // brim
        const bg = ctx.createLinearGradient(0,-2,0,2); bg.addColorStop(0,'#1e4a96'); bg.addColorStop(1,'#0a2a5a');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(0, -2); ctx.lineTo(20, -1); ctx.quadraticCurveTo(22, 1, 20, 2); ctx.lineTo(0, 1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#0a1a3a'; ctx.lineWidth = .8; ctx.stroke();
        // logo
        ctx.fillStyle = '#fff';
        ctx.font = "bold 8px sans-serif"; ctx.textAlign='center';
        ctx.fillText('SF', -1, -7);
        // highlight
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        ctx.beginPath(); ctx.ellipse(-5, -10, 3, 2, .3, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'beanie', name:'Beanie', draw: (ctx) => {
        const g = ctx.createLinearGradient(0, -16, 0, -2);
        g.addColorStop(0, '#f04848'); g.addColorStop(1, '#7a1818');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, -2, 13, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#3a0808'; ctx.lineWidth = 1; ctx.stroke();
        // knit ribbing
        ctx.strokeStyle = 'rgba(80,10,10,.6)'; ctx.lineWidth = 1;
        for (let i = -10; i <= 10; i += 3) {
          ctx.beginPath(); ctx.moveTo(i, -2); ctx.lineTo(i, -13); ctx.stroke();
        }
        // cuff
        const cg = ctx.createLinearGradient(0,-2,0,3); cg.addColorStop(0,'#fff'); cg.addColorStop(1,'#bbb');
        ctx.fillStyle = cg; ctx.fillRect(-13, -2, 26, 4);
        ctx.strokeStyle = '#888'; ctx.lineWidth = .8; ctx.strokeRect(-13, -2, 26, 4);
        // pom-pom
        const pg = ctx.createRadialGradient(-1, -17, 1, 0, -15, 4.5);
        pg.addColorStop(0, '#fff'); pg.addColorStop(1, '#aaa');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(0, -16, 4, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#666'; ctx.lineWidth = .8; ctx.stroke();
        // fuzz dots
        ctx.fillStyle = '#ccc';
        for (let i = 0; i < 4; i++) {
          const a = i / 4 * Math.PI*2;
          ctx.beginPath(); ctx.arc(Math.cos(a)*3, -16+Math.sin(a)*3, .7, 0, Math.PI*2); ctx.fill();
        }
      }
    },

    { id:'horns', name:'Devil Horns', draw: (ctx) => {
        const drawHorn = (sx) => {
          const g = ctx.createLinearGradient(sx*6, -14, sx*9, 0);
          g.addColorStop(0, '#ff6464'); g.addColorStop(.6, '#aa1818'); g.addColorStop(1, '#3a0808');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(sx*10, 1); ctx.quadraticCurveTo(sx*4, -3, sx*5, -15);
          ctx.quadraticCurveTo(sx*8, -8, sx*4, 1); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#1a0404'; ctx.lineWidth = 1; ctx.stroke();
          // ridges
          ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = .6;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(sx*(7-i), -4-i*3); ctx.lineTo(sx*(5-i), -3-i*3); ctx.stroke();
          }
          // highlight
          ctx.fillStyle = 'rgba(255,255,255,.3)';
          ctx.fillRect(sx*6.5, -11, 1, 6);
        };
        drawHorn(-1); drawHorn(1);
      }
    },

    { id:'halo', name:'Halo', draw: (ctx) => {
        ctx.save();
        // soft glow
        const glow = ctx.createRadialGradient(0, -16, 4, 0, -16, 18);
        glow.addColorStop(0, 'rgba(255,240,160,.7)');
        glow.addColorStop(1, 'rgba(255,240,160,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.ellipse(0, -16, 17, 7, 0, 0, Math.PI*2); ctx.fill();
        // ring
        const g = ctx.createLinearGradient(-14, -16, 14, -14);
        g.addColorStop(0, 'rgba(255,200,80,.3)');
        g.addColorStop(.5, '#fff5b8');
        g.addColorStop(1, 'rgba(255,200,80,.3)');
        ctx.strokeStyle = g; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(0, -16, 14, 4.5, 0, 0, Math.PI*2); ctx.stroke();
        // inner ring
        ctx.strokeStyle = '#fffae0'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(0, -16, 13, 3.8, 0, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
      }
    },

    { id:'party', name:'Party Hat', draw: (ctx) => {
        // shadow
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        ctx.beginPath(); ctx.ellipse(0, 1, 11, 2, 0, 0, Math.PI*2); ctx.fill();
        // cone with gradient
        const g = ctx.createLinearGradient(-10, 0, 10, -20);
        g.addColorStop(0, '#ff3d6e'); g.addColorStop(.5, '#ff8a3d'); g.addColorStop(1, '#ffd76a');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineTo(0, -22); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#5a0a18'; ctx.lineWidth = 1; ctx.stroke();
        // chevron stripes
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        for (let yy = -4; yy >= -26; yy -= 5) {
          const t = (yy + 22) / 22;
          ctx.beginPath();
          ctx.moveTo(-t*10, yy); ctx.lineTo(0, yy + 1.5); ctx.lineTo(t*10, yy); ctx.stroke();
        }
        // confetti dots
        for (const [x,y,c] of [[3,-8,'#5bf0e8'],[-3,-13,'#7bff8a'],[2,-16,'#fff'],[-1,-6,'#ffd84a']]) {
          ctx.fillStyle = c;
          ctx.beginPath(); ctx.arc(x, y, .9, 0, Math.PI*2); ctx.fill();
        }
        // pom-pom
        const pg = ctx.createRadialGradient(-1, -23, 1, 0, -22, 4);
        pg.addColorStop(0, '#fff'); pg.addColorStop(1, '#ddd');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(0, -22, 3.5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#888'; ctx.lineWidth = .6; ctx.stroke();
      }
    },

    { id:'cowboy', name:'Cowboy', draw: (ctx) => {
        // brim with curl
        const bg = ctx.createLinearGradient(0, -4, 0, 3);
        bg.addColorStop(0, '#a87038'); bg.addColorStop(1, '#3a1a08');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(-26, 0); ctx.quadraticCurveTo(-14, -4, -8, -3);
        ctx.lineTo(8, -3); ctx.quadraticCurveTo(14, -4, 18, 0);
        ctx.quadraticCurveTo(0, 5, -26, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 1; ctx.stroke();
        // crown
        const cg = ctx.createLinearGradient(0,-15,0,-3);
        cg.addColorStop(0,'#8a5028'); cg.addColorStop(1,'#3a1a08');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(-8, -3); ctx.quadraticCurveTo(-9, -15, 0, -16);
        ctx.quadraticCurveTo(9, -15, 8, -3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 1; ctx.stroke();
        // dent
        ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(0, -10); ctx.lineTo(3, -12); ctx.stroke();
        // band
        ctx.fillStyle = '#1a0a04'; ctx.fillRect(-8, -5, 16, 2.5);
        // gold star
        const sg = ctx.createRadialGradient(-.5,-4.5,.3,0,-4,2);
        sg.addColorStop(0,'#fff1a0'); sg.addColorStop(1,'#c89014');
        ctx.fillStyle = sg;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI*2 - Math.PI/2;
          const a2 = a + Math.PI/5;
          ctx.lineTo(Math.cos(a)*2.2, -4 + Math.sin(a)*2.2);
          ctx.lineTo(Math.cos(a2)*.9, -4 + Math.sin(a2)*.9);
        }
        ctx.closePath(); ctx.fill();
      }
    },

    { id:'wizard', name:'Wizard Hat', draw: (ctx) => {
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        ctx.beginPath(); ctx.ellipse(0, 1, 14, 2.5, 0, 0, Math.PI*2); ctx.fill();
        const g = ctx.createLinearGradient(-12, 0, 12, -24);
        g.addColorStop(0, '#5b3aff'); g.addColorStop(.5, '#3a1f8a'); g.addColorStop(1, '#1a0a40');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-13, 0); ctx.lineTo(13, 0);
        ctx.quadraticCurveTo(8, -12, 1, -24);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1a0a40'; ctx.lineWidth = 1; ctx.stroke();
        // brim
        ctx.fillStyle = '#1a0a40'; ctx.fillRect(-14, -2, 28, 3.5);
        ctx.strokeStyle = '#0a0420'; ctx.lineWidth = .8; ctx.strokeRect(-14, -2, 28, 3.5);
        // stars
        ctx.fillStyle = '#ffd84a';
        for (const [x,y,r] of [[-3,-8,1.4],[3,-13,1.2],[-2,-26,1],[5,-6,.9]]) {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = i / 5 * Math.PI*2 - Math.PI/2;
            const a2 = a + Math.PI/5;
            ctx.lineTo(x + Math.cos(a)*r, y + Math.sin(a)*r);
            ctx.lineTo(x + Math.cos(a2)*r*.4, y + Math.sin(a2)*r*.4);
          }
          ctx.closePath(); ctx.fill();
        }
        // crescent moon
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-6, -11, 2.8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#3a1f8a';
        ctx.beginPath(); ctx.arc(-5, -11.5, 2.8, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'headband', name:'Ninja Band', draw: (ctx) => {
        ctx.fillStyle = '#a01828';
        ctx.fillRect(-14, 1, 28, 5);
        ctx.strokeStyle = '#400408'; ctx.lineWidth = .8; ctx.strokeRect(-14, 1, 28, 5);
        // knot tails (one side)
        ctx.fillStyle = '#a01828';
        ctx.beginPath();
        ctx.moveTo(13, 1); ctx.lineTo(20, -3); ctx.lineTo(22, 4); ctx.lineTo(20, 9); ctx.lineTo(13, 6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#400408'; ctx.lineWidth = .8; ctx.stroke();
        // emblem
        const eg = ctx.createRadialGradient(-1,3,.5,0,3.5,3);
        eg.addColorStop(0,'#fff'); eg.addColorStop(1,'#ddd');
        ctx.fillStyle = eg;
        ctx.beginPath(); ctx.arc(0, 3.5, 3, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#222'; ctx.lineWidth = .6; ctx.stroke();
        ctx.fillStyle = '#cc1a3a';
        ctx.beginPath(); ctx.arc(0, 3.5, 1.6, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'flower', name:'Daisy Crown', draw: (ctx) => {
        // green vine
        ctx.strokeStyle = '#3a7218'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, 0, 15, 4, 0, Math.PI, 0); ctx.stroke();
        // leaves
        ctx.fillStyle = '#5aa830';
        for (const [x,y,a] of [[-12,-1,0.5],[12,-1,-0.5],[-8,-5,0.2]]) {
          ctx.save(); ctx.translate(x,y); ctx.rotate(a);
          ctx.beginPath(); ctx.ellipse(0,0,3,1.5,0,0,Math.PI*2); ctx.fill();
          ctx.restore();
        }
        // daisies (5 flowers)
        const places = [[-11,-3],[-4,-8],[3,-9],[10,-3],[0,-11]];
        for (const [cx, cy] of places) {
          // petals
          for (let a = 0; a < 6; a++) {
            const ang = a / 6 * Math.PI * 2 + cx*0.3;
            const px = cx + Math.cos(ang)*3, py = cy + Math.sin(ang)*3;
            const pg = ctx.createRadialGradient(px-.5, py-.5, .3, px, py, 2);
            pg.addColorStop(0,'#fff'); pg.addColorStop(1,'#e8d8c8');
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI*2); ctx.fill();
          }
          // center
          const yg = ctx.createRadialGradient(cx-.5,cy-.5,.2,cx,cy,2);
          yg.addColorStop(0,'#ffe680'); yg.addColorStop(1,'#cc8a00');
          ctx.fillStyle = yg;
          ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, Math.PI*2); ctx.fill();
        }
      }
    },

    { id:'helmet', name:'Battle Helm', draw: (ctx) => {
        // dome
        const g = ctx.createLinearGradient(-12, -20, 12, 0);
        g.addColorStop(0, '#c0c8d8'); g.addColorStop(.5, '#7a8294'); g.addColorStop(1, '#2a323e');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 14, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#0a0e18'; ctx.lineWidth = 1.2; ctx.stroke();
        // face guard
        ctx.fillStyle = '#0a0e18'; ctx.fillRect(-11, -2, 22, 3);
        // crest mount
        ctx.fillStyle = '#3a4458'; ctx.fillRect(-1.5, -16, 3, 3);
        // red plume
        const pg = ctx.createLinearGradient(0,-26,0,-12);
        pg.addColorStop(0,'#ff7676'); pg.addColorStop(1,'#7a0a0a');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.moveTo(-3, -13);
        for (let xx = -3; xx <= 3; xx += .5) {
          const h2 = 12 + Math.sin(xx*1.5)*2;
          ctx.lineTo(xx, -13 - h2);
        }
        ctx.lineTo(3, -13); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#3a0808'; ctx.lineWidth = .8; ctx.stroke();
        // rivets
        ctx.fillStyle = '#0a0e18';
        for (const a of [-2.6, -1.9, -1.1, -0.5]) {
          ctx.beginPath(); ctx.arc(Math.cos(a)*11, Math.sin(a)*11, 1.2, 0, Math.PI*2); ctx.fill();
        }
        // big shine
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.ellipse(-6, -10, 2, 6, 0.3, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'mohawk', name:'Mohawk', draw: (ctx) => {
        // skull base hair
        ctx.fillStyle = '#1a1a22';
        ctx.fillRect(-4, 0, 8, 4);
        // spikes — gradient each
        const colors = [
          ['#ff3d6e','#a01040'], ['#ff8a3d','#a04020'], ['#ffd84a','#a07a14'],
          ['#7bff8a','#1a7a36'], ['#5bf0e8','#1a6a7a'], ['#9a6aff','#3a1a8a'],
        ];
        for (let i = 0; i < 6; i++) {
          const x = -10 + i * 4;
          const g = ctx.createLinearGradient(x, 0, x, -16);
          g.addColorStop(0, colors[i][1]); g.addColorStop(1, colors[i][0]);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x-2, 1); ctx.lineTo(x+2, 1); ctx.lineTo(x, -14 - Math.sin(i)*2); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#000'; ctx.lineWidth = .6; ctx.stroke();
        }
      }
    },

    { id:'afro', name:'Afro', draw: (ctx) => {
        // big puff
        const bumps = [[-12,-4],[-8,-11],[-2,-14],[4,-14],[10,-11],[12,-4],[7,-2],[0,-2],[-7,-2]];
        ctx.fillStyle = '#1a0e08';
        for (const [x,y] of bumps) {
          ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2); ctx.fill();
        }
        // highlights
        ctx.fillStyle = '#3a2218';
        for (const [x,y] of bumps) {
          ctx.beginPath(); ctx.arc(x-1.5, y-1.5, 3, 0, Math.PI*2); ctx.fill();
        }
        // pick
        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(8, -13, 1.2, 6);
        ctx.fillRect(8, -14, 4, 1.2);
        for (let i = 0; i < 4; i++) ctx.fillRect(8+i, -13.5, .6, 1.8);
      }
    },

    { id:'samurai', name:'Samurai Hat', draw: (ctx) => {
        // wide brim with edge
        const g = ctx.createLinearGradient(0, -4, 0, 4);
        g.addColorStop(0, '#2a2030'); g.addColorStop(1, '#0a0810');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, 22, 6, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        // band edge
        ctx.fillStyle = '#ff3d6e';
        ctx.beginPath(); ctx.ellipse(0, 4, 22, 1.5, 0, 0, Math.PI*2); ctx.fill();
        // dome small
        const dg = ctx.createLinearGradient(0,-12,0,0);
        dg.addColorStop(0,'#3a2218'); dg.addColorStop(1,'#1a0a04');
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(0, -1, 8, Math.PI, 0); ctx.fill();
        // top knot
        ctx.strokeStyle = '#ff3d6e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -16); ctx.stroke();
        // tassel
        const tg = ctx.createRadialGradient(-.5,-16.5,.3,0,-16,3);
        tg.addColorStop(0,'#ff8a98'); tg.addColorStop(1,'#7a0a18');
        ctx.fillStyle = tg;
        ctx.beginPath(); ctx.arc(0, -16, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#400408'; ctx.lineWidth = .6; ctx.stroke();
        // kanji-style emblem
        ctx.fillStyle = '#ffd84a';
        ctx.fillRect(-3, -5, 6, .8); ctx.fillRect(-1, -7, 2, 4);
      }
    },

    { id:'pirate', name:'Pirate Hat', draw: (ctx) => {
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        ctx.beginPath(); ctx.ellipse(0, 2, 18, 3, 0, 0, Math.PI*2); ctx.fill();
        const g = ctx.createLinearGradient(0, -14, 0, -2);
        g.addColorStop(0, '#3a2218'); g.addColorStop(1, '#0a0408');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-16, 1); ctx.quadraticCurveTo(-14, -14, 0, -14);
        ctx.quadraticCurveTo(14, -14, 16, 1);
        ctx.quadraticCurveTo(0, -3, -16, 1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#0a0408'; ctx.lineWidth = 1; ctx.stroke();
        // ribbon trim
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath();
        ctx.moveTo(-14, -3); ctx.quadraticCurveTo(0, -12, 14, -3);
        ctx.quadraticCurveTo(0, -10, -14, -3); ctx.closePath(); ctx.fill();
        // skull
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, -9, 3.2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#888'; ctx.lineWidth = .5; ctx.stroke();
        ctx.fillStyle = '#0a0408';
        ctx.beginPath(); ctx.arc(-1, -9.5, .8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc( 1, -9.5, .8, 0, Math.PI*2); ctx.fill();
        ctx.fillRect(-2, -7, 4, .8);
        // crossbones
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-4, -12); ctx.lineTo(4, -6);
        ctx.moveTo(4, -12); ctx.lineTo(-4, -6);
        ctx.stroke();
      }
    },

    { id:'spartan', name:'Spartan', draw: (ctx) => {
        // bronze helm
        const g = ctx.createLinearGradient(-12, -16, 12, 4);
        g.addColorStop(0, '#cca050'); g.addColorStop(.5, '#8a6228'); g.addColorStop(1, '#3a2810');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 1, 14, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#1a1004'; ctx.lineWidth = 1.2; ctx.stroke();
        // T-shape face slit
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(-10, -2, 20, 5);
        ctx.fillRect(-1, -2, 2, 8);
        // crest mount
        ctx.fillStyle = '#3a2810'; ctx.fillRect(-12, -14, 24, 2);
        // RED PLUME
        ctx.beginPath();
        for (let xx = -11; xx <= 11; xx += 1) {
          const h2 = 13 + Math.sin(xx*0.6)*3;
          const sg = ctx.createLinearGradient(xx,-14,xx,-14-h2);
          sg.addColorStop(0,'#cc1a2a'); sg.addColorStop(1,'#ff6064');
          ctx.fillStyle = sg;
          ctx.fillRect(xx-.5, -14-h2, 1, h2);
        }
        // outline plume
        ctx.strokeStyle = '#5a0a14'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-11, -14);
        for (let xx = -11; xx <= 11; xx += 1) {
          const h2 = 13 + Math.sin(xx*0.6)*3;
          ctx.lineTo(xx, -14-h2);
        }
        ctx.lineTo(11, -14);
        ctx.stroke();
        // forehead emblem
        ctx.fillStyle = '#1a1004';
        ctx.beginPath();
        ctx.moveTo(0, -8); ctx.lineTo(3, -4); ctx.lineTo(0, -1); ctx.lineTo(-3, -4); ctx.closePath(); ctx.fill();
      }
    },

    { id:'chef', name:'Chef', draw: (ctx) => {
        // band
        const bg = ctx.createLinearGradient(0,-3,0,4);
        bg.addColorStop(0,'#fff'); bg.addColorStop(1,'#ddd');
        ctx.fillStyle = bg; ctx.fillRect(-12, -2, 24, 5);
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = .8; ctx.strokeRect(-12, -2, 24, 5);
        // puffy top
        const pg = ctx.createRadialGradient(-3, -13, 1, 0, -10, 14);
        pg.addColorStop(0, '#fff'); pg.addColorStop(1, '#cdcdcd');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.ellipse(-7, -9, 5, 7, 0, 0, Math.PI*2);
        ctx.ellipse(0, -14, 7, 9, 0, 0, Math.PI*2);
        ctx.ellipse(7, -9, 5, 7, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = .8; ctx.stroke();
        // wrinkles
        ctx.strokeStyle = 'rgba(0,0,0,.1)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-4, -7); ctx.quadraticCurveTo(0, -3, 4, -7);
        ctx.moveTo(-6, -10); ctx.quadraticCurveTo(-3, -7, 0, -11);
        ctx.stroke();
      }
    },

    { id:'cat_ears', name:'Cat Ears', draw: (ctx) => {
        const drawEar = (sx) => {
          const g = ctx.createLinearGradient(sx*5, 0, sx*5, -13);
          g.addColorStop(0, '#1a1018'); g.addColorStop(1, '#5a3060');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(sx*9, 1); ctx.lineTo(sx*5, -13); ctx.lineTo(sx*1, 1); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#0a0408'; ctx.lineWidth = .8; ctx.stroke();
          // inner pink
          const ig = ctx.createLinearGradient(sx*5, -2, sx*5, -10);
          ig.addColorStop(0,'#ffb5c8'); ig.addColorStop(1,'#cc6a8a');
          ctx.fillStyle = ig;
          ctx.beginPath();
          ctx.moveTo(sx*7, 0); ctx.lineTo(sx*5, -9); ctx.lineTo(sx*3, 0); ctx.closePath(); ctx.fill();
          // tuft
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(sx*4, -2, .6, 0, Math.PI*2); ctx.fill();
        };
        drawEar(-1); drawEar(1);
      }
    },

    { id:'bunny_ears', name:'Bunny Ears', draw: (ctx) => {
        const drawEar = (sx) => {
          const g = ctx.createLinearGradient(sx*6, 0, sx*6, -16);
          g.addColorStop(0, '#fff'); g.addColorStop(1, '#ddd');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(sx*6, -12, 3, 10, -sx*.15, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#aaa'; ctx.lineWidth = .8; ctx.stroke();
          // inner
          const ig = ctx.createLinearGradient(sx*6, -4, sx*6, -16);
          ig.addColorStop(0,'#ffc8d8'); ig.addColorStop(1,'#cc6a8a');
          ctx.fillStyle = ig;
          ctx.beginPath(); ctx.ellipse(sx*6, -12, 1.4, 7, -sx*.15, 0, Math.PI*2); ctx.fill();
        };
        drawEar(-1); drawEar(1);
      }
    },

    { id:'graduation', name:'Graduation', draw: (ctx) => {
        // cap base
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath(); ctx.ellipse(0, -2, 10, 3, 0, 0, Math.PI*2); ctx.fill();
        // mortar board (tilted square)
        const g = ctx.createLinearGradient(0,-8,0,-2);
        g.addColorStop(0,'#22202c'); g.addColorStop(1,'#0a0a14');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-16, -7); ctx.lineTo(16, -5); ctx.lineTo(12, -1); ctx.lineTo(-14, -2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = .8; ctx.stroke();
        // top reflection
        ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(-12, -6.5, 6, 1);
        // tassel string
        ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(14, -6); ctx.quadraticCurveTo(18, -2, 17, 6); ctx.stroke();
        // tassel ball
        const tg = ctx.createRadialGradient(16,5.5,.3,17,6,2);
        tg.addColorStop(0,'#fff1a0'); tg.addColorStop(1,'#c89014');
        ctx.fillStyle = tg;
        ctx.beginPath(); ctx.arc(17, 6, 2.2, 0, Math.PI*2); ctx.fill();
        // strands
        ctx.strokeStyle = '#c89014'; ctx.lineWidth = .8;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(17 + i*.4 - .8, 7); ctx.lineTo(17 + i*.5 - 1, 10);
          ctx.stroke();
        }
        // button on top
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath(); ctx.arc(2, -5, 1, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'aviator', name:'Aviator', draw: (ctx) => {
        // base cap leather
        const g = ctx.createLinearGradient(0,-16,0,-2);
        g.addColorStop(0,'#7a5430'); g.addColorStop(1,'#3a2410');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, -2, 14, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 1; ctx.stroke();
        // fur trim
        for (let x = -13; x <= 13; x += 2.5) {
          const fg = ctx.createRadialGradient(x-.5,-1.5,.3,x,-1,2);
          fg.addColorStop(0,'#fff'); fg.addColorStop(1,'#ccc');
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.arc(x, -1, 1.8, 0, Math.PI*2); ctx.fill();
        }
        // goggle strap
        ctx.fillStyle = '#3a2410'; ctx.fillRect(-14, -7, 28, 3);
        ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = .6; ctx.strokeRect(-14, -7, 28, 3);
        // goggles (lifted to forehead)
        const ggrad = ctx.createRadialGradient(-6,-12,1,-6,-11,5);
        ggrad.addColorStop(0,'#b0d4ff'); ggrad.addColorStop(1,'#1a3a6a');
        ctx.fillStyle = ggrad;
        ctx.beginPath(); ctx.arc(-6, -11, 4, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#0a1a2a'; ctx.lineWidth = 1; ctx.stroke();
        const ggrad2 = ctx.createRadialGradient(6,-12,1,6,-11,5);
        ggrad2.addColorStop(0,'#b0d4ff'); ggrad2.addColorStop(1,'#1a3a6a');
        ctx.fillStyle = ggrad2;
        ctx.beginPath(); ctx.arc(6, -11, 4, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#0a1a2a'; ctx.lineWidth = 1; ctx.stroke();
        // bridge
        ctx.strokeStyle = '#0a1a2a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-2, -11); ctx.lineTo(2, -11); ctx.stroke();
        // ear flaps
        ctx.fillStyle = '#7a5430';
        ctx.beginPath(); ctx.ellipse(-12, 3, 3, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( 12, 3, 3, 4, 0, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'tiara', name:'Tiara', draw: (ctx) => {
        // arc base
        const g = ctx.createLinearGradient(-14,0,14,0);
        g.addColorStop(0,'#c89014'); g.addColorStop(.5,'#fff1a0'); g.addColorStop(1,'#c89014');
        ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-13, 1); ctx.quadraticCurveTo(-9, -7, 0, -10); ctx.quadraticCurveTo(9, -7, 13, 1);
        ctx.stroke();
        // pink gem center
        const cg = ctx.createRadialGradient(-1,-12,.3,0,-11,3);
        cg.addColorStop(0,'#ffb5d8'); cg.addColorStop(1,'#9a2050');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(0, -14); ctx.lineTo(3, -11); ctx.lineTo(0, -8); ctx.lineTo(-3, -11); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#400418'; ctx.lineWidth = .6; ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-.7, -12, .7, 0, Math.PI*2); ctx.fill();
        // side gems
        for (const x of [-6, 6]) {
          const sg = ctx.createRadialGradient(x-.5,-4.5,.2,x,-4,2);
          sg.addColorStop(0,'#9adfff'); sg.addColorStop(1,'#0a4880');
          ctx.fillStyle = sg;
          ctx.beginPath(); ctx.arc(x, -4, 1.5, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#000'; ctx.lineWidth = .4; ctx.stroke();
        }
      }
    },

    { id:'antlers', name:'Antlers', draw: (ctx) => {
        const drawSide = (sx) => {
          ctx.strokeStyle = '#a87238'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin='round';
          ctx.beginPath();
          ctx.moveTo(sx*4, 1); ctx.lineTo(sx*8, -10);
          ctx.moveTo(sx*8, -10); ctx.lineTo(sx*13, -7);
          ctx.moveTo(sx*8, -10); ctx.lineTo(sx*10, -26);
          ctx.moveTo(sx*10, -26); ctx.lineTo(sx*14, -26);
          ctx.moveTo(sx*10, -26); ctx.lineTo(sx*9, -22);
          ctx.stroke();
          // darker shading underneath
          ctx.strokeStyle = '#6a4214'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx*4.5, 1); ctx.lineTo(sx*8.2, -9);
          ctx.stroke();
        };
        drawSide(-1); drawSide(1);
      }
    },

    { id:'space', name:'Space Helmet', draw: (ctx) => {
        // glass dome
        const g = ctx.createRadialGradient(-4, -6, 1, 0, 0, 17);
        g.addColorStop(0, 'rgba(255,255,255,.6)');
        g.addColorStop(.4, 'rgba(180,220,255,.4)');
        g.addColorStop(1, 'rgba(40,80,120,.7)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI*2); ctx.fill();
        // glass outline
        ctx.strokeStyle = '#0a1a2a'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI*2); ctx.stroke();
        // metal ring
        ctx.strokeStyle = '#aab4c8'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI*2); ctx.stroke();
        // antenna
        ctx.strokeStyle = '#aab4c8'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(10, -13); ctx.lineTo(15, -22); ctx.stroke();
        const ag = ctx.createRadialGradient(14.5,-22.5,.3,15,-22,2);
        ag.addColorStop(0,'#ff8a98'); ag.addColorStop(1,'#7a0a18');
        ctx.fillStyle = ag;
        ctx.beginPath(); ctx.arc(15, -22, 2, 0, Math.PI*2); ctx.fill();
        // reflection swoosh
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.beginPath();
        ctx.ellipse(-6, -5, 2.5, 7, .4, 0, Math.PI*2);
        ctx.fill();
      }
    },

    { id:'fedora', name:'Fedora', draw: (ctx) => {
        // brim
        const bg = ctx.createLinearGradient(0,-3,0,3);
        bg.addColorStop(0,'#5a3a18'); bg.addColorStop(1,'#1a0e04');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.ellipse(0, 0, 15, 3.5, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#0a0408'; ctx.lineWidth = .8; ctx.stroke();
        // crown with pinch
        const cg = ctx.createLinearGradient(0,-12,0,0);
        cg.addColorStop(0,'#a06438'); cg.addColorStop(1,'#3a1a08');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-9, -11, 0, -12);
        ctx.quadraticCurveTo(9, -11, 8, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 1; ctx.stroke();
        // pinch
        ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(0, -10); ctx.lineTo(3, -8); ctx.stroke();
        // ribbon
        const rg = ctx.createLinearGradient(0,-4,0,-1);
        rg.addColorStop(0,'#1a1a22'); rg.addColorStop(1,'#0a0810');
        ctx.fillStyle = rg; ctx.fillRect(-8, -4, 16, 2.5);
        // feather
        ctx.fillStyle = '#cc1a3a';
        ctx.beginPath();
        ctx.moveTo(5, -4); ctx.lineTo(8, -10); ctx.lineTo(6, -10); ctx.lineTo(4, -4); ctx.closePath(); ctx.fill();
      }
    },

    { id:'jester', name:'Jester', draw: (ctx) => {
        // base cap with diamond pattern
        ctx.fillStyle = '#5b3aff';
        ctx.beginPath(); ctx.arc(0, -1, 12, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#ff3d6e';
        for (const [x,y] of [[-7,-3],[3,-3],[-3,-9],[5,-9]]) {
          ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x+3, y-3); ctx.lineTo(x+6, y); ctx.lineTo(x+3, y+3); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = '#0a0420'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, -1, 12, Math.PI, 0); ctx.stroke();
        // brim
        ctx.fillStyle = '#1a0a40'; ctx.fillRect(-13, -1, 26, 2);
        // three floppy points with bells
        const pts = [[-11,-9],[0,-15],[11,-9]];
        for (const [x,y] of pts) {
          const sg = ctx.createLinearGradient(x-2,0,x+2,y);
          sg.addColorStop(0,'#5b3aff'); sg.addColorStop(1,'#ff3d6e');
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.moveTo(x-2.5, -1); ctx.lineTo(x+2.5, -1); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#0a0420'; ctx.lineWidth = .8; ctx.stroke();
          // bell
          const bg = ctx.createRadialGradient(x-.5,y-.5,.2,x,y,2.5);
          bg.addColorStop(0,'#fff1a0'); bg.addColorStop(1,'#a86a14');
          ctx.fillStyle = bg;
          ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#5a3408'; ctx.lineWidth = .6; ctx.stroke();
        }
      }
    },

    { id:'flame_hair', name:'Flame Hair', draw: (ctx) => {
        const flames = [-11,-6,-1,4,9,12];
        for (const x of flames) {
          const g = ctx.createLinearGradient(x, 4, x, -14);
          g.addColorStop(0, '#ff4d2e'); g.addColorStop(.5, '#ff8a3d'); g.addColorStop(1, '#fff1a0');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x-3, 4); ctx.quadraticCurveTo(x-2, -8, x, -14);
          ctx.quadraticCurveTo(x+2, -8, x+3, 4); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(120,30,8,.6)'; ctx.lineWidth = .6; ctx.stroke();
        }
        // sparks
        ctx.fillStyle = '#fff';
        for (const [x,y] of [[-4,-16],[7,-13],[2,-10],[-9,-12]]) {
          ctx.beginPath(); ctx.arc(x, y, .8, 0, Math.PI*2); ctx.fill();
        }
      }
    },

    { id:'ribbon', name:'Pink Bow', draw: (ctx) => {
        // tails
        ctx.fillStyle = '#cc1a6a';
        ctx.beginPath();
        ctx.moveTo(-2, 0); ctx.lineTo(-7, 6); ctx.lineTo(-3, 7); ctx.lineTo(-1, 2); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo( 2, 0); ctx.lineTo( 7, 6); ctx.lineTo( 3, 7); ctx.lineTo( 1, 2); ctx.closePath(); ctx.fill();
        // bows
        const g = ctx.createLinearGradient(-9,-5,9,5);
        g.addColorStop(0,'#ffb5d8'); g.addColorStop(.5,'#ff7bc6'); g.addColorStop(1,'#cc1a6a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-2, -1); ctx.lineTo(-10, -7); ctx.lineTo(-10, 4); ctx.lineTo(-2, 2); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo( 2, -1); ctx.lineTo( 10, -7); ctx.lineTo( 10, 4); ctx.lineTo( 2, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#400418'; ctx.lineWidth = .8;
        ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(-10, -7); ctx.lineTo(-10, 4); ctx.lineTo(-2, 2); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( 2, -1); ctx.lineTo( 10, -7); ctx.lineTo( 10, 4); ctx.lineTo( 2, 2); ctx.closePath(); ctx.stroke();
        // knot
        ctx.fillStyle = '#ff5ba0';
        ctx.fillRect(-2.5, -2.5, 5, 6);
        ctx.strokeStyle = '#400418'; ctx.lineWidth = .8;
        ctx.strokeRect(-2.5, -2.5, 5, 6);
        // sheen
        ctx.fillStyle = '#ffd8e8';
        ctx.fillRect(-8, -3, 1.5, 4);
        ctx.fillRect( 7, -3, 1.5, 4);
      }
    },

    // ---------- NEW FLAGSHIPS ----------
    { id:'dragon_helm', name:'Dragon Helm', draw: (ctx) => {
        // dome
        const g = ctx.createLinearGradient(0,-26,0,4);
        g.addColorStop(0,'#1a2a08'); g.addColorStop(.5,'#3a6a14'); g.addColorStop(1,'#0a1a04');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 15, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.stroke();
        // scales (rows)
        ctx.fillStyle = 'rgba(120,180,40,.4)';
        for (let row = 0; row < 3; row++) {
          for (let i = -2; i <= 2; i++) {
            const x = i * 5 + (row%2 ? 2.5 : 0);
            const y = -3 - row*4;
            ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI, true); ctx.fill();
          }
        }
        // dragon spines
        ctx.fillStyle = '#7af030';
        for (const [x,h2] of [[-3,4],[0,6],[3,4]]) {
          ctx.beginPath();
          ctx.moveTo(x-1.5, -14); ctx.lineTo(x+1.5, -14); ctx.lineTo(x, -14-h2); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#1a4408'; ctx.lineWidth = .6; ctx.stroke();
        }
        // glowing eyes (slits)
        ctx.fillStyle = '#ffaa14';
        ctx.fillRect(-7, -3, 4, 1.5); ctx.fillRect(3, -3, 4, 1.5);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-5, -2.7, 1, .8); ctx.fillRect(5, -2.7, 1, .8);
        // horns
        const drawHorn = (sx) => {
          ctx.fillStyle = '#f0e8d0';
          ctx.beginPath();
          ctx.moveTo(sx*10, -7); ctx.quadraticCurveTo(sx*16, -12, sx*14, -19);
          ctx.quadraticCurveTo(sx*12, -14, sx*8, -7); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#5a4a20'; ctx.lineWidth = .8; ctx.stroke();
        };
        drawHorn(-1); drawHorn(1);
      }
    },

    { id:'visor', name:'Knight Visor', draw: (ctx) => {
        // helmet
        const g = ctx.createLinearGradient(-12, -26, 12, 0);
        g.addColorStop(0,'#d8d8e0'); g.addColorStop(.5,'#888892'); g.addColorStop(1,'#2a2a32');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 1, 15, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 1.2; ctx.stroke();
        // visor slits (3 horizontal lines)
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(-10, -5, 20, 2);
        ctx.fillRect(-10, -1, 20, 2);
        ctx.fillRect(-10, 3, 20, 2);
        // glow inside visor
        ctx.fillStyle = '#5bf0e8';
        ctx.fillRect(-9, -4.5, 18, .6);
        // feather
        const fg = ctx.createLinearGradient(0,-24,0,-12);
        fg.addColorStop(0,'#5bf0e8'); fg.addColorStop(1,'#0a2a3a');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(0, -14); ctx.quadraticCurveTo(-4, -22, 0, -28);
        ctx.quadraticCurveTo(4, -22, 0, -14); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#0a1a2a'; ctx.lineWidth = .8; ctx.stroke();
        // feather barbs
        ctx.strokeStyle = '#0a1a2a'; ctx.lineWidth = .5;
        for (let yy = -16; yy >= -26; yy -= 2) {
          ctx.beginPath();
          ctx.moveTo(-1, yy); ctx.lineTo(1, yy+1); ctx.stroke();
        }
        // shine
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.ellipse(-7, -10, 2, 5, 0.3, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'neon', name:'Neon Shades', draw: (ctx) => {
        // headband
        const bg = ctx.createLinearGradient(0,1,0,5); bg.addColorStop(0,'#0a0a14'); bg.addColorStop(1,'#1a1a22');
        ctx.fillStyle = bg; ctx.fillRect(-14, 1, 28, 3);
        // glow on band
        ctx.fillStyle = '#ff3df6'; ctx.fillRect(-14, 3.5, 28, .5);
        // glasses bridge area
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(-2, 4, 4, 1);
      }
    },

    { id:'viking', name:'Viking Helm', draw: (ctx) => {
        // dome
        const g = ctx.createLinearGradient(0,-26,0,2);
        g.addColorStop(0,'#a0a8b8'); g.addColorStop(1,'#3a4250');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 13, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#0a0e18'; ctx.lineWidth = 1.2; ctx.stroke();
        // nose guard
        ctx.fillStyle = '#5a6270';
        ctx.fillRect(-1.5, -2, 3, 5);
        ctx.strokeStyle = '#0a0e18'; ctx.lineWidth = .6; ctx.strokeRect(-1.5, -2, 3, 5);
        // rim
        ctx.fillStyle = '#3a4250'; ctx.fillRect(-13, -1, 26, 2);
        // RIVETS
        ctx.fillStyle = '#1a1e28';
        for (const a of [-2.8, -2.2, -1.6, -0.94]) {
          ctx.beginPath(); ctx.arc(Math.cos(a)*11.5, Math.sin(a)*11.5, 1, 0, Math.PI*2); ctx.fill();
        }
        // HORNS (curved bull-style)
        const drawHorn = (sx) => {
          const hg = ctx.createLinearGradient(sx*10, -4, sx*16, -14);
          hg.addColorStop(0,'#f0e8d0'); hg.addColorStop(1,'#7a6020');
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.moveTo(sx*8, -7); ctx.quadraticCurveTo(sx*22, -8, sx*20, -26);
          ctx.quadraticCurveTo(sx*16, -12, sx*6, -7); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#3a2a08'; ctx.lineWidth = .8; ctx.stroke();
          // ridges
          ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = .5;
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(sx*(10+i*2), -8-i); ctx.lineTo(sx*(11+i*2), -10-i);
            ctx.stroke();
          }
        };
        drawHorn(-1); drawHorn(1);
      }
    },

    { id:'fox_mask', name:'Kitsune Mask', draw: (ctx) => {
        // mask shape
        const g = ctx.createLinearGradient(0,-12,0,4);
        g.addColorStop(0,'#fff'); g.addColorStop(1,'#e8d8c8');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-13, -4); ctx.quadraticCurveTo(-15, -10, -8, -13);
        ctx.quadraticCurveTo(0, -16, 8, -13); ctx.quadraticCurveTo(15, -10, 13, -4);
        ctx.quadraticCurveTo(8, 1, 0, 3); ctx.quadraticCurveTo(-8, 1, -13, -4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#aa1010'; ctx.lineWidth = 1; ctx.stroke();
        // ears
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-13, -9); ctx.lineTo(-10, -26); ctx.lineTo(-6, -12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#aa1010'; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(13, -9); ctx.lineTo(10, -26); ctx.lineTo(6, -12); ctx.closePath(); ctx.fill();
        ctx.stroke();
        // inner ear red
        ctx.fillStyle = '#cc1a3a';
        ctx.beginPath();
        ctx.moveTo(-11, -11); ctx.lineTo(-10, -16); ctx.lineTo(-8, -12); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(11, -11); ctx.lineTo(10, -16); ctx.lineTo(8, -12); ctx.closePath(); ctx.fill();
        // red markings (eye area)
        ctx.fillStyle = '#cc1a3a';
        ctx.beginPath(); ctx.arc(-6, -6, 2.4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc( 6, -6, 2.4, 0, Math.PI*2); ctx.fill();
        // eye holes black
        ctx.fillStyle = '#0a0408';
        ctx.beginPath(); ctx.arc(-6, -6, 1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc( 6, -6, 1, 0, Math.PI*2); ctx.fill();
        // forehead mark
        ctx.fillStyle = '#cc1a3a';
        ctx.beginPath();
        ctx.moveTo(0, -10); ctx.lineTo(2, -8); ctx.lineTo(0, -6); ctx.lineTo(-2, -8); ctx.closePath(); ctx.fill();
        // strap line
        ctx.strokeStyle = '#aa1010'; ctx.lineWidth = .5;
        ctx.beginPath(); ctx.moveTo(-13, -2); ctx.lineTo(-12, 0); ctx.moveTo(13, -2); ctx.lineTo(12, 0); ctx.stroke();
      }
    },

    { id:'jetpack_helm', name:'Jetpack Helm', draw: (ctx) => {
        // helmet
        const g = ctx.createLinearGradient(0, -16, 0, 2);
        g.addColorStop(0, '#ff7676'); g.addColorStop(.5, '#cc1a3a'); g.addColorStop(1, '#5a0a14');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 13, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#400408'; ctx.lineWidth = 1.2; ctx.stroke();
        // visor band
        ctx.fillStyle = '#0a0a14'; ctx.fillRect(-12, -4, 24, 4);
        ctx.fillStyle = '#5bf0e8'; ctx.fillRect(-11, -3, 22, 1.5);
        // chin strap line
        ctx.strokeStyle = '#400408'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-13, 1); ctx.lineTo(-15, 6); ctx.moveTo(13, 1); ctx.lineTo(15, 6); ctx.stroke();
        // jet exhausts (two cones at the sides angled back)
        for (const sx of [-1, 1]) {
          const eg = ctx.createLinearGradient(sx*13, -3, sx*20, 0);
          eg.addColorStop(0, '#fff'); eg.addColorStop(.4, '#5bf0e8'); eg.addColorStop(1, 'rgba(91,240,232,0)');
          ctx.fillStyle = eg;
          ctx.beginPath();
          ctx.moveTo(sx*12, -3); ctx.lineTo(sx*22, 1); ctx.lineTo(sx*12, 3); ctx.closePath(); ctx.fill();
        }
        // top antenna with blinker
        ctx.strokeStyle = '#400408'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(0, -19); ctx.stroke();
        const bg = ctx.createRadialGradient(-.4, -19.4, .2, 0, -19, 2);
        bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#ffd84a');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(0, -19, 1.8, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'halo_crown', name:'Halo Crown', draw: (ctx) => {
        // crown band
        const cg = ctx.createLinearGradient(-12, -3, 12, -3);
        cg.addColorStop(0, '#c89014'); cg.addColorStop(.5, '#fff1a0'); cg.addColorStop(1, '#c89014');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(-12, 1); ctx.lineTo(-12, -6);
        ctx.lineTo(-7, -2); ctx.lineTo(-3, -10);
        ctx.lineTo(0, -3); ctx.lineTo(3, -10);
        ctx.lineTo(7, -2); ctx.lineTo(12, -6);
        ctx.lineTo(12, 1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#3a2208'; ctx.lineWidth = 1; ctx.stroke();
        // floating halo above
        const glow = ctx.createRadialGradient(0, -16, 3, 0, -16, 16);
        glow.addColorStop(0, 'rgba(255,240,160,.7)');
        glow.addColorStop(1, 'rgba(255,200,60,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.ellipse(0, -16, 14, 5, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff5b8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, -16, 12, 4, 0, 0, Math.PI*2); ctx.stroke();
        // jewels in crown
        ctx.fillStyle = '#ff3d6e';
        ctx.beginPath(); ctx.arc(0, -2, 1.6, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'magma', name:'Magma Helm', draw: (ctx) => {
        // dark base
        const g = ctx.createLinearGradient(0,-14,0,2);
        g.addColorStop(0,'#3a1208'); g.addColorStop(1,'#0a0408');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 13, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.stroke();
        // glowing cracks (orange)
        ctx.strokeStyle = '#ff7a18'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-8, -2); ctx.lineTo(-4, -8); ctx.lineTo(-1, -3);
        ctx.moveTo(2, -10); ctx.lineTo(5, -5); ctx.lineTo(9, -3);
        ctx.moveTo(-3, 1); ctx.lineTo(2, 1);
        ctx.stroke();
        // brighter inner glow
        ctx.strokeStyle = '#fff1a0'; ctx.lineWidth = .5;
        ctx.beginPath();
        ctx.moveTo(-8, -2); ctx.lineTo(-4, -8); ctx.lineTo(-1, -3);
        ctx.moveTo(2, -10); ctx.lineTo(5, -5); ctx.lineTo(9, -3);
        ctx.stroke();
        // dripping lava
        ctx.fillStyle = '#ff4d2e';
        ctx.beginPath();
        ctx.moveTo(-5, 1); ctx.lineTo(-3, 1); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, 1); ctx.lineTo(6, 1); ctx.lineTo(5, 5); ctx.closePath(); ctx.fill();
        // smoke wisp top
        ctx.fillStyle = 'rgba(60,60,80,.4)';
        ctx.beginPath(); ctx.arc(-2, -16, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, -19, 2, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'ice_tiara', name:'Ice Tiara', draw: (ctx) => {
        // base arch
        const g = ctx.createLinearGradient(-14, 0, 14, 0);
        g.addColorStop(0, '#7ad4ff'); g.addColorStop(.5, '#e0f8ff'); g.addColorStop(1, '#7ad4ff');
        ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-13, 1); ctx.quadraticCurveTo(-9, -8, 0, -11); ctx.quadraticCurveTo(9, -8, 13, 1);
        ctx.stroke();
        // ice shards (5 spikes)
        const tips = [[-9,-7],[ -4,-12],[0,-15],[4,-12],[9,-7]];
        for (const [tx, ty] of tips) {
          const sg = ctx.createLinearGradient(tx, 0, tx, ty);
          sg.addColorStop(0, '#5bf0e8'); sg.addColorStop(1, '#fff');
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.moveTo(tx-2, -2); ctx.lineTo(tx+2, -2); ctx.lineTo(tx, ty); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#1a6a7a'; ctx.lineWidth = .6; ctx.stroke();
        }
        // sparkles
        ctx.fillStyle = '#fff';
        for (const [x,y] of [[-11,-10],[6,-13],[-2,-17],[11,-9]]) {
          ctx.beginPath();
          ctx.moveTo(x, y-2); ctx.lineTo(x+.5, y); ctx.lineTo(x+2, y); ctx.lineTo(x+.5, y+.5);
          ctx.lineTo(x, y+2); ctx.lineTo(x-.5, y+.5); ctx.lineTo(x-2, y); ctx.lineTo(x-.5, y);
          ctx.closePath(); ctx.fill();
        }
      }
    },

    { id:'masquerade', name:'Masquerade', draw: (ctx) => {
        // mask shape over eyes (drawn high on head)
        ctx.fillStyle = '#1a0a40';
        ctx.beginPath();
        ctx.moveTo(-14, -1); ctx.quadraticCurveTo(-16, -8, -8, -10);
        ctx.quadraticCurveTo(-2, -7, 0, -8); ctx.quadraticCurveTo(2, -7, 8, -10);
        ctx.quadraticCurveTo(16, -8, 14, -1);
        ctx.quadraticCurveTo(8, -3, 0, -3); ctx.quadraticCurveTo(-8, -3, -14, -1);
        ctx.closePath(); ctx.fill();
        // gold trim
        ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 1;
        ctx.stroke();
        // feather plume on side
        const fg = ctx.createLinearGradient(8, -10, 16, -22);
        fg.addColorStop(0, '#5bf0e8'); fg.addColorStop(.5, '#9a3aff'); fg.addColorStop(1, '#fff1a0');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(8, -10); ctx.quadraticCurveTo(12, -26, 16, -24);
        ctx.quadraticCurveTo(14, -26, 10, -10); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#3a1a55'; ctx.lineWidth = .5; ctx.stroke();
        // feather barbs
        ctx.strokeStyle = '#3a1a55'; ctx.lineWidth = .5;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(9 + i*0.8, -12 - i*2);
          ctx.lineTo(13 + i*0.5, -14 - i*2);
          ctx.stroke();
        }
        // eye holes (white)
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-6, -5, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc( 6, -5, 1.5, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'raccoon', name:'Raccoon Hood', draw: (ctx) => {
        // fur dome
        const g = ctx.createLinearGradient(0,-16,0,2);
        g.addColorStop(0,'#3a3a4a'); g.addColorStop(1,'#0a0a14');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 13, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        // white stripe down the middle
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.moveTo(-2, -13); ctx.lineTo(2, -13); ctx.lineTo(3, 0); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill();
        // pointed ears
        ctx.fillStyle = '#3a3a4a';
        ctx.beginPath();
        ctx.moveTo(-11, -8); ctx.lineTo(-7, -15); ctx.lineTo(-4, -10); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(11, -8); ctx.lineTo(7, -15); ctx.lineTo(4, -10); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = .6; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-11, -8); ctx.lineTo(-7, -15); ctx.lineTo(-4, -10); ctx.closePath(); ctx.stroke();
        // inner ear pink
        ctx.fillStyle = '#ffb5c8';
        ctx.beginPath();
        ctx.moveTo(-9, -9); ctx.lineTo(-7, -13); ctx.lineTo(-5, -10); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(9, -9); ctx.lineTo(7, -13); ctx.lineTo(5, -10); ctx.closePath(); ctx.fill();
        // little nose tip (peeking)
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath(); ctx.arc(0, 1, 1.2, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'sun', name:'Sun God', draw: (ctx) => {
        // glow
        const glow = ctx.createRadialGradient(0, -6, 4, 0, -6, 22);
        glow.addColorStop(0, 'rgba(255,220,80,.7)');
        glow.addColorStop(1, 'rgba(255,180,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, -6, 22, 0, Math.PI*2); ctx.fill();
        // rays
        ctx.fillStyle = '#ffd84a';
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI*2;
          const x1 = Math.cos(a)*8, y1 = -6 + Math.sin(a)*8;
          const x2 = Math.cos(a)*18, y2 = -6 + Math.sin(a)*18;
          ctx.save(); ctx.translate(x1, y1); ctx.rotate(a);
          ctx.beginPath();
          ctx.moveTo(0, -2); ctx.lineTo(10, 0); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        // sun disk
        const g = ctx.createRadialGradient(-3, -9, 1, 0, -6, 8);
        g.addColorStop(0,'#fff'); g.addColorStop(.5,'#ffd84a'); g.addColorStop(1,'#cc8a00');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, -6, 8, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#5a3408'; ctx.lineWidth = 1; ctx.stroke();
      }
    },

    // ---- new (v37) — themed hats that weren't covered before ----
    { id:'jester_bells', name:'Jester Cap (Bells)', draw: (ctx) => {
        // 3-pointed jester hat with bells
        ctx.fillStyle = '#b41a2a';
        ctx.beginPath();
        // Left point
        ctx.moveTo(-12, -2); ctx.lineTo(-16, -26); ctx.lineTo(-7, -10);
        ctx.lineTo(-3, -22); ctx.lineTo(2, -10); ctx.lineTo(8, -22);
        ctx.lineTo(12, -10); ctx.lineTo(14, -2);
        ctx.closePath(); ctx.fill();
        // Half-yellow stripe
        ctx.fillStyle = '#fff1a0';
        ctx.beginPath();
        ctx.moveTo(-3, -22); ctx.lineTo(2, -10); ctx.lineTo(8, -22);
        ctx.closePath(); ctx.fill();
        // Bells
        ctx.fillStyle = '#ffd76a';
        ctx.beginPath(); ctx.arc(-16, -26, 2.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-3, -22, 2.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -22, 2.2, 0, Math.PI*2); ctx.fill();
        // Outline
        ctx.strokeStyle = '#3a0a14'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-12, -2); ctx.lineTo(-16, -26); ctx.lineTo(-7, -10);
        ctx.lineTo(-3, -22); ctx.lineTo(2, -10); ctx.lineTo(8, -22);
        ctx.lineTo(12, -10); ctx.lineTo(14, -2);
        ctx.stroke();
      }
    },
    { id:'fox_ears', name:'Fox Ears', draw: (ctx) => {
        // Furry pointed ears
        ctx.fillStyle = '#e08a3a';
        // Left ear
        ctx.beginPath();
        ctx.moveTo(-9, -1); ctx.lineTo(-13, -14); ctx.lineTo(-3, -8);
        ctx.closePath(); ctx.fill();
        // Right ear
        ctx.beginPath();
        ctx.moveTo(9, -1); ctx.lineTo(13, -14); ctx.lineTo(3, -8);
        ctx.closePath(); ctx.fill();
        // Inner ear pink
        ctx.fillStyle = '#ff9ec4';
        ctx.beginPath();
        ctx.moveTo(-8, -3); ctx.lineTo(-11, -11); ctx.lineTo(-5, -7);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(8, -3); ctx.lineTo(11, -11); ctx.lineTo(5, -7);
        ctx.closePath(); ctx.fill();
        // Outline
        ctx.strokeStyle = '#5a3014'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-9, -1); ctx.lineTo(-13, -14); ctx.lineTo(-3, -8); ctx.closePath();
        ctx.moveTo(9, -1); ctx.lineTo(13, -14); ctx.lineTo(3, -8); ctx.closePath();
        ctx.stroke();
      }
    },
    { id:'wizard_starry', name:'Starry Wizard Hat', draw: (ctx) => {
        // Tall cone wizard hat with stars
        const g = ctx.createLinearGradient(0, -28, 0, -2);
        g.addColorStop(0, '#1a1a4a'); g.addColorStop(1, '#4a3a8a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-15, -2); ctx.lineTo(2, -32); ctx.lineTo(13, -4);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#0a081a'; ctx.lineWidth = 1.2; ctx.stroke();
        // Brim
        ctx.fillStyle = '#4a3a8a';
        ctx.beginPath(); ctx.ellipse(0, -1, 17, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#0a081a'; ctx.lineWidth = 1; ctx.stroke();
        // Stars
        ctx.fillStyle = '#ffd84a';
        const star = (cx, cy, r) => {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = i * (Math.PI * 2 / 5) - Math.PI / 2;
            const a2 = a + Math.PI / 5;
            ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            ctx.lineTo(cx + Math.cos(a2) * r * 0.45, cy + Math.sin(a2) * r * 0.45);
          }
          ctx.closePath(); ctx.fill();
        };
        star(-4, -14, 2);
        star(4, -22, 1.6);
        star(-1, -8, 1.4);
      }
    },
    { id:'antlers_branched', name:'Branched Antlers', draw: (ctx) => {
        ctx.strokeStyle = '#8a5028'; ctx.lineWidth = 2.6;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // Left antler
        ctx.beginPath();
        ctx.moveTo(-7, -3); ctx.lineTo(-9, -10); ctx.lineTo(-14, -16);
        ctx.moveTo(-9, -10); ctx.lineTo(-5, -14);
        ctx.moveTo(-12, -14); ctx.lineTo(-13, -20);
        ctx.stroke();
        // Right antler
        ctx.beginPath();
        ctx.moveTo(7, -3); ctx.lineTo(9, -10); ctx.lineTo(14, -16);
        ctx.moveTo(9, -10); ctx.lineTo(5, -14);
        ctx.moveTo(12, -14); ctx.lineTo(13, -20);
        ctx.stroke();
        // Highlights
        ctx.strokeStyle = '#b07842'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-7, -3); ctx.lineTo(-9, -10);
        ctx.moveTo(7, -3); ctx.lineTo(9, -10);
        ctx.stroke();
      }
    },
    { id:'flower_crown', name:'Flower Crown', draw: (ctx) => {
        // Ring of small flowers across the brow
        const colors = ['#ff7bc6', '#ffd76a', '#a5f3ff', '#7bff5a'];
        for (let i = 0; i < 7; i++) {
          const t = (i - 3) / 3;
          const x = t * 12;
          const y = -2 - Math.abs(t) * 1.5;
          ctx.fillStyle = colors[i % colors.length];
          for (let p = 0; p < 5; p++) {
            const a = p * (Math.PI * 2 / 5);
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * 2, y + Math.sin(a) * 2, 1.3, 0, Math.PI*2);
            ctx.fill();
          }
          ctx.fillStyle = '#fff1a0';
          ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI*2); ctx.fill();
        }
      }
    },
  ];

  // ---------- OUTFITS ----------
  // Anchor (0,0) = chest pivot (top of torso). Body runs y=0 (top) to y=28 (waist). x roughly -13..13.
  const OUTFITS = [
    { id:'none', name:'Bare', draw: () => {} },

    { id:'cape_red', name:'Red Cape', behind:true, draw: (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 36);
        g.addColorStop(0, '#ff3d4a'); g.addColorStop(.6, '#a01020'); g.addColorStop(1, '#3a0a14');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-3, -3); ctx.quadraticCurveTo(-17, 14, -13, 36);
        ctx.lineTo(13, 36); ctx.quadraticCurveTo(17, 14, 3, -3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#0a0408'; ctx.lineWidth = 1; ctx.stroke();
        // folds
        ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1;
        for (const x of [-7, 0, 7]) {
          ctx.beginPath();
          ctx.moveTo(x, 2); ctx.quadraticCurveTo(x*0.8, 18, x, 34); ctx.stroke();
        }
        // sheen
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.fillRect(-10, 4, 1.5, 28);
        // gold clasp
        const cg = ctx.createRadialGradient(-.5,-1.5,.2,0,-1,2);
        cg.addColorStop(0,'#fff1a0'); cg.addColorStop(1,'#a86a14');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(0, -1, 2, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'cape_purple', name:'Royal Cape', behind:true, draw: (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 38);
        g.addColorStop(0, '#7a3aff'); g.addColorStop(.5, '#3a1a8a'); g.addColorStop(1, '#0a0420');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-3, -3); ctx.quadraticCurveTo(-16, 16, -14, 38);
        ctx.lineTo(14, 38); ctx.quadraticCurveTo(16, 16, 3, -3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#0a0420'; ctx.lineWidth = 1; ctx.stroke();
        // moon emblem
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath(); ctx.arc(0, 14, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#3a1a8a';
        ctx.beginPath(); ctx.arc(1.5, 13, 3.4, 0, Math.PI*2); ctx.fill();
        // stars
        ctx.fillStyle = '#fff';
        for (const [x,y] of [[-7,6],[8,8],[-5,22],[6,26],[-9,28]]) {
          ctx.beginPath(); ctx.arc(x, y, .8, 0, Math.PI*2); ctx.fill();
        }
        // ermine collar (white with black dots)
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(0, -2, 7, 2, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#0a0a14';
        for (const x of [-4, 0, 4]) {
          ctx.fillRect(x-.5, -2.5, 1, 1.5);
        }
      }
    },

    { id:'cape_black', name:'Dark Cloak', behind:true, draw: (ctx) => {
        // hood arc behind head
        ctx.fillStyle = '#1a1a22';
        ctx.beginPath(); ctx.arc(0, -16, 14, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = .8; ctx.stroke();
        // cloak body
        const g = ctx.createLinearGradient(0, 0, 0, 40);
        g.addColorStop(0, '#2a2230'); g.addColorStop(1, '#0a0810');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-4, -2); ctx.quadraticCurveTo(-26, 14, -15, 40);
        ctx.lineTo(15, 40); ctx.quadraticCurveTo(18, 14, 4, -2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        // mysterious tatter
        ctx.fillStyle = '#0a0810';
        for (const [x,y,w] of [[-8,36,5],[2,38,7],[10,34,5]]) {
          ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x+w, y); ctx.lineTo(x+w/2, y+4); ctx.closePath(); ctx.fill();
        }
      }
    },

    { id:'jacket', name:'Bomber Jacket', draw: (ctx) => {
        // body
        const g = ctx.createLinearGradient(-12, 0, 12, 22);
        g.addColorStop(0, '#5fa0ff'); g.addColorStop(.6, '#2a5aa8'); g.addColorStop(1, '#0a1a3a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-12, 4); ctx.quadraticCurveTo(-14, 18, -10, 28);
        ctx.lineTo(10, 28); ctx.quadraticCurveTo(14, 18, 12, 4);
        ctx.quadraticCurveTo(0, 0, -12, 4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        // fur collar
        ctx.fillStyle = '#a87034';
        ctx.beginPath(); ctx.ellipse(0, 3, 10, 2.5, 0, 0, Math.PI*2); ctx.fill();
        for (let i = -8; i <= 8; i += 2) {
          ctx.fillStyle = i%4 ? '#cc8a44' : '#a87034';
          ctx.beginPath(); ctx.arc(i, 3, 1.2, 0, Math.PI*2); ctx.fill();
        }
        // zipper
        ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 26); ctx.stroke();
        for (let yy = 5; yy < 26; yy += 2) {
          ctx.fillStyle = '#ffd84a';
          ctx.fillRect(-.7, yy, 1.4, 1);
        }
        // cuffs
        ctx.fillStyle = '#ffd84a';
        ctx.fillRect(-13, 26, 6, 2.5); ctx.fillRect(7, 26, 6, 2.5);
        ctx.strokeStyle = '#7a5210'; ctx.lineWidth = .6;
        ctx.strokeRect(-13, 26, 6, 2.5); ctx.strokeRect(7, 26, 6, 2.5);
        // patch on chest
        ctx.fillStyle = '#ff3d6e'; ctx.fillRect(4, 10, 5, 3);
        ctx.strokeStyle = '#7a0a18'; ctx.lineWidth = .5; ctx.strokeRect(4, 10, 5, 3);
      }
    },

    { id:'robe', name:'Wizard Robe', draw: (ctx) => {
        const g = ctx.createLinearGradient(-14, 0, 14, 28);
        g.addColorStop(0, '#5b3aff'); g.addColorStop(.5, '#2a1a55'); g.addColorStop(1, '#0a0420');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-16, 16, -14, 32);
        ctx.lineTo(14, 32); ctx.quadraticCurveTo(16, 16, 9, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        // belt
        const bg = ctx.createLinearGradient(0,14,0,18);
        bg.addColorStop(0,'#fff1a0'); bg.addColorStop(1,'#a86a14');
        ctx.fillStyle = bg; ctx.fillRect(-11, 15, 22, 3);
        ctx.strokeStyle = '#5a3408'; ctx.lineWidth = .6; ctx.strokeRect(-11, 15, 22, 3);
        // buckle gem
        ctx.fillStyle = '#cc1a3a';
        ctx.beginPath(); ctx.arc(0, 16.5, 1.8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-.5, 16, .7, 0, Math.PI*2); ctx.fill();
        // moon and stars
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath(); ctx.arc(-5, 7, 2.2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#3a1a55';
        ctx.beginPath(); ctx.arc(-4, 6.5, 1.8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        for (const [x,y] of [[3,4],[6,11],[-3,22],[5,25]]) {
          ctx.beginPath(); ctx.arc(x, y, .9, 0, Math.PI*2); ctx.fill();
        }
      }
    },

    { id:'armor', name:'Plate Armor', draw: (ctx) => {
        // shoulder plates
        const sg = ctx.createLinearGradient(0,0,0,10);
        sg.addColorStop(0,'#c8d0e0'); sg.addColorStop(1,'#5a6478');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.ellipse(-11, 4, 4.5, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(11, 4, 4.5, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#1a2030'; ctx.lineWidth = .8; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(-11, 4, 4.5, 3, 0, 0, Math.PI*2); ctx.stroke();
        // chest plate
        const g = ctx.createLinearGradient(-10, 2, 10, 24);
        g.addColorStop(0, '#d0d8e8'); g.addColorStop(.5, '#7a8294'); g.addColorStop(1, '#2a323e');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-10, 4); ctx.quadraticCurveTo(-12, 16, -9, 26);
        ctx.lineTo(9, 26); ctx.quadraticCurveTo(12, 16, 10, 4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#0a0e18'; ctx.lineWidth = 1; ctx.stroke();
        // emblem (lion-ish crest)
        ctx.fillStyle = '#cc1a3a';
        ctx.beginPath();
        ctx.moveTo(0, 8); ctx.lineTo(5, 14); ctx.lineTo(0, 22); ctx.lineTo(-5, 14); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#5a0a18'; ctx.lineWidth = .8; ctx.stroke();
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath(); ctx.arc(0, 15, 1.5, 0, Math.PI*2); ctx.fill();
        // rivets
        ctx.fillStyle = '#0a0e18';
        for (const [x,y] of [[-8,6],[8,6],[-8,24],[8,24]]) {
          ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI*2); ctx.fill();
        }
        // sheen
        ctx.fillStyle = 'rgba(255,255,255,.15)';
        ctx.fillRect(-7, 7, 1.5, 14);
      }
    },

    { id:'hoodie', name:'Hoodie', draw: (ctx) => {
        // hood behind head (drawn first to layer)
        ctx.fillStyle = '#5a5a72';
        ctx.beginPath(); ctx.arc(0, -12, 15, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#3a3a4a';
        ctx.beginPath(); ctx.arc(0, -10, 13, 0, Math.PI*2); ctx.fill();
        // body
        const g = ctx.createLinearGradient(-10, 0, 10, 28);
        g.addColorStop(0, '#5a5a72'); g.addColorStop(1, '#1a1a22');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-10, 4); ctx.lineTo(-12, 28); ctx.lineTo(12, 28); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        // pocket
        ctx.fillStyle = '#1a1a22';
        ctx.beginPath();
        ctx.moveTo(-7, 16); ctx.lineTo(7, 16); ctx.lineTo(8, 22); ctx.lineTo(-8, 22); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = .6; ctx.stroke();
        // strings
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.lineCap='round';
        ctx.beginPath();
        ctx.moveTo(-2.5, 0); ctx.lineTo(-3, 10);
        ctx.moveTo(2.5, 0); ctx.lineTo(3, 10);
        ctx.stroke();
        // string tips
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-3, 10, 1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, 10, 1, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'tshirt', name:'Sport Tee', draw: (ctx) => {
        const g = ctx.createLinearGradient(-10, 0, 10, 22);
        g.addColorStop(0, '#a0ffa8'); g.addColorStop(1, '#3a8a44');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-10, 2); ctx.quadraticCurveTo(-13, 10, -11, 24);
        ctx.lineTo(11, 24); ctx.quadraticCurveTo(13, 10, 10, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1a4a22'; ctx.lineWidth = 1; ctx.stroke();
        // sleeve cuffs
        ctx.fillStyle = '#1a4a22';
        ctx.fillRect(-11, 2, 4, 2); ctx.fillRect(7, 2, 4, 2);
        // collar
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-3, 2); ctx.lineTo(3, 2); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1a4a22'; ctx.lineWidth = .6; ctx.stroke();
        // big number
        ctx.fillStyle = '#fff';
        ctx.font = "bold 14px sans-serif"; ctx.textAlign = 'center';
        ctx.fillText('7', 0, 18);
        ctx.strokeStyle = '#1a4a22'; ctx.lineWidth = .8;
        ctx.strokeText('7', 0, 18);
      }
    },

    { id:'tuxedo', name:'Tuxedo', draw: (ctx) => {
        // jacket
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath();
        ctx.moveTo(-10, 2); ctx.quadraticCurveTo(-12, 16, -10, 28);
        ctx.lineTo(10, 28); ctx.quadraticCurveTo(12, 16, 10, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        // shirt V
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-3, 2); ctx.lineTo(3, 2); ctx.lineTo(0, 16); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = .6; ctx.stroke();
        // bowtie
        ctx.fillStyle = '#cc1a3a';
        ctx.beginPath();
        ctx.moveTo(-5, 3); ctx.lineTo(-1, 5); ctx.lineTo(-1, 1); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo( 5, 3); ctx.lineTo( 1, 5); ctx.lineTo( 1, 1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#7a0a18'; ctx.fillRect(-1, 1.5, 2, 3);
        // lapels (satin sheen)
        const lg = ctx.createLinearGradient(0,2,0,22);
        lg.addColorStop(0,'#22202c'); lg.addColorStop(1,'#0a0a14');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(-9, 24); ctx.lineTo(-3, 22); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo( 3, 4); ctx.lineTo( 9, 24); ctx.lineTo( 3, 22); ctx.closePath(); ctx.fill();
        // pocket square
        ctx.fillStyle = '#ff3d6e';
        ctx.beginPath();
        ctx.moveTo(-9, 12); ctx.lineTo(-6, 11); ctx.lineTo(-5, 14); ctx.lineTo(-7, 13); ctx.closePath(); ctx.fill();
        // buttons
        ctx.fillStyle = '#5a5a72';
        for (const y of [11, 16, 21]) {
          ctx.beginPath(); ctx.arc(0, y, .7, 0, Math.PI*2); ctx.fill();
        }
      }
    },

    { id:'dress', name:'Royal Dress', draw: (ctx) => {
        const g = ctx.createLinearGradient(-15, 0, 15, 32);
        g.addColorStop(0, '#ffb5d8'); g.addColorStop(.5, '#ff5ba0'); g.addColorStop(1, '#5a0a2a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-8, 2); ctx.lineTo(-16, 30); ctx.lineTo(16, 30); ctx.lineTo(8, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#5a0a2a'; ctx.lineWidth = 1; ctx.stroke();
        // bodice
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-7, 2); ctx.lineTo(7, 2); ctx.lineTo(5, 12); ctx.lineTo(-5, 12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = .6; ctx.stroke();
        // sash
        const sg = ctx.createLinearGradient(0,13,0,17);
        sg.addColorStop(0,'#fff1a0'); sg.addColorStop(1,'#a86a14');
        ctx.fillStyle = sg; ctx.fillRect(-10, 14, 20, 3);
        ctx.strokeStyle = '#5a3408'; ctx.lineWidth = .6; ctx.strokeRect(-10, 14, 20, 3);
        // gems on sash
        ctx.fillStyle = '#fff';
        for (const x of [-7, -2, 3, 8]) {
          ctx.beginPath(); ctx.arc(x, 15.5, .7, 0, Math.PI*2); ctx.fill();
        }
        // ruffle hem
        for (let x = -16; x < 16; x += 4) {
          ctx.beginPath(); ctx.arc(x+2, 30, 2, 0, Math.PI); ctx.fill();
        }
        // ribbon at chest
        ctx.fillStyle = '#cc1a3a';
        ctx.beginPath();
        ctx.moveTo(-3, 6); ctx.lineTo(0, 4); ctx.lineTo(3, 6); ctx.lineTo(2, 9); ctx.lineTo(-2, 9); ctx.closePath(); ctx.fill();
      }
    },

    { id:'mech', name:'Mech Suit', draw: (ctx) => {
        // shoulder plates
        ctx.fillStyle = '#2a323e';
        ctx.beginPath(); ctx.arc(-11, 2, 5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc( 11, 2, 5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#0a0e18'; ctx.lineWidth = .8; ctx.stroke();
        ctx.beginPath(); ctx.arc(-11, 2, 5, 0, Math.PI*2); ctx.stroke();
        // body
        const g = ctx.createLinearGradient(-10, 0, 10, 26);
        g.addColorStop(0, '#5a6478'); g.addColorStop(.5, '#2a323e'); g.addColorStop(1, '#0a0e18');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-10, 2); ctx.lineTo(-12, 28); ctx.lineTo(12, 28); ctx.lineTo(10, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        // power core glow
        const core = ctx.createRadialGradient(0, 12, 1, 0, 12, 6);
        core.addColorStop(0, '#fff'); core.addColorStop(.4, '#5bf0e8'); core.addColorStop(1, '#0a4a4a');
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(0, 12, 5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#0a4a4a'; ctx.lineWidth = .8; ctx.stroke();
        // panel lines (cyan)
        ctx.strokeStyle = '#5bf0e8'; ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(-6, 4); ctx.lineTo(-6, 10); ctx.lineTo(-3, 12);
        ctx.moveTo( 6, 4); ctx.lineTo( 6, 10); ctx.lineTo( 3, 12);
        ctx.moveTo(-6, 18); ctx.lineTo(-8, 26);
        ctx.moveTo( 6, 18); ctx.lineTo( 8, 26);
        ctx.stroke();
        // bolt heads
        ctx.fillStyle = '#0a0e18';
        for (const [x,y] of [[-9,5],[9,5],[-9,25],[9,25]]) {
          ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI*2); ctx.fill();
        }
      }
    },

    { id:'gi', name:'Karate Gi', draw: (ctx) => {
        // body white
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-11, 2); ctx.lineTo(-13, 28); ctx.lineTo(13, 28); ctx.lineTo(11, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1; ctx.stroke();
        // lapels crossed
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-7, 2); ctx.lineTo(-2, 16); ctx.lineTo(2, 16); ctx.lineTo(7, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = .8; ctx.stroke();
        // black belt
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(-12, 16, 24, 3);
        // belt tails
        ctx.fillRect(-3, 19, 2, 6); ctx.fillRect(1, 19, 2, 5);
        // shadow lines
        ctx.strokeStyle = 'rgba(0,0,0,.1)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, 8); ctx.lineTo(-9, 14);
        ctx.moveTo(10, 8); ctx.lineTo(9, 14);
        ctx.stroke();
      }
    },

    { id:'cyber', name:'Cyber Suit', draw: (ctx) => {
        // body main
        const g = ctx.createLinearGradient(-10, 0, 10, 28);
        g.addColorStop(0, '#1a1a2a'); g.addColorStop(.5, '#0a0a14'); g.addColorStop(1, '#000');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-10, 2); ctx.lineTo(-12, 28); ctx.lineTo(12, 28); ctx.lineTo(10, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        // glowing magenta circuit lines
        ctx.strokeStyle = '#ff3df6'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-7, 5); ctx.lineTo(-7, 10); ctx.lineTo(-3, 14);
        ctx.moveTo(7, 5); ctx.lineTo(7, 10); ctx.lineTo(3, 14);
        ctx.moveTo(-3, 18); ctx.lineTo(3, 18);
        ctx.moveTo(-5, 22); ctx.lineTo(5, 22);
        ctx.stroke();
        // cyan accent lines
        ctx.strokeStyle = '#5bf0e8'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-9, 8); ctx.lineTo(-9, 22);
        ctx.moveTo( 9, 8); ctx.lineTo( 9, 22);
        ctx.stroke();
        // chest hex node
        ctx.fillStyle = '#ff3df6';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI*2;
          ctx.lineTo(Math.cos(a)*3, 13 + Math.sin(a)*3);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 13, 1, 0, Math.PI*2); ctx.fill();
        // glowing bolt heads
        ctx.fillStyle = '#5bf0e8';
        for (const [x,y] of [[-9,5],[9,5],[-9,26],[9,26]]) {
          ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI*2); ctx.fill();
        }
      }
    },

    { id:'monk', name:'Monk Robe', draw: (ctx) => {
        // wide sleeves
        ctx.fillStyle = '#a05a18';
        ctx.beginPath(); ctx.ellipse(-12, 6, 5, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( 12, 6, 5, 4, 0, 0, Math.PI*2); ctx.fill();
        // body robe
        const g = ctx.createLinearGradient(-13, 0, 13, 30);
        g.addColorStop(0, '#cc7424'); g.addColorStop(.6, '#7a4012'); g.addColorStop(1, '#3a1a04');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-9, 2); ctx.lineTo(-15, 30); ctx.lineTo(15, 30); ctx.lineTo(9, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#3a1a04'; ctx.lineWidth = 1; ctx.stroke();
        // sash belt
        ctx.fillStyle = '#5a2a08'; ctx.fillRect(-11, 14, 22, 3);
        ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = .6; ctx.strokeRect(-11, 14, 22, 3);
        // hanging belt tie
        ctx.fillStyle = '#5a2a08';
        ctx.fillRect(-2, 17, 4, 8);
        // prayer beads necklace
        ctx.fillStyle = '#3a1a04';
        for (let a = -1; a <= 1; a += .25) {
          const x = Math.cos(a*Math.PI/2)*7;
          const y = 4 + Math.abs(Math.sin(a*Math.PI/2))*3;
          ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI*2); ctx.fill();
        }
        // big bead in center
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath(); ctx.arc(0, 8, 1.6, 0, Math.PI*2); ctx.fill();
      }
    },

    { id:'football', name:'Football Pads', draw: (ctx) => {
        // shoulder pads (big bulges)
        ctx.fillStyle = '#cc1a3a';
        ctx.beginPath(); ctx.ellipse(-12, 4, 6, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( 12, 4, 6, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#400418'; ctx.lineWidth = .8; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(-12, 4, 6, 4, 0, 0, Math.PI*2); ctx.stroke();
        // jersey body
        const g = ctx.createLinearGradient(-11,0,11,22);
        g.addColorStop(0,'#ff5b6e'); g.addColorStop(1,'#7a1830');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-10, 4); ctx.lineTo(-12, 28); ctx.lineTo(12, 28); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#400418'; ctx.lineWidth = 1; ctx.stroke();
        // number outline
        ctx.fillStyle = '#fff';
        ctx.font = "bold 12px sans-serif"; ctx.textAlign='center';
        ctx.fillText('99', 0, 22);
        ctx.strokeStyle = '#400418'; ctx.lineWidth = .8;
        ctx.strokeText('99', 0, 22);
      }
    },
  ];

  // ---------- FACES ----------
  // Anchor (0,0) = head center. Head radius now ~16.
  // facing: +1 right, -1 left.
  const FACES = [
    { id:'default', name:'Calm', draw: (ctx, facing) => {
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath(); ctx.arc(facing*4, 0, 2.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-facing*1, 0, 2, 0, Math.PI*2); ctx.fill();
        // eye shine
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(facing*4-.6, -.6, .7, 0, Math.PI*2); ctx.fill();
      }
    },
    { id:'angry', name:'Angry', draw: (ctx, facing) => {
        // eyes
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath(); ctx.arc(facing*5, 1, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-facing*2, 1, 2, 0, Math.PI*2); ctx.fill();
        // eyebrows
        ctx.strokeStyle = '#0a0a14'; ctx.lineWidth = 2; ctx.lineCap='round';
        ctx.beginPath();
        ctx.moveTo(facing*1, -4); ctx.lineTo(facing*8, -1);
        ctx.moveTo(-facing*5, -4); ctx.lineTo(-facing*1, -2);
        ctx.stroke();
        // frown
        ctx.beginPath();
        ctx.moveTo(-facing*3, 7); ctx.quadraticCurveTo(facing*1, 4, facing*5, 7);
        ctx.lineWidth = 1.5; ctx.stroke();
      }
    },
    { id:'happy', name:'Happy', draw: (ctx, facing) => {
        ctx.strokeStyle = '#0a0a14'; ctx.lineWidth = 2; ctx.lineCap='round';
        ctx.beginPath();
        ctx.arc(facing*4, 0, 2, Math.PI, 0);
        ctx.arc(-facing*1, 0, 2, Math.PI, 0);
        ctx.stroke();
        // wide smile
        ctx.beginPath();
        ctx.arc(facing*1, 4, 4, 0, Math.PI);
        ctx.stroke();
        // blush
        ctx.fillStyle = 'rgba(255,120,150,.5)';
        ctx.beginPath(); ctx.arc(facing*7, 5, 1.8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-facing*5, 5, 1.8, 0, Math.PI*2); ctx.fill();
      }
    },
    { id:'cool', name:'Cool Shades', draw: (ctx, facing) => {
        // sunglasses
        ctx.fillStyle = '#0a0a14';
        // bridge
        ctx.fillRect(-1, -1, 2, 1);
        // lenses
        ctx.beginPath(); ctx.ellipse(-5, 0, 4, 3, -.1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( 5, 0, 4, 3, .1, 0, Math.PI*2); ctx.fill();
        // shine
        ctx.fillStyle = '#5bf0e8';
        ctx.beginPath(); ctx.ellipse(-6, -.5, 1.5, .8, -.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( 4, -.5, 1.5, .8, .2, 0, Math.PI*2); ctx.fill();
        // smirk
        ctx.strokeStyle = '#0a0a14'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-facing*3, 6); ctx.quadraticCurveTo(0, 8+facing, facing*5, 6);
        ctx.stroke();
      }
    },
    { id:'shocked', name:'Shocked', draw: (ctx, facing) => {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(facing*4, 0, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-facing*2, 0, 3, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#0a0a14'; ctx.lineWidth = .8; ctx.stroke();
        ctx.beginPath(); ctx.arc(facing*4, 0, 3, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath(); ctx.arc(facing*4, 0, 1.6, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-facing*2, 0, 1.6, 0, Math.PI*2); ctx.fill();
        // open mouth
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath(); ctx.arc(facing*1, 6, 2.5, 0, Math.PI*2); ctx.fill();
        // sweat drop
        ctx.fillStyle = '#5bf0e8';
        ctx.beginPath();
        ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-11, 3, -9, 5); ctx.quadraticCurveTo(-7, 3, -9, 0); ctx.closePath(); ctx.fill();
      }
    },
    { id:'sleepy', name:'Sleepy', draw: (ctx, facing) => {
        ctx.strokeStyle = '#0a0a14'; ctx.lineWidth = 2; ctx.lineCap='round';
        ctx.beginPath();
        ctx.moveTo(facing*1, 0); ctx.quadraticCurveTo(facing*4, 1, facing*7, 0);
        ctx.moveTo(-facing*5, 0); ctx.quadraticCurveTo(-facing*2, 1, -facing*0, 0);
        ctx.stroke();
        // Zzz
        ctx.fillStyle = '#0a0a14';
        ctx.font = "bold 7px sans-serif";
        ctx.fillText('z', 8, -3);
        ctx.fillText('z', 11, -7);
      }
    },
    { id:'wink', name:'Wink', draw: (ctx, facing) => {
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath(); ctx.arc(facing*4, 0, 2.2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(facing*4-.6, -.6, .7, 0, Math.PI*2); ctx.fill();
        // wink (line)
        ctx.strokeStyle = '#0a0a14'; ctx.lineWidth = 2; ctx.lineCap='round';
        ctx.beginPath();
        ctx.moveTo(-facing*5, 0); ctx.quadraticCurveTo(-facing*2, 1, -facing*0, 0);
        ctx.stroke();
        // tongue smile
        ctx.beginPath();
        ctx.arc(facing*1, 5, 3, 0, Math.PI); ctx.stroke();
        ctx.fillStyle = '#ff7b9a';
        ctx.beginPath(); ctx.arc(facing*2, 7, 1.4, 0, Math.PI*2); ctx.fill();
      }
    },
    { id:'fierce', name:'Fierce', draw: (ctx, facing) => {
        // glowing red eyes
        ctx.fillStyle = '#cc1a3a';
        ctx.beginPath(); ctx.arc(facing*5, 1, 2.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-facing*2, 1, 2.2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(facing*5-.5, .5, .8, 0, Math.PI*2); ctx.fill();
        // sharp eyebrows
        ctx.strokeStyle = '#0a0a14'; ctx.lineWidth = 2.5; ctx.lineCap='round';
        ctx.beginPath();
        ctx.moveTo(facing*1, -3); ctx.lineTo(facing*9, 1);
        ctx.moveTo(-facing*7, -3); ctx.lineTo(-facing*1, 1);
        ctx.stroke();
        // fangs
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-2, 5); ctx.lineTo(-1, 9); ctx.lineTo(0, 5); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 5); ctx.lineTo(1, 9); ctx.lineTo(2, 5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = .4; ctx.stroke();
        // scar
        ctx.strokeStyle = '#cc1a3a'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(facing*9, -6); ctx.lineTo(facing*5, -1);
        ctx.stroke();
      }
    },
    { id:'masked', name:'Bandit Mask', draw: (ctx, facing) => {
        // mask band
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath();
        ctx.moveTo(-11, -3); ctx.lineTo(11, -3); ctx.lineTo(11, 3); ctx.lineTo(-11, 3); ctx.closePath(); ctx.fill();
        // strap on side
        ctx.fillRect(-13, -1, 4, 1.5); ctx.fillRect(9, -1, 4, 1.5);
        // eye holes (white)
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(facing*4, 0, 1.8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-facing*4, 0, 1.8, 0, Math.PI*2); ctx.fill();
        // pupils
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath(); ctx.arc(facing*4, 0, .9, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-facing*4, 0, .9, 0, Math.PI*2); ctx.fill();
        // smirk
        ctx.strokeStyle = '#0a0a14'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-facing*3, 6); ctx.quadraticCurveTo(facing*1, 8, facing*4, 6);
        ctx.stroke();
      }
    },
    { id:'crying_laugh', name:'Crying Laugh', draw: (ctx, facing) => {
        // squinted eyes (upside-down U)
        ctx.strokeStyle = '#0a0a14'; ctx.lineWidth = 2; ctx.lineCap='round';
        ctx.beginPath();
        ctx.arc(facing*4, 0, 2.2, Math.PI, 0);
        ctx.arc(-facing*1, 0, 2.2, Math.PI, 0);
        ctx.stroke();
        // tears
        ctx.fillStyle = '#5bf0e8';
        ctx.beginPath();
        ctx.moveTo(facing*4, 2); ctx.quadraticCurveTo(facing*5, 5, facing*4, 7);
        ctx.quadraticCurveTo(facing*3, 5, facing*4, 2); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-facing*2, 2); ctx.quadraticCurveTo(-facing*1, 5, -facing*2, 7);
        ctx.quadraticCurveTo(-facing*3, 5, -facing*2, 2); ctx.closePath(); ctx.fill();
        // open laughing mouth
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath(); ctx.arc(facing*1, 5, 3, 0, Math.PI); ctx.fill();
        // tongue
        ctx.fillStyle = '#ff7b9a';
        ctx.beginPath(); ctx.arc(facing*1, 6, 1.4, 0, Math.PI); ctx.fill();
      }
    },

    { id:'eye_patch', name:'Eye Patch', draw: (ctx, facing) => {
        // patch
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath(); ctx.arc(facing*4, 0, 3.5, 0, Math.PI*2); ctx.fill();
        // strap
        ctx.strokeStyle = '#0a0a14'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(facing*8, -3); ctx.lineTo(-facing*8, 1);
        ctx.moveTo(facing*8, 1); ctx.lineTo(-facing*8, 5);
        ctx.stroke();
        // remaining eye
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath(); ctx.arc(-facing*2, 0, 2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-facing*2-.6, -.6, .7, 0, Math.PI*2); ctx.fill();
        // small scar from patch
        ctx.strokeStyle = '#cc1a3a'; ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(facing*8, -3); ctx.lineTo(facing*5, 4);
        ctx.stroke();
      }
    },

    { id:'glasses', name:'Nerd Glasses', draw: (ctx) => {
        // round glasses
        ctx.strokeStyle = '#0a0a14'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(-5, 0, 3.5, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc( 5, 0, 3.5, 0, Math.PI*2); ctx.stroke();
        // bridge
        ctx.beginPath(); ctx.moveTo(-1.5, 0); ctx.lineTo(1.5, 0); ctx.stroke();
        // lens reflection
        ctx.fillStyle = 'rgba(180,220,255,.4)';
        ctx.beginPath(); ctx.arc(-5, 0, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc( 5, 0, 3, 0, Math.PI*2); ctx.fill();
        // eye dots
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath(); ctx.arc(-5, 0, 1.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc( 5, 0, 1.2, 0, Math.PI*2); ctx.fill();
        // small smile
        ctx.strokeStyle = '#0a0a14'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 6, 2.5, 0, Math.PI); ctx.stroke();
      }
    },
  ];

  // ---------- TRAILS ----------
  const TRAILS = [
    { id:'none', name:'No Trail', draw: () => {} },
    { id:'spark', name:'Sparks', draw: (ctx, age, max, color) => {
        const t = 1 - age/max;
        ctx.fillStyle = color;
        ctx.globalAlpha = t * .8;
        ctx.beginPath(); ctx.arc(0, 0, 2.5 + t*2.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = t * .5;
        ctx.beginPath(); ctx.arc(0, 0, 1 + t, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    },
    { id:'smoke', name:'Smoke', draw: (ctx, age, max) => {
        const t = 1 - age/max;
        ctx.fillStyle = `rgba(180,180,200,${t*.45})`;
        ctx.beginPath(); ctx.arc(0, 0, 5 + (1-t)*10, 0, Math.PI*2); ctx.fill();
      }
    },
    { id:'fire', name:'Embers', draw: (ctx, age, max) => {
        const t = 1 - age/max;
        const c = t > .5 ? '#fff1a0' : (t > .25 ? '#ff8a3d' : '#ff4d2e');
        ctx.fillStyle = c;
        ctx.globalAlpha = t;
        ctx.beginPath(); ctx.arc(0, 0, 2.5 + t*3, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    },
    { id:'rainbow', name:'Rainbow', draw: (ctx, age, max) => {
        const t = 1 - age/max;
        ctx.fillStyle = `hsl(${(age*30)%360}, 100%, 60%)`;
        ctx.globalAlpha = t * .75;
        ctx.beginPath(); ctx.arc(0, 0, 3.5 + t*2.5, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    },
    { id:'stars', name:'Stars', draw: (ctx, age, max) => {
        const t = 1 - age/max;
        ctx.fillStyle = '#ffd84a';
        ctx.globalAlpha = t;
        const r = 1.2 + t*2.4;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI*2 - Math.PI/2;
          const a2 = a + Math.PI/5;
          ctx.lineTo(Math.cos(a)*r*2, Math.sin(a)*r*2);
          ctx.lineTo(Math.cos(a2)*r*.9, Math.sin(a2)*r*.9);
        }
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
    },
    { id:'bubbles', name:'Bubbles', draw: (ctx, age, max) => {
        const t = 1 - age/max;
        ctx.strokeStyle = '#5bf0e8';
        ctx.globalAlpha = t * .8;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, 3.5 + (1-t)*7, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.beginPath(); ctx.arc(-1, -1, 1, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    },
    { id:'shadow', name:'Shadow', draw: (ctx, age, max) => {
        const t = 1 - age/max;
        ctx.globalAlpha = t * .4;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(0, 6, 10, 14, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    },
    { id:'electric', name:'Electric', draw: (ctx, age, max) => {
        const t = 1 - age/max;
        ctx.strokeStyle = '#5bf0e8';
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = t;
        ctx.beginPath();
        let x = -5;
        ctx.moveTo(x, 0);
        for (let i = 0; i < 5; i++) {
          x += 2.5;
          ctx.lineTo(x, (Math.random()-.5)*5);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    },
    { id:'petals', name:'Petals', draw: (ctx, age, max) => {
        const t = 1 - age/max;
        ctx.fillStyle = '#ff7bc6';
        ctx.globalAlpha = t * .85;
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI*2 + age*0.12;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a)*2.5, Math.sin(a)*2.5, 2.5, 1.2, a, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    },
    // ---- new (v36) ----
    { id:'coin_trail', name:'Coin Trail', draw: (ctx, age, max) => {
        const t = 1 - age/max;
        // Spinning coin (ellipse that "rotates" via width modulation).
        const spin = Math.abs(Math.cos(age * 0.4));
        ctx.fillStyle = '#ffd76a';
        ctx.globalAlpha = t * 0.9;
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.2 + spin * 3.2, 3.4, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#c89014'; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.globalAlpha = 1;
      }
    },
    { id:'snow', name:'Snowflakes', draw: (ctx, age, max) => {
        const t = 1 - age/max;
        ctx.strokeStyle = '#e6f7ff';
        ctx.lineWidth = 1.2; ctx.lineCap = 'round';
        ctx.globalAlpha = t * 0.85;
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate(i * Math.PI / 3 + age * 0.15);
          ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.stroke();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
    },
    { id:'ghost', name:'Ghost Trail', draw: (ctx, age, max, color) => {
        const t = 1 - age/max;
        ctx.fillStyle = color || '#fff';
        ctx.globalAlpha = t * 0.35;
        // Ghostly silhouette of a tiny stickman
        ctx.beginPath(); ctx.arc(0, -4, 2.4, 0, Math.PI*2); ctx.fill();
        ctx.fillRect(-1, -2, 2, 6);
        ctx.beginPath(); ctx.arc(-1, 4, 1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(1, 4, 1, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    },
    { id:'hearts', name:'Hearts', draw: (ctx, age, max) => {
        const t = 1 - age/max;
        ctx.fillStyle = '#ff5b7a';
        ctx.globalAlpha = t * 0.9;
        const r = 2 + t * 1.2;
        ctx.beginPath();
        ctx.moveTo(0, r * 1.2);
        ctx.bezierCurveTo(-r * 1.4, 0, -r * 0.6, -r * 1.2, 0, -r * 0.4);
        ctx.bezierCurveTo(r * 0.6, -r * 1.2, r * 1.4, 0, 0, r * 1.2);
        ctx.fill();
        ctx.strokeStyle = '#a01a36'; ctx.lineWidth = 0.6; ctx.stroke();
        ctx.globalAlpha = 1;
      }
    },
  ];

  // ---------- AURAS ----------
  // Drawn BEHIND the stickman as a radial glow / ring at foot level.
  // origin (0,0) is the feet (same as drawStickman). Aura scales up.
  const AURAS = [
    { id:'none', name:'No Aura', draw: () => {} },
    { id:'fire', name:'Fire Aura', draw: (ctx, t) => {
        const pulse = (Math.sin((t || 0) * 0.06) + 1) * 0.5;
        const R = 26 + pulse * 3;
        const g = ctx.createRadialGradient(0, -26, 4, 0, -26, R);
        g.addColorStop(0, 'rgba(255,215,106,.55)');
        g.addColorStop(0.55, 'rgba(255,77,46,.35)');
        g.addColorStop(1, 'rgba(255,77,46,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, -26, R, 0, Math.PI*2); ctx.fill();
      } },
    { id:'ice', name:'Ice Aura', draw: (ctx, t) => {
        const R = 24;
        const g = ctx.createRadialGradient(0, -26, 4, 0, -26, R);
        g.addColorStop(0, 'rgba(180,240,255,.6)');
        g.addColorStop(0.6, 'rgba(92,246,255,.30)');
        g.addColorStop(1, 'rgba(92,246,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, -26, R, 0, Math.PI*2); ctx.fill();
        // snowflake dots orbiting
        for (let i = 0; i < 5; i++) {
          const a = ((t || 0) * 0.02 + i * (Math.PI * 2 / 5));
          const x = Math.cos(a) * 22, y = -26 + Math.sin(a) * 22;
          ctx.fillStyle = '#eaffff';
          ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI*2); ctx.fill();
        }
      } },
    { id:'shadow', name:'Shadow Aura', draw: (ctx) => {
        const R = 22;
        const g = ctx.createRadialGradient(0, -26, 2, 0, -26, R);
        g.addColorStop(0, 'rgba(30,20,60,.75)');
        g.addColorStop(1, 'rgba(30,20,60,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, -26, R, 0, Math.PI*2); ctx.fill();
      } },
    { id:'rainbow', name:'Rainbow Aura', draw: (ctx, t) => {
        const R = 24;
        const cols = ['#ff5b6e','#ff9a3c','#ffd76a','#5bff8a','#5cf6ff','#a07bff','#ff6ac1'];
        for (let i = 0; i < cols.length; i++) {
          const a = ((t || 0) * 0.03 + i * (Math.PI * 2 / cols.length));
          const x = Math.cos(a) * R, y = -26 + Math.sin(a) * R;
          ctx.fillStyle = cols[i]; ctx.globalAlpha = 0.7;
          ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      } },
    { id:'electric', name:'Electric Aura', draw: (ctx, t) => {
        const R = 22;
        const g = ctx.createRadialGradient(0, -26, 4, 0, -26, R);
        g.addColorStop(0, 'rgba(255,255,180,.55)');
        g.addColorStop(1, 'rgba(255,255,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -26, R, 0, Math.PI*2); ctx.fill();
        // Small crackle sparks around the perimeter — evenly spaced so the
        // aura reads as a clean electric ring instead of a lopsided zigzag.
        ctx.fillStyle = '#ffd76a';
        for (let i = 0; i < 8; i++) {
          const a = ((t || 0) * 0.06 + i * (Math.PI * 2 / 8));
          const x = Math.cos(a) * 20, y = -26 + Math.sin(a) * 20;
          ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI*2); ctx.fill();
        }
      } },
    { id:'gold', name:'Golden Aura', draw: (ctx, t) => {
        const pulse = (Math.sin((t || 0) * 0.05) + 1) * 0.5;
        const R = 25 + pulse * 2;
        const g = ctx.createRadialGradient(0, -26, 4, 0, -26, R);
        g.addColorStop(0, 'rgba(255,241,160,.7)');
        g.addColorStop(0.5, 'rgba(255,215,106,.4)');
        g.addColorStop(1, 'rgba(200,144,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, -26, R, 0, Math.PI*2); ctx.fill();
        // sparkles
        for (let i = 0; i < 6; i++) {
          const a = ((t || 0) * 0.04 + i * (Math.PI * 2 / 6));
          const x = Math.cos(a) * 20, y = -26 + Math.sin(a) * 20;
          ctx.fillStyle = '#fff2a6';
          ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI*2); ctx.fill();
        }
      } },
  ];

  // ---------- HALOS ----------
  // Drawn above the head/hat. Origin (0,0) is roughly the top of the head
  // (game.jsx calls with translate to `cy - headR - 6`).
  const HALOS = [
    { id:'none', name:'No Halo', draw: () => {} },
    { id:'angel', name:'Angel Halo', draw: (ctx, t) => {
        // Golden flat halo ring floating slightly above.
        ctx.save();
        ctx.strokeStyle = '#fff2a6'; ctx.lineWidth = 2.2;
        ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.ellipse(0, -3, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#c89014'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(0, -3, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } },
    { id:'devil', name:'Devil Horns', draw: (ctx) => {
        ctx.fillStyle = '#ff5b6e';
        ctx.beginPath();
        ctx.moveTo(-8, 0); ctx.lineTo(-11, -8); ctx.lineTo(-4, -2); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(8, 0); ctx.lineTo(11, -8); ctx.lineTo(4, -2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#6c1a0e'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-11, -8); ctx.lineTo(-4, -2); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(11, -8); ctx.lineTo(4, -2); ctx.closePath(); ctx.stroke();
      } },
    { id:'neon', name:'Neon Ring', draw: (ctx, t) => {
        const pulse = (Math.sin((t || 0) * 0.1) + 1) * 0.5;
        ctx.save();
        ctx.strokeStyle = '#5cf6ff';
        ctx.lineWidth = 2 + pulse;
        ctx.shadowColor = '#5cf6ff'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.ellipse(0, -2, 13, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } },
    { id:'flame', name:'Flame Crown', draw: (ctx, t) => {
        // Three flickering flame tongues.
        const flick = Math.sin((t || 0) * 0.25);
        const cols = ['#ffd76a','#ff9a3c','#ff4d2e'];
        for (let i = -1; i <= 1; i++) {
          const h = 8 + Math.abs(flick + i * 0.4) * 3;
          const x = i * 5;
          ctx.fillStyle = cols[i + 1];
          ctx.beginPath();
          ctx.moveTo(x - 2, 2);
          ctx.quadraticCurveTo(x - 3, -h * 0.6, x, -h);
          ctx.quadraticCurveTo(x + 3, -h * 0.6, x + 2, 2);
          ctx.closePath(); ctx.fill();
        }
      } },
    { id:'crown_halo', name:'Kingly Halo', draw: (ctx) => {
        // Halo ring with small orbs.
        ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.ellipse(0, -3, 13, 4, 0, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const a = i * (Math.PI * 2 / 6);
          const x = Math.cos(a) * 13, y = -3 + Math.sin(a) * 4;
          ctx.fillStyle = '#fff2a6';
          ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill();
        }
      } },
    { id:'ghost', name:'Ghost Halo', draw: (ctx, t) => {
        const bob = Math.sin((t || 0) * 0.08) * 1.5;
        ctx.save();
        ctx.strokeStyle = 'rgba(220,200,255,.75)';
        ctx.setLineDash([4, 3]); ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.ellipse(0, -3 + bob, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } },
  ];

  return { HATS, OUTFITS, FACES, TRAILS, AURAS, HALOS };
})();
